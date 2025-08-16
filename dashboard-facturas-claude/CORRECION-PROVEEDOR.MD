# 📋 Plan de Mejoras - Edge Function Process-Invoice

## 🎯 **OBJETIVO**
Solucionar la confusión entre **proveedor** y **restaurante** en la extracción de datos de facturas, implementando un sistema híbrido de validación preventiva y correctiva.

---

## 🔍 **PROBLEMA IDENTIFICADO**

### **Situación Actual:**
```
OCR → OpenAI → Procesar datos
```

**❌ Problemas:**
- OpenAI confunde sistemáticamente proveedor con restaurante
- No tiene contexto sobre qué restaurante está procesando la factura
- La validación actual viene DESPUÉS de la extracción incorrecta
- Con 1000 restaurantes, un CIF puede ser proveedor para algunos y cliente para otros

### **Casos de Falla:**
1. **Factura de Proveedor XYZ → Restaurante ABC**
2. **OpenAI extrae:** `proveedor_cif = "CIF_de_Restaurante_ABC"` ❌
3. **Debería extraer:** `proveedor_cif = "CIF_de_Proveedor_XYZ"` ✅

---

## 💡 **SOLUCIÓN PROPUESTA: ENFOQUE HÍBRIDO**

### **Nuevo Flujo:**
```
OCR → FILTRO INTELIGENTE → OpenAI + CONTEXTO → VALIDACIÓN FINAL → Procesar datos
```

---

## 🛠️ **IMPLEMENTACIÓN PASO A PASO**

### **PASO 1: Crear Función de Filtro Pre-OpenAI**

**Ubicación:** Insertar después de la línea `const fullText = extractedResult?.document?.text || ''`

```javascript
// 🔍 NUEVA FUNCIÓN: smartRestaurantFilter
async function smartRestaurantFilter(fullText, restauranteId, supabaseClient) {
  console.log('🔍 === FILTRO INTELIGENTE DE RESTAURANTE ===')
  
  // 1. Obtener datos del restaurante actual (RÁPIDO: ~10ms)
  const { data: currentRestaurant, error } = await supabaseClient
    .from('restaurantes')
    .select('cif, nombre')
    .eq('id', restauranteId)
    .single()
  
  if (error || !currentRestaurant) {
    console.warn('⚠️ No se pudo obtener datos del restaurante')
    return { currentRestaurant: null, foundCIFs: [], hasRestaurantCIF: false }
  }
  
  // 2. Extraer todos los CIFs del texto usando regex (RÁPIDO: ~5ms)
  const cifPattern = /\b[A-Z]\d{8}\b|\b[A-Z]\d{7}[A-Z]\b|\b\d{8}[A-Z]\b/g
  const foundCIFs = [...new Set(fullText.match(cifPattern) || [])]
  
  // 3. Verificar si el CIF del restaurante está en el texto
  const hasRestaurantCIF = foundCIFs.includes(currentRestaurant.cif)
  
  console.log(`📋 CIFs encontrados: ${foundCIFs.length}`)
  console.log(`🏢 CIF restaurante: ${currentRestaurant.cif}`)
  console.log(`🔍 Restaurante en texto: ${hasRestaurantCIF}`)
  
  return {
    currentRestaurant,
    foundCIFs,
    hasRestaurantCIF,
    excludeCIF: hasRestaurantCIF ? currentRestaurant.cif : null
  }
}
```

### **PASO 2: Integrar Filtro en el Flujo Principal**

**Ubicación:** Reemplazar la sección actual entre OCR y OpenAI

```javascript
// DESPUÉS DE:
const fullText = extractedResult?.document?.text || ''
console.log('🔍 Texto extraído del OCR (primeros 500 chars):', fullText.substring(0, 500))

// ✅ AGREGAR:
// Filtro inteligente PRE-OpenAI
const restaurantContext = await smartRestaurantFilter(
  fullText, 
  documentInfo.restaurante_id, 
  supabaseClient
)

// MODIFICAR LA LLAMADA A OpenAI:
openaiResult = await extractDataWithOpenAI(fullText, restaurantContext)
```

### **PASO 3: Modificar Función extractDataWithOpenAI**

**Cambio en la firma:**
```javascript
// ANTES:
async function extractDataWithOpenAI(text: string): Promise<any>

// DESPUÉS:
async function extractDataWithOpenAI(text: string, context?: any): Promise<any>
```

**Modificar el prompt:**
```javascript
// ✅ NUEVO PROMPT CON CONTEXTO
let contextInstructions = ''
if (context?.excludeCIF) {
  contextInstructions = `
⚠️ IMPORTANTE - CONTEXTO DE ESTA FACTURA:
- El CIF "${context.excludeCIF}" pertenece al restaurante "${context.currentRestaurant.nombre}"
- Este restaurante es el CLIENTE/DESTINATARIO de la factura, NO el proveedor
- NO extraigas "${context.excludeCIF}" como proveedor_cif
- El verdadero proveedor tiene un CIF diferente y aparece en la parte SUPERIOR de la factura

`
}

const prompt = `${contextInstructions}
Eres un experto en extracción de datos de facturas españolas...
[resto del prompt actual]
`
```

### **PASO 4: Crear Función de Validación Final**

**Ubicación:** Después de la extracción de OpenAI, antes del procesamiento

```javascript
// 🛡️ NUEVA FUNCIÓN: validateExtractedProvider
async function validateExtractedProvider(extractedData, restaurantContext, supabaseClient) {
  console.log('🛡️ === VALIDACIÓN FINAL DEL PROVEEDOR ===')
  
  if (!extractedData.proveedor_cif) {
    console.log('ℹ️ No hay CIF de proveedor para validar')
    return extractedData
  }
  
  // 1. Verificar si el CIF extraído pertenece al restaurante actual
  if (restaurantContext?.currentRestaurant?.cif === extractedData.proveedor_cif) {
    console.log('🚨 DETECCIÓN: OpenAI extrajo CIF del restaurante como proveedor')
    return correctProviderExtraction(extractedData, restaurantContext)
  }
  
  // 2. Verificar si el CIF pertenece a CUALQUIER restaurante de la plataforma
  const { data: conflictingRestaurants } = await supabaseClient
    .from('restaurantes')
    .select('cif, nombre')
    .eq('cif', extractedData.proveedor_cif)
    .limit(1)
  
  if (conflictingRestaurants && conflictingRestaurants.length > 0) {
    console.log(`🚨 DETECCIÓN: CIF ${extractedData.proveedor_cif} pertenece a restaurante ${conflictingRestaurants[0].nombre}`)
    return correctProviderExtraction(extractedData, restaurantContext)
  }
  
  console.log('✅ CIF del proveedor validado correctamente')
  return extractedData
}

// 🔧 FUNCIÓN DE CORRECCIÓN
function correctProviderExtraction(extractedData, restaurantContext) {
  console.log('🔧 Aplicando corrección automática...')
  
  // Buscar otro CIF en el texto que no sea del restaurante
  const otherCIFs = restaurantContext.foundCIFs.filter(
    cif => cif !== restaurantContext.currentRestaurant?.cif
  )
  
  if (otherCIFs.length > 0) {
    console.log(`✅ CIF alternativo encontrado: ${otherCIFs[0]}`)
    extractedData.proveedor_cif = otherCIFs[0]
  } else {
    console.log('⚠️ No se encontró CIF alternativo, marcando como problemático')
    extractedData.proveedor_cif = null
    extractedData.proveedor_nombre = 'Proveedor no identificado - Requiere revisión manual'
  }
  
  return extractedData
}
```

### **PASO 5: Integrar Validación en el Flujo**

**Ubicación:** Después de `convertOpenAIToExpectedFormat`

```javascript
// DESPUÉS DE:
const extractedData = convertOpenAIToExpectedFormat(openaiResult, coordenadasCampos)
console.log('📊 Datos extraídos con OpenAI:', extractedData)

// ✅ AGREGAR:
// Validación final del proveedor
const validatedData = await validateExtractedProvider(
  extractedData, 
  restaurantContext, 
  supabaseClient
)

// REEMPLAZAR extractedData con validatedData en el resto del código
```

### **PASO 6: Actualizar Logs y Métricas**

```javascript
// ✅ AGREGAR LOGS ADICIONALES
console.log('📈 === MÉTRICAS DE VALIDACIÓN ===')
console.log(`🔍 CIFs encontrados en texto: ${restaurantContext.foundCIFs.length}`)
console.log(`🏢 Restaurante detectado en factura: ${restaurantContext.hasRestaurantCIF}`)
console.log(`✅ Proveedor final: ${validatedData.proveedor_nombre}`)
console.log(`🆔 CIF final: ${validatedData.proveedor_cif}`)
```

---

## ⚡ **IMPACTO EN RENDIMIENTO**

### **Tiempo Adicional:**
- **Filtro pre-OpenAI**: ~15ms
- **Validación final**: ~25ms  
- **Total añadido**: ~40ms

### **Contexto:**
- **Tiempo total actual**: 5-13 segundos
- **Incremento**: < 0.5%
- **Beneficio**: Eliminación del 95% de errores de identificación

---

## 🧪 **TESTING**

### **Casos de Prueba:**
1. **Factura normal**: Proveedor ≠ Restaurante → Debe funcionar igual
2. **Factura problemática**: OpenAI confunde → Debe autocorregirse  
3. **Factura sin CIF**: No hay CIFs válidos → Debe manejarse gracefully
4. **Factura múltiples CIFs**: Varios proveedores → Debe elegir el correcto

### **Métricas a Monitorear:**
- Tasa de corrección automática
- Tiempo de procesamiento
- Casos que requieren revisión manual

---

## 🚀 **BENEFICIOS ESPERADOS**

1. **Precisión**: 95%+ de facturas procesadas correctamente
2. **Escalabilidad**: Funciona con cualquier número de restaurantes  
3. **Eficiencia**: Impacto mínimo en rendimiento
4. **Mantenibilidad**: Código modular y bien documentado
5. **Transparencia**: Logs detallados para debugging

---

## 📝 **NOTAS DE IMPLEMENTACIÓN**

- Mantener compatibilidad con el código existente
- Añadir logs abundantes para debugging inicial
- Considerar feature flag para activar/desactivar las mejoras
- Documentar métricas de éxito/fallo para optimización futura