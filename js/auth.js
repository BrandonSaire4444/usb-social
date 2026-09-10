/* =========================================================================
   USB SOCIAL — Módulo de Autenticación
   -------------------------------------------------------------------------
   Responsabilidades:
     - Registro de nuevo estudiante (insert en tabla "perfiles")
     - Inicio de sesión (select con email + password_hash)
     - Cierre de sesión (limpiar localStorage)
     - Auto-login al recargar la página (leer localStorage)
     - Alternar entre pantalla de login y pantalla de la app
   ========================================================================= */

/* =========================================================================
   1. REGISTRO
   ========================================================================= */
async function registrarse(){
    const nombre   = document.getElementById('regNombre').value.trim();
    const email    = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass     = document.getElementById('regPass').value;
    const carrera  = document.getElementById('regCarrera').value.trim();
    const semestre = Number(document.getElementById('regSemestre').value) || null;

    // Validaciones básicas
    if(!nombre || !email || !pass){
        mostrarToast('Completa nombre, correo y contraseña.', 'warning');
        return;
    }
    if(!email.includes('@')){
        mostrarToast('Correo inválido.', 'warning');
        return;
    }
    if(pass.length < 4){
        mostrarToast('La contraseña debe tener al menos 4 caracteres.', 'warning');
        return;
    }

    const passHash = await hashPass(pass);

    const { data, error } = await db.from('perfiles')
        .insert([{
            nombre_completo: nombre,
            email,
            password_hash: passHash,
            carrera: carrera || null,
            semestre
        }])
        .select()
        .single();

    if(error){
        console.error('Error al registrar:', error);
        if(error.code === '23505'){
            mostrarToast('Ese correo ya está registrado.', 'error');
        } else {
            mostrarToast('No se pudo registrar: ' + error.message, 'error');
        }
        return;
    }

    usuarioActual = data;
    guardarSesion();
    mostrarToast('¡Bienvenido, ' + nombre + '!', 'success');
    entrarApp();
}

/* =========================================================================
   2. INICIO DE SESIÓN
   ========================================================================= */
async function iniciarSesion(){
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass  = document.getElementById('loginPass').value;

    if(!email || !pass){
        mostrarToast('Ingresa tu correo y contraseña.', 'warning');
        return;
    }

    const passHash = await hashPass(pass);

    const { data, error } = await db.from('perfiles')
        .select('*')
        .eq('email', email)
        .eq('password_hash', passHash)
        .maybeSingle();

    if(error){
        console.error('Error al iniciar sesión:', error);
        mostrarToast('Error de conexión. Intenta de nuevo.', 'error');
        return;
    }
    if(!data){
        mostrarToast('Correo o contraseña incorrectos.', 'error');
        return;
    }

    usuarioActual = data;
    guardarSesion();
    mostrarToast('¡Hola de nuevo, ' + data.nombre_completo + '!', 'success');
    entrarApp();
}

/* =========================================================================
   3. CERRAR SESIÓN
   ========================================================================= */
function cerrarSesion(){
    if(!confirm('¿Seguro que quieres cerrar sesión?')) return;

    usuarioActual = null;
    localStorage.removeItem('usbSesion');

    document.getElementById('pantallaAuth').classList.remove('d-none');
    document.getElementById('pantallaApp').classList.add('d-none');
    document.getElementById('navbarApp').classList.add('d-none');

    // Limpiar campos del formulario
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value  = '';

    mostrarToast('Sesión cerrada.', 'info');
}

/* =========================================================================
   4. ENTRAR A LA APP (cambiar pantalla + cargar datos iniciales)
   ========================================================================= */
function entrarApp(){
    document.getElementById('pantallaAuth').classList.add('d-none');
    document.getElementById('pantallaApp').classList.remove('d-none');
    document.getElementById('navbarApp').classList.remove('d-none');

    // Mostrar nombre del usuario en el navbar
    const navUsuario = document.getElementById('navUsuario');
    navUsuario.textContent = usuarioActual ? usuarioActual.nombre_completo : '';

    // Refrescar datos de la sección visible
    cargarPerfil();
    cargarFeed();
    actualizarListaEstudiantes();

    mostrarSeccion('feed');
}

/* =========================================================================
   5. AUTO-LOGIN (al recargar la página)
   ========================================================================= */
async function verificarSesion(){
    const sesionGuardada = leerSesion();
    if(!sesionGuardada) return;

    // Verificamos que el perfil siga existiendo en Supabase
    const { data, error } = await db.from('perfiles')
        .select('*')
        .eq('id', sesionGuardada.id)
        .maybeSingle();

    if(error || !data){
        localStorage.removeItem('usbSesion');
        return;
    }

    usuarioActual = data;
    entrarApp();
}

/* =========================================================================
   6. ARRANQUE
   -------------------------------------------------------------------------
   Al cargar la página:
     - Si hay sesión guardada → entrar directo a la app
     - Si no, quedarse en la pantalla de login
   ========================================================================= */
(async function initAuth(){
    // Esperamos un instante a que Bootstrap y el DOM estén listos
    window.addEventListener('DOMContentLoaded', async () => {
        await verificarSesion();
    });
})();

/* =========================================================================
   7. ATAJOS DE TECLADO (Enter en login/registro)
   ========================================================================= */
document.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter') return;

    const loginVisible = document.getElementById('tabLogin').classList.contains('active');
    const regVisible   = document.getElementById('tabRegistro').classList.contains('active');

    if(loginVisible && document.activeElement.id === 'loginPass'){
        iniciarSesion();
    }
    if(regVisible && document.activeElement.id === 'regSemestre'){
        registrarse();
    }
});