# 📄 VISOR DE FACTURAS MEJORADO - ESPECIFICACIÓN ACTUALIZADA

## 🎯 OBJETIVO
Mejorar la visualización actual de facturas procesadas creando un visor profesional tipo modal que muestre el PDF original junto con los datos extraídos en un diseño limpio y moderno.

---

## 📊 ESTADO ACTUAL vs OBJETIVO

### **❌ LO QUE TIENES AHORA:**
- ✅ Extracción funcionando (Google Document AI + Edge Function)
- ✅ Datos guardados en `datos_extraidos_facturas`
- ✅ Interface básica que muestra campos extraídos
- ❌ **SIN PDF visible** - Solo datos en texto plano
- ❌ **Diseño básico** - No es profesional
- ❌ **Sin contexto visual** - No se ve la factura original
- ❌ **Difícil de validar** - No puedes verificar si los datos son correctos

### **✅ LO QUE VAMOS A CREAR:**
- 🎨 **Diseño profesional** como el ejemplo de Gemini
- 📄 **PDF visible** al lado de los datos
- 🔍 **Overlays de confianza** sobre el PDF
- ✏️ **Edición en tiempo real** de campos
- 💾 **Auto-guardado** de correcciones
- 📱 **Responsive** - Funciona en móvil y desktop

---

## 🏗️ NUEVA ARQUITECTURA

### **LAYOUT MEJORADO:**
```
┌─────────────────────────────────────────────────────────────┐
│  🗂️ Factura #1301 - MADACO 2019, S.L.U.        [< >] [×]  │
├─────────────────────────┬───────────────────────────────────┤
│                         │  📋 DATOS EXTRAÍDOS              │
│                         │  ┌─────────────────────────────┐  │
│    📄 PDF ORIGINAL      │  │ ✅ Proveedor                │  │
│                         │  │ MADACO 2019, S.L.U.        │  │
│    [overlays colores]   │  │ 📊 Confianza: 95%          │  │
│                         │  ├─────────────────────────────┤  │
│                         │  │ ⚠️ CIF                     │  │
│                         │  │ B10824431 [editar]         │  │
│                         │  │ 📊 Confianza: 70%          │  │
│                         │  ├─────────────────────────────┤  │
│                         │  │ ✅ Total Factura           │  │
│                         │  │ 1.534,39 €                 │  │
│                         │  │ 📊 Confianza: 98%          │  │
│  [🔍-] [🔍+] [📱]      │  └─────────────────────────────┘  │
└─────────────────────────┴───────────────────────────────────┘
```

---

## 🔧 COMPONENTES A CREAR

### **1. MODAL PROFESIONAL**
- **Diseño**: Similar al estilo limpio del ejemplo
- **Tamaño**: 90% pantalla, centrado
- **Responsive**: Desktop dual / Móvil pestañas
- **Animaciones**: Suaves de apertura/cierre

### **2. PDF VIEWER (Lado Izquierdo)**
- **PDF.js**: Renderizado completo
- **Zoom**: Botones +/- y scroll
- **Navegación**: Si factura tiene múltiples páginas
- **Calidad**: Alta resolución

### **3. PANEL DE DATOS (Lado Derecho)**
- **Diseño**: Cards limpias por sección
- **Colores**: Verde/Amarillo/Rojo por confianza
- **Iconos**: Para cada tipo de dato
- **Edición**: Click para editar campos

### **4. SISTEMA DE CONFIANZA VISUAL**
- **Verde** (>90%): ✅ + fondo verde claro
- **Amarillo** (70-90%): ⚠️ + fondo amarillo claro
- **Rojo** (<70%): ❌ + fondo rojo claro + [editar]

---

## 💾 ESTRUCTURA DE DATOS MEJORADA

### **API: get-factura-completa**
```json
{
  "factura": {
    "id": "uuid",
    "numero_factura": "1301",
    "fecha_factura": "2024-11-12",
    "proveedor_nombre": "MADACO 2019, S.L.U.",
    "proveedor_cif": "B10824431", 
    "total_factura": 1534.39,
    "base_imponible": 1387.40,
    "cuota_iva": 147.00,
    "tipo_iva": 21,
    "confianza_global": 0.85
  },
  "confianzas": {
    "proveedor_nombre": 0.95,
    "proveedor_cif": 0.70,
    "numero_factura": 0.85,
    "fecha_factura": 0.92,
    "total_factura": 0.98,
    "base_imponible": 0.88
  },
  "pdf_url": "https://storage.supabase.com/bucket/documento.pdf",
  "metadatos": {
    "fecha_procesamiento": "2024-11-12T10:30:00Z",
    "version_extractor": "2.1.0"
  }
}
```

---

## 🎨 DISEÑO UI DETALLADO

### **SECCIONES DEL PANEL DERECHO:**

#### **📋 1. INFORMACIÓN DEL PROVEEDOR**
```html
┌─ 🏢 DATOS DEL PROVEEDOR ─────────────────────┐
│ ✅ Nombre: MADACO 2019, S.L.U.  [95%]       │
│ ⚠️ CIF: B10824431              [70%] [✏️]   │
│ ✅ Dirección: CL GESSAMÍ Nº 13  [88%]       │
└─────────────────────────────────────────────┘
```

#### **📄 2. DATOS DE LA FACTURA**
```html
┌─ 📄 INFORMACIÓN FISCAL ─────────────────────┐
│ ⚠️ Número: FIRMA Y SELLO...    [65%] [✏️]   │
│ ✅ Fecha: 12/11/2024           [92%]        │
│ ❌ Vencimiento: No detectado   [0%]  [✏️]   │
└─────────────────────────────────────────────┘
```

#### **💰 3. IMPORTES**
```html
┌─ 💰 IMPORTES ───────────────────────────────┐
│ ✅ Total: 1.534,39 €           [98%]        │
│ ✅ Base Imp.: 1.387,40 €       [88%]        │
│ ✅ IVA: 147,00 €               [85%]        │
│ ✅ Tipo IVA: 21%               [95%]        │
└─────────────────────────────────────────────┘
```

#### **📊 4. RESUMEN GLOBAL**
```html
┌─ 📊 CALIDAD DE EXTRACCIÓN ──────────────────┐
│ Confianza Global: 85%          [🟡]         │
│ Campos Correctos: 6/8                       │
│ Requiere Revisión: 2 campos                 │
│                                              │
│ [💾 Guardar Cambios] [🔄 Reprocesar]       │
└─────────────────────────────────────────────┘
```

---

## 🔄 FLUJOS DE USUARIO MEJORADOS

### **ESCENARIO 1: Usuario revisa factura bien extraída**
1. **Dashboard** → Click "👁️ Ver Factura"
2. **Modal se abre** → Ve PDF + datos con ✅ verdes
3. **Revisión rápida** → Todo correcto
4. **Cierra modal** → Factura marcada como "Validada"

### **ESCENARIO 2: Usuario corrige errores**
1. **Modal abierto** → Ve campos ⚠️ amarillos y ❌ rojos
2. **Click campo rojo** → Se abre editor inline
3. **Corrige valor** → Auto-guardado + color cambia a ✅
4. **Todos verdes** → Factura marcada como "Corregida"

### **ESCENARIO 3: Usuario navega entre facturas**
1. **Modal con Factura A** → Botón "Siguiente →"
2. **Carga Factura B** → Sin cerrar modal
3. **Corrige campos** → Auto-guardado
4. **"← Anterior"** → Vuelve a Factura A con cambios guardados

---

## 📁 ARCHIVOS A CREAR

### **FRONTEND:**
```
/proyecto/
├── dashboard-facturas.html        # Lista de facturas (MEJORAR)
├── factura-viewer-modal.html      # Modal del visor (NUEVO)
├── factura-viewer.js              # Lógica del visor (NUEVO)
├── factura-viewer.css             # Estilos modernos (NUEVO)
└── pdf-renderer.js                # PDF.js + overlays (NUEVO)
```

### **BACKEND:**
```
/supabase/functions/
├── get-factura-data/              # API datos factura (NUEVO)
├── update-campo-factura/          # API guardar corrección (NUEVO)
└── validate-factura/              # API marcar como validada (NUEVO)
```

---

## ⚡ FUNCIONALIDADES TÉCNICAS

### **1. RENDERIZADO PDF**
- **PDF.js**: Librería oficial de Mozilla
- **Canvas**: Para overlays de confianza
- **Zoom**: 50% a 300% con botones
- **Performance**: Lazy loading de páginas

### **2. SISTEMA DE EDICIÓN**
- **Inline editing**: Click para editar
- **Validación**: Tiempo real por tipo de campo
- **Auto-guardado**: 2 segundos después de cambio
- **Feedback visual**: Spinner mientras guarda

### **3. NAVEGACIÓN**
- **Anterior/Siguiente**: Sin cerrar modal
- **Teclado**: ← → para navegar, Esc para cerrar
- **URLs**: Navegación con historial del navegador

---

## 📱 RESPONSIVE DESIGN

### **DESKTOP (>1024px):**
- Layout dual: PDF izquierda + datos derecha
- Ratio: 60% PDF / 40% datos
- Height: 90vh

### **TABLET (768px-1024px):**
- Layout dual ajustado: 50% / 50%
- Scrolling en panel de datos

### **MÓVIL (<768px):**
- Pestañas: [📄 PDF] [📋 Datos] [⚙️ Config]
- Modal pantalla completa
- Swipe entre pestañas

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### **🔥 FASE 1: ESTRUCTURA (Día 1)**
- [ ] Modal HTML con diseño base
- [ ] CSS responsive profesional
- [ ] Integración con dashboard actual
- [ ] API básica get-factura-data

### **📄 FASE 2: PDF VIEWER (Día 2)**
- [ ] Integración PDF.js
- [ ] Controles de zoom
- [ ] Navegación páginas
- [ ] Loading states

### **📝 FASE 3: PANEL DE DATOS (Día 2-3)**
- [ ] Renderizado de campos por sección
- [ ] Sistema de colores por confianza
- [ ] Edición inline de campos
- [ ] API update-campo-factura

### **⚡ FASE 4: INTERACTIVIDAD (Día 3)**
- [ ] Auto-guardado
- [ ] Navegación entre facturas
- [ ] Atajos de teclado
- [ ] Estados de validación

### **🔧 FASE 5: OPTIMIZACIÓN (Día 4)**
- [ ] Performance improvements
- [ ] Testing responsive
- [ ] Overlays en PDF (futuro)
- [ ] Analytics de uso

---

## 📊 MÉTRICAS DE ÉXITO

- ✅ **Tiempo de carga**: Modal abre en <1 segundo
- ✅ **Usabilidad**: Usuario puede revisar factura en <30 segundos
- ✅ **Precisión**: Sistema detecta errores visualmente al instante
- ✅ **Productividad**: 80% menos tiempo revisando facturas
- ✅ **Satisfacción**: Interfaz profesional y fluida

---

**🎯 Prioridad:** ALTA - Mejora crítica de UX  
**⏱️ Tiempo estimado:** 3-4 días  
**🔄 Iterativo:** Mejoras continuas según feedback  
**📅 Inicio:** Inmediato (ya tienes la base funcionando)