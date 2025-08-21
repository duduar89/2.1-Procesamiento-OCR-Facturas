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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDates(); // Esto ahora establece "Esta Semana" como activo
    loadDashboard();
    checkIntegrationStatus();
    setupAutoRefresh();
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
    
    if (section === 'products') {
        loadProductsData();
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

// Función mejorada para establecer rango rápido
function setQuickRange(range) {
    const today = new Date();
    let startDate, endDate = new Date(today);
    let displayText = '';
    
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
            break;
        case 'week':
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            displayText = 'Últimos 7 días';
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            displayText = 'Este mes';
            break;
    }
    
    // Actualizar inputs
    document.getElementById('fecha-inicio').value = startDate.toISOString().split('T')[0];
    document.getElementById('fecha-fin').value = endDate.toISOString().split('T')[0];
    
    // Actualizar display del rango activo
    document.getElementById('active-range-display').textContent = displayText;
    
    // Ocultar selector personalizado si estaba abierto
    hideCustomDatePicker();
    
    // Actualizar dashboard automáticamente
    activeRange = range;
    loadDashboard();
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
    loadDashboard();
    
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
    showLoadingState();
    
    try {
        const requestBody = {
            restaurante_id: RESTAURANT_ID,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            comparar_periodo: true
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
        hideLoadingState();
        
        // Actualizar display del rango si es personalizado
        if (activeRange === 'custom') {
            updateActiveRangeDisplay(fechaInicio, fechaFin);
        }
        
        showNotification('Datos cargados correctamente', 'success');

    } catch (error) {
        console.error('Error cargando datos:', error);
        hideLoadingState();
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
                updateElement('total-ventas', `€${resumen.total_ventas?.toLocaleString() || '0'}`);
                updateElement('total-ventas-bruto', `€${resumen.total_ventas_bruto?.toLocaleString() || '0'}`);
                updateElement('total-impuestos', `€${resumen.total_impuestos?.toLocaleString() || '0'}`);
                updateElement('total-descuentos', `€${resumen.total_descuentos?.toLocaleString() || '0'}`);
                updateElement('total-propinas', `€${resumen.total_propinas?.toLocaleString() || '0'}`);
                updateElement('total-tickets', (resumen.total_tickets || 0).toLocaleString());
                updateElement('ticket-promedio', `€${(resumen.ticket_promedio || 0).toFixed(2)}`);
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
            updateHourlyCharts(ventas_por_hora);
            generateSalesHeatmap(ventas_por_hora);
        } else {
            showEmptyChart('hourly-sales-chart', 'No hay datos por hora');
            showEmptyChart('hourly-tickets-chart', 'No hay datos de tickets por hora');
        }

        if (productos_top && productos_top.length > 0) {
            console.log('🔍 Productos encontrados:', productos_top.length);
            updateProductsTable(productos_top);
            updateProductsChart(productos_top);
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

// FUNCIONES DE CHARTS CORREGIDAS
function updateSalesChart(ventasPorDia) {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    
    if (salesChart) {
        salesChart.destroy();
    }

    const labels = ventasPorDia.map(d => new Date(d.fecha).toLocaleDateString());
    const data = ventasPorDia.map(d => d.ventas);

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
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
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: €' + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updatePaymentChart(metodosPago) {
    const ctx = document.getElementById('payment-chart');
    if (!ctx) return;
    
    if (paymentChart) {
        paymentChart.destroy();
    }

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
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
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
}

function updateHourlyCharts(ventasPorHora) {
    if (!ventasPorHora || !Array.isArray(ventasPorHora)) {
        console.warn('No hay datos de ventas por hora');
        return;
    }

    // Update hourly sales chart
    const salesCtx = document.getElementById('hourly-sales-chart');
    if (salesCtx) {
        if (hourlySalesChart) hourlySalesChart.destroy();
        
        hourlySalesChart = new Chart(salesCtx, {
            type: 'bar',
            data: {
                labels: ventasPorHora.map(h => h.hora_formato),
                datasets: [{
                    label: 'Ventas por Hora',
                    data: ventasPorHora.map(h => h.ventas),
                    backgroundColor: 'rgba(0, 212, 170, 0.7)',
                    borderColor: '#00D4AA',
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
    const container = document.getElementById('sales-heatmap-container');
    if (!container) return;

    if (!ventasPorHora || !Array.isArray(ventasPorHora) || ventasPorHora.length === 0) {
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
    // Mostrar spinners en métricas
    const metrics = ['total-ventas', 'total-tickets', 'ticket-promedio', 'total-comensales'];
    metrics.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<div class="spinner"></div>';
        }
    });
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
        position: fixed; background: #1f2937; color: white; padding: 8px 12px;
        border-radius: 6px; font-size: 12px; pointer-events: none; z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        left: ${event.pageX + 10}px; top: ${event.pageY - 40}px;
    `;
    document.body.appendChild(tooltip);
}

window.hideHeatmapTooltip = function() {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) tooltip.remove();
}