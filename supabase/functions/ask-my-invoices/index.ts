import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 🧠 AGENTE TEXT-TO-SQL CON BÚSQUEDA SEMÁNTICA HÍBRIDA
 * 
 * Este agente combina:
 * 1. Búsqueda semántica usando embeddings vectoriales
 * 2. Búsqueda textual tradicional con SQL
 * 3. Respuestas inteligentes con contexto semántico
 * 
 * Funcionalidades:
 * - Búsqueda por similitud semántica en productos y proveedores
 * - Consultas SQL inteligentes generadas por OpenAI
 * - Respuestas contextuales con recomendaciones
 * - Sistema híbrido para máxima precisión y cobertura
 */

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

  // Variables para capturar información antes de posibles errores
  let pregunta: string = ''
  let restaurante_id: string = ''
  let tiempoInicio: number = 0
  let requestParseado: boolean = false

  try {
    console.log('�� === AGENTE TEXT-TO-SQL INICIADO ===')
    
    // Parsear request
    const requestData = await req.json()
    pregunta = requestData.pregunta
    restaurante_id = requestData.restaurante_id
    
    if (!pregunta || !restaurante_id) {
      throw new Error('Faltan parámetros: pregunta y restaurante_id son requeridos')
    }

    console.log('📝 Pregunta recibida:', pregunta)
    console.log('🏢 Restaurante ID:', restaurante_id)
    
    // Iniciar cronómetro para métricas
    tiempoInicio = Date.now()

    // 1. BÚSQUEDA HÍBRIDA ROBUSTA: Con múltiples fallbacks
    console.log('🔍 Iniciando búsqueda híbrida robusta...')
    const resultadoHibrido = await busquedaHibridaRobusta(pregunta, restaurante_id)
    console.log('✅ Búsqueda híbrida robusta completada')

    // 2. Generar respuesta inteligente adaptativa según el método usado
    console.log('💬 Generando respuesta inteligente adaptativa...')
    const respuesta = await generateResponseAdaptativa(pregunta, resultadoHibrido)
    console.log('✅ Respuesta adaptativa generada')

    // 3. Calcular tiempo de respuesta y validar calidad
    const tiempoRespuesta = Date.now() - tiempoInicio
    const calidadValidada = validarCalidadRespuesta(resultadoHibrido)
    
    // 4. Preparar respuesta con metadatos de calidad
    const respuestaFinal = {
      success: true,
      respuesta,
      sql: resultadoHibrido.sql,
      datos: resultadoHibrido.datos_sql,
      resultados_semanticos: resultadoHibrido.resultados_semanticos,
      recomendaciones: resultadoHibrido.recomendaciones,
      // Metadatos de calidad y método usado
      calidad_respuesta: calidadValidada,
      metodo_utilizado: resultadoHibrido.metodo,
      mensaje_adicional: resultadoHibrido.mensaje,
      sugerencias: resultadoHibrido.sugerencias,
      timestamp: resultadoHibrido.timestamp,
      intentos_realizados: resultadoHibrido.intentos,
      // Métricas de rendimiento
      tiempo_respuesta_ms: tiempoRespuesta,
      resumen_intentos: generarResumenIntentos(resultadoHibrido.intentos)
    }
    
    // 5. Registrar métricas del agente
    const metricas: MetricasAgente = {
      timestamp: new Date().toISOString(),
      pregunta,
      restaurante_id,
      metodo_utilizado: resultadoHibrido.metodo,
      calidad_respuesta: calidadValidada,
      tiempo_respuesta_ms: tiempoRespuesta,
      intentos_realizados: resultadoHibrido.intentos || [],
      exito: true
    }
    
    registrarMetricas(metricas)
    
    console.log(`✅ Respuesta generada en ${tiempoRespuesta}ms con calidad: ${calidadValidada}`)
    
    return new Response(JSON.stringify(respuestaFinal), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('❌ Error crítico en agente:', error)
    
    // Usar el sistema inteligente de manejo de errores
    const respuestaError = await manejarErrorInteligentemente(error, pregunta, restaurante_id)
    
    // Calcular tiempo de respuesta si es posible
    const tiempoRespuesta = tiempoInicio > 0 ? Date.now() - tiempoInicio : 0
    
    // Registrar métricas de error con información real
    try {
      const metricas: MetricasAgente = {
        timestamp: new Date().toISOString(),
        pregunta: pregunta || 'No disponible',
        restaurante_id: restaurante_id || 'No disponible',
        metodo_utilizado: respuestaError.metodo_utilizado || 'error_fallback',
        calidad_respuesta: respuestaError.calidad_respuesta || 'nula',
        tiempo_respuesta_ms: tiempoRespuesta,
        intentos_realizados: [],
        exito: respuestaError.success || false,
        error: error.message
      }
      
      registrarMetricas(metricas)
    } catch (metricasError) {
      console.error('❌ Error registrando métricas:', metricasError)
    }
    
    // Preparar respuesta final con información del manejo inteligente
    const respuestaFinal = {
      ...respuestaError,
      timestamp: new Date().toISOString(),
      tiempo_respuesta_ms: tiempoRespuesta,
      pregunta_recibida: pregunta || 'No disponible',
      restaurante_solicitado: restaurante_id || 'No disponible'
    }
    
    return new Response(JSON.stringify(respuestaFinal), {
      status: respuestaError.success ? 200 : 500,
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

// ===== CONSULTAS BÁSICAS GARANTIZADAS =====
const CONSULTAS_BASICAS = {
  'última_factura': `
    SELECT 
      df.numero_factura,
      df.proveedor_nombre,
      df.fecha_factura,
      df.fecha_extraccion,
      df.total_factura,
      EXTRACT(DAYS FROM (df.fecha_extraccion::date - df.fecha_factura::date)) as dias_diferencia
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    ORDER BY df.fecha_extraccion DESC, df.fecha_factura DESC
    LIMIT 1
  `,
  
  'facturas_esta_semana': `
    SELECT COUNT(*) as total_facturas, SUM(total_factura) as total_gastado
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    AND df.fecha_factura >= date_trunc('week', current_date)
  `,
  
  'gasto_este_mes': `
    SELECT SUM(total_factura) as total_mes
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    AND date_trunc('month', df.fecha_factura) = date_trunc('month', current_date)
  `,
  
  'proveedores_activos': `
    SELECT df.proveedor_nombre, COUNT(*) as num_facturas, SUM(df.total_factura) as total_gastado
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    AND df.fecha_factura >= current_date - interval '30 days'
    GROUP BY df.proveedor_nombre
    ORDER BY total_gastado DESC
  `,
  
  'productos_mas_comprados': `
    SELECT pe.descripcion_original, SUM(pe.cantidad) as cantidad_total, COUNT(*) as veces_comprado
    FROM productos_extraidos pe
    WHERE pe.restaurante_id = '{restauranteId}'
    AND pe.fecha_extraccion >= current_date - interval '30 days'
    GROUP BY pe.descripcion_original
    ORDER BY cantidad_total DESC
    LIMIT 10
  `,
  
  'resumen_anual': `
    SELECT 
      EXTRACT(YEAR FROM df.fecha_factura) as año,
      COUNT(*) as total_facturas,
      SUM(df.total_factura) as total_gastado,
      AVG(df.total_factura) as promedio_factura
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    AND df.fecha_factura >= current_date - interval '1 year'
    GROUP BY EXTRACT(YEAR FROM df.fecha_factura)
    ORDER BY año DESC
  `,
  
  'top_proveedores': `
    SELECT 
      df.proveedor_nombre,
      COUNT(*) as num_facturas,
      SUM(df.total_factura) as total_gastado,
      AVG(df.total_factura) as promedio_factura
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    GROUP BY df.proveedor_nombre
    ORDER BY total_gastado DESC
    LIMIT 5
  `,
  
  'productos_por_categoria': `
    SELECT 
      pm.categoria_principal,
      COUNT(*) as num_productos,
      SUM(pe.precio_total_linea_sin_iva) as total_gastado
    FROM productos_extraidos pe
    JOIN productos_maestro pm ON pe.producto_maestro_id = pm.id
    WHERE pe.restaurante_id = '{restauranteId}'
    AND pe.fecha_extraccion >= current_date - interval '90 days'
    GROUP BY pm.categoria_principal
    ORDER BY total_gastado DESC
  `,
  
  'facturas_recientemente_recibidas': `
    SELECT 
      df.numero_factura,
      df.proveedor_nombre,
      df.fecha_factura,
      df.fecha_extraccion,
      df.total_factura,
      CASE 
        WHEN df.fecha_extraccion::date = CURRENT_DATE THEN 'Hoy'
        WHEN df.fecha_extraccion::date = CURRENT_DATE - INTERVAL '1 day' THEN 'Ayer'
        ELSE CONCAT('Hace ', EXTRACT(DAYS FROM (CURRENT_DATE - df.fecha_extraccion::date)), ' días')
      END as tiempo_llegada,
      EXTRACT(DAYS FROM (df.fecha_extraccion::date - df.fecha_factura::date)) as dias_diferencia
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
      AND df.fecha_extraccion >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY df.fecha_extraccion DESC
    LIMIT 10
  `,
  
  'ultima_factura_sistema': `
    SELECT 
      df.numero_factura,
      df.proveedor_nombre,
      df.fecha_factura,
      df.fecha_extraccion,
      df.total_factura,
      EXTRACT(DAYS FROM (df.fecha_extraccion::date - df.fecha_factura::date)) as dias_diferencia,
      CASE 
        WHEN df.fecha_extraccion::date = CURRENT_DATE THEN 'Hoy'
        WHEN df.fecha_extraccion::date = CURRENT_DATE - INTERVAL '1 day' THEN 'Ayer'
        ELSE CONCAT('Hace ', EXTRACT(DAYS FROM (CURRENT_DATE - df.fecha_extraccion::date)), ' días')
      END as tiempo_llegada
    FROM datos_extraidos_facturas df
    WHERE df.restaurante_id = '{restauranteId}'
    ORDER BY df.fecha_extraccion DESC
    LIMIT 1
  `
}

// ===== DETECTAR TIPO DE CONSULTA =====
function detectQueryType(pregunta: string): string | null {
  const preguntaLower = pregunta.toLowerCase()
  
  // Última factura (por fecha de factura)
  if (preguntaLower.includes('última factura') && 
      !preguntaLower.includes('sistema') && 
      !preguntaLower.includes('recibida')) {
    return 'última_factura'
  }
  
  // Última factura del sistema (por fecha de extracción)
  if (preguntaLower.includes('última factura') && 
      (preguntaLower.includes('sistema') || preguntaLower.includes('recibida'))) {
    return 'ultima_factura_sistema'
  }
  
  // Facturas recientemente recibidas
  if (preguntaLower.includes('factura') && 
      (preguntaLower.includes('reciente') || preguntaLower.includes('recibida') || preguntaLower.includes('llegada'))) {
    return 'facturas_recientemente_recibidas'
  }
  
  // Facturas esta semana
  if ((preguntaLower.includes('esta semana') || preguntaLower.includes('semana actual')) && 
      (preguntaLower.includes('factura') || preguntaLower.includes('gasto'))) {
    return 'facturas_esta_semana'
  }
  
  // Gasto este mes
  if ((preguntaLower.includes('este mes') || preguntaLower.includes('mes actual')) && 
      (preguntaLower.includes('gast') || preguntaLower.includes('dinero') || preguntaLower.includes('total'))) {
    return 'gasto_este_mes'
  }
  
  // Proveedores activos
  if (preguntaLower.includes('proveedor') && 
      (preguntaLower.includes('activo') || preguntaLower.includes('último') || preguntaLower.includes('reciente'))) {
    return 'proveedores_activos'
  }
  
  // Productos más comprados
  if (preguntaLower.includes('producto') && 
      (preguntaLower.includes('más') || preguntaLower.includes('frecuente') || preguntaLower.includes('comprado'))) {
    return 'productos_mas_comprados'
  }
  
  // Resumen anual
  if (preguntaLower.includes('año') && 
      (preguntaLower.includes('resumen') || preguntaLower.includes('total') || preguntaLower.includes('gasto'))) {
    return 'resumen_anual'
  }
  
  // Top proveedores
  if (preguntaLower.includes('proveedor') && 
      (preguntaLower.includes('top') || preguntaLower.includes('principal') || preguntaLower.includes('mayor'))) {
    return 'top_proveedores'
  }
  
  // Productos por categoría
  if (preguntaLower.includes('categoría') || preguntaLower.includes('categoria')) {
    return 'productos_por_categoria'
  }
  
  return null
}

// ===== GENERACIÓN SQL MEJORADA =====
async function generateSQLMejorado(pregunta: string, restauranteId: string): Promise<string> {
  console.log('🔍 Iniciando generación SQL mejorada...')
  
  // 1. Detectar si es consulta básica predefinida
  const tipoConsulta = detectQueryType(pregunta)
  if (tipoConsulta && CONSULTAS_BASICAS[tipoConsulta]) {
    console.log('✅ Consulta básica detectada:', tipoConsulta)
    const sqlBasico = CONSULTAS_BASICAS[tipoConsulta].replace('{restauranteId}', restauranteId)
    console.log('📝 SQL básico generado:', sqlBasico)
    return sqlBasico
  }
  
  console.log('🔄 No es consulta básica, usando OpenAI...')
  
  // 2. Si no es básica, usar OpenAI con prompt mejorado
  const promptMejorado = `
Eres un experto en SQL para restaurantes. Convierte esta pregunta en SQL ejecutable.

ESQUEMA DE BASE DE DATOS:
- datos_extraidos_facturas: id, restaurante_id, proveedor_nombre, numero_factura, fecha_factura, total_factura, base_imponible, cuota_iva, fecha_extraccion
- productos_extraidos: id, restaurante_id, descripcion_original, cantidad, precio_unitario_sin_iva, precio_total_linea_sin_iva, fecha_extraccion
- productos_maestro: id, restaurante_id, nombre_normalizado, categoria_principal
- proveedores: id, restaurante_id, nombre, cif

REGLAS OBLIGATORIAS:
1. SIEMPRE incluir WHERE restaurante_id = '${restauranteId}'
2. Para fechas recientes usar: fecha_factura >= current_date - interval 'X days'
3. Para "último/última" usar ORDER BY fecha_factura DESC LIMIT 1
4. Para "este mes" usar: date_trunc('month', fecha_factura) = date_trunc('month', current_date)
5. Para "esta semana" usar: fecha_factura >= date_trunc('week', current_date)
6. Para búsquedas de productos usar ILIKE '%termino%' en descripcion_original
7. Si hay dudas sobre tablas, priorizar datos_extraidos_facturas
8. Para JOINs usar la tabla principal según el contexto
9. Para agregaciones usar alias descriptivos (total_gastado, num_facturas, etc.)

EJEMPLOS:
- "última factura" → SELECT * FROM datos_extraidos_facturas WHERE restaurante_id = '${restauranteId}' ORDER BY fecha_factura DESC LIMIT 1
- "cuánto gasté en aceite" → SELECT SUM(precio_total_linea_sin_iva) as total_gastado FROM productos_extraidos WHERE restaurante_id = '${restauranteId}' AND descripcion_original ILIKE '%aceite%'
- "proveedores del mes" → SELECT proveedor_nombre, COUNT(*) as num_facturas FROM datos_extraidos_facturas WHERE restaurante_id = '${restauranteId}' AND date_trunc('month', fecha_factura) = date_trunc('month', current_date) GROUP BY proveedor_nombre

PREGUNTA: "${pregunta}"

RESPONDE SOLO CON EL SQL:
`

  try {
    const sql = await callOpenAI(promptMejorado, 0.1, 400)
    console.log('✅ SQL generado con OpenAI:', sql)
    return cleanSQLFromMarkdown(sql)
  } catch (error) {
    console.error('❌ Error generando SQL con OpenAI:', error)
    
    // Fallback: SQL básico de búsqueda
    console.log('🔄 Usando SQL de fallback...')
    return `
      SELECT df.numero_factura, df.proveedor_nombre, df.fecha_factura, df.total_factura
      FROM datos_extraidos_facturas df
      WHERE df.restaurante_id = '${restauranteId}'
      ORDER BY df.fecha_factura DESC
      LIMIT 5
    `
  }
}

// ===== BÚSQUEDA SEMÁNTICA HÍBRIDA =====
async function buscarSemanticamente(pregunta: string, restauranteId: string): Promise<any[]> {
  console.log('🧠 === BÚSQUEDA SEMÁNTICA INICIADA ===')
  
  try {
    // 1. Generar embedding de la pregunta
    const embeddingPregunta = await generateEmbedding(pregunta)
    if (!embeddingPregunta || embeddingPregunta.length === 0) {
      console.log('⚠️ No se pudo generar embedding, saltando búsqueda semántica')
      return []
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Búsqueda semántica en productos
    console.log('🔍 Buscando productos por similitud semántica...')
    const { data: productosSemanticos, error: errorProductos } = await supabaseClient
      .from('productos_embeddings')
      .select(`
        id,
        descripcion_original,
        categoria,
        embedding,
        frecuencia_uso
      `)
      .eq('restaurante_id', restauranteId)
      .not('embedding', 'is', null)
      .order('frecuencia_uso', { ascending: false })
      .limit(20)

    if (errorProductos) {
      console.error('❌ Error en búsqueda semántica de productos:', errorProductos)
    }

    // 3. Búsqueda semántica en proveedores
    console.log('🏢 Buscando proveedores por similitud semántica...')
    const { data: proveedoresSemanticos, error: errorProveedores } = await supabaseClient
      .from('proveedores_embeddings')
      .select(`
        id,
        nombre_proveedor,
        embedding,
        frecuencia_uso
      `)
      .eq('restaurante_id', restauranteId)
      .not('embedding', 'is', null)
      .order('frecuencia_uso', { ascending: false })
      .limit(10)

    if (errorProveedores) {
      console.error('❌ Error en búsqueda semántica de proveedores:', errorProveedores)
    }

    // 4. Calcular similitudes y ranking
    const resultados = []
    
    // Productos semánticos
    if (productosSemanticos && productosSemanticos.length > 0) {
      for (const producto of productosSemanticos) {
        const similitud = calcularSimilitudVectorial(embeddingPregunta, producto.embedding)
        if (similitud > 0.7) { // Umbral de similitud
          resultados.push({
            tipo: 'producto',
            id: producto.id,
            descripcion: producto.descripcion_original,
            categoria: producto.categoria,
            similitud: similitud,
            fuente: 'semantica'
          })
        }
      }
    }

    // Proveedores semánticos
    if (proveedoresSemanticos && proveedoresSemanticos.length > 0) {
      for (const proveedor of proveedoresSemanticos) {
        const similitud = calcularSimilitudVectorial(embeddingPregunta, proveedor.embedding)
        if (similitud > 0.7) { // Umbral de similitud
          resultados.push({
            tipo: 'proveedor',
            id: proveedor.id,
            nombre: proveedor.nombre_proveedor,
            similitud: similitud,
            fuente: 'semantica'
          })
        }
      }
    }

    // 5. Ordenar por similitud
    resultados.sort((a, b) => b.similitud - a.similitud)
    
    console.log(`✅ Búsqueda semántica completada: ${resultados.length} resultados`)
    return resultados

  } catch (error) {
    console.error('❌ Error en búsqueda semántica:', error)
    return []
  }
}

// ===== GENERAR EMBEDDING =====
async function generateEmbedding(texto: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    console.warn('⚠️ OPENAI_API_KEY no encontrada, saltando generación de embedding')
    return []
  }

  try {
    console.log('🧠 Generando embedding para:', texto.substring(0, 100) + '...')
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: texto,
        model: 'text-embedding-3-small',
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error en OpenAI API:', response.status, errorText)
      return []
    }

    const data = await response.json()
    const embedding = data.data[0].embedding
    
    console.log('✅ Embedding generado, dimensiones:', embedding.length)
    return embedding

  } catch (error) {
    console.error('❌ Error generando embedding:', error)
    return []
  }
}

// ===== CALCULAR SIMILITUD VECTORIAL =====
function calcularSimilitudVectorial(vector1: number[], vector2: number[]): number {
  if (!vector1 || !vector2 || vector1.length !== vector2.length) {
    return 0
  }

  try {
    // Calcular similitud coseno
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i]
      norm1 += vector1[i] * vector1[i]
      norm2 += vector2[i] * vector2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) {
      return 0
    }

    const similitud = dotProduct / (norm1 * norm2)
    return Math.max(0, similitud) // Asegurar que no sea negativo

  } catch (error) {
    console.error('❌ Error calculando similitud vectorial:', error)
    return 0
  }
}

// ===== BÚSQUEDA HÍBRIDA ROBUSTA CON MÚLTIPLES FALLBACKS =====
async function busquedaHibridaRobusta(pregunta: string, restauranteId: string): Promise<any> {
  console.log('🔍 === BÚSQUEDA HÍBRIDA ROBUSTA INICIADA ===')
  
  let intentos = []
  let resultadoFinal = null
  
      // 1. INTENTO PRINCIPAL: SQL Inteligente + Semántica
    try {
      console.log('🎯 Intento 1: SQL Inteligente + Semántica')
      
      // Generar SQL MEJORADO
      const sql = await generateSQLMejorado(pregunta, restauranteId)
      console.log('📝 SQL mejorado generado:', sql)
    
    // Ejecutar SQL
    const resultadoSQL = await executeSQL(sql, restauranteId)
    console.log('⚡ Resultado SQL obtenido')
    
    // Búsqueda semántica en paralelo
    const resultadosSemanticos = await buscarSemanticamente(pregunta, restauranteId)
    console.log('🧠 Resultados semánticos obtenidos:', resultadosSemanticos.length)
    
    if (resultadoSQL && Array.isArray(resultadoSQL) && resultadoSQL.length > 0) {
      resultadoFinal = {
        pregunta: pregunta,
        sql: sql,
        datos_sql: resultadoSQL,
        resultados_semanticos: resultadosSemanticos,
        recomendaciones: generarRecomendaciones(resultadosSemanticos),
        metodo: 'sql_exitoso',
        calidad: 'alta'
      }
      
      intentos.push({ metodo: 'sql_exitoso', exito: true, datos: resultadoSQL.length })
      console.log('✅ Intento 1 exitoso con datos SQL')
      return resultadoFinal
    } else {
      intentos.push({ metodo: 'sql_exitoso', exito: false, razon: 'sin_datos' })
      console.log('⚠️ SQL exitoso pero sin datos')
    }
    
  } catch (sqlError) {
    console.log('❌ Intento 1 falló (SQL):', sqlError.message)
    intentos.push({ metodo: 'sql_exitoso', exito: false, error: sqlError.message })
  }
  
  // 2. FALLBACK 1: Solo Búsqueda Semántica
  try {
    console.log('🔄 Intento 2: Solo Búsqueda Semántica')
    
    const resultadosSemanticos = await buscarSemanticamente(pregunta, restauranteId)
    
    if (resultadosSemanticos && resultadosSemanticos.length > 0) {
      resultadoFinal = {
        pregunta: pregunta,
        sql: null,
        datos_sql: [],
        resultados_semanticos: resultadosSemanticos,
        recomendaciones: generarRecomendaciones(resultadosSemanticos),
        metodo: 'semantico',
        calidad: 'media',
        mensaje: 'No pude ejecutar la consulta SQL, pero encontré productos similares por similitud semántica.'
      }
      
      intentos.push({ metodo: 'semantico', exito: true, datos: resultadosSemanticos.length })
      console.log('✅ Intento 2 exitoso con búsqueda semántica')
      return resultadoFinal
    } else {
      intentos.push({ metodo: 'semantico', exito: false, razon: 'sin_resultados' })
      console.log('⚠️ Búsqueda semántica sin resultados')
    }
    
  } catch (semanticError) {
    console.log('❌ Intento 2 falló (Semántica):', semanticError.message)
    intentos.push({ metodo: 'semantico', exito: false, error: semanticError.message })
  }
  
  // 3. FALLBACK 2: Búsqueda Textual Simple
  try {
    console.log('🔄 Intento 3: Búsqueda Textual Simple')
    
    const resultadoTextual = await busquedaTextualSimple(pregunta, restauranteId)
    
    if (resultadoTextual && resultadoTextual.length > 0) {
      resultadoFinal = {
        pregunta: pregunta,
        sql: null,
        datos_sql: resultadoTextual,
        resultados_semanticos: [],
        recomendaciones: [],
        metodo: 'textual_simple',
        calidad: 'baja',
        mensaje: 'Usé una búsqueda básica por texto para encontrar resultados similares.'
      }
      
      intentos.push({ metodo: 'textual_simple', exito: true, datos: resultadoTextual.length })
      console.log('✅ Intento 3 exitoso con búsqueda textual')
      return resultadoFinal
    } else {
      intentos.push({ metodo: 'textual_simple', exito: false, razon: 'sin_resultados' })
      console.log('⚠️ Búsqueda textual sin resultados')
    }
    
  } catch (textualError) {
    console.log('❌ Intento 3 falló (Textual):', textualError.message)
    intentos.push({ metodo: 'textual_simple', exito: false, error: textualError.message })
  }
  
  // 4. FALLBACK FINAL: Datos Básicos del Restaurante
  try {
    console.log('🔄 Intento 4: Datos Básicos del Restaurante')
    
    const datosBasicos = await getDatosBasicosRestaurante(restauranteId)
    
    resultadoFinal = {
      pregunta: pregunta,
      sql: null,
      datos_sql: datosBasicos,
      resultados_semanticos: [],
      recomendaciones: [],
      metodo: 'fallback_basico',
      calidad: 'minima',
      mensaje: 'No pude responder tu pregunta específica, pero aquí tienes un resumen general de tus datos del restaurante.',
      sugerencias: [
        'Intenta reformular tu pregunta de manera más simple',
        'Usa términos más generales (ej: "aceite" en lugar de "aceite de oliva extra virgen")',
        'Verifica que el nombre del producto o proveedor esté escrito correctamente'
      ]
    }
    
    intentos.push({ metodo: 'fallback_basico', exito: true, datos: datosBasicos.length })
    console.log('✅ Intento 4 exitoso con datos básicos')
    
  } catch (fallbackError) {
    console.log('❌ Intento 4 falló (Fallback):', fallbackError.message)
    intentos.push({ metodo: 'fallback_basico', exito: false, error: fallbackError.message })
    
    // ÚLTIMO RECURSO: Respuesta genérica
    resultadoFinal = {
      pregunta: pregunta,
      sql: null,
      datos_sql: [],
      resultados_semanticos: [],
      recomendaciones: [],
      metodo: 'respuesta_generica',
      calidad: 'nula',
      mensaje: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta más tarde o contacta con soporte.',
      error_tecnico: fallbackError.message
    }
  }
  
  // Agregar historial de intentos al resultado
  resultadoFinal.intentos = intentos
  resultadoFinal.timestamp = new Date().toISOString()
  
  console.log('📊 Resumen de intentos:', intentos)
  console.log('✅ Búsqueda híbrida robusta completada con método:', resultadoFinal.metodo)
  
  return resultadoFinal
}

// ===== BÚSQUEDA TEXTUAL SIMPLE (FALLBACK) =====
async function busquedaTextualSimple(pregunta: string, restauranteId: string): Promise<any[]> {
  console.log('🔍 Iniciando búsqueda textual simple...')
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Extraer palabras clave de la pregunta
    const palabrasClave = extraerPalabrasClave(pregunta)
    console.log('🔑 Palabras clave extraídas:', palabrasClave)
    
    if (palabrasClave.length === 0) {
      return []
    }
    
    // Búsqueda en productos con palabras clave
    const { data: productos, error: errorProductos } = await supabaseClient
      .from('productos_extraidos')
      .select(`
        id,
        descripcion_original,
        cantidad,
        precio_total_linea_sin_iva,
        fecha_extraccion
      `)
      .eq('restaurante_id', restauranteId)
      .or(palabrasClave.map(palabra => `descripcion_original.ilike.%${palabra}%`).join(','))
      .order('fecha_extraccion', { ascending: false })
      .limit(15)
    
    if (errorProductos) {
      console.error('❌ Error en búsqueda textual de productos:', errorProductos)
      return []
    }
    
    // Búsqueda en proveedores
    const { data: proveedores, error: errorProveedores } = await supabaseClient
      .from('datos_extraidos_facturas')
      .select(`
        proveedor_nombre,
        total_factura,
        fecha_factura
      `)
      .eq('restaurante_id', restauranteId)
      .or(palabrasClave.map(palabra => `proveedor_nombre.ilike.%${palabra}%`).join(','))
      .order('fecha_factura', { ascending: false })
      .limit(10)
    
    if (errorProveedores) {
      console.error('❌ Error en búsqueda textual de proveedores:', errorProveedores)
    }
    
    // Combinar resultados
    const resultados = []
    
    if (productos && productos.length > 0) {
      resultados.push(...productos.map(p => ({ ...p, tipo: 'producto' })))
    }
    
    if (proveedores && proveedores.length > 0) {
      resultados.push(...proveedores.map(p => ({ ...p, tipo: 'proveedor' })))
    }
    
    console.log(`✅ Búsqueda textual completada: ${resultados.length} resultados`)
    return resultados
    
  } catch (error) {
    console.error('❌ Error en búsqueda textual simple:', error)
    return []
  }
}

// ===== EXTRAER PALABRAS CLAVE =====
function extraerPalabrasClave(texto: string): string[] {
  // Limpiar texto
  const textoLimpio = texto.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remover caracteres especiales
    .replace(/\s+/g, ' ')     // Normalizar espacios
    .trim()
  
  // Dividir en palabras
  const palabras = textoLimpio.split(' ')
  
  // Filtrar palabras relevantes (más de 2 caracteres, no artículos/preposiciones)
  const palabrasIrrelevantes = ['el', 'la', 'los', 'las', 'de', 'del', 'en', 'con', 'por', 'para', 'a', 'al', 'un', 'una', 'unos', 'unas', 'que', 'cual', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas']
  
  const palabrasClave = palabras.filter(palabra => 
    palabra.length > 2 && 
    !palabrasIrrelevantes.includes(palabra) &&
    !/^\d+$/.test(palabra) // No números solos
  )
  
  // Limitar a máximo 5 palabras clave
  return palabrasClave.slice(0, 5)
}

// ===== OBTENER DATOS BÁSICOS DEL RESTAURANTE =====
async function getDatosBasicosRestaurante(restauranteId: string): Promise<any[]> {
  console.log('🏢 Obteniendo datos básicos del restaurante...')
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // 1. Resumen de facturas
    const { data: resumenFacturas, error: errorFacturas } = await supabaseClient
      .from('datos_extraidos_facturas')
      .select('total_factura, fecha_factura')
      .eq('restaurante_id', restauranteId)
      .order('fecha_factura', { ascending: false })
      .limit(5)
    
    // 2. Top productos
    const { data: topProductos, error: errorProductos } = await supabaseClient
      .from('productos_extraidos')
      .select('descripcion_original, precio_total_linea_sin_iva')
      .eq('restaurante_id', restauranteId)
      .order('precio_total_linea_sin_iva', { ascending: false })
      .limit(5)
    
    // 3. Top proveedores
    const { data: topProveedores, error: errorProveedores } = await supabaseClient
      .from('datos_extraidos_facturas')
      .select('proveedor_nombre, total_factura')
      .eq('restaurante_id', restauranteId)
      .order('total_factura', { ascending: false })
      .limit(5)
    
    // Combinar datos básicos
    const datosBasicos = {
      resumen_facturas: resumenFacturas || [],
      top_productos: topProductos || [],
      top_proveedores: topProveedores || [],
      timestamp: new Date().toISOString()
    }
    
    console.log('✅ Datos básicos obtenidos')
    return [datosBasicos]
    
  } catch (error) {
    console.error('❌ Error obteniendo datos básicos:', error)
    return [{
      mensaje: 'No se pudieron obtener datos básicos del restaurante',
      error: error.message,
      timestamp: new Date().toISOString()
    }]
  }
}

// ===== GENERAR RECOMENDACIONES =====
function generarRecomendaciones(resultadosSemanticos: any[]): any[] {
  if (!resultadosSemanticos || resultadosSemanticos.length === 0) {
    return []
  }
  
  const recomendaciones = []
  const topResultados = resultadosSemanticos.slice(0, 3)
  
  for (const resultado of topResultados) {
    if (resultado.tipo === 'producto') {
      recomendaciones.push({
        tipo: 'producto_similar',
        descripcion: resultado.descripcion,
        categoria: resultado.categoria,
        similitud: Math.round(resultado.similitud * 100),
        sugerencia: `Producto similar encontrado: "${resultado.descripcion}" (${Math.round(resultado.similitud * 100)}% similitud)`
      })
    } else if (resultado.tipo === 'proveedor') {
      recomendaciones.push({
        tipo: 'proveedor_similar',
        nombre: resultado.nombre,
        similitud: Math.round(resultado.similitud * 100),
        sugerencia: `Proveedor similar encontrado: "${resultado.nombre}" (${Math.round(resultado.similitud * 100)}% similitud)`
      })
    }
  }
  
  return recomendaciones
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

  try {
    // Intentar usar execute_dynamic_sql primero
    const { data, error } = await supabaseClient.rpc('execute_dynamic_sql', {
      sql_query: sql,
      restaurante_id: restauranteId
    })

    if (error) {
      console.error('❌ Error con execute_dynamic_sql:', error)
      throw new Error(`Error ejecutando consulta: ${error.message}`)
    }

    // Validar y limpiar los datos antes de retornarlos
    if (data === null || data === undefined) {
      console.log('⚠️ Datos SQL nulos, retornando array vacío')
      return []
    }

    // Si es un string, intentar parsearlo como JSON
    if (typeof data === 'string') {
      try {
        const parsedData = JSON.parse(data)
        console.log('✅ Datos SQL parseados como JSON:', typeof parsedData)
        return parsedData
      } catch (parseError) {
        console.log('⚠️ Datos SQL no son JSON válido, retornando como string')
        return data
      }
    }

    // Si es un array o objeto, retornarlo directamente
    console.log('✅ Datos SQL retornados directamente:', typeof data)
    return data

  } catch (rpcError) {
    console.error('❌ Error con RPC, intentando ejecución directa:', rpcError)
    
    // Fallback: ejecutar SQL directamente si es posible
    try {
      // Extraer la tabla principal del SQL
      const tableMatch = sql.match(/FROM\s+(\w+)/i)
      if (tableMatch) {
        const tableName = tableMatch[1]
        console.log('🔄 Intentando ejecución directa en tabla:', tableName)
        
        // Ejecutar una consulta simplificada
        const { data: directData, error: directError } = await supabaseClient
          .from(tableName)
          .select('*')
          .eq('restaurante_id', restauranteId)
          .limit(10)
        
        if (directError) {
          throw new Error(`Error en ejecución directa: ${directError.message}`)
        }
        
        console.log('✅ Ejecución directa exitosa')
        return directData
      }
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError)
    }
    
    throw new Error(`Error ejecutando consulta: ${rpcError.message}`)
  }
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

// ===== GENERAR RESPUESTA INTELIGENTE CON CONTEXTO SEMÁNTICO =====
async function generateResponseInteligente(pregunta: string, resultadoHibrido: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    return 'Error: No se pudo generar respuesta inteligente'
  }

  // Validar que resultadoHibrido existe y tiene la estructura esperada
  if (!resultadoHibrido || typeof resultadoHibrido !== 'object') {
    return 'Error: No se pudieron procesar los resultados de la búsqueda'
  }

  // Preparar datos seguros para el prompt
  const sqlSeguro = resultadoHibrido.sql || 'No disponible'
  const datosSQLSeguro = resultadoHibrido.datos_sql || []
  const resultadosSemanticosSeguro = resultadoHibrido.resultados_semanticos || []
  const recomendacionesSeguro = resultadoHibrido.recomendaciones || []

  const prompt = `
Eres un asistente inteligente que analiza resultados de búsqueda híbrida (semántica + SQL) para restaurantes.
Proporciona respuestas contextuales y útiles basadas en la similitud semántica y los datos SQL.

PREGUNTA ORIGINAL: "${pregunta}"

RESULTADOS HÍBRIDOS:
- SQL ejecutado: ${sqlSeguro}
- Datos SQL: ${JSON.stringify(datosSQLSeguro)}
- Resultados semánticos: ${JSON.stringify(resultadosSemanticosSeguro)}
- Recomendaciones: ${JSON.stringify(recomendacionesSeguro)}

INSTRUCCIONES:
1. Analiza tanto los datos SQL como los resultados semánticos
2. Si hay resultados semánticos, inclúyelos en tu respuesta
3. Formato de moneda: siempre usa € con comas para miles (ej: 1.250,50 €)
4. Formato de fechas: DD/MM/YYYY
5. Sé específico y útil para un restaurante
6. Incluye recomendaciones basadas en similitud semántica
7. Si no hay datos SQL pero hay resultados semánticos, sugiere búsquedas alternativas
8. Si hay errores en los datos, explica amablemente qué pasó

EJEMPLOS DE RESPUESTAS:
- Con datos SQL + semánticos: "Has gastado 1.250,50 € en aceite este mes. También encontré productos similares: 'aceite de girasol' (95% similitud) y 'aceite vegetal' (87% similitud)."
- Solo semánticos: "No encontré gastos exactos, pero detecté productos similares: 'aceite de oliva' (92% similitud), 'aceite girasol' (88% similitud). Te sugiero buscar por estos términos."
- Sin datos: "No encontré resultados para tu búsqueda. ¿Quizás te refieres a términos similares? Puedo ayudarte a encontrar productos relacionados."
- Con errores: "Hubo un problema procesando tu consulta, pero puedo ayudarte con información básica. ¿Podrías reformular tu pregunta?"

Respuesta inteligente:
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
      max_tokens: 400
    })
  })

  if (!response.ok) {
    return 'Error: No se pudo generar respuesta inteligente'
  }

  const data = await response.json()
  return data.choices[0]?.message?.content?.trim() || 'No se pudo generar respuesta inteligente'
}

// ===== GENERAR RESPUESTA AMIGABLE (MANTENER PARA COMPATIBILIDAD) =====
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

// ===== GENERAR RESPUESTA ADAPTATIVA SEGÚN CALIDAD Y MÉTODO =====
async function generateResponseAdaptativa(pregunta: string, resultadoHibrido: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    return generarRespuestaFallback(resultadoHibrido)
  }

  try {
    // Determinar el tipo de respuesta según la calidad y método
    const tipoRespuesta = determinarTipoRespuesta(resultadoHibrido)
    
    switch (tipoRespuesta) {
      case 'alta_calidad':
        return await generateResponseAltaCalidad(pregunta, resultadoHibrido)
      case 'media_calidad':
        return await generateResponseMediaCalidad(pregunta, resultadoHibrido)
      case 'baja_calidad':
        return await generateResponseBajaCalidad(pregunta, resultadoHibrido)
      case 'fallback':
        return await generateResponseFallback(pregunta, resultadoHibrido)
      default:
        return generarRespuestaFallback(resultadoHibrido)
    }
    
  } catch (error) {
    console.error('❌ Error generando respuesta adaptativa:', error)
    return generarRespuestaFallback(resultadoHibrido)
  }
}

// ===== DETERMINAR TIPO DE RESPUESTA =====
function determinarTipoRespuesta(resultadoHibrido: any): string {
  if (!resultadoHibrido || !resultadoHibrido.calidad) {
    return 'fallback'
  }
  
  switch (resultadoHibrido.calidad) {
    case 'alta':
      return 'alta_calidad'
    case 'media':
      return 'media_calidad'
    case 'baja':
      return 'baja_calidad'
    case 'minima':
    case 'nula':
      return 'fallback'
    default:
      return 'fallback'
  }
}

// ===== RESPUESTA DE ALTA CALIDAD (SQL + Semántica) =====
async function generateResponseAltaCalidad(pregunta: string, resultadoHibrido: any): Promise<string> {
  // Usar la nueva función de respuestas mejoradas
  return await generateResponseMejorada(pregunta, resultadoHibrido.datos_sql, resultadoHibrido.metodo)
}

// ===== RESPUESTA DE MEDIA CALIDAD (Solo Semántica) =====
async function generateResponseMediaCalidad(pregunta: string, resultadoHibrido: any): Promise<string> {
  // Usar la nueva función de respuestas mejoradas con datos semánticos
  const respuesta = await generateResponseMejorada(pregunta, resultadoHibrido.resultados_semanticos, resultadoHibrido.metodo)
  
  // Agregar contexto sobre la búsqueda semántica
  return `${respuesta}

${resultadoHibrido.mensaje || 'Estos resultados se obtuvieron usando búsqueda semántica.'}`
}

// ===== RESPUESTA DE BAJA CALIDAD (Solo Textual) =====
async function generateResponseBajaCalidad(pregunta: string, resultadoHibrido: any): Promise<string> {
  // Usar la nueva función de respuestas mejoradas con datos textuales
  const respuesta = await generateResponseMejorada(pregunta, resultadoHibrido.datos_sql, resultadoHibrido.metodo)
  
  // Agregar contexto sobre la búsqueda textual
  return `${respuesta}

${resultadoHibrido.mensaje || 'Estos resultados se obtuvieron usando búsqueda textual básica.'}`
}

// ===== RESPUESTA DE FALLBACK (Datos Básicos) =====
async function generateResponseFallback(pregunta: string, resultadoHibrido: any): Promise<string> {
  // Usar la nueva función de respuestas mejoradas con datos básicos
  const respuesta = await generateResponseMejorada(pregunta, resultadoHibrido.datos_sql, resultadoHibrido.metodo)
  
  // Agregar contexto sobre el fallback
  return `${respuesta}

${resultadoHibrido.mensaje || 'No pude responder tu pregunta específica, pero aquí tienes un resumen general.'}

${resultadoHibrido.sugerencias ? resultadoHibrido.sugerencias.map(s => `• ${s}`).join('\n') : ''}`
}

// ===== RESPUESTA FALLBACK SIN OPENAI =====
function generarRespuestaFallback(resultadoHibrido: any): string {
  if (!resultadoHibrido) {
    return 'Lo siento, no pude procesar tu consulta. Por favor, intenta más tarde.'
  }
  
  let respuesta = resultadoHibrido.mensaje || 'No pude responder tu pregunta específica.'
  
  if (resultadoHibrido.sugerencias && resultadoHibrido.sugerencias.length > 0) {
    respuesta += '\n\nSugerencias:\n' + resultadoHibrido.sugerencias.map(s => `• ${s}`).join('\n')
  }
  
  if (resultadoHibrido.datos_sql && resultadoHibrido.datos_sql.length > 0) {
    respuesta += '\n\nDatos disponibles:\n' + JSON.stringify(resultadoHibrido.datos_sql, null, 2)
  }
  
  return respuesta
}

// ===== LLAMADA A OPENAI UNIFICADA =====
async function callOpenAI(prompt: string, temperature: number, maxTokens: number): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY no disponible')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    throw new Error(`Error OpenAI: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content?.trim() || 'No se pudo generar respuesta'
}

// ===== MONITOREO Y MÉTRICAS DEL AGENTE =====
interface MetricasAgente {
  timestamp: string
  pregunta: string
  restaurante_id: string
  metodo_utilizado: string
  calidad_respuesta: string
  tiempo_respuesta_ms: number
  intentos_realizados: any[]
  exito: boolean
  error?: string
}

// ===== REGISTRAR MÉTRICAS =====
function registrarMetricas(metricas: MetricasAgente): void {
  try {
    console.log('📊 MÉTRICAS DEL AGENTE:', {
      timestamp: metricas.timestamp,
      metodo: metricas.metodo_utilizado,
      calidad: metricas.calidad_respuesta,
      tiempo: `${metricas.tiempo_respuesta_ms}ms`,
      exito: metricas.exito,
      intentos: metricas.intentos_realizados?.length || 0
    })
    
    // Aquí se podrían enviar las métricas a un servicio de monitoreo
    // como Datadog, New Relic, o un sistema interno
    
  } catch (error) {
    console.error('❌ Error registrando métricas:', error)
  }
}

// ===== VALIDAR CALIDAD DE RESPUESTA =====
function validarCalidadRespuesta(resultadoHibrido: any): string {
  if (!resultadoHibrido) return 'nula'
  
  // Verificar si hay datos SQL válidos
  const tieneDatosSQL = resultadoHibrido.datos_sql && 
                        Array.isArray(resultadoHibrido.datos_sql) && 
                        resultadoHibrido.datos_sql.length > 0
  
  // Verificar si hay resultados semánticos
  const tieneSemanticos = resultadoHibrido.resultados_semanticos && 
                          Array.isArray(resultadoHibrido.resultados_semanticos) && 
                          resultadoHibrido.resultados_semanticos.length > 0
  
  // Determinar calidad
  if (tieneDatosSQL && tieneSemanticos) return 'alta'
  if (tieneDatosSQL || tieneSemanticos) return 'media'
  if (resultadoHibrido.datos_sql && resultadoHibrido.datos_sql.length > 0) return 'baja'
  return 'minima'
}

// ===== GENERAR RESUMEN DE INTENTOS =====
function generarResumenIntentos(intentos: any[]): string {
  if (!intentos || intentos.length === 0) return 'No se realizaron intentos'
  
  const exitosos = intentos.filter(i => i.exito).length
  const fallidos = intentos.filter(i => !i.exito).length
  
  return `${exitosos} exitosos, ${fallidos} fallidos`
}

// ===== VALIDAR PARÁMETROS DE ENTRADA =====
function validarParametrosEntrada(pregunta: string, restauranteId: string): { valido: boolean, errores: string[] } {
  const errores: string[] = []
  
  if (!pregunta || typeof pregunta !== 'string') {
    errores.push('La pregunta debe ser un texto válido')
  } else if (pregunta.trim().length < 3) {
    errores.push('La pregunta debe tener al menos 3 caracteres')
  }
  
  if (!restauranteId || typeof restauranteId !== 'string') {
    errores.push('El restaurante_id debe ser un identificador válido')
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restauranteId)) {
    errores.push('El restaurante_id debe tener formato UUID válido')
  }
  
  return {
    valido: errores.length === 0,
    errores
  }
}

// ===== MANEJO INTELIGENTE DE ERRORES =====
async function manejarErrorInteligentemente(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  console.log('🧠 Iniciando manejo inteligente de errores...')
  
  // Clasificar el tipo de error
  const tipoError = clasificarError(error)
  console.log('📊 Tipo de error detectado:', tipoError)
  
  switch (tipoError) {
    case 'parametros_invalidos':
      return await generarRespuestaParametrosInvalidos(error, pregunta, restauranteId)
    
    case 'openai_error':
      return await generarRespuestaSinOpenAI(error, pregunta, restauranteId)
    
    case 'sql_error':
      return await generarRespuestaSinSQL(error, pregunta, restauranteId)
    
    case 'semantica_error':
      return await generarRespuestaSinSemantica(error, pregunta, restauranteId)
    
    case 'database_error':
      return await generarRespuestaSinDatabase(error, pregunta, restauranteId)
    
    default:
      return await generarRespuestaGenerica(error, pregunta, restauranteId)
  }
}

// ===== CLASIFICAR TIPOS DE ERROR =====
function clasificarError(error: Error): string {
  const mensaje = error.message.toLowerCase()
  
  if (mensaje.includes('parámetros') || mensaje.includes('parametros') || mensaje.includes('faltan')) {
    return 'parametros_invalidos'
  }
  
  if (mensaje.includes('openai') || mensaje.includes('api key') || mensaje.includes('gpt')) {
    return 'openai_error'
  }
  
  if (mensaje.includes('sql') || mensaje.includes('consulta') || mensaje.includes('execute')) {
    return 'sql_error'
  }
  
  if (mensaje.includes('semántica') || mensaje.includes('semantica') || mensaje.includes('embedding')) {
    return 'semantica_error'
  }
  
  if (mensaje.includes('database') || mensaje.includes('supabase') || mensaje.includes('connection')) {
    return 'database_error'
  }
  
  return 'error_generico'
}

// ===== RESPUESTAS ESPECÍFICAS POR TIPO DE ERROR =====
async function generarRespuestaParametrosInvalidos(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  return {
    success: false,
    error: error.message,
    respuesta: 'Los parámetros de entrada no son válidos. Por favor, verifica que hayas proporcionado una pregunta y un ID de restaurante válido.',
    tipo_error: 'parametros_invalidos',
    sugerencias: [
      'Asegúrate de que la pregunta tenga al menos 3 caracteres',
      'Verifica que el ID del restaurante sea un UUID válido',
      'Revisa el formato de tu solicitud'
    ],
    parametros_recibidos: {
      pregunta: pregunta || 'No proporcionada',
      restaurante_id: restauranteId || 'No proporcionado'
    }
  }
}

async function generarRespuestaSinOpenAI(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  // Intentar búsqueda básica sin OpenAI
  try {
    const resultadoBasico = await busquedaTextualSimple(pregunta, restauranteId)
    
    if (resultadoBasico && resultadoBasico.length > 0) {
      return {
        success: true,
        respuesta: 'No pude usar la inteligencia artificial, pero encontré resultados usando una búsqueda básica.',
        datos: resultadoBasico,
        metodo_utilizado: 'textual_simple_fallback',
        calidad_respuesta: 'baja',
        advertencia: 'Respuesta generada sin IA debido a problemas técnicos',
        sugerencias: [
          'Los resultados pueden ser menos precisos',
          'Contacta con soporte para resolver el problema de IA'
        ]
      }
    }
  } catch (fallbackError) {
    console.error('❌ Fallback también falló:', fallbackError)
  }
  
  return {
    success: false,
    error: error.message,
    respuesta: 'No pude procesar tu consulta debido a problemas con el servicio de inteligencia artificial.',
    tipo_error: 'openai_error',
    sugerencias: [
      'Intenta más tarde cuando el servicio esté disponible',
      'Contacta con soporte técnico',
      'Usa términos de búsqueda más simples'
    ]
  }
}

async function generarRespuestaSinSQL(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  // Intentar solo búsqueda semántica
  try {
    const resultadosSemanticos = await buscarSemanticamente(pregunta, restauranteId)
    
    if (resultadosSemanticos && resultadosSemanticos.length > 0) {
      return {
        success: true,
        respuesta: 'No pude ejecutar la consulta SQL, pero encontré productos similares usando búsqueda semántica.',
        resultados_semanticos: resultadosSemanticos,
        metodo_utilizado: 'semantico_fallback',
        calidad_respuesta: 'media',
        advertencia: 'Respuesta generada sin consulta SQL debido a problemas técnicos',
        sugerencias: [
          'Los resultados son aproximados',
          'Contacta con soporte para resolver el problema de base de datos'
        ]
      }
    }
  } catch (semanticError) {
    console.error('❌ Búsqueda semántica también falló:', semanticError)
  }
  
  return {
    success: false,
    error: error.message,
    respuesta: 'No pude ejecutar la consulta en la base de datos.',
    tipo_error: 'sql_error',
    sugerencias: [
      'Verifica que tu pregunta sea clara y específica',
      'Intenta reformular la consulta',
      'Contacta con soporte si el problema persiste'
    ]
  }
}

async function generarRespuestaSinSemantica(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  // Intentar solo búsqueda textual
  try {
    const resultadoTextual = await busquedaTextualSimple(pregunta, restauranteId)
    
    if (resultadoTextual && resultadoTextual.length > 0) {
      return {
        success: true,
        respuesta: 'No pude usar búsqueda semántica, pero encontré resultados usando búsqueda por texto.',
        datos: resultadoTextual,
        metodo_utilizado: 'textual_fallback',
        calidad_respuesta: 'baja',
        advertencia: 'Respuesta generada sin análisis semántico',
        sugerencias: [
          'Los resultados pueden ser menos relevantes',
          'Intenta usar términos exactos de búsqueda'
        ]
      }
    }
  } catch (textualError) {
    console.error('❌ Búsqueda textual también falló:', textualError)
  }
  
  return {
    success: false,
    error: error.message,
    respuesta: 'No pude usar la búsqueda semántica avanzada.',
    tipo_error: 'semantica_error',
    sugerencias: [
      'Intenta usar términos más específicos',
      'Reformula tu pregunta de manera más simple'
    ]
  }
}

async function generarRespuestaSinDatabase(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  return {
    success: false,
    error: error.message,
    respuesta: 'No pude acceder a la base de datos en este momento.',
    tipo_error: 'database_error',
    sugerencias: [
      'Intenta más tarde cuando el servicio esté disponible',
      'Contacta con soporte técnico',
      'Verifica tu conexión a internet'
    ]
  }
}

async function generarRespuestaGenerica(error: Error, pregunta: string, restauranteId: string): Promise<any> {
  return {
    success: false,
    error: error.message,
    respuesta: 'Ocurrió un error inesperado al procesar tu consulta.',
    tipo_error: 'error_generico',
    sugerencias: [
      'Intenta más tarde',
      'Reformula tu pregunta',
      'Contacta con soporte si el problema persiste'
    ]
  }
}

// ===== RESPUESTAS MÁS NATURALES =====
async function generateResponseMejorada(pregunta: string, datos: any, metodo: string): Promise<string> {
  console.log('💬 Generando respuesta mejorada...')
  
  // Si no hay datos, respuesta constructiva con sugerencias
  if (!datos || datos.length === 0) {
    const sugerencias = generarSugerenciasConsultas(pregunta)
    
    let respuesta = `No encontré datos específicos para "${pregunta}". 

Esto puede deberse a:
- No tienes facturas de ese período
- El término buscado no coincide exactamente
- Aún no has subido suficientes facturas

¿Puedes reformular la pregunta o ser más específico?`

    if (sugerencias.length > 0) {
      respuesta += `\n\nTambién podrías preguntar:\n${sugerencias.map(s => `• ${s}`).join('\n')}`
    }
    
    return respuesta
  }
  
  // Respuesta contextual según el tipo de consulta
  const prompt = `
Convierte estos datos en una respuesta natural y útil para un restaurante.

PREGUNTA ORIGINAL: "${pregunta}"
MÉTODO USADO: ${metodo}
DATOS ENCONTRADOS: ${JSON.stringify(datos)}

REGLAS:
1. Respuesta en español natural
2. Usar formato de moneda español (1.250,50 €)
3. Incluir fechas en formato DD/MM/YYYY
4. Si son muchos resultados, resumir los más importantes
5. Ofrecer insights útiles cuando sea posible
6. Ser específico con números y cantidades
7. Incluir contexto temporal cuando sea relevante

EJEMPLOS:
- Para última factura: "Tu última factura fue de [Proveedor] por [importe] el [fecha]"
- Para gastos: "Has gastado [importe] en [período]"
- Para productos: "Compraste [cantidad] de [producto] en [período]"
- Para proveedores: "Tu proveedor más activo es [nombre] con [X] facturas por [importe total]"

Respuesta natural:
`

  try {
    const respuesta = await callOpenAI(prompt, 0.7, 500)
    console.log('✅ Respuesta mejorada generada')
    return respuesta
  } catch (error) {
    console.error('❌ Error generando respuesta mejorada:', error)
    
    // Fallback: Respuesta básica estructurada
    return generarRespuestaFallbackEstructurada(datos, pregunta, metodo)
  }
}

// ===== RESPUESTA FALLBACK ESTRUCTURADA =====
function generarRespuestaFallbackEstructurada(datos: any, pregunta: string, metodo: string): string {
  if (!datos || datos.length === 0) {
    return `No encontré resultados para "${pregunta}".`
  }
  
  // Analizar el tipo de datos para generar respuesta contextual
  const primerDato = datos[0]
  
  if (primerDato.numero_factura && primerDato.proveedor_nombre) {
    // Es una factura
    if (datos.length === 1) {
      let respuesta = `Encontré una factura de ${primerDato.proveedor_nombre} por ${formatearMoneda(primerDato.total_factura)}.`
      
      // Si tenemos fecha de factura
      if (primerDato.fecha_factura) {
        respuesta += `\n📅 Fecha de la factura: ${formatearFecha(primerDato.fecha_factura)}`
      }
      
      // Si tenemos fecha de extracción
      if (primerDato.fecha_extraccion) {
        respuesta += `\n🕒 Llegó al sistema: ${formatearFecha(primerDato.fecha_extraccion)}`
        
        // Si tenemos tiempo de llegada calculado
        if (primerDato.tiempo_llegada) {
          respuesta += ` (${primerDato.tiempo_llegada})`
        }
      }
      
      // Si hay diferencia entre fechas
      if (primerDato.dias_diferencia && primerDato.dias_diferencia > 0) {
        respuesta += `\n⚠️ Nota: La factura se emitió ${primerDato.dias_diferencia} día(s) antes de llegar al sistema.`
      }
      
      return respuesta
    } else {
      let respuesta = `Encontré ${datos.length} facturas. La más reciente es de ${primerDato.proveedor_nombre} por ${formatearMoneda(primerDato.total_factura)}.`
      
      if (primerDato.fecha_factura) {
        respuesta += `\n📅 Fecha de la factura: ${formatearFecha(primerDato.fecha_factura)}`
      }
      
      if (primerDato.fecha_extraccion) {
        respuesta += `\n🕒 Llegó al sistema: ${formatearFecha(primerDato.fecha_extraccion)}`
        if (primerDato.tiempo_llegada) {
          respuesta += ` (${primerDato.tiempo_llegada})`
        }
      }
      
      return respuesta
    }
  }
  
  if (primerDato.total_gastado || primerDato.total_mes) {
    // Es un resumen de gastos
    const total = primerDato.total_gastado || primerDato.total_mes
    return `El total gastado es ${formatearMoneda(total)}.`
  }
  
  if (primerDato.descripcion_original) {
    // Es un producto
    if (datos.length === 1) {
      return `Encontré ${primerDato.cantidad || 1} unidad(es) de ${primerDato.descripcion_original}.`
    } else {
      return `Encontré ${datos.length} productos diferentes.`
    }
  }
  
  if (primerDato.proveedor_nombre && primerDato.num_facturas) {
    // Es un resumen de proveedores
    return `Encontré ${datos.length} proveedores. El más activo es ${primerDato.proveedor_nombre} con ${primerDato.num_facturas} facturas.`
  }
  
  // Respuesta genérica
  return `Encontré ${datos.length} resultados para tu consulta "${pregunta}".`
}

// ===== FUNCIONES DE FORMATEO =====
function formatearMoneda(valor: number): string {
  if (!valor || isNaN(valor)) return '0,00 €'
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(valor)
}

function formatearFecha(fecha: string | Date): string {
  if (!fecha) return 'fecha no disponible'
  
  try {
    const fechaObj = new Date(fecha)
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return 'fecha no válida'
  }
}

// ===== DETECCIÓN INTELIGENTE DE CONSULTAS RELACIONADAS =====
function detectarConsultasRelacionadas(pregunta: string): string[] {
  const preguntaLower = pregunta.toLowerCase()
  const consultasRelacionadas: string[] = []
  
  // Detectar patrones y sugerir consultas relacionadas
  if (preguntaLower.includes('factura') || preguntaLower.includes('compra')) {
    consultasRelacionadas.push('última_factura')
    consultasRelacionadas.push('facturas_esta_semana')
  }
  
  if (preguntaLower.includes('gast') || preguntaLower.includes('dinero') || preguntaLower.includes('total')) {
    consultasRelacionadas.push('gasto_este_mes')
    consultasRelacionadas.push('resumen_anual')
  }
  
  if (preguntaLower.includes('proveedor')) {
    consultasRelacionadas.push('proveedores_activos')
    consultasRelacionadas.push('top_proveedores')
  }
  
  if (preguntaLower.includes('producto')) {
    consultasRelacionadas.push('productos_mas_comprados')
    consultasRelacionadas.push('productos_por_categoria')
  }
  
  if (preguntaLower.includes('mes') || preguntaLower.includes('semana')) {
    consultasRelacionadas.push('gasto_este_mes')
    consultasRelacionadas.push('facturas_esta_semana')
  }
  
  // Remover duplicados y limitar a 3 sugerencias
  return [...new Set(consultasRelacionadas)].slice(0, 3)
}

// ===== GENERAR SUGERENCIAS DE CONSULTAS =====
function generarSugerenciasConsultas(pregunta: string): string[] {
  const consultasRelacionadas = detectarConsultasRelacionadas(pregunta)
  
  const sugerencias: string[] = []
  
  consultasRelacionadas.forEach(tipo => {
    switch (tipo) {
      case 'última_factura':
        sugerencias.push('¿Cuál fue tu última factura?')
        break
      case 'ultima_factura_sistema':
        sugerencias.push('¿Cuál fue la última factura que llegó al sistema?')
        break
      case 'facturas_recientemente_recibidas':
        sugerencias.push('¿Qué facturas has recibido recientemente?')
        break
      case 'facturas_esta_semana':
        sugerencias.push('¿Cuántas facturas tienes esta semana?')
        break
      case 'gasto_este_mes':
        sugerencias.push('¿Cuánto has gastado este mes?')
        break
      case 'proveedores_activos':
        sugerencias.push('¿Cuáles son tus proveedores más activos?')
        break
      case 'productos_mas_comprados':
        sugerencias.push('¿Qué productos compras más frecuentemente?')
        break
      case 'resumen_anual':
        sugerencias.push('¿Quieres ver un resumen de tu año?')
        break
      case 'top_proveedores':
        sugerencias.push('¿Quieres ver tu ranking de proveedores?')
        break
      case 'productos_por_categoria':
        sugerencias.push('¿Quieres ver tus gastos por categoría?')
        break
    }
  })
  
  return sugerencias
}