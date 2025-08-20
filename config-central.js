// ===== CONFIGURACIÓN CENTRAL SUPABASE =====
// ✅ ARCHIVO ÚNICO PARA TODA LA CONFIGURACIÓN

// Verificar que CONFIG está disponible
if (typeof CONFIG === 'undefined') {
    console.error('❌ CONFIG no está disponible. Cargar config.js primero.');
    throw new Error('config.js debe cargarse antes que config-central.js');
}

// ✅ CLIENTE SUPABASE ÚNICO Y CENTRALIZADO
let supabaseClientInstance = null;

// Función para inicializar el cliente (solo una vez)
function initializeSupabaseClient() {
    if (supabaseClientInstance) {
        console.log('♻️ Reutilizando cliente Supabase existente');
        return supabaseClientInstance;
    }
    
    if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
        throw new Error('Configuración de Supabase incompleta. Verificar CONFIG.SUPABASE');
    }
    
    // Verificar que la librería Supabase está disponible
    if (typeof supabase === 'undefined') {
        throw new Error('Librería Supabase no cargada. Incluir script de Supabase primero.');
    }
    
    try {
        supabaseClientInstance = supabase.createClient(
            CONFIG.SUPABASE.URL,
            CONFIG.SUPABASE.ANON_KEY
        );
        
        console.log('✅ Supabase Client inicializado centralmente');
        console.log('🔗 URL:', CONFIG.SUPABASE.URL);
        console.log('🔑 Key:', CONFIG.SUPABASE.ANON_KEY.substring(0, 20) + '...');
        
        return supabaseClientInstance;
        
    } catch (error) {
        console.error('❌ Error inicializando cliente Supabase:', error);
        throw error;
    }
}

// Función para obtener el cliente (siempre usar esta)
function getSupabaseClient() {
    if (!supabaseClientInstance) {
        return initializeSupabaseClient();
    }
    return supabaseClientInstance;
}

// Función para verificar conexión
async function testSupabaseConnection() {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client.from('restaurantes').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('⚠️ Error probando conexión:', error.message);
            return false;
        }
        
        console.log('✅ Conexión a Supabase verificada');
        return true;
    } catch (error) {
        console.error('❌ Error verificando conexión:', error);
        return false;
    }
}

// Función para reinicializar cliente (en caso de error)
function resetSupabaseClient() {
    supabaseClientInstance = null;
    console.log('🔄 Cliente Supabase reiniciado');
    return initializeSupabaseClient();
}

// ✅ EXPORTAR FUNCIONES GLOBALMENTE
window.getSupabaseClient = getSupabaseClient;
window.initializeSupabaseClient = initializeSupabaseClient;
window.testSupabaseConnection = testSupabaseConnection;
window.resetSupabaseClient = resetSupabaseClient;

// ✅ MANTENER COMPATIBILIDAD CON CÓDIGO EXISTENTE
// Crear alias supabaseClient para código legacy
Object.defineProperty(window, 'supabaseClient', {
    get: function() {
        console.warn('⚠️ Usando supabaseClient legacy. Cambiar a getSupabaseClient()');
        return getSupabaseClient();
    }
});

// ✅ INICIALIZAR AUTOMÁTICAMENTE AL CARGAR
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeSupabaseClient();
        console.log('✅ Configuración central cargada correctamente');
        
        // Test de conexión opcional (solo en desarrollo)
        if (CONFIG.DEBUG && CONFIG.DEBUG.ENABLED) {
            testSupabaseConnection();
        }
    } catch (error) {
        console.error('❌ Error cargando configuración central:', error);
    }
});

console.log('📄 config-central.js cargado - Cliente Supabase centralizado disponible');