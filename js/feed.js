/* =========================================================================
   USB SOCIAL — Módulo de Feed (con reacciones y comentarios)
   ========================================================================= */

/* =========================================================================
   1. CARGAR PUBLICACIONES + REACCIONES + COMENTARIOS
   ========================================================================= */
async function cargarFeed(){
    const cont = document.getElementById('feedLista');
    cont.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Cargando publicaciones…
        </div>`;

    // 1) Traer publicaciones con autor
    const { data: pubs, error } = await db.from('publicaciones')
        .select(`
            id, contenido, imagen, creado_en, autor_id,
            perfiles:autor_id ( nombre_completo, carrera, avatar )
        `)
        .order('creado_en', { ascending: false })
        .limit(50);

    if(error){
        console.error('Error al cargar feed:', error);
        cont.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(error.message)}</div>`;
        return;
    }

    if(!pubs || pubs.length === 0){
        cont.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-chat-square-text"></i>
                <p class="mt-2">Aún no hay publicaciones. ¡Sé el primero en compartir algo!</p>
            </div>`;
        return;
    }

    // 2) Traer TODAS las reacciones y comentarios de esas publicaciones
    const ids = pubs.map(p => p.id);

    const { data: reacciones } = await db.from('reacciones')
        .select('*').in('publicacion_id', ids);

    const { data: comentarios } = await db.from('comentarios')
        .select(`
            id, publicacion_id, contenido, creado_en, autor_id,
            perfiles:autor_id ( nombre_completo, avatar )
        `)
        .in('publicacion_id', ids)
        .order('creado_en', { ascending: true });

    // 3) Armar mapa de reacciones y comentarios por publicación
    const reaccionesPorPub = {};
    (reacciones || []).forEach(r => {
        if(!reaccionesPorPub[r.publicacion_id]) reaccionesPorPub[r.publicacion_id] = [];
        reaccionesPorPub[r.publicacion_id].push(r);
    });

    const comentariosPorPub = {};
    (comentarios || []).forEach(c => {
        if(!comentariosPorPub[c.publicacion_id]) comentariosPorPub[c.publicacion_id] = [];
        comentariosPorPub[c.publicacion_id].push(c);
    });

    // 4) Renderizar
    cont.innerHTML = pubs.map(pub =>
        renderizarPublicacion(
            pub,
            reaccionesPorPub[pub.id] || [],
            comentariosPorPub[pub.id] || []
        )
    ).join('');
}

/* =========================================================================
   2. RENDERIZAR PUBLICACIÓN
   ========================================================================= */
function renderizarPublicacion(pub, reacciones, comentarios){
    const autorNombre  = pub.perfiles?.nombre_completo || 'Estudiante USB';
    const autorCarrera = pub.perfiles?.carrera || 'USB';
    const autorAvatar  = pub.perfiles?.avatar;
    const inicial      = autorNombre.charAt(0).toUpperCase();
    const esMia        = usuarioActual && pub.autor_id === usuarioActual.id;

    const miReaccion = reacciones.find(r => r.usuario_id === usuarioActual?.id);

    const conteo = { like:0, love:0, jaja:0, wow:0 };
    reacciones.forEach(r => { conteo[r.tipo] = (conteo[r.tipo] || 0) + 1; });
    const totalReacciones = reacciones.length;

    const emojis = { like:'👍', love:'❤️', jaja:'😂', wow:'😮' };

    const resumenEmojis = Object.entries(conteo)
        .filter(([_, v]) => v > 0)
        .map(([k, _]) => `<span class="emoji-resumen">${emojis[k]}</span>`)
        .slice(0, 3)
        .join('');

    const avatarHtml = autorAvatar
        ? `<img src="${autorAvatar}" class="pub-avatar" alt="Avatar" style="object-fit:cover;">`
        : `<div class="pub-avatar">${inicial}</div>`;

    const imagenHtml = pub.imagen
        ? `<img src="${pub.imagen}" alt="Imagen" class="img-publicacion img-fluid mb-2" style="border-radius:10px;max-height:400px;object-fit:cover;">`
        : '';

    const btnEliminar = esMia
        ? `<button class="btn btn-sm btn-outline-danger flex-shrink-0" onclick="eliminarPublicacion(${pub.id})" style="width:36px;height:36px;">
             <i class="bi bi-trash"></i>
           </button>`
        : '';

    // Comentarios
    const comentariosHtml = comentarios.map(c => {
        const nombreC = c.perfiles?.nombre_completo || 'Usuario';
        const avatarC = c.perfiles?.avatar;
        const inicialC = nombreC.charAt(0).toUpperCase();
        const esMio = usuarioActual && c.autor_id === usuarioActual.id;

        const avatarCHtml = avatarC
            ? `<img src="${avatarC}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:32px;height:32px;border-radius:50%;background:var(--usb-azul);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;flex-shrink:0;">${inicialC}</div>`;

        return `
            <div class="d-flex gap-2 mb-2">
                ${avatarCHtml}
                <div class="flex-grow-1" style="min-width:0;">
                    <div style="background:#f0f2f5;border-radius:14px;padding:.5rem .8rem;">
                        <div><strong style="font-size:.88rem;">${escapeHtml(nombreC)}</strong></div>
                        <div style="font-size:.88rem;white-space:pre-wrap;word-break:break-word;">${escapeHtml(c.contenido)}</div>
                    </div>
                    <div class="d-flex gap-3 ms-2 mt-1" style="font-size:.75rem;">
                        <span class="text-muted">${formatearFecha(c.creado_en)}</span>
                        ${esMio ? `<button class="btn btn-link p-0 text-danger" style="font-size:.75rem;"
                                    onclick="eliminarComentario(${c.id}, ${pub.id})">Eliminar</button>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');

    // Texto del botón según la reacción actual
    const textoReaccion = miReaccion
        ? `${emojis[miReaccion.tipo]} ${{
            like:'Me gusta', love:'Me encanta', jaja:'Me divierte', wow:'Me asombra'
        }[miReaccion.tipo]}`
        : '👍 Me gusta';

    return `
        <div class="pub-card" id="pub-${pub.id}">
            <div class="d-flex align-items-center gap-2 mb-2">
                ${avatarHtml}
                <div class="flex-grow-1" style="min-width:0;">
                    <div><strong>${escapeHtml(autorNombre)}</strong></div>
                    <small class="text-muted">${escapeHtml(autorCarrera)} · ${formatearFecha(pub.creado_en)}</small>
                </div>
                ${btnEliminar}
            </div>

            <p class="mb-2" style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(pub.contenido)}</p>
            ${imagenHtml}

            ${totalReacciones > 0 || comentarios.length > 0 ? `
            <div class="d-flex justify-content-between align-items-center px-2 mb-1 resumen-reacciones">
                <div>${resumenEmojis} <span class="text-muted">${totalReacciones}</span></div>
                <div class="text-muted" style="font-size:.85rem;">${comentarios.length} comentario${comentarios.length===1?'':'s'}</div>
            </div>
            ` : ''}

            <hr class="my-1">

            <div class="d-flex justify-content-around align-items-center">

                <!-- REACCIONES: botón + panel flotante -->
                <div class="reaccion-wrapper">
                    <div class="panel-reacciones">
                        <button type="button" title="Me gusta"    onclick="toggleReaccion(${pub.id}, 'like')">👍</button>
                        <button type="button" title="Me encanta"  onclick="toggleReaccion(${pub.id}, 'love')">❤️</button>
                        <button type="button" title="Me divierte" onclick="toggleReaccion(${pub.id}, 'jaja')">😂</button>
                        <button type="button" title="Me asombra"  onclick="toggleReaccion(${pub.id}, 'wow')">😮</button>
                    </div>
                    <button class="btn-reaccion ${miReaccion ? 'activa' : ''}"
                            onclick="toggleReaccion(${pub.id}, 'like')">
                        ${textoReaccion}
                    </button>
                </div>

                <!-- COMENTAR -->
                <div class="reaccion-wrapper">
                    <button class="btn-reaccion" onclick="toggleCajaComentario(${pub.id})">
                        💬 Comentar
                    </button>
                </div>
            </div>

            <div id="caja-comentario-${pub.id}" class="mt-2" style="display:none;">
                <div class="d-flex gap-2 mb-2">
                    <input type="text" id="input-comentario-${pub.id}"
                           class="form-control form-control-sm"
                           placeholder="Escribe un comentario..."
                           onkeydown="if(event.key==='Enter') enviarComentario(${pub.id})">
                    <button class="btn btn-usb-azul btn-sm flex-shrink-0"
                            onclick="enviarComentario(${pub.id})">
                        <i class="bi bi-send"></i>
                    </button>
                </div>
                <div id="lista-comentarios-${pub.id}">
                    ${comentariosHtml || '<p class="text-muted small mb-0">Aún no hay comentarios.</p>'}
                </div>
            </div>
        </div>
    `;
}

/* =========================================================================
   3. TOGGLE REACCIÓN (con tipo específico)
   ========================================================================= */
async function toggleReaccion(pubId, tipo){
    if(!usuarioActual) { mostrarToast('Inicia sesión.', 'error'); return; }

    // ¿Ya reaccioné?
    const { data: existente } = await db.from('reacciones')
        .select('*')
        .eq('publicacion_id', pubId)
        .eq('usuario_id', usuarioActual.id)
        .maybeSingle();

    if(existente){
        // Si es el mismo tipo → quitar la reacción
        if(existente.tipo === tipo){
            const { error } = await db.from('reacciones')
                .delete().eq('id', existente.id);
            if(error){ mostrarToast('Error: ' + error.message, 'error'); return; }
            mostrarToast('Reacción eliminada', 'info');
        } else {
            // Si es otro tipo → cambiar la reacción
            const { error } = await db.from('reacciones')
                .update({ tipo })
                .eq('id', existente.id);
            if(error){ mostrarToast('Error: ' + error.message, 'error'); return; }
            const emojis = { like:'👍', love:'❤️', jaja:'😂', wow:'😮' };
            mostrarToast('Reaccionaste ' + emojis[tipo], 'success');
        }
    } else {
        // Reacción nueva
        const { error } = await db.from('reacciones').insert([{
            publicacion_id: pubId,
            usuario_id: usuarioActual.id,
            tipo
        }]);
        if(error){ mostrarToast('Error: ' + error.message, 'error'); return; }
        const emojis = { like:'👍', love:'❤️', jaja:'😂', wow:'😮' };
        mostrarToast('Reaccionaste ' + emojis[tipo], 'success');
        registrarHistorial('Reaccionó a una publicación', 'Feed');
    }

    cargarFeed();
}
/* =========================================================================
   4. TOGGLE CAJA DE COMENTARIOS
   ========================================================================= */
function toggleCajaComentario(pubId){
    const caja = document.getElementById('caja-comentario-' + pubId);
    if(!caja) return;

    if(caja.style.display === 'none'){
        caja.style.display = 'block';
        const input = document.getElementById('input-comentario-' + pubId);
        if(input) setTimeout(() => input.focus(), 50);
    } else {
        caja.style.display = 'none';
    }
}

/* =========================================================================
   5. ENVIAR COMENTARIO
   ========================================================================= */
async function enviarComentario(pubId){
    if(!usuarioActual){ mostrarToast('Debes iniciar sesión.', 'error'); return; }

    const input = document.getElementById('input-comentario-' + pubId);
    const contenido = input.value.trim();
    if(!contenido){ mostrarToast('Escribe algo antes de enviar.', 'warning'); return; }

    input.disabled = true;

    const { error } = await db.from('comentarios').insert([{
        publicacion_id: pubId,
        autor_id: usuarioActual.id,
        contenido
    }]);

    input.disabled = false;

    if(error){
        console.error(error);
        mostrarToast('No se pudo comentar: ' + error.message, 'error');
        return;
    }

    input.value = '';
    mostrarToast('Comentario publicado ✔', 'success');
    registrarHistorial('Comentó una publicación', 'Feed', contenido.substring(0, 50));
    cargarFeed();
}

/* =========================================================================
   6. ELIMINAR COMENTARIO
   ========================================================================= */
async function eliminarComentario(id, pubId){
    if(!confirm('¿Eliminar este comentario?')) return;

    const { error } = await db.from('comentarios').delete().eq('id', id);
    if(error){
        mostrarToast('Error: ' + error.message, 'error');
        return;
    }
    mostrarToast('Comentario eliminado', 'info');
    cargarFeed();
}

/* =========================================================================
   7. CREAR PUBLICACIÓN
   ========================================================================= */
async function publicar(){
    if(!usuarioActual){ mostrarToast('Debes iniciar sesión.', 'error'); return; }

    const contenido = document.getElementById('nuevaPubContenido').value.trim();
    const imgInput  = document.getElementById('nuevaPubImagen').files[0];

    if(!contenido && !imgInput){
        mostrarToast('Escribe algo o sube una imagen.', 'warning');
        return;
    }

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

    document.getElementById('nuevaPubContenido').value = '';
    document.getElementById('nuevaPubImagen').value    = '';

    mostrarToast('Publicación creada ✔', 'success');
    registrarHistorial('Publicó algo en el feed', 'Feed', contenido.substring(0, 50));
    cargarFeed();
}

/* =========================================================================
   8. ELIMINAR PUBLICACIÓN
   ========================================================================= */
async function eliminarPublicacion(id){
    if(!confirm('¿Eliminar esta publicación? También se borrarán sus comentarios y reacciones.')) return;

    const { error } = await db.from('publicaciones').delete().eq('id', id);
    if(error){
        mostrarToast('Error: ' + error.message, 'error');
        return;
    }
    mostrarToast('Publicación eliminada', 'info');
    registrarHistorial('Eliminó una publicación', 'Feed');
    cargarFeed();
}

/* =========================================================================
   9. PREVIEW DE IMAGEN
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