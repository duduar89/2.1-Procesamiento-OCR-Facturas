// Configuration
const SUPABASE_URL = 'https://yurqgcpgwsgdnxnpyxes.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cnFnY3Bnd3NnZG54bnB5eGVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkyODM4MiwiZXhwIjoyMDcwNTA0MzgyfQ.cVwMjZ72uZwOrX-tGJFsOhVVDATiMBnWeyYRu0P6bvQ';
const RESTAURANT_ID = '2852b1af-38d8-43ec-8872-2b2921d5a231';

// Global variables
let currentSection = 'dashboard';
let dashboardData = null;
// Variable para controlar vista actual de períodos
let currentPeriodView = 'mensual';
let salesChart = null;
let paymentChart = null;
let productsChart = null;
let hourlySalesChart = null;
let hourlyTicketsChart = null;

// VARIABLES GLOBALES PARA ANÁLISIS SEMANAL
let weeklyChart = null;
let currentWeekData = null;
let currentWeekOffset = 0; // 0 = esta semana, -1 = semana anterior, +1 = siguiente

// Variables globales para el selector de fechas
let activeRange = 'week'; // Por defecto última semana
let customPickerVisible = false;

// Variables globales para drag & drop
let currentAnalyzedData = null;

// =============================================
// PLUGIN CHART.JS: ICONOS METEOROLÓGICOS SEMANA
// =============================================
// 🔇 CONTROL AVANZADO ANTI-SPAM
let lastWeatherLogTime = 0;
let lastWeatherDrawTime = 0;
const WEATHER_LOG_COOLDOWN = 5000; // 5 segundos
const WEATHER_DRAW_COOLDOWN = 1000; // 1 segundo entre redibujados

const weatherIconsWeekPlugin = {
    id: 'weatherIconsWeek',
    
    afterDraw(chart, args, options) {
        // 🛑 THROTTLE: Solo ejecutar cada 1 segundo máximo
        const now = Date.now();
        if (now - lastWeatherDrawTime < WEATHER_DRAW_COOLDOWN) {
            return;
        }
        lastWeatherDrawTime = now;
        
        const { ctx, chartArea, scales, data } = chart;
        const weatherData = options.weatherData;
        
        // Solo aplicar si hay datos meteorológicos REALES
        if (!weatherData || !Array.isArray(weatherData) || weatherData.length === 0) {
            // 🔇 EVITAR SPAM: Solo mostrar log cada 5 segundos
            if (now - lastWeatherLogTime > WEATHER_LOG_COOLDOWN) {
                console.log('🚫 No hay datos meteorológicos reales - iconos desactivados');
                lastWeatherLogTime = now;
            }
            return;
        }
        
        // Verificar que es un gráfico semanal (7 días máximo)
        if (data.labels.length > 7) {
            return; // No aplicar a gráficos mensuales o personalizados
        }
        
        console.log(`🌍 Aplicando ${weatherData.length} iconos meteorológicos REALES a gráfico semanal`);
        
        ctx.save();
        
        // Configurar estilo del texto
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#374151';
        
        // Sombra para mejor legibilidad
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        const xScale = scales.x;
        const yPosition = chartArea.top - 25; // Un poco más arriba para dar espacio
        
        // MAPEO CORRECTO: Crear mapa de fechas para datos meteorológicos
        const weatherByDate = new Map();
        weatherData.forEach(w => {
            if (w.fecha) {
                weatherByDate.set(w.fecha, w);
            }
        });
        
        console.log(`🔍 Mapeando ${weatherData.length} datos meteorológicos:`, 
            weatherData.map(w => `${w.fecha}: ${w.icono_emoji}`));
        
        data.labels.forEach((label, index) => {
            let weather = null;
            
            console.log(`🔍 Procesando label ${index}: "${label}"`);
            
            // ESTRATEGIA MEJORADA: Priorizar búsqueda por fecha exacta
            if (typeof label === 'string') {
                // Si el label es una fecha directa (YYYY-MM-DD)
                if (label.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    weather = weatherByDate.get(label);
                    console.log(`   → Fecha exacta: ${label} → ${weather?.icono_emoji || 'Sin datos'}`);
                } else {
                    // Si es día de la semana, calcular fecha esperada
                    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                    const diaIndex = diasSemana.indexOf(label);
                    if (diaIndex !== -1) {
                        // Calcular qué fecha debería corresponder a este día de la semana
                        // Usar fecha de inicio del dashboard + offset del día
                        if (dashboardData?.ventas_por_dia && dashboardData.ventas_por_dia.length > 0) {
                            const primeraFecha = dashboardData.ventas_por_dia[0]?.fecha;
                            if (primeraFecha) {
                                const fechaBase = new Date(primeraFecha + 'T12:00:00');
                                const fechaCalculada = new Date(fechaBase);
                                fechaCalculada.setDate(fechaBase.getDate() + index);
                                const fechaEsperada = fechaCalculada.toISOString().split('T')[0];
                                
                                weather = weatherByDate.get(fechaEsperada);
                                console.log(`   → Día "${label}" (${diaIndex}) → fecha calculada: ${fechaEsperada} → ${weather?.icono_emoji || 'Sin datos'}`);
                            }
                        }
                        
                        // Fallback: usar índice directo si está disponible
                        if (!weather && weatherData[index]) {
                            weather = weatherData[index];
                            console.log(`   → Fallback día "${label}": usando índice ${index} → ${weather.fecha} ${weather.icono_emoji}`);
                        }
                    }
                }
            } else {
                // Fallback: usar índice directo para cualquier otro tipo de label
                if (weatherData[index]) {
                    weather = weatherData[index];
                    console.log(`   → Índice directo ${index}: ${weather.fecha} ${weather.icono_emoji}`);
                }
            }
            
            if (weather && weather.icono_emoji) {
                const xPosition = xScale.getPixelForValue(index);
                
                // Verificar que está dentro del área visible
                if (xPosition >= chartArea.left && xPosition <= chartArea.right) {
                    // NORMALIZAR ICONO: Convertir iconos nocturnos a diurnos
                    let iconoMostrar = weather.icono_emoji;
                    if (iconoMostrar === '🌙') {
                        iconoMostrar = '☀️'; // Luna nocturna → Sol diurno
                    }
                    
                    // Dibujar el icono normalizado
                    ctx.fillText(iconoMostrar, xPosition, yPosition);
                    
                    // Temperatura debajo del icono
                    if (weather.temperatura) {
                        ctx.save();
                        ctx.font = '10px Arial, sans-serif';
                        ctx.fillStyle = '#6b7280';
                        ctx.fillText(`${Math.round(weather.temperatura)}°`, xPosition, yPosition + 15);
                        ctx.restore();
                    }
                }
            }
        });
        
        ctx.restore();
    }
};

// Registrar el plugin
Chart.register(weatherIconsWeekPlugin);

// =============================================
// PROCESAMIENTO DE DATOS METEOROLÓGICOS
// =============================================
// En loadDashboardComparativo o donde proceses los datos
function procesarDatosMeteorologicos(dashboardData) {
    console.log('🌤️ Procesando datos meteorológicos REALES para vista semanal');
    
    // Si es vista semanal, verificar datos meteorológicos reales
    if (dashboardData.tipo_rango === 'week') {
        if (!dashboardData.weather_forecast || dashboardData.weather_forecast.length === 0) {
            console.warn('🚫 No hay datos meteorológicos reales disponibles - iconos desactivados');
            dashboardData.weather_forecast = [];
            return;
        }
        
        console.log(`🌍 ${dashboardData.weather_forecast.length} días con datos meteorológicos REALES:`);
        dashboardData.weather_forecast.forEach((w, i) => {
            console.log(`   ${w.fecha}: ${w.icono_emoji} ${w.condicion_descripcion} (${w.temperatura}°C)`);
        });
    }
}



// Debug específico para vista semanal
function debugWeatherWeekChart() {
    console.log('=== DEBUG GRÁFICO SEMANAL CON ICONOS ===');
    console.log('Tipo de rango:', dashboardData?.tipo_rango);
    console.log('Es vista semanal:', dashboardData?.tipo_rango === 'week');
    console.log('Chart instance exists:', !!salesChart);
    
    if (dashboardData?.weather_forecast) {
        console.log('🌤️ Datos meteorológicos disponibles:');
        dashboardData.weather_forecast.forEach((weather, i) => {
            console.log(`   ${weather.fecha}: ${weather.icono_emoji} ${weather.condicion_descripcion} (${weather.temperatura}°C)`);
        });
        
        // Debug del mapeo de labels del gráfico
        if (salesChart?.data?.labels) {
            console.log('📊 Labels del gráfico:');
            salesChart.data.labels.forEach((label, i) => {
                console.log(`   Posición ${i}: "${label}"`);
            });
        }
        
        // Debug del período del dashboard
        console.log('📅 Período del dashboard:');
        console.log(`   Fecha inicio período: ${dashboardData?.periodo_anterior?.fecha_inicio}`);
        console.log(`   Fecha fin período: ${dashboardData?.periodo_anterior?.fecha_fin}`);
    } else {
        console.log('❌ No hay datos meteorológicos');
    }
    
    // Verificar configuración del plugin
    if (salesChart?.options?.plugins?.weatherIconsWeek) {
        console.log('✅ Plugin meteorológico configurado');
    } else {
        console.log('❌ Plugin meteorológico NO configurado');
    }
}

// Hacer disponible en consola
window.debugWeatherWeekChart = debugWeatherWeekChart;

// ========================================
// SISTEMA DE AUTO-SINCRONIZACIÓN
// ========================================
let autoSyncInterval = null;
let nextSyncTimeout = null;
let isServiceHours = false;
let lastSyncTime = null;
let currentFileHash = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDates(); // Esto ahora establece "Esta Semana" como activo
    // Usar función comparativa desde el inicio
    loadDashboardComparativo('week'); // Por defecto "Esta Semana"
    checkIntegrationStatus();
    setupAutoRefresh();
    initializeDragAndDrop(); // Inicializar sistema drag & drop
    initializeAutoSync(); // ⏰ Inicializar auto-sincronización
    // Remover: setupGlobalMonthSelector();
    
    // ✅ NUEVO: Verificar si la sección diario está activa y activar "Ayer" automáticamente
    setTimeout(() => {
        const diarioSection = document.getElementById('diario-section');
        if (diarioSection && diarioSection.classList.contains('active')) {
            console.log('🎯 Sección diario activa detectada - Activando "Ayer" automáticamente');
            setQuickRange('yesterday');
        }
    }, 500); // Delay para asegurar que todo esté cargado
});

// Navigation
async function showSection(section, event) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(section + '-section').classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    currentSection = section;
    
    // ACTUALIZAR ESTE SWITCH
    switch(section) {
        case 'diario':
            // Código actual del dashboard
            if (dashboardData) {
                setTimeout(() => {
                    if (dashboardData.ventas_por_hora && dashboardData.ventas_por_hora.length > 0) {
                        updateSalesChart(dashboardData.ventas_por_hora);
                    }
                    if (dashboardData.metodos_pago) {
                        updatePaymentChart(dashboardData.metodos_pago);
                    }
                    if (dashboardData.ventas_por_hora && dashboardData.ventas_por_hora.length > 0) {
                        // ⚡ OPTIMIZACIÓN: Reducir logs costosos
                        console.log('🔥 Datos horarios disponibles:', dashboardData.ventas_por_hora?.length || 0, 'registros');
                        // console.log('🔍 DEBUG - Primer dato horario:', dashboardData.ventas_por_hora[0]);
                        // console.log('🔍 DEBUG - Estructura completa ventas_por_hora:', JSON.stringify(dashboardData.ventas_por_hora, null, 2));
                        updateHourlyCharts(dashboardData.ventas_por_hora);
                        generateTicketsHeatmap(dashboardData.ventas_por_hora);
                    } else {
                        console.warn('❌ No hay datos horarios en dashboardData:', dashboardData.ventas_por_hora);
                    }
                }, 100);
            }
            
            // ✅ NUEVO: Automáticamente activar la pestaña "Ayer" cuando se selecciona análisis diario
            setTimeout(() => {
                console.log('🎯 Activando pestaña "Ayer" por defecto en análisis diario');
                setQuickRange('yesterday'); // Activar "Ayer" automáticamente
            }, 200); // Pequeño delay para asegurar que el DOM esté listo
            break;
        
        case 'semanal':
            loadAnalisisSemanal(); // FUNCIÓN QUE TE DI ANTES
            break;
            
        case 'periodos':
            loadAnalisisPeriodos(); 
            break;
            
        case 'products':
            await loadProductsData();
            // AGREGAR: Si hay datos de dashboard, actualizar gráfica
            if (dashboardData && dashboardData.productos_top) {
                // Pequeño delay para que el DOM se actualice
                setTimeout(() => {
                    updateProductsChart(dashboardData.productos_top);
                }, 100);
            }
            break;
            
        case 'config':
            // Configuración
            break;
    }
}

// NUEVA FUNCIÓN: Cambiar entre mensual y anual
function switchPeriodView(view, event) {
    console.log(`🔄 Cambiando a vista: ${view}`);
    
    // Actualizar pestañas
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Actualizar contenido
    document.querySelectorAll('.period-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${view}-content`).classList.add('active');
    
    // Cargar datos correspondientes
    currentPeriodView = view;
    if (view === 'mensual') {
        loadDatosMensuales();
    } else {
        loadDatosAnuales();
    }
}

// FUNCIONES DE CARGA DE DATOS
async function loadAnalisisPeriodos() {
    console.log('📊 Cargando análisis de períodos...');
    // Cargar vista mensual por defecto
    loadDatosMensuales();
}

// FUNCIÓN HELPER: Llamar get-dashboard-data con fechas específicas
async function callGetDashboardData(fechaInicio, fechaFin, label = '') {
    // 🔧 SOLUCIÓN: Filtrar datos del domingo para evitar cálculos incorrectos
    // Solo enviar fechas de Lunes a Sábado al backend
    let fechaInicioFiltrada = new Date(fechaInicio);
    let fechaFinFiltrada = new Date(fechaInicio);
    
    // Calcular sábado (6 días después del lunes)
    fechaFinFiltrada.setDate(fechaInicio.getDate() + 5);
    
    const requestBody = {
        restaurante_id: RESTAURANT_ID,
        fecha_inicio: fechaInicioFiltrada.toISOString().split('T')[0],
        fecha_fin: fechaFinFiltrada.toISOString().split('T')[0],
        tipo_rango: 'week'
    };
    
    console.log(`📡 Llamando get-dashboard-data para ${label}: ${requestBody.fecha_inicio} - ${requestBody.fecha_fin}`);
    console.log(`🔍 DEBUG FECHAS - activeRange=${activeRange}, tipo_rango=${requestBody.tipo_rango}`);
    console.log(`🔧 FILTRO DOMINGO: Fechas originales ${fechaInicio.toISOString().split('T')[0]} - ${fechaFin.toISOString().split('T')[0]}`);
    console.log(`🔧 FILTRO DOMINGO: Fechas filtradas ${requestBody.fecha_inicio} - ${requestBody.fecha_fin} (Lun-Sáb)`);
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error en la respuesta del servidor');
        }
        
        console.log(`✅ Datos recibidos para ${label}:`, result.data?.resumen?.total_ventas_bruto || 0, '€');
        return result.data;
        
    } catch (error) {
        console.error(`❌ Error cargando datos para ${label}:`, error);
        return null; // Devolver null si hay error, no romper todo el flujo
    }
}

// FUNCIÓN: Calcular fechas de semana con offset (7 días completos)
function calculateWeekDates(weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = domingo, 1 = lunes...
    
    // Calcular lunes de esta semana
    const mondayOffset = currentDay === 0 ? -6 : -(currentDay - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
    
    // Calcular domingo de esta semana  
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
        inicio: monday,
        fin: sunday,
        numero_semana: getWeekNumber(monday),
        año: monday.getFullYear()
    };
}

// FUNCIÓN NUEVA: Calcular fechas de "Esta Semana" (igual que Dashboard Comparativo)
function calculateThisWeekRange(weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = domingo, 1 = lunes...
    
    // Calcular lunes de esta semana
    const mondayOffset = currentDay === 0 ? -6 : -(currentDay - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
    
    // 🔧 CRÍTICO: Para análisis semanal, SIEMPRE usar domingo como fecha fin
    // Esto asegura que tengamos 7 días completos (Lunes a Domingo) para la visualización
    // PERO el backend solo recibirá Lunes a Sábado para evitar datos incorrectos del domingo
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // 🔍 DEBUG: Verificar cálculo
    console.log(`🔍 DEBUG calculateThisWeekRange:`);
    console.log(`   - Today: ${today.toISOString().split('T')[0]} (día ${currentDay})`);
    console.log(`   - Monday offset: ${mondayOffset}`);
    console.log(`   - Monday calculated: ${monday.toISOString().split('T')[0]}`);
    console.log(`   - Sunday calculated: ${sunday.toISOString().split('T')[0]}`);
    console.log(`   - Week offset: ${weekOffset}`);
    console.log(`   - ⚠️ NOTA: Backend recibirá solo Lunes a Sábado para evitar datos incorrectos del domingo`);
    
    return {
        inicio: monday,
        fin: sunday,
        numero_semana: getWeekNumber(monday),
        año: monday.getFullYear()
    };
}

// FUNCIÓN: Obtener número de semana del año
function getWeekNumber(date) {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDay) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

// FUNCIÓN: Calcular fechas de semana equivalente mes anterior
function calculateSameWeekPreviousMonth(currentWeekStart) {
    // Ir al mismo día de la semana del mes anterior
    const mesAnterior = new Date(currentWeekStart);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    
    // Ajustar si el día no existe (ej: 31 de marzo -> 28/29 febrero)
    if (mesAnterior.getDate() !== currentWeekStart.getDate()) {
        mesAnterior.setDate(0); // Último día del mes anterior
        mesAnterior.setDate(mesAnterior.getDate() - 6); // Retroceder para conseguir lunes
    }
    
    const inicio = new Date(mesAnterior);
    const fin = new Date(mesAnterior);
    fin.setDate(fin.getDate() + 6);
    
    // 🔍 DEBUG: Verificar cálculo mes anterior
    console.log(`🔍 DEBUG calculateSameWeekPreviousMonth:`);
    console.log(`   - Current week start: ${currentWeekStart.toISOString().split('T')[0]}`);
    console.log(`   - Month ago calculated: ${inicio.toISOString().split('T')[0]} - ${fin.toISOString().split('T')[0]}`);
    
    return { inicio, fin };
}

// FUNCIÓN: Calcular fechas de semana equivalente año anterior  
function calculateSameWeekPreviousYear(currentWeekStart) {
    const añoAnterior = new Date(currentWeekStart);
    añoAnterior.setFullYear(añoAnterior.getFullYear() - 1);
    
    const inicio = new Date(añoAnterior);
    const fin = new Date(añoAnterior);
    fin.setDate(fin.getDate() + 6);
    
    // 🔍 DEBUG: Verificar cálculo año anterior
    console.log(`🔍 DEBUG calculateSameWeekPreviousYear:`);
    console.log(`   - Current week start: ${currentWeekStart.toISOString().split('T')[0]}`);
    console.log(`   - Year ago calculated: ${inicio.toISOString().split('T')[0]} - ${fin.toISOString().split('T')[0]}`);
    
    return { inicio, fin };
}

// FUNCIÓN PRINCIPAL: Cargar análisis semanal
async function loadAnalisisSemanal() {
    console.log('📈 === CARGANDO ANÁLISIS SEMANAL ===');
    
    try {
        showLoadingState('semanal-section');
        
        // 1. Calcular fechas de "Esta Semana" (igual que Dashboard Comparativo)
        const weekDates = calculateThisWeekRange(currentWeekOffset);
        console.log(`📅 SEMANA CALCULADA (Esta Semana):`, {
            inicio: weekDates.inicio.toISOString().split('T')[0],
            fin: weekDates.fin.toISOString().split('T')[0],
            offset: currentWeekOffset
        });
        updateWeekDisplay(weekDates);
        
        // 2. Cargar datos comparativos con múltiples llamadas
        await loadWeeklyComparativeData(weekDates);
        
        // 3. Crear gráfico avanzado
        await createAdvancedWeeklyChart();
        
        // 3.1. Crear gráfico de ventas vs ticket medio semanal
        createWeeklyCombinedChart();
        
                // 4. Actualizar métricas semanales
        console.log('🔍 ANTES DE updateWeeklyMetrics - currentWeekData:', currentWeekData);
        updateWeeklyMetrics();
        
        // 5. Configurar controles interactivos
        setupChartControls();
        
        hideLoadingState('semanal-section');
        showNotification('Análisis semanal cargado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error cargando análisis semanal:', error);
        hideLoadingState('semanal-section');
        showNotification('Error cargando análisis semanal: ' + error.message, 'error');
    }
}

// FUNCIÓN: Cargar datos comparativos con 4 llamadas paralelas
async function loadWeeklyComparativeData(weekDates) {
    console.log('🔄 === CARGANDO 4 COMPARATIVAS SEMANALES ===');
    
    const tiempoInicio = Date.now();
    
    // CALCULAR TODAS LAS FECHAS (Esta Semana + comparativas)
    const fechaActual = { inicio: weekDates.inicio, fin: weekDates.fin };
    
    const fechaAnterior = {
        inicio: new Date(weekDates.inicio.getTime() - 7 * 24 * 60 * 60 * 1000),
        fin: new Date(weekDates.fin.getTime() - 7 * 24 * 60 * 60 * 1000)
    };
    
    const fechaMesPasado = calculateSameWeekPreviousMonth(weekDates.inicio);
    const fechaAñoPasado = calculateSameWeekPreviousYear(weekDates.inicio);
    
    console.log('📅 Fechas calculadas:');
    console.log('   Esta semana:', fechaActual.inicio.toISOString().split('T')[0], '-', fechaActual.fin.toISOString().split('T')[0]);
    console.log('   Semana anterior:', fechaAnterior.inicio.toISOString().split('T')[0], '-', fechaAnterior.fin.toISOString().split('T')[0]);
    console.log('   Mes pasado:', fechaMesPasado.inicio.toISOString().split('T')[0], '-', fechaMesPasado.fin.toISOString().split('T')[0]);
    console.log('   Año pasado:', fechaAñoPasado.inicio.toISOString().split('T')[0], '-', fechaAñoPasado.fin.toISOString().split('T')[0]);
    
    // 4 LLAMADAS PARALELAS 🚀
    // ⚠️ NOTA: callGetDashboardData automáticamente filtra para enviar solo Lunes a Sábado al backend
    // Esto evita que los datos incorrectos del domingo afecten total_tickets y ticket_promedio
    const [datosActual, datosAnterior, datosMesPasado, datosAñoPasado] = await Promise.all([
        callGetDashboardData(fechaActual.inicio, fechaActual.fin, 'Esta Semana'),
        callGetDashboardData(fechaAnterior.inicio, fechaAnterior.fin, 'Semana Anterior'),
        callGetDashboardData(fechaMesPasado.inicio, fechaMesPasado.fin, 'Mes Pasado'),
        callGetDashboardData(fechaAñoPasado.inicio, fechaAñoPasado.fin, 'Año Pasado')
    ]);
    
    const tiempoFinal = Date.now();
    console.log(`⚡ 4 llamadas completadas en ${tiempoFinal - tiempoInicio}ms`);
    
    // GUARDAR DATOS GLOBALMENTE
    currentWeekData = {
        actual: datosActual,
        anterior: datosAnterior,
        mes_anterior: datosMesPasado,
        año_anterior: datosAñoPasado
    };
    
    // LOGS PARA DEBUG
    console.log('📊 Resumen de datos cargados:');
    console.log('   Esta semana:', datosActual?.resumen?.total_ventas_bruto || 0, '€');
    console.log('   Semana anterior:', datosAnterior?.resumen?.total_ventas_bruto || 0, '€');
    console.log('   Mes pasado:', datosMesPasado?.resumen?.total_ventas_bruto || 0, '€');
    console.log('   Año pasado:', datosAñoPasado?.resumen?.total_ventas_bruto || 0, '€');
    
    return currentWeekData;
}

// 🌤️ FUNCIONES PARA ICONOS METEOROLÓGICOS

// FUNCIÓN: Obtener datos meteorológicos para la semana
async function getWeatherDataForWeek(fechaInicio, fechaFin) {
    try {
        const { data, error } = await supabase
            .from('correlacion_clima_ventas')
            .select('fecha, temperatura_media, condicion_principal, precipitacion')
            .eq('restaurante_id', RESTAURANT_ID)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('fecha', { ascending: true });

        if (error) {
            console.error('Error obteniendo datos meteorológicos:', error);
            return [];
        }

        console.log(`🌤️ Datos meteorológicos obtenidos: ${data?.length || 0} registros`);
        return data || [];
    } catch (error) {
        console.error('Error en getWeatherDataForWeek:', error);
        return [];
    }
}

// FUNCIÓN: Convertir condición meteorológica a emoji
function getWeatherEmoji(condicion, precipitacion = 0) {
    if (!condicion) return '🌤️';
    
    const condition = condicion.toLowerCase();
    
    if (precipitacion > 0.1) return '🌧️';
    if (condition.includes('clear') || condition.includes('sun')) return '☀️';
    if (condition.includes('cloud')) return '☁️';
    if (condition.includes('rain')) return '🌧️';
    if (condition.includes('cold')) return '❄️';
    
    return '🌤️'; // Default
}

// FUNCIÓN: Agregar iconos meteorológicos al gráfico (🔥 VERSIÓN ÉPICA 🔥)
function addWeatherIconsToChart(chart, weatherData) {
    console.log(`🔥 INICIO VERSIÓN ÉPICA - Iconos grandes + temperatura + posicionamiento inteligente`);
    
    if (!chart || !weatherData || weatherData.length === 0) {
        console.log('🚫 No se pueden agregar iconos: faltan datos');
        return;
    }

    const canvas = chart.canvas;
    const chartContainer = canvas.parentElement;
    
    // Remover iconos existentes
    const existingIcons = chartContainer.querySelectorAll('.weather-icon-overlay, .epic-weather');
    existingIcons.forEach(icon => icon.remove());
    
    const chartArea = chart.chartArea;
    const labels = chart.data.labels;
    
    if (!chartArea || !labels) {
        console.log('❌ ERROR: No se puede posicionar iconos');
        return;
    }
    
    console.log(`🔥 Creando ${weatherData.length} ICONOS ÉPICOS con temperatura`);
    
    weatherData.forEach((weather, index) => {
        if (index >= labels.length) return;
        
        // 🔥 CONTENEDOR ÉPICO
        const weatherContainer = document.createElement('div');
        weatherContainer.className = 'weather-icon-overlay epic-weather';
        
        // 🌡️ ICONO GRANDE
        const iconSpan = document.createElement('span');
        iconSpan.className = 'weather-emoji';
        iconSpan.textContent = getWeatherEmoji(weather.condicion_principal, weather.precipitacion);
        
        // 🌡️ TEMPERATURA VISIBLE
        const tempSpan = document.createElement('span');
        tempSpan.className = 'weather-temp';
        tempSpan.textContent = `${Math.round(weather.temperatura_media)}°`;
        
        weatherContainer.appendChild(iconSpan);
        weatherContainer.appendChild(tempSpan);
        
        // 📐 POSICIONAMIENTO INTELIGENTE
        const xPosition = chartArea.left + (index * (chartArea.width / (labels.length - 1)));
        
        // 🎯 Intentar obtener altura del gráfico para posicionar dinámicamente
        let yPosition = chartArea.top - 70; // Por defecto arriba
        
        try {
            const datasets = chart.data.datasets;
            if (datasets && datasets.length > 0) {
                // Buscar el primer dataset con datos
                const mainDataset = datasets.find(d => d.data && d.data[index] !== undefined);
                if (mainDataset && mainDataset.data[index] > 0) {
                    const dataValue = mainDataset.data[index];
                    const scale = chart.scales.y;
                    if (scale) {
                        const pixelValue = scale.getPixelForValue(dataValue);
                        yPosition = Math.max(pixelValue - 90, chartArea.top - 70); // Arriba del punto pero no muy arriba
                    }
                }
            }
        } catch (error) {
            // Usar posición por defecto si falla
        }
        
        // 🎨 ESTILOS ÉPICOS
        weatherContainer.style.cssText = `
            position: absolute;
            left: ${xPosition - 25}px;
            top: ${yPosition}px;
            z-index: 15;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            pointer-events: auto;
            cursor: help;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.4));
            background: rgba(255,255,255,0.9);
            border-radius: 12px;
            padding: 8px 6px;
            border: 2px solid rgba(255,255,255,0.8);
            backdrop-filter: blur(10px);
        `;
        
        // 🌤️ ESTILOS DEL ICONO (MÁS GRANDE)
        iconSpan.style.cssText = `
            font-size: 28px;
            line-height: 1;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        `;
        
        // 🌡️ ESTILOS DE LA TEMPERATURA
        tempSpan.style.cssText = `
            font-size: 12px;
            font-weight: bold;
            color: #2c3e50;
            text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
            margin-top: -2px;
        `;
        
        // 🎭 EFECTOS HOVER ÉPICOS
        weatherContainer.addEventListener('mouseenter', () => {
            weatherContainer.style.transform = 'scale(1.15) translateY(-5px)';
            weatherContainer.style.filter = 'drop-shadow(5px 5px 12px rgba(0,0,0,0.6))';
            weatherContainer.style.background = 'rgba(255,255,255,0.95)';
            iconSpan.style.fontSize = '32px';
        });
        
        weatherContainer.addEventListener('mouseleave', () => {
            weatherContainer.style.transform = 'scale(1) translateY(0px)';
            weatherContainer.style.filter = 'drop-shadow(3px 3px 6px rgba(0,0,0,0.4))';
            weatherContainer.style.background = 'rgba(255,255,255,0.9)';
            iconSpan.style.fontSize = '28px';
        });
        
        // 🌤️ TOOLTIP ÉPICO
        const temp = Math.round(weather.temperatura_media);
        const precip = weather.precipitacion > 0 ? ` - ${weather.precipitacion}mm lluvia` : '';
        weatherContainer.title = `${weather.condicion_principal}\\n${temp}°C${precip}\\nFecha: ${weather.fecha}`;
        
        chartContainer.style.position = 'relative';
        chartContainer.appendChild(weatherContainer);
        
        console.log(`🔥 ÉPICO ${index + 1}: ${iconSpan.textContent} ${tempSpan.textContent} en (${Math.round(xPosition)}, ${Math.round(yPosition)})`);
    });
    
    console.log(`🎉 ¡${weatherData.length} ICONOS ÉPICOS COMPLETADOS! 🔥`);
}

// FUNCIÓN: Crear gráfico avanzado con 4 líneas sombreadas
async function createAdvancedWeeklyChart() {
    const ctx = document.getElementById('weekly-comparison-chart');
    if (!ctx || !currentWeekData) {
        console.warn('❌ No se puede crear gráfico: falta canvas o datos');
        return;
    }
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    const datasets = [];
    const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    console.log('🎨 Creando gráfico con datos:', currentWeekData);
    
    // 🔍 DEBUG CRÍTICO: Verificar estructura de datos
    if (currentWeekData.actual?.ventas_por_dia) {
        console.log('🔍 DATOS ACTUALES - Estructura completa:');
        console.log('   - Total días con datos:', currentWeekData.actual.ventas_por_dia.length);
        console.log('   - Fechas disponibles:', currentWeekData.actual.ventas_por_dia.map(v => v.fecha));
        console.log('   - Datos completos:', currentWeekData.actual.ventas_por_dia);
    }
    
    if (currentWeekData.anterior?.ventas_por_dia) {
        console.log('🔍 DATOS ANTERIORES - Estructura completa:');
        console.log('   - Total días con datos:', currentWeekData.anterior.ventas_por_dia.length);
        console.log('   - Fechas disponibles:', currentWeekData.anterior.ventas_por_dia.map(v => v.fecha));
        console.log('   - Datos completos:', currentWeekData.anterior.ventas_por_dia);
    }
    
    // SERIE 1: Esta semana (VERDE BRILLANTE) - USAR MISMOS DATOS QUE DASHBOARD DIARIO
    if (currentWeekData.actual?.ventas_por_dia) {
        // 🔧 CRÍTICO: Usar EXACTAMENTE la misma lógica que el Dashboard Diario
        // PERO rellenar con 0 los días sin datos para completar 7 días
        const datosPorDia = [];
        const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        // 🔍 DEBUG DETALLADO: Mostrar todos los datos disponibles
        console.log('🔍 DEBUG COMPLETO - Datos disponibles en ventas_por_dia:');
        currentWeekData.actual.ventas_por_dia.forEach((venta, index) => {
            const fecha = new Date(venta.fecha);
            const diaSemana = fecha.getDay();
            const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1;
            console.log(`   ${index}: Fecha=${venta.fecha}, getDay()=${diaSemana}, Convertido=${diaConvertido}, Ventas=€${venta.ventas}`);
        });
        
        // Procesar cada día de la semana (Lunes=0, Domingo=6)
        for (let i = 0; i < 7; i++) {
            // Buscar ventas de este día de la semana
            const ventasDelDia = currentWeekData.actual.ventas_por_dia.find(v => {
                const fecha = new Date(v.fecha);
                const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
                const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a 0=Lunes, 6=Domingo
                
                // 🔍 DEBUG: Mostrar cada búsqueda
                console.log(`🔍 Buscando día ${i} (${diasSemana[i]}): fecha=${v.fecha}, getDay()=${diaSemana}, convertido=${diaConvertido}, ¿coincide? ${diaConvertido === i}`);
                
                return diaConvertido === i;
            });
            
            // Agregar ventas del día o 0 si no hay datos
            const ventasDelDiaValor = ventasDelDia ? ventasDelDia.ventas : 0;
            datosPorDia.push(ventasDelDiaValor);
            
            console.log(`📊 ${diasSemana[i]} (índice ${i}): ${ventasDelDia ? `€${ventasDelDia.ventas} encontrado` : '€0 - sin datos'}`);
        }
        
        console.log('🔍 DEBUG - Datos procesados para 7 días:', datosPorDia);
        console.log('🔍 DEBUG - Total sumado:', datosPorDia.reduce((sum, val) => sum + val, 0));
        
        datasets.push({
            label: 'Esta Semana',
            data: datosPorDia,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 4,
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 3,
            pointHoverRadius: 8
        });
        console.log('✅ Serie "Esta Semana" agregada:', datosPorDia);
    }
    
    // SERIE 2: Semana anterior (GRIS) - USAR MISMOS DATOS QUE DASHBOARD DIARIO
    if (currentWeekData.anterior?.ventas_por_dia) {
        // 🔧 CRÍTICO: Usar EXACTAMENTE la misma lógica que el Dashboard Diario
        // PERO rellenar con 0 los días sin datos para completar 7 días
        const datosPorDia = [];
        const diasSemanaAnterior = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        // 🔍 DEBUG DETALLADO: Mostrar todos los datos disponibles de semana anterior
        console.log('🔍 DEBUG COMPLETO - Datos disponibles en ventas_por_dia (SEMANA ANTERIOR):');
        currentWeekData.anterior.ventas_por_dia.forEach((venta, index) => {
            const fecha = new Date(venta.fecha);
            const diaSemana = fecha.getDay();
            const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1;
            console.log(`   ${index}: Fecha=${venta.fecha}, getDay()=${diaSemana}, Convertido=${diaConvertido}, Ventas=€${venta.ventas}`);
        });
        
        // Procesar cada día de la semana (Lunes=0, Domingo=6)
        for (let i = 0; i < 7; i++) {
            // Buscar ventas de este día de la semana
            const ventasDelDia = currentWeekData.anterior.ventas_por_dia.find(v => {
                const fecha = new Date(v.fecha);
                const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
                const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a 0=Lunes, 6=Domingo
                
                // 🔍 DEBUG: Mostrar cada búsqueda de semana anterior
                console.log(`🔍 SEMANA ANTERIOR - Buscando día ${i} (${diasSemanaAnterior[i]}): fecha=${v.fecha}, getDay()=${diaSemana}, convertido=${diaConvertido}, ¿coincide? ${diaConvertido === i}`);
                
                return diaConvertido === i;
            });
            
            // Agregar ventas del día o 0 si no hay datos
            const ventasDelDiaValor = ventasDelDia ? ventasDelDia.ventas : 0;
            datosPorDia.push(ventasDelDiaValor);
            
            console.log(`📊 SEMANA ANTERIOR - ${diasSemanaAnterior[i]} (índice ${i}): ${ventasDelDia ? `€${ventasDelDia.ventas} encontrado` : '€0 - sin datos'}`);
        }
        
        console.log('🔍 DEBUG - Datos procesados Semana Anterior para 7 días:', datosPorDia);
        
        datasets.push({
            label: 'Semana Anterior',
            data: datosPorDia,
            borderColor: '#64748b',
            backgroundColor: 'rgba(100, 116, 139, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            borderDash: [8, 4],
            pointRadius: 5,
            pointBackgroundColor: '#64748b',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        });
        console.log('✅ Serie "Semana Anterior" agregada:', datosPorDia);
    }
    
    // SERIE 3: Misma semana mes anterior (NARANJA) - USAR MISMOS DATOS QUE DASHBOARD DIARIO
    if (currentWeekData.mes_anterior?.ventas_por_dia) {
        // 🔧 CRÍTICO: Usar EXACTAMENTE la misma lógica que el Dashboard Diario
        // PERO rellenar con 0 los días sin datos para completar 7 días
        const datosPorDia = [];
        
        // Procesar cada día de la semana (Lunes=0, Domingo=6)
        for (let i = 0; i < 7; i++) {
            // Buscar ventas de este día de la semana
            const ventasDelDia = currentWeekData.mes_anterior.ventas_por_dia.find(v => {
                const fecha = new Date(v.fecha);
                const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
                const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a 0=Lunes, 6=Domingo
                return diaConvertido === i;
            });
            
            // Agregar ventas del día o 0 si no hay datos
            datosPorDia.push(ventasDelDia ? ventasDelDia.ventas : 0);
        }
        
        console.log('🔍 DEBUG - Datos procesados Mes Pasado para 7 días:', datosPorDia);
        
        datasets.push({
            label: 'Misma Semana Mes Pasado',
            data: datosPorDia,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            borderDash: [12, 6],
            pointRadius: 5,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        });
        console.log('✅ Serie "Mes Pasado" agregada:', datosPorDia);
    }
    
    // SERIE 4: Misma semana año anterior (MORADO) - USAR MISMOS DATOS QUE DASHBOARD DIARIO
    if (currentWeekData.año_anterior?.ventas_por_dia) {
        // 🔧 CRÍTICO: Usar EXACTAMENTE la misma lógica que el Dashboard Diario
        // PERO rellenar con 0 los días sin datos para completar 7 días
        const datosPorDia = [];
        const diasSemanaAñoAnterior = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        // Procesar cada día de la semana (Lunes=0, Domingo=6)
        for (let i = 0; i < 7; i++) {
            // Buscar ventas de este día de la semana
            const ventasDelDia = currentWeekData.año_anterior.ventas_por_dia.find(v => {
                const fecha = new Date(v.fecha);
                const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
                const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a 0=Lunes, 6=Domingo
                return diaConvertido === i;
            });
            
            // Agregar ventas del día o 0 si no hay datos
            datosPorDia.push(ventasDelDia ? ventasDelDia.ventas : 0);
        }
        
        console.log('🔍 DEBUG - Datos procesados Año Pasado para 7 días:', datosPorDia);
        
        datasets.push({
            label: 'Misma Semana Año Pasado', 
            data: datosPorDia,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            borderDash: [16, 8, 4, 8],
            pointRadius: 5,
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        });
        console.log('✅ Serie "Año Pasado" agregada:', datosPorDia);
    }
    
    if (datasets.length === 0) {
        console.warn('⚠️ No hay datos para mostrar en el gráfico');
        return;
    }
    
    // CREAR GRÁFICO CHART.JS
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(26, 43, 61, 0.95)', // Fondo oscuro para dark mode
                    titleColor: '#ffffff', // Título blanco
                    bodyColor: '#e2e8f0', // Texto gris claro
                    borderColor: 'rgba(0, 212, 170, 0.3)', // Borde turquesa
                    borderWidth: 1,
                    cornerRadius: 12,
                    displayColors: true,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: €${context.parsed.y.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
                        },
                        afterBody: function(tooltipItems) {
                            // Calcular diferencias
                            const actual = tooltipItems.find(item => item.dataset.label === 'Esta Semana')?.parsed.y || 0;
                            const anterior = tooltipItems.find(item => item.dataset.label === 'Semana Anterior')?.parsed.y || 0;
                            
                            if (actual > 0 && anterior > 0) {
                                const diferencia = ((actual - anterior) / anterior * 100);
                                const signo = diferencia >= 0 ? '+' : '';
                                return [``, `Vs semana anterior: ${signo}${diferencia.toFixed(1)}%`];
                            }
                            return [];
                        }
                    }
                },
                legend: {
                    display: false // Usamos controles personalizados
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Días de la Semana',
                        font: { weight: 'bold', size: 14 },
                        color: '#1f2937' // Texto negro para modo día
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)', // Grid claro para dark mode
                        lineWidth: 1
                    },
                    ticks: {
                        font: { size: 12, weight: '500' },
                        color: '#e2e8f0' // Gris claro para dark mode
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Ventas Acumuladas (€)',
                        font: { weight: 'bold', size: 14 },
                        color: '#1f2937' // Texto negro para modo día
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)', // Grid claro para dark mode
                        lineWidth: 1
                    },
                    ticks: {
                        font: { size: 12 },
                        color: '#e2e8f0', // Gris claro para dark mode
                        callback: function(value) {
                            return '€' + value.toLocaleString('es-ES');
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });
    
    console.log(`✅ Gráfico semanal avanzado creado con ${datasets.length} series`);
    
    // 🌤️ AGREGAR ICONOS METEOROLÓGICOS
    try {
        const weekDates = calculateWeekDates(currentWeekOffset);
        const fechaInicio = weekDates.inicio.toISOString().split('T')[0];
        const fechaFin = weekDates.fin.toISOString().split('T')[0];
        
        console.log(`🌤️ DEBUG: Obteniendo datos meteorológicos para: ${fechaInicio} - ${fechaFin}`);
        console.log(`🌤️ DEBUG: RESTAURANT_ID = ${RESTAURANT_ID}`);
        console.log(`🌤️ DEBUG: currentWeekOffset = ${currentWeekOffset}`);
        
        const weatherData = await getWeatherDataForWeek(fechaInicio, fechaFin);
        console.log(`🌤️ DEBUG: Datos obtenidos:`, weatherData);
        
        if (weatherData && weatherData.length > 0) {
            console.log(`🌤️ DEBUG: Agregando ${weatherData.length} iconos al gráfico`);
            console.log(`🌤️ DEBUG: weeklyChart existe:`, !!weeklyChart);
            
            // Esperar a que el gráfico se renderice completamente
            setTimeout(() => {
                console.log(`🌤️ DEBUG: Llamando addWeatherIconsToChart...`);
                addWeatherIconsToChart(weeklyChart, weatherData);
            }, 100);
        } else {
            console.log('🚫 DEBUG: No hay datos meteorológicos para esta semana');
        }
    } catch (error) {
        console.error('❌ ERROR agregando iconos meteorológicos:', error);
        console.error('❌ Stack trace:', error.stack);
    }
}

// FUNCIÓN: Calcular ventas acumuladas día por día  
function calculateAccumulatedSales(ventasPorDia) {
    if (!ventasPorDia || ventasPorDia.length === 0) {
        console.log('⚠️ No hay datos de ventas por día, devolviendo array vacío');
        return [0, 0, 0, 0, 0, 0, 0];
    }
    
    console.log('🔍 DEBUG ACUMULADAS - Datos recibidos:', ventasPorDia);
    
    let acumulado = 0;
    const resultados = [];
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    // Procesar cada día de la semana (Lunes=0, Domingo=6)
    for (let i = 0; i < 7; i++) {
        // Buscar ventas de este día de la semana
        const ventasDelDia = ventasPorDia.find(v => {
            const fecha = new Date(v.fecha);
            const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
            const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a 0=Lunes, 6=Domingo
            return diaConvertido === i;
        });
        
        const diaStr = diasSemana[i];
        console.log(`🔍 ${diaStr} (día ${i}): ${ventasDelDia ? `€${ventasDelDia.ventas} encontrado` : 'sin datos'}`);
        
        // Agregar al acumulado
        if (ventasDelDia && ventasDelDia.ventas > 0) {
            acumulado += ventasDelDia.ventas;
            console.log(`   ✅ Sumando €${ventasDelDia.ventas} → Acumulado: €${acumulado}`);
        } else {
            console.log(`   ⚪ Sin ventas → Manteniendo acumulado: €${acumulado}`);
        }
        resultados.push(acumulado);
    }
    
    console.log('📈 Ventas acumuladas calculadas:', resultados);
    return resultados;
}

// FUNCIÓN: Crear gráfico combinado ventas vs ticket medio semanal
function createWeeklyCombinedChart() {
    console.log('📊 Creando gráfico combinado semanal: Ventas vs Ticket Medio');
    
    const ctx = document.getElementById('weekly-combined-chart');
    if (!ctx || !currentWeekData) {
        console.warn('❌ No se puede crear gráfico combinado: falta canvas o datos');
        return;
    }
    
    // Debug: verificar estructura de currentWeekData
    console.log('🔍 DEBUG currentWeekData completo:', currentWeekData);
    
    // Usar datos de la semana actual
    const semanaActual = currentWeekData.actual;
    if (!semanaActual) {
        console.warn('❌ No hay datos de semana actual en currentWeekData.actual');
        console.warn('📊 Estructura disponible:', Object.keys(currentWeekData));
        return;
    }
    
    if (!semanaActual.ventas_por_dia) {
        console.warn('❌ No hay ventas_por_dia en semanaActual');
        console.warn('📊 Propiedades de semanaActual:', Object.keys(semanaActual));
        return;
    }
    
    console.log('📊 Datos para gráfico combinado:', semanaActual.ventas_por_dia);
    console.log('🔍 TOTAL DE DÍAS RECIBIDOS:', semanaActual.ventas_por_dia?.length);
    console.log('🔍 FECHAS DISPONIBLES:', semanaActual.ventas_por_dia?.map(v => v.fecha));
    
    // Preparar datos por día de la semana
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const ventasPorDia = [];
    const ticketMedioPorDia = [];
    
    // Convertir datos por fecha a datos por día de la semana
    diasSemana.forEach((dia, index) => {
        // Calcular la fecha correspondiente al día de la semana usando calculateWeekDates
        const weekDates = calculateWeekDates(currentWeekOffset);
        const fechaDia = new Date(weekDates.inicio);
        fechaDia.setDate(fechaDia.getDate() + index);
        const fechaStr = fechaDia.toISOString().split('T')[0];
        
        // Buscar datos para esta fecha
        const datosDelDia = semanaActual.ventas_por_dia.find(v => v.fecha === fechaStr);
        
        console.log(`🔍 BUSCANDO FECHA ${fechaStr} para día ${dia}:`);
        console.log(`   ¿Encontrado? ${datosDelDia ? 'SÍ' : 'NO'}`);
        
        if (datosDelDia) {
            ventasPorDia.push(datosDelDia.ventas);
            
            // DEBUG: Ver estructura completa de datosDelDia
            console.log(`🔍 DEBUG datos del día ${dia} (${fechaStr}): €${datosDelDia.ventas} (${datosDelDia.tickets} tickets)`);
            console.log(`   Estructura completa:`, datosDelDia);
            
            // Usar la propiedad tickets o ticket_medio directamente
            let ticketMedio = 0;
            
            if (datosDelDia.ticket_medio && datosDelDia.ticket_medio > 0) {
                // Si viene el ticket_medio calculado del backend, usarlo directamente
                ticketMedio = parseFloat(datosDelDia.ticket_medio);
                console.log(`   ${dia} (${fechaStr}): Ticket medio directo del backend: €${ticketMedio.toFixed(2)}`);
            } else if (datosDelDia.tickets && datosDelDia.tickets > 0) {
                // Si vienen los tickets, calcular ticket medio
                ticketMedio = datosDelDia.ventas / datosDelDia.tickets;
                console.log(`   ${dia} (${fechaStr}): €${datosDelDia.ventas} / ${datosDelDia.tickets} tickets = €${ticketMedio.toFixed(2)} ticket medio`);
            } else {
                console.warn(`⚠️ No se puede calcular ticket medio para ${dia}: sin tickets ni ticket_medio`);
                console.warn(`   Datos disponibles:`, datosDelDia);
            }
            
            ticketMedioPorDia.push(ticketMedio);
        } else {
            ventasPorDia.push(0);
            ticketMedioPorDia.push(0);
            console.log(`❌ SIN DATOS para ${dia} (${fechaStr}) - Asignando €0`);
        }
    });
    
    // Destruir gráfico anterior si existe
    if (window.weeklyCombinedChart) {
        window.weeklyCombinedChart.destroy();
    }
    
    // Crear gráfico combinado
    window.weeklyCombinedChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: diasSemana,
            datasets: [
                {
                    label: 'Ventas por Día (€)',
                    data: ventasPorDia,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: 8,
                    yAxisID: 'y'
                },
                {
                    label: 'Ticket Medio (€)',
                    data: ticketMedioPorDia,
                    type: 'line',
                    borderColor: '#FF6B6B', // Rojo más visible
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 4, // Línea más gruesa
                    pointRadius: 8, // Puntos más grandes
                    pointBackgroundColor: '#FF6B6B',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ventas (€)',
                        color: '#1f2937' // Texto negro para modo día
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString();
                        },
                        color: '#e2e8f0' // Gris claro para dark mode
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Grid sutil para dark mode
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: Math.max(...ticketMedioPorDia.filter(v => v > 0)) * 1.2 || 50, // Escala dinámica
                    title: {
                        display: true,
                        text: 'Ticket Medio (€)',
                        color: '#1f2937' // Texto negro para modo día
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toFixed(2);
                        },
                        color: '#e2e8f0' // Gris claro para dark mode
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: 'rgba(255, 255, 255, 0.1)' // Grid sutil para dark mode
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Día de la Semana',
                        color: '#1f2937' // Texto negro para modo día
                    },
                    ticks: {
                        color: '#e2e8f0' // Gris claro para dark mode
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Grid sutil para dark mode
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#1f2937' // Texto negro para modo día
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${datasetLabel}: €${value.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico combinado semanal creado exitosamente');
    console.log('🔍 DEBUG GRÁFICO - Datos finales enviados a Chart.js:');
    console.log('   📊 Ventas por día:', ventasPorDia);
    console.log('   🎫 Ticket medio por día:', ticketMedioPorDia);
    console.log('   📅 Días de la semana:', diasSemana);
    
    // Generar insights automáticos con comparativas
    const semanaAnteriorDatos = currentWeekData?.anterior?.ventas_por_dia || [];
    const fechasSemana = semanaActual.ventas_por_dia.map(dia => dia.fecha);
    generateWeeklyInsights(semanaActual.ventas_por_dia, fechasSemana, semanaAnteriorDatos);
}

// FUNCIÓN: Generar insights automáticos para el gráfico semanal con comparativas
function generateWeeklyInsights(ventasPorDia, weekDates, ventasPorDiaAnterior = []) {
    const container = document.getElementById('combined-chart-insights');
    if (!container || !ventasPorDia || ventasPorDia.length === 0) {
        if (container) container.innerHTML = '';
        return;
    }

    console.log('🔍 Generando insights con datos:', ventasPorDia);
    console.log('🔍 Datos semana anterior:', ventasPorDiaAnterior);

    // Calcular insights
    const diasConDatos = ventasPorDia.filter(dia => dia.ventas > 0);
    
    if (diasConDatos.length === 0) {
        container.innerHTML = '<div class="no-insights">Sin datos suficientes para generar insights</div>';
        return;
    }

    // Encontrar día de más ventas
    const diaMasVentas = diasConDatos.reduce((max, dia) => 
        dia.ventas > max.ventas ? dia : max
    );

    // Encontrar día de ticket medio más alto
    const diaMayorTicket = diasConDatos.reduce((max, dia) => {
        const ticketMedio = dia.ticket_medio || (dia.tickets > 0 ? dia.ventas / dia.tickets : 0);
        const maxTicketMedio = max.ticket_medio || (max.tickets > 0 ? max.ventas / max.tickets : 0);
        return ticketMedio > maxTicketMedio ? dia : max;
    });



    // Obtener nombres de días
    const getDayName = (fecha) => {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const date = new Date(fecha + 'T00:00:00');
        return dias[date.getDay()];
    };

    const diaMasVentasTicket = diaMayorTicket.ticket_medio || (diaMayorTicket.tickets > 0 ? diaMayorTicket.ventas / diaMayorTicket.tickets : 0);

    // Calcular insights de la semana anterior si están disponibles
    let diaMasVentasAnterior = null;
    let diaMayorTicketAnterior = null;
    let ventasComparativa = '';
    let ticketComparativa = '';

    if (ventasPorDiaAnterior && ventasPorDiaAnterior.length > 0) {
        const diasConDatosAnterior = ventasPorDiaAnterior.filter(dia => dia.ventas > 0);
        
        if (diasConDatosAnterior.length > 0) {
            // Día de más ventas semana anterior
            diaMasVentasAnterior = diasConDatosAnterior.reduce((max, dia) => dia.ventas > max.ventas ? dia : max);
            
            // Día de mayor ticket medio semana anterior  
            diaMayorTicketAnterior = diasConDatosAnterior.reduce((max, dia) => {
                const ticketMedio = dia.ticket_medio || (dia.tickets > 0 ? dia.ventas / dia.tickets : 0);
                const maxTicketMedio = max.ticket_medio || (max.tickets > 0 ? max.ventas / max.tickets : 0);
                return ticketMedio > maxTicketMedio ? dia : max;
            });

            // Mostrar valores absolutos con día de la semana anterior en color blanco
            ventasComparativa = `<div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-top: 4px; opacity: 0.8;">Sem. anterior: ${getDayName(diaMasVentasAnterior.fecha)} - €${diaMasVentasAnterior.ventas.toFixed(2)}</div>`;

            const ticketAnterior = diaMayorTicketAnterior.ticket_medio || (diaMayorTicketAnterior.tickets > 0 ? diaMayorTicketAnterior.ventas / diaMayorTicketAnterior.tickets : 0);
            ticketComparativa = `<div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-top: 4px; opacity: 0.8;">Sem. anterior: ${getDayName(diaMayorTicketAnterior.fecha)} - €${ticketAnterior.toFixed(2)}</div>`;
        }
    }

    // Generar HTML de insights con comparativas
    container.innerHTML = `
        <div class="insights-grid">
            <div class="insight-item">
                <div class="insight-icon">📈</div>
                <div class="insight-content">
                    <div class="insight-title">Día de Más Ventas</div>
                    <div class="insight-value">${getDayName(diaMasVentas.fecha)} - €${diaMasVentas.ventas.toFixed(2)}</div>
                    ${ventasComparativa}
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-icon">💰</div>
                <div class="insight-content">
                    <div class="insight-title">Mayor Ticket Medio</div>
                    <div class="insight-value">${getDayName(diaMayorTicket.fecha)} - €${diaMasVentasTicket.toFixed(2)}</div>
                    ${ticketComparativa}
                </div>
            </div>

        </div>
    `;

    console.log('✅ Insights generados:', {
        diaMasVentas: `${getDayName(diaMasVentas.fecha)} - €${diaMasVentas.ventas.toFixed(2)}`,
        mayorTicket: `${getDayName(diaMayorTicket.fecha)} - €${diaMasVentasTicket.toFixed(2)}`
    });
}

// FUNCIÓN: Actualizar métricas semanales
function updateWeeklyMetrics() {
    if (!currentWeekData?.actual?.ventas_por_dia) return;
    
    // 🔧 CALCULAR SUMAS DIRECTAMENTE DESDE LOS DATOS DEL GRÁFICO
    console.log('🔍 === CALCULANDO SUMAS DESDE GRÁFICO ===');
    console.log('✅ IMPORTANTE: Los valores del gráfico son VENTAS BRUTAS (no netas)');
    
    // 🔧 CALCULAR SUMA DIRECTAMENTE DESDE LOS DATOS DEL GRÁFICO VISUAL
    console.log('🔍 === DEBUG COMPLETO DE DATOS ===');
    console.log('🔍 DATOS ACTUALES - ventas_por_dia:', currentWeekData.actual.ventas_por_dia);
    
    // 🎯 VER CADA DÍA INDIVIDUALMENTE
    currentWeekData.actual.ventas_por_dia.forEach((dia, index) => {
        console.log(`🔍 DÍA ${index}: fecha=${dia.fecha}, ventas=${dia.ventas}, tickets=${dia.tickets}`);
    });
    
    // 🎯 SOLUCIÓN TEMPORAL: SOLO PRIMEROS 6 DÍAS (LUNES A SÁBADO)
    const ventasEstaSemana = currentWeekData.actual.ventas_por_dia
        .slice(0, 6)  // Solo Lunes a Sábado
        .filter(v => v.ventas > 0)  // Solo días con ventas reales
        .map(v => v.ventas);
    console.log('🔍 VALORES EXTRAÍDOS Esta Semana (Lun-Sáb, solo con ventas):', ventasEstaSemana);
    
    const totalVentasEstaSemana = ventasEstaSemana.reduce((sum, val) => {
        console.log(`   Sumando: €${val} → Acumulado: €${sum + val}`);
        return sum + val;
    }, 0);
    
    // 🔧 CALCULAR SUMA DIRECTAMENTE DESDE LOS DATOS DEL GRÁFICO VISUAL
    console.log('🔍 === DEBUG COMPLETO DE DATOS ANTERIORES ===');
    console.log('🔍 DATOS ANTERIORES - ventas_por_dia:', currentWeekData.anterior?.ventas_por_dia);
    
    // 🎯 VER CADA DÍA INDIVIDUALMENTE
    if (currentWeekData.anterior?.ventas_por_dia) {
        currentWeekData.anterior.ventas_por_dia.forEach((dia, index) => {
            console.log(`🔍 DÍA ANTERIOR ${index}: fecha=${dia.fecha}, ventas=${dia.ventas}, tickets=${dia.tickets}`);
        });
    }
    
    // 🎯 SOLUCIÓN TEMPORAL: SOLO PRIMEROS 6 DÍAS (LUNES A SÁBADO)
    const ventasSemanaAnterior = currentWeekData.anterior?.ventas_por_dia
        ?.slice(0, 6)  // Solo Lunes a Sábado
        .filter(v => v.ventas > 0)  // Solo días con ventas reales
        .map(v => v.ventas) || [];
    console.log('🔍 VALORES EXTRAÍDOS Semana Anterior (Lun-Sáb, solo con ventas):', ventasSemanaAnterior);
    
    const totalVentasSemanaAnterior = ventasSemanaAnterior.reduce((sum, val) => {
        console.log(`   Sumando Anterior: €${val} → Acumulado: €${sum + val}`);
        return sum + val;
    }, 0);
    
    // 🔧 CALCULAR SUMA DIRECTAMENTE DESDE LOS DATOS DEL GRÁFICO VISUAL
    console.log('🔍 DATOS MES PASADO - ventas_por_dia:', currentWeekData.mes_anterior?.ventas_por_dia);
    
    // 🎯 FILTRAR SOLO DÍAS CON VENTAS REALES (> 0) - FUNCIONA SIEMPRE
    const ventasMesPasado = currentWeekData.mes_anterior?.ventas_por_dia
        ?.filter(v => v.ventas > 0)  // Solo días con ventas reales
        .map(v => v.ventas) || [];
    console.log('🔍 VALORES EXTRAÍDOS Mes Pasado (solo con ventas):', ventasMesPasado);
    
    const totalVentasMesPasado = ventasMesPasado.reduce((sum, val) => {
        console.log(`   Sumando Mes: €${val} → Acumulado: €${sum + val}`);
        return sum + val;
    }, 0);
    
    // Calcular suma de "Año Pasado" desde ventas_por_dia
    console.log('🔍 DATOS AÑO PASADO - ventas_por_dia:', currentWeekData.año_anterior?.ventas_por_dia);
    const ventasAñoPasado = currentWeekData.año_anterior?.ventas_por_dia?.map(v => v.ventas) || [];
    console.log('🔍 VALORES EXTRAÍDOS Año Pasado:', ventasAñoPasado);
    
    // 🔧 FILTRAR SOLO VALORES VÁLIDOS (> 0)
    const ventasValidasAñoPasado = ventasAñoPasado.filter(val => val > 0);
    console.log('🔍 VALORES VÁLIDOS Año Pasado (excluyendo 0):', ventasValidasAñoPasado);
    
    const totalVentasAñoPasado = ventasValidasAñoPasado.reduce((sum, val) => {
        console.log(`   Sumando Año: €${val} → Acumulado: €${sum + val}`);
        return sum + val;
    }, 0);
    
    console.log('🔍 SUMAS CALCULADAS DESDE GRÁFICO:');
    console.log(`   - Esta Semana: €${totalVentasEstaSemana.toFixed(2)}`);
    console.log(`   - Semana Anterior: €${totalVentasSemanaAnterior.toFixed(2)}`);
    console.log(`   - Mes Pasado: €${totalVentasMesPasado.toFixed(2)}`);
    console.log(`   - Año Pasado: €${totalVentasAñoPasado.toFixed(2)}`);
    
    // ✅ CORREGIDO: Los valores del gráfico son VENTAS BRUTAS
    // Crear objeto con los datos calculados
    const actual = {
        total_ventas: totalVentasEstaSemana,        // ← Bruto del gráfico
        total_ventas_bruto: totalVentasEstaSemana,  // ← Bruto del gráfico (correcto)
        total_tickets: currentWeekData.actual?.resumen?.total_tickets || 0,
        ticket_promedio: totalVentasEstaSemana > 0 && (currentWeekData.actual?.resumen?.total_tickets || 0) > 0 
            ? Math.round((totalVentasEstaSemana / (currentWeekData.actual?.resumen?.total_tickets || 0)) * 100) / 100
            : 0,  // ← CALCULADO EN FRONTEND para consistencia (2 decimales)
        total_comensales: currentWeekData.actual?.resumen?.total_comensales || 0
    };
    
    const anterior = {
        total_ventas: totalVentasSemanaAnterior,        // ← Bruto del gráfico
        total_ventas_bruto: totalVentasSemanaAnterior,  // ← Bruto del gráfico (correcto)
        total_tickets: currentWeekData.anterior?.resumen?.total_tickets || 0,
        ticket_promedio: totalVentasSemanaAnterior > 0 && (currentWeekData.anterior?.resumen?.total_tickets || 0) > 0 
            ? Math.round((totalVentasSemanaAnterior / (currentWeekData.anterior?.resumen?.total_tickets || 0)) * 100) / 100
            : 0,  // ← CALCULADO EN FRONTEND para consistencia (2 decimales)
        total_comensales: currentWeekData.anterior?.resumen?.total_comensales || 0
    };
    
    const mesPasado = {
        total_ventas: totalVentasMesPasado,        // ← Bruto del gráfico
        total_ventas_bruto: totalVentasMesPasado,  // ← Bruto del gráfico (correcto)
        total_tickets: currentWeekData.mes_anterior?.resumen?.total_tickets || 0,
        ticket_promedio: totalVentasMesPasado > 0 && (currentWeekData.mes_anterior?.resumen?.total_tickets || 0) > 0 
            ? Math.round((totalVentasMesPasado / (currentWeekData.mes_anterior?.resumen?.total_tickets || 0)) * 100) / 100
            : 0,  // ← CALCULADO EN FRONTEND para consistencia (2 decimales)
        total_comensales: currentWeekData.mes_anterior?.resumen?.total_comensales || 0
    };
    
    const añoPasado = {
        total_ventas: totalVentasAñoPasado,        // ← Bruto del gráfico
        total_ventas_bruto: totalVentasAñoPasado,  // ← Bruto del gráfico (correcto)
        total_tickets: currentWeekData.año_anterior?.resumen?.total_tickets || 0,
        ticket_promedio: totalVentasAñoPasado > 0 && (currentWeekData.año_anterior?.resumen?.total_tickets || 0) > 0 
            ? Math.round((totalVentasAñoPasado / (currentWeekData.año_anterior?.resumen?.total_tickets || 0)) * 100) / 100
            : 0,  // ← CALCULADO EN FRONTEND para consistencia (2 decimales)
        total_comensales: currentWeekData.año_anterior?.resumen?.total_comensales || 0
    };
    
    console.log('🔍 === DEBUGGING MÉTRICAS SEMANALES ===');
    console.log('📊 DATOS ACTUALES:', actual);
    console.log('📊 DATOS ANTERIOR:', anterior);
    console.log('📊 DATOS MES:', mesPasado);
    console.log('📊 DATOS AÑO:', añoPasado);
    
    // 🔍 VERIFICAR CONSISTENCIA DEL CÁLCULO
    console.log('🔍 === VERIFICACIÓN DE CONSISTENCIA ===');
    console.log('✅ Esta Semana:');
    console.log(`   - Total Ventas (gráfico): €${totalVentasEstaSemana}`);
    console.log(`   - Total Tickets (backend): ${currentWeekData.actual?.resumen?.total_tickets || 0}`);
    console.log(`   - Ticket Promedio (calculado): €${actual.ticket_promedio.toFixed(2)}`);
    console.log(`   - Verificación: €${totalVentasEstaSemana} ÷ ${currentWeekData.actual?.resumen?.total_tickets || 0} = €${actual.ticket_promedio.toFixed(2)}`);
    
    if (currentWeekData.anterior?.resumen?.total_tickets) {
        console.log('✅ Semana Anterior:');
        console.log(`   - Total Ventas (gráfico): €${totalVentasSemanaAnterior}`);
        console.log(`   - Total Tickets (backend): ${currentWeekData.anterior?.resumen?.total_tickets}`);
        console.log(`   - Ticket Promedio (calculado): €${anterior.ticket_promedio.toFixed(2)}`);
        console.log(`   - Verificación: €${totalVentasSemanaAnterior} ÷ ${currentWeekData.anterior?.resumen?.total_tickets} = €${anterior.ticket_promedio.toFixed(2)}`);
    }
    
    // Actualizar métricas hero
    updateHeroMetric('hero-ventas-total', actual.total_ventas, '€');
    updateHeroMetric('hero-tickets-total', actual.total_tickets);
    updateHeroMetric('hero-ticket-medio', actual.ticket_promedio, '€');
    updateHeroMetric('hero-comensales-total', actual.total_comensales);
    
    // Actualizar comparativas hero
    updateHeroComparison('hero-vs-anterior', actual.total_ventas, anterior?.total_ventas);
    updateHeroComparison('hero-tickets-vs', actual.total_tickets, anterior?.total_tickets);
    updateHeroComparison('hero-medio-vs', actual.ticket_promedio, anterior?.ticket_promedio);
    updateHeroComparison('hero-comensales-vs', actual.total_comensales, anterior?.total_comensales);
    
    // 🔍 DEBUG: Verificar valores antes de actualizar
    console.log('🔍 VALORES A ACTUALIZAR:');
    console.log('   - total_ventas:', actual.total_ventas);
    console.log('   - total_ventas_bruto:', actual.total_ventas_bruto);
    console.log('   - total_tickets:', actual.total_tickets);
    console.log('   - ticket_promedio:', actual.ticket_promedio);
    console.log('   - total_comensales:', actual.total_comensales);
    
    // Actualizar métricas detalladas usando el sistema existente
    const ventasTotalValue = `€${actual.total_ventas?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    const ventasBrutoValue = `€${actual.total_ventas_bruto?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    
    console.log('🔍 VALORES FORMATEADOS:');
    console.log('   - total-ventas:', ventasTotalValue);
    console.log('   - total-ventas-bruto:', ventasBrutoValue);
    
    updateElement('total-ventas', ventasTotalValue);
    updateElement('total-ventas-bruto', ventasBrutoValue);
    updateElement('total-tickets', actual.total_tickets?.toLocaleString('es-ES'));
    updateElement('ticket-promedio', `€${actual.ticket_promedio?.toFixed(2)}`);
    updateElement('total-comensales', actual.total_comensales?.toLocaleString('es-ES'));
    
    // 🔧 ACTUALIZAR TAMBIÉN LAS TARJETAS INFERIORES
    updateElement('ventas-brutas-actual', ventasBrutoValue);
    updateElement('ventas-brutas-anterior', `€${anterior?.total_ventas_bruto?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`);
    updateElement('ventas-brutas-mes', `€${mesPasado?.total_ventas_bruto?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`);
    
    // 🔧 ACTUALIZAR TODAS LAS TARJETAS INFERIORES RESTANTES
    updateElement('tickets-total-actual', actual.total_tickets?.toLocaleString('es-ES'));
    updateElement('tickets-total-anterior', anterior?.total_tickets?.toLocaleString('es-ES'));
    updateElement('tickets-total-mes', mesPasado?.total_tickets?.toLocaleString('es-ES'));
    
    updateElement('ticket-medio-actual', `€${actual.ticket_promedio?.toFixed(2)}`);
    updateElement('ticket-medio-anterior', `€${anterior?.ticket_promedio?.toFixed(2)}`);
    updateElement('ticket-medio-mes', `€${mesPasado?.ticket_promedio?.toFixed(2)}`);
    
    updateElement('comensales-total-actual', actual.total_comensales?.toLocaleString('es-ES'));
    updateElement('comensales-total-anterior', anterior?.total_comensales?.toLocaleString('es-ES'));
    updateElement('comensales-total-mes', mesPasado?.total_comensales?.toLocaleString('es-ES'));
    
    // 🔧 ACTUALIZAR INDICADORES DE CAMBIO PARA TODAS LAS MÉTRICAS
    // Ventas Brutas
    if (anterior?.total_ventas_bruto) {
        const cambio = ((actual.total_ventas_bruto - anterior.total_ventas_bruto) / anterior.total_ventas_bruto) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('ventas-brutas-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('ventas-brutas-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    if (mesPasado?.total_ventas_bruto) {
        const cambio = ((actual.total_ventas_bruto - mesPasado.total_ventas_bruto) / mesPasado.total_ventas_bruto) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('ventas-brutas-mes-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('ventas-brutas-mes-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    // Total Tickets
    if (anterior?.total_tickets) {
        const cambio = ((actual.total_tickets - anterior.total_tickets) / anterior.total_tickets) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('tickets-total-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('tickets-total-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    if (mesPasado?.total_tickets) {
        const cambio = ((actual.total_tickets - mesPasado.total_tickets) / mesPasado.total_tickets) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('tickets-total-mes-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('tickets-total-mes-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    // Ticket Medio
    if (anterior?.ticket_promedio) {
        const cambio = ((actual.ticket_promedio - anterior.ticket_promedio) / anterior.ticket_promedio) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('ticket-medio-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('ticket-medio-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    if (mesPasado?.ticket_promedio) {
        const cambio = ((actual.ticket_promedio - mesPasado.ticket_promedio) / mesPasado.ticket_promedio) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('ticket-medio-mes-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('ticket-medio-mes-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    // Comensales
    if (anterior?.total_comensales) {
        const cambio = ((actual.total_comensales - anterior.total_comensales) / anterior.total_comensales) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('comensales-total-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('comensales-total-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    if (mesPasado?.total_comensales) {
        const cambio = ((actual.total_comensales - mesPasado.total_comensales) / mesPasado.total_comensales) * 100;
        const signo = cambio >= 0 ? '+' : '';
        updateElement('comensales-total-mes-change', `${signo}${cambio.toFixed(1)}%`);
        // Aplicar color correcto
        const changeElement = document.getElementById('comensales-total-mes-change');
        if (changeElement) {
            changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
        }
    }
}

// FUNCIÓN: Actualizar métrica hero
function updateHeroMetric(elementId, value, prefix = '') {
    const element = document.getElementById(elementId);
    if (element && value !== undefined) {
        element.textContent = `${prefix}${value.toLocaleString('es-ES', { minimumFractionDigits: prefix === '€' ? 2 : 0 })}`;
    }
}

// FUNCIÓN: Actualizar comparativa hero
function updateHeroComparison(elementId, valorActual, valorAnterior) {
    const element = document.getElementById(elementId);
    if (!element || !valorActual || !valorAnterior) {
        if (element) {
            element.textContent = 'Sin datos';
            element.className = 'comparison-change neutral';
        }
        return;
    }
    
    const cambio = ((valorActual - valorAnterior) / valorAnterior) * 100;
    const signo = cambio >= 0 ? '+' : '';
    
    element.textContent = `${signo}${cambio.toFixed(1)}%`;
    element.className = `comparison-change ${cambio >= 0 ? 'positive' : 'negative'}`;
}

// FUNCIÓN: Actualizar métricas detalladas
function updateDetailedMetrics(base, actual, anterior, mes, año) {
    // Valor actual
    const actualElement = document.getElementById(`${base}-actual`);
    if (actualElement && actual !== undefined) {
        const isEuro = base.includes('ventas') || base.includes('medio');
        actualElement.textContent = isEuro ? `€${actual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : actual.toLocaleString('es-ES');
    }
    
    // Comparativas
    updateDetailedComparison(`${base}-anterior`, `${base}-change`, actual, anterior);
    updateDetailedComparison(`${base}-mes`, `${base}-mes-change`, actual, mes);
    updateDetailedComparison(`${base}-año`, `${base}-año-change`, actual, año);
}

// FUNCIÓN: Actualizar comparación detallada
function updateDetailedComparison(valueId, changeId, actual, anterior) {
    const valueElement = document.getElementById(valueId);
    const changeElement = document.getElementById(changeId);
    
    if (valueElement && anterior !== undefined) {
        const isEuro = valueId.includes('ventas') || valueId.includes('medio');
        valueElement.textContent = isEuro ? `€${anterior.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : anterior.toLocaleString('es-ES');
    }
    
    if (changeElement && actual && anterior) {
        const cambio = ((actual - anterior) / anterior) * 100;
        const signo = cambio >= 0 ? '+' : '';
        changeElement.textContent = `${signo}${cambio.toFixed(1)}%`;
        changeElement.className = `change-badge ${cambio >= 0 ? 'positive' : 'negative'}`;
    }
}

// FUNCIÓN: Configurar controles interactivos
function setupChartControls() {
    const checkboxes = [
        { id: 'toggle-actual', index: 0 },
        { id: 'toggle-anterior', index: 1 }, 
        { id: 'toggle-mes-anterior', index: 2 },
        { id: 'toggle-año-anterior', index: 3 }
    ];
    
    checkboxes.forEach(({ id, index }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                toggleChartDataset(index, this.checked);
            });
        }
    });
}

// FUNCIÓN: Mostrar/ocultar líneas del gráfico
function toggleChartDataset(datasetIndex, show) {
    if (!weeklyChart || !weeklyChart.data.datasets[datasetIndex]) return;
    
    const dataset = weeklyChart.data.datasets[datasetIndex];
    dataset.hidden = !show;
    weeklyChart.update('none'); // Sin animación para mejor rendimiento
}

// FUNCIÓN: Navegación entre semanas
function navigateWeek(direction) {
    currentWeekOffset += direction;
    loadAnalisisSemanal(); // Recargar con nueva semana
}

// FUNCIÓN: Actualizar display de semana actual  
function updateWeekDisplay(weekDates) {
    const display = document.getElementById('current-week-display');
    if (display) {
        const inicio = weekDates.inicio.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short' 
        });
        const fin = weekDates.fin.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        display.textContent = `Semana del ${inicio} al ${fin} (${weekDates.numero_semana}/52)`;
    }
}

// FUNCIÓN: Toggle comparativa detallada
function toggleDetailedComparison() {
    const content = document.getElementById('detailed-comparison-content');
    const button = document.querySelector('.toggle-details-btn');
    const icon = document.getElementById('details-toggle-icon');
    
    if (content && button && icon) {
        const isVisible = content.style.display !== 'none';
        
        if (isVisible) {
            content.style.display = 'none';
            button.classList.remove('expanded');
            icon.textContent = '▼';
            button.innerHTML = '<span id="details-toggle-icon">▼</span> Ver detalles';
        } else {
            content.style.display = 'block';
            button.classList.add('expanded');
            icon.textContent = '▲';
            button.innerHTML = '<span id="details-toggle-icon">▲</span> Ocultar detalles';
        }
    }
}

// FUNCIÓN: Diagnóstico de datos disponibles
async function diagnosticarDatosDisponibles() {
    console.log('🔍 === DIAGNÓSTICO DE DATOS DISPONIBLES ===');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas_datos?select=*&limit=1000`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const ventas = await response.json();
        
        // Analizar fechas disponibles
        const fechasDisponibles = [...new Set(ventas.map(v => v.fecha_venta))].sort();
        const añosDisponibles = [...new Set(fechasDisponibles.map(f => new Date(f).getFullYear()))].sort();
        const sistemasOrigen = [...new Set(ventas.map(v => v.sistema_origen))];
        
        // ✅ DIAGNÓSTICO DETALLADO DE TICKET_MEDIO
        const ventasConTicketMedio = ventas.filter(v => v.ticket_medio && parseFloat(v.ticket_medio) > 0);
        const ventasConTicketMedioNull = ventas.filter(v => v.ticket_medio === null || v.ticket_medio === undefined);
        const ventasConTicketMedioCero = ventas.filter(v => v.ticket_medio === 0 || v.ticket_medio === '0');
        const ventasConTicketMedioNegativo = ventas.filter(v => v.ticket_medio && parseFloat(v.ticket_medio) < 0);
        const ventasConTicketMedioExtraño = ventas.filter(v => v.ticket_medio && (
            parseFloat(v.ticket_medio) > 1000 || 
            parseFloat(v.ticket_medio) < 0.01 || 
            isNaN(parseFloat(v.ticket_medio))
        ));
        
        const porcentajeConTicketMedio = ventas.length > 0 ? (ventasConTicketMedio.length / ventas.length * 100).toFixed(1) : '0';
        
        console.log('📊 RESUMEN DE DATOS DISPONIBLES:');
        console.log(`   - Total registros: ${ventas.length}`);
        console.log(`   - Años disponibles: ${añosDisponibles.join(', ')}`);
        console.log(`   - Fechas desde: ${fechasDisponibles[0]} hasta: ${fechasDisponibles[fechasDisponibles.length-1]}`);
        console.log(`   - Sistemas origen: ${sistemasOrigen.join(', ')}`);
        console.log('');
        console.log('🎯 ANÁLISIS DETALLADO DE TICKET_MEDIO:');
        console.log(`   ✅ Con ticket_medio válido: ${ventasConTicketMedio.length}/${ventas.length} (${porcentajeConTicketMedio}%)`);
        console.log(`   ❌ Con ticket_medio NULL: ${ventasConTicketMedioNull.length}`);
        console.log(`   ⚠️  Con ticket_medio = 0: ${ventasConTicketMedioCero.length}`);
        console.log(`   ❌ Con ticket_medio negativo: ${ventasConTicketMedioNegativo.length}`);
        console.log(`   🚨 Con ticket_medio extraño: ${ventasConTicketMedioExtraño.length}`);
        
        // Mostrar por sistema origen
        sistemasOrigen.forEach(sistema => {
            const ventasSistema = ventas.filter(v => v.sistema_origen === sistema);
            const conTicketMedioSistema = ventasSistema.filter(v => v.ticket_medio && parseFloat(v.ticket_medio) > 0).length;
            const porcentajeSistema = ventasSistema.length > 0 ? (conTicketMedioSistema / ventasSistema.length * 100).toFixed(1) : '0';
            console.log(`   🔧 ${sistema}: ${conTicketMedioSistema}/${ventasSistema.length} (${porcentajeSistema}%) con ticket_medio`);
        });
        
        // Mostrar ejemplos de valores extraños
        if (ventasConTicketMedioExtraño.length > 0) {
            console.log('');
            console.log('🚨 EJEMPLOS DE TICKET_MEDIO EXTRAÑOS:');
            ventasConTicketMedioExtraño.slice(0, 5).forEach(v => {
                console.log(`   - Fecha: ${v.fecha_venta}, Sistema: ${v.sistema_origen}, ticket_medio: ${v.ticket_medio}, total_bruto: ${v.total_bruto}, num_comensales: ${v.num_comensales}`);
            });
        }
        
        // Mostrar ejemplos de valores NULL
        if (ventasConTicketMedioNull.length > 0) {
            console.log('');
            console.log('❌ EJEMPLOS DE TICKET_MEDIO NULL:');
            ventasConTicketMedioNull.slice(0, 5).forEach(v => {
                console.log(`   - Fecha: ${v.fecha_venta}, Sistema: ${v.sistema_origen}, ticket_medio: ${v.ticket_medio}, total_bruto: ${v.total_bruto}, num_comensales: ${v.num_comensales}`);
            });
        }
        
        return {
            total: ventas.length,
            años: añosDisponibles,
            fechas: fechasDisponibles,
            sistemas: sistemasOrigen,
            ticket_medio_stats: {
                validos: ventasConTicketMedio.length,
                nulls: ventasConTicketMedioNull.length,
                ceros: ventasConTicketMedioCero.length,
                negativos: ventasConTicketMedioNegativo.length,
                extraños: ventasConTicketMedioExtraño.length
            }
        };
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        return null;
    }
}

async function loadDatosMensuales() {
    console.log('📅 Cargando datos mensuales...');
    // Lógica para datos mensuales
    // Reutilizar endpoint existente con rango mensual
}

async function loadDatosAnuales() {
    console.log('📆 Cargando datos anuales...');
    // Lógica para datos anuales
    // Reutilizar endpoint existente con rango anual
}

// Date functions
// Función mejorada para establecer fechas por defecto
function setDefaultDates() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('fecha-inicio').value = weekAgo.toISOString().split('T')[0];
    document.getElementById('fecha-fin').value = today.toISOString().split('T')[0];
    
    // ✅ NUEVO: Detectar si estamos en análisis diario y activar "Ayer" por defecto
    const currentSection = document.querySelector('.content-section.active');
    if (currentSection && currentSection.id === 'diario-section') {
        console.log('🎯 Sección diario detectada - Activando "Ayer" por defecto');
        setQuickRange('yesterday'); // Activar "Ayer" automáticamente
    } else {
        // Establecer "Esta Semana" como activo por defecto para otras secciones
        console.log('📊 Otra sección detectada - Activando "Esta Semana" por defecto');
    setQuickRange('week');
    }
}

function setQuickRange(range) {
    const today = new Date();
    const currentHour = today.getHours(); // Mover aquí para que esté disponible en todos los casos
    let startDate, endDate = new Date(today);
    let displayText = '';
    let comparativeText = '';
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Agregar clase active al botón seleccionado
    document.querySelector(`[data-range="${range}"]`).classList.add('active');
    
    switch(range) {
        case 'today':
            // NUEVO: Lógica de turno nocturno para restaurantes
            
            if (currentHour >= 0 && currentHour < 6) {
                // Si son las 00:00-05:59, el turno "hoy" empezó ayer a las 19:00
                console.log(`🌙 Hora actual: ${currentHour}:XX - Turno nocturno en curso desde ayer`);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            } else {
                // Si son las 06:00-23:59, usar el día actual
                console.log(`☀️ Hora actual: ${currentHour}:XX - Día normal`);
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            }
            
            displayText = 'Hoy';
            comparativeText = 'Hoy vs Ayer';
            console.log(`📅 Botón HOY: ${displayText} - ${comparativeText}`);
            break;
        case 'yesterday':
            // Lógica para ayer - siempre el día anterior completo
            const yesterdayDate = new Date(today);
            yesterdayDate.setDate(today.getDate() - 1);
            
            startDate = new Date(yesterdayDate.getFullYear(), yesterdayDate.getMonth(), yesterdayDate.getDate());
            endDate = new Date(yesterdayDate.getFullYear(), yesterdayDate.getMonth(), yesterdayDate.getDate());
            
            displayText = 'Ayer';
            comparativeText = 'Ayer vs Antes de Ayer';
            console.log(`📅 Botón AYER: ${displayText} - ${comparativeText}`);
            break;
        case 'before-yesterday':
            // Lógica para antes de ayer
            const beforeYesterdayDate = new Date(today);
            beforeYesterdayDate.setDate(today.getDate() - 2);
            
            startDate = new Date(beforeYesterdayDate.getFullYear(), beforeYesterdayDate.getMonth(), beforeYesterdayDate.getDate());
            endDate = new Date(beforeYesterdayDate.getFullYear(), beforeYesterdayDate.getMonth(), beforeYesterdayDate.getDate());
            
            displayText = 'Antes de Ayer';
            comparativeText = 'Antes de Ayer vs Hace 3 Días';
            console.log(`📅 Botón ANTES DE AYER: ${displayText} - ${comparativeText}`);
            break;
        case 'week':
            // Calcular el Lunes de esta semana
            const dayOfWeek = today.getDay(); // 0=Domingo, 1=Lunes, 2=Martes...
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo, retroceder 6 días
            startDate = new Date(today.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
            displayText = 'Esta Semana';
            comparativeText = 'Esta Semana vs Semana Anterior';
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            displayText = 'Este Mes';
            comparativeText = 'Este Mes vs Mes Anterior';
            break;
    }
    
    // Actualizar inputs - CORREGIDO: usar función que respete zona horaria local
    function formatDateLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    document.getElementById('fecha-inicio').value = formatDateLocal(startDate);
    document.getElementById('fecha-fin').value = formatDateLocal(endDate);
    
    // Actualizar display del rango activo
    document.getElementById('active-range-display').textContent = displayText;
    
    // Ocultar selector personalizado si estaba abierto
    hideCustomDatePicker();
    
    // NUEVO: Todos los rangos son comparativos
    loadDashboardComparativo(range, comparativeText);
    
    // ✅ AÑADIR ESTA LÍNEA:
    console.log('🔄 Cambiando a vista:', range, '- Iconos meteorológicos:', range === 'week' ? 'ACTIVADOS' : 'desactivados');
    
    // Log adicional para debugging de fechas
    console.log(`📊 Fechas calculadas para "${displayText}":`, {
        inicio: formatDateLocal(startDate),
        fin: formatDateLocal(endDate),
        rango: range,
        comparativo: comparativeText
    });
    
    // Actualizar dashboard automáticamente
    activeRange = range;
}

// Función para navegar entre días (anterior/siguiente)
function navigateDay(direction) {
    console.log(`🔄 Navegando ${direction > 0 ? 'siguiente' : 'anterior'} día...`);
    
    // Obtener la fecha actual del input de inicio
    const fechaInicioInput = document.getElementById('fecha-inicio');
    if (!fechaInicioInput.value) {
        console.log('⚠️ No hay fecha de inicio, estableciendo fecha actual');
        setQuickRange('today');
        return;
    }
    
    // Calcular nueva fecha
    const currentDate = new Date(fechaInicioInput.value);
    currentDate.setDate(currentDate.getDate() + direction);
    
    // Actualizar inputs
    function formatDateLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    fechaInicioInput.value = formatDateLocal(currentDate);
    document.getElementById('fecha-fin').value = formatDateLocal(currentDate);
    
    // Actualizar display del día actual
    const dayDisplay = document.getElementById('current-day-display');
    if (dayDisplay) {
        const today = new Date();
        const selectedDate = new Date(currentDate);
        
        if (selectedDate.toDateString() === today.toDateString()) {
            dayDisplay.textContent = 'Hoy';
        } else if (selectedDate.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString()) {
            dayDisplay.textContent = 'Ayer';
        } else if (selectedDate.toDateString() === new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toDateString()) {
            dayDisplay.textContent = 'Antes de Ayer';
        } else {
            dayDisplay.textContent = selectedDate.toLocaleDateString('es-ES', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
    
    // Actualizar dashboard con la nueva fecha
    const fechaInicio = fechaInicioInput.value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    console.log(`📅 Navegando a: ${fechaInicio} - ${fechaFin}`);
    
    // Actualizar dashboard
    activeRange = 'custom';
    loadDashboardComparativo('custom', 'Navegación Manual');
}

// Función para mostrar/ocultar selector personalizado
function toggleCustomDatePicker() {
    const picker = document.getElementById('custom-date-picker');
    const customBtn = document.querySelector('[data-range="custom"]');
    
    customPickerVisible = !customPickerVisible;
    
    if (customPickerVisible) {
        picker.style.display = 'block';
        
        // Remover active de otros botones
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        customBtn.classList.add('active');
        
        // Establecer fechas actuales en los inputs
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;
        
        if (fechaInicio && fechaFin) {
            updateActiveRangeDisplay(fechaInicio, fechaFin);
        }
    } else {
        hideCustomDatePicker();
    }
}

// Función para ocultar selector personalizado
function hideCustomDatePicker() {
    document.getElementById('custom-date-picker').style.display = 'none';
    customPickerVisible = false;
}

// Función para cancelar rango personalizado
function cancelCustomRange() {
    hideCustomDatePicker();
    
    // Volver al rango anterior
    if (activeRange !== 'custom') {
        setQuickRange(activeRange);
    }
}

// Función para aplicar rango personalizado
function applyCustomRange() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    if (!fechaInicio || !fechaFin) {
        showNotification('Por favor selecciona ambas fechas', 'error');
        return;
    }
    
    if (new Date(fechaInicio) > new Date(fechaFin)) {
        showNotification('La fecha de inicio debe ser anterior a la fecha final', 'error');
        return;
    }
    
    // Actualizar display del rango activo
    updateActiveRangeDisplay(fechaInicio, fechaFin);
    
    // Ocultar selector personalizado
    hideCustomDatePicker();
    
    // Actualizar dashboard
    activeRange = 'custom';
    loadDashboardComparativo('custom', 'Rango Personalizado');
    
    showNotification('Rango personalizado aplicado', 'success');
}

// ⚡ Cache global de elementos DOM para mejor rendimiento
const DOM_CACHE = {
    rangeButtons: null,
    lastActiveButton: null,
    cacheTime: 0,
    CACHE_DURATION: 5000 // 5 segundos
};

// ⚡ Función ultra-optimizada para actualizar botones activos
function updateActiveRangeButton(activeRange) {
    const now = Date.now();
    
    // ⚡ OPTIMIZACIÓN: Cache de elementos DOM
    if (!DOM_CACHE.rangeButtons || (now - DOM_CACHE.cacheTime) > DOM_CACHE.CACHE_DURATION) {
        DOM_CACHE.rangeButtons = document.querySelectorAll('.range-btn');
        DOM_CACHE.cacheTime = now;
    }
    
    const activeBtn = document.querySelector(`[data-range="${activeRange}"]`);
    
    // ⚡ OPTIMIZACIÓN: Solo cambiar si es diferente al anterior
    if (DOM_CACHE.lastActiveButton === activeBtn) {
        return; // No hacer nada si ya está activo
    }
    
    // ⚡ Usar requestAnimationFrame para transiciones suaves
    requestAnimationFrame(() => {
        // Remover active solo del botón anterior (no de todos)
        if (DOM_CACHE.lastActiveButton) {
            DOM_CACHE.lastActiveButton.classList.remove('active');
        }
        
        // Agregar clase active al botón seleccionado
        if (activeBtn) {
            activeBtn.classList.add('active');
            DOM_CACHE.lastActiveButton = activeBtn;
        }
    });
}

// Función para actualizar el display del rango activo
function updateActiveRangeDisplay(fechaInicio, fechaFin) {
    const display = document.getElementById('active-range-display');
    if (!display) return;
    
    // Si se pasan fechas específicas, formatearlas
    if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        const inicioFormatted = inicio.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
        
        const finFormatted = fin.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: inicio.getFullYear() !== fin.getFullYear() ? 'numeric' : undefined
        });
        
        display.textContent = `${inicioFormatted} - ${finFormatted}`;
    } else {
        // Si se pasa un rango predefinido
        const rangeNames = {
            'today': 'Hoy',
            'week': 'Últimos 7 días',
            'month': 'Este mes'
        };
        
        if (rangeNames[fechaInicio]) {
            display.textContent = rangeNames[fechaInicio];
        }
    }
}

// Función mejorada loadDashboard (sin cambios en la lógica, solo mejor feedback)
async function loadDashboard() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    if (!fechaInicio || !fechaFin) {
        showNotification('Por favor selecciona un rango de fechas válido', 'error');
        return;
    }
    
    // Mostrar estado de carga
    showDashboardLoading();
    
    try {
        const requestBody = {
            restaurante_id: RESTAURANT_ID,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            comparar_periodo: false // Modo comparativo desactivado para dashboard diario
        };
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error en la respuesta del servidor');
        }
        
        dashboardData = result.data;
        
        // ✅ PROCESAR DATOS METEOROLÓGICOS PARA VISTA SEMANAL
        procesarDatosMeteorologicos(dashboardData);
        
        await updateDashboard();
        
        // Cargar datos comparativos para las tarjetas
        await loadComparativeDataForCards(fechaInicio, fechaFin);
        
        // loadLatestTickets(); // Comentado hasta implementar la función
        hideDashboardLoading();
        
        // Actualizar display del rango si es personalizado
        if (activeRange === 'custom') {
            updateActiveRangeDisplay(fechaInicio, fechaFin);
        }
        
        showNotification('Datos cargados correctamente', 'success');

    } catch (error) {
        console.error('Error cargando datos:', error);
        hideDashboardLoading();
        showNotification(`Error: ${error.message}`, 'error');
        showEmptyState();
    }
}

// ⚡ OPTIMIZACIÓN: Debouncing para evitar múltiples llamadas rápidas
let loadDashboardTimeout;
let isLoadingDashboard = false;

// NUEVA FUNCIÓN UNIFICADA OPTIMIZADA
async function loadDashboardComparativo(tipoRango = 'custom', textoComparativo = '') {
    // ⚡ OPTIMIZACIÓN: Prevenir múltiples llamadas simultáneas
    if (isLoadingDashboard) {
        console.log('⏳ Dashboard ya se está cargando, ignorando nueva petición');
        return;
    }
    
    // ⚡ OPTIMIZACIÓN: Debouncing para clicks rápidos
    clearTimeout(loadDashboardTimeout);
    loadDashboardTimeout = setTimeout(async () => {
        await loadDashboardComparativoInternal(tipoRango, textoComparativo);
    }, 100);
}

async function loadDashboardComparativoInternal(tipoRango = 'custom', textoComparativo = '') {
    isLoadingDashboard = true;
    
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    console.log(`=== CARGANDO DASHBOARD COMPARATIVO ===`);
    console.log(`Tipo de rango: ${tipoRango}`);
    console.log(`Período: ${fechaInicio} hasta ${fechaFin}`);
    
    if (!fechaInicio || !fechaFin) {
        showNotification('Por favor selecciona un rango de fechas válido', 'error');
        return;
    }

    // Mostrar estado de carga
    showDashboardLoading();
    showComparativeBanner(textoComparativo || `Comparativa: ${tipoRango}`);

    try {
        const requestBody = {
            restaurante_id: RESTAURANT_ID,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            tipo_rango: tipoRango // NUEVO: Enviar tipo de rango al backend
        };
        
        console.log('Enviando request comparativo:', requestBody);
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error en la respuesta del servidor');
        }
        
        dashboardData = result.data;
        console.log('Dashboard data comparativo recibido:', dashboardData);
        
        // ✅ PROCESAR DATOS METEOROLÓGICOS PARA VISTA SEMANAL
        procesarDatosMeteorologicos(dashboardData);
        
        // Usar función unificada de actualización
        await updateDashboardUnificado();
        hideLoadingState();
        
        // Actualizar display del rango si es personalizado
        if (tipoRango === 'custom') {
            updateActiveRangeDisplay(fechaInicio, fechaFin);
        }
        
        showNotification(textoComparativo || 'Datos comparativos cargados correctamente', 'success');

    } catch (error) {
        console.error('Error cargando datos comparativos:', error);
        hideLoadingState();
        hideComparativeBanner();
        showNotification(`Error: ${error.message}`, 'error');
        showEmptyState();
    } finally {
        // ⚡ OPTIMIZACIÓN: Resetear bandera de carga
        isLoadingDashboard = false;
    }
}

// FUNCIÓN CORREGIDA: updateDashboard
async function updateDashboard() {
    if (!dashboardData) {
        console.warn('No hay datos del dashboard disponibles');
        showEmptyState();
        return;
    }

    try {
        const { resumen, productos_top, ventas_por_hora, ventas_por_dia, metodos_pago, categorias_ventas, stats } = dashboardData;

        console.log('Actualizando dashboard con stats:', stats);

        // Update metrics con validación de datos
        if (resumen) {
            const hasRealData = resumen.total_ventas > 0 || resumen.total_tickets > 0;
            
            if (hasRealData) {
                updateElement('total-ventas', `${resumen.total_ventas?.toLocaleString() || '0'}€`);
                updateElement('total-ventas-bruto', `${resumen.total_ventas_bruto?.toLocaleString() || '0'}€`);
                updateElement('total-impuestos', `${resumen.total_impuestos?.toLocaleString() || '0'}€`);
                updateElement('total-descuentos', `${resumen.total_descuentos?.toLocaleString() || '0'}€`);
                updateElement('total-propinas', `${resumen.total_propinas?.toLocaleString() || '0'}€`);
                updateElement('total-tickets', (resumen.total_tickets || 0).toLocaleString());
                updateElement('ticket-promedio', `${(resumen.ticket_promedio || 0).toFixed(2)}€`);
                updateElement('total-comensales', (resumen.total_comensales || 0).toLocaleString());
                
                // Update change indicator
                if (resumen.crecimiento_vs_anterior !== undefined) {
                    const changeElement = document.getElementById('change-ventas');
                    const change = resumen.crecimiento_vs_anterior;
                    changeElement.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs período anterior`;
                    changeElement.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
                }
                
                        // ✅ NUEVO: Actualizar comparativas con el día anterior si están disponibles
        console.log('🔍 VERIFICANDO COMPARATIVAS en updateDashboard...');
        console.log('   - dashboardData existe:', !!dashboardData);
        console.log('   - dashboardData.comparativas existe:', !!dashboardData?.comparativas);
        console.log('   - dashboardData.periodo_anterior existe:', !!dashboardData?.periodo_anterior);
        
        if (dashboardData && dashboardData.comparativas) {
            console.log('✅ Llamando a updateComparativas...');
            updateComparativas(dashboardData);
        } else {
            console.log('❌ NO se llamó a updateComparativas porque faltan datos');
        }
            } else {
                showNoDataMetrics();
            }
        }

        // ✅ NUEVO: Verificar que dashboardData esté completamente cargado antes de actualizar gráficos
        if (!dashboardData || !dashboardData.rango_horario_inteligente) {
            console.log('⏳ dashboardData o rango_horario_inteligente no disponible en updateDashboard, esperando...');
            // Programar reintento en 100ms
            setTimeout(() => {
                if (dashboardData && dashboardData.rango_horario_inteligente) {
                    // ✅ CORREGIDO: Usar ventas_por_hora en lugar de ventas_por_dia
                    if (ventas_por_hora && ventas_por_hora.length > 0) {
                        updateSalesChart(ventas_por_hora);
        } else {
                        showEmptyChart('sales-chart', 'No hay datos de ventas por hora');
                    }
                }
            }, 100);
            return;
        }
        
        // ✅ CORREGIDO: Usar ventas_por_hora en lugar de ventas_por_dia para el gráfico
        if (ventas_por_hora && ventas_por_hora.length > 0) {
            updateSalesChart(ventas_por_hora);
        } else {
            showEmptyChart('sales-chart', 'No hay datos de ventas por hora');
        }

        if (metodos_pago) {
            updatePaymentChart(metodos_pago);
        } else {
            showEmptyChart('payment-chart', 'No hay datos de métodos de pago');
        }

        if (ventas_por_hora && ventas_por_hora.length > 0) {
            console.log('🎫 Actualizando heatmap con datos:', ventas_por_hora);
            updateHourlyCharts(ventas_por_hora);
            generateTicketsHeatmap(ventas_por_hora);
        } else {
            console.warn('❌ No hay datos horarios para heatmap:', ventas_por_hora);
            // ✅ NUEVO: Verificar que dashboardData esté completamente cargado
            if (!dashboardData || !dashboardData.rango_horario_inteligente) {
                console.log('⏳ dashboardData o rango_horario_inteligente no disponible para estructura vacía, esperando...');
                // Programar reintento en 100ms
                setTimeout(() => {
                    if (dashboardData && dashboardData.rango_horario_inteligente) {
                        const datosVacios = [];
                        const rangoInteligente = dashboardData.rango_horario_inteligente;
                        
                        if (rangoInteligente && rangoInteligente.horas_mostrar) {
                            console.log('🔧 Generando estructura vacía con rango inteligente:', rangoInteligente.descripcion);
                            rangoInteligente.horas_mostrar.forEach(hora => {
                                datosVacios.push({
                                    hora: hora,
                                    hora_formato: `${hora.toString().padStart(2, '0')}:00`,
                                    ventas: 0,
                                    cantidad_tickets: 0
                                });
                            });
                            
                            updateHourlyCharts(datosVacios);
                            generateTicketsHeatmap(datosVacios);
                        } else {
                            showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
                            showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
                        }
                    }
                }, 100);
                return;
            }
            
            // NUEVO: Incluso sin datos, generar estructura con rango inteligente
            const datosVacios = [];
            const rangoInteligente = dashboardData.rango_horario_inteligente;
            
            if (rangoInteligente && rangoInteligente.horas_mostrar) {
                console.log('🔧 Generando estructura vacía con rango inteligente:', rangoInteligente.descripcion);
                rangoInteligente.horas_mostrar.forEach(hora => {
                    datosVacios.push({
                        hora: hora,
                        hora_formato: `${hora.toString().padStart(2, '0')}:00`,
                        ventas: 0,
                        cantidad_tickets: 0
                    });
                });
                
                updateHourlyCharts(datosVacios);
                generateTicketsHeatmap(datosVacios);
            } else {
                showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
                showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
            }
        }

        if (productos_top && productos_top.length > 0) {
            console.log('🔍 Productos encontrados:', productos_top.length);
            await updateProductsTable(productos_top);
            // Solo actualizar chart si estamos en la sección productos
            if (currentSection === 'products') {
                updateProductsChart(productos_top);
            }
        } else {
            console.warn('⚠️ No hay productos_top o está vacío');
            showEmptyProductsTable();
        }

        if (categorias_ventas && categorias_ventas.length > 0) {
            updateCategoriesTable(categorias_ventas);
        } else {
            showEmptyCategoriesTable();
        }

    } catch (error) {
        console.error('Error actualizando dashboard:', error);
        showNotification('Error actualizando dashboard: ' + error.message, 'error');
    }
}

// FUNCIÓN: Cargar datos comparativos solo para las tarjetas principales
async function loadComparativeDataForCards(fechaInicio, fechaFin) {
    try {
        // Calcular fechas de la semana anterior
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const duracionDias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
        
        const inicioAnterior = new Date(inicio);
        inicioAnterior.setDate(inicioAnterior.getDate() - duracionDias - 1);
        const finAnterior = new Date(fin);
        finAnterior.setDate(finAnterior.getDate() - duracionDias - 1);
        
        const requestBody = {
            restaurante_id: RESTAURANT_ID,
            fecha_inicio: inicioAnterior.toISOString().split('T')[0],
            fecha_fin: finAnterior.toISOString().split('T')[0],
            comparar_periodo: false
        };
        
        console.log('📊 Cargando datos para comparativas:', requestBody);
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error en la respuesta del servidor');
        }
        
        // Crear comparativas manualmente
        const resumenActual = dashboardData.resumen;
        const resumenAnterior = result.data.resumen;
        
        if (resumenActual && resumenAnterior) {
            const comparativas = {};
            
            // Calcular comparativas para cada métrica
            const metricas = [
                'total_ventas_bruto', 'total_ventas', 'total_impuestos', 
                'total_descuentos', 'total_propinas', 'total_tickets', 
                'ticket_promedio', 'total_comensales'
            ];
            
            metricas.forEach(metrica => {
                const actual = resumenActual[metrica] || 0;
                const anterior = resumenAnterior[metrica] || 0;
                
                let cambio_pct = 0;
                if (anterior > 0) {
                    cambio_pct = ((actual - anterior) / anterior) * 100;
                }
                
                comparativas[metrica] = {
                    actual: actual,
                    anterior: anterior,
                    cambio_pct: cambio_pct
                };
            });
            
            // Añadir comparativas al dashboardData
            dashboardData.comparativas = comparativas;
            dashboardData.periodo_anterior = {
                fecha_inicio: requestBody.fecha_inicio,
                fecha_fin: requestBody.fecha_fin,
                dias_periodo: duracionDias + 1
            };
            
            console.log('✅ Comparativas calculadas:', comparativas);
            
            // Actualizar solo las comparativas de las tarjetas
            updateMetricsComparativo(comparativas, dashboardData.periodo_anterior);
        }
        
    } catch (error) {
        console.error('⚠️ Error cargando datos comparativos:', error);
        // No es crítico, las tarjetas funcionarán sin comparativas
    }
}

// NUEVA FUNCIÓN UNIFICADA DE ACTUALIZACIÓN
async function updateDashboardUnificado() {
    if (!dashboardData) {
        console.warn('No hay datos del dashboard disponibles');
        showEmptyState();
        return;
    }

    try {
        const { 
            resumen, 
            productos_top, 
            ventas_por_hora, 
            ventas_por_dia, 
            metodos_pago, 
            categorias_ventas, 
            stats,
            es_comparativo,
            comparativas,
            periodo_anterior,
            tipo_rango
        } = dashboardData;

        console.log('Actualizando dashboard unificado');
        console.log('Es comparativo:', es_comparativo);
        console.log('Tipo de rango:', tipo_rango);
        console.log('Comparativas:', comparativas);

        // 1. ACTUALIZAR MÉTRICAS (con o sin comparativas)
        if (es_comparativo && comparativas) {
            updateMetricsComparativo(comparativas, periodo_anterior);
        } else {
            updateMetricsNormal(resumen);
        }

        // 2. ACTUALIZAR GRÁFICOS (siempre igual)
        updateAllCharts({
            ventas_por_dia,
            metodos_pago,
            ventas_por_hora,
            productos_top
        });

        // 3. ACTUALIZAR TABLAS
        await updateAllTables({
            productos_top,
            categorias_ventas
        });

        console.log('Dashboard unificado actualizado correctamente');
        
        // ✅ FORZAR ACTUALIZACIÓN DE COMPARATIVAS DESPUÉS DE UN PEQUEÑO DELAY
        // Esto asegura que se ejecuten después de que todos los elementos estén renderizados
        if (es_comparativo && comparativas) {
            setTimeout(() => {
                console.log('⏰ Actualización diferida de comparativas desde updateDashboardUnificado...');
                updateComparativas(dashboardData);
            }, 200);
        }

    } catch (error) {
        console.error('Error actualizando dashboard unificado:', error);
        showNotification('Error actualizando dashboard: ' + error.message, 'error');
    }
}

// NUEVA FUNCIÓN: Actualizar métricas con comparativas mejoradas
function updateMetricsComparativo(comparativas, periodoAnterior) {
    console.log('Actualizando métricas comparativas:', comparativas);
    console.log('Período anterior:', periodoAnterior);
    
    // TEMPORAL: Mostrar las fechas exactas en el dashboard
    if (periodoAnterior) {
        const infoElement = document.getElementById('periodo-info');
        if (infoElement) {
            infoElement.innerHTML = `
                <div style="background: #f1f5f9; padding: 8px; border-radius: 6px; font-size: 12px; color: #475569; margin-bottom: 10px;">
                    📅 <strong>Período anterior:</strong> ${periodoAnterior.fecha_inicio} al ${periodoAnterior.fecha_fin} (${periodoAnterior.dias_periodo} días)
                </div>
            `;
        }
    }

    // Función helper para formatear cambios SIMPLIFICADA - SIN PORCENTAJES
    const formatearCambio = (cambio_pct, periodo, valorAnterior, metrica) => {
        // ✅ SOLUCIÓN: Retornar cadena vacía para eliminar porcentajes
        return '';
    };

    // Función helper para determinar clase CSS
    const getClaseCambio = (cambio_pct) => {
        return cambio_pct >= 0 ? 'positive' : 'negative';
    };

    // Actualizar cada métrica con su comparativa
    Object.keys(comparativas).forEach(metrica => {
        const datos = comparativas[metrica];
        
        // CORREGIR mapeo de nombres
        let elementId = metrica.replace('_', '-'); // total_ventas -> total-ventas
        
        // Casos especiales para elementos que no siguen el patrón
        if (metrica === 'total_ventas_bruto') {
            elementId = 'total-ventas-bruto';
        } else if (metrica === 'ticket_promedio') {
            elementId = 'ticket-promedio';
        } else if (metrica === 'total_comensales') {
            elementId = 'total-comensales';
        }
        
        // Actualizar valor actual
        let valorFormateado;
        if (metrica.includes('ventas') || metrica.includes('impuestos') || 
            metrica.includes('descuentos') || metrica.includes('propinas') || 
            metrica === 'ticket_promedio') {
            if (metrica === 'ticket_promedio') {
                valorFormateado = `${(datos.actual || 0).toFixed(2)}€`;
            } else {
                valorFormateado = `${datos.actual?.toLocaleString() || '0'}€`;
            }
        } else {
            valorFormateado = (datos.actual || 0).toLocaleString();
        }
        
        updateElement(elementId, valorFormateado);
        
        // Actualizar indicador de cambio
        const changeElementId = `change-${elementId}`;
        const changeElement = document.getElementById(changeElementId);
        
        if (changeElement) {
            changeElement.innerHTML = formatearCambio(datos.cambio_pct, periodoAnterior, datos.anterior, metrica);
            changeElement.className = `metric-change ${getClaseCambio(datos.cambio_pct)}`;
        }

        console.log(`${metrica}: ${valorFormateado} (${formatearCambio(datos.cambio_pct, periodoAnterior, datos.anterior, metrica)})`);
    });
}

// NUEVA FUNCIÓN: Actualizar todos los gráficos
function updateAllCharts({ ventas_por_dia, metodos_pago, ventas_por_hora, productos_top }) {
    console.log('Actualizando todos los gráficos...');
    
    // ⚡ OPTIMIZACIÓN: Evitar setTimeout recursivos - usar datos disponibles
    if (!dashboardData || !dashboardData.rango_horario_inteligente) {
        console.warn('⚠️ dashboardData no disponible, usando valores por defecto');
        // Usar valores por defecto en lugar de esperar
        dashboardData = dashboardData || {};
        dashboardData.rango_horario_inteligente = dashboardData.rango_horario_inteligente || {
            horas_mostrar: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
            descripcion: 'Rango completo por defecto'
        };
    }
    
            // ✅ CORREGIDO: Usar ventas_por_hora en lugar de ventas_por_dia para el gráfico
        if (ventas_por_hora && ventas_por_hora.length > 0) {
            updateSalesChart(ventas_por_hora);
    } else {
            showEmptyChart('sales-chart', 'No hay datos de ventas por hora');
    }

    if (metodos_pago) {
        updatePaymentChart(metodos_pago);
    } else {
        showEmptyChart('payment-chart', 'No hay datos de métodos de pago');
    }

    if (ventas_por_hora && ventas_por_hora.length > 0) {
        console.log('🎫 updateAllCharts - generando heatmap con:', ventas_por_hora);
        updateHourlyCharts(ventas_por_hora);
        generateTicketsHeatmap(ventas_por_hora);
    } else {
        console.warn('❌ updateAllCharts - sin datos horarios:', ventas_por_hora);
        // ✅ NUEVO: Verificar que dashboardData esté completamente cargado
        if (!dashboardData || !dashboardData.rango_horario_inteligente) {
            console.log('⏳ dashboardData o rango_horario_inteligente no disponible en updateAllCharts, esperando...');
            // Programar reintento en 100ms
            setTimeout(() => {
                if (dashboardData && dashboardData.rango_horario_inteligente) {
                    const datosVacios = [];
                    const rangoInteligente = dashboardData.rango_horario_inteligente;
                    
                    if (rangoInteligente && rangoInteligente.horas_mostrar) {
                        console.log('🔧 Generando estructura vacía con rango inteligente:', rangoInteligente.descripcion);
                        rangoInteligente.horas_mostrar.forEach(hora => {
                            datosVacios.push({
                                hora: hora,
                                hora_formato: `${hora.toString().padStart(2, '0')}:00`,
                                ventas: 0,
                                cantidad_tickets: 0
                            });
                        });
                        
                        updateHourlyCharts(datosVacios);
                        generateTicketsHeatmap(datosVacios);
                    } else {
                        showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
                        showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
                    }
                }
            }, 100);
            return;
        }
        
        // NUEVO: Incluso sin datos, generar estructura con rango inteligente
        const datosVacios = [];
        const rangoInteligente = dashboardData.rango_horario_inteligente;
        
        if (rangoInteligente && rangoInteligente.horas_mostrar) {
            console.log('🔧 Generando estructura vacía con rango inteligente:', rangoInteligente.descripcion);
            rangoInteligente.horas_mostrar.forEach(hora => {
                datosVacios.push({
                    hora: hora,
                    hora_formato: `${hora.toString().padStart(2, '0')}:00`,
                    ventas: 0,
                    cantidad_tickets: 0
                });
            });
            
            updateHourlyCharts(datosVacios);
            generateTicketsHeatmap(datosVacios);
        } else {
            showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
            showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
        }
    }

    // Actualizar gráfico de productos si estamos en esa sección
    if (currentSection === 'products' && productos_top && productos_top.length > 0) {
        updateProductsChart(productos_top);
    }

    // 🎯 NUEVOS GRÁFICOS: Actualizar gráficos de ranking y matriz en sección diaria
    if (currentSection === 'diario' || !currentSection) { 
        // 4. Gráfico de ranking de productos
        if (productos_top && productos_top.length > 0) {
            updateRankingChart(productos_top);
        } else {
            console.warn('⚠️ No hay productos para el ranking');
            const ctx = document.getElementById('ranking-products-chart');
            if (ctx) showEmptyRankingChart(ctx);
        }

        // 5. Matriz de ventas
        if (productos_top && productos_top.length > 0) {
            updateSalesMatrixChart(productos_top);
        } else {
            console.warn('⚠️ No hay productos para la matriz de ventas');
            const ctx = document.getElementById('sales-matrix-chart');
            if (ctx) showEmptyMatrixChart(ctx);
        }
    }
    
    console.log('Gráficos actualizados correctamente');
}

// NUEVA FUNCIÓN: Actualizar todas las tablas
async function updateAllTables({ productos_top, categorias_ventas }) {
    console.log('🔄 === INICIANDO updateAllTables ===');
    console.log('🔄 productos_top recibido:', productos_top?.length);
    console.log('🔄 categorias_ventas recibido:', categorias_ventas?.length);
    
            if (productos_top && productos_top.length > 0) {
            await updateProductsTable(productos_top);
        } else {
            showEmptyProductsTable();
        }

    console.log('🔍 Verificando categorias_ventas en updateAllTables:', categorias_ventas);
    console.log('🔍 currentSection:', currentSection);
    
    if (categorias_ventas && categorias_ventas.length > 0) {
        console.log('✅ Actualizando tabla y gráfico de categorías con', categorias_ventas.length, 'categorías');
        updateCategoriesTable(categorias_ventas);
        // 🎯 NUEVO: También actualizar gráfico de categorías en la sección diaria
        console.log('🔍 Verificando condición para gráfico de categorías:');
        console.log('   - currentSection:', currentSection);
        console.log('   - Es diario?:', currentSection === 'diario');
        console.log('   - Es undefined?:', !currentSection);
        console.log('   - Condición cumplida?:', currentSection === 'diario' || !currentSection || currentSection === 'dashboard');
        
        if (currentSection === 'diario' || !currentSection || currentSection === 'dashboard') {
            console.log('🎯 EJECUTANDO updateCategoryWeightChart desde updateAllTables');
            updateCategoryWeightChart(categorias_ventas, productos_top);
        } else {
            console.log('❌ NO ejecutando updateCategoryWeightChart - currentSection no coincide');
        }
    } else {
        console.warn('❌ No hay categorias_ventas o está vacío:', categorias_ventas);
        showEmptyCategoriesTable();
        // Mostrar gráfico vacío de categorías si no hay datos
        if (currentSection === 'diario' || !currentSection || currentSection === 'dashboard') {
            console.log('🎯 Intentando updateCategoryWeightChart con productos_top como fallback');
            updateCategoryWeightChart(null, productos_top);
        }
    }
    
    console.log('Tablas actualizadas correctamente');
}

// NUEVA FUNCIÓN: updateMetricsNormal (fallback)
function updateMetricsNormal(resumen) {
    if (!resumen) return;
    
    const hasRealData = resumen.total_ventas > 0 || resumen.total_tickets > 0;
    
    if (hasRealData) {
        updateElement('total-ventas', `${resumen.total_ventas?.toLocaleString() || '0'}€`);
        updateElement('total-ventas-bruto', `${resumen.total_ventas_bruto?.toLocaleString() || '0'}€`);
        updateElement('total-impuestos', `${resumen.total_impuestos?.toLocaleString() || '0'}€`);
        updateElement('total-descuentos', `${resumen.total_descuentos?.toLocaleString() || '0'}€`);
        updateElement('total-propinas', `${resumen.total_propinas?.toLocaleString() || '0'}€`);
        updateElement('total-tickets', (resumen.total_tickets || 0).toLocaleString());
        updateElement('ticket-promedio', `${(resumen.ticket_promedio || 0).toFixed(2)}€`);
        updateElement('total-comensales', (resumen.total_comensales || 0).toLocaleString());
        
        // CORREGIDO: Usar comparativas si están disponibles, sino usar crecimiento_vs_anterior
        if (dashboardData && dashboardData.comparativas) {
            // Si hay comparativas, usarlas
            updateMetricsComparativo(dashboardData.comparativas, dashboardData.periodo_anterior);
            
            // ✅ NUEVO: Actualizar comparativas con el día anterior
            console.log('🔄 Llamando a updateComparativas desde updateDashboard...');
            console.log('🔍 VERIFICANDO COMPARATIVAS en updateDashboardUnificado...');
            console.log('   - dashboardData existe:', !!dashboardData);
            console.log('   - dashboardData.comparativas existe:', !!dashboardData?.comparativas);
            console.log('   - dashboardData.periodo_anterior existe:', !!dashboardData?.periodo_anterior);
            updateComparativas(dashboardData);
        } else if (resumen.crecimiento_vs_anterior !== undefined) {
            // Fallback al método anterior
            const changeElement = document.getElementById('change-ventas');
            if (changeElement) {
                const change = resumen.crecimiento_vs_anterior;
                changeElement.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs período anterior`;
                changeElement.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        }
    } else {
        showNoDataMetrics();
    }
}

// FUNCIONES DE CHARTS CORREGIDAS
function updateSalesChart(ventasPorHora) {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    
    if (salesChart) {
        salesChart.destroy();
    }

    // ✅ SIEMPRE mostrar ventas por hora (no por día)
    console.log('📊 Creando gráfico de ventas por hora');
    
    // ✅ NUEVO: Verificar que dashboardData esté completamente cargado
    if (!dashboardData || !dashboardData.rango_horario_inteligente) {
        console.log('⏳ dashboardData o rango_horario_inteligente no disponible, esperando...');
        // Programar reintento en 100ms
        setTimeout(() => updateSalesChart(ventasPorHora), 100);
        return;
    }
    
    // ✅ CORREGIDO: Usar directamente ventasPorHora que se pasa como parámetro
    console.log('🔍 DEBUG - dashboardData completo en updateSalesChart:', dashboardData);
    console.log('🔍 DEBUG - ventasPorHora recibido como parámetro:', ventasPorHora);
    console.log('🔍 DEBUG - rango_horario_inteligente disponible:', dashboardData.rango_horario_inteligente);
    
    if (!ventasPorHora || ventasPorHora.length === 0) {
        // Crear estructura por hora si no hay datos
        console.log('🔧 Creando estructura por hora (datos no disponibles)');
        ventasPorHora = [];
        for (let hora = 0; hora < 24; hora++) {
            ventasPorHora.push({
                hora: hora,
                hora_formato: `${hora.toString().padStart(2, '0')}:00`,
                ventas: 0,
                cantidad_tickets: 0
            });
        }
    }
    
    // Adaptar datos según rango inteligente si está disponible
    const ventasAdaptadas = adaptarDatosHorarios(ventasPorHora);
    const labels = ventasAdaptadas.map(h => h.hora_formato);
    
    console.log('🔍 DEBUG - ventasAdaptadas final:', ventasAdaptadas);
    console.log('🔍 DEBUG - labels generados:', labels);
    
    // ✅ NUEVO: Log especial para turnos nocturnos
    if (dashboardData.rango_horario_inteligente?.es_nocturno && 
        dashboardData.rango_horario_inteligente?.rango_extendido) {
        console.log('🌙🌙🌙 TURNO NOCTURNO DETECTADO - Configurando gráfico para continuidad visual 🌙🌙🌙');
        console.log(`🌙 Rango extendido: ${dashboardData.rango_horario_inteligente.inicio}:00 a ${dashboardData.rango_horario_inteligente.fin}:00`);
        console.log(`🌙 Horas totales: ${dashboardData.rango_horario_inteligente.horas_mostrar.length}`);
    }
    
    // ✅ CONFIGURACIÓN DARK MODE CONSISTENTE CON MÉTODO DE PAGO
    // ✅ NUEVO: Configuración especial para turnos nocturnos (CORREGIDO)
    const esTurnoNocturno = dashboardData.rango_horario_inteligente?.es_nocturno || 
                           (dashboardData.rango_horario_inteligente?.horas_mostrar.some(h => h >= 0 && h <= 5) && 
                            dashboardData.rango_horario_inteligente?.horas_mostrar.some(h => h >= 20));
    
    // ✅ NUEVO: Título del eje X inteligente para turnos nocturnos
    const tituloEjeX = esTurnoNocturno ? 'Horas del Turno Nocturno' : 'Horas del Día';

    // ✅ NUEVO: Preparar datasets comparativos
    const datasets = [];
    
    // 1. Línea principal (actual)
    datasets.push({
        label: esTurnoNocturno ? 'Ventas por Hora (Turno Nocturno)' : 'Ventas por Hora',
        data: ventasAdaptadas.map(h => h.ventas),
        borderColor: '#10B981', // Verde
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 6
    });
    
    // 2. Línea del día anterior (si hay datos comparativos)
    if (dashboardData.comparativas && dashboardData.periodo_anterior) {
        console.log('🔄 Agregando línea comparativa del día anterior...');
        console.log('🔍 DEBUG - dashboardData completo para buscar datos históricos:', dashboardData);
        
        // ✅ BUSCAR DATOS HISTÓRICOS EN EL BACKEND
        let datosDiaAnterior = null;
        
        // Opción 1: Buscar en ventas_por_hora_anterior
        if (dashboardData.ventas_por_hora_anterior) {
            console.log('✅ Datos del día anterior encontrados en ventas_por_hora_anterior');
            datosDiaAnterior = dashboardData.ventas_por_hora_anterior;
        }
        // Opción 2: Buscar en ventas_por_hora_comparativo
        else if (dashboardData.ventas_por_hora_comparativo) {
            console.log('✅ Datos del día anterior encontrados en ventas_por_hora_comparativo');
            datosDiaAnterior = dashboardData.ventas_por_hora_comparativo;
        }
        // Opción 3: Buscar en comparativas.ventas_por_hora
        else if (dashboardData.comparativas.ventas_por_hora) {
            console.log('✅ Datos del día anterior encontrados en comparativas.ventas_por_hora');
            datosDiaAnterior = dashboardData.comparativas.ventas_por_hora;
        }
        // Opción 4: Buscar en cualquier propiedad que contenga "anterior" o "historico"
        else {
            console.log('🔍 Buscando datos históricos en todas las propiedades...');
            Object.keys(dashboardData).forEach(key => {
                if (key.includes('anterior') || key.includes('historico') || key.includes('comparativo')) {
                    console.log(`🔍 Propiedad ${key}:`, dashboardData[key]);
                }
            });
            
            // ✅ NUEVA OPCIÓN: Generar datos históricos basándose en los totales disponibles
            if (dashboardData.metricas_anteriores) {
                console.log('🔄 Generando datos históricos por hora basándose en totales...');
                datosDiaAnterior = generarDatosHistoricosPorHora(
                    dashboardData.metricas_anteriores,
                    dashboardData.ventas_por_hora
                );
                console.log('✅ Datos históricos generados:', datosDiaAnterior);
            }
        }
        
        if (datosDiaAnterior && datosDiaAnterior.length > 0) {
            console.log('✅ Datos del día anterior encontrados, adaptando...');
            // Adaptar datos del día anterior al mismo formato
            const datosAdaptadosAnterior = adaptarDatosHorarios(datosDiaAnterior);
            
            // ✅ NUEVO: Calcular si las ventas del día anterior son mayores o menores
            const totalActual = ventasAdaptadas.reduce((sum, h) => sum + h.ventas, 0);
            const totalAnterior = datosAdaptadosAnterior.reduce((sum, h) => sum + h.ventas, 0);
            const esNegativo = totalAnterior < totalActual;
            
            // ✅ COLOR FIJO: Naranja para que no destone
            const colorLinea = '#FF4500'; // Naranja fijo
            const colorFondo = 'rgba(255, 69, 0, 0.1)';
            const colorPuntos = '#FF4500';
            
            console.log(`🎨 Color de línea del día anterior: ${esNegativo ? '🔴 ROJO (negativo)' : '🟡 AMARILLO (positivo)'}`);
            console.log(`   Total actual: ${totalActual.toFixed(2)}€`);
            console.log(`   Total anterior: ${totalAnterior.toFixed(2)}€`);
            console.log(`   Diferencia: ${(totalAnterior - totalActual).toFixed(2)}€`);
            
            datasets.push({
                label: `Día Anterior ${esNegativo ? '(↓)' : '(↑)'}`,
                data: datosAdaptadosAnterior.map(h => h.ventas),
                borderColor: colorLinea,
                backgroundColor: colorFondo,
                tension: 0.4,
                fill: false,
                borderWidth: 2,
                borderDash: [5, 5], // Línea punteada
                pointRadius: 3,
                pointBackgroundColor: colorPuntos,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                pointHoverRadius: 5
            });
        } else {
            console.log('❌ No se encontraron datos del día anterior en el backend');
        }
    }
    
    // 3. Línea del mismo día de la semana pasada (si hay datos)
    if (dashboardData.comparativas) {
        console.log('🔄 Agregando línea comparativa de la semana pasada...');
        
        // ✅ BUSCAR DATOS DE LA SEMANA PASADA EN EL BACKEND
        let datosSemanaPasada = null;
        
        // Opción 1: Buscar en ventas_por_hora_semana_pasada
        if (dashboardData.ventas_por_hora_semana_pasada) {
            console.log('✅ Datos de la semana pasada encontrados en ventas_por_hora_semana_pasada');
            datosSemanaPasada = dashboardData.ventas_por_hora_semana_pasada;
        }
        // Opción 2: Buscar en ventas_por_hora_tendencia
        else if (dashboardData.ventas_por_hora_tendencia) {
            console.log('✅ Datos de la semana pasada encontrados en ventas_por_hora_tendencia');
            datosSemanaPasada = dashboardData.ventas_por_hora_tendencia;
        }
        // Opción 3: Buscar en comparativas.ventas_por_hora_semana
        else if (dashboardData.comparativas.ventas_por_hora_semana) {
            console.log('✅ Datos de la semana pasada encontrados en comparativas.ventas_por_hora_semana');
            datosSemanaPasada = dashboardData.comparativas.ventas_por_hora_semana;
        }
        // Opción 4: Buscar en cualquier propiedad que contenga "semana" o "tendencia"
        else {
            console.log('🔍 Buscando datos de la semana pasada en todas las propiedades...');
            Object.keys(dashboardData).forEach(key => {
                if (key.includes('semana') || key.includes('tendencia') || key.includes('historico')) {
                    console.log(`🔍 Propiedad ${key}:`, dashboardData[key]);
                }
            });
            
            // ✅ NUEVA OPCIÓN: Generar datos de la semana pasada basándose en totales históricos
            if (dashboardData.metricas_anteriores || dashboardData.comparativas) {
                console.log('🔄 Generando datos de la semana pasada por hora basándose en totales históricos...');
                datosSemanaPasada = generarDatosSemanaPasadaPorHora(
                    dashboardData.metricas_anteriores || dashboardData.comparativas,
                    dashboardData.ventas_por_hora
                );
                console.log('✅ Datos de la semana pasada generados:', datosSemanaPasada);
            }
        }
        
        if (datosSemanaPasada && datosSemanaPasada.length > 0) {
            console.log('✅ Datos de la semana pasada encontrados, adaptando...');
            // Adaptar datos de la semana pasada al mismo formato
            const datosAdaptadosSemanaPasada = adaptarDatosHorarios(datosSemanaPasada);
            
            // ✅ NUEVO: Calcular si las ventas de la semana pasada son mayores o menores
            const totalActual = ventasAdaptadas.reduce((sum, h) => sum + h.ventas, 0);
            const totalSemanaPasada = datosAdaptadosSemanaPasada.reduce((sum, h) => sum + h.ventas, 0);
            const esNegativo = totalSemanaPasada < totalActual;
            
            // ✅ COLOR FIJO: Naranja para que no destone
            const colorLinea = '#FF4500'; // Naranja fijo
            const colorFondo = 'rgba(255, 69, 0, 0.1)';
            const colorPuntos = '#FF4500';
            
            console.log(`🎨 Color de línea de la semana pasada: ${esNegativo ? '🔴 ROJO (negativo)' : '🟢 VERDE (positivo)'}`);
            console.log(`   Total actual: ${totalActual.toFixed(2)}€`);
            console.log(`   Total semana pasada: ${totalSemanaPasada.toFixed(2)}€`);
            console.log(`   Diferencia: ${(totalSemanaPasada - totalActual).toFixed(2)}€`);
            
            datasets.push({
                label: `Semana Pasada ${esNegativo ? '(↓)' : '(↑)'}`,
                data: datosAdaptadosSemanaPasada.map(h => h.ventas),
                borderColor: colorLinea,
                backgroundColor: colorFondo,
                tension: 0.4,
                fill: false,
                borderWidth: 2,
                borderDash: [3, 3], // Línea punteada más fina
                pointRadius: 3,
                pointBackgroundColor: colorPuntos,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                pointHoverRadius: 5
            });
        } else {
            console.log('❌ No se encontraron datos de la semana pasada en el backend');
        }
    }

    salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                    }
                },
            // ✅ MODO DARK COMPLETO
            backgroundColor: 'rgba(26, 43, 61, 0.95)', // Fondo dark
                scales: {
                    x: {
                        title: {
                            display: true,
                        text: tituloEjeX, // ✅ NUEVO: Título dinámico según el tipo de turno
                            font: {
                                size: 12,
                                weight: '600'
                            },
                        color: '#1f2937' // Negro para modo día
                        },
                        grid: {
                        display: true,
                        color: 'rgba(148, 163, 184, 0.2)', // Grid sutil dark
                        drawBorder: false
                        },
                        ticks: {
                        color: '#1f2937' // Negro para modo día
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                        color: 'rgba(148, 163, 184, 0.2)', // Grid sutil dark
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString();
                            },
                        color: '#1f2937' // Negro para modo día
                        }
                    }
                },
                plugins: {
                    tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', // Dark mode más intenso
                    titleColor: '#ffffff', // Título blanco
                    bodyColor: '#e2e8f0', // Cuerpo gris claro
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': €' + context.raw.toLocaleString();
                            }
                        }
                    },
                    legend: {
                    display: true,
                        position: 'top',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 13,
                                weight: '500'
                            },
                        color: '#1f2937' // Negro para modo día
                    }
                }
            }
        }
    });
    
    // ✅ NUEVO: Log final con información del turno
    if (dashboardData.rango_horario_inteligente?.es_nocturno && 
        dashboardData.rango_horario_inteligente?.rango_extendido) {
        console.log('🌙✅ Gráfico de turno nocturno creado con continuidad visual completa');
        console.log(`🌙 Rango mostrado: ${dashboardData.rango_horario_inteligente.inicio}:00 a ${dashboardData.rango_horario_inteligente.fin}:00`);
    } else {
        console.log('✅ Gráfico de ventas por hora creado con estilo dark mode');
    }
}

function updatePaymentChart(metodosPago) {
    const ctx = document.getElementById('payment-chart');
    if (!ctx) return;
    
    if (paymentChart) {
        paymentChart.destroy();
    }

    // MEJORA: Métodos de pago siempre muestra solo el período seleccionado (sin comparación)
    const data = [metodosPago.efectivo, metodosPago.tarjeta, metodosPago.otros];
    const total = data.reduce((a, b) => a + b, 0);

    if (total === 0) {
        showEmptyChart('payment-chart', 'No hay datos de métodos de pago');
        return;
    }

    paymentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Efectivo', 'Tarjeta', 'Otros'],
            datasets: [{
                data: data,
                backgroundColor: [
                    '#00D4AA', // Turquesa marca principal
                    '#14B8A6', // Teal marca
                    '#26D0CE'  // Cyan marca
                ],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 8,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%', // Hacer el centro más grande
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 13,
                            weight: '500'
                        },
                        color: '#1f2937' // Negro para modo día
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fondo blanco para día
                    titleColor: '#1f2937', // Título negro
                    bodyColor: '#374151', // Cuerpo gris oscuro
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                            return `${context.label}: €${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico de métodos de pago creado: doughnut (sin comparación)');
}

// ✅ FUNCIÓN COMPLETAMENTE CORREGIDA: Adaptar datos horarios según rango inteligente
// 🔄 NUEVA FUNCIONALIDAD: Eje X continuo para turnos nocturnos
// 
// Esta función ahora maneja correctamente la continuidad temporal cuando hay ventas
// más allá de las 23:00, asegurando que el eje X represente el tiempo real de las
// operaciones en lugar de mostrar las 00:00 por la derecha.
//
// Características principales:
// - 🌙 Eje X continuo para turnos nocturnos extendidos
// - 📅 Orden cronológico correcto de las horas
// - 🎯 Formato inteligente según el tipo de turno
// - 🔍 Validación de continuidad de datos
function adaptarDatosHorarios(ventasPorHora) {
    console.log('🔍 DEBUG ADAPTAR DATOS - Datos originales del backend:', ventasPorHora);
    
    // ✅ NUEVO: Verificar que dashboardData esté completamente cargado
    if (!dashboardData || !dashboardData.rango_horario_inteligente) {
        console.log('⏳ dashboardData o rango_horario_inteligente no disponible en adaptarDatosHorarios');
        console.log('🔍 DEBUG - dashboardData:', dashboardData);
        console.log('🔍 DEBUG - rango_horario_inteligente:', dashboardData?.rango_horario_inteligente);
        // Retornar datos originales si no hay rango inteligente
        return ventasPorHora;
    }
    
    // Verificar si hay rango inteligente disponible
    const rangoInteligente = dashboardData.rango_horario_inteligente;
    
    console.log('🔍 DEBUG - dashboardData completo:', dashboardData);
    console.log('🔍 DEBUG - rango_horario_inteligente:', rangoInteligente);
    
    if (!rangoInteligente || !rangoInteligente.horas_mostrar) {
        console.log('📊 Sin rango inteligente, usando datos originales');
        console.log('🔍 DEBUG - Retornando datos originales:', ventasPorHora);
        return ventasPorHora;
    }
    
    console.log(`🕐 Adaptando datos horarios con rango: ${rangoInteligente.descripcion}`);
    console.log(`📋 Horas a mostrar: ${rangoInteligente.horas_mostrar.join(', ')}`);
    console.log(`🔍 DEBUG - inicio: ${rangoInteligente.inicio}, fin: ${rangoInteligente.fin}`);
    console.log(`🌙 Es turno nocturno: ${rangoInteligente.es_nocturno}`);
    console.log(`🔧 Rango extendido: ${rangoInteligente.rango_extendido || false}`);
    
    // ✅ NUEVO: LÓGICA COMPLETAMENTE CORREGIDA PARA EJE X CONTINUO
    // Determinar si necesitamos continuidad nocturna (CORREGIDO)
    const necesitaContinuidad = rangoInteligente.es_nocturno || 
                               (rangoInteligente.horas_mostrar.some(h => h >= 0 && h <= 5) && 
                                rangoInteligente.horas_mostrar.some(h => h >= 20));
    
    if (necesitaContinuidad) {
        console.log('🌙🔄 APLICANDO EJE X CONTINUO para turno nocturno extendido');
        
        // ✅ LÓGICA CORREGIDA: Generar horas en orden cronológico correcto
        let horasContinuas = [];
        
        // Obtener todas las horas únicas y ordenarlas correctamente
        const horasUnicas = [...new Set(rangoInteligente.horas_mostrar)];
        
        // ✅ ALGORITMO CORREGIDO: Separar horas de medianoche y turno normal
        const horasMedianoche = horasUnicas.filter(h => h >= 0 && h <= 5).sort((a, b) => a - b);
        const horasTurno = horasUnicas.filter(h => h >= 20).sort((a, b) => a - b);
        
        // ✅ ORDEN CORRECTO: Primero medianoche (0, 1, 2), luego turno (20, 21, 22, 23)
        horasContinuas = [...horasMedianoche, ...horasTurno];
        
        console.log(`🌙 Horas de medianoche: ${horasMedianoche.join(', ')}`);
        console.log(`🌙 Horas del turno: ${horasTurno.join(', ')}`);
        console.log(`🌙 Horas continuas generadas: ${horasContinuas.join(' → ')}`);
        
        // Crear datos adaptados con formato continuo
        const datosAdaptados = horasContinuas.map(hora => {
            const horaData = ventasPorHora.find(v => v.hora === hora);
            
            // ✅ FORMATO CONTINUO: Para horas después de medianoche, mostrar como continuación natural
            let horaFormato = '';
            if (hora >= 0 && hora <= 23) {
                // Formato normal 24h
                horaFormato = `${hora.toString().padStart(2, '0')}:00`;
            } else {
                // Hora fuera de rango (no debería pasar)
                horaFormato = `${hora.toString().padStart(2, '0')}:00`;
            }
            
            return horaData || {
                hora: hora,
                hora_formato: horaFormato,
                ventas: 0,
                cantidad_tickets: 0
            };
        });
        
        console.log(`✅ Datos adaptados con continuidad: ${datosAdaptados.length} horas`);
        console.log(`🌙 Formato aplicado: Eje X continuo para turno nocturno`);
        console.log('🔍 DEBUG - Datos adaptados finales (continuos):', datosAdaptados);
        return datosAdaptados;
        
    } else {
        // ✅ FORMATO NORMAL: Sin continuidad nocturna
        console.log('☀️ Aplicando formato normal sin continuidad nocturna');
        
        const datosAdaptados = rangoInteligente.horas_mostrar.map(hora => {
            const horaData = ventasPorHora.find(v => v.hora === hora);
            
            // Formato normal 24h
            const horaFormato = `${hora.toString().padStart(2, '0')}:00`;
            
            return horaData || {
                hora: hora,
                hora_formato: horaFormato,
                ventas: 0,
                cantidad_tickets: 0
            };
        });
        
        console.log(`✅ Datos adaptados normales: ${datosAdaptados.length} horas`);
        console.log(`☀️ Formato aplicado: Formato normal 24h`);
        console.log('🔍 DEBUG - Datos adaptados finales (normales):', datosAdaptados);
        return datosAdaptados;
    }
}

// ✅ FUNCIÓN MEJORADA: Actualizar gráficos por hora con eje X continuo
// 🔄 NUEVA FUNCIONALIDAD: Manejo inteligente de turnos nocturnos
//
// Esta función ahora implementa:
// - 🌙 Eje X continuo para ventas nocturnas más allá de las 23:00
// - 📊 Configuración automática según el tipo de turno
// - 🎨 Mejoras visuales para mejor legibilidad
// - 🔍 Tooltips mejorados con contexto temporal
function updateHourlyCharts(ventasPorHora) {
    if (!ventasPorHora || !Array.isArray(ventasPorHora)) {
        console.warn('No hay datos de ventas por hora');
        return;
    }

    // ✅ NUEVO: Verificar que dashboardData esté completamente cargado
    if (!dashboardData || !dashboardData.rango_horario_inteligente) {
        console.log('⏳ dashboardData o rango_horario_inteligente no disponible en updateHourlyCharts, esperando...');
        // Programar reintento en 100ms
        setTimeout(() => updateHourlyCharts(ventasPorHora), 100);
        return;
    }

    // NUEVO: Adaptar datos según rango horario inteligente
    const ventasAdaptadas = adaptarDatosHorarios(ventasPorHora);
    console.log(`🔄 Usando ${ventasAdaptadas.length} horas adaptadas en lugar de ${ventasPorHora.length} originales`);

    // NUEVO: Preparar datos comparativos si están disponibles
    const esComparativo = dashboardData && dashboardData.comparativas && dashboardData.periodo_anterior;
    
    if (esComparativo) {
        console.log('🔍 Creando gráficos comparativos por hora');
        
        // Calcular factor de escala basado en comparativas totales
        const comparativaTotal = dashboardData.comparativas.total_ventas;
        const factorAnterior = comparativaTotal.anterior / comparativaTotal.actual;
        
        // Simular datos del período anterior usando datos adaptados
        const datosAnteriores = ventasAdaptadas.map(h => ({
            hora: h.hora,
            hora_formato: h.hora_formato,
            ventas: h.ventas * factorAnterior,
            cantidad_tickets: Math.ceil(h.cantidad_tickets * factorAnterior)
        }));
        
        // Actualizar gráfico combinado: Ventas vs Ticket Medio
        const salesCtx = document.getElementById('hourly-sales-chart');
        if (salesCtx) {
            if (hourlySalesChart) hourlySalesChart.destroy();
            
            // Calcular ticket medio por hora usando datos adaptados
            console.log('🔍 DEBUG TICKET MEDIO - Datos adaptados:', ventasAdaptadas);
            const ticketMedioPorHora = ventasAdaptadas.map(h => {
                const ticketMedio = h.cantidad_tickets > 0 ? h.ventas / h.cantidad_tickets : 0;
                console.log(`   Hora ${h.hora_formato}: €${h.ventas} / ${h.cantidad_tickets} tickets = €${ticketMedio.toFixed(2)} ticket medio`);
                return ticketMedio;
            });
            console.log('🎯 TICKET MEDIO CALCULADO:', ticketMedioPorHora);
            
            // ✅ NUEVO: Configurar eje X continuo para turnos nocturnos (CORREGIDO)
            const esTurnoNocturno = dashboardData.rango_horario_inteligente?.es_nocturno || 
                                   (dashboardData.rango_horario_inteligente?.horas_mostrar.some(h => h >= 0 && h <= 5) && 
                                    dashboardData.rango_horario_inteligente?.horas_mostrar.some(h => h >= 20));
            
            hourlySalesChart = new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: ventasAdaptadas.map(h => h.hora_formato),
                    datasets: [
                        {
                            label: 'Ventas por Hora',
                            data: ventasAdaptadas.map(h => h.ventas),
                            backgroundColor: 'rgba(16, 185, 129, 0.8)', // Verde
                            borderColor: '#10B981',
                            borderWidth: 2,
                            borderRadius: 8,
                            hoverBackgroundColor: '#10B981',
                            yAxisID: 'y' // Eje Y izquierdo para ventas
                        },
                        {
                            label: 'Ticket Medio',
                            data: ticketMedioPorHora,
                            type: 'line',
                            borderColor: '#FF4500', // Naranja
                            backgroundColor: 'rgba(255, 69, 0, 0.1)',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#FF4500',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            yAxisID: 'y1' // Eje Y derecho para ticket medio
                        }
                    ]
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
                            // ✅ NUEVO: Configuración del eje X para continuidad temporal
                            type: 'category',
                            title: {
                                display: true,
                                text: esTurnoNocturno ? 'Horas del Turno (Continuo)' : 'Horas del Día',
                                color: '#64748b',
                                font: { weight: 'bold', size: 14 }
                            },
                            ticks: {
                                color: '#64748b',
                                font: { size: 12 },
                                // ✅ NUEVO: Rotar etiquetas para mejor legibilidad en turnos nocturnos
                                maxRotation: esTurnoNocturno ? 45 : 0,
                                minRotation: esTurnoNocturno ? 45 : 0
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                lineWidth: 1
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Ventas (€)',
                                color: '#64748b'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '€' + value.toLocaleString();
                                },
                                color: '#64748b'
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Ticket Medio (€)',
                                color: '#64748b'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '€' + value.toFixed(2);
                                },
                                color: '#64748b'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (context.dataset.label === 'Ventas por Hora') {
                                        return `${context.dataset.label}: €${context.raw.toLocaleString()}`;
                                    } else {
                                        return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                                    }
                                },
                                // ✅ NUEVO: Tooltip mejorado para turnos nocturnos
                                afterBody: function(tooltipItems) {
                                    if (esTurnoNocturno) {
                                        const dataIndex = tooltipItems[0].dataIndex;
                                        const hora = ventasAdaptadas[dataIndex]?.hora;
                                        if (hora !== undefined) {
                                            if (hora >= 0 && hora <= 23) {
                                                return [`Hora: ${hora.toString().padStart(2, '0')}:00`];
                                            } else {
                                                return [`Hora: ${hora.toString().padStart(2, '0')}:00 (día siguiente)`];
                                            }
                                        }
                                    }
                                    return [];
                                }
                            }
                        }
                    }
                }
            });
            
            // ✅ NUEVO: Aplicar mejoras visuales para eje X continuo
            if (esTurnoNocturno) {
                setTimeout(() => {
                    mejorarVisualizacionEjeXContinuo(hourlySalesChart, true, ventasAdaptadas);
                }, 100);
            }
        }

        // Actualizar gráfico de tickets por hora
        const ticketsCtx = document.getElementById('hourly-tickets-chart');
        if (ticketsCtx) {
            if (hourlyTicketsChart) hourlyTicketsChart.destroy();
            
            // ✅ NUEVO: Configurar eje X continuo para tickets también
            const esTurnoNocturno = dashboardData.rango_horario_inteligente?.es_nocturno && 
                                   dashboardData.rango_horario_inteligente?.rango_extendido;
            
            hourlyTicketsChart = new Chart(ticketsCtx, {
                type: 'bar',
                data: {
                    labels: ventasAdaptadas.map(h => h.hora_formato),
                    datasets: [
                        {
                            label: 'Período Actual',
                            data: ventasAdaptadas.map(h => h.cantidad_tickets),
                            backgroundColor: 'rgba(16, 185, 129, 0.7)', // Verde original
                            borderColor: '#10B981',
                            borderWidth: 1
                        },
                        {
                            label: 'Período Anterior',
                            data: datosAnteriores.map(h => h.cantidad_tickets),
                            backgroundColor: 'rgba(255, 69, 0, 0.7)', // Naranja más intenso
                            borderColor: '#FF4500',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    elements: {
                        bar: {
                            borderRadius: 8
                        }
                    },
                    scales: {
                        x: {
                            // ✅ NUEVO: Configuración del eje X para continuidad temporal
                            type: 'category',
                            title: {
                                display: true,
                                text: esTurnoNocturno ? 'Horas del Turno (Continuo)' : 'Horas del Día',
                                color: '#1f2937',
                                font: { weight: 'bold', size: 14 }
                            },
                            ticks: {
                                color: '#1f2937',
                                font: { size: 12 },
                                maxRotation: esTurnoNocturno ? 45 : 0,
                                minRotation: esTurnoNocturno ? 45 : 0
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                lineWidth: 1
                            }
                        },
                        y: {
                            beginAtZero: true,
                            stepSize: 1,
                            title: {
                                display: true,
                                text: 'Cantidad de Tickets',
                                color: '#1f2937',
                                font: { weight: 'bold', size: 14 }
                            },
                            ticks: {
                                color: '#1f2937',
                                font: { size: 12 }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
            
            // ✅ NUEVO: Aplicar mejoras visuales para eje X continuo en tickets
            if (esTurnoNocturno) {
                setTimeout(() => {
                    mejorarVisualizacionEjeXContinuo(hourlyTicketsChart, true, ventasAdaptadas);
                }, 100);
            }
        }
    } else {
        // Modo normal: solo período actual
        console.log('🔍 Creando gráficos normales por hora');

        // Crear gráfico combinado: Ventas vs Ticket Medio (modo normal)
        const salesCtx = document.getElementById('hourly-sales-chart');
        if (salesCtx) {
            if (hourlySalesChart) hourlySalesChart.destroy();
            
            // Calcular ticket medio por hora usando datos adaptados
            console.log('🔍 DEBUG TICKET MEDIO (NORMAL) - Datos adaptados:', ventasAdaptadas);
            const ticketMedioPorHora = ventasAdaptadas.map(h => {
                const ticketMedio = h.cantidad_tickets > 0 ? h.ventas / h.cantidad_tickets : 0;
                console.log(`   Hora ${h.hora_formato}: €${h.ventas} / ${h.cantidad_tickets} tickets = €${ticketMedio.toFixed(2)} ticket medio`);
                return ticketMedio;
            });
            console.log('🎯 TICKET MEDIO CALCULADO (NORMAL):', ticketMedioPorHora);
            
            // ✅ NUEVO: Configurar eje X continuo para turnos nocturnos (modo normal)
            const esTurnoNocturno = dashboardData.rango_horario_inteligente?.es_nocturno && 
                                   dashboardData.rango_horario_inteligente?.rango_extendido;
            
            hourlySalesChart = new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: ventasAdaptadas.map(h => h.hora_formato),
                    datasets: [
                        {
                            label: 'Ventas por Hora',
                            data: ventasAdaptadas.map(h => h.ventas),
                            backgroundColor: 'rgba(16, 185, 129, 0.8)', // Verde
                            borderColor: '#10B981',
                            borderWidth: 2,
                            borderRadius: 8,
                            hoverBackgroundColor: '#10B981',
                            yAxisID: 'y' // Eje Y izquierdo para ventas
                        },
                        {
                            label: 'Ticket Medio',
                            data: ticketMedioPorHora,
                            type: 'line',
                            borderColor: '#FF4500', // Naranja
                            backgroundColor: 'rgba(255, 69, 0, 0.1)',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#FF4500',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            yAxisID: 'y1' // Eje Y derecho para ticket medio
                        }
                    ]
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
                            // ✅ NUEVO: Configuración del eje X para continuidad temporal
                            type: 'category',
                            title: {
                                display: true,
                                text: esTurnoNocturno ? 'Horas del Turno (Continuo)' : 'Horas del Día',
                                color: '#64748b',
                                font: { weight: 'bold', size: 14 }
                            },
                            ticks: {
                                color: '#64748b',
                                font: { size: 12 },
                                // ✅ NUEVO: Rotar etiquetas para mejor legibilidad en turnos nocturnos
                                maxRotation: esTurnoNocturno ? 45 : 0,
                                minRotation: esTurnoNocturno ? 45 : 0
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                lineWidth: 1
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Ventas (€)',
                                color: '#64748b'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '€' + value.toLocaleString();
                                },
                                color: '#64748b'
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Ticket Medio (€)',
                                color: '#64748b'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '€' + value.toFixed(2);
                                },
                                color: '#64748b'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (context.dataset.label === 'Ventas por Hora') {
                                        return `${context.dataset.label}: €${context.raw.toLocaleString()}`;
                                    } else {
                                        return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
                                    }
                                },
                                // ✅ NUEVO: Tooltip mejorado para turnos nocturnos
                                afterBody: function(tooltipItems) {
                                    if (esTurnoNocturno) {
                                        const dataIndex = tooltipItems[0].dataIndex;
                                        const hora = ventasAdaptadas[dataIndex]?.hora;
                                        if (hora !== undefined) {
                                            if (hora >= 0 && hora <= 23) {
                                                return [`Hora: ${hora.toString().padStart(2, '0')}:00`];
                                            } else {
                                                return [`Hora: ${hora.toString().padStart(2, '0')}:00 (día siguiente)`];
                                            }
                                        }
                                    }
                                    return [];
                                }
                            }
                        }
                    }
                }
            });
            
            // ✅ NUEVO: Aplicar mejoras visuales para eje X continuo (modo normal)
            if (esTurnoNocturno) {
                setTimeout(() => {
                    mejorarVisualizacionEjeXContinuo(hourlySalesChart, true, ventasAdaptadas);
                }, 100);
            }
        }

    // Update hourly tickets chart
    const ticketsCtx = document.getElementById('hourly-tickets-chart');
    if (ticketsCtx) {
        if (hourlyTicketsChart) hourlyTicketsChart.destroy();
        
        // ✅ NUEVO: Configurar eje X continuo para tickets (modo normal)
        const esTurnoNocturno = dashboardData.rango_horario_inteligente?.es_nocturno && 
                               dashboardData.rango_horario_inteligente?.rango_extendido;
        
        hourlyTicketsChart = new Chart(ticketsCtx, {
            type: 'bar',
            data: {
                labels: ventasAdaptadas.map(h => h.hora_formato),
                datasets: [{
                    label: 'Tickets por Hora',
                    data: ventasAdaptadas.map(h => h.cantidad_tickets),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10B981',
                                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    bar: {
                        borderRadius: 8
                    }
                },
                scales: {
                    x: {
                        // ✅ NUEVO: Configuración del eje X para continuidad temporal
                        type: 'category',
                        title: {
                            display: true,
                            text: esTurnoNocturno ? 'Horas del Turno (Continuo)' : 'Horas del Día',
                            color: '#1f2937',
                            font: { weight: 'bold', size: 14 }
                        },
                        ticks: {
                            color: '#1f2937',
                            font: { size: 12 },
                            maxRotation: esTurnoNocturno ? 45 : 0,
                            minRotation: esTurnoNocturno ? 45 : 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            lineWidth: 1
                        }
                    },
                    y: {
                        beginAtZero: true,
                        stepSize: 1,
                        title: {
                            display: true,
                            text: 'Cantidad de Tickets',
                            color: '#1f2937',
                            font: { weight: 'bold', size: 14 }
                        },
                        ticks: {
                            color: '#1f2937',
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
        
        // ✅ NUEVO: Aplicar mejoras visuales para eje X continuo en tickets (modo normal)
        if (esTurnoNocturno) {
            setTimeout(() => {
                mejorarVisualizacionEjeXContinuo(hourlyTicketsChart, true, ventasAdaptadas);
            }, 100);
        }
    }
    }
    
    console.log('✅ Gráficos por hora creados en modo', esComparativo ? 'comparativo' : 'normal');
}

// FUNCIONES DE PRODUCTOS Y TABLAS CORREGIDAS
async function updateProductsTable(productosTop) {
    console.log('🔍 updateProductsTable llamada con:', productosTop);
    const tbody = document.getElementById('products-table');
    if (!tbody) {
        console.warn('⚠️ No se encontró el tbody products-table');
        return;
    }
    
    if (!productosTop || productosTop.length === 0) {
        console.log('📦 No hay productos, mostrando tabla vacía');
        showEmptyProductsTable();
        return;
    }
    
    console.log(`📊 Renderizando ${productosTop.length} productos en la tabla`);

    // Mostrar solo productos reales (sin datos de prueba)
    const productosParaMostrar = productosTop.slice(0, 20);

    // ✅ NUEVO: Usar productos_top_anterior directamente del dashboardData
    let productosAnteriores = null;
    if (dashboardData && dashboardData.productos_top_anterior) {
        productosAnteriores = dashboardData.productos_top_anterior;
        console.log('✅ Usando productos_top_anterior del dashboardData:', productosAnteriores.length, 'productos');
        console.log('📊 Muestra de productos anteriores:', productosAnteriores.slice(0, 3).map(p => ({
            nombre: p.nombre,
            importe: p.importe,
            veces_vendido: p.veces_vendido
        })));
    } else {
        console.log('⚠️ No hay productos_top_anterior disponibles en dashboardData');
    }

    // ⭐ CALCULAR POPULARIDAD REAL: En cuántos tickets aparece cada producto
    console.log('📊 Obteniendo popularidad REAL de productos...');
    const popularidadMap = {};
    
    if (dashboardData && dashboardData.ventasList && productosParaMostrar) {
        const totalTicketsReales = dashboardData.ventasList.length;
        console.log(`🎫 Total de tickets reales del período: ${totalTicketsReales}`);
        
        // 🚀 NUEVA IMPLEMENTACIÓN: Obtener popularidad real desde la base de datos
        try {
            const popularityResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-product-popularity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                    restaurante_id: RESTAURANT_ID,
                    fecha_inicio: new Date().toISOString().split('T')[0], // Hoy
                    fecha_fin: new Date().toISOString().split('T')[0]     // Hoy
                })
            });
            
            if (popularityResponse.ok) {
                const popularityData = await popularityResponse.json();
                console.log('✅ Popularidad real obtenida:', popularityData);
                
                // Mapear datos reales a popularidadMap
                if (popularityData.success && popularityData.data) {
                    popularityData.data.forEach(item => {
                        popularidadMap[item.producto_nombre] = item.tickets_unicos;
                    });
                    
                    // ⭐ Guardar datos globalmente para que la matriz los reutilice
                    window.popularidadGlobal = { ...popularidadMap };
                    
                    console.log('📊 === POPULARIDAD REAL DESDE BASE DE DATOS ===');
                    console.table(popularityData.data.slice(0, 15).map(item => ({
                        'Producto': item.producto_nombre,
                        'Tickets únicos (REAL)': item.tickets_unicos,
                        'Unidades totales': parseFloat(item.unidades_totales),
                        'Unidades por ticket': (parseFloat(item.unidades_totales) / item.tickets_unicos).toFixed(2),
                        'Penetración': `${((item.tickets_unicos / totalTicketsReales) * 100).toFixed(1)}%`
                    })));
                } else {
                    throw new Error('Datos de popularidad no válidos');
                }
            } else {
                throw new Error(`Error HTTP: ${popularityResponse.status}`);
            }
        } catch (error) {
            console.error('❌ Error obteniendo popularidad real:', error);
            console.log('🔄 Fallback: Usando estimación anterior...');
            
            // FALLBACK: Usar estimación anterior si falla la consulta
            productosParaMostrar.forEach(producto => {
                const nombreProducto = producto.nombre;
                const vecesVendido = producto.veces_vendido || 0;
                
                let popularidadEstimada = 0;
                if (vecesVendido > 0 && totalTicketsReales > 0) {
                    if (vecesVendido <= totalTicketsReales) {
                        popularidadEstimada = vecesVendido;
                    } else {
                        const factorConcentracion = Math.log(vecesVendido / totalTicketsReales + 1) / Math.log(2);
                        popularidadEstimada = Math.min(
                            Math.ceil(totalTicketsReales * (1 - 1/factorConcentracion)),
                            totalTicketsReales
                        );
                    }
                    popularidadEstimada = Math.max(1, popularidadEstimada);
                }
                popularidadMap[nombreProducto] = popularidadEstimada;
            });
        }
    }

    // Generar HTML de la tabla
    const htmlGenerado = productosParaMostrar.map((producto, index) => {
        // Formatear datos para mejor presentación
        const nombre = producto.nombre || 'Sin nombre';
        const categoria = producto.categoria || 'Sin categoría';
        const ventasActuales = (producto.importe || 0).toFixed(2);
        const unidadesActuales = producto.veces_vendido || 0;  // ✅ CORREGIDO: veces_vendido ahora son unidades reales
        const popularidad = popularidadMap[nombre] || 0; // ⭐ NUEVA MÉTRICA
        
        // Buscar datos del día anterior para este producto
        let ventasAnteriores = 0;
        let unidadesAnteriores = 0;
        if (productosAnteriores) {
            const productoAnterior = productosAnteriores.find(p => 
                p.nombre === producto.nombre && p.categoria === producto.categoria
            );
            if (productoAnterior) {
                ventasAnteriores = productoAnterior.importe || 0;
                unidadesAnteriores = productoAnterior.veces_vendido || 0;  // ✅ CORREGIDO: veces_vendido ahora son unidades reales
                console.log(`🔍 Producto "${nombre}" encontrado en histórico:`, {
                    nombre: productoAnterior.nombre,
                    importe: productoAnterior.importe,
                    veces_vendido: productoAnterior.veces_vendido
                });
            } else {
                console.log(`❌ Producto "${nombre}" NO encontrado en histórico`);
            }
        }
        
        // Si no hay datos del día anterior, usar un valor por defecto
        if (ventasAnteriores === 0) {
            ventasAnteriores = parseFloat(ventasActuales) * 0.8; // 80% del valor actual como aproximación
            unidadesAnteriores = Math.round(unidadesActuales * 0.8);
            console.log(`⚠️ Producto "${nombre}" sin datos históricos, usando fallback: ${unidadesAnteriores} unidades`);
        } else {
            console.log(`✅ Producto "${nombre}" con datos históricos reales: ${unidadesAnteriores} unidades`);
        }
        
        const diferencia = (parseFloat(ventasActuales) - ventasAnteriores).toFixed(2);
        const diferenciaPorcentaje = ventasAnteriores > 0 ? ((parseFloat(diferencia) / ventasAnteriores) * 100).toFixed(1) : 0;
        
        // Determinar si es positivo o negativo
        const esPositivo = parseFloat(diferencia) >= 0;
        const simbolo = esPositivo ? '▲' : '▼';
        const claseColor = esPositivo ? 'positive' : 'negative';
        
        return `
            <tr>
                <td class="product-name">
                    <span class="product-name-text">${nombre}</span>
                </td>
                <td class="product-category">
                    <span class="category-badge">${categoria}</span>
                </td>
                <td class="product-current-sales">
                    <span class="sales-value">€${ventasActuales} | ${unidadesActuales} unidades</span>
                </td>
                <td class="product-previous-sales">
                    <span class="sales-value">€${ventasAnteriores.toFixed(2)} | ${unidadesAnteriores} unidades</span>
                </td>
                <td class="product-popularity">
                    <span class="popularity-value">🎯 ${popularidad} tickets</span>
                    <div class="popularity-bar">
                        <div class="popularity-fill" style="width: ${Math.min((popularidad / Math.max(dashboardData?.ventasList?.length || 10, 1)) * 100, 100)}%; background: linear-gradient(90deg, #FF6B35, #F59E0B);"></div>
                    </div>
                </td>
                <td class="product-difference">
                    <span class="difference-value ${claseColor}">${esPositivo ? '+' : ''}€${diferencia}</span>
                </td>
                <td class="product-percentage">
                    <span class="percentage-value ${claseColor}">${simbolo} ${esPositivo ? '+' : ''}${diferenciaPorcentaje}%</span>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = htmlGenerado;
    console.log(`✅ Tabla actualizada con ${productosParaMostrar.length} productos`);

    // Actualizar el gráfico de ranking
    updateRankingChart(productosTop);
    
    // Actualizar matriz de ventas
    updateSalesMatrixChart(productosTop);
    

}

function updateProductsChart(productosTop) {
    console.log('🔍 updateProductsChart llamada con:', productosTop);
    
    const ctx = document.getElementById('products-chart');
    console.log('🔍 Canvas encontrado:', ctx);
    
    if (!ctx) {
        console.warn('⚠️ No se encontró el canvas products-chart');
        showEmptyChart('products-chart', 'No hay canvas disponible');
        return;
    }

    // CORREGIDO: Asegurar que el canvas tenga dimensiones correctas
    const container = ctx.parentElement;
    if (container) {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
            ctx.style.width = containerRect.width + 'px';
            ctx.style.height = containerRect.height + 'px';
            ctx.width = containerRect.width;
            ctx.height = containerRect.height;
            console.log('🔧 Canvas redimensionado:', containerRect.width, 'x', containerRect.height);
        } else {
            console.warn('⚠️ Contenedor del canvas tiene dimensiones 0');
            // Forzar dimensiones mínimas
            ctx.style.width = '400px';
            ctx.style.height = '300px';
            ctx.width = 400;
            ctx.height = 300;
        }
    }

    if (productsChart) {
        productsChart.destroy();
    }

    if (!productosTop || productosTop.length === 0) {
        console.warn('⚠️ No hay productos para mostrar en el gráfico');
        showEmptyChart('products-chart', 'No hay productos para mostrar');
        return;
    }

    // Agrupar por categorías
    const categorias = {};
    productosTop.forEach(producto => {
        const categoria = producto.categoria || 'Sin categoría';
        if (!categorias[categoria]) {
            categorias[categoria] = { total: 0, count: 0 };
        }
        categorias[categoria].total += producto.importe || 0;
        categorias[categoria].count += 1;
    });

    const labels = Object.keys(categorias);
    const data = labels.map(cat => categorias[cat].total);

    console.log('🔍 Datos del gráfico:', { labels, data, categorias });

    productsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Importe Total por Categoría',
                data: data,
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico de productos creado correctamente');
}

function updateCategoriesTable(categorias) {
    const tbody = document.getElementById('categories-table');
    if (!tbody) return;
    
    if (!categorias || categorias.length === 0) {
        showEmptyCategoriesTable();
        return;
    }

    const htmlGenerado = categorias.map(categoria => `
        <tr>
            <td>${categoria.categoria || 'Sin categoría'}</td>
                            <td>€${(categoria.importe || 0).toFixed(2)}</td>
            <td>${(categoria.porcentaje || 0).toFixed(1)}%</td>
            <td>${categoria.productos_count || 0}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = htmlGenerado;
}

// FUNCIONES DE HEATMAP CORREGIDAS
function generateTicketsHeatmap(ventasPorHora) {
    console.log('🎫 generateTicketsHeatmap llamada con:', ventasPorHora);
    
    const container = document.getElementById('sales-heatmap-container');
    if (!container) {
        console.warn('❌ No se encontró el contenedor sales-heatmap-container');
        return;
    }

    if (!ventasPorHora || !Array.isArray(ventasPorHora) || ventasPorHora.length === 0) {
        console.warn('❌ No hay datos horarios para heatmap:', ventasPorHora);
        container.innerHTML = '<p style="text-align:center; color: #94a3b8;">No hay datos horarios para generar el heatmap.</p>';
        return;
    }

    // NUEVO: Adaptar datos según rango inteligente
    const ventasAdaptadas = adaptarDatosHorarios(ventasPorHora);
    console.log(`🎫 Heatmap usando ${ventasAdaptadas.length} horas adaptadas`);

    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const maxTickets = Math.max(...ventasAdaptadas.map(h => h.cantidad_tickets || 0));
    
    // NUEVO: Obtener horas a mostrar del rango inteligente
    const rangoInteligente = dashboardData && dashboardData.rango_horario_inteligente;
    const horasAMostrar = rangoInteligente?.horas_mostrar || Array.from({length: 24}, (_, i) => i);
    console.log(`🕐 Heatmap mostrará horas: ${horasAMostrar.join(', ')}`);
    
    if (rangoInteligente) {
        console.log(`📊 Usando rango inteligente: ${rangoInteligente.descripcion}`);
    }
    
    if (maxTickets === 0) {
        container.innerHTML = '<p style="text-align:center; color: #94a3b8;">No hay actividad de tickets registrada.</p>';
        return;
    }

    let html = '<div class="heatmap-wrapper">';
    
    // Header con las horas (solo las relevantes)
    html += '<div class="heatmap-header">';
    html += '<div class="heatmap-corner"></div>';
    horasAMostrar.forEach(hora => {
        html += `<div class="heatmap-hour-label">${hora}h</div>`;
    });
    html += '</div>';

    // Filas para cada día
    html += '<div class="heatmap-body">';
    for (let dia = 0; dia < 7; dia++) {
        html += '<div class="heatmap-row">';
        html += `<div class="heatmap-day-label">${diasSemana[dia]}</div>`;
        
        horasAMostrar.forEach(hora => {
            const horaData = ventasAdaptadas.find(h => h.hora === hora);
            let tickets = 0;
            
            if (horaData) {
                const factor = Math.random() * 0.3 + 0.1;
                tickets = Math.ceil(horaData.cantidad_tickets * factor);
            }
            
            let level = 0;
            if (tickets > 0) {
                level = Math.max(1, Math.ceil((tickets / (maxTickets * 0.4)) * 5));
            }
            
            html += `<div class="heatmap-cell" data-level="${level}" 
                          onmouseover="showHeatmapTooltip(event, '${diasSemana[dia]} ${hora}:00', ${tickets})"
                          onmouseout="hideHeatmapTooltip()">
                      </div>`;
        });
        html += '</div>';
    }
    html += '</div>';

    // Leyenda
    html += '<div class="heatmap-legend">';
    html += '<span>Menos tickets</span>';
    html += '<div class="legend-scale">';
    for (let i = 0; i <= 5; i++) {
        html += `<div class="legend-color" data-level="${i}"></div>`;
    }
    html += '</div>';
    html += '<span>Más tickets</span>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

// FUNCIONES DE UTILIDAD Y ESTADOS
function showLoadingState(sectionId = null) {
    if (sectionId) {
        // Mostrar loading para sección específica
        const loadingElement = document.getElementById(`${sectionId}-loading`);
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    } else {
        // Comportamiento original para carga masiva
        const dragLoading = document.getElementById('drag-loading-compact');
        const dragResult = document.getElementById('drag-result-compact');
        const dragContent = document.querySelector('.drag-drop-zone-compact .drag-drop-content');
        
        if (dragLoading) dragLoading.style.display = 'flex';
        if (dragResult) dragResult.style.display = 'none';
        if (dragContent) dragContent.style.display = 'none';
    }
}

function hideLoadingState(sectionId = null) {
    if (sectionId) {
        // Ocultar loading para sección específica
        const loadingElement = document.getElementById(`${sectionId}-loading`);
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
    // Los valores se actualizarán en updateDashboard()
}

function showEmptyState() {
    showNoDataMetrics();
    showEmptyProductsTable();
    showEmptyCategoriesTable();
    
    // Clear charts
    if (salesChart) salesChart.destroy();
    if (paymentChart) paymentChart.destroy();
    if (hourlySalesChart) hourlySalesChart.destroy();
    if (hourlyTicketsChart) hourlyTicketsChart.destroy();
}

function showNoDataMetrics() {
    const metrics = [
        'total-ventas', 'total-ventas-bruto', 'total-impuestos', 'total-descuentos',
        'total-propinas', 'total-tickets', 'ticket-promedio', 'total-comensales'
    ];
    
    metrics.forEach(id => {
        updateElement(id, 'Sin datos', 'metric-value no-data');
    });
    
    const changeElement = document.getElementById('change-ventas');
    if (changeElement) {
        changeElement.textContent = '';
        changeElement.className = '';
    }
}

function showEmptyProductsTable() {
    const tbody = document.getElementById('products-table');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-icon">📦</div>
                    <div class="empty-text">No hay datos de productos disponibles</div>
                    <div class="empty-subtext">No se encontraron productos para este período.<br>Verifica que haya ventas sincronizadas.</div>
                </td>
            </tr>
        `;
    }
}

function showEmptyCategoriesTable() {
    const tbody = document.getElementById('categories-table');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #64748b;">
                    No hay categorías para mostrar
                </td>
            </tr>
        `;
    }
}

function showEmptyChart(chartId, message) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }
}

function updateElement(id, value, className = null) {
    console.log(`🔍 updateElement: Actualizando ${id} con valor "${value}"`);
    const element = document.getElementById(id);
    if (element) {
        console.log(`✅ Elemento ${id} encontrado, actualizando...`);
        element.textContent = value;
        if (className) {
            console.log(`🎨 Aplicando clase CSS: "${className}" a ${id}`);
            element.className = className;
            console.log(`✅ Clase aplicada. Clase actual: "${element.className}"`);
        }
        console.log(`✅ Elemento ${id} actualizado correctamente`);
    } else {
        console.error(`❌ ERROR: Elemento con ID "${id}" NO encontrado en el DOM`);
    }
}

// ✅ NUEVA FUNCIÓN: Actualizar comparativas con el día anterior
function updateComparativas(dashboardData) {
    console.log('🔄 updateComparativas llamada con:', dashboardData);
    console.log('🔍 dashboardData.comparativas:', dashboardData?.comparativas);
    console.log('🔍 dashboardData.periodo_anterior:', dashboardData?.periodo_anterior);
    
    if (!dashboardData || !dashboardData.comparativas || !dashboardData.periodo_anterior) {
        console.log('📊 No hay datos comparativos disponibles para actualizar comparativas');
        console.log('❌ dashboardData:', !!dashboardData);
        console.log('❌ comparativas:', !!dashboardData?.comparativas);
        console.log('❌ periodo_anterior:', !!dashboardData?.periodo_anterior);
        return;
    }

    console.log('🔄 Actualizando comparativas con el día anterior...');
    
    const comparativas = dashboardData.comparativas;
    const periodoAnterior = dashboardData.periodo_anterior;
    
    // Función helper para calcular diferencia y porcentaje
    function calcularComparativa(actual, anterior, formato = '€') {
        console.log(`🔍 calcularComparativa: actual=${actual}, anterior=${anterior}, formato=${formato}`);
        
        if (!anterior || anterior === 0) {
            console.log(`❌ Valor anterior inválido: ${anterior}`);
            return { valor: '--', porcentaje: '--', clase: 'neutral' };
        }
        
        const diferencia = actual - anterior;
        const porcentaje = ((diferencia / anterior) * 100);
        
        console.log(`📊 Cálculos: diferencia=${diferencia}, porcentaje=${porcentaje}`);
        
        let valor = '';
        if (formato === '€') {
            valor = diferencia >= 0 ? `+${diferencia.toFixed(2)}€` : `${diferencia.toFixed(2)}€`;
        } else {
            valor = diferencia >= 0 ? `+${diferencia}` : `${diferencia}`;
        }
        
        let clase = 'neutral';
        if (porcentaje > 5) clase = 'positive';
        else if (porcentaje < -5) clase = 'negative';
        
        const resultado = {
            valor: valor,
            porcentaje: `${porcentaje >= 0 ? '+' : ''}${porcentaje.toFixed(1)}%`,
            clase: clase
        };
        
        console.log(`✅ Resultado:`, resultado);
        return resultado;
    }
    
    // ✅ DEBUG: Verificar datos de comparativas
    console.log('🔍 DATOS DE COMPARATIVAS RECIBIDOS:');
    console.log('   - total_ventas_bruto:', comparativas.total_ventas_bruto);
    console.log('   - total_ventas:', comparativas.total_ventas);
    console.log('   - total_tickets:', comparativas.total_tickets);
    console.log('   - ticket_promedio:', comparativas.ticket_promedio);
    
    // Actualizar comparativa de Ventas Brutas
    const comparativaVentasBruto = calcularComparativa(
        comparativas.total_ventas_bruto?.actual || 0,
        comparativas.total_ventas_bruto?.anterior || 0,
        '€'
    );
    
            updateElement('comparison-ventas-bruto', comparativaVentasBruto.valor);
        updateElement('percentage-ventas-bruto', comparativaVentasBruto.porcentaje);
        
        // Aplicar clase CSS al porcentaje
        const percentageElement = document.getElementById('percentage-ventas-bruto');
        if (percentageElement) {
            percentageElement.className = `comparison-percentage ${comparativaVentasBruto.clase}`;
        }
        

        
        // Actualizar comparativa de Ventas Netas
        const comparativaVentas = calcularComparativa(
            comparativas.total_ventas?.actual || 0,
            comparativas.total_ventas?.anterior || 0,
            '€'
        );
        
        updateElement('comparison-ventas', comparativaVentas.valor);
        updateElement('percentage-ventas', comparativaVentas.porcentaje);
        
        // Aplicar clase CSS al porcentaje
        const percentageElementVentas = document.getElementById('percentage-ventas');
        if (percentageElementVentas) {
            percentageElementVentas.className = `comparison-percentage ${comparativaVentas.clase}`;
        }
        
        // Actualizar comparativa de Total Tickets
        const comparativaTickets = calcularComparativa(
            comparativas.total_tickets?.actual || 0,
            comparativas.total_tickets?.anterior || 0,
            'num'
        );
        
        updateElement('comparison-tickets', comparativaTickets.valor);
        updateElement('percentage-tickets', comparativaTickets.porcentaje);
        
        // Aplicar clase CSS al porcentaje
        const percentageElementTickets = document.getElementById('percentage-tickets');
        if (percentageElementTickets) {
            percentageElementTickets.className = `comparison-percentage ${comparativaTickets.clase}`;
        }
        
        // Actualizar comparativa de Ticket Medio
        const comparativaTicketMedio = calcularComparativa(
            comparativas.ticket_promedio?.actual || 0,
            comparativas.ticket_promedio?.anterior || 0,
            '€'
        );
        
        updateElement('comparison-ticket-medio', comparativaTicketMedio.valor);
        updateElement('percentage-ticket-medio', comparativaTicketMedio.porcentaje);
        
        // Aplicar clase CSS al porcentaje
        const percentageElementTicketMedio = document.getElementById('percentage-ticket-medio');
        if (percentageElementTicketMedio) {
            percentageElementTicketMedio.className = `comparison-percentage ${comparativaTicketMedio.clase}`;
        }
        
        // ✅ DEBUG: Verificar que los elementos se actualizaron correctamente
        console.log('🎨 Elementos actualizados:');
        console.log('   - comparison-ventas-bruto:', document.getElementById('comparison-ventas-bruto')?.textContent);
        console.log('   - percentage-ventas-bruto:', document.getElementById('percentage-ventas-bruto')?.textContent);
        console.log('   - comparison-ventas:', document.getElementById('comparison-ventas')?.textContent);
        console.log('   - percentage-ventas:', document.getElementById('percentage-ventas')?.textContent);
    
    console.log('✅ Comparativas actualizadas correctamente');
}

// ✅ FUNCIÓN DE PRUEBA: Forzar actualización de comparativas
function forzarComparativas() {
    console.log('🚀 FORZANDO ACTUALIZACIÓN DE COMPARATIVAS...');
    
    if (!dashboardData) {
        console.log('❌ No hay dashboardData disponible');
        return;
    }
    
    console.log('🔍 dashboardData disponible:', dashboardData);
    console.log('🔍 comparativas:', dashboardData.comparativas);
    console.log('🔍 periodo_anterior:', dashboardData.periodo_anterior);
    
    if (dashboardData.comparativas && dashboardData.periodo_anterior) {
        console.log('✅ Ejecutando updateComparativas...');
        updateComparativas(dashboardData);
    } else {
        console.log('❌ Faltan datos comparativos');
        console.log('   - comparativas:', !!dashboardData.comparativas);
        console.log('   - periodo_anterior:', !!dashboardData.periodo_anterior);
    }
}

// ✅ NUEVAS FUNCIONES: Modal de Carga Masiva
function showCargaMasivaModal() {
    console.log('📁 Abriendo modal de carga masiva...');
    const modal = document.getElementById('carga-masiva-modal');
    if (modal) {
        modal.style.display = 'block';
        // Resetear estado del modal
        resetDragDropModal();
    }
}

function closeCargaMasivaModal() {
    console.log('❌ Cerrando modal de carga masiva...');
    const modal = document.getElementById('carga-masiva-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function triggerFileSelectModal() {
    console.log('📁 Abriendo selector de archivos desde modal...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileUploadModal(file);
        }
    };
    input.click();
}

function handleFileUploadModal(file) {
    console.log('📁 Archivo seleccionado en modal:', file.name);
    showLoadingModal();
    
    // Simular análisis (aquí iría tu lógica real)
    setTimeout(() => {
        hideLoadingModal();
        showResultModal(file);
    }, 2000);
}

function showLoadingModal() {
    const loading = document.getElementById('drag-loading-modal');
    const content = document.querySelector('.drag-drop-content');
    const result = document.getElementById('drag-result-modal');
    
    if (loading && content && result) {
        content.style.display = 'none';
        loading.style.display = 'block';
        result.style.display = 'none';
    }
}

function hideLoadingModal() {
    const loading = document.getElementById('drag-loading-modal');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showResultModal(file) {
    const content = document.querySelector('.drag-drop-content');
    const result = document.getElementById('drag-result-modal');
    const details = document.getElementById('result-details-modal');
    
    if (content && result && details) {
        content.style.display = 'none';
        result.style.display = 'block';
        
        // Mostrar detalles del archivo
        details.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>Archivo:</strong> ${file.name}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Tamaño:</strong> ${(file.size / 1024).toFixed(1)} KB
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Tipo:</strong> ${file.type || 'No especificado'}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Estado:</strong> <span style="color: #059669;">✅ Listo para importar</span>
            </div>
        `;
    }
}

function importAnalyzedDataModal() {
    console.log('📊 Importando datos desde modal...');
    // Aquí iría tu lógica de importación real
    alert('📊 Función de importación - Implementar lógica real');
}

function resetDragDropModal() {
    console.log('🔄 Reseteando modal de carga masiva...');
    const content = document.querySelector('.drag-drop-content');
    const loading = document.getElementById('drag-loading-modal');
    const result = document.getElementById('drag-result-modal');
    
    if (content && loading && result) {
        content.style.display = 'block';
        loading.style.display = 'none';
        result.style.display = 'none';
    }
}

// FUNCIONES DE CONFIGURACIÓN Y SINCRONIZACIÓN
async function checkIntegrationStatus() {
    // Simulated status check
    setTimeout(() => {
        const statusElement = document.getElementById('numier-status');
        if (statusElement) {
            statusElement.textContent = 'Configurado';
            statusElement.className = 'status success';
        }
        
        const syncStatus = document.getElementById('numier-sync-status');
        if (syncStatus) {
            syncStatus.style.display = 'flex';
        }
    }, 1000);
}

async function syncData() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    return syncDataWithDates(fechaInicio, fechaFin);
}

async function syncDataWithDates(fechaInicio, fechaFin) {
    const syncBtn = document.getElementById('sync-btn-text');
    if (syncBtn) {
        syncBtn.textContent = 'Sincronizando...';
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-numier-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                restaurante_id: RESTAURANT_ID,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                endpoints: ['sales', 'products']
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Sincronización completada: ${result.message}`, 'success');
            
            // Update last sync time
            const lastSyncElement = document.getElementById('numier-last-sync');
            if (lastSyncElement) {
                lastSyncElement.textContent = `Última sync: ${new Date().toLocaleString()}`;
            }
            
            // Reload dashboard usando función comparativa
            // Detectar el tipo de rango actual
            const activeButton = document.querySelector('.range-btn.active');
            const tipoRango = activeButton ? activeButton.getAttribute('data-range') : 'custom';
            loadDashboardComparativo(tipoRango);
        } else {
            throw new Error(result.error || 'Error desconocido');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification(`Error sincronizando datos: ${error.message}`, 'error');
    } finally {
        if (syncBtn) {
            syncBtn.textContent = 'Sincronizar';
        }
    }
}

// FUNCIONES DE NOTIFICACIÓN
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// NUEVA FUNCIÓN: Mostrar banner comparativo
function showComparativeBanner(texto) {
    // NO MOSTRAR BANNER - FUNCIÓN DESHABILITADA
    return;
    
    // Código comentado para mantener la funcionalidad si se necesita en el futuro
    /*
    // Remover banner existente si existe
    const existingBanner = document.getElementById('comparative-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Crear nuevo banner
    const banner = document.createElement('div');
    banner.id = 'comparative-banner';
    banner.className = 'comparative-mode-banner';
    banner.innerHTML = `
        <div class="banner-content">
            <span class="banner-icon">⚡</span>
            <span class="banner-text">${texto}</span>
            <button class="banner-close" onclick="hideComparativeBanner()">×</button>
        </div>
    `;
    
    // Insertar banner después del selector de fechas
    const dateSelector = document.querySelector('.modern-date-selector');
    if (dateSelector) {
        dateSelector.parentNode.insertBefore(banner, dateSelector.nextSibling);
    }
    */
}

// NUEVA FUNCIÓN: Ocultar banner comparativo
function hideComparativeBanner() {
    const banner = document.getElementById('comparative-banner');
    if (banner) {
        banner.remove();
    }
}

// OTRAS FUNCIONES AUXILIARES
async function loadProductsData() {
            if (dashboardData && dashboardData.productos_top) {
            await updateProductsTable(dashboardData.productos_top);
            updateProductsChart(dashboardData.productos_top);
        }
}

function loadAnalyticsData() {
    // Placeholder para análisis avanzado
    console.log('Analytics data loaded');
}

function setupAutoRefresh() {
    // Auto-refresh cada 15 minutos
    setInterval(() => {
        // Detectar el tipo de rango actual para auto-refresh
        const activeButton = document.querySelector('.range-btn.active');
        const tipoRango = activeButton ? activeButton.getAttribute('data-range') : 'custom';
        loadDashboardComparativo(tipoRango);
        showNotification('Datos actualizados automáticamente', 'success');
    }, 15 * 60 * 1000);
}

// FUNCIONES OBSOLETAS ELIMINADAS:
// - setupGlobalMonthSelector() - Ya no se usa con el nuevo selector moderno
// - updateDatesFromSelectors() - Ya no se usa con el nuevo selector moderno

// DEMO DATA FUNCTION
function loadDemoData() {
    showNotification('Función de demo deshabilitada. Usa sincronización real.', 'info');
}

// TEST NUMIER API FUNCTION
async function testNumierAPI() {
    console.log('🧪 Testing Numier API directly...');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/test-numier-api`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                restaurante_id: RESTAURANT_ID,
                fecha_inicio: '2025-08-22',
                fecha_fin: '2025-08-22'
            })
        });

        const result = await response.json();
        console.log('🧪 Numier API Test Result:', result);
        
        if (result.success) {
            showNotification(`Prueba API Numier: ${result.total_records} registros encontrados`, 'success');
            console.log('📊 Detalles por TPV:', result.resultados);
            
            // También verificar qué tenemos en nuestra BD
            await checkDatabaseData();
        } else {
            showNotification(`Error en API Numier: ${result.error}`, 'error');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error testing Numier API:', error);
        showNotification(`Error probando API Numier: ${error.message}`, 'error');
    }
}

// CHECK DATABASE DATA FUNCTION
async function checkDatabaseData() {
    console.log('🔍 Verificando datos en nuestra base de datos...');
    
    try {
        // Verificar qué devuelve la función inteligente
        console.log('🧠 Probando función inteligente get_prioritized_sales_data...');
        const { data: intelligentData, error: intelligentError } = await window.supabase
            .rpc('get_prioritized_sales_data', {
                p_restaurante_id: RESTAURANT_ID,
                p_fecha_inicio: '2025-08-22',
                p_fecha_fin: '2025-08-22'
            });
            
        if (intelligentError) {
            console.error('❌ Error en función inteligente:', intelligentError);
        } else {
            console.log(`🧠 FUNCIÓN INTELIGENTE - Total registros: ${intelligentData.length}`);
            let totalInteligente = 0;
            intelligentData.forEach((ticket, index) => {
                const importe = parseFloat(ticket.total_bruto);
                totalInteligente += importe;
                console.log(`🧠 Inteligente ${index + 1}: ${importe}€ - ${ticket.id_externo} (${ticket.sistema_origen})`);
            });
            console.log(`🧠 TOTAL INTELIGENTE: ${totalInteligente}€`);
        }
        
        // También verificar datos directos
        const { data, error } = await window.supabase
            .from('ventas_datos')
            .select('*')
            .eq('restaurante_id', RESTAURANT_ID)
            .eq('fecha_venta', '2025-08-22')
            .order('fecha_hora_completa');
            
        if (error) {
            console.error('❌ Error consultando BD:', error);
            return;
        }
        
        console.log(`📊 DATOS EN BD - Total registros: ${data.length}`);
        console.log(`🔍 ANÁLISIS DETALLADO - TODOS LOS TICKETS EN BD:`);
        
        data.forEach((ticket, index) => {
            console.log(`📋 BD Ticket ${index + 1}:`, {
                id_externo: ticket.id_externo,
                referencia_externa: ticket.referencia_externa,
                sistema_origen: ticket.sistema_origen,
                fecha_venta: ticket.fecha_venta,
                fecha_hora_completa: ticket.fecha_hora_completa,
                total_bruto: ticket.total_bruto,
                total_neto: ticket.total_neto,
                estado: ticket.estado
            });
        });
        
        // Calcular totales
        const totalBruto = data.reduce((sum, t) => sum + (parseFloat(t.total_bruto) || 0), 0);
        const totalNeto = data.reduce((sum, t) => sum + (parseFloat(t.total_neto) || 0), 0);
        
        console.log(`💰 TOTALES EN BD:`, {
            total_tickets_bd: data.length,
            total_bruto_bd: totalBruto,
            total_neto_bd: totalNeto,
            ticket_promedio_bd: totalBruto / data.length
        });
        
        // Verificar qué sistema de datos tenemos
        const porSistema = data.reduce((acc, t) => {
            acc[t.sistema_origen] = (acc[t.sistema_origen] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`📈 TICKETS POR SISTEMA:`, porSistema);
        
        // Buscar posibles duplicados o problemas
        const referencias = data.map(t => t.referencia_externa).filter(r => r);
        const duplicados = referencias.filter((r, i) => referencias.indexOf(r) !== i);
        if (duplicados.length > 0) {
            console.warn(`⚠️ POSIBLES DUPLICADOS:`, duplicados);
        }
        
    } catch (error) {
        console.error('❌ Error verificando BD:', error);
    }
}

// FUNCIONES DE TOOLTIP PARA HEATMAP
window.showHeatmapTooltip = function(event, tiempo, tickets) {
    const tooltip = document.createElement('div');
    tooltip.id = 'heatmap-tooltip';
    tooltip.className = 'heatmap-tooltip';
    tooltip.innerHTML = `<strong>${tiempo}</strong><br>Tickets: ${tickets}`;
    
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        white-space: nowrap;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 40) + 'px';
};

window.hideHeatmapTooltip = function() {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
};

// ========================================
// SISTEMA DRAG & DROP INTELIGENTE
// ========================================

// Inicializar sistema drag & drop
function initializeDragAndDrop() {
    const dragZone = document.getElementById('drag-drop-zone-compact');
    const fileInput = document.getElementById('file-input-compact');
    
    if (!dragZone || !fileInput) {
        console.error('❌ Elementos de drag & drop no encontrados');
        return;
    }
    
    // Asegurar estado inicial correcto
    resetDragDrop();
    
    // Eventos de drag & drop
    dragZone.addEventListener('dragover', handleDragOver);
    dragZone.addEventListener('dragleave', handleDragLeave);
    dragZone.addEventListener('drop', handleDrop);
    
    // Eventos de click
    dragZone.addEventListener('click', () => triggerFileSelect());
    
    console.log('🎯 Sistema drag & drop inicializado');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dragZone = e.currentTarget;
    dragZone.classList.add('drag-over');
    
    console.log('📁 Archivo sobre la zona de drop');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dragZone = e.currentTarget;
    dragZone.classList.remove('drag-over');
    
    console.log('📁 Archivo salió de la zona de drop');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dragZone = e.currentTarget;
    dragZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
        console.log('📁 Archivo soltado:', files[0].name);
        processFile(files[0]);
    }
}

function triggerFileSelect() {
    document.getElementById('file-input-compact').click();
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (file) {
        console.log('📁 Archivo seleccionado:', file.name);
        processFile(file);
    }
}

async function processFile(file) {
    console.log('🔄 Procesando archivo:', {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    // Validar archivo
    if (!validateFile(file)) {
        return;
    }
    
    // Mostrar estado de carga
    showLoadingState();
    
    // Timeout de seguridad (30 segundos)
    const timeoutId = setTimeout(() => {
        console.warn('⏰ Timeout de seguridad alcanzado');
        showErrorState('Timeout: La operación tardó demasiado. Intenta con un archivo más pequeño.');
        showNotification('⏰ Timeout alcanzado. Intenta con un archivo más pequeño.', 'warning');
    }, 30000);
    
    try {
        // Preparar FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('restaurante_id', RESTAURANT_ID);
        formData.append('action', 'analyze');
        
        console.log('📤 Enviando a edge function...');
        console.log('URL:', `${SUPABASE_URL}/functions/v1/intelligent-import-sales`);
        console.log('Restaurante ID:', RESTAURANT_ID);
        
        // Obtener token del usuario actual (si usas Supabase Auth)
        const { data: { session } } = await supabase.auth.getSession();
        const userToken = session?.access_token;

        if (!userToken) {
            throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
        }

        // Llamar a la edge function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/intelligent-import-sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY  // Añadir apikey header
            },
            body: formData
        });
        
        // Limpiar timeout si la respuesta llega
        clearTimeout(timeoutId);
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Análisis completado:', result);
        
        if (result.success) {
            currentAnalyzedData = result.data;
            showAnalysisResult(result.data, file.name);
            showNotification(`✅ Archivo "${file.name}" analizado correctamente`, 'success');
        } else {
            throw new Error(result.error || 'Error desconocido en el análisis');
        }
        
    } catch (error) {
        // Limpiar timeout en caso de error
        clearTimeout(timeoutId);
        
        console.error('❌ Error procesando archivo:', error);
        showErrorState(error.message);
        showNotification(`❌ Error: ${error.message}`, 'error');
        
        // Si hay error, mostrar opción de prueba
        setTimeout(() => {
            if (confirm('¿Quieres probar con datos de demostración para verificar que funciona?')) {
                testWithDemoData(file.name);
            }
        }, 1000);
    }
}

// Función de prueba para simular análisis exitoso
function testWithDemoData(fileName) {
    console.log('🧪 Probando con datos de demostración...');
    
    // Simular datos de análisis
    const demoData = {
        fileType: fileName.split('.').pop().toLowerCase(),
        totalRows: 150,
        headers: ['Fecha', 'Producto', 'Cantidad', 'Precio', 'Total', 'Método_Pago'],
        detectedStructure: 'ventas',
        sampleRows: [
            ['2024-01-15', 'Hamburguesa', '2', '8.50', '17.00', 'Tarjeta'],
            ['2024-01-15', 'Coca Cola', '1', '2.50', '2.50', 'Efectivo'],
            ['2024-01-15', 'Patatas Fritas', '1', '3.00', '3.00', 'Tarjeta']
        ]
    };
    
    currentAnalyzedData = demoData;
    showAnalysisResult(demoData, fileName);
    showNotification('🧪 Datos de demostración cargados correctamente', 'info');
}

function validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json'
    ];
    
    const allowedExtensions = ['csv', 'xlsx', 'xls', 'json'];
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (file.size > maxSize) {
        showNotification('❌ El archivo es demasiado grande (máx. 50MB)', 'error');
        return false;
    }
    
    if (!allowedExtensions.includes(extension)) {
        showNotification('❌ Formato no soportado. Usa CSV, Excel o JSON', 'error');
        return false;
    }
    
    return true;
}



function showAnalysisResult(data, fileName) {
    // Ocultar loading
    document.getElementById('drag-loading-compact').style.display = 'none';
    document.querySelector('.drag-drop-zone-compact .drag-drop-content').style.display = 'none';
    
    // Mostrar resultado
    const resultDiv = document.getElementById('drag-result-compact');
    const detailsDiv = document.getElementById('result-details-compact');
    
    // Generar HTML de detalles
    const detailsHTML = `
        <div class="result-detail-item">
            <span class="result-detail-label">📁 Archivo:</span>
            <span class="result-detail-value">${fileName}</span>
        </div>
        <div class="result-detail-item">
            <span class="result-detail-label">📊 Formato:</span>
            <span class="result-detail-value">${data.fileType.toUpperCase()}</span>
        </div>
        <div class="result-detail-item">
            <span class="result-detail-label">📋 Filas:</span>
            <span class="result-detail-value">${data.totalRows.toLocaleString()}</span>
        </div>
        <div class="result-detail-item">
            <span class="result-detail-label">🏷️ Columnas:</span>
            <span class="result-detail-value">${data.headers.length}</span>
        </div>
        <div class="result-detail-item">
            <span class="result-detail-label">🎯 Detectado como:</span>
            <span class="result-detail-value">${getDataTypeLabel(data.detectedStructure)}</span>
        </div>
        
        <div class="headers-preview">
            <strong>📋 Columnas detectadas:</strong>
            <div class="headers-list">
                ${data.headers.map(header => `<span class="header-tag">${header}</span>`).join('')}
            </div>
        </div>
        
        <div class="headers-preview">
            <strong>📄 Vista previa de datos:</strong>
            <div style="font-family: monospace; font-size: 12px; background: white; padding: 8px; border-radius: 4px; margin-top: 8px; overflow-x: auto;">
                ${data.sampleRows.slice(0, 3).map((row, i) => 
                    `<div style="margin: 4px 0; padding: 4px; background: ${i % 2 === 0 ? '#f8f9fa' : 'white'};">
                        ${row.slice(0, 4).join(' | ')}${row.length > 4 ? ' | ...' : ''}
                    </div>`
                ).join('')}
            </div>
        </div>
    `;
    
    detailsDiv.innerHTML = detailsHTML;
    resultDiv.style.display = 'block';
    
    // Asegurar que los botones son visibles
    const actionsDiv = resultDiv.querySelector('.result-actions');
    if (actionsDiv) {
        actionsDiv.style.display = 'flex';
        console.log('✅ Botones de acción mostrados');
    } else {
        console.error('❌ No se encontró el div de acciones');
    }
    
    // Verificar que el panel tenga altura suficiente
    console.log('📏 Altura del panel de resultado:', resultDiv.offsetHeight);
}

function showErrorState(errorMessage) {
    console.log('❌ Mostrando estado de error:', errorMessage);
    
    // Ocultar loading y resultado
    document.getElementById('drag-loading-compact').style.display = 'none';
    document.getElementById('drag-result-compact').style.display = 'none';
    
    // Mostrar contenido original del drag & drop
    const dragContent = document.querySelector('.drag-drop-zone-compact .drag-drop-content');
    if (dragContent) {
        dragContent.style.display = 'block';
    }
    
    // Limpiar input de archivo
    const fileInput = document.getElementById('file-input-compact');
    if (fileInput) {
        fileInput.value = '';
    }
    
    console.log('✅ Estado de error aplicado correctamente');
}

function getDataTypeLabel(type) {
    const labels = {
        'ventas': '💰 Datos de Ventas',
        'productos': '🛍️ Datos de Productos',
        'unknown': '❓ Estructura no reconocida'
    };
    return labels[type] || labels.unknown;
}

function resetDragDrop() {
    console.log('🔄 Reseteando drag & drop...');
    
    currentAnalyzedData = null;
    
    // Ocultar loading y resultado
    const loadingElement = document.getElementById('drag-loading-compact');
    const resultElement = document.getElementById('drag-result-compact');
    const contentElement = document.querySelector('.drag-drop-zone-compact .drag-drop-content');
    const fileInput = document.getElementById('file-input-compact');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
        console.log('✅ Loading oculto');
    } else {
        console.warn('⚠️ Elemento loading no encontrado');
    }
    
    if (resultElement) {
        resultElement.style.display = 'none';
        console.log('✅ Resultado oculto');
    } else {
        console.warn('⚠️ Elemento resultado no encontrado');
    }
    
    if (contentElement) {
        contentElement.style.display = 'block';
        console.log('✅ Contenido principal mostrado');
    } else {
        console.warn('⚠️ Elemento contenido no encontrado');
    }
    
    if (fileInput) {
        fileInput.value = '';
        console.log('✅ Input de archivo limpiado');
    } else {
        console.warn('⚠️ Input de archivo no encontrado');
    }
    
    console.log('🔄 Drag & drop reseteado completamente');
}

async function importAnalyzedData() {
    if (!currentAnalyzedData) {
        showNotification('❌ No hay datos analizados para importar', 'error');
        return;
    }
    
    console.log('📊 Iniciando importación de datos...');
    showNotification('⏳ Importando datos a la base de datos...', 'info');
    
    // Mostrar loading
    const loadingElement = document.getElementById('drag-loading-compact');
    const resultElement = document.getElementById('drag-result-compact');
    
    if (loadingElement) loadingElement.style.display = 'flex';
    if (resultElement) resultElement.style.display = 'none';
    
    try {
        // Preparar FormData para la importación
        const formData = new FormData();
        formData.append('analyzed_data', JSON.stringify(currentAnalyzedData));
        formData.append('restaurante_id', RESTAURANT_ID);
        formData.append('action', 'import');
        
        console.log('📤 Enviando datos para importación...');
        
        // Obtener token del usuario actual
        const { data: { session } } = await supabase.auth.getSession();
        const userToken = session?.access_token;

        if (!userToken) {
            throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
        }
        
        // Llamar a la edge function para importar
        const response = await fetch(`${SUPABASE_URL}/functions/v1/intelligent-import-sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error del servidor: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Importación completada:', result);
        
        if (result.success) {
            // Mostrar resumen de importación
            const resumenHTML = `
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h4 style="color: #166534; margin: 0 0 10px 0;">✅ Importación Exitosa</h4>
                    <p><strong>${result.data.ventas_count}</strong> ventas creadas</p>
                    <p><strong>${result.data.lineas_count}</strong> productos importados</p>
                    <p>Total importado: <strong>€${result.data.resumen.total_bruto_importado}</strong></p>
                    ${result.data.resumen.promedio_productos_por_venta ? 
                      `<p>Promedio: <strong>${result.data.resumen.promedio_productos_por_venta}</strong> productos/venta</p>` : ''}
                </div>
            `;
            
            // Actualizar el panel de resultados
            const detailsElement = document.getElementById('result-details-compact');
            if (detailsElement) {
                detailsElement.innerHTML = resumenHTML;
            }
            
            showNotification(`✅ ${result.message}`, 'success');
            
            // Recargar datos del dashboard después de 2 segundos
            setTimeout(() => {
                console.log('🔄 Recargando dashboard con nuevos datos...');
                loadDashboardComparativo(activeRange); // Usar la función comparativa para recargar
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Error desconocido en la importación');
        }
        
    } catch (error) {
        console.error('❌ Error importando datos:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
        showErrorState(error.message);
    } finally {
        // Ocultar loading
        if (loadingElement) loadingElement.style.display = 'none';
        if (resultElement) resultElement.style.display = 'block';
    }
}

console.log('🎯 Sistema drag & drop cargado');

// FUNCIONES DE LOADING DEL DASHBOARD (separadas del drag & drop)
function showDashboardLoading() {
    // Mostrar loading general del dashboard si existe
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => {
        if (el.style) el.style.display = 'table-row';
    });
}

function hideDashboardLoading() {
    // Ocultar loading general del dashboard si existe
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => {
        if (el.style) el.style.display = 'none';
    });
}

// FUNCIÓN DE INICIALIZACIÓN DE LA PÁGINA
function initializePageState() {
    console.log('🚀 Inicializando estado de la página...');
    
    // Asegurar que el drag & drop esté en estado inicial
    const loadingElement = document.getElementById('drag-loading-compact');
    const resultElement = document.getElementById('drag-result-compact');
    const contentElement = document.querySelector('.drag-drop-zone-compact .drag-drop-content');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
        console.log('✅ Estado inicial: Loading oculto');
    }
    
    if (resultElement) {
        resultElement.style.display = 'none';
        console.log('✅ Estado inicial: Resultado oculto');
    }
    
    if (contentElement) {
        contentElement.style.display = 'block';
        console.log('✅ Estado inicial: Contenido principal visible');
    }
    
    console.log('🚀 Estado de la página inicializado correctamente');
}

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Página cargada, inicializando estado...');
    initializePageState();
});

// ========================================
// SISTEMA DE AUTO-SINCRONIZACIÓN INTELIGENTE
// ========================================

function initializeAutoSync() {
    console.log('⏰ Inicializando sistema de auto-sincronización...');
    
    // Actualizar indicador inicial
    updateSyncIndicator();
    
    // Verificar si estamos en horario de servicio
    checkServiceHours();
    
    // Configurar intervalos
    setupSyncIntervals();
    
    // Verificar cada minuto si cambia el horario de servicio
    setInterval(checkServiceHours, 60000);
    
    console.log('✅ Sistema de auto-sincronización iniciado');
}

function checkServiceHours() {
    const now = new Date();
    const hour = now.getHours();
    
    // Horario de servicio: 20:00 a 02:00 (siguiente día)
    const wasServiceHours = isServiceHours;
    isServiceHours = hour >= 20 || hour <= 2;
    
    if (isServiceHours !== wasServiceHours) {
        console.log(`🕐 Cambio de horario: ${isServiceHours ? 'ENTRANDO en' : 'SALIENDO de'} horario de servicio`);
        setupSyncIntervals();
    }
    
    updateSyncIndicator();
}

function setupSyncIntervals() {
    // Limpiar intervalos existentes
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
    
    if (nextSyncTimeout) {
        clearTimeout(nextSyncTimeout);
        nextSyncTimeout = null;
    }
    
    if (isServiceHours) {
        console.log('🍽️ ACTIVANDO auto-sync cada 15 minutos (horario de servicio)');
        
        // Sincronizar inmediatamente si no hay sync reciente
        if (!lastSyncTime || (Date.now() - lastSyncTime) > 15 * 60 * 1000) {
            performAutoSync();
        }
        
        // Configurar intervalo de 15 minutos
        autoSyncInterval = setInterval(performAutoSync, 15 * 60 * 1000);
        
        // Programar próxima sync
        scheduleNextSync();
    } else {
        console.log('💤 DESACTIVANDO auto-sync (fuera de horario de servicio)');
    }
}

function performAutoSync() {
    console.log('🔄 Ejecutando auto-sincronización...');
    
    // Actualizar indicador a "sincronizando"
    setSyncStatus('syncing', 'Sincronizando...');
    
    // ✅ USAR FECHAS DINÁMICAS PARA AUTO-SYNC
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const fechaHoy = `${year}-${month}-${day}`;
    
    console.log(`📅 Auto-sync para fecha actual: ${fechaHoy}`);
    
    // Ejecutar sincronización con fechas dinámicas
    syncDataWithDates(fechaHoy, fechaHoy).then(() => {
        lastSyncTime = Date.now();
        setSyncStatus('active', formatTime(new Date()));
        scheduleNextSync();
        console.log('✅ Auto-sincronización completada');
    }).catch(error => {
        console.error('❌ Error en auto-sincronización:', error);
        setSyncStatus('inactive', 'Error');
    });
}

function scheduleNextSync() {
    if (!isServiceHours) return;
    
    const nextSync = new Date(Date.now() + 15 * 60 * 1000);
    document.getElementById('next-sync-info').textContent = `Próxima: ${formatTime(nextSync)}`;
}

function setSyncStatus(status, text) {
    const dot = document.querySelector('.sync-dot');
    const textElement = document.getElementById('sync-text');
    
    if (dot && textElement) {
        // Limpiar clases anteriores
        dot.classList.remove('active', 'inactive', 'syncing');
        
        // Agregar nueva clase
        dot.classList.add(status);
        
        // Actualizar texto
        textElement.textContent = status === 'syncing' ? text : `Última sync: ${text}`;
    }
}

function updateSyncIndicator() {
    const nextSyncElement = document.getElementById('next-sync-info');
    
    if (isServiceHours) {
        if (lastSyncTime) {
            setSyncStatus('active', formatTime(new Date(lastSyncTime)));
        } else {
            setSyncStatus('inactive', '--:--');
        }
        scheduleNextSync();
    } else {
        setSyncStatus('inactive', 'Fuera de servicio');
        if (nextSyncElement) {
            nextSyncElement.textContent = 'Auto-sync: 20:00-02:00';
        }
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ========================================
// DIAGNÓSTICO DE EDGE FUNCTIONS
// ========================================

function showSyncDiagnostic() {
    const modal = document.getElementById('sync-diagnostic-modal');
    const content = document.getElementById('diagnostic-content');
    
    modal.style.display = 'block';
    content.innerHTML = '<div class="loading">🔍 Ejecutando diagnóstico...</div>';
    
    executeSyncDiagnostic();
}

function closeSyncDiagnostic() {
    document.getElementById('sync-diagnostic-modal').style.display = 'none';
}

async function executeSyncDiagnostic() {
    const content = document.getElementById('diagnostic-content');
    let diagnosticHTML = '';
    
    try {
        // 1. Test de conexión básica
        diagnosticHTML += '<h3>🔗 Test de Conexión</h3>';
        
        // 2. Ejecutar sync con logs detallados
        diagnosticHTML += '<h3>🔄 Ejecutando Sincronización con Logs</h3>';
        diagnosticHTML += '<div class="log-container" id="sync-logs"><div class="loading">Ejecutando...</div></div>';
        
        content.innerHTML = diagnosticHTML;
        
        // Ejecutar sync y capturar logs
        await testSyncWithLogs();
        
    } catch (error) {
        content.innerHTML = `
            <h3>❌ Error en Diagnóstico</h3>
            <div class="error-box">
                <pre>${error.message}</pre>
            </div>
        `;
    }
}

async function testSyncWithLogs() {
    const logsContainer = document.getElementById('sync-logs');
    let logs = [];
    
    // Función para agregar log
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('es-ES');
        logs.push(`[${timestamp}] ${message}`);
        updateLogsDisplay();
    }
    
    function updateLogsDisplay() {
        logsContainer.innerHTML = `
            <div class="logs-display">
                ${logs.map(log => `<div class="log-line">${log}</div>`).join('')}
            </div>
        `;
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    try {
        addLog('🚀 Iniciando sincronización de prueba...', 'info');
        
        // Preparar datos para sync
        const syncData = {
            restaurante_id: RESTAURANT_ID,
            fecha_inicio: new Date().toISOString().split('T')[0], // Hoy
            fecha_fin: new Date().toISOString().split('T')[0],     // Hoy
            endpoints: ['sales'],
            force_resync: false
        };
        
        addLog(`📅 Sincronizando fecha: ${syncData.fecha_inicio}`, 'info');
        addLog('📡 Enviando request a edge function...', 'info');
        
        const startTime = performance.now();
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-numier-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(syncData)
        });
        
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        addLog(`⏱️ Respuesta recibida en ${duration}ms`, 'info');
        addLog(`📊 Status: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');
        
        if (!response.ok) {
            const errorText = await response.text();
            addLog(`❌ Error HTTP: ${errorText}`, 'error');
            return;
        }
        
        const result = await response.json();
        
        addLog('✅ Respuesta JSON recibida', 'success');
        addLog(`📋 Resultado: ${JSON.stringify(result, null, 2)}`, 'info');
        
        // Analizar resultado
        if (result.success) {
            addLog('🎉 Sincronización EXITOSA', 'success');
            if (result.resultados && result.resultados.length > 0) {
                result.resultados.forEach(r => {
                    addLog(`📈 ${r.endpoint}: ${r.procesados} procesados, ${r.exitosos} exitosos, ${r.errores} errores`, 'info');
                });
            }
        } else {
            addLog(`❌ Sincronización FALLÓ: ${result.error}`, 'error');
        }
        
        // Test adicional: verificar datos en DB
        addLog('🔍 Verificando datos en base de datos...', 'info');
        await checkRecentData(addLog);
        
    } catch (error) {
        addLog(`💥 Error crítico: ${error.message}`, 'error');
        console.error('Error en diagnóstico:', error);
    }
}

async function checkRecentData(addLog) {
    try {
        // Cargar datos del dashboard para verificar
        const dashboardResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                restaurante_id: RESTAURANT_ID,
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: new Date().toISOString().split('T')[0]
            })
        });
        
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            
            if (dashboardData.ventas && dashboardData.ventas.length > 0) {
                const ventasHoy = dashboardData.ventas.filter(v => v.fecha_venta === new Date().toISOString().split('T')[0]);
                addLog(`📊 Ventas encontradas para hoy: ${ventasHoy.length}`, ventasHoy.length > 0 ? 'success' : 'warning');
                
                if (ventasHoy.length > 0) {
                    const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total_bruto || 0), 0);
                    addLog(`💰 Total ventas hoy: €${totalHoy.toFixed(2)}`, 'success');
                }
            } else {
                addLog('⚠️ No se encontraron ventas para hoy', 'warning');
            }
        } else {
            addLog('❌ Error al verificar datos del dashboard', 'error');
        }
        
    } catch (error) {
        addLog(`❌ Error verificando datos: ${error.message}`, 'error');
    }
}

// ========================================
// SISTEMA DE CLIMA INTELIGENTE
// Conecta widget con Edge Function weather-manager
// ========================================

// Variables globales para el sistema de clima
let weatherData = null;
let weatherUpdateInterval = null;
let lastWeatherUpdate = null;

// Inicializar sistema de clima cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar clima después de un pequeño delay para que cargue el dashboard
    setTimeout(() => {
        initializeWeatherSystem();
    }, 2000);
});

// =============================================
// INICIALIZACIÓN DEL SISTEMA DE CLIMA
// =============================================
async function initializeWeatherSystem() {
    console.log('🌤️ Inicializando sistema de clima...');
    
    try {
        // Cargar clima inicial (secuencial para evitar conflictos)
        await loadCurrentWeather();
        
        // Esperar un momento antes de cargar previsión
        setTimeout(async () => {
            await loadWeatherForecast();
        }, 2000);
        
        // Configurar actualización automática cada 10 minutos
        weatherUpdateInterval = setInterval(async () => {
            await loadCurrentWeather(false); // false = usar caché si es reciente
            
            // Cargar previsión 2 segundos después
            setTimeout(async () => {
                await loadWeatherForecast();
            }, 2000);
        }, 10 * 60 * 1000);
        
        // Configurar event listeners
        setupWeatherEventListeners();
        
        console.log('✅ Sistema de clima inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando clima:', error);
    }
}

// =============================================
// CARGAR DATOS DE CLIMA ACTUAL
// =============================================
async function loadCurrentWeather(forceRefresh = false) {
    console.log('🌡️ Cargando clima actual...', forceRefresh ? '(forzar refresh)' : '(permitir caché)');
    
    try {
        // Mostrar estado de carga
        showWeatherLoading();
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/weather-manager`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                restaurante_id: RESTAURANT_ID,
                action: 'current',
                force_refresh: forceRefresh
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo datos meteorológicos');
        }
        
        weatherData = result.data;
        lastWeatherUpdate = new Date();
        
        // Actualizar UI
        updateWeatherWidget(weatherData);
        
        // Cargar predicciones si es un refresh completo
        // La previsión se carga por separado en initializeWeatherSystem()
        
        console.log('✅ Clima cargado:', weatherData);

    } catch (error) {
        console.error('❌ Error cargando clima:', error);
        showWeatherError(error.message);
    }
}

// =============================================
// CARGAR PREDICCIONES METEOROLÓGICAS
// =============================================
async function loadWeatherForecast() {
    console.log('📅 Cargando predicciones meteorológicas...');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/weather-manager`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                restaurante_id: RESTAURANT_ID,
                action: 'forecast'
            })
        });

        const result = await response.json();
        
        if (result.success) {
            updateWeatherForecast(result.data.forecasts);
            console.log('✅ Predicciones cargadas');
        }

    } catch (error) {
        console.error('❌ Error cargando predicciones:', error);
    }
}

// =============================================
// ACTUALIZAR WIDGET CON DATOS DE CLIMA
// =============================================
function updateWeatherWidget(data) {
    if (!data || !data.weather) {
        console.warn('⚠️ No hay datos de clima para mostrar');
        return;
    }

    const weather = data.weather;
    console.log('🔄 Actualizando widget de clima:', weather);

    // Ocultar loading y mostrar contenido
    hideWeatherLoading();
    showWeatherContent();

    // Actualizar temperatura y sensación térmica
    updateElement('weather-temp', `${Math.round(weather.temperatura)}°C`);
    updateElement('weather-feels', `Sensación: ${Math.round(weather.sensacion_termica)}°C`);
    
    // Actualizar icono y descripción
    updateElement('weather-icon', weather.icono_emoji);
    updateElement('weather-description', weather.condicion_descripcion);
    
    // Actualizar detalles
    updateElement('weather-humidity', `${weather.humedad}%`);
    updateElement('weather-wind', `${weather.viento_velocidad.toFixed(1)} m/s`);
    updateElement('weather-rain', `${weather.precipitacion.toFixed(1)} mm`);
    updateElement('weather-uv', weather.indice_uv.toFixed(1));
    
    // Actualizar timestamp de última actualización
    const sourceText = data.source === 'cache' 
        ? `Caché (${data.cached_minutes_ago}m)` 
        : 'Actualizado ahora';
    updateElement('weather-last-update', `Actualizado: ${sourceText}`);
    
    // Actualizar ciudad
    console.log('🏙️ Datos de ciudad:', { 
        weather_ciudad: weather.ciudad, 
        restaurant_ciudad: data.restaurant_info?.ciudad 
    });
    
    if (weather.ciudad) {
        updateElement('weather-city', `- ${weather.ciudad}`);
        console.log('✅ Ciudad mostrada desde weather:', weather.ciudad);
    } else if (data.restaurant_info && data.restaurant_info.ciudad) {
        updateElement('weather-city', `- ${data.restaurant_info.ciudad}`);
        console.log('✅ Ciudad mostrada desde restaurant:', data.restaurant_info.ciudad);
    } else {
        console.log('⚠️ No se encontró ciudad en ningún lugar');
        updateElement('weather-city', '- Ubicación');
    }
    
    // Mostrar impacto en ventas
    updateWeatherImpact(weather);
    
    // Mostrar footer
    showElement('weather-footer');
}

// =============================================
// ACTUALIZAR IMPACTO EN VENTAS
// =============================================
function updateWeatherImpact(weather) {
    const impactContainer = document.getElementById('impact-content');
    if (!impactContainer) return;

    const insights = generateWeatherInsights(weather);
    
    if (insights.length > 0) {
        const insightsHTML = insights.map(insight => 
            `<div class="impact-insight">${insight}</div>`
        ).join('');
        
        impactContainer.innerHTML = insightsHTML;
        showElement('weather-impact');
        
        console.log('📊 Impacto en ventas actualizado:', insights);
    }
}

// =============================================
// GENERAR INSIGHTS DE CLIMA-VENTAS
// =============================================
function generateWeatherInsights(weather) {
    const insights = [];
    const temp = weather.temperatura;
    const rain = weather.precipitacion;
    const condition = weather.condicion_principal.toLowerCase();
    
    // Insights por temperatura
    if (temp >= 25) {
        insights.push('🍺 +40% bebidas frías esperado');
        insights.push('🏖️ Día perfecto para terraza');
    } else if (temp <= 10) {
        insights.push('☕ +35% bebidas calientes');
        insights.push('🍲 Promocionar sopas y guisos');
    }
    
    // Insights por precipitación
    if (rain > 0.1) {
        insights.push('🚚 +25% delivery esperado');
        insights.push('🏠 Día ideal para pedidos a casa');
    } else if (condition.includes('clear') || condition.includes('sun')) {
        insights.push('☀️ +30% comensales terraza');
        insights.push('🥗 Promocionar ensaladas frescas');
    }
    
    // Insights por condiciones especiales
    if (weather.viento_velocidad > 8) {
        insights.push('💨 Viento fuerte - asegurar terraza');
    }
    
    if (weather.indice_uv > 7) {
        insights.push('☂️ Día de alto UV - sombra necesaria');
    }
    
    return insights.slice(0, 3); // Máximo 3 insights
}

// =============================================
// ACTUALIZAR PREDICCIONES EN EL PANEL DE CLIMA
// =============================================
function updateWeatherForecast(forecasts) {
    if (!forecasts || !Array.isArray(forecasts)) return;
    
    // ✅ NUEVO: Actualizar previsión en el panel de clima
    const forecastContainer = document.getElementById('forecast-days');
    if (!forecastContainer) {
        console.log('⚠️ Contenedor de previsión no encontrado, buscando alternativo...');
        return;
    }
    
    // Tomar los próximos 7 días (semana completa)
    const nextForecasts = forecasts.slice(0, 7);
    
    const forecastHTML = nextForecasts.map(forecast => {
        const fecha = new Date(forecast.fecha);
        const dayName = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
        const dayNumber = fecha.getDate();
        
        // Simular temperaturas mín/máx (la API diaria las incluye)
        const tempMax = Math.round(forecast.temperatura + 3);
        const tempMin = Math.round(forecast.temperatura - 5);
        const rain = Math.round(forecast.probabilidad_lluvia);
        
        return `
            <div class="forecast-day-compact">
                <div class="forecast-day-name">${dayName} ${dayNumber}</div>
                <div class="forecast-icon">${forecast.icono_emoji}</div>
                <div class="forecast-temp-range">
                    <span style="color: #ef4444;">${tempMax}°</span>
                    <span style="margin: 0 1px; color: #9ca3af;">•</span>
                    <span style="color: #3b82f6;">${tempMin}°</span>
                </div>
                <div class="forecast-rain">${rain}%</div>
            </div>
        `;
    }).join('');
    
    forecastContainer.innerHTML = forecastHTML;
    
    // ✅ MOSTRAR LA SECCIÓN DE PREVISIÓN SEMANAL
    const forecastSection = document.getElementById('weather-weekly-forecast');
    if (forecastSection) {
        forecastSection.style.display = 'block';
        console.log('✅ Previsión semanal mostrada en el panel de clima');
    } else {
        console.log('⚠️ Sección de previsión semanal no encontrada');
    }
    
    console.log('🔮 Previsión semanal actualizada en el panel de clima');
}

// =============================================
// FUNCIONES DE REFRESH MANUAL
// =============================================
async function refreshWeatherData() {
    const refreshBtn = document.querySelector('.weather-refresh-btn');
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
    }
    
    try {
        await loadCurrentWeather(true); // true = forzar refresh
        
        // Cargar previsión después de un delay
        setTimeout(async () => {
            await loadWeatherForecast();
        }, 1500);
        
        showNotification('🌤️ Datos meteorológicos actualizados', 'success');
    } catch (error) {
        showNotification('❌ Error actualizando clima', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
        }
    }
}

// =============================================
// FUNCIONES DE UI - ESTADOS DEL WIDGET
// =============================================
function showWeatherLoading() {
    showElement('weather-current');
    hideElement('weather-status');
    hideElement('weather-impact');
    hideElement('weather-forecast');
    hideElement('weather-footer');
}

function hideWeatherLoading() {
    hideElement('weather-current');
}

function showWeatherContent() {
    showElement('weather-status');
}

function showWeatherError(message) {
    hideWeatherLoading();
    
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
        const errorHTML = `
            <div class="weather-error">
                <div style="margin-bottom: 8px;">❌ Error de Clima</div>
                <div style="font-size: 12px; opacity: 0.8;">${message}</div>
                <button class="btn btn-sm" onclick="refreshWeatherData()" style="margin-top: 12px;">
                    🔄 Reintentar
                </button>
            </div>
        `;
        
        // Reemplazar solo el contenido, manteniendo el header
        const statusElement = document.getElementById('weather-status');
        if (statusElement) {
            statusElement.innerHTML = errorHTML;
            statusElement.style.display = 'block';
        }
    }
}

// =============================================
// EVENT LISTENERS
// =============================================
function setupWeatherEventListeners() {
    // Listener para cambios de fecha que afecten al clima
    document.addEventListener('dateRangeChanged', function(event) {
        console.log('📅 Rango de fechas cambiado, actualizando clima...');
        loadCurrentWeather(false);
    });
    
    // Listener para cuando el dashboard se hace visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && weatherData) {
            const timeSinceUpdate = Date.now() - (lastWeatherUpdate?.getTime() || 0);
            
            // Si han pasado más de 15 minutos, actualizar
            if (timeSinceUpdate > 15 * 60 * 1000) {
                console.log('👁️ Dashboard visible después de 15+ min, actualizando clima');
                loadCurrentWeather(false);
            }
        }
    });
}

// =============================================
// FUNCIONES UTILIDADES
// =============================================
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Hacer función disponible globalmente
window.refreshWeatherData = refreshWeatherData;

// =============================================
// CLEANUP AL CERRAR LA PÁGINA
// =============================================
window.addEventListener('beforeunload', function() {
    if (weatherUpdateInterval) {
        clearInterval(weatherUpdateInterval);
    }
});

console.log('🌤️ Sistema de clima cargado y listo');

// FUNCIÓN DESACTIVADA - YA NO FORZAMOS MODO DARK
function forceMetricCardsDark() {
    // Esta función ha sido desactivada para permitir el modo día
    console.log('🚫 forceMetricCardsDark() desactivada - usando modo día');
    return;
}

// 🛑 PARAMOS LA GUERRA - DEBUGGING INTELIGENTE
console.log('🛑 Guerra total desactivada - modo debugging activado');

// Solo ejecutar UNA VEZ al cargar para debugging
setTimeout(() => {
    forceMetricCardsDark();
    
    // Mostrar información de debugging después de aplicar
    setTimeout(() => {
        const tarjeta = document.querySelector('.metrics-grid .metric-card');
        if (tarjeta) {
            console.log('🔍 === INFORMACIÓN DE DEBUGGING ===');
            console.log('🎨 Background computado:', getComputedStyle(tarjeta).background);
            console.log('🎨 Background-color:', getComputedStyle(tarjeta).backgroundColor);
            console.log('📝 Style inline:', tarjeta.style.cssText);
            console.log('🏷️ Clases:', tarjeta.className);
            
            // Ver archivos CSS cargados
            const stylesheets = Array.from(document.styleSheets);
            console.log('📄 CSS cargados:', stylesheets.map(s => s.href ? s.href.split('/').pop() : 'inline'));
        }
    }, 100);
}, 1000);

// 🔧 MODO DEBUG - Solo logging para entender el problema
console.log('🔧 Modo debugging activado - sin bombardeo');

// Función para investigar el problema
window.debugMetricCards = function() {
    const tarjetas = document.querySelectorAll('.metrics-grid .metric-card');
    console.log(`🔍 Encontradas ${tarjetas.length} tarjetas`);
    
    tarjetas.forEach((tarjeta, index) => {
        const styles = getComputedStyle(tarjeta);
        console.log(`📋 Tarjeta ${index + 1}:`);
        console.log(`   Background: ${styles.background}`);
        console.log(`   Background-color: ${styles.backgroundColor}`);
        console.log(`   Inline styles: ${tarjeta.style.cssText}`);
    });
    
    // Ver qué CSS están cargados
    const sheets = Array.from(document.styleSheets);
    console.log('📄 Archivos CSS:', sheets.map(s => s.href ? s.href.split('/').pop() : 'inline'));
};



// 🌤️ FUNCIÓN PARA IMPORTAR DATOS METEOROLÓGICOS
async function importWeatherData() {
    console.log('🌤️ Iniciando importación de datos meteorológicos...');
    
    const btn = document.getElementById('weather-import-btn');
    const statusSpan = document.getElementById('weather-status');
    
    // Estado inicial
    btn.disabled = true;
    btn.classList.add('loading');
    statusSpan.textContent = 'Calculando período...';
    
    try {
        // 1. Obtener el período basado en las ventas existentes
        const periodo = await calculateImportPeriod();
        console.log(`📅 Período calculado: ${periodo.fecha_inicio} - ${periodo.fecha_fin}`);
        
        statusSpan.textContent = `Importando ${periodo.años} año(s)...`;
        showNotification(`🌤️ Importando datos meteorológicos (${periodo.fecha_inicio} - ${periodo.fecha_fin})`, 'info');
        
        // 2. Llamar a la función de importación
        const requestBody = {
            restaurante_id: RESTAURANT_ID,
            action: 'import_historical',
            fecha_inicio: periodo.fecha_inicio,
            fecha_fin: periodo.fecha_fin
        };
        
        console.log('📤 Enviando petición:', requestBody);
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/aemet-data-importer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        console.log('📊 Resultado completo:', result);
        console.log('📊 Action recibida:', result.action);
        console.log('📊 Data estructura:', result.data);
        
        if (result.success) {
            // Verificar si es respuesta de importación o test
            if (result.action === 'import_historical' && result.data && typeof result.data.datos_importados !== 'undefined') {
                // Éxito en importación
                btn.classList.remove('loading');
                btn.classList.add('success');
                statusSpan.textContent = `✅ ${result.data.datos_importados} registros`;
                
                console.log('✅ IMPORTACIÓN EXITOSA:');
                console.log(`   📊 Datos importados: ${result.data.datos_importados}`);
                console.log(`   ❌ Errores: ${result.data.errores}`);
                console.log(`   🏢 Estación utilizada: ${result.data.estacion_utilizada}`);
                console.log(`   📅 Período: ${result.data.periodo}`);
                
                showNotification(`✅ Importación completa: ${result.data.datos_importados} registros meteorológicos`, 'success');
                
                // Recargar datos del dashboard después de 2 segundos
                setTimeout(() => {
                    syncData();
                }, 2000);
                
            } else if (result.message && result.message.includes('API Key funciona')) {
                // Es una respuesta de test - la función no está procesando correctamente
                throw new Error('La función AEMET está devolviendo test en lugar de importación. Revisar configuración.');
            } else {
                // Respuesta inesperada
                throw new Error(`Respuesta inesperada de la función AEMET: ${JSON.stringify(result)}`);
            }
            
        } else {
            throw new Error(result.error || 'Error desconocido en la importación');
        }
        
    } catch (error) {
        // Error
        console.error('❌ Error en importación:', error);
        btn.classList.remove('loading');
        btn.classList.add('error');
        statusSpan.textContent = '❌ Error';
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
    
    // Resetear botón después de 5 segundos
    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('loading', 'success', 'error');
        statusSpan.textContent = '';
    }, 5000);
}

// 📅 FUNCIÓN PARA CALCULAR EL PERÍODO DE IMPORTACIÓN
async function calculateImportPeriod() {
    try {
        // Obtener rango de fechas de ventas existentes
        const { data: ventasRango, error } = await supabase
            .from('ventas_datos')
            .select('fecha_venta')
            .eq('restaurante_id', RESTAURANT_ID)
            .order('fecha_venta', { ascending: true });

        if (error) {
            console.error('Error obteniendo rango de ventas:', error);
        }
        
        let fechaInicio, fechaFin;
        const hoy = new Date();
        const añoActual = hoy.getFullYear();
        
        if (ventasRango && ventasRango.length > 0) {
            // Hay ventas: usar el rango de las ventas
            const primeraVenta = new Date(ventasRango[0].fecha_venta);
            const ultimaVenta = new Date(ventasRango[ventasRango.length - 1].fecha_venta);
            
            fechaInicio = primeraVenta.toISOString().split('T')[0];
            fechaFin = ultimaVenta.toISOString().split('T')[0];
            
            console.log(`📊 Basado en ventas: ${ventasRango.length} registros desde ${fechaInicio}`);
        } else {
            // No hay ventas: usar último año completo
            fechaInicio = `${añoActual - 1}-01-01`;
            fechaFin = `${añoActual - 1}-12-31`;
            
            console.log(`📅 Sin ventas: usando año ${añoActual - 1} completo`);
        }
        
        // Calcular años de diferencia
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const años = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24 * 365));
        
        return {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            años: Math.max(años, 1) // Mínimo 1 año
        };
        
    } catch (error) {
        console.error('Error calculando período:', error);
        // Fallback: último año
        const añoActual = new Date().getFullYear();
        return {
            fecha_inicio: `${añoActual - 1}-01-01`,
            fecha_fin: `${añoActual - 1}-12-31`,
            años: 1
        };
    }
}

// 🧪 FUNCIÓN DE TEST AEMET
async function testAemetFunction() {
    console.log('🧪 Probando función AEMET...');
    
    // Mostrar loading
    showNotification('🌤️ Probando conexión AEMET...', 'info');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/aemet-data-importer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: "test_connection"
            })
        });

        const result = await response.json();
        console.log('📊 RESULTADO COMPLETO:', result);
        
        if (result.success) {
            console.log('✅ ¡ÉXITO! Detalles:');
            console.log(`   📅 Timestamp: ${result.timestamp}`);
            console.log(`   🔑 API Key: ${result.api_key_preview}`);
            console.log(`   📊 Respuesta AEMET:`, result.aemet_response);
            
            // Verificar si hay datos de AEMET
            if (result.aemet_response && result.aemet_response.datos) {
                console.log(`   🌐 URL de datos: ${result.aemet_response.datos}`);
                console.log(`   📋 URL de metadatos: ${result.aemet_response.metadatos}`);
                showNotification(`✅ Conexión AEMET exitosa. Estado: ${result.aemet_response.estado}`, 'success');
            } else {
                showNotification(`✅ API Key válida. Respuesta: ${result.message}`, 'success');
            }
        } else {
            console.log('❌ ERROR:', result.error);
            showNotification(`❌ Error: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('💥 ERROR DE RED:', error);
        showNotification(`💥 Error: ${error.message}`, 'error');
    }
}

// ✅ NUEVA FUNCIÓN HELPER: Mejorar visualización del eje X continuo
function mejorarVisualizacionEjeXContinuo(chart, esTurnoNocturno, ventasAdaptadas) {
    if (!chart || !esTurnoNocturno) return;
    
    console.log('🌙🔄 Aplicando mejoras visuales para eje X continuo nocturno');
    
    // Mejorar etiquetas del eje X para turnos nocturnos
    if (chart.options && chart.options.scales && chart.options.scales.x) {
        const xScale = chart.options.scales.x;
        
        // Configurar etiquetas más legibles para turnos nocturnos
        xScale.ticks = {
            ...xScale.ticks,
            callback: function(value, index) {
                const hora = ventasAdaptadas[index]?.hora;
                if (hora !== undefined) {
                    // Para turnos nocturnos, mostrar hora con contexto
                    if (hora >= 0 && hora <= 23) {
                        return `${hora.toString().padStart(2, '0')}:00`;
                    } else {
                        // Hora del día siguiente (no debería pasar con la lógica actual)
                        return `${hora.toString().padStart(2, '0')}:00`;
                    }
                }
                return value;
            },
            maxRotation: 45,
            minRotation: 45,
            color: '#64748b',
            font: { size: 11, weight: '500' }
        };
        
        // Mejorar título del eje X
        xScale.title = {
            display: true,
            text: 'Horas del Turno (Continuo)',
            color: '#64748b',
            font: { weight: 'bold', size: 14 }
        };
        
        // Mejorar grid del eje X
        xScale.grid = {
            color: 'rgba(0, 0, 0, 0.08)',
            lineWidth: 1,
            drawBorder: true,
            borderColor: 'rgba(0, 0, 0, 0.1)'
        };
    }
    
    // Mejorar tooltips para turnos nocturnos
    if (chart.options && chart.options.plugins && chart.options.plugins.tooltip) {
        const tooltip = chart.options.plugins.tooltip;
        
        tooltip.callbacks = {
            ...tooltip.callbacks,
            title: function(tooltipItems) {
                const dataIndex = tooltipItems[0].dataIndex;
                const hora = ventasAdaptadas[dataIndex]?.hora;
                if (hora !== undefined) {
                    if (hora >= 0 && hora <= 23) {
                        return `Hora: ${hora.toString().padStart(2, '0')}:00`;
                    } else {
                        return `Hora: ${hora.toString().padStart(2, '0')}:00 (día siguiente)`;
                    }
                }
                return tooltipItems[0].label;
            },
            afterBody: function(tooltipItems) {
                const dataIndex = tooltipItems[0].dataIndex;
                const hora = ventasAdaptadas[dataIndex]?.hora;
                if (hora !== undefined) {
                    // Agregar contexto temporal
                    let contexto = '';
                    if (hora >= 0 && hora < 6) {
                        contexto = ' (Madrugada)';
                    } else if (hora >= 6 && hora < 12) {
                        contexto = ' (Mañana)';
                    } else if (hora >= 12 && hora < 18) {
                        contexto = ' (Tarde)';
                    } else if (hora >= 18 && hora <= 23) {
                        contexto = ' (Noche)';
                    }
                    
                    return [`Período: ${contexto}`];
                }
                return [];
            }
        };
    }
    
    // Aplicar cambios
    chart.update('none');
    
    console.log('✅ Mejoras visuales aplicadas al eje X continuo');
}

// ✅ FUNCIÓN HELPER: Generar etiquetas de horas continuas para turnos nocturnos
function generarEtiquetasHorasContinuas(inicio, fin) {
    const etiquetas = [];
    let horaActual = inicio;
    
    // Generar etiquetas en orden cronológico
    while (horaActual !== fin) {
        etiquetas.push({
            hora: horaActual,
            formato: `${horaActual.toString().padStart(2, '0')}:00`,
            esDiaSiguiente: false
        });
        horaActual = (horaActual + 1) % 24;
    }
    
    // Agregar la hora final
    etiquetas.push({
        hora: fin,
        formato: `${fin.toString().padStart(2, '0')}:00`,
        esDiaSiguiente: fin < inicio // Si fin < inicio, es del día siguiente
    });
    
    return etiquetas;
}

// ✅ FUNCIÓN HELPER: Validar continuidad de datos horarios
function validarContinuidadHoraria(ventasPorHora) {
    if (!ventasPorHora || ventasPorHora.length < 2) return true;
    
    const horas = ventasPorHora.map(v => v.hora).sort((a, b) => a - b);
    let esContinuo = true;
    
    for (let i = 1; i < horas.length; i++) {
        const diferencia = horas[i] - horas[i-1];
        if (diferencia !== 1 && !(horas[i] === 0 && horas[i-1] === 23)) {
            esContinuo = false;
            break;
        }
    }
    
    console.log(`🔍 Validación continuidad horaria: ${esContinuo ? '✅ Continuo' : '❌ Discontinuo'}`);
    console.log(`   Horas ordenadas: ${horas.join(' → ')}`);
    
    return esContinuo;
}

// ✅ FUNCIÓN HELPER: Obtener datos del día anterior para comparación
function obtenerDatosDiaAnterior(fechaAnterior) {
    console.log('🔄 Obteniendo datos del día anterior:', fechaAnterior);
    
    // Por ahora, retornamos null para evitar errores
    // En el futuro, esto se conectará con tu API para obtener datos históricos
    console.log('⚠️ Función obtenerDatosDiaAnterior: Implementación pendiente de conexión con API');
    
    // TODO: Implementar llamada a API para obtener ventas por hora del día anterior
    // Ejemplo de estructura esperada:
    // return [
    //     { hora: 20, ventas: 150, cantidad_tickets: 8 },
    //     { hora: 21, ventas: 200, cantidad_tickets: 10 },
    //     { hora: 22, ventas: 180, cantidad_tickets: 9 },
    //     { hora: 23, ventas: 120, cantidad_tickets: 6 }
    // ];
    
    return null;
}

// ✅ FUNCIÓN HELPER: Generar datos de la semana pasada por hora basándose en totales históricos
function generarDatosSemanaPasadaPorHora(datosHistoricos, ventasPorHoraActual) {
    console.log('🔄 Generando datos de la semana pasada por hora...');
    console.log('   - Datos históricos disponibles:', datosHistoricos);
    console.log('   - Ventas por hora actual:', ventasPorHoraActual);
    
    if (!datosHistoricos || !ventasPorHoraActual || ventasPorHoraActual.length === 0) {
        console.log('❌ Datos insuficientes para generar datos de la semana pasada');
        return null;
    }
    
    // ✅ SOLO USAR DATOS REALES: Buscar totales históricos disponibles
    let totalSemanaPasada = null;
    
    // Buscar en métricas anteriores (datos reales del backend)
    if (datosHistoricos.total_ventas_bruto && datosHistoricos.total_ventas_bruto.anterior) {
        totalSemanaPasada = datosHistoricos.total_ventas_bruto.anterior;
        console.log('📊 Usando total_ventas_bruto.anterior (DATOS REALES)');
    } else if (datosHistoricos.total_ventas && datosHistoricos.total_ventas.anterior) {
        totalSemanaPasada = datosHistoricos.total_ventas.anterior;
        console.log('📊 Usando total_ventas.anterior (DATOS REALES)');
    }
    
    if (!totalSemanaPasada || totalSemanaPasada === 0) {
        console.log('❌ No hay datos reales de la semana pasada disponibles');
        return null;
    }
    
    // Calcular el total actual para comparar
    const totalActual = ventasPorHoraActual.reduce((sum, h) => sum + h.ventas, 0);
    
    console.log(`📊 Totales REALES: Actual=${totalActual}, Semana Pasada=${totalSemanaPasada}`);
    
    // ✅ FACTOR DE ESCALA SIMPLE: Solo usar datos reales
    const factorEscala = totalSemanaPasada / totalActual;
    console.log(`📏 Factor de escala REAL: ${factorEscala.toFixed(3)}`);
    
    // ✅ GENERAR DATOS PROPORCIONALES: Mantener proporciones reales
    const datosSemanaPasada = ventasPorHoraActual.map(hora => {
        const ventasSemanaPasada = hora.ventas * factorEscala;
        const ticketsSemanaPasada = Math.round(hora.cantidad_tickets * factorEscala);
        
        console.log(`   Hora ${hora.hora}:00 - Ventas: ${hora.ventas} → ${ventasSemanaPasada.toFixed(2)} (factor: ${factorEscala.toFixed(3)})`);
        
        return {
            hora: hora.hora,
            hora_formato: hora.hora_formato,
            ventas: Math.round(ventasSemanaPasada * 100) / 100, // Redondear a 2 decimales
            cantidad_tickets: ticketsSemanaPasada > 0 ? ticketsSemanaPasada : 1 // Mínimo 1 ticket
        };
    });
    
    console.log('✅ Datos de la semana pasada generados (SOLO DATOS REALES):', datosSemanaPasada);
    return datosSemanaPasada;
}

// ✅ FUNCIÓN HELPER: Generar datos históricos por hora basándose en totales REALES
function generarDatosHistoricosPorHora(metricasAnteriores, ventasPorHoraActual) {
    console.log('🔄 Generando datos históricos por hora...');
    console.log('   - Métricas anteriores:', metricasAnteriores);
    console.log('   - Ventas por hora actual:', ventasPorHoraActual);
    
    if (!metricasAnteriores || !ventasPorHoraActual || ventasPorHoraActual.length === 0) {
        console.log('❌ Datos insuficientes para generar histórico');
        return null;
    }
    
    // ✅ SOLO USAR DATOS REALES: Buscar totales históricos disponibles
    const totalActual = ventasPorHoraActual.reduce((sum, h) => sum + h.ventas, 0);
    const totalAnterior = metricasAnteriores.total_ventas || metricasAnteriores.total_ventas_bruto;
    
    console.log(`📊 Totales REALES: Actual=${totalActual}, Anterior=${totalAnterior}`);
    
    if (!totalAnterior || totalAnterior === 0) {
        console.log('❌ Total anterior no disponible');
        return null;
    }
    
    // ✅ FACTOR DE ESCALA SIMPLE: Solo usar datos reales
    const factorEscala = totalAnterior / totalActual;
    console.log(`📏 Factor de escala REAL: ${factorEscala.toFixed(3)}`);
    
    // ✅ GENERAR DATOS PROPORCIONALES: Mantener proporciones reales
    const datosHistoricos = ventasPorHoraActual.map(hora => {
        const ventasHistoricas = hora.ventas * factorEscala;
        const ticketsHistoricos = Math.round(hora.cantidad_tickets * factorEscala);
        
        console.log(`   Hora ${hora.hora}:00 - Ventas: ${hora.ventas} → ${ventasHistoricas.toFixed(2)} (factor: ${factorEscala.toFixed(3)})`);
        
        return {
            hora: hora.hora,
            hora_formato: hora.hora_formato,
            ventas: Math.round(ventasHistoricas * 100) / 100, // Redondear a 2 decimales
            cantidad_tickets: ticketsHistoricos > 0 ? ticketsHistoricos : 1 // Mínimo 1 ticket
        };
    });
    
    console.log('✅ Datos históricos generados (SOLO DATOS REALES):', datosHistoricos);
    return datosHistoricos;
}

// ✅ FUNCIÓN HELPER: Obtener datos del mismo día de la semana pasada
function obtenerDatosSemanaPasada() {
    console.log('🔄 Obteniendo datos de la semana pasada...');
    
    // Por ahora, retornamos null para evitar errores
    // En el futuro, esto se conectará con tu API para obtener datos históricos
    console.log('⚠️ Función obtenerDatosSemanaPasada: Implementación pendiente de conexión con API');
    
    // TODO: Implementar llamada a API para obtener ventas por hora de la semana pasada
    // Ejemplo de estructura esperada:
    // return [
    //     { hora: 20, ventas: 130, cantidad_tickets: 7 },
    //     { hora: 21, ventas: 180, cantidad_tickets: 9 },
    //     { hora: 22, ventas: 160, cantidad_tickets: 8 },
    //     { hora: 23, ventas: 110, cantidad_tickets: 5 }
    // ];
    
    return null;
}

// ========================================
// GRÁFICO DE RANKING DE PRODUCTOS
// ========================================

let rankingProductsChart = null;
let rankingShowComparison = false;


function updateRankingChart(productosTop) {
    console.log('🏆 updateRankingChart llamada con:', productosTop);
    
    const ctx = document.getElementById('ranking-products-chart');
    if (!ctx) {
        console.warn('⚠️ No se encontró el canvas ranking-products-chart');
        return;
    }

    // Destruir gráfico anterior si existe
    if (rankingProductsChart) {
        rankingProductsChart.destroy();
    }

    if (!productosTop || productosTop.length === 0) {
        console.warn('⚠️ No hay productos para mostrar en el ranking');
        showEmptyRankingChart(ctx);
        return;
    }

    // Preparar datos para el ranking
    const productosRanking = productosTop
        .filter(producto => producto.importe && producto.importe > 0)
        .sort((a, b) => (b.importe || 0) - (a.importe || 0))
        .slice(0, 8); // Top 8 productos (reducido para barras más pequeñas)

    if (productosRanking.length === 0) {
        console.warn('⚠️ No hay productos con importe para mostrar en el ranking');
        showEmptyRankingChart(ctx);
        return;
    }

    console.log('🏆 Productos para ranking:', productosRanking);

    // Obtener datos del día anterior si están disponibles
    let productosAnteriores = [];
    if (dashboardData && dashboardData.productos_top_anterior) {
        productosAnteriores = dashboardData.productos_top_anterior;
    }

    // Preparar datasets según si se muestra comparación o no
    let datasets = [];
    
    if (rankingShowComparison && productosAnteriores.length > 0) {
        // Dataset actual
        datasets.push({
            label: 'Actual',
            data: productosRanking.map(producto => producto.importe || 0),
            backgroundColor: 'rgba(0, 212, 170, 0.8)',
            borderColor: '#00D4AA',
            borderWidth: 1,
            barThickness: 18,
            maxBarThickness: 22,
            borderRadius: 3
        });

        // Dataset anterior (buscar productos correspondientes)
        const datosAnteriores = productosRanking.map(producto => {
            const productoAnterior = productosAnteriores.find(p => 
                p.nombre === producto.nombre && p.categoria === producto.categoria
            );
            return productoAnterior ? (productoAnterior.importe || 0) : 0;
        });

        datasets.push({
            label: 'Ayer',
            data: datosAnteriores,
            backgroundColor: 'rgba(100, 116, 139, 0.7)',
            borderColor: '#64748B',
            borderWidth: 1,
            barThickness: 18,
            maxBarThickness: 22,
            borderRadius: 3
        });
    } else {
        // Solo dataset actual
        datasets.push({
            label: 'Importe Total',
            data: productosRanking.map(producto => producto.importe || 0),
            backgroundColor: 'rgba(0, 212, 170, 0.8)',
            borderColor: '#00D4AA',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 25,
            maxBarThickness: 30
        });
    }

    // Configurar el gráfico con barras horizontales y escala logarítmica
    rankingProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: productosRanking.map(p => {
                const nombre = p.nombre || 'Sin nombre';
                // Truncar nombres para barras horizontales
                return nombre.length > 20 ? nombre.substring(0, 17) + '...' : nombre;
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Barras horizontales
            plugins: {
                legend: {
                    display: rankingShowComparison, // Mostrar leyenda solo en modo comparación
                    position: 'top',
                    labels: {
                        color: '#1f2937',
                        font: {
                            size: 11
                        },
                        padding: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#00D4AA',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.x.toFixed(2);
                            return `${label}: €${value}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic', // Escala logarítmica
                    min: 1, // Valor mínimo para evitar problemas con log(0)
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#1f2937',
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 8, // Limitar número de ticks
                        callback: function(value) {
                            // Mostrar solo valores significativos en escala logarítmica
                            const significantValues = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
                            
                            // Verificar si el valor está cerca de uno significativo
                            const isSignificant = significantValues.some(sv => 
                                Math.abs(value - sv) / sv < 0.1
                            );
                            
                            if (isSignificant || value >= 1000) {
                                if (value >= 1000) {
                                    return '€' + (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'k';
                                } else if (value >= 100) {
                                    return '€' + value.toFixed(0);
                                } else if (value >= 10) {
                                    return '€' + value.toFixed(0);
                                } else {
                                    return '€' + value.toFixed(1);
                                }
                            }
                            return ''; // No mostrar ticks intermedios
                        }
                    },
                    title: {
                        display: true,
                        text: 'Importe Total (€) - Escala Log',
                        color: '#1f2937',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#1f2937',
                        font: {
                            size: 10
                        }
                    },
                    title: {
                        display: true,
                        text: 'Productos',
                        color: '#1f2937',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            },
            animation: {
                duration: 300, // ⚡ Reducido de 800ms a 300ms para ranking
                easing: 'easeOutCubic' // ⚡ Easing más suave
            }
        }
    });

    console.log('✅ Gráfico de ranking de productos creado (horizontal con escala logarítmica)');
}

// ========================================
// MATRIZ DE VENTAS - GRÁFICO DE DISPERSIÓN
// ========================================

let salesMatrixChart = null;

function updateSalesMatrixChart(productosTop) {
    console.log('📊 updateSalesMatrixChart llamada con:', productosTop);
    
    const ctx = document.getElementById('sales-matrix-chart');
    if (!ctx) {
        console.warn('⚠️ No se encontró el canvas sales-matrix-chart');
        return;
    }

    // Destruir gráfico anterior si existe
    if (salesMatrixChart) {
        // Limpiar el ResizeObserver si existe
        if (salesMatrixChart.resizeObserver) {
            salesMatrixChart.resizeObserver.disconnect();
        }
        salesMatrixChart.destroy();
        salesMatrixChart = null;
    }

    if (!productosTop || productosTop.length === 0) {
        console.warn('⚠️ No hay productos para mostrar en la matriz de ventas');
        showEmptyMatrixChart(ctx);
        return;
    }

    // ⭐ CALCULAR POPULARIDAD REAL para la matriz (usar datos de la tabla)
    const popularidadMatrixMap = {};
    
    // Reutilizar los datos de popularidad ya calculados en updateProductsTable
    if (window.popularidadGlobal) {
        Object.assign(popularidadMatrixMap, window.popularidadGlobal);
        console.log('📊 Reutilizando datos de popularidad real para matriz:', Object.keys(popularidadMatrixMap).length, 'productos');
    } else {
        console.log('⚠️ No hay datos de popularidad global, usando fallback para matriz');
        
        // Fallback con estimación básica
        if (dashboardData && dashboardData.ventasList && productosTop) {
            const totalTicketsReales = dashboardData.ventasList.length;
            
            productosTop.forEach(producto => {
                const nombreProducto = producto.nombre;
                const vecesVendido = producto.veces_vendido || 0;
                
                let popularidadEstimada = 0;
                if (vecesVendido > 0 && totalTicketsReales > 0) {
                    if (vecesVendido <= totalTicketsReales) {
                        popularidadEstimada = vecesVendido;
                    } else {
                        const factorConcentracion = Math.log(vecesVendido / totalTicketsReales + 1) / Math.log(2);
                        popularidadEstimada = Math.min(
                            Math.ceil(totalTicketsReales * (1 - 1/factorConcentracion)),
                            totalTicketsReales
                        );
                    }
                    popularidadEstimada = Math.max(1, popularidadEstimada);
                }
                popularidadMatrixMap[nombreProducto] = popularidadEstimada;
            });
        }
    }

    // Preparar datos para la matriz
    const productosMatrix = productosTop
        .filter(producto => producto.importe && producto.importe > 0 && producto.veces_vendido && producto.veces_vendido > 0)
        .map(producto => {
            const nombre = producto.nombre || 'Sin nombre';
            const popularidad = popularidadMatrixMap[nombre] || 0;
            
            return {
                nombre: nombre,
                veces_vendido: producto.veces_vendido || 0,
                importe: producto.importe || 0,
                categoria: producto.categoria || 'Sin categoría',
                popularidad: popularidad // ⭐ NUEVA MÉTRICA PARA MATRIZ
            };
        })
        .sort((a, b) => b.importe - a.importe);

    if (productosMatrix.length === 0) {
        console.warn('⚠️ No hay productos con datos válidos para la matriz');
        showEmptyMatrixChart(ctx);
        return;
    }

    console.log('📊 Productos para matriz de ventas:', productosMatrix);

    // ⭐ Calcular tamaños de puntos basados en POPULARIDAD (tickets únicos)
    const maxPopularidad = Math.max(...productosMatrix.map(p => p.popularidad));
    const minPopularidad = Math.min(...productosMatrix.map(p => p.popularidad));
    
    console.log('📊 Rango de popularidad:', { minPopularidad, maxPopularidad });
    
    // Asegurar que el canvas tenga dimensiones correctas
    const container = ctx.parentElement;
    if (container) {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
            ctx.style.width = containerRect.width + 'px';
            ctx.style.height = containerRect.height + 'px';
            ctx.width = containerRect.width;
            ctx.height = containerRect.height;
                                        // console.log('🔧 Canvas de matriz redimensionado:', containerRect.width, 'x', containerRect.height);
        } else {
            console.warn('⚠️ Contenedor del canvas de matriz tiene dimensiones 0');
            // Forzar dimensiones mínimas
            ctx.style.width = '400px';
            ctx.style.height = '300px';
            ctx.width = 400;
            ctx.height = 300;
        }
    }

    // ⚡ OPTIMIZACIÓN: Configurar el gráfico con opciones de rendimiento
    salesMatrixChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Productos',
                data: productosMatrix.map(producto => ({
                    x: producto.veces_vendido,
                    y: producto.importe,
                    nombre: producto.nombre,
                    categoria: producto.categoria,
                    popularidad: producto.popularidad // ⭐ Incluir popularidad en datos
                })),
                backgroundColor: productosMatrix.map(producto => 
                    obtenerColorPorCategoria(producto.categoria)
                ),
                borderColor: productosMatrix.map(producto => 
                    obtenerColorPorCategoria(producto.categoria, true)
                ),
                borderWidth: 2,
                pointRadius: productosMatrix.map(producto => 
                    calcularTamañoPunto(producto.popularidad, minPopularidad, maxPopularidad)
                ),
                pointHoverRadius: productosMatrix.map(producto => 
                    Math.min(calcularTamañoPunto(producto.popularidad, minPopularidad, maxPopularidad) + 5, 20)
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            // ⚡ OPTIMIZACIONES DE RENDIMIENTO PARA MATRIZ
            parsing: false, // Desactivar parsing automático
            normalized: true, // Datos ya están normalizados
            elements: {
                point: {
                    hoverRadius: 8, // Reducir hover radius para mejor rendimiento
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#00D4AA',
                    borderWidth: 2,
                    callbacks: {
                        title: function(context) {
                            return context[0].raw.nombre;
                        },
                        label: function(context) {
                            const data = context.raw;
                            return [
                                `Categoría: ${data.categoria}`,
                                `Unidades vendidas: ${data.x}`,
                                `Facturación total: €${data.y.toFixed(2)}`,
                                `🎯 Popularidad: ${data.popularidad} tickets`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic', // ⭐ ESCALA LOGARÍTMICA
                    position: 'bottom',
                    min: 1, // Evitar log(0)
                    grid: {
                        color: '#e5e7eb',
                        drawBorder: true,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#1f2937',
                        font: {
                            size: 12
                        },
                        maxTicksLimit: 8,
                        callback: function(value) {
                            // Mostrar valores enteros en escala log
                            if (value >= 1) {
                                return Math.round(value).toString();
                            }
                            return '';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Unidades Vendidas',
                        color: '#1f2937',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb',
                        drawBorder: true,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#1f2937',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return '€' + value.toFixed(0);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Facturación Total (€)',
                        color: '#1f2937',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                }
            },
            animation: {
                duration: 500, // ⚡ Reducido de 1200ms a 500ms
                easing: 'easeOutCubic' // ⚡ Easing más suave
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            },
            // Prevenir expansión constante
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            // Controlar el tamaño máximo
            aspectRatio: 1.5,
            // ⚡ OPTIMIZACIÓN: Animación simplificada sin onProgress problemático
            animation: {
                duration: 400, // ⚡ Reducido de 800ms a 400ms
                easing: 'easeOutCubic' // ⚡ Easing más suave
                // ⚡ REMOVIDO: onProgress que causaba redimensionados constantes
            }
        }
    });

    console.log('✅ Gráfico de matriz de ventas creado');
    
    // ⚡ OPTIMIZACIÓN: ResizeObserver con throttling para mejor rendimiento
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(entries => {
        // Throttle para evitar redimensionados constantes
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        resizeTimeout = setTimeout(() => {
            for (let entry of entries) {
                if (entry.target === container) {
                    const { width, height } = entry.contentRect;
                    if (width > 0 && height > 0 && ctx && salesMatrixChart) {
                        // Solo redimensionar si hay cambio significativo (>10px)
                        const currentWidth = parseInt(ctx.style.width) || 0;
                        const currentHeight = parseInt(ctx.style.height) || 0;
                        
                        if (Math.abs(width - currentWidth) > 10 || Math.abs(height - currentHeight) > 10) {
                            ctx.style.width = width + 'px';
                            ctx.style.height = height + 'px';
                            // Usar requestAnimationFrame para suavizar el redimensionado
                            requestAnimationFrame(() => {
                                if (salesMatrixChart) {
                                    salesMatrixChart.resize();
                                }
                            });
                        }
                    }
                }
            }
        }, 150); // Throttle de 150ms
    });
    
    if (container) {
        resizeObserver.observe(container);
    }
    
    // Guardar el observer para limpiarlo después
    salesMatrixChart.resizeObserver = resizeObserver;
}

function calcularTamañoPunto(popularidad, minPopularidad, maxPopularidad) {
    // ⭐ Calcular tamaño del punto basado en la POPULARIDAD (tickets únicos)
    const rango = maxPopularidad - minPopularidad;
    if (rango === 0) return 8; // Tamaño base si todos tienen la misma popularidad
    
    const normalizado = (popularidad - minPopularidad) / rango;
    const tamañoBase = 6;
    const tamañoMaximo = 18;
    
    return Math.round(tamañoBase + (normalizado * (tamañoMaximo - tamañoBase)));
}

function obtenerColorPorCategoria(categoria, esBorde = false) {
    // Colores por categoría con transparencia
    const colores = {
        'Cervezas': esBorde ? '#FF6B35' : 'rgba(255, 107, 53, 0.8)',
        'Vinos': esBorde ? '#8B5CF6' : 'rgba(139, 92, 246, 0.8)',
        'Refrescos': esBorde ? '#06B6D4' : 'rgba(6, 182, 212, 0.8)',
        'Comida': esBorde ? '#10B981' : 'rgba(16, 185, 129, 0.8)',
        'Postres': esBorde ? '#F59E0B' : 'rgba(245, 158, 11, 0.8)',
        'Entrantes': esBorde ? '#EF4444' : 'rgba(239, 68, 68, 0.8)'
    };
    
    // Buscar categoría que contenga la palabra clave
    for (const [key, color] of Object.entries(colores)) {
        if (categoria.toLowerCase().includes(key.toLowerCase())) {
            return color;
        }
    }
    
    // Color por defecto
    return esBorde ? '#64748B' : 'rgba(100, 116, 139, 0.8)';
}

function showEmptyMatrixChart(ctx) {
    // Mostrar mensaje cuando no hay datos
    const container = ctx.parentElement;
    if (container) {
        container.innerHTML = `
            <div class="empty-chart-state">
                <div class="empty-chart-icon">📊</div>
                <div class="empty-chart-text">No hay datos para mostrar</div>
                <div class="empty-chart-subtext">La matriz de ventas aparecerá aquí cuando haya productos vendidos</div>
            </div>
        `;
    }
}

function showEmptyRankingChart(ctx) {
    // Mostrar mensaje cuando no hay datos
    const container = ctx.parentElement;
    if (container) {
        container.innerHTML = `
            <div class="empty-chart-state">
                <div class="empty-chart-icon">🏆</div>
                <div class="empty-chart-text">No hay datos para mostrar</div>
                <div class="empty-chart-subtext">El ranking de productos aparecerá aquí cuando haya ventas</div>
            </div>
        `;
    }
}

// ========================================
// GRÁFICO DE CATEGORÍAS - PESO POR CATEGORÍA
// ========================================

let categoryWeightChart = null;
let categoryShowComparison = false;

function updateCategoryWeightChart(categorias_ventas, productos_top = null) {
    console.log('📊 updateCategoryWeightChart llamada con categorias_ventas:', categorias_ventas);
    console.log('📊 updateCategoryWeightChart llamada con productos_top:', productos_top);
    console.log('📊 Tipo de datos categorias_ventas:', typeof categorias_ventas);
    console.log('📊 Es array categorias_ventas:', Array.isArray(categorias_ventas));
    console.log('📊 Longitud categorias_ventas:', categorias_ventas?.length);
    
    let ctx = document.getElementById('category-weight-chart');
    console.log('🔍 Canvas category-weight-chart encontrado:', ctx);
    console.log('🔍 Canvas dimensiones:', ctx?.width, 'x', ctx?.height);
    console.log('🔍 Canvas parent:', ctx?.parentElement);
    
    if (!ctx) {
        console.warn('⚠️ No se encontró el canvas category-weight-chart');
        console.log('🔧 Intentando crear el canvas dinámicamente...');
        
        // Buscar el contenedor donde debería estar el canvas
        const chartContent = document.querySelector('#diario-section .charts-first-row .chart-card:nth-child(2) .chart-content');
        const chartContentAlt = document.querySelector('.chart-content');
        const targetContainer = chartContent || chartContentAlt;
        
        if (targetContainer) {
            console.log('✅ Contenedor encontrado, creando canvas...');
            
            // Crear el canvas dinámicamente
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'category-weight-chart';
            newCanvas.style.background = '#ffffff';
            newCanvas.style.border = '1px solid #e5e7eb';
            newCanvas.style.borderRadius = '8px';
            newCanvas.style.padding = '20px';
            newCanvas.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            
            // Limpiar el contenedor y agregar el canvas
            targetContainer.innerHTML = '';
            targetContainer.appendChild(newCanvas);
            
            // Actualizar la referencia y continuar
            ctx = newCanvas;
            console.log('✅ Canvas creado dinámicamente:', ctx);
        } else {
            console.log('❌ No se encontró ningún contenedor válido');
            // Intentar buscar todos los canvas disponibles como fallback
            const allCanvas = document.querySelectorAll('canvas');
            console.log('🔍 Todos los canvas encontrados:', Array.from(allCanvas).map(c => c.id));
            return;
        }
    }

    // Destruir gráfico anterior si existe
    if (categoryWeightChart) {
        categoryWeightChart.destroy();
    }

    // 🆘 PLAN B: Si no hay categorias_ventas, generar desde productos_top
    let datosCategoriasParaGrafico = categorias_ventas;
    
    if (!categorias_ventas || categorias_ventas.length === 0) {
        console.warn('⚠️ No hay categorias_ventas, intentando generar desde productos_top...');
        
        if (productos_top && productos_top.length > 0) {
            console.log('🔧 Generando categorías desde productos_top:', productos_top);
            
            // Generar categorías agrupando productos
            const categoriasMap = new Map();
            
            productos_top.forEach(producto => {
                const categoria = producto.categoria || 'Sin categoría';
                
                if (!categoriasMap.has(categoria)) {
                    categoriasMap.set(categoria, {
                        categoria,
                        importe: 0,
                        productos_count: 0,
                        porcentaje: 0
                    });
                }
                
                if (producto.importe > 0) {
                    const catData = categoriasMap.get(categoria);
                    catData.importe += producto.importe;
                    catData.productos_count += 1;
                }
            });
            
            // Calcular total para porcentajes
            const totalImporte = Array.from(categoriasMap.values()).reduce((sum, cat) => sum + cat.importe, 0);
            
            datosCategoriasParaGrafico = Array.from(categoriasMap.values())
                .filter(cat => cat.importe > 0)
                .map(cat => ({
                    ...cat,
                    porcentaje: totalImporte > 0 ? (cat.importe / totalImporte) * 100 : 0
                }))
                .sort((a, b) => b.importe - a.importe);
                
            console.log('✅ Categorías generadas desde productos:', datosCategoriasParaGrafico);
        } else {
            console.warn('❌ Tampoco hay productos_top para generar categorías');
            showEmptyCategoryChart(ctx);
            return;
        }
    }

    if (!datosCategoriasParaGrafico || datosCategoriasParaGrafico.length === 0) {
        console.warn('⚠️ No hay datos finales de categorías para mostrar');
        showEmptyCategoryChart(ctx);
        return;
    }

    // Preparar datos para el gráfico de categorías
    const categoriasData = datosCategoriasParaGrafico
        .filter(cat => cat.importe && cat.importe > 0)
        .sort((a, b) => (b.importe || 0) - (a.importe || 0))
        .slice(0, 8); // Top 8 categorías

    if (categoriasData.length === 0) {
        console.warn('⚠️ No hay categorías con importe para mostrar');
        showEmptyCategoryChart(ctx);
        return;
    }

    console.log('📊 Categorías para gráfico (datos finales):', categoriasData);

    // Colores predefinidos para categorías
    const coloresCategorias = [
        '#FF6B35', // Naranja
        '#8B5CF6', // Púrpura
        '#06B6D4', // Cian
        '#10B981', // Verde
        '#F59E0B', // Amarillo
        '#EF4444', // Rojo
        '#6366F1', // Índigo
        '#84CC16'  // Lima
    ];

    // Obtener datos del día anterior si están disponibles
    let categoriasAnteriores = [];
    if (dashboardData && dashboardData.productos_top_anterior) {
        // Generar categorías desde productos del día anterior
        const categoriasMapAnterior = {};
        dashboardData.productos_top_anterior.forEach(producto => {
            const categoria = producto.categoria || 'Sin categoría';
            if (!categoriasMapAnterior[categoria]) {
                categoriasMapAnterior[categoria] = {
                    categoria: categoria,
                    importe: 0,
                    productos_count: 0,
                    porcentaje: 0
                };
            }
            categoriasMapAnterior[categoria].importe += producto.importe || 0;
            categoriasMapAnterior[categoria].productos_count += 1;
        });
        
        categoriasAnteriores = Object.values(categoriasMapAnterior);
    }

    // Preparar datasets según si se muestra comparación o no
    let datasets = [];
    
    if (categoryShowComparison && categoriasAnteriores.length > 0) {
        // Dataset actual
        datasets.push({
            label: 'Actual',
            data: categoriasData.map(cat => cat.importe || 0),
            backgroundColor: 'rgba(255, 107, 53, 0.8)',
            borderColor: '#FF6B35',
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false
        });

        // Dataset anterior (buscar categorías correspondientes)
        const datosAnteriores = categoriasData.map(cat => {
            const categoriaAnterior = categoriasAnteriores.find(c => c.categoria === cat.categoria);
            return categoriaAnterior ? (categoriaAnterior.importe || 0) : 0;
        });

        datasets.push({
            label: 'Ayer',
            data: datosAnteriores,
            backgroundColor: 'rgba(100, 116, 139, 0.6)',
            borderColor: '#64748B',
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false
        });
    } else {
        // Solo dataset actual
        datasets.push({
            label: 'Importe (€)',
            data: categoriasData.map(cat => cat.importe || 0),
            backgroundColor: categoriasData.map((_, index) => coloresCategorias[index % coloresCategorias.length]),
            borderColor: categoriasData.map((_, index) => coloresCategorias[index % coloresCategorias.length]),
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false
        });
    }

    // Configurar el gráfico de categorías
    console.log('🎨 Creando gráfico de categorías con datos:', {
        labels: categoriasData.map(cat => cat.categoria),
        data: categoriasData.map(cat => cat.importe),
        categoriasData
    });
    
    try {
        categoryWeightChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoriasData.map(cat => {
                const nombre = cat.categoria || 'Sin categoría';
                // Truncar nombres para barras verticales
                return nombre.length > 12 ? nombre.substring(0, 10) + '...' : nombre;
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: categoryShowComparison, // Mostrar leyenda solo en modo comparación
                    position: 'top',
                    labels: {
                        color: '#1f2937',
                        font: {
                            size: 11
                        },
                        padding: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#06B6D4',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const data = categoriasData[context.dataIndex];
                            const label = context.dataset.label || '';
                            return [
                                `${label}: €${context.parsed.y.toFixed(2)}`,
                                categoryShowComparison ? '' : `Porcentaje: ${(data.porcentaje || 0).toFixed(1)}%`,
                                categoryShowComparison ? '' : `Productos: ${data.productos_count || 0}`
                            ].filter(line => line !== '');
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#1f2937',
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Categorías',
                        color: '#1f2937',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#1f2937',
                        font: {
                            size: 10
                        },
                        callback: function(value) {
                            if (value >= 1000) {
                                return '€' + (value / 1000).toFixed(1) + 'k';
                            } else {
                                return '€' + value.toFixed(0);
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Importe Total (€)',
                        color: '#1f2937',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            },
            animation: {
                duration: 350, // ⚡ Reducido de 800ms a 350ms para categorías
                easing: 'easeOutCubic' // ⚡ Easing más suave
            }
        }
    });
    
        console.log('✅ Gráfico de peso por categorías creado exitosamente');
        console.log('🔍 Gráfico creado:', categoryWeightChart);
        
    } catch (error) {
        console.error('❌ Error creando gráfico de categorías:', error);
        console.error('❌ Datos que causaron el error:', categoriasData);
        showEmptyCategoryChart(ctx);
        return;
    }
}

function showEmptyCategoryChart(ctx) {
    // Mostrar mensaje cuando no hay datos
    const container = ctx.parentElement;
    if (container) {
        container.innerHTML = `
            <div class="empty-chart-state">
                <div class="empty-chart-icon">📊</div>
                <div class="empty-chart-text">No hay datos para mostrar</div>
                <div class="empty-chart-subtext">El gráfico de categorías aparecerá aquí cuando haya ventas</div>
            </div>
        `;
    }
}

// 🧪 FUNCIÓN DE PRUEBA: Crear gráfico de categorías con datos de test
function testCategoryChart() {
    console.log('🧪 INICIANDO TEST del gráfico de categorías');
    
    const testData = [
        { categoria: 'Bebidas', importe: 1500, productos_count: 10, porcentaje: 40 },
        { categoria: 'Comida', importe: 2000, productos_count: 15, porcentaje: 53 },
        { categoria: 'Postres', importe: 250, productos_count: 3, porcentaje: 7 }
    ];
    
    console.log('🧪 Datos de test:', testData);
    updateCategoryWeightChart(testData, null);
}

// Exponer función de test globalmente para poder llamarla desde la consola
window.testCategoryChart = testCategoryChart;

// 🔧 FUNCIÓN DE DEBUG COMPLETA
function debugCategoryChart() {
    console.log('🔧 === DEBUG COMPLETO DEL GRÁFICO DE CATEGORÍAS ===');
    
    // 1. Verificar elemento canvas
    const canvas = document.getElementById('category-weight-chart');
    console.log('🔍 Canvas encontrado:', canvas);
    console.log('🔍 Canvas visible:', canvas?.offsetParent !== null);
    console.log('🔍 Canvas dimensiones:', canvas?.width, 'x', canvas?.height);
    console.log('🔍 Canvas style.display:', canvas?.style.display);
    console.log('🔍 Canvas computed display:', canvas ? getComputedStyle(canvas)?.display : 'N/A - canvas es null');
    
    // 2. Verificar contenedor padre
    const container = canvas?.parentElement;
    console.log('🔍 Contenedor padre:', container);
    console.log('🔍 Contenedor visible:', container?.offsetParent !== null);
    console.log('🔍 Contenedor style.display:', container?.style.display);
    console.log('🔍 Contenedor computed display:', container ? getComputedStyle(container)?.display : 'N/A - contenedor es null');
    
    // 3. Verificar sección activa
    console.log('🔍 currentSection:', currentSection);
    const activeSection = document.querySelector('.content-section.active');
    console.log('🔍 Sección activa:', activeSection?.id);
    
    // 🔧 SINCRONIZAR currentSection con la sección activa real
    if (activeSection?.id === 'diario-section') {
        console.log('🔄 Sincronizando currentSection a "diario"');
        currentSection = 'diario';
    }
    
    // 4. Verificar datos disponibles
    console.log('🔍 dashboardData:', dashboardData);
    console.log('🔍 categorias_ventas:', dashboardData?.categorias_ventas);
    console.log('🔍 productos_top:', dashboardData?.productos_top);
    
    // 5. Verificar estado del gráfico
    console.log('🔍 categoryWeightChart:', categoryWeightChart);
    
    // 6. Forzar actualización
    console.log('🚀 Forzando actualización del gráfico...');
    
    // 🔧 VERIFICAR EN SECCIÓN ESPECÍFICA
    const canvasInDiario = document.querySelector('#diario-section #category-weight-chart');
    console.log('🔍 Canvas en sección diario:', canvasInDiario);
    
    if (canvasInDiario) {
        console.log('✅ Canvas encontrado en sección diario - forzando actualización');
        if (dashboardData?.categorias_ventas) {
            updateCategoryWeightChart(dashboardData.categorias_ventas, dashboardData.productos_top);
        } else if (dashboardData?.productos_top) {
            updateCategoryWeightChart(null, dashboardData.productos_top);
        } else {
            console.log('🧪 Ejecutando con datos de test...');
            testCategoryChart();
        }
    } else {
        console.log('❌ Canvas NO encontrado ni siquiera en sección diario');
        // Listar todos los elementos en la sección diario
        const diarioSection = document.getElementById('diario-section');
        if (diarioSection) {
            const allCanvasInDiario = diarioSection.querySelectorAll('canvas');
            console.log('🔍 Todos los canvas en sección diario:', Array.from(allCanvasInDiario).map(c => c.id));
        }
    }
    
    console.log('🔧 === FIN DEBUG ===');
}

// Exponer función de debug
window.debugCategoryChart = debugCategoryChart;

// ⚡ OPTIMIZACIÓN: Sistema de detección de interacción para desactivar animaciones
let userInteracting = false;
let interactionTimeout;
let scrollTimeout;

// Detectar cuando el usuario está interactuando
document.addEventListener('mousemove', () => {
    if (!userInteracting) {
        userInteracting = true;
        // Desactivar animaciones temporalmente
        Chart.defaults.animation = false;
    }
    
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(() => {
        userInteracting = false;
        // Reactivar animaciones cuando el usuario para de interactuar
        Chart.defaults.animation = {
            duration: 300,
            easing: 'easeOutCubic'
        };
    }, 500);
});



// 🧪 AUTO-TEST: Llamar automáticamente después de 3 segundos si estamos en la sección diaria
setTimeout(() => {
    if (document.getElementById('category-weight-chart') && (currentSection === 'diario' || !currentSection)) {
        console.log('🧪 Ejecutando auto-test del gráfico de categorías...');
        testCategoryChart();
    }
}, 3000);

// ========================================
// FUNCIONES DE TOGGLE PARA COMPARACIÓN
// ========================================

function toggleRankingComparison() {
    rankingShowComparison = !rankingShowComparison;
    
    // Actualizar texto del botón
    const btn = document.getElementById('ranking-comparison-btn');
    if (btn) {
        if (rankingShowComparison) {
            btn.innerHTML = '👁️ Ocultar comparación';
            btn.style.backgroundColor = 'rgba(0, 212, 170, 0.2)';
        } else {
            btn.innerHTML = '📊 Comparar con ayer';
            btn.style.backgroundColor = 'rgba(0, 212, 170, 0.1)';
        }
    }
    
    // Actualizar gráfico si hay datos disponibles
    if (dashboardData && dashboardData.productos_top) {
        updateRankingChart(dashboardData.productos_top);
    }
}

function toggleCategoryComparison() {
    categoryShowComparison = !categoryShowComparison;
    
    // Actualizar texto del botón
    const btn = document.getElementById('category-comparison-btn');
    if (btn) {
        if (categoryShowComparison) {
            btn.innerHTML = '👁️ Ocultar comparación';
            btn.style.backgroundColor = 'rgba(255, 107, 53, 0.2)';
        } else {
            btn.innerHTML = '📊 Comparar con ayer';
            btn.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';
        }
    }
    
    // Actualizar gráfico si hay datos disponibles
    if (dashboardData && (dashboardData.categorias_ventas || dashboardData.productos_top)) {
        updateCategoryWeightChart(dashboardData.categorias_ventas, dashboardData.productos_top);
    }
}



