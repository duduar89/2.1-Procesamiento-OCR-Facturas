// ===== UTILIDADES CENTRALIZADAS =====
// ✅ FUNCIONES COMUNES PARA TODO EL SISTEMA

// ===== FORMATO Y VISUALIZACIÓN =====
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
        console.warn('Error formateando fecha:', dateString);
        return dateString;
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('es-ES');
    } catch (error) {
        console.warn('Error formateando fecha-hora:', dateString);
        return dateString;
    }
}

// ===== NOTIFICACIONES CENTRALIZADAS =====
function showNotification(message, type = 'info', duration = 5000) {
    // Buscar contenedor existente o crear uno
    let container = document.getElementById('notifications');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    // Agregar emoji según el tipo
    const emoji = getNotificationEmoji(type);
    notification.innerHTML = `${emoji} ${message}`;
    
    // Agregar al contenedor
    container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Click para cerrar
    notification.addEventListener('click', function() {
        removeNotification(notification);
    });
    
    // Auto-remover
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    return notification;
}

function removeNotification(notification) {
    if (notification && notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

function getNotificationColor(type) {
    const colors = {
        'success': '#10b981',
        'error': '#ef4444', 
        'warning': '#f59e0b',
        'info': '#3b82f6',
        'processing': '#8b5cf6'
    };
    return colors[type] || colors['info'];
}

function getNotificationEmoji(type) {
    const emojis = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️', 
        'info': 'ℹ️',
        'processing': '⚙️'
    };
    return emojis[type] || emojis['info'];
}

// ===== VALIDACIONES =====
function validateFile(file, config = {}) {
    const maxSize = config.maxSize || (CONFIG ? CONFIG.APP.MAX_FILE_SIZE : 10 * 1024 * 1024);
    const allowedTypes = config.allowedTypes || (CONFIG ? CONFIG.APP.ALLOWED_TYPES : ['application/pdf']);
    
    // Verificar que es un archivo válido
    if (!file || !file.size || !file.type) {
        showNotification('Archivo no válido', 'error');
        return false;
    }
    
    // Verificar tipo
    if (!allowedTypes.includes(file.type)) {
        const tiposPermitidos = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
        showNotification(`Tipo de archivo no permitido. Solo se permiten: ${tiposPermitidos}`, 'error');
        return false;
    }

    // Verificar tamaño
    if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        const fileMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
        showNotification(`Archivo demasiado grande (${fileMB}MB). Máximo permitido: ${maxMB}MB`, 'error');
        return false;
    }

    return true;
}

// ===== CONFIANZA Y ESTADOS =====
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

function getConfidenceColor(confidence) {
    if (confidence >= 0.9) return '#10b981'; // Verde
    if (confidence >= 0.7) return '#f59e0b'; // Amarillo
    return '#ef4444'; // Rojo
}

function getEstadoBadge(estado) {
    const estados = {
        'approved': 'Aprobada',
        'pending': 'Pendiente', 
        'processed': 'Procesada',
        'error': 'Error',
        'uploaded': 'Subido',
        'processing': 'Procesando',
        'validated': 'Validada',
        'archived': 'Archivada'
    };
    return estados[estado] || 'Desconocido';
}

function getEstadoColor(estado) {
    const colores = {
        'approved': '#10b981',
        'pending': '#f59e0b',
        'processed': '#3b82f6',
        'error': '#ef4444',
        'uploaded': '#6b7280',
        'processing': '#8b5cf6',
        'validated': '#059669',
        'archived': '#4b5563'
    };
    return colores[estado] || '#6b7280';
}

// ===== LOADING Y UI =====
function showLoadingOverlay(text = 'Cargando...') {
    let overlay = document.getElementById('loadingOverlay');
    
    // Crear overlay si no existe
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        `;
        
        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                max-width: 300px;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e5e7eb;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                "></div>
                <div id="loadingText" style="
                    font-family: 'Inter', sans-serif;
                    font-size: 16px;
                    color: #374151;
                    font-weight: 500;
                ">${text}</div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
    } else {
        const loadingText = overlay.querySelector('#loadingText');
        if (loadingText) {
            loadingText.textContent = text;
        }
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

// ===== UTILIDADES DE DATOS =====
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== HASH DE ARCHIVOS =====
async function calculateFileHash(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Error calculando hash del archivo:', error);
        return Date.now().toString(); // Fallback
    }
}

// ===== EXPORTAR GLOBALMENTE =====
window.Utils = {
    // Formato
    formatCurrency,
    formatDate,
    formatDateTime,
    
    // Notificaciones
    showNotification,
    removeNotification,
    
    // Validaciones
    validateFile,
    
    // Estados y confianza
    getConfidenceClass,
    getConfidenceLabel,
    getConfidenceColor,
    getEstadoBadge,
    getEstadoColor,
    
    // Loading y UI
    showLoadingOverlay,
    hideLoadingOverlay,
    updateLoadingText,
    
    // Utilidades
    generateUUID,
    debounce,
    throttle,
    calculateFileHash
};

console.log('✅ Utils.js cargado - Utilidades centralizadas disponibles');
console.log('📦 Funciones disponibles:', Object.keys(window.Utils));

// ===== COMPATIBILIDAD CON CÓDIGO LEGACY =====
// Mantener funciones globales para compatibilidad temporal
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.validateFile = validateFile;
window.getConfidenceClass = getConfidenceClass;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.updateLoadingText = updateLoadingText;

console.log('🔧 Funciones legacy mantenidas para compatibilidad');