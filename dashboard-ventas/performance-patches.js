/**
 * 🔧 PARCHES ESPECÍFICOS PARA OPTIMIZACIÓN DE RENDIMIENTO
 * 
 * Este archivo contiene parches específicos para problemas identificados
 * en complete_sales_dashboard.js que están causando lentitud.
 */

// =============================================
// 🎯 PARCHE 1: ELIMINAR SETTIMEOUT PROBLEMÁTICOS
// =============================================

/**
 * Reemplazar setTimeout problemáticos con ejecución inmediata controlada
 */
function patchProblematicTimeouts() {
    console.log('🔧 Aplicando parches para setTimeout problemáticos...');
    
    // Sobrescribir setTimeout para evitar retrasos innecesarios en el dashboard
    const originalSetTimeout = window.setTimeout;
    
    window.setTimeout = function(callback, delay) {
        // Lista de patrones de setTimeout que deben ejecutarse inmediatamente
        const immediatePatterns = [
            'updateSalesChart',
            'updateHourlyCharts', 
            'mejorarVisualizacionEjeXContinuo',
            'dashboardData &&',
            'rango_horario_inteligente'
        ];
        
        const callbackString = callback.toString();
        const shouldExecuteImmediately = immediatePatterns.some(pattern => 
            callbackString.includes(pattern)
        );
        
        if (shouldExecuteImmediately && delay <= 100) {
            // Ejecutar inmediatamente las operaciones críticas del dashboard
            console.log('⚡ Ejecutando callback inmediatamente (optimización)');
            return originalSetTimeout(callback, 0);
        }
        
        // Para delays largos, reducir a máximo 50ms
        const optimizedDelay = Math.min(delay, 50);
        return originalSetTimeout(callback, optimizedDelay);
    };
}

// =============================================
// 🎯 PARCHE 2: OPTIMIZAR SISTEMA DE DETECCIÓN DE INTERACCIÓN
// =============================================

/**
 * Parche para el sistema problemático de detección de interacción en líneas 8115-8137
 */
function patchInteractionSystem() {
    console.log('🔧 Aplicando parche para sistema de detección de interacción...');
    
    let userInteracting = false;
    let interactionTimeout;
    
    // Configuración más eficiente
    const INTERACTION_DELAY = 100; // Reducido de 500ms
    const OPTIMIZED_ANIMATION_CONFIG = {
        duration: 100,  // Reducido de 300ms
        easing: 'linear'  // Más eficiente que easeOutCubic
    };
    
    // Reemplazar el listener problemático con una versión optimizada
    function setupOptimizedInteractionDetection() {
        // Remover listeners existentes
        document.removeEventListener('mousemove', arguments.callee);
        
        // Crear listener optimizado con throttling
        let lastInteractionTime = 0;
        const THROTTLE_INTERVAL = 50; // Solo procesar cada 50ms
        
        document.addEventListener('mousemove', function(e) {
            const now = Date.now();
            
            // Throttling para evitar exceso de eventos
            if (now - lastInteractionTime < THROTTLE_INTERVAL) {
                return;
            }
            lastInteractionTime = now;
            
            if (!userInteracting) {
                userInteracting = true;
                // NO desactivar completamente las animaciones, solo reducirlas
                Chart.defaults.animation = {
                    duration: 50,
                    easing: 'linear'
                };
            }
            
            clearTimeout(interactionTimeout);
            interactionTimeout = setTimeout(() => {
                userInteracting = false;
                // Restaurar animaciones optimizadas
                Chart.defaults.animation = OPTIMIZED_ANIMATION_CONFIG;
            }, INTERACTION_DELAY);
        });
    }
    
    setupOptimizedInteractionDetection();
}

// =============================================
// 🎯 PARCHE 3: OPTIMIZAR REQUESTANIMATIONFRAME
// =============================================

/**
 * Parche para optimizar el uso de requestAnimationFrame en updateActiveRangeButton
 */
function patchRequestAnimationFrame() {
    console.log('🔧 Aplicando parche para requestAnimationFrame...');
    
    // Queue para agrupar operaciones DOM
    let domOperationQueue = [];
    let isProcessingQueue = false;
    
    window.optimizedRequestAnimationFrame = function(callback) {
        domOperationQueue.push(callback);
        
        if (!isProcessingQueue) {
            isProcessingQueue = true;
            
            requestAnimationFrame(() => {
                // Procesar todas las operaciones DOM en lote
                const operations = [...domOperationQueue];
                domOperationQueue = [];
                
                operations.forEach(operation => {
                    try {
                        operation();
                    } catch (error) {
                        console.warn('Error en operación DOM:', error);
                    }
                });
                
                isProcessingQueue = false;
            });
        }
    };
    
    // Reemplazar el requestAnimationFrame problemático en updateActiveRangeButton
    if (window.updateActiveRangeButton) {
        const originalUpdateActiveRangeButton = window.updateActiveRangeButton;
        
        window.updateActiveRangeButton = function(activeRange) {
            const now = Date.now();
            
            // Cache de elementos DOM mejorado
            if (!window.DOM_CACHE) {
                window.DOM_CACHE = {
                    rangeButtons: null,
                    lastActiveButton: null,
                    cacheTime: 0,
                    CACHE_DURATION: 10000 // Aumentado a 10 segundos
                };
            }
            
            const cache = window.DOM_CACHE;
            
            // Actualizar cache si es necesario
            if (!cache.rangeButtons || (now - cache.cacheTime) > cache.CACHE_DURATION) {
                cache.rangeButtons = document.querySelectorAll('.range-btn');
                cache.cacheTime = now;
            }
            
            const activeBtn = document.querySelector(`[data-range="${activeRange}"]`);
            
            // Optimización: solo cambiar si es diferente
            if (cache.lastActiveButton === activeBtn) {
                return;
            }
            
            // Usar la versión optimizada de requestAnimationFrame
            window.optimizedRequestAnimationFrame(() => {
                if (cache.lastActiveButton) {
                    cache.lastActiveButton.classList.remove('active');
                }
                
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    cache.lastActiveButton = activeBtn;
                }
            });
        };
    }
}

// =============================================
// 🎯 PARCHE 4: OPTIMIZAR CONFIGURACIONES DE CHART.JS
// =============================================

/**
 * Parche para optimizar todas las configuraciones de Chart.js existentes
 */
function patchChartJSConfigurations() {
    console.log('🔧 Aplicando parches para configuraciones de Chart.js...');
    
    // Configuración base optimizada
    const OPTIMIZED_BASE_CONFIG = {
        animation: {
            duration: 100,
            easing: 'linear'
        },
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'nearest'
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 0
            },
            line: {
                tension: 0
            }
        }
    };
    
    // Interceptar la creación de nuevos gráficos para aplicar optimizaciones
    const originalChartConstructor = Chart;
    
    window.Chart = function(ctx, config) {
        // Aplicar configuración optimizada
        if (config && config.options) {
            // Sobrescribir animaciones
            config.options.animation = OPTIMIZED_BASE_CONFIG.animation;
            config.options.interaction = OPTIMIZED_BASE_CONFIG.interaction;
            config.options.elements = OPTIMIZED_BASE_CONFIG.elements;
            
            // Optimizar escalas si existen
            if (config.options.scales) {
                Object.keys(config.options.scales).forEach(scaleKey => {
                    if (config.options.scales[scaleKey]) {
                        config.options.scales[scaleKey].animation = { duration: 0 };
                    }
                });
            }
        }
        
        return new originalChartConstructor(ctx, config);
    };
    
    // Copiar propiedades estáticas
    Object.setPrototypeOf(window.Chart, originalChartConstructor);
    Object.assign(window.Chart, originalChartConstructor);
}

// =============================================
// 🎯 PARCHE 5: OPTIMIZAR CARGA DE WEATHER ICONS
// =============================================

/**
 * Parche para el plugin weatherIconsWeek que causa redibujados excesivos
 */
function patchWeatherIconsPlugin() {
    console.log('🔧 Aplicando parche para weather icons plugin...');
    
    // Mejorar el throttling del plugin weatherIconsWeek
    if (window.weatherIconsWeekPlugin) {
        const originalAfterDraw = window.weatherIconsWeekPlugin.afterDraw;
        
        window.weatherIconsWeekPlugin.afterDraw = function(chart, args, options) {
            // Throttling más agresivo
            const now = Date.now();
            if (!this.lastDrawTime) this.lastDrawTime = 0;
            
            const DRAW_COOLDOWN = 200; // Aumentado de 1000ms a 200ms pero más estricto
            
            if (now - this.lastDrawTime < DRAW_COOLDOWN) {
                return; // Salir inmediatamente
            }
            
            this.lastDrawTime = now;
            
            // Llamar a la función original solo si realmente hay datos
            const weatherData = options.weatherData;
            if (weatherData && Array.isArray(weatherData) && weatherData.length > 0) {
                return originalAfterDraw.call(this, chart, args, options);
            }
        };
    }
}

// =============================================
// 🚀 APLICAR TODOS LOS PARCHES
// =============================================

/**
 * Función principal para aplicar todos los parches
 */
function applyAllPerformancePatches() {
    console.log('🚀 Aplicando todos los parches de rendimiento...');
    
    try {
        patchProblematicTimeouts();
        patchInteractionSystem();
        patchRequestAnimationFrame();
        patchChartJSConfigurations();
        patchWeatherIconsPlugin();
        
        console.log('✅ Todos los parches de rendimiento aplicados exitosamente');
        
        // Mostrar métricas de optimización
        const optimizationSummary = {
            'setTimeout optimizados': '✅',
            'Sistema de interacción mejorado': '✅',
            'requestAnimationFrame optimizado': '✅',
            'Chart.js configuraciones mejoradas': '✅',
            'Weather icons optimizados': '✅'
        };
        
        console.table(optimizationSummary);
        
    } catch (error) {
        console.error('❌ Error aplicando parches:', error);
    }
}

// =============================================
// 🎯 AUTO-APLICACIÓN DE PARCHES
// =============================================

// Aplicar parches cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllPerformancePatches);
} else {
    // Aplicar inmediatamente si el DOM ya está listo
    applyAllPerformancePatches();
}

// Exportar para uso manual
window.PerformancePatches = {
    applyAll: applyAllPerformancePatches,
    timeout: patchProblematicTimeouts,
    interaction: patchInteractionSystem,
    requestAnimationFrame: patchRequestAnimationFrame,
    chartJS: patchChartJSConfigurations,
    weatherIcons: patchWeatherIconsPlugin
};

console.log('🔧 Performance Patches cargado. Los parches se aplicarán automáticamente.');
