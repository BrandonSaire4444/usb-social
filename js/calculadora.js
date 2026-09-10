/* =========================================================================
   USB SOCIAL — Módulo de Calculadora
   -------------------------------------------------------------------------
   Calculadora científica + generador de la Serie de Fibonacci.
   No usa Supabase (es 100% local).
   ========================================================================= */

/* =========================================================================
   1. ESTADO INTERNO DE LA CALCULADORA
   ========================================================================= */
let pantallaActual       = '0';    // Lo que se muestra
let operandoAnterior     = null;   // Primer operando
let operadorPendiente    = null;   // Operador seleccionado
let esperandoNuevoNumero = false;  // Próximo dígito reinicia pantalla

/* =========================================================================
   2. ACTUALIZAR DISPLAY
   ========================================================================= */
function actualizarDisplay(){
    const el = document.getElementById('calcDisplay');
    if(el) el.textContent = pantallaActual;
}

/* =========================================================================
   3. AGREGAR DÍGITO
   ========================================================================= */
function calcNum(digito){
    // Si venimos de un operador o del "=", reiniciamos
    if(esperandoNuevoNumero){
        pantallaActual = (digito === '.') ? '0.' : digito;
        esperandoNuevoNumero = false;
        actualizarDisplay();
        return;
    }

    // Evita múltiples puntos decimales
    if(digito === '.' && pantallaActual.includes('.')) return;

    // Reemplaza el "0" inicial
    if(pantallaActual === '0' && digito !== '.'){
        pantallaActual = digito;
    } else {
        pantallaActual += digito;
    }
    actualizarDisplay();
}

/* =========================================================================
   4. AGREGAR OPERADOR
   ========================================================================= */
function calcOp(op){
    const valorActual = parseFloat(pantallaActual);

    if(operadorPendiente !== null && !esperandoNuevoNumero){
        calcIgual();
    }

    operandoAnterior     = parseFloat(pantallaActual);
    operadorPendiente    = op;
    esperandoNuevoNumero = true;
}

/* =========================================================================
   5. CALCULAR RESULTADO (=)
   ========================================================================= */
function calcIgual(){
    if(operadorPendiente === null || operandoAnterior === null) return;

    const operandoActual = parseFloat(pantallaActual);
    let resultado;

    switch(operadorPendiente){
        case '+':  resultado = operandoAnterior + operandoActual; break;
        case '-':  resultado = operandoAnterior - operandoActual; break;
        case '*':  resultado = operandoAnterior * operandoActual; break;
        case '/':
            if(operandoActual === 0){
                pantallaActual = 'Error: div/0';
                actualizarDisplay();
                operadorPendiente    = null;
                operandoAnterior     = null;
                esperandoNuevoNumero = true;
                return;
            }
            resultado = operandoAnterior / operandoActual;
            break;
        case '%':  resultado = operandoAnterior % operandoActual; break;
        case '**': resultado = Math.pow(operandoAnterior, 2);     break;
        default:   return;
    }

    pantallaActual       = formatearNumero(resultado).toString();
    operadorPendiente    = null;
    operandoAnterior     = null;
    esperandoNuevoNumero = true;
    actualizarDisplay();
}

/* =========================================================================
   6. LIMPIAR Y BORRAR
   ========================================================================= */
function calcClear(){
    pantallaActual       = '0';
    operandoAnterior     = null;
    operadorPendiente    = null;
    esperandoNuevoNumero = false;
    actualizarDisplay();
}

function calcBack(){
    if(pantallaActual.length <= 1 || pantallaActual === 'Error: div/0'){
        pantallaActual = '0';
    } else {
        pantallaActual = pantallaActual.slice(0, -1);
    }
    actualizarDisplay();
}

/* =========================================================================
   7. FORMATEAR NÚMERO (evita decimales feos)
   ========================================================================= */
function formatearNumero(n){
    if(!Number.isFinite(n)) return 0;
    return parseFloat(n.toFixed(10));
}

/* =========================================================================
   8. SERIE DE FIBONACCI
   -------------------------------------------------------------------------
   Se genera a partir del número que está en pantalla (N).
   ========================================================================= */
function generarFibonacci(){
    const contenedor = document.getElementById('fibOutput');
    const n = Number(pantallaActual);

    // Validaciones
    if(!Number.isInteger(n) || n < 1){
        contenedor.innerHTML = `
            <div class="alert alert-danger mb-0 py-2">
                <i class="bi bi-exclamation-triangle-fill"></i>
                El valor en pantalla (<strong>${escapeHtml(pantallaActual)}</strong>) no es válido.
                Ingresa un entero mayor o igual a 1.
            </div>`;
        return;
    }

    const N_MAXIMO = 1000;
    if(n > N_MAXIMO){
        contenedor.innerHTML = `
            <div class="alert alert-warning mb-0 py-2">
                <i class="bi bi-exclamation-triangle-fill"></i>
                Máximo permitido: ${N_MAXIMO}.
            </div>`;
        return;
    }

    // Generar serie iterativamente (eficiente)
    const serie = [0, 1];
    for(let i = 2; i < n; i++){
        serie.push(serie[i - 1] + serie[i - 2]);
    }
    const resultado = serie.slice(0, n);

    // Renderizar badges
    contenedor.innerHTML = `
        <div class="mb-2"><strong>Primeros ${n} términos:</strong></div>
        <div class="d-flex flex-wrap gap-1">
            ${resultado.map((v, i) => `
                <span class="badge bg-primary">F(${i + 1}) = ${v}</span>
            `).join('')}
        </div>
    `;
}

/* =========================================================================
   9. SOPORTE DE TECLADO FÍSICO
   -------------------------------------------------------------------------
   Permite usar la calculadora con las teclas del teclado.
   Solo funciona si la sección de calculadora está visible.
   ========================================================================= */
document.addEventListener('keydown', (e) => {
    // Solo si la calculadora está visible
    const secCalc = document.getElementById('seccion-calculadora');
    if(!secCalc || !secCalc.classList.contains('activa')) return;

    // No interferir si el usuario está escribiendo en un input
    const tag = document.activeElement.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA') return;

    const k = e.key;

    if(/^[0-9]$/.test(k)){ calcNum(k); e.preventDefault(); return; }
    if(k === '.'){ calcNum('.'); e.preventDefault(); return; }
    if(k === '+'){ calcOp('+'); e.preventDefault(); return; }
    if(k === '-'){ calcOp('-'); e.preventDefault(); return; }
    if(k === '*'){ calcOp('*'); e.preventDefault(); return; }
    if(k === '/'){ calcOp('/'); e.preventDefault(); return; }
    if(k === '%'){ calcOp('%'); e.preventDefault(); return; }
    if(k === 'Enter' || k === '='){ calcIgual(); e.preventDefault(); return; }
    if(k === 'Backspace'){ calcBack(); e.preventDefault(); return; }
    if(k === 'Escape'){ calcClear(); e.preventDefault(); return; }
});

/* =========================================================================
   10. INICIALIZACIÓN
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    actualizarDisplay();
});