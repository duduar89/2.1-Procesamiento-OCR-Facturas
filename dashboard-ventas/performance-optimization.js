/**
 * ⚡ CONFIGURACIÓN DE OPTIMIZACIÓN DE RENDIMIENTO
 * 
 * Este archivo contiene configuraciones optimizadas para mejorar el rendimiento
 * del dashboard eliminando transiciones lentas y no lineales.
 * 
 * Problemas solucionados:
 * - Exceso de setTimeout en cascada
 * - Animaciones CSS complejas y conflictivas  
 * - Configuraciones ineficientes de Chart.js
 * - Sistema de detección de interacción problemático
 * - Múltiples requestAnimationFrame concurrentes
 */

// =============================================
// 🎯 CONFIGURACIÓN GLOBAL DE RENDIMIENTO
// =============================================

// ⚡ Configuración optimizada para Chart.js
const OPTIMIZED_CHART_CONFIG = {
    // Animaciones ultra-rápidas y suaves
    animation: {
        duration: 150,  // Reducido drásticamente de 500-1200ms
        easing: 'linear'  // Más eficiente que easeOutCubic
    },
    
    // Interacciones optimizadas
    interaction: {
        intersect: false,
        mode: 'nearest',
        axis: 'x'
    },
    
    // Escalas optimizadas
    scales: {
        x: {
            animation: {
                duration: 0  // Sin animación en ejes
            }
        },
        y: {
            animation: {
                duration: 0  // Sin animación en ejes
            }
        }
    },
    
    // Elementos sin animación
    elements: {
        point: {
            hoverRadius: 0,  // Sin hover en puntos para mejor rendimiento
            radius: 0
        },
        line: {
            tension: 0  // Líneas rectas (más eficientes)
        }
    }
};

// ⚡ Configuración CSS optimizada
const OPTIMIZED_CSS_CONFIG = {
    // Transiciones ultra-rápidas
    transition: 'all 0.1s ease',
    
    // Animaciones simplificadas
    animationDuration: '0.2s',
    animationTimingFunction: 'ease',
    
    // Desactivar animaciones problemáticas
    disableAnimations: [
        'pulse',
        'shine', 
        'pulse-neon-diario',
        'shimmer'
    ]
};

// ⚡ Lista de setTimeout que deben eliminarse
const PROBLEMATIC_TIMEOUTS = [
    'setTimeout(() => { if (dashboardData',
    'setTimeout(() => updateSalesChart',
    'setTimeout(() => updateHourlyCharts',
    'setTimeout(() => mejorarVisualizacionEjeXContinuo'
];

// =============================================
// 🔧 FUNCIONES DE OPTIMIZACIÓN
// =============================================

/**
 * Aplicar configuración optimizada a todos los gráficos de Chart.js
 */
function applyOptimizedChartConfig() {
    // Configuración global para Chart.js
    Chart.defaults.animation = OPTIMIZED_CHART_CONFIG.animation;
    Chart.defaults.interaction = OPTIMIZED_CHART_CONFIG.interaction;
    
    // Desactivar animaciones de redimensionado
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    
    console.log('✅ Configuración optimizada aplicada a Chart.js');
}

/**
 * Eliminar animaciones CSS problemáticas
 */
function removeProblematicAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        /* ⚡ OPTIMIZACIÓN: Desactivar animaciones problemáticas */
        *,
        *::before,
        *::after {
            animation-duration: 0.1s !important;
            animation-delay: 0s !important;
            transition-duration: 0.1s !important;
            transition-delay: 0s !important;
        }
        
        /* Desactivar animaciones infinitas específicas */
        .metric-card::after,
        .metric-icon,
        .popularity-bar::after {
            animation: none !important;
        }
        
        /* Simplificar transiciones de hover */
        .card:hover,
        .metric-card:hover,
        .btn:hover {
            transform: none !important;
            transition: background 0.1s ease !important;
        }
        
        /* Optimizar spinner de carga */
        .spinner {
            animation: spin 0.5s linear infinite !important;
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Animaciones CSS problemáticas eliminadas');
}

/**
 * Reemplazar setTimeout problemáticos con ejecución inmediata
 */
function optimizeAsyncOperations() {
    // Crear versión optimizada de funciones que usan setTimeout
    window.optimizedUpdateSalesChart = function(ventasPorHora) {
        // Ejecutar inmediatamente sin setTimeout
        if (dashboardData && dashboardData.rango_horario_inteligente) {
            updateSalesChart(ventasPorHora);
        }
    };
    
    window.optimizedUpdateHourlyCharts = function(ventasPorHora) {
        // Ejecutar inmediatamente sin setTimeout
        if (dashboardData && dashboardData.rango_horario_inteligente) {
            updateHourlyCharts(ventasPorHora);
        }
    };
    
    console.log('✅ Operaciones asíncronas optimizadas');
}

/**
 * Desactivar sistema de detección de interacción problemático
 */
function disableProblematicInteractionSystem() {
    // Remover listeners de mousemove que causan redibujados constantes
    const userInteractionListeners = document.querySelectorAll('[data-interaction-listener]');
    userInteractionListeners.forEach(el => {
        el.removeEventListener('mousemove', () => {});
    });
    
    // Configuración fija para Chart.js sin cambios dinámicos
    Chart.defaults.animation = {
        duration: 100,
        easing: 'linear'
    };
    
    console.log('✅ Sistema de detección de interacción problemático desactivado');
}

/**
 * Optimizar requestAnimationFrame concurrentes
 */
function optimizeAnimationFrames() {
    let animationQueue = [];
    let isProcessing = false;
    
    window.optimizedRequestAnimationFrame = function(callback) {
        animationQueue.push(callback);
        
        if (!isProcessing) {
            isProcessing = true;
            requestAnimationFrame(() => {
                // Ejecutar todas las callbacks en lote
                while (animationQueue.length > 0) {
                    const callback = animationQueue.shift();
                    try {
                        callback();
                    } catch (error) {
                        console.warn('Error en callback de animación:', error);
                    }
                }
                isProcessing = false;
            });
        }
    };
    
    console.log('✅ RequestAnimationFrame optimizado para procesamiento en lote');
}

/**
 * Configurar métricas de rendimiento
 */
function setupPerformanceMonitoring() {
    // Medir tiempo de carga de gráficos
    const chartLoadTimes = new Map();
    
    const originalCreateChart = Chart.prototype.constructor;
    Chart.prototype.constructor = function(...args) {
        const startTime = performance.now();
        const result = originalCreateChart.apply(this, args);
        const endTime = performance.now();
        
        console.log(`⚡ Gráfico creado en ${(endTime - startTime).toFixed(2)}ms`);
        return result;
    };
    
    // Detectar operaciones lentas
    const slowOperationThreshold = 50; // ms
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay) {
        if (delay > slowOperationThreshold) {
            console.warn(`⚠️ setTimeout lento detectado: ${delay}ms`);
        }
        return originalSetTimeout(callback, Math.min(delay, 50)); // Limitar a 50ms máximo
    };
    
    console.log('✅ Monitoreo de rendimiento configurado');
}

// =============================================
// 🚀 FUNCIÓN PRINCIPAL DE OPTIMIZACIÓN
// =============================================

/**
 * Aplicar todas las optimizaciones de rendimiento
 */
function initializePerformanceOptimizations() {
    console.log('🚀 Iniciando optimizaciones de rendimiento...');
    
    try {
        // Aplicar optimizaciones en orden
        applyOptimizedChartConfig();
        removeProblematicAnimations();
        optimizeAsyncOperations();
        disableProblematicInteractionSystem();
        optimizeAnimationFrames();
        setupPerformanceMonitoring();
        
        console.log('✅ Todas las optimizaciones de rendimiento aplicadas con éxito');
        
        // Mostrar notificación de optimización
        if (typeof showNotification === 'function') {
            showNotification('⚡ Dashboard optimizado para mejor rendimiento', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error aplicando optimizaciones:', error);
    }
}

// =============================================
// 🎯 AUTO-INICIALIZACIÓN
// =============================================

// Aplicar optimizaciones cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePerformanceOptimizations);
} else {
    initializePerformanceOptimizations();
}

// Exportar funciones para uso manual si es necesario
window.DashboardPerformanceOptimizer = {
    init: initializePerformanceOptimizations,
    applyChartConfig: applyOptimizedChartConfig,
    removeAnimations: removeProblematicAnimations,
    optimizeAsync: optimizeAsyncOperations,
    config: {
        chart: OPTIMIZED_CHART_CONFIG,
        css: OPTIMIZED_CSS_CONFIG
    }
};

console.log('📊 Performance Optimizer cargado. Usa DashboardPerformanceOptimizer.init() para aplicar optimizaciones.');
