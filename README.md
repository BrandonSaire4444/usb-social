# 🎓 USB Social — Red Universitaria Salesiana

Sistema web unificado para estudiantes de la **Universidad Salesiana de Bolivia**.
Construido con HTML + CSS + JavaScript puro, Bootstrap 5 para la interfaz y
**Supabase** como base de datos online.

**Materia:** Programación Avanzada
**Docente:** Ing. MACRO (Ingeniero Miguel Angel Cruz Ramos)

---

## 🌟 Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Autenticación** | Registro e inicio de sesión de estudiantes |
| 👤 **Perfil** | Datos personales, biografía y reportes académicos |
| 📝 **Notas** | Registro y consulta de calificaciones |
| 🐾 **Mascotas** | Galería de adopción con ficha completa |
| 📰 **Feed** | Publicaciones tipo red social |
| 🛍️ **Tienda** | Productos universitarios (poleras, buzos, etc.) |
| 🧮 **Calculadora** | Calculadora científica + serie de Fibonacci |

---

## 🛠️ Tecnologías utilizadas

- **HTML5** — estructura semántica
- **CSS3** + **Bootstrap 5** — diseño responsivo y colores institucionales USB
- **JavaScript (ES6+)** — lógica modular sin frameworks
- **Supabase** — base de datos PostgreSQL online (REST + SDK oficial)
- **GitHub Pages** — hosting estático gratuito

---

## 📁 Estructura del proyecto

usb-social/
├── index.html
├── README.md
├── css/
│ └── estilo.css
└── js/
├── config.js → Supabase + utilidades comunes
├── auth.js → registro / login / logout
├── perfil.js → perfil + reportes
├── notas.js → CRUD de notas
├── mascotas.js → CRUD de mascotas
├── feed.js → publicaciones
├── tienda.js → productos universitarios
└── calculadora.js → calculadora + Fibonacci

## 🚀 Cómo desplegar

1. Clona o descarga este repositorio.
2. Verifica que las credenciales de Supabase estén en `js/config.js`.
3. Sube los cambios a GitHub.
4. Ve a **Settings → Pages** y activa GitHub Pages desde la rama `main`.
5. Accede en: `https://TU-USUARIO.github.io/usb-social/`

---

## 🗄️ Esquema de la base de datos (Supabase)

| Tabla | Uso |
|-------|-----|
| `perfiles` | Cuentas de estudiante (email, password hash, carrera, etc.) |
| `estudiantes` | Registro de notas (materia + nota por estudiante) |
| `mascotas` | Mascotas en adopción con foto |
| `publicaciones` | Feed social |
| `productos` | Tienda universitaria |

---

## 👨‍💻 Autor

**Brandon S.**
Universidad Salesiana de Bolivia — Programación Avanzada
Docente: Ing. Miguel Angel Cruz Ramos (Ing. MACRO)

---

## 📌 Notas

- Los datos se guardan en Supabase y son visibles para todos los usuarios.
- El sistema está diseñado con fines académicos y de demostración.