// ===== SISTEMA DE GESTIÓN MEJORADA DE TABLAS =====
// Versión 2.0 - Para Dashboard de Facturas

class TableManager {
    constructor() {
        this.tableSelector = '.facturas-table';
        this.tbodySelector = '.facturas-table tbody';
        this.theadSelector = '.facturas-table thead';
        this.initializeObserver();
    }

    // ✅ VALIDAR TODOS LOS ELEMENTOS DE TABLA
    validateTableElements() {
        const elements = {
            table: document.querySelector(this.tableSelector),
            tbody: document.querySelector(this.tbodySelector),
            thead: document.querySelector(this.theadSelector),
            tableEmpty: document.getElementById('tableEmpty'),
            tableLoading: document.getElementById('tableLoading')
        };

        const missing = [];
        const warnings = [];

        // Elementos críticos
        if (!elements.table) missing.push('tabla principal');
        if (!elements.tbody) missing.push('tbody');
        if (!elements.thead) missing.push('thead');

        // Elementos opcionales pero recomendados
        if (!elements.tableEmpty) warnings.push('tableEmpty');
        if (!elements.tableLoading) warnings.push('tableLoading');

        if (missing.length > 0) {
            console.error(`❌ Elementos críticos de tabla faltantes: ${missing.join(', ')}`);
            return null;
        }

        if (warnings.length > 0) {
            console.warn(`⚠️ Elementos opcionales de tabla faltantes: ${warnings.join(', ')}`);
        }

        console.log('✅ Todos los elementos críticos de tabla están disponibles');
        return elements;
    }

    // ✅ EJECUTAR OPERACIÓN DE TABLA CON VALIDACIÓN
    safeTableOperation(operation, fallback = null, operationName = 'operación de tabla') {
        const elements = this.validateTableElements();
        
        if (!elements) {
            console.error(`❌ No se puede ejecutar ${operationName} - elementos faltantes`);
            if (fallback) {
                console.log(`🔄 Ejecutando fallback para ${operationName}`);
                return fallback();
            }
            return false;
        }

        try {
            console.log(`🔄 Ejecutando ${operationName}...`);
            const result = operation(elements);
            console.log(`✅ ${operationName} completada exitosamente`);
            return result;
        } catch (error) {
            console.error(`❌ Error en ${operationName}:`, error);
            if (fallback) {
                console.log(`🔄 Ejecutando fallback para ${operationName} después del error`);
                return fallback();
            }
            return false;
        }
    }

    // ✅ LIMPIAR TABLA DE FORMA SEGURA
    clearTable() {
        return this.safeTableOperation((elements) => {
            elements.tbody.innerHTML = '';
            
            // Mostrar mensaje de tabla vacía si existe
            if (elements.tableEmpty) {
                elements.tableEmpty.style.display = 'block';
            }
            
            return true;
        }, () => {
            console.warn('⚠️ Fallback: No se pudo limpiar la tabla');
            return false;
        }, 'limpiar tabla');
    }

    // ✅ MOSTRAR ESTADO DE CARGA
    showLoading(message = 'Cargando datos...') {
        return this.safeTableOperation((elements) => {
            // Limpiar contenido actual
            elements.tbody.innerHTML = '';
            
            // Ocultar mensaje de tabla vacía
            if (elements.tableEmpty) {
                elements.tableEmpty.style.display = 'none';
            }
            
            // Mostrar loading
            if (elements.tableLoading) {
                elements.tableLoading.style.display = 'block';
                const loadingText = elements.tableLoading.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            } else {
                // Crear loading en tbody si no existe elemento dedicado
                elements.tbody.innerHTML = `
                    <tr class="loading-row">
                        <td colspan="100%" class="text-center py-4">
                            <div class="loading-spinner-small"></div>
                            <span class="ml-2">${message}</span>
                        </td>
                    </tr>
                `;
            }
            
            return true;
        }, null, 'mostrar loading');
    }

    // ✅ OCULTAR ESTADO DE CARGA
    hideLoading() {
        return this.safeTableOperation((elements) => {
            if (elements.tableLoading) {
                elements.tableLoading.style.display = 'none';
            }
            
            // Remover loading row si existe
            const loadingRow = elements.tbody.querySelector('.loading-row');
            if (loadingRow) {
                loadingRow.remove();
            }
            
            return true;
        }, null, 'ocultar loading');
    }

    // ✅ MOSTRAR MENSAJE DE TABLA VACÍA
    showEmptyMessage(message = 'No hay datos disponibles') {
        return this.safeTableOperation((elements) => {
            elements.tbody.innerHTML = '';
            this.hideLoading();
            
            if (elements.tableEmpty) {
                elements.tableEmpty.style.display = 'block';
                const messageElement = elements.tableEmpty.querySelector('.empty-message');
                if (messageElement) {
                    messageElement.textContent = message;
                }
            } else {
                // Crear mensaje en tbody si no existe elemento dedicado
                elements.tbody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="100%" class="text-center py-4 text-muted">
                            <div class="empty-state">
                                <div class="empty-icon">📋</div>
                                <p>${message}</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            return true;
        }, null, 'mostrar mensaje vacío');
    }

    // ✅ RENDERIZAR DATOS DE FORMA SEGURA
    renderData(data, renderFunction) {
        if (!Array.isArray(data)) {
            console.error('❌ Los datos deben ser un array');
            return false;
        }

        return this.safeTableOperation((elements) => {
            // Limpiar estados previos
            this.hideLoading();
            if (elements.tableEmpty) {
                elements.tableEmpty.style.display = 'none';
            }

            if (data.length === 0) {
                this.showEmptyMessage('No hay facturas disponibles');
                return true;
            }

            // Ejecutar función de renderizado
            if (typeof renderFunction === 'function') {
                const html = renderFunction(data);
                elements.tbody.innerHTML = html;
            } else {
                console.error('❌ renderFunction debe ser una función');
                return false;
            }

            console.log(`✅ Renderizados ${data.length} elementos en la tabla`);
            return true;
        }, () => {
            console.error('❌ Fallback: No se pudieron renderizar los datos');
            return false;
        }, 'renderizar datos');
    }

    // ✅ OBTENER FILAS SELECCIONADAS
    getSelectedRows() {
        return this.safeTableOperation((elements) => {
            const checkboxes = elements.tbody.querySelectorAll('input[type="checkbox"]:checked');
            const selectedRows = [];
            
            checkboxes.forEach(checkbox => {
                const row = checkbox.closest('tr');
                if (row) {
                    selectedRows.push({
                        element: row,
                        data: row.dataset,
                        id: checkbox.value
                    });
                }
            });
            
            return selectedRows;
        }, () => [], 'obtener filas seleccionadas');
    }

    // ✅ CONFIGURAR ORDENAMIENTO DE COLUMNAS
    setupSorting() {
        return this.safeTableOperation((elements) => {
            const sortableHeaders = elements.thead.querySelectorAll('.sortable');
            
            sortableHeaders.forEach(header => {
                header.style.cursor = 'pointer';
                header.addEventListener('click', (event) => {
                    const field = header.dataset.field;
                    const currentOrder = header.dataset.order || 'asc';
                    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                    
                    // Limpiar indicadores de otros headers
                    sortableHeaders.forEach(h => {
                        h.classList.remove('sorted-asc', 'sorted-desc');
                        delete h.dataset.order;
                    });
                    
                    // Aplicar nuevo orden
                    header.dataset.order = newOrder;
                    header.classList.add(`sorted-${newOrder}`);
                    
                    // Disparar evento personalizado
                    const sortEvent = new CustomEvent('tableSortChanged', {
                        detail: { field, order: newOrder }
                    });
                    document.dispatchEvent(sortEvent);
                });
            });
            
            console.log(`✅ Configurado ordenamiento para ${sortableHeaders.length} columnas`);
            return true;
        }, null, 'configurar ordenamiento');
    }

    // ✅ CONFIGURAR FILTROS DE TABLA
    setupFilters() {
        const filterInputs = document.querySelectorAll('[data-table-filter]');
        
        filterInputs.forEach(input => {
            input.addEventListener('input', (event) => {
                const filterType = input.dataset.tableFilter;
                const filterValue = input.value.toLowerCase().trim();
                
                const filterEvent = new CustomEvent('tableFilterChanged', {
                    detail: { type: filterType, value: filterValue }
                });
                document.dispatchEvent(filterEvent);
            });
        });
        
        console.log(`✅ Configurados ${filterInputs.length} filtros de tabla`);
        return true;
    }

    // ✅ OBSERVADOR DE CAMBIOS EN EL DOM
    initializeObserver() {
        if (typeof MutationObserver !== 'undefined') {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        // Re-validar elementos cuando cambie el DOM
                        this.validateTableElements();
                    }
                });
            });

            // Observar cambios en el body
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // ✅ DESTRUIR OBSERVADOR
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// ===== INSTANCIA GLOBAL =====
window.tableManager = new TableManager();

// ===== FUNCIONES DE CONVENIENCIA GLOBALES =====
window.safeTableOperation = (operation, fallback, name) => 
    window.tableManager.safeTableOperation(operation, fallback, name);

window.validateTableElements = () => 
    window.tableManager.validateTableElements();

// ===== FUNCIONES ESPECÍFICAS PARA EL DASHBOARD =====
window.dashboardTable = {
    // Renderizar facturas de forma segura
    renderFacturas(facturas) {
        return window.tableManager.renderData(facturas, (data) => {
            return data.map(factura => {
                return `
                    <tr data-factura-id="${factura.id}">
                        <td class="expand-column">
                            <button class="expand-btn" onclick="toggleFacturaDetails('${factura.id}')">
                                📦
                            </button>
                        </td>
                        <td class="estado-column">
                            <span class="status-badge status-${factura.estado}">${factura.estado}</span>
                        </td>
                        <td class="tipo-column">${factura.tipo_documento || 'N/A'}</td>
                        <td class="proveedor-column">${factura.proveedor_nombre || 'N/A'}</td>
                        <td class="numero-column">${factura.numero_factura || 'N/A'}</td>
                        <td class="fecha-column">${factura.fecha_factura || 'N/A'}</td>
                        <td class="total-column">${factura.total_factura ? formatCurrency(factura.total_factura) : 'N/A'}</td>
                        <td class="acciones-column">
                            <button class="btn-action primary" onclick="openFacturaModal('${factura.id}')">
                                Ver
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        });
    },

    // Mostrar loading específico para facturas
    showFacturasLoading() {
        return window.tableManager.showLoading('🔄 Cargando facturas...');
    },

    // Mostrar mensaje cuando no hay facturas
    showNoFacturas() {
        return window.tableManager.showEmptyMessage('📋 No hay facturas disponibles');
    },

    // Configurar eventos específicos del dashboard
    setupDashboardEvents() {
        // Configurar ordenamiento
        window.tableManager.setupSorting();
        
        // Configurar filtros
        window.tableManager.setupFilters();
        
        // Escuchar eventos de ordenamiento
        document.addEventListener('tableSortChanged', (event) => {
            const { field, order } = event.detail;
            console.log(`🔄 Ordenando por ${field} en orden ${order}`);
            
            if (typeof sortFacturasData === 'function') {
                sortFacturasData(field, order);
            }
        });
        
        // Escuchar eventos de filtrado
        document.addEventListener('tableFilterChanged', (event) => {
            const { type, value } = event.detail;
            console.log(`🔍 Filtrando ${type} por: ${value}`);
            
            if (typeof filterFacturasData === 'function') {
                filterFacturasData(type, value);
            }
        });
        
        console.log('✅ Eventos específicos del dashboard configurados');
    }
};

console.log('✅ Sistema de gestión mejorada de tablas cargado');