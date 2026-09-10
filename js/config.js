/* =========================================================================
   USB SOCIAL — Configuración global y utilidades
   Universidad Salesiana de Bolivia — Programación Avanzada
   -------------------------------------------------------------------------
   Este archivo debe cargarse PRIMERO, antes que cualquier otro .js del
   sistema, porque define:
     - El cliente de Supabase (db)
     - Las constantes globales
     - Las utilidades compartidas (hash, base64, toasts, etc.)
   ========================================================================= */

/* =========================================================================
   1. CONFIGURACIÓN DE SUPABASE
   -------------------------------------------------------------------------
   SUPABASE_URL: SOLO el dominio raíz, SIN "/rest/v1/".
   El SDK agrega automáticamente "/rest/v1/<tabla>" en cada consulta.
   ========================================================================= */
const SUPABASE_URL      = 'https://eodkpecocixrzdjwzoyt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tfarjqun-OaVcGGRPqDdVw_geYTkJ1z';

// Cliente global: se usa en TODOS los módulos como `db.from(...)`
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================================================================
   2. ESTADO GLOBAL DE LA APLICACIÓN
   ========================================================================= */
let usuarioActual      = null;   // Objeto perfil del estudiante logueado
let fotoMascotaBase64  = '';     // Buffer temporal al crear mascota
let fotoPubBase64      = '';     // Buffer temporal al crear publicación
let mascotasCargadas   = [];     // Cache en memoria de mascotas
let productosCargados  = [];     // Cache en memoria de productos

/* =========================================================================
   3. UTILIDADES
   ========================================================================= */

/* ---------- 3.1 Navegación entre secciones ---------- */
function mostrarSeccion(id){
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    const sec = document.getElementById('seccion-' + id);
    if(sec) sec.classList.add('activa');

    // Cargar datos perezosos según la sección visitada
    if(id === 'notas')    cargarNotas();
    if(id === 'mascotas') cargarMascotas();
    if(id === 'tienda')   cargarProductos();
    if(id === 'perfil')   cargarReportes();
    if(id === 'feed')     cargarFeed();

    // Resaltar el link activo en el navbar
    document.querySelectorAll('#menuUSB .nav-link').forEach(l => l.classList.remove('active'));

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 3.2 Hash de contraseña (SHA-256 + salt) ---------- */
async function hashPass(pass){
    const buf  = new TextEncoder().encode(pass + 'usb_salt_2025');
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/* ---------- 3.3 Archivo → Base64 ---------- */
function archivoABase64(file){
    return new Promise((resolve, reject) => {
        if(!file) return resolve('');
        const r = new FileReader();
        r.onload  = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

/* ---------- 3.4 Escape HTML (anti-inyección) ---------- */
function escapeHtml(texto){
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

/* ---------- 3.5 Placeholder SVG para mascotas sin foto ---------- */
function generarFotoPlaceholder(){
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220">
        <rect width="100%" height="100%" fill="#e9ecef"/>
        <text x="50%" y="50%" font-size="16" fill="#6c757d"
              text-anchor="middle" dy=".3em" font-family="Arial">Sin fotografía</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

/* ---------- 3.6 Toast (notificación flotante) ---------- */
function mostrarToast(mensaje, tipo = 'info'){
    // Crea el toast si no existe
    let toast = document.getElementById('usbToast');
    if(!toast){
        toast = document.createElement('div');
        toast.id = 'usbToast';
        toast.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            padding: .7rem 1.2rem; border-radius: 9999px; color: #fff;
            font-size: .9rem; z-index: 9999; opacity: 0;
            transition: opacity .3s ease; pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,.2);
        `;
        document.body.appendChild(toast);
    }
    const colores = {
        info:    '#003399',
        success: '#198754',
        error:   '#D31111',
        warning: '#FFCC00'
    };
    toast.style.background = colores[tipo] || colores.info;
    toast.style.color = tipo === 'warning' ? '#1a1a1a' : '#fff';
    toast.textContent = mensaje;
    toast.style.opacity = '1';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

/* ---------- 3.7 Formatear fecha ---------- */
function formatearFecha(iso){
    if(!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/* ---------- 3.8 Sesión persistente (localStorage) ---------- */
function guardarSesion(){
    if(usuarioActual){
        localStorage.setItem('usbSesion', JSON.stringify(usuarioActual));
    }
}
function leerSesion(){
    try{
        const raw = localStorage.getItem('usbSesion');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}