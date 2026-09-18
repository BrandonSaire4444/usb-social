/* =========================================================================
   USB SOCIAL — Módulo de Perfil (+ gestión de Paralelos e Inscripciones)
   ========================================================================= */

/* =========================================================================
   1. CARGAR PERFIL EN PANTALLA
   ========================================================================= */
function cargarPerfil(){
    if(!usuarioActual) return;

    document.getElementById('perfilNombre').textContent    = usuarioActual.nombre_completo || '—';
    document.getElementById('perfilCarrera').textContent   = usuarioActual.carrera || 'Sin carrera registrada';
    document.getElementById('perfilBio').textContent       = usuarioActual.bio || 'Sin biografía.';
    document.getElementById('perfilEmail').textContent     = usuarioActual.email || '—';
    document.getElementById('perfilSemestre').textContent  = usuarioActual.semestre || '—';

    const avatarEl = document.getElementById('perfilAvatar');
    if(usuarioActual.avatar){
        avatarEl.innerHTML = `<img src="${usuarioActual.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar">`;
    } else {
        const inicial = (usuarioActual.nombre_completo || 'U').trim().charAt(0).toUpperCase();
        avatarEl.innerHTML = inicial;
    }

    const cover = document.querySelector('.perfil-cover');
    if(cover && usuarioActual.portada){
        cover.style.backgroundImage = `url('${usuarioActual.portada}')`;
        cover.style.backgroundSize = 'cover';
        cover.style.backgroundPosition = 'center';
    }
}

/* =========================================================================
   2. EDITAR PERFIL
   ========================================================================= */
function abrirEditarPerfil(){
    if(!usuarioActual) return;

    document.getElementById('editNombre').value   = usuarioActual.nombre_completo || '';
    document.getElementById('editCarrera').value  = usuarioActual.carrera || '';
    document.getElementById('editSemestre').value = usuarioActual.semestre || '';
    document.getElementById('editBio').value      = usuarioActual.bio || '';

    const modal = new bootstrap.Modal(document.getElementById('modalEditarPerfil'));
    modal.show();
}

async function guardarPerfil(){
    if(!usuarioActual) return;

    const nombre   = document.getElementById('editNombre').value.trim();
    const carrera  = document.getElementById('editCarrera').value.trim();
    const semestre = Number(document.getElementById('editSemestre').value) || null;
    const bio      = document.getElementById('editBio').value.trim();

    if(!nombre){
        mostrarToast('El nombre no puede estar vacío.', 'warning');
        return;
    }

    const { data, error } = await db.from('perfiles')
        .update({
            nombre_completo: nombre,
            carrera: carrera || null,
            semestre,
            bio: bio || null
        })
        .eq('id', usuarioActual.id)
        .select()
        .single();

    if(error){
        console.error('Error al guardar perfil:', error);
        mostrarToast('No se pudo guardar: ' + error.message, 'error');
        return;
    }

    usuarioActual = data;
    guardarSesion();
    cargarPerfil();
    document.getElementById('navUsuario').textContent = usuarioActual.nombre_completo;
    bootstrap.Modal.getInstance(document.getElementById('modalEditarPerfil')).hide();
    mostrarToast('Perfil actualizado ✔', 'success');
}

/* =========================================================================
   3. SECCIÓN DE CURSOS (reemplaza a los antiguos "Reportes Académicos")
   -------------------------------------------------------------------------
   Muestra un bloque distinto segun el rol del usuario logueado.
   ========================================================================= */
async function cargarSeccionCursos(){
    if(!usuarioActual) return;

    const bloqueDocente    = document.getElementById('bloqueDocenteCursos');
    const bloqueEstudiante = document.getElementById('bloqueEstudianteCursos');

    if(usuarioActual.rol === 'docente'){
        bloqueDocente.classList.remove('d-none');
        bloqueEstudiante.classList.add('d-none');
        await cargarListaMateriasExistentes();
        await cargarMisParalelos();
    } else {
        bloqueDocente.classList.add('d-none');
        bloqueEstudiante.classList.remove('d-none');
        await cargarMisInscripciones();
        await cargarParalelosDisponibles();
    }
}

/* ---------- 3.1 Autocompletar materias ya existentes ---------- */
async function cargarListaMateriasExistentes(){
    const { data } = await db.from('materias').select('nombre').order('nombre');
    const datalist = document.getElementById('listaMateriasExistentes');
    if(datalist && data){
        datalist.innerHTML = data.map(m => `<option value="${escapeHtml(m.nombre)}"></option>`).join('');
    }
}

/* ---------- 3.2 DOCENTE: crear un paralelo nuevo ---------- */
async function crearParalelo(){
    const nombreMateria = document.getElementById('cursoMateria').value.trim();
    const codigo        = document.getElementById('cursoCodigo').value.trim();
    const horario       = document.getElementById('cursoHorario').value.trim();
    const aula          = document.getElementById('cursoAula').value.trim();

    if(!nombreMateria || !codigo){
        mostrarToast('Ingresa al menos la materia y el paralelo.', 'warning');
        return;
    }

    // Busca la materia (sin importar mayúsculas/minúsculas); si no existe, la crea
    let materiaId;
    const { data: materiaExistente } = await db.from('materias')
        .select('id')
        .ilike('nombre', nombreMateria)
        .maybeSingle();

    if(materiaExistente){
        materiaId = materiaExistente.id;
    } else {
        const { data: nuevaMateria, error: errorMateria } = await db.from('materias')
            .insert([{ nombre: nombreMateria }])
            .select()
            .single();
        if(errorMateria){
            console.error(errorMateria);
            mostrarToast('No se pudo crear la materia: ' + errorMateria.message, 'error');
            return;
        }
        materiaId = nuevaMateria.id;
    }

    const { error: errorParalelo } = await db.from('paralelos')
        .insert([{
            materia_id: materiaId,
            codigo,
            docente_id: usuarioActual.id,
            horario: horario || null,
            aula: aula || null
        }]);

    if(errorParalelo){
        console.error(errorParalelo);
        if(errorParalelo.code === '23505'){
            mostrarToast('Ya existe un paralelo con ese código para esa materia.', 'error');
        } else {
            mostrarToast('No se pudo crear el paralelo: ' + errorParalelo.message, 'error');
        }
        return;
    }

    document.getElementById('cursoMateria').value = '';
    document.getElementById('cursoCodigo').value  = '';
    document.getElementById('cursoHorario').value = '';
    document.getElementById('cursoAula').value    = '';

    mostrarToast('Paralelo creado ✔', 'success');
    registrarHistorial('Creó un paralelo', 'Perfil', `${nombreMateria} - ${codigo}`);
    await cargarListaMateriasExistentes();
    await cargarMisParalelos();
}

/* ---------- 3.3 DOCENTE: obtener y listar sus paralelos ---------- */
async function obtenerParalelosDocente(docenteId){
    const { data, error } = await db.from('paralelos')
        .select('id, codigo, horario, aula, materias(nombre)')
        .eq('docente_id', docenteId)
        .order('id', { ascending: false });
    if(error){ console.error(error); return []; }
    return data;
}

async function cargarMisParalelos(){
    const cont = document.getElementById('listaMisParalelos');
    cont.innerHTML = `<div class="col-12 text-center text-muted py-3"><i class="bi bi-hourglass-split"></i> Cargando…</div>`;

    const paralelos = await obtenerParalelosDocente(usuarioActual.id);

    if(paralelos.length === 0){
        cont.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-mortarboard"></i><p class="mt-2">Aún no has creado ningún paralelo.</p></div></div>`;
        return;
    }

    const conteos = await Promise.all(paralelos.map(p =>
        db.from('inscripciones').select('id', { count: 'exact', head: true }).eq('paralelo_id', p.id)
    ));

    cont.innerHTML = paralelos.map((p, i) => `
        <div class="col-md-6 col-lg-4">
            <div class="card p-3 h-100">
                <h6 class="mb-1" style="color:var(--usb-azul);">${escapeHtml(p.materias?.nombre || '—')} — Paralelo ${escapeHtml(p.codigo)}</h6>
                <p class="small text-muted mb-1"><i class="bi bi-clock"></i> ${escapeHtml(p.horario || 'Sin horario')}</p>
                <p class="small text-muted mb-2"><i class="bi bi-door-open"></i> ${escapeHtml(p.aula || 'Sin aula')}</p>
                <span class="badge bg-secondary align-self-start">
                    <i class="bi bi-people"></i> ${conteos[i]?.count ?? 0} inscritos
                </span>
            </div>
        </div>`).join('');
}

/* ---------- 3.4 ESTUDIANTE: sus inscripciones y paralelos disponibles ---------- */
async function obtenerTodosParalelos(){
    const { data, error } = await db.from('paralelos')
        .select('id, codigo, horario, aula, materias(nombre), perfiles(nombre_completo)')
        .order('id');
    if(error){ console.error(error); return []; }
    return data;
}

async function obtenerInscripcionesEstudiante(estudianteId){
    const { data, error } = await db.from('inscripciones')
        .select('id, paralelo_id')
        .eq('estudiante_id', estudianteId);
    if(error){ console.error(error); return []; }
    return data;
}

async function cargarMisInscripciones(){
    const cont = document.getElementById('listaMisInscripciones');
    cont.innerHTML = `<div class="col-12 text-center text-muted py-3"><i class="bi bi-hourglass-split"></i> Cargando…</div>`;

    const { data, error } = await db.from('inscripciones')
        .select('id, paralelos(id, codigo, horario, aula, materias(nombre), perfiles(nombre_completo))')
        .eq('estudiante_id', usuarioActual.id);

    if(error){
        console.error(error);
        cont.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error al cargar tus materias.</div></div>`;
        return;
    }

    if(!data || data.length === 0){
        cont.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-journal-x"></i><p class="mt-2">Aún no estás inscrito en ninguna materia.</p></div></div>`;
        return;
    }

    cont.innerHTML = data.map(insc => {
        const p = insc.paralelos;
        return `
        <div class="col-md-6 col-lg-4">
            <div class="card p-3 h-100">
                <h6 class="mb-1" style="color:var(--usb-azul);">${escapeHtml(p.materias?.nombre || '—')} — Paralelo ${escapeHtml(p.codigo)}</h6>
                <p class="small text-muted mb-1"><i class="bi bi-person-workspace"></i> ${escapeHtml(p.perfiles?.nombre_completo || 'Docente')}</p>
                <p class="small text-muted mb-2"><i class="bi bi-clock"></i> ${escapeHtml(p.horario || 'Sin horario')}</p>
                <button class="btn btn-outline-danger btn-sm" onclick="salirDeParalelo(${p.id})">
                    <i class="bi bi-box-arrow-left"></i> Darme de baja
                </button>
            </div>
        </div>`;
    }).join('');
}

async function cargarParalelosDisponibles(){
    const cont = document.getElementById('listaParalelosDisponibles');
    cont.innerHTML = `<div class="col-12 text-center text-muted py-3"><i class="bi bi-hourglass-split"></i> Cargando…</div>`;

    const [todos, misInscripciones] = await Promise.all([
        obtenerTodosParalelos(),
        obtenerInscripcionesEstudiante(usuarioActual.id)
    ]);

    const idsInscritos = new Set(misInscripciones.map(i => i.paralelo_id));
    const disponibles = todos.filter(p => !idsInscritos.has(p.id));

    if(disponibles.length === 0){
        cont.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-check2-circle"></i><p class="mt-2">Ya estás inscrito en todos los paralelos disponibles, o aún no hay ninguno creado.</p></div></div>`;
        return;
    }

    cont.innerHTML = disponibles.map(p => `
        <div class="col-md-6 col-lg-4">
            <div class="card p-3 h-100">
                <h6 class="mb-1" style="color:var(--usb-azul);">${escapeHtml(p.materias?.nombre || '—')} — Paralelo ${escapeHtml(p.codigo)}</h6>
                <p class="small text-muted mb-1"><i class="bi bi-person-workspace"></i> ${escapeHtml(p.perfiles?.nombre_completo || 'Docente')}</p>
                <p class="small text-muted mb-2"><i class="bi bi-clock"></i> ${escapeHtml(p.horario || 'Sin horario')}</p>
                <button class="btn btn-usb-rojo btn-sm" onclick="inscribirme(${p.id})">
                    <i class="bi bi-plus-circle"></i> Inscribirme
                </button>
            </div>
        </div>`).join('');
}

async function inscribirme(paraleloId){
    const { error } = await db.from('inscripciones')
        .insert([{ estudiante_id: usuarioActual.id, paralelo_id: paraleloId }]);

    if(error){
        console.error(error);
        mostrarToast('No se pudo inscribir: ' + error.message, 'error');
        return;
    }

    mostrarToast('Te inscribiste correctamente ✔', 'success');
    registrarHistorial('Se inscribió a un paralelo', 'Perfil');
    await cargarMisInscripciones();
    await cargarParalelosDisponibles();
}

async function salirDeParalelo(paraleloId){
    if(!confirm('¿Darte de baja de este paralelo? Perderás la nota registrada ahí.')) return;

    const { error } = await db.from('inscripciones')
        .delete()
        .eq('estudiante_id', usuarioActual.id)
        .eq('paralelo_id', paraleloId);

    if(error){
        console.error(error);
        mostrarToast('No se pudo dar de baja: ' + error.message, 'error');
        return;
    }

    mostrarToast('Te diste de baja del paralelo.', 'info');
    await cargarMisInscripciones();
    await cargarParalelosDisponibles();
}

/* =========================================================================
   4. LISTA DE ESTUDIANTES (sidebar del feed)
   ========================================================================= */
async function actualizarListaEstudiantes(){
    const cont = document.getElementById('listaEstudiantes');
    if(!cont) return;

    const { data, error } = await db.from('perfiles')
        .select('id, nombre_completo, carrera, avatar')
        .order('nombre_completo', { ascending: true })
        .limit(20);

    if(error || !data){
        cont.innerHTML = `<p class="text-muted small mb-0">Error al cargar estudiantes.</p>`;
        return;
    }

    if(data.length === 0){
        cont.innerHTML = `<p class="text-muted small mb-0">Aún no hay otros estudiantes registrados.</p>`;
        return;
    }

    cont.innerHTML = data.map(p => {
        const esYo = usuarioActual && p.id === usuarioActual.id;
        const avatarHtml = p.avatar
            ? `<img src="${p.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">`
            : `<div class="pub-avatar">${(p.nombre_completo||'U').charAt(0).toUpperCase()}</div>`;

        return `
            <div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom"
                 style="cursor:pointer;"
                 onclick="verPerfilPublico('${p.id}')">
                ${avatarHtml}
                <div class="flex-grow-1" style="min-width:0;">
                    <div class="text-truncate">
                        <strong>${escapeHtml(p.nombre_completo)}</strong>
                        ${esYo ? '<span class="badge bg-secondary ms-1">Tú</span>' : ''}
                    </div>
                    <small class="text-muted text-truncate d-block">${escapeHtml(p.carrera || 'USB')}</small>
                </div>
            </div>`;
    }).join('');
}

/* =========================================================================
   5. AVATAR / PORTADA
   ========================================================================= */
async function subirAvatar(input){
    const archivo = input.files[0];
    if(!archivo) return;

    const b64 = await archivoABase64(archivo);
    const { data, error } = await db.from('perfiles')
        .update({ avatar: b64 })
        .eq('id', usuarioActual.id)
        .select()
        .single();

    if(error){
        mostrarToast('No se pudo subir: ' + error.message, 'error');
        return;
    }
    usuarioActual = data;
    guardarSesion();
    cargarPerfil();
    registrarHistorial('Cambió su foto de perfil', 'Perfil');
    mostrarToast('Foto de perfil actualizada ✔', 'success');
}

async function subirPortada(input){
    const archivo = input.files[0];
    if(!archivo) return;

    const b64 = await archivoABase64(archivo);
    const { data, error } = await db.from('perfiles')
        .update({ portada: b64 })
        .eq('id', usuarioActual.id)
        .select()
        .single();

    if(error){
        mostrarToast('No se pudo subir: ' + error.message, 'error');
        return;
    }
    usuarioActual = data;
    guardarSesion();
    cargarPerfil();
    registrarHistorial('Cambió su foto de portada', 'Perfil');
    mostrarToast('Foto de portada actualizada ✔', 'success');
}

/* =========================================================================
   6. VER PERFIL PÚBLICO DE OTRO ESTUDIANTE
   ========================================================================= */
async function verPerfilPublico(id){
    if(!id) return;

    const { data: perfil, error } = await db.from('perfiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if(error || !perfil){
        mostrarToast('No se encontró el perfil.', 'error');
        return;
    }

    const { data: pubs } = await db.from('publicaciones')
        .select('id, contenido, imagen, creado_en')
        .eq('autor_id', id)
        .order('creado_en', { ascending: false })
        .limit(10);

    const inicial = (perfil.nombre_completo || 'U').charAt(0).toUpperCase();
    const avatarHtml = perfil.avatar
        ? `<img src="${perfil.avatar}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:4px solid #fff;">`
        : `<div style="width:100px;height:100px;border-radius:50%;background:var(--usb-azul);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;border:4px solid #fff;">${inicial}</div>`;

    const portadaStyle = perfil.portada
        ? `background-image:url('${perfil.portada}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg,var(--usb-azul),var(--usb-rojo));`;

    const pubsHtml = (pubs && pubs.length > 0)
        ? pubs.map(p => `
            <div class="pub-card mb-2">
                <small class="text-muted">${formatearFecha(p.creado_en)}</small>
                <p class="mb-1 mt-1" style="white-space:pre-wrap;">${escapeHtml(p.contenido)}</p>
                ${p.imagen ? `<img src="${p.imagen}" style="max-height:200px;border-radius:8px;">` : ''}
            </div>
        `).join('')
        : '<p class="text-muted small">Sin publicaciones aún.</p>';

    let modalEl = document.getElementById('modalPerfilPublico');
    if(!modalEl){
        modalEl = document.createElement('div');
        modalEl.id = 'modalPerfilPublico';
        modalEl.className = 'modal fade';
        modalEl.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div id="perfilPublicoContenido"></div>
                    <div class="modal-footer">
                        <button class="btn btn-usb-azul" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalEl);
    }

    document.getElementById('perfilPublicoContenido').innerHTML = `
        <div style="height:160px;border-radius:14px 14px 0 0;${portadaStyle}"></div>
        <div class="p-4">
            <div class="d-flex align-items-end gap-3" style="margin-top:-60px;">
                ${avatarHtml}
                <div class="mb-2">
                    <h4 class="mb-0">${escapeHtml(perfil.nombre_completo)}</h4>
                    <small class="text-muted">${escapeHtml(perfil.carrera || 'USB')}</small>
                </div>
            </div>
            <hr>
            <p class="text-muted">${escapeHtml(perfil.bio || 'Sin biografía.')}</p>
            <p class="mb-3">
                <i class="bi bi-envelope"></i> ${escapeHtml(perfil.email)}<br>
                <i class="bi bi-calendar3"></i> Semestre: ${perfil.semestre || '—'}
            </p>
            <h6 style="color:var(--usb-azul);"><i class="bi bi-newspaper"></i> Publicaciones recientes</h6>
            ${pubsHtml}
        </div>
    `;

    new bootstrap.Modal(modalEl).show();
}