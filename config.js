// ===== CONFIGURACIÓN MULTI-TENANT DEL SISTEMA =====

// 🔑 CREDENCIALES DE SUPABASE
const CONFIG = {
    SUPABASE: {
        URL: 'https://yurqgcpgwsgdnxnpyxes.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cnFnY3Bnd3NnZG54bnB5eGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjgzODIsImV4cCI6MjA3MDUwNDM4Mn0.iOPGaCYvtE9EQgkl7ytKAymvKKQzsfwlPUyM5ChDiRg',
        STORAGE_BUCKET: 'documentos'
    },
    
    // 🏢 CONFIGURACIÓN MULTI-TENANT
    TENANT: {
        // Por ahora, hardcodeamos el restaurante para pruebas
        // En producción esto vendría de la autenticación del usuario
        RESTAURANTE_ID: null, // Se establecerá dinámicamente
        RESTAURANTE_ACTUAL: null, // Info del restaurante actual
        
        // Modo de operación
        MODO: 'desarrollo', // 'desarrollo' | 'produccion'
        AUTO_SELECT_RESTAURANTE: true, // Si hay solo uno, seleccionarlo automáticamente
    },
    
    // ⚙️ CONFIGURACIÓN DE LA APLICACIÓN
    APP: {
        // Validación de archivos
        MAX_FILE_SIZE: 10 * 1024 * 1024,         // 10MB en bytes
        ALLOWED_TYPES: ['application/pdf'],       // Solo PDFs por ahora
        ALLOWED_EXTENSIONS: ['.pdf'],
        
        // Procesamiento
        PROCESSING_TIMEOUT: 60000,               // 60 segundos timeout
        AUTO_SAVE_INTERVAL: 5000,                // Guardar cada 5 segundos
        
        // UI
        NOTIFICATION_DURATION: 5000,             // 5 segundos
        ANIMATION_DURATION: 300,                 // 300ms para animaciones
        
        // Estados de documentos
        DOCUMENT_STATES: {
            UPLOADED: 'uploaded',
            PROCESSING: 'processing', 
            PROCESSED: 'processed',
            VALIDATED: 'validated',
            ERROR: 'error',
            ARCHIVED: 'archived'
        },
        
        // Tipos de documento
        DOCUMENT_TYPES: {
            FACTURA: 'factura',
            ALBARAN: 'albaran', 
            TICKET: 'ticket',
            EXTRACTO: 'extracto'
        },
        
        // Niveles de confianza
        CONFIDENCE_LEVELS: {
            HIGH: 0.9,      // >90% - Verde
            MEDIUM: 0.7,    // 70-90% - Amarillo  
            LOW: 0.0        // <70% - Rojo
        }
    },
    
    // 📊 CONFIGURACIÓN DE BASE DE DATOS MULTI-TENANT
    DATABASE: {
        TABLES: {
            RESTAURANTES: 'restaurantes',
            USUARIOS: 'usuarios',
            DOCUMENTOS: 'documentos',
            FACTURAS: 'datos_extraidos_facturas',
            PRODUCTOS: 'productos_extraidos',
            ALBARANES: 'datos_extraidos_albaranes',
            EMBEDDINGS: 'embeddings_documentos',
            COLA: 'cola_procesamiento',
            ALERTAS: 'alertas',
            METRICAS: 'metricas_procesamiento',
            RELACIONES: 'relaciones_documentos',
            MOVIMIENTOS: 'movimientos_bancarios',
            CONFIGURACION: 'configuracion_restaurantes'
        },
        
        // Campos principales por tabla
        FIELDS: {
            DOCUMENTOS: ['id', 'restaurante_id', 'nombre_archivo', 'tipo_documento', 'estado', 'fecha_subida'],
            FACTURAS: ['documento_id', 'restaurante_id', 'proveedor_nombre', 'numero_factura', 'total_factura'],
            PRODUCTOS: ['documento_id', 'restaurante_id', 'descripcion_original', 'cantidad', 'precio_unitario_sin_iva']
        }
    },
    
    // 🎨 CONFIGURACIÓN DE INTERFAZ
    UI: {
        COLORS: {
            PRIMARY: '#2563eb',
            SUCCESS: '#16a34a', 
            WARNING: '#d97706',
            ERROR: '#dc2626',
            INFO: '#0891b2'
        },
        
        MESSAGES: {
            UPLOADING: 'Subiendo archivo...',
            PROCESSING: 'Procesando con IA...',
            VALIDATING: 'Validando resultados...',
            COMPLETED: 'Procesamiento completado',
            ERROR_UPLOAD: 'Error subiendo archivo',
            ERROR_PROCESSING: 'Error en procesamiento',
            NO_RESTAURANT: 'No hay restaurante seleccionado',
            RESTAURANTE_NO_SELECCIONADO: 'Debes seleccionar un restaurante primero'
        },
        
        ANIMATIONS: {
            FADE_DURATION: 300,
            SLIDE_DURATION: 400,
            BOUNCE_DURATION: 600
        },
        
        // 📊 CONFIGURACIÓN DEL DASHBOARD
        DASHBOARD: {
            ITEMS_PER_PAGE: 10,
            AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
            PDF_VIEWER: {
                DEFAULT_SCALE: 1,
                MAX_SCALE: 3,
                MIN_SCALE: 0.25
            },
            CONFIDENCE_THRESHOLDS: {
                HIGH: 0.9,
                MEDIUM: 0.7,
                LOW: 0.0
            }
        }
    },
    
    // 🔧 CONFIGURACIÓN DE DESARROLLO
    DEBUG: {
        ENABLED: true,
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        SHOW_CONFIDENCE: true,
        MOCK_PROCESSING: false
    },
    
    // 📱 CONFIGURACIÓN DE NOTIFICACIONES PUSH (VAPID)
    VAPID: {
        PUBLIC_KEY: 'BIldPsM1aeXkrta7DqjwHTEUvdiqmJ1P3qOnX8PAh5-mZgt3Cng6g5Kt1Hd7ouXymeLG_cgrMTxtcKtbkhwr4Cg',
        PRIVATE_KEY: 'OeWmPe1Z_OEXgp5iFmXyULbNF3tnu1kO2yjm9xas-', // ⚠️ SECRETO - No compartir
        SUBJECT: 'mailto:admin@brainstormersagency.com' // Email de contacto para VAPID
    }
};

// 🔧 SISTEMA DE CONFIGURACIÓN DINÁMICA
function loadSupabaseConfig() {
    // 1. Intentar cargar desde variables de entorno (si están disponibles)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            CONFIG.SUPABASE.URL = process.env.SUPABASE_URL;
            CONFIG.SUPABASE.ANON_KEY = process.env.SUPABASE_ANON_KEY;
            console.log('Configuración cargada desde variables de entorno');
            return;
        }
    }

    // 2. Intentar cargar desde localStorage (para desarrollo)
    const savedConfig = localStorage.getItem('supabase_config');
    if (savedConfig) {
        try {
            const parsed = JSON.parse(savedConfig);
            if (parsed.URL && parsed.ANON_KEY) {
                CONFIG.SUPABASE.URL = parsed.URL;
                CONFIG.SUPABASE.ANON_KEY = parsed.ANON_KEY;
                console.log('Configuración cargada desde localStorage');
                return;
            }
        } catch (error) {
            console.warn('Error parseando configuración guardada:', error);
        }
    }

    // 3. Verificar si la configuración actual es válida
    if (CONFIG.SUPABASE.ANON_KEY && CONFIG.SUPABASE.ANON_KEY.length > 100) {
        console.log('Usando configuración hardcodeada');
        return;
    }

    // 4. Mostrar error y solicitar configuración
    console.error('❌ CONFIGURACIÓN DE SUPABASE INVÁLIDA');
    console.error('Por favor, configura las credenciales de Supabase:');
    console.error('1. Ve a tu proyecto de Supabase');
    console.error('2. Settings > API');
    console.error('3. Copia la URL y la anon key');
    console.error('4. Actualiza config.js o usa el formulario de configuración');
    
    // Mostrar formulario de configuración
    showConfigForm();
}

// 🎯 FORMULARIO DE CONFIGURACIÓN
function showConfigForm() {
    // Crear overlay de configuración
    const overlay = document.createElement('div');
    overlay.id = 'configOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            text-align: center;
        ">
            <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Configuración Requerida</h2>
            <p style="margin-bottom: 20px; color: #374151;">
                Las credenciales de Supabase no son válidas. Por favor, configura tu proyecto:
            </p>
            
            <div style="text-align: left; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">URL de Supabase:</label>
                <input type="text" id="configUrl" placeholder="https://tu-proyecto.supabase.co" 
                       style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px;">
            </div>
            
            <div style="text-align: left; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Anon Key:</label>
                <input type="text" id="configKey" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                       style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="saveConfig()" style="
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Guardar Configuración</button>
                
                <button onclick="document.getElementById('configOverlay').remove()" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Cancelar</button>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: left;">
                <strong>📋 Cómo obtener las credenciales:</strong><br>
                1. Ve a <a href="https://supabase.com" target="_blank" style="color: #2563eb;">supabase.com</a><br>
                2. Accede a tu proyecto<br>
                3. Settings > API<br>
                4. Copia "Project URL" y "anon public" key
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

// 💾 GUARDAR CONFIGURACIÓN
function saveConfig() {
    const url = document.getElementById('configUrl').value.trim();
    const key = document.getElementById('configKey').value.trim();
    
    if (!url || !key) {
        alert('Por favor, completa ambos campos');
        return;
    }
    
    // Validar formato básico
    if (!url.includes('supabase.co')) {
        alert('La URL debe ser de Supabase (contener "supabase.co")');
        return;
    }
    
    if (!key.startsWith('eyJ')) {
        alert('La anon key debe ser un token JWT válido (empieza con "eyJ")');
        return;
    }
    
    // Guardar configuración
    CONFIG.SUPABASE.URL = url;
    CONFIG.SUPABASE.ANON_KEY = key;
    
    // Guardar en localStorage
    localStorage.setItem('supabase_config', JSON.stringify({ URL: url, ANON_KEY: key }));
    
    // Ocultar formulario
    document.getElementById('configOverlay').remove();
    
    // Recargar página para aplicar nueva configuración
    location.reload();
}

// 🔍 VALIDAR CONFIGURACIÓN
function validateSupabaseConfig() {
    const errors = [];
    
    if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.URL.includes('supabase.co')) {
        errors.push('URL de Supabase inválida');
    }
    
    if (!CONFIG.SUPABASE.ANON_KEY || CONFIG.SUPABASE.ANON_KEY.length < 100) {
        errors.push('Anon Key de Supabase inválida');
    }
    
    return errors;
}

// 🏢 GESTOR MULTI-TENANT
class TenantManager {
    constructor() {
        this.restauranteActual = null;
        this.configuracionActual = null;
    }
    
    // Cargar restaurante desde localStorage
    cargarRestauranteGuardado() {
        try {
            const saved = localStorage.getItem('restaurante_actual');
            if (saved) {
                this.restauranteActual = JSON.parse(saved);
                CONFIG.TENANT.RESTAURANTE_ID = this.restauranteActual.id;
                CONFIG.TENANT.RESTAURANTE_ACTUAL = this.restauranteActual;
                return this.restauranteActual;
            }
        } catch (error) {
            console.error('Error cargando restaurante guardado:', error);
        }
        return null;
    }
    
    // Seleccionar restaurante activo
    async seleccionarRestaurante(restauranteId) {
        try {
            if (!window.supabase) {
                throw new Error('Supabase no inicializado');
            }
            
            const { data: restaurante, error } = await window.supabase
                .from(CONFIG.DATABASE.TABLES.RESTAURANTES)
                .select('*')
                .eq('id', restauranteId)
                .eq('activo', true)
                .single();
            
            if (error || !restaurante) {
                throw new Error('Restaurante no encontrado o inactivo');
            }
            
            this.restauranteActual = restaurante;
            CONFIG.TENANT.RESTAURANTE_ID = restaurante.id;
            CONFIG.TENANT.RESTAURANTE_ACTUAL = restaurante;
            
            // Guardar en localStorage
            localStorage.setItem('restaurante_actual', JSON.stringify(restaurante));
            
            // Cargar configuración del restaurante
            await this.cargarConfiguracionRestaurante();
            
            return restaurante;
            
        } catch (error) {
            console.error('Error seleccionando restaurante:', error);
            throw error;
        }
    }
    
    // Cargar configuración específica del restaurante
    async cargarConfiguracionRestaurante() {
        try {
            const { data: config, error } = await window.supabase
                .from(CONFIG.DATABASE.TABLES.CONFIGURACION)
                .select('*')
                .eq('restaurante_id', this.restauranteActual.id)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
              throw error;
            }
            
            this.configuracionActual = config || {};
            return this.configuracionActual;
            
        } catch (error) {
            console.error('Error obteniendo configuración:', error);
            this.configuracionActual = {};
            return {};
        }
    }
    
    // Verificar límites del restaurante
    async verificarLimites() {
        if (!this.restauranteActual) return { storage: false, documentos: false };
        
        try {
            // Verificar límite de storage
            const storageExcedido = this.restauranteActual.storage_utilizado_gb >= this.restauranteActual.limite_storage_gb;
            
            // Verificar límite de documentos del mes
            const { count: documentosMes } = await window.supabase
                .from(CONFIG.DATABASE.TABLES.DOCUMENTOS)
                .select('*', { count: 'exact', head: true })
                .eq('restaurante_id', this.restauranteActual.id)
                .gte('fecha_subida', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
            
            const documentosExcedido = documentosMes >= this.restauranteActual.limite_documentos_mes;
            
            return {
                storage: storageExcedido,
                documentos: documentosExcedido,
                storageUsado: this.restauranteActual.storage_utilizado_gb,
                storageTotal: this.restauranteActual.limite_storage_gb,
                documentosUsados: documentosMes,
                documentosTotal: this.restauranteActual.limite_documentos_mes
            };
        } catch (error) {
            console.error('Error verificando límites:', error);
            return { storage: false, documentos: false };
        }
    }
}

// 🛡️ VALIDACIÓN DE CONFIGURACIÓN MULTI-TENANT
function validateConfig() {
    const errors = [];
    
    // Verificar Supabase
    if (!CONFIG.SUPABASE.URL || CONFIG.SUPABASE.URL.includes('tu-proyecto')) {
        errors.push('URL de Supabase no configurada');
    }
    
    if (!CONFIG.SUPABASE.ANON_KEY || CONFIG.SUPABASE.ANON_KEY.includes('tu-anon-key')) {
        errors.push('Anon Key de Supabase no configurada');
    }
    
    // Verificar tamaño máximo
    if (CONFIG.APP.MAX_FILE_SIZE < 1024 * 1024) {
        errors.push('Tamaño máximo de archivo muy pequeño');
    }
    
    return errors;
}

// 🔧 UTILIDADES MULTI-TENANT
const TenantUtils = {
    // Agregar restaurante_id a todas las queries
    addTenantFilter(query) {
        const restauranteId = CONFIG.TENANT.RESTAURANTE_ID;
        if (restauranteId) {
            return query.eq('restaurante_id', restauranteId);
        }
        return query;
    },
    
    // Crear objeto con restaurante_id para inserts
    addTenantData(data) {
        const restauranteId = CONFIG.TENANT.RESTAURANTE_ID;
        if (restauranteId) {
            return { ...data, restaurante_id: restauranteId };
        }
        return data;
    },
    
    // Verificar si hay restaurante seleccionado
    verificarRestauranteSeleccionado() {
        if (!CONFIG.TENANT.RESTAURANTE_ID) {
            throw new Error(CONFIG.UI.MESSAGES.RESTAURANTE_NO_SELECCIONADO);
        }
        return true;
    },
    
    // Generar ID único para documentos
    generarDocumentoId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${CONFIG.TENANT.RESTAURANTE_ID}_${timestamp}_${random}`;
    },
    
    // Formatear nombre de archivo para storage
    formatearNombreArchivo(originalName, documentId) {
        const extension = originalName.split('.').pop();
        const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${documentId}_${cleanName}`;
    }
};

// 🚀 EXPORTAR CONFIGURACIÓN Y UTILIDADES
window.CONFIG = CONFIG;
window.TenantManager = TenantManager;
window.TenantUtils = TenantUtils;
window.validateConfig = validateConfig;
window.loadSupabaseConfig = loadSupabaseConfig;
window.showConfigForm = showConfigForm;
window.saveConfig = saveConfig;
window.validateSupabaseConfig = validateSupabaseConfig;

// 📝 LOGS DE DEBUG
if (window.location.hostname === 'localhost' || CONFIG.DEBUG.ENABLED) {
    console.log('Configuración Multi-Tenant cargada:', CONFIG);
    
    // 🚫 PREVENIR MÚLTIPLES EJECUCIONES
    if (!window.CONFIG_VALIDATED) {
        window.CONFIG_VALIDATED = true;
        
        // Validar configuración de Supabase
        const configErrors = validateSupabaseConfig();
        if (configErrors.length > 0) {
            console.warn('❌ Errores de configuración de Supabase:', configErrors);
            // Solo mostrar formulario si no existe ya
            if (!document.getElementById('configOverlay')) {
                setTimeout(() => {
                    showConfigForm();
                }, 1000);
            }
        } else {
            console.log('✅ Configuración de Supabase válida');
            console.log('🔗 URL:', CONFIG.SUPABASE.URL);
            console.log('🔑 Anon Key:', CONFIG.SUPABASE.ANON_KEY.substring(0, 20) + '...');
        }
        
        // Validar configuración general
        const generalErrors = validateConfig();
        if (generalErrors.length > 0) {
            console.warn('⚠️ Errores de configuración general:', generalErrors);
        } else {
            console.log('✅ Configuración general válida');
        }
    } else {
        console.log('✅ Configuración ya validada previamente');
    }
}