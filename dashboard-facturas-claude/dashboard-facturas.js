// ===== DASHBOARD DE FACTURAS - SISTEMA COMPLETO =====

// Variables globales
let supabaseClient = null;
let currentUser = null;
let currentFile = null;
let processingState = false;
let facturasData = [];
let currentPage = 1;
const itemsPerPage = 10;
// hybridPDFModal se inicializa desde hybrid-pdf-modal.js

// ===== SISTEMA DE TEMAS =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('dashboard-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`Tema ${newTheme === 'light' ? 'claro' : 'oscuro'} activado`, 'info');
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        themeIcon.parentElement.title = `Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`;
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Iniciando Dashboard de Facturas...');
    await initializeDashboard();
});

// ===== INICIALIZAR DASHBOARD =====
async function initializeDashboard() {
    try {
        // Inicializar tema
        initializeTheme();
        
        // Verificar que existe config.js
        if (!window.CONFIG) {
            throw new Error('Archivo config.js no encontrado');
        }

        // Inicializar Supabase
        supabaseClient = supabase.createClient(
            CONFIG.SUPABASE.URL,
            CONFIG.SUPABASE.ANON_KEY
        );

        console.log('Supabase inicializado correctamente');

        // Verificar autenticación
        await checkAuthentication();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar datos iniciales
        await loadInitialData();

        // ✅ INICIALIZAR MODAL HÍBRIDO DE PDF CON ROBUSTEZ
        console.log('🔍 Inicializando Modal Híbrido de PDF...');
        await initializeHybridPDFModal();
        


        console.log('Dashboard inicializado correctamente');

    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        
        if (error.message.includes('Configuración')) {
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
        }
    }
}

// ===== FUNCIÓN PARA INICIALIZAR MODAL HÍBRIDO DE PDF =====
async function initializeHybridPDFModal() {
    return new Promise((resolve) => {
        const maxAttempts = 5;
        let attempts = 0;
        
        function attemptInitialization() {
            attempts++;
            console.log(`🔄 Intento ${attempts}/${maxAttempts} de inicialización del Modal Híbrido...`);
            
            // Verificar si el modal híbrido ya está disponible
            if (window.hybridPDFModal && typeof window.hybridPDFModal.open === 'function') {
                console.log('✅ Modal Híbrido ya inicializado correctamente');
                resolve(true);
                return;
            }
            
            // Verificar si la función de inicialización está disponible
            if (typeof window.initializeHybridModal === 'function') {
                console.log('🔧 Usando función de inicialización del Modal Híbrido...');
                const success = window.initializeHybridModal();
                if (success) {
                    console.log('✅ Modal Híbrido inicializado exitosamente');
                    resolve(true);
                    return;
                } else {
                    console.warn(`⚠️ Intento ${attempts} falló`);
                }
            } else if (window.HybridPDFModal && typeof window.HybridPDFModal === 'function') {
                try {
                    console.log('🔧 Creando instancia directa del Modal Híbrido...');
                    window.hybridPDFModal = new window.HybridPDFModal();
                    console.log('✅ Modal Híbrido inicializado directamente');
                    resolve(true);
                    return;
                } catch (error) {
                    console.error(`❌ Error creando instancia directa (intento ${attempts}):`, error);
                }
            } else {
                console.warn(`⚠️ Clase HybridPDFModal no disponible (intento ${attempts})`);
            }
            
            // Reintentar si no hemos alcanzado el máximo
            if (attempts < maxAttempts) {
                console.log(`🔄 Reintentando en 500ms... (intento ${attempts + 1}/${maxAttempts})`);
                setTimeout(attemptInitialization, 500);
            } else {
                console.error('❌ Modal Híbrido no pudo inicializarse después de varios intentos');
                console.log('🔍 Estado final:');
                console.log('- window.HybridPDFModal:', typeof window.HybridPDFModal);
                console.log('- window.hybridPDFModal:', typeof window.hybridPDFModal);
                console.log('- window.initializeHybridModal:', typeof window.initializeHybridModal);
                resolve(false);
            }
        }
        
        // Comenzar intentos
        attemptInitialization();
    });
}

// ===== VERIFICAR AUTENTICACIÓN =====
async function checkAuthentication() {
    try {
        // 🚫 MODO DESARROLLO: Saltarse autenticación en localhost para debugging
        if (window.location.hostname === 'localhost' && CONFIG.TENANT?.MODO === 'desarrollo') {
            console.log('🔧 MODO DESARROLLO: Saltando verificación de autenticación');
            // Configurar usuario y restaurante de prueba
            currentUser = { id: 'dev-user', nombre: 'Usuario Desarrollo', email: 'dev@test.com' };
            CONFIG.TENANT.RESTAURANTE_ID = '2852b1af-38d8-43ec-8872-2b2921d5a231'; // ID hardcodeado para desarrollo
            CONFIG.TENANT.RESTAURANTE_ACTUAL = { id: CONFIG.TENANT.RESTAURANTE_ID, nombre: 'Restaurante Desarrollo' };
            updateUserInfo();
            return;
        }
        
        // Verificar que tenemos la configuración necesaria
        if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
            throw new Error('Configuración de Supabase incompleta');
        }

        // Verificar sesión de Supabase
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            throw new Error('Error verificando sesión: ' + sessionError.message);
        }
        
        if (!session) {
            console.log('Redirigiendo a login: no hay sesión activa');
            window.location.href = '../login.html';
            return;
        }

        // Obtener datos del usuario del localStorage
        const userInfo = localStorage.getItem('user_info');
        const restauranteInfo = localStorage.getItem('restaurante_actual');
        
        if (!userInfo || !restauranteInfo) {
            console.log('Redirigiendo a login: datos de usuario no encontrados');
            // Limpiar sesión de Supabase si no hay datos locales
            await supabaseClient.auth.signOut();
            window.location.href = '../login.html';
            return;
        }

        currentUser = JSON.parse(userInfo);
        const restauranteData = JSON.parse(restauranteInfo);
        
        // Verificar que los datos son válidos
        if (!currentUser.id || !restauranteData.id) {
            console.error('Datos de usuario o restaurante inválidos');
            localStorage.removeItem('user_info');
            localStorage.removeItem('restaurante_actual');
            await supabaseClient.auth.signOut();
            window.location.href = '../login.html';
            return;
        }
        
        CONFIG.TENANT.RESTAURANTE_ID = restauranteData.id;
        CONFIG.TENANT.RESTAURANTE_ACTUAL = restauranteData;

        console.log('Usuario autenticado:', currentUser.nombre);
        console.log('Restaurante:', restauranteData.nombre);
        console.log('Restaurante ID:', restauranteData.id);
        
        updateUserInfo();

    } catch (error) {
        console.error('Error verificando autenticación:', error);
        // Limpiar datos locales y redirigir al login
        localStorage.removeItem('user_info');
        localStorage.removeItem('restaurante_actual');
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        window.location.href = '../login.html';
    }
}

// ===== CARGAR DATOS INICIALES =====
async function loadInitialData() {
    try {
        console.log('Cargando datos iniciales...');
        
        // Cargar datos reales de Supabase
        await loadRealDataFromSupabase();
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        // NO más mock data - solo datos reales
        showNotification('Error cargando datos: ' + error.message, 'error');
    }
}

// ===== ACTUALIZAR INFO DEL USUARIO =====
function updateUserInfo() {
    const restauranteInfo = document.getElementById('restauranteInfo');
    if (restauranteInfo && CONFIG.TENANT.RESTAURANTE_ACTUAL) {
        restauranteInfo.textContent = `${CONFIG.TENANT.RESTAURANTE_ACTUAL.nombre} - ${currentUser.nombre}`;
    }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupEventListeners() {
    // Upload zone
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    let fileDialogOpen = false; // evitar doble apertura

    // Click en zona de upload
    if (uploadZone) {
        uploadZone.addEventListener('click', (e) => {
            // Evitar propagación desde el botón interno
            if (e.target && (e.target.id === 'selectFileBtn' || e.target.closest('#selectFileBtn'))) return;
            if (!processingState && !fileDialogOpen) {
                fileDialogOpen = true;
                fileInput.click();
            }
        });
    }

    // Click en botón de selección
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!processingState && !fileDialogOpen) {
                fileDialogOpen = true;
                fileInput.click();
            }
        });
    }

    // Drag & Drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => { e.stopPropagation(); handleDragOver(e); });
        uploadZone.addEventListener('drop', (e) => { e.stopPropagation(); handleDrop(e); });
        uploadZone.addEventListener('dragleave', (e) => { e.stopPropagation(); handleDragLeave(e); });
    }

    // Input de archivo
    if (fileInput) {
        fileInput.addEventListener('change', (e) => { fileDialogOpen = false; handleFileSelect(e); });
    }

    // Botones de filtros
    const filterBtn = document.getElementById('aplicarFiltros');
    const clearBtn = document.getElementById('limpiarFiltros');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', applyFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }

    // Botones de tabla
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Botón de upload
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (!processingState) {
                fileInput.click();
            }
        });
    }

    // Botón de prueba de Storage
    const testStorageBtn = document.getElementById('testStorageBtn');
    if (testStorageBtn) {
        testStorageBtn.addEventListener('click', async () => {
            try {
                testStorageBtn.disabled = true;
                testStorageBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                    Probando...
                `;
                
                const result = await testSupabaseStorage();
                
                if (result) {
                    showNotification('✅ Conexión con Storage verificada', 'success');
                    testStorageBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Storage OK
                    `;
                    testStorageBtn.style.background = '#16a34a';
                } else {
                    showNotification('❌ Error en la conexión con Storage', 'error');
                    testStorageBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Error Storage
                    `;
                    testStorageBtn.style.background = '#dc2626';
                }
                
                // Restaurar botón después de 3 segundos
                setTimeout(() => {
                    testStorageBtn.disabled = false;
                    testStorageBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Probar Storage
                    `;
                    testStorageBtn.style.background = '';
                }, 3000);
                
            } catch (error) {
                console.error('Error en prueba de Storage:', error);
                showNotification('❌ Error en la prueba', 'error');
                testStorageBtn.disabled = false;
                testStorageBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Probar Storage
                `;
                testStorageBtn.style.background = '';
            }
        });
    }

    // Modal de factura
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeFacturaModal);
    }

    // Cerrar modal al hacer clic fuera
    const facturaModal = document.getElementById('facturaModal');
    if (facturaModal) {
        facturaModal.addEventListener('click', (e) => {
            if (e.target === facturaModal) {
                closeFacturaModal();
            }
        });
    }

            // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFacturaModal();
            }
        });
        
        // Controles del PDF (placeholder para la siguiente fase)
        setupPdfControls();
        
        // Botón de prueba del agente
        const testAgenteBtn = document.getElementById('testAgenteBtn');
        if (testAgenteBtn) {
            testAgenteBtn.addEventListener('click', testAgente);
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
        handleFiles(files);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFiles([file]);
    }
}

// ===== FUNCIÓN PRINCIPAL DE MANEJO DE ARCHIVOS =====
async function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    try {
        // Validaciones
        if (!validateFile(file)) {
            return;
        }

        currentFile = file;
        
        // Mostrar estado de carga
        showUploadStatus('Subiendo archivo...', 'uploading');
        
        // Iniciar procesamiento
        await processDocument(file);

    } catch (error) {
        console.error('Error procesando archivo:', error);
        showUploadStatus('Error: ' + error.message, 'error');
        setTimeout(() => {
            hideUploadStatus();
        }, 5000);
    }
}

// ===== VALIDAR ARCHIVO =====
function validateFile(file) {
    // Verificar tipo
    if (!CONFIG.APP.ALLOWED_TYPES.includes(file.type)) {
        showUploadStatus('Solo se permiten archivos PDF', 'error');
        return false;
    }

    // Verificar tamaño
    if (file.size > CONFIG.APP.MAX_FILE_SIZE) {
        showUploadStatus('El archivo es demasiado grande. Máximo 10MB', 'error');
        return false;
    }

    return true;
}

// ===== PROCESAR DOCUMENTO =====
async function processDocument(file) {
    try {
        processingState = true;
        showUploadStatus('Subiendo archivo...', 'uploading');
        updateFileInfo(file.name, file.size);

        // 1. Subir archivo a Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${CONFIG.TENANT.RESTAURANTE_ID}/${fileName}`;

        showUploadStatus('Subiendo archivo a storage...', 'uploading');
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from(CONFIG.SUPABASE.STORAGE_BUCKET)
            .upload(filePath, file);

        if (uploadError) {
            throw new Error(`Error subiendo archivo: ${uploadError.message}`);
        }

        showUploadStatus('Archivo subido, iniciando procesamiento...', 'processing');

        // 2. Crear registro en tabla documentos
        const documentId = crypto.randomUUID();
        
        const { data: docData, error: docError } = await supabaseClient
            .from('documentos')
            .insert({
                id: documentId,
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
                nombre_archivo: file.name,
                tipo_documento: 'factura',
                url_storage: filePath,
                tamaño_bytes: file.size,
                numero_paginas: 1,
                estado: 'uploaded',
                confianza_clasificacion: 0.5,
                calidad_estimada: 'media',
                checksum_archivo: await calculateFileHash(file),
                usuario_subida: currentUser?.id
            })
            .select()
            .single();

        if (docError) {
            throw new Error(`Error creando registro: ${docError.message}`);
        }

        showUploadStatus('Procesando con IA...', 'processing');

        // 3. Llamar a la Edge Function process-invoice con timeout
        console.log('🚀 Invocando Edge Function process-invoice...')
        
        const { data: processData, error: processError } = await Promise.race([
            supabaseClient.functions.invoke('process-invoice', {
                body: {
                    record: {
                        name: documentId,
                        bucket_id: CONFIG.SUPABASE.STORAGE_BUCKET
                    }
                }
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: La función tardó más de 2 minutos')), 120000)
            )
        ]);

        if (processError) {
            console.error('❌ Error de Supabase:', processError)
            throw new Error(`Error en procesamiento: ${processError.message}`);
        }

        console.log('✅ Respuesta exitosa de Edge Function:', processData)
        showUploadStatus('¡Archivo procesado exitosamente!', 'success');
        
        // Recargar datos del dashboard
        setTimeout(async () => {
            await loadRealDataFromSupabase();
            hideUploadStatus();
        }, 2000);

    } catch (error) {
        console.error('Error en procesamiento:', error);
        showUploadStatus('Error: ' + error.message, 'error');
        setTimeout(() => {
            hideUploadStatus();
        }, 5000);
    } finally {
        processingState = false;
    }
}

// Función para calcular hash del archivo
async function calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function updateFileInfo(fileName, fileSize) {
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.textContent = `${fileName} (${formatBytes(fileSize)})`;
        fileInfo.style.color = '#166534';
        fileInfo.style.fontWeight = '600';
        fileInfo.classList.add('has-file');
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function showUploadStatus(text, statusType = 'info') {
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadText = document.getElementById('uploadText');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const statusIcon = document.getElementById('statusIcon');
    
    if (uploadStatus && uploadText && progressFill && progressText && statusIcon) {
        uploadStatus.style.display = 'block';
        uploadText.textContent = text;
        
        // Cambiar el icono según el estado
        if (statusType === 'uploading') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V7L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (statusType === 'processing') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (statusType === 'success') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (statusType === 'error') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        }
        
        // Animar la entrada
        uploadStatus.style.animation = 'none';
        uploadStatus.offsetHeight; // Trigger reflow
        uploadStatus.style.animation = 'slideInUp 0.4s ease';
    }
}

function hideUploadStatus() {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
        uploadStatus.style.display = 'none';
        // Resetear información del archivo
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) {
            fileInfo.textContent = 'No hay archivo seleccionado';
            fileInfo.style.color = '#6b7280';
            fileInfo.style.fontWeight = '500';
            fileInfo.classList.remove('has-file');
        }
    }
}

// ===== FUNCIÓN DEBOUCE =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== FUNCIONES DE LOADING GLOBAL =====
function showGlobalLoading(text = 'Cargando...') {
    const loadingOverlay = document.getElementById('globalLoading');
    const loadingText = document.getElementById('globalLoadingText');
    
    if (loadingOverlay && loadingText) {
        loadingText.textContent = text;
        loadingOverlay.style.display = 'flex';
    }
}

function hideGlobalLoading() {
    const loadingOverlay = document.getElementById('globalLoading');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// ===== FUNCIONES DE UTILIDAD =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
    `;
    
    // Aplicar estilos según el tipo
    switch (type) {
        case 'info':
            notification.style.background = '#3498db';
            break;
        case 'success':
            notification.style.background = '#27ae60';
            break;
        case 'warning':
            notification.style.background = '#f39c12';
            break;
        case 'error':
            notification.style.background = '#e74c3c';
            break;
        default:
            notification.style.background = '#3498db';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
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

// ===== FUNCIONES DE FILTROS =====
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    const estado = document.getElementById('estadoFilter')?.value || '';
    const confianza = document.getElementById('confianzaFilter')?.value || '';
    const fechaDesde = document.getElementById('fechaDesde')?.value || '';
    const fechaHasta = document.getElementById('fechaHasta')?.value || '';

    // Aplicar filtros a los datos
    let filteredData = (window.facturasData || []).filter(factura => {
        let matches = true;

        // Filtro de búsqueda
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            matches = matches && (
                factura.proveedor_nombre?.toLowerCase().includes(searchLower) ||
                factura.numero_factura?.toLowerCase().includes(searchLower) ||
                factura.proveedor_cif?.toLowerCase().includes(searchLower)
            );
        }

        // Filtro de estado
        if (estado && factura.estado !== estado) {
            matches = false;
        }

        // Filtro de confianza
        if (confianza) {
            const confianzaValue = parseFloat(confianza);
            if (factura.confianza_global < confianzaValue) {
                matches = false;
            }
        }

        // Filtros de fecha
        if (fechaDesde) {
            const fechaFactura = new Date(factura.fecha_factura);
            const desde = new Date(fechaDesde);
            if (fechaFactura < desde) {
                matches = false;
            }
        }

        if (fechaHasta) {
            const fechaFactura = new Date(factura.fecha_factura);
            const hasta = new Date(fechaHasta);
            if (fechaFactura > hasta) {
                matches = false;
            }
        }

        return matches;
    });

    // Actualizar tabla con datos filtrados
    renderFacturasTable(filteredData);
    updatePagination(filteredData.length);
}

function clearFilters() {
    // Limpiar campos de filtro
    document.getElementById('searchInput').value = '';
    document.getElementById('estadoFilter').value = '';
    document.getElementById('confianzaFilter').value = '';
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';

    // Restaurar datos originales
    renderFacturasTable(window.facturasData || []);
    updatePagination((window.facturasData || []).length);
}

// ===== FUNCIONES DE TABLA =====
function renderFacturasTable(data = window.facturasData || []) {
    console.log('Renderizando tabla con', data.length, 'facturas');
    
    const tbody = document.querySelector('.facturas-table tbody');
    const tableEmpty = document.getElementById('tableEmpty');
    
    if (!tbody) {
        console.error('❌ No se encontró tbody de la tabla');
        return;
    }
    
    // Ocultar mensaje de tabla vacía
    if (tableEmpty) {
        tableEmpty.style.display = 'none';
    }
    
    if (data.length === 0) {
        console.log('No hay datos para mostrar');
        if (tableEmpty) {
            tableEmpty.style.display = 'block';
        }
        tbody.innerHTML = '';
        return;
    }

    // Calcular rango de paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const facturasPage = data.slice(startIndex, endIndex);
    
    console.log('🔍 ===== VERIFICANDO PAGINACIÓN =====');
    console.log('🔍 currentPage:', currentPage);
    console.log('🔍 itemsPerPage:', itemsPerPage);
    console.log('🔍 startIndex:', startIndex);
    console.log('🔍 endIndex:', endIndex);
    console.log('🔍 facturasPage.length:', facturasPage.length);
    console.log('🔍 Facturas a renderizar:', facturasPage);
    
    if (facturasPage.length === 0) {
        console.warn('⚠️ No hay facturas en esta página');
        alert('⚠️ No hay facturas en esta página');
        return;
    }
    
    console.log('✅ Facturas de página válidas, continuando...');
    
    // Ocultar loading cuando se complete el renderizado
    hideTableLoading();
    
    // ✅ DEBUG: Verificar datos antes de generar HTML
    console.log('🔍 ===== GENERANDO HTML DE LA TABLA =====');
    console.log('🔍 facturasPage.length:', facturasPage.length);
    console.log('🔍 Primera factura para renderizar:', facturasPage[0]);
    
    const htmlContent = facturasPage.map((factura, index) => `
        <tr data-factura-id="${factura.id}">
            <td class="expand-column">
                <button class="expand-btn" onclick="toggleProductsRow('${factura.documento_id || factura.id}', this)" title="Ver productos">
                    ➤
                </button>
            </td>
            <td>
                <span class="estado-badge ${getEstadoClass(factura.estado)}">
                    ${getEstadoLabel(factura.estado)}
                </span>
            </td>
            <td>${factura.numero_factura || 'N/A'}</td>
            <td>${factura.proveedor_nombre || 'N/A'}</td>
            <td>${formatDate(factura.fecha_factura)}</td>
            <td>${formatCurrency(factura.importe_neto || 0)}</td>
            <td>${formatCurrency(factura.iva || 0)}</td>
            <td class="total-factura">💰 ${formatCurrency(factura.total_factura || 0)}</td>
            <td>
                <div class="confidence-display">
                    <span class="confidence-value">${Math.round((factura.confianza_global || 0) * 100)}%</span>
                    <span class="confidence-badge ${getConfidenceClass(factura.confianza_global)}">
                        ${getConfidenceLabel(factura.confianza_global)}
                    </span>
                </div>
            </td>
            <td>
                <div class="proveedor-indicator ${factura.proveedor_nuevo ? 'proveedor-nuevo' : 'proveedor-existente'}">
                    ${factura.proveedor_nuevo ? 'Nuevo' : 'Existente'}
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-avanzado" onclick="openInvoiceAdvanced('${factura.id}')" title="Ver factura con coordenadas y análisis">
                        🎓 Enseñale
                    </button>
                </div>
            </td>
        </tr>
        <tr class="products-row" id="products-row-${factura.documento_id || factura.id}" style="display: none;">
            <td colspan="11">
                <div class="products-container">
                    <div class="products-header">
                        <div class="products-title">
                            📦 Productos de la factura
                            <span class="products-count" id="products-count-${factura.documento_id || factura.id}">0</span>
                        </div>
                    </div>
                    <div class="products-grid" id="products-grid-${factura.documento_id || factura.id}">
                        <!-- Los productos se cargarán dinámicamente -->
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
    
    console.log('🔍 HTML generado (primeros 500 chars):', htmlContent.substring(0, 500));
    console.log('🔍 HTML generado (últimos 500 chars):', htmlContent.substring(htmlContent.length - 500));
    
    // ✅ DEBUG COMPLETO: Ver el HTML completo de una fila
    if (htmlContent.length > 0) {
        const firstRow = htmlContent.split('</tr>')[0] + '</tr>';
        console.log('🔍 PRIMERA FILA COMPLETA:', firstRow);
        
        // Verificar si contiene el botón avanzado
        if (firstRow.includes('btn-advanced')) {
            console.log('✅ El botón avanzado SÍ está en el HTML generado');
        } else {
            console.log('❌ El botón avanzado NO está en el HTML generado');
            console.log('🔍 Buscando "btn-advanced" en:', firstRow);
        }
    }
    
    // ✅ APLICAR HTML A LA TABLA
    tbody.innerHTML = htmlContent;
    
    console.log('🔍 HTML aplicado a la tabla');
    console.log('🔍 ===== FIN GENERACIÓN HTML =====');
    
    // ✅ DEBUG: Verificar que los botones se crearon correctamente
    console.log('🔍 ===== VERIFICANDO BOTONES =====');
    const advancedButtons = document.querySelectorAll('.btn-advanced');
    console.log(`🔍 Botones "Avanzado" encontrados: ${advancedButtons.length}`);
    
    if (advancedButtons.length === 0) {
        console.warn('⚠️ PROBLEMA: No se encontraron botones "Avanzado"');
        console.warn('⚠️ Verificando HTML generado...');
        
        // Verificar el HTML de la tabla
        const tbody = document.querySelector('.facturas-table tbody');
        if (tbody) {
            console.log('🔍 HTML de la tabla generado:', tbody.innerHTML.substring(0, 500) + '...');
        }
    } else {
        advancedButtons.forEach((btn, index) => {
            console.log(`🔍 Botón ${index + 1}:`, btn.outerHTML);
        });
    }
    
    console.log('🔍 ===== FIN VERIFICACIÓN BOTONES =====');
}

function getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'alta';
    if (confidence >= 0.6) return 'media';
    return 'baja';
}

function getConfidenceLabel(confidence) {
    if (confidence >= 0.9) return 'Alta';
    if (confidence >= 0.7) return 'Media';
    return 'Baja';
}

// ===== FUNCIONES DE ESTADO =====
function getEstadoClass(estado) {
    switch (estado) {
        case 'processed': return 'procesado';
        case 'approved': return 'procesado';
        case 'pending': return 'pendiente';
        case 'error': return 'error';
        case 'uploaded': return 'pendiente';
        default: return 'pendiente';
    }
}

function getEstadoLabel(estado) {
    switch (estado) {
        case 'processed': return 'Procesado';
        case 'approved': return 'Aprobado';
        case 'pending': return 'Pendiente';
        case 'error': return 'Error';
        case 'uploaded': return 'Subido';
        default: return 'Desconocido';
    }
}

// ===== FUNCIONES DE ACCIÓN =====
// Funciones viewFactura y editFactura removidas - solo usamos Enseñale ahora

// ===== FUNCIÓN PARA ACTUALIZAR CABECERA DEL MODAL =====
function updateModalHeader(factura, mode = 'view') {
    console.log('🎨 Actualizando cabecera del modal con información específica...');
    console.log('📊 Datos de factura recibidos:', {
        proveedor: factura.proveedor_nombre,
        numero: factura.numero_factura,
        id: factura.id
    });
    
    // ✅ TÍTULO PRINCIPAL - FORMATO: [PROVEEDOR - NÚMERO FACTURA]
    const modalTitle = document.getElementById('modalTitle');
    console.log('🔍 Elemento modalTitle encontrado:', !!modalTitle);
    
    if (modalTitle) {
        const proveedor = factura.proveedor_nombre || 'Proveedor desconocido';
        const numeroFactura = factura.numero_factura || 'S/N';
        const tituloNuevo = `${proveedor} - ${numeroFactura}`;
        
        console.log('✅ Actualizando título a:', tituloNuevo);
        modalTitle.textContent = tituloNuevo;
        
        // Verificar que se aplicó correctamente
        console.log('✅ Título actual en DOM:', modalTitle.textContent);
    } else {
        console.error('❌ No se encontró el elemento modalTitle en el DOM');
    }
    
    // ✅ BUSCAR ELEMENTOS ALTERNATIVOS (por si existen)
    const modalFacturaTitle = document.getElementById('modalFacturaTitle');
    if (modalFacturaTitle) {
        const proveedor = factura.proveedor_nombre || 'Proveedor desconocido';
        const numeroFactura = factura.numero_factura || 'S/N';
        modalFacturaTitle.textContent = `${proveedor} - ${numeroFactura}`;
    }
    
    // ✅ SUBTÍTULO CON INFORMACIÓN ADICIONAL
    const proveedorInfo = document.getElementById('modalProveedorInfo');
    if (proveedorInfo) {
        const fecha = factura.fecha_factura ? formatDate(factura.fecha_factura) : 'Fecha no disponible';
        const total = factura.total_factura ? `${factura.total_factura.toFixed(2)}€` : 'Total no disponible';
        proveedorInfo.textContent = `${fecha} • ${total}`;
    }
    
    // ✅ BADGE DE CONFIANZA
    const confidenceBadge = document.getElementById('modalConfidenceBadge');
    const confidenceText = document.getElementById('modalConfidenceText');
    if (confidenceBadge && confidenceText) {
        const confianza = factura.confianza_global || 0.5;
        const porcentaje = Math.round(confianza * 100);
        confidenceText.textContent = `${porcentaje}%`;
        
        // Actualizar color del badge según confianza
        confidenceBadge.className = 'confidence-badge';
        if (confianza >= 0.8) {
            confidenceBadge.style.background = 'linear-gradient(135deg, #10B981, #34D399)';
        } else if (confianza >= 0.6) {
            confidenceBadge.style.background = 'linear-gradient(135deg, #F59E0B, #FBBF24)';
        } else {
            confidenceBadge.style.background = 'linear-gradient(135deg, #EF4444, #F87171)';
        }
    }
    
    // ✅ BADGE DE ESTADO
    const statusBadge = document.getElementById('modalStatusBadge');
    if (statusBadge) {
        const estado = factura.estado || 'processed';
        const estadoInfo = getEstadoInfo(estado);
        
        statusBadge.className = `status-badge ${estadoInfo.class}`;
        statusBadge.innerHTML = `
            <i class="${estadoInfo.icon}"></i>
            ${estadoInfo.label}
        `;
    }
    
    console.log('✅ Cabecera del modal actualizada correctamente');
}

function getEstadoInfo(estado) {
    switch (estado) {
        case 'processed':
        case 'approved':
            return { class: 'procesado', icon: 'fas fa-check-circle', label: 'Procesado' };
        case 'pending':
        case 'uploaded':
            return { class: 'pendiente', icon: 'fas fa-clock', label: 'Pendiente' };
        case 'error':
            return { class: 'error', icon: 'fas fa-exclamation-triangle', label: 'Error' };
        default:
            return { class: 'procesado', icon: 'fas fa-check-circle', label: 'Procesado' };
    }
}

// ===== FUNCIÓN PARA APLICAR COLORES DE CONFIANZA =====
function aplicarColoresConfianza(factura) {
    console.log('🎨 Aplicando colores de confianza por campo...');
    console.log('📊 Datos de confianza:', {
        confianza_proveedor: factura.confianza_proveedor,
        confianza_datos_fiscales: factura.confianza_datos_fiscales,
        confianza_importes: factura.confianza_importes
    });

    // ✅ FUNCIÓN AUXILIAR PARA DETERMINAR CLASE DE CONFIANZA
    function getConfianzaClass(confianza) {
        if (confianza >= 0.8) return 'campo-confianza-alta';
        if (confianza >= 0.6) return 'campo-confianza-media';
        return 'campo-confianza-baja';
    }

    // ✅ FUNCIÓN AUXILIAR PARA APLICAR ESTILO A UN CONTENEDOR
    function aplicarEstiloConfianza(elementId, confianza, label = '') {
        const element = document.getElementById(elementId);
        if (element) {
            const container = element.closest('.form-group') || element.parentElement;
            if (container) {
                // Remover clases previas
                container.classList.remove('campo-confianza-alta', 'campo-confianza-media', 'campo-confianza-baja');
                // Aplicar nueva clase
                const claseConfianza = getConfianzaClass(confianza);
                container.classList.add(claseConfianza);
                
                // Agregar etiqueta de confianza si no existe
                const existingLabel = container.querySelector('.campo-confianza-label');
                if (!existingLabel && label) {
                    const confidenceLabel = document.createElement('span');
                    confidenceLabel.className = `campo-confianza-label ${claseConfianza.replace('campo-confianza-', '')}`;
                    confidenceLabel.textContent = `${Math.round(confianza * 100)}%`;
                    confidenceLabel.title = `Confianza de ${label}: ${Math.round(confianza * 100)}%`;
                    container.appendChild(confidenceLabel);
                }
                
                console.log(`✅ Aplicado ${claseConfianza} a ${elementId} (${Math.round(confianza * 100)}%)`);
            }
        }
    }

    // 🏢 APLICAR A CAMPOS DE PROVEEDOR
    const confianzaProveedor = factura.confianza_proveedor || 0.5;
    aplicarEstiloConfianza('proveedor', confianzaProveedor, 'proveedor');
    aplicarEstiloConfianza('cifProveedor', confianzaProveedor, 'CIF');

    // 📄 APLICAR A CAMPOS DE DATOS FISCALES  
    const confianzaDatosFiscales = factura.confianza_datos_fiscales || 0.5;
    aplicarEstiloConfianza('numeroFactura', confianzaDatosFiscales, 'número');
    aplicarEstiloConfianza('fechaFactura', confianzaDatosFiscales, 'fecha');

    // 💰 APLICAR A CAMPOS DE IMPORTES
    const confianzaImportes = factura.confianza_importes || 0.5;
    aplicarEstiloConfianza('baseImponible', confianzaImportes, 'base imponible');
    aplicarEstiloConfianza('ivaAmount', confianzaImportes, 'IVA');
    aplicarEstiloConfianza('totalConIva', confianzaImportes, 'total');

    console.log('🎨 Colores de confianza aplicados correctamente');
}

// ===== FUNCIONES DEL MODAL =====
async function openFacturaModal(facturaId, mode = 'view') {
    try {
        console.log('🔍 Buscando factura con ID:', facturaId);
        
        // 🚀 SOLUCIÓN: Obtener datos COMPLETOS desde la base de datos
        let factura = null;
        
        try {
            // 1. Intentar obtener datos completos desde datos_extraidos_facturas
            const { data: datosExtraidos, error: errorExtraidos } = await supabaseClient
                .from('datos_extraidos_facturas')
                .select('*')
                .eq('documento_id', facturaId)
                .single();
            
            if (datosExtraidos && !errorExtraidos) {
                console.log('✅ Datos extraídos encontrados:', datosExtraidos);
                factura = {
                    ...datosExtraidos,
                    id: facturaId, // Asegurar que tenga el ID correcto
                    // Mapear campos si es necesario
                    numero_factura: datosExtraidos.numero_factura,
                    proveedor_nombre: datosExtraidos.proveedor_nombre,
                    proveedor_cif: datosExtraidos.proveedor_cif,
                    base_imponible: datosExtraidos.base_imponible,
                    cuota_iva: datosExtraidos.cuota_iva, // ← ESTE ES EL CAMPO CLAVE
                    total_factura: datosExtraidos.total_factura,
                    estado: 'processed'
                };
            } else {
                console.log('⚠️ No se encontraron datos extraídos, usando datos del dashboard');
                // 2. Fallback a datos del dashboard
                factura = (window.facturasData || []).find(f => f.id === facturaId);
            }
        } catch (dbError) {
            console.log('⚠️ Error obteniendo datos extraídos, usando datos del dashboard:', dbError);
            // 3. Fallback a datos del dashboard
            factura = (window.facturasData || []).find(f => f.id === facturaId);
        }
        
        if (!factura) {
            console.error('❌ Factura no encontrada con ID:', facturaId);
            showNotification('Factura no encontrada', 'error');
            return;
        }
        
        console.log('✅ Factura preparada para modal:', factura);
        console.log('💰 IVA disponible:', factura.cuota_iva);

        // ✅ ACTUALIZAR CABECERA BRAIN STORMERS CON INFORMACIÓN ESPECÍFICA
        console.log('🔄 Llamando updateModalHeader con factura:', factura.proveedor_nombre, factura.numero_factura);
        updateModalHeader(factura, mode);

        // Cargar datos en el modal
        loadFacturaDataInModal(factura, mode);

        // Mostrar el modal
        const modal = document.getElementById('facturaModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevenir scroll
            
            // ✅ DAR UN MOMENTO AL DOM PARA RENDERIZAR Y LUEGO ACTUALIZAR TÍTULO
            setTimeout(() => {
                console.log('🔄 Actualizando título después de mostrar modal...');
                updateModalHeader(factura, mode);
            }, 100);
        }

        // Cargar el PDF de la factura
        console.log('🔄 Iniciando carga del PDF...');
        await loadPdfFromFacturaId(facturaId);

        // Cargar productos en el modal
        console.log('🛒 Cargando productos para el modal...');
        await loadProductsInModal(facturaId);

        console.log('Modal abierto para factura:', facturaId, 'Modo:', mode);

    } catch (error) {
        console.error('Error abriendo modal:', error);
        showNotification('Error abriendo la factura', 'error');
    }
}

function loadFacturaDataInModal(factura, mode) {
    try {
        console.log('📝 Cargando datos en modal para factura:', factura.id);
        
        // 🆕 GUARDAR ID DE FACTURA ACTUAL
        window.currentFacturaId = factura.documento_id || factura.id;
        
        // Cargar datos básicos con colores de confianza
        document.getElementById('numeroFactura').value = factura.numero_factura || '';
        document.getElementById('proveedor').value = factura.proveedor_nombre || '';
        document.getElementById('cifProveedor').value = factura.proveedor_cif || '';
        document.getElementById('provinciaProveedor').value = factura.proveedor_provincia || '';
        document.getElementById('fechaFactura').value = factura.fecha_factura || '';
        document.getElementById('fechaVencimiento').value = factura.fecha_vencimiento || '';
        document.getElementById('concepto').value = factura.concepto || '';
        
        // ✅ APLICAR COLORES DE CONFIANZA A CAMPOS ESPECÍFICOS
        aplicarColoresConfianza(factura);
        
        // Actualizar estado de la factura
        const statusElement = document.getElementById('facturaStatus');
        if (statusElement) {
            statusElement.textContent = getEstadoLabel(factura.estado || 'processed');
            statusElement.className = `status-badge ${getEstadoClass(factura.estado || 'processed')}`;
        }

        // Cargar datos financieros
        document.getElementById('baseImponible').textContent = formatCurrency(factura.base_imponible || 0);
        document.getElementById('ivaAmount').textContent = formatCurrency(factura.cuota_iva || 0);
        document.getElementById('totalConIva').textContent = formatCurrency(factura.total_factura || 0);
        document.getElementById('retencion').textContent = formatCurrency(factura.retencion || 0);

        // 🆕 CARGAR PRODUCTOS AUTOMÁTICAMENTE
        loadProductosInModal(factura.productos || []);

        // Configurar modo de edición
        setModalEditMode(mode);

        console.log('✅ Datos cargados en modal:', factura);

    } catch (error) {
        console.error('❌ Error cargando datos en modal:', error);
        showNotification('Error cargando datos de la factura', 'error');
    }
}

async function loadProductosInModal(productos) {
    try {
        console.log('🛒 Cargando productos en modal:', productos);
        
        // Si no hay productos, cargar desde la base de datos
        if (!productos || productos.length === 0) {
            console.log('📊 No hay productos en factura, cargando desde BD...');
            await loadProductsInModalFromDB();
            return;
        }

        const productosTable = document.getElementById('productosTableBody');
        if (!productosTable) {
            console.error('❌ Tabla de productos no encontrada');
            return;
        }

        let totalSuma = 0;

        productosTable.innerHTML = productos.map(producto => {
            const total = (producto.precio || 0) * (producto.cantidad || 0);
            totalSuma += total;
            
            // 🎨 APLICAR COLORES DE CONFIANZA
            const confianza = producto.confianza_linea || 0.5;
            const confianzaClass = getConfidenceClass(confianza);
            const confianzaPercent = Math.round(confianza * 100);

            return `
                <tr class="producto-row ${confianzaClass}" data-confianza="${confianza}">
                    <td class="producto-ean">${producto.ean || 'N/A'}</td>
                    <td class="producto-descripcion">
                        <div class="producto-info">
                            <span class="producto-nombre">${producto.descripcion || 'N/A'}</span>
                            <span class="producto-confianza ${confianzaClass}">${confianzaPercent}%</span>
                        </div>
                    </td>
                    <td class="producto-unidad">${producto.unidad || 'N/A'}</td>
                    <td class="producto-cantidad">${producto.cantidad || 0}</td>
                    <td class="producto-precio">${formatCurrency(producto.precio || 0)}</td>
                    <td class="producto-descuento">${producto.descuento || '0%'}</td>
                    <td class="producto-total">${formatCurrency(total)}</td>
                    <td class="producto-acciones">
                        <button class="btn-edit-producto" onclick="editProducto('${producto.id || ''}')" title="Editar producto">
                            ✏️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Actualizar suma total
        const sumaTotalElement = document.getElementById('sumaTotal');
        if (sumaTotalElement) {
            sumaTotalElement.textContent = formatCurrency(totalSuma);
        }

        console.log('✅ Productos cargados en modal:', productos.length);

    } catch (error) {
        console.error('❌ Error cargando productos en modal:', error);
    }
}

// 🆕 FUNCIÓN PARA CARGAR PRODUCTOS DESDE LA BASE DE DATOS
async function loadProductsInModalFromDB() {
    try {
        console.log('🔄 Cargando productos desde BD...');
        
        // Obtener el documento_id de la factura actual
        const facturaId = window.currentFacturaId;
        if (!facturaId) {
            console.error('❌ No hay factura actual');
            return;
        }
        
        const { data: productos, error } = await supabaseClient
            .from('productos_extraidos')
            .select(`
                *,
                productos_maestro!fk_productos_extraidos_maestro (
                    nombre_normalizado,
                    categoria_principal,
                    precio_ultimo
                )
            `)
            .eq('documento_id', facturaId)
            .order('id', { ascending: true });
            
        if (error) {
            console.error('❌ Error cargando productos:', error);
            return;
        }
        
        console.log('📊 Productos encontrados:', productos?.length || 0);
        
        // Renderizar productos con intervalos de confianza cromáticos
        renderProductosInModalWithConfidence(productos || []);
        
    } catch (error) {
        console.error('❌ Error en loadProductsInModalFromDB:', error);
    }
}

// 🆕 FUNCIÓN PARA RENDERIZAR PRODUCTOS CON CONFIANZA CROMÁTICA
function renderProductosInModalWithConfidence(productos) {
    const productosTable = document.getElementById('productosTableBody');
    if (!productosTable) return;
    
    if (productos.length === 0) {
        productosTable.innerHTML = `
            <tr>
                <td colspan="8" class="text-center no-products">
                    📦 No se encontraron productos extraídos
                </td>
            </tr>
        `;
        return;
    }
    
    productosTable.innerHTML = productos.map(producto => {
        const confianza = producto.confianza_linea || 0.5;
        const confianzaClass = getConfidenceClass(confianza);
        const confianzaPercent = Math.round(confianza * 100);
        const maestro = producto.productos_maestro;
        
        return `
            <tr class="producto-row ${confianzaClass}" data-confianza="${confianza}">
                <td class="producto-codigo">${producto.codigo_producto || 'N/A'}</td>
                <td class="producto-descripcion">
                    <div class="producto-info">
                        <span class="producto-nombre">${producto.descripcion_original || 'N/A'}</span>
                        <span class="producto-confianza ${confianzaClass}">${confianzaPercent}%</span>
                    </div>
                </td>
                <td class="producto-unidad">${producto.unidad_medida || 'ud'}</td>
                <td class="producto-cantidad">${producto.cantidad || 0}</td>
                <td class="producto-precio">${formatCurrency(producto.precio_unitario_sin_iva || 0)}</td>
                <td class="producto-iva">${producto.tipo_iva || 21}%</td>
                <td class="producto-total">${formatCurrency(producto.precio_total_linea_sin_iva || 0)}</td>
                <td class="producto-acciones">
                    <button class="btn-edit-producto" onclick="editProducto('${producto.id}')" title="Editar producto">
                        ✏️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Productos renderizados con confianza cromática:', productos.length);
}

// 🆕 FUNCIÓN PARA EDITAR PRODUCTO
function editProducto(productoId) {
    try {
        console.log('✏️ Editando producto:', productoId);
        
        // Buscar el producto en la tabla
        const productoRow = document.querySelector(`tr[data-producto-id="${productoId}"]`);
        if (!productoRow) {
            console.error('❌ Producto no encontrado en la tabla');
            return;
        }
        
        // Convertir la fila en modo edición
        const celdas = productoRow.querySelectorAll('td:not(.producto-acciones)');
        celdas.forEach((celda, index) => {
            const valorActual = celda.textContent.trim();
            
            // Crear input de edición
            const input = document.createElement('input');
            input.type = 'text';
            input.value = valorActual;
            input.className = 'edit-producto-input';
            input.style.width = '100%';
            input.style.padding = '4px';
            input.style.border = '1px solid #d1d5db';
            input.style.borderRadius = '4px';
            
            // Reemplazar contenido de la celda
            celda.innerHTML = '';
            celda.appendChild(input);
            
            // Enfocar el input
            input.focus();
        });
        
        // Cambiar botón de editar por guardar/cancelar
        const accionesCell = productoRow.querySelector('.producto-acciones');
        accionesCell.innerHTML = `
            <button class="btn-save-producto" onclick="saveProducto('${productoId}')" title="Guardar cambios">
                💾
            </button>
            <button class="btn-cancel-producto" onclick="cancelEditProducto('${productoId}')" title="Cancelar">
                ❌
            </button>
        `;
        
        console.log('✅ Producto en modo edición');
        
    } catch (error) {
        console.error('❌ Error editando producto:', error);
    }
}

// 🆕 FUNCIÓN PARA GUARDAR CAMBIOS DE PRODUCTO
async function saveProducto(productoId) {
    try {
        console.log('💾 Guardando producto:', productoId);
        
        // Recopilar datos editados
        const productoRow = document.querySelector(`tr[data-producto-id="${productoId}"]`);
        const inputs = productoRow.querySelectorAll('.edit-producto-input');
        
        const datosEditados = {
            descripcion_original: inputs[1]?.value || '',
            cantidad: parseFloat(inputs[3]?.value) || 0,
            precio_unitario_sin_iva: parseFloat(inputs[4]?.value) || 0,
            tipo_iva: parseFloat(inputs[5]?.value) || 21
        };
        
        // Actualizar en base de datos
        const { error } = await supabaseClient
            .from('productos_extraidos')
            .update(datosEditados)
            .eq('id', productoId);
            
        if (error) {
            throw new Error(`Error guardando producto: ${error.message}`);
        }
        
        // Recargar productos
        await loadProductsInModalFromDB();
        
        showNotification('Producto actualizado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error guardando producto:', error);
        showNotification(`Error guardando producto: ${error.message}`, 'error');
    }
}

// 🆕 FUNCIÓN PARA CANCELAR EDICIÓN DE PRODUCTO
function cancelEditProducto(productoId) {
    try {
        console.log('❌ Cancelando edición de producto:', productoId);
        
        // Recargar productos sin guardar cambios
        loadProductsInModalFromDB();
        
    } catch (error) {
        console.error('❌ Error cancelando edición:', error);
    }
}

function setModalEditMode(mode) {
    const isEditMode = mode === 'edit';
    const inputs = document.querySelectorAll('#facturaModal input, #facturaModal select, #facturaModal textarea');
    
    inputs.forEach(input => {
        // Los campos readonly siempre están deshabilitados
        if (input.hasAttribute('readonly')) {
            input.disabled = true;
        } else {
            // Los demás campos se habilitan/deshabilitan según el modo
            input.disabled = !isEditMode;
            
            // 🎨 MANTENER COLORES DE CONFIANZA PERO HACER EDITABLE
            if (isEditMode) {
                input.style.opacity = '1';
                input.style.cursor = 'text';
                // Remover cualquier estilo que haga parecer deshabilitado
                input.style.backgroundColor = '';
                input.style.color = '';
            }
        }
    });

    // Mostrar/ocultar botones según el modo
    const editButton = document.querySelector('#facturaModal .btn-secondary');
    if (editButton) {
        editButton.style.display = isEditMode ? 'none' : 'block';
    }
}

function closeFacturaModal() {
    try {
        const modal = document.getElementById('facturaModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restaurar scroll
        }
        
        // Limpiar recursos del PDF al cerrar el modal
        cleanupPdfResources();
        
        console.log('Modal cerrado');
    } catch (error) {
        console.error('Error cerrando modal:', error);
    }
}

function refreshData() {
    showNotification('Actualizando datos...', 'info');
    loadRealDataFromSupabase();
}

function exportData() {
    const data = {
        facturas: facturasData,
        fecha_exportacion: new Date().toISOString(),
        restaurante: CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturas_${CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Datos exportados correctamente', 'success');
}

// ===== FUNCIONES DE PAGINACIÓN =====
function updatePagination(totalItems = (window.facturasData || []).length) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!paginationInfo || !paginationNumbers || !prevBtn || !nextBtn) return;
    
    // Actualizar info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} facturas`;
    
    // Actualizar botones prev/next
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Generar números de página
    paginationNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.onclick = () => goToPage(i);
        paginationNumbers.appendChild(pageBtn);
    }
}

function goToPage(page) {
    currentPage = page;
    renderFacturasTable();
    updatePagination();
}

function nextPage() {
    if (currentPage < Math.ceil(facturasData.length / itemsPerPage)) {
        currentPage++;
        renderFacturasTable();
        updatePagination();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderFacturasTable();
        updatePagination();
    }
}

// ===== FUNCIONES ADICIONALES DEL MODAL =====
function closeModal() {
    closeFacturaModal();
}

function switchTab(tabName) {
    // Función para cambiar entre pestañas del modal (si se implementan)
    console.log('Cambiando a pestaña:', tabName);
}

function navigateFactura(direction) {
    // Función para navegar entre facturas (si se implementa)
    console.log('Navegando factura:', direction);
}

function setFieldValue(fieldId, value, confidence) {
    const input = document.getElementById(fieldId);
    const confidenceEl = document.getElementById(`conf${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
    
    if (input) {
        input.value = value || '';
    }
    
    if (confidenceEl && confidence !== undefined) {
        const percentage = Math.round(confidence * 100);
        confidenceEl.textContent = `${percentage}%`;
        confidenceEl.className = `confidence-indicator ${getConfidenceClass(confidence)}`;
    }
}

function loadProductos(productos) {
    const container = document.getElementById('productosContainer');
    
    if (!productos || productos.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No hay productos extraídos</p>';
        return;
    }
    
    container.innerHTML = productos.map(producto => `
        <div class="producto-item" data-producto-id="${producto.id}">
            <div class="producto-header">
                <div class="producto-descripcion">${producto.descripcion_original}</div>
                <div class="producto-confianza confidence-badge ${getConfidenceClass(producto.confianza_linea)}">
                    ${Math.round(producto.confianza_linea * 100)}%
                </div>
            </div>
            <div class="producto-details">
                <div class="producto-detail-item">
                    <span>Cantidad:</span>
                    <span>${producto.cantidad} ${producto.unidad_medida}</span>
                </div>
                <div class="producto-detail-item">
                    <span>Precio unitario:</span>
                    <span>${formatCurrency(producto.precio_unitario_sin_iva)}</span>
                </div>
                <div class="producto-detail-item">
                    <span>Total línea:</span>
                    <span>${formatCurrency(producto.precio_total_linea_sin_iva)}</span>
                </div>
                <div class="producto-detail-item">
                    <span>IVA:</span>
                    <span>${producto.tipo_iva}%</span>
                </div>
            </div>
            ${producto.campos_inciertos && producto.campos_inciertos.length > 0 ? 
                `<div style="color: var(--warning); font-size: 0.8rem; margin-top: 8px;">
                    ⚠️ Campos inciertos: ${producto.campos_inciertos.join(', ')}
                </div>` : ''
            }
        </div>
    `).join('');
}

function loadHistorial(historial) {
    const container = document.getElementById('historialContainer');
    
    if (!historial || historial.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No hay historial de cambios</p>';
        return;
    }
    
    container.innerHTML = historial.map(evento => `
        <div class="historial-item">
            <div class="historial-header">
                <div class="historial-accion">${evento.accion}</div>
                <div class="historial-fecha">${formatDate(evento.fecha)}</div>
            </div>
            <div class="historial-detalles">
                ${evento.detalles}
                ${evento.usuario ? `<br><small>Por: ${evento.usuario}</small>` : ''}
            </div>
        </div>
    `).join('');
}

// ===== EDICIÓN DE CAMPOS =====
function editField(fieldName) {
    const input = document.getElementById(fieldName.replace('_', '').replace(/([A-Z])/g, (match, letter, index) => 
        index === 0 ? letter.toLowerCase() : letter
    ));
    
    if (input) {
        input.removeAttribute('readonly');
        input.focus();
        input.select();
        
        // Cambiar el botón de editar por guardar
        const editBtn = input.parentElement.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.innerHTML = '💾';
            editBtn.onclick = () => saveField(fieldName, input);
        }
    }
}

async function saveField(fieldName, input) {
    try {
        const newValue = input.value;
        
        showGlobalLoading('Guardando cambio...');
        
        await mockApi.updateCampo(currentFacturaId, fieldName, newValue);
        
        // Hacer el campo readonly de nuevo
        input.setAttribute('readonly', true);
        
        // Restaurar botón de editar
        const editBtn = input.parentElement.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.innerHTML = '✏️';
            editBtn.onclick = () => editField(fieldName);
        }
        
        hideGlobalLoading();
        showNotification('Campo actualizado correctamente', 'success');
        
        // Actualizar la confianza si es necesario
        // En un caso real, el backend devolvería la nueva confianza
        
    } catch (error) {
        console.error('Error guardando campo:', error);
        showNotification('Error guardando cambio: ' + error.message, 'error');
        hideGlobalLoading();
    }
}

// ===== ACCIONES DE FACTURA =====
async function aprobarFactura() {
    if (!confirm('¿Estás seguro de que quieres aprobar esta factura?')) {
        return;
    }
    
    try {
        showGlobalLoading('Aprobando factura...');
        
        await mockApi.aprobarFactura(currentFacturaId);
        
        hideGlobalLoading();
        showNotification('Factura aprobada correctamente', 'success');
        
        closeModal();
        refreshData(); // Actualizar la tabla
        
    } catch (error) {
        console.error('Error aprobando factura:', error);
        showNotification('Error aprobando factura: ' + error.message, 'error');
        hideGlobalLoading();
    }
}

async function guardarCambios() {
    showNotification('Todos los cambios se guardan automáticamente', 'info');
}

async function rechazarFactura() {
    if (!confirm('¿Estás seguro de que quieres rechazar esta factura?')) {
        return;
    }
    
    // En un caso real, habría una API para rechazar
    showNotification('Función de rechazo pendiente de implementar', 'warning');
}

// ===== PDF VIEWER =====
async function loadPdfViewer(pdfUrl, coordenadas) {
    const pdfLoading = document.getElementById('pdfLoading');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const overlaysContainer = document.getElementById('pdfOverlays');
    
    try {
        pdfLoading.style.display = 'flex';
        
        // Por ahora, mostrar una imagen placeholder
        // En implementación real, usarías PDF.js
        
        const img = new Image();
        img.onload = () => {
            // Configurar canvas
            const canvas = pdfCanvas;
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Crear overlays
            createOverlays(coordenadas, overlaysContainer, canvas);
            
            pdfLoading.style.display = 'none';
        };
        
        img.src = pdfUrl;
        
    } catch (error) {
        console.error('Error cargando PDF:', error);
        pdfLoading.innerHTML = '<p style="color: var(--error);">Error cargando PDF</p>';
    }
}

function createOverlays(coordenadas, container, canvas) {
    container.innerHTML = '';
    
    if (!coordenadas) return;
    
    Object.entries(coordenadas).forEach(([campo, coords]) => {
        const overlay = document.createElement('div');
        overlay.className = 'pdf-overlay confidence-medium'; // Por defecto media
        overlay.style.left = coords.x + 'px';
        overlay.style.top = coords.y + 'px';
        overlay.style.width = coords.width + 'px';
        overlay.style.height = coords.height + 'px';
        
        overlay.onclick = () => {
            // Seleccionar campo correspondiente
            const fieldId = campo.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            const input = document.getElementById(fieldId);
            if (input) {
                switchTab('general');
                input.focus();
                overlay.classList.add('selected');
                
                // Quitar selección después de 2 segundos
                setTimeout(() => overlay.classList.remove('selected'), 2000);
            }
        };
        
        container.appendChild(overlay);
    });
}

// ===== UTILIDADES DE UI =====
function showTableLoading() {
    document.getElementById('tableLoading').style.display = 'block';
    document.getElementById('facturasTableBody').innerHTML = '';
}

function hideTableLoading() {
    document.getElementById('tableLoading').style.display = 'none';
}

function showGlobalLoading(text = 'Cargando...') {
    const overlay = document.getElementById('globalLoading');
    const loadingText = document.getElementById('globalLoadingText');
    
    loadingText.textContent = text;
    overlay.style.display = 'flex';
}

function hideGlobalLoading() {
    document.getElementById('globalLoading').style.display = 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notifications');
    container.appendChild(notification);
    
    // Auto-remover después de 15 segundos (más tiempo para verla)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 15000);
}

// ===== OTRAS ACCIONES =====
async function refreshData() {
    console.log('Actualizando datos...');
    await loadInitialData();
    showNotification('Datos actualizados', 'success');
}

function exportData() {
    const data = {
        facturas: facturasData,
        filtros: currentFilters,
        fecha_exportacion: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Datos exportados correctamente', 'success');
}

// ===== FUNCIÓN DE LOGOUT =====
async function handleLogout() {
    try {
        console.log('Cerrando sesión...');
        
        // Limpiar datos locales
        localStorage.removeItem('user_info');
        localStorage.removeItem('restaurante_actual');
        
        // Cerrar sesión de Supabase
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        
        // Redirigir al login
        window.location.href = '../login.html';
        
    } catch (error) {
        console.error('Error en logout:', error);
        // Forzar redirección incluso si hay error
        window.location.href = '../login.html';
    }
}

// ===== UTILIDADES =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== CONEXIÓN CON API REAL (FUTURO) =====
async function connectToRealApi() {
    // Esta función reemplazará las mockApi por llamadas reales
    try {
        const { data, error } = await supabaseClient
            .from('vista_facturas_completas') // Vista creada en tu BD
            .select('*')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .order('fecha_subida', { ascending: false });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error conectando con API real:', error);
        throw error;
    }
}

// Función para cuando se conecte con tu Edge Function real
async function getRealFacturasData() {
    try {
        const { data, error } = await supabaseClient.functions
            .invoke('get-facturas-dashboard', {
                body: {
                    restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
                    filters: currentFilters
                }
            });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error en Edge Function:', error);
        throw error;
    }
}

// ===== CARGAR DATOS REALES DE SUPABASE =====
async function loadRealDataFromSupabase() {
    try {
        console.log('Cargando datos reales de Supabase...');
        
        // Mostrar loading al inicio
        showTableLoading();
        
        // Verificar que hay RESTAURANTE_ID
        if (!CONFIG.TENANT.RESTAURANTE_ID) {
            console.error('❌ No hay RESTAURANTE_ID configurado');
            hideTableLoading();
            throw new Error('No hay restaurante configurado');
        }
        
        // Cargar facturas de la tabla datos_extraidos_facturas
        const { data: facturasFromSupabase, error: facturasError } = await supabaseClient
            .from('datos_extraidos_facturas')
            .select('*')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .order('fecha_extraccion', { ascending: false });

        if (facturasError) {
            console.error('Error cargando facturas:', facturasError);
            throw new Error('Error cargando facturas: ' + facturasError.message);
        }

        if (!facturasFromSupabase || facturasFromSupabase.length === 0) {
            console.log('No hay facturas en Supabase');
            showNotification('No se encontraron facturas en la base de datos', 'info');
            return;
        }

        console.log('Facturas cargadas de Supabase:', facturasFromSupabase.length);
        
        // Debug: Ver qué campos llegan realmente de Supabase
        if (facturasFromSupabase.length > 0) {
            console.log('🔍 DEBUG - Campos que llegan de Supabase en primera factura:');
            console.log('  - Todos los campos:', Object.keys(facturasFromSupabase[0]));
            console.log('  - url_storage:', facturasFromSupabase[0].url_storage);
            console.log('  - archivo_nombre:', facturasFromSupabase[0].archivo_nombre);
            console.log('  - documento_id:', facturasFromSupabase[0].documento_id);
        }
        
        // Transformar datos de Supabase al formato del dashboard
        const transformedFacturas = facturasFromSupabase.map(factura => ({
            id: factura.documento_id || factura.id,
            documento_id: factura.documento_id,
            restaurante_id: factura.restaurante_id,
            numero_factura: factura.numero_factura || 'N/A',
            proveedor_nombre: factura.proveedor_nombre || 'Proveedor Desconocido',
            proveedor_cif: factura.proveedor_cif || 'Sin CIF',
            proveedor_direccion: factura.proveedor_direccion || 'Sin dirección',
            fecha_factura: factura.fecha_factura || new Date().toISOString(),
            fecha_vencimiento: factura.fecha_vencimiento || null,
            total_factura: factura.total_factura || 0,
            // ✅ CORRECCIÓN: Usar valores reales de la base de datos, NO estimaciones
            importe_neto: factura.base_imponible || 0,
            iva: factura.cuota_iva || 0,
            base_imponible: factura.base_imponible || 0,
            total_iva: factura.cuota_iva || 0,
            tipo_iva: factura.tipo_iva || 21,
            confianza_global: factura.confianza_global || 0.5,
            confianza_proveedor: factura.confianza_proveedor || 0.5,
            confianza_datos_fiscales: factura.confianza_datos_fiscales || 0.5,
            confianza_importes: factura.confianza_importes || 0.5,
            requiere_revision: factura.requiere_revision || false,
            proveedor_nuevo: factura.proveedor_nuevo || false,
            campos_con_baja_confianza: factura.campos_con_baja_confianza || [],
            estado: factura.estado || 'processed',
            fecha_extraccion: factura.fecha_extraccion || new Date().toISOString(),
            coordenadas_campos: factura.coordenadas_campos || {},
            // Campos de archivo y coordenadas
            archivo_nombre: factura.archivo_nombre || factura.documento_id || null,
            url_storage: factura.url_storage || null, // ← AÑADIDO: URL directa del storage
            coordenadas_numero_factura: factura.coordenadas_numero_factura || null,
            coordenadas_proveedor_nombre: factura.coordenadas_proveedor_nombre || null,
            coordenadas_proveedor_cif: factura.coordenadas_proveedor_cif || null,
            coordenadas_fecha_factura: factura.coordenadas_fecha_factura || null,
            coordenadas_importe_neto: factura.coordenadas_importe_neto || null,
            coordenadas_iva: factura.coordenadas_iva || null,
            coordenadas_total_factura: factura.coordenadas_total_factura || null,
            productos: [] // Se cargarán por separado si es necesario
        }));

        // Actualizar datos globales
        window.facturasData = transformedFacturas;
        
        console.log('📊 Datos globales actualizados:', window.facturasData.length, 'facturas');
        console.log('📋 Primera factura:', window.facturasData[0]);
        
        // Debug: Verificar campos de coordenadas
        if (window.facturasData.length > 0) {
            const primeraFactura = window.facturasData[0];
            console.log('🔍 DEBUG - Campos de coordenadas en primera factura:');
            console.log('  - archivo_nombre:', primeraFactura.archivo_nombre);
            console.log('  - documento_id:', primeraFactura.documento_id);
            console.log('  - coordenadas_numero_factura:', primeraFactura.coordenadas_numero_factura);
            console.log('  - coordenadas_proveedor_nombre:', primeraFactura.coordenadas_proveedor_nombre);
            console.log('  - coordenadas_total_factura:', primeraFactura.coordenadas_total_factura);
        }
        
        // Calcular métricas reales
        updateRealMetrics(transformedFacturas);
        
        // Actualizar métricas avanzadas y gráficos
        await updateAdvancedMetrics(transformedFacturas);
        
        // Renderizar tabla
        console.log('🎯 ANTES de renderFacturasTable()');
        console.log('🎯 window.facturasData.length:', window.facturasData.length);
        console.log('🎯 window.facturasData:', window.facturasData);
        console.log('🎯 currentPage:', currentPage);
        console.log('🎯 itemsPerPage:', itemsPerPage);
        console.log('🎯 Llamando a renderFacturasTable()...');
        
        // ✅ VERIFICAR QUE LAS VARIABLES ESTÉN DEFINIDAS
        if (typeof currentPage === 'undefined') {
            console.error('❌ ERROR: currentPage no está definida');
            alert('❌ ERROR: currentPage no está definida');
            return;
        }
        
        if (typeof itemsPerPage === 'undefined') {
            console.error('❌ ERROR: itemsPerPage no está definida');
            alert('❌ ERROR: itemsPerPage no está definida');
            return;
        }
        
        renderFacturasTable();
        
        console.log('🎯 DESPUÉS de renderFacturasTable()');
        console.log('🎯 Verificando botones en la tabla...');
        
        // Verificar que los botones se crearon
        setTimeout(() => {
            const advancedButtons = document.querySelectorAll('.btn-advanced');
            console.log(`🎯 Botones "Avanzado" encontrados después de renderizar: ${advancedButtons.length}`);
            if (advancedButtons.length === 0) {
                console.warn('⚠️ NO se encontraron botones "Avanzado" - Problema en el renderizado');
            }
        }, 100);
        
        updatePagination();
        
        console.log('Datos reales cargados correctamente');
        
        // Ocultar loading después de un pequeño delay para mejor UX
        setTimeout(() => {
            hideTableLoading();
        }, 500);
        
    } catch (error) {
        console.error('Error cargando datos reales:', error);
        showNotification('Error cargando datos: ' + error.message, 'error');
    }
}

// ===== ACTUALIZAR MÉTRICAS REALES =====
function updateRealMetrics(facturas) {
    const metrics = {
        totalFacturas: facturas.length,
        pendientesRevision: facturas.filter(f => f.requiere_revision).length,
        aprobadas: facturas.filter(f => f.estado === 'approved').length,
        conErrores: facturas.filter(f => f.estado === 'error').length,
        totalImportes: facturas.reduce((sum, f) => sum + (f.total_factura || 0), 0),
        confianzaPromedio: facturas.reduce((sum, f) => sum + (f.confianza_global || 0), 0) / facturas.length
    };

    // Actualizar métricas en el dashboard
    updateMetricsDisplay(metrics);
}

// ===== ACTUALIZAR DISPLAY DE MÉTRICAS =====
function updateMetricsDisplay(metrics) {
    const totalFacturasEl = document.querySelector('[data-metric="total"] .metric-value');
    const pendientesEl = document.querySelector('[data-metric="pendientes"] .metric-value');
    const aprobadasEl = document.querySelector('[data-metric="aprobadas"] .metric-value');
    const totalImportesEl = document.querySelector('[data-metric="importes"] .metric-value');

    if (totalFacturasEl) totalFacturasEl.textContent = metrics.totalFacturas;
    if (pendientesEl) pendientesEl.textContent = metrics.pendientesRevision;
    if (aprobadasEl) aprobadasEl.textContent = metrics.aprobadas;
    if (totalImportesEl) totalImportesEl.textContent = formatCurrency(metrics.totalImportes);
}

// ===== FUNCIONES UTILITARIAS =====
function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// ===== FUNCIÓN DE FALLBACK A MOCK DATA =====
// ELIMINADA - Solo datos reales de Supabase
// function loadMockData() { ... }

console.log('Dashboard de Facturas cargado correctamente');

// ===== FUNCIÓN PARA CONFIGURAR CONTROLES DEL PDF =====
function setupPdfControls() {
    // Controles de navegación
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            console.log('Navegación: Página anterior');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            console.log('Navegación: Página siguiente');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            console.log('Zoom: Aumentar');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            console.log('Zoom: Disminuir');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    // Por ahora, deshabilitar los controles
    [prevPageBtn, nextPageBtn, zoomInBtn, zoomOutBtn].forEach(btn => {
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
    
        if (pageInfo) {
            pageInfo.textContent = 'PDF no disponible';
            pageInfo.style.opacity = '0.5';
        }
    }

// ===== FUNCIÓN PARA CARGAR PDF DESDE URL COMPLETA =====
async function loadPdfFromFacturaId(facturaId) {
    try {
        console.log('🔄 Iniciando carga de PDF para factura:', facturaId);
        
        // Buscar la factura en los datos
        const factura = (window.facturasData || []).find(f => f.id === facturaId);
        if (!factura) {
            throw new Error('Factura no encontrada');
        }
        
        console.log('📋 Factura encontrada:', factura);
        
        // Obtener el documento_id para buscar en la tabla documentos
        const documentoId = factura.documento_id;
        if (!documentoId) {
            throw new Error('No se encontró documento_id en la factura');
        }
        
        console.log('📄 Documento ID:', documentoId);
        
        // Buscar la URL completa en la tabla documentos
        const { data: documentoInfo, error: docError } = await supabaseClient
            .from('documentos')
            .select('url_storage')
            .eq('id', documentoId)
            .single();
            
        if (docError || !documentoInfo) {
            throw new Error(`Error obteniendo información del documento: ${docError?.message || 'Documento no encontrado'}`);
        }
        
        const pdfUrl = documentoInfo.url_storage;
        console.log('🔗 URL del PDF:', pdfUrl);
        
        if (!pdfUrl) {
            throw new Error('No se encontró URL del PDF en la base de datos');
        }
        
        // Verificar si la URL es válida
        if (!pdfUrl.startsWith('http')) {
            throw new Error('URL del PDF no es válida');
        }
        
        // Cargar el documento PDF usando PDF.js directamente desde la URL
        console.log('📥 Cargando PDF desde URL...');
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDocument = await loadingTask.promise;
        
        console.log('✅ PDF cargado correctamente');
        console.log('📄 Número de páginas:', pdfDocument.numPages);
        
        // Guardar el documento en variable global para uso posterior
        window.currentPdfDocument = pdfDocument;
        
        // Actualizar información de páginas
        updatePageInfo(1, pdfDocument.numPages);
        
        // Renderizar la primera página automáticamente
        await renderPdfPage(1);
        
        return pdfDocument;
        
    } catch (error) {
        console.error('❌ Error cargando PDF desde URL:', error);
        showNotification(`Error cargando el PDF: ${error.message}`, 'error');
        return null;
    }
}

// ===== FUNCIÓN PARA ACTUALIZAR INFORMACIÓN DE PÁGINAS =====
function updatePageInfo(currentPage, totalPages) {
    const pageInfoElement = document.getElementById('pageInfo');
    if (pageInfoElement) {
        pageInfoElement.textContent = `Página ${currentPage} de ${totalPages}`;
        pageInfoElement.style.opacity = '1';
    }
}

// ===== FUNCIÓN PARA RENDERIZAR PÁGINA DEL PDF =====
async function renderPdfPage(pageNumber = 1) {
    try {
        if (!window.currentPdfDocument) {
            console.log('❌ No hay PDF cargado');
            return;
        }
        
        console.log(`🔄 Renderizando página ${pageNumber}`);
        
        // Obtener la página específica
        const page = await window.currentPdfDocument.getPage(pageNumber);
        
        // Obtener el canvas
        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) {
            console.error('❌ Canvas no encontrado');
            return;
        }
        
        // Configurar el contexto del canvas
        const context = canvas.getContext('2d');
        
        // 🔥 CORREGIR ESCALADO: Calcular escala para ajustar al contenedor
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calcular escala que mantenga proporción y quepa en el contenedor
        const scaleX = containerWidth / page.getViewport({ scale: 1.0 }).width;
        const scaleY = containerHeight / page.getViewport({ scale: 1.0 }).height;
        const scale = Math.min(scaleX, scaleY, 1.0); // No escalar más del 100%
        
        console.log('🔍 Escalado del PDF:', { scale, containerWidth, containerHeight });
        
        const viewport = page.getViewport({ scale: scale });
        
        // Ajustar tamaño del canvas con la escala correcta
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        
        // Renderizar la página con la escala correcta
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Ocultar placeholder y mostrar canvas
        const placeholder = document.getElementById('pdfPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
        canvas.style.display = 'block';
        
        // 🔥 GUARDAR LA ESCALA ACTUAL PARA LAS COORDENADAS
        window.currentPdfScale = scale;
        window.currentPdfViewport = viewport;
        
        console.log(`✅ Página ${pageNumber} renderizada correctamente`);
        
        // Actualizar página actual
        window.currentPage = pageNumber;
        
    } catch (error) {
        console.error('❌ Error renderizando página:', error);
        showNotification('Error renderizando la página del PDF', 'error');
    }
}

// ===== FUNCIÓN PARA LIMPIAR RECURSOS DEL PDF =====
function cleanupPdfResources() {
    try {
        // Limpiar documento PDF
        if (window.currentPdfDocument) {
            window.currentPdfDocument.destroy();
            window.currentPdfDocument = null;
            console.log('🧹 Documento PDF limpiado');
        }
        
        // Limpiar página actual
        window.currentPage = null;
        
        // Ocultar canvas y mostrar placeholder
        const canvas = document.getElementById('pdfCanvas');
        const placeholder = document.getElementById('pdfPlaceholder');
        
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        
        console.log('🧹 Recursos del PDF limpiados correctamente');
        
    } catch (error) {
        console.error('❌ Error limpiando recursos del PDF:', error);
    }
}



// ===== FUNCIÓN DE PRUEBA PARA VERIFICAR STORAGE =====
async function testSupabaseStorage() {
    try {
        console.log('🧪 Iniciando prueba de Supabase Storage...');
        
        if (!supabaseClient) {
            throw new Error('Cliente de Supabase no inicializado');
        }
        
        // 1. Verificar buckets disponibles
        console.log('📦 Verificando buckets disponibles...');
        const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
        
        if (bucketsError) {
            throw new Error(`Error listando buckets: ${bucketsError.message}`);
        }
        
        console.log('✅ Buckets disponibles:', buckets);
        console.log('📋 Nombres de buckets:', buckets.map(b => b.name));
        
        // 2. Verificar si existe el bucket 'facturas'
        const facturasBucket = buckets.find(b => b.name === 'facturas');
        if (!facturasBucket) {
            console.warn('⚠️ Bucket "facturas" no encontrado. Buckets disponibles:', buckets.map(b => b.name));
            
            // Intentar crear el bucket si no existe
            console.log('🔄 Intentando crear bucket "facturas"...');
            const { data: createData, error: createError } = await supabaseClient.storage.createBucket('facturas', {
                public: false,
                allowedMimeTypes: ['application/pdf'],
                fileSizeLimit: 10485760 // 10MB
            });
            
            if (createError) {
                console.warn('⚠️ No se pudo crear bucket "facturas":', createError.message);
                console.warn('⚠️ Detalles del error:', createError);
            } else {
                console.log('✅ Bucket "facturas" creado correctamente');
            }
        } else {
            console.log('✅ Bucket "facturas" encontrado:', facturasBucket);
        }
        
        // 3. Verificar archivos en el bucket (si existe)
        try {
            const { data: files, error: filesError } = await supabaseClient.storage
                .from('facturas')
                .list();
                
            if (filesError) {
                console.warn('⚠️ Error listando archivos:', filesError.message);
            } else {
                console.log('📁 Archivos en bucket "facturas":', files);
            }
        } catch (error) {
            console.warn('⚠️ No se pudo listar archivos del bucket:', error.message);
        }
        
        // 4. Verificar permisos de lectura
        console.log('🔐 Verificando permisos de lectura...');
        
        // Intentar acceder a un archivo de prueba (debería fallar si no existe)
        const { data: testFile, error: testError } = await supabaseClient.storage
            .from('facturas')
            .download('test-file.pdf');
            
        if (testError) {
            if (testError.message.includes('not found')) {
                console.log('✅ Permisos de lectura verificados (archivo no encontrado, pero acceso permitido)');
            } else {
                console.warn('⚠️ Posible problema de permisos:', testError.message);
            }
        }
        
        console.log('✅ Prueba de Storage completada');
        return true;
        
    } catch (error) {
        console.error('❌ Error en prueba de Storage:', error);
        return false;
    }
}

// ===== FUNCIÓN DE DEBUG TEMPORAL =====
function debugFacturasData() {
    console.log('🔍 DEBUG - Datos de facturas disponibles:');
    console.log('📊 Total de facturas:', (window.facturasData || []).length);
    
            if (window.facturasData && window.facturasData.length > 0) {
            window.facturasData.forEach((factura, index) => {
                console.log(`📋 Factura ${index + 1}:`, {
                    id: factura.id,
                    documento_id: factura.documento_id,
                    archivo_nombre: factura.archivo_nombre,
                    url_storage: factura.url_storage, // ← AÑADIDO
                    numero_factura: factura.numero_factura,
                    proveedor_nombre: factura.proveedor_nombre,
                    coordenadas_disponibles: Object.keys(factura).filter(key => key.startsWith('coordenadas_')),
                    coordenadas_numero_factura: factura.coordenadas_numero_factura,
                    coordenadas_proveedor_nombre: factura.coordenadas_proveedor_nombre,
                    coordenadas_total_factura: factura.coordenadas_total_factura
                });
            });
            
            // Mostrar en pantalla también
            const debugInfo = window.facturasData.map((f, i) => 
                `Factura ${i + 1}: ${f.numero_factura} - URL: ${f.url_storage ? '✅' : '❌'}`
            ).join('\n');
            
            alert(`🔍 DEBUG - Datos de Facturas:\n\n${debugInfo}`);
        } else {
        console.log('❌ No hay datos de facturas disponibles');
        alert('❌ No hay datos de facturas disponibles');
    }
}

// ===== FUNCIONES PARA PRODUCTOS EN MODAL =====

// Función para cargar productos en el modal
async function loadProductsInModal(facturaId) {
    const loadingElement = document.getElementById('modalProductsLoading');
    const containerElement = document.getElementById('modalProductsContainer');
    const noProductsElement = document.getElementById('modalNoProducts');
    const countElement = document.getElementById('modalProductsCount');
    
    try {
        // Mostrar loading
        if (loadingElement) loadingElement.style.display = 'flex';
        if (containerElement) containerElement.style.display = 'none';
        if (noProductsElement) noProductsElement.style.display = 'none';
        
        console.log('🛒 Cargando productos para modal de factura:', facturaId);
        
        const { data: productos, error } = await supabaseClient
            .from('productos_extraidos')
            .select(`
                *,
                productos_maestro!fk_productos_extraidos_maestro (
                    nombre_normalizado,
                    categoria_principal,
                    unidad_base,
                    precio_ultimo
                )
            `)
            .eq('documento_id', facturaId)
            .order('id', { ascending: true });
            
        // Obtener precio anterior para cada producto
        if (productos) {
            for (let producto of productos) {
                if (producto.producto_maestro_id) {
                    console.log(`🔍 [MODAL] Obteniendo precio anterior para: ${producto.descripcion_original} (maestro_id: ${producto.producto_maestro_id})`);
                    producto.precio_anterior = await getPrecioAnterior(producto.producto_maestro_id, producto.fecha_extraccion);
                    console.log(`💰 [MODAL] Precio anterior: ${producto.precio_anterior}`);
                }
            }
        }
            
        if (error) {
            console.error('❌ Error cargando productos para modal:', error);
            throw error;
        }
        
        console.log(`✅ ${productos?.length || 0} productos cargados para modal`);
        
        // Ocultar loading
        if (loadingElement) loadingElement.style.display = 'none';
        
        // Actualizar contador
        if (countElement) {
            countElement.textContent = `${productos?.length || 0} productos`;
        }
        
        if (!productos || productos.length === 0) {
            // Mostrar mensaje de no productos
            if (noProductsElement) noProductsElement.style.display = 'block';
            if (containerElement) containerElement.style.display = 'none';
        } else {
            // Renderizar productos
            if (containerElement) {
                containerElement.style.display = 'grid';
                renderProductsInModal(productos);
            }
            if (noProductsElement) noProductsElement.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error en loadProductsInModal:', error);
        
        // Ocultar loading y mostrar error
        if (loadingElement) loadingElement.style.display = 'none';
        if (containerElement) containerElement.style.display = 'none';
        if (noProductsElement) {
            noProductsElement.style.display = 'block';
            noProductsElement.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h4>Error cargando productos</h4>
                    <p>No se pudieron cargar los productos de esta factura</p>
                </div>
            `;
        }
        if (countElement) {
            countElement.textContent = 'Error cargando';
        }
    }
}

// Función para renderizar productos en el modal
function renderProductsInModal(productos) {
    const container = document.getElementById('modalProductsContainer');
    if (!container) return;
    
    container.innerHTML = productos.map(producto => {
        const confidence = producto.confianza_linea || 0.5;
        const confidenceClass = getConfidenceClass(confidence);
        
        return `
            <div class="product-card ${confidenceClass}">
                <div class="product-name">${producto.descripcion_original || 'Producto sin descripción'}</div>
                <div class="product-details">
                    <span>Cantidad: ${producto.cantidad || 0} ${producto.unidad_medida || 'ud'}</span>
                    <span class="${getPriceChangeClass(producto.precio_unitario_sin_iva, producto.precio_anterior)}">
                        Precio: ${formatCurrency(producto.precio_unitario_sin_iva || 0)}
                        ${producto.precio_anterior ? `<span class="precio-anterior">(Anterior: ${formatCurrency(producto.precio_anterior)})</span>` : '<span class="precio-anterior">(Primera compra)</span>'}
                    </span>
                    <span>Total: ${formatCurrency(producto.precio_total_linea_sin_iva || 0)}</span>
                    <span>IVA: ${producto.tipo_iva || 21}%</span>
                    ${(() => {
                        // Intentar obtener formato de formato_comercial o extraer de la descripción
                        let formato = producto.formato_comercial;
                        
                        if (!formato && producto.descripcion_original) {
                            // Buscar patrones de formato en la descripción
                            const formatoMatch = producto.descripcion_original.match(/(\d+(?:[.,]\d+)?\s*(?:KG|kg|Kg|L|l|LITRO|litro|ML|ml|GR|gr|GRAMOS|gramos|UNIDADES|ud|UD))/i);
                            if (formatoMatch) {
                                formato = formatoMatch[1].toUpperCase();
                            }
                        }
                        
                        return formato ? `<span>📦 Formato: ${formato}</span>` : '';
                    })()}
                </div>
            </div>
        `;
    }).join('');
}

// ===== FUNCIONES PARA TABLA EXPANDIBLE DE PRODUCTOS =====

// Función para alternar la fila de productos
async function toggleProductsRow(facturaId, buttonElement) {
    const productsRow = document.getElementById(`products-row-${facturaId}`);
    const isExpanded = buttonElement.classList.contains('expanded');
    
    if (!isExpanded) {
        // Expandir
        buttonElement.classList.add('expanded');
        productsRow.style.display = 'table-row';
        productsRow.classList.add('expanding');
        
        // Cargar productos si no están cargados
        await loadProductsForFactura(facturaId);
    } else {
        // Contraer
        buttonElement.classList.remove('expanded');
        productsRow.style.display = 'none';
        productsRow.classList.remove('expanding');
    }
}

// Función para cargar productos de una factura
async function loadProductsForFactura(facturaId) {
    try {
        console.log('🛒 Cargando productos para factura:', facturaId);
        
        const { data: productos, error } = await supabaseClient
            .from('productos_extraidos')
            .select(`
                *,
                productos_maestro!fk_productos_extraidos_maestro (
                    nombre_normalizado,
                    categoria_principal,
                    unidad_base,
                    precio_ultimo
                )
            `)
            .eq('documento_id', facturaId)
            .order('id', { ascending: true });
            
        // Obtener precio anterior para cada producto
        if (productos) {
            for (let producto of productos) {
                if (producto.producto_maestro_id) {
                    console.log(`🔍 [MODAL] Obteniendo precio anterior para: ${producto.descripcion_original} (maestro_id: ${producto.producto_maestro_id})`);
                    producto.precio_anterior = await getPrecioAnterior(producto.producto_maestro_id, producto.fecha_extraccion);
                    console.log(`💰 [MODAL] Precio anterior: ${producto.precio_anterior}`);
                }
            }
        }
            
        if (error) {
            console.error('❌ Error cargando productos:', error);
            showNotification('Error cargando productos', 'error');
            return;
        }
        
        console.log(`✅ ${productos?.length || 0} productos cargados para factura ${facturaId}`);
        
        renderProductsInRow(facturaId, productos || []);
        
    } catch (error) {
        console.error('❌ Error en loadProductsForFactura:', error);
        showNotification('Error cargando productos', 'error');
    }
}

// Función para renderizar productos en la fila expandida
function renderProductsInRow(facturaId, productos) {
    const productsGrid = document.getElementById(`products-grid-${facturaId}`);
    const productsCount = document.getElementById(`products-count-${facturaId}`);
    
    if (!productsGrid || !productsCount) {
        console.error('❌ No se encontraron elementos para renderizar productos');
        return;
    }
    
    // Actualizar contador
    productsCount.textContent = productos.length;
    
    if (productos.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <p style="color: #6b7280; text-align: center; grid-column: 1/-1; padding: 20px;">
                    📦 No se encontraron productos extraídos en esta factura
                </p>
            </div>
        `;
        return;
    }
    
    // Renderizar productos
    // Renderizar productos con formato horizontal compacto como en la imagen
    productsGrid.innerHTML = `
        <div class="products-compact-horizontal">
            ${productos.map(producto => {
        const confidence = producto.confianza_linea || 0.5;
        const confidenceClass = getConfidenceClass(confidence);
        const maestro = producto.productos_maestro;
        
        return `
                    <div class="product-card-compact">
                        <!-- Título del producto -->
                        <div class="product-title-compact">
                    ${producto.descripcion_original || 'Producto sin descripción'}
                </div>
                
                        <!-- Grid horizontal de datos REORGANIZADO - PRECIO ANTERIOR MÁS IMPORTANTE -->
                        <div class="product-data-horizontal">
                            <!-- Cantidad -->
                            <div class="data-block">
                                <div class="data-label-compact">Cantidad:</div>
                                <div class="data-value-compact quantity">${producto.cantidad || 0} ${producto.unidad_medida || 'ud'}</div>
                            </div>
                            
                            <!-- Precio Unit con Precio Anterior PROMINENTE -->
                            <div class="data-block precio-anterior-block">
                                <div class="data-label-compact">Precio unit.:</div>
                                <div class="data-value-compact price ${getPriceChangeClass(producto.precio_unitario_sin_iva, producto.precio_anterior)}">
                                    ${producto.precio_unitario_sin_iva ? formatCurrency(producto.precio_unitario_sin_iva) : '-'}
                                    ${producto.precio_anterior ? `<span class="precio-anterior-highlight">(Ant: ${formatCurrency(producto.precio_anterior)})</span>` : '<span class="precio-anterior-highlight">(Primera compra)</span>'}
                                </div>
                            </div>
                            
                            <!-- IVA (MENOS PROMINENTE) -->
                            <div class="data-block">
                                <div class="data-label-compact">IVA:</div>
                                <div class="data-value-compact iva">${producto.tipo_iva || 21}%</div>
                            </div>
                            
                            <!-- Total línea -->
                            <div class="data-block">
                                <div class="data-label-compact">Total línea:</div>
                                <div class="data-value-compact total">${formatCurrency(producto.precio_total_linea_sin_iva || 0)}</div>
                            </div>
                            
                            <!-- Formato -->
                            ${(() => {
                                let formato = producto.formato_comercial;
                                if (!formato && producto.descripcion_original) {
                                    const formatoMatch = producto.descripcion_original.match(/(\d+(?:[.,]\d+)?\s*(?:KG|kg|Kg|L|l|LITRO|litro|ML|ml|GR|gr|GRAMOS|gramos|UNIDADES|ud|UD))/i);
                                    if (formatoMatch) {
                                        formato = formatoMatch[1].toUpperCase();
                                    }
                                }
                                return formato ? `
                                    <div class="data-block">
                                        <div class="data-label-compact">📦 Formato:</div>
                                        <div class="data-value-compact format">${formato}</div>
                                    </div>
                                ` : '';
                            })()}
                            
                            <!-- €/kg - €/L -->
                            ${producto.precio_por_kg || producto.precio_por_litro ? `
                                <div class="data-block unit-price-block">
                                    <div class="data-label-compact">💰 €/Unidad:</div>
                                    <div class="data-value-compact unit-prices">
                                        ${producto.precio_por_kg ? `${formatCurrency(producto.precio_por_kg)}/kg` : ''}
                                        ${producto.precio_por_litro ? `${formatCurrency(producto.precio_por_litro)}/L` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Categoría -->
                            <div class="data-block">
                                <div class="data-label-compact">Categoría:</div>
                                <div class="data-value-compact category">${maestro?.categoria_principal || 'general'}</div>
                            </div>
                            
                            <!-- Normalizado -->
                            ${maestro?.nombre_normalizado ? `
                                <div class="data-block">
                                    <div class="data-label-compact">Normalizado:</div>
                                    <div class="data-value-compact normalized">${maestro.nombre_normalizado}</div>
                                </div>
                            ` : ''}
                        </div>
                
                        <!-- Confianza -->
                        <div class="product-confidence-compact ${confidenceClass}">
                    Confianza: ${Math.round(confidence * 100)}%
                </div>
            </div>
        `;
            }).join('')}
        </div>
    `;
}

// ===== FUNCIONES PARA MÉTRICAS AVANZADAS =====

// Función para actualizar todas las métricas avanzadas
async function updateAdvancedMetrics(facturas) {
    try {
        console.log('📊 Actualizando métricas avanzadas...');
        
        // Métricas básicas
        updateBasicMetrics(facturas);
        
        // Métricas de pagos
        await updatePaymentMetrics();
        
        // Métricas de proveedores y productos
        await updateSuppliersAndProductsMetrics();
        
        // Inicializar gráficos
        // await initializeCharts(facturas); // ✅ TEMPORALMENTE DESHABILITADO
        
        console.log('✅ Métricas avanzadas actualizadas');
        
    } catch (error) {
        console.error('❌ Error actualizando métricas avanzadas:', error);
    }
}

// Función para métricas básicas
function updateBasicMetrics(facturas) {
    const totalFacturas = facturas.length;
    const pendientesRevision = facturas.filter(f => f.requiere_revision || f.confianza_global < 0.7).length;
    const aprobadas = facturas.filter(f => f.estado === 'approved').length;
    const totalImportes = facturas.reduce((sum, f) => sum + (f.total_factura || 0), 0);
    
    // Actualizar elementos
    updateMetricValue('total', totalFacturas);
    updateMetricValue('pendientes', pendientesRevision);
    updateMetricValue('aprobadas', aprobadas);
    updateMetricValue('importes', formatCurrency(totalImportes));
}

// Función para métricas de pagos usando datos reales
async function updatePaymentMetrics() {
    try {
        const now = new Date();
        
        // Obtener facturas con información de proveedores para calcular fechas de vencimiento
        const { data: facturasConProveedores, error } = await supabaseClient
            .from('datos_extraidos_facturas')
            .select(`
                *,
                proveedores!inner (
                    dias_pago,
                    nombre
                )
            `)
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .not('proveedores.dias_pago', 'is', null);
            
        if (error) {
            console.error('❌ Error obteniendo facturas con proveedores:', error);
            return;
        }
        
        let pagos7Dias = 0;
        let pagos15Dias = 0;
        let pagos30Dias = 0;
        let facturas7Dias = 0;
        let facturas15Dias = 0;
        let facturas30Dias = 0;
        let facturasVencidas = 0;
        
        facturasConProveedores.forEach(factura => {
            const fechaFactura = new Date(factura.fecha_factura);
            const diasPago = factura.proveedores.dias_pago || 30;
            const fechaVencimiento = new Date(fechaFactura.getTime() + diasPago * 24 * 60 * 60 * 1000);
            const diasHastaVencimiento = Math.ceil((fechaVencimiento.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            const importe = factura.total_factura || 0;
            
            if (diasHastaVencimiento < 0) {
                // Ya vencida
                facturasVencidas++;
            } else if (diasHastaVencimiento <= 7) {
                pagos7Dias += importe;
                facturas7Dias++;
            } else if (diasHastaVencimiento <= 15) {
                pagos15Dias += importe;
                facturas15Dias++;
            } else if (diasHastaVencimiento <= 30) {
                pagos30Dias += importe;
                facturas30Dias++;
            }
        });
        
        // Actualizar métricas
        updateMetricValue('pagos_7_dias', formatCurrency(pagos7Dias));
        updateMetricTrend('pagos_7_dias', `${facturas7Dias} facturas pendientes`);
        
        updateMetricValue('pagos_15_dias', formatCurrency(pagos15Dias));
        updateMetricTrend('pagos_15_dias', `${facturas15Dias} facturas pendientes`);
        
        updateMetricValue('pagos_30_dias', formatCurrency(pagos30Dias));
        updateMetricTrend('pagos_30_dias', `${facturas30Dias} facturas pendientes`);
        
        updateMetricValue('facturas_vencidas', facturasVencidas);
        
    } catch (error) {
        console.error('❌ Error actualizando métricas de pagos:', error);
    }
}

// Función para métricas de proveedores y productos
async function updateSuppliersAndProductsMetrics() {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Contar proveedores totales (de la tabla proveedores)
        const { data: proveedores, error: proveedoresError } = await supabaseClient
            .from('proveedores')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .eq('es_activo', true);
            
        if (!proveedoresError) {
            updateMetricValue('total_proveedores', proveedores.length);
        }
        
        // Contar nuevos proveedores esta semana
        const { data: nuevosProveedores, error: nuevosProveedoresError } = await supabaseClient
            .from('proveedores')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .eq('es_activo', true)
            .gte('fecha_creacion', oneWeekAgo.toISOString());
            
        if (!nuevosProveedoresError) {
            updateMetricValue('nuevos_proveedores', nuevosProveedores.length);
            updateMetricTrend('total_proveedores', `${nuevosProveedores.length} nuevos esta semana`);
        }
        
        // Contar productos maestros
        const { data: productos, error: productosError } = await supabaseClient
            .from('productos_maestro')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID);
            
        if (!productosError) {
            updateMetricValue('total_productos', productos.length);
        }
        
        // Contar nuevos productos esta semana
        const { data: nuevosProductos, error: nuevosProductosError } = await supabaseClient
            .from('productos_maestro')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .gte('fecha_creacion', oneWeekAgo.toISOString());
            
        if (!nuevosProductosError) {
            updateMetricValue('nuevos_productos', nuevosProductos.length);
            updateMetricTrend('total_productos', `${nuevosProductos.length} nuevos esta semana`);
        }
        
    } catch (error) {
        console.error('❌ Error actualizando métricas de proveedores y productos:', error);
    }
}

// ===== FUNCIÓN CORREGIDA PARA OBTENER PRECIO ANTERIOR =====
async function getPrecioAnterior(productoMaestroId, fechaActual) {
    try {
        console.log(`🔍 === DEBUG getPrecioAnterior ===`);
        console.log(`📝 Producto maestro ID: ${productoMaestroId}`);
        console.log(`📅 Fecha actual: ${fechaActual}`);
        
        if (!productoMaestroId) {
            console.log(`❌ No hay producto_maestro_id, retornando null`);
            return null;
        }
        
        const fechaComparacion = fechaActual ? fechaActual.split('T')[0] : new Date().toISOString().split('T')[0];
        console.log(`📅 Buscando precios anteriores a: ${fechaComparacion}`);
        
        // 🎯 BUSCAR EN HISTORIAL DE PRECIOS (CORREGIDO - POR FECHA DE FACTURA)
        console.log(`🔍 Buscando en historial_precios_productos...`);
        const { data: historial, error } = await supabaseClient
            .from('historial_precios_productos')
            .select('id, precio_unitario_sin_iva, fecha_compra, numero_documento, documento_id, fecha_registro')
            .eq('producto_maestro_id', productoMaestroId)
            .order('fecha_compra', { ascending: false }) // Ordenar por fecha_compra (fecha de factura) para obtener los más recientes
            .limit(10); // Obtener más registros para debug
            
        if (error) {
            console.error('❌ Error obteniendo historial:', error);
            return null;
        }
        
        console.log(`📊 Historial encontrado (${historial?.length || 0} registros):`);
        if (historial && historial.length > 0) {
            historial.forEach((h, i) => {
                console.log(`   ${i + 1}. Fecha: ${h.fecha_compra}, Precio: ${h.precio_unitario_sin_iva}€, Doc: ${h.numero_documento || 'N/A'}, Registro: ${h.fecha_registro}`);
            });
        } else {
            console.log(`   ℹ️ No hay registros en historial_precios_productos`);
            return null;
        }
        
        // 🎯 LÓGICA MEJORADA: Buscar precios diferentes al actual
        if (historial && historial.length >= 2) {
            const precioActual = historial[0].precio_unitario_sin_iva;
            console.log(`💰 Precio actual: ${precioActual}€`);
            
            // Buscar el primer precio diferente al actual
            for (let i = 1; i < historial.length; i++) {
                const precioComparar = historial[i].precio_unitario_sin_iva;
                if (Math.abs(precioActual - precioComparar) > 0.01) { // Si el precio es diferente
                    console.log(`✅ Precio anterior encontrado: ${precioComparar}€ (fecha: ${historial[i].fecha_compra}, doc: ${historial[i].numero_documento || 'N/A'})`);
                    console.log(`📊 Precio actual vs anterior: ${precioActual}€ vs ${precioComparar}€`);
                    return precioComparar;
                }
            }
            
            // Si todos los precios son iguales
            console.log(`ℹ️ Todos los precios son iguales (${precioActual}€), no hay variación`);
            return null;
        } else if (historial && historial.length === 1) {
            console.log(`ℹ️ Primera compra de este producto (solo 1 registro en historial)`);
            return null;
        } else {
            console.log(`ℹ️ No hay historial de precios para este producto`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error en getPrecioAnterior:', error);
        return null;
    }
}

// ===== FUNCIÓN PARA OBTENER CLASE DE COLOR SEGÚN CAMBIO DE PRECIO =====
function getPriceChangeClass(precioActual, precioAnterior) {
    if (!precioAnterior) return 'price-first'; // Primera compra
    
    if (Math.abs(precioActual - precioAnterior) < 0.01) {
        return 'price-same'; // Verde - precio igual
    } else {
        return 'price-changed'; // Rojo - precio cambió
    }
}

// Función auxiliar para actualizar valor de métrica
function updateMetricValue(metricKey, value) {
    const element = document.querySelector(`[data-metric="${metricKey}"] .metric-value`);
    if (element) {
        element.textContent = value;
    }
}

// Función auxiliar para actualizar tendencia de métrica
function updateMetricTrend(metricKey, trend) {
    const element = document.querySelector(`[data-metric="${metricKey}"] .metric-trend`);
    if (element) {
        element.textContent = trend;
    }
}

// ===== INICIALIZACIÓN DE GRÁFICOS ===== 

// Variables globales para los gráficos
let proveedorChart = null;
let categoriaChart = null;
let evolutionChart = null;

// Función para inicializar todos los gráficos
async function initializeCharts(facturas) {
    try {
        console.log('📈 Inicializando gráficos...');
        
        // ✅ Verificar que Chart.js esté disponible
        if (typeof Chart === 'undefined') {
            console.log('⏳ Chart.js no está disponible aún, esperando...');
            // Esperar hasta que Chart esté disponible
            await new Promise((resolve) => {
                const checkChart = () => {
                    if (typeof Chart !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkChart, 100);
                    }
                };
                checkChart();
            });
        }
        
        console.log('✅ Chart.js disponible, iniciando gráficos...');
        
        await initProveedorChart(facturas);
        await initCategoriaChart();
        await initEvolutionChart(facturas);
        
        console.log('✅ Gráficos inicializados correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando gráficos:', error);
    }
}

// Gráfico de distribución por proveedor
async function initProveedorChart(facturas) {
    const ctx = document.getElementById('proveedorChart');
    if (!ctx) return;
    
    // Calcular datos
    const proveedorData = {};
    facturas.forEach(f => {
        const proveedor = f.proveedor_nombre || 'Sin proveedor';
        proveedorData[proveedor] = (proveedorData[proveedor] || 0) + (f.total_factura || 0);
    });
    
    // Tomar top 10 proveedores
    const sortedProveedores = Object.entries(proveedorData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = sortedProveedores.map(([proveedor]) => 
        proveedor.length > 20 ? proveedor.substring(0, 20) + '...' : proveedor
    );
    const data = sortedProveedores.map(([,total]) => total);
    
    // Crear gráfico
    if (proveedorChart) {
        proveedorChart.destroy();
    }
    
    proveedorChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de categorías (simulado - necesita datos de productos)
async function initCategoriaChart() {
    const ctx = document.getElementById('categoriaChart');
    if (!ctx) return;
    
    try {
        // Obtener datos de categorías de productos
        const { data: productos, error } = await supabaseClient
            .from('productos_maestro')
            .select('categoria_principal')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID);
            
        let categoriaData = {};
        
        if (!error && productos) {
            productos.forEach(p => {
                const categoria = p.categoria_principal || 'General';
                categoriaData[categoria] = (categoriaData[categoria] || 0) + 1;
            });
        } else {
            // Datos de ejemplo si no hay productos
            categoriaData = {
                'General': 10,
                'Condimentos': 8,
                'Carnes': 6,
                'Verduras': 5,
                'Bebidas': 4
            };
        }
        
        const labels = Object.keys(categoriaData);
        const data = Object.values(categoriaData);
        
        if (categoriaChart) {
            categoriaChart.destroy();
        }
        
        categoriaChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Productos por categoría',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando gráfico de categorías:', error);
    }
}

// Gráfico de evolución de facturas
async function initEvolutionChart(facturas) {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) return;
    
    // Generar últimos 30 días
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last30Days.push(date.toISOString().split('T')[0]);
    }
    
    // Agrupar facturas por día
    const facturasPorDia = {};
    const importesPorDia = {};
    
    last30Days.forEach(day => {
        facturasPorDia[day] = 0;
        importesPorDia[day] = 0;
    });
    
    facturas.forEach(f => {
        const day = f.fecha_factura ? f.fecha_factura.split('T')[0] : null;
        if (day && facturasPorDia.hasOwnProperty(day)) {
            facturasPorDia[day]++;
            importesPorDia[day] += f.total_factura || 0;
        }
    });
    
    const labels = last30Days.map(day => {
        const date = new Date(day);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    });
    
    if (evolutionChart) {
        evolutionChart.destroy();
    }
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de facturas',
                data: Object.values(facturasPorDia),
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Importe total (€)',
                data: Object.values(importesPorDia),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Número de facturas'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Importe (€)'
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const fecha = last30Days[index];
                            return `Fecha: ${fecha}`;
                        }
                    }
                }
            }
        }
    });
}

// ===== MODAL HÍBRIDO DE PDF =====
async function openInvoiceAdvanced(facturaId) {
    try {
        console.log('🚀 ===== INICIO OPENINVOICEADVANCED =====');
        console.log('🚀 Abriendo modal híbrido para factura:', facturaId);
        
        // ✅ VERIFICAR INICIALIZACIÓN
        if (!window.hybridPDFModal) {
            console.error('❌ Modal híbrido no inicializado');
            showNotification('Modal híbrido no disponible. Recargando página...', 'warning');
            setTimeout(() => window.location.reload(), 1500);
            return;
        }
        
        // ✅ BUSCAR LA FACTURA
        const factura = (window.facturasData || []).find(f => f.id === facturaId);
        if (!factura) {
            throw new Error('Factura no encontrada en los datos cargados');
        }
        
        console.log('✅ Factura encontrada:', factura);
        
        // ✅ VERIFICAR COORDENADAS
        const hasCoordinates = factura.coordenadas_campos && 
            Object.keys(factura.coordenadas_campos).length > 0;
            
        if (!hasCoordinates) {
            showNotification('Esta factura no tiene coordenadas de campos disponibles', 'warning');
            // Abrir modal normal en su lugar
            openFacturaModal(facturaId);
            return;
        }
        
        // ✅ PROCESAR COORDENADAS
        const coordinates = {};
        Object.entries(factura.coordenadas_campos).forEach(([fieldName, coordData]) => {
            if (coordData && typeof coordData === 'object' && 
                coordData.x !== undefined && coordData.y !== undefined && 
                coordData.width !== undefined && coordData.height !== undefined) {
                coordinates[fieldName] = coordData;
                console.log(`✅ Coordenada válida: ${fieldName}`, coordData);
            }
        });
        
        console.log(`📍 Total coordenadas válidas: ${Object.keys(coordinates).length}`);
        
        if (Object.keys(coordinates).length === 0) {
            showNotification('No se encontraron coordenadas válidas', 'warning');
            openFacturaModal(facturaId);
            return;
        }
        
        // ✅ OBTENER URL DEL PDF
        const documentoId = factura.documento_id;
        if (!documentoId) {
            throw new Error('No se encontró documento_id en la factura');
        }
        
        const { data: documentoInfo, error: docError } = await supabaseClient
            .from('documentos')
            .select('url_storage')
            .eq('id', documentoId)
            .single();
            
        if (docError || !documentoInfo || !documentoInfo.url_storage) {
            throw new Error(`Error obteniendo PDF: ${docError?.message || 'URL no encontrada'}`);
        }
        
        const pdfUrl = documentoInfo.url_storage;
        console.log('🔗 URL del PDF:', pdfUrl);
        
        // ✅ PREPARAR DATOS EXTRAÍDOS
        const toNumber = (v) => (v == null ? 0 : Number(v));
        const extractedData = {
            numero_factura: factura.numero_factura ?? 'N/A',
            proveedor_nombre: factura.proveedor_nombre ?? 'N/A',
            proveedor_cif: factura.proveedor_cif ?? 'N/A',
            fecha_factura: factura.fecha_factura ?? 'N/A',
            base_imponible: toNumber(factura.base_imponible ?? factura.importe_neto),
            cuota_iva: toNumber(factura.cuota_iva ?? factura.iva),
            total_factura: toNumber(factura.total_factura),
            retencion: toNumber(factura.retencion),
            confianza_global: factura.confianza_global ?? 0,
            confianza_proveedor: factura.confianza_proveedor ?? 0,
            confianza_datos_fiscales: factura.confianza_datos_fiscales ?? 0,
            confianza_importes: factura.confianza_importes ?? 0,
        };
        
        console.log('📊 Datos extraídos:', extractedData);
        
        // ✅ ABRIR MODAL NORMAL PRIMERO
        console.log('🔄 Abriendo modal base...');
        const modal = document.getElementById('facturaModal');
        if (!modal) {
            throw new Error('Modal de factura no encontrado en el DOM');
        }
        
        // Asegurar que el modal se ve correctamente
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // ✅ ACTUALIZAR TÍTULO DEL MODAL HÍBRIDO
        console.log('🎨 Actualizando título del modal híbrido...');
        updateModalHeader(factura, 'hybrid');
        
        // ✅ RELLENAR FORMULARIO
        console.log('📝 Rellenando formulario del modal...');
        await loadPdfFromFacturaId(facturaId);
        
        // ✅ DAR TIEMPO AL DOM PARA ESTABILIZARSE
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ ACTIVAR FUNCIONALIDADES HÍBRIDAS
        console.log('🎯 Activando funcionalidades híbridas...');
        await window.hybridPDFModal.open(pdfUrl, coordinates, extractedData);
        
        console.log('✅ Modal híbrido abierto correctamente');
        showNotification('Modal híbrido con coordenadas activado', 'success');
        
    } catch (error) {
        console.error('❌ Error en openInvoiceAdvanced:', error);
        showNotification(`Error abriendo modal avanzado: ${error.message}`, 'error');
        
        // Fallback: abrir modal normal
        try {
            openFacturaModal(facturaId);
        } catch (fallbackError) {
            console.error('❌ Error en fallback:', fallbackError);
        }
    }
}

// ===== FUNCIÓN DE PRUEBA DEL AGENTE IA =====
async function testAgente() {
    try {
        console.log('🤖 === PROBANDO AGENTE IA ===');
        console.log('📝 Pregunta: ¿Cuántas facturas tengo?');
        console.log('🏢 Restaurante ID:', CONFIG.TENANT.RESTAURANTE_ID);
        
        // Mostrar loading
        const btn = document.getElementById('testAgenteBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Probando...
        `;
        
        // Llamar a la Edge Function
        const { data, error } = await supabaseClient.functions.invoke('ask-my-invoices', {
            body: {
                pregunta: "¿Cuántas facturas tengo?",
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
            }
        });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Respuesta completa del agente:', data);
        
        // Mostrar resultado
        showNotification(`🤖 Agente IA: ${data.respuesta}`, 'success');
        
        // Mostrar detalles en consola
        console.log('📊 SQL generado:', data.sql);
        console.log('📊 Datos obtenidos:', data.datos);
        
    } catch (error) {
        console.error('❌ Error probando agente:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        const btn = document.getElementById('testAgenteBtn');
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"/>
                <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"/>
            </svg>
            Probar Agente IA
        `;
    }
}

// ===== FUNCIÓN PARA PROBAR CON PREGUNTAS PERSONALIZADAS =====
async function testAgenteConPregunta(pregunta) {
    try {
        console.log('🤖 === PROBANDO AGENTE IA CON PREGUNTA PERSONALIZADA ===');
        console.log('📝 Pregunta:', pregunta);
        console.log('🏢 Restaurante ID:', CONFIG.TENANT.RESTAURANTE_ID);
        
        // Llamar a la Edge Function
        const { data, error } = await supabaseClient.functions.invoke('ask-my-invoices', {
            body: {
                pregunta: pregunta,
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
            }
        });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Respuesta completa del agente:', data);
        
        // Mostrar resultado
        showNotification(`🤖 Agente IA: ${data.respuesta}`, 'success');
        
        // Mostrar detalles en consola
        console.log('📊 SQL generado:', data.sql);
        console.log('📊 Datos obtenidos:', data.datos);
        
        return data;
        
    } catch (error) {
        console.error('❌ Error probando agente:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
        throw error;
    }
}

// ===== CHAT AGENTE IA - FUNCIONES COMPLETAS =====
let chatHistory = [];

// Inicializar chat
function initChat() {
    console.log('💬 === INICIANDO CHAT AGENTE IA ===');
    
    const chatButton = document.getElementById('chatButton');
    const chatPanel = document.getElementById('chatPanel');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const quickQuestions = document.querySelectorAll('.quick-question');
    
    // Abrir/cerrar chat
    chatButton.addEventListener('click', () => {
        chatPanel.classList.add('active');
        chatInput.focus();
    });
    
    chatClose.addEventListener('click', () => {
        chatPanel.classList.remove('active');
    });
    
    // Enviar mensaje con Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Enviar mensaje con botón
    chatSend.addEventListener('click', sendMessage);
    
    // Preguntas rápidas
    quickQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.getAttribute('data-question');
            addUserMessage(question);
            processMessage(question);
        });
    });
    
    console.log('✅ Chat inicializado correctamente');
}

// Añadir mensaje del usuario
function addUserMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Guardar en historial
    chatHistory.push({
        type: 'user',
        message: message,
        timestamp: new Date()
    });
}

// Añadir mensaje del agente
function addAgentMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent-message';
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Guardar en historial
    chatHistory.push({
        type: 'agent',
        message: message,
        timestamp: new Date()
    });
}

// Añadir mensaje de loading
function addLoadingMessage() {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent-message';
    messageDiv.id = 'loadingMessage';
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>🤔 Pensando...</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Remover mensaje de loading
function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Scroll al final del chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enviar mensaje
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Limpiar input
    chatInput.value = '';
    
    // Añadir mensaje del usuario
    addUserMessage(message);
    
    // Procesar mensaje
    await processMessage(message);
}

// Procesar mensaje con el agente
async function processMessage(message) {
    try {
        // Mostrar loading
        addLoadingMessage();
        
        console.log('🤖 === PROCESANDO MENSAJE EN CHAT ===');
        console.log('📝 Mensaje:', message);
        
        // Llamar al agente
        const { data, error } = await supabaseClient.functions.invoke('ask-my-invoices', {
            body: {
                pregunta: message,
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
            }
        });
        
        // Remover loading
        removeLoadingMessage();
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Respuesta del agente:', data);
        
        // Añadir respuesta del agente
        addAgentMessage(data.respuesta);
        
    } catch (error) {
        console.error('❌ Error en chat:', error);
        removeLoadingMessage();
        addAgentMessage(`❌ Lo siento, ha ocurrido un error: ${error.message}`);
    }
}

// Inicializar chat cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que se cargue todo lo demás
    setTimeout(() => {
        initChat();
    }, 1000);
});