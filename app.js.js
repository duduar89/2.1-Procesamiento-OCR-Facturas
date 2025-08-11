// ===== PROCESADOR OCR MULTI-TENANT - APLICACIÓN PRINCIPAL =====

class FacturaProcessorMultiTenant {
    constructor() {
        this.supabase = null;
        this.tenantManager = new TenantManager();
        this.currentDocuments = new Map();
        this.processingQueue = [];
        this.autoSaveInterval = null;
        
        this.initializeApp();
    }
    
    // 🚀 INICIALIZACIÓN
    async initializeApp() {
        try {
            await this.validateConfiguration();
            await this.initializeSupabase();
            await this.initializeTenant();
            this.setupEventListeners();
            this.setupAutoSave();
            this.showNotification('success', '✅ Sistema inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando aplicación:', error);
            this.showNotification('error', `❌ Error de inicialización: ${error.message}`);
        }
    }
    
    // ⚙️ VALIDAR CONFIGURACIÓN
    async validateConfiguration() {
        const errors = validateConfig();
        if (errors.length > 0) {
            throw new Error(`Configuración inválida: ${errors.join(', ')}`);
        }
    }
    
    // 🗄️ INICIALIZAR SUPABASE
    async initializeSupabase() {
        if (typeof supabase === 'undefined') {
            await this.loadSupabaseScript();
        }
        
        this.supabase = supabase.createClient(
            CONFIG.SUPABASE.URL,
            CONFIG.SUPABASE.ANON_KEY
        );
        
        // Hacer disponible globalmente
        window.supabase = this.supabase;
        
        // Verificar conexión
        const { data, error } = await this.supabase
            .from(CONFIG.DATABASE.TABLES.RESTAURANTES)
            .select('count')
            .limit(1);
            
        if (error) {
            console.warn('Error conectando a base de datos:', error);
        }
    }
    
    // 🏢 INICIALIZAR SISTEMA MULTI-TENANT
    async initializeTenant() {
        // Intentar cargar restaurante guardado
        let restaurante = this.tenantManager.cargarRestauranteGuardado();
        
        if (!restaurante) {
            // Si no hay restaurante guardado, obtener lista de restaurantes disponibles
            const restaurantes = await this.tenantManager.obtenerRestaurantesDisponibles();
            
            if (restaurantes.length === 0) {
                // No hay restaurantes - mostrar error
                this.showNotification('error', '🏢 No hay restaurantes configurados en el sistema');
                return;
            } else if (restaurantes.length === 1 && CONFIG.TENANT.AUTO_SELECT_RESTAURANTE) {
                // Solo hay uno - seleccionarlo automáticamente
                restaurante = await this.tenantManager.establecerRestaurante(restaurantes[0].id);
                this.showNotification('success', `🏢 Restaurante seleccionado: ${restaurante.nombre}`);
            } else {
                // Múltiples restaurantes - mostrar selector
                this.mostrarSelectorRestaurante(restaurantes);
                return; // No continuar hasta que se seleccione restaurante
            }
        }
        
        // Verificar límites del restaurante
        await this.verificarLimitesRestaurante();
    }
    
    // 🏢 MOSTRAR SELECTOR DE RESTAURANTE
    mostrarSelectorRestaurante(restaurantes) {
        const selectorHTML = `
            <div class="restaurant-selector-overlay">
                <div class="restaurant-selector-modal">
                    <h2>🏢 Selecciona tu Restaurante</h2>
                    <p>Elige el restaurante con el que quieres trabajar:</p>
                    <div class="restaurant-list">
                        ${restaurantes.map(rest => `
                            <div class="restaurant-item" onclick="app.seleccionarRestaurante('${rest.id}')">
                                <div class="restaurant-info">
                                    <h3>${rest.nombre}</h3>
                                    <p>CIF: ${rest.cif}</p>
                                </div>
                                <div class="restaurant-arrow">→</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Agregar selector al DOM
        document.body.insertAdjacentHTML('beforeend', selectorHTML);
    }
    
    // 🏢 SELECCIONAR RESTAURANTE
    async seleccionarRestaurante(restauranteId) {
        try {
            const restaurante = await this.tenantManager.establecerRestaurante(restauranteId);
            
            // Remover selector
            const selector = document.querySelector('.restaurant-selector-overlay');
            if (selector) {
                selector.remove();
            }
            
            this.showNotification('success', `🏢 Restaurante seleccionado: ${restaurante.nombre}`);
            
            // Verificar límites
            await this.verificarLimitesRestaurante();
            
        } catch (error) {
            this.showNotification('error', `❌ Error seleccionando restaurante: ${error.message}`);
        }
    }
    
    // 📊 VERIFICAR LÍMITES DEL RESTAURANTE
    async verificarLimitesRestaurante() {
        try {
            const limites = await this.tenantManager.verificarLimites();
            
            // Mostrar alertas si hay límites cerca
            if (limites.storage && limites.storageUsado / limites.storageTotal > CONFIG.ALERTS.THRESHOLDS.STORAGE_WARNING) {
                const porcentaje = Math.round((limites.storageUsado / limites.storageTotal) * 100);
                this.showNotification('warning', `💾 Storage al ${porcentaje}% (${limites.storageUsado.toFixed(1)}GB de ${limites.storageTotal}GB)`);
            }
            
            if (limites.documentos && limites.documentosUsados / limites.documentosTotal > CONFIG.ALERTS.THRESHOLDS.DOCUMENT_WARNING) {
                const porcentaje = Math.round((limites.documentosUsados / limites.documentosTotal) * 100);
                this.showNotification('warning', `📄 Documentos al ${porcentaje}% (${limites.documentosUsados} de ${limites.documentosTotal} este mes)`);
            }
            
            // Bloquear si excede límites
            if (limites.storage) {
                this.bloquearSubidas('storage');
            }
            if (limites.documentos) {
                this.bloquearSubidas('documentos');
            }
            
        } catch (error) {
            console.error('Error verificando límites:', error);
        }
    }
    
    // 🚫 BLOQUEAR SUBIDAS POR LÍMITES
    bloquearSubidas(tipo) {
        const uploadZone = document.getElementById('uploadZone');
        if (uploadZone) {
            uploadZone.classList.add('blocked');
            uploadZone.innerHTML = `
                <div class="upload-icon">🚫</div>
                <h3>Límite de ${tipo} excedido</h3>
                <p>Contacta con tu administrador para aumentar el límite</p>
            `;
        }
    }
    
    // 📚 CARGAR SCRIPT DE SUPABASE
    async loadSupabaseScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // 🎯 CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Referencias DOM
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.uploadSection = document.getElementById('uploadSection');
        this.processingSection = document.getElementById('processingSection');
        this.actionsSection = document.getElementById('actionsSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.queueSection = document.getElementById('queueSection');
        this.queueList = document.getElementById('queueList');
        
        // Verificar que elementos existen
        if (!this.uploadZone) {
            console.error('Elemento uploadZone no encontrado');
            return;
        }
        
        // Drag & Drop Events
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag & Drop
        this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Botones de acción
        const downloadBtn = document.getElementById('downloadBtn');
        const newDocBtn = document.getElementById('newDocBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadJSON());
        if (newDocBtn) newDocBtn.addEventListener('click', () => this.resetApp());
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyToClipboard());
        
        // Prevenir comportamiento por defecto del navegador
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
    }
    
    // 🛡️ PREVENIR COMPORTAMIENTOS POR DEFECTO
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 📁 MANEJO DE SELECCIÓN DE ARCHIVO
    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            await this.processFile(file);
        }
    }
    
    // 🎯 MANEJO DE DRAG OVER
    handleDragOver(e) {
        e.preventDefault();
        if (!this.uploadZone.classList.contains('blocked')) {
            this.uploadZone.classList.add('drag-over');
        }
    }
    
    // 🎯 MANEJO DE DRAG LEAVE
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('drag-over');
    }
    
    // 🎯 MANEJO DE DROP
    async handleDrop(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('drag-over');
        
        if (this.uploadZone.classList.contains('blocked')) {
            return;
        }
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await this.processFile(files[0]);
        }
    }
    
    // 📄 PROCESAMIENTO PRINCIPAL DE ARCHIVO
    async processFile(file) {
        try {
            // 0. Verificar que hay restaurante seleccionado
            TenantUtils.verificarRestauranteSeleccionado();
            
            // 1. Validar archivo
            const validation = this.validateFile(file);
            if (!validation.valid) {
                this.showNotification('error', validation.message);
                return;
            }
            
            // 2. Verificar límites antes de procesar
            const limites = await this.tenantManager.verificarLimites();
            if (limites.storage) {
                this.showNotification('error', CONFIG.UI.MESSAGES.LIMITE_STORAGE_EXCEDIDO);
                return;
            }
            if (limites.documentos) {
                this.showNotification('error', CONFIG.UI.MESSAGES.LIMITE_DOCUMENTOS_EXCEDIDO);
                return;
            }
            
            // 3. Mostrar estado de carga
            this.showLoading();
            this.updateLoadingText('Subiendo archivo...');
            
            // 4. Generar ID único para el documento
            const documentId = this.generateUUID();
            
            // 5. Subir archivo a Supabase Storage
            const storageResult = await this.uploadToStorage(file, documentId);
            if (!storageResult.success) {
                throw new Error(storageResult.error);
            }
            
            // 6. Crear registro en base de datos CON restaurante_id
            const dbResult = await this.createDocumentRecord(file, documentId, storageResult.url);
            if (!dbResult.success) {
                throw new Error(dbResult.error);
            }
            
            // 7. Añadir a la cola de procesamiento
            this.addToQueue(documentId, file.name, storageResult.url);
            
            // 8. Procesar documento (extraer datos)
            await this.processDocument(documentId, storageResult.url);
            
            this.showNotification('success', '✅ Documento procesado correctamente');
            
        } catch (error) {
            console.error('Error procesando archivo:', error);
            this.showNotification('error', `❌ Error: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    // ✅ VALIDACIÓN DE ARCHIVO
    validateFile(file) {
        // Verificar tipo
        if (!CONFIG.APP.ALLOWED_TYPES.includes(file.type)) {
            return {
                valid: false,
                message: '⚠️ Solo se permiten archivos PDF'
            };
        }
        
        // Verificar tamaño
        if (file.size > CONFIG.APP.MAX_FILE_SIZE) {
            const maxSizeMB = CONFIG.APP.MAX_FILE_SIZE / (1024 * 1024);
            return {
                valid: false,
                message: `⚠️ El archivo debe ser menor a ${maxSizeMB}MB`
            };
        }
        
        // Verificar extensión
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.APP.ALLOWED_EXTENSIONS.includes(extension)) {
            return {
                valid: false,
                message: '⚠️ Extensión de archivo no permitida'
            };
        }
        
        return { valid: true };
    }
    
    // ☁️ SUBIR ARCHIVO A SUPABASE STORAGE
    async uploadToStorage(file, documentId) {
        try {
            const fileName = `${CONFIG.TENANT.RESTAURANTE_ID}/${documentId}_${file.name}`;
            const filePath = `uploads/${fileName}`;
            
            const { data, error } = await this.supabase.storage
                .from(CONFIG.SUPABASE.STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) {
                throw error;
            }
            
            // Obtener URL pública
            const { data: urlData } = this.supabase.storage
                .from(CONFIG.SUPABASE.STORAGE_BUCKET)
                .getPublicUrl(filePath);
            
            return {
                success: true,
                url: urlData.publicUrl,
                path: filePath
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 💾 CREAR REGISTRO EN BASE DE DATOS CON RESTAURANTE_ID
    async createDocumentRecord(file, documentId, storageUrl) {
        try {
            const documentData = TenantUtils.addTenantData({
                id: documentId,
                nombre_archivo: file.name,
                tipo_documento: this.detectDocumentType(file.name),
                url_storage: storageUrl,
                tamaño_bytes: file.size,
                estado: CONFIG.APP.DOCUMENT_STATES.UPLOADED,
                fecha_subida: new Date().toISOString(),
                confianza_clasificacion: 0.5,
                checksum_archivo: await this.calculateFileHash(file)
            });
            
            const { data, error } = await this.supabase
                .from(CONFIG.DATABASE.TABLES.DOCUMENTOS)
                .insert([documentData])
                .select();
            
            if (error) {
                throw error;
            }
            
            return { success: true, data };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 🔍 CALCULAR HASH DEL ARCHIVO PARA DUPLICADOS
    async calculateFileHash(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Error calculando hash:', error);
            return null;
        }
    }
    
    // 🔍 DETECTAR TIPO DE DOCUMENTO (básico, por nombre)
    detectDocumentType(fileName) {
        const name = fileName.toLowerCase();
        
        if (name.includes('factura') || name.includes('fac_')) {
            return CONFIG.APP.DOCUMENT_TYPES.FACTURA;
        } else if (name.includes('albaran') || name.includes('alb_')) {
            return CONFIG.APP.DOCUMENT_TYPES.ALBARAN;
        } else if (name.includes('ticket') || name.includes('recibo')) {
            return CONFIG.APP.DOCUMENT_TYPES.TICKET;
        }
        
        // Por defecto, asumir que es factura
        return CONFIG.APP.DOCUMENT_TYPES.FACTURA;
    }
    
    // 📋 AÑADIR A COLA DE PROCESAMIENTO CON RESTAURANTE_ID
    async addToQueue(documentId, fileName, storageUrl) {
        try {
            // Determinar prioridad según tipo de documento
            const tipoDocumento = this.detectDocumentType(fileName);
            let prioridad = 3; // Por defecto
            
            if (tipoDocumento === CONFIG.APP.DOCUMENT_TYPES.FACTURA) prioridad = 1;
            else if (tipoDocumento === CONFIG.APP.DOCUMENT_TYPES.ALBARAN) prioridad = 2;
            else if (tipoDocumento === CONFIG.APP.DOCUMENT_TYPES.TICKET) prioridad = 3;
            
            const colaData = TenantUtils.addTenantData({
                documento_id: documentId,
                prioridad: prioridad,
                estado: 'pendiente',
                tipo_documento: tipoDocumento,
                fecha_programada: new Date().toISOString()
            });
            
            await this.supabase
                .from(CONFIG.DATABASE.TABLES.COLA)
                .insert([colaData]);
            
            // Añadir a cola local para UI
            const queueItem = {
                id: documentId,
                fileName: fileName,
                url: storageUrl,
                status: 'processing',
                timestamp: new Date()
            };
            
            this.processingQueue.push(queueItem);
            this.updateQueueDisplay();
            this.showQueueSection();
            
        } catch (error) {
            console.error('Error añadiendo a cola:', error);
        }
    }
    
    // 🔄 ACTUALIZAR VISUALIZACIÓN DE COLA
    updateQueueDisplay() {
        if (!this.queueList) return;
        
        this.queueList.innerHTML = '';
        
        this.processingQueue.forEach(item => {
            const queueItemEl = document.createElement('div');
            queueItemEl.className = `queue-item ${item.status}`;
            queueItemEl.innerHTML = `
                <div class="queue-thumbnail">📄</div>
                <div class="queue-info">
                    <h4>${item.fileName}</h4>
                    <p>Subido: ${item.timestamp.toLocaleTimeString()}</p>
                    <small>Restaurante: ${CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre || 'N/A'}</small>
                </div>
                <div class="queue-status ${item.status}">${this.getStatusText(item.status)}</div>
                <button class="btn tertiary" onclick="app.viewDocument('${item.id}')">Ver</button>
            `;
            this.queueList.appendChild(queueItemEl);
        });
    }
    
    // 📝 OBTENER TEXTO DE ESTADO
    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendiente',
            'processing': 'Procesando',
            'completed': 'Completado',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }
    
    // 👁️ MOSTRAR SECCIÓN DE COLA
    showQueueSection() {
        if (this.queueSection) {
            this.queueSection.style.display = 'block';
        }
    }
    
    // 🤖 PROCESAR DOCUMENTO (EXTRAER DATOS) CON RESTAURANTE_ID
    async processDocument(documentId, storageUrl) {
        try {
            this.updateLoadingText('Extrayendo texto del documento...');
            
            // Simular procesamiento de extracción (aquí iría la integración real)
            const extractedData = await this.simulateDataExtraction(documentId);
            
            this.updateLoadingText('Analizando campos detectados...');
            
            // Guardar datos extraídos CON restaurante_id
            await this.saveExtractedData(documentId, extractedData);
            
            // Actualizar estado en base de datos
            await this.updateDocumentStatus(documentId, CONFIG.APP.DOCUMENT_STATES.PROCESSED, extractedData);
            
            // Actualizar cola
            this.updateQueueItemStatus(documentId, 'completed');
            
            // Mostrar resultados
            this.displayResults(extractedData);
            
        } catch (error) {
            console.error('Error procesando documento:', error);
            await this.updateDocumentStatus(documentId, CONFIG.APP.DOCUMENT_STATES.ERROR);
            this.updateQueueItemStatus(documentId, 'error');
            throw error;
        }
    }
    
    // 💾 GUARDAR DATOS EXTRAÍDOS CON RESTAURANTE_ID
    async saveExtractedData(documentId, extractedData) {
        try {
            // Guardar datos de factura
            if (extractedData.tipo_documento === 'factura') {
                const facturaData = TenantUtils.addTenantData({
                    documento_id: documentId,
                    proveedor_nombre: extractedData.proveedor?.nombre,
                    proveedor_cif: extractedData.proveedor?.cif,
                    numero_factura: extractedData.factura?.numero,
                    fecha_factura: extractedData.factura?.fecha,
                    fecha_vencimiento: extractedData.factura?.vencimiento,
                    base_imponible: extractedData.importes?.base_imponible,
                    total_factura: extractedData.importes?.total,
                    confianza_proveedor: extractedData.proveedor?.confianza,
                    confianza_datos_fiscales: extractedData.factura?.confianza,
                    confianza_importes: extractedData.importes?.confianza,
                    confianza_global: extractedData.confianza_global
                });
                
                const { data: facturaInserted, error: facturaError } = await this.supabase
                    .from(CONFIG.DATABASE.TABLES.FACTURAS)
                    .insert([facturaData])
                    .select();
                
                if (facturaError) throw facturaError;
                
                // Guardar productos si existen
                if (extractedData.productos && extractedData.productos.length > 0) {
                    const productosData = extractedData.productos.map((producto, index) => 
                        TenantUtils.addTenantData({
                            documento_id: documentId,
                            factura_id: facturaInserted[0].id,
                            linea_numero: index + 1,
                            descripcion_original: producto.descripcion,
                            cantidad: producto.cantidad,
                            precio_unitario_sin_iva: producto.precio_unitario,
                            precio_total_linea_sin_iva: producto.precio_total,
                            confianza_linea: producto.confianza
                        })
                    );
                    
                    await this.supabase
                        .from(CONFIG.DATABASE.TABLES.PRODUCTOS)
                        .insert(productosData);
                }
            }
            
        } catch (error) {
            console.error('Error guardando datos extraídos:', error);
            throw error;
        }
    }
    
    // 🎭 SIMULAR EXTRACCIÓN DE DATOS (temporal)
    async simulateDataExtraction(documentId) {
        // Simular delay de procesamiento
        await this.delay(2000);
        
        // Datos de ejemplo - en la implementación real vendrían de Google Document AI
        return {
            documento_id: documentId,
            tipo_documento: 'factura',
            proveedor: {
                nombre: 'DISTRIBUCIONES MAKRO S.L.',
                cif: 'B12345678',
                direccion: 'Calle Mayor 123, 28001 Madrid',
                confianza: 0.92
            },
            factura: {
                numero: 'FAC-2024-001234',
                fecha: '2024-03-15',
                vencimiento: '2024-04-15',
                confianza: 0.95
            },
            importes: {
                base_imponible: 454.55,
                tipo_iva: 21,
                cuota_iva: 95.45,
                total: 550.00,
                confianza: 0.98
            },
            productos: [
                {
                    descripcion: 'Aceite de oliva virgen extra 5L',
                    cantidad: 2,
                    precio_unitario: 45.50,
                    precio_total: 91.00,
                    confianza: 0.89
                },
                {
                    descripcion: 'Tomate pera categoría I (kg)',
                    cantidad: 25,
                    precio_unitario: 2.85,
                    precio_total: 71.25,
                    confianza: 0.94
                }
            ],
            confianza_global: 0.93
        };
    }
    
    // ⏰ DELAY HELPER
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 🔄 ACTUALIZAR ESTADO DE DOCUMENTO
    async updateDocumentStatus(documentId, status, extractedData = null) {
        const updateData = {
            estado: status,
            fecha_procesamiento: new Date().toISOString()
        };
        
        if (extractedData) {
            updateData.confianza_clasificacion = extractedData.confianza_global;
        }
        
        const { error } = await this.supabase
            .from(CONFIG.DATABASE.TABLES.DOCUMENTOS)
            .update(updateData)
            .eq('id', documentId)
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID); // Filtro adicional por seguridad
        
        if (error) {
            console.error('Error actualizando estado:', error);
        }
    }
    
    // 🔄 ACTUALIZAR ESTADO EN COLA
    updateQueueItemStatus(documentId, status) {
        const item = this.processingQueue.find(item => item.id === documentId);
        if (item) {
            item.status = status;
            this.updateQueueDisplay();
        }
    }
    
    // 📊 MOSTRAR RESULTADOS
    displayResults(extractedData) {
        this.hideSection(this.uploadSection);
        this.showSection(this.processingSection);
        this.showSection(this.actionsSection);
        
        // Actualizar confianza global
        this.updateGlobalConfidence(extractedData.confianza_global);
        
        // Mostrar campos extraídos
        this.displayExtractedFields(extractedData);
        
        // Guardar datos actuales
        this.currentData = extractedData;
    }
    
    // 🎯 ACTUALIZAR INDICADOR DE CONFIANZA GLOBAL
    updateGlobalConfidence(confidence) {
        const confidenceValue = document.getElementById('confidenceValue');
        if (!confidenceValue) return;
        
        const percentage = Math.round(confidence * 100);
        
        confidenceValue.textContent = percentage + '%';
        confidenceValue.className = `confidence-value ${this.getConfidenceClass(percentage)}`;
        
        // Actualizar barra de progreso
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
    }
    
    // 📋 MOSTRAR CAMPOS EXTRAÍDOS
    displayExtractedFields(data) {
        const container = document.getElementById('fieldsContainer');
        if (!container) return;
        
        const fields = [
            { key: 'proveedor', label: 'Proveedor', icon: '🏢', value: data.proveedor?.nombre, confidence: data.proveedor?.confianza },
            { key: 'cif', label: 'CIF/NIF', icon: '🆔', value: data.proveedor?.cif, confidence: data.proveedor?.confianza },
            { key: 'numero_factura', label: 'Nº Factura', icon: '📄', value: data.factura?.numero, confidence: data.factura?.confianza },
            { key: 'fecha', label: 'Fecha', icon: '📅', value: data.factura?.fecha, confidence: data.factura?.confianza },
            { key: 'total', label: 'Total', icon: '💰', value: `${data.importes?.total?.toFixed(2)}€`, confidence: data.importes?.confianza }
        ];
        
        container.innerHTML = fields.map(field => {
            const confidence = Math.round((field.confidence || 0) * 100);
            const confidenceClass = this.getConfidenceClass(confidence);
            
            return `
                <div class="field-item">
                    <div class="field-header">
                        <span class="field-icon">${field.icon}</span>
                        <span class="field-label">${field.label}</span>
                        <span class="field-confidence ${confidenceClass}">${confidence}%</span>
                    </div>
                    <div class="field-value">${field.value || 'No detectado'}</div>
                </div>
            `;
        }).join('');
    }
    
    // 🎨 OBTENER CLASE DE CONFIANZA
    getConfidenceClass(percentage) {
        if (percentage >= 90) return 'high';
        if (percentage >= 70) return 'medium';
        return 'low';
    }
    
    // 📥 DESCARGAR JSON
    downloadJSON() {
        if (!this.currentData) return;
        
        // Añadir información del restaurante al JSON
        const dataWithTenant = {
            ...this.currentData,
            restaurante: {
                id: CONFIG.TENANT.RESTAURANTE_ID,
                nombre: CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre,
                cif: CONFIG.TENANT.RESTAURANTE_ACTUAL?.cif
            },
            fecha_exportacion: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(dataWithTenant, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `factura_${CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre || 'documento'}_${Date.now()}.json`;
        link.click();
        
        this.showNotification('success', '📥 Archivo JSON descargado');
    }
    
    // 📋 COPIAR AL PORTAPAPELES
    async copyToClipboard() {
        if (!this.currentData) return;
        
        try {
            const text = JSON.stringify(this.currentData, null, 2);
            await navigator.clipboard.writeText(text);
            this.showNotification('success', '📋 Datos copiados al portapapeles');
        } catch (error) {
            this.showNotification('error', '❌ Error copiando datos');
        }
    }
    
    // 🔄 RESETEAR APLICACIÓN
    resetApp() {
        this.currentData = null;
        if (this.fileInput) this.fileInput.value = '';
        this.hideSection(this.processingSection);
        this.hideSection(this.actionsSection);
        this.showSection(this.uploadSection);
        this.updateStatus('Listo para procesar');
    }
    
    // 👁️ VER DOCUMENTO
    async viewDocument(documentId) {
        const item = this.processingQueue.find(item => item.id === documentId);
        if (item && item.status === 'completed') {
            // Cargar datos reales desde la base de datos
            try {
                const { data: factura, error } = await this.supabase
                    .from(CONFIG.DATABASE.TABLES.FACTURAS)
                    .select('*')
                    .eq('documento_id', documentId)
                    .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
                    .single();
                
                if (error) throw error;
                
                if (factura) {
                    // Simular estructura de datos para mostrar
                    const displayData = {
                        documento_id: documentId,
                        tipo_documento: 'factura',
                        proveedor: {
                            nombre: factura.proveedor_nombre,
                            cif: factura.proveedor_cif,
                            confianza: factura.confianza_proveedor
                        },
                        factura: {
                            numero: factura.numero_factura,
                            fecha: factura.fecha_factura,
                            vencimiento: factura.fecha_vencimiento,
                            confianza: factura.confianza_datos_fiscales
                        },
                        importes: {
                            base_imponible: factura.base_imponible,
                            total: factura.total_factura,
                            confianza: factura.confianza_importes
                        },
                        confianza_global: factura.confianza_global
                    };
                    
                    this.displayResults(displayData);
                }
            } catch (error) {
                console.error('Error cargando documento:', error);
                this.showNotification('error', '❌ Error cargando documento');
            }
        }
    }
    
    // 💾 CONFIGURAR GUARDADO AUTOMÁTICO
    setupAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (this.currentData && CONFIG.TENANT.RESTAURANTE_ID) {
                // Aquí se implementaría el guardado automático con restaurante_id
                console.log('Auto-guardado realizado para restaurante:', CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre);
            }
        }, CONFIG.APP.AUTO_SAVE_INTERVAL);
    }
    
    // 🔧 UTILIDADES DE UI
    showSection(element) {
        if (element) element.style.display = 'block';
    }
    
    hideSection(element) {
        if (element) element.style.display = 'none';
    }
    
    showLoading() {
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'none';
    }
    
    updateLoadingText(text) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) loadingText.textContent = text;
    }
    
    updateStatus(text) {
        const statusElement = document.getElementById('status');
        if (statusElement) statusElement.textContent = text;
    }
    
    // 🔔 SISTEMA DE NOTIFICACIONES
    showNotification(type, message) {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        // Auto-remover después de un tiempo
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, CONFIG.APP.NOTIFICATION_DURATION);
    }
    
    // 🆔 GENERAR UUID
    generateUUID() {
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// 🚀 INICIALIZAR APLICACIÓN MULTI-TENANT
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new FacturaProcessorMultiTenant();
});

// 🛡️ MANEJO DE ERRORES GLOBALES
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
    if (app) {
        app.showNotification('error', '❌ Error inesperado en la aplicación');
    }
});

// 🌐 MANEJO DE ERRORES DE RED
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada:', e.reason);
    if (app) {
        app.showNotification('error', '🌐 Error de conexión');
    }
});