/* =========================================================================
   USB SOCIAL — Módulo de Mascotas
   -------------------------------------------------------------------------
   Tabla: mascotas
   Columnas: id, nombre, especie, edad, raza, salud, descripcion, foto,
             estado, dueño_id, creado_en
   ========================================================================= */

/* =========================================================================
   1. CARGAR MASCOTAS DESDE SUPABASE
   ========================================================================= */
async function cargarMascotas(){
    const galeria = document.getElementById('galeriaMascotas');
    galeria.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Cargando mascotas…
        </div>`;

    const { data, error } = await db.from('mascotas')
        .select('*')
        .order('id', { ascending: false });

    if(error){
        console.error('Error al cargar mascotas:', error);
        galeria.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger mb-0">
                    Error al cargar mascotas: ${escapeHtml(error.message)}
                </div>
            </div>`;
        return;
    }

    mascotasCargadas = data || [];
    renderizarGaleriaMascotas();
}

/* =========================================================================
   2. RENDERIZAR GALERÍA
   ========================================================================= */
function renderizarGaleriaMascotas(){
    const galeria = document.getElementById('galeriaMascotas');

    if(mascotasCargadas.length === 0){
        galeria.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-emoji-frown"></i>
                    <p class="mt-2">No hay mascotas registradas todavía.</p>
                </div>
            </div>`;
        return;
    }

    galeria.innerHTML = mascotasCargadas.map(m => {
        const esDisponible = m.estado === 'Disponible';
        const claseBadge   = esDisponible ? 'badge-disponible' : 'badge-adoptado';
        const textoBtn     = esDisponible
            ? '<i class="bi bi-heart-fill"></i> Marcar Adoptado'
            : '<i class="bi bi-arrow-counterclockwise"></i> Marcar Disponible';
        const claseBtn     = esDisponible ? 'btn-usb-rojo' : 'btn-usb-azul';

        return `
            <div class="col-sm-6 col-lg-4">
                <div class="card card-mascota position-relative h-100">
                    <span class="badge ${claseBadge} badge-especie">${m.estado}</span>
                    <img src="${m.foto || generarFotoPlaceholder()}"
                         class="card-img-top"
                         alt="Foto de ${escapeHtml(m.nombre)}"
                         onerror="this.src='${generarFotoPlaceholder()}'">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title mb-1">${escapeHtml(m.nombre)}</h5>
                        <p class="card-text text-muted mb-2 small">
                            <i class="bi bi-tag-fill"></i> ${escapeHtml(m.especie)} &nbsp;|&nbsp;
                            <i class="bi bi-calendar3"></i> ${m.edad} años
                        </p>
                        <div class="mt-auto d-grid gap-2">
                            <button class="btn btn-usb-amarillo btn-sm" onclick="verPerfilMascota(${m.id})">
                                <i class="bi bi-person-badge"></i> Ver ficha
                            </button>
                            <button class="btn ${claseBtn} btn-sm" onclick="alternarEstadoMascota(${m.id})">
                                ${textoBtn}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

/* =========================================================================
   3. ABRIR / CERRAR FORMULARIO
   ========================================================================= */
function abrirFormMascota(){
    document.getElementById('formMascotaCard').classList.remove('d-none');
    document.getElementById('mNombre').focus();
}
function cerrarFormMascota(){
    document.getElementById('formMascotaCard').classList.add('d-none');
    limpiarFormMascota();
}
function limpiarFormMascota(){
    ['mNombre','mEdad','mRaza','mSalud','mDesc'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('mEspecie').value = '';
    document.getElementById('mFoto').value    = '';
    fotoMascotaBase64 = '';
}

/* =========================================================================
   4. GUARDAR NUEVA MASCOTA
   ========================================================================= */
async function guardarMascota(){
    const nombre = document.getElementById('mNombre').value.trim();
    const especie = document.getElementById('mEspecie').value;
    const edad    = Number(document.getElementById('mEdad').value);
    const raza    = document.getElementById('mRaza').value.trim();
    const salud   = document.getElementById('mSalud').value.trim();
    const desc    = document.getElementById('mDesc').value.trim();
    const fotoInput = document.getElementById('mFoto').files[0];

    // Validaciones
    if(!nombre || !especie || !raza || !salud || !desc || Number.isNaN(edad)){
        mostrarToast('Completa todos los campos.', 'warning');
        return;
    }

    // Convertir foto a Base64 si existe
    if(fotoInput){
        fotoMascotaBase64 = await archivoABase64(fotoInput);
    }

    const nuevaMascota = {
        nombre,
        especie,
        edad,
        raza,
        salud,
        descripcion: desc,
        foto: fotoMascotaBase64 || generarFotoPlaceholder(),
        estado: 'Disponible',
        dueño_id: usuarioActual ? usuarioActual.id : null
    };

    const { error } = await db.from('mascotas').insert([nuevaMascota]);

    if(error){
        console.error('Error al guardar mascota:', error);
        mostrarToast('No se pudo guardar: ' + error.message, 'error');
        return;
    }

    mostrarToast('Mascota registrada ✔', 'success');
    registrarHistorial('Registró una mascota', 'Mascotas', nombre);
    limpiarFormMascota();
    cerrarFormMascota();
    cargarMascotas();
}

/* =========================================================================
   5. VER FICHA COMPLETA (MODAL)
   ========================================================================= */
function verPerfilMascota(id){
    const m = mascotasCargadas.find(x => x.id === id);
    if(!m) return;

    const claseBadge = m.estado === 'Disponible' ? 'badge-disponible' : 'badge-adoptado';

    // Construye el HTML del modal
    const html = `
        <img src="${m.foto || generarFotoPlaceholder()}" class="foto-modal" alt="${escapeHtml(m.nombre)}">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="mb-0">${escapeHtml(m.nombre)}</h3>
            <span class="badge ${claseBadge} fs-6">${m.estado}</span>
        </div>
        <table class="table table-bordered mb-0">
            <tbody>
                <tr><th style="width:35%">Especie</th><td>${escapeHtml(m.especie)}</td></tr>
                <tr><th>Raza</th><td>${escapeHtml(m.raza)}</td></tr>
                <tr><th>Edad</th><td>${m.edad} años</td></tr>
                <tr><th>Salud / Vacunas</th><td>${escapeHtml(m.salud)}</td></tr>
                <tr><th>Historia</th><td>${escapeHtml(m.descripcion)}</td></tr>
            </tbody>
        </table>
    `;

    // Reutilizamos el modal de Bootstrap que ya existe en el HTML
    let modalEl = document.getElementById('modalMascota');
    if(!modalEl){
        modalEl = document.createElement('div');
        modalEl.id = 'modalMascota';
        modalEl.className = 'modal fade';
        modalEl.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header modal-header-usb">
                        <h5 class="modal-title"><i class="bi bi-file-earmark-person"></i> Ficha de la Mascota</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="modalMascotaBody"></div>
                    <div class="modal-footer">
                        <button class="btn btn-outline-danger" onclick="eliminarMascota(${m.id})">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                        <button class="btn btn-usb-azul" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalEl);
    } else {
        // Actualizar el botón de eliminar con el id correcto
        modalEl.querySelector('.modal-footer .btn-outline-danger')
                .setAttribute('onclick', `eliminarMascota(${m.id})`);
    }

    document.getElementById('modalMascotaBody').innerHTML = html;
    new bootstrap.Modal(modalEl).show();
}

/* =========================================================================
   6. ALTERNAR ESTADO (Disponible <-> Adoptado)
   ========================================================================= */
async function alternarEstadoMascota(id){
    const m = mascotasCargadas.find(x => x.id === id);
    if(!m) return;

    const nuevoEstado = m.estado === 'Disponible' ? 'Adoptado' : 'Disponible';

    const { error } = await db.from('mascotas')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if(error){
        console.error('Error al actualizar estado:', error);
        mostrarToast('No se pudo actualizar: ' + error.message, 'error');
        return;
    }

    m.estado = nuevoEstado;
    renderizarGaleriaMascotas();
    mostrarToast(`Mascota marcada como ${nuevoEstado}`, 'success');
}

/* =========================================================================
   7. ELIMINAR MASCOTA
   ========================================================================= */
async function eliminarMascota(id){
    if(!confirm('¿Eliminar esta mascota? Esta acción no se puede deshacer.')) return;

    const { error } = await db.from('mascotas').delete().eq('id', id);

    if(error){
        console.error('Error al eliminar:', error);
        mostrarToast('No se pudo eliminar: ' + error.message, 'error');
        return;
    }

    // Cerrar modal si está abierto
    const modalEl = document.getElementById('modalMascota');
    if(modalEl){
        const instancia = bootstrap.Modal.getInstance(modalEl);
        if(instancia) instancia.hide();
    }

    mostrarToast('Mascota eliminada.', 'info');
    cargarMascotas();
}

/* =========================================================================
   8. PREVIEW DE FOTO AL SELECCIONAR ARCHIVO
   ========================================================================= */
document.addEventListener('change', (e) => {
    if(e.target.id !== 'mFoto') return;
    const archivo = e.target.files[0];
    if(!archivo) return;

    // (Opcional) mostrar mini preview debajo del input
    archivoABase64(archivo).then(b64 => {
        let preview = document.getElementById('mFotoPreview');
        if(!preview){
            preview = document.createElement('img');
            preview.id = 'mFotoPreview';
            preview.style.cssText = 'max-height:120px;border-radius:8px;margin-top:.5rem;';
            e.target.parentElement.appendChild(preview);
        }
        preview.src = b64;
    });
});