// ==========================================
// CONFIGURACIÓN DE FIREBASE (TIEMPO REAL)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, updateDoc, deleteDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tus credenciales exactas de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBB3GzD6mevNFQEObr_v39cXMTKBPqP-NY",
  authDomain: "chiquitos-servicios.firebaseapp.com",
  projectId: "chiquitos-servicios",
  storageBucket: "chiquitos-servicios.firebasestorage.app",
  messagingSenderId: "70262802824",
  appId: "1:70262802824:web:4ab163c6a37fc726b1d23d"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const trabajadoresRef = collection(db, "trabajadores");

// Credenciales del Administrador
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

// Helper para comprimir y redimensionar imágenes (evita superar el límite de Firestore)
function comprimirImagen(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Exportar comprimido en JPEG
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function filesToCompressedList(fileList) {
    if (!fileList || fileList.length === 0) return [];
    const promises = Array.from(fileList).map(file => comprimirImagen(file, 600, 0.6));
    return await Promise.all(promises);
}

// ==========================================
// 1. REGISTRO DE TRABAJADOR (registro.html)
// ==========================================
window.registrarTrabajador = async function(event) {
    event.preventDefault();

    const btn = event.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Guardando en la nube...";
    }

    try {
        const form = event.target;
        const nombre = form.nombre ? form.nombre.value : document.getElementById('nombre')?.value;
        const telefono = form.telefono ? form.telefono.value : document.getElementById('telefono')?.value;
        const especialidad = form.especialidad ? form.especialidad.value : document.getElementById('especialidad')?.value;
        const barrio = form.barrio ? form.barrio.value : document.getElementById('barrio')?.value;
        const horario = form.horario ? form.horario.value : document.getElementById('horario')?.value;
        const descripcion = form.descripcion ? form.descripcion.value : document.getElementById('descripcion')?.value;

        const fotoInput = document.getElementById('foto_perfil');
        const galeriaInput = document.getElementById('galeria_fotos');

        // Procesar y comprimir imágenes para que quepan en Firestore
        const fotoPerfil = fotoInput && fotoInput.files[0] 
            ? await comprimirImagen(fotoInput.files[0], 500, 0.7) 
            : 'https://via.placeholder.com/150?text=Sin+Foto';

        const galeria = galeriaInput && galeriaInput.files.length > 0 
            ? await filesToCompressedList(galeriaInput.files) 
            : [];

        // Guardar directamente en la nube (Firestore)
        await addDoc(trabajadoresRef, {
            nombre: nombre || 'Sin Nombre',
            telefono: telefono || '',
            especialidad: especialidad || 'General',
            barrio: barrio || 'San José de Chiquitos',
            horario: horario || 'Horario a convenir',
            descripcion: descripcion || '',
            fotoPerfil: fotoPerfil,
            galeria: galeria,
            estado: 'pendiente', 
            fechaCreacion: new Date().toISOString()
        });

        alert('¡Tu solicitud ha sido enviada con éxito! Ya está sincronizada en línea con el Administrador.');
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Error al registrar trabajador:", error);
        alert('Ocurrió un error al enviar la solicitud. Es posible que las imágenes sean muy pesadas.');
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Enviar Hoja de Vida";
        }
    }
};

// ==========================================
// 2. PANEL DE ADMINISTRACIÓN (admin.html)
// ==========================================
window.verificarSesionAdmin = function() {
    const logueado = sessionStorage.getItem('admin_authenticated');
    const overlay = document.getElementById('login-overlay');
    const content = document.getElementById('admin-content');

    if (!logueado) {
        if (overlay) overlay.style.display = 'flex';
        if (content) content.style.display = 'none';
    } else {
        if (overlay) overlay.style.display = 'none';
        if (content) content.style.display = 'block';
        escucharAdminTable();
    }
};

window.iniciarSesionAdmin = function(event) {
    event.preventDefault();
    const user = document.getElementById('admin_user').value;
    const pass = document.getElementById('admin_pass').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('admin_authenticated', 'true');
        window.verificarSesionAdmin();
    } else {
        alert('Usuario o contraseña incorrectos.');
    }
};

window.cerrarSesionAdmin = function() {
    sessionStorage.removeItem('admin_authenticated');
    window.location.reload();
};

function escucharAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    onSnapshot(trabajadoresRef, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No hay registros de trabajadores aún.</td></tr>`;
            return;
        }

        tbody.innerHTML = snapshot.docs.map((docSnap) => {
            const t = docSnap.data();
            const id = docSnap.id;
            return `
                <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 12px; text-align: center;">
                        <img src="${t.fotoPerfil}" alt="${t.nombre}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    </td>
                    <td style="padding: 12px; font-weight: 600;">${t.nombre}</td>
                    <td style="padding: 12px;">${t.especialidad}</td>
                    <td style="padding: 12px;">
                        <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; background: ${t.estado === 'aprobado' ? '#DCFCE7' : '#FEF3C7'}; color: ${t.estado === 'aprobado' ? '#166534' : '#92400E'};">
                            ${t.estado === 'aprobado' ? 'Aprobado' : 'Pendiente'}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        ${t.estado === 'pendiente' 
                            ? `<button onclick="cambiarEstadoTrabajador('${id}', 'aprobado')" style="background: #22C55E; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 4px;">Aprobar</button>` 
                            : `<button onclick="cambiarEstadoTrabajador('${id}', 'pendiente')" style="background: #F59E0B; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 4px;">Pausar</button>`
                        }
                        <button onclick="eliminarTrabajador('${id}')" style="background: #EF4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');
    });
}

window.cambiarEstadoTrabajador = async function(id, nuevoEstado) {
    try {
        const docRef = doc(db, "trabajadores", id);
        await updateDoc(docRef, { estado: nuevoEstado });
    } catch (error) {
        console.error("Error al cambiar estado:", error);
    }
};

window.eliminarTrabajador = async function(id) {
    if (!confirm('¿Seguro que deseas eliminar a este trabajador?')) return;
    try {
        const docRef = doc(db, "trabajadores", id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error al eliminar trabajador:", error);
    }
};

// ==========================================
// 3. DIRECTORIO PÚBLICO (perfiles.html)
// ==========================================
window.renderizarDirectorio = function() {
    const container = document.getElementById('directorio-container');
    if (!container) return;

    onSnapshot(trabajadoresRef, (snapshot) => {
        const trabajadoresAprobados = snapshot.docs
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
            .filter(t => t.estado === 'aprobado');

        if (trabajadoresAprobados.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 8px;">
                <h3>No hay técnicos disponibles por el momento.</h3>
                <p style="color: #64748B;">Sé el primero en <a href="registro.html">ofrecer tus servicios aquí</a>.</p>
            </div>`;
            return;
        }

        container.innerHTML = trabajadoresAprobados.map(t => `
            <div class="card-perfil" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center;">
                <img src="${t.fotoPerfil}" alt="${t.nombre}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin: 0 auto 1rem auto; display: block; border: 3px solid #E2E8F0;">
                <h3 style="margin-bottom: 0.2rem; color: #0F172A;">${t.nombre}</h3>
                <p style="color: #2563EB; font-weight: 600; margin-bottom: 0.5rem;">${t.especialidad}</p>
                <p style="color: #64748B; font-size: 0.9rem; margin-bottom: 1rem;">📍 ${t.barrio}</p>
                <a href="perfil.html?id=${t.id}" class="btn-primary" style="display: inline-block; padding: 0.5rem 1rem; background: #0284C7; color: white; text-decoration: none; border-radius: 6px;">Ver Perfil Completo</a>
            </div>
        `).join('');
    });
};

// ==========================================
// 4. DETALLE DEL PERFIL Y GALERÍA (perfil.html)
// ==========================================
window.cargarDetallePerfil = async function() {
    const contenedorPrincipal = document.getElementById('perfil-detalle-container');
    if (!contenedorPrincipal) return;

    const urlParams = new URLSearchParams(window.location.search);
    const trabajadorId = urlParams.get('id');

    if (!trabajadorId) {
        contenedorPrincipal.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h2>⚠️ Ningún perfil seleccionado</h2>
                <p style="color: #64748B; margin-top: 0.5rem;">Por favor, selecciona un trabajador desde el directorio.</p>
                <a href="perfiles.html" style="display: inline-block; margin-top: 1rem; color: #0284C7; font-weight: 600;">← Volver al Directorio</a>
            </div>`;
        return;
    }

    try {
        const docRef = doc(db, "trabajadores", trabajadorId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || docSnap.data().estado !== 'aprobado') {
            contenedorPrincipal.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h2>❌ Perfil no encontrado o aún no ha sido aprobado</h2>
                    <p style="color: #64748B; margin-top: 0.5rem;">Este perfil no está disponible en la plataforma.</p>
                    <a href="perfiles.html" style="display: inline-block; margin-top: 1rem; color: #0284C7; font-weight: 600;">← Volver al Directorio</a>
                </div>`;
            return;
        }

        const trabajador = docSnap.data();
        const telLimpio = trabajador.telefono.replace(/\D/g, '');
        const mensajeWA = encodeURIComponent(`Hola ${trabajador.nombre}, vi tu perfil en la plataforma Chiquitos Técnicos y quisiera consultar por tus servicios.`);

        contenedorPrincipal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <div style="display: flex; flex-wrap: wrap; gap: 2rem; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 2rem;">
                    <img src="${trabajador.fotoPerfil}" alt="${trabajador.nombre}" style="width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 4px solid #0284C7;">
                    <div>
                        <h1 style="font-size: 2rem; color: #0F172A; margin: 0;">${trabajador.nombre}</h1>
                        <p style="font-size: 1.2rem; color: #0284C7; font-weight: 600; margin: 0.3rem 0;">${trabajador.especialidad}</p>
                        <p style="color: #64748B; margin: 0.2rem 0;">📍 <strong>Barrio / Zona:</strong> ${trabajador.barrio}</p>
                        <p style="color: #64748B; margin: 0.2rem 0;">⏰ <strong>Horarios:</strong> ${trabajador.horario}</p>
                    </div>
                </div>

                <div style="margin-top: 1.5rem;">
                    <h3 style="color: #1E293B; margin-bottom: 0.5rem;">Descripción del Servicio y Experiencia:</h3>
                    <p style="color: #475569; line-height: 1.6;">${trabajador.descripcion || 'Sin descripción detallada.'}</p>
                </div>

                <a href="https://wa.me/${telLimpio}?text=${mensajeWA}" target="_blank" style="display: block; width: 100%; text-align: center; background: #25D366; color: white; padding: 1rem; border-radius: 8px; font-weight: bold; font-size: 1.1rem; text-decoration: none; margin-top: 1.5rem;">
                    💬 Solicitar Trabajo Vía WhatsApp Directo
                </a>
            </div>

            <!-- Galería de Trabajos -->
            <div style="margin-top: 2rem; background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <h3 style="color: #1E293B; margin-bottom: 1rem;">📸 Muestra de Trabajos Realizados</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                    ${trabajador.galeria && trabajador.galeria.length > 0 
                        ? trabajador.galeria.map(img => `
                            <div onclick="abrirModalImagen('${img}')" style="cursor: pointer; border-radius: 8px; overflow: hidden; height: 160px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `).join('')
                        : '<p style="color: #94A3B8; grid-column: 1/-1;">Este trabajador aún no ha subido fotos de sus trabajos.</p>'
                    }
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error al cargar detalle del perfil:", error);
    }
};

window.abrirModalImagen = function(src) {
    const modal = document.getElementById('modal-imagen');
    const img = document.getElementById('imagen-ampliada');
    if (modal && img) {
        img.src = src;
        modal.style.display = 'flex';
    }
};

window.cerrarModalImagen = function() {
    const modal = document.getElementById('modal-imagen');
    if (modal) modal.style.display = 'none';
};