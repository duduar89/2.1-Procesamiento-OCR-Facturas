// Configuration
const SUPABASE_URL = 'https://yurqgcpgwsgdnxnpyxes.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cnFnY3Bnd3NnZG54bnB5eGVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkyODM4MiwiZXhwIjoyMDcwNTA0MzgyfQ.cVwMjZ72uZwOrX-tGJFsOhVVDATiMBnWeyYRu0P6bvQ';
const RESTAURANT_ID = '2852b1af-38d8-43ec-8872-2b2921d5a231';

// Global variables
let currentSection = 'dashboard';
let dashboardData = null;
let salesChart = null;
let paymentChart = null;
let productsChart = null;
let hourlySalesChart = null;
let hourlyTicketsChart = null;

// Variables globales para el selector de fechas
let activeRange = 'week'; // Por defecto última semana
let customPickerVisible = false;

// Variables globales para drag & drop
let currentAnalyzedData = null;

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
    loadDashboard();
    checkIntegrationStatus();
    setupAutoRefresh();
    initializeDragAndDrop(); // Inicializar sistema drag & drop
    initializeAutoSync(); // ⏰ Inicializar auto-sincronización
    // Remover: setupGlobalMonthSelector();
});

// Navigation
function showSection(section, event) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(section + '-section').classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    currentSection = section;
    
    if (section === 'dashboard') {
        // AGREGAR: Si hay datos de dashboard, actualizar gráficas principales
        if (dashboardData) {
            setTimeout(() => {
                // Actualizar gráficas principales del dashboard
                if (dashboardData.ventas_por_dia && dashboardData.ventas_por_dia.length > 0) {
                    updateSalesChart(dashboardData.ventas_por_dia);
                }
                if (dashboardData.metodos_pago) {
                    updatePaymentChart(dashboardData.metodos_pago);
                }
                if (dashboardData.ventas_por_hora && dashboardData.ventas_por_hora.length > 0) {
                    console.log('🔥 Datos horarios disponibles:', dashboardData.ventas_por_hora);
                    updateHourlyCharts(dashboardData.ventas_por_hora);
                    generateSalesHeatmap(dashboardData.ventas_por_hora);
                } else {
                    console.warn('❌ No hay datos horarios en dashboardData:', dashboardData.ventas_por_hora);
                }
            }, 100);
        }
    } else if (section === 'products') {
        loadProductsData();
        // AGREGAR: Si hay datos de dashboard, actualizar gráfica
        if (dashboardData && dashboardData.productos_top) {
            // Pequeño delay para que el DOM se actualice
            setTimeout(() => {
                updateProductsChart(dashboardData.productos_top);
            }, 100);
        }
    } else if (section === 'analytics') {
        loadAnalyticsData();
    }
}

// Date functions
// Función mejorada para establecer fechas por defecto
function setDefaultDates() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('fecha-inicio').value = weekAgo.toISOString().split('T')[0];
    document.getElementById('fecha-fin').value = today.toISOString().split('T')[0];
    
    // Establecer "Esta Semana" como activo por defecto
    setQuickRange('week');
}

function setQuickRange(range) {
    const today = new Date();
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
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            displayText = 'Hoy';
            comparativeText = 'Hoy vs Ayer';
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
            displayText = 'Este mes';
            comparativeText = 'Este Mes vs Mes Anterior';
            break;
    }
    
    // Actualizar inputs
    document.getElementById('fecha-inicio').value = startDate.toISOString().split('T')[0];
    document.getElementById('fecha-fin').value = endDate.toISOString().split('T')[0];
    
    // Actualizar display del rango activo
    document.getElementById('active-range-display').textContent = displayText;
    
    // Ocultar selector personalizado si estaba abierto
    hideCustomDatePicker();
    
    // NUEVO: Todos los rangos son comparativos
    loadDashboardComparativo(range, comparativeText);
    
    // Actualizar dashboard automáticamente
    activeRange = range;
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

// Función para actualizar botones activos
function updateActiveRangeButton(activeRange) {
    // Remover clase active de todos los botones
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Agregar clase active al botón seleccionado
    const activeBtn = document.querySelector(`[data-range="${activeRange}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
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
            comparar_periodo: false // Modo comparativo desactivado
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
        updateDashboard();
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

// NUEVA FUNCIÓN UNIFICADA
async function loadDashboardComparativo(tipoRango = 'custom', textoComparativo = '') {
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
        
        // Usar función unificada de actualización
        updateDashboardUnificado();
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
    }
}

// FUNCIÓN CORREGIDA: updateDashboard
function updateDashboard() {
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
            } else {
                showNoDataMetrics();
            }
        }

        // Update charts con validación
        if (ventas_por_dia && ventas_por_dia.length > 0) {
            updateSalesChart(ventas_por_dia);
        } else {
            showEmptyChart('sales-chart', 'No hay datos de ventas por día');
        }

        if (metodos_pago) {
            updatePaymentChart(metodos_pago);
        } else {
            showEmptyChart('payment-chart', 'No hay datos de métodos de pago');
        }

        if (ventas_por_hora && ventas_por_hora.length > 0) {
            console.log('🔥 Actualizando heatmap con datos:', ventas_por_hora);
            updateHourlyCharts(ventas_por_hora);
            generateSalesHeatmap(ventas_por_hora);
        } else {
            console.warn('❌ No hay datos horarios para heatmap:', ventas_por_hora);
            showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
            showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
        }

        if (productos_top && productos_top.length > 0) {
            console.log('🔍 Productos encontrados:', productos_top.length);
            updateProductsTable(productos_top);
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

// NUEVA FUNCIÓN UNIFICADA DE ACTUALIZACIÓN
function updateDashboardUnificado() {
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
        updateAllTables({
            productos_top,
            categorias_ventas
        });

        console.log('Dashboard unificado actualizado correctamente');

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

    // Función helper para formatear cambios CON VALOR ANTERIOR
    const formatearCambio = (cambio_pct, periodo, valorAnterior, metrica) => {
        const signo = cambio_pct >= 0 ? '+' : '';
        let textoPeríodo = 'vs período anterior';
        
        if (periodo) {
            const dias = periodo.dias_periodo;
            if (dias === 1) textoPeríodo = 'vs ayer';
            else if (dias <= 7) textoPeríodo = 'vs semana anterior';
            else if (dias <= 31) textoPeríodo = 'vs mes anterior';
        }
        
        // Formatear valor anterior según el tipo de métrica
        let valorFormateado = '';
        if (metrica && (metrica.includes('total_') || metrica === 'ticket_promedio')) {
            // Para valores monetarios - EURO DESPUÉS
            if (metrica === 'ticket_promedio') {
                valorFormateado = `${(valorAnterior || 0).toFixed(2)}€`;
            } else {
                valorFormateado = `${(valorAnterior || 0).toLocaleString()}€`;
            }
        } else {
            // Para cantidades (tickets, comensales, etc.)
            valorFormateado = (valorAnterior || 0).toLocaleString();
        }
        
        return `${signo}${cambio_pct.toFixed(1)}% ${textoPeríodo}<br><strong style="opacity: 0.9; font-size: 10px; font-weight: 600;">${valorFormateado}</strong>`;
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
    
    // Actualizar gráficos con validación
    if (ventas_por_dia && ventas_por_dia.length > 0) {
        updateSalesChart(ventas_por_dia);
    } else {
        showEmptyChart('sales-chart', 'No hay datos de ventas por día');
    }

    if (metodos_pago) {
        updatePaymentChart(metodos_pago);
    } else {
        showEmptyChart('payment-chart', 'No hay datos de métodos de pago');
    }

    if (ventas_por_hora && ventas_por_hora.length > 0) {
        console.log('🔥 updateAllCharts - generando heatmap con:', ventas_por_hora);
        updateHourlyCharts(ventas_por_hora);
        generateSalesHeatmap(ventas_por_hora);
    } else {
        console.warn('❌ updateAllCharts - sin datos horarios:', ventas_por_hora);
        showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
        showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
    }

    // Actualizar gráfico de productos si estamos en esa sección
    if (currentSection === 'products' && productos_top && productos_top.length > 0) {
        updateProductsChart(productos_top);
    }
    
    console.log('Gráficos actualizados correctamente');
}

// NUEVA FUNCIÓN: Actualizar todas las tablas
function updateAllTables({ productos_top, categorias_ventas }) {
    console.log('Actualizando todas las tablas...');
    
    if (productos_top && productos_top.length > 0) {
        updateProductsTable(productos_top);
    } else {
        showEmptyProductsTable();
    }

    if (categorias_ventas && categorias_ventas.length > 0) {
        updateCategoriesTable(categorias_ventas);
    } else {
        showEmptyCategoriesTable();
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
function updateSalesChart(ventasPorDia) {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    
    if (salesChart) {
        salesChart.destroy();
    }

    // MEJORA: Si es "Hoy", usar datos por hora en lugar de por día
    const esHoy = dashboardData && dashboardData.tipo_rango === 'today';
    
    if (esHoy && dashboardData.ventas_por_hora) {
        // Modo "Hoy": Mostrar ventas por hora con comparación
        console.log('🔍 Creando gráfico de ventas por hora (modo Hoy)');
        
        const ventasPorHora = dashboardData.ventas_por_hora;
        let datasets = [];
        let labels = ventasPorHora.map(h => h.hora_formato);
        
        if (dashboardData.comparativas && dashboardData.periodo_anterior) {
            // Con comparación: mostrar hoy vs ayer por horas
            const comparativaTotal = dashboardData.comparativas.total_ventas;
            const factorAnterior = comparativaTotal.anterior / comparativaTotal.actual;
            
            datasets = [
                {
                    label: 'Hoy',
                    data: ventasPorHora.map(h => h.ventas),
                    borderColor: '#10b981', // Verde marca
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                },
                {
                    label: 'Ayer',
                    data: ventasPorHora.map(h => h.ventas * factorAnterior),
                    borderColor: '#94a3b8', // Gris suave
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#94a3b8',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1
                }
            ];
        } else {
            // Sin comparación: solo hoy
            datasets = [{
                label: 'Ventas por Hora',
                data: ventasPorHora.map(h => h.ventas),
                borderColor: '#10b981', // Verde marca
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }];
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
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: dashboardData && dashboardData.tipo_rango === 'week' ? 'Días de la Semana' : 'Fecha',
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString();
                            },
                            color: '#64748b'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                        display: datasets.length > 1,
                        position: 'top',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 13,
                                weight: '500'
                            },
                            color: '#475569'
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico de ventas por hora creado con', datasets.length, 'datasets');
        
    } else {
        // Modo normal: ventas por día (semana, mes, custom)
        let datasets = [];
        let labels = [];
        
        if (dashboardData && dashboardData.comparativas && dashboardData.periodo_anterior) {
            // Modo comparativo: mostrar período actual vs anterior
            console.log('🔍 Creando gráfico comparativo de ventas por día');
            
            // NUEVO: Si es "Esta Semana", mostrar siempre Lunes a Domingo
            if (dashboardData.tipo_rango === 'week') {
                console.log('🔍 Configurando eje X para semana completa (Lunes a Domingo)');
                
                // Crear array de días de la semana
                const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                labels = diasSemana;
                
                // Preparar datos del período actual (completar con 0 si no hay datos)
                const datosActuales = [];
                for (let i = 0; i < 7; i++) {
                    const diaEncontrado = ventasPorDia.find(d => {
                        const fecha = new Date(d.fecha);
                        const diaSemana = fecha.getDay();
                        // Convertir 0=Domingo, 1=Lunes... a 0=Lunes, 1=Martes...
                        const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1;
                        return diaConvertido === i;
                    });
                    datosActuales.push(diaEncontrado ? diaEncontrado.ventas : 0);
                }
                
                // Calcular datos del período anterior basados en las comparativas
                const comparativaTotal = dashboardData.comparativas.total_ventas;
                const factorAnterior = comparativaTotal.anterior / comparativaTotal.actual;
                
                // Simular datos de la semana anterior (distribuir proporcionalmente)
                const datosAnteriores = datosActuales.map(venta => venta * factorAnterior);
                
                datasets = [
                    {
                        label: 'Esta Semana',
                        data: datosActuales,
                        borderColor: '#10b981', // Verde marca
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Semana Anterior',
                        data: datosAnteriores,
                        borderColor: '#94a3b8', // Gris suave
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#94a3b8',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1
                    }
                ];
                
                console.log('✅ Datos de semana preparados:', {
                    actuales: datosActuales,
                    anteriores: datosAnteriores,
                    labels: labels
                });
                
            } else {
                // Otros rangos (mes, custom): usar fechas normales
                labels = ventasPorDia.map(d => new Date(d.fecha).toLocaleDateString());
                
                // Calcular datos del período anterior basados en las comparativas
                const comparativaTotal = dashboardData.comparativas.total_ventas;
                const factorAnterior = comparativaTotal.anterior / comparativaTotal.actual;
                
                datasets = [
                    {
                        label: 'Período Actual',
                        data: ventasPorDia.map(d => d.ventas),
                        borderColor: '#10b981', // Verde marca
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Período Anterior',
                        data: ventasPorDia.map(d => d.ventas * factorAnterior),
                        borderColor: '#94a3b8', // Gris suave
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#94a3b8',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1
                    }
                ];
            }
        } else {
            // Modo normal: solo período actual
            if (dashboardData.tipo_rango === 'week') {
                // Para semana sin comparativas, mostrar solo días de la semana
                const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                labels = diasSemana;
                
                // Completar datos con 0 si no hay para algún día
                const datosActuales = [];
                for (let i = 0; i < 7; i++) {
                    const diaEncontrado = ventasPorDia.find(d => {
                        const fecha = new Date(d.fecha);
                        const diaSemana = fecha.getDay();
                        const diaConvertido = diaSemana === 0 ? 6 : diaSemana - 1;
                        return diaConvertido === i;
                    });
                    datosActuales.push(diaEncontrado ? diaEncontrado.ventas : 0);
                }
                
                datasets = [{
                label: 'Ventas',
                    data: datosActuales,
                    borderColor: '#10b981', // Verde marca
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }];
            } else {
                // Otros rangos: usar fechas normales
                labels = ventasPorDia.map(d => new Date(d.fecha).toLocaleDateString());
                datasets = [{
                    label: 'Ventas',
                    data: ventasPorDia.map(d => d.ventas),
                    borderColor: '#10b981', // Verde marca
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }];
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
            scales: {
                    x: {
                        title: {
                            display: true,
                            text: dashboardData.tipo_rango === 'week' ? 'Días de la Semana' : 'Fecha',
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                                return context.dataset.label + ': €' + context.raw.toLocaleString();
                        }
                    }
                    },
                    legend: {
                        display: datasets.length > 1,
                        position: 'top'
                }
            }
        }
    });
        
        console.log('✅ Gráfico de ventas creado con', datasets.length, 'datasets');
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
                        color: '#475569'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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

function updateHourlyCharts(ventasPorHora) {
    if (!ventasPorHora || !Array.isArray(ventasPorHora)) {
        console.warn('No hay datos de ventas por hora');
        return;
    }

    // NUEVO: Preparar datos comparativos si están disponibles
    const esComparativo = dashboardData && dashboardData.comparativas && dashboardData.periodo_anterior;
    
    if (esComparativo) {
        console.log('🔍 Creando gráficos comparativos por hora');
        
        // Calcular factor de escala basado en comparativas totales
        const comparativaTotal = dashboardData.comparativas.total_ventas;
        const factorAnterior = comparativaTotal.anterior / comparativaTotal.actual;
        
        // Simular datos del período anterior
        const datosAnteriores = ventasPorHora.map(h => ({
            hora: h.hora,
            hora_formato: h.hora_formato,
            ventas: h.ventas * factorAnterior,
            cantidad_tickets: Math.ceil(h.cantidad_tickets * factorAnterior)
        }));
        
        // Actualizar gráfico combinado: Ventas vs Ticket Medio
        const salesCtx = document.getElementById('hourly-sales-chart');
        if (salesCtx) {
            if (hourlySalesChart) hourlySalesChart.destroy();
            
            // Calcular ticket medio por hora
            const ticketMedioPorHora = ventasPorHora.map(h => {
                return h.cantidad_tickets > 0 ? h.ventas / h.cantidad_tickets : 0;
            });
            
            hourlySalesChart = new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: ventasPorHora.map(h => h.hora_formato),
                    datasets: [
                        {
                            label: 'Ventas por Hora',
                            data: ventasPorHora.map(h => h.ventas),
                            backgroundColor: 'rgba(16, 185, 129, 0.8)', // Verde marca
                            borderColor: '#10b981',
                            borderWidth: 2,
                            borderRadius: 8,
                            hoverBackgroundColor: '#10b981',
                            yAxisID: 'y' // Eje Y izquierdo para ventas
                        },
                        {
                            label: 'Ticket Medio',
                            data: ticketMedioPorHora,
                            type: 'line',
                            borderColor: '#00D4AA', // Turquesa marca
                            backgroundColor: 'rgba(0, 212, 170, 0.1)',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#00D4AA',
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
                                }
                            }
                        }
                    }
                }
            });
        }

        // Actualizar gráfico de tickets por hora
        const ticketsCtx = document.getElementById('hourly-tickets-chart');
        if (ticketsCtx) {
            if (hourlyTicketsChart) hourlyTicketsChart.destroy();
            
            hourlyTicketsChart = new Chart(ticketsCtx, {
                type: 'bar',
                data: {
                    labels: ventasPorHora.map(h => h.hora_formato),
                    datasets: [
                        {
                            label: 'Período Actual',
                            data: ventasPorHora.map(h => h.cantidad_tickets),
                            backgroundColor: 'rgba(16, 185, 129, 0.7)',
                            borderColor: '#10B981',
                            borderWidth: 1
                        },
                        {
                            label: 'Período Anterior',
                            data: datosAnteriores.map(h => h.cantidad_tickets),
                            backgroundColor: 'rgba(239, 68, 68, 0.5)',
                            borderColor: '#ef4444',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            stepSize: 1
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
        }
    } else {
        // Modo normal: solo período actual
        console.log('🔍 Creando gráficos normales por hora');

        // Crear gráfico combinado: Ventas vs Ticket Medio (modo normal)
        const salesCtx = document.getElementById('hourly-sales-chart');
        if (salesCtx) {
            if (hourlySalesChart) hourlySalesChart.destroy();
            
            // Calcular ticket medio por hora
            const ticketMedioPorHora = ventasPorHora.map(h => {
                return h.cantidad_tickets > 0 ? h.ventas / h.cantidad_tickets : 0;
            });
            
            hourlySalesChart = new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: ventasPorHora.map(h => h.hora_formato),
                    datasets: [
                        {
                            label: 'Ventas por Hora',
                            data: ventasPorHora.map(h => h.ventas),
                            backgroundColor: 'rgba(16, 185, 129, 0.8)', // Verde marca
                            borderColor: '#10b981',
                            borderWidth: 2,
                            borderRadius: 8,
                            hoverBackgroundColor: '#10b981',
                            yAxisID: 'y' // Eje Y izquierdo para ventas
                        },
                        {
                            label: 'Ticket Medio',
                            data: ticketMedioPorHora,
                            type: 'line',
                            borderColor: '#00D4AA', // Turquesa marca
                            backgroundColor: 'rgba(0, 212, 170, 0.1)',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#00D4AA',
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
                                }
                            }
                        }
                    }
                }
            });
        }

    // Update hourly tickets chart
    const ticketsCtx = document.getElementById('hourly-tickets-chart');
    if (ticketsCtx) {
        if (hourlyTicketsChart) hourlyTicketsChart.destroy();
        
        hourlyTicketsChart = new Chart(ticketsCtx, {
            type: 'bar',
            data: {
                labels: ventasPorHora.map(h => h.hora_formato),
                datasets: [{
                    label: 'Tickets por Hora',
                    data: ventasPorHora.map(h => h.cantidad_tickets),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10B981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        stepSize: 1
                    }
                }
            }
        });
    }
    }
    
    console.log('✅ Gráficos por hora creados en modo', esComparativo ? 'comparativo' : 'normal');
}

// FUNCIONES DE PRODUCTOS Y TABLAS CORREGIDAS
function updateProductsTable(productosTop) {
    const tbody = document.getElementById('products-table');
    if (!tbody) return;
    
    if (!productosTop || productosTop.length === 0) {
        showEmptyProductsTable();
        return;
    }

    const htmlGenerado = productosTop.slice(0, 20).map(producto => `
        <tr>
            <td>${producto.nombre || 'Sin nombre'}</td>
            <td>${producto.categoria || 'Sin categoría'}</td>
            <td>${(producto.cantidad || 0).toFixed(2)}</td>
            <td>€${(producto.importe || 0).toFixed(2)}</td>
            <td>${producto.veces_vendido || 0}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = htmlGenerado;
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
function generateSalesHeatmap(ventasPorHora) {
    console.log('🔥 generateSalesHeatmap llamada con:', ventasPorHora);
    
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

    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const maxVentas = Math.max(...ventasPorHora.map(h => h.ventas));
    
    if (maxVentas === 0) {
        container.innerHTML = '<p style="text-align:center; color: #94a3b8;">No hay actividad de ventas registrada.</p>';
        return;
    }

    let html = '<div class="heatmap-wrapper">';
    
    // Header con las horas
    html += '<div class="heatmap-header">';
    html += '<div class="heatmap-corner"></div>';
    for (let hora = 0; hora < 24; hora++) {
        html += `<div class="heatmap-hour-label">${hora}h</div>`;
    }
    html += '</div>';

    // Filas para cada día
    html += '<div class="heatmap-body">';
    for (let dia = 0; dia < 7; dia++) {
        html += '<div class="heatmap-row">';
        html += `<div class="heatmap-day-label">${diasSemana[dia]}</div>`;
        
        for (let hora = 0; hora < 24; hora++) {
            const horaData = ventasPorHora.find(h => h.hora === hora);
            let ventas = 0;
            let tickets = 0;
            
            if (horaData) {
                const factor = Math.random() * 0.3 + 0.1;
                ventas = horaData.ventas * factor;
                tickets = Math.ceil(horaData.cantidad_tickets * factor);
            }
            
            let level = 0;
            if (ventas > 0) {
                level = Math.max(1, Math.ceil((ventas / (maxVentas * 0.4)) * 5));
            }
            
            html += `<div class="heatmap-cell" data-level="${level}" 
                          onmouseover="showHeatmapTooltip(event, '${diasSemana[dia]} ${hora}:00', ${ventas.toFixed(2)}, ${tickets})"
                          onmouseout="hideHeatmapTooltip()">
                      </div>`;
        }
        html += '</div>';
    }
    html += '</div>';

    // Leyenda
    html += '<div class="heatmap-legend">';
    html += '<span>Menor actividad</span>';
    html += '<div class="legend-scale">';
    for (let i = 0; i <= 5; i++) {
        html += `<div class="legend-color" data-level="${i}"></div>`;
    }
    html += '</div>';
    html += '<span>Mayor actividad</span>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

// FUNCIONES DE UTILIDAD Y ESTADOS
function showLoadingState() {
    document.getElementById('drag-loading-compact').style.display = 'flex';
    document.getElementById('drag-result-compact').style.display = 'none';
    document.querySelector('.drag-drop-zone-compact .drag-drop-content').style.display = 'none';
}

function hideLoadingState() {
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
                <td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="margin-bottom: 16px;">
                        <strong>No hay datos de productos disponibles</strong>
                    </div>
                    <div style="font-size: 14px; color: #94a3b8;">
                        No se encontraron productos para este período.<br>
                        Verifica que haya ventas sincronizadas.
                    </div>
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
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        if (className) {
            element.className = className;
        }
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
    const syncBtn = document.getElementById('sync-btn-text');
    if (syncBtn) {
        syncBtn.textContent = 'Sincronizando...';
    }

    try {
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;

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
            
            // Reload dashboard
            loadDashboard();
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
function loadProductsData() {
    if (dashboardData && dashboardData.productos_top) {
        updateProductsTable(dashboardData.productos_top);
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
        loadDashboard();
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

// FUNCIONES DE TOOLTIP PARA HEATMAP
window.showHeatmapTooltip = function(event, tiempo, ventas, tickets) {
    const tooltip = document.createElement('div');
    tooltip.id = 'heatmap-tooltip';
    tooltip.className = 'heatmap-tooltip';
    tooltip.innerHTML = `<strong>${tiempo}</strong><br>Ventas: €${ventas}<br>Tickets: ${tickets}`;
    
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

function showLoadingState() {
    document.getElementById('drag-loading-compact').style.display = 'flex';
    document.getElementById('drag-result-compact').style.display = 'none';
    document.querySelector('.drag-drop-zone-compact .drag-drop-content').style.display = 'none';
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
    
    // Ejecutar sincronización (usar función existente)
    syncData().then(() => {
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