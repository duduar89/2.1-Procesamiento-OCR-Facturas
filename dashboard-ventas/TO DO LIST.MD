hacer cambios en complete_sales_dashboard.js

🚀 IMPLEMENTACIÓN COMPLETA CON MÚLTIPLES LLAMADAS:
Te voy a dar el código completo paso a paso:
PASO 1: FUNCIÓN HELPER PARA LLAMADAS
javascript// FUNCIÓN HELPER: Llamar get-dashboard-data con fechas específicas
async function callGetDashboardData(fechaInicio, fechaFin, label = '') {
    const requestBody = {
        restaurante_id: RESTAURANT_ID,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        tipo_rango: 'week'
    };
    
    console.log(`📡 Llamando get-dashboard-data para ${label}: ${requestBody.fecha_inicio} - ${requestBody.fecha_fin}`);
    
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
        
        console.log(`✅ Datos recibidos para ${label}:`, result.data?.resumen?.total_ventas || 0, '€');
        return result.data;
        
    } catch (error) {
        console.error(`❌ Error cargando datos para ${label}:`, error);
        return null; // Devolver null si hay error, no romper todo el flujo
    }
}
PASO 2: FUNCIONES DE CÁLCULO DE FECHAS
javascript// FUNCIÓN: Calcular fechas de semana con offset
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
    
    return { inicio, fin };
}

// FUNCIÓN: Calcular fechas de semana equivalente año anterior  
function calculateSameWeekPreviousYear(currentWeekStart) {
    const añoAnterior = new Date(currentWeekStart);
    añoAnterior.setFullYear(añoAnterior.getFullYear() - 1);
    
    const inicio = new Date(añoAnterior);
    const fin = new Date(añoAnterior);
    fin.setDate(fin.getDate() + 6);
    
    return { inicio, fin };
}
PASO 3: FUNCIÓN PRINCIPAL DE CARGA
javascript// FUNCIÓN PRINCIPAL: Cargar análisis semanal
async function loadAnalisisSemanal() {
    console.log('📈 === CARGANDO ANÁLISIS SEMANAL ===');
    
    try {
        showLoadingState('semanal-section');
        
        // 1. Calcular fechas de la semana actual (o con offset)
        const weekDates = calculateWeekDates(currentWeekOffset);
        updateWeekDisplay(weekDates);
        
        // 2. Cargar datos comparativos con múltiples llamadas
        await loadWeeklyComparativeData(weekDates);
        
        // 3. Crear gráfico avanzado
        createAdvancedWeeklyChart();
        
        // 4. Actualizar métricas semanales
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
    
    // CALCULAR TODAS LAS FECHAS
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
    console.log('   Esta semana:', datosActual?.resumen?.total_ventas || 0, '€');
    console.log('   Semana anterior:', datosAnterior?.resumen?.total_ventas || 0, '€');
    console.log('   Mes pasado:', datosMesPasado?.resumen?.total_ventas || 0, '€');
    console.log('   Año pasado:', datosAñoPasado?.resumen?.total_ventas || 0, '€');
    
    return currentWeekData;
}
PASO 4: FUNCIÓN DEL GRÁFICO AVANZADO
javascript// FUNCIÓN: Crear gráfico avanzado con 4 líneas sombreadas
function createAdvancedWeeklyChart() {
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
    
    // SERIE 1: Esta semana (VERDE BRILLANTE)
    if (currentWeekData.actual?.ventas_por_dia) {
        const datosAcumulados = calculateAccumulatedSales(currentWeekData.actual.ventas_por_dia);
        datasets.push({
            label: 'Esta Semana',
            data: datosAcumulados,
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
        console.log('✅ Serie "Esta Semana" agregada:', datosAcumulados);
    }
    
    // SERIE 2: Semana anterior (GRIS)  
    if (currentWeekData.anterior?.ventas_por_dia) {
        const datosAcumulados = calculateAccumulatedSales(currentWeekData.anterior.ventas_por_dia);
        datasets.push({
            label: 'Semana Anterior',
            data: datosAcumulados,
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
        console.log('✅ Serie "Semana Anterior" agregada:', datosAcumulados);
    }
    
    // SERIE 3: Misma semana mes anterior (NARANJA)
    if (currentWeekData.mes_anterior?.ventas_por_dia) {
        const datosAcumulados = calculateAccumulatedSales(currentWeekData.mes_anterior.ventas_por_dia);
        datasets.push({
            label: 'Misma Semana Mes Pasado',
            data: datosAcumulados,
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
        console.log('✅ Serie "Mes Pasado" agregada:', datosAcumulados);
    }
    
    // SERIE 4: Misma semana año anterior (MORADO)
    if (currentWeekData.año_anterior?.ventas_por_dia) {
        const datosAcumulados = calculateAccumulatedSales(currentWeekData.año_anterior.ventas_por_dia);
        datasets.push({
            label: 'Misma Semana Año Pasado', 
            data: datosAcumulados,
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
        console.log('✅ Serie "Año Pasado" agregada:', datosAcumulados);
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
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#4b5563',
                    borderColor: '#e5e7eb',
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
                        color: '#374151'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.08)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: { size: 12, weight: '500' },
                        color: '#6b7280'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Ventas Acumuladas (€)',
                        font: { weight: 'bold', size: 14 },
                        color: '#374151'
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.08)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: { size: 12 },
                        color: '#6b7280',
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
}

// FUNCIÓN: Calcular ventas acumuladas día por día  
function calculateAccumulatedSales(ventasPorDia) {
    if (!ventasPorDia || ventasPorDia.length === 0) {
        console.log('⚠️ No hay datos de ventas por día, devolviendo array vacío');
        return [0, 0, 0, 0, 0, 0, 0];
    }
    
    let acumulado = 0;
    const resultados = [];
    
    // Procesar cada día de la semana (Lunes=0, Domingo=6)
    for (let i = 0; i < 7; i++) {
        // Buscar ventas de este día de la semana
        const ventasDelDia = ventasPorDia.find(v => {
            const fecha = new Date(v.fecha);
            const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
            const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a 0=Lunes, 6=Domingo
            return diaConvertido === i;
        });
        
        // Agregar al acumulado
        if (ventasDelDia && ventasDelDia.ventas > 0) {
            acumulado += ventasDelDia.ventas;
        }
        resultados.push(acumulado);
    }
    
    console.log('📈 Ventas acumuladas calculadas:', resultados);
    return resultados;
}
PASO 5: FUNCIONES AUXILIARES
javascript// FUNCIÓN: Actualizar métricas semanales
function updateWeeklyMetrics() {
    if (!currentWeekData?.actual?.resumen) return;
    
    const actual = currentWeekData.actual.resumen;
    const anterior = currentWeekData.anterior?.resumen;
    const mesPasado = currentWeekData.mes_anterior?.resumen;
    const añoPasado = currentWeekData.año_anterior?.resumen;
    
    // Actualizar total semana actual
    const totalElement = document.getElementById('total-semana-actual');
    if (totalElement) {
        totalElement.textContent = `€${actual.total_ventas?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    }
    
    // Calcular y mostrar cambios
    updateChangeIndicator('change-anterior', actual.total_ventas, anterior?.total_ventas);
    updateChangeIndicator('change-mes', actual.total_ventas, mesPasado?.total_ventas);
    updateChangeIndicator('change-año', actual.total_ventas, añoPasado?.total_ventas);
}

// FUNCIÓN: Actualizar indicador de cambio
function updateChangeIndicator(elementId, valorActual, valorAnterior) {
    const element = document.getElementById(elementId);
    if (!element || !valorActual || !valorAnterior) return;
    
    const cambio = ((valorActual - valorAnterior) / valorAnterior) * 100;
    const signo = cambio >= 0 ? '+' : '';
    
    element.textContent = `${signo}${cambio.toFixed(1)}%`;
    element.className = cambio >= 0 ? 'positive' : 'negative';
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

// VARIABLES GLOBALES
let weeklyChart = null;
let currentWeekData = null;
let currentWeekOffset = 0; // 0 = esta semana, -1 = semana anterior, +1 = siguiente
PASO 6: ACTUALIZAR showSection()
javascriptfunction showSection(section, event) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(section + '-section').classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    currentSection = section;
    
    switch(section) {
        case 'diario':
            // Código actual del dashboard
            if (dashboardData) {
                setTimeout(() => {
                    if (dashboardData.ventas_por_dia && dashboardData.ventas_por_dia.length > 0) {
                        updateSalesChart(dashboardData.ventas_por_dia);
                    }
                    if (dashboardData.metodos_pago) {
                        updatePaymentChart(dashboardData.metodos_pago);
                    }
                    if (dashboardData.ventas_por_hora && dashboardData.ventas_por_hora.length > 0) {
                        updateHourlyCharts(dashboardData.ventas_por_hora);
                        generateSalesHeatmap(dashboardData.ventas_por_hora);
                    }
                }, 100);
            }
            break;
        
        case 'semanal':
            loadAnalisisSemanal(); // 🎯 NUEVA FUNCIÓN
            break;
            
        case 'periodos':
            loadAnalisisPeriodos(); 
            break;
            
        case 'products':
            loadProductsData();
            if (dashboardData && dashboardData.productos_top) {
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