/* =========================================================================
   USB SOCIAL — Módulo de Tienda Estudiantil
   -------------------------------------------------------------------------
   Tabla: productos
   Columnas: id, nombre, descripcion, precio, categoria, imagen, stock
   ========================================================================= */

let fotoProductoBase64 = '';

/* =========================================================================
   1. CARGAR PRODUCTOS
   ========================================================================= */
async function cargarProductos(){
    const cont = document.getElementById('galeriaProductos');
    cont.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
            <i class="bi bi-hourglass-split"></i> Cargando productos…
        </div>`;

    const { data, error } = await db.from('productos')
        .select('*')
        .order('id', { ascending: true });

    if(error){
        console.error('Error al cargar productos:', error);
        cont.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger mb-0">
                    Error al cargar la tienda: ${escapeHtml(error.message)}
                </div>
            </div>`;
        return;
    }

    productosCargados = data || [];

    if(productosCargados.length === 0){
        cont.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-shop-window"></i>
                    <p class="mt-2">Aún no hay productos en la tienda.</p>
                    <button class="btn btn-usb-azul btn-sm" onclick="abrirFormProducto()">
                        <i class="bi bi-plus-circle"></i> Agregar el primero
                    </button>
                </div>
            </div>`;
        return;
    }

    renderizarProductos(productosCargados);
}

/* =========================================================================
   2. RENDERIZAR GALERÍA DE PRODUCTOS
   ========================================================================= */
function renderizarProductos(lista){
    const cont = document.getElementById('galeriaProductos');

    cont.innerHTML = lista.map(p => {
        const sinStock   = (p.stock || 0) <= 0;
        const claseStock = sinStock ? 'badge-adoptado' : 'badge-disponible';
        const textoStock = sinStock ? 'Agotado' : `Stock: ${p.stock}`;
        const imgFinal   = p.imagen && p.imagen.trim() !== '' ? p.imagen : placeholderProducto();

        return `
            <div class="col-sm-6 col-lg-4">
                <div class="card card-producto h-100 position-relative">
                    <span class="badge ${claseStock} badge-especie">${textoStock}</span>
                    <img src="${imgFinal}"
                         class="card-img-top"
                         alt="${escapeHtml(p.nombre)}"
                         onerror="this.src='${placeholderProducto()}'">
                    <div class="card-body d-flex flex-column">
                        <small class="text-muted mb-1">
                            <i class="bi bi-bookmark-fill"></i> ${escapeHtml(p.categoria || 'General')}
                        </small>
                        <h6 class="card-title mb-1">${escapeHtml(p.nombre)}</h6>
                        <p class="card-text small text-muted mb-2">
                            ${escapeHtml(p.descripcion || 'Sin descripción.')}
                        </p>
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <span class="precio">Bs. ${Number(p.precio).toFixed(2)}</span>
                            <div class="d-flex gap-1">
                                <button class="btn btn-outline-danger btn-sm"
                                        onclick="eliminarProducto(${p.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                                <button class="btn btn-usb-azul btn-sm"
                                        onclick="comprarProducto(${p.id})"
                                        ${sinStock ? 'disabled' : ''}>
                                    <i class="bi bi-cart-plus"></i> Comprar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

/* =========================================================================
   3. PLACEHOLDER (para productos sin imagen)
   ========================================================================= */
function placeholderProducto(){
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180">
        <rect width="100%" height="100%" fill="#e9ecef"/>
        <text x="50%" y="50%" font-size="16" fill="#6c757d"
              text-anchor="middle" dy=".3em" font-family="Arial">Sin imagen</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

/* =========================================================================
   4. ABRIR / CERRAR FORMULARIO DE PRODUCTO
   ========================================================================= */
function abrirFormProducto(){
    document.getElementById('formProductoCard').classList.remove('d-none');
    document.getElementById('pNombre').focus();
}

function cerrarFormProducto(){
    document.getElementById('formProductoCard').classList.add('d-none');
    limpiarFormProducto();
}

function limpiarFormProducto(){
    ['pNombre','pPrecio','pStock','pDesc'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('pCategoria').value = '';
    document.getElementById('pImagen').value    = '';
    fotoProductoBase64 = '';

    const preview = document.getElementById('pPreview');
    if(preview) preview.remove();
}

/* =========================================================================
   5. GUARDAR PRODUCTO
   ========================================================================= */
async function guardarProducto(){
    const nombre    = document.getElementById('pNombre').value.trim();
    const precio    = Number(document.getElementById('pPrecio').value);
    const stock     = Number(document.getElementById('pStock').value) || 0;
    const categoria = document.getElementById('pCategoria').value.trim();
    const desc      = document.getElementById('pDesc').value.trim();
    const imgInput  = document.getElementById('pImagen').files[0];

    // Validaciones
    if(!nombre || Number.isNaN(precio) || precio < 0){
        mostrarToast('Completa nombre y precio válido.', 'warning');
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

    const nuevoProducto = {
        nombre,
        descripcion: desc || null,
        precio,
        categoria: categoria || null,
        imagen: imagenBase64,
        stock
    };

    const { error } = await db.from('productos').insert([nuevoProducto]);

    if(error){
        console.error('Error al guardar producto:', error);
        mostrarToast('No se pudo guardar: ' + error.message, 'error');
        return;
    }

    mostrarToast('Producto agregado ✔', 'success');
    limpiarFormProducto();
    cerrarFormProducto();
    cargarProductos();
}

/* =========================================================================
   6. ELIMINAR PRODUCTO
   ========================================================================= */
async function eliminarProducto(id){
    if(!confirm('¿Eliminar este producto de la tienda?')) return;

    const { error } = await db.from('productos').delete().eq('id', id);

    if(error){
        console.error('Error al eliminar:', error);
        mostrarToast('No se pudo eliminar: ' + error.message, 'error');
        return;
    }

    mostrarToast('Producto eliminado.', 'info');
    cargarProductos();
}

/* =========================================================================
   7. COMPRAR PRODUCTO (simulado)
   ========================================================================= */
function comprarProducto(id){
    const p = productosCargados.find(x => x.id === id);
    if(!p) return;

    if(!usuarioActual){
        mostrarToast('Debes iniciar sesión para comprar.', 'warning');
        return;
    }

    mostrarToast(`¡Solicitud enviada! Te contactaremos por "${p.nombre}".`, 'success');
}

/* =========================================================================
   8. PREVIEW DE IMAGEN
   ========================================================================= */
document.addEventListener('change', (e) => {
    if(e.target.id !== 'pImagen') return;
    const archivo = e.target.files[0];

    let preview = document.getElementById('pPreview');
    if(!archivo){
        if(preview) preview.remove();
        return;
    }

    archivoABase64(archivo).then(b64 => {
        if(!preview){
            preview = document.createElement('img');
            preview.id = 'pPreview';
            preview.style.cssText = 'max-height:100px;border-radius:8px;margin-top:.5rem;';
            e.target.parentElement.appendChild(preview);
        }
        preview.src = b64;
    });
});
