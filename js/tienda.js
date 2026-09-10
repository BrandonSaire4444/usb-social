/* =========================================================================
   USB SOCIAL — Módulo de Tienda Estudiantil
   -------------------------------------------------------------------------
   Tabla: productos
   Columnas: id, nombre, descripcion, precio, categoria, imagen, stock
   ========================================================================= */

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

        return `
            <div class="col-sm-6 col-lg-4">
                <div class="card card-producto h-100 position-relative">
                    <span class="badge ${claseStock} badge-especie">${textoStock}</span>
                    <img src="${p.imagen || placeholderProducto()}"
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
                            <button class="btn btn-usb-azul btn-sm"
                                    onclick="comprarProducto(${p.id})"
                                    ${sinStock ? 'disabled' : ''}>
                                <i class="bi bi-cart-plus"></i> Comprar
                            </button>
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
   4. SIMULACIÓN DE COMPRA
   -------------------------------------------------------------------------
   Por ahora solo muestra un toast. Se puede mejorar con una tabla
   "pedidos" en Supabase si el proyecto lo requiere.
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
   5. FILTRO POR CATEGORÍA (opcional)
   -------------------------------------------------------------------------
   Si agregas un <select id="filtroCategoria"> en el HTML, se activa solo.
   ========================================================================= */
document.addEventListener('change', (e) => {
    if(e.target.id !== 'filtroCategoria') return;

    const cat = e.target.value;
    const filtrados = (cat === 'Todos' || !cat)
        ? productosCargados
        : productosCargados.filter(p => p.categoria === cat);

    renderizarProductos(filtrados);
});