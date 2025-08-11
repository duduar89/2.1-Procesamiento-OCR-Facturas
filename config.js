// ===== CONFIGURACIÓN MULTI-TENANT DEL SISTEMA =====

// 🔑 CREDENCIALES DE SUPABASE
const CONFIG = {
    SUPABASE: {
        URL: 'https://yurqgcpgwsgdnxnpyxes.supabase.co',    // ✅ TU URL
        ANON_KEY: 'tu-anon-key-aqui',                         // ⚠️ CAMBIAR POR TU KEY
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
    
    // 🤖 APIs DE IA (para futuro uso)
    GOOGLE_CLOUD: {
        API_KEY: 'tu-google-cloud-api-key',
        PROJECT_ID: 'tu-proyecto-gcp',
        LOCATION: 'us',
        PROCESSOR_ID: 'tu-processor-id'
    },
    
    OPENAI: {
        API_KEY: 'tu-openai-api-key'
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
            MOVIMIENTOS_BANCARIOS: 'movimientos_bancarios',
            CONFIGURACION: 'configuracion_restaurantes'
        }
    },
    
    // 👥 ROLES Y PERMISOS
    ROLES: {
        ADMIN_GLOBAL: 'admin_global',        // Ve todos los restaurantes
        ADMIN_RESTAURANTE: 'admin_restaurante', // Solo su restaurante
        USUARIO: 'usuario',                  // Usuario normal
        SOLO_LECTURA: 'solo_lectura'        // Solo puede ver
    },
    
    PERMISOS: {
        VER_DOCUMENTOS: 'ver_documentos',
        SUBIR_DOCUMENTOS: 'subir_documentos',
        CORREGIR_DATOS: 'corregir_datos',
        VER_REPORTES: 'ver_reportes',
        CONFIGURAR_ALERTAS: 'configurar_alertas',
        ADMINISTRAR_USUARIOS: 'administrar_usuarios',
        VER_METRICAS: 'ver_metricas',
        CONFIGURAR_SISTEMA: 'configurar_sistema'
    },
    
    // 🎨 CONFIGURACIÓN DE UI
    UI: {
        COLORS: {
            PRIMARY: '#2563eb',
            SUCCESS: '#10b981', 
            WARNING: '#f59e0b',
            ERROR: '#ef4444',
            SECONDARY: '#64748b'
        },
        
        MESSAGES: {
            // Mensajes básicos
            UPLOAD_SUCCESS: '✅ Archivo subido correctamente',
            UPLOAD_ERROR: '❌ Error al subir archivo',
            PROCESSING_START: '🔄 Iniciando procesamiento...',
            PROCESSING_COMPLETE: '✅ Procesamiento completado',
            INVALID_FILE: '⚠️ Archivo no válido',
            FILE_TOO_LARGE: '⚠️ Archivo demasiado grande (máx. 10MB)',
            NETWORK_ERROR: '🌐 Error de conexión',
            
            // Mensajes multi-tenant
            RESTAURANTE_NO_SELECCIONADO: '🏢 Selecciona un restaurante para continuar',
            RESTAURANTE_CAMBIADO: '🔄 Restaurante cambiado correctamente',
            SIN_PERMISOS: '🚫 No tienes permisos para esta acción',
            LIMITE_STORAGE_EXCEDIDO: '💾 Límite de almacenamiento excedido',
            LIMITE_DOCUMENTOS_EXCEDIDO: '📄 Límite de documentos mensuales excedido'
        }
    },
    
    // 🔍 CONFIGURACIÓN DE EXTRACCIÓN
    EXTRACTION: {
        // Patrones regex para campos españoles
        PATTERNS: {
            CIF: /^[A-Z]\d{8}[A-Z0-9]$/,
            NIF: /^\d{8}[A-Z]$/,
            FECHA_ES: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/,
            IMPORTE_ES: /\d{1,3}(?:\.\d{3})*,\d{2}\s*€?/,
            TELEFONO_ES: /^[679]\d{8}$/
        },
        
        // Campos a extraer por tipo de documento
        CAMPOS_FACTURA: [
            'proveedor_nombre',
            'proveedor_cif', 
            'numero_factura',
            'fecha_factura',
            'fecha_vencimiento',
            'base_imponible',
            'total_factura',
            'productos'
        ],
        
        CAMPOS_ALBARAN: [
            'proveedor_nombre',
            'numero_albaran',
            'fecha_entrega',
            'direccion_entrega',
            'productos',
            'observaciones'
        ]
    },
    
    // 🚨 CONFIGURACIÓN DE ALERTAS
    ALERTS: {
        TYPES: {
            DUPLICATE: 'duplicate_detected',
            PRICE_ANOMALY: 'price_anomaly',
            MATH_ERROR: 'math_error',
            LOW_CONFIDENCE: 'low_confidence',
            STORAGE_LIMIT: 'storage_limit_warning',
            DOCUMENT_LIMIT: 'document_limit_warning'
        },
        
        THRESHOLDS: {
            DUPLICATE_SIMILARITY: 0.95,      // 95% similitud = duplicado
            PRICE_VARIANCE: 0.30,            // 30% variación = anomalía
            MIN_CONFIDENCE: 0.70,            // <70% = requiere revisión
            STORAGE_WARNING: 0.80,           // Alertar al 80% del límite
            DOCUMENT_WARNING: 0.90           // Alertar al 90% del límite mensual
        }
    }
};

// 🏢 GESTIÓN DE RESTAURANTE ACTUAL
class TenantManager {
    constructor() {
        this.restauranteActual = null;
        this.usuarioActual = null;
        this.permisos = new Set();
    }
    
    // Obtener lista de restaurantes disponibles para el usuario
    async obtenerRestaurantesDisponibles() {
        try {
            const { data: restaurantes, error } = await window.supabase
                .from(CONFIG.DATABASE.TABLES.RESTAURANTES)
                .select('id, nombre, cif, activo')
                .eq('activo', true)
                .order('nombre');
            
            if (error) throw error;
            return restaurantes || [];
        } catch (error) {
            console.error('Error obteniendo restaurantes:', error);
            return [];
        }
    }
    
    // Establecer restaurante actual
    async establecerRestaurante(restauranteId) {
        try {
            const { data: restaurante, error } = await window.supabase
                .from(CONFIG.DATABASE.TABLES.RESTAURANTES)
                .select('*')
                .eq('id', restauranteId)
                .single();
            
            if (error) throw error;
            
            this.restauranteActual = restaurante;
            CONFIG.TENANT.RESTAURANTE_ID = restauranteId;
            CONFIG.TENANT.RESTAURANTE_ACTUAL = restaurante;
            
            // Guardar en localStorage para persistencia
            localStorage.setItem('restaurante_actual', JSON.stringify(restaurante));
            
            // Actualizar UI
            this.actualizarUIRestaurante();
            
            return restaurante;
        } catch (error) {
            console.error('Error estableciendo restaurante:', error);
            throw error;
        }
    }
    
    // Cargar restaurante desde localStorage
    cargarRestauranteGuardado() {
        try {
            const restauranteGuardado = localStorage.getItem('restaurante_actual');
            if (restauranteGuardado) {
                const restaurante = JSON.parse(restauranteGuardado);
                this.restauranteActual = restaurante;
                CONFIG.TENANT.RESTAURANTE_ID = restaurante.id;
                CONFIG.TENANT.RESTAURANTE_ACTUAL = restaurante;
                this.actualizarUIRestaurante();
                return restaurante;
            }
        } catch (error) {
            console.error('Error cargando restaurante guardado:', error);
            localStorage.removeItem('restaurante_actual');
        }
        return null;
    }
    
    // Actualizar UI con información del restaurante
    actualizarUIRestaurante() {
        if (this.restauranteActual) {
            // Actualizar título si existe el elemento
            const tituloElement = document.querySelector('h1');
            if (tituloElement) {
                tituloElement.textContent = `📄 ${this.restauranteActual.nombre} - Procesador de Facturas`;
            }
            
            // Actualizar selector de restaurante si existe
            const selectorElement = document.getElementById('restauranteSelector');
            if (selectorElement) {
                selectorElement.value = this.restauranteActual.id;
            }
            
            // Mostrar información en la consola para debug
            if (CONFIG.TENANT.MODO === 'desarrollo') {
                console.log('🏢 Restaurante actual:', this.restauranteActual.nombre);
                console.log('🆔 ID:', this.restauranteActual.id);
            }
        }
    }
    
    // Verificar si el usuario tiene un permiso específico
    tienePermiso(permiso) {
        return this.permisos.has(permiso);
    }
    
    // Obtener configuración del restaurante actual
    async obtenerConfiguracion() {
        if (!this.restauranteActual) return null;
        
        try {
            const { data: config, error } = await window.supabase
                .from(CONFIG.DATABASE.TABLES.CONFIGURACION)
                .select('*')
                .eq('restaurante_id', this.restauranteActual.id)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                throw error;
            }
            
            return config || {};
        } catch (error) {
            console.error('Error obteniendo configuración:', error);
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
        errors.push('❌ URL de Supabase no configurada');
    }
    
    if (!CONFIG.SUPABASE.ANON_KEY || CONFIG.SUPABASE.ANON_KEY.includes('tu-anon-key')) {
        errors.push('❌ Anon Key de Supabase no configurada');
    }
    
    // Verificar tamaño máximo
    if (CONFIG.APP.MAX_FILE_SIZE < 1024 * 1024) {
        errors.push('⚠️ Tamaño máximo de archivo muy pequeño');
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
    }
};

// 🚀 EXPORTAR CONFIGURACIÓN Y UTILIDADES
window.CONFIG = CONFIG;
window.TenantManager = TenantManager;
window.TenantUtils = TenantUtils;
window.validateConfig = validateConfig;

// 📝 LOGS DE DEBUG
if (window.location.hostname === 'localhost' || CONFIG.TENANT.MODO === 'desarrollo') {
    console.log('🔧 Configuración Multi-Tenant cargada:', CONFIG);
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
        console.warn('⚠️ Errores de configuración:', configErrors);
    } else {
        console.log('✅ Configuración válida');
    }
}