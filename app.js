// ===== APP.JS - INTERFAZ PARA EDGE FUNCTION =====

// Variables globales
let supabaseClient = null;
let currentUser = null;
let currentFile = null;
let processingState = false;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
    setupEventListeners();
    checkAuthentication();
});

// ===== INICIALIZAR APLICACIÓN =====
async function initializeApp() {
    try {
        // Verificar que existe config.js
        if (!window.CONFIG) {
            throw new Error('Archivo config.js no encontrado');
        }

        // Inicializar Supabase
        supabaseClient = supabase.createClient(
            CONFIG.SUPABASE.URL,
            CONFIG.SUPABASE.ANON_KEY
        );

        console.log('Aplicación inicializada correctamente');
        updateStatus('Listo para procesar', 'success');

    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        updateStatus('Error de configuración', 'error');
        showNotification('Error de configuración: ' + error.message, 'error');
    }
}

// ===== VERIFICAR AUTENTICACIÓN =====
async function checkAuthentication() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            // Redirigir al login si no hay sesión
            window.location.href = 'login.html';
            return;
        }

        // Obtener datos del usuario del localStorage
        const userInfo = localStorage.getItem('user_info');
        const restauranteInfo = localStorage.getItem('restaurante_actual');
        
        if (!userInfo || !restauranteInfo) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = JSON.parse(userInfo);
        CONFIG.TENANT.RESTAURANTE_ID = JSON.parse(restauranteInfo).id;
        CONFIG.TENANT.RESTAURANTE_ACTUAL = JSON.parse(restauranteInfo);

        console.log('Usuario autenticado:', currentUser.nombre);
        updateUserInfo();

    } catch (error) {
        console.error('Error verificando autenticación:', error);
        window.location.href = 'login.html';
    }
}

// ===== ACTUALIZAR INFO DEL USUARIO =====
function updateUserInfo() {
    // Actualizar header con info del usuario
    const header = document.querySelector('header h1');
    if (header && currentUser) {
        header.innerHTML = `Procesador de Facturas - ${CONFIG.TENANT.RESTAURANTE_ACTUAL.nombre}`;
    }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupEventListeners() {
    // Upload zone
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Click en zona de upload
    uploadZone.addEventListener('click', () => {
        if (!processingState) {
            fileInput.click();
        }
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('drop', handleDrop);
    uploadZone.addEventListener('dragleave', handleDragLeave);

    // Input de archivo
    fileInput.addEventListener('change', handleFileSelect);

    // Botones de acción
    document.getElementById('downloadBtn')?.addEventListener('click', downloadResults);
    document.getElementById('newDocBtn')?.addEventListener('click', resetInterface);
    document.getElementById('copyBtn')?.addEventListener('click', copyToClipboard);

    // Logout (si hay botón)
    const logoutBtn = document.querySelector('[data-action="logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ===== MANEJO DE ARCHIVOS =====
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// ===== VALIDAR Y PROCESAR ARCHIVO =====
async function handleFile(file) {
    try {
        // Validaciones
        if (!validateFile(file)) {
            return;
        }

        currentFile = file;
        
        // Mostrar interfaz de procesamiento
        showProcessingInterface();
        
        // Iniciar procesamiento
        await processDocument(file);

    } catch (error) {
        console.error('Error procesando archivo:', error);
        showNotification('Error procesando archivo: ' + error.message, 'error');
        hideLoadingOverlay();
    }
}

// ===== VALIDAR ARCHIVO =====
function validateFile(file) {
    // Verificar tipo
    if (!CONFIG.APP.ALLOWED_TYPES.includes(file.type)) {
        showNotification('Solo se permiten archivos PDF', 'error');
        return false;
    }

    // Verificar tamaño
    if (file.size > CONFIG.APP.MAX_FILE_SIZE) {
        showNotification('El archivo es demasiado grande. Máximo 10MB', 'error');
        return false;
    }

    return true;
}

// ===== PROCESAR DOCUMENTO =====
async function processDocument(file) {
    try {
        processingState = true;
        showLoadingOverlay('Subiendo archivo...');

        // 1. Subir archivo a Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${CONFIG.TENANT.RESTAURANTE_ID}/${fileName}`;

        updateLoadingText('Subiendo archivo a storage...');
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from(CONFIG.SUPABASE.STORAGE_BUCKET)
            .upload(filePath, file);

        if (uploadError) {
            throw new Error(`Error subiendo archivo: ${uploadError.message}`);
        }

        updateLoadingText('Archivo subido, iniciando procesamiento...');

        // 2. Crear registro en tabla documentos
        const documentId = crypto.randomUUID(); // Generar UUID válido
        
        const { data: docData, error: docError } = await supabaseClient
            .from('documentos')
            .insert({
                id: documentId, // UUID válido generado
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
                nombre_archivo: file.name,
                tipo_documento: 'factura', // Según tu schema
                url_storage: filePath, // Corregido según schema
                tamaño_bytes: file.size, // Corregido según schema
                numero_paginas: 1, // Por defecto
                estado: 'uploaded',
                confianza_clasificacion: 0.5, // Por defecto
                calidad_estimada: 'media', // Por defecto
                checksum_archivo: await calculateFileHash(file),
                usuario_subida: currentUser?.id // Si tienes el usuario
            })
            .select()
            .single();

        if (docError) {
            throw new Error(`Error creando registro: ${docError.message}`);
        }

        updateLoadingText('Procesando con IA...');

        // 3. Llamar a la Edge Function
        const { data: processData, error: processError } = await supabaseClient.functions
            .invoke('process-invoice', {
                body: {
                    record: {
                        name: documentId, // Usar el UUID generado
                        bucket_id: CONFIG.SUPABASE.STORAGE_BUCKET
                    }
                }
            });

        if (processError) {
            throw new Error(`Error en procesamiento: ${processError.message}`);
        }

        updateLoadingText('Procesamiento completado');

        // 4. Obtener resultados
        await loadProcessedResults(documentId);

        hideLoadingOverlay();
        showNotification('¡Documento procesado exitosamente!', 'success');

    } catch (error) {
        console.error('Error en procesamiento:', error);
        showNotification('Error: ' + error.message, 'error');
        hideLoadingOverlay();
        processingState = false;
    }
}

// ===== CARGAR RESULTADOS PROCESADOS =====
async function loadProcessedResults(documentId) {
    try {
        // Obtener datos de factura
        const { data: facturaData, error: facturaError } = await supabaseClient
            .from('datos_extraidos_facturas')
            .select('*')
            .eq('documento_id', documentId)
            .single();

        if (facturaError) {
            throw new Error('No se encontraron datos procesados');
        }

        // Obtener productos
        const { data: productosData } = await supabaseClient
            .from('productos_extraidos')
            .select('*')
            .eq('documento_id', documentId);

        // Mostrar resultados
        displayResults(facturaData, productosData || []);
        showActionsSection();

    } catch (error) {
        console.error('Error cargando resultados:', error);
        showNotification('Error cargando resultados: ' + error.message, 'error');
    }
}

// ===== MOSTRAR RESULTADOS =====
function displayResults(facturaData, productos) {
    const fieldsContainer = document.getElementById('fieldsContainer');
    const confidenceValue = document.getElementById('confidenceValue');

    // Mostrar confianza global
    const confidence = Math.round((facturaData.confianza_global || 0) * 100);
    confidenceValue.textContent = `${confidence}%`;
    
    // Determinar color de confianza
    let confidenceClass = 'low';
    if (confidence >= 90) confidenceClass = 'high';
    else if (confidence >= 70) confidenceClass = 'medium';
    
    confidenceValue.className = `confidence-value ${confidenceClass}`;

    // Crear campos de datos
    const fields = [
        { label: 'Proveedor', value: facturaData.proveedor_nombre, confidence: facturaData.confianza_proveedor },
        { label: 'CIF', value: facturaData.proveedor_cif, confidence: facturaData.confianza_cif },
        { label: 'Número Factura', value: facturaData.numero_factura, confidence: facturaData.confianza_numero },
        { label: 'Fecha', value: formatDate(facturaData.fecha_factura), confidence: facturaData.confianza_fecha },
        { label: 'Base Imponible', value: formatCurrency(facturaData.base_imponible), confidence: facturaData.confianza_base },
        { label: 'IVA', value: formatCurrency(facturaData.iva_importe), confidence: facturaData.confianza_iva },
        { label: 'Total', value: formatCurrency(facturaData.total_factura), confidence: facturaData.confianza_total }
    ];

    fieldsContainer.innerHTML = '';

    fields.forEach(field => {
        if (field.value) {
            const fieldDiv = createFieldElement(field);
            fieldsContainer.appendChild(fieldDiv);
        }
    });

    // Mostrar productos si los hay
    if (productos.length > 0) {
        const productosSection = createProductsSection(productos);
        fieldsContainer.appendChild(productosSection);
    }

    // Guardar datos para descarga
    window.currentResults = {
        factura: facturaData,
        productos: productos
    };
}

// ===== CREAR ELEMENTO DE CAMPO =====
function createFieldElement(field) {
    const div = document.createElement('div');
    div.className = 'field-item';
    
    const confidence = Math.round((field.confidence || 0) * 100);
    let confidenceClass = 'low';
    if (confidence >= 90) confidenceClass = 'high';
    else if (confidence >= 70) confidenceClass = 'medium';

    div.innerHTML = `
        <div class="field-header">
            <span class="field-label">${field.label}</span>
            <span class="confidence-badge ${confidenceClass}">${confidence}%</span>
        </div>
        <div class="field-value">${field.value}</div>
    `;

    return div;
}

// ===== CREAR SECCIÓN DE PRODUCTOS =====
function createProductsSection(productos) {
    const section = document.createElement('div');
    section.className = 'products-section';
    section.innerHTML = `
        <h4>📦 Productos (${productos.length})</h4>
        <div class="products-list">
            ${productos.map(producto => `
                <div class="product-item">
                    <div class="product-description">${producto.descripcion_original}</div>
                    <div class="product-details">
                        <span>Cantidad: ${producto.cantidad || 'N/A'}</span>
                        <span>Precio: ${formatCurrency(producto.precio_unitario_sin_iva)}</span>
                        <span>Total: ${formatCurrency(producto.precio_total_linea_sin_iva)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    return section;
}

// ===== FUNCIONES DE INTERFAZ =====
function showProcessingInterface() {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    updateStatus('Procesando documento...', 'processing');
}

function showActionsSection() {
    document.getElementById('actionsSection').style.display = 'block';
    updateStatus('Documento procesado', 'success');
}

function showLoadingOverlay(text = 'Procesando...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    loadingText.textContent = text;
    overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function updateLoadingText(text) {
    document.getElementById('loadingText').textContent = text;
}

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// ===== ACCIONES DE BOTONES =====
function downloadResults() {
    if (!window.currentResults) {
        showNotification('No hay datos para descargar', 'error');
        return;
    }

    const data = JSON.stringify(window.currentResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Datos descargados', 'success');
}

function resetInterface() {
    // Limpiar estado
    currentFile = null;
    processingState = false;
    window.currentResults = null;
    
    // Resetear interfaz
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('actionsSection').style.display = 'none';
    document.getElementById('fieldsContainer').innerHTML = '';
    document.getElementById('fileInput').value = '';
    
    updateStatus('Listo para procesar', 'success');
    showNotification('Interfaz reiniciada', 'info');
}

async function copyToClipboard() {
    if (!window.currentResults) {
        showNotification('No hay datos para copiar', 'error');
        return;
    }

    try {
        const data = JSON.stringify(window.currentResults, null, 2);
        await navigator.clipboard.writeText(data);
        showNotification('Datos copiados al portapapeles', 'success');
    } catch (error) {
        showNotification('Error copiando al portapapeles', 'error');
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        localStorage.removeItem('user_info');
        localStorage.removeItem('restaurante_actual');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error en logout:', error);
        showNotification('Error cerrando sesión', 'error');
    }
}

// ===== UTILIDADES =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notifications');
    container.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('es-ES');
    } catch (error) {
        return dateString;
    }
}

async function calculateFileHash(file) {
    // Función simple para generar hash del archivo
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}