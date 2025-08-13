# SISTEMA COMPLETO - MÓDULOS 1 y 2
## Especificación Técnica Detallada: Desde Drag & Drop hasta Campos Extraídos

---

## 🎯 OBJETIVO GENERAL

Crear un sistema que permita al usuario **arrastrar un documento** (factura, albarán, ticket) y obtener **automáticamente todos los campos extraídos** con **renderizado visual en directo** del documento original y **corrección interactiva** de los datos detectados.

---

## 📁 MÓDULO 1: CAPTURA DE DOCUMENTOS

### 🖥️ INTERFAZ DE USUARIO REQUERIDA

#### **1. ZONA DE DRAG & DROP PRINCIPAL**

**Elementos HTML necesarios:**
- **Área de subida visual** (drag zone) con indicadores visuales
- **Botón "Seleccionar Archivo"** como alternativa
- **Indicador de progreso** de subida
- **Preview instantáneo** del documento subido
- **Área de metadatos** del archivo

**Componentes visuales a crear:**
```
┌─────────────────────────────────────────────────┐
│  📄 ARRASTRA TU DOCUMENTO AQUÍ                  │
│                                                 │
│      [Icono de nube con flecha hacia arriba]   │
│                                                 │
│  Formatos: PDF, JPG, PNG, WebP                 │
│  Tamaño máximo: 10MB                           │
│  Múltiples archivos: Hasta 10 simultáneos      │
│                                                 │
│           [Seleccionar Archivo]                 │
└─────────────────────────────────────────────────┘
```

#### **2. FUNCIONALIDADES DE DRAG & DROP**

**Estados visuales a implementar:**
- **Estado normal**: Borde punteado gris, fondo claro
- **Estado hover**: Borde sólido azul, fondo azul claro
- **Estado dragover**: Borde sólido verde, fondo verde claro + animación
- **Estado error**: Borde rojo, mensaje de error específico
- **Estado cargando**: Spinner + barra de progreso

**Validaciones en tiempo real:**
- **Formato**: Solo PDF, JPG, PNG, WebP
- **Tamaño**: Máximo 10MB por archivo
- **Cantidad**: Hasta 10 archivos simultáneos
- **Calidad**: Verificación de legibilidad básica

#### **3. PREVIEW INSTANTÁNEO**

**Para cada archivo subido, mostrar:**
```
┌─────────────────────────────────────────────────┐
│  📄 factura_makro_001.pdf                      │
│  ┌─────────┐ │ Tipo: Factura (95% confianza)   │
│  │ [thumb] │ │ Tamaño: 2.4 MB                  │
│  │ [nails] │ │ Páginas: 2                       │
│  └─────────┘ │ Calidad: Alta ✅                │
│              │ Estado: Procesando... 🔄        │
│              │ [Eliminar] [Procesar ahora]     │
└─────────────────────────────────────────────────┘
```

### 🔧 COMPONENTES TÉCNICOS A DESARROLLAR

#### **1. File Upload API Manager**

**Funciones necesarias:**
- `handleDragEnter()` - Detectar entrada de archivo
- `handleDragOver()` - Mantener estado de arrastre  
- `handleDragLeave()` - Salir del área de arrastre
- `handleDrop()` - Procesar archivo soltado
- `validateFile()` - Validar formato, tamaño, tipo
- `uploadToStorage()` - Subir a Supabase Storage

#### **2. Document Classifier (IA)**

**Sistema de clasificación automática:**
- **Input**: Archivo binario + metadatos
- **Proceso**: Análisis con Google Document AI
- **Output**: Tipo detectado + confianza

**Tipos a detectar:**
- 📄 **FACTURAS** (prioridad alta)
- 📋 **ALBARANES** (prioridad media)  
- 🧾 **TICKETS** (prioridad baja)
- 🏦 **EXTRACTOS BANCARIOS** (prioridad baja)

#### **3. Quality Validator**

**Validaciones a implementar:**
- **Formato correcto**: PDF legible o imagen clara
- **Resolución suficiente**: Mínimo 150 DPI
- **Orientación correcta**: Detección de rotación
- **Legibilidad**: Contraste y nitidez adecuados
- **Integridad**: Archivo no corrupto

#### **4. Storage Manager**

**Funcionalidades de almacenamiento:**
- **Subida a Supabase Storage** con CDN
- **Generación de thumbnails** automática
- **Backup redundante** en múltiples ubicaciones
- **URLs seguras** con tokens de acceso

#### **5. Queue Manager**

**Sistema de cola inteligente:**
```
PRIORIDAD 1: Facturas (procesamiento inmediato)
PRIORIDAD 2: Albaranes (procesamiento en 30 segundos)  
PRIORIDAD 3: Tickets (procesamiento en 2 minutos)
PRIORIDAD 4: Extractos (procesamiento en 5 minutos)
```

### 💾 ESTRUCTURA DE DATOS - MÓDULO 1

**Tablas de base de datos requeridas:**

```sql
-- Tabla principal de documentos
CREATE TABLE documentos (
    id UUID PRIMARY KEY,
    nombre_archivo VARCHAR(255),
    tipo_documento ENUM('factura', 'albaran', 'ticket', 'extracto'),
    formato_archivo VARCHAR(10), -- PDF, JPG, PNG, WebP
    tamaño_bytes BIGINT,
    numero_paginas INTEGER,
    url_storage TEXT, -- URL de Supabase
    url_thumbnail TEXT, -- Miniatura generada
    confianza_clasificacion DECIMAL(3,2), -- 0.00-1.00
    calidad_estimada ENUM('alta', 'media', 'baja'),
    estado ENUM('subido', 'validado', 'procesando', 'procesado', 'error'),
    metadatos_archivo JSONB,
    prioridad INTEGER, -- Para cola
    fecha_subida TIMESTAMP,
    checksum_archivo VARCHAR(64) -- Anti-duplicados
);

-- Cola de procesamiento
CREATE TABLE cola_procesamiento (
    id UUID PRIMARY KEY,
    documento_id UUID REFERENCES documentos(id),
    prioridad INTEGER, -- 1=facturas, 2=albaranes, etc.
    estado ENUM('pendiente', 'procesando', 'completado', 'error'),
    intentos INTEGER DEFAULT 0,
    fecha_programada TIMESTAMP,
    tiempo_estimado_ms INTEGER
);
```

---

## 🧠 MÓDULO 2: EXTRACCIÓN OCR + IA

### 🖥️ INTERFAZ DE RENDERIZADO Y CORRECCIÓN

#### **1. LAYOUT DUAL RESPONSIVO**

**DESKTOP (>1024px):**
```
┌─────────────────┬─────────────────┐
│   PDF VIEWER    │   FORM FIELDS   │
│   (Lado izq.)   │   (Lado der.)   │
│                 │                 │
│  [Documento]    │ ┌─Proveedor────┐ │
│  con overlays   │ │Coca Cola...  │ │
│  de confianza   │ └──────────────┘ │
│                 │ ┌─CIF──────────┐ │
│  🔍 Zoom tools  │ │A28004743     │ │
│  📄 Page nav    │ └──────────────┘ │
│  🎨 Overlays    │ ┌─Importe──────┐ │
│  ⚙️ Config      │ │5.500,00€     │ │
│                 │ └──────────────┘ │
└─────────────────┴─────────────────┘
```

**TABLET (768-1023px):**
```
┌─────────────────────────────────────┐
│           PDF VIEWER                │
│          [Documento]                │
├─────────────────────────────────────┤
│           FORM FIELDS               │
│ ┌─Proveedor─┐  ┌─Importe────────┐   │
│ │Coca Cola..│  │5.500,00€       │   │
└─────────────────────────────────────┘
```

**MÓVIL (<768px):**
```
┌─────────────────────────┐
│    📄 DOCUMENTO         │
│    [Tap para editar]    │
├─────────────────────────┤
│    ✏️ CAMPO ACTUAL      │
│ ┌─Campo Activo────────┐ │
│ │ Valor a corregir    │ │
│ └─────────────────────┘ │
│ [◀ Ant.] [Sig. ▶]     │
└─────────────────────────┘
```

#### **2. SISTEMA DE OVERLAYS VISUALES**

**Códigos de color por confianza:**

```css
/* Confianza ALTA (>90%) */
.confianza-alta {
  border: 2px solid #10b981; /* Verde */
  background: rgba(16, 185, 129, 0.1);
}

/* Confianza MEDIA (70-90%) */  
.confianza-media {
  border: 2px solid #f59e0b; /* Amarillo */
  background: rgba(245, 158, 11, 0.15);
}

/* Confianza BAJA (<70%) */
.confianza-baja {
  border: 2px solid #ef4444; /* Rojo */
  background: rgba(239, 68, 68, 0.2);
}

/* Campo CORREGIDO por usuario */
.campo-corregido {
  border: 2px dashed #8b5cf6; /* Morado */
  background: rgba(139, 92, 246, 0.1);
}
```

**Interactividad de overlays:**
- **Click en overlay** → Selecciona campo en formulario
- **Hover en overlay** → Muestra tooltip con valor detectado
- **Doble click** → Abre zoom ampliado del área

### 🔧 COMPONENTES TÉCNICOS A DESARROLLAR

#### **1. PDF.js Renderer**

**Funcionalidades del visor:**
- **Renderizado multi-página** con navegación
- **Zoom inteligente**: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x, 3x
- **Ajuste automático** a pantalla
- **Búsqueda de texto** dentro del PDF
- **Rotación** si el documento está girado

#### **2. Canvas Overlay Manager**

**Sistema de capas visual:**
- **Capa base**: Documento PDF renderizado
- **Capa overlays**: Rectángulos de confianza
- **Capa interacción**: Eventos click y hover
- **Capa anotaciones**: Marcas del usuario

#### **3. Google Document AI Client**

**Integración con OCR:**
- **API oficial** de Google Document AI
- **Procesamiento por lotes** para múltiples páginas
- **Detección de tablas** en facturas
- **Extracción de coordenadas** de cada palabra
- **Manejo de errores** y reintentos

#### **4. NER Engine (spaCy)**

**Reconocimiento de entidades:**
- **Modelo base**: `es_core_news_lg` (español)
- **Patrones personalizados**: CIF, fechas españolas, euros
- **Context awareness**: Comprensión del contexto
- **Confidence scoring**: Puntuación 0-1 por campo

#### **5. Embedding Generator**

**Vectorización para matching:**
- **OpenAI text-embedding-3-small**: 1536 dimensiones
- **Embeddings por proveedor**: Para deduplicación
- **Embeddings por producto**: Para matching
- **Embeddings generales**: Para similitud global

### 🎯 CAMPOS DE EXTRACCIÓN ESPECÍFICOS

#### **📄 FACTURAS**

**DATOS DEL PROVEEDOR:**
- Nombre comercial completo
- CIF/NIF con validación
- Dirección fiscal completa
- Teléfono y email (si disponible)

**DATOS FISCALES:**
- Número de factura (formato libre)
- Fecha de factura (DD/MM/YYYY)
- Fecha de vencimiento  
- Período de facturación (si aplica)

**IMPORTES:**
- Base imponible (€)
- Tipo de IVA (%, múltiples tipos)
- Cuota de IVA (€)
- Total factura (€)
- Retenciones IRPF (si aplica)

**DETALLE DE PRODUCTOS:**
- Descripción completa
- Cantidad (unidades/kg/litros)
- Precio unitario sin IVA
- Precio total por línea
- Código de producto (si existe)

#### **📋 ALBARANES**

**DATOS DE ENTREGA:**
- Número de albarán
- Fecha de entrega
- Transportista (si especifica)
- Condiciones de entrega

**PRODUCTOS ENTREGADOS:**
- Descripción del producto
- Cantidad entregada
- Unidad de medida
- Precio unitario (si incluye precios)
- Estado del producto (fresco/congelado/seco)

#### **🧾 TICKETS**

**ESTABLECIMIENTO:**
- Nombre del comercio
- CIF del establecimiento
- Dirección (si legible)

**DATOS DE COMPRA:**
- Fecha y hora
- Número de ticket
- Método de pago
- Cajero/terminal (si visible)

### 🔄 FLUJO DE CORRECCIÓN INTERACTIVA

#### **1. SISTEMA DE NAVEGACIÓN INTELIGENTE**

**Atajos de teclado:**
- `Tab` / `Enter`: Siguiente campo con problemas
- `Shift+Tab`: Campo anterior
- `F4`: Siguiente campo con baja confianza
- `F2`: Editar campo seleccionado
- `Ctrl+S`: Guardar manual
- `Ctrl+Z`: Deshacer último cambio
- `Escape`: Cancelar edición actual

#### **2. VALIDACIÓN EN TIEMPO REAL**

**Tipos de validación:**
```javascript
const validadores = {
  cif: /^[A-Z]\d{8}[A-Z0-9]$/, // CIF español
  fecha: /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
  importe: /^\d+[,\.]\d{2}€?$/, // Formato español
  telefono: /^[679]\d{8}$/ // Móviles españoles
};
```

#### **3. SISTEMA DE AUTOCOMPLETADO**

**Fuentes de autocompletado:**
- **Proveedores frecuentes** del historial
- **Productos históricos** ya procesados
- **Ciudades españolas** para direcciones
- **Bancos españoles** para datos bancarios

#### **4. GUARDADO AUTOMÁTICO**

**Estrategia de persistencia:**
- **Cada cambio**: Guardado en localStorage
- **Cada 5 segundos**: Sincronización con Supabase
- **Al cambiar campo**: Validación + guardado
- **Al salir**: Confirmación si hay cambios pendientes

### 💾 ESTRUCTURA DE DATOS - MÓDULO 2

```sql
-- Resultados de extracción OCR
CREATE TABLE extracciones_ocr (
    id UUID PRIMARY KEY,
    documento_id UUID REFERENCES documentos(id),
    texto_completo_ocr TEXT,
    coordenadas_texto JSONB, -- Posición de cada palabra
    confianza_ocr DECIMAL(3,2),
    tiempo_procesamiento_ms INTEGER,
    tokens_consumidos INTEGER,
    modelo_ocr_utilizado VARCHAR(50),
    idioma_detectado VARCHAR(10)
);

-- Datos extraídos de facturas
CREATE TABLE datos_extraidos_facturas (
    id UUID PRIMARY KEY,
    documento_id UUID REFERENCES documentos(id),
    -- PROVEEDOR
    proveedor_nombre VARCHAR(255),
    proveedor_cif VARCHAR(12),
    proveedor_direccion TEXT,
    proveedor_telefono VARCHAR(20),
    proveedor_email VARCHAR(100),
    confianza_proveedor DECIMAL(3,2),
    -- FISCALES
    numero_factura VARCHAR(50),
    fecha_factura DATE,
    fecha_vencimiento DATE,
    periodo_facturacion VARCHAR(50),
    confianza_datos_fiscales DECIMAL(3,2),
    -- IMPORTES
    base_imponible DECIMAL(10,2),
    tipo_iva DECIMAL(5,2),
    cuota_iva DECIMAL(10,2),
    total_factura DECIMAL(10,2),
    retencion_irpf DECIMAL(10,2),
    confianza_importes DECIMAL(3,2),
    -- METADATOS
    confianza_global DECIMAL(3,2),
    requiere_revision BOOLEAN,
    campos_con_baja_confianza TEXT[]
);

-- Productos extraídos por línea
CREATE TABLE productos_extraidos (
    id UUID PRIMARY KEY,
    documento_id UUID REFERENCES documentos(id),
    linea_numero INTEGER,
    descripcion TEXT,
    cantidad DECIMAL(10,3),
    unidad_medida VARCHAR(20),
    precio_unitario DECIMAL(10,4),
    precio_total_linea DECIMAL(10,2),
    codigo_producto VARCHAR(50),
    embedding_descripcion VECTOR(1536), -- Para matching
    confianza_linea DECIMAL(3,2)
);

-- Embeddings para matching
CREATE TABLE embeddings_documentos (
    id UUID PRIMARY KEY,
    documento_id UUID REFERENCES documentos(id),
    embedding_proveedor VECTOR(1536),
    embedding_productos VECTOR(1536),
    embedding_contenido_general VECTOR(1536),
    modelo_embedding VARCHAR(50)
);
```

### ⚙️ ALGORITMO DE CONFIANZA

**Fórmula de cálculo:**
```
CONFIANZA_CAMPO = (
    OCR_confidence × 0.4 +      # Confianza del OCR
    NER_confidence × 0.3 +      # Confianza del NER
    Format_validation × 0.2 +   # Validación de formato
    Context_coherence × 0.1     # Coherencia contextual
)
```

**Umbrales de acción:**
- 🟢 **Alta (>0.9)**: Campo muy fiable, auto-confirmado
- 🟡 **Media (0.7-0.9)**: Requiere atención, resaltado amarillo
- 🔴 **Baja (<0.7)**: Revisión obligatoria, resaltado rojo

---

## 🚀 FLUJO COMPLETO DEL USUARIO

### **PASO 1: Captura**
1. Usuario **arrastra factura** al área de subida
2. Sistema **valida formato** y calidad
3. **Clasificación automática**: "Factura detectada (95% confianza)"
4. **Subida a storage** con preview instantáneo
5. **Cola de procesamiento**: Prioridad alta para facturas

### **PASO 2: Procesamiento**
1. **OCR con Google Document AI**: Extracción de texto completo
2. **NER con spaCy**: Identificación de campos específicos
3. **Validación matemática**: Base + IVA = Total
4. **Generación de embeddings**: Para matching futuro
5. **Cálculo de confianza**: Por cada campo extraído

### **PASO 3: Presentación**
1. **Renderizado PDF** en lado izquierdo
2. **Overlays de confianza** sobre campos detectados
3. **Formulario pre-rellenado** en lado derecho
4. **Colores por confianza**: Verde/Amarillo/Rojo
5. **Navegación inteligente** a campos problemáticos

### **PASO 4: Corrección**
1. **Click en overlay rojo** → Campo se selecciona
2. **Usuario corrige valor** con validación en tiempo real
3. **Autocompletado inteligente** sugiere opciones
4. **Guardado automático** cada 5 segundos
5. **Feedback al ML** para aprendizaje continuo

### **PASO 5: Confirmación**
1. **Validación final**: Todos los campos verdes
2. **Botón "Confirmar"** se habilita
3. **Datos estructurados** guardados en BD
4. **Disponible para matching** con albaranes
5. **Métricas de aprendizaje** registradas

---

## 📋 CHECKLIST DE DESARROLLO

### **MÓDULO 1: Captura**
- [ ] Zona drag & drop con estados visuales
- [ ] Validación de archivos en tiempo real  
- [ ] Clasificación automática con IA
- [ ] Preview instantáneo con metadatos
- [ ] Sistema de cola por prioridades
- [ ] Integración con Supabase Storage
- [ ] Generación automática de thumbnails
- [ ] Detección de duplicados por checksum

### **MÓDULO 2: Extracción + Renderizado**
- [ ] Integración Google Document AI
- [ ] Motor NER con spaCy personalizado
- [ ] Renderizado PDF con PDF.js
- [ ] Sistema de overlays de confianza
- [ ] Formularios dinámicos por tipo documento
- [ ] Validación matemática automática
- [ ] Autocompletado inteligente
- [ ] Guardado automático con recovery
- [ ] Atajos de teclado para productividad
- [ ] Optimización móvil completa
- [ ] Sistema de feedback para ML
- [ ] Generación de embeddings vectoriales

---

## 🎯 RESULTADO ESPERADO

Al finalizar la implementación, el usuario podrá:

1. **Arrastrar una factura** → Sistema la procesa automáticamente
2. **Ver el documento renderizado** → Con overlays de confianza visual
3. **Corregir campos erróneos** → Con validación en tiempo real
4. **Navegar inteligentemente** → Solo a campos que necesitan atención
5. **Confirmar datos finales** → Estructurados y listos para usar
6. **Aprendizaje automático** → El sistema mejora con cada corrección

**Tiempo objetivo**: De subida a confirmación en **menos de 2 minutos** por factura, con **95%+ de precisión** después de las primeras correcciones de entrenamiento.