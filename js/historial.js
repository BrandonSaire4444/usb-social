/* =========================================================================
   USB SOCIAL — Módulo de Historial de Actividad
   ========================================================================= */

/* =========================================================================
   1. REGISTRAR UNA ACCIÓN EN EL HISTORIAL
   ========================================================================= */
async function registrarHistorial(accion, ubicacion = '', detalle = ''){
    if(!usuarioActual) return;

    const { error } = await db.from('historial').insert([{
        usuario_id: usuarioActual.id,
        accion,
        detalle: detalle || null,
        ubicacion: ubicacion || null
    }]);

    if(error) console.warn('No se pudo registrar historial:', error.message);
}

/* =========================================================================
   2. CARGAR HISTORIAL DEL USUARIO
   ========================================================================= */
async function cargarHistorial(){
    const cont = document.getElementById('listaHistorial');
    if(!cont) return;

    cont.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Cargando historial…
        </div>`;

    const { data, error } = await db.from('historial')
        .select('*')
        .eq('usuario_id', usuarioActual.id)
        .order('creado_en', { ascending: false })
        .limit(100);

    if(error){
        cont.innerHTML = `<div class="p-3 text-danger">Error: ${escapeHtml(error.message)}</div>`;
        return;
    }

    if(!data || data.length === 0){
        cont.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-clock-history"></i>
                <p class="mt-2">Aún no tienes actividad registrada.</p>
            </div>`;
        return;
    }

    // Agrupar por fecha
    const grupos = {};
    data.forEach(h => {
        const fecha = new Date(h.creado_en).toLocaleDateString('es-BO', {
            weekday:'long', day:'2-digit', month:'long', year:'numeric'
        });
        if(!grupos[fecha]) grupos[fecha] = [];
        grupos[fecha].push(h);
    });

    cont.innerHTML = Object.entries(grupos).map(([fecha, items]) => `
        <div class="list-group-item bg-light">
            <strong class="text-capitalize">${fecha}</strong>
        </div>
        ${items.map(h => `
            <div class="list-group-item d-flex align-items-start gap-3">
                <div style="width:38px;height:38px;border-radius:50%;background:var(--usb-azul);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="bi bi-activity"></i>
                </div>
                <div class="flex-grow-1">
                    <div><strong>${escapeHtml(h.accion)}</strong></div>
                    ${h.detalle ? `<small class="text-muted">${escapeHtml(h.detalle)}</small>` : ''}
                    <div class="small text-secondary">
                        <i class="bi bi-geo-alt"></i> ${escapeHtml(h.ubicacion || 'General')}
                        · <i class="bi bi-clock"></i>
                        ${new Date(h.creado_en).toLocaleTimeString('es-BO', {hour:'2-digit',minute:'2-digit'})}
                    </div>
                </div>
            </div>
        `).join('')}
    `).join('');
}

/* =========================================================================
   3. LIMPIAR HISTORIAL
   ========================================================================= */
async function limpiarHistorial(){
    if(!confirm('¿Borrar todo tu historial de actividad?')) return;

    const { error } = await db.from('historial')
        .delete()
        .eq('usuario_id', usuarioActual.id);

    if(error){
        mostrarToast('No se pudo limpiar: ' + error.message, 'error');
        return;
    }
    mostrarToast('Historial limpiado.', 'info');
    cargarHistorial();
}