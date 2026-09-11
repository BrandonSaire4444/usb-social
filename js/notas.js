/* =========================================================================
   USB SOCIAL — Módulo de Notas
   -------------------------------------------------------------------------
   Trabaja con la tabla "estudiantes" que ya tenías:
     columnas: id, nombre, materia, nota, created_at, perfil_id (opcional)
   ========================================================================= */

/* =========================================================================
   1. CARGAR TODAS LAS NOTAS
   ========================================================================= */
async function cargarNotas(){
    const tbody = document.getElementById('tablaNotas');
    tbody.innerHTML = `
        <tr><td colspan="5" class="text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Cargando notas…
        </td></tr>`;

    const { data, error } = await db.from('estudiantes')
        .select('id, nombre, materia, nota, created_at')
        .order('id', { ascending: false });

    if(error){
        console.error('Error al cargar notas:', error);
        tbody.innerHTML = `
            <tr><td colspan="5" class="text-center text-danger py-4">
                Error al cargar: ${escapeHtml(error.message)}
            </td></tr>`;
        return;
    }

    if(!data || data.length === 0){
        tbody.innerHTML = `
            <tr><td colspan="5" class="text-center text-muted py-4">
                <i class="bi bi-journal-x"></i> Aún no hay notas registradas.
            </td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(n => {
        const claseBadge = n.nota >= 71 ? 'badge-nota-alta'
                        : n.nota >= 51 ? 'badge-nota-media'
                        :                'badge-nota-baja';
        return `
            <tr>
                <td class="text-muted">${n.id}</td>
                <td><strong>${escapeHtml(n.nombre)}</strong></td>
                <td>${escapeHtml(n.materia)}</td>
                <td><span class="badge-nota ${claseBadge}">${n.nota}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarNota(${n.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

/* =========================================================================
   2. GUARDAR UNA NUEVA NOTA
   ========================================================================= */
async function guardarNota(){
    const nombre  = document.getElementById('notaNombre').value.trim();
    const materia = document.getElementById('notaMateria').value.trim();
    const nota    = Number(document.getElementById('notaValor').value);

    // Validaciones
    if(!nombre || !materia){
        mostrarToast('Completa nombre y materia.', 'warning');
        return;
    }
    if(Number.isNaN(nota) || nota < 0 || nota > 100){
        mostrarToast('La nota debe estar entre 0 y 100.', 'warning');
        return;
    }

    const { error } = await db.from('estudiantes')
        .insert([{
            nombre,
            materia,
            nota,
            perfil_id: usuarioActual ? usuarioActual.id : null
        }]);

    if(error){
        console.error('Error al guardar nota:', error);
        mostrarToast('No se pudo guardar: ' + error.message, 'error');
        return;
    }

    // Limpiar formulario
    document.getElementById('notaNombre').value  = '';
    document.getElementById('notaMateria').value = '';
    document.getElementById('notaValor').value   = '';

    mostrarToast('Nota guardada ✔', 'success');
    registrarHistorial('Registró una nota', 'Notas', `${materia}: ${nota}`);
    cargarNotas();
    
}

/* =========================================================================
   3. ELIMINAR NOTA
   ========================================================================= */
async function eliminarNota(id){
    if(!confirm('¿Eliminar esta nota?')) return;

    const { error } = await db.from('estudiantes')
        .delete()
        .eq('id', id);

    if(error){
        console.error('Error al eliminar:', error);
        mostrarToast('No se pudo eliminar: ' + error.message, 'error');
        return;
    }

    mostrarToast('Nota eliminada.', 'info');
    cargarNotas();
}