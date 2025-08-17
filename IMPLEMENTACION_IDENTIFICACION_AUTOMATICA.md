# 🎯 IMPLEMENTACIÓN DE IDENTIFICACIÓN AUTOMÁTICA DE DOCUMENTOS

## 📋 RESUMEN DE IMPLEMENTACIÓN

Se ha implementado un **sistema inteligente de identificación automática** que distingue entre facturas y albaranes durante el procesamiento de documentos.

## 🏗️ ARQUITECTURA IMPLEMENTADA

### **1. FUNCIONES PRINCIPALES**

#### **`identificarTipoDocumento(contenido, userContext)`**
- **Propósito**: Analiza el contenido del documento y determina si es factura o albarán
- **Entrada**: Datos extraídos del documento + contexto del usuario
- **Salida**: Tipo de documento, confianza (%), razones de la decisión

#### **`manejarConfianzaBaja(record, userContext, identificacion, supabaseClient)`**
- **Propósito**: Gestiona documentos con confianza < 70%
- **Acciones**: 
  - WhatsApp → Pregunta al usuario
  - Web App → Marca para revisión manual
  - Email → Marca para revisión

#### **`procesarDocumentoAutomatico(record, userContext, tipoDocumento, supabaseClient)`**
- **Propósito**: Procesa automáticamente documentos con confianza ≥ 70%
- **Acciones**: Guarda en tabla correcta + ejecuta cotejo automático

### **2. FLUJO DE PROCESAMIENTO**

```
📄 DOCUMENTO RECIBIDO
        ↓
🤖 EXTRACCIÓN CON IA
        ↓
🎯 IDENTIFICACIÓN AUTOMÁTICA
        ↓
❓ ¿CONFIANZA ALTA? (≥70%)
        ↓
✅ SÍ → Procesar automáticamente
❌ NO → Requiere revisión
        ↓
📱 WhatsApp → Preguntar al usuario
🌐 Web App → Botones de revisión
📧 Email → Marcar para revisión
```

## 🔍 ALGORITMO DE IDENTIFICACIÓN

### **FACTORES DE DECISIÓN**

#### **1. ORIGEN DEL DOCUMENTO (Bonus)**
- **WhatsApp**: +20 puntos para albaranes
- **Email**: +20 puntos para facturas
- **Upload/API**: Neutral (0 puntos)

#### **2. PALABRAS CLAVE EN CONTENIDO**
- **Factura**: factura, invoice, bill, cliente, IVA, impuestos, etc.
- **Albarán**: albaran, delivery, entrega, recepcion, firma, conforme, etc.

#### **3. CAMPOS ESPECÍFICOS**
- **Factura**: numero_factura, total_factura, IVA, etc.
- **Albarán**: numero_albaran, total_albaran, firma_conforme, etc.

#### **4. ESTRUCTURA DEL DOCUMENTO**
- **Factura**: Productos con precios unitarios
- **Albarán**: Productos con firmas de conformidad

### **CÁLCULO DE SCORE**

```typescript
// Ejemplo de cálculo
const scoreFactura = origenBonus + palabrasClave + camposEspecificos + estructura;
const scoreAlbaran = origenBonus + palabrasClave + camposEspecificos + estructura;

// Confianza = (Score ganador / Total) * 100
const confianza = Math.min(100, (scoreGanador / (scoreFactura + scoreAlbaran)) * 100);
```

## 📊 UMBRALES DE DECISIÓN

| **CONFIANZA** | **ACCIÓN** | **DESCRIPCIÓN** |
|---------------|------------|------------------|
| **≥ 70%** | ✅ Procesamiento automático | Documento procesado inmediatamente |
| **< 70%** | ⚠️ Requiere revisión | Se envía para confirmación manual |

## 🎯 IMPLEMENTACIÓN EN PROCESS-INVOICE

### **INTEGRACIÓN EN EL FLUJO PRINCIPAL**

```typescript
// Después de extraer datos con IA
const resultadoIdentificacion = await identificarTipoDocumento(extractedData, contextoIdentificacion);
const { tipoDocumento, confianza, razones } = resultadoIdentificacion;

if (confianza < 70) {
  // CONFIANZA BAJA: Requiere revisión
  resultadoProcesamiento = await manejarConfianzaBaja(/* ... */);
} else {
  // CONFIANZA ALTA: Procesar automáticamente
  if (tipoDocumento === 'factura') {
    resultadoProcesamiento = await guardarFacturaCompleta(/* ... */);
    await ejecutarCotejoAutomatico(documentId, supabaseClient);
  } else {
    resultadoProcesamiento = await guardarAlbaranCompleto(/* ... */);
    await ejecutarCotejoAutomaticoAlbaran(documentId, supabaseClient);
  }
}
```

## 📱 CANALES DE REVISIÓN

### **1. WHATSAPP**
- **Trigger**: Confianza < 70% + origen WhatsApp
- **Acción**: Envía mensaje preguntando "¿FACTURA o ALBARÁN?"
- **Respuesta**: Usuario responde por WhatsApp
- **Procesamiento**: Se procesa según respuesta del usuario

### **2. APLICACIÓN WEB**
- **Trigger**: Confianza < 70% + origen Upload
- **Acción**: Muestra botones de revisión en la interfaz
- **Botones**: 
  - "Es FACTURA" (verde)
  - "Es ALBARÁN" (azul)
  - "Revisar más tarde" (amarillo)

### **3. EMAIL**
- **Trigger**: Confianza < 70% + origen Email
- **Acción**: Marca para revisión manual
- **Procesamiento**: Requiere intervención del usuario

## 🗄️ TABLA DE PENDIENTES

### **ESTRUCTURA IMPLEMENTADA**

```sql
CREATE TABLE documentos_pendientes_revision (
  id UUID PRIMARY KEY,
  documento_id VARCHAR(255) UNIQUE,
  origen VARCHAR(50), -- 'whatsapp', 'email', 'upload', 'api'
  telefono VARCHAR(50),
  usuario_id UUID,
  tipo_sugerido VARCHAR(20), -- 'factura', 'albaran'
  confianza INTEGER,
  razones TEXT[],
  estado VARCHAR(50), -- 'pendiente_respuesta', 'pendiente_revision_manual', 'resuelto'
  respuesta_usuario VARCHAR(20),
  timestamp TIMESTAMP,
  resuelto_at TIMESTAMP,
  resuelto_por VARCHAR(50),
  datos_documento JSONB
);
```

## 🚀 FUNCIONES DE COTEJO

### **1. COTEJO AUTOMÁTICO PARA FACTURAS**
```typescript
await ejecutarCotejoAutomatico(documentId, supabaseClient);
// Llama a la Edge Function cotejo-inteligente
```

### **2. COTEJO AUTOMÁTICO PARA ALBARANES**
```typescript
await ejecutarCotejoAutomaticoAlbaran(documentId, supabaseClient);
// Marca albarán como disponible para cotejo futuro
```

## 📋 LOGS Y AUDITORÍA

### **LOGS IMPLEMENTADOS**

```typescript
console.log(`🎯 Documento identificado: ${tipoDocumento} (Confianza: ${confianza}%)`);
console.log(` Razones: ${razones.join(', ')}`);
console.log(`🔍 Scores - Factura: ${totalFactura}, Albarán: ${totalAlbaran}`);
```

### **INFORMACIÓN REGISTRADA**

- Tipo de documento identificado
- Porcentaje de confianza
- Razones de la decisión
- Scores individuales
- Origen del documento
- Timestamp de identificación

## 🔧 CONFIGURACIÓN REQUERIDA

### **VARIABLES DE ENTORNO**

```bash
# WhatsApp (opcional)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### **TABLAS DE BASE DE DATOS**

1. **`documentos_pendientes_revision`** - Pendientes de revisión
2. **`datos_extraidos_facturas`** - Facturas procesadas
3. **`datos_extraidos_albaranes`** - Albaranes procesados

## 🎯 CASOS DE USO

### **ESCENARIO 1: ALBARÁN POR WHATSAPP**
1. Usuario envía foto de albarán por WhatsApp
2. Sistema identifica como albarán (confianza 85%)
3. Se procesa automáticamente
4. Se ejecuta cotejo automático

### **ESCENARIO 2: FACTURA COMPLEJA**
1. Usuario sube factura compleja por web app
2. Sistema identifica como factura (confianza 65%)
3. Se marca para revisión manual
4. Usuario confirma tipo en la interfaz

### **ESCENARIO 3: DOCUMENTO AMBIGUO**
1. Documento con características mixtas
2. Sistema no puede decidir (confianza 45%)
3. Se envía pregunta por WhatsApp
4. Usuario responde y se procesa

## 🚀 PRÓXIMOS PASOS

### **MEJORAS FUTURAS**

1. **Cotejo bidireccional**: Albaranes que busquen facturas
2. **Machine Learning**: Aprender de decisiones del usuario
3. **Patrones temporales**: Detectar periodicidades por proveedor
4. **Validación cruzada**: Verificar coherencia entre documentos

### **OPTIMIZACIONES**

1. **Cache de decisiones**: Evitar reprocesar documentos similares
2. **Batch processing**: Procesar múltiples documentos simultáneamente
3. **Async processing**: Procesamiento en segundo plano para mejor UX

## ✅ ESTADO ACTUAL

- ✅ **Identificación automática** implementada
- ✅ **Manejo de confianza baja** implementado
- ✅ **Canales de revisión** configurados
- ✅ **Tabla de pendientes** creada
- ✅ **Integración con cotejo** implementada
- ✅ **Logging completo** implementado

## 🔍 PRUEBAS RECOMENDADAS

1. **Subir factura clara** → Debe identificarse automáticamente
2. **Subir albarán claro** → Debe identificarse automáticamente
3. **Subir documento ambiguo** → Debe marcarse para revisión
4. **Probar por WhatsApp** → Debe enviar pregunta si es necesario
5. **Verificar logs** → Debe mostrar proceso de decisión

---

**Sistema listo para producción** 🚀
