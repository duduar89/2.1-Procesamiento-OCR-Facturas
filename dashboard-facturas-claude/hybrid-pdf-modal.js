// ===== MODAL HÍBRIDO SIMPLE - SIN ZOOM, SOLO COORDENADAS =====

class HybridPDFModal {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.pdfDocument = null;
        this.coordinates = {};
        this.extractedData = {};
        this.sourcePageWidth = null;  // ancho detectado de coordenadas absolutas
        this.sourcePageHeight = null; // alto detectado de coordenadas absolutas
        this.defaultScale = 1.3; // zoom deseado por defecto
        
        this.init();
    }

    init() {
        console.log('🚀 Inicializando Modal Híbrido SIMPLE...');
        this.setupEnhancedPDFControls();
        this.setupCoordinateOverlay();
        this.setupAdvancedFeatures();

        // Mostrar solo el documento: ocultar cabecera del visor
        const header = document.querySelector('.pdf-viewer-header');
        if (header) header.style.display = 'none';
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
        
        // Controles extra de coordenadas eliminados según requerimiento
    }

    // ===== CREAR CONTROLES DE COORDENADAS =====
    createCoordinateControls() { /* Eliminado */ }

    // ===== CONFIGURAR OVERLAY DE COORDENADAS =====
    setupCoordinateOverlay() {
        console.log('🔍 Configurando overlay de coordenadas...');
        
        let overlayContainer = document.getElementById('coordinatesOverlay');
        
        if (!overlayContainer) {
            console.log('⚠️ Contenedor de coordenadas no encontrado, creando uno nuevo...');
            
        const pdfContainer = document.querySelector('.pdf-container');
            if (!pdfContainer) {
                console.log('❌ No se encontró contenedor PDF, esperando...');
                setTimeout(() => this.setupCoordinateOverlay(), 500);
                return;
            }

            overlayContainer = document.createElement('div');
        overlayContainer.className = 'coordinates-overlay-container';
        overlayContainer.id = 'coordinatesOverlay';
        overlayContainer.style.cssText = `
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 9999 !important;
                background: transparent !important;
                border: 2px dashed red !important;
                opacity: 1 !important;
                visibility: visible !important;
                display: block !important;
            `;

            if (getComputedStyle(pdfContainer).position === 'static') {
        pdfContainer.style.position = 'relative';
            }
            
        pdfContainer.appendChild(overlayContainer);
            console.log('✅ Contenedor de coordenadas creado exitosamente');
        } else {
            console.log('✅ Usando contenedor de coordenadas existente');
        }
        
        if (overlayContainer) {
            overlayContainer.style.display = 'block';
            overlayContainer.style.visibility = 'visible';
            console.log('✅ Contenedor de coordenadas configurado y visible');
        }
    }

    // ===== CONFIGURAR FUNCIONALIDADES AVANZADAS =====
    setupAdvancedFeatures() {
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

    // ===== FUNCIONES DE TECLADO =====
    setupKeyboardShortcuts() {
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
        this.coordinates = {};
        this.extractedData = {};
        this.sourcePageWidth = null;
        this.sourcePageHeight = null;
        
        console.log('🔍 loadCoordinates llamado con:', {
            coordinates: coordinates,
            extractedData: extractedData
        });
        
        if (coordinates && typeof coordinates === 'object') {
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
        
        // ✅ Detectar dimensiones fuente si vienen en los datos o inferirlas
        this.computeSourcePageDimensions();

        const canvas = document.getElementById('pdfCanvas');
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            console.log('✅ Canvas listo, configurando coordenadas...');
            this.setupCoordinateOverlay();
            this.updateCoordinateOverlay();
            this.updateConfidenceStats();
            this.fillFormFields();
        } else {
            console.log('⚠️ Canvas no está listo, esperando...');
            setTimeout(() => {
                this.loadCoordinates(coordinates, extractedData);
            }, 500);
        }
    }

    // ✅ Detectar dimensiones base de las coordenadas cuando no son normalizadas (0-1)
    computeSourcePageDimensions() {
        let maxRight = 0;
        let maxBottom = 0;
        let foundAbsolute = false;

        Object.values(this.coordinates).forEach((c) => {
            if (!c || typeof c !== 'object') return;
            const isNormalized = c.x <= 1 && c.y <= 1 && c.width <= 1 && c.height <= 1;
            // Si vienen explícitas, usarlas
            if (c.page_width && c.page_height) {
                this.sourcePageWidth = c.page_width;
                this.sourcePageHeight = c.page_height;
            }
            if (!isNormalized) {
                foundAbsolute = true;
                maxRight = Math.max(maxRight, (c.x || 0) + (c.width || 0));
                maxBottom = Math.max(maxBottom, (c.y || 0) + (c.height || 0));
            }
        });

        if (this.sourcePageWidth == null && this.sourcePageHeight == null && foundAbsolute) {
            // Inferir dimensiones fuente por el máximo derecho e inferior
            this.sourcePageWidth = maxRight || 595;
            this.sourcePageHeight = maxBottom || 842;
        }

        console.log('📐 Dimensiones fuente detectadas:', {
            pageWidth: this.sourcePageWidth,
            pageHeight: this.sourcePageHeight
        });
    }

    // ✅ ACTUALIZACIÓN DE OVERLAYS CORREGIDA
    updateCoordinateOverlay() {
        console.log('🔍 Actualizando overlays de coordenadas...');
        
        const overlayContainer = document.getElementById('coordinatesOverlay');
		const canvas = document.getElementById('pdfCanvas');
		const pdfContainer = document.querySelector('.pdf-container');
		if (!overlayContainer) {
            console.log('⚠️ Contenedor de coordenadas no encontrado');
            return;
        }
		if (!canvas || !pdfContainer) {
			console.log('⚠️ Canvas o contenedor PDF no disponibles');
			return;
		}

		// ✅ Colocar el contenedor de overlays EXACTAMENTE sobre el canvas (en píxeles de CSS)
		const canvasRect = canvas.getBoundingClientRect();
		const containerRect = pdfContainer.getBoundingClientRect();
		overlayContainer.style.left = (canvasRect.left - containerRect.left) + 'px';
		overlayContainer.style.top = (canvasRect.top - containerRect.top) + 'px';
		overlayContainer.style.width = canvasRect.width + 'px';
		overlayContainer.style.height = canvasRect.height + 'px';

        // ✅ LIMPIAR y recrear
        overlayContainer.innerHTML = '';

        let overlaysCreated = 0;
        Object.entries(this.coordinates).forEach(([fieldName, fieldData]) => {
                const overlay = this.createFieldOverlay(fieldName, fieldData);
                if (overlay) {
                    overlayContainer.appendChild(overlay);
                overlaysCreated++;
            }
        });
        
        // ✅ VERIFICAR VISIBILIDAD
        if (overlaysCreated > 0) {
            overlayContainer.style.display = 'block';
            overlayContainer.style.visibility = 'visible';
			overlayContainer.style.zIndex = '9999';
            // Nota: evitamos forzar estilos con !important aquí para no desalinear
        } else {
            // No se crearon overlays
        }
    }

    // ✅ COORDENADAS SIMPLES - COORDENADAS NORMALIZADAS
    createFieldOverlay(fieldName, fieldData) {
        // Crear overlay para cada campo
        
        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) return null;
        
        // ✅ VERIFICACIÓN: Que el canvas tenga dimensiones
        if (canvas.width === 0 || canvas.height === 0) {
            console.log('⚠️ Canvas sin dimensiones válidas');
            return null;
        }
        
        // ✅ VERIFICACIÓN: Coordenadas válidas
        if (typeof fieldData.x !== 'number' || typeof fieldData.y !== 'number' || 
            typeof fieldData.width !== 'number' || typeof fieldData.height !== 'number') {
            console.log('❌ Coordenadas inválidas:', fieldData);
            return null;
        }
        
        // ✅ PERFORMANCE: Omitir tokens y overlays muy pequeños
        if (fieldData.tipo === 'token') {
            return null;
        }
        
        // ✅ Escalar según el tipo de coordenada
        let scaleX, scaleY, x, y, width, height;
        const isNormalized = fieldData.x <= 1 && fieldData.y <= 1 && fieldData.width <= 1 && fieldData.height <= 1;

        if (isNormalized) {
            // Coordenadas normalizadas (0-1)
            const canvasRect = canvas.getBoundingClientRect();
            scaleX = canvasRect.width;  // usar píxeles visibles
            scaleY = canvasRect.height;
        } else if (fieldData.page_width && fieldData.page_height) {
            // Coordenadas absolutas con dimensiones fuente provistas
            const canvasRect = canvas.getBoundingClientRect();
            scaleX = canvasRect.width / fieldData.page_width;
            scaleY = canvasRect.height / fieldData.page_height;
        } else if (this.sourcePageWidth && this.sourcePageHeight) {
            // Coordenadas absolutas, inferir escala por máximos
            const canvasRect = canvas.getBoundingClientRect();
            scaleX = canvasRect.width / this.sourcePageWidth;
            scaleY = canvasRect.height / this.sourcePageHeight;
        } else {
            // Último recurso: asumir A4
            const canvasRect = canvas.getBoundingClientRect();
            scaleX = canvasRect.width / 595;
            scaleY = canvasRect.height / 842;
        }

        x = fieldData.x * scaleX;
        y = fieldData.y * scaleY;
        width = fieldData.width * scaleX;
        height = fieldData.height * scaleY;

        // Omitir overlays diminutos para mejorar legibilidad y rendimiento
        if (width < 6 || height < 6) {
            return null;
        }
        
        // ✅ POSICIONAMIENTO: Relativo al canvas
        const confidence = fieldData.confidence !== undefined ? fieldData.confidence : 0.5;
        const color = '#4f46e5';
        
        const overlay = document.createElement('div');
        overlay.className = 'field-overlay';
        overlay.setAttribute('data-field', fieldName);
        overlay.setAttribute('data-confidence', confidence.toString());
        
        // 🔥 CORRECCIÓN CRÍTICA: CSS más agresivo para visibilidad
        overlay.style.cssText = `
            position: absolute !important;
            left: ${x}px !important;
            top: ${y}px !important;
            width: ${width}px !important;
            height: ${height}px !important;
            border: 1.5px solid ${color} !important;
            background: ${color}1F !important;
            border-radius: 6px !important;
            pointer-events: auto !important;
            cursor: pointer !important;
            z-index: 9999 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            transform: none !important;
        `;
        
        // ✅ TOOLTIP mejorado
        const tooltip = this.createTooltip(fieldName, fieldData, confidence);
        overlay.appendChild(tooltip);
        
        // ✅ EVENTOS
        this.setupOverlayEvents(overlay, tooltip, fieldName);
        
        return overlay;
    }

    // ===== UTILIDADES =====
    createTooltip(fieldName, fieldData, confidence) {
        const tooltip = document.createElement('div');
        tooltip.className = 'field-tooltip';
        
        const fieldValue = this.extractedData[fieldName];
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

        return tooltip;
    }

    setupOverlayEvents(overlay, tooltip, fieldName) {
        overlay.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            overlay.style.transform = 'scale(1.05)';
        });

        overlay.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            overlay.style.transform = 'scale(1)';
        });

        overlay.addEventListener('click', () => {
            this.highlightField(fieldName);
        });
    }

    getConfidenceColor(confidence) {
        if (confidence >= 0.9) return '#10b981'; // Verde
        if (confidence >= 0.7) return '#f59e0b'; // Amarillo
        return '#ef4444'; // Rojo
    }

    getFieldLabel(fieldName) {
        const labels = {
            numero_factura: 'Número de Factura',
            proveedor_nombre: 'Nombre del Proveedor',
            proveedor_cif: 'CIF del Proveedor',
            fecha_factura: 'Fecha de Factura',
            total_factura: 'Total Factura',
            base_imponible: 'Base Imponible'
        };
        return labels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    highlightField(fieldName) {
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

    // ===== FUNCIONES DE ESTADÍSTICAS =====
    updateConfidenceStats() {
        const coordinates = Object.values(this.coordinates);
        const totalFields = coordinates.length;
        
        if (totalFields === 0) return;

        const validCoordinates = coordinates.filter(f => f && typeof f === 'object' && f.confidence !== undefined);
        
        if (validCoordinates.length === 0) {
            console.log('⚠️ No hay coordenadas válidas con confianza para calcular estadísticas');
            return;
        }

        const highConfidence = validCoordinates.filter(f => f.confidence >= 0.9).length;
        const mediumConfidence = validCoordinates.filter(f => f.confidence >= 0.7 && f.confidence < 0.9).length;
        const lowConfidence = validCoordinates.filter(f => f.confidence < 0.7).length;
        
        const globalConfidence = validCoordinates.reduce((sum, f) => sum + (f.confidence || 0), 0) / validCoordinates.length;

        this.updateStatsDisplay({
            totalFields: validCoordinates.length,
            highConfidence,
            mediumConfidence,
            lowConfidence,
            globalConfidence
        });
    }

    updateStatsDisplay(stats) {
        const modal = document.querySelector('.modal.active, .facturaModal.active');
        if (!modal) {
            console.log('⚠️ No se encontró modal activo para actualizar estadísticas');
            return;
        }
        
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
        
        const fieldMapping = {
            'numero_factura': ['numeroFactura'],
            'fecha_factura': ['fechaFactura'],
            'proveedor_nombre': ['proveedor'],
            'proveedor_cif': ['cifProveedor'],
            'proveedor_provincia': ['provinciaProveedor'],
            'fecha_vencimiento': ['fechaVencimiento'],
            // soportar IDs antiguos y actuales
            'base_imponible': ['baseImponible', 'importeBase'],
            'cuota_iva': ['ivaAmount', 'cuotaIva'],
            'total_factura': ['totalConIva'],
            'retencion': ['retencion']
        };
        
        const setIntoElements = (ids, value, extractedField) => {
            const idList = Array.isArray(ids) ? ids : [ids];
            let applied = false;
            idList.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                applied = true;
                let displayValue = value;
                if (['base_imponible', 'cuota_iva', 'total_factura', 'retencion'].includes(extractedField)) {
                    if (typeof value === 'number') displayValue = value.toFixed(2);
                    displayValue = String(displayValue).replace('.', ',');
                    displayValue = `€${displayValue}`;
                }
                if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                    el.value = displayValue;
            } else {
                    el.textContent = displayValue;
            }
                console.log(`✅ Campo rellenado: ${id} = ${displayValue} (de ${extractedField}: ${value})`);
        });
            if (!applied) console.log(`⚠️ Ningún elemento encontrado para IDs: ${idList.join(', ')}`);
        };
        
        Object.entries(fieldMapping).forEach(([extractedField, idList]) => {
            const extractedValue = this.extractedData[extractedField];
            
            if (extractedValue !== undefined && extractedValue !== null) {
                setIntoElements(idList, extractedValue, extractedField);
            } else {
                console.log(`ℹ️ Sin datos para: ${extractedField}`);
            }
        });
        
        console.log('✅ Formulario rellenado completamente');

        // ✅ Aplicar estilos por confianza
        this.updateFormConfidenceStyles();
    }

    // ===== APLICAR COLORES DE CONFIANZA A LAS CASILLAS DEL FORM =====
    updateFormConfidenceStyles() {
        // ✅ COLORES BRAIN STORMERS ACTUALIZADOS
        const getColorForConfidence = (confidence) => {
            if (confidence >= 0.8) return { 
                bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))', 
                border: 'rgba(34, 197, 94, 0.3)',
                shadow: '0 0 10px rgba(34, 197, 94, 0.2)'
            };
            if (confidence >= 0.6) return { 
                bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.05))', 
                border: 'rgba(251, 191, 36, 0.3)',
                shadow: '0 0 10px rgba(251, 191, 36, 0.2)'
            };
            return { 
                bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))', 
                border: 'rgba(239, 68, 68, 0.3)',
                shadow: '0 0 10px rgba(239, 68, 68, 0.2)'
            };
        };

        const safeApply = (ids, confidence) => {
            if (confidence == null) {
                console.log('⚠️ Confianza es null para:', ids);
                return;
            }
            const idList = Array.isArray(ids) ? ids : [ids];
            const { bg, border, shadow } = getColorForConfidence(confidence);
            
            console.log(`🔍 Intentando aplicar estilo a elementos:`, idList, `con confianza: ${Math.round(confidence * 100)}%`);
            
            idList.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) {
                    console.log(`❌ Elemento NO encontrado: ${id}`);
                    return;
                }
                
                console.log(`✅ Elemento ENCONTRADO: ${id}`, el);
                
                // ✅ APLICAR ESTILOS BRAIN STORMERS CON !IMPORTANT
                el.style.setProperty('background', bg, 'important');
                el.style.setProperty('border', `2px solid ${border}`, 'important');
                el.style.setProperty('box-shadow', shadow, 'important');
                el.style.setProperty('border-radius', '8px', 'important');
                el.style.setProperty('padding', '12px', 'important');
                el.style.setProperty('margin', '4px 0', 'important');
                el.style.setProperty('transition', 'all 0.3s ease', 'important');
                
                // ✅ AGREGAR CLASE CSS PARA MAYOR ESPECIFICIDAD
                el.classList.add('brain-stormers-confidence-field');
                
                // ✅ AGREGAR CLASE ESPECÍFICA SEGÚN CONFIANZA
                if (confidence >= 0.8) {
                    el.classList.add('alta');
                    el.classList.remove('media', 'baja');
                } else if (confidence >= 0.6) {
                    el.classList.add('media');
                    el.classList.remove('alta', 'baja');
                } else {
                    el.classList.add('baja');
                    el.classList.remove('alta', 'media');
                    el.style.setProperty('animation', 'pulsoSutil 2s infinite', 'important');
                }
                
                console.log(`✅ Aplicado estilo Brain Stormers a ${id} (${Math.round(confidence * 100)}%)`);
            });
        };

        // ✅ USAR VALORES REALES DE CONFIANZA DEL BACKEND (PRIORIDAD)
        console.log('🎨 === DEBUG: APLICANDO COLORES DE CONFIANZA ===');
        console.log('📊 TODOS los datos extraídos:', this.extractedData);
        console.log('📊 Datos de confianza recibidos:', {
            confianza_proveedor: this.extractedData.confianza_proveedor,
            confianza_datos_fiscales: this.extractedData.confianza_datos_fiscales,
            confianza_importes: this.extractedData.confianza_importes
        });
        
        // ✅ DEBUG: Verificar si la función se ejecuta
        console.log('🔍 updateFormConfidenceStyles() EJECUTÁNDOSE...');

        // ✅ USAR CONFIANZAS REALES DEL BACKEND (sin heurísticas)
        const confProveedor = this.extractedData.confianza_proveedor || 0.5;
        const confDatosFiscales = this.extractedData.confianza_datos_fiscales || 0.5;
        const confImportes = this.extractedData.confianza_importes || 0.5;
        
        // Para el número de factura, usar la confianza de datos fiscales
        const confNumero = confDatosFiscales;

        // ✅ APLICAR COLORES SEGÚN CATEGORÍA DE CONFIANZA
        safeApply('proveedor', confProveedor);
        safeApply('cifProveedor', confProveedor);
        safeApply('numeroFactura', confDatosFiscales);
        safeApply('fechaFactura', confDatosFiscales);
        safeApply(['baseImponible', 'importeBase'], confImportes);
        safeApply(['ivaAmount', 'cuotaIva'], confImportes);
        safeApply(['totalConIva'], confImportes);
        
        console.log('🎨 Colores de confianza Brain Stormers aplicados correctamente al modal híbrido');
    }
    


    // ===== FUNCIONES DE CARGA DE PDF =====
    async loadPDF(pdfUrl) {
        try {
            console.log('📄 Cargando PDF desde:', pdfUrl);
            
            if (!window.pdfjsLib) {
                throw new Error('PDF.js no está disponible');
            }

            const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
            this.pdfDocument = await loadingTask.promise;
            
            this.totalPages = this.pdfDocument.numPages;
            this.currentPage = 1;
            
            console.log(`✅ PDF cargado: ${this.totalPages} páginas`);
            
            await this.renderPage(1);
            
            this.updatePageInfo();
            this.updatePageControls();
            
        } catch (error) {
            console.error('❌ Error cargando PDF:', error);
            throw error;
        }
    }

    // ✅ RENDERIZADO SIMPLE - SIN ZOOM
    async renderPage(pageNumber) {
        try {
            const page = await this.pdfDocument.getPage(pageNumber);
            const canvas = document.getElementById('pdfCanvas');
            const placeholder = document.getElementById('pdfPlaceholder');
            
            if (!canvas || !placeholder) return;

            // ✅ RENDERIZADO con zoom fijo al 130%
            const viewport = page.getViewport({ scale: this.defaultScale });
            const context = canvas.getContext('2d');

            // ✅ Canvas con dimensiones del viewport
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({ canvasContext: context, viewport }).promise;

            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            // Reposicionar overlays tras cambio de tamaño
                this.updateCoordinateOverlay();

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
            console.log('📄 PDF URL:', pdfUrl);
            console.log('📍 Coordenadas recibidas:', Object.keys(coordinates || {}).length);
            console.log('📊 Datos extraídos recibidos:', Object.keys(extractedData || {}).length);
            
            // Verificar que el DOM esté listo
            const modal = document.getElementById('facturaModal');
            const canvas = document.getElementById('pdfCanvas');
            const overlay = document.getElementById('coordinatesOverlay');
            
            if (!modal) {
                throw new Error('Modal de factura no encontrado en el DOM');
            }
            
            if (!canvas) {
                console.warn('⚠️ Canvas de PDF no encontrado, esperando...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Cargar PDF
            console.log('📥 Cargando PDF...');
            await this.loadPDF(pdfUrl);
            
            // Dar tiempo para que el canvas se renderice
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Cargar coordenadas
            console.log('📍 Cargando coordenadas y datos...');
            this.loadCoordinates(coordinates, extractedData);
            
            console.log('✅ Modal híbrido abierto correctamente');
            
        } catch (error) {
            console.error('❌ Error abriendo modal híbrido:', error);
            console.error('🔍 Detalles del error:', {
                message: error.message,
                stack: error.stack,
                pdfUrl: pdfUrl,
                coordinatesCount: Object.keys(coordinates || {}).length,
                extractedDataCount: Object.keys(extractedData || {}).length
            });
            throw error;
        }
    }
}

// ===== INICIALIZACIÓN GLOBAL ROBUSTA =====
let hybridPDFModal = null;

// ✅ FUNCIÓN DE INICIALIZACIÓN SEGURA
function initializeHybridModal() {
    try {
        if (!window.hybridPDFModal && typeof HybridPDFModal !== 'undefined') {
    hybridPDFModal = new HybridPDFModal();
    window.hybridPDFModal = hybridPDFModal;
            console.log('✅ Modal Híbrido de PDF inicializado correctamente');
            return true;
        } else if (window.hybridPDFModal) {
            console.log('ℹ️ Modal Híbrido ya estaba inicializado');
            return true;
        } else {
            console.warn('⚠️ Clase HybridPDFModal no disponible');
            return false;
        }
    } catch (error) {
        console.error('❌ Error inicializando Modal Híbrido:', error);
        return false;
    }
}

// ✅ INICIALIZACIÓN INMEDIATA
initializeHybridModal();

// ✅ INICIALIZACIÓN CON DOMContentLoaded (fallback)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Verificando Modal Híbrido...');
    if (!initializeHybridModal()) {
        console.warn('⚠️ Modal Híbrido no pudo inicializarse en DOMContentLoaded');
        
        // Reintentar después de un delay
        setTimeout(() => {
            console.log('🔄 Reintentando inicialización del Modal Híbrido...');
            initializeHybridModal();
        }, 1000);
    }
});

// ✅ FUNCIÓN GLOBAL DE VERIFICACIÓN
window.checkHybridModal = function() {
    console.log('🔍 Estado del Modal Híbrido:');
    console.log('- window.HybridPDFModal:', typeof window.HybridPDFModal);
    console.log('- window.hybridPDFModal:', typeof window.hybridPDFModal);
    console.log('- hybridPDFModal (local):', typeof hybridPDFModal);
    
    if (!window.hybridPDFModal) {
        console.log('🔄 Intentando reinicializar...');
        return initializeHybridModal();
    }
    return true;
};

// ===== EXPORTAR PARA USO GLOBAL =====
window.HybridPDFModal = HybridPDFModal;
window.initializeHybridModal = initializeHybridModal;
