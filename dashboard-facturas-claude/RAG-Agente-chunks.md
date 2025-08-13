# 🛠️ **CÓMO IMPLEMENTAR RAG - PASO A PASO**

## 1️⃣ **CREAR TABLA PARA CHUNKS**

```sql
-- Tabla para almacenar chunks vectorizados
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
    content TEXT NOT NULL,                    -- El texto del chunk
    embedding VECTOR(1536),                   -- Vector OpenAI ada-002
    metadata JSONB DEFAULT '{}',              -- Info adicional
    chunk_type VARCHAR(50),                   -- 'transaccion', 'estadistica', 'vencimiento'
    source_table VARCHAR(50),                 -- 'datos_extraidos_facturas', 'productos_extraidos'
    source_id UUID,                          -- ID del registro original
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
```

## 2️⃣ **FUNCIÓN PARA GENERAR CHUNKS**

```javascript
// En tu Edge Function o backend
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
    });
    return response.data[0].embedding;
}

async function createChunksFromFactura(factura, productos) {
    const chunks = [];
    
    // CHUNK PRINCIPAL DE FACTURA
    const facturaChunk = {
        content: `${factura.proveedor_nombre} vendió productos por ${factura.total_factura}€ a ${factura.restaurante_nombre} el ${factura.fecha_factura}. Factura número ${factura.numero_factura}. Base imponible: ${factura.base_imponible}€, IVA: ${factura.cuota_iva}€.`,
        chunk_type: 'transaccion',
        source_table: 'datos_extraidos_facturas',
        source_id: factura.id,
        metadata: {
            proveedor_cif: factura.proveedor_cif,
            total: factura.total_factura,
            fecha: factura.fecha_factura,
            numero_factura: factura.numero_factura
        }
    };
    chunks.push(facturaChunk);
    
    // CHUNK DE VENCIMIENTO
    if (factura.fecha_vencimiento) {
        const vencimientoChunk = {
            content: `La factura ${factura.numero_factura} de ${factura.proveedor_nombre} por ${factura.total_factura}€ vence el ${factura.fecha_vencimiento}.`,
            chunk_type: 'vencimiento',
            source_table: 'datos_extraidos_facturas',
            source_id: factura.id,
            metadata: {
                fecha_vencimiento: factura.fecha_vencimiento,
                proveedor_nombre: factura.proveedor_nombre,
                total: factura.total_factura,
                numero_factura: factura.numero_factura
            }
        };
        chunks.push(vencimientoChunk);
    }
    
    // CHUNKS POR CADA PRODUCTO
    for (const producto of productos) {
        const productoChunk = {
            content: `${factura.restaurante_nombre} compró ${producto.cantidad} ${producto.unidad_medida} de ${producto.descripcion_normalizada} a ${producto.precio_unitario_sin_iva}€ por ${producto.unidad_medida} de ${factura.proveedor_nombre} el ${factura.fecha_factura}. Total línea: ${producto.precio_total_linea_sin_iva}€.`,
            chunk_type: 'producto',
            source_table: 'productos_extraidos',
            source_id: producto.id,
            metadata: {
                producto_descripcion: producto.descripcion_normalizada,
                cantidad: producto.cantidad,
                precio_unitario: producto.precio_unitario_sin_iva,
                unidad: producto.unidad_medida,
                proveedor_nombre: factura.proveedor_nombre,
                fecha: factura.fecha_factura
            }
        };
        chunks.push(productoChunk);
    }
    
    return chunks;
}
```

## 3️⃣ **GUARDAR CHUNKS EN LA BASE DE DATOS**

```javascript
async function saveChunksToKnowledgeBase(chunks, restauranteId) {
    for (const chunk of chunks) {
        // Generar embedding
        const embedding = await generateEmbedding(chunk.content);
        
        // Guardar en Supabase
        const { error } = await supabaseClient
            .from('knowledge_base')
            .insert({
                restaurante_id: restauranteId,
                content: chunk.content,
                embedding: embedding,
                chunk_type: chunk.chunk_type,
                source_table: chunk.source_table,
                source_id: chunk.source_id,
                metadata: chunk.metadata
            });
            
        if (error) {
            console.error('Error guardando chunk:', error);
        }
    }
}
```

## 4️⃣ **FUNCIÓN DE BÚSQUEDA SEMÁNTICA**

```sql
-- Función SQL para buscar chunks similares
CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding vector(1536),
    match_threshold float,
    restaurante_id uuid,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata jsonb,
    chunk_type varchar(50),
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.content,
        kb.metadata,
        kb.chunk_type,
        1 - (kb.embedding <=> query_embedding) as similarity
    FROM knowledge_base kb
    WHERE kb.restaurante_id = $3
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

## 5️⃣ **AGENTE RAG COMPLETO**

```javascript
async function askRAGAgent(pregunta, restauranteId) {
    try {
        // 1. Generar embedding de la pregunta
        const queryEmbedding = await generateEmbedding(pregunta);
        
        // 2. Buscar chunks relevantes
        const { data: chunks, error } = await supabaseClient.rpc('match_knowledge', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            restaurante_id: restauranteId,
            match_count: 10
        });
        
        if (error) throw error;
        
        // 3. Construir contexto para GPT
        const contexto = chunks
            .map(chunk => `${chunk.content} (Relevancia: ${(chunk.similarity * 100).toFixed(1)}%)`)
            .join('\n\n');
            
        // 4. Prompt para GPT
        const systemPrompt = `Eres el asistente financiero inteligente de un restaurante. 
        
INSTRUCCIONES:
- Responde basándote ÚNICAMENTE en el contexto proporcionado
- Si no tienes información suficiente, dilo claramente
- Usa números específicos cuando los tengas
- Sé conciso pero completo
- Si mencionas fechas, usa formato español (DD/MM/AAAA)
- Si mencionas importes, usa el símbolo € después del número`;

        const userPrompt = `CONTEXTO DEL RESTAURANTE:
${contexto}

PREGUNTA DEL USUARIO: ${pregunta}

RESPUESTA:`;

        // 5. Llamar a OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500
        });
        
        return {
            respuesta: response.choices[0].message.content,
            chunks_utilizados: chunks.length,
            contexto_relevante: chunks.map(c => ({ content: c.content, relevancia: c.similarity }))
        };
        
    } catch (error) {
        console.error('Error en RAG Agent:', error);
        return {
            respuesta: "Lo siento, no puedo procesar tu consulta en este momento. Por favor, inténtalo más tarde.",
            error: error.message
        };
    }
}
```

## 6️⃣ **INTEGRAR EN TU EDGE FUNCTION**

```javascript
// Añadir a tu index.ts actual, después de guardar la factura
async function processInvoice(facturaData, productosData) {
    // ... código existente de procesamiento ...
    
    // NUEVO: Crear chunks para RAG
    console.log('🧠 Creando chunks para knowledge base...');
    const chunks = await createChunksFromFactura(facturaData, productosData);
    await saveChunksToKnowledgeBase(chunks, facturaData.restaurante_id);
    console.log(`✅ ${chunks.length} chunks guardados en knowledge base`);
    
    return { success: true, chunks_created: chunks.length };
}
```

## 7️⃣ **API ENDPOINT PARA PREGUNTAS**

```javascript
// Nueva Edge Function: ask-agent
Deno.serve(async (req) => {
    const { pregunta, restaurante_id } = await req.json();
    
    const respuesta = await askRAGAgent(pregunta, restaurante_id);
    
    return new Response(JSON.stringify(respuesta), {
        headers: { 'Content-Type': 'application/json' }
    });
});
```

## 🎯 **RESUMEN DE LO QUE NECESITAS**

1. ✅ **Tabla `knowledge_base`** con vectores
2. ✅ **OpenAI API Key** para embeddings y GPT
3. ✅ **Función de creación de chunks** automática
4. ✅ **Función de búsqueda semántica** SQL
5. ✅ **Agente RAG** que combine todo

**Costos estimados:**
- Embeddings: ~$0.10 por 1000 facturas
- GPT-4 consultas: ~$0.03 por pregunta

¿Empiezo implementando esto en tu Edge Function actual?



Perfecto. Te dejo el “qué hacer” cada vez que subes una factura, pensando en hoy (proveedor por CIF, productos sin códigos) y en mañana (RAG/preguntas).

### 1) Al procesar la factura (pipeline)
- Extraer encabezado y líneas.
- Guardar en BD:
  - `datos_extraidos_facturas`
  - `productos_extraidos` (una fila por línea)

### 2) Normalización y alta automática
- Proveedor
  - Buscar por `CIF` + `restaurante_id`.
  - Si no existe: crear en `proveedores` con `nombre_original` y `nombre_normalizado`.
  - Guardar el `proveedor_id` en la factura para trazabilidad.
- Productos
  - Por cada línea:
    - Generar `descripcion_normalizada` (limpia/estandarizada).
    - Buscar en `productos_maestro` por `(restaurante_id, nombre_normalizado)`.
    - Si no existe: crear en `productos_maestro` con ID propio (no dependes de EAN).
    - Enlazar la línea con `producto_maestro_id`.

Sugerencias de integridad (ya soportadas por tu esquema)
- Unicidad por restaurante:
  - Proveedores: `UNIQUE(restaurante_id, cif)`
  - Productos maestro: `UNIQUE(restaurante_id, nombre_normalizado)`
- En `productos_extraidos`: añadir `producto_maestro_id` si aún no lo tienes.

### 3) RAG para preguntas futuras (qué vectorizar y cuándo)
- Cuándo: justo después de guardar normalizado (en background para no bloquear UI).
- Qué vectorizar:
  - Proveedores: `proveedores.nombre_normalizado` → embedding en columna (p. ej., `embedding_nombre`).
  - Productos maestro: `productos_maestro.nombre_normalizado` → embedding en columna.
  - Chunks de conocimiento en `knowledge_base` (tabla de RAG):
    - Transacción de factura: “Proveedor X vendió Y€ el DD/MM/AAAA…”
    - Vencimiento: “La factura N de Proveedor X vence el DD/MM/AAAA…”
    - Línea de producto: “Se compraron 5 L de aceite oliva virgen extra a 4,50€/L…”
- Qué NO vectorizar:
  - CIFs, números de factura, importes, fechas (se usan para agregaciones SQL internas del agente si hace falta).
- Índices:
  - `ivfflat` sobre `knowledge_base.embedding`.
  - Índices por fechas y proveedor en tablas transaccionales para agregados rápidos.

### 4) Agente que responde “en natural”
- Flujo del agente (interno):
  - Si la pregunta contiene entidad borrosa (“papito”, “aceite”): usa embeddings sobre proveedores/productos o `knowledge_base`.
  - Con los IDs encontrados, calcula el agregado (SUM/AVG/MIN/MAX) y responde.
  - Para preguntas puramente agregadas (“¿cuánto en total este mes?”) puede ir directo a SQL.

### 5) Casos “nuevo proveedor / nuevo producto”
- Nuevo proveedor:
  - Si no hay match por CIF → se crea proveedor y se vectoriza `nombre_normalizado`.
- Nuevo producto:
  - Si no hay match por `nombre_normalizado` → se crea en `productos_maestro`, se vectoriza el nombre y se enlaza la línea.

### 6) Recomendación operativa
- Hacer la normalización y el guardado sincrónicos.
- Encolar (background) la creación de embeddings y chunks RAG para no ralentizar la subida.
- Loggear en factura qué registros RAG se generaron (p. ej., `factura.chunks_generados = true`).

Si quieres, te implemento:
- Columna `producto_maestro_id` en `productos_extraidos` (si falta) y el upsert de productos/ proveedores en la Edge Function.
- Job en background para generar embeddings y `knowledge_base` tras cada factura