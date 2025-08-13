// ===== ARCHIVO DE CONFIGURACIÓN DE EJEMPLO =====
// Copia este archivo como config.js y actualiza con tus credenciales

const CONFIG = {
    SUPABASE: {
        URL: 'https://tu-proyecto.supabase.co',           // ← REEMPLAZA CON TU URL
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // ← REEMPLAZA CON TU ANON KEY
        STORAGE_BUCKET: 'documentos'                     // ← REEMPLAZA CON TU BUCKET
    },
    
    // 🏢 CONFIGURACIÓN MULTI-TENANT
    TENANT: {
        RESTAURANTE_ID: null, // Se establecerá dinámicamente
        RESTAURANTE_ACTUAL: null,
        MODO: 'desarrollo',
        AUTO_SELECT_RESTAURANTE: true,
    },
    
    // ⚙️ CONFIGURACIÓN DE LA APLICACIÓN
    APP: {
        MAX_FILE_SIZE: 10 * 1024 * 1024,         // 10MB
        ALLOWED_TYPES: ['application/pdf'],
        ALLOWED_EXTENSIONS: ['.pdf'],
        PROCESSING_TIMEOUT: 60000,
        AUTO_SAVE_INTERVAL: 5000,
        NOTIFICATION_DURATION: 5000,
        ANIMATION_DURATION: 300,
        
        DOCUMENT_STATES: {
            UPLOADED: 'uploaded',
            PROCESSING: 'processing', 
            PROCESSED: 'processed',
            VALIDATED: 'validated',
            ERROR: 'error',
            ARCHIVED: 'archived'
        },
        
        DOCUMENT_TYPES: {
            FACTURA: 'factura',
            ALBARAN: 'albaran', 
            TICKET: 'ticket',
            EXTRACTO: 'extracto'
        },
        
        CONFIDENCE_LEVELS: {
            HIGH: 0.9,
            MEDIUM: 0.7,
            LOW: 0.0
        }
    },
    
    // 📊 CONFIGURACIÓN DE BASE DE DATOS
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
        
        DASHBOARD: {
            ITEMS_PER_PAGE: 10,
            AUTO_REFRESH_INTERVAL: 30000,
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
        LOG_LEVEL: 'info',
        SHOW_CONFIDENCE: true,
        MOCK_PROCESSING: false
    }
};

// 🚀 EXPORTAR CONFIGURACIÓN
window.CONFIG = CONFIG;

// 📝 INSTRUCCIONES DE CONFIGURACIÓN
console.log(`
🚀 CONFIGURACIÓN DE SUPABASE

Para configurar tu proyecto:

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a: Settings > API
4. Copia:
   - Project URL → CONFIG.SUPABASE.URL
   - anon public → CONFIG.SUPABASE.ANON_KEY

5. Actualiza este archivo con tus credenciales
6. Renombra este archivo a config.js

¡Listo para usar!
`);

