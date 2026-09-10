/* =========================================================================
   USB SOCIAL — Módulo de Feed (publicaciones tipo Facebook)
   -------------------------------------------------------------------------
   Tabla: publicaciones
   Columnas: id, autor_id, contenido, imagen, creado_en
   ========================================================================= */

/* =========================================================================
   1. CARGAR PUBLICACIONES
   -------------------------------------------------------------------------
   Traemos las publicaciones ordenadas por fecha descendente, junto con
   los datos del autor (join con la tabla "perfiles").
   ========================================================================= */
async function cargarFeed(){
    const cont = document.getElementById('feedLista');
    cont.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Cargando publicaciones…
        </div>`;

    // Consulta con relación: traemos la publicación + datos del autor
    const { data, error } = await db.from('publicaciones')
        .select(`
            id, contenido, imagen, creado_en, autor_id,
            perfiles:autor_id ( nombre_completo, carrera )
        `)
        .order('creado_en', { ascending: false })
        .limit(50);

    if(error){
        console.error('Error al cargar feed:', error);
        cont.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar publicaciones: ${escapeHtml(error.message)}
            </div>`;
        return;
    }

    if(!data || data.length === 0){
        cont.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-chat-square-text"></i>
                <p class="mt-2">Aún no hay publicaciones. ¡Sé el primero en compartir algo!</p>
            </div>`;
        return;
    }

    cont.innerHTML = data.map(pub => renderizarPublicacion(pub)).join('');
}

/* =========================================================================
   2. RENDERIZAR UNA PUBLICACIÓN
   ========================================================================= */
function renderizarPublicacion(pub){
    // Datos del autor (viene del join con perfiles)
    const autorNombre  = pub.perfiles?.nombre_completo || 'Estudiante USB';
    const autorCarrera = pub.perfiles?.carrera || 'USB';
    const inicial      = autorNombre.charAt(0).toUpperCase();

    // ¿Es del usuario actual? → mostramos botón de eliminar
    const esMia = usuarioActual && pub.autor_id === usuarioActual.id;

    // Imagen opcional
    const imagenHtml = pub.imagen
        ? `<img src="${pub.imagen}" alt="Imagen de la publicación" class="mb-2">`
        : '';

    // Botón eliminar
    const btnEliminar = esMia
        ? `<button class="btn btn-sm btn-outline-danger ms-auto" onclick="eliminarPublicacion(${pub.id})">
               <i class="bi bi-trash"></i>
           </button>`
        : '';

    return `
        <div class="pub-card">
            <div class="d-flex align-items-center gap-2 mb-2">
                <div class="pub-avatar">${inicial}</div>
                <div class="flex-grow-1" style="min-width:0;">
                    <div><strong>${escapeHtml(autorNombre)}</strong></div>
                    <small class="text-muted">
                        ${escapeHtml(autorCarrera)} · ${formatearFecha(pub.creado_en)}
                    </small>
                </div>
                ${btnEliminar}
            </div>
            <p class="mb-2" style="white-space:pre-wrap;">${escapeHtml(pub.contenido)}</p>
            ${imagenHtml}
        </div>
    `;
}

/* =========================================================================
   3. CREAR UNA PUBLICACIÓN
   ========================================================================= */
async function publicar(){
    if(!usuarioActual){
        mostrarToast('Debes iniciar sesión.', 'error');
        return;
    }

    const contenido = document.getElementById('nuevaPubContenido').value.trim();
    const imgInput  = document.getElementById('nuevaPubImagen').files[0];

    if(!contenido && !imgInput){
        mostrarToast('Escribe algo o sube una imagen.', 'warning');
        return;
    }

    // Convertir imagen a Base64 si existe
    let imagenBase64 = null;
    if(imgInput){
        try{
            imagenBase64 = await archivoABase64(imgInput);
        } catch(err){
            console.error(err);
            mostrarToast('No se pudo procesar la imagen.', 'error');
            return;
        }
    }

    const { error } = await db.from('publicaciones').insert([{
        autor_id: usuarioActual.id,
        contenido: contenido || '(sin texto)',
        imagen: imagenBase64
    }]);

    if(error){
        console.error('Error al publicar:', error);
        mostrarToast('No se pudo publicar: ' + error.message, 'error');
        return;
    }

    // Limpiar formulario
    document.getElementById('nuevaPubContenido').value = '';
    document.getElementById('nuevaPubImagen').value    = '';

    mostrarToast('Publicación creada ✔', 'success');
    cargarFeed();
}

/* =========================================================================
   4. ELIMINAR PUBLICACIÓN
   ========================================================================= */
async function eliminarPublicacion(id){
    if(!confirm('¿Eliminar esta publicación?')) return;

    const { error } = await db.from('publicaciones').delete().eq('id', id);

    if(error){
        console.error('Error al eliminar:', error);
        mostrarToast('No se pudo eliminar: ' + error.message, 'error');
        return;
    }

    mostrarToast('Publicación eliminada.', 'info');
    cargarFeed();
}

/* =========================================================================
   5. PREVIEW DE IMAGEN EN EL FORMULARIO DE NUEVA PUBLICACIÓN
   ========================================================================= */
document.addEventListener('change', (e) => {
    if(e.target.id !== 'nuevaPubImagen') return;
    const archivo = e.target.files[0];

    let preview = document.getElementById('pubPreview');
    if(!archivo){
        if(preview) preview.remove();
        return;
    }

    archivoABase64(archivo).then(b64 => {
        if(!preview){
            preview = document.createElement('img');
            preview.id = 'pubPreview';
            preview.style.cssText = 'max-height:150px;border-radius:8px;margin-top:.5rem;display:block;';
            e.target.parentElement.parentElement.appendChild(preview);
        }
        preview.src = b64;
    });
});