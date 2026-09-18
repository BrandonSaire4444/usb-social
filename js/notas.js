/* =========================================================================
   USB SOCIAL — Módulo de Notas por Paralelo
   ========================================================================= */

/* =========================================================================
   1. POBLAR EL SELECTOR DE PARALELOS (según el rol)
   ========================================================================= */
async function poblarSelectorParalelos(){
    const selector = document.getElementById('selectorParalelo');
    selector.innerHTML = `<option value="">Cargando…</option>`;

    let opciones = [];

    if(usuarioActual.rol === 'docente'){
        const paralelos = await obtenerParalelosDocente(usuarioActual.id);
        opciones = paralelos.map(p => ({
            id: p.id,
            etiqueta: `${p.materias?.nombre || '—'} — Paralelo ${p.codigo}`
        }));
    } else {
        const { data, error } = await db.from('inscripciones')
            .select('paralelos(id, codigo, materias(nombre))')
            .eq('estudiante_id', usuarioActual.id);
        if(!error && data){
            opciones = data.map(i => ({
                id: i.paralelos.id,
                etiqueta: `${i.paralelos.materias?.nombre || '—'} — Paralelo ${i.paralelos.codigo}`
            }));
        }
    }

    if(opciones.length === 0){
        selector.innerHTML = `<option value="">No hay paralelos disponibles</option>`;
        document.getElementById('tablaNotas').innerHTML = `
            <tr><td colspan="3" class="text-center text-muted py-4">
                ${usuarioActual.rol === 'docente'
                    ? 'Aún no has creado ningún paralelo. Ve a tu Perfil para crear uno.'
                    : 'Aún no estás inscrito en ninguna materia. Ve a tu Perfil para inscribirte.'}
            </td></tr>`;
        return;
    }

    selector.innerHTML = `<option value="">Selecciona…</option>` +
        opciones.map(o => `<option value="${o.id}">${escapeHtml(o.etiqueta)}</option>`).join('');
}

/* =========================================================================
   2. CARGAR LA SECCIÓN NOTAS (al entrar a esa pestaña)
   ========================================================================= */
async function cargarNotas(){
    if(!usuarioActual) return;

    document.getElementById('colAccionesNotas').textContent =
        usuarioActual.rol === 'docente' ? 'Nota' : '';

    await poblarSelectorParalelos();
}

/* =========================================================================
   3. CARGAR LAS NOTAS DEL PARALELO SELECCIONADO
   ========================================================================= */
async function cargarNotasDelParalelo(){
    const paraleloId = Number(document.getElementById('selectorParalelo').value);
    const tbody = document.getElementById('tablaNotas');

    if(!paraleloId){
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Selecciona un paralelo arriba.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-hourglass-split"></i> Cargando…</td></tr>`;

    if(usuarioActual.rol === 'docente'){
        await cargarVistaDocente(paraleloId, tbody);
    } else {
        await cargarVistaEstudiante(paraleloId, tbody);
    }
}

/* ---------- 3.1 Vista del DOCENTE: inscritos + nota editable ---------- */
async function cargarVistaDocente(paraleloId, tbody){
    const { data: inscritos, error: errorInsc } = await db.from('inscripciones')
        .select('perfiles(id, nombre_completo)')
        .eq('paralelo_id', paraleloId);

    if(errorInsc){
        console.error(errorInsc);
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Error al cargar inscritos.</td></tr>`;
        return;
    }

    if(!inscritos || inscritos.length === 0){
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Aún no hay estudiantes inscritos en este paralelo.</td></tr>`;
        return;
    }

    const { data: notasExistentes } = await db.from('notas')
        .select('estudiante_id, nota')
        .eq('paralelo_id', paraleloId);

    const mapaNotas = {};
    (notasExistentes || []).forEach(n => { mapaNotas[n.estudiante_id] = n.nota; });

    tbody.innerHTML = inscritos.map(i => {
        const est = i.perfiles;
        const notaActual = mapaNotas[est.id] ?? '';
        return `
            <tr>
                <td><strong>${escapeHtml(est.nombre_completo)}</strong></td>
                <td style="max-width:120px;">
                    <input type="number" min="0" max="100" class="form-control form-control-sm"
                           id="nota-${est.id}" value="${notaActual}" placeholder="0-100">
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-usb-rojo" onclick="guardarNotaEstudiante(${paraleloId}, '${est.id}')">
                        <i class="bi bi-save"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

/* ---------- 3.2 Vista del ESTUDIANTE: solo su propia nota (solo lectura) ---------- */
async function cargarVistaEstudiante(paraleloId, tbody){
    const { data, error } = await db.from('notas')
        .select('nota')
        .eq('paralelo_id', paraleloId)
        .eq('estudiante_id', usuarioActual.id)
        .maybeSingle();

    if(error){
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Error al cargar tu nota.</td></tr>`;
        return;
    }

    const claseBadge = !data ? 'bg-secondary'
                      : data.nota >= 71 ? 'badge-nota-alta'
                      : data.nota >= 51 ? 'badge-nota-media'
                      :                   'badge-nota-baja';

    tbody.innerHTML = `
        <tr>
            <td><strong>${escapeHtml(usuarioActual.nombre_completo)}</strong></td>
            <td><span class="badge-nota ${claseBadge}">${data ? data.nota : 'Sin registrar'}</span></td>
            <td></td>
        </tr>`;
}

/* =========================================================================
   4. GUARDAR / ACTUALIZAR NOTA (solo docente — la UI ya lo restringe)
   ========================================================================= */
async function guardarNotaEstudiante(paraleloId, estudianteId){
    const input = document.getElementById(`nota-${estudianteId}`);
    const nota  = Number(input.value);

    if(Number.isNaN(nota) || nota < 0 || nota > 100){
        mostrarToast('La nota debe estar entre 0 y 100.', 'warning');
        return;
    }

    const { error } = await db.from('notas')
        .upsert([{ paralelo_id: paraleloId, estudiante_id: estudianteId, nota }], {
            onConflict: 'paralelo_id,estudiante_id'
        });

    if(error){
        console.error(error);
        mostrarToast('No se pudo guardar: ' + error.message, 'error');
        return;
    }

    mostrarToast('Nota guardada ✔', 'success');
    registrarHistorial('Registró/actualizó una nota', 'Notas');
}