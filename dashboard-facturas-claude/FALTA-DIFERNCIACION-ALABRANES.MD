ASO 5: Adaptar Extracción OpenAI
📍 Dónde: En el prompt de OpenAI (línea ~300)
Modificar prompt:
javascript// ANTES: prompt genérico
// DESPUÉS: prompt específico según tipo
const adaptedPrompt = adaptPromptForDocumentType(prompt, documentClassification.tipo)

PASO 6: Routing de Inserción
📍 Dónde: Donde insertas en datos_extraidos_facturas (línea ~800)
Reemplazar:
javascript// ANTES:
const { data: insertResult } = await supabaseClient
  .from('datos_extraidos_facturas')
  .insert(datosParaInsertar)

// DESPUÉS:
const insertResult = await insertDocumentByType(
  supabaseClient, 
  datosParaInsertar, 
  documentClassification.tipo,
  documentId,
  documentInfo.restaurante_id
)

PASO 7: Actualizar Productos
📍 Dónde: Al insertar en productos_extraidos (línea ~900)
Agregar campo:
javascript// En productosParaInsertar, agregar:
tipo_documento: documentClassification.tipo

PASO 8: Funciones de Notificación
📍 Dónde: Al final del archivo, antes del cierre
Agregar:

notifyForReview() - envía WhatsApp pidiendo revisión
adaptPromptForDocumentType() - adapta prompt según tipo
insertDocumentByType() - inserta en tabla correcta


✅ Garantías de No Romper Nada:

Si clasificación falla → continúa como factura (comportamiento actual)
Si confianza alta → flujo normal sin cambios
Campos opcionales → no afectan inserción existente
Tablas existentes → misma estructura, solo routing diferente