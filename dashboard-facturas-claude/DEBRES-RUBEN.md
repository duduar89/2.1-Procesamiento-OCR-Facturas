## 🔥 **Código para Subida de Carpetas por Lotes**

### **1. HTML - Input para carpetas:**
```html
<!-- Añadir junto a tu input actual -->
<input type="file" id="folderInput" webkitdirectory multiple style="display: none;">
<button id="uploadFolderBtn" class="btn-upload-folder">
    📁 Subir Carpeta Completa
</button>
```

### **2. JavaScript - Event Listeners:**
```javascript
// Añadir en setupEventListeners()
const uploadFolderBtn = document.getElementById('uploadFolderBtn');
const folderInput = document.getElementById('folderInput');

if (uploadFolderBtn) {
    uploadFolderBtn.addEventListener('click', () => {
        if (!processingState) {
            folderInput.click();
        }
    });
}

if (folderInput) {
    folderInput.addEventListener('change', handleFolderSelect);
}
```

### **3. Función principal de manejo:**
```javascript
async function handleFolderSelect(e) {
    const files = Array.from(e.target.files);
    console.log(`📁 Carpeta seleccionada: ${files.length} archivos`);
    
    // Filtrar solo PDFs
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        showNotification('No se encontraron archivos PDF en la carpeta', 'warning');
        return;
    }
    
    console.log(`✅ PDFs encontrados: ${pdfFiles.length}`);
    
    // Procesar en lotes
    await processBatchFiles(pdfFiles);
}
```

### **4. Procesamiento por lotes:**
```javascript
async function processBatchFiles(files) {
    try {
        processingState = true;
        
        // Mostrar modal de progreso
        showBatchProgress(files.length);
        
        let processed = 0;
        let errors = 0;
        
        // Procesar de 3 en 3 (para no saturar)
        const batchSize = 3;
        
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            // Procesar lote en paralelo
            const promises = batch.map(file => processSingleFile(file));
            const results = await Promise.allSettled(promises);
            
            // Contar resultados
            results.forEach((result, index) => {
                processed++;
                if (result.status === 'rejected') {
                    errors++;
                    console.error(`Error en archivo ${batch[index].name}:`, result.reason);
                }
                
                // Actualizar progreso
                updateBatchProgress(processed, files.length, errors);
            });
        }
        
        // Finalizar
        completeBatchUpload(processed, errors);
        
    } catch (error) {
        console.error('Error en procesamiento masivo:', error);
        showNotification('Error en subida masiva: ' + error.message, 'error');
    } finally {
        processingState = false;
    }
}
```

### **5. Procesar archivo individual:**
```javascript
async function processSingleFile(file) {
    // Validar archivo
    if (!validateFile(file)) {
        throw new Error(`Archivo inválido: ${file.name}`);
    }

    // Subir a Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${CONFIG.TENANT.RESTAURANTE_ID}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from(CONFIG.SUPABASE.STORAGE_BUCKET)
        .upload(filePath, file);

    if (uploadError) {
        throw new Error(`Error subiendo ${file.name}: ${uploadError.message}`);
    }

    // Crear registro en BD
    const documentId = crypto.randomUUID();
    
    const { data: docData, error: docError } = await supabaseClient
        .from('documentos')
        .insert({
            id: documentId,
            restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
            nombre_archivo: file.name,
            tipo_documento: 'factura',
            url_storage: filePath,
            tamaño_bytes: file.size,
            estado: 'uploaded',
            usuario_subida: currentUser?.id
        });

    if (docError) {
        throw new Error(`Error creando registro para ${file.name}`);
    }

    // Procesar con IA
    const { error: processError } = await supabaseClient.functions
        .invoke('process-invoice', {
            body: {
                record: {
                    name: documentId,
                    bucket_id: CONFIG.SUPABASE.STORAGE_BUCKET
                }
            }
        });

    if (processError) {
        throw new Error(`Error procesando ${file.name}: ${processError.message}`);
    }

    return { success: true, fileName: file.name };
}
```

### **6. UI de progreso:**
```javascript
function showBatchProgress(totalFiles) {
    // Crear modal de progreso simple
    const modal = document.createElement('div');
    modal.id = 'batchProgressModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; min-width: 400px; text-align: center;">
                <h3>🚀 Procesando Carpeta</h3>
                <div id="batchProgressText">Procesando 0 de ${totalFiles} archivos...</div>
                <div style="width: 100%; height: 20px; background: #e5e7eb; border-radius: 10px; margin: 20px 0; overflow: hidden;">
                    <div id="batchProgressBar" style="height: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div id="batchErrorText" style="color: #ef4444; font-size: 0.9rem;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateBatchProgress(processed, total, errors) {
    const progressText = document.getElementById('batchProgressText');
    const progressBar = document.getElementById('batchProgressBar');
    const errorText = document.getElementById('batchErrorText');
    
    const percentage = (processed / total) * 100;
    
    if (progressText) progressText.textContent = `Procesando ${processed} de ${total} archivos...`;
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (errorText && errors > 0) errorText.textContent = `${errors} archivos con errores`;
}

function completeBatchUpload(processed, errors) {
    setTimeout(() => {
        const modal = document.getElementById('batchProgressModal');
        if (modal) modal.remove();
        
        showNotification(
            `✅ Procesamiento completado: ${processed} archivos. ${errors > 0 ? `${errors} errores.` : ''}`,
            errors > 0 ? 'warning' : 'success'
        );
        
        // Recargar datos
        loadRealDataFromSupabase();
    }, 1000);
}
```

### **7. CSS para el botón:**
```css
.btn-upload-folder {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    margin-left: 10px;
}

.btn-upload-folder:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
}
```

## 🚀 **¡Listo!** 

Con este código puedes:
- Seleccionar carpetas completas
- Procesar 3 archivos en paralelo (configurable)
- Ver progreso en tiempo real
- Manejar errores individualmente
- Recargar datos automáticamente

¡Pruébalo arrastrando una carpeta con PDFs! 📁✨