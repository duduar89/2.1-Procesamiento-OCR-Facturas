// ===== PDF OVERLAY SYSTEM - VISUALIZACIÓN DE CONFIANZA =====

class PdfOverlaySystem {
    constructor(canvasId, overlaysContainerId) {
        this.canvas = document.getElementById(canvasId);
        this.overlaysContainer = document.getElementById(overlaysContainerId);
        this.ctx = this.canvas.getContext('2d');
        this.currentScale = 1;
        this.currentRotation = 0;
        this.currentPage = 1;
        this.totalPages = 1;
        this.pdfDoc = null;
        this.overlays = [];
        this.selectedField = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Controles de zoom
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('fitPageBtn')?.addEventListener('click', () => this.fitToPage());
        document.getElementById('rotateBtn')?.addEventListener('click', () => this.rotate());
        
        // Navegación de páginas
        document.getElementById('prevPagePdfBtn')?.addEventListener('click', () => this.prevPage());
        document.getElementById('nextPagePdfBtn')?.addEventListener('click', () => this.nextPage());
    }
    
    // ===== CARGA DE PDF =====
    async loadPdf(pdfUrl) {
        try {
            console.log('Cargando PDF:', pdfUrl);
            
            // Si es una URL de placeholder, simular carga
            if (pdfUrl.includes('placeholder')) {
                await this.loadPlaceholderPdf(pdfUrl);
                return;
            }
            
            // Carga real con PDF.js (para futuro)
            if (window.pdfjsLib) {
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                this.pdfDoc = await loadingTask.promise;
                this.totalPages = this.pdfDoc.numPages;
                await this.renderPage(1);
            } else {
                // Fallback a imagen
                await this.loadPlaceholderPdf(pdfUrl);
            }
            
            this.updatePageInfo();
            
        } catch (error) {
            console.error('Error cargando PDF:', error);
            this.showError('Error cargando documento');
        }
    }
    
    async loadPlaceholderPdf(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Ajustar canvas al tamaño de la imagen
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                
                // Limpiar y dibujar
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
                
                // Simular que es PDF de 1 página
                this.totalPages = 1;
                this.currentPage = 1;
                
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
    
    async renderPage(pageNum) {
        if (!this.pdfDoc) return;
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.currentScale, rotation: this.currentRotation });
            
            // Ajustar canvas
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            // Renderizar página
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            this.currentPage = pageNum;
            
        } catch (error) {
            console.error('Error renderizando página:', error);
        }
    }
    
    // ===== CONTROLES DE ZOOM =====
    zoomIn() {
        this.currentScale = Math.min(this.currentScale * 1.25, 3);
        this.updateZoom();
    }
    
    zoomOut() {
        this.currentScale = Math.max(this.currentScale * 0.8, 0.25);
        this.updateZoom();
    }
    
    fitToPage() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 40; // Padding
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        this.currentScale = Math.min(scaleX, scaleY);
        
        this.updateZoom();
    }
    
    updateZoom() {
        if (this.pdfDoc) {
            this.renderPage(this.currentPage);
        } else {
            // Para placeholder, solo cambiar CSS transform
            this.canvas.style.transform = `scale(${this.currentScale}) rotate(${this.currentRotation}deg)`;
        }
        
        this.updateOverlaysScale();
        this.updateZoomDisplay();
    }
    
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.currentScale * 100)}%`;
        }
    }
    
    // ===== ROTACIÓN =====
    rotate() {
        this.currentRotation = (this.currentRotation + 90) % 360;
        this.updateZoom();
    }
    
    // ===== NAVEGACIÓN DE PÁGINAS =====
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            if (this.pdfDoc) {
                this.renderPage(this.currentPage);
            }
            this.updatePageInfo();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            if (this.pdfDoc) {
                this.renderPage(this.currentPage);
            }
            this.updatePageInfo();
        }
    }
    
    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
        }
        
        // Habilitar/deshabilitar botones
        const prevBtn = document.getElementById('prevPagePdfBtn');
        const nextBtn = document.getElementById('nextPagePdfBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages;
    }
    
    // ===== SISTEMA DE OVERLAYS =====
    createOverlays(coordenadas, confianzas = {}) {
        this.clearOverlays();
        
        if (!coordenadas) return;
        
        Object.entries(coordenadas).forEach(([campo, coords]) => {
            const overlay = this.createOverlay(campo, coords, confianzas[campo]);
            this.overlays.push({
                element: overlay,
                field: campo,
                coords: coords
            });
        });
        
        this.updateOverlaysScale();
    }
    
    createOverlay(campo, coords, confidence = 0.5) {
        const overlay = document.createElement('div');
        overlay.className = `pdf-overlay ${this.getConfidenceClass(confidence)}`;
        overlay.dataset.field = campo;
        
        // Posición y tamaño
        overlay.style.left = coords.x + 'px';
        overlay.style.top = coords.y + 'px';
        overlay.style.width = coords.width + 'px';
        overlay.style.height = coords.height + 'px';
        
        // Tooltip
        overlay.title = `${campo}: ${Math.round(confidence * 100)}% confianza`;
        
        // Click handler
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            this.selectField(campo, overlay);
        });
        
        // Hover effects
        overlay.addEventListener('mouseenter', () => {
            overlay.style.opacity = '0.8';
            overlay.style.transform = 'scale(1.02)';
        });
        
        overlay.addEventListener('mouseleave', () => {
            overlay.style.opacity = '';
            overlay.style.transform = '';
        });
        
        this.overlaysContainer.appendChild(overlay);
        return overlay;
    }
    
    updateOverlaysScale() {
        this.overlays.forEach(({ element, coords }) => {
            element.style.left = (coords.x * this.currentScale) + 'px';
            element.style.top = (coords.y * this.currentScale) + 'px';
            element.style.width = (coords.width * this.currentScale) + 'px';
            element.style.height = (coords.height * this.currentScale) + 'px';
        });
    }
    
    selectField(campo, overlayElement) {
        console.log('Campo seleccionado:', campo);
        
        // Quitar selección anterior
        this.clearSelection();
        
        // Marcar como seleccionado
        overlayElement.classList.add('selected');
        this.selectedField = campo;
        
        // Intentar enfocar el campo correspondiente en el formulario
        this.focusFormField(campo);
        
        // Auto-quitar selección después de 3 segundos
        setTimeout(() => {
            this.clearSelection();
        }, 3000);
    }
    
    focusFormField(campo) {
        // Convertir nombre de campo a ID del input
        const fieldMappings = {
            'proveedor_nombre': 'proveedorNombre',
            'proveedor_cif': 'proveedorCif',
            'proveedor_direccion': 'proveedorDireccion',
            'numero_factura': 'numeroFactura',
            'fecha_factura': 'fechaFactura',
            'fecha_vencimiento': 'fechaVencimiento',
            'total_factura': 'totalFactura',
            'base_imponible': 'baseImponible',
            'total_iva': 'totalIva'
        };
        
        const fieldId = fieldMappings[campo];
        if (fieldId) {
            // Asegurar que estamos en el tab correcto
            if (window.switchTab) {
                window.switchTab('general');
            }
            
            // Enfocar el campo
            setTimeout(() => {
                const input = document.getElementById(fieldId);
                if (input) {
                    input.focus();
                    input.select();
                    
                    // Scroll hacia el campo si es necesario
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }
    
    clearSelection() {
        this.overlays.forEach(({ element }) => {
            element.classList.remove('selected');
        });
        this.selectedField = null;
    }
    
    clearOverlays() {
        this.overlaysContainer.innerHTML = '';
        this.overlays = [];
        this.selectedField = null;
    }
    
    // ===== UTILIDADES =====
    getConfidenceClass(confidence) {
        if (confidence >= 0.9) return 'confidence-high';
        if (confidence >= 0.7) return 'confidence-medium';
        return 'confidence-low';
    }
    
    showError(message) {
        this.overlaysContainer.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: var(--error);
                text-align: center;
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: var(--card-shadow);
            ">
                <div style="font-size: 3rem; margin-bottom: 10px;">Error</div>
                <div>${message}</div>
            </div>
        `;
    }
    
    // ===== MÉTODOS PÚBLICOS =====
    highlightField(campo) {
        const overlay = this.overlays.find(o => o.field === campo);
        if (overlay) {
            this.selectField(campo, overlay.element);
        }
    }
    
    updateFieldConfidence(campo, newConfidence) {
        const overlay = this.overlays.find(o => o.field === campo);
        if (overlay) {
            // Actualizar clase de confianza
            overlay.element.className = `pdf-overlay ${this.getConfidenceClass(newConfidence)}`;
            overlay.element.title = `${campo}: ${Math.round(newConfidence * 100)}% confianza`;
        }
    }
    
    getCanvasImageData() {
        return this.canvas.toDataURL('image/png');
    }
    
    reset() {
        this.clearOverlays();
        this.currentScale = 1;
        this.currentRotation = 0;
        this.currentPage = 1;
        this.updateZoomDisplay();
        this.updatePageInfo();
    }
}

// ===== INICIALIZACIÓN GLOBAL =====
let pdfOverlaySystem = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sistema de overlays cuando el DOM esté listo
    if (document.getElementById('pdfCanvas') && document.getElementById('pdfOverlays')) {
        pdfOverlaySystem = new PdfOverlaySystem('pdfCanvas', 'pdfOverlays');
        console.log('Sistema de overlays PDF inicializado');
    }
});

// ===== FUNCIONES GLOBALES PARA INTEGRACIÓN =====
window.loadPdfWithOverlays = async function(pdfUrl, coordenadas, confianzas = {}) {
    if (!pdfOverlaySystem) {
        console.error('Sistema de overlays no inicializado');
        return;
    }
    
    try {
        // Mostrar loading
        const pdfLoading = document.getElementById('pdfLoading');
        if (pdfLoading) pdfLoading.style.display = 'flex';
        
        // Cargar PDF
        await pdfOverlaySystem.loadPdf(pdfUrl);
        
        // Crear overlays
        pdfOverlaySystem.createOverlays(coordenadas, confianzas);
        
        // Ocultar loading
        if (pdfLoading) pdfLoading.style.display = 'none';
        
        console.log('PDF y overlays cargados correctamente');
        
    } catch (error) {
        console.error('Error cargando PDF con overlays:', error);
        
        // Mostrar error
        const pdfLoading = document.getElementById('pdfLoading');
        if (pdfLoading) {
            pdfLoading.innerHTML = '<p style="color: var(--error);">Error cargando documento</p>';
        }
    }
};

window.highlightPdfField = function(campo) {
    if (pdfOverlaySystem) {
        pdfOverlaySystem.highlightField(campo);
    }
};

window.updatePdfFieldConfidence = function(campo, confidence) {
    if (pdfOverlaySystem) {
        pdfOverlaySystem.updateFieldConfidence(campo, confidence);
    }
};

window.resetPdfViewer = function() {
    if (pdfOverlaySystem) {
        pdfOverlaySystem.reset();
    }
};

// ===== INTEGRACIÓN CON FORMULARIO =====
// Función para resaltar overlay cuando se enfoca un campo del formulario
function setupFormIntegration() {
    const fieldMappings = {
        'proveedorNombre': 'proveedor_nombre',
        'proveedorCif': 'proveedor_cif',
        'proveedorDireccion': 'proveedor_direccion',
        'numeroFactura': 'numero_factura',
        'fechaFactura': 'fecha_factura',
        'fechaVencimiento': 'fecha_vencimiento',
        'totalFactura': 'total_factura',
        'baseImponible': 'base_imponible',
        'totalIva': 'total_iva'
    };
    
    Object.entries(fieldMappings).forEach(([inputId, overlayField]) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('focus', () => {
                if (pdfOverlaySystem) {
                    pdfOverlaySystem.highlightField(overlayField);
                }
            });
        }
    });
}

// Configurar integración cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupFormIntegration, 1000); // Esperar a que se cargue el modal
});

console.log('Sistema de overlays PDF cargado correctamente');