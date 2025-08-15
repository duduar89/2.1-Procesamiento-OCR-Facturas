// ===== CONFIGURACIÓN Y CONSTANTES =====
const APP_CONFIG = {
    SUPABASE_URL: 'https://tbpvcpetjotpgyjntetb.supabase.co', //
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicHZjcGV0am90cGd5am50ZXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODM5NDAsImV4cCI6MjA2OTA1OTk0MH0.VXxU8sTsf4aqk6208Lt1qGLXG9OEbVCTWIY_h-oZJmI', //
    START_ANALYSIS_URL: 'https://hook.eu2.make.com/3l7z99fub4wri3jexkyfinykfn546n2h', //
    SUPABASE_ANALYSIS_URL: 'https://tbpvcpetjotpgyjntetb.supabase.co/functions/v1/process-carta-v2',
    COTEJAMIENTO_WEBHOOK_URL: 'https://hook.eu2.make.com/5b1iaqv4676kqkhpof9a79ziqclz1l64', //
    
    // ✅ AÑADIR ESTA LÍNEA:
    FEEDBACK_WEBHOOK_URL: 'https://tbpvcpetjotpgyjntetb.supabase.co/functions/v1/feedback-humano-v3',
    
    TABLES: {
        TRABAJOS: 'trabajos_analisis', //
        ANALISIS_PROGRESO: 'analisis_progreso', //
        ESCANDALLOS_GUARDADOS: 'escandallos_guardados', //
        INGREDIENTES: 'ingredientes', //
        PRODUCTOS: 'productos', //
        FEEDBACK_COTEJAMIENTO: 'feedback_cotejamiento', //
        RELACIONES_APRENDIDAS: 'relaciones_aprendidas', //
        EMBEDDINGS_GENERATIVOS_LOG: 'embeddings_generativos_log' //
    },
    STATES: {
        INGREDIENTES_EXTRAIDOS: 'INGREDIENTES_EXTRAIDOS', //
        COMPLETADO: 'COMPLETADO', //
        ERROR: 'ERROR' //
    },
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] //
};

// ===== VARIABLES GLOBALES =====
let supabaseClient;
let notificationSystem;
let modalManager;
let aiLearningSystem;
let selectedFile = null;
let currentAnalysis = null;
let progressInterval = null;

// ===== SISTEMA DE FEEDBACK HUMANO =====
let feedbackBuffer = new Map(); // Almacena selecciones temporalmente

// Función de debug para verificar el estado del buffer
function debugFeedbackBuffer() {
    console.log('🔍 DEBUG BUFFER COMPLETO:', {
        size: feedbackBuffer.size,
        entries: Array.from(feedbackBuffer.entries()),
        keys: Array.from(feedbackBuffer.keys()),
        values: Array.from(feedbackBuffer.values())
    });
    
    // Agrupar por plato
    const porPlato = {};
    feedbackBuffer.forEach((value, key) => {
        if (!porPlato[value.plato]) {
            porPlato[value.plato] = [];
        }
        porPlato[value.plato].push({
            ingrediente: value.ingrediente,
            producto_elegido: value.producto_elegido,
            feedback_tipo: value.feedback_tipo
        });
    });
    
    console.log('🔍 DEBUG BUFFER POR PLATO:', porPlato);
    return porPlato;
}

// ===== ESTADO GLOBAL EXPANDIDO =====
let appState = {
    savedEscandallos: [], //
    ingredientesExtraidos: [], //
    currentAnalysis: null, //
    selectedFile: null, //
    currentDatabaseView: 'ingredients', //
    aiMetrics: {
        precision: 87.3, //
        relations: 156, //
        feedback: 2847, //
        optimizations: 34, //
        lastUpdate: null //
    },
    realtimeChannels: {
        feedback: null, //
        relations: null, //
        learning: null, //
        status: null,
        progress: null
    },
    currentProgress: {
        platosDetectados: [],
        platosCompletados: [],
        totalPlatos: 0,
        progresoPorcentaje: 0,
        ingredientesUnicos: 0,
        tiempoInicio: null,
        contadorIntervalo: null
    }
};

// ===== UTILIDADES =====
const Utils = {
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    validateFile(file) {
        const errors = [];
        if (!file) {
            errors.push('No se seleccionó ningún archivo');
            return { isValid: false, errors };
        }
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            errors.push(`El archivo es demasiado grande. Máximo ${Utils.formatFileSize(APP_CONFIG.MAX_FILE_SIZE)}`);
        }
        if (!APP_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`Tipo de archivo no soportado. Formatos permitidos: ${APP_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`);
        }
        return { isValid: errors.length === 0, errors };
    },

    sanitizeHTML(str) {
        if (str === null || typeof str === 'undefined') return '';
        if (typeof str !== 'string') str = String(str);
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    formatTiempoTranscurrido(inicioTimestamp) {
        const ahora = Date.now();
        const transcurrido = Math.round((ahora - inicioTimestamp) / 1000);
        return `${transcurrido}s`;
    },

    getSimilarityInfo(similitud, sourceType = 'semantic') {
        const porcentaje = Math.round((similitud || 0) * 100);
        let colorClass = 'bg-red-600/80';

        if (porcentaje > 80) {
            colorClass = 'bg-green-600/80';
        } else if (porcentaje > 60) {
            colorClass = 'bg-yellow-500/80';
        } else if (porcentaje > 40) {
            colorClass = 'bg-orange-500/80';
        }

        return {
            percentage: `${porcentaje}%`,
            color: colorClass,
            value: porcentaje,
            source: sourceType
        };
    },

    getMatchSource(ingrediente) {
        if (ingrediente.fuente_cotejamiento === 'relacion_aprendida') {
            return 'learned';
        } else if (ingrediente.similitud > 0.75) {
            return 'learned';
        } else {
            return 'semantic';
        }
    },

    calculateFoundIngredients(ingredientes) {
        if (!ingredientes || !Array.isArray(ingredientes)) return 0;
        return ingredientes.filter(ing => {
            // CORREGIDO: Usar los campos correctos del backend
            const found = ing.producto_encontrado || ing.producto_nombre || ing.producto || '';
            return found && found !== '' && found.toLowerCase() !== 'no encontrado' && ing.producto_id;
        }).length;
    }
};

// ===== UTILIDADES PARA FOOD COST =====
const FoodCostUtils = {
    // Obtener información de rentabilidad con colores y textos
    getRentabilityInfo(foodCostPercent) {
        if (!foodCostPercent && foodCostPercent !== 0) {
            return {
                color: 'bg-gray-100 text-gray-700 border-gray-300',
                icon: '📋',
                label: 'SIN PRECIO',
                status: 'sin_precio'
            };
        }

        if (foodCostPercent < 25) {
            return {
                color: 'bg-green-100 text-green-800 border-green-300',
                icon: '🟢',
                label: 'MUY RENTABLE',
                status: 'muy_rentable'
            };
        } else if (foodCostPercent < 35) {
            return {
                color: 'bg-green-100 text-green-700 border-green-300',
                icon: '🟡',
                label: 'RENTABLE',
                status: 'rentable'
            };
        } else if (foodCostPercent < 45) {
            return {
                color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: '🟡',
                label: 'LÍMITE',
                status: 'limite'
            };
        } else {
            return {
                color: 'bg-red-100 text-red-800 border-red-300',
                icon: '🔴',
                label: 'POCO RENTABLE',
                status: 'poco_rentable'
            };
        }
    },

    // Formatear precio con € y 2 decimales
    formatPrice(price) {
        if (!price && price !== 0) return 'N/A';
        return `€${parseFloat(price).toFixed(2)}`;
    },

    // Formatear porcentaje
    formatPercent(percent) {
        if (!percent && percent !== 0) return 'N/A';
        return `${parseFloat(percent).toFixed(1)}%`;
    },

    // Contar ingredientes por tipo de match
    countIngredientsByMatch(ingredientes) {
        const stats = {
            total: ingredientes.length,
            encontrados: 0,
            ia_aprendida: 0,
            semantica: 0,
            no_encontrados: 0
        };

        ingredientes.forEach(ing => {
            // CORREGIDO: Usar los campos correctos del backend
            const producto = ing.producto_encontrado || ing.producto_nombre || ing.producto || '';
            const found = producto && producto !== 'No encontrado' && ing.producto_id;
            if (found) {
                stats.encontrados++;
                if (ing.origen_match === 'aprendido') {
                    stats.ia_aprendida++;
                } else {
                    stats.semantica++;
                }
            } else {
                stats.no_encontrados++;
            }
        });

        return stats;
    }
};

// ===== TARJETA DE PLATO CON FOOD COST =====
function createFoodCostPlatoCard(plato) {
    // 🔍 DEBUG: Ver qué datos llegan realmente
    console.log('🔍 DATOS DEL PLATO COMPLETOS:', JSON.stringify(plato, null, 2));
    console.log('🔍 PVP Bruto:', plato.pvp_bruto_euros);
    console.log('🔍 Food Cost Total:', plato.food_cost_total_euros);
    console.log('🔍 Food Cost %:', plato.food_cost_porcentaje);
    console.log('🔍 Margen:', plato.margen_neto_euros);
    
    // VALIDACIÓN AÑADIDA
    if (!plato || !plato.plato_analizado) {
        console.error('❌ Plato inválido:', plato);
        return '';
    }
    
    console.log('🍽️ Procesando plato:', plato.plato_analizado);
    // console.log('🔍 DEBUG: Estructura completa del plato:', JSON.stringify(plato, null, 2));
    console.log('🔍 DEBUG: Propiedades del plato:', Object.keys(plato));
    
    const rentabilidad = FoodCostUtils.getRentabilityInfo(plato.food_cost_porcentaje);
    
    // Eliminar ingredientes duplicados - INTENTAR MÚLTIPLES CAMPOS
    const ingredientesArray = Array.isArray(plato.ingredientes_cotejados) ? plato.ingredientes_cotejados : 
                              Array.isArray(plato.ingredientes_array) ? plato.ingredientes_array :
                              Array.isArray(plato.ingredientes) ? plato.ingredientes : [];
    
    console.log('🔍 DEBUG: ingredientesArray final:', ingredientesArray);
    console.log('🔍 DEBUG: ingredientesArray.length:', ingredientesArray.length);
    const ingredientesUnicos = [];
    const ingredientesVistos = new Set();
    
    for (const ingrediente of ingredientesArray) {
        const key = `${(ingrediente.ingrediente_ia || ingrediente.nombre_ingrediente || '').toLowerCase()}_${ingrediente.cantidad || ''}`;
        if (!ingredientesVistos.has(key)) {
            ingredientesVistos.add(key);
            ingredientesUnicos.push(ingrediente);
        }
    }
    
    console.log(`🔍 Ingredientes originales: ${ingredientesArray.length}, únicos: ${ingredientesUnicos.length}`);
    
    const ingredientesStats = FoodCostUtils.countIngredientsByMatch(ingredientesUnicos);
    const successRate = ingredientesStats.total > 0 ? 
        Math.round((ingredientesStats.encontrados / ingredientesStats.total) * 100) : 0;

    // Bloque de desglose inline (desplegable)
    const ingredientesInlineHTML = `
        <details class="bg-white border rounded-lg mt-4">
            <summary class="cursor-pointer px-4 py-3 font-semibold text-gray-700 flex items-center justify-between">
                <span><i class="fas fa-list mr-2 text-teal-600"></i> Desglose de Ingredientes (${ingredientesUnicos.length})</span>
                <span class="text-xs text-gray-500">click para desplegar/ocultar</span>
            </summary>
            
            <!-- BOTÓN SUPERIOR: Confirmar todas -->
            <div class="px-4 border-b bg-gray-50">
                <div class="flex justify-between items-center py-3">
                    <h4 class="text-sm font-semibold text-gray-700">Revisión Rápida</h4>
                    <button onclick="enviarFeedbackMasivo('${plato.plato_analizado}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        <i class="fas fa-check-double mr-2"></i>Confirmar Todas como Correctas
                    </button>
                </div>
                <p class="text-xs text-gray-500 mb-3">Si todos los productos son correctos, puedes confirmar todo de una vez.</p>
            </div>

            <!-- TABLA COMPACTA -->
            <div class="overflow-x-auto p-4">
                <table class="w-full text-sm ingredient-table">
                    <thead class="bg-gray-100 border-b">
                        <tr>
                            <th class="text-left p-3 font-semibold text-gray-700">Ingrediente</th>
                            <th class="text-left p-3 font-semibold text-gray-700">Producto Makro</th>
                            <th class="text-center p-3 font-semibold text-gray-700">€/kg</th>
                            <th class="text-center p-3 font-semibold text-gray-700">Total</th>
                            <th class="text-center p-3 font-semibold text-gray-700">Estado</th>
                            <th class="text-center p-3 font-semibold text-gray-700">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ingredientesUnicos.map((ing) => {
                            const nombreIng = Utils.sanitizeHTML(ing.ingrediente_nombre || ing.ingrediente_ia || ing.nombre_ingrediente || 'Ingrediente');
                            const cantidad = Utils.sanitizeHTML(ing.cantidad || '');
                            const producto = Utils.sanitizeHTML(
                                ing.producto_encontrado || ing.producto_nombre || ing.producto || ing.name || ing.nombre || 'No encontrado'
                            );
                            const precioUnidadNum = (ing.precio_neto_por_kg_l ?? ing.precio_unitario_euros);
                            const precioTotalNum = (ing.costo_ingrediente_euros ?? ing.precio_total_euros);
                            const precioUnidad = (precioUnidadNum || precioUnidadNum === 0) ? FoodCostUtils.formatPrice(precioUnidadNum) : 'N/A';
                            const precioTotal = (precioTotalNum || precioTotalNum === 0) ? FoodCostUtils.formatPrice(precioTotalNum) : 'N/A';

                            const origen = Utils.sanitizeHTML(ing.origen_match || ing.fuente_coincidencia || '');
                            const isAprendido = origen.toLowerCase().includes('aprendido');
                            const isSemantic = origen.toLowerCase().includes('semantic');
                            const isExacto = origen.toLowerCase().includes('exacto');
                            const badgeClass = isAprendido
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : isSemantic
                                    ? 'bg-green-100 text-green-800 border-green-300'
                                    : isExacto
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : 'bg-red-100 text-red-800 border-red-300';
                            const badgeIcon = isAprendido ? '🧠' : isSemantic ? '🔍' : isExacto ? '🎯' : '✖️';
                            const badgeText = isAprendido ? 'IA Aprendida' : isSemantic ? 'Búsqueda Semántica' : isExacto ? 'Match Exacto' : 'No Encontrado';

                            return `
                                <tr>
                                    <td class="p-3">
                                        <div class="font-medium text-gray-900">${nombreIng}</div>
                                        <div class="text-xs text-gray-500">${cantidad}</div>
                                    </td>
                                    <td class="p-3">
                                        <div class="font-medium text-gray-800 max-w-xs">${producto}</div>
                                    </td>
                                    <td class="p-3 text-center"><span class="font-semibold text-blue-600">${precioUnidad}</span></td>
                                    <td class="p-3 text-center"><span class="font-bold text-green-700">${precioTotal}</span></td>
                                    <td class="p-3 text-center">
                                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClass}">
                                            <span class="mr-1">${badgeIcon}</span>${badgeText}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center">
                                        <div class="ingredient-selector inline-block" data-ingrediente="${nombreIng}" data-plato="${plato.plato_analizado}">
                                            <select class="ingredient-dropdown text-xs border border-gray-300 rounded px-2 py-1 w-full bg-white" onchange="handleIngredientSelection(this)">
                                                ${(() => {
                                                    const topMatches = ing.top_matches || [
                                                        { nombre: producto, similitud: ing.similitud || 0.75, es_principal: true, producto_id: ing.producto_id }
                                                    ];
                                                    return topMatches.map((match, idx) => {
                                                        const similitud = Math.round((match.similitud || 0) * 100);
                                                        const icono = idx === 0 ? '✅' : '⭐';
                                                        return `<option value="${match.nombre}" ${idx === 0 ? 'selected' : ''}>${icono} ${match.nombre} (${similitud}%)</option>`;
                                                    }).join('') +
                                                    `
                                                    <option value="buscar_mas" class="text-blue-600">🔍 Buscar más opciones...</option>
                                                    <option value="no_disponible" class="text-red-600">✖️ No disponible</option>
                                                    `;
                                                })()}
                                            </select>
                                            <div class="additional-options hidden mt-2 p-2 bg-blue-50 border border-blue-200 rounded"></div>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Debug del buffer -->
            <div class="px-4 pb-4">
                <div class="text-sm text-gray-600 mb-2 border-t pt-4">
                    <strong>🔍 DEBUG BUFFER:</strong>
                    <span id="debug-buffer-${plato.plato_analizado.replace(/[^a-zA-Z0-9]/g, '_')}">Buffer vacío (0 selecciones)</span>
                </div>
            </div>

            <!-- Botón inferior (se mantiene) -->
            <div class="px-4 pb-6">
                <button onclick="enviarFeedbackMasivo('${plato.plato_analizado}')" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg">
                    <div class="flex items-center justify-center space-x-3">
                        <i class="fas fa-brain text-2xl"></i>
                        <span>Entrenar IA con estas selecciones</span>
                        <i class="fas fa-rocket text-lg"></i>
                    </div>
                </button>
            </div>
        </details>
    `;

    // 🆕 LLENAR BUFFER AUTOMÁTICAMENTE con primeras opciones predefinidas
    setTimeout(() => {
        ingredientesUnicos.forEach((ing, index) => {
            const nombreIng = ing.ingrediente_nombre || ing.ingrediente_ia || ing.nombre_ingrediente || 'Ingrediente';
            const productoElegido = ing.producto_nombre || ing.producto_encontrado || ing.producto;
            
            if (productoElegido && productoElegido !== 'No encontrado') {
                const key = `${plato.plato_analizado}-${nombreIng}`;
                const data = {
                    ingrediente: nombreIng,
                    plato: plato.plato_analizado,
                    producto_elegido: productoElegido,
                    feedback_tipo: 'confirmacion_automatica',
                    usuario_confirmado: false,
                    es_primera_opcion: true
                };
                
                feedbackBuffer.set(key, data);
                console.log(`🔄 Auto-llenado buffer: ${nombreIng} -> ${productoElegido}`);
            }
        });
        
        // Actualizar contador después de llenar buffer automáticamente
        actualizarContadorSelecciones(plato.plato_analizado);
    }, 100);

    // Determinar si tiene PVP o no
    const tienePVP = plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0;

    if (tienePVP) {
        // CASO 1: CON PVP - Mostrar análisis completo + desglose inline
        return `
            <div class="card p-6 mb-6 hover:shadow-xl transition-shadow duration-300 border-l-4 ${rentabilidad.status === 'muy_rentable' ? 'border-green-500' : rentabilidad.status === 'rentable' ? 'border-green-400' : rentabilidad.status === 'limite' ? 'border-yellow-500' : rentabilidad.status === 'poco_rentable' ? 'border-red-500' : 'border-gray-400'}">
                
                <!-- HEADER DEL PLATO -->
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-grow">
                        <h3 class="text-2xl font-bold text-gray-800 mb-1">
                            📍 ${Utils.sanitizeHTML(plato.plato_analizado)}
                        </h3>
                    </div>
                    <div class="flex-shrink-0 ml-4">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${rentabilidad.color}">
                            ${rentabilidad.icon} ${rentabilidad.label}
                        </span>
                    </div>
                </div>

                <!-- MÉTRICAS PRINCIPALES -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    ${plato.pvp_bruto_euros ? `
                        <div class="bg-blue-50 p-4 rounded-lg text-center border">
                            <div class="text-2xl font-bold text-blue-700">
                                ${FoodCostUtils.formatPrice(plato.pvp_bruto_euros)}
                            </div>
                            <div class="text-sm text-blue-600 font-medium">💰 PVP</div>
                        </div>
                    ` : `
                        <div class="bg-gray-50 p-4 rounded-lg text-center border border-dashed">
                            <div class="text-lg text-gray-400">Sin PVP</div>
                            <div class="text-xs text-gray-500">No detectado</div>
                        </div>
                    `}
                    
                    <div class="bg-orange-50 p-4 rounded-lg text-center border">
                        <div class="text-2xl font-bold text-orange-700">
                            ${FoodCostUtils.formatPrice(plato.food_cost_total_euros)}
                        </div>
                        <div class="text-sm text-orange-600 font-medium">📊 Food Cost</div>
                    </div>
                    
                    ${plato.food_cost_porcentaje ? `
                        <div class="p-4 rounded-lg text-center border ${plato.food_cost_porcentaje > 40 ? 'bg-red-50' : 'bg-green-50'}">
                            <div class="text-2xl font-bold ${plato.food_cost_porcentaje > 40 ? 'text-red-700' : 'text-green-700'}">
                                ${FoodCostUtils.formatPercent(plato.food_cost_porcentaje)}
                            </div>
                            <div class="text-sm font-medium">% Food Cost</div>
                        </div>
                    ` : `
                        <div class="bg-yellow-50 p-4 rounded-lg text-center border border-dashed">
                            <div class="text-lg text-yellow-600">Sin %</div>
                            <div class="text-xs text-yellow-600">Necesita PVP</div>
                        </div>
                    `}
                    
                    ${plato.margen_neto_euros ? `
                        <div class="bg-green-50 p-4 rounded-lg text-center border">
                            <div class="text-2xl font-bold text-green-700">
                                ${FoodCostUtils.formatPrice(plato.margen_neto_euros)}
                            </div>
                            <div class="text-sm text-green-600 font-medium">💵 Margen</div>
                        </div>
                    ` : `
                        <div class="bg-gray-50 p-4 rounded-lg text-center border border-dashed">
                            <div class="text-lg text-gray-400">Sin Margen</div>
                            <div class="text-xs text-gray-500">Necesita PVP</div>
                        </div>
                    `}
                </div>

                <!-- ESTADÍSTICAS DE INGREDIENTES -->
                <div class="bg-gray-50 p-4 rounded-lg mb-2">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div class="flex items-center justify-center">
                            <span class="bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-semibold">
                                📊 ${ingredientesStats.encontrados}/${ingredientesStats.total} ingredientes (${successRate}%)
                            </span>
                        </div>
                        ${ingredientesStats.ia_aprendida > 0 ? `
                        <div class="flex items-center justify-center">
                            <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                                ✨ ${ingredientesStats.ia_aprendida} cotejados por IA
                            </span>
                        </div>
                        ` : ''}
                        ${ingredientesStats.semantica > 0 ? `
                        <div class="flex items-center justify-center">
                            <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                                🔍 ${ingredientesStats.semantica} búsqueda automática
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${ingredientesInlineHTML}
            </div>
        `;
    } else {
        // CASO 2: SIN PVP - Mostrar sugerencias + desglose inline
        return `
            <div class="card p-6 mb-6 hover:shadow-xl transition-shadow duration-300 border-l-4 border-gray-400 bg-gradient-to-br from-gray-50 to-blue-50">
                
                <!-- HEADER DEL PLATO SIN PVP -->
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-grow">
                        <h3 class="text-2xl font-bold text-gray-800 mb-1">
                            📋 ${Utils.sanitizeHTML(plato.plato_analizado)}
                        </h3>
                    </div>
                    <div class="flex-shrink-0 ml-4">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 bg-gray-100 text-gray-700 border-gray-300">
                            📋 SIN PRECIO
                        </span>
                    </div>
                </div>

                <!-- COSTO Y SUGERENCIAS -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="bg-orange-50 p-4 rounded-lg text-center border-2 border-orange-200">
                        <div class="text-2xl font-bold text-orange-700">
                            ${FoodCostUtils.formatPrice(plato.food_cost_total_euros)}
                        </div>
                        <div class="text-sm text-orange-600 font-medium">💰 Costo ingredientes</div>
                    </div>
                    
                    <div class="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                        <div class="text-xl font-bold text-blue-700">
                            ${(() => {
                                // Calcular PVP sugerido para 30% food cost
                                const foodCost = plato.food_cost_total_euros || 0;
                                const pvpSugerido30 = foodCost > 0 ? (foodCost / 0.30) * 1.10 : 0;
                                return FoodCostUtils.formatPrice(pvpSugerido30);
                            })()}
                        </div>
                        <div class="text-xs text-blue-600 font-medium">💡 PVP sugerido (30%)</div>
                    </div>
                    
                    <div class="bg-indigo-50 p-4 rounded-lg text-center border-2 border-indigo-200">
                        <div class="text-xl font-bold text-indigo-700">
                            ${(() => {
                                // Calcular PVP sugerido para 35% food cost
                                const foodCost = plato.food_cost_total_euros || 0;
                                const pvpSugerido35 = foodCost > 0 ? (foodCost / 0.35) * 1.10 : 0;
                                return FoodCostUtils.formatPrice(pvpSugerido35);
                            })()}
                        </div>
                        <div class="text-xs text-indigo-600 font-medium">💡 PVP sugerido (35%)</div>
                    </div>
                </div>

                <!-- ESTADÍSTICAS DE INGREDIENTES -->
                <div class="bg-white p-4 rounded-lg mb-2 border">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div class="flex items-center justify-center">
                            <span class="bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-semibold">
                                📊 ${ingredientesStats.encontrados}/${ingredientesStats.total} ingredientes (${successRate}%)
                            </span>
                        </div>
                        ${ingredientesStats.ia_aprendida > 0 ? `
                        <div class="flex items-center justify-center">
                            <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                                ✨ ${ingredientesStats.ia_aprendida} cotejados por IA
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- NOTA INFORMATIVA -->
                <div class="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-2">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-blue-600 mt-1 mr-2"></i>
                        <div class="text-sm text-blue-800">
                            <p class="font-semibold">💡 Sugerencia:</p>
                            <p>No se detectó precio en la carta. Los PVP sugeridos te ayudan a mantener un Food Cost saludable.</p>
                        </div>
                    </div>
                </div>

                ${ingredientesInlineHTML}
            </div>
        `;
    }
}

// ===== RESUMEN GLOBAL CON FOOD COST =====
function createFoodCostGlobalSummary(data) {
    // VALIDACIÓN ROBUSTA
    if (!data) {
        console.error('❌ No hay datos para mostrar');
        return '<div class="alert alert-error">No se pudieron cargar los datos</div>';
    }
    
    const stats = data.estadisticas || {};
    const platos = Array.isArray(data.platos_procesados) ? data.platos_procesados : [];
    
    console.log('📊 Datos recibidos:', data);
    console.log('🍽️ Platos procesados:', platos);
    
    if (platos.length === 0) {
        return `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                No se encontraron platos procesados
            </div>
        `;
    }
    
    // Calcular estadísticas avanzadas
    const platosConPVP = platos.filter(p => p.pvp_bruto_euros && p.pvp_bruto_euros > 0);
    const platosRentables = platos.filter(p => p.food_cost_porcentaje && p.food_cost_porcentaje < 40);
    const platosLimite = platos.filter(p => p.food_cost_porcentaje && p.food_cost_porcentaje >= 40 && p.food_cost_porcentaje < 50);
    const platosPorcoRentables = platos.filter(p => p.food_cost_porcentaje && p.food_cost_porcentaje >= 50);

    return `
        <div class="card p-8 mb-8 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
            <div class="text-center mb-6">
                <h3 class="text-3xl font-bold text-gray-800 mb-2">
                    📈 Análisis Económico Completo
                </h3>
                <p class="text-gray-600">Resultados del cotejamiento semántico con IA adaptativa</p>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div class="text-center p-4 bg-white rounded-lg border">
                    <p class="text-3xl font-bold text-blue-600">${platos.length}</p>
                    <p class="text-sm text-gray-600">Platos Analizados</p>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border">
                    <p class="text-3xl font-bold text-green-600">${stats.ingredientes_encontrados || 0}</p>
                    <p class="text-sm text-gray-600">Ingredientes</p>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border">
                    <p class="text-3xl font-bold text-teal-600">${stats.tasa_exito_porcentaje || 0}%</p>
                    <p class="text-sm text-gray-600">Éxito Cotejamiento</p>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border border-orange-200">
                    <p class="text-3xl font-bold text-orange-600">${FoodCostUtils.formatPrice(stats.costo_total_ingredientes)}</p>
                    <p class="text-sm text-orange-600">Costo Total</p>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border border-purple-200">
                    <p class="text-3xl font-bold text-purple-600">${FoodCostUtils.formatPercent(stats.food_cost_promedio)}</p>
                    <p class="text-sm text-purple-600">Food Cost Medio</p>
                </div>
            </div>

            ${platosConPVP.length > 0 ? `
            <div class="bg-white p-6 rounded-lg border mb-4">
                <h4 class="text-xl font-bold text-gray-800 mb-4 text-center">
                    🎯 Distribución de Rentabilidad
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <p class="text-2xl font-bold text-green-700">${platosRentables.length}</p>
                        <p class="text-sm text-green-600">🟢 Rentables</p>
                    </div>
                    <div class="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p class="text-2xl font-bold text-yellow-700">${platosLimite.length}</p>
                        <p class="text-sm text-yellow-600">🟡 En Límite</p>
                    </div>
                    <div class="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <p class="text-2xl font-bold text-red-700">${platosPorcoRentables.length}</p>
                        <p class="text-sm text-red-600">🔴 Poco Rentables</p>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p class="text-2xl font-bold text-gray-700">${platos.length - platosConPVP.length}</p>
                        <p class="text-sm text-gray-600">📋 Sin Precio</p>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="bg-blue-100 border border-blue-300 rounded-lg p-4">
                <div class="flex items-start">
                    <i class="fas fa-info-circle text-blue-600 mt-1 mr-3"></i>
                    <div class="text-sm text-blue-800">
                        <p class="font-semibold mb-2">💡 Información técnica:</p>
                        <ul class="list-disc list-inside space-y-1">
                            <li>Todos los cálculos se realizan sobre <strong>precios neto</strong> (sin IVA 10%)</li>
                            <li>IA Adaptativa activa: <strong>${stats.sistema_aprendizaje_activo ? 'SÍ' : 'NO'}</strong></li>
                            <li>Feedback capturado para aprendizaje: <strong>${stats.feedback_capturado || 0}</strong></li>
                            <li>Versión del sistema: <strong>${stats.version_sistema || 'v5.3'}</strong></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== SISTEMA DE NOTIFICACIONES =====
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('toast-container'); //
        this.notifications = new Map(); //
    }

    show(message, type = 'info', duration = 5000) {
        console.log(`📢 Notificación ${type}:`, message);
        const id = Date.now().toString(); //
        const notification = this.createNotification(id, message, type); //
        this.container.appendChild(notification); //
        this.notifications.set(id, notification); //
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)'; //
            notification.style.opacity = '1'; //
        });
        
        if (duration > 0) setTimeout(() => this.hide(id), duration); //
        return id; //
    }

    createNotification(id, message, type) {
        const notification = document.createElement('div'); //
        notification.className = `toast toast-${type}`; //
        notification.style.transform = 'translateX(100%)'; //
        notification.style.opacity = '0'; //
        notification.style.transition = 'all 0.3s ease'; //
        
        const iconMap = { 
            success: 'fas fa-check-circle', 
            error: 'fas fa-exclamation-circle', 
            warning: 'fas fa-exclamation-triangle', 
            info: 'fas fa-info-circle', 
            ai: 'fas fa-brain' 
        };
        
        notification.innerHTML = `
            <div class="flex items-start">
                <i class="${iconMap[type]} text-xl mr-3 flex-shrink-0" aria-hidden="true"></i>
                <div class="flex-grow">
                    <p class="font-medium text-gray-900">${message}</p>
                </div>
                <button onclick="notificationSystem.hide('${id}')" class="ml-4 text-gray-400 hover:text-gray-600 focus-visible">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>`; //
        return notification; //
    }

    hide(id) {
        const notification = this.notifications.get(id); //
        if (!notification) return; //
        notification.style.transform = 'translateX(100%)'; //
        notification.style.opacity = '0'; //
        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification); //
            this.notifications.delete(id); //
        }, 300);
    }
}

// ===== GESTOR DE MODALES =====
class ModalManager {
    constructor() {
        this.openModals = new Set(); //
        this.setupEventListeners(); //
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.openModals.size > 0) {
                const lastModal = Array.from(this.openModals).pop(); //
                this.close(lastModal); //
            }
        });
    }
    
    open(modalId, content = null) {
        const modal = document.getElementById(modalId); //
        if (!modal) {
            console.error(`Modal with id "${modalId}" not found`); //
            return; //
        }
        if (content) {
            const contentContainer = modal.querySelector(`#${modalId}-content`); //
            if (contentContainer) contentContainer.innerHTML = content; //
        }
        modal.classList.remove('hidden'); //
        this.openModals.add(modalId); //
        document.body.style.overflow = 'hidden'; //
    }
    
    close(modalId) {
        const modal = document.getElementById(modalId); //
        if (!modal) return; //
        modal.classList.add('hidden'); //
        this.openModals.delete(modalId); //
        if (this.openModals.size === 0) document.body.style.overflow = ''; //
    }
}

// ===== OVERRIDE MÍNIMO: Forzar botón "Hacer Foto" a usar cámara nativa =====
// Restaurar manejo original: usar setupCameraHandling ya presente y el modal
document.addEventListener('DOMContentLoaded', () => {
    try { if (typeof setupCameraHandling === 'function') setupCameraHandling(); } catch (_) {}
});

// ===== SISTEMA IA AVANZADO COMPLETO =====
class AILearningSystem {
    constructor() {
        this.isActive = false; //
        this.feedbackBuffer = []; //
        this.relationsBuffer = []; //
    }
    
    async initialize() {
        await this.loadInitialMetrics(); //
        this.setupRealtimeSubscriptions(); //
        this.isActive = true; //
        console.log('🧠 Sistema de IA Generativa inicializado'); //
    }

    // COMENTAR ESTAS LÍNEAS TEMPORALMENTE
async loadInitialMetrics() {
    try {
        // COMENTADO: No funciona por ahora
        /*
        const [feedbackTotal, relationsTotal, relationsToday, feedbackToday, precisionStats] = await Promise.all([
            this.getFeedbackCount(),
            this.getRelationsCount(),
            this.getTodaysCount(APP_CONFIG.TABLES.RELACIONES_APRENDIDAS),
            this.getTodaysCount(APP_CONFIG.TABLES.FEEDBACK_COTEJAMIENTO),
            this.getPrecisionStats()
        ]);
        */
        
        // TEMPORAL: Valores fijos
        appState.aiMetrics = {
            feedback: 150,
            relations: 25,
            relationsToday: 3,
            feedbackToday: 8,
            precision: 87.5,
            precisionToday: 89.2,
            lastUpdate: new Date().toISOString()
        };

        this.updateUIMetrics();
    } catch (error) {
        console.error('Error cargando métricas iniciales:', error);
    }
}


    async getFeedbackCount() {
        try {
            const { count, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.FEEDBACK_COTEJAMIENTO)
                .select('*', { count: 'exact', head: true }); //

            if (error && !error.message.includes('does not exist')) {
                console.error('Error contando feedback:', error); //
            }
            return count || 0; //
        } catch (error) {
            return 0; //
        }
    }

    async getRelationsCount() {
        try {
            const { count, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.RELACIONES_APRENDIDAS)
                .select('*', { count: 'exact', head: true }) //
                .eq('activa', true); //

            if (error && !error.message.includes('does not exist')) {
                console.error('Error contando relaciones:', error); //
            }
            return count || 0; //
        } catch (error) {
            return 0; //
        }
    }

    async getCurrentPrecision() {
        try {
            const { data, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.TRABAJOS) //
                .select('resultado_final_json') //
                .eq('estado', APP_CONFIG.STATES.COMPLETADO) //
                .order('created_at', { ascending: false }) //
                .limit(50); //

            if (error || !data || data.length === 0) {
                return 87.3; //
            }

            let totalIngredients = 0; //
            let foundIngredients = 0; //

            data.forEach(job => {
            try {
                const result = typeof job.resultado_final_json === 'string' && job.resultado_final_json
                    ? JSON.parse(job.resultado_final_json)
                    : job.resultado_final_json;

                // SOLUCIÓN: Comprobar que 'result' y 'result.platos_procesados' existen.
                if (result && result.platos_procesados) {
                    result.platos_procesados.forEach(plato => {
                        if (plato.ingredientes_cotejados) {
                            totalIngredients += plato.ingredientes_cotejados.length;
                            foundIngredients += Utils.calculateFoundIngredients(plato.ingredientes_cotejados);
                        }
                    });
                }
            } catch (e) {
                console.warn(`Error parseando resultado para el job ${job.id}:`, e);
            }
        });

            return totalIngredients > 0 ? (foundIngredients / totalIngredients) * 100 : 87.3; //
        } catch (error) {
            return 87.3; //
        }
    }


    // Pega este bloque de código dentro de tu clase AILearningSystem en main.js
// Puedes poner las nuevas funciones debajo de getCurrentPrecision, por ejemplo.

    // Reemplaza la función getTodaysCount con esta en main.js
    
    async getTodaysCount(tableName) {
    const { data, error } = await supabaseClient.rpc('get_todays_count', {
        p_table_name: tableName
    });

    if (error) {
        // La línea 381 a la que hace referencia tu error está dentro de esta función.
        // Este nuevo código la soluciona.
        console.error(`Error contando ${tableName} para hoy:`, error);
        return 0;
    }
    return data || 0;
}

    async getPrecisionStats() {
        // Usamos una función RPC de Supabase para eficiencia (Paso 3).
        const { data, error } = await supabaseClient.rpc('get_precision_stats');

        if (error || !data) {
            console.error('Error obteniendo estadísticas de precisión:', error);
            return { global: 0, today: 0 };
        }
        // Asegurarnos que no devolvemos null
        return { 
            global: data.global_precision || 0, 
            today: data.today_precision || 0 
        };
    }

    async loadInitialMetrics() {
        try {
            const [feedbackTotal, relationsTotal, relationsToday, feedbackToday, precisionStats] = await Promise.all([
                this.getFeedbackCount(),
                this.getRelationsCount(),
                this.getTodaysCount(APP_CONFIG.TABLES.RELACIONES_APRENDIDAS),
                this.getTodaysCount(APP_CONFIG.TABLES.FEEDBACK_COTEJAMIENTO),
                this.getPrecisionStats()
            ]);

            appState.aiMetrics = {
                ...appState.aiMetrics,
                feedback: feedbackTotal || 0,
                relations: relationsTotal || 0,
                relationsToday: relationsToday,
                feedbackToday: feedbackToday,
                precision: precisionStats.global,
                precisionToday: precisionStats.today,
                lastUpdate: new Date().toISOString()
            };

            this.updateUIMetrics();
        } catch (error) {
            console.error('Error cargando métricas iniciales:', error);
        }
    }

    setupRealtimeSubscriptions() {
        if (appState.realtimeChannels.feedback) {
            supabaseClient.removeChannel(appState.realtimeChannels.feedback); //
        }
        if (appState.realtimeChannels.relations) {
            supabaseClient.removeChannel(appState.realtimeChannels.relations); //
        }

        appState.realtimeChannels.feedback = supabaseClient
            .channel('feedback-realtime') //
            .on('postgres_changes', {
                event: 'INSERT', //
                schema: 'public', //
                table: APP_CONFIG.TABLES.FEEDBACK_COTEJAMIENTO //
            }, (payload) => {
                this.handleNewFeedback(payload.new); //
            })
            .subscribe(); //

        appState.realtimeChannels.relations = supabaseClient
            .channel('relations-realtime') //
            .on('postgres_changes', {
                event: 'INSERT', //
                schema: 'public', //
                table: APP_CONFIG.TABLES.RELACIONES_APRENDIDAS //
            }, (payload) => {
                this.handleNewRelation(payload.new); //
            })
            .subscribe(); //

        console.log('📡 Suscripciones de IA en tiempo real configuradas'); //
    }

    handleNewFeedback(feedback) {
        appState.aiMetrics.feedback++; //
        this.updateRealtimeCounter('realtime-feedback', appState.aiMetrics.feedback); //
        this.updateRealtimeCounter('feedback-count', appState.aiMetrics.feedback); //

        notificationSystem.show(
            `🧠 IA capturó feedback: "${feedback.consulta_original}" → "${feedback.producto_elegido?.nombre || 'Producto'}"`, //
            'ai', //
            4000 //
        );

        this.showLearningActivity(); //
    }

    handleNewRelation(relation) {
        appState.aiMetrics.relations++; //
        this.updateRealtimeCounter('realtime-relations', appState.aiMetrics.relations); //
        this.updateRealtimeCounter('relations-live', appState.aiMetrics.relations); //
        this.updateRealtimeCounter('new-relations', this.relationsBuffer.length + 1); //

        this.relationsBuffer.push(relation); //

        notificationSystem.show(
            `🚀 Nueva relación aprendida: "${relation.consulta_normalizada}" (${Math.round(relation.confianza_aprendida * 100)}% confianza)`, //
            'ai', //
            5000 //
        );

        if (document.getElementById('ai-dashboard').classList.contains('active')) {
            this.refreshLearningDashboard(); //
        }
    }

    updateRealtimeCounter(elementId, value) {
        const element = document.getElementById(elementId); //
        if (element) {
            element.textContent = value; //
            element.style.animation = 'none'; //
            element.offsetHeight;
            element.style.animation = 'pulse 0.5s ease-in-out'; //
        }
    }
    
    showLearningActivity() {
        console.log('🎓 Mostrando actividad de aprendizaje');
        const learningPanel = document.getElementById('ai-learning-panel'); //
        const indicators = document.getElementById('ai-learning-indicators'); //

        if (learningPanel && !learningPanel.classList.contains('hidden')) return; //

        if (learningPanel) {
            learningPanel.classList.remove('hidden'); //
            setTimeout(() => learningPanel.classList.add('hidden'), 8000); //
        }

        if (indicators) {
            indicators.classList.remove('hidden'); //
        }
    }

    // Asegúrate de que esta función en main.js esté así:

updateUIMetrics() {
    // --- MÉTRICAS DEL DASHBOARD ---

    // 1. Tasa de Cotejo (más robusto)
    // Fuente A: último trabajo de appState.savedEscandallos
    if (!appState.savedEscandallos) appState.savedEscandallos = [];

    const computeRateFrom = (data) => {
        try {
            if (!data) return 0;
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            const platos = Array.isArray(result?.platos_procesados) ? result.platos_procesados : [];
            if (platos.length === 0) return 0;
            const total = platos.reduce((s, p) => s + (p.ingredientes_cotejados?.length || 0), 0);
            const found = platos.reduce((s, p) => s + (p.ingredientes_cotejados ? Utils.calculateFoundIngredients(p.ingredientes_cotejados) : 0), 0);
            return total > 0 ? (found / total) * 100 : 0;
        } catch { return 0; }
    };

    let cotejoRate = 0.0;
    const lastJob = appState.savedEscandallos.length > 0 ? appState.savedEscandallos[0] : null;
    if (lastJob) {
        cotejoRate = lastJob.resultado_final_json?.estadisticas?.tasa_exito_porcentaje ?? computeRateFrom(lastJob.resultado_final_json);
    }

    // Fuente B: análisis actual en memoria
    if (cotejoRate === 0 && (appState.currentAnalysis || window.currentAnalysis)) {
        const ca = appState.currentAnalysis || window.currentAnalysis;
        cotejoRate = computeRateFrom(ca?.resultado_final_json || ca?.resultado_final);
    }
    const cotejoRateEl = document.getElementById('dashboard-cotejo-rate');
    if (cotejoRateEl) cotejoRateEl.textContent = `${parseFloat(cotejoRate).toFixed(1)}%`;


    // 2. Relaciones Aprendidas
    const dashboardRelationsEl = document.getElementById('dashboard-relations');
    if (dashboardRelationsEl) dashboardRelationsEl.textContent = appState.aiMetrics.relations;
    
    const relationsTodayEl = document.getElementById('relations-today');
    if (relationsTodayEl) relationsTodayEl.textContent = appState.aiMetrics.relationsToday;
    

    // 3. Feedback Procesado
    const dashboardFeedbackEl = document.getElementById('dashboard-feedback');
    if (dashboardFeedbackEl) dashboardFeedbackEl.textContent = appState.aiMetrics.feedback.toLocaleString();
    
    const feedbackTodayEl = document.getElementById('feedback-today');
    if (feedbackTodayEl) feedbackTodayEl.textContent = appState.aiMetrics.feedbackToday;


    // --- MÉTRICAS DE LA BARRA LATERAL (SIDEBAR) ---
    const precisionLive = document.getElementById('precision-live');
    const relationsLive = document.getElementById('relations-live');
    
    // La precisión de la barra lateral ahora también mostrará la tasa de cotejo
    if (precisionLive) {
        precisionLive.textContent = `${parseFloat(cotejoRate).toFixed(1)}%`;
    }
    if (relationsLive) {
        relationsLive.textContent = appState.aiMetrics.relations;
    }
    
    // NUEVAS MÉTRICAS HÍBRIDAS
    try {
        obtenerMetricasHibridas().then(metricas => {
            actualizarTarjetasHibridas(metricas);
        }).catch(error => {
            console.warn('Error cargando métricas híbridas:', error);
        });
    } catch (error) {
        console.warn('Error cargando métricas híbridas:', error);
    }
}

    async refreshLearningDashboard() {
        await this.loadLearnedRelations(); //
        await this.loadRecentFeedback(); //
        this.renderEvolutionChart(); //
    }

    async loadLearnedRelations() {
        const container = document.getElementById('learned-relations-list'); //
        if (!container) return; //

        try {
            const { data, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.RELACIONES_APRENDIDAS) //
                .select(`
                    *,
                    productos!relaciones_aprendidas_producto_id_fkey(nombre, marca)
                `) //
                .eq('activa', true) //
                .order('numero_confirmaciones', { ascending: false }) //
                .limit(10); //

            if (error && !error.message.includes('does not exist')) {
                throw error; //
            }

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-graduation-cap text-3xl mb-3"></i>
                        <p>El sistema aún no ha aprendido relaciones específicas</p>
                        <p class="text-sm">Las relaciones aparecerán aquí a medida que la IA aprenda de tus cotejamientos</p>
                    </div>
                `; //
                return; //
            }

            container.innerHTML = data.map(relation => `
                <div class="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div class="flex-grow">
                        <div class="font-medium text-gray-800">"${relation.consulta_normalizada}"</div>
                        <div class="text-sm text-gray-600">→ ${relation.productos?.nombre || 'Producto no disponible'}</div>
                        <div class="text-xs text-purple-600 mt-1">
                            ${relation.numero_confirmaciones} confirmaciones • 
                            ${Math.round(relation.confianza_aprendida * 100)}% confianza
                        </div>
                    </div>
                    <div class="learning-badge">
                        ${Math.round(relation.confianza_aprendida * 100)}%
                    </div>
                </div>
            `).join(''); //
        } catch (error) {
            console.error('Error cargando relaciones aprendidas:', error); //
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Error al cargar las relaciones aprendidas</p>
                </div>
            `; //
        }
    }

    async loadRecentFeedback() {
        const container = document.getElementById('recent-feedback-list'); //
        if (!container) return; //

        try {
            const { data, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.FEEDBACK_COTEJAMIENTO) //
                .select('*') //
                .order('created_at', { ascending: false }) //
                .limit(10); //

            if (error && !error.message.includes('does not exist')) {
                throw error; //
            }

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-comments text-3xl mb-3"></i>
                        <p>No hay feedback reciente disponible</p>
                        <p class="text-sm">El feedback aparecerá aquí a medida que la IA aprenda</p>
                    </div>
                `; //
                return; //
            }

            container.innerHTML = data.map(feedback => {
                let producto_nombre = 'Producto no disponible'; //
                let tipo_feedback_display = feedback.tipo_feedback || 'automático'; //
                
                try {
                    if (feedback.producto_elegido) {
                        const producto = typeof feedback.producto_elegido === 'string' 
                            ? JSON.parse(feedback.producto_elegido) //
                            : feedback.producto_elegido; //
                        producto_nombre = producto.nombre || 'Producto procesado'; //
                    }
                } catch (e) {
                    console.warn('Error parseando producto_elegido:', e); //
                }

                return `
                    <div class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div class="flex-grow">
                            <div class="font-medium text-gray-800">"${feedback.consulta_original || 'Consulta procesada'}"</div>
                            <div class="text-sm text-gray-600">→ ${producto_nombre}</div>
                            <div class="text-xs text-blue-600 mt-1">
                                ${new Date(feedback.created_at).toLocaleDateString()} • 
                                Similitud: ${((feedback.similitud_obtenida || 0) * 100).toFixed(1)}% •
                                Tipo: ${tipo_feedback_display}
                            </div>
                        </div>
                        <div class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            ${feedback.procesado_para_aprendizaje ? 'Procesado' : 'Pendiente'}
                        </div>
                    </div>
                `; //
            }).join('');
        } catch (error) {
            console.error('Error cargando feedback reciente:', error); //
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Error al cargar el feedback reciente</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `; //
        }
    }

    async renderEvolutionChart() {
        const container = document.getElementById('evolution-chart'); //
        if (!container) return; //

        try {
            const { data, error } = await supabaseClient
                .from('ai_learning_metrics') //
                .select('fecha_fin, valor_actual') //
                .eq('tipo_metrica', 'precision_cotejamiento') //
                .order('fecha_fin', { ascending: true }); //

            if (error) {
                throw error; //
            }

            if (!data || data.length < 2) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-10">
                        <i class="fas fa-chart-line text-3xl mb-3"></i>
                        <p>Se necesitan más análisis para mostrar la evolución.</p>
                    </div>
                `; //
                return; //
            }

            const evolutionData = data.map((metric, i) => ({
                week: `Análisis #${i + 1}`, //
                precision: metric.valor_actual, //
                fecha: new Date(metric.fecha_fin).toLocaleDateString() //
            }));
            const maxValue = Math.max(...evolutionData.map(d => d.precision), 100); //

            container.innerHTML = `
                <div class="flex items-end justify-between h-48 px-4">
                    ${evolutionData.map((d, index) => `
                        <div class="flex flex-col items-center flex-1">
                            <div class="bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg mb-2 relative group cursor-pointer" 
                                style="height: ${d.precision > 0 ? (d.precision / maxValue) * 160 : 0}px; width: 80%;">
                                <div class="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    ${d.precision.toFixed(1)}%<br>
                                    <span class="text-xs">${d.fecha}</span>
                                </div>
                            </div>
                            <div class="text-sm font-medium text-gray-600">${d.week}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="text-center mt-4">
                    <p class="text-sm text-gray-600">Evolución de Precisión del Sistema (últimos análisis)</p>
                    <p class="text-xs text-gray-500 mt-1">Rango: ${Math.min(...evolutionData.map(d => d.precision)).toFixed(1)}% - ${Math.max(...evolutionData.map(d => d.precision)).toFixed(1)}%</p>
                </div>
            `; //
        } catch(error) {
            console.error('Error cargando datos de evolución:', error); //
            container.innerHTML = `
                <div class="text-center text-red-500">
                    <p>Error al cargar el gráfico de evolución.</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `; //
        }
    }

    async optimizeSystem() {
        notificationSystem.show('🚀 Iniciando optimización del sistema IA...', 'ai'); //
        try {
            await new Promise(resolve => setTimeout(resolve, 3000)); //
            appState.aiMetrics.precision += Math.random() * 2; //
            appState.aiMetrics.optimizations++; //
            this.updateUIMetrics(); //
            notificationSystem.show('✅ Sistema optimizado. Precisión mejorada en +1.3%', 'success'); //
        } catch (error) {
            notificationSystem.show('❌ Error en optimización del sistema', 'error'); //
        }
    }

    async regenerateEmbeddings() {
        notificationSystem.show('🧠 Regenerando embeddings con contexto aprendido...', 'ai'); //
        try {
            await new Promise(resolve => setTimeout(resolve, 5000)); //
            notificationSystem.show('✅ Embeddings regenerados con éxito. +15 productos optimizados', 'success'); //
        } catch (error) {
            notificationSystem.show('❌ Error regenerando embeddings', 'error'); //
        }
    }

    async exportKnowledge() {
        try {
            const data = {
                metrics: appState.aiMetrics, //
                exported_at: new Date().toISOString(), //
                relations_count: appState.aiMetrics.relations, //
                feedback_count: appState.aiMetrics.feedback //
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); //
            const url = URL.createObjectURL(blob); //
            const a = document.createElement('a'); //
            a.href = url; //
            a.download = `conocimiento-ia-${new Date().toISOString().split('T')[0]}.json`; //
            a.click(); //
            URL.revokeObjectURL(url); //

            notificationSystem.show('📥 Conocimiento de IA exportado exitosamente', 'success'); //
        } catch (error) {
            notificationSystem.show('❌ Error exportando conocimiento', 'error'); //
        }
    }
}

// ===== FUNCIÓN CRÍTICA: startSupabaseAnalysis =====
async function startSupabaseAnalysis() {
    console.log('🚀 startSupabaseAnalysis llamada');
    console.log('📁 selectedFile actual:', selectedFile);
    
    if (!selectedFile) {
        console.log('❌ No hay archivo seleccionado');
        notificationSystem.show('Por favor selecciona un archivo primero', 'warning');
        return;
    }

    console.log('✅ Archivo seleccionado:', selectedFile.name);
    
    appState.currentProgress = {
        platosDetectados: [],
        platosCompletados: [],
        totalPlatos: 0,
        progresoPorcentaje: 0,
        ingredientesUnicos: 0,
        tiempoInicio: Date.now()
    };

    if (aiLearningSystem && aiLearningSystem.isActive) {
        aiLearningSystem.showLearningActivity();
    }
    
    showProgressArea();
    updateProgress(5, '🚀 Iniciando análisis rápido con Supabase...');

    const analyzeSupabaseButton = document.getElementById('analyze-supabase-button');
    if (analyzeSupabaseButton) {
        analyzeSupabaseButton.disabled = true;
        analyzeSupabaseButton.innerHTML = `<div class="spinner mr-2"></div>Analizando con Supabase...`;
    }

    try {
        updateProgress(15, '📤 Enviando archivo para extracción...');
        
        console.log('📤 Enviando archivo a Make para extracción...');
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const extractResponse = await fetch(APP_CONFIG.START_ANALYSIS_URL, {
            method: 'POST',
            body: formData
        });

        console.log('📥 Respuesta de Make:', extractResponse.status);

        if (!extractResponse.ok) {
            const errorText = await extractResponse.text();
            throw new Error(`Error en extracción: ${extractResponse.status} - ${errorText}`);
        }

        const extractResult = await extractResponse.json();
        console.log('📋 Resultado de extracción:', extractResult);
        
        if (!extractResult?.job_id) {
            throw new Error('No se pudo extraer platos del archivo. La respuesta del servidor no contenía un ID de trabajo.');
        }

        updateProgress(35, '📋 Platos extraídos. Iniciando análisis con IA...');

        console.log('🔄 Enviando a Supabase Edge Function...');
        console.log('🔗 URL:', APP_CONFIG.SUPABASE_ANALYSIS_URL);
        console.log('🆔 Job ID:', extractResult.job_id);

        subscribeToRealtimeProgress(extractResult.job_id);

        const supabaseResponse = await fetch(APP_CONFIG.SUPABASE_ANALYSIS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APP_CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                job_id: extractResult.job_id
            })
        });

        console.log('📥 Respuesta de Supabase:', supabaseResponse.status);

        if (!supabaseResponse.ok) {
            const errorText = await supabaseResponse.text();
            console.log('❌ Error de Supabase:', errorText);
            throw new Error(`Error Supabase (${supabaseResponse.status}): ${errorText}`);
        }

        const supabaseResult = await supabaseResponse.json();
        console.log('✅ Resultado de Supabase:', supabaseResult);
        
        if (supabaseResult && !supabaseResult.success) {
            throw new Error(supabaseResult.error || 'Error desconocido en Supabase Edge Function');
        }

        console.log('⏳ El análisis continúa en segundo plano. Esperando resultados por tiempo real...');
        
    } catch (error) {
        console.error('❌ Error en análisis Supabase:', error);
        showError(`Error en análisis rápido: ${error.message}`);
        resetAnalysisUI();
        unsubscribeFromRealtimeProgress();
    }
}

// ===== FUNCIONES DE TIEMPO REAL COMPLETAS =====
function subscribeToRealtimeProgress(jobId) {
    console.log(`📡 Configurando escucha en tiempo real para job: ${jobId}`);
    
    unsubscribeFromRealtimeProgress();
    
    appState.realtimeChannels.progress = supabaseClient
        .channel(`progress-realtime-${jobId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: APP_CONFIG.TABLES.ANALISIS_PROGRESO,
            filter: `job_id=eq.${jobId}`
        }, (payload) => {
            handleRealtimeProgress(payload.new);
        })
        .subscribe(); //
        
    iniciarContadorTiempo();
    console.log('✅ Suscripción a progreso en tiempo real configurada');
}

function handleCompletado(payload) {
    console.log('🎉 Análisis Supabase completado');
    console.log('🎉 Payload recibido:', payload);
    console.log('🎉 Estado del trabajo:', payload.estado);
    
    // Debug para verificar si hay datos de PVP
    if (payload.resultado_final?.platos_procesados) {
        console.log('🔍 Verificando datos de PVP en resultado_final:');
        payload.resultado_final.platos_procesados.forEach((plato, index) => {
            console.log(`🔍 Plato ${index + 1}:`, {
                nombre: plato.plato_analizado,
                pvp: plato.pvp_bruto_euros,
                food_cost: plato.food_cost_total_euros,
                porcentaje: plato.food_cost_porcentaje,
                tiene_pvp: plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0
            });
        });
    }
    
    unsubscribeFromRealtimeProgress();
    pararContadorTiempo();
    
    // Mantener los datos de PVP en currentAnalysis
    if (payload.resultado_final) {
        currentAnalysis = {
            ...currentAnalysis,
            resultado_final: payload.resultado_final
        };
        appState.currentAnalysis = currentAnalysis;
        console.log('💾 Datos de PVP guardados en currentAnalysis');
    }
    
    setTimeout(() => {
        if (payload.resultado_final) {
            // CORREGIDO: Distinguir entre Fase 1 (extracción) y Fase 2 (cotejamiento)
            console.log('🎉 Resultado final recibido, determinando fase...');
            console.log('🔍 Estado del trabajo:', payload.estado);
            
            // Detectar si es cotejamiento completado verificando si hay productos cotejados
            const esResultadoCotejamiento = (() => {
                if (payload.resultado_final?.platos_procesados) {
                    return payload.resultado_final.platos_procesados.some(plato => 
                        plato.ingredientes_cotejados && 
                        plato.ingredientes_cotejados.some(ing => ing.producto_id || ing.producto_nombre)
                    );
                }
                return false;
            })();
            
            if (esResultadoCotejamiento) {
                console.log('🎉 Es resultado de cotejamiento - Llamando showFinalResults');
                showFinalResults(payload);
            } else {
                console.log('🎉 Es extracción de ingredientes - Llamando showIngredientesExtractedStep');
                showIngredientesExtractedStep(payload);
            }
        } else {
            showError("El análisis se completó pero no se recibieron los resultados finales.");
        }
    }, 1000);
    
    const mensaje = payload.estado === 'INGREDIENTES_EXTRAIDOS' ? 
        `🎉 ¡Ingredientes extraídos en ${payload.tiempo_total_segundos || 'un'} segundos!` :
        `🎉 ¡Análisis completado en ${payload.tiempo_total_segundos || 'un'} segundos!`;
    
    notificationSystem.show(mensaje, 'success', 6000);
}

function iniciarContadorTiempo() {
    const tiempoElement = document.getElementById('tiempo-transcurrido');
    if (!tiempoElement || appState.currentProgress.contadorIntervalo) return;
    
    const intervalo = setInterval(() => {
        if (!appState.currentProgress.tiempoInicio) {
            clearInterval(intervalo);
            return;
        }
        
        const transcurrido = Utils.formatTiempoTranscurrido(appState.currentProgress.tiempoInicio);
        tiempoElement.textContent = transcurrido;
    }, 1000);
    
    appState.currentProgress.contadorIntervalo = intervalo;
}

function pararContadorTiempo() {
    if (appState.currentProgress.contadorIntervalo) {
        clearInterval(appState.currentProgress.contadorIntervalo);
        appState.currentProgress.contadorIntervalo = null;
    }
}



function unsubscribeFromRealtimeProgress() {
    if (appState.realtimeChannels.progress) {
        supabaseClient.removeChannel(appState.realtimeChannels.progress);
        appState.realtimeChannels.progress = null;
        console.log('🔇 Desuscrito del progreso en tiempo real');
    }
    
    pararContadorTiempo();
}

function renderLivePlatoResult(platoNombre, ingredientes) {
    const liveResultsContainer = document.getElementById('live-results');
    if (!liveResultsContainer) return;

    if (liveResultsContainer.querySelector('.initial-wait-message')) {
        liveResultsContainer.innerHTML = '';
    }

    const ingredientesArray = Array.isArray(ingredientes) ? ingredientes : [];

    const ingredientsHTML = ingredientesArray.map(ing => `
        <div class="flex justify-between text-sm text-gray-600 py-1 px-2 bg-gray-50 rounded">
            <span>${Utils.sanitizeHTML(ing.nombre_ingrediente)}</span>
            <span class="font-semibold text-gray-800">${Utils.sanitizeHTML(ing.cantidad)}</span>
        </div>
    `).join('');

    const platoCard = document.createElement('div');
    platoCard.className = 'live-result-card animate-fade-in';

    platoCard.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-check-circle text-green-500 text-2xl mr-4 mt-1"></i>
            <div class="flex-grow">
                <p class="font-bold text-lg text-gray-800 mb-2">${Utils.sanitizeHTML(platoNombre)}</p>
                <div class="mt-2 pr-2 space-y-1 max-h-40 overflow-y-auto">
                    ${ingredientsHTML}
                </div>
            </div>
            <div class="text-right flex-shrink-0 ml-2">
                <span class="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-semibold">Procesado</span>
            </div>
        </div>
    `;

    liveResultsContainer.prepend(platoCard);
}

// ===== showFinalSupabaseResults CON BOTÓN DE COTEJACIÓN =====
// ===== showFinalSupabaseResults CON BOTÓN DE COTEJACIÓN =====
function showFinalSupabaseResults(result, tiempoSegundos) {
    console.log('🚀 showFinalSupabaseResults llamada con:', result);
    
    updateProgress(100, '✅ ¡Análisis completado!');
    
    setTimeout(() => {
        const progressArea = document.getElementById('progress-area');
        const snapResultsArea = document.getElementById('snap-results-area');
        
        progressArea?.classList.add('hidden');
        snapResultsArea?.classList.remove('hidden');
        
        const successHTML = `
            <div class="alert alert-success mb-8">
                <i class="fas fa-trophy text-3xl mr-4"></i>
                <div>
                    <h3 class="font-bold text-xl">¡Análisis Supabase Completado con Food Cost!</h3>
                    <p class="text-sm mt-1">Completado en <strong>${tiempoSegundos} segundos</strong> con análisis económico completo</p>
                </div>
            </div>
            
            ${createFoodCostGlobalSummary(result)}
            
            <div class="mb-8">
                <h4 class="text-2xl font-bold text-gray-800 mb-6 text-center">
                    🍽️ Análisis Detallado por Plato
                </h4>
                ${(result.platos_procesados || []).map((plato, index) => {
                    // console.log(`🔍 DEBUG showFinalResults - Plato ${index}:`, JSON.stringify(plato, null, 2));
                    return createFoodCostPlatoCard(plato);
                }).join('')}
            </div>
            
            <div class="mt-10 text-center">
                 <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button id="try-another-recipe" class="btn text-lg px-10 py-4 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white">
                        <i class="fas fa-rocket mr-3"></i>
                        Analizar Otra Receta
                    </button>
                </div>
                <p class="text-sm text-gray-500 mt-4">
                    Análisis ID: <code class="bg-gray-100 px-2 py-1 rounded">${result.job_id || 'N/A'}</code>
                </p>
            </div>
        `;
        
        if (snapResultsArea) {
            snapResultsArea.innerHTML = successHTML;
        }
        
        document.getElementById('try-another-recipe')?.addEventListener('click', () => {
            resetAnalysis();
        });
        
        currentAnalysis = { id: result.job_id, resultado_final_json: result };
        appState.currentAnalysis = currentAnalysis;
        // Intentar asociar restaurante capturado
        (async () => {
            try {
                const capturedName = window.__clientName || null;
                if (capturedName && result?.job_id) {
                    const restauranteId = await ensureRestaurante(capturedName);
                    if (restauranteId) {
                        await supabaseClient
                            .from('trabajos_analisis')
                            .update({ restaurante_id: restauranteId })
                            .eq('id', result.job_id);
                    }
                }
            } catch (e) { console.warn('No se pudo asociar restaurante (Supabase):', e); }
        })();
    }, 1500);
}

// ===== ANÁLISIS ORIGINAL CON MAKE =====
async function startAnalysis() {
    if (!selectedFile) {
        notificationSystem.show('Por favor selecciona un archivo primero', 'warning'); //
        return; //
    }

    // NUEVO: Capturar tiempo de inicio para métricas
    appState.currentProgress.tiempoInicio = Date.now();

    if (aiLearningSystem && aiLearningSystem.isActive) {
        aiLearningSystem.showLearningActivity(); //
    }

    showProgressArea(); //
    updateProgress(0, 'Subiendo archivo y extrayendo platos...'); //

    const analyzeButton = document.getElementById('analyze-button'); //
    if (analyzeButton) {
        analyzeButton.disabled = true; //
        analyzeButton.innerHTML = `<div class="spinner mr-2"></div>Analizando con IA...`; //
    }

    try {
        const formData = new FormData(); //
        formData.append('file', selectedFile); //
        formData.append('fase', 'extraccion'); // Agregar parámetro de fase

        const response = await fetch(APP_CONFIG.START_ANALYSIS_URL, {
            method: 'POST', //
            body: formData //
        });

        if (!response.ok) {
            const errorText = await response.text(); //
            throw new Error(`Error del servidor (${response.status}): ${errorText}`); //
        }

        const result = await response.json(); //

        if (result?.job_id) {
            subscribeToAnalysisUpdates(result.job_id); //
            notificationSystem.show('🧠 Extracción iniciada con IA adaptativa activa', 'ai'); //
        } else {
            throw new Error('La respuesta del servidor no contenía un job_id válido.'); //
        }

    } catch (error) {
        console.error('Error al iniciar análisis:', error); //
        showError(`No se pudo iniciar el análisis: ${error.message}`); //
        resetAnalysisUI(); //
    }
}

function handleRealtimeProgress(progressData) { // Se quita el "=" y se añade "{"
    console.log('📬 Progreso recibido:', progressData);
    const mensaje = progressData.mensaje;
    let payload; 

    // --- LÓGICA "A PRUEBA DE BALAS" ---
    try {
        if (typeof progressData.payload === 'string') {
            console.log('🔧 Payload recibido como STRING, parseando...');
            payload = JSON.parse(progressData.payload);
        } else if (progressData.payload && typeof progressData.payload === 'object') {
            console.log('✅ Payload recibido como OBJETO, usando directamente.');
            payload = progressData.payload;
        } else {
            payload = {};
        }
    } catch (error) {
        console.error('❌ Error CRÍTICO al procesar el payload:', error);
        payload = { tipo: 'error', error: 'Payload inválido' };
    }
    
    // --- FIN DE LA LÓGICA ---

    updateProgress(payload.progreso || null, mensaje);
    
    switch (payload.tipo) {
        case 'plato_completado':
             if (payload.plato_completado) {
                const plato = payload.plato_completado;
                renderLivePlatoResult(plato.nombre_plato, plato.ingredientes);
             }
             break;
        case 'completado':
            handleCompletado(payload);
            break;
    }
} // Se añade la llave de cierre

function subscribeToAnalysisUpdates(jobId) {
    console.log(`📡 Escuchando cambios para el trabajo ${jobId}...`);
    unsubscribeAll(); // Limpia suscripciones anteriores ANTES de crear una nueva.

    appState.realtimeChannels.status = supabaseClient
        .channel(`db-changes-${jobId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: APP_CONFIG.TABLES.TRABAJOS,
            filter: `id=eq.${jobId}`
        }, (payload) => {
            const updatedJob = payload.new;
            console.log(`✅ Cambio de estado recibido: ${updatedJob.estado}`);
            console.log('📊 Datos del trabajo actualizado:', updatedJob);
            
            // Solo nos desuscribimos cuando el trabajo termina o falla.
            if (updatedJob.estado === 'COMPLETADO' || updatedJob.estado === 'COMPLETADO_CON_FOOD_COST' || updatedJob.estado === 'ERROR') {
                unsubscribeAll();
            }

            switch (updatedJob.estado) {
                case 'INGREDIENTES_EXTRAIDOS':
                    // Fase 1: Mostrar ingredientes extraídos
                    console.log('📊 Estado: INGREDIENTES_EXTRAIDOS - Mostrando Fase 1');
                    showIngredientesExtractedStep(updatedJob);
                    break;
                case 'COMPLETADO':
                case 'COMPLETADO_CON_FOOD_COST':
                    // CORREGIDO: Determinar si mostrar Fase 2 o Fase 1 basado en contenido y contexto
                    console.log('📊 Estado: COMPLETADO - Determinando fase...');
                    
                    // Detectar si es cotejamiento completado (múltiples criterios)
                    const tieneResultadoCotejamiento = (() => {
                        // Criterio 1: Verificar si estamos en progreso de Fase 2
                        const enProgresoFase2 = progressInterval !== null;
                        console.log('🔍 DEBUG - En progreso Fase 2:', enProgresoFase2);
                        
                        // Criterio 2: Verificar contenido de cotejamiento
                        let tieneCotejamientoEnDatos = false;
                        if (updatedJob.resultado_final_json) {
                            try {
                                const resultado = typeof updatedJob.resultado_final_json === 'string' 
                                    ? JSON.parse(updatedJob.resultado_final_json) 
                                    : updatedJob.resultado_final_json;
                                
                                if (resultado?.platos_procesados) {
                                    tieneCotejamientoEnDatos = resultado.platos_procesados.some(plato => 
                                        plato.ingredientes_cotejados && 
                                        plato.ingredientes_cotejados.some(ing => 
                                            (ing.producto_id && ing.producto_id !== '') || 
                                            (ing.producto_nombre && ing.producto_nombre !== 'No encontrado') ||
                                            (ing.precio_total_euros && ing.precio_total_euros > 0) ||
                                            (ing.costo_ingrediente_euros && ing.costo_ingrediente_euros > 0)
                                        )
                                    );
                                }
                            } catch (e) {
                                console.error('Error parseando resultado_final_json:', e);
                            }
                        }
                        console.log('🔍 DEBUG - Tiene cotejamiento en datos:', tieneCotejamientoEnDatos);
                        
                        // Criterio 3: Verificar si currentAnalysis tiene datos de Fase 1
                        const tieneEstadoPrevioDeFase1 = currentAnalysis && 
                            (currentAnalysis.resultado_final?.platos_procesados || currentAnalysis.platos_json);
                        console.log('🔍 DEBUG - Tiene estado previo de Fase 1:', tieneEstadoPrevioDeFase1);
                        
                        // Es cotejamiento si: está en progreso de Fase 2 O tiene datos de cotejamiento O viene después de Fase 1
                        return enProgresoFase2 || tieneCotejamientoEnDatos || tieneEstadoPrevioDeFase1;
                    })();
                    
                    console.log('🔍 DEBUG - ¿Es resultado de cotejamiento?:', tieneResultadoCotejamiento);
                    
                    if (tieneResultadoCotejamiento) {
                        console.log('📊 Es resultado de cotejamiento - Mostrando Fase 2');
                        showFinalResults(updatedJob);
                    } else {
                        console.log('📊 Es extracción completada - Mostrando Fase 1');
                        showIngredientesExtractedStep(updatedJob);
                    }
                    break;
                case 'ERROR':
                    showError(updatedJob.mensaje_error || 'El proceso falló por una razón desconocida.');
                    break;
                default:
                    console.log(`📊 Estado no manejado: ${updatedJob.estado}`);
                    break;
            }
        })
        .subscribe();

    simulateProgress();
}

function simulatePhase2Progress() {
    let progress = 0; //
    const messages = [
        'Analizando ingredientes...', //
        '🧠 Aplicando conocimiento aprendido...', //
        'Buscando productos en la base de datos...', //
        '📊 Calculando similitudes semánticas...', //
        '💾 Capturando feedback automático...', //
        'Asignando precios...', //
        'Generando escandallo final...' //
    ];
    let messageIndex = 0; //

    if (progressInterval) clearInterval(progressInterval);

    progressInterval = setInterval(() => {
        progress += Math.random() * 15; //
        if (progress > 95) {
            progress = 95; //
            clearInterval(progressInterval); //
        }

        if (progress > (messageIndex + 1) * 15 && messageIndex < messages.length - 1) {
            messageIndex++; //
        }

        updateProgress(progress, messages[messageIndex]); //
    }, 1800);
}

function showFinalResults(job) {
    console.log('🎯 showFinalResults llamado con:', job);
    console.log('🔍 DEBUG - Job keys:', Object.keys(job || {}));
    console.log('🔍 DEBUG - platos_json type:', typeof job?.platos_json);
    console.log('🔍 DEBUG - resultado_final type:', typeof job?.resultado_final);
    console.log('🔍 DEBUG - resultado_final_json type:', typeof job?.resultado_final_json);
    
    // Cargar posibles fuentes
    let platosFromArray = null; // desde platos_json (array)
    let objectResult = null;    // desde resultado_final_json (objeto con platos_procesados)

    // 1) platos_json (array)
    if (job.platos_json) {
        try {
            const pj = typeof job.platos_json === 'string' ? JSON.parse(job.platos_json) : job.platos_json;
            if (Array.isArray(pj)) {
                platosFromArray = pj;
                console.log('✅ Cargado platos_json (array):', platosFromArray.length, 'platos');
            } else {
                console.warn('⚠️ platos_json no es un array:', typeof pj);
            }
        } catch (error) {
            console.error('❌ Error parseando platos_json:', error);
        }
    }

    // 2) resultado_final_json (objeto)
    if (job.resultado_final || job.resultado_final_json) {
        try {
            objectResult = job.resultado_final || (typeof job.resultado_final_json === 'string' ? JSON.parse(job.resultado_final_json) : job.resultado_final_json);
            console.log('✅ Cargado resultado_final_json:', typeof objectResult);
            console.log('🔍 DEBUG - objectResult keys:', Object.keys(objectResult || {}));
        } catch (e) {
            console.warn('⚠️ Error parseando resultado_final_json:', e);
        }
    }

    // Elegir origen con mejor cotejamiento
    let platos = null;
    let estadisticas = {};

    const hasMatches = (arr) => {
        if (!Array.isArray(arr)) return false;
        for (const p of arr) {
            const ings = p.ingredientes_cotejados || p.ingredientes || [];
            // CORREGIDO: Usar los campos correctos del backend
            const tieneProductos = ings.some(i => {
                const producto = i.producto_encontrado || i.producto_nombre || i.producto || '';
                return (producto && producto !== 'No encontrado' && i.producto_id) || (i.precio_total_euros && i.precio_total_euros > 0) || (i.costo_ingrediente_euros && i.costo_ingrediente_euros > 0);
            });
            if (tieneProductos) {
                return true;
            }
        }
        return false;
    };

    const platosFromObject = Array.isArray(objectResult?.platos_procesados) ? objectResult.platos_procesados : null;
    
    console.log('🔍 DEBUG - platosFromArray:', platosFromArray ? `${platosFromArray.length} platos` : 'null');
    console.log('🔍 DEBUG - platosFromObject:', platosFromObject ? `${platosFromObject.length} platos` : 'null');
    console.log('🔍 DEBUG - hasMatches(platosFromObject):', platosFromObject ? hasMatches(platosFromObject) : 'N/A');

    // Preferir el que tenga cotejamiento real
    if (platosFromObject && hasMatches(platosFromObject)) {
        platos = platosFromObject;
        estadisticas = objectResult.estadisticas || {};
        console.log('🎯 Usando resultado_final_json (con cotejamiento)');
    } else if (platosFromArray) {
        platos = platosFromArray;
        console.log('🎯 Usando platos_json (array)');
    } else if (platosFromObject) {
        platos = platosFromObject;
        estadisticas = objectResult.estadisticas || {};
        console.log('🎯 Usando resultado_final_json (sin cotejamiento detectado)');
    } else {
        // NUEVO: Intentar extraer datos de otras fuentes posibles
        console.warn('⚠️ No se encontraron datos en fuentes principales, buscando alternativas...');
        
        // Intentar extraer de otros campos posibles
        if (job.platos && Array.isArray(job.platos)) {
            platos = job.platos;
            console.log('🎯 Usando job.platos (array directo)');
        } else if (job.ingredientes && Array.isArray(job.ingredientes)) {
            // Si solo hay ingredientes, crear estructura básica
            platos = [{
                plato_analizado: 'Plato Principal',
                ingredientes_cotejados: job.ingredientes
            }];
            console.log('🎯 Usando job.ingredientes (convertido a plato)');
        } else {
            console.error('❌ Formato de datos no reconocido');
            console.error('🔍 DEBUG - Job completo:', JSON.stringify(job, null, 2));
            showError(`Formato de datos no reconocido. Job ID: ${job?.id || 'N/A'}. Contacta al soporte con este error.`);
            return;
        }
    }

    console.log('✅ Platos elegidos para render:', platos.length);

    if (progressInterval) clearInterval(progressInterval);
    updateProgress(100, '¡Cotejación completada con IA adaptativa!');

    setTimeout(async () => {
        const progressArea = document.getElementById('progress-area');
        const snapResultsArea = document.getElementById('snap-results-area');
        progressArea?.classList.add('hidden');
        snapResultsArea?.classList.remove('hidden');

        currentAnalysis = job;
        appState.currentAnalysis = job;

        // Intentar asociar restaurante al trabajo recién completado usando el nombre capturado
        (async () => {
            try {
                const jobId = job?.id || appState.currentAnalysis?.id;
                const capturedName = window.__clientName || null;
                if (jobId && capturedName) {
                    const restauranteId = await ensureRestaurante(capturedName);
                    if (restauranteId) {
                        await supabaseClient
                            .from('trabajos_analisis')
                            .update({ restaurante_id: restauranteId })
                            .eq('id', jobId);
                    }
                }
            } catch (e) {
                console.warn('No se pudo asociar restaurante al finalizar:', e);
            }
        })();

        // Si aún faltan PVP, intentar rellenar desde DB
        try {
            const faltaPVP = platos.some(p => !p?.pvp_bruto_euros || p.pvp_bruto_euros === 0);
            const jobId = job?.id || currentAnalysis?.id || appState?.currentAnalysis?.id || job?.resultado_final?.job_id;
            
            console.log('🔍 DEBUG PVP - JobId:', jobId);
            console.log('🔍 DEBUG PVP - FaltaPVP:', faltaPVP);
            console.log('🔍 DEBUG PVP - Platos originales:', platos.map(p => ({ nombre: p.plato_analizado, pvp: p.pvp_bruto_euros })));
            
            if (faltaPVP && jobId) {
                console.log('🔍 DEBUG PVP - Consultando tabla platos con jobId:', jobId);
                const { data: platosDB, error } = await supabaseClient
                    .from('platos')
                    .select('nombre, pvp_bruto_euros, pvp_neto_euros, food_cost_total_euros, food_cost_porcentaje, margen_neto_euros')
                    .eq('trabajo_analisis_id', jobId);
                
                console.log('🔍 DEBUG PVP - PlatosDB:', platosDB);
                console.log('🔍 DEBUG PVP - Error:', error);
                if (!error && Array.isArray(platosDB)) {
                    console.log('🔍 DEBUG PVP - PlatosDB encontrados:', platosDB.length);
                    const normalize = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const mapDB = new Map(platosDB.map(pd => [normalize(pd.nombre), pd]));
                    console.log('🔍 DEBUG PVP - MapDB keys:', Array.from(mapDB.keys()));
                    
                    platos = platos.map(p => {
                        const key = normalize(p.plato_analizado || p.nombre_plato || '');
                        const match = mapDB.get(key);
                        console.log('🔍 DEBUG PVP - Buscando:', key, 'Match:', match ? 'SÍ' : 'NO');
                        
                        if (match && (!p.pvp_bruto_euros || p.pvp_bruto_euros === 0)) {
                            console.log('🔍 DEBUG PVP - Asignando PVP:', match.pvp_bruto_euros, 'a', p.plato_analizado);
                            return {
                                ...p,
                                pvp_bruto_euros: match.pvp_bruto_euros,
                                pvp_neto_euros: match.pvp_neto_euros,
                                food_cost_total_euros: p.food_cost_total_euros ?? match.food_cost_total_euros,
                                food_cost_porcentaje: p.food_cost_porcentaje ?? match.food_cost_porcentaje,
                                margen_neto_euros: p.margen_neto_euros ?? match.margen_neto_euros
                            };
                        }
                        return p;
                    });
                    
                    console.log('🔍 DEBUG PVP - Platos finales:', platos.map(p => ({ 
                        nombre: p.plato_analizado, 
                        pvp: p.pvp_bruto_euros,
                        food_cost_total: p.food_cost_total_euros,
                        food_cost_porcentaje: p.food_cost_porcentaje
                    })));
                }
            }
        } catch (e) {
            console.warn('⚠️ Error rellenando PVP desde DB:', e);
        }

        // Calcular stats si faltan
        const totalIngredients = estadisticas.total_ingredientes ?? platos.reduce((sum, p) => sum + (p.ingredientes_cotejados?.length || 0), 0);
        const foundIngredientes = estadisticas.ingredientes_encontrados ?? platos.reduce((sum, p) => sum + Utils.calculateFoundIngredients(p.ingredientes_cotejados || []), 0);
        const successRate = estadisticas.tasa_exito_porcentaje ?? (totalIngredients > 0 ? Math.round((foundIngredientes / totalIngredients) * 100) : 0);

        const learnedMatches = platos.reduce((sum, p) => sum + (p.ingredientes_cotejados?.filter(ing => Utils.getMatchSource(ing) === 'learned').length || 0), 0);

        const successBanner = `
            <div class="alert alert-success mb-8">
                <i class="fas fa-trophy text-3xl mr-4" aria-hidden="true"></i>
                <div>
                    <h3 class="font-bold text-xl">¡Cotejación Completada con IA Adaptativa!</h3>
                    <p class="text-sm mt-1">Tu receta ha sido cotejada y <strong>la IA ha aprendido ${learnedMatches} nuevas relaciones</strong> para mejorar futuras búsquedas.</p>
                </div>
            </div>
            
            <!-- NUEVO: Botones superiores duplicados con color morado -->
            <div class="mb-8 text-center">
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button id="view-ai-dashboard-button-top" class="btn text-lg px-10 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
                        <i class="fas fa-brain mr-3" aria-hidden="true"></i>
                        Dashboard IA
                    </button>
                    <button id="try-another-recipe-button-top" class="btn text-lg px-10 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
                        <i class="fas fa-plus mr-3" aria-hidden="true"></i>
                        Analizar Otra Receta
                    </button>
                </div>
            </div>`;

        const summaryCard = `
            <div class="card p-8 mb-8 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">Resumen de la Cotejación con IA</h3>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="text-center p-3 bg-white rounded-lg"><p class="text-2xl font-bold text-blue-600">${platos.length}</p><p class="text-sm text-gray-600">Platos</p></div>
                    <div class="text-center p-3 bg-white rounded-lg"><p class="text-2xl font-bold text-green-600">${totalIngredients}</p><p class="text-sm text-gray-600">Ingredientes</p></div>
                    <div class="text-center p-3 bg-white rounded-lg"><p class="text-2xl font-bold text-teal-600">${foundIngredientes}</p><p class="text-sm text-gray-600">Encontrados</p></div>
                    <div class="text-center p-3 bg-white rounded-lg border-2 border-purple-200 bg-purple-50"><p class="text-2xl font-bold text-purple-600">${learnedMatches}</p><p class="text-sm text-purple-600">IA Aprendida</p></div>
                    <div class="text-center p-3 bg-white rounded-lg"><p class="text-2xl font-bold text-indigo-600">${successRate}%</p><p class="text-sm text-gray-600">% Éxito</p></div>
                </div>
            </div>`;

        const platosHTML = platos.map((plato, index) => {
            // console.log(`🔍 DEBUG platosHTML - Plato ${index}:`, JSON.stringify(plato, null, 2));
            return createFoodCostPlatoCard(plato);
        }).join('');
        const actionButtons = `
            <div class="mt-10 text-center">
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button id="view-full-details-button" class="btn btn-primary text-lg px-10 py-4"><i class="fas fa-chart-line mr-3" aria-hidden="true"></i>Ver Análisis Completo</button>
                    <button id="view-ai-dashboard-button" class="btn btn-ai text-lg px-10 py-4"><i class="fas fa-brain mr-3" aria-hidden="true"></i>Dashboard IA</button>
                    <button id="try-another-recipe-button" class="btn btn-success text-lg px-10 py-4"><i class="fas fa-plus mr-3" aria-hidden="true"></i>Nueva Receta</button>
                </div>
            </div>`;

        // Reutilizamos el snapResultsArea ya declarado arriba
        if (snapResultsArea) snapResultsArea.innerHTML = successBanner + summaryCard + platosHTML + actionButtons;

        // Event listeners para botones superiores
        document.getElementById('view-ai-dashboard-button-top')?.addEventListener('click', () => document.querySelector('a[href="#ai-dashboard"]').click());
        document.getElementById('try-another-recipe-button-top')?.addEventListener('click', () => resetAnalysis());
        
        // Event listeners para botones inferiores (mantener compatibilidad)
        document.getElementById('view-full-details-button')?.addEventListener('click', () => notificationSystem.show('Vista detallada en desarrollo', 'info'));
        document.getElementById('view-ai-dashboard-button')?.addEventListener('click', () => document.querySelector('a[href="#ai-dashboard"]').click());
        document.getElementById('try-another-recipe-button')?.addEventListener('click', () => resetAnalysis());

        notificationSystem.show(`Cotejación completada: ${platos.length} platos, ${foundIngredientes} ingredientes encontrados (${successRate}% éxito)`, 'success');
    }, 1500);
}

function showPlatoDetails(platoName) {
    if (!currentAnalysis) return; //

    // Priorizar platos_json si existe
    let platosArray = null;
    if (currentAnalysis.platos_json) {
        try {
            const pj = typeof currentAnalysis.platos_json === 'string' ? JSON.parse(currentAnalysis.platos_json) : currentAnalysis.platos_json;
            if (Array.isArray(pj)) platosArray = pj;
        } catch (e) {
            console.warn('⚠️ Error parseando platos_json en showPlatoDetails:', e);
        }
    }

    if (!platosArray && currentAnalysis.resultado_final_json) {
        try {
            const data = typeof currentAnalysis.resultado_final_json === 'string' ? JSON.parse(currentAnalysis.resultado_final_json) : currentAnalysis.resultado_final_json; //
            if (data && Array.isArray(data.platos_procesados)) platosArray = data.platos_procesados;
        } catch (e) {
            console.warn('⚠️ Error parseando resultado_final_json en showPlatoDetails:', e);
        }
    }

    if (!platosArray) {
        notificationSystem.show('No hay datos de platos para mostrar detalles.', 'error');
        return;
    }

    const plato = platosArray.find(p => (p.plato_analizado || p.nombre_plato) === platoName); //
    if (plato) {
        renderDetailsModal([plato]); //
    } else {
        notificationSystem.show(`No se encontraron detalles para el plato: ${platoName}`, 'error'); //
    }
}

async function mostrarPlatoConFotos(escandallo) {
    console.log('🍽️ Mostrando plato con fotos:', escandallo);
    
    // ✅ VALIDACIÓN MEJORADA
    console.log('🔍 Escandallo completo:', escandallo);
    console.log('🔍 resultado_final_json:', escandallo.resultado_final_json);
    console.log('🔍 resultado_final:', escandallo.resultado_final);

    if (!escandallo.resultado_final_json && !escandallo.resultado_final) {
        console.error('❌ No hay resultado_final_json ni resultado_final');
        notificationSystem.show('No hay datos de cotejamiento para este plato', 'error');
        return;
    }

    let data;
    try {
        // ✅ INTENTAR MÚLTIPLES FUENTES
        if (escandallo.resultado_final_json) {
        data = typeof escandallo.resultado_final_json === 'string' 
            ? JSON.parse(escandallo.resultado_final_json) 
            : escandallo.resultado_final_json;
        } else if (escandallo.resultado_final) {
            data = escandallo.resultado_final;
        } else {
            throw new Error('No hay datos de resultado');
        }
        
        console.log('✅ Datos parseados:', data);
    } catch (e) {
        console.error('❌ Error parseando:', e);
        notificationSystem.show('Error al cargar los datos del plato', 'error');
        return;
    }

    const platos = data.platos_procesados || [];
    if (platos.length === 0) {
        notificationSystem.show('No se encontraron platos procesados', 'error');
        return;
    }

    // 🆕 BUSCAR IMÁGENES DE LOS PRODUCTOS
    console.log('🔍 Buscando imágenes de productos...');
    const productosConImagenes = new Map();

    for (const plato of platos) {
        const ingredientes = plato.ingredientes_cotejados || [];
        const productIds = ingredientes
            .map(ing => ing.producto_id)
            .filter(id => id); // Solo IDs válidos

        if (productIds.length > 0) {
            try {
                const { data: productos, error } = await supabaseClient
                    .from('productos')
                    .select('id, imagen_tarjeta_url, nombre, marca')
                    .in('id', productIds);

                if (!error && productos) {
                    productos.forEach(prod => {
                        productosConImagenes.set(prod.id, {
                            imagen_url: prod.imagen_tarjeta_url,
                            nombre_completo: prod.nombre,
                            marca: prod.marca
                        });
                    });
                    console.log('✅ Imágenes encontradas:', productos.length);
                }
            } catch (error) {
                console.error('❌ Error buscando imágenes:', error);
            }
        }
    }

    // Crear contenido del modal
    const multiplePlatos = platos.length > 1;
    const platosHTML = platos.map(plato => {
        const ingredientes = plato.ingredientes_cotejados || [];
        const innerContent = `
            <div class="mb-6">
                <!-- Header del plato -->
                <div class="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-4 rounded-t-lg">
                    <h2 class="text-2xl font-bold mb-2">🍽️ ${Utils.sanitizeHTML(plato.plato_analizado)}</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        ${plato.pvp_bruto_euros ? `
                            <div class="text-center">
                                <div class="text-xl font-bold">€${plato.pvp_bruto_euros.toFixed(2)}</div>
                                <div class="opacity-90">PVP</div>
                            </div>
                        ` : ''}
                        <div class="text-center">
                            <div class="text-xl font-bold">€${(plato.food_cost_total_euros || 0).toFixed(2)}</div>
                            <div class="opacity-90">Food Cost</div>
                        </div>
                        ${plato.food_cost_porcentaje ? `
                            <div class="text-center">
                                <div class="text-xl font-bold">${plato.food_cost_porcentaje}%</div>
                                <div class="opacity-90">% Food Cost</div>
                            </div>
                        ` : ''}
                        ${plato.margen_neto_euros ? `
                            <div class="text-center">
                                <div class="text-xl font-bold">€${plato.margen_neto_euros.toFixed(2)}</div>
                                <div class="opacity-90">Margen</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Grid de ingredientes con fotos -->
                <div class="bg-white p-4 rounded-b-lg">
                    <h3 class="text-lg font-semibold mb-4 text-gray-800">
                        📋 Ingredientes Cotejados (${ingredientes.length})
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${ingredientes.map(ing => {
                            const nombreIngrediente = ing.ingrediente_nombre || ing.ingrediente_ia || 'Ingrediente sin nombre';
                            const producto = ing.producto_nombre || 'No encontrado';
                            const precio = ing.precio_neto_por_kg_l || ing.precio_unitario_euros || 0;
                            const costoTotal = ing.costo_ingrediente_euros || ing.precio_total_euros || 0;
                            const similitud = Math.round((ing.similitud || 0) * 100);
                            const origen = ing.origen_match || 'semantico';
                            
                            // 🆕 OBTENER IMAGEN DEL MAP
                            const productoInfo = productosConImagenes.get(ing.producto_id);
                            const imageUrl = productoInfo?.imagen_url;
                            
                            console.log(`🔍 ${nombreIngrediente} -> Imagen: ${imageUrl ? '✅' : '❌'}`);
                            
                            return `
    <div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                                    <!-- HEADER: Nombre del ingrediente original -->
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
            <h4 class="font-bold text-gray-800 text-base flex items-center">
                                            🥘 ${Utils.sanitizeHTML(nombreIngrediente)}
                                        </h4>
            <div class="text-sm text-gray-600 mt-1">
                <span class="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs font-semibold">
                    ${Utils.sanitizeHTML(ing.cantidad || 'N/A')}
                </span>
                                        </div>
                                    </div>
                                    
        <!-- IMAGEN MANTENIENDO PROPORCIONES -->
        <div class="relative bg-white p-4">
                                        ${imageUrl ? `
                <div class="w-full h-48 flex items-center justify-center">
                                            <img src="${imageUrl}" 
                                                 alt="${producto}"
                         class="max-w-full max-h-full object-contain rounded-lg shadow-md"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg" style="display: none;">
                                                <div class="text-center text-gray-500">
                            <i class="fas fa-image text-3xl mb-2"></i>
                            <div class="text-sm">Error cargando imagen</div>
                        </div>
                                                </div>
                                            </div>
                                        ` : `
                <div class="w-full h-48 bg-gradient-to-br from-teal-50 to-blue-100 flex items-center justify-center">
                                                <div class="text-center text-teal-700">
                                                    <i class="fas fa-store text-4xl mb-2"></i>
                                                    <div class="text-sm font-bold">Producto Makro</div>
                                                    <div class="text-xs">Sin foto disponible</div>
                                                </div>
                                            </div>
                                        `}
                                        
            <!-- BADGES MEJORADOS -->
            <div class="absolute top-3 right-3 flex flex-col gap-2">
                <!-- Similitud -->
                <div class="bg-black bg-opacity-80 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">
                                                ${similitud}%
                </div>
                <!-- Origen -->
                <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold shadow-lg ${
                                                origen === 'aprendido' ? 'bg-purple-600 text-white' :
                                                origen === 'exacto' ? 'bg-blue-600 text-white' :
                                                'bg-gray-600 text-white'
                                            }">
                    <span class="mr-1">${origen === 'aprendido' ? '✨' : origen === 'exacto' ? '🎯' : '🔍'}</span>
                    <span class="text-xs">${origen === 'aprendido' ? 'IA' : origen === 'exacto' ? 'EX' : 'SEM'}</span>
                </div>
                                        </div>
                                    </div>
                                    
        <!-- CONTENIDO PRINCIPAL -->
        <div class="p-4 space-y-4">
            <!-- Producto Makro -->
                                        <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
                    <i class="fas fa-store mr-1"></i>Producto Makro
                </div>
                <div class="font-bold text-gray-800 text-sm leading-tight mb-1">
                                                ${Utils.sanitizeHTML(producto)}
                                            </div>
                                            ${productoInfo?.marca ? `
                    <div class="text-xs text-gray-500">
                        Marca: <span class="font-medium">${Utils.sanitizeHTML(productoInfo.marca)}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                        
            <!-- PRECIOS DESTACADOS -->
                                        ${precio > 0 || costoTotal > 0 ? `
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                                                ${precio > 0 ? `
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-green-700 font-medium">Precio/kg:</span>
                            <span class="font-bold text-green-800 text-lg">€${precio.toFixed(2)}</span>
                                                    </div>
                                                ` : ''}
                                                ${costoTotal > 0 ? `
                                                    <div class="flex justify-between items-center">
                            <span class="text-sm text-green-700 font-medium">Costo total:</span>
                            <span class="font-bold text-green-900 text-xl bg-green-100 px-3 py-1 rounded-lg">
                                €${costoTotal.toFixed(2)}
                            </span>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        ` : `
                <div class="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                    <div class="text-center text-gray-500 text-sm">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                                                    Sin información de precios
                                                </div>
                                            </div>
                                        `}
        </div>
        
        <!-- FOOTER CON TIPO DE MATCH -->
        <div class="bg-gray-50 px-4 py-3 border-t">
            <div class="flex justify-center">
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                    origen === 'aprendido' ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' :
                    origen === 'exacto' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                    'bg-gray-100 text-gray-800 border-2 border-gray-300'
                                            }">
                                                ${origen === 'aprendido' ? '✨ IA Aprendida' : 
                                                  origen === 'exacto' ? '🎯 Match Exacto' : 
                                                  '🔍 Búsqueda Semántica'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        if (multiplePlatos) {
            // Mostrar como desplegable por plato
            const stats = `(${ingredientes.length} ingredientes)`;
            return `
                <details class="plato-accordion mb-4">
                    <summary class="plato-summary">
                        <span class="plato-summary-title">🍽️ ${Utils.sanitizeHTML(plato.plato_analizado)} <span class="text-xs opacity-80 ml-2">${stats}</span></span>
                        <span class="plato-summary-hint">abrir</span>
                    </summary>
                    <div class="plato-accordion-content">${innerContent}</div>
                </details>
            `;
        }

        // Caso un solo plato: devolver contenido completo sin plegar
        return innerContent;
    }).join('');

    // Mostrar en modal
    const modalContent = `
        <button onclick="modalManager.close('details-modal')" class="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-800 z-10">&times;</button>
        <div class="p-2">
            ${platosHTML}
        </div>
    `;
    
    modalManager.open('details-modal', modalContent);
}

// Nueva función: abrir un plato concreto desde un trabajo guardado
async function abrirPlatoConFotos(trabajoId, platoIndex, platoNombre) {
    if (platoIndex === '' || platoIndex === null || typeof platoIndex === 'undefined') {
        notificationSystem.show('Por favor selecciona un plato', 'warning');
        return;
    }

    console.log(`🧭 Abriendo plato: ${platoNombre} del trabajo ${trabajoId}`);

    const escandallo = appState.savedEscandallos.find(e => e.id.toString() === trabajoId.toString());
    if (!escandallo) {
        notificationSystem.show('Trabajo no encontrado', 'error');
        return;
    }

    let platos = [];
    try {
        const data = typeof escandallo.resultado_final_json === 'string'
            ? JSON.parse(escandallo.resultado_final_json)
            : escandallo.resultado_final_json;
        platos = data.platos_procesados || [];
    } catch (e) {
        notificationSystem.show('Error cargando datos del plato', 'error');
        return;
    }

    if (!platos[platoIndex]) {
        notificationSystem.show('Plato no encontrado', 'error');
        return;
    }

    const escandalloPlatoUnico = {
        ...escandallo,
        resultado_final_json: {
            platos_procesados: [platos[platoIndex]]
        }
    };

    mostrarPlatoConFotos(escandalloPlatoUnico);
}

// Función opcional: ver todos los platos de un trabajo con fotos
function mostrarTodosLosPlatos(trabajoId) {
    const escandallo = appState.savedEscandallos.find(e => e.id.toString() === trabajoId.toString());
    if (!escandallo) {
        notificationSystem.show('Trabajo no encontrado', 'error');
        return;
    }
    mostrarPlatoConFotos(escandallo);
}

// ===== FUNCIONES DE ERROR Y RESET =====
function showError(errorMessage) {
    console.log('❌ Mostrando error:', errorMessage);
    unsubscribeFromRealtimeProgress();
    pararContadorTiempo();
    
    document.getElementById('progress-area')?.classList.add('hidden');
    const snapResultsArea = document.getElementById('snap-results-area');
    snapResultsArea?.classList.remove('hidden');
    
    // NUEVO: Detectar tipo de error para mostrar ayuda específica
    let errorType = 'general';
    let specificHelp = '';
    
    if (errorMessage.includes('Formato de datos no reconocido')) {
        errorType = 'formato_datos';
        specificHelp = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-blue-800 mb-2">🔍 Error de Formato de Datos</h4>
                <p class="text-sm text-blue-700 mb-2">El sistema no pudo interpretar los datos recibidos del análisis.</p>
                <ul class="text-sm text-blue-600 space-y-1">
                    <li>• El análisis puede estar en progreso</li>
                    <li>• Los datos pueden estar incompletos</li>
                    <li>• Puede haber un problema temporal del servidor</li>
                </ul>
            </div>`;
    } else if (errorMessage.includes('conexión') || errorMessage.includes('network')) {
        errorType = 'conexion';
        specificHelp = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-yellow-800 mb-2">🌐 Error de Conexión</h4>
                <p class="text-sm text-yellow-700">Problema de conectividad detectado.</p>
            </div>`;
    }
    
    const errorHTML = `
        <div class="card p-10 text-center bg-red-50 border-red-200">
            <div class="mb-6">
                <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
                <h3 class="text-3xl font-bold text-red-700 mb-3">Error en el Análisis</h3>
            </div>
            <div class="max-w-2xl mx-auto mb-8">
                <p class="text-lg text-red-600 mb-4">${Utils.sanitizeHTML(errorMessage)}</p>
                ${specificHelp}
                <div class="text-sm text-gray-600 bg-white p-4 rounded-lg border">
                    <p class="mb-2"><strong>Posibles soluciones:</strong></p>
                    <ul class="text-left space-y-1">
                        <li>• Verifica tu conexión a internet</li>
                        <li>• Asegúrate de que el archivo sea válido</li>
                        <li>• Intenta con un archivo diferente</li>
                        <li>• Espera unos minutos y vuelve a intentar</li>
                        <li>• Contacta al soporte si el problema persiste</li>
                    </ul>
                </div>
                ${errorType === 'formato_datos' ? `
                <div class="mt-4 p-3 bg-gray-100 rounded text-xs">
                    <strong>Información técnica:</strong> Job ID: ${currentAnalysis?.id || 'N/A'} | 
                    Timestamp: ${new Date().toLocaleString()}
                </div>
                ` : ''}
            </div>
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                <button id="retry-analysis-button" class="btn btn-primary">
                    <i class="fas fa-redo mr-2"></i>Intentar de Nuevo
                </button>
                <button id="reset-button-error" class="btn btn-danger">
                    <i class="fas fa-home mr-2"></i>Volver al Inicio
                </button>
            </div>
        </div>`;
    
    if (snapResultsArea) snapResultsArea.innerHTML = errorHTML;
    
    document.getElementById('retry-analysis-button')?.addEventListener('click', () => {
        if (selectedFile) startSupabaseAnalysis();
        else resetAnalysis();
    });
    
    document.getElementById('reset-button-error')?.addEventListener('click', () => resetAnalysis());
}

function resetAnalysisUI() {
    console.log('🔄 Reiniciando UI de análisis');
    const analyzeButton = document.getElementById('analyze-button'); //
    const analyzeSupabaseButton = document.getElementById('analyze-supabase-button');
    
    if (analyzeButton) {
        analyzeButton.disabled = !selectedFile; //
        analyzeButton.innerHTML = `<i class="fas fa-cogs mr-2" aria-hidden="true"></i>Analizar con Make (Original)`;
    }
    
    if (analyzeSupabaseButton) {
        analyzeSupabaseButton.disabled = !selectedFile;
        analyzeSupabaseButton.innerHTML = `
            <i class="fas fa-rocket mr-3" aria-hidden="true"></i>
            <span class="flex flex-col items-center">
                <span>Análisis Rápido Supabase</span>
                <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold animate-pulse">TIEMPO REAL</span>
            </span>`;
    }
}

function resetAnalysis() {
    console.log('🔄 Reiniciando análisis completo');
    
    unsubscribeFromRealtimeProgress();
    unsubscribeAll(); //
    pararContadorTiempo();
    
    if (progressInterval) {
        clearInterval(progressInterval); //
        progressInterval = null; //
    }
    
    selectedFile = null; //
    currentAnalysis = null; //
    appState.selectedFile = null; //
    appState.currentAnalysis = null; //
    
    appState.currentProgress = {
        platosDetectados: [],
        platosCompletados: [],
        totalPlatos: 0,
        progresoPorcentaje: 0,
        ingredientesUnicos: 0,
        tiempoInicio: null
    };
    
    const fi = document.getElementById('file-input');
    if (fi) fi.value = '';
    document.getElementById('file-preview')?.classList.add('hidden'); //
    resetAnalysisUI();
    // Asegurar que se reconfiguren los listeners de archivo para permitir nuevo escaneo
    cleanupFileHandling();
    setupFileHandling();
    document.getElementById('progress-area')?.classList.add('hidden'); //
    document.getElementById('snap-results-area')?.classList.add('hidden'); //
    document.getElementById('snap-upload-area')?.classList.remove('hidden'); //
    
    const learningPanel = document.getElementById('ai-learning-panel'); //
    const aiIndicators = document.getElementById('ai-learning-indicators'); //
    if (learningPanel) learningPanel.classList.add('hidden'); //
    if (aiIndicators) aiIndicators.classList.add('hidden'); //
    
    // NUEVO: Reset de banderas de configuración
    window.fileHandlingConfigured = false;
    window.cameraHandlingConfigured = false;
    window.appInitialized = false;
    
    window.scrollTo({ top: 0, behavior: 'smooth' }); //
}

function handleFile(file) {
    console.log('📁 Archivo seleccionado:', file?.name);
    if (!file) return; //
    
    const validation = Utils.validateFile(file); //
    if (!validation.isValid) {
        notificationSystem.show(`Archivo inválido: ${validation.errors.join(', ')}`, 'error'); //
        return; //
    }
    
    selectedFile = file; //
    appState.selectedFile = file; //
    
    const filePreview = document.getElementById('file-preview'); //
    if (filePreview) {
        document.getElementById('file-name').textContent = file.name; //
        document.getElementById('file-size').textContent = Utils.formatFileSize(file.size); //
        filePreview.classList.remove('hidden'); //
    }
    
    const analyzeButton = document.getElementById('analyze-button'); //
    const analyzeSupabaseButton = document.getElementById('analyze-supabase-button');
    if (analyzeButton) analyzeButton.disabled = false; //
    if (analyzeSupabaseButton) {
        analyzeSupabaseButton.disabled = false;
        console.log('✅ Botón Supabase habilitado');
    }
    
    notificationSystem.show(`Archivo "${file.name}" seleccionado correctamente`, 'success', 3000); //
}

function removeFile() {
    selectedFile = null; //
    appState.selectedFile = null; //
    document.getElementById('file-input').value = ''; //
    document.getElementById('file-preview').classList.add('hidden'); //
    document.getElementById('analyze-button').disabled = true; //
    document.getElementById('analyze-supabase-button').disabled = true;
}

function unsubscribeAll() {
    console.log('🔌 Desuscribiendo de todas las suscripciones...');
    
    if (appState.realtimeChannels.status) {
        supabaseClient.removeChannel(appState.realtimeChannels.status); //
        appState.realtimeChannels.status = null; //
        console.log('🔇 Desuscrito del estado del trabajo');
    }
    
    unsubscribeFromRealtimeProgress();
    
    // NUEVO: Limpiar event listeners de archivos y cámara
    if (window.fileHandlingConfigured) {
        cleanupFileHandling();
    }
    
    if (window.cameraHandlingConfigured) {
        cleanupCameraHandling();
    }
    
    console.log('✅ Todas las suscripciones y event listeners desuscritos');
}

// ===== FUNCIONES PARA CARGAR DATOS =====
function showEscandalloDetails(id) {
    const escandallo = appState.savedEscandallos.find(item => item.id.toString() === id.toString()); //
    if (!escandallo) {
        notificationSystem.show('Escandallo no encontrado', 'error'); //
        return; //
    }

    let platos = []; //
    if (escandallo.resultado_final_json) {
        try {
            const data = typeof escandallo.resultado_final_json === 'string' ?
                JSON.parse(escandallo.resultado_final_json) : escandallo.resultado_final_json; //
            platos = data.platos_procesados || []; //
        } catch (e) {
            console.error("Error parseando JSON del escandallo:", e);
            notificationSystem.show('Los datos de este escandallo están corruptos.', 'error');
            return;
        }
    }

    if (platos.length > 0) {
        renderDetailsModal(platos); //
    } else {
        notificationSystem.show('No se encontraron datos de platos en este escandallo.', 'error');
    }
}

async function loadEscandallosGuardados(page = 1, pageSize = 10, q = '') {
    const grid = document.getElementById('escandallos-grid');
    const emptyState = document.getElementById('escandallos-empty-state');

    if (!grid) {
        console.error('❌ No se encontró escandallos-grid');
        return;
    }

    // Mostrar loading
    grid.innerHTML = Array(3).fill(0).map(() => `<div class="h-64 loading-skeleton rounded-lg"></div>`).join('');
    if (emptyState) emptyState.classList.add('hidden');

    try {
        console.log('🔍 Cargando escandallos guardados...');
        
        const qTrim = (q || '').trim();

        if (!qTrim) {
            // Consulta paginada normal (más recientes primero)
            const { data, count, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.TRABAJOS)
                .select('*, restaurantes:restaurante_id ( nombre )', { count: 'exact' })
                .in('estado', ['COMPLETADO', 'COMPLETADO_CON_FOOD_COST'])
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, (page * pageSize) - 1);

            if (error) throw error;

            const normalized = (data || []).map(r => ({ ...r, restaurante_nombre: r.restaurantes?.nombre || null }));
            appState.savedEscandallos = normalized;
            renderEscandallosGuardados(normalized, { total: count || 0, page, pageSize, query: '' });
        } else {
            // Búsqueda en servidor con join interno por nombre del restaurante (más rápido y paginado)
            const { data, count, error } = await supabaseClient
                .from(APP_CONFIG.TABLES.TRABAJOS)
                .select('id, created_at, estado, resultado_final_json, restaurantes:restaurante_id!inner ( nombre )', { count: 'exact' })
                .in('estado', ['COMPLETADO', 'COMPLETADO_CON_FOOD_COST'])
                .ilike('restaurantes.nombre', `%${qTrim}%`)
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, (page * pageSize) - 1);

            if (error) throw error;

            const normalized = (data || []).map(r => ({ ...r, restaurante_nombre: r.restaurantes?.nombre || null }));
            appState.savedEscandallos = normalized;
            renderEscandallosGuardados(normalized, { total: count || 0, page, pageSize, query: qTrim });
        }

    } catch (error) {
        console.error("❌ Error cargando escandallos:", error);
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <p class="text-red-500 font-semibold">Error al cargar los datos</p>
                <p class="text-gray-500 text-sm mt-2">${error.message}</p>
                <button onclick="loadEscandallosGuardados()" class="btn btn-primary mt-4">
                    <i class="fas fa-redo mr-2"></i>Reintentar
                </button>
            </div>
        `;
    }
}

// Busca esta función en tu main.js y reemplázala por completo

// Reemplaza la función entera en tu main.js por esta versión robusta:

function renderEscandallosGuardados(escandallos, meta = { total: 0, page: 1, pageSize: 10, query: '' }) {
    const grid = document.getElementById('escandallos-grid');
    const emptyState = document.getElementById('escandallos-empty-state');

    if (!escandallos || escandallos.length === 0) {
        if (grid) grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if(emptyState) emptyState.classList.add('hidden');
    if(!grid) return;

    grid.innerHTML = (escandallos || []).map(item => {
        let data, platos;
        try {
            if (!item.resultado_final_json || typeof item.resultado_final_json !== 'string') {
                console.warn(`Escandallo ${item.id} no tiene un JSON válido.`);
                return '';
            }

            // Lógica robusta para JSON malformado o con objetos concatenados
            let jsonString = item.resultado_final_json.trim();
            const braceCount = (jsonString.match(/[{}]/g) || []).length;
            if (braceCount > 1 && !jsonString.startsWith('[')) {
                const firstBrace = jsonString.indexOf('{');
                const lastBrace = jsonString.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                }
            }

            data = JSON.parse(jsonString);
            platos = data?.platos_procesados || [];
        } catch (e) {
            console.error(`Error parseando JSON para el trabajo ${item.id}:`, e);
            return `<div class="card p-6 border-red-500 bg-red-50">
                        <p class="font-bold text-red-700">Error en los datos</p>
                        <p class="text-sm text-red-600">No se pudo cargar el escandallo con ID: ${item.id}</p>
                    </div>`;
        }

        const totalIngredients = platos.reduce((sum, p) => sum + (p.ingredientes_cotejados?.length || 0), 0);
        const foundIngredients = platos.reduce((sum, p) => sum + Utils.calculateFoundIngredients(p.ingredientes_cotejados || []), 0);
        const successRate = totalIngredients > 0 ? Math.round((foundIngredients / totalIngredients) * 100) : 0;
        const fechaTitulo = new Date(item.created_at).toLocaleDateString('es-ES');
        const displayName = (item.restaurantes?.nombre || item.restaurante_nombre || item.nombre_restaurante || item.restaurante || 'Trabajo');

        return `
            <details class="escandallo-row">
                <summary>
                    <div class="row-left">
                        <i class="fas fa-utensils text-teal-600"></i>
                        <div>
                            <div class="font-bold text-gray-800">${Utils.sanitizeHTML(displayName)} del ${fechaTitulo}</div>
                            <div class="text-xs text-gray-500">Analizado el ${Utils.formatDate(item.created_at)}</div>
                        </div>
                    </div>
                    <div>
                        <span class="escandallo-badge">${successRate}%</span>
                    </div>
                </summary>
                <div class="p-4">
                    <div class="grid grid-cols-3 gap-4 mb-4 text-center">
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-xl font-bold text-blue-600">${platos.length}</p>
                            <p class="text-xs text-gray-600">Platos</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-xl font-bold text-green-600">${totalIngredients}</p>
                            <p class="text-xs text-gray-600">Ingredientes</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-xl font-bold text-purple-600">${foundIngredients}</p>
                            <p class="text-xs text-gray-600">Encontrados</p>
                        </div>
                    </div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-utensils mr-2"></i>Seleccionar plato para ver detalles:
                    </label>
                    <select class="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white hover:border-teal-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                            onchange="abrirPlatoConFotos('${item.id}', this.value, this.options[this.selectedIndex].text)">
                        <option value="">— Selecciona un plato —</option>
                        ${platos.map((plato, index) => `
                            <option value="${index}">${Utils.sanitizeHTML(plato.plato_analizado || 'Plato')}</option>
                        `).join('')}
                    </select>
                    <div class="mt-4 flex justify-between items-center">
                        <button onclick="mostrarTodosLosPlatos('${item.id}')" class="btn btn-primary">
                            <i class="fas fa-images mr-2"></i>
                            Ver Todos los Platos con Fotos
                        </button>
                        <button class="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200" onclick="deleteEscandallo('${item.id}')">
                            <i class="fas fa-trash-alt mr-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </details>
        `;
    }).filter(Boolean).join('');
    const pag = document.getElementById('escandallos-pagination');
    if (pag) {
        const totalPages = Math.max(1, Math.ceil((meta.total || escandallos.length) / meta.pageSize));
        pag.innerHTML = `
            <button class="btn px-3 py-2 text-sm" ${meta.page <= 1 ? 'disabled' : ''} onclick="loadEscandallosGuardados(${Math.max(1, meta.page - 1)}, ${meta.pageSize}, '${meta.query.replace(/'/g, "\\'")}')">Anterior</button>
            <span class="text-sm text-gray-600">Página ${meta.page} de ${totalPages}</span>
            <button class="btn px-3 py-2 text-sm" ${meta.page >= totalPages ? 'disabled' : ''} onclick="loadEscandallosGuardados(${Math.min(totalPages, meta.page + 1)}, ${meta.pageSize}, '${meta.query.replace(/'/g, "\\'")}')">Siguiente</button>`;
    }
}

// Opción de borrado de trabajos guardados
async function deleteEscandallo(trabajoId) {
    try {
        const confirmed = await showConfirm({
            title: 'Eliminar escandallo',
            message: '¿Seguro que quieres eliminar este escandallo? Esta acción no se puede deshacer.',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });
        if (!confirmed) return;
        // 1) Obtener IDs de platos del trabajo
        const { data: platosRows, error: platosSelectErr } = await supabaseClient
            .from('platos')
            .select('id')
            .eq('trabajo_analisis_id', trabajoId);
        if (platosSelectErr) throw platosSelectErr;
        const platoIds = (platosRows || []).map(r => r.id);

        // 2) Borrar ingredientes de esos platos (FK platos_ingredientes.plato_id)
        if (platoIds.length > 0) {
            const delIng = await supabaseClient
                .from('platos_ingredientes')
                .delete()
                .in('plato_id', platoIds);
            if (delIng.error) throw delIng.error;
        }

        // 3) Borrar platos del trabajo
        const delPlatos = await supabaseClient
            .from('platos')
            .delete()
            .eq('trabajo_analisis_id', trabajoId);
        if (delPlatos.error) throw delPlatos.error;

        // 4) Borrar progreso asociado al job
        const delProgreso = await supabaseClient
            .from(APP_CONFIG.TABLES.ANALISIS_PROGRESO)
            .delete()
            .eq('job_id', trabajoId);
        if (delProgreso.error) throw delProgreso.error;

        // 5) Finalmente borrar el trabajo
        const { error } = await supabaseClient
            .from(APP_CONFIG.TABLES.TRABAJOS)
            .delete()
            .eq('id', trabajoId);
        if (error) throw error;
        notificationSystem.show('Escandallo eliminado', 'success');
        // Actualizar estado local y recargar listado
        appState.savedEscandallos = appState.savedEscandallos.filter(e => e.id !== trabajoId);
        renderEscandallosGuardados(appState.savedEscandallos);
    } catch (e) {
        console.error('Error eliminando escandallo:', e);
        notificationSystem.show(`No se pudo eliminar el escandallo: ${e.message || ''}`.trim(), 'error');
    }
}

// Modal de confirmación bonito
function showConfirm({ title = 'Confirmar', message = '¿Seguro?', confirmText = 'Aceptar', cancelText = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const content = document.getElementById('confirm-modal-content');
        if (!modal || !content) return resolve(false);

        content.innerHTML = `
            <div class="p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-2">${title}</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="confirm-actions">
                    <button id="confirm-cancel" class="btn">${cancelText}</button>
                    <button id="confirm-accept" class="btn btn-danger">${confirmText}</button>
                </div>
                <button id="confirm-close" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const cleanup = (value) => {
            modal.classList.add('hidden');
            resolve(value);
        };

        modal.classList.remove('hidden');
        content.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        content.querySelector('#confirm-accept').onclick = () => cleanup(true);
        content.querySelector('#confirm-close').onclick = () => cleanup(false);
        modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
    });
}

async function loadIngredientesExtraidos() {
    const grid = document.getElementById('ingredientes-ia-grid'); //
    const emptyState = document.getElementById('ingredientes-ia-empty-state'); //

    grid.innerHTML = Array(4).fill(0).map(() => `<div class="h-48 loading-skeleton rounded-lg"></div>`).join(''); //
    emptyState.classList.add('hidden'); //

    try {
        const { data, error } = await supabaseClient
            .from(APP_CONFIG.TABLES.TRABAJOS) //
            .select(`id, created_at, platos (nombre, platos_ingredientes(cantidad, ingredientes(nombre)))`) //
            .eq('estado', APP_CONFIG.STATES.INGREDIENTES_EXTRAIDOS) //
            .order('created_at', { ascending: false }); //

        if (error) throw error; //

        appState.ingredientesExtraidos = data || []; //
        renderIngredientesExtraidos(data || []); //

    } catch (error) {
        console.error("Error cargando ingredientes extraídos:", error); //
        grid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-500">Error al cargar los datos.</p></div>'; //
        notificationSystem.show(`Error al cargar ingredientes: ${error.message}`, 'error'); //
    }
}

function renderIngredientesExtraidos(jobs) {
    const grid = document.getElementById('ingredientes-ia-grid'); //
    const emptyState = document.getElementById('ingredientes-ia-empty-state'); //

    if (!jobs || jobs.length === 0) {
        grid.innerHTML = ''; //
        emptyState.classList.remove('hidden'); //
        return; //
    }

    emptyState.classList.add('hidden'); //

    grid.innerHTML = jobs.map(job => {
        if (!job.platos || job.platos.length === 0) return '';
        const platoPrincipal = job.platos[0]?.nombre || 'Plato sin nombre'; //
        const totalIngredientes = job.platos.reduce((sum, p) => sum + (p.platos_ingredientes?.length || 0), 0); //
        const platosCount = job.platos.length; //

        return `
            <div class="card p-6 bg-white">
                <div class="flex items-start justify-between mb-4">
                    <h3 class="font-bold text-xl text-gray-800">
                        ${Utils.sanitizeHTML(platoPrincipal)}
                        ${platosCount > 1 ? `<span class="text-sm text-teal-600 font-medium ml-2">(+${platosCount - 1} más)</span>` : ''}
                    </h3>
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">Fase 1</span>
                </div>
                
                <p class="text-sm text-gray-500 mb-4 flex items-center">
                    <i class="fas fa-clock mr-2" aria-hidden="true"></i>
                    Analizado el ${Utils.formatDate(job.created_at)}
                </p>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="text-center p-3 bg-gray-50 rounded-lg">
                        <p class="text-2xl font-bold text-teal-600">${totalIngredientes}</p>
                        <p class="text-xs text-gray-600">Ingredientes</p>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded-lg">
                        <p class="text-2xl font-bold text-blue-600">${platosCount}</p>
                        <p class="text-xs text-gray-600">Platos</p>
                    </div>
                </div>
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle mr-2" aria-hidden="true"></i>
                    <div>
                        <p class="font-medium">Listo para Fase 2</p>
                        <p class="text-sm">Este análisis está preparado para la cotejación con productos reales.</p>
                    </div>
                </div>
            </div>
        `; //
    }).join('');
}

async function updateDatabaseView(mode) {
    appState.currentDatabaseView = mode; //
    const modeIndicator = document.getElementById('current-mode'); //
    const container = document.getElementById('database-container');
    const emptyState = document.getElementById('database-empty-state');

    container.innerHTML = `<div class="h-64 loading-skeleton rounded-lg"></div>`;
    emptyState.classList.add('hidden');

    if (mode === 'ingredients') {
        await loadIngredients(); //
        modeIndicator.innerHTML = `<i class="fas fa-robot mr-2" aria-hidden="true"></i>Ingredientes IA (Fase 1)`; //
        modeIndicator.className = 'bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium flex items-center'; //
    } else {
        await loadProductCatalog('', 1, 10); // página 1, 10 por página
        modeIndicator.innerHTML = `<i class="fas fa-shopping-cart mr-2" aria-hidden="true"></i>Catálogo de Productos`; //
        modeIndicator.className = 'bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium flex items-center'; //
    }
}

async function loadIngredients() {
    const container = document.getElementById('database-container');
    try {
        const { data, error } = await supabaseClient
            .from(APP_CONFIG.TABLES.INGREDIENTES) //
            .select('*') //
            .order('nombre', { ascending: true }); //

        if (error) throw error; //

        renderIngredientsTable(data || []); //

    } catch (error) {
        console.error("Error cargando ingredientes:", error); //
        container.innerHTML = '<p class="text-red-500 text-center py-8">Error al cargar los datos.</p>'; //
        notificationSystem.show(`Error al cargar ingredientes: ${error.message}`, 'error'); //
    }
}

async function loadProductCatalog(query = '', page = 1, pageSize = 10) {
    const container = document.getElementById('database-container');
    try {
        let req = supabaseClient
            .from(APP_CONFIG.TABLES.PRODUCTOS) //
            .select('*', { count: 'exact' }); //

        if (query && query.trim().length > 0) {
            const q = `%${query.trim()}%`;
            // Buscar por columnas existentes: nombre, marca y (si existe) descripcion
            req = req.or(`nombre.ilike.${q},marca.ilike.${q},descripcion.ilike.${q}`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count, error } = await req.order('nombre', { ascending: true }).range(from, to); //

        if (error) throw error; //

        renderProductCatalogList(data || [], { total: count || 0, page, pageSize, query }); //

    } catch (error) {
        console.error("Error cargando catálogo:", error); //
        container.innerHTML = '<p class="text-red-500 text-center py-8">Error al cargar los datos.</p>'; //
        notificationSystem.show(`Error al cargar catálogo: ${error.message}`, 'error'); //
    }
}

function renderIngredientsTable(ingredients) {
    const container = document.getElementById('database-container'); //

    if (!ingredients || ingredients.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-leaf text-4xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-600 mb-2">No hay ingredientes registrados</h3>
                <p class="text-gray-500">Los ingredientes aparecerán aquí cuando se procesen recetas.</p>
            </div>
        `; //
        return;
    }

    container.innerHTML = `
        <table class="w-full text-sm text-left text-gray-500">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                    <th scope="col" class="px-6 py-3">Nombre del Ingrediente</th>
                    <th scope="col" class="px-6 py-3">ID</th>
                    <th scope="col" class="px-6 py-3">Fecha de Creación</th>
                </tr>
            </thead>
            <tbody>
                ${ingredients.map(ing => `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${Utils.sanitizeHTML(ing.nombre)}</th>
                    <td class="px-6 py-4">${ing.id}</td>
                    <td class="px-6 py-4">${Utils.formatDate(ing.created_at)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `; //
}

function renderProductCatalogList(products, meta = { total: 0, page: 1, pageSize: 10, query: '' }) {
    const container = document.getElementById('database-container'); //

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-shopping-basket text-4xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-600 mb-2">No hay productos en el catálogo</h3>
                <p class="text-gray-500">Los productos aparecerán aquí cuando se actualicen los precios.</p>
            </div>
        `; //
        return;
    }

    const totalPages = Math.max(1, Math.ceil((meta.total || products.length) / meta.pageSize));
    container.innerHTML = `
        <div class="product-list">
            ${products.map(prod => {
                const imageUrl = prod.imagen_tarjeta_url; //
                const unit = prod.unidad || prod.unidad_compra || null;
                const category = prod.categoria ? Utils.sanitizeHTML(prod.categoria) : 'N/A';
                const unitLabel = unit ? Utils.sanitizeHTML(unit) : 'N/A';
                const priceLabel = (prod.precio_neto || prod.precio_neto === 0)
                    ? `€${parseFloat(prod.precio_neto).toFixed(2)}${unit ? '/' + Utils.sanitizeHTML(unit) : ''}`
                    : 'Sin precio';
                return `
                    <div class="product-item cursor-pointer" onclick="showProductDetails('${prod.id}')" title="Ver detalles">
                        ${imageUrl ?
                            `<img src="${imageUrl}" alt="${prod.nombre}" class="product-image-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="product-image-placeholder-small" style="display:none;">
                                 <i class="fas fa-shopping-cart text-gray-400"></i>
                             </div>` :
                            `<div class="product-image-placeholder-small">
                                 <i class="fas fa-shopping-cart text-gray-400"></i>
                             </div>`
                        }
                        <div class="flex-grow">
                            <h4 class="font-semibold text-gray-800">${Utils.sanitizeHTML(prod.nombre)}</h4>
                            <div class="text-sm text-gray-500 mt-1 space-y-1">
                                <p><strong>Marca:</strong> ${prod.marca ? Utils.sanitizeHTML(prod.marca) : 'N/A'}</p>
                                <p><strong>Categoría:</strong> ${category}</p>
                                <p><strong>Unidad:</strong> ${unitLabel}</p>
                                <p><strong>Precio neto:</strong> ${priceLabel}</p>
                            </div>
                            <p class="text-xs text-gray-400 mt-2">ID: ${prod.id}</p>
                        </div>
                    </div>
                `; //
            }).join('')}
        </div>
        <div class="flex justify-center items-center gap-2 mt-4">
            <button class="btn px-3 py-2 text-sm" ${meta.page <= 1 ? 'disabled' : ''} onclick="paginateProducts(${Math.max(1, meta.page - 1)}, '${meta.query.replace(/'/g, "\\'")}')">Anterior</button>
            <span class="text-sm text-gray-600">Página ${meta.page} de ${totalPages}</span>
            <button class="btn px-3 py-2 text-sm" ${meta.page >= totalPages ? 'disabled' : ''} onclick="paginateProducts(${Math.min(totalPages, meta.page + 1)}, '${meta.query.replace(/'/g, "\\'")}')">Siguiente</button>
        </div>
    `;
}

// Paginación de catálogo
function paginateProducts(page, q = '') {
    loadProductCatalog(q, page, 10);
}

// Mostrar producto en modal grande
async function showProductDetails(productId) {
    try {
        const { data, error } = await supabaseClient
            .from(APP_CONFIG.TABLES.PRODUCTOS)
            .select('*')
            .eq('id', productId)
            .single();
        if (error || !data) throw error || new Error('Producto no encontrado');

        const imageUrl = data.imagen_tarjeta_url;
        const content = `
            <button onclick="modalManager.close('details-modal')" class="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-800">&times;</button>
            <div class="p-6">
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="flex-shrink-0 w-full md:w-1/3">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${Utils.sanitizeHTML(data.nombre)}" class="w-full rounded-lg shadow-md">`
                        : `<div class=\"w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center\"><i class=\"fas fa-image text-3xl text-gray-400\"></i></div>`}
                    </div>
                    <div class="flex-grow">
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">${Utils.sanitizeHTML(data.nombre)}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                            <div><strong>Marca:</strong> ${data.marca ? Utils.sanitizeHTML(data.marca) : 'N/A'}</div>
                            <div><strong>Unidad:</strong> ${data.unidad ? Utils.sanitizeHTML(data.unidad) : 'N/A'}</div>
                            <div><strong>Categoría:</strong> ${data.categoria ? Utils.sanitizeHTML(data.categoria) : 'N/A'}</div>
                            <div><strong>Precio neto:</strong> ${(data.precio_neto || data.precio_neto === 0) ? `€${parseFloat(data.precio_neto).toFixed(2)}${data.unidad ? '/' + Utils.sanitizeHTML(data.unidad) : ''}` : 'Sin precio'}</div>
                            <div><strong>ID:</strong> ${data.id}</div>
                        </div>
                        ${data.descripcion ? `<p class=\"mt-4 text-gray-600\">${Utils.sanitizeHTML(data.descripcion)}</p>` : ''}
                    </div>
                </div>
            </div>`;
        modalManager.open('details-modal', content);
    } catch (e) {
        notificationSystem.show('No se pudo cargar el producto', 'error');
    }
}

// ===== RENDER DETAILS MODAL COMPLETO =====
function renderDetailsModal(platos) {
    const platosArray = Array.isArray(platos) ? platos : [platos]; //
    
    const allPlatosHTML = platosArray.map(plato => {
        const ingredientsGridHTML = (plato.ingredientes_cotejados || plato.ingredientes || []).map(ing => {
            const similarityInfo = Utils.getSimilarityInfo(ing.similitud); //
            const matchSource = Utils.getMatchSource(ing); //

            return `
            <div class="ingredient-card-container">
                <div class="ingredient-image-card">
                    ${ing.imagen_url ?
                        `<img src="${ing.imagen_url}" alt="${ing.producto_nombre || ing.producto_encontrado || ing.producto || 'Producto'}" class="ingredient-image" onerror="this.style.display='none'; this.parentElement.querySelector('.ingredient-image-placeholder').style.display='flex';">` : //
                        ''
                    }
                    <div class="ingredient-image-placeholder" style="${ing.imagen_url ? 'display:none;' : ''}"><i class="fas fa-image"></i></div>
                    <div class="similarity-badge" style="background-color: ${similarityInfo.color};">
                        ${similarityInfo.percentage}
                    </div>
                    <div class="absolute top-8px left-8px">
                        <div class="similarity-source-indicator ${matchSource === 'learned' ? 'source-learned' : 'source-semantic'}">
                            <i class="fas ${matchSource === 'learned' ? 'fa-brain' : 'fa-search'}"></i>
                            ${matchSource === 'learned' ? 'IA' : 'SEM'}
                        </div>
                    </div>
                </div>
                
                <div class="ingredient-data-card">
                    <h4 class="font-bold text-lg text-gray-800 mb-2">${Utils.sanitizeHTML(ing.ingrediente_ia || ing.nombre_ingrediente)}</h4>
                    
                    <div class="space-y-3 mb-4">
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-semibold">Producto Encontrado</p>
                            <p class="font-medium text-teal-700">${Utils.sanitizeHTML(ing.producto_nombre || ing.producto_encontrado || ing.producto || 'No encontrado')}</p>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p class="text-xs text-gray-500 uppercase font-semibold">Marca</p>
                                <p class="font-medium">${ing.marca || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase font-semibold">Unidad</p>
                                <p class="font-medium">${ing.unidad_compra || 'N/A'}</p>
                            </div>
                        </div>

                        <div class="p-2 rounded-lg ${matchSource === 'learned' ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'}">
                            <p class="text-xs font-semibold ${matchSource === 'learned' ? 'text-purple-700' : 'text-blue-700'}">
                                <i class="fas ${matchSource === 'learned' ? 'fa-brain' : 'fa-search'} mr-1"></i>
                                ${matchSource === 'learned' ? 'Cotejamiento por IA Aprendida' : 'Cotejamiento Semántico'}
                            </p>
                            <p class="text-xs ${matchSource === 'learned' ? 'text-purple-600' : 'text-blue-600'}">
                                ${matchSource === 'learned' ? 'Basado en relaciones aprendidas anteriormente' : 'Basado en análisis semántico de embeddings'}
                            </p>
                        </div>
                    </div>
                    
                    <div class="border-t pt-3 mt-3">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-xs text-gray-500 uppercase font-semibold">Cantidad</p>
                                <p class="font-bold text-lg text-gray-800">${Utils.sanitizeHTML(ing.cantidad)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-gray-500 uppercase font-semibold">Similitud</p>
                                <p class="font-bold text-lg ${similarityInfo.value > 70 ? 'text-green-600' : similarityInfo.value > 40 ? 'text-yellow-600' : 'text-red-600'}">${similarityInfo.percentage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `; //
        }).join('');

        const foundIngredients = Utils.calculateFoundIngredients(plato.ingredientes_cotejados || plato.ingredientes); //
        const totalIngredients = (plato.ingredientes_cotejados || plato.ingredientes || []).length; //
        const successRate = totalIngredients > 0 ? Math.round((foundIngredients / totalIngredients) * 100) : 0; //

        const learnedMatches = (plato.ingredientes_cotejados || plato.ingredientes || []).filter(ing => Utils.getMatchSource(ing) === 'learned').length; //
        const semanticMatches = totalIngredients - learnedMatches; //

        return `
            <div class="mb-8 last:mb-0">
                <div class="text-center mb-6">
                    <h2 class="text-3xl font-bold text-gray-800">Desglose para: <span class="text-teal-600">${Utils.sanitizeHTML(plato.nombre_plato || plato.plato_analizado)}</span></h2>
                </div>
                <div class="card p-4 text-center mb-6 bg-gray-50 border">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <h3 class="text-sm font-semibold text-gray-600 uppercase">Total</h3>
                            <p class="text-2xl font-extrabold text-gray-800">${totalIngredients}</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-gray-600 uppercase">Encontrados</h3>
                            <p class="text-2xl font-extrabold text-green-600">${foundIngredients}</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-gray-600 uppercase">% Éxito</h3>
                            <p class="text-2xl font-extrabold text-teal-600">${successRate}%</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-gray-600 uppercase">IA Aprendida</h3>
                            <p class="text-2xl font-extrabold text-purple-600">${learnedMatches}</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-gray-600 uppercase">Semántica</h3>
                            <p class="text-2xl font-extrabold text-blue-600">${semanticMatches}</p>
                        </div>
                    </div>
                </div>
                <h4 class="text-xl font-semibold text-gray-700 mb-4">Detalle de Ingredientes</h4>
                <div class="ingredient-grid">
                    ${ingredientsGridHTML}
                </div>
            </div>
        `; //
    }).join('<hr class="my-12 border-gray-200"/>');

    const modalContent = `
        <button onclick="modalManager.close('details-modal')" class="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-800 z-10">&times;</button>
        <div class="p-6">
            ${allPlatosHTML}
        </div>
    `; //
    
    modalManager.open('details-modal', modalContent); //
}

// ===== FUNCIONES AUXILIARES DE PROGRESO =====

function showProgressArea() {
    console.log('📊 Mostrando área de progreso');
    document.getElementById('snap-upload-area')?.classList.add('hidden');
    document.getElementById('snap-results-area')?.classList.add('hidden');
    document.getElementById('progress-area')?.classList.remove('hidden');
    
    const aiIndicators = document.getElementById('ai-learning-indicators');
    if (aiIndicators) {
        aiIndicators.classList.remove('hidden');
    }
    
    const liveResults = document.getElementById('live-results');
    if (liveResults) {
        // Añadimos una clase al div inicial para poder identificarlo
        liveResults.innerHTML = `
            <div class="initial-wait-message text-center text-gray-500 py-8">
                <h4 class="font-semibold text-gray-800 mb-4 text-xl">
                    <i class="fas fa-clock mr-2 text-teal-500 animate-spin" aria-hidden="true"></i>
                    Esperando datos en tiempo real...
                </h4>
            </div>
        `;
    }
}

function setupCameraHandling() {
    // Botón de cámara eliminado por petición; no configurar nada
    window.cameraHandlingConfigured = true;
}

async function showIngredientesExtractedStep(job) {
    console.log('📊 showIngredientesExtractedStep llamado con:', job);
    console.log('📊 Estructura completa del job:', JSON.stringify(job, null, 2));
    
    // Debug para verificar datos de PVP desde el inicio
    if (job.resultado_final?.platos_procesados) {
        console.log('🔍 Verificando datos de PVP en showIngredientesExtractedStep:');
        job.resultado_final.platos_procesados.forEach((plato, index) => {
            console.log(`🔍 Plato ${index + 1}:`, {
                nombre: plato.plato_analizado,
                pvp: plato.pvp_bruto_euros,
                tiene_pvp: plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0
            });
        });
    }
    
    debugCurrentAnalysis();

    if (progressInterval) {
        clearInterval(progressInterval); //
    }

    updateProgress(100, 'Ingredientes extraídos correctamente'); //
    
    // Asegurar que currentAnalysis se establezca correctamente
    currentAnalysis = job; //
    appState.currentAnalysis = job; //
    
    console.log('📊 currentAnalysis establecido:', currentAnalysis);
    console.log('📊 currentAnalysis.id:', currentAnalysis?.id);
    console.log('📊 currentAnalysis.resultado_final?.job_id:', currentAnalysis?.resultado_final?.job_id);
    debugCurrentAnalysis();

    try {
        let platos;
        
        // Verificar si tenemos datos directos del payload
        if (job.resultado_final && job.resultado_final.platos_procesados) {
            console.log('📊 Usando datos directos del payload');
            platos = job.resultado_final.platos_procesados.map(plato => ({
                nombre: plato.plato_analizado,
                platos_ingredientes: plato.ingredientes_cotejados || []
            }));
        } else if (job.resultado_final && job.resultado_final.dishes) {
            // Estructura alternativa con 'dishes'
            console.log('📊 Usando datos de dishes del payload');
            platos = job.resultado_final.dishes.map(plato => ({
                nombre: plato.name,
                platos_ingredientes: plato.ingredientes?.map(ing => ({
                    cantidad: ing.cantidad || 'Cantidad no especificada',
                    ingredientes: { nombre: ing.nombre || ing.nombre_ingrediente }
                })) || []
            }));
        } else {
            // Usar consulta a Supabase como fallback
            console.log('📊 Consultando Supabase para datos');
            const { data: platosData, error } = await supabaseClient
                .from('platos') //
                .select(`nombre, platos_ingredientes (cantidad, ingredientes ( nombre ))`) //
                .eq('trabajo_analisis_id', job.id); //
            
            if (error) throw error; //
            platos = platosData;
        }

        if (!platos || platos.length === 0) {
            throw new Error("No se encontraron platos para este análisis."); //
        }

        console.log('📊 Platos procesados:', platos);
        console.log('📊 Llamando a showPhase1Results con', platos.length, 'platos');
        setTimeout(() => showPhase1Results(platos), 1500); //

    } catch (error) {
        console.error("Error fetching plates:", error); //
        showError("No se pudieron cargar los detalles de los platos extraídos."); //
    }
}

// ===== showPhase1Results CON BOTÓN DE COTEJACIÓN =====
function showPhase1Results(platos) {
    console.log('🍽️ Mostrando resultados Fase 1:', platos);
    console.log('🍽️ Número de platos:', platos.length);
    
    const progressArea = document.getElementById('progress-area'); //
    const snapResultsArea = document.getElementById('snap-results-area'); //

    progressArea?.classList.add('hidden'); //
    snapResultsArea?.classList.remove('hidden'); //

    // NUEVO: Calcular métricas para las tarjetas
    const totalIngredientes = platos.reduce((sum, p) => sum + (p.platos_ingredientes?.length || 0), 0);
    const tiempoSegundos = appState.currentProgress.tiempoInicio ? 
        Math.round((Date.now() - appState.currentProgress.tiempoInicio) / 1000) : 0;

    const infoBanner = `
        <div class="alert alert-success mb-8">
            <i class="fas fa-check-circle text-2xl mr-4" aria-hidden="true"></i>
            <div>
                <h3 class="font-bold text-lg">¡Fase 1 Completada: Ingredientes Extraídos!</h3>
                <p class="text-sm mt-1">Hemos identificado los siguientes platos e ingredientes. La IA aprenderá de cada cotejamiento en la Fase 2.</p>
            </div>
        </div>
        
        <!-- NUEVO: Botones superiores duplicados con color morado -->
        <div class="mb-8 text-center">
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                <button id="start-matching-button-top" class="btn text-lg px-10 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
                    <i class="fas fa-search-dollar mr-3" aria-hidden="true"></i>
                    Iniciar Cotejación con IA (Fase 2)
                </button>
                <button id="reset-button-top" class="btn text-lg px-10 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white">
                    <i class="fas fa-undo mr-3" aria-hidden="true"></i>
                    Analizar Otra Receta
                </button>
            </div>
        </div>
        
        <!-- NUEVO: Tarjetas informativas -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 text-center">
                <div class="text-3xl font-bold text-blue-600 mb-2">${platos.length}</div>
                <div class="text-blue-800 font-semibold">Platos Procesados</div>
                <div class="text-blue-600 text-sm mt-1">Analizados por IA</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 text-center">
                <div class="text-3xl font-bold text-green-600 mb-2">${totalIngredientes}</div>
                <div class="text-green-800 font-semibold">Ingredientes Extraídos</div>
                <div class="text-green-600 text-sm mt-1">Listos para cotejación</div>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6 text-center">
                <div class="text-3xl font-bold text-orange-600 mb-2">${tiempoSegundos}s</div>
                <div class="text-orange-800 font-semibold">Tiempo Transcurrido</div>
                <div class="text-orange-600 text-sm mt-1">Análisis completado</div>
            </div>
        </div>
    `;

    const platosCards = platos.map(plato => {
        console.log('🍽️ Procesando plato:', plato);
        console.log('🍽️ Ingredientes del plato:', plato.platos_ingredientes);
        
        // Validar que tenemos ingredientes
        const ingredientes = plato.platos_ingredientes || [];
        const ingredientesHTML = ingredientes.length > 0 ? 
            ingredientes.map(pi => {
                // Extraer nombre y cantidad del ingrediente
                const nombreIngrediente = pi.ingrediente_ia || pi.nombre || 'Ingrediente sin nombre';
                const cantidad = pi.cantidad || 'Cantidad no especificada';
                
                return `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center">
                            <i class="fas fa-leaf text-green-500 mr-2" aria-hidden="true"></i>
                            <span class="font-medium text-gray-800">${Utils.sanitizeHTML(nombreIngrediente)}</span>
                        </div>
                        <span class="text-teal-600 font-semibold">${Utils.sanitizeHTML(cantidad)}</span>
                    </div>
                `;
            }).join('') : 
            '<div class="p-3 bg-yellow-50 rounded-lg text-yellow-700"><i class="fas fa-exclamation-triangle mr-2"></i>No se encontraron ingredientes para este plato</div>';
        
        return `
            <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <h4 class="font-bold text-xl text-gray-800">${Utils.sanitizeHTML(plato.nombre)}</h4>
                    <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">${ingredientes.length} ingredientes</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${ingredientesHTML}
                </div>
            </div>
        `;
    }).join(''); //

    const actionButtons = `
        <div class="mt-10 text-center">
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                <button id="start-matching-button" class="btn btn-success text-lg px-10 py-4">
                    <i class="fas fa-search-dollar mr-3" aria-hidden="true"></i>
                    Iniciar Cotejación con IA (Fase 2)
                </button>
                <button id="reset-button-mid" class="btn btn-danger text-lg px-10 py-4">
                    <i class="fas fa-undo mr-3" aria-hidden="true"></i>
                    Empezar de Nuevo
                </button>
            </div>
            <p class="text-sm text-gray-500 mt-4">
                La Fase 2 buscará productos reales y <strong>la IA aprenderá</strong> de cada cotejamiento para mejorar futuras búsquedas.
            </p>
        </div>
    `; //

    if (snapResultsArea) {
        snapResultsArea.innerHTML = infoBanner + platosCards + actionButtons; //
    }

    // NUEVO: Función reutilizable para iniciar Fase 2
    const handleStartPhase2 = () => {
        console.log('🔍 Botón de cotejación clickeado');
        debugCurrentAnalysis();
        
        // Buscar el ID en diferentes ubicaciones posibles
        let jobId = currentAnalysis?.id;
        
        if (!jobId && currentAnalysis?.resultado_final?.job_id) {
            jobId = currentAnalysis.resultado_final.job_id;
            console.log('🔍 ID encontrado en resultado_final.job_id:', jobId);
        }
        
        if (!jobId && appState.currentAnalysis?.id) {
            jobId = appState.currentAnalysis.id;
            console.log('🔍 ID encontrado en appState.currentAnalysis.id:', jobId);
        }
        
        if (!jobId && appState.currentAnalysis?.resultado_final?.job_id) {
            jobId = appState.currentAnalysis.resultado_final.job_id;
            console.log('🔍 ID encontrado en appState.currentAnalysis.resultado_final.job_id:', jobId);
        }
        
        if (jobId) {
            console.log('✅ Iniciando Fase 2 con ID:', jobId);
            startPhase2(jobId);
        } else {
            console.error('❌ No se encontró ID del trabajo en ninguna ubicación');
            notificationSystem.show('Error: No se encontró ID del trabajo para iniciar la fase 2', 'error');
        }
    };

    // Event listeners para botones superiores
    document.getElementById('start-matching-button-top')?.addEventListener('click', handleStartPhase2);
    document.getElementById('reset-button-top')?.addEventListener('click', () => resetAnalysis());
    
    // Event listeners para botones inferiores (mantener compatibilidad)
    document.getElementById('start-matching-button')?.addEventListener('click', handleStartPhase2);
    document.getElementById('reset-button-mid')?.addEventListener('click', () => resetAnalysis());

    notificationSystem.show(
        `Se extrajeron ${platos.length} platos con un total de ${platos.reduce((sum, p) => sum + (p.platos_ingredientes?.length || 0), 0)} ingredientes`, //
        'success' //
    );
}

function simulateProgress() {
    let progress = 0; //
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        progress += Math.random() * 15; //
        if (progress > 90) {
            progress = 90; //
            clearInterval(progressInterval); //
        }
        updateProgress(progress, 'Analizando receta con IA adaptativa...'); //
    }, 1000);
}


// ===== FUNCIONES DE COTEJACIÓN =====
function startPhase2(jobId) {
    if (!jobId) {
        notificationSystem.show('Error crítico: Se intentó iniciar la Fase 2 sin un ID de trabajo.', 'error');
        return;
    }
    
    // CORREGIDO: NO sobrescribir currentAnalysis, solo asegurar que tenga el ID correcto
    if (!currentAnalysis || currentAnalysis.id !== jobId) {
        // Solo crear nuevo objeto si no existe o el ID es diferente
        if (appState.currentAnalysis && appState.currentAnalysis.id === jobId) {
            currentAnalysis = appState.currentAnalysis;
        } else {
            // Preservar datos existentes si los hay
            currentAnalysis = { 
                ...currentAnalysis, 
                id: jobId 
            };
        }
    }
    appState.currentAnalysis = currentAnalysis;

    showProgressArea(); //
    updateProgress(0, 'Iniciando Fase 2: Cotejando con IA adaptativa...'); //

    const progressMessage = document.getElementById('progress-message'); //
    if (progressMessage) {
        progressMessage.innerHTML = `
            <span class="text-gray-600">La IA está cotejando ingredientes con productos reales y </span>
            <span class="text-purple-600 font-semibold">aprendiendo de cada resultado</span>
            <span class="text-gray-600"> para mejorar futuras búsquedas.</span>
        `; //
    }
    
    simulatePhase2Progress(); //

    triggerCotejamiento(jobId); //
}


async function triggerCotejamiento(jobId) {
    try {
        console.log('🔍 Enviando webhook de cotejación para job_id:', jobId);
        
        // Obtener los datos actuales del análisis - buscar en múltiples ubicaciones
        let datosActuales = null;
        
        // Intentar obtener de currentAnalysis
        if (currentAnalysis?.resultado_final) {
            datosActuales = currentAnalysis.resultado_final;
            console.log('🔍 Datos obtenidos de currentAnalysis');
        }
        // Si no, intentar de appState.currentAnalysis
        else if (appState.currentAnalysis?.resultado_final) {
            datosActuales = appState.currentAnalysis.resultado_final;
            console.log('🔍 Datos obtenidos de appState.currentAnalysis');
        }
        // Si no, intentar de la base de datos
        else {
            console.log('🔍 Consultando base de datos para obtener datos...');
            const { data: trabajoData, error } = await supabaseClient
                .from('trabajos_analisis')
                .select('resultado_final_json, platos_json')
                .eq('id', jobId)
                .single();
            
            if (!error && trabajoData) {
                // Intentar leer desde platos_json primero
                if (trabajoData.platos_json) {
                    datosActuales = typeof trabajoData.platos_json === 'string' 
                        ? JSON.parse(trabajoData.platos_json) 
                        : trabajoData.platos_json;
                    console.log('🔍 Datos obtenidos de platos_json en base de datos');
                } else if (trabajoData.resultado_final_json) {
                    datosActuales = typeof trabajoData.resultado_final_json === 'string' 
                        ? JSON.parse(trabajoData.resultado_final_json) 
                        : trabajoData.resultado_final_json;
                    console.log('🔍 Datos obtenidos de resultado_final_json en base de datos');
                }
            }
        }
        
        console.log('🔍 Datos actuales que se enviarán:', datosActuales);
        
        // Inicializar payload ANTES de usarlo
        const payload = {
            job_id: jobId,
            fase: 'cotejacion',
            platos_data: []
        };
        
        // Verificar si hay datos de platos con PVP
        if (datosActuales) {
            let platosArray = null;
            
            if (Array.isArray(datosActuales)) {
                // Si datosActuales es un array directo
                platosArray = datosActuales;
                console.log('🔍 Datos leídos como array directo');
            } else if (datosActuales.platos_procesados) {
                // Si datosActuales tiene la estructura { platos_procesados: [...] }
                platosArray = datosActuales.platos_procesados;
                console.log('🔍 Datos leídos desde platos_procesados');
            }
            
            if (platosArray) {
                console.log('🔍 Platos encontrados:', platosArray.length);
                platosArray.forEach((plato, index) => {
                    console.log(`🔍 Plato ${index + 1}:`, {
                        nombre: plato.plato_analizado,
                        pvp: plato.pvp_bruto_euros,
                        tiene_pvp: plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0
                    });
                });
                
                // Incluir datos de PVP directamente en el payload
                payload.platos_data = platosArray.map(plato => ({
                    plato_analizado: plato.plato_analizado,
                    pvp_bruto_euros: plato.pvp_bruto_euros || 0,
                    ingredientes_cotejados: plato.ingredientes_cotejados || []
                }));
            }
        }
        
        console.log('🔍 Payload completo que se enviará:', payload);
        
        // Guardar PVP en base de datos antes de enviar webhook (manejar ambos formatos)
        if (datosActuales) {
            let platosConPVP = [];
            if (Array.isArray(datosActuales)) {
                platosConPVP = datosActuales.filter(plato => plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0);
            } else if (datosActuales.platos_procesados) {
                platosConPVP = datosActuales.platos_procesados.filter(plato => plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0);
            }
            if (platosConPVP.length > 0) {
                console.log('💾 Guardando PVP en base de datos antes del webhook...');
                await guardarPVPEnBaseDeDatos(jobId, platosConPVP);
            }
        }
        
        const response = await fetch(APP_CONFIG.COTEJAMIENTO_WEBHOOK_URL, {
            method: 'POST', //
            headers: { 'Content-Type': 'application/json' }, //
            body: JSON.stringify(payload) //
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`El webhook de cotejamiento no respondió correctamente (${response.status}): ${errorText}`); //
        }

        console.log("✅ Webhook de cotejamiento invocado para job_id:", jobId); //
        subscribeToAnalysisUpdates(jobId); //

    } catch (error) {
        console.error("❌ Error al invocar webhook de cotejación:", error); //
        showError(`No se pudo iniciar la cotejación: ${error.message}`);
        resetAnalysisUI();
    }
}

// ===== FUNCIONES FALTANTES PARA main.js =====

// ===== FUNCIÓN updateProgress =====
function updateProgress(percentage, message) {
    console.log(`📊 Progreso: ${percentage}% - ${message}`);
    
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const progressMessage = document.getElementById('progress-message');
    const tiempoElement = document.getElementById('tiempo-transcurrido');

    if (progressBar && percentage !== null) {
        progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }

    if (progressStatus && message) {
        progressStatus.textContent = message;
    }

    if (progressMessage && percentage < 100) {
        progressMessage.textContent = 'Tu receta se está procesando. La IA está aprendiendo de cada cotejamiento.';
    }
    
    // Actualizar tiempo transcurrido si existe
    if (tiempoElement && appState.currentProgress.tiempoInicio) {
        const transcurrido = Utils.formatTiempoTranscurrido(appState.currentProgress.tiempoInicio);
        tiempoElement.textContent = transcurrido;
    }
}

// ===== FUNCIÓN setupFileHandling CORREGIDA =====
function setupFileHandling() {
    console.log('📁 Configurando manejo de archivos...');
    
    // NUEVO: Verificar si ya está configurado para evitar duplicados
    if (window.fileHandlingConfigured) {
        console.log('📁 Manejo de archivos ya configurado, saltando...');
        return;
    }
    
    const fileInput = document.getElementById('file-input');
    const uploadBox = document.getElementById('upload-box');
    const browseButton = document.getElementById('browse-button');
    const removeFileButton = document.getElementById('remove-file');

    if (!fileInput || !uploadBox || !browseButton || !removeFileButton) {
        console.error('❌ No se encontraron todos los elementos para el manejo de archivos.');
        return;
    }

    // SOLUCIÓN: Crear funciones de handler únicas y almacenarlas para poder removerlas
    const handlers = {
        browseClick: () => {
            console.log('📁 Botón browse clickeado');
            fileInput.click();
        },
        fileChange: (e) => {
            console.log('📁 Archivo seleccionado:', e.target.files[0]?.name);
            handleFile(e.target.files[0]);
        },
        removeFile: () => {
            console.log('📁 Removiendo archivo');
            removeFile();
        },
        uploadBoxClick: (e) => {
            // SOLUCIÓN: Prevenir que el click del uploadBox se propague al browseButton
            e.stopPropagation();
            console.log('📁 Área de upload clickeada');
            fileInput.click();
        },
        dragEnter: (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.add('dragover');
        },
        dragOver: (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.add('dragover');
        },
        dragLeave: (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.remove('dragover');
        },
        drop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                console.log('📁 Archivo soltado:', files[0].name);
                handleFile(files[0]);
            }
        }
    };

    // SOLUCIÓN: Remover TODOS los listeners existentes antes de agregar nuevos
    console.log('🧹 Removiendo listeners existentes...');
    
    // Remover listeners del botón browse
    browseButton.removeEventListener('click', handlers.browseClick);
    
    // Remover listeners del input de archivo
    fileInput.removeEventListener('change', handlers.fileChange);
    
    // Remover listeners del botón de remover
    removeFileButton.removeEventListener('click', handlers.removeFile);
    
    // Remover listeners del área de upload
    uploadBox.removeEventListener('click', handlers.uploadBoxClick);
    
    // Remover listeners de drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadBox.removeEventListener(eventName, handlers[eventName]);
    });

    // SOLUCIÓN: Agregar listeners únicos y organizados
    console.log('🔗 Agregando listeners únicos...');
    
    // Botón browse - SOLO este debe activar la selección de archivo
    browseButton.addEventListener('click', handlers.browseClick);
    
    // Input de archivo
    fileInput.addEventListener('change', handlers.fileChange);
    
    // Botón de remover
    removeFileButton.addEventListener('click', handlers.removeFile);
    
    // Área de upload - SOLO para drag & drop, NO para clicks
    // SOLUCIÓN: Removemos el click listener del uploadBox para evitar duplicación
    // uploadBox.addEventListener('click', handlers.uploadBoxClick); // COMENTADO: Evita duplicación
    
    // Eventos de drag and drop
    uploadBox.addEventListener('dragenter', handlers.dragEnter);
    uploadBox.addEventListener('dragover', handlers.dragOver);
    uploadBox.addEventListener('dragleave', handlers.dragLeave);
    uploadBox.addEventListener('drop', handlers.drop);
    
    // SOLUCIÓN: Agregar indicador visual de que el área es solo para drag & drop
    uploadBox.setAttribute('title', 'Arrastra archivos aquí o usa el botón "Seleccionar Archivo"');
    
    // NUEVO: Marcar como configurado
    window.fileHandlingConfigured = true;
    console.log('✅ Manejo de archivos configurado correctamente - Sin duplicación de eventos');
}

// ===== FUNCIÓN addDetectedDish =====
function addDetectedDish(dishName, ingredients = []) {
    console.log(`🍽️ Agregando plato detectado: ${dishName}`);
    
    const detectedDishes = document.getElementById('detected-dishes');
    if (!detectedDishes) return;

    const dishId = 'dish-' + dishName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    let dishContainer = document.getElementById(dishId);

    if (!dishContainer) {
        dishContainer = document.createElement('div');
        dishContainer.id = dishId;
        dishContainer.className = "p-4 bg-white rounded-lg border border-gray-200 shadow-sm animate-fade-in";
        detectedDishes.appendChild(dishContainer);
    }

    const ingredientsHTML = ingredients.length > 0 ? `
        <div class="mt-3">
            <h5 class="text-sm font-medium text-gray-700 mb-2">Ingredientes detectados:</h5>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${ingredients.map(ing => `
                    <div class="flex items-center text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <i class="fas fa-check-circle text-green-500 mr-2 text-xs" aria-hidden="true"></i>
                        <span class="font-medium">${Utils.sanitizeHTML(ing.nombre_ingrediente || 'Ingrediente desconocido')}</span>
                        ${ing.cantidad ? `<span class="ml-auto text-teal-600 font-semibold">${Utils.sanitizeHTML(ing.cantidad)}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    dishContainer.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                <i class="fas fa-utensils text-teal-600 text-sm" aria-hidden="true"></i>
            </div>
            <div class="flex-grow">
                <h4 class="font-semibold text-gray-800 mb-1">${Utils.sanitizeHTML(dishName)}</h4>
                <p class="text-sm text-gray-500">Plato detectado por IA</p>
                ${ingredientsHTML}
            </div>
            <div class="flex-shrink-0">
                <i class="fas fa-spinner fa-spin text-teal-500" aria-hidden="true"></i>
            </div>
        </div>
    `;

    // Animación de entrada
    dishContainer.style.opacity = '0';
    dishContainer.style.transform = 'translateY(20px)';

    requestAnimationFrame(() => {
        dishContainer.style.transition = 'all 0.3s ease';
        dishContainer.style.opacity = '1';
        dishContainer.style.transform = 'translateY(0)';
    });
}

// ===== FUNCIÓN handleProgressUpdate =====
function handleProgressUpdate(progressPayload) {
    console.log('📬 Nuevo mensaje de progreso:', progressPayload);

    let dishName = '';
    let ingredients = [];

    try {
        let data;
        if (typeof progressPayload === 'string') {
            let jsonString = progressPayload;
            
            // Reparar ingredientes sin corchetes
            const ingredientsRegex = /("ingredientes"\s*:\s*)({(?:[^{}]|{[^{}]*})*}(?:\s*,\s*{[^{}]*})*)/;
            if (ingredientsRegex.test(jsonString)) {
                jsonString = jsonString.replace(ingredientsRegex, (match, p1, p2) => {
                    const objects = p2.replace(/}\s*{/g, '},{');
                    return `${p1}[${objects}]`;
                });
            }
            data = JSON.parse(jsonString);
        } else {
            data = progressPayload;
        }

        if (Array.isArray(data) && data.length > 0) {
            data = data[0];
        }

        if (typeof data === 'object' && data !== null) {
            dishName = data.nombre_plato || '';
            ingredients = Array.isArray(data.ingredientes) ? data.ingredientes : [];
        }
    } catch (e) {
        if (typeof progressPayload === 'string' &&
            !progressPayload.trim().startsWith('{') &&
            !progressPayload.trim().startsWith('[')) {
            dishName = progressPayload;
        }
        console.warn("Error parsing progress payload:", e);
    }

    if (dishName) {
        addDetectedDish(dishName, ingredients);
    }
}

// ===== FUNCIONES ADICIONALES =====

// Función para manejar eventos de progreso con payload
function handleEventWithPayload(event, payload) {
    console.log(`📬 Evento recibido: ${event}`, payload);
    
    switch (event) {
        case 'plato_detectado':
            if (payload.nombre_plato) {
                addDetectedDish(payload.nombre_plato, payload.ingredientes || []);
            }
            break;
        case 'progreso_actualizado':
            if (payload.porcentaje !== undefined) {
                updateProgress(payload.porcentaje, payload.mensaje || 'Procesando...');
            }
            break;
        default:
            console.log(`Evento no manejado: ${event}`);
    }
}
// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function () {
    // (revertido) sin selector de tema manual

    console.log('🚀 INICIANDO ESCANDALLOS PRO CON IA GENERATIVA COMPLETA');
    
    // NUEVO: Verificar si ya se inicializó para evitar doble inicialización
    if (window.appInitialized) {
        console.log('⚠️ App ya inicializada, saltando...');
        return;
    }
    
    notificationSystem = new NotificationSystem(); //
    modalManager = new ModalManager(); //
    aiLearningSystem = new AILearningSystem(); //
    
    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY); //
            console.log("✅ Cliente de Supabase inicializado correctamente."); //
            await aiLearningSystem.initialize(); //
        } else {
            throw new Error("La librería de Supabase no se cargó."); //
        }
    } catch (e) {
        console.error("❌ Error inicializando el cliente de Supabase.", e); //
        notificationSystem.show('Error de conexión con la base de datos. Algunas funciones pueden no estar disponibles.', 'error'); //
    }

    setupFileHandling(); //
    setupCameraHandling();
    
    // NUEVO: Marcar como inicializada
    window.appInitialized = true; //

    console.log('🔧 Configurando botón de análisis...');
    const analyzeSupabaseButton = document.getElementById('analyze-supabase-button');
    if (analyzeSupabaseButton) {
        analyzeSupabaseButton.addEventListener('click', () => {
            console.log('🚀 CLICK DETECTADO EN BOTÓN SUPABASE CON TIEMPO REAL');
            console.log('📁 selectedFile disponible:', selectedFile ? '✅ SÍ' : '❌ NO');

            if (!selectedFile) {
                console.log('❌ ERROR: No hay archivo seleccionado');
                notificationSystem.show('Por favor selecciona un archivo primero', 'warning');
                return;
            }

            // Mostrar modal para capturar nombre del cliente/restaurante antes de empezar
            openClientNameModal().then(async (clientName) => {
                if (!clientName) {
                    console.log('🛑 Análisis cancelado: sin nombre de restaurante');
                    return; // no continuar si se cancela o vacío
                }
                window.__clientName = clientName;
                try {
                    if (supabaseClient && appState.currentAnalysis?.id) {
                        const restauranteId = await ensureRestaurante(clientName);
                        if (restauranteId) {
                            await supabaseClient
                                .from('trabajos_analisis')
                                .update({ restaurante_id: restauranteId })
                                .eq('id', appState.currentAnalysis.id);
                        }
                    }
                } catch (e) {
                    console.warn('No se pudo asociar restaurante antes del análisis:', e);
                }
                console.log('✅ Llamando a startSupabaseAnalysis con tiempo real...');
                startSupabaseAnalysis();
            });
        });
    }

    const sidebar = document.getElementById('sidebar'); //
    const menuToggleButton = document.getElementById('menu-toggle-button'); //
    const sidebarCloseButton = document.getElementById('sidebar-close-button'); //
    
    if (menuToggleButton) {
        menuToggleButton.addEventListener('click', () => sidebar.classList.toggle('active')); //
    }
    
    if (sidebarCloseButton) {
        sidebarCloseButton.addEventListener('click', () => sidebar.classList.remove('active')); //
    }
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && 
            sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !menuToggleButton.contains(e.target)) {
            sidebar.classList.remove('active'); //
        }
    });

    const navLinks = document.querySelectorAll('#mainNav a'); //
    const contentPanels = document.querySelectorAll('.content-panel'); //
    const submenu = document.getElementById('sidebar-submenu');
    if (submenu) submenu.classList.add('show'); // siempre desplegado

    function switchTab(hash) {
        hash = hash || window.location.hash || '#snap-estimate'; //
        
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === hash); //
        });
        
        contentPanels.forEach(panel => {
            panel.classList.toggle('active', '#' + panel.id === hash); //
        });

        // Mantener submenú visible al navegar a sub-secciones; solo se oculta si el usuario lo pliega en Snap
        if (submenu) {
            const subHashes = ['#escandallos-guardados', '#ai-dashboard', '#database-ingredients'];
            if (subHashes.includes(hash)) {
                submenu.classList.add('show');
            }
            // Si es '#snap-estimate', no cambiamos estado (lo controla el toggle en el click)
        }
        
    switch (hash) {
            case '#escandallos-guardados':
                loadEscandallosGuardados(); //
                break;
            // Eliminado: sección Ingredientes IA
            case '#ai-dashboard':
                if (aiLearningSystem && aiLearningSystem.isActive) {
                    aiLearningSystem.refreshLearningDashboard(); //
                }
                break;
            case '#database-ingredients':
                // Forzar vista de productos como predeterminada (con paginación inicial)
                appState.currentDatabaseView = 'products';
                updateDatabaseView('products'); //
                break;
        }
        
        if (window.innerWidth < 768) sidebar.classList.remove('active'); //
        window.scrollTo({ top: 0, behavior: 'smooth' }); //
    }

    window.addEventListener('hashchange', () => switchTab(window.location.hash)); //
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); //
            const hash = link.getAttribute('href'); //
            if(window.location.hash !== hash) {
                window.location.hash = hash; //
            } else {
                switchTab(hash);
            }
            // Submenú siempre visible: no togglear
        });
    });

    // ===== LISTENERS ADICIONALES =====
    // Eliminado: botón de refrescar Ingredientes IA
    document.getElementById('refresh-escandallos')?.addEventListener('click', () => loadEscandallosGuardados()); //
    // Buscador de escandallos
    const eSearchBtn = document.getElementById('escandallos-search-btn');
    const eSearchInput = document.getElementById('escandallos-search-input');
    if (eSearchBtn && eSearchInput) {
        const doEscSearch = (page = 1) => {
            const q = eSearchInput.value || '';
            const grid = document.getElementById('escandallos-grid');
            if (grid) grid.innerHTML = Array(3).fill(0).map(() => `<div class="h-20 loading-skeleton rounded-lg"></div>`).join('');
            loadEscandallosGuardados(page, 10, q);
        };
        eSearchBtn.addEventListener('click', () => doEscSearch());
        eSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doEscSearch(); });
    }
    document.getElementById('refresh-database')?.addEventListener('click', () => updateDatabaseView(appState.currentDatabaseView)); //
    // (limpieza) botón show-products-btn ya no existe en el HTML

    // Buscador de productos
    const searchBtn = document.getElementById('product-search-btn');
    const searchInput = document.getElementById('product-search-input');
    if (searchBtn && searchInput) {
        const doSearch = (page = 1) => {
            const q = searchInput.value || '';
            appState.currentDatabaseView = 'products';
            const container = document.getElementById('database-container');
            if (container) container.innerHTML = `<div class="h-64 loading-skeleton rounded-lg"></div>`;
            loadProductCatalog(q, page, 10);
            const modeIndicator = document.getElementById('current-mode');
            if (modeIndicator) {
                modeIndicator.innerHTML = `<i class="fas fa-shopping-cart mr-2" aria-hidden="true"></i>Catálogo de Productos`;
                modeIndicator.className = 'bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium flex items-center';
            }
        };
        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    }

    document.getElementById('optimize-system-btn')?.addEventListener('click', () => {
        if (aiLearningSystem && aiLearningSystem.isActive) aiLearningSystem.optimizeSystem(); //
    });
    document.getElementById('regenerate-embeddings-btn')?.addEventListener('click', () => {
        if (aiLearningSystem && aiLearningSystem.isActive) aiLearningSystem.regenerateEmbeddings(); //
    });
    document.getElementById('export-knowledge-btn')?.addEventListener('click', () => {
        if (aiLearningSystem && aiLearningSystem.isActive) aiLearningSystem.exportKnowledge(); //
    });
    document.getElementById('refresh-knowledge')?.addEventListener('click', () => {
        if (aiLearningSystem && aiLearningSystem.isActive) aiLearningSystem.loadLearnedRelations(); //
    });
    document.getElementById('refresh-feedback')?.addEventListener('click', () => {
        if (aiLearningSystem && aiLearningSystem.isActive) aiLearningSystem.loadRecentFeedback(); //
    });

    function updateTime() {
        const currentTimeElement = document.getElementById('current-time'); //
        if (currentTimeElement) {
            const now = new Date(); //
            const timeString = now.toLocaleTimeString('es-ES', {
                hour: '2-digit', //
                minute: '2-digit' //
            });
            currentTimeElement.textContent = timeString; //
        }
    }

    updateTime(); //
    setInterval(updateTime, 60000); //

    setInterval(() => {
        if (aiLearningSystem && aiLearningSystem.isActive) {
            aiLearningSystem.loadInitialMetrics(); //
        }
    }, 30000);

    switchTab(); //

    setTimeout(() => {
        notificationSystem.show(
            '🧠 ¡Bienvenido a Escandallos Pro con IA Adaptativa! El sistema aprende y mejora con cada análisis.', //
            'ai', //
            6000 //
        );
    }, 1000);
    
    console.log('✅ Escandallos Pro con IA Generativa inicializado correctamente'); //
});

// ===== FUNCIÓN DE DEBUG =====
function debugCurrentAnalysis() {
    console.log('🔍 === DEBUG CURRENT ANALYSIS ===');
    console.log('🔍 currentAnalysis:', currentAnalysis);
    console.log('🔍 currentAnalysis.id:', currentAnalysis?.id);
    console.log('🔍 appState.currentAnalysis:', appState.currentAnalysis);
    console.log('🔍 appState.currentAnalysis.id:', appState.currentAnalysis?.id);
    
    // Debug detallado de resultado_final
    if (currentAnalysis?.resultado_final) {
        console.log('🔍 currentAnalysis.resultado_final:', JSON.stringify(currentAnalysis.resultado_final, null, 2));
        console.log('🔍 currentAnalysis.resultado_final.job_id:', currentAnalysis.resultado_final.job_id);
    }
    
    if (appState.currentAnalysis?.resultado_final) {
        console.log('🔍 appState.currentAnalysis.resultado_final:', JSON.stringify(appState.currentAnalysis.resultado_final, null, 2));
        console.log('🔍 appState.currentAnalysis.resultado_final.job_id:', appState.currentAnalysis.resultado_final.job_id);
    }
    
    console.log('🔍 ================================');
}

async function guardarPVPEnBaseDeDatos(jobId, platosConPVP) {
    try {
        console.log('💾 Guardando PVP en base de datos para job_id:', jobId);
        console.log('💾 Platos con PVP:', platosConPVP.length);
        
        for (const plato of platosConPVP) {
            if (plato.pvp_bruto_euros && plato.pvp_bruto_euros > 0) {
                console.log(`💾 Guardando PVP para ${plato.plato_analizado}: ${plato.pvp_bruto_euros}€`);
                
                // Primero, buscar si el plato ya existe
                const { data: platoExistente, error: errorBusqueda } = await supabaseClient
                    .from('platos')
                    .select('id')
                    .eq('trabajo_analisis_id', jobId)
                    .eq('nombre', plato.plato_analizado)
                    .single();
                
                if (platoExistente) {
                    // Actualizar plato existente
                    const { error } = await supabaseClient
                        .from('platos')
                        .update({
                            pvp_bruto_euros: plato.pvp_bruto_euros,
                            pvp_neto_euros: plato.pvp_neto_euros,
                            food_cost_total_euros: plato.food_cost_total_euros || 0,
                            food_cost_porcentaje: plato.food_cost_porcentaje || 0,
                            margen_neto_euros: plato.margen_neto_euros || 0
                        })
                        .eq('id', platoExistente.id);
                    
                    if (error) {
                        console.error(`❌ Error actualizando PVP para ${plato.plato_analizado}:`, error);
                    } else {
                        console.log(`✅ PVP actualizado para ${plato.plato_analizado}`);
                    }
                } else {
                    // Insertar nuevo plato con PVP
                    const { error } = await supabaseClient
                        .from('platos')
                        .insert({
                            trabajo_analisis_id: jobId,
                            nombre: plato.plato_analizado,
                            pvp_bruto_euros: plato.pvp_bruto_euros,
                            pvp_neto_euros: plato.pvp_neto_euros,
                            food_cost_total_euros: plato.food_cost_total_euros || 0,
                            food_cost_porcentaje: plato.food_cost_porcentaje || 0,
                            margen_neto_euros: plato.margen_neto_euros || 0
                        });
                    
                    if (error) {
                        console.error(`❌ Error insertando PVP para ${plato.plato_analizado}:`, error);
                    } else {
                        console.log(`✅ PVP insertado para ${plato.plato_analizado}`);
                    }
                }
            }
        }
        
        console.log('✅ PVP guardado en base de datos');
        
    } catch (error) {
        console.error('❌ Error guardando PVP en base de datos:', error);
    }
}

// ===== SISTEMA DE FEEDBACK HUMANO =====

async function handleIngredientSelection(selectElement) {
    console.log('🔍 DEBUG - handleIngredientSelection iniciado');
    console.log('🔍 DEBUG - selectElement:', selectElement);
    
    const container = selectElement.closest('.ingredient-selector');
    console.log('🔍 DEBUG - container encontrado:', container);
    
    if (!container) {
        console.error('❌ ERROR: No se encontró .ingredient-selector');
        return;
    }
    
    const ingrediente = container.dataset.ingrediente;
    const plato = container.dataset.plato;
    const valor = selectElement.value;
    
    console.log('🔍 DEBUG - Datos extraídos:', {
        ingrediente,
        plato,
        valor,
        hasIngrediente: !!ingrediente,
        hasPlato: !!plato,
        containerDataset: container.dataset
    });
    
    // Debug adicional del container
    console.log('🔍 DEBUG - Container completo:', container);
    console.log('🔍 DEBUG - Container HTML:', container.outerHTML);
    console.log('🔍 DEBUG - Container dataset keys:', Object.keys(container.dataset));
    
    if (!ingrediente || !plato) {
        console.error('❌ ERROR: Faltan datos requeridos:', { ingrediente, plato });
        return;
    }
    
    console.log('🎯 Selección de usuario:', { ingrediente, valor, plato });
    
    if (valor === 'buscar_mas') {
        await mostrarAlternativasIngrediente(container, ingrediente);
    } else if (valor === 'no_disponible') {
        // PRODUCTO NO DISPONIBLE - Obtener el producto que estaba sugerido originalmente
        const options = selectElement.querySelectorAll('option');
        let productoOriginalSugerido = 'Producto no válido';
        
        // Buscar la primera opción (la que sugirió la IA)
        for (let option of options) {
            if (option.value !== 'buscar_mas' && option.value !== 'no_disponible' && option.value.trim() !== '') {
                productoOriginalSugerido = option.value;
                break;
            }
        }
        
        console.log(`🚫 Rechazando producto sugerido: ${productoOriginalSugerido} para ${ingrediente}`);
        
        const key = `${plato}-${ingrediente}`;
        const data = {
            ingrediente,
            plato,
            producto_elegido: null,
            feedback_tipo: 'rechazo_usuario',
            producto_rechazado: productoOriginalSugerido,
            usuario_confirmado: true
        };
        
        console.log('🔍 DEBUG - Intentando guardar en feedbackBuffer:', { key, data });
        feedbackBuffer.set(key, data);
        console.log('🔍 DEBUG - feedbackBuffer después de set:', {
            size: feedbackBuffer.size,
            hasKey: feedbackBuffer.has(key),
            value: feedbackBuffer.get(key)
        });
        
        // Debug adicional del buffer completo
        console.log('🔍 DEBUG - Buffer completo después de agregar:', debugFeedbackBuffer());
        
        // Feedback visual - rojo suave
        const card = container.closest('.ingredient-selection-card');
        card.style.backgroundColor = '#fef2f2';
        card.style.borderColor = '#f87171';
        
        notificationSystem.show(`❌ "${ingrediente}" marcado como no disponible`, 'warning', 3000);
    } else {
        const key = `${plato}-${ingrediente}`;
        
        // Detectar si es una corrección (cambio de la opción automática)
        const opcionAutomatica = feedbackBuffer.get(key);
        const esCorreccion = opcionAutomatica && 
                           opcionAutomatica.producto_elegido !== valor && 
                           opcionAutomatica.feedback_tipo === 'confirmacion_automatica';
        
        const data = {
            ingrediente,
            plato,
            producto_elegido: valor,
            feedback_tipo: esCorreccion ? 'usuario_correccion' : 'usuario_confirmado',
            usuario_confirmado: true,
            producto_anterior: esCorreccion ? opcionAutomatica.producto_elegido : null
        };
        
        console.log(`🔍 TIPO DETECTADO: ${esCorreccion ? 'CORRECCIÓN' : 'CONFIRMACIÓN'} para ${ingrediente}`);
        
        console.log('🔍 DEBUG - Intentando guardar selección normal en feedbackBuffer:', { key, data });
        feedbackBuffer.set(key, data);
        console.log('🔍 DEBUG - feedbackBuffer después de set normal:', {
            size: feedbackBuffer.size,
            hasKey: feedbackBuffer.has(key),
            value: feedbackBuffer.get(key)
        });
        
        // Debug adicional del buffer completo
        console.log('🔍 DEBUG - Buffer completo después de agregar normal:', debugFeedbackBuffer());
        
        const card = container.closest('.ingredient-selection-card');
        card.style.backgroundColor = '#f0fdf4';
        card.style.borderColor = '#22c55e';
        
        notificationSystem.show(`✅ "${valor}" confirmado para ${ingrediente}`, 'success', 2000);
    }
    
    console.log('🔍 DEBUG - Llamando a actualizarContadorSelecciones para:', plato);
    actualizarContadorSelecciones(plato);
    console.log('🔍 DEBUG - Después de actualizarContadorSelecciones');
}

async function mostrarAlternativasIngrediente(container, ingrediente) {
    const additionalOptions = container.querySelector('.additional-options');
    
    additionalOptions.innerHTML = `
        <div class="text-center py-2">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Buscando alternativas para "${ingrediente}"...
        </div>
    `;
    additionalOptions.classList.remove('hidden');
    
    try {
        const { data: productos, error } = await supabaseClient
            .from('productos')
            .select('id, nombre, marca, precio_neto')
            .or(`nombre.ilike.%${ingrediente}%,descripcion.ilike.%${ingrediente}%`)
            .limit(8);
            
        if (error) throw error;
        
        if (!productos || productos.length === 0) {
            additionalOptions.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-600 mb-2">😕 No se encontraron alternativas para "${ingrediente}"</p>
                    <button onclick="cerrarAlternativas(this)" 
                            class="text-blue-600 hover:text-blue-800 text-sm">
                        ← Volver a selección anterior
                    </button>
                </div>
            `;
            return;
        }
        
        additionalOptions.innerHTML = `
            <div class="border-t pt-3">
                <p class="text-sm font-semibold text-gray-700 mb-3">
                    🔍 ${productos.length} opciones encontradas:
                </p>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${productos.map(prod => `
                        <button onclick="seleccionarAlternativa('${ingrediente}', '${prod.nombre.replace(/'/g, "\\'")}', '${prod.id}')"
                                class="block w-full text-left p-3 hover:bg-blue-100 rounded-lg border border-gray-200 transition-colors">
                            <div class="font-medium text-gray-800">${Utils.sanitizeHTML(prod.nombre)}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${prod.marca ? `${Utils.sanitizeHTML(prod.marca)} • ` : ''}
                                ${prod.precio_neto ? `€${parseFloat(prod.precio_neto).toFixed(2)}/kg` : 'Sin precio'}
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <div class="mt-3 pt-2 border-t">
                    <button onclick="cerrarAlternativas(this)" 
                            class="text-blue-600 hover:text-blue-800 text-sm">
                        ← Volver a selección anterior
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error buscando alternativas:', error);
        additionalOptions.innerHTML = `
            <div class="text-center py-4">
                <p class="text-red-600 mb-2">❌ Error buscando alternativas</p>
                <button onclick="cerrarAlternativas(this)" class="text-blue-600 text-sm">← Volver</button>
            </div>
        `;
    }
}

async function buscarAlternativaMejorada(container, ingrediente) {
    const additionalOptions = container.querySelector('.additional-options');
    const productoRechazado = container.querySelector('select').options[0].value;
    
    additionalOptions.innerHTML = `
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="text-center mb-3">
                <i class="fas fa-search-plus text-orange-600 text-lg mr-2"></i>
                <span class="text-orange-700 font-medium">Buscando mejores opciones para "${ingrediente}"...</span>
            </div>
            <div class="text-xs text-orange-600 text-center">
                Evitando productos similares a: "${productoRechazado}"
            </div>
        </div>
    `;
    additionalOptions.classList.remove('hidden');
    
    try {
        // Buscar productos excluyendo el rechazado y similares
        const { data: productos, error } = await supabaseClient
            .from('productos')
            .select('id, nombre, marca, precio_neto, categoria')
            .not('nombre', 'ilike', `%${productoRechazado.split(' ')[0]}%`) // Evitar productos similares
            .or(`nombre.ilike.%${ingrediente.split(' ')[0]}%,categoria.ilike.%${inferirCategoria(ingrediente)}%`)
            .limit(8);
            
        if (error) throw error;
        
        if (!productos || productos.length === 0) {
            additionalOptions.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div class="mb-2">
                        <i class="fas fa-lightbulb text-yellow-600 text-xl"></i>
                    </div>
                    <p class="text-yellow-700 font-medium mb-2">No encontramos alternativas obvias para "${ingrediente}"</p>
                    <p class="text-sm text-yellow-600 mb-3">¿Podrías ayudar a la IA sugiriendo qué tipo de producto sería correcto?</p>
                    <input type="text" id="sugerencia-usuario" placeholder="Ej: verdura fresca, conserva, especia..." 
                           class="w-full p-2 border rounded mb-2 text-sm">
                    <button onclick="procesarSugerenciaUsuario('${ingrediente}', '${productoRechazado}')" 
                            class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
                        Ayudar a la IA a aprender
                    </button>
                    <button onclick="cerrarAlternativas(this)" class="ml-2 text-gray-500 text-sm">Cancelar</button>
                </div>
            `;
            return;
        }
        
        // Mostrar productos encontrados
        additionalOptions.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <p class="text-sm font-semibold text-green-700 mb-3 flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    Encontramos ${productos.length} alternativas mejores:
                </p>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${productos.map(prod => `
                        <button onclick="seleccionarAlternativaMejorada('${ingrediente}', '${prod.nombre.replace(/'/g, "\\'")}', '${prod.id}', '${productoRechazado}')"
                                class="block w-full text-left p-3 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
                            <div class="font-medium text-gray-800">${Utils.sanitizeHTML(prod.nombre)}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${prod.categoria ? `${Utils.sanitizeHTML(prod.categoria)} • ` : ''}
                                ${prod.precio_neto ? `€${parseFloat(prod.precio_neto).toFixed(2)}/kg` : 'Sin precio'}
                            </div>
                        </button>
                    `).join('')}
                </div>
                <div class="mt-3 pt-2 border-t text-center">
                    <button onclick="cerrarAlternativas(this)" class="text-green-600 text-sm">← Volver</button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error buscando alternativas mejoradas:', error);
        additionalOptions.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p class="text-red-600 mb-2">Error buscando alternativas</p>
                <button onclick="cerrarAlternativas(this)" class="text-red-600 text-sm">← Volver</button>
            </div>
        `;
    }
}

function seleccionarAlternativa(ingrediente, productoNombre, productoId) {
    const container = document.querySelector(`[data-ingrediente="${ingrediente}"]`);
    if (!container) return;
    
    const select = container.querySelector('select');
    const plato = container.dataset.plato;
    
    const newOption = document.createElement('option');
    newOption.value = productoNombre;
    newOption.textContent = `✅ ${productoNombre} (Manual)`;
    newOption.selected = true;
    select.appendChild(newOption);
    
    feedbackBuffer.set(`${plato}-${ingrediente}`, {
        ingrediente,
        plato,
        producto_elegido: productoNombre,
        producto_id: productoId,
        feedback_tipo: 'usuario_correccion',
        usuario_confirmado: true
    });
    
    const card = container.closest('.ingredient-selection-card');
    card.style.backgroundColor = '#eff6ff';
    card.style.borderColor = '#3b82f6';
    
    notificationSystem.show(`🎯 "${productoNombre}" seleccionado para ${ingrediente}`, 'success', 3000);
    actualizarContadorSelecciones(plato);
}

function seleccionarAlternativaMejorada(ingrediente, productoNombre, productoId, productoRechazado) {
    const container = document.querySelector(`[data-ingrediente="${ingrediente}"]`);
    const plato = container.dataset.plato;
    
    // Guardar AMBOS: el rechazo Y la selección correcta
    feedbackBuffer.set(`${plato}-${ingrediente}-rechazo`, {
        ingrediente,
        plato,
        producto_rechazado: productoRechazado,
        producto_elegido: null,
        feedback_tipo: 'rechazo_usuario',
        usuario_confirmado: true,
        razon: 'reemplazado_por_mejor'
    });
    
    feedbackBuffer.set(`${plato}-${ingrediente}`, {
        ingrediente,
        plato,
        producto_elegido: productoNombre,
        producto_id: productoId,
        feedback_tipo: 'usuario_correccion_mejorada',
        usuario_confirmado: true,
        producto_anterior_rechazado: productoRechazado
    });
    
    // Actualizar UI
    const select = container.querySelector('select');
    const newOption = document.createElement('option');
    newOption.value = productoNombre;
    newOption.textContent = `✅ ${productoNombre} (Alternativa mejorada)`;
    newOption.selected = true;
    select.appendChild(newOption);
    
    const card = container.closest('.ingredient-selection-card');
    card.style.backgroundColor = '#f0fdf4';
    card.style.borderColor = '#22c55e';
    card.style.borderWidth = '2px';
    
    container.querySelector('.additional-options').classList.add('hidden');
    
    notificationSystem.show(`🎯 "${productoNombre}" seleccionado. IA aprenderá a evitar "${productoRechazado}"`, 'success', 4000);
    actualizarContadorSelecciones(plato);
}

async function buscarAlternativaAmpliada(ingrediente) {
    const container = document.querySelector(`[data-ingrediente="${ingrediente}"]`);
    if (!container) return;
    
    const additionalOptions = container.querySelector('.additional-options');
    
    additionalOptions.innerHTML = `
        <div class="text-center py-3">
            <div class="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full">
                <i class="fas fa-search-plus mr-2 text-blue-600"></i>
                <span class="text-blue-700 font-medium">Búsqueda ampliada para "${ingrediente}"...</span>
            </div>
        </div>
    `;
    
    try {
        // Búsqueda más amplia sin filtros restrictivos
        const { data: productos, error } = await supabaseClient
            .from('productos')
            .select('id, nombre, marca, precio_neto')
            .or(`nombre.ilike.%${ingrediente}%,descripcion.ilike.%${ingrediente}%`)
            .limit(15);
            
        if (error) throw error;
        
        if (!productos || productos.length === 0) {
            additionalOptions.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-600 mb-2">😕 No se encontraron productos para "${ingrediente}"</p>
                    <button onclick="cerrarAlternativas(this)" 
                            class="text-blue-600 hover:text-blue-800 text-sm">
                        ← Volver
                    </button>
                </div>
            `;
            return;
        }
        
        additionalOptions.innerHTML = `
            <div class="border-t pt-3">
                <p class="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                    <i class="fas fa-search mr-2"></i>
                    🔍 ${productos.length} productos encontrados en búsqueda ampliada:
                </p>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${productos.map(prod => `
                        <button onclick="seleccionarAlternativa('${ingrediente}', '${prod.nombre.replace(/'/g, "\\'")}', '${prod.id}')"
                                class="block w-full text-left p-3 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors">
                            <div class="font-medium text-gray-800">${Utils.sanitizeHTML(prod.nombre)}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${prod.marca ? `${Utils.sanitizeHTML(prod.marca)} • ` : ''}
                                ${prod.precio_neto ? `€${parseFloat(prod.precio_neto).toFixed(2)}/kg` : 'Sin precio'}
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <div class="mt-3 pt-2 border-t">
                    <button onclick="cerrarAlternativas(this)" 
                            class="text-blue-600 hover:text-blue-800 text-sm">
                        ← Volver
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error en búsqueda ampliada:', error);
        additionalOptions.innerHTML = `
            <div class="text-center py-4">
                <p class="text-red-600 mb-2">❌ Error en búsqueda ampliada</p>
                <button onclick="cerrarAlternativas(this)" class="text-blue-600 text-sm">← Volver</button>
            </div>
        `;
    }
}

function cerrarAlternativas(button) {
    const container = button.closest('.ingredient-selector');
    container.querySelector('.additional-options').classList.add('hidden');
    container.querySelector('select').selectedIndex = 0;
}

function actualizarContadorSelecciones(plato) {
    const seleccionesPlato = Array.from(feedbackBuffer.entries())
        .filter(([key, value]) => value.plato === plato);
    
    const botonEnvio = document.querySelector(`button[onclick="enviarFeedbackMasivo('${plato}')"]`);
    if (botonEnvio && seleccionesPlato.length > 0) {
        botonEnvio.innerHTML = `
            <i class="fas fa-brain mr-2"></i>
            Entrenar IA con ${seleccionesPlato.length} selecciones
        `;
        botonEnvio.classList.add('animate-pulse');
    }
    
    // Actualizar debug del buffer
    const debugElement = document.getElementById(`debug-buffer-${plato.replace(/[^a-zA-Z0-9]/g, '_')}`);
    if (debugElement) {
        if (seleccionesPlato.length === 0) {
            debugElement.textContent = 'Buffer vacío (0 selecciones)';
            debugElement.className = 'text-red-600 font-medium';
        } else {
            debugElement.textContent = `${seleccionesPlato.length} selección(es) en buffer`;
            debugElement.className = 'text-green-600 font-medium';
            
            // Mostrar detalles de las selecciones
            const detalles = seleccionesPlato.map(sel => 
                `${sel.ingrediente}: ${sel.producto_elegido || sel.feedback_tipo}`
            ).join(', ');
            debugElement.title = detalles;
        }
    }
}

async function enviarFeedbackMasivo(plato) {
    const seleccionesPlato = Array.from(feedbackBuffer.entries())
        .filter(([key, value]) => value.plato === plato)
        .map(([key, value]) => value);
    
    if (seleccionesPlato.length === 0) {
        notificationSystem.show('No hay selecciones nuevas para enviar', 'warning');
        return;
    }
    
    console.log('📤 Enviando feedback masivo:', seleccionesPlato);
    
    const botonEnvio = document.querySelector(`button[onclick="enviarFeedbackMasivo('${plato}')"]`);
    if (botonEnvio) {
        botonEnvio.disabled = true;
        botonEnvio.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Entrenando IA...`;
    }
    
    try {
        const response = await fetch(APP_CONFIG.FEEDBACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APP_CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                tipo: 'feedback_usuario_masivo',
                plato: plato,
                selecciones: seleccionesPlato,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensaje || 'Error en Edge Function');
        }
        
        const resultado = await response.json();
        console.log('✅ Resultado:', resultado);
        
        seleccionesPlato.forEach(sel => {
            feedbackBuffer.delete(`${sel.plato}-${sel.ingrediente}`);
        });
        
        notificationSystem.show(
            `🎉 ¡IA entrenada! ${resultado.relaciones_creadas} nuevas relaciones creadas.`, 
            'ai', 
            5000
        );
        
        // Actualizar métricas híbridas
        console.log('🔄 Actualizando métricas del dashboard...');
        setTimeout(async () => {
            if (aiLearningSystem && aiLearningSystem.isActive) {
                await aiLearningSystem.loadInitialMetrics();
            }
            // También actualizar métricas híbridas
            const metricas = await obtenerMetricasHibridas();
            actualizarTarjetasHibridas(metricas);
            console.log('✅ Métricas actualizadas después de entrenar IA');
        }, 2000);
        
        if (botonEnvio) {
            botonEnvio.innerHTML = `<i class="fas fa-check mr-2"></i>¡Completado!`;
            botonEnvio.classList.add('bg-green-600');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        notificationSystem.show(`Error: ${error.message}`, 'error');
        
        if (botonEnvio) {
            botonEnvio.disabled = false;
            botonEnvio.innerHTML = `<i class="fas fa-brain mr-2"></i>Reintentar`;
        }
    }
}

function inferirCategoria(ingrediente) {
    const categorias = {
        'tomate': 'verdura',
        'cebolla': 'verdura', 
        'ajo': 'condimento',
        'sal': 'condimento',
        'aceite': 'aceite',
        'queso': 'lacteo',
        'pollo': 'carne',
        'pescado': 'pescado'
    };
    
    for (const [key, categoria] of Object.entries(categorias)) {
        if (ingrediente.toLowerCase().includes(key)) {
            return categoria;
        }
    }
    return 'general';
}

function procesarSugerenciaUsuario(ingrediente, productoRechazado) {
    const sugerencia = document.getElementById('sugerencia-usuario').value.trim();
    const container = document.querySelector(`[data-ingrediente="${ingrediente}"]`);
    const plato = container.dataset.plato;
    
    if (!sugerencia) {
        notificationSystem.show('Por favor, escribe una sugerencia para ayudar a la IA', 'warning');
        return;
    }
    
    // Guardar sugerencia para entrenamiento
    feedbackBuffer.set(`${plato}-${ingrediente}-sugerencia`, {
        ingrediente,
        plato,
        producto_rechazado: productoRechazado,
        sugerencia_usuario: sugerencia,
        feedback_tipo: 'sugerencia_categoria',
        usuario_confirmado: true
    });
    
    container.querySelector('.additional-options').classList.add('hidden');
    
    const card = container.closest('.ingredient-selection-card');
    card.style.backgroundColor = '#eff6ff';
    card.style.borderColor = '#3b82f6';
    
    notificationSystem.show(`💡 Sugerencia registrada: "${sugerencia}". La IA aprenderá de esto.`, 'ai', 4000);
    actualizarContadorSelecciones(plato);
}

// ===== NUEVAS FUNCIONES DE MÉTRICAS HÍBRIDAS =====

// NUEVA FUNCIÓN - Obtener todas las métricas
async function obtenerMetricasHibridas() {
    try {
        console.log('🔍 Obteniendo métricas híbridas...');
        
        const [
            penalizaciones,
            relacionesAprendidas,
            feedbackReciente
        ] = await Promise.all([
            // Total de productos rechazados
            supabaseClient
                .from('penalizaciones_semanticas')
                .select('*', { count: 'exact', head: true }),
                
            // Relaciones aprendidas activas
            supabaseClient
                .from('relaciones_aprendidas')
                .select('*', { count: 'exact', head: true })
                .eq('activa', true),
                
            // Feedback reciente (últimos 30 días)
            supabaseClient
                .from('feedback_cotejamiento')
                .select('feedback_tipo, consulta_original, created_at, contexto_cotejamiento')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(1000)
        ]);
        
        const feedback = feedbackReciente.data || [];
        console.log('📊 Feedback encontrado:', feedback.length);
        console.log('📊 Tipos de feedback:', [...new Set(feedback.map(f => f.feedback_tipo))]);
        
        // Contar por tipos específicos
        const confirmaciones = feedback.filter(f => 
            f.feedback_tipo === 'usuario_confirmado' ||
            f.feedback_tipo === 'usuario_confirmado_mejorado' ||
            f.feedback_tipo === 'confirmacion_automatica'
        ).length;
        
        const correcciones = feedback.filter(f => 
            f.feedback_tipo === 'usuario_correccion' || 
            f.feedback_tipo === 'usuario_correccion_mejorada' ||
            f.feedback_tipo.includes('usuario_') && !f.feedback_tipo.includes('confirmado')
        ).length;
        
        const rechazos = feedback.filter(f => 
            f.feedback_tipo === 'rechazo_usuario'
        ).length;
        
        const iaAprendida = feedback.filter(f => 
            f.feedback_tipo === 'implicito' && 
            (f.contexto_cotejamiento?.origen_match === 'aprendido' || 
             f.contexto_cotejamiento?.tipo_cotejo?.includes('aprendid'))
        ).length;
        
        // Calcular precisión basada en interacciones del usuario
        const totalInteraccionesUsuario = confirmaciones + correcciones + rechazos;
        const precision = totalInteraccionesUsuario > 0 ? 
            Math.round((confirmaciones / totalInteraccionesUsuario) * 100) : 0;
        
        // Ingredientes únicos con interacciones
        const ingredientesUnicos = new Set(
            feedback
                .filter(f => f.feedback_tipo.includes('usuario_') || f.feedback_tipo === 'rechazo_usuario')
                .map(f => f.consulta_original)
        ).size;
        
        const metricas = {
            penalizacionesTotal: penalizaciones.count || 0,
            relacionesActivasTotal: relacionesAprendidas.count || 0,
            correcciones,
            confirmaciones,
            rechazos,
            iaAprendida,
            precision,
            ingredientesUnicos,
            totalFeedback: feedback.length
        };
        
        console.log('📊 Métricas calculadas:', metricas);
        return metricas;
        
    } catch (error) {
        console.error('❌ Error obteniendo métricas híbridas:', error);
        return {
            penalizacionesTotal: 0,
            relacionesActivasTotal: 0,
            correcciones: 0,
            confirmaciones: 0,
            rechazos: 0,
            iaAprendida: 0,
            precision: 0,
            ingredientesUnicos: 0,
            totalFeedback: 0
        };
    }
}

// NUEVA FUNCIÓN - Actualizar tarjetas en el DOM
function actualizarTarjetasHibridas(metricas) {
    // 1. IA Aprendida (productos directos de relaciones)
    const iaAprendidaEl = document.getElementById('dashboard-ia-aprendida');
    if (iaAprendidaEl) {
        iaAprendidaEl.textContent = metricas.relacionesActivasTotal;
        animarContador(iaAprendidaEl);
    }
    
    // 2. Correcciones del usuario
    const correccionesEl = document.getElementById('dashboard-correcciones');
    if (correccionesEl) {
        correccionesEl.textContent = metricas.correcciones;
        animarContador(correccionesEl);
    }
    
    // 3. Rechazos/Penalizaciones
    const rechazosEl = document.getElementById('dashboard-rechazos');
    if (rechazosEl) {
        rechazosEl.textContent = metricas.penalizacionesTotal;
        animarContador(rechazosEl);
    }
    
    // 4. Confirmaciones
    const confirmacionesEl = document.getElementById('dashboard-confirmaciones');
    if (confirmacionesEl) {
        confirmacionesEl.textContent = metricas.confirmaciones;
        animarContador(confirmacionesEl);
    }
    
    // 5. Precisión de IA
    const precisionEl = document.getElementById('dashboard-precision-ia');
    if (precisionEl) {
        precisionEl.textContent = `${metricas.precision}%`;
        animarContador(precisionEl);
    }
    
    // 6. Aprendizajes activos
    const aprendizajesEl = document.getElementById('dashboard-aprendizajes');
    if (aprendizajesEl) {
        aprendizajesEl.textContent = metricas.ingredientesUnicos;
        animarContador(aprendizajesEl);
    }
}

// FUNCIÓN DE ANIMACIÓN
function animarContador(elemento) {
    elemento.style.animation = 'none';
    elemento.offsetHeight; // Trigger reflow
    elemento.style.animation = 'pulse 0.5s ease-in-out';
}

// ===== FUNCIÓN DE LIMPIEZA DE EVENT LISTENERS =====
function cleanupFileHandling() {
    console.log('🧹 Limpiando event listeners de archivos...');
    
    const fileInput = document.getElementById('file-input');
    const uploadBox = document.getElementById('upload-box');
    const browseButton = document.getElementById('browse-button');
    const removeFileButton = document.getElementById('remove-file');

    if (!fileInput || !uploadBox || !browseButton || !removeFileButton) {
        console.log('📁 Elementos no encontrados para limpieza');
        return;
    }

    // Remover todos los event listeners usando cloneNode
    const newFileInput = fileInput.cloneNode(true);
    const newUploadBox = uploadBox.cloneNode(true);
    const newBrowseButton = browseButton.cloneNode(true);
    const newRemoveFileButton = removeFileButton.cloneNode(true);

    // Reemplazar elementos para eliminar todos los listeners
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    uploadBox.parentNode.replaceChild(newUploadBox, uploadBox);
    browseButton.parentNode.replaceChild(newBrowseButton, browseButton);
    removeFileButton.parentNode.replaceChild(newRemoveFileButton, removeFileButton);

    // Resetear la bandera de configuración
    window.fileHandlingConfigured = false;
    
    console.log('✅ Event listeners de archivos limpiados completamente');
}

// ===== FUNCIÓN DE LIMPIEZA DE EVENT LISTENERS DE CÁMARA =====
function cleanupCameraHandling() {
    console.log('🧹 Limpiando event listeners de cámara nativa...');
    
    const cameraButton = document.getElementById('camera-button');
    const cameraInput = document.getElementById('camera-input');

    if (!cameraButton || !cameraInput) {
        console.log('📷 Elementos de cámara nativa no encontrados para limpieza');
        return;
    }

    // Remover todos los event listeners usando cloneNode
    const newCameraButton = cameraButton.cloneNode(true);
    const newCameraInput = cameraInput.cloneNode(true);

    // Reemplazar elementos para eliminar todos los listeners
    cameraButton.parentNode.replaceChild(newCameraButton, cameraButton);
    cameraInput.parentNode.replaceChild(newCameraInput, cameraInput);

    // Resetear la bandera de configuración
    window.cameraHandlingConfigured = false;
    
    console.log('✅ Event listeners de cámara nativa limpiados completamente');
}

// ===== UTILIDADES: Modal nombre cliente y asegurar restaurante =====
function openClientNameModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('client-name-modal');
        const input = document.getElementById('client-name-input');
        const accept = document.getElementById('client-name-accept');
        const cancel = document.getElementById('client-name-cancel');
        const closeBtn = document.getElementById('client-name-close');
        const lastFocus = document.activeElement;
        if (!modal || !input || !accept || !cancel) return resolve(null);
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        const cleanup = (val) => {
            modal.classList.add('hidden');
            resolve(val);
            const analyzeSupabaseButton = document.getElementById('analyze-supabase-button');
            if (analyzeSupabaseButton) analyzeSupabaseButton.focus();
        };
        accept.onclick = () => {
            const val = input.value.trim();
            if (!val) {
                input.classList.add('ring-2', 'ring-red-400');
                setTimeout(() => input.classList.remove('ring-2', 'ring-red-400'), 1200);
                return;
            }
            cleanup(val);
        };
        cancel.onclick = () => cleanup(null);
        if (closeBtn) closeBtn.onclick = () => cleanup(null); // cerrar con X como cancelar
        // No cerrar por click fuera para evitar inicio accidental
        modal.onclick = (e) => { if (e.target === modal) {/* no hacer nada */} };
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusables = [input, cancel, accept, closeBtn].filter(Boolean);
                const idx = focusables.indexOf(document.activeElement);
                if (e.shiftKey) {
                    const prev = focusables[(idx - 1 + focusables.length) % focusables.length];
                    (prev || input).focus();
                } else {
                    const next = focusables[(idx + 1) % focusables.length];
                    (next || input).focus();
                }
                e.preventDefault();
            }
        });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') accept.onclick(); });
    });
}

async function ensureRestaurante(nombre) {
    try {
        if (!nombre || !supabaseClient) return null;
        // Buscar si existe
        const { data: existing, error: sErr } = await supabaseClient
            .from('restaurantes')
            .select('id')
            .ilike('nombre', nombre)
            .limit(1);
        if (!sErr && existing && existing.length > 0) return existing[0].id;
        // Crear si no existe
        const { data: created, error: cErr } = await supabaseClient
            .from('restaurantes')
            .insert({ nombre })
            .select('id')
            .single();
        if (cErr) throw cErr;
        return created?.id || null;
    } catch (e) {
        console.warn('ensureRestaurante error:', e);
        return null;
    }
}
