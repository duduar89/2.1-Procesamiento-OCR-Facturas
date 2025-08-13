// ===== MODAL HÍBRIDO DE PDF - COMBINA ESTRUCTURA ORIGINAL + FUNCIONALIDADES AVANZADAS =====

class HybridPDFModal {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.pdfDocument = null;
        this.coordinates = {};
        this.extractedData = {};
        
        this.init();
    }

    init() {
        console.log('🚀 Inicializando Modal Híbrido de PDF...');
        this.setupEnhancedPDFControls();
        this.setupCoordinateOverlay();
        this.setupAdvancedFeatures();
    }

    // ===== CONFIGURAR CONTROLES MEJORADOS DEL PDF =====
    setupEnhancedPDFControls() {
        // Solo controles de navegación
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.changePage(-1));
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.changePage(1));
        }
        
        // Añadir controles de coordenadas
        this.createCoordinateControls();
    }



    // ===== CREAR CONTROLES DE COORDENADAS =====
    createCoordinateControls() {
        const pdfViewerHeader = document.querySelector('.pdf-viewer-header');
        if (!pdfViewerHeader) return;

        const coordinateControls = document.createElement('div');
        coordinateControls.className = 'coordinate-controls';
        coordinateControls.innerHTML = `
            <div class="coordinate-toggle">
                <label>
                    <input type="checkbox" id="showCoordinates" checked>
                    Mostrar Coordenadas
                </label>
            </div>
            <div class="confidence-filter">
                <select id="confidenceFilter">
                    <option value="all">Todas las confianzas</option>
                    <option value="high">Alta confianza (≥90%)</option>
                    <option value="medium">Media confianza (70-89%)</option>
                    <option value="low">Baja confianza (<70%)</option>
                </select>
            </div>
        `;

        // Insertar después del título
        const title = pdfViewerHeader.querySelector('h3');
        if (title) {
            title.parentNode.insertBefore(coordinateControls, title.nextSibling);
        }

        // Event listeners
        const showCoordinatesCheckbox = document.getElementById('showCoordinates');
        const confidenceFilter = document.getElementById('confidenceFilter');

        if (showCoordinatesCheckbox) {
            showCoordinatesCheckbox.addEventListener('change', (e) => {
                this.toggleCoordinateOverlay(e.target.checked);
            });
        }

        if (confidenceFilter) {
            confidenceFilter.addEventListener('change', (e) => {
                this.filterCoordinatesByConfidence(e.target.value);
            });
        }
    }
    


    // ===== CONFIGURAR OVERLAY DE COORDENADAS =====
    setupCoordinateOverlay() {
        // 🔥 USAR EL CONTENEDOR EXISTENTE en lugar de crear uno nuevo
        const existingOverlay = document.getElementById('coordinatesOverlay');
        if (existingOverlay) {
            console.log('✅ Usando contenedor de coordenadas existente');
            return; // Ya existe, no crear uno nuevo
        }
        
        // Solo crear si no existe (fallback)
        const pdfContainer = document.querySelector('.pdf-container');
        if (!pdfContainer) return;

        console.log('⚠️ Creando contenedor de coordenadas de respaldo');
        const overlayContainer = document.createElement('div');
        overlayContainer.className = 'coordinates-overlay-container';
        overlayContainer.id = 'coordinatesOverlay';
        overlayContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;

        pdfContainer.style.position = 'relative';
        pdfContainer.appendChild(overlayContainer);
    }

    // ===== CONFIGURAR FUNCIONALIDADES AVANZADAS =====
    setupAdvancedFeatures() {
        // Solo atajos de teclado básicos
        this.setupKeyboardShortcuts();
    }



    // ===== FUNCIONES DE NAVEGACIÓN =====
    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= this.totalPages) {
            this.currentPage = newPage;
            this.renderPage(this.currentPage);
            this.updatePageInfo();
            this.updateCoordinateOverlay();
        }
    }

    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
        }
    }



    // ===== FUNCIONES DE TECLADO Y ZOOM =====
    setupKeyboardShortcuts() {
        // ✅ TECLADO
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('input, select, textarea')) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.changePage(-1);
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.changePage(1);
                    }
                    break;
            }
        });
        

    }

    // ===== FUNCIONES DE COORDENADAS =====
    loadCoordinates(coordinates, extractedData) {
        // Validar y limpiar datos de entrada
        this.coordinates = {};
        this.extractedData = {};
        
        console.log('🔍 loadCoordinates llamado con:', {
            coordinates: coordinates,
            extractedData: extractedData
        });
        
        if (coordinates && typeof coordinates === 'object') {
            // Filtrar solo coordenadas válidas
            Object.entries(coordinates).forEach(([fieldName, fieldData]) => {
                if (fieldData && typeof fieldData === 'object' && 
                    fieldData.x !== undefined && fieldData.y !== undefined && 
                    fieldData.width !== undefined && fieldData.height !== undefined) {
                    this.coordinates[fieldName] = fieldData;
                    console.log(`✅ Coordenadas válidas para ${fieldName}:`, fieldData);
                } else {
                    console.log('⚠️ Coordenadas inválidas para campo:', fieldName, fieldData);
                }
            });
        }
        
        if (extractedData && typeof extractedData === 'object') {
            this.extractedData = extractedData;
            console.log('✅ Datos extraídos asignados:', this.extractedData);
        } else {
            console.log('⚠️ No se recibieron datos extraídos válidos');
        }
        
        console.log('📍 Coordenadas válidas cargadas:', Object.keys(this.coordinates).length);
        console.log('📊 Datos extraídos cargados:', Object.keys(this.extractedData).length);
        console.log('🔍 Estado final:', {
            coordinates: this.coordinates,
            extractedData: this.extractedData
        });
        
        // ✅ VERIFICAR QUE EL CANVAS ESTÉ LISTO ANTES DE POSICIONAR
        const canvas = document.getElementById('pdfCanvas');
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            this.updateCoordinateOverlay();
            this.updateConfidenceStats();
            this.showDebugInfo();
            
            // ✅ RELLENAR AUTOMÁTICAMENTE LOS CAMPOS DEL FORMULARIO
            this.fillFormFields();
        } else {
            console.log('⚠️ Canvas no está listo, esperando...');
            // ✅ REINTENTAR EN 200ms
            setTimeout(() => {
                this.loadCoordinates(coordinates, extractedData);
            }, 200);
        }
    }

    updateCoordinateOverlay() {
        const overlayContainer = document.getElementById('coordinatesOverlay');
        if (!overlayContainer) return;

        // Limpiar overlays existentes
        overlayContainer.innerHTML = '';

        // Crear overlays para cada campo
        Object.entries(this.coordinates).forEach(([fieldName, fieldData]) => {
            if (fieldData && typeof fieldData === 'object') {
                const overlay = this.createFieldOverlay(fieldName, fieldData);
                if (overlay) {
                    overlayContainer.appendChild(overlay);
                }
            }
        });
    }

    createFieldOverlay(fieldName, fieldData) {
        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) return null;
        
        // ✅ USAR EL TAMAÑO VISUAL REAL DEL CANVAS (getBoundingClientRect)
        const canvasRect = canvas.getBoundingClientRect();
        const visualWidth = canvasRect.width;   // 499 (tamaño real en pantalla)
        const visualHeight = canvasRect.height; // 665 (tamaño real en pantalla)
        
        // ✅ VERIFICAR QUE EL CANVAS TENGA TAMAÑO VÁLIDO
        if (visualWidth === 0 || visualHeight === 0) {
            console.log('⚠️ Canvas sin tamaño visual válido, esperando...');
            return null;
        }
        
        // ✅ CALCULAR ESCALA VISUAL REAL (tamaño visual vs tamaño interno)
        const scaleX = visualWidth / 595;   // 499/595 = 0.838
        const scaleY = visualHeight / 842;  // 665/842 = 0.790
        
        // ✅ APLICAR ESCALA A LAS COORDENADAS
        const x = fieldData.x * scaleX;
        const y = fieldData.y * scaleY;
        const width = fieldData.width * scaleX;
        const height = fieldData.height * scaleY;
        
        // ✅ APLICAR OFFSET DEL CANVAS (está centrado en el contenedor)
        const container = document.querySelector('.pdf-container');
        let finalX = x;
        let finalY = y;
        
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const offsetX = canvasRect.left - containerRect.left;
            const offsetY = canvasRect.top - containerRect.top;
            
            // ✅ POSICIÓN FINAL CON OFFSET
            finalX = x + offsetX;
            finalY = y + offsetY;
            
            console.log(`🔍 Posicionando ${fieldName}:`, {
                scaled: { x: Math.round(x), y: Math.round(y) },
                offset: { x: Math.round(offsetX), y: Math.round(offsetY) },
                final: { x: Math.round(finalX), y: Math.round(finalY) }
            });
        }
        
        console.log(`🔍 Escalando ${fieldName}:`, {
            original: fieldData,
            canvasInternal: { width: canvas.width, height: canvas.height },
            canvasVisual: { width: Math.round(visualWidth), height: Math.round(visualHeight) },
            scale: { scaleX: scaleX.toFixed(3), scaleY: scaleY.toFixed(3) },
            scaled: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
        });
        
        // ✅ CREAR EL OVERLAY DESPUÉS DE CALCULAR TODO
        const confidence = fieldData.confidence !== undefined ? fieldData.confidence : 0.5;
        const color = this.getConfidenceColor(confidence);
        
        const overlay = document.createElement('div');
        overlay.className = 'field-overlay';
        overlay.setAttribute('data-field', fieldName);
        overlay.setAttribute('data-confidence', confidence.toString());
        
        overlay.style.cssText = `
            position: absolute;
            left: ${finalX}px;
            top: ${finalY}px;
            width: ${width}px;
            height: ${height}px;
            border: 2px solid ${color};
            background: ${color}20;
            pointer-events: auto;
            cursor: pointer;
            transition: all 0.2s ease;
            z-index: 15;
        `;
        
        // Tooltip con información del campo
        const tooltip = document.createElement('div');
        tooltip.className = 'field-tooltip';
        
        // ✅ DEBUG: Ver qué datos tenemos disponibles
        const fieldValue = this.extractedData[fieldName];
        console.log(`🔍 Tooltip para ${fieldName}:`, {
            fieldName,
            fieldValue,
            extractedDataKeys: Object.keys(this.extractedData),
            extractedData: this.extractedData
        });
        
        tooltip.innerHTML = `
            <strong>${this.getFieldLabel(fieldName)}</strong><br>
            Valor: ${fieldValue !== undefined ? fieldValue : 'N/A'}<br>
            Confianza: ${Math.round(confidence * 100)}%
        `;
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
            z-index: 20;
        `;

        overlay.appendChild(tooltip);

        // Eventos del overlay
        overlay.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            overlay.style.transform = 'scale(1.05)';
            overlay.style.zIndex = '25';
        });

        overlay.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            overlay.style.transform = 'scale(1)';
            overlay.style.zIndex = '15';
        });

        overlay.addEventListener('click', () => {
            this.highlightField(fieldName);
        });

        return overlay;
    }

    getConfidenceColor(confidence) {
        if (confidence >= 0.9) return '#10b981'; // Verde - Alta confianza
        if (confidence >= 0.7) return '#f59e0b'; // Amarillo - Media confianza
        return '#ef4444'; // Rojo - Baja confianza
    }

    getFieldLabel(fieldName) {
        const labels = {
            numero_factura: 'Número de Factura',
            proveedor_nombre: 'Nombre del Proveedor',
            proveedor_cif: 'CIF del Proveedor',
            fecha_factura: 'Fecha de Factura',
            importe_neto: 'Importe Neto',
            iva: 'IVA',
            total_factura: 'Total Factura',
            base_imponible: 'Base Imponible'
        };
        return labels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // ===== FUNCIONES DE FILTRADO =====
    toggleCoordinateOverlay(show) {
        const overlayContainer = document.getElementById('coordinatesOverlay');
        if (overlayContainer) {
            overlayContainer.style.display = show ? 'block' : 'none';
        }
    }

    filterCoordinatesByConfidence(confidenceLevel) {
        const overlays = document.querySelectorAll('.field-overlay');
        
        overlays.forEach(overlay => {
            const confidence = parseFloat(overlay.dataset.confidence) || 0.5;
            let shouldShow = true;

            switch (confidenceLevel) {
                case 'high':
                    shouldShow = confidence >= 0.9;
                    break;
                case 'medium':
                    shouldShow = confidence >= 0.7 && confidence < 0.9;
                    break;
                case 'low':
                    shouldShow = confidence < 0.7;
                    break;
                default:
                    shouldShow = true;
            }

            overlay.style.display = shouldShow ? 'block' : 'none';
        });
    }

    // ===== FUNCIONES DE RESALTADO =====
    highlightField(fieldName) {
        // Remover resaltado anterior
        document.querySelectorAll('.field-overlay').forEach(overlay => {
            overlay.style.boxShadow = 'none';
        });

        // Resaltar campo específico
        const fieldOverlays = document.querySelectorAll(`[data-field="${fieldName}"]`);
        fieldOverlays.forEach(overlay => {
            overlay.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        });

        // Resaltar en el formulario
        const formField = document.getElementById(fieldName);
        if (formField) {
            formField.style.backgroundColor = '#fef3c7';
            formField.style.borderColor = '#f59e0b';
            setTimeout(() => {
                formField.style.backgroundColor = '';
                formField.style.borderColor = '';
            }, 2000);
        }
    }

    // ===== FUNCIONES DE ESTADÍSTICAS =====
    updateConfidenceStats() {
        const coordinates = Object.values(this.coordinates);
        const totalFields = coordinates.length;
        
        if (totalFields === 0) return;

        // Filtrar solo coordenadas válidas con propiedades de confianza
        const validCoordinates = coordinates.filter(f => f && typeof f === 'object' && f.confidence !== undefined);
        
        if (validCoordinates.length === 0) {
            console.log('⚠️ No hay coordenadas válidas con confianza para calcular estadísticas');
            return;
        }

        const highConfidence = validCoordinates.filter(f => f.confidence >= 0.9).length;
        const mediumConfidence = validCoordinates.filter(f => f.confidence >= 0.7 && f.confidence < 0.9).length;
        const lowConfidence = validCoordinates.filter(f => f.confidence < 0.7).length;
        
        const globalConfidence = validCoordinates.reduce((sum, f) => sum + (f.confidence || 0), 0) / validCoordinates.length;

        // Actualizar estadísticas en el panel derecho si existe
        this.updateStatsDisplay({
            totalFields: validCoordinates.length,
            highConfidence,
            mediumConfidence,
            lowConfidence,
            globalConfidence
        });
    }

    updateStatsDisplay(stats) {
        // ✅ SOLO BUSCAR ELEMENTOS DENTRO DEL MODAL ACTUAL
        const modal = document.querySelector('.modal.active, .facturaModal.active');
        if (!modal) {
            console.log('⚠️ No se encontró modal activo para actualizar estadísticas');
            return;
        }
        
        // Buscar elementos de estadísticas SOLO dentro del modal
        const confidenceElements = modal.querySelectorAll('[id*="confianza"], [id*="confidence"]');
        
        if (confidenceElements.length === 0) {
            console.log('ℹ️ No se encontraron elementos de confianza en el modal');
            return;
        }
        
        confidenceElements.forEach(element => {
            if (element.id.includes('global') || element.id.includes('confianza_global')) {
                element.textContent = `${Math.round(stats.globalConfidence * 100)}%`;
                console.log(`✅ Actualizado elemento: ${element.id} = ${Math.round(stats.globalConfidence * 100)}%`);
            }
        });

        console.log('📊 Estadísticas actualizadas en modal:', stats);
    }
    
    // ===== FUNCIÓN PARA RELLENAR CAMPOS DEL FORMULARIO =====
    fillFormFields() {
        console.log('🔍 Rellenando campos del formulario con datos extraídos...');
        
        // ✅ DEBUG COMPLETO: Ver TODOS los datos disponibles
        console.log('🔍 DATOS COMPLETOS DISPONIBLES:', {
            extractedData: this.extractedData,
            extractedDataKeys: Object.keys(this.extractedData),
            extractedDataValues: Object.values(this.extractedData),
            extractedDataEntries: Object.entries(this.extractedData)
        });
        
        // ✅ MAPEO DE CAMPOS: Nombre del campo extraído -> ID del campo del formulario
        const fieldMapping = {
            'numero_factura': 'numeroFactura',
            'fecha_factura': 'fechaFactura',
            'proveedor_nombre': 'proveedor',
            'proveedor_cif': 'cifProveedor',
            'proveedor_provincia': 'provinciaProveedor',
            'fecha_vencimiento': 'fechaVencimiento',
            // ✅ CAMPOS MONETARIOS CON NOMBRES CORRECTOS DE LA EDGE FUNCTION
            'base_imponible': 'importeBase',         // Campo real de la edge function
            'cuota_iva': 'cuotaIva',                 // Campo real de la edge function
            'total_factura': 'totalConIva',
            'retencion': 'retencion'
        };
        
        // ✅ DEBUG: Ver qué campos del formulario existen
        console.log('🔍 BUSCANDO CAMPOS DEL FORMULARIO...');
        Object.values(fieldMapping).forEach(formFieldId => {
            const formField = document.getElementById(formFieldId);
            if (formField) {
                console.log(`✅ Campo encontrado: ${formFieldId} (${formField.tagName})`);
            } else {
                console.log(`❌ Campo NO encontrado: ${formFieldId}`);
            }
        });
        
        // ✅ RELLENAR CADA CAMPO
        Object.entries(fieldMapping).forEach(([extractedField, formFieldId]) => {
            const extractedValue = this.extractedData[extractedField];
            
            if (extractedValue !== undefined && extractedValue !== null) {
                const formField = document.getElementById(formFieldId);
                
                if (formField) {
                    // ✅ FORMATO ESPECIAL PARA CAMPOS MONETARIOS
                    let displayValue = extractedValue;
                    
                    if (['base_imponible', 'cuota_iva', 'total_factura', 'retencion'].includes(extractedField)) {
                        // ✅ CONVERTIR CENTAVOS A EUROS (4000 -> 40.00)
                        if (typeof extractedValue === 'number') {
                            if (extractedValue > 100) {
                                // Es centavos, convertir a euros
                                displayValue = (extractedValue / 100).toFixed(2);
                            } else {
                                // Ya está en euros, mantener formato
                                displayValue = extractedValue.toFixed(2);
                            }
                        }
                        // ✅ APLICAR FORMATO ESPAÑOL (comas para decimales)
                        displayValue = displayValue.replace('.', ',');
                        displayValue = `€${displayValue}`;
                    }
                    
                    // ✅ APLICAR VALOR AL CAMPO
                    if (formField.tagName === 'INPUT' || formField.tagName === 'SELECT') {
                        formField.value = displayValue;
                    } else {
                        formField.textContent = displayValue;
                    }
                    
                    console.log(`✅ Campo rellenado: ${formFieldId} = ${displayValue} (de ${extractedField}: ${extractedValue})`);
                } else {
                    console.log(`⚠️ Campo no encontrado: ${formFieldId}`);
                }
            } else {
                console.log(`ℹ️ Sin datos para: ${extractedField}`);
            }
        });
        
        console.log('✅ Formulario rellenado completamente');
    }
    
    // 🔥 DEBUG: Mostrar información visual del contenedor y canvas
    showDebugInfo() {
        const canvas = document.getElementById('pdfCanvas');
        const container = document.querySelector('.pdf-container');
        
        if (!canvas || !container) return;
        
        // Crear overlay de debug
        const debugOverlay = document.createElement('div');
        debugOverlay.className = 'debug-overlay';
        debugOverlay.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            z-index: 1000;
            max-width: 300px;
        `;
        
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        debugOverlay.innerHTML = `
            <strong>🔍 DEBUG INFO</strong><br>
            <strong>Canvas:</strong><br>
            - Pos: (${Math.round(canvasRect.left)}, ${Math.round(canvasRect.top)})<br>
            - Size: ${Math.round(canvasRect.width)} x ${Math.round(canvasRect.height)}<br>
            <strong>Container:</strong><br>
            - Pos: (${Math.round(containerRect.left)}, ${Math.round(containerRect.top)})<br>
            - Size: ${Math.round(containerRect.width)} x ${Math.round(containerRect.height)}<br>
            <strong>Offset:</strong><br>
            - X: ${Math.round(canvasRect.left - containerRect.left)}<br>
            - Y: ${Math.round(canvasRect.top - containerRect.top)}<br>
            <strong>Coordenadas:</strong><br>
            - Total: ${Object.keys(this.coordinates).length}<br>
            - Campos: ${Object.keys(this.coordinates).join(', ')}
        `;
        
        // Añadir al contenedor
        container.appendChild(debugOverlay);
        
        // Remover después de 10 segundos
        setTimeout(() => {
            if (debugOverlay.parentNode) {
                debugOverlay.parentNode.removeChild(debugOverlay);
            }
        }, 10000);
    }

    // ===== FUNCIONES DE CARGA DE PDF =====
    async loadPDF(pdfUrl) {
        try {
            console.log('📄 Cargando PDF desde:', pdfUrl);
            
            if (!pdfjsLib) {
                throw new Error('PDF.js no está disponible');
            }

            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            this.pdfDocument = await loadingTask.promise;
            
            this.totalPages = this.pdfDocument.numPages;
            this.currentPage = 1;
            
            console.log(`✅ PDF cargado: ${this.totalPages} páginas`);
            
            // Renderizar primera página
            await this.renderPage(1);
            
            // Actualizar controles
            this.updatePageInfo();
            this.updatePageControls();
            
        } catch (error) {
            console.error('❌ Error cargando PDF:', error);
            throw error;
        }
    }

    async renderPage(pageNumber) {
        try {
            const page = await this.pdfDocument.getPage(pageNumber);
            const canvas = document.getElementById('pdfCanvas');
            const placeholder = document.getElementById('pdfPlaceholder');
            
            if (!canvas || !placeholder) return;

            // ✅ ESCALA FIJA 1:1 - Sin manipulación
            const viewport = page.getViewport({ scale: 1.0 });
            
            console.log('🔍 PDF renderizando con escala 1:1:', { 
                viewport: { width: viewport.width, height: viewport.height }
            });
            
            const context = canvas.getContext('2d');

            // ✅ CONFIGURAR CANVAS CORRECTAMENTE
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // ✅ NO forzar CSS - dejar que se ajuste naturalmente
            // canvas.style.width = viewport.width + 'px';
            // canvas.style.height = viewport.height + 'px';

            // Renderizar página con escala 1:1
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Mostrar canvas y ocultar placeholder
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            // ✅ ESPERAR A QUE EL CANVAS SE RENDERICE COMPLETAMENTE
            setTimeout(() => {
                this.updateCoordinateOverlay();
            }, 100);

            console.log(`✅ Página ${pageNumber} renderizada con escala 1:1`);

        } catch (error) {
            console.error(`❌ Error renderizando página ${pageNumber}:`, error);
        }
    }

    updatePageControls() {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    // ===== FUNCIÓN PRINCIPAL DE APERTURA =====
    async open(pdfUrl, coordinates, extractedData) {
        try {
            console.log('🚀 Abriendo modal híbrido con PDF y coordenadas...');
            
            // ✅ PRIMERO CARGAR PDF, LUEGO COORDENADAS
            await this.loadPDF(pdfUrl);
            
            // ✅ CARGAR COORDENADAS DESPUÉS DEL PDF
            this.loadCoordinates(coordinates, extractedData);
            
            console.log('✅ Modal híbrido abierto correctamente');
            
        } catch (error) {
            console.error('❌ Error abriendo modal híbrido:', error);
            throw error;
        }
    }
}

// ===== INICIALIZACIÓN GLOBAL =====
let hybridPDFModal = null;

// ✅ INICIALIZACIÓN INMEDIATA
if (typeof HybridPDFModal !== 'undefined') {
    hybridPDFModal = new HybridPDFModal();
    window.hybridPDFModal = hybridPDFModal;
    console.log('✅ Modal Híbrido de PDF inicializado inmediatamente');
}

// ✅ INICIALIZACIÓN CON DOMContentLoaded (fallback)
document.addEventListener('DOMContentLoaded', function() {
    if (!window.hybridPDFModal && typeof HybridPDFModal !== 'undefined') {
        hybridPDFModal = new HybridPDFModal();
        window.hybridPDFModal = hybridPDFModal;
        console.log('✅ Modal Híbrido de PDF inicializado con DOMContentLoaded');
    }
});

// ===== EXPORTAR PARA USO GLOBAL =====
window.HybridPDFModal = HybridPDFModal;
