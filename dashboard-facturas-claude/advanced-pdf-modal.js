/**
 * 🚀 MODAL AVANZADO DE PDF CON COORDENADAS Y ZOOM
 * Sistema completo para visualizar facturas con overlay de campos extraídos
 * Colores según confianza, zoom in/out, scroll y navegación avanzada
 */

class AdvancedPDFModal {
  constructor() {
    this.currentZoom = 1.0
    this.minZoom = 0.5
    this.maxZoom = 3.0
    this.zoomStep = 0.2
    this.isDragging = false
    this.lastMousePos = { x: 0, y: 0 }
    this.currentOffset = { x: 0, y: 0 }
    this.coordinates = {}
    this.pdfDocument = null
    this.currentPage = 1
    this.totalPages = 1
    
    this.init()
  }

  init() {
    this.createModalHTML()
    this.bindEvents()
    this.setupZoomControls()
    this.setupScrollControls()
  }

  createModalHTML() {
    const modalHTML = `
      <div id="advanced-pdf-modal" class="advanced-pdf-modal">
        <div class="modal-overlay"></div>
        
        <div class="modal-container">
          <!-- HEADER CON CONTROLES -->
          <div class="modal-header">
            <div class="header-left">
              <h3>📄 Vista Avanzada de Factura</h3>
              <span class="status-badge processed">PROCESADO</span>
            </div>
            
            <div class="header-controls">
              <!-- CONTROLES DE ZOOM -->
              <div class="zoom-controls">
                <button class="zoom-btn" data-action="zoom-out" title="Zoom Out">
                  <span>🔍-</span>
                </button>
                <span class="zoom-level">100%</span>
                <button class="zoom-btn" data-action="zoom-in" title="Zoom In">
                  <span>🔍+</span>
                </button>
                <button class="zoom-btn" data-action="zoom-reset" title="Reset Zoom">
                  <span>🔍↺</span>
                </button>
              </div>
              
              <!-- CONTROLES DE PÁGINA -->
              <div class="page-controls">
                <button class="page-btn" data-action="prev-page" title="Página Anterior">
                  <span>◀</span>
                </button>
                <span class="page-info">Página <span class="current-page">1</span> de <span class="total-pages">1</span></span>
                <button class="page-btn" data-action="next-page" title="Página Siguiente">
                  <span>▶</span>
                </button>
              </div>
              
              <!-- BOTÓN CERRAR -->
              <button class="close-btn" data-action="close-modal">
                <span>✕</span>
              </button>
            </div>
          </div>

          <!-- CONTENIDO PRINCIPAL -->
          <div class="modal-content">
            <!-- PANEL IZQUIERDO: PDF CON OVERLAY -->
            <div class="pdf-panel">
              <div class="pdf-container">
                <div class="pdf-viewer" id="pdf-viewer">
                  <!-- El PDF se renderizará aquí -->
                </div>
                
                <!-- OVERLAY DE COORDENADAS -->
                <div class="coordinates-overlay" id="coordinates-overlay">
                  <!-- Los campos extraídos se mostrarán aquí como overlay -->
                </div>
                
                <!-- INDICADOR DE ZOOM -->
                <div class="zoom-indicator" id="zoom-indicator">
                  <span>100%</span>
                </div>
              </div>
            </div>

            <!-- PANEL DERECHO: INFORMACIÓN Y CONTROLES -->
            <div class="info-panel">
              <!-- RESUMEN DE CAMPOS EXTRAÍDOS -->
              <div class="extracted-fields">
                <h4>🎯 Campos Extraídos</h4>
                <div class="fields-list" id="fields-list">
                  <!-- Lista de campos con confianza -->
                </div>
              </div>

              <!-- CONTROLES DE VISUALIZACIÓN -->
              <div class="visualization-controls">
                <h4>🎨 Controles de Visualización</h4>
                
                <div class="control-group">
                  <label>Mostrar Overlay:</label>
                  <div class="toggle-controls">
                    <button class="toggle-btn active" data-overlay="all">Todos</button>
                    <button class="toggle-btn" data-overlay="high-confidence">Alta Confianza</button>
                    <button class="toggle-btn" data-overlay="low-confidence">Baja Confianza</button>
                  </div>
                </div>

                <div class="control-group">
                  <label>Filtro por Campo:</label>
                  <select id="field-filter" class="field-selector">
                    <option value="all">Todos los campos</option>
                    <option value="proveedor_nombre">Proveedor</option>
                    <option value="proveedor_cif">CIF</option>
                    <option value="numero_factura">Número Factura</option>
                    <option value="total_factura">Total</option>
                    <option value="base_imponible">Base Imponible</option>
                    <option value="cuota_iva">Cuota IVA</option>
                  </select>
                </div>

                <div class="control-group">
                  <label>Resaltar Campo:</label>
                  <button class="highlight-btn" data-action="highlight-all">Resaltar Todos</button>
                  <button class="highlight-btn" data-action="clear-highlights">Limpiar</button>
                </div>
              </div>

              <!-- ESTADÍSTICAS DE CONFIANZA -->
              <div class="confidence-stats">
                <h4>📊 Estadísticas de Confianza</h4>
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">Confianza Global:</span>
                    <span class="stat-value" id="global-confidence">0%</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Campos Extraídos:</span>
                    <span class="stat-value" id="total-fields">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Alta Confianza:</span>
                    <span class="stat-value" id="high-confidence-count">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Baja Confianza:</span>
                    <span class="stat-value" id="low-confidence-count">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // Insertar en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    
    // Obtener referencias
    this.modal = document.getElementById('advanced-pdf-modal')
    this.pdfViewer = document.getElementById('pdf-viewer')
    this.coordinatesOverlay = document.getElementById('coordinates-overlay')
    this.zoomIndicator = document.getElementById('zoom-indicator')
    this.fieldsList = document.getElementById('fields-list')
  }

  bindEvents() {
    // Eventos de botones
    this.modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action
      if (action) {
        this.handleAction(action, e)
      }
    })

    // Eventos de zoom
    this.modal.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -1 : 1
        this.zoom(delta * this.zoomStep)
      }
    })

    // Eventos de mouse para drag
    this.pdfViewer.addEventListener('mousedown', (e) => this.startDrag(e))
    this.pdfViewer.addEventListener('mousemove', (e) => this.drag(e))
    this.pdfViewer.addEventListener('mouseup', () => this.stopDrag())
    this.pdfViewer.addEventListener('mouseleave', () => this.stopDrag())

    // Eventos de overlay
    this.coordinatesOverlay.addEventListener('click', (e) => {
      if (e.target.classList.contains('field-overlay')) {
        this.highlightField(e.target.dataset.field)
      }
    })
  }

  setupZoomControls() {
    // Zoom con teclado
    document.addEventListener('keydown', (e) => {
      if (this.modal.classList.contains('active')) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault()
          this.zoom(this.zoomStep)
        } else if (e.key === '-') {
          e.preventDefault()
          this.zoom(-this.zoomStep)
        } else if (e.key === '0') {
          e.preventDefault()
          this.resetZoom()
        }
      }
    })
  }

  setupScrollControls() {
    // Scroll con flechas
    document.addEventListener('keydown', (e) => {
      if (this.modal.classList.contains('active')) {
        const scrollAmount = 50
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault()
            this.scrollViewer(0, -scrollAmount)
            break
          case 'ArrowDown':
            e.preventDefault()
            this.scrollViewer(0, scrollAmount)
            break
          case 'ArrowLeft':
            e.preventDefault()
            this.scrollViewer(-scrollAmount, 0)
            break
          case 'ArrowRight':
            e.preventDefault()
            this.scrollViewer(scrollAmount, 0)
            break
        }
      }
    })
  }

  handleAction(action, event) {
    switch (action) {
      case 'zoom-in':
        this.zoom(this.zoomStep)
        break
      case 'zoom-out':
        this.zoom(-this.zoomStep)
        break
      case 'zoom-reset':
        this.resetZoom()
        break
      case 'prev-page':
        this.changePage(-1)
        break
      case 'next-page':
        this.changePage(1)
        break
      case 'close-modal':
        this.close()
        break
      case 'highlight-all':
        this.highlightAllFields()
        break
      case 'clear-highlights':
        this.clearHighlights()
        break
    }
  }

  // 🎯 FUNCIÓN PRINCIPAL: Abrir modal con datos
  open(pdfUrl, coordinates, extractedData) {
    console.log('🚀 Abriendo modal avanzado con coordenadas:', coordinates)
    
    this.coordinates = coordinates
    this.extractedData = extractedData
    
    // Mostrar modal
    this.modal.classList.add('active')
    document.body.style.overflow = 'hidden'
    
    // Cargar PDF
    this.loadPDF(pdfUrl)
    
    // Renderizar overlay de coordenadas
    this.renderCoordinatesOverlay()
    
    // Actualizar información
    this.updateFieldsList()
    this.updateConfidenceStats()
    
    // Configurar controles
    this.setupFieldFilter()
  }

  async loadPDF(pdfUrl) {
    try {
      console.log('📄 Cargando PDF:', pdfUrl)
      
      // Usar PDF.js para renderizar
      const pdfjsLib = window['pdfjs-dist/build/pdf']
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      
      const loadingTask = pdfjsLib.getDocument(pdfUrl)
      this.pdfDocument = await loadingTask.promise
      
      this.totalPages = this.pdfDocument.numPages
      this.currentPage = 1
      
      console.log(`📋 PDF cargado: ${this.totalPages} páginas`)
      
      // Renderizar primera página
      await this.renderPage(1)
      
      // Actualizar controles de página
      this.updatePageControls()
      
    } catch (error) {
      console.error('❌ Error cargando PDF:', error)
      this.showError('Error cargando el PDF')
    }
  }

  async renderPage(pageNumber) {
    try {
      const page = await this.pdfDocument.getPage(pageNumber)
      
      const viewport = page.getViewport({ scale: this.currentZoom })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // Limpiar viewer
      this.pdfViewer.innerHTML = ''
      this.pdfViewer.appendChild(canvas)
      
      // Renderizar página
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      
      console.log(`✅ Página ${pageNumber} renderizada`)
      
      // Actualizar overlay con nueva escala
      this.updateOverlayScale()
      
    } catch (error) {
      console.error('❌ Error renderizando página:', error)
    }
  }

  renderCoordinatesOverlay() {
    console.log('🎯 Renderizando overlay de coordenadas...')
    
    this.coordinatesOverlay.innerHTML = ''
    
    Object.entries(this.coordinates).forEach(([fieldName, fieldData]) => {
      if (fieldData && fieldData.x !== undefined) {
        const overlay = this.createFieldOverlay(fieldName, fieldData)
        this.coordinatesOverlay.appendChild(overlay)
      }
    })
    
    console.log(`✅ Overlay renderizado con ${Object.keys(this.coordinates).length} campos`)
  }

  createFieldOverlay(fieldName, fieldData) {
    const overlay = document.createElement('div')
    overlay.className = `field-overlay field-${fieldName}`
    overlay.dataset.field = fieldName
    
    // Calcular posición y tamaño
    const x = fieldData.x * this.currentZoom + this.currentOffset.x
    const y = fieldData.y * this.currentZoom + this.currentOffset.y
    const width = fieldData.width * this.currentZoom
    const height = fieldData.height * this.currentZoom
    
    // Aplicar estilos
    overlay.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      border: 2px solid ${this.getConfidenceColor(fieldData.confidence)};
      background-color: ${this.getConfidenceColor(fieldData.confidence)}20;
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    `
    
    // Tooltip con información
    overlay.title = `${fieldName}: ${fieldData.text} (Confianza: ${Math.round(fieldData.confidence * 100)}%)`
    
    // Efecto hover
    overlay.addEventListener('mouseenter', () => {
      overlay.style.transform = 'scale(1.05)'
      overlay.style.zIndex = '20'
    })
    
    overlay.addEventListener('mouseleave', () => {
      overlay.style.transform = 'scale(1)'
      overlay.style.zIndex = '10'
    })
    
    return overlay
  }

  getConfidenceColor(confidence) {
    if (confidence >= 0.8) return '#10B981' // Verde - Alta confianza
    if (confidence >= 0.6) return '#F59E0B' // Amarillo - Media confianza
    return '#EF4444' // Rojo - Baja confianza
  }

  updateOverlayScale() {
    // Actualizar posición y tamaño de todos los overlays
    const overlays = this.coordinatesOverlay.querySelectorAll('.field-overlay')
    
    overlays.forEach(overlay => {
      const fieldName = overlay.dataset.field
      const fieldData = this.coordinates[fieldName]
      
      if (fieldData) {
        const x = fieldData.x * this.currentZoom + this.currentOffset.x
        const y = fieldData.y * this.currentZoom + this.currentOffset.y
        const width = fieldData.width * this.currentZoom
        const height = fieldData.height * this.currentZoom
        
        overlay.style.left = `${x}px`
        overlay.style.top = `${y}px`
        overlay.style.width = `${width}px`
        overlay.style.height = `${height}px`
      }
    })
  }

  updateFieldsList() {
    this.fieldsList.innerHTML = ''
    
    Object.entries(this.coordinates).forEach(([fieldName, fieldData]) => {
      const fieldItem = document.createElement('div')
      fieldItem.className = 'field-item'
      
      const confidence = Math.round(fieldData.confidence * 100)
      const confidenceClass = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low'
      
      fieldItem.innerHTML = `
        <div class="field-header">
          <span class="field-name">${this.getFieldDisplayName(fieldName)}</span>
          <span class="confidence-badge ${confidenceClass}">${confidence}%</span>
        </div>
        <div class="field-value">${fieldData.text}</div>
        <div class="field-coordinates">
          x: ${fieldData.x}, y: ${fieldData.y}
        </div>
      `
      
      // Click para resaltar campo
      fieldItem.addEventListener('click', () => {
        this.highlightField(fieldName)
      })
      
      this.fieldsList.appendChild(fieldItem)
    })
  }

  getFieldDisplayName(fieldName) {
    const names = {
      'proveedor_nombre': '🏢 Proveedor',
      'proveedor_cif': '🆔 CIF',
      'numero_factura': '📄 Número Factura',
      'fecha_factura': '📅 Fecha',
      'total_factura': '💰 Total',
      'base_imponible': '📊 Base Imponible',
      'cuota_iva': '🧾 Cuota IVA',
      'tipo_iva': '📈 Tipo IVA'
    }
    return names[fieldName] || fieldName
  }

  updateConfidenceStats() {
    const confidences = Object.values(this.coordinates).map(f => f.confidence)
    const globalConfidence = confidences.length > 0 ? 
      confidences.reduce((a, b) => a + b, 0) / confidences.length : 0
    
    const highConfidence = confidences.filter(c => c >= 0.8).length
    const lowConfidence = confidences.filter(c => c < 0.6).length
    
    document.getElementById('global-confidence').textContent = `${Math.round(globalConfidence * 100)}%`
    document.getElementById('total-fields').textContent = confidences.length
    document.getElementById('high-confidence-count').textContent = highConfidence
    document.getElementById('low-confidence-count').textContent = lowConfidence
  }

  setupFieldFilter() {
    const filter = document.getElementById('field-filter')
    filter.addEventListener('change', (e) => {
      this.filterFields(e.target.value)
    })
  }

  filterFields(filterValue) {
    const overlays = this.coordinatesOverlay.querySelectorAll('.field-overlay')
    
    overlays.forEach(overlay => {
      if (filterValue === 'all' || overlay.dataset.field === filterValue) {
        overlay.style.display = 'block'
      } else {
        overlay.style.display = 'none'
      }
    })
  }

  // 🎯 FUNCIONES DE ZOOM
  zoom(delta) {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom + delta))
    
    if (newZoom !== this.currentZoom) {
      this.currentZoom = newZoom
      this.updateZoomDisplay()
      this.renderPage(this.currentPage)
    }
  }

  resetZoom() {
    this.currentZoom = 1.0
    this.currentOffset = { x: 0, y: 0 }
    this.updateZoomDisplay()
    this.renderPage(this.currentPage)
  }

  updateZoomDisplay() {
    const zoomLevel = Math.round(this.currentZoom * 100)
    this.zoomIndicator.textContent = `${zoomLevel}%`
    
    const zoomLevelDisplay = this.modal.querySelector('.zoom-level')
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${zoomLevel}%`
    }
  }

  // 🎯 FUNCIONES DE SCROLL/DRAG
  startDrag(e) {
    this.isDragging = true
    this.lastMousePos = { x: e.clientX, y: e.clientY }
    this.pdfViewer.style.cursor = 'grabbing'
  }

  drag(e) {
    if (!this.isDragging) return
    
    const deltaX = e.clientX - this.lastMousePos.x
    const deltaY = e.clientY - this.lastMousePos.y
    
    this.currentOffset.x += deltaX
    this.currentOffset.y += deltaY
    
    this.lastMousePos = { x: e.clientX, y: e.clientY }
    
    this.updateOverlayScale()
  }

  stopDrag() {
    this.isDragging = false
    this.pdfViewer.style.cursor = 'grab'
  }

  scrollViewer(deltaX, deltaY) {
    this.currentOffset.x += deltaX
    this.currentOffset.y += deltaY
    this.updateOverlayScale()
  }

  // 🎯 FUNCIONES DE PÁGINA
  async changePage(delta) {
    const newPage = this.currentPage + delta
    
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage
      await this.renderPage(this.currentPage)
      this.updatePageControls()
    }
  }

  updatePageControls() {
    const currentPageEl = this.modal.querySelector('.current-page')
    const totalPagesEl = this.modal.querySelector('.total-pages')
    
    if (currentPageEl) currentPageEl.textContent = this.currentPage
    if (totalPagesEl) totalPagesEl.textContent = this.totalPages
    
    // Habilitar/deshabilitar botones
    const prevBtn = this.modal.querySelector('[data-action="prev-page"]')
    const nextBtn = this.modal.querySelector('[data-action="next-page"]')
    
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1
    if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages
  }

  // 🎯 FUNCIONES DE HIGHLIGHT
  highlightField(fieldName) {
    // Limpiar highlights anteriores
    this.clearHighlights()
    
    // Resaltar campo específico
    const overlay = this.coordinatesOverlay.querySelector(`[data-field="${fieldName}"]`)
    if (overlay) {
      overlay.style.transform = 'scale(1.1)'
      overlay.style.zIndex = '30'
      overlay.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)'
      overlay.style.border = '3px solid #3B82F6'
    }
    
    // Scroll al campo
    if (overlay) {
      overlay.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  highlightAllFields() {
    const overlays = this.coordinatesOverlay.querySelectorAll('.field-overlay')
    overlays.forEach(overlay => {
      overlay.style.transform = 'scale(1.05)'
      overlay.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.6)'
    })
  }

  clearHighlights() {
    const overlays = this.coordinatesOverlay.querySelectorAll('.field-overlay')
    overlays.forEach(overlay => {
      overlay.style.transform = 'scale(1)'
      overlay.style.boxShadow = 'none'
      overlay.style.zIndex = '10'
    })
  }

  // 🎯 FUNCIONES DE UTILIDAD
  showError(message) {
    console.error('❌ Error en modal:', message)
    // Aquí podrías mostrar un toast o alert
  }

  close() {
    this.modal.classList.remove('active')
    document.body.style.overflow = ''
    
    // Limpiar
    this.coordinates = {}
    this.extractedData = {}
    this.currentZoom = 1.0
    this.currentOffset = { x: 0, y: 0 }
    
    console.log('🔒 Modal cerrado')
  }
}

// 🌍 EXPORTAR PARA USO GLOBAL
window.AdvancedPDFModal = AdvancedPDFModal

console.log('🚀 AdvancedPDFModal cargado y listo para usar')
