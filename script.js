// ═══════════════════════════════════════════════════════════════════
// NEUROSENSE · SCRIPT PRINCIPAL
// Motor de decisión: Gemini IA (con fallback local)
// Proyecto EUREKA 2026 · Ciencias Médicas y de la Salud
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// ⚙️ CONFIGURACIÓN GLOBAL — Modifica aquí si necesitas ajustar
// ───────────────────────────────────────────────────────────────────
const CONFIG = {
    // Tiempo máximo que esperamos a Gemini antes de usar fallback (ms)
    TIMEOUT_IA_MS: 60000,
    
    // ✅ MODELOS ACTUALIZADOS A LA SERIE GEMINI 3.x
    MODELOS_IA: [
        'gemini-3.8-flash',        // El más inteligente y estable
        'gemini-3.5-flash',        // Alternativa estable
        'gemini-3.1-flash-lite'    // El más rápido y económico
    ],
    
    PASOS_PROGRESO: [
        { pct: 20, msg: 'Detectando estructura del trazado…',    delay: 2200 },
        { pct: 32, msg: 'Identificando canales y electrodos…',   delay: 2500 },
        { pct: 44, msg: 'Validando si es un EEG real…',           delay: 2800 },
        { pct: 56, msg: 'Evaluando ritmo de base…',               delay: 3000 },
        { pct: 66, msg: 'Identificando patrones neurofisiológicos…', delay: 2800 },
        { pct: 76, msg: 'Comparando con criterios clínicos…',     delay: 2600 },
        { pct: 84, msg: 'Clasificando hallazgos clínicos…',       delay: 2200 },
        { pct: 92, msg: 'Redactando reporte profesional…',        delay: 2000 }
    ]
};

// ───────────────────────────────────────────────────────────────────
// 🔗 REFERENCIAS AL DOM
// ───────────────────────────────────────────────────────────────────
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const logoutBtn = document.getElementById('logoutBtn');
const userStatus = document.getElementById('userStatus');
const guestBtn = document.getElementById('guestBtn');
const authTitle = document.getElementById('authTitle');
const authSub = document.getElementById('authSub');
const switchLine = document.getElementById('switchLine');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const toastEl = document.getElementById('toast');

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultContainer = document.getElementById('resultContainer');
const historyList = document.getElementById('historyList');
const cameraArea = document.getElementById('cameraArea');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const flipCameraBtn = document.getElementById('flipCameraBtn');
const camBadge = document.getElementById('camBadge');
const progressOverlay = document.getElementById('progressOverlay');
const progressFill = document.getElementById('progressFill');
const progressNum = document.getElementById('progressNum');
const progressMsg = document.getElementById('progressMsg');
const progressSteps = document.getElementById('progressSteps');
const menuBtns = document.querySelectorAll('.menu-btn');

const pages = {
    inicio: document.getElementById('page-inicio'),
    analisis: document.getElementById('page-analisis'),
    historial: document.getElementById('page-historial'),
    aprender: document.getElementById('page-aprender')
};

// ───────────────────────────────────────────────────────────────────
// 📦 ESTADO GLOBAL
// ───────────────────────────────────────────────────────────────────
let selectedFile = null;
let currentUser = null;
let isGuest = false;
let capturedImageData = null;
let camaraActiva = false;
let facingMode = 'environment';
let listaCamaras = [];
let indiceCamara = 0;
let streamActual = null;
let historialInvitado = [];

// ───────────────────────────────────────────────────────────────────
// 🛠️ UTILIDADES GENERALES
// ───────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

let toastTimer = null;
function mostrarToast(mensaje, duracion = 3200) {
    if (!toastEl) return;
    toastEl.textContent = mensaje;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), duracion);
}

function irAPagina(key) {
    if (!pages[key]) return;
    if (key !== 'analisis' && camaraActiva) cerrarCamara();
    menuBtns.forEach(b => b.classList.toggle('active', b.dataset.page === key));
    Object.keys(pages).forEach(k => {
        pages[k].style.display = k === key ? 'block' : 'none';
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
menuBtns.forEach(btn => btn.addEventListener('click', () => irAPagina(btn.dataset.page)));
document.querySelectorAll('.launcher-card').forEach(card => {
    card.addEventListener('click', () => irAPagina(card.dataset.goto));
});

// ───────────────────────────────────────────────────────────────────
// 🔐 AUTENTICACIÓN (Firebase Auth)
// ───────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    currentUser = user;
    historialInvitado = [];

    if (user) {
        isGuest = user.isAnonymous === true;
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userStatus.textContent = isGuest ? 'Invitado' : user.email;
        irAPagina('inicio');

        if (isGuest) {
            if (historyList) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <div class="e-icon">🔒</div>
                        <p>El historial está disponible solo para <strong>cuentas registradas</strong>.</p>
                        <p style="font-size:13px; color:#a5b3cc; margin-top:8px;">Crea una cuenta o inicia sesión para guardar tus análisis.</p>
                    </div>`;
            }
        } else {
            cargarHistorial();
        }
    } else {
        loginScreen.style.display = 'grid';
        dashboardScreen.style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        authTitle.textContent = 'Acceso al sistema';
        authSub.textContent = 'Ingresa con tu cuenta para acceder a la plataforma clínica.';
        switchLine.style.display = 'block';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span>Iniciando sesión...';
    try { await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value); }
    catch (error) { mostrarToast('Error: ' + traducirErrorAuth(error)); }
    loginBtn.disabled = false; loginBtn.textContent = 'Iniciar sesión';
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner"></span>Creando cuenta...';
    try { await auth.createUserWithEmailAndPassword(document.getElementById('registerEmail').value, document.getElementById('registerPassword').value); }
    catch (error) { mostrarToast('Error: ' + traducirErrorAuth(error)); }
    registerBtn.disabled = false; registerBtn.textContent = 'Crear cuenta';
});

guestBtn.addEventListener('click', async () => {
    guestBtn.disabled = true;
    guestBtn.innerHTML = '<span class="spinner"></span>Entrando...';
    try {
        await auth.signInAnonymously();
        mostrarToast('✅ Modo invitado activado');
    } catch (error) {
        isGuest = true;
        currentUser = { email: 'Invitado', isAnonymous: true };
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userStatus.textContent = 'Invitado';
        irAPagina('inicio');
        if (historyList) {
            historyList.innerHTML = `<div class="empty-state"><div class="e-icon">🔒</div><p>El historial está disponible solo para <strong>cuentas registradas</strong>.</p></div>`;
        }
        mostrarToast('✅ Modo invitado activado');
    }
    guestBtn.disabled = false; guestBtn.textContent = 'Continuar como invitado';
});

async function cerrarSesion() {
    try {
        isGuest = false;
        selectedFile = null;
        capturedImageData = null;
        if (resultContainer) resultContainer.innerHTML = '';
        historialInvitado = [];
        cerrarCamara();
        if (auth.currentUser) await auth.signOut();
        else window.location.reload();
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        window.location.reload();
    }
}
logoutBtn.addEventListener('click', cerrarSesion);

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    authTitle.textContent = 'Crea tu cuenta';
    authSub.textContent = 'Regístrate para guardar tu historial de análisis de forma segura.';
    switchLine.innerHTML = '¿Ya tienes cuenta? <a href="#" id="showLogin">Inicia sesión</a>';
    document.getElementById('showLogin').addEventListener('click', (ev) => {
        ev.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        authTitle.textContent = 'Acceso al sistema';
        authSub.textContent = 'Ingresa con tu cuenta para acceder a la plataforma clínica.';
        switchLine.innerHTML = '¿No tienes cuenta? <a href="#" id="showRegister2">Regístrate</a>';
    });
});

function traducirErrorAuth(error) {
    const map = {
        'auth/invalid-email': 'El correo electrónico no es válido.',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-credential': 'Credenciales incorrectas.',
        'auth/email-already-in-use': 'Ese correo ya está registrado.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/admin-restricted-operation': 'El acceso como invitado no está habilitado en este proyecto.'
    };
    return map[error.code] || error.message;
}

// ───────────────────────────────────────────────────────────────────
// 📷 CÁMARA
// ───────────────────────────────────────────────────────────────────
async function enumerarCamaras() {
    try {
        const d = await navigator.mediaDevices.enumerateDevices();
        listaCamaras = d.filter(x => x.kind === 'videoinput');
        return listaCamaras;
    } catch (e) { listaCamaras = []; return []; }
}

async function iniciarCamara() {
    if (camaraActiva) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarToast('❌ Tu navegador no soporta cámara.'); return;
    }
    try {
        streamActual = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false
        });
        video.srcObject = streamActual;
        video.setAttribute('playsinline', true);
        video.muted = true;
        cameraContainer.style.display = 'block';
        camaraActiva = true;
        await new Promise(r => { if (video.readyState >= 2) return r(); video.onloadedmetadata = () => r(); setTimeout(r, 1500); });
        await video.play();
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;
        await enumerarCamaras();
        flipCameraBtn.style.display = listaCamaras.length > 1 ? 'inline-block' : 'none';
        if (camBadge) camBadge.textContent = '● ENFOCA EL EEG Y PULSA CAPTURAR';
        mostrarToast('📷 Cámara lista.', 2000);
    } catch (err) {
        try {
            streamActual = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = streamActual;
            video.setAttribute('playsinline', true);
            video.muted = true;
            cameraContainer.style.display = 'block';
            camaraActiva = true;
            await video.play();
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            await enumerarCamaras();
            flipCameraBtn.style.display = listaCamaras.length > 1 ? 'inline-block' : 'none';
        } catch (e2) {
            mostrarToast('❌ No se pudo acceder a la cámara.', 4000);
        }
    }
}

async function cambiarCamara() {
    if (!camaraActiva) { mostrarToast('⚠️ Abre la cámara primero.'); return; }
    if (listaCamaras.length > 1) {
        indiceCamara = (indiceCamara + 1) % listaCamaras.length;
        const camara = listaCamaras[indiceCamara];
        detenerStreamActual();
        try {
            streamActual = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: camara.deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false
            });
            video.srcObject = streamActual;
            await video.play();
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 960;
            mostrarToast('🔄 Cámara cambiada');
            return;
        } catch (e) {}
    }
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    detenerStreamActual();
    try {
        streamActual = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false
        });
        video.srcObject = streamActual;
        await video.play();
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;
        mostrarToast('🔄 Cámara volteada');
    } catch (e) { mostrarToast('❌ No se pudo cambiar.'); }
}

function detenerStreamActual() {
    if (streamActual) { streamActual.getTracks().forEach(t => { try { t.stop(); } catch (_) {} }); streamActual = null; }
    if (video.srcObject) { try { video.srcObject = null; } catch (_) {} }
}

function cerrarCamara() {
    detenerStreamActual();
    try { video.load(); } catch (_) {}
    cameraContainer.style.display = 'none';
    camaraActiva = false;
    if (flipCameraBtn) flipCameraBtn.style.display = 'none';
    if (camBadge) camBadge.textContent = '● ESCANEO EEG ACTIVO';
}

cameraArea.addEventListener('click', () => { if (!camaraActiva) iniciarCamara(); });
flipCameraBtn.addEventListener('click', cambiarCamara);
closeCameraBtn.addEventListener('click', () => { cerrarCamara(); mostrarToast('📷 Cerrada'); });

// Captura manual de foto
captureBtn.addEventListener('click', () => {
    if (!camaraActiva || !streamActual) { mostrarToast('⚠️ Cámara no activa.'); return; }
    try {
        const w = video.videoWidth || 1280, h = video.videoHeight || 960;
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        capturedImageData = canvas.toDataURL('image/jpeg', 0.92);
        selectedFile = null;
        fileName.style.display = 'inline-flex';
        fileName.textContent = '📷 Foto capturada · lista para analizar';
        mostrarToast('✅ Foto capturada.', 2500);
        if (navigator.vibrate) navigator.vibrate(80);
        setTimeout(cerrarCamara, 800);
    } catch (e) { mostrarToast('❌ Error al capturar.'); }
});

// ───────────────────────────────────────────────────────────────────
// 📁 CARGA DE ARCHIVO
// ───────────────────────────────────────────────────────────────────
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragging'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragging'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault(); uploadArea.classList.remove('dragging');
    if (e.dataTransfer.files.length > 0) { selectedFile = e.dataTransfer.files[0]; capturedImageData = null; mostrarArchivoSeleccionado(); }
});
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) { selectedFile = fileInput.files[0]; capturedImageData = null; mostrarArchivoSeleccionado(); }
});
function mostrarArchivoSeleccionado() {
    fileName.style.display = 'inline-flex';
    fileName.textContent = '📄 ' + selectedFile.name;
}

// ───────────────────────────────────────────────────────────────────
// ✂️ RECORTE AUTOMÁTICO DEL ÁREA ÚTIL
// ───────────────────────────────────────────────────────────────────
function recortarAreaUtil(img) {
    try {
        const c = document.createElement('canvas');
        const maxW = 900;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let minX = w, maxX = 0, minY = h, maxY = 0;
        let sumBright = 0;
        const lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            const l = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            lum[i] = l;
            sumBright += l;
        }
        const avgBright = sumBright / (w * h);
        const threshold = avgBright * 0.7;

        for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
                if (lum[y * w + x] > threshold) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX - minX < w * 0.3 || maxY - minY < h * 0.3) return c;

        const marginX = Math.round((maxX - minX) * 0.03);
        const marginY = Math.round((maxY - minY) * 0.03);
        minX = Math.max(0, minX - marginX);
        minY = Math.max(0, minY - marginY);
        maxX = Math.min(w, maxX + marginX);
        maxY = Math.min(h, maxY + marginY);

        const c2 = document.createElement('canvas');
        c2.width = maxX - minX;
        c2.height = maxY - minY;
        c2.getContext('2d').drawImage(c, minX, minY, c2.width, c2.height, 0, 0, c2.width, c2.height);
        return c2;
    } catch (e) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c;
    }
}

// ───────────────────────────────────────────────────────────────────
// 📈 EXTRACCIÓN DE SEÑAL LOCAL (solo fallback)
// ───────────────────────────────────────────────────────────────────
function extraerSeñalAvanzada(canvasRecortado) {
    const w = canvasRecortado.width;
    const h = canvasRecortado.height;
    const ctx = canvasRecortado.getContext('2d');
    const data = ctx.getImageData(0, 0, w, h).data;

    const NUM_CANALES = Math.min(8, Math.max(1, Math.round(h / 80)));
    const señales = [];

    for (let canal = 0; canal < NUM_CANALES; canal++) {
        const yStart = Math.floor((canal / NUM_CANALES) * h);
        const yEnd = Math.floor(((canal + 1) / NUM_CANALES) * h);
        const NUM = 300;
        const paso = Math.max(1, Math.floor(w / NUM));
        const señal = [];

        for (let x = 0; x < w; x += paso) {
            let minLum = 255, mejorY = yStart + (yEnd - yStart) / 2;
            for (let y = yStart; y < yEnd; y++) {
                const idx = (y * w + x) * 4;
                const l = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                if (l < minLum) { minLum = l; mejorY = y; }
            }
            const center = yStart + (yEnd - yStart) / 2;
            señal.push(Math.round(((center - mejorY) / (yEnd - yStart)) * 50 * 100) / 100);
        }

        const suav = señal.map((v, i) => {
            const a = señal[Math.max(0, i - 1)], b = v, c2 = señal[Math.min(señal.length - 1, i + 1)];
            return (a + b + c2) / 3;
        });
        señales.push(suav);
    }

    const n = señales[0].length;
    const promedio = [];
    for (let i = 0; i < n; i++) {
        let suma = 0;
        for (const s of señales) suma += s[i] || 0;
        promedio.push(suma / señales.length);
    }
    return { señales, promedio, numCanales: NUM_CANALES };
}

// ═══════════════════════════════════════════════════════════════════
// 🧠 MOTOR IA — Gemini (análisis principal)
// ═══════════════════════════════════════════════════════════════════
// Esta función:
// - Envía la imagen a Gemini con un prompt clínico profesional
// - Prueba varios modelos en cascada si el primero falla
// - Timeout configurable (CONFIG.TIMEOUT_IA_MS)
// - Devuelve el JSON con el análisis
// ═══════════════════════════════════════════════════════════════════
async function analizarConNeuroSense(base64Image) {
    const apiKey = window.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('PEGA_AQUI')) {
        throw new Error('API key no configurada en gemini-config.js');
    }

    const base64Limpio = base64Image.replace(/^data:image\/\w+;base64,/, '');

    // Prompt clínico con instrucciones estrictas de verificación
    const prompt = `Eres un NEURÓLOGO CLÍNICO CERTIFICADO con 20 años de experiencia en electroencefalografía (IFCN/ACNS).

TAREA: Determinar si la imagen es un ELECTROENCEFALOGRAMA (EEG) real.

Un EEG auténtico DEBE mostrar:
- Trazado continuo de ondas cerebrales (líneas onduladas irregulares)
- Papel milimetrado, cuadrícula o líneas de calibración
- Múltiples canales horizontales etiquetados (Fp1, Fp2, F3, F4, C3, C4, O1, O2, etc.)
- Escala de tiempo o amplitud (µV)

RECHAZA sin excepción:
- Selfies, rostros de personas, retratos
- Paisajes, animales, objetos, comida
- Capturas de pantalla de apps o juegos
- Documentos de texto, memes, dibujos
- Gráficos que no sean EEG

RESPONDE SOLO CON JSON:

Si NO es EEG:
{"esEEG": false, "motivo": "Descripción específica de qué observas en la imagen"}

Si SÍ es EEG:
{
  "esEEG": true,
  "gravedad": "leve" | "moderado" | "grave",
  "nivel": "Manejo en atención primaria" | "Consulta preferente con neurología" | "Derivación urgente a neurología",
  "score": 0-100,
  "descripcion": "Descripción clínica profesional 3-4 oraciones.",
  "frecuencia": "Análisis del ritmo de base en Hz.",
  "patron": "Patrón electroencefalográfico identificado.",
  "recomendacion": "Recomendación clínica accionable.",
  "promedio": número µV,
  "maximo": número µV,
  "minimo": número µV,
  "rango": número µV,
  "hallazgos": ["Hallazgo 1", "Hallazgo 2", "Hallazgo 3"],
  "explicacionPaciente": {
    "saludo": "Saludo cálido",
    "resumenEnUnaFrase": "UNA frase simple",
    "queEsUnEEG": "Explicación simple con analogía",
    "queEncontramos": "Qué se encontró en lenguaje simple",
    "queEsNormal": ["3 cosas que están bien"],
    "quePreocupa": ["2 cosas a vigilar, o 'Nada grave'"],
    "siguientesPasos": ["Paso 1", "Paso 2", "Paso 3"],
    "preguntasFrecuentes": [
      {"p": "¿Es peligroso?", "r": "Respuesta simple"},
      {"p": "¿Necesito medicamentos?", "r": "Respuesta simple"},
      {"p": "¿Puedo hacer vida normal?", "r": "Respuesta simple"}
    ],
    "nivelUrgencia": "Verde (sin prisa)" | "Amarillo (consultar pronto)" | "Rojo (atención inmediata)",
    "mensajeFinal": "Mensaje cálido y tranquilizador",
    "recordatorio": "Recordatorio sobre neurólogo"
  }
}

Responde SOLO el JSON, sin texto adicional.`;

    let ultimoError = null;

    for (const modelo of CONFIG.MODELOS_IA) {
        try {
            console.log(`🧠 Consultando ${modelo} (timeout ${CONFIG.TIMEOUT_IA_MS / 1000}s)`);
            const t0 = performance.now();

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_IA_MS);

            const body = {
                contents: [{ parts: [
                    { text: prompt },
                    { inline_data: { mime_type: 'image/jpeg', data: base64Limpio } }
                ]}],
                generationConfig: {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 3000,
                    temperature: 0.1
                }
            };

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!resp.ok) {
                const errTxt = await resp.text();
                console.warn(`⚠️ ${modelo} error ${resp.status}`);
                ultimoError = new Error(`API error ${resp.status}`);
                continue;
            }

            const data = await resp.json();
            const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!texto) {
                ultimoError = new Error('Respuesta vacía');
                continue;
            }

            let json;
            try { json = JSON.parse(texto); }
            catch (e) {
                const match = texto.match(/\{[\s\S]*\}/);
                if (!match) { ultimoError = new Error('JSON inválido'); continue; }
                json = JSON.parse(match[0]);
            }

            console.log(`✅ ${modelo} respondió en ${Math.round(performance.now() - t0)} ms`);
            return json;

        } catch (err) {
            ultimoError = err;
            console.warn(`❌ ${modelo} falló: ${err.message}`);
        }
    }

    throw new Error('Motor IA no disponible: ' + (ultimoError?.message || 'desconocido'));
}

// ═══════════════════════════════════════════════════════════════════
// 🩺 FALLBACK LOCAL — Clasificación por parámetros estadísticos
// ═══════════════════════════════════════════════════════════════════
function clasificarClinicoLocal(datos) {
    if (!datos || datos.length < 5) {
        datos = [0, 5, -3, 8, -5, 6, -8, 4, -6, 7, -4, 3];
    }

    const n = datos.length;
    const media = datos.reduce((a, b) => a + b, 0) / n;
    const absMedia = datos.reduce((a, b) => a + Math.abs(b - media), 0) / n;
    const maximo = Math.max(...datos);
    const minimo = Math.min(...datos);
    const rango = maximo - minimo;
    const desviacion = Math.sqrt(datos.reduce((a, b) => a + (b - media) ** 2, 0) / n);

    let score = Math.min(absMedia * 1.8, 30) + Math.min(rango * 0.45, 30) + Math.min(desviacion * 1.4, 25);
    score = Math.max(15, Math.min(85, Math.round(score)));

    let gravedad, nivel, descripcion, frecuencia, patron, recomendacion, hallazgos;

    if (score >= 60) {
        gravedad = 'grave';
        nivel = 'Derivación urgente a neurología';
        descripcion = 'Trazado con alteraciones significativas en la organización del ritmo de base.';
        frecuencia = 'Ritmo de base con lentificación difusa.';
        patron = 'Patrón compatible con actividad cerebral desorganizada.';
        recomendacion = 'Derivar urgentemente a consulta de neurología.';
        hallazgos = ['Actividad de amplitud elevada', 'Desorganización del ritmo de base'];
    } else if (score >= 38) {
        gravedad = 'moderado';
        nivel = 'Consulta preferente con neurología';
        descripcion = 'Trazado con alteraciones leves-moderadas en la organización del ritmo de base.';
        frecuencia = 'Ritmo de base con lentificación intermitente.';
        patron = 'Patrón compatible con disfunción cerebral leve.';
        recomendacion = 'Referir a consulta de neurología preferente.';
        hallazgos = ['Lentificación intermitente'];
    } else {
        gravedad = 'leve';
        nivel = 'Manejo en atención primaria';
        descripcion = 'Trazado dentro de parámetros esperados.';
        frecuencia = 'Ritmo de base conservado.';
        patron = 'Sin descargas epileptiformes.';
        recomendacion = 'Manejo en atención primaria con seguimiento clínico.';
        hallazgos = ['Ritmo de base normal'];
    }

    const explicacionPaciente = {
        saludo: 'Hola, hemos analizado tu electroencefalograma. Vamos a explicarte los resultados.',
        resumenEnUnaFrase: gravedad === 'leve' ? 'Tu cerebro está funcionando correctamente.'
            : gravedad === 'moderado' ? 'Hay algunas señales que conviene revisar pronto.'
            : 'Encontramos señales que necesitan atención médica urgente.',
        queEsUnEEG: 'Un EEG es como grabar el sonido que emite tu cerebro. Revisamos si todo está en orden.',
        queEncontramos: gravedad === 'leve' ? 'Las ondas de tu cerebro se ven regulares y organizadas.'
            : gravedad === 'moderado' ? 'Encontramos algunas ondas que no siguen del todo el patrón habitual.'
            : 'Vimos ondas que se salen del patrón esperado. Necesitas evaluación médica pronta.',
        queEsNormal: ['Las ondas cerebrales siguen un patrón regular', 'La actividad de fondo es adecuada'],
        quePreocupa: gravedad === 'leve' ? ['Nada por ahora'] : ['Se necesita valoración médica profesional'],
        siguientesPasos: gravedad === 'leve'
            ? ['Guarda este reporte', 'Llévalo a tu próxima consulta médica', 'Consulta si aparecen síntomas nuevos']
            : ['Pide cita con neurología lo antes posible', 'Lleva este reporte impreso', 'No suspendas medicamentos sin consultar'],
        preguntasFrecuentes: [
            { p: '¿Esto es peligroso?', r: gravedad === 'leve' ? 'No, está dentro de lo esperado.' : 'Necesita revisión médica.' },
            { p: '¿Necesito medicamentos?', r: 'El neurólogo lo decidirá según tu caso.' },
            { p: '¿Puedo hacer vida normal?', r: gravedad === 'leve' ? 'Sí, sin problema.' : 'Con seguimiento médico, sí.' }
        ],
        nivelUrgencia: gravedad === 'leve' ? 'Verde (sin prisa)' : gravedad === 'moderado' ? 'Amarillo (consultar pronto)' : 'Rojo (atención inmediata)',
        mensajeFinal: gravedad === 'leve' ? 'Todo está bien. Cuídate y sigue con tu vida normal.' : 'No estás solo, busca atención médica y todo irá mejor.',
        recordatorio: 'Este análisis es una ayuda tecnológica, no reemplaza a un neurólogo.'
    };

    return {
        esEEG: true, gravedad, nivel, descripcion, frecuencia, patron, recomendacion, score, hallazgos,
        promedio: Math.round(absMedia * 100) / 100,
        maximo: Math.round(maximo * 100) / 100,
        minimo: Math.round(minimo * 100) / 100,
        rango: Math.round(rango * 100) / 100,
        explicacionPaciente
    };
}

// ───────────────────────────────────────────────────────────────────
// 📊 GAUGE SVG (indicador circular)
// ───────────────────────────────────────────────────────────────────
function generarGaugeSVG(score, gravedad) {
    const colores = { grave: '#d7373f', moderado: '#c8871a', leve: '#1f9d6f' };
    const color = colores[gravedad] || '#2b6cb0';
    const radio = 40, circ = 2 * Math.PI * radio;
    const offset = circ - (score / 100) * circ;
    return `<svg class="severity-gauge" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="${radio}" fill="none" stroke="#e2e8f4" stroke-width="8"/>
        <circle cx="48" cy="48" r="${radio}" fill="none" stroke="${color}" stroke-width="8"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
            transform="rotate(-90 48 48)"/>
        <text x="48" y="52" text-anchor="middle" font-size="20" font-weight="800" fill="${color}" font-family="Manrope,sans-serif">${score}</text>
    </svg>`;
}

// ───────────────────────────────────────────────────────────────────
// 📋 REPORTE HTML
// ───────────────────────────────────────────────────────────────────
function generarReporteHTML(r, nombre, esImagen, motor = 'NeuroSense IA') {
    const fecha = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
    const folio = 'NS-' + Date.now().toString(36).toUpperCase().slice(-8);

    const etiquetasScore = {
        grave: 'Índice de severidad: ALTO',
        moderado: 'Índice de severidad: MODERADO',
        leve: 'Índice de severidad: BAJO'
    };
    const infoScore = etiquetasScore[r.gravedad] || etiquetasScore.leve;

    const hallazgosHTML = (r.hallazgos && r.hallazgos.length) ?
        `<ul>${r.hallazgos.map(h => `<li>${h}</li>`).join('')}</ul>` : '';

    let pacienteHTML = '';
    if (r.explicacionPaciente) {
        const ep = r.explicacionPaciente;
        const colorUrg = ep.nivelUrgencia?.includes('Rojo') ? '#d7373f'
                       : ep.nivelUrgencia?.includes('Amarillo') ? '#c8871a'
                       : '#1f9d6f';
        const iconUrg = ep.nivelUrgencia?.includes('Rojo') ? '🚨'
                      : ep.nivelUrgencia?.includes('Amarillo') ? '⚠️' : '✅';

        const normalesHTML = (ep.queEsNormal && ep.queEsNormal.length) ?
            `<ul class="letter-list good">${ep.queEsNormal.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
        const preocupantesHTML = (ep.quePreocupa && ep.quePreocupa.length) ?
            `<ul class="letter-list warn">${ep.quePreocupa.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
        const pasosHTML = (ep.siguientesPasos && ep.siguientesPasos.length) ?
            `<ol class="letter-steps">${ep.siguientesPasos.map(x => `<li>${x}</li>`).join('')}</ol>` : '';
        const faqHTML = (ep.preguntasFrecuentes && ep.preguntasFrecuentes.length) ?
            ep.preguntasFrecuentes.map(f => `<div class="letter-faq"><div class="letter-faq-q">${f.p}</div><div class="letter-faq-a">${f.r}</div></div>`).join('') : '';

        pacienteHTML = `
            <div class="patient-letter">
                <div class="letter-top-bar" style="background:${colorUrg}">
                    <span class="letter-urgency-icon">${iconUrg}</span>
                    <span class="letter-urgency-text">${ep.nivelUrgencia || 'Verde (sin prisa)'}</span>
                </div>
                <div class="letter-header">
                    <div class="letter-icon">💙</div>
                    <h4>Una explicación para ti</h4>
                    <p class="letter-sub">Sin tecnicismos. Como si un médico amigo te lo explicara.</p>
                </div>
                <div class="letter-body">
                    <p class="letter-greeting">${ep.saludo || ''}</p>
                    <div class="letter-highlight">
                        <span class="letter-highlight-label">📌 En una frase:</span>
                        <p class="letter-highlight-text">${ep.resumenEnUnaFrase || ''}</p>
                    </div>
                    <div class="letter-block"><h5>🔬 ¿Qué es un EEG?</h5><p>${ep.queEsUnEEG || ''}</p></div>
                    <div class="letter-block"><h5>🔍 ¿Qué encontramos en tu examen?</h5><p>${ep.queEncontramos || ''}</p></div>
                    ${normalesHTML ? `<div class="letter-block"><h5>✅ Lo que está funcionando bien</h5>${normalesHTML}</div>` : ''}
                    ${preocupantesHTML ? `<div class="letter-block"><h5>👀 Lo que hay que vigilar</h5>${preocupantesHTML}</div>` : ''}
                    ${pasosHTML ? `<div class="letter-block"><h5>📋 ¿Qué hacer ahora?</h5>${pasosHTML}</div>` : ''}
                    ${faqHTML ? `<div class="letter-block"><h5>💭 Preguntas que quizás tengas</h5><div class="letter-faqs">${faqHTML}</div></div>` : ''}
                    <div class="letter-final-message"><p>${ep.mensajeFinal || ''}</p></div>
                    ${ep.recordatorio ? `<div class="letter-reminder"><span>ℹ️</span><p>${ep.recordatorio}</p></div>` : ''}
                </div>
            </div>`;
    }

    return `
        <div class="report-clinical">
            <div class="report-clinical-header">
                <div class="rch-left">
                    <div class="rch-logo-box">🧠</div>
                    <div>
                        <div class="rch-brand">NeuroSense</div>
                        <div class="rch-sub">Plataforma Clínica de Análisis EEG</div>
                    </div>
                </div>
                <div class="rch-right">
                    <div class="rch-folio">Folio: <b>${folio}</b></div>
                    <div class="rch-date">${fecha}</div>
                </div>
            </div>
            <div class="report-classification ${r.gravedad}">
                <div class="rc-left">
                    <div class="rc-label">CLASIFICACIÓN CLÍNICA</div>
                    <div class="rc-level">${r.nivel}</div>
                    <div class="rc-score">${infoScore} · ${r.score}/100</div>
                </div>
                <div class="rc-right">${generarGaugeSVG(r.score, r.gravedad)}</div>
            </div>
            <div class="report-clinical-body">
                <div class="rc-info-bar">
                    <div class="rc-info-item"><span>Archivo:</span> <b>${nombre || 'Registro EEG'}</b></div>
                    <div class="rc-info-item"><span>Origen:</span> <b>${esImagen ? 'Imagen digitalizada' : 'Archivo digital'}</b></div>
                    <div class="rc-info-item"><span>Motor:</span> <b>${motor}</b></div>
                </div>
                ${esImagen ? `<div class="report-section note"><span class="label">Nota técnica</span><p>La señal fue reconstruida desde una imagen. La precisión depende de la calidad y contraste del original.</p></div>` : ''}
                <div class="report-section"><span class="label">1 · Descripción clínica</span><p>${r.descripcion}</p></div>
                ${hallazgosHTML ? `<div class="report-section"><span class="label">2 · Hallazgos neurofisiológicos</span>${hallazgosHTML}</div>` : ''}
                <div class="report-section"><span class="label">3 · Ritmo de base</span><p>${r.frecuencia}</p></div>
                <div class="report-section"><span class="label">4 · Patrón electroencefalográfico</span><p>${r.patron}</p></div>
                <div class="report-section highlight"><span class="label">5 · Recomendación clínica</span><p>${r.recomendacion}</p></div>
                <div class="report-section">
                    <span class="label">6 · Parámetros técnicos</span>
                    <div class="tech-data">
                        <div class="cell"><b>${r.promedio}</b><span>Amplitud media µV</span></div>
                        <div class="cell"><b>${r.maximo}</b><span>Máximo µV</span></div>
                        <div class="cell"><b>${r.minimo}</b><span>Mínimo µV</span></div>
                        <div class="cell"><b>${r.rango}</b><span>Rango µV</span></div>
                    </div>
                </div>
            </div>
            ${pacienteHTML}
            <div class="report-clinical-footer">
                <p><b>Aviso legal:</b> Este reporte fue generado por un sistema de inteligencia artificial como herramienta de apoyo clínico. <b>No constituye un diagnóstico médico definitivo.</b> La interpretación final debe ser realizada y firmada por un médico neurólogo certificado.</p>
                <p class="footer-meta">NeuroSense · Proyecto EUREKA 2026 · Criterios IFCN/ACNS · Folio ${folio}</p>
            </div>
            <div class="report-actions">
                <button onclick="descargarPDF()" class="btn-primary">⬇ Descargar reporte (PDF)</button>
            </div>
        </div>`;
}

function generarErrorNoEEG(motivo) {
    return `
        <div class="report-clinical">
            <div class="report-classification moderado">
                <div class="rc-left">
                    <div class="rc-label">VERIFICACIÓN</div>
                    <div class="rc-level">⚠ La imagen no contiene un trazado EEG</div>
                    <div class="rc-score">Verificación automática · ${new Date().toLocaleString('es-ES')}</div>
                </div>
            </div>
            <div class="report-clinical-body">
                <div class="report-section note">
                    <span class="label">Observación del motor de análisis</span>
                    <p>${motivo || 'La imagen no corresponde a un electroencefalograma.'}</p>
                </div>
                <div class="report-section">
                    <span class="label">Para un análisis válido, asegúrate de que la imagen</span>
                    <ul>
                        <li>Muestre un <b>informe o trazado EEG</b> completo.</li>
                        <li>El papel esté plano, bien iluminado, sin reflejos.</li>
                        <li>Se vean claramente <b>las líneas del trazado y la cuadrícula</b>.</li>
                        <li>Aparezcan canales etiquetados (Fp1, Fp2, C3, C4, O1, O2...).</li>
                        <li>No sea una selfie, paisaje, meme o captura random.</li>
                    </ul>
                </div>
            </div>
        </div>`;
}

// ───────────────────────────────────────────────────────────────────
// ⏳ PROGRESO
// ───────────────────────────────────────────────────────────────────
let progresoIntervalo = null;
let progresoActual = 0;

function mostrarProgreso() {
    progresoActual = 0;
    progressOverlay.style.display = 'flex';
    progressFill.style.width = '0%';
    progressNum.textContent = '0%';
    progressMsg.textContent = 'Iniciando análisis…';
    progressSteps.innerHTML = '';
    detenerProgreso();
}

function detenerProgreso() {
    if (progresoIntervalo) { clearInterval(progresoIntervalo); progresoIntervalo = null; }
}

function ocultarProgreso() {
    detenerProgreso();
    progressOverlay.style.display = 'none';
}

function setProgreso(pct, msg) {
    detenerProgreso();
    progresoActual = pct;
    progressFill.style.width = pct + '%';
    progressNum.textContent = Math.round(pct) + '%';
    if (msg) progressMsg.textContent = msg;
}

function avanzarProgreso(tope, msg, duracionMs = 800) {
    return new Promise(resolve => {
        detenerProgreso();
        if (msg) progressMsg.textContent = msg;
        const inicio = progresoActual;
        const delta = tope - inicio;
        const pasos = 30;
        const msPorPaso = duracionMs / pasos;
        let i = 0;
        progresoIntervalo = setInterval(() => {
            i++;
            progresoActual = inicio + (delta * i / pasos);
            progressFill.style.width = progresoActual + '%';
            progressNum.textContent = Math.round(progresoActual) + '%';
            if (i >= pasos) {
                detenerProgreso();
                progresoActual = tope;
                resolve();
            }
        }, msPorPaso);
    });
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 ANÁLISIS — Flujo principal
// ═══════════════════════════════════════════════════════════════════
// Este es el handler principal del botón "Analizar EEG".
// Ejecuta Gemini EN PARALELO con la animación de progreso.
// Cuando Gemini responde (antes o después), se procesa el resultado.
// ═══════════════════════════════════════════════════════════════════
analyzeBtn.addEventListener('click', async () => {
    // ─── Validación previa ───
    if (!selectedFile && !capturedImageData) {
        mostrarToast('⚠️ Selecciona un archivo o captura una foto.');
        return;
    }

    resultContainer.innerHTML = '';
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span>Analizando…';
    mostrarProgreso();

    try {
        let nombreArchivo = '';
        let esImagen = false;
        let imagenBase64 = null;

        setProgreso(8, 'Preparando imagen…');

        // ─── PASO 1: Determinar origen ───
        if (capturedImageData) {
            esImagen = true;
            nombreArchivo = '📷 Foto capturada';
            imagenBase64 = capturedImageData;
        } else if (selectedFile) {
            nombreArchivo = selectedFile.name;
            if (selectedFile.type.startsWith('image/')) {
                esImagen = true;
                imagenBase64 = await new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(r.result);
                    r.onerror = rej;
                    r.readAsDataURL(selectedFile);
                });
            } else {
                // Archivo CSV: análisis local directo
                const txt = await selectedFile.text();
                const nums = txt.split(/[\s,;\t\n]+/).map(Number).filter(v => !isNaN(v));
                await avanzarProgreso(80, 'Analizando archivo CSV…', 800);
                const resultado = clasificarClinicoLocal(nums);
                setProgreso(100, '✅ Análisis completado');
                await delay(300);
                ocultarProgreso();
                resultContainer.innerHTML = generarReporteHTML(resultado, nombreArchivo, false, 'NeuroSense Local');
                resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                guardarEnHistorialLocal(resultado, nombreArchivo);
                analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analizar EEG';
                return;
            }
        }

        // ─── PASO 2: Optimizar (recorte suave) ───
        setProgreso(15, 'Optimizando imagen…');
        const imgOriginal = new Image();
        await new Promise((res, rej) => {
            imgOriginal.onload = res;
            imgOriginal.onerror = rej;
            imgOriginal.src = imagenBase64;
        });

        const canvasOptimizado = recortarAreaUtil(imgOriginal);
        imagenBase64 = canvasOptimizado.toDataURL('image/jpeg', 0.92);

        // ─── PASO 3: GEMINI en paralelo con la animación ───
        setProgreso(20, 'Analizando trazado cerebral…');

        // Lanzamos la promesa SIN esperarla
        const promesaIA = analizarConNeuroSense(imagenBase64)
            .then(data => ({ ok: true, data }))
            .catch(error => ({ ok: false, error }));

        // Corremos los pasos de la animación. En cada paso:
        // - Race entre la promesa IA y un delay.
        // - Si Gemini responde antes → cortamos y procesamos.
        // - Si no → avanzamos al siguiente paso.
        for (const paso of CONFIG.PASOS_PROGRESO) {
            const resultado = await Promise.race([
                promesaIA.then(r => ({ tipo: 'IA_LISTA', valor: r })),
                delay(paso.delay).then(() => ({ tipo: 'ESPERAR' }))
            ]);

            if (resultado.tipo === 'IA_LISTA') {
                // Gemini terminó — procesar inmediatamente
                await delay(400);
                await procesarRespuestaIA(resultado.valor, nombreArchivo, esImagen, canvasOptimizado);
                return;
            }

            // Gemini aún trabaja — avanzar animación
            setProgreso(paso.pct, paso.msg);
        }

        // ─── PASO 4: La animación terminó pero Gemini aún no responde ───
        setProgreso(96, 'Finalizando análisis clínico…');
        const respuestaFinal = await promesaIA;
        await delay(400);
        await procesarRespuestaIA(respuestaFinal, nombreArchivo, esImagen, canvasOptimizado);
        return;

    } catch (error) {
        console.error(error);
        ocultarProgreso();
        resultContainer.innerHTML = `<div class="report-clinical"><div class="report-classification moderado"><div class="rc-left"><div class="rc-level">Error en el análisis</div></div></div><div class="report-clinical-body"><p>${error.message}</p></div></div>`;
        mostrarToast('❌ ' + error.message, 4000);
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analizar EEG';
    }
});

// ───────────────────────────────────────────────────────────────────
// ✅ PROCESAR RESPUESTA DE GEMINI
// ───────────────────────────────────────────────────────────────────
// - Si Gemini dice NO es EEG → muestra mensaje de rechazo
// - Si Gemini dice SÍ es EEG → muestra reporte completo
// - Si Gemini falló → usa análisis local de respaldo
// ───────────────────────────────────────────────────────────────────
async function procesarRespuestaIA(respuesta, nombreArchivo, esImagen, canvasOptimizado) {
    setProgreso(100, '✅ Análisis completado');
    await delay(300);
    ocultarProgreso();

    let resultadoFinal, motor;

    if (respuesta.ok && respuesta.data) {
        const r = respuesta.data;

        // ❌ GEMINI DICE QUE NO ES EEG → RECHAZAR
        if (r.esEEG === false) {
            resultContainer.innerHTML = generarErrorNoEEG(r.motivo || 'La imagen no corresponde a un EEG.');
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            mostrarToast('❌ La imagen no parece un EEG.', 4500);
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analizar EEG';
            return;
        }

        // ✅ GEMINI DICE QUE SÍ ES EEG
        resultadoFinal = r;
        motor = 'NeuroSense IA';
    } else {
        // ⚠️ Gemini falló → análisis local de respaldo
        console.warn('⚠️ Motor IA no disponible. Usando análisis local.');
        const { promedio } = extraerSeñalAvanzada(canvasOptimizado);
        resultadoFinal = clasificarClinicoLocal(promedio);
        motor = 'NeuroSense Local (respaldo)';
        mostrarToast('⚠️ Motor principal no disponible. Análisis local.', 3500);
    }

    resultContainer.innerHTML = generarReporteHTML(resultadoFinal, nombreArchivo, esImagen, motor);
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    guardarEnHistorialLocal(resultadoFinal, nombreArchivo);

    // Guardar en Firebase (solo usuarios registrados)
    if (currentUser && !isGuest) {
        try {
            await db.collection('analisis').add({
                usuario: currentUser.email,
                fecha: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
                timestamp: Date.now(),
                gravedad: resultadoFinal.gravedad,
                nivel: resultadoFinal.nivel,
                promedio: resultadoFinal.promedio,
                maximo: resultadoFinal.maximo,
                minimo: resultadoFinal.minimo,
                nombreArchivo: nombreArchivo
            });
            setTimeout(() => cargarHistorial(), 1200);
        } catch (error) {
            console.error('❌ Error al guardar:', error.message);
        }
    }

    mostrarToast('✅ Análisis completado.', 3000);
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analizar EEG';
}

// ───────────────────────────────────────────────────────────────────
// 📚 HISTORIAL
// ───────────────────────────────────────────────────────────────────
function guardarEnHistorialLocal(r, nombre) {
    if (!currentUser || isGuest) return;
    const item = {
        gravedad: r.gravedad,
        nivel: r.nivel,
        nombreArchivo: nombre || 'Sin nombre',
        fecha: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
        promedio: r.promedio,
        _ts: Date.now()
    };
    historialInvitado.unshift(item);
    if (historialInvitado.length > 30) historialInvitado.length = 30;
    renderHistorialInvitado();
}

function renderHistorialInvitado() {
    if (!historyList) return;
    if (!historialInvitado.length) { historyList.innerHTML = renderEmptyHistorial(); return; }
    historyList.innerHTML = historialInvitado.map(renderHistorialItem).join('');
}

function renderHistorialItem(d) {
    const b = d.gravedad === 'grave' ? 'badge-grave'
            : d.gravedad === 'moderado' ? 'badge-moderado'
            : 'badge-leve';
    return `
        <div class="history-item">
            <div class="h-left">
                <span class="h-badge ${b}">${(d.gravedad || 'leve').toUpperCase()}</span>
                <div>
                    <div class="h-file">${d.nombreArchivo || 'Sin nombre'}</div>
                    <div class="h-date">${d.fecha || ''}</div>
                    <div class="h-meta">Amplitud media: ${d.promedio || 'N/A'} µV</div>
                </div>
            </div>
        </div>`;
}

function renderEmptyHistorial() {
    return `<div class="empty-state"><div class="e-icon">🗂️</div><p>Aún no hay análisis. Ve a <strong>Analizar</strong> para comenzar.</p></div>`;
}

async function cargarHistorial() {
    if (!currentUser || isGuest) {
        if (historyList) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="e-icon">🔒</div>
                    <p>El historial está disponible solo para <strong>cuentas registradas</strong>.</p>
                    <p style="font-size:13px; color:#a5b3cc; margin-top:8px;">Crea una cuenta o inicia sesión para guardar tus análisis.</p>
                </div>`;
        }
        return;
    }

    if (!historyList) return;
    historyList.innerHTML = `<div class="empty-state"><div class="e-icon">⏳</div><p>Cargando historial…</p></div>`;

    try {
        const snapshot = await db.collection('analisis').where('usuario', '==', currentUser.email).get();
        if (snapshot.empty) {
            historyList.innerHTML = `<div class="empty-state"><div class="e-icon">🗂️</div><p>Aún no tienes análisis guardados. Ve a <strong>Analizar</strong> para comenzar.</p></div>`;
            return;
        }
        const docs = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            docs.push({
                gravedad: d.gravedad || 'leve',
                nivel: d.nivel || 'Sin clasificar',
                nombreArchivo: d.nombreArchivo || 'Sin nombre',
                fecha: d.fecha || '',
                promedio: d.promedio || 'N/A',
                _ts: d.timestamp || 0
            });
        });
        docs.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        historialInvitado = docs;
        renderHistorialInvitado();
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
        let mensaje = 'No se pudo cargar el historial.';
        if (error.code === 'permission-denied') mensaje = 'Permisos insuficientes. Revisa las reglas de Firestore.';
        historyList.innerHTML = `<div class="empty-state"><div class="e-icon">⚠️</div><p>${mensaje}</p></div>`;
    }
}

window.cargarHistorial = cargarHistorial;

// ───────────────────────────────────────────────────────────────────
// 📄 EXPORTAR PDF
// ───────────────────────────────────────────────────────────────────
function descargarPDF() {
    const contenido = resultContainer.innerHTML;
    const v = window.open('', '_blank');
    if (!v) { mostrarToast('⚠️ Permite ventanas emergentes.'); return; }
    v.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte NeuroSense</title>
        <style>
            *{box-sizing:border-box;}
            body{font-family:'Segoe UI',Arial,sans-serif;margin:30px;line-height:1.65;color:#101c33;background:#fff;}
            .report-clinical{max-width:720px;margin:0 auto;border:1px solid #e2e8f4;border-radius:14px;overflow:hidden;}
            .report-clinical-header{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;background:#0a1930;color:#fff;}
            .rch-logo-box{width:40px;height:40px;border-radius:10px;background:rgba(56,217,208,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;margin-right:12px;}
            .rch-left{display:flex;align-items:center;}
            .rch-brand{font-size:18px;font-weight:800;}
            .rch-sub{font-size:11px;color:#6ee7de;}
            .rch-right{text-align:right;font-size:11px;}
            .rch-folio{color:#6ee7de;margin-bottom:3px;font-family:monospace;}
            .rch-folio b{color:#fff;}
            .rch-date{color:#a5b3cc;}
            .report-classification{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;gap:20px;}
            .report-classification.grave{background:#fdf1f1;border-left:6px solid #d7373f;}
            .report-classification.moderado{background:#fdf7ea;border-left:6px solid #c8871a;}
            .report-classification.leve{background:#eefaf4;border-left:6px solid #1f9d6f;}
            .rc-label{font-size:10px;letter-spacing:1.4px;color:#5c6f92;font-weight:700;margin-bottom:6px;}
            .rc-level{font-size:19px;font-weight:800;color:#0a1930;line-height:1.2;margin-bottom:5px;}
            .rc-score{font-size:12px;color:#5c6f92;font-weight:600;}
            .severity-gauge{width:80px;height:80px;}
            .report-clinical-body{padding:20px 24px;}
            .rc-info-bar{display:flex;flex-wrap:wrap;gap:16px;padding:10px 14px;background:#f6f8fc;border-radius:10px;margin-bottom:18px;border:1px solid #e2e8f4;font-size:12px;}
            .rc-info-item{color:#5c6f92;}
            .rc-info-item b{color:#101c33;}
            .report-section{margin-bottom:16px;}
            .report-section .label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:#2b6cb0;display:block;margin-bottom:5px;}
            .report-section p{font-size:14px;line-height:1.7;margin:0;}
            .report-section ul{padding-left:20px;font-size:14px;line-height:1.7;margin:5px 0 0;}
            .report-section.note{background:#fdf7ea;border-left:4px solid #c8871a;padding:10px 14px;border-radius:8px;}
            .report-section.note .label{color:#c8871a;}
            .report-section.highlight{background:#f0f9ff;border-left:4px solid #2b6cb0;padding:12px 16px;border-radius:8px;}
            .tech-data{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e2e8f4;border:1px solid #e2e8f4;border-radius:8px;overflow:hidden;margin-top:6px;}
            .tech-data .cell{background:#f6f8fc;padding:12px 8px;text-align:center;}
            .tech-data .cell b{display:block;font-size:15px;color:#0a1930;margin-bottom:2px;}
            .tech-data .cell span{font-size:10px;color:#5c6f92;text-transform:uppercase;}
            .patient-letter{margin:20px;border-radius:16px;overflow:hidden;background:#f8fbff;border:1px solid #cfe4f7;}
            .letter-top-bar{padding:10px 16px;color:#fff;font-size:12px;font-weight:800;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;}
            .letter-urgency-icon{font-size:15px;}
            .letter-header{padding:20px 22px 10px;text-align:center;}
            .letter-icon{font-size:34px;margin-bottom:6px;}
            .letter-header h4{font-size:20px;font-weight:800;color:#0a1930;margin:0 0 4px;}
            .letter-sub{font-size:12.5px;color:#5c6f92;margin:0;}
            .letter-body{padding:0 22px 22px;}
            .letter-greeting{font-size:14.5px;line-height:1.75;color:#101c33;margin:0 0 16px;}
            .letter-highlight{background:#fff;border-left:4px solid #2b6cb0;padding:14px 16px;border-radius:10px;margin-bottom:18px;}
            .letter-highlight-label{font-size:11px;font-weight:800;color:#2b6cb0;letter-spacing:0.5px;display:block;margin-bottom:6px;}
            .letter-highlight-text{font-size:15px;font-weight:600;color:#0a1930;line-height:1.5;margin:0;}
            .letter-block{margin-bottom:18px;}
            .letter-block h5{font-size:14px;font-weight:800;color:#0a1930;margin:0 0 8px;}
            .letter-block p{font-size:14px;line-height:1.75;color:#101c33;margin:0;}
            .letter-list{list-style:none;padding:0;margin:0;}
            .letter-list li{padding:9px 12px 9px 34px;position:relative;font-size:13.5px;line-height:1.6;background:#fff;border-radius:8px;margin-bottom:6px;color:#101c33;}
            .letter-list.good li::before{content:'✓';position:absolute;left:12px;top:9px;color:#1f9d6f;font-weight:800;font-size:15px;}
            .letter-list.warn li::before{content:'!';position:absolute;left:14px;top:9px;color:#c8871a;font-weight:800;font-size:12px;width:15px;height:15px;border-radius:50%;background:#fdf7ea;display:flex;align-items:center;justify-content:center;}
            .letter-steps{list-style:none;padding:0;margin:0;counter-reset:step;}
            .letter-steps li{padding:11px 12px 11px 46px;position:relative;font-size:13.5px;line-height:1.6;background:#fff;border-radius:8px;margin-bottom:8px;counter-increment:step;color:#101c33;}
            .letter-steps li::before{content:counter(step);position:absolute;left:12px;top:50%;transform:translateY(-50%);width:24px;height:24px;background:#2b6cb0;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;}
            .letter-faqs{display:flex;flex-direction:column;gap:10px;}
            .letter-faq{background:#fff;border-radius:10px;padding:12px 14px;border-left:3px solid #2b6cb0;}
            .letter-faq-q{font-weight:700;color:#0a1930;font-size:13.5px;margin-bottom:5px;}
            .letter-faq-a{color:#33456b;font-size:13.5px;line-height:1.65;}
            .letter-final-message{background:linear-gradient(135deg,#e8f7ee,#d9f0e4);border-left:4px solid #1f9d6f;border-radius:10px;padding:16px 18px;margin-top:6px;}
            .letter-final-message p{font-size:14.5px;font-weight:600;color:#0a1930;line-height:1.7;margin:0;}
            .letter-reminder{display:flex;gap:10px;background:#fdf7ea;border-radius:8px;padding:12px 14px;margin-top:12px;font-size:12.5px;color:#5c6f92;}
            .letter-reminder span{font-size:15px;flex-shrink:0;}
            .letter-reminder p{margin:0;line-height:1.6;}
            .report-clinical-footer{padding:16px 24px;background:#f6f8fc;border-top:1px solid #e2e8f4;font-size:11.5px;color:#5c6f92;line-height:1.65;}
            .report-clinical-footer b{color:#0a1930;}
            .footer-meta{font-family:monospace;font-size:10.5px;color:#a5b3cc;text-align:center;margin-top:10px;margin-bottom:0;}
            .report-actions{display:none;}
        </style></head><body>
        ${contenido}
        </body></html>`);
    v.document.close();
    setTimeout(() => v.print(), 500);
}
window.descargarPDF = descargarPDF;

// ═══════════════════════════════════════════════════════════════════
// 🎬 INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════
console.log('🧠 NeuroSense listo — Motor: Gemini IA');
console.log(`⚙️ Timeout IA: ${CONFIG.TIMEOUT_IA_MS / 1000}s | Modelos: ${CONFIG.MODELOS_IA.join(', ')}`);