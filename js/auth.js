/* =========================================================================
   USB SOCIAL — Módulo de Autenticación
   ========================================================================= */

async function registrarse(){
    const nombre   = document.getElementById('regNombre').value.trim();
    const email    = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass     = document.getElementById('regPass').value;
    const carrera  = document.getElementById('regCarrera').value.trim();
    const semestre = Number(document.getElementById('regSemestre').value) || null;
    const rol      = document.getElementById('regRol').value; // 'estudiante' o 'docente'

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
            semestre,
            rol
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

function cerrarSesion(){
    if(!confirm('¿Seguro que quieres cerrar sesión?')) return;

    usuarioActual = null;
    localStorage.removeItem('usbSesion');

    document.getElementById('pantallaAuth').classList.remove('d-none');
    document.getElementById('pantallaApp').classList.add('d-none');
    document.getElementById('navbarApp').classList.add('d-none');

    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value  = '';

    mostrarToast('Sesión cerrada.', 'info');
}

function entrarApp(){
    document.getElementById('pantallaAuth').classList.add('d-none');
    document.getElementById('pantallaApp').classList.remove('d-none');
    document.getElementById('navbarApp').classList.remove('d-none');

    const navUsuario = document.getElementById('navUsuario');
    if(usuarioActual){
        const etiquetaRol = usuarioActual.rol === 'docente' ? '👨‍🏫 Docente' : '🎓 Estudiante';
        navUsuario.textContent = `${usuarioActual.nombre_completo} · ${etiquetaRol}`;
    } else {
        navUsuario.textContent = '';
    }

    cargarPerfil();
    cargarFeed();
    actualizarListaEstudiantes();

    mostrarSeccion('feed');
}

async function verificarSesion(){
    const sesionGuardada = leerSesion();
    if(!sesionGuardada) return;

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

(async function initAuth(){
    window.addEventListener('DOMContentLoaded', async () => {
        await verificarSesion();
    });
})();

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