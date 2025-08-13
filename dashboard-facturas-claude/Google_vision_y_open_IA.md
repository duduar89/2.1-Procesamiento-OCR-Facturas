## ��️ **ROADMAP COMPLETO - IMPLEMENTACIÓN PASO A PASO**

### **�� OBJETIVO FINAL:**
Sistema híbrido que combine Google AI (OCR + coordenadas) + OpenAI (extracción inteligente) + Aprendizaje personalizado por restaurante.

---

## 📋 **FASE 1: FUNDAMENTOS - SEMANAS 1-2**

### **1.1 Preparar Base de Datos**
```sql
-- Crear nuevas tablas
CREATE TABLE prompts_restaurante (...);
CREATE TABLE correcciones_usuario (...);
CREATE TABLE patrones_error (...);
CREATE TABLE prompts_optimizados (...);

-- Añadir columnas a tabla existente
ALTER TABLE datos_extraidos_facturas ADD COLUMN confianza_openai_global DECIMAL(3,2);
ALTER TABLE datos_extraidos_facturas ADD COLUMN confianza_openai_proveedor DECIMAL(3,2);
-- ... más columnas de confianza
```

**¿Qué se crea?**
- 4 nuevas tablas
- 8 nuevas columnas en tabla existente
- Índices para optimización

### **1.2 Configurar Variables de Entorno**
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Google Document AI (cambiar processor)
GOOGLE_PROCESSOR_ID=document_ocr_processor_id
```

**¿Qué se crea?**
- Archivo de configuración
- Variables de entorno en Supabase
- Configuración de APIs

---

## 🔍 **FASE 2: OCR BÁSICO - SEMANAS 3-4**

### **2.1 Cambiar a Document AI OCR**
```typescript
// En Edge Function
const GOOGLE_PROCESSOR_ID = 'document_ocr_processor_id'; // Solo OCR

async function extraerTextoYCoordenadas(pdfUrl) {
    // Extraer solo texto + coordenadas básicas
    // NO extraer entidades (evitar confusión)
}
```

**¿Qué se crea?**
- Nueva función de extracción OCR
- Función de mapeo de coordenadas básicas
- Sistema de logging para OCR

### **2.2 Validar Extracción OCR**
```typescript
// Verificar que OCR funciona correctamente
async function validarOCR(pdfUrl) {
    const resultado = await extraerTextoYCoordenadas(pdfUrl);
    
    // Validar que se extrae texto
    // Validar que se obtienen coordenadas
    // Log de resultados para análisis
}
```

**¿Qué se crea?**
- Función de validación OCR
- Sistema de métricas de calidad OCR
- Logs de rendimiento

---

## 🤖 **FASE 3: INTEGRACIÓN OPENAI - SEMANAS 5-6**

### **3.1 Crear Prompt Base**
```typescript
const PROMPT_BASE = `
Analiza esta factura en español y extrae los siguientes campos:

CAMPOS REQUERIDOS:
- proveedor_nombre: Quien EMITE la factura
- proveedor_cif: CIF/NIF del proveedor
- numero_factura: Número de factura
- fecha_factura: Fecha de emisión
- total_factura: Importe total
- base_imponible: Base imponible (sin IVA)
- cuota_iva: Cuota de IVA

IMPORTANTE: El proveedor es quien EMITE la factura, NO quien la recibe.

Responde solo en formato JSON válido.
`;
```

**¿Qué se crea?**
- Prompt base estándar
- Función de validación de respuesta JSON
- Sistema de manejo de errores OpenAI

### **3.2 Integrar OpenAI en Edge Function**
```typescript
async function procesarConOpenAI(texto, prompt) {
    try {
        const resultado = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        });
        
        return JSON.parse(resultado.choices[0].message.content);
    } catch (error) {
        // Fallback a extracción manual
        return extraccionManual(texto);
    }
}
```

**¿Qué se crea?**
- Función de integración OpenAI
- Sistema de fallback
- Manejo de errores de API

---

## 🎯 **FASE 4: SISTEMA DE CONFIANZA - SEMANAS 7-8**

### **4.1 Calcular Confianza por Campo**
```typescript
function calcularConfianzaCampo(texto, campoExtraido, validaciones) {
    let confianza = 0.5; // Base 50%
    
    // Si el campo está completo en el texto
    if (texto.includes(campoExtraido)) confianza += 0.3;
    
    // Si pasa validaciones específicas
    if (validaciones[campo]) confianza += 0.2;
    
    return Math.min(confianza, 1.0);
}
```

**¿Qué se crea?**
- Sistema de cálculo de confianza
- Validaciones por tipo de campo
- Métricas de confianza global

### **4.2 Guardar Confianza en BD**
```typescript
async function guardarFacturaConConfianza(datos, confianzas) {
    const factura = {
        ...datos,
        confianza_openai_global: confianzas.global,
        confianza_openai_proveedor: confianzas.proveedor,
        confianza_openai_numero_factura: confianzas.numero_factura,
        // ... más campos de confianza
        prompt_utilizado: promptActual,
        modelo_openai: 'gpt-4'
    };
    
    await supabase.from('datos_extraidos_facturas').insert(factura);
}
```

**¿Qué se crea?**
- Función de guardado con confianza
- Sistema de tracking de prompts
- Logs de rendimiento por modelo

---

## �� **FASE 5: INTERFAZ DE CONFIANZA - SEMANAS 9-10**

### **5.1 Indicadores Visuales de Confianza**
```html
<div class="campo-extraido">
    <label>Proveedor:</label>
    <input value="ABC S.L." class="campo-editavel" />
    
    <!-- Indicador de confianza -->
    <div class="indicador-confianza alta">95%</div>
    
    <!-- Tooltip explicativo -->
    <div class="tooltip-confianza">
        <span class="icono-info">ℹ️</span>
        <div class="tooltip">
            <strong>Confianza: 95%</strong><br>
            • Campo encontrado en posición esperada<br>
            • Formato de CIF válido<br>
            • Texto claro y legible
        </div>
    </div>
</div>
```

**¿Qué se crea?**
- CSS para indicadores de confianza
- JavaScript para tooltips
- Sistema de colores por nivel de confianza

### **5.2 Campos Editables**
```typescript
// Hacer campos editables
function hacerCampoEditable(campoId) {
    const campo = document.getElementById(campoId);
    campo.removeAttribute('readonly');
    campo.classList.add('editando');
    
    // Añadir botón de guardar
    const botonGuardar = document.createElement('button');
    botonGuardar.textContent = '��';
    botonGuardar.onclick = () => guardarCorreccion(campoId);
    campo.parentNode.appendChild(botonGuardar);
}
```

**¿Qué se crea?**
- Sistema de edición de campos
- Botones de guardar cambios
- Validación de ediciones

---

## 🧠 **FASE 6: SISTEMA DE APRENDIZAJE - SEMANAS 11-12**

### **6.1 Captura de Correcciones**
```typescript
async function capturarCorreccion(facturaId, campo, valorOriginal, valorCorregido) {
    const correccion = {
        factura_id: facturaId,
        campo: campo,
        valor_original: valorOriginal,
        valor_corregido: valorCorregido,
        contexto_error: obtenerContextoCampo(facturaId, campo),
        coordenadas_error: obtenerCoordenadasCampo(facturaId, campo),
        timestamp_correccion: new Date(),
        usuario_id: currentUser.id
    };
    
    await supabase.from('correcciones_usuario').insert(correccion);
}
```

**¿Qué se crea?**
- Sistema de captura de correcciones
- Función de contexto de campos
- Logs de correcciones por usuario

### **6.2 Análisis de Patrones de Error**
```typescript
async function analizarPatronesError() {
    const correcciones = await supabase
        .from('correcciones_usuario')
        .select('*')
        .gte('timestamp_correccion', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    // Agrupar por campo y tipo de error
    const patrones = agruparCorrecciones(correcciones);
    
    // Identificar patrones comunes
    return identificarPatronesComunes(patrones);
}
```

**¿Qué se crea?**
- Función de análisis de patrones
- Sistema de agrupación de errores
- Identificación de problemas comunes

---

## 🏪 **FASE 7: PROMPTS PERSONALIZADOS - SEMANAS 13-14**

### **7.1 Interfaz de Gestión de Prompts**
```html
<div class="prompts-management">
    <h3>Prompts Personalizados - EL BUENO</h3>
    
    <!-- Editor de prompt -->
    <div class="prompt-editor">
        <h4>Prompt Personalizado</h4>
        <textarea id="promptText" rows="15" cols="80"></textarea>
        <button onclick="guardarPrompt()">💾 Guardar</button>
        <button onclick="probarPrompt()">🧪 Probar</button>
        <button onclick="restaurarPrompt()">🔄 Restaurar</button>
    </div>
    
    <!-- Gestión de proveedores frecuentes -->
    <div class="frequent-providers">
        <h4>Proveedores Frecuentes</h4>
        <input type="text" id="nuevoProveedor" placeholder="Añadir proveedor">
        <button onclick="añadirProveedor()">➕ Añadir</button>
        <ul id="listaProveedores"></ul>
    </div>
</div>
```

**¿Qué se crea?**
- Interfaz de gestión de prompts
- Editor de texto enriquecido
- Gestión de proveedores frecuentes

### **7.2 Sistema de Prompts por Restaurante**
```typescript
async function obtenerPromptPersonalizado(restauranteId) {
    const promptRestaurante = await supabase
        .from('prompts_restaurante')
        .select('*')
        .eq('restaurante_id', restauranteId)
        .eq('activo', true)
        .single();
    
    if (promptRestaurante) {
        return PROMPT_BASE + '\n\n' + promptRestaurante.prompt_text;
    }
    
    return PROMPT_BASE; // Prompt base si no hay personalización
}
```

**¿Qué se crea?**
- Sistema de prompts personalizados
- Combinación de prompt base + personalización
- Fallback a prompt estándar

---

## 🔄 **FASE 8: OPTIMIZACIÓN AUTOMÁTICA - SEMANAS 15-16**

### **8.1 Optimización Automática de Prompts**
```typescript
async function optimizarPromptAutomaticamente(patronesError) {
    let promptOptimizado = PROMPT_BASE;
    
    // Añadir reglas basadas en errores comunes
    if (patronesError.proveedor_nombre.length > 0) {
        promptOptimizado += `
        
        REGLAS ESPECIALES PARA PROVEEDOR:
        - Buscar SOLO en la parte superior del documento
        - Buscar después de: "EMITE:", "PROVEEDOR:", "VENDEDOR:"
        - EVITAR nombres en la parte inferior (son clientes)
        - Si hay confusión, priorizar el nombre más arriba`;
    }
    
    // Guardar prompt optimizado
    await guardarPromptOptimizado(promptOptimizado, patronesError);
    
    return promptOptimizado;
}
```

**¿Qué se crea?**
- Sistema de optimización automática
- Generación de reglas especiales
- Guardado de versiones optimizadas

### **8.2 Métricas y Rendimiento**
```typescript
async function calcularMetricasRendimiento() {
    const facturas = await supabase
        .from('datos_extraidos_facturas')
        .select('confianza_openai_global, fecha_procesamiento')
        .gte('fecha_procesamiento', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
    const metricas = {
        precision_global: facturas.reduce((sum, f) => sum + f.confianza_openai_global, 0) / facturas.length,
        tendencia: calcularTendencia(facturas),
        campos_problematicos: identificarCamposProblematicos(facturas)
    };
    
    return metricas;
}
```

**¿Qué se crea?**
- Sistema de métricas de rendimiento
- Análisis de tendencias
- Identificación de campos problemáticos

---

## 📊 **RESUMEN DE LO QUE SE CREA**

### **Base de Datos:**
- 4 nuevas tablas
- 8 nuevas columnas
- Índices de optimización

### **Backend (Edge Function):**
- Sistema OCR con Google AI
- Integración con OpenAI
- Sistema de confianza
- Captura de correcciones
- Análisis de patrones
- Optimización automática

### **Frontend (Dashboard):**
- Indicadores de confianza
- Campos editables
- Gestión de prompts
- Métricas de rendimiento
- Sistema de aprendizaje

### **APIs y Configuración:**
- Variables de entorno
- Configuración de OpenAI
- Cambio de processor Google AI
- Sistema de logging

---

## ⏰ **CRONOGRAMA ESTIMADO**

- **Fases 1-2**: 2 semanas (Fundamentos)
- **Fases 3-4**: 2 semanas (OpenAI + Confianza)
- **Fases 5-6**: 2 semanas (Interfaz + Aprendizaje)
- **Fases 7-8**: 2 semanas (Personalización + Optimización)

**Total: 8 semanas (2 meses)**

---

## �� **¿POR DÓNDE EMPEZAR?**

**SÍ, tienes razón: primero debe estar la IA leyendo bien los documentos.**

**Orden recomendado:**
1. **Fase 1**: Base de datos y configuración
2. **Fase 2**: OCR básico funcionando
3. **Fase 3**: OpenAI extrayendo datos correctamente
4. **Fases 4-8**: Sistema completo de confianza y aprendizaje

¿Te parece bien este roadmap? ¿Quieres que empecemos por la **Fase 1** (Base de datos)?