import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('�� === AGENTE TEXT-TO-SQL INICIADO ===')
    
    // Parsear request
    const { pregunta, restaurante_id } = await req.json()
    
    if (!pregunta || !restaurante_id) {
      throw new Error('Faltan parámetros: pregunta y restaurante_id son requeridos')
    }

    console.log('📝 Pregunta recibida:', pregunta)
    console.log('🏢 Restaurante ID:', restaurante_id)

    // 1. Generar SQL con OpenAI
    console.log('🔍 Generando SQL...')
    const sql = await generateSQL(pregunta, restaurante_id)
    console.log('✅ SQL generado:', sql)

    // 2. Ejecutar SQL en Supabase
    console.log('⚡ Ejecutando consulta...')
    const resultado = await executeSQL(sql, restaurante_id)
    console.log('✅ Resultado obtenido:', resultado)

    // 3. Generar respuesta amigable
    console.log('💬 Generando respuesta...')
    const respuesta = await generateResponse(pregunta, resultado)
    console.log('✅ Respuesta generada')

    return new Response(JSON.stringify({ 
      success: true,
      respuesta, 
      sql, 
      datos: resultado 
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('❌ Error en agente:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// ===== GENERAR SQL CON OPENAI =====
async function generateSQL(pregunta: string, restauranteId: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY no encontrada en variables de entorno')
  }

  const prompt = `
Eres un asistente experto en análisis de datos para restaurantes, conectado a una base de datos Supabase.
Tu tarea es convertir la pregunta del usuario en una consulta SQL precisa y ejecutable.

ESQUEMA DE LA BASE DE DATOS:

- datos_extraidos_facturas: Cabecera de facturas
  - id (text), restaurante_id (uuid), proveedor_nombre (text), proveedor_cif (text)
  - numero_factura (text), fecha_factura (date), total_factura (numeric)
  - base_imponible (numeric), cuota_iva (numeric), tipo_iva (numeric)

- productos_extraidos: Líneas de productos de cada factura
  - id (uuid), documento_id (text), restaurante_id (uuid), producto_maestro_id (uuid)
  - descripcion_original (text), cantidad (numeric)
  - precio_unitario_sin_iva (numeric), precio_total_linea_sin_iva (numeric)
  - tipo_iva (numeric), fecha_extraccion (timestamp)

- productos_maestro: Productos normalizados
  - id (uuid), restaurante_id (uuid), nombre_normalizado (text), nombre_comercial (text)
  - categoria_principal (text), precio_ultimo (numeric)

- historial_precios_productos: Historial de precios
  - id (uuid), producto_maestro_id (uuid), restaurante_id (uuid)
  - fecha_compra (date), precio_unitario_sin_iva (numeric)

- proveedores: Maestro de proveedores
  - id (uuid), restaurante_id (uuid), nombre (text), cif (text)

REGLAS CRÍTICAS:
1. Responde SOLO con el código SQL, sin explicaciones ni comentarios
2. SIEMPRE incluye WHERE restaurante_id = '${restauranteId}' en todas las consultas
3. Para buscar productos usa ILIKE '%termino%' en descripcion_original
4. Las fechas están en formato 'YYYY-MM-DD'
5. Usa alias de tabla para evitar ambigüedades
6. Para cálculos de totales usa SUM(), para promedios AVG(), para conteos COUNT()
7. Para búsquedas aproximadas usa múltiples ILIKE con OR
8. Maneja faltas de ortografía con búsquedas flexibles

EJEMPLOS DE CONSULTAS:
- "¿Cuánto he gastado en aceite?": SELECT SUM(precio_total_linea_sin_iva) FROM productos_extraidos WHERE restaurante_id = '${restauranteId}' AND descripcion_original ILIKE '%aceite%'
- "¿Cuánto he gastado en amas?": SELECT SUM(precio_total_linea_sin_iva) FROM productos_extraidos WHERE restaurante_id = '${restauranteId}' AND (descripcion_original ILIKE '%amas%' OR descripcion_original ILIKE '%amás%' OR descripcion_original ILIKE '%amaz%')
- "¿Cuánto he gastado en Dimarba?": SELECT SUM(precio_total_linea_sin_iva) FROM productos_extraidos WHERE restaurante_id = '${restauranteId}' AND (descripcion_original ILIKE '%dimarba%' OR descripcion_original ILIKE '%dimarva%' OR descripcion_original ILIKE '%sanlucar%' OR descripcion_original ILIKE '%sanlúcar%')
- "¿Cuántas facturas tengo?": SELECT COUNT(*) FROM datos_extraidos_facturas WHERE restaurante_id = '${restauranteId}'
- "¿Cuál es mi proveedor más caro?": SELECT proveedor_nombre, AVG(total_factura) FROM datos_extraidos_facturas WHERE restaurante_id = '${restauranteId}' GROUP BY proveedor_nombre ORDER BY AVG(total_factura) DESC LIMIT 1
- "¿En qué producto me he gastado más este mes?": SELECT descripcion_original, SUM(precio_total_linea_sin_iva) AS total_gastado FROM productos_extraidos WHERE restaurante_id = '${restauranteId}' AND DATE_TRUNC('month', fecha_extraccion) = DATE_TRUNC('month', CURRENT_DATE) GROUP BY descripcion_original ORDER BY total_gastado DESC LIMIT 1
- "¿Cuánto gasté este mes?": SELECT SUM(precio_total_linea_sin_iva) FROM productos_extraidos WHERE restaurante_id = '${restauranteId}' AND DATE_TRUNC('month', fecha_extraccion) = DATE_TRUNC('month', CURRENT_DATE)
- "¿Cuál es mi proveedor más frecuente?": SELECT proveedor_nombre, COUNT(*) as num_facturas FROM datos_extraidos_facturas WHERE restaurante_id = '${restauranteId}' GROUP BY proveedor_nombre ORDER BY num_facturas DESC LIMIT 1

Pregunta del usuario: "${pregunta}"

SQL:
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error OpenAI: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  let sql = data.choices[0]?.message?.content?.trim()
  
  if (!sql) {
    throw new Error('No se recibió SQL de OpenAI')
  }

  // Limpiar formato markdown si existe
  sql = cleanSQLFromMarkdown(sql)
  
  console.log('🧹 SQL limpio:', sql)

  return sql
}

// ===== LIMPIAR SQL DE MARKDOWN =====
function cleanSQLFromMarkdown(sql: string): string {
  // Remover backticks y etiquetas de lenguaje
  sql = sql.replace(/```sql\s*/gi, '')  // Remover ```sql al inicio
  sql = sql.replace(/```\s*$/gi, '')    // Remover ``` al final
  sql = sql.replace(/^```\s*/gi, '')    // Remover ``` al inicio (sin sql)
  
  // Remover espacios extra y líneas vacías
  sql = sql.trim()
  
  // Remover comentarios de markdown si existen
  sql = sql.replace(/^#+\s*/gm, '')     // Remover headers markdown
  
  console.log('🧹 SQL original:', sql)
  
  return sql
}

// ===== EJECUTAR SQL DE FORMA SEGURA =====
async function executeSQL(sql: string, restauranteId: string): Promise<any> {
  // Validar que el SQL es seguro
  if (!isSQLSafe(sql, restauranteId)) {
    throw new Error('Consulta SQL no permitida por seguridad')
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('🔐 Ejecutando SQL validado:', sql)

  const { data, error } = await supabaseClient.rpc('execute_dynamic_sql', {
    sql_query: sql,
    restaurante_id: restauranteId
  })

  if (error) {
    console.error('❌ Error ejecutando SQL:', error)
    throw new Error(`Error ejecutando consulta: ${error.message}`)
  }

  return data
}

// ===== VALIDACIÓN DE SEGURIDAD SQL =====
function isSQLSafe(sql: string, restauranteId: string): boolean {
  const lowerSQL = sql.toLowerCase().trim()
  
  // Solo permitir SELECT
  if (!lowerSQL.startsWith('select')) {
    console.error('❌ SQL no empieza con SELECT:', lowerSQL)
    return false
  }
  
  // Debe incluir el restaurante_id
  if (!lowerSQL.includes(`restaurante_id = '${restauranteId}'`)) {
    console.error('❌ SQL no incluye filtro de restaurante_id')
    return false
  }
  
  // No permitir comandos peligrosos
  const dangerous = ['drop', 'delete', 'insert', 'update', 'create', 'alter', 'truncate']
  if (dangerous.some(cmd => lowerSQL.includes(cmd))) {
    console.error('❌ SQL contiene comandos peligrosos:', lowerSQL)
    return false
  }
  
  // No permitir múltiples statements
  if (lowerSQL.includes(';') && lowerSQL.split(';').length > 2) {
    console.error('❌ SQL contiene múltiples statements')
    return false
  }
  
  console.log('✅ SQL validado como seguro')
  return true
}

// ===== GENERAR RESPUESTA AMIGABLE =====
async function generateResponse(pregunta: string, datos: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    return 'Error: No se pudo generar respuesta amigable'
  }

  const prompt = `
Eres un asistente amigable que convierte resultados de SQL en respuestas naturales y útiles para un restaurante.

Pregunta original: "${pregunta}"
Datos obtenidos: ${JSON.stringify(datos)}

INSTRUCCIONES:
1. Si los datos están vacíos ([] o null), explica amablemente que no se encontraron resultados
2. Sugiere posibles variaciones del término buscado
3. Formato de moneda: siempre usa € con comas para miles (ej: 1.250,50 €)
4. Formato de fechas: DD/MM/YYYY
5. Sé específico y útil para un restaurante
6. Si es un array con múltiples resultados, haz un resumen claro

EJEMPLOS DE RESPUESTAS:
- Con datos: "Has gastado 1.250,50 € en aceite de oliva este mes. Es tu producto más comprado."
- Sin datos: "No encontré gastos en 'amas'. ¿Quizás te refieres a 'Amas' (con mayúscula) o 'Amás'? También puedes buscar por 'harina' o 'pan' si buscas productos similares."
- Múltiples resultados: "Tienes 3 proveedores principales: Makro (5 facturas, 2.450,30 €), Amas (3 facturas, 890,15 €) y Dimarba (2 facturas, 567,80 €)."

Respuesta:
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    })
  })

  if (!response.ok) {
    return 'Error: No se pudo generar respuesta amigable'
  }

  const data = await response.json()
  return data.choices[0]?.message?.content?.trim() || 'No se pudo generar respuesta'
}