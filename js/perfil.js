    /* =========================================================================
   USB SOCIAL — Módulo de Perfil
   -------------------------------------------------------------------------
   Responsabilidades:
     - Mostrar los datos del usuario logueado en la sección "Mi Perfil"
     - Editar perfil (nombre, carrera, semestre, bio, avatar)
     - Generar reportes académicos del estudiante
   ========================================================================= */

/* =========================================================================
   1. CARGAR PERFIL EN PANTALLA
   ========================================================================= */
function cargarPerfil(){
    if(!usuarioActual) return;

    // Datos básicos
    document.getElementById('perfilNombre').textContent    = usuarioActual.nombre_completo || '—';
    document.getElementById('perfilCarrera').textContent   = usuarioActual.carrera || 'Sin carrera registrada';
    document.getElementById('perfilBio').textContent       = usuarioActual.bio || 'Sin biografía.';
    document.getElementById('perfilEmail').textContent     = usuarioActual.email || '—';
    document.getElementById('perfilSemestre').textContent  = usuarioActual.semestre || '—';

    // Avatar: inicial del nombre o imagen si existe
    const avatarEl = document.getElementById('perfilAvatar');
    if(usuarioActual.avatar){
        avatarEl.innerHTML = `<img src="${usuarioActual.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar">`;
    } else {
        const inicial = (usuarioActual.nombre_completo || 'U').trim().charAt(0).toUpperCase();
        avatarEl.innerHTML = inicial;
    }
}

/* =========================================================================
   2. ABRIR MODAL DE EDICIÓN
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

/* =========================================================================
   3. GUARDAR CAMBIOS DEL PERFIL
   ========================================================================= */
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

    // Refrescar UI
    cargarPerfil();
    document.getElementById('navUsuario').textContent = usuarioActual.nombre_completo;

    // Cerrar modal
    bootstrap.Modal.getInstance(document.getElementById('modalEditarPerfil')).hide();

    mostrarToast('Perfil actualizado ✔', 'success');
}

/* =========================================================================
   4. REPORTES ACADÉMICOS
   -------------------------------------------------------------------------
   Calcula estadísticas del estudiante actual:
     - Total de notas registradas
     - Promedio general
     - Nota máxima y mínima
     - Materia con mejor nota
   ========================================================================= */
async function cargarReportes(){
    if(!usuarioActual) return;

    const contenedor = document.getElementById('reporteCards');
    contenedor.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Calculando reportes…
        </div>`;

    // Traemos las notas donde el nombre coincida con el del estudiante
    // (si no tienes perfil_id aún, esto funciona por nombre)
    const { data, error } = await db.from('estudiantes')
        .select('nombre, materia, nota')
        .eq('nombre', usuarioActual.nombre_completo);

    if(error){
        console.error('Error al cargar reportes:', error);
        contenedor.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger mb-0">
                    No se pudieron cargar los reportes: ${escapeHtml(error.message)}
                </div>
            </div>`;
        return;
    }

    if(!data || data.length === 0){
        contenedor.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-clipboard-x"></i>
                    <p class="mt-2">Aún no tienes notas registradas en el sistema.</p>
                    <button class="btn btn-usb-azul btn-sm" onclick="mostrarSeccion('notas')">
                        <i class="bi bi-plus-circle"></i> Registrar mi primera nota
                    </button>
                </div>
            </div>`;
        return;
    }

    // Cálculos
    const notas        = data.map(d => Number(d.nota));
    const total        = notas.length;
    const promedio     = (notas.reduce((a,b) => a+b, 0) / total).toFixed(2);
    const maxima       = Math.max(...notas);
    const minima       = Math.min(...notas);
    const mejorMateria = data.find(d => Number(d.nota) === maxima)?.materia || '—';
    const aprobadas    = notas.filter(n => n >= 51).length;

    // Color según promedio
    let colorPromedio = 'var(--usb-rojo)';
    if(promedio >= 71) colorPromedio = '#198754';
    else if(promedio >= 51) colorPromedio = '#e6b800';

    contenedor.innerHTML = `
        <div class="col-md-6 col-lg-3">
            <div class="card p-3 h-100 text-center">
                <i class="bi bi-journal-text" style="font-size:1.8rem;color:var(--usb-azul);"></i>
                <h3 class="mt-2 mb-0">${total}</h3>
                <small class="text-muted">Notas registradas</small>
            </div>
        </div>

        <div class="col-md-6 col-lg-3">
            <div class="card p-3 h-100 text-center">
                <i class="bi bi-graph-up-arrow" style="font-size:1.8rem;color:${colorPromedio};"></i>
                <h3 class="mt-2 mb-0" style="color:${colorPromedio};">${promedio}</h3>
                <small class="text-muted">Promedio general</small>
            </div>
        </div>

        <div class="col-md-6 col-lg-3">
            <div class="card p-3 h-100 text-center">
                <i class="bi bi-trophy-fill" style="font-size:1.8rem;color:var(--usb-amarillo);"></i>
                <h3 class="mt-2 mb-0">${maxima}</h3>
                <small class="text-muted">Nota máxima</small>
            </div>
        </div>

        <div class="col-md-6 col-lg-3">
            <div class="card p-3 h-100 text-center">
                <i class="bi bi-check-circle-fill" style="font-size:1.8rem;color:#198754;"></i>
                <h3 class="mt-2 mb-0">${aprobadas}/${total}</h3>
                <small class="text-muted">Materias aprobadas</small>
            </div>
        </div>

        <div class="col-md-6">
            <div class="card p-3 h-100">
                <h6 style="color:var(--usb-azul);"><i class="bi bi-star-fill"></i> Mejor materia</h6>
                <p class="mb-0"><strong>${escapeHtml(mejorMateria)}</strong> — Nota: ${maxima}</p>
            </div>
        </div>

        <div class="col-md-6">
            <div class="card p-3 h-100">
                <h6 style="color:var(--usb-azul);"><i class="bi bi-exclamation-triangle-fill"></i> Nota más baja</h6>
                <p class="mb-0">Nota mínima: <strong>${minima}</strong></p>
            </div>
        </div>
    `;
}

/* =========================================================================
   5. LISTA DE ESTUDIANTES (sidebar del feed)
   -------------------------------------------------------------------------
   Muestra los perfiles registrados en el sistema.
   ========================================================================= */
async function actualizarListaEstudiantes(){
    const cont = document.getElementById('listaEstudiantes');
    if(!cont) return;

    const { data, error } = await db.from('perfiles')
        .select('id, nombre_completo, carrera')
        .order('nombre_completo', { ascending: true })
        .limit(10);

    if(error){
        cont.innerHTML = `<p class="text-muted small mb-0">Error al cargar estudiantes.</p>`;
        return;
    }

    if(!data || data.length === 0){
        cont.innerHTML = `<p class="text-muted small mb-0">Aún no hay otros estudiantes registrados.</p>`;
        return;
    }

    cont.innerHTML = data.map(p => `
        <div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
            <div class="pub-avatar">${(p.nombre_completo || 'U').charAt(0).toUpperCase()}</div>
            <div class="flex-grow-1" style="min-width:0;">
                <div class="text-truncate"><strong>${escapeHtml(p.nombre_completo)}</strong></div>
                <small class="text-muted text-truncate d-block">${escapeHtml(p.carrera || 'USB')}</small>
            </div>
        </div>
    `).join('');
}