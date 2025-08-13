# 🚀 GUÍA DE INTEGRACIÓN - Modal Avanzado de PDF

## 📋 **Archivos Creados**

1. **`advanced-pdf-modal.js`** - Clase principal del modal
2. **`advanced-pdf-modal.css`** - Estilos completos del modal  
3. **`test-advanced-modal.html`** - Página de prueba y demostración

## 🔧 **Integración en tu Dashboard**

### **Paso 1: Incluir Archivos**

Añade estos archivos a tu `dashboard-facturas.html`:

```html
<!-- En el <head> -->
<link rel="stylesheet" href="advanced-pdf-modal.css">

<!-- Antes de cerrar </body> -->
<script src="advanced-pdf-modal.js"></script>
```

### **Paso 2: Inicializar el Modal**

En tu `dashboard-facturas.js`, añade:

```javascript
// 🌍 INICIALIZAR MODAL AVANZADO
let advancedPDFModal;

document.addEventListener('DOMContentLoaded', function() {
    // ... tu código existente ...
    
    // Inicializar modal avanzado
    advancedPDFModal = new AdvancedPDFModal();
    console.log('✅ Modal avanzado inicializado');
});
```

### **Paso 3: Integrar con tu Sistema de Datos**

Modifica tu función de apertura de facturas para usar el modal avanzado:

```javascript
// 🎯 FUNCIÓN: Abrir factura con modal avanzado
function openInvoiceAdvanced(invoiceData) {
    if (!advancedPDFModal) {
        console.error('Modal no inicializado');
        return;
    }
    
    // Extraer coordenadas de los datos
    const coordinates = invoiceData.coordenadas_campos || {};
    
    // Extraer datos generales
    const extractedData = {
        proveedor_nombre: invoiceData.proveedor_nombre,
        proveedor_cif: invoiceData.proveedor_cif,
        numero_factura: invoiceData.numero_factura,
        fecha_factura: invoiceData.fecha_factura,
        total_factura: invoiceData.total_factura,
        base_imponible: invoiceData.base_imponible,
        cuota_iva: invoiceData.cuota_iva,
        tipo_iva: invoiceData.tipo_iva,
        confianza_global: invoiceData.confianza_global
    };
    
    // URL del PDF (desde tu sistema)
    const pdfUrl = invoiceData.url_storage || invoiceData.pdf_url;
    
    // Abrir modal avanzado
    advancedPDFModal.open(pdfUrl, coordinates, extractedData);
    
    console.log('🚀 Modal avanzado abierto con:', {
        coordinates: Object.keys(coordinates).length,
        data: extractedData
    });
}
```

### **Paso 4: Botón en tu Tabla**

Añade un botón para abrir el modal avanzado en tu tabla de facturas:

```javascript
// En tu función de renderizado de tabla
function renderInvoiceRow(invoice) {
    return `
        <tr>
            <td>${invoice.numero_factura}</td>
            <td>${invoice.proveedor_nombre}</td>
            <td>${invoice.total_factura}€</td>
            <td>${invoice.fecha_factura}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openInvoiceAdvanced(${JSON.stringify(invoice)})">
                    🔍 Vista Avanzada
                </button>
                <!-- ... otros botones ... -->
            </td>
        </tr>
    `;
}
```

## 🎯 **Funcionalidades Disponibles**

### **🔍 Zoom Avanzado**
- **Botones:** 🔍+ / 🔍- / 🔍↺
- **Teclado:** `+` / `-` / `0`
- **Scroll:** `Ctrl + Wheel`
- **Rango:** 50% - 300%

### **🖱️ Navegación**
- **Drag & Drop:** Arrastrar PDF con mouse
- **Flechas:** Navegación con teclado
- **Scroll:** Scroll natural del contenedor

### **🎨 Colores por Confianza**
- **🟢 Verde:** Alta confianza (≥80%)
- **🟡 Amarillo:** Media confianza (60-79%)
- **🔴 Rojo:** Baja confianza (<60%)

### **📍 Overlay de Coordenadas**
- **Visualización precisa** de campos extraídos
- **Tooltips informativos** al hacer hover
- **Click para resaltar** campos específicos
- **Filtros** por tipo de campo

### **📊 Estadísticas en Tiempo Real**
- **Confianza global** del documento
- **Conteo de campos** extraídos
- **Distribución** por nivel de confianza
- **Actualización automática**

## 🔄 **Personalización**

### **Cambiar Colores de Confianza**

```javascript
// En advanced-pdf-modal.js, modifica getConfidenceColor()
getConfidenceColor(confidence) {
    if (confidence >= 0.8) return '#10B981'      // Verde
    if (confidence >= 0.6) return '#F59E0B'      // Amarillo  
    return '#EF4444'                              // Rojo
}
```

### **Ajustar Rango de Zoom**

```javascript
// En el constructor de AdvancedPDFModal
this.minZoom = 0.3    // Zoom mínimo (30%)
this.maxZoom = 4.0    // Zoom máximo (400%)
this.zoomStep = 0.25  // Paso de zoom
```

### **Modificar Tamaños de Modal**

```css
/* En advanced-pdf-modal.css */
.modal-container {
    width: 98%;        /* Ancho del modal */
    max-width: 1600px; /* Ancho máximo */
    height: 95%;       /* Alto del modal */
    max-height: 1000px; /* Alto máximo */
}
```

## 📱 **Responsive Design**

El modal se adapta automáticamente:

- **Desktop (>1200px):** Layout horizontal (PDF + Info)
- **Tablet (768-1200px):** Layout vertical adaptativo
- **Mobile (<768px):** Layout completamente vertical

## 🚨 **Solución de Problemas**

### **Modal no se abre**
```javascript
// Verificar que esté inicializado
console.log('Modal:', advancedPDFModal);

// Verificar datos
console.log('Coordinates:', coordinates);
console.log('PDF URL:', pdfUrl);
```

### **PDF no se carga**
```javascript
// Verificar URL del PDF
console.log('PDF URL:', pdfUrl);

// Verificar CORS
// El PDF debe ser accesible desde tu dominio
```

### **Coordenadas no se muestran**
```javascript
// Verificar estructura de datos
console.log('Coordinates structure:', coordinates);

// Debe tener formato:
{
    "campo": {
        "x": 100, "y": 200,
        "width": 50, "height": 20,
        "confidence": 0.9, "text": "valor"
    }
}
```

## 🌟 **Próximos Pasos**

1. **Integrar** en tu dashboard existente
2. **Probar** con facturas reales
3. **Personalizar** colores y estilos
4. **Añadir** funcionalidades específicas
5. **Optimizar** para tu flujo de trabajo

## 📞 **Soporte**

Si tienes problemas:
1. Revisa la consola del navegador
2. Verifica que todos los archivos estén incluidos
3. Comprueba que PDF.js esté cargado
4. Verifica la estructura de tus datos

---

**¡Tu modal avanzado está listo para usar! 🎉**


const PROMPT_COMPLETO = `
Analiza esta factura y extrae:

CAMPOS PRINCIPALES:
- proveedor_nombre: Quien EMITE la factura
- numero_factura: Número de factura
- fecha_factura: Fecha de emisión
- total_factura: Importe total
- base_imponible: Base imponible (sin IVA)
- total_iva: Total de IVA

PRODUCTOS (línea por línea):
Para cada línea de producto extrae:
- descripcion_original: Descripción completa del producto
- cantidad: Cantidad (con decimales si es necesario)
- unidad_medida: kg, litros, unidades, etc.
- precio_unitario_sin_iva: Precio por unidad (sin IVA)
- precio_total_linea_sin_iva: Base imponible de la línea
- tipo_iva: % de IVA aplicado
- cuota_iva_linea: Cuota de IVA de la línea
- precio_total_linea_con_iva: Total de la línea (con IVA)
- descuento_porcentaje: % de descuento aplicado
- descuento_importe: Descuento en euros
- codigo_producto: Código del producto si existe
- categoria_principal: Categoría del producto

IMPORTANTE: 
- El proveedor es quien EMITE, NO quien recibe
- Extraer TODAS las líneas de productos
- Mantener la precisión de decimales
- Validar que precio_total_linea_con_iva = precio_total_linea_sin_iva + cuota_iva_linea

Responde en JSON válido con estructura:
{
  "datos_principales": {
    "proveedor_nombre": "...",
    "numero_factura": "...",
    "fecha_factura": "...",
    "total_factura": 0.00,
    "base_imponible": 0.00,
    "total_iva": 0.00
  },
  "productos": [
    {
      "descripcion_original": "...",
      "cantidad": 0.0,
      "unidad_medida": "...",
      "precio_unitario_sin_iva": 0.00,
      "precio_total_linea_sin_iva": 0.00,
      "tipo_iva": 21,
      "cuota_iva_linea": 0.00,
      "precio_total_linea_con_iva": 0.00,
      "descuento_porcentaje": 0,
      "descuento_importe": 0.00,
      "codigo_producto": "...",
      "categoria_principal": "..."
    }
  ]
}
`;