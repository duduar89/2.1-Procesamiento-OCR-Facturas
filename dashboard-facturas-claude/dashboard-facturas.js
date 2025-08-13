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

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Iniciando Dashboard de Facturas...');
    await initializeDashboard();
});

// ===== INICIALIZAR DASHBOARD =====
async function initializeDashboard() {
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

        console.log('Supabase inicializado correctamente');

        // Verificar autenticación
        await checkAuthentication();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar datos iniciales
        await loadInitialData();

        // Inicializar modal híbrido de PDF
        console.log('🔍 Verificando disponibilidad de HybridPDFModal...');
        console.log('🔍 window.HybridPDFModal:', window.HybridPDFModal);
        console.log('🔍 typeof window.HybridPDFModal:', typeof window.HybridPDFModal);
        
        if (window.HybridPDFModal) {
            try {
                window.hybridPDFModal = new window.HybridPDFModal();
                console.log('✅ Modal híbrido de PDF inicializado correctamente');
            } catch (error) {
                console.error('❌ Error creando instancia del modal híbrido:', error);
            }
        } else {
            console.warn('⚠️ Clase HybridPDFModal no encontrada - Verificar que hybrid-pdf-modal.js esté cargado');
        }

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

// ===== VERIFICAR AUTENTICACIÓN =====
async function checkAuthentication() {
    try {
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

    // Click en zona de upload
    if (uploadZone) {
        uploadZone.addEventListener('click', () => {
            if (!processingState) {
                fileInput.click();
            }
        });
    }

    // Click en botón de selección
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', () => {
            if (!processingState) {
                fileInput.click();
            }
        });
    }

    // Drag & Drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('drop', handleDrop);
        uploadZone.addEventListener('dragleave', handleDragLeave);
    }

    // Input de archivo
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
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

        // 3. Llamar a la Edge Function process-invoice
        const { data: processData, error: processError } = await supabaseClient.functions
            .invoke('process-invoice', {
                body: {
                    record: {
                        name: documentId,
                        bucket_id: CONFIG.SUPABASE.STORAGE_BUCKET
                    }
                }
            });

        if (processError) {
            throw new Error(`Error en procesamiento: ${processError.message}`);
        }

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
    console.log('🎨 ===== INICIO RENDERIZADO TABLA =====');
    console.log('🎨 Renderizando tabla con datos:', data.length, 'facturas');
    console.log('📊 Datos recibidos:', data);
    console.log('🔍 window.facturasData:', window.facturasData);
    console.log('🔍 data.length:', data.length);
    console.log('🔍 data[0]:', data[0]);
    
    // ✅ VERIFICAR QUE LA FUNCIÓN SE EJECUTE
    console.log('🎨 Función renderFacturasTable ejecutándose...');
    
    // ✅ ALERTA VISIBLE PARA CONFIRMAR EJECUCIÓN
    console.log('🔍 ALERTA: renderFacturasTable se está ejecutando con ' + data.length + ' facturas');
    
    // ✅ TEST SIMPLE: Crear un botón de prueba
    const testButton = document.createElement('button');
    testButton.textContent = '🧪 TEST BOTÓN';
    testButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px;';
    testButton.onclick = () => alert('✅ El JavaScript funciona correctamente');
    document.body.appendChild(testButton);
    
    const tbody = document.querySelector('.facturas-table tbody');
    const tableEmpty = document.getElementById('tableEmpty');
    
    console.log('🔍 ===== VERIFICANDO ELEMENTOS DOM =====');
    console.log('🔍 tbody encontrado:', tbody);
    console.log('🔍 tbody.innerHTML antes:', tbody ? tbody.innerHTML.substring(0, 200) : 'NO EXISTE');
    
    if (!tbody) {
        console.log('❌ No se encontró tbody de la tabla');
        alert('❌ ERROR: No se encontró tbody de la tabla');
        return;
    }
    
    console.log('✅ tbody encontrado correctamente');
    
    // Ocultar mensaje de tabla vacía
    if (tableEmpty) {
        tableEmpty.style.display = 'none';
    }
    
    if (data.length === 0) {
        console.log('⚠️ No hay datos para renderizar');
        alert('⚠️ No hay datos para renderizar');
        if (tableEmpty) {
            tableEmpty.style.display = 'block';
        }
        tbody.innerHTML = '';
        return;
    }
    
    console.log('✅ Datos válidos encontrados, continuando con renderizado...');

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
    
    const htmlContent = facturasPage.map(factura => `
        <tr>
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
            <td class="total-factura">${formatCurrency(factura.total_factura || 0)}</td>
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
                    <button class="btn-action btn-view" onclick="viewFactura('${factura.id}')">
                        Ver
                    </button>
                    <button class="btn-action btn-edit" onclick="editFactura('${factura.id}')">
                        Editar
                    </button>
                    <button class="btn-action btn-advanced" onclick="openInvoiceAdvanced('${factura.id}')" title="Ver con coordenadas y zoom" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                        📍 Avanzado
                    </button>
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
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
}

function getConfidenceLabel(confidence) {
    if (confidence >= 0.9) return 'Alta';
    if (confidence >= 0.7) return 'Media';
    return 'Baja';
}

// ===== FUNCIONES DE ESTADO =====
function getEstadoClass(estado) {
    switch (estado) {
        case 'processed': return 'estado-procesado';
        case 'approved': return 'estado-aprobado';
        case 'pending': return 'estado-pendiente';
        case 'error': return 'estado-error';
        case 'uploaded': return 'estado-subido';
        default: return 'estado-default';
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
function viewFactura(id) {
    console.log('Viendo factura:', id);
    openFacturaModal(id, 'view');
}

function editFactura(id) {
    console.log('Editando factura:', id);
    openFacturaModal(id, 'edit');
}

// ===== FUNCIONES DEL MODAL =====
async function openFacturaModal(facturaId, mode = 'view') {
    try {
        console.log('🔍 Buscando factura con ID:', facturaId);
        console.log('📊 Datos disponibles:', window.facturasData);
        console.log('📋 Total de facturas:', (window.facturasData || []).length);
        
        // Buscar la factura en los datos
        const factura = (window.facturasData || []).find(f => f.id === facturaId);
        console.log('✅ Factura encontrada:', factura);
        
        if (!factura) {
            console.error('❌ Factura no encontrada con ID:', facturaId);
            console.log('🔍 IDs disponibles:', (window.facturasData || []).map(f => f.id));
            showNotification('Factura no encontrada', 'error');
            return;
        }

        // Cambiar el título del modal según el modo
        const modalTitle = document.querySelector('#facturaModal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = mode === 'view' ? 'Ver Factura' : 'Editar Factura';
        }

        // Cargar datos en el modal
        loadFacturaDataInModal(factura, mode);

        // Mostrar el modal
        const modal = document.getElementById('facturaModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevenir scroll
        }

        // Cargar el PDF de la factura
        console.log('🔄 Iniciando carga del PDF...');
        await loadPdfFromFacturaId(facturaId);

        console.log('Modal abierto para factura:', facturaId, 'Modo:', mode);

    } catch (error) {
        console.error('Error abriendo modal:', error);
        showNotification('Error abriendo la factura', 'error');
    }
}

function loadFacturaDataInModal(factura, mode) {
    try {
        // Cargar datos básicos
        document.getElementById('numeroFactura').value = factura.numero_factura || '';
        document.getElementById('proveedor').value = factura.proveedor_nombre || '';
        document.getElementById('cifProveedor').value = factura.proveedor_cif || '';
        document.getElementById('provinciaProveedor').value = factura.proveedor_provincia || '';
        document.getElementById('fechaFactura').value = factura.fecha_factura || '';
        document.getElementById('fechaVencimiento').value = factura.fecha_vencimiento || '';
        document.getElementById('concepto').value = factura.concepto || '';
        
        // Actualizar estado de la factura
        const statusElement = document.getElementById('facturaStatus');
        if (statusElement) {
            statusElement.textContent = getEstadoLabel(factura.estado || 'processed');
            statusElement.className = `status-badge ${getEstadoClass(factura.estado || 'processed')}`;
        }

                         // Cargar datos financieros
                 document.getElementById('baseImponible').textContent = formatCurrency(factura.importe_neto || 0);
                 document.getElementById('ivaAmount').textContent = formatCurrency(factura.iva || 0);
                 document.getElementById('totalConIva').textContent = formatCurrency(factura.total_factura || 0);
                 document.getElementById('retencion').textContent = formatCurrency(factura.retencion || 0);

        // Cargar productos si existen
        if (factura.productos && Array.isArray(factura.productos)) {
            loadProductosInModal(factura.productos);
        } else {
            // Limpiar tabla de productos
            const productosTable = document.getElementById('productosTableBody');
            if (productosTable) {
                productosTable.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos disponibles</td></tr>';
            }
        }

        // Configurar modo de edición
        setModalEditMode(mode);

        console.log('Datos cargados en modal:', factura);

    } catch (error) {
        console.error('Error cargando datos en modal:', error);
        showNotification('Error cargando datos de la factura', 'error');
    }
}

function loadProductosInModal(productos) {
    try {
        const productosTable = document.getElementById('productosTableBody');
        if (!productosTable) return;

        let totalSuma = 0;

        productosTable.innerHTML = productos.map(producto => {
            const total = (producto.precio || 0) * (producto.cantidad || 0);
            totalSuma += total;

            return `
                <tr>
                    <td>${producto.ean || 'N/A'}</td>
                    <td>${producto.descripcion || 'N/A'}</td>
                    <td>${producto.unidad || 'N/A'}</td>
                    <td>${producto.cantidad || 0}</td>
                    <td>${formatCurrency(producto.precio || 0)}</td>
                    <td>${producto.descuento || '0%'}</td>
                    <td>${formatCurrency(total)}</td>
                </tr>
            `;
        }).join('');

        // Actualizar suma total
        const sumaTotalElement = document.getElementById('sumaTotal');
        if (sumaTotalElement) {
            sumaTotalElement.textContent = formatCurrency(totalSuma);
        }

        console.log('Productos cargados en modal:', productos.length);

    } catch (error) {
        console.error('Error cargando productos en modal:', error);
    }
}

function setModalEditMode(mode) {
    const isEditMode = mode === 'edit';
    const inputs = document.querySelectorAll('#facturaModal input, #facturaModal select');
    
    inputs.forEach(input => {
        // Los campos readonly siempre están deshabilitados
        if (input.hasAttribute('readonly')) {
            input.disabled = true;
        } else {
            // Los demás campos se habilitan/deshabilitan según el modo
            input.disabled = !isEditMode;
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
            importe_neto: factura.base_imponible || factura.total_factura * 0.79,
            iva: factura.total_iva || factura.total_factura * 0.21,
            base_imponible: factura.base_imponible || factura.total_factura * 0.79,
            total_iva: factura.total_iva || factura.total_factura * 0.21,
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

// ===== MODAL HÍBRIDO DE PDF =====
async function openInvoiceAdvanced(facturaId) {
    try {
        console.log('🚀 ===== INICIO OPENINVOICEADVANCED =====');
        console.log('🚀 Abriendo modal híbrido para factura:', facturaId);
        console.log('🚀 Función openInvoiceAdvanced ejecutándose...');
        
        if (!window.hybridPDFModal) {
            throw new Error('Modal híbrido no inicializado');
        }
        
        // Buscar la factura en los datos
        const factura = (window.facturasData || []).find(f => f.id === facturaId);
        if (!factura) {
            throw new Error('Factura no encontrada');
        }
        
        console.log('✅ Factura encontrada para modal híbrido:', factura);
        
        // Verificar que tenemos coordenadas
        if (!factura.coordenadas_campos || Object.keys(factura.coordenadas_campos).length === 0) {
            throw new Error('No se encontraron coordenadas para esta factura');
        }
        
        // Preparar coordenadas para el modal
        const coordinates = {};
        const addValidCoordinates = (fieldName, coordData) => {
            if (coordData && typeof coordData === 'object' && 
                coordData.x !== undefined && coordData.y !== undefined && 
                coordData.width !== undefined && coordData.height !== undefined) {
                coordinates[fieldName] = coordData;
            }
        };
        
        // Mapear coordenadas de campos específicos
        addValidCoordinates('numero_factura', factura.coordenadas_numero_factura);
        addValidCoordinates('proveedor_nombre', factura.coordenadas_proveedor_nombre);
        addValidCoordinates('proveedor_cif', factura.coordenadas_proveedor_cif);
        addValidCoordinates('fecha_factura', factura.coordenadas_fecha_factura);
        addValidCoordinates('importe_neto', factura.coordenadas_importe_neto);
        addValidCoordinates('iva', factura.coordenadas_iva);
        addValidCoordinates('total_factura', factura.coordenadas_total_factura);
        
        // También usar coordenadas_campos si está disponible
        if (factura.coordenadas_campos) {
            Object.entries(factura.coordenadas_campos).forEach(([fieldName, coordData]) => {
                addValidCoordinates(fieldName, coordData);
            });
        }
        
        console.log('📍 Coordenadas preparadas:', coordinates);
        console.log('🔍 DEBUG - Detalle de coordenadas:');
        Object.entries(coordinates).forEach(([fieldName, coordData]) => {
            console.log(`  - ${fieldName}:`, coordData);
        });
        
        // Verificar que tenemos al menos algunas coordenadas válidas
        if (Object.keys(coordinates).length === 0) {
            throw new Error('No se encontraron coordenadas válidas para esta factura');
        }
        
        // 🔥 COPIAR LA LÓGICA DEL BOTÓN "VER" QUE FUNCIONA
        // Obtener el documento_id para buscar en la tabla documentos
        const documentoId = factura.documento_id;
        if (!documentoId) {
            throw new Error('No se encontró documento_id en la factura');
        }
        
        console.log('📄 Documento ID:', documentoId);
        
        // Buscar la URL completa en la tabla documentos (COMO HACE EL BOTÓN "VER")
        const { data: documentoInfo, error: docError } = await supabaseClient
            .from('documentos')
            .select('url_storage')
            .eq('id', documentoId)
            .single();
            
        if (docError || !documentoInfo) {
            throw new Error(`Error obteniendo información del documento: ${docError?.message || 'Documento no encontrado'}`);
        }
        
        const pdfUrl = documentoInfo.url_storage;
        console.log('🔗 URL del PDF obtenida de la tabla documentos:', pdfUrl);
        
        if (!pdfUrl) {
            throw new Error('No se encontró URL del PDF en la base de datos');
        }
        
        // Verificar si la URL es válida
        if (!pdfUrl.startsWith('http')) {
            throw new Error('URL del PDF no es válida');
        }
        
        // Preparar datos extraídos para el modal
        const extractedData = {
            numero_factura: factura.numero_factura || 'N/A',
            proveedor_nombre: factura.proveedor_nombre || 'N/A',
            proveedor_cif: factura.proveedor_cif || 'N/A',
            fecha_factura: factura.fecha_factura || 'N/A',
            importe_neto: factura.importe_neto || 0,
            iva: factura.iva || 0,
            total_factura: factura.total_factura || 0,
            confianza_global: factura.confianza_global || 0
        };
        
        console.log('📊 Datos extraídos preparados:', extractedData);
        
        // 🔥 PRIMERO: Abrir el modal existente del dashboard (como hace el botón "VER")
        const modal = document.getElementById('facturaModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevenir scroll
        }
        
        // 🔥 SEGUNDO: Cargar el PDF en el modal existente
        console.log('🔄 Iniciando carga del PDF en modal existente...');
        await loadPdfFromFacturaId(facturaId);
        
        // 🔥 TERCERO: Activar funcionalidades avanzadas del modal híbrido
        await window.hybridPDFModal.open(pdfUrl, coordinates, extractedData);
        
        console.log('✅ Modal híbrido abierto correctamente');
        
    } catch (error) {
        console.error('❌ Error abriendo modal híbrido:', error);
        showNotification('Error abriendo modal híbrido: ' + error.message, 'error');
    }
}