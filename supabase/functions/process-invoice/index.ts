import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuración de la API de Google Document AI
const GOOGLE_PROJECT_ID = 'gen-lang-client-0960907787'
const GOOGLE_LOCATION = 'eu'
const GOOGLE_PROCESSOR_ID = 'd8f21f63e573ae81'
const GOOGLE_API_ENDPOINT = `https://eu-documentai.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/processors/${GOOGLE_PROCESSOR_ID}:process`

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

function getServiceAccount() {
  console.log('🔧 Obteniendo Service Account...')
  
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no encontrado en variables de entorno')
  }
  
  if (serviceAccountJson.trim() === '') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON está vacío')
  }
  
  console.log('📄 Service Account JSON encontrado, longitud:', serviceAccountJson.length)
  console.log('📝 Primeros 200 caracteres:', serviceAccountJson.substring(0, 200))
  console.log('📝 Últimos 100 caracteres:', serviceAccountJson.substring(Math.max(0, serviceAccountJson.length - 100)))
  
  if (serviceAccountJson.length < 100 || !serviceAccountJson.includes('"client_email"')) {
    console.warn('⚠️ JSON parece estar truncado')
    
    if (serviceAccountJson.trim() === '{' || serviceAccountJson.trim() === '{\n') {
      throw new Error('Service Account JSON está completamente truncado. Solo se recibió: ' + serviceAccountJson)
    }
  }
  
  try {
    const parsed = JSON.parse(serviceAccountJson)
    
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
      throw new Error('Service Account JSON no tiene los campos requeridos (client_email, private_key, project_id)')
    }
    
    console.log('✅ Service Account parseado correctamente')
    console.log('📧 Client email:', parsed.client_email)
    console.log('🔑 Private key length:', parsed.private_key?.length || 0)
    console.log('🏢 Project ID:', parsed.project_id)
    
    return parsed
  } catch (parseError) {
    console.error('❌ Error parseando Service Account JSON:', parseError)
    console.error('📄 JSON problemático:', serviceAccountJson)
    
    if (serviceAccountJson.length < 50) {
      throw new Error(`Service Account JSON está muy truncado. Longitud: ${serviceAccountJson.length}. Contenido: "${serviceAccountJson}". Verifica la configuración de la variable de entorno.`)
    }
    
    throw new Error(`Error parseando Service Account JSON: ${parseError.message}. Longitud recibida: ${serviceAccountJson.length}`)
  }
}

async function createJWT(serviceAccount: any) {
  console.log('🔑 Creando JWT...')
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now
  }

  const encodedHeader = btoa(JSON.stringify(header)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  const encodedPayload = btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  try {
    const pemKey = serviceAccount.private_key
    const keyData = pemKey.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '')
    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))

    const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken))
    
    // Convertir signature a string de manera segura
    const signatureArray = new Uint8Array(signature)
    let signatureString = ''
    for (let i = 0; i < signatureArray.length; i++) {
      signatureString += String.fromCharCode(signatureArray[i])
    }
    const encodedSignature = btoa(signatureString).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

    console.log('✅ JWT creado exitosamente')
    return `${unsignedToken}.${encodedSignature}`
  } catch (error) {
    console.error('❌ Error creando JWT:', error)
    throw error
  }
}

async function getAccessToken() {
  console.log('🎫 Obteniendo access token...')
  
  try {
    const serviceAccount = getServiceAccount()
    const jwt = await createJWT(serviceAccount)

    console.log('📤 Enviando request a Google OAuth...')
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    console.log('📊 Respuesta OAuth status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error OAuth:', errorText)
      throw new Error(`Error obteniendo access token: ${response.status} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log('📝 Respuesta OAuth OK')

    let data
    try {
      data = JSON.parse(responseText)
      console.log('✅ OAuth JSON parseado correctamente')
    } catch (parseError) {
      console.error('❌ Error parseando JSON OAuth:', parseError)
      throw new Error(`Error parseando respuesta OAuth: ${parseError.message}`)
    }

    if (!data.access_token) {
      throw new Error('No se encontró access_token en la respuesta OAuth')
    }

    console.log('✅ Access token obtenido exitosamente')
    return data.access_token

  } catch (error) {
    console.error('❌ Error en getAccessToken:', error)
    throw error
  }
}

// Función para extraer datos del texto OCR
function extractDataFromText(text: string) {
  console.log('🔍 Iniciando extracción de datos...')
  
  // Limpiar texto
  const cleanText = text.replace(/\s+/g, ' ').trim()
  
  // Patrones de extracción para España - CORREGIDOS y específicos
  const patterns = {
    // CIF - buscar cualquier CIF en el texto
    cif: /([A-Z]\d{8}[A-Z0-9])/g,
    
    // Número de factura
    numeroFactura: /(?:factura|fac\.?|invoice|n[úu]mero)[:\s#]*([A-Z0-9\-\/]{3,15})/gi,
    
    // Fechas
    fecha: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g,
    
    // TOTAL - buscar "TOTAL" seguido de importe
    totalBruto: /(?:TOTAL|total)[:\s]*(\d{1,4}(?:[,\.]\d{1,2})?)\s*€/gi,
    
    // SUBTOTAL/BASE - buscar "Subtotal" 
    baseImponible: /(?:Subtotal|subtotal|BASE|base)[:\s]*(\d{1,4}(?:[,\.]\d{1,2})?)\s*€/gi,
    
    // IVA - buscar "IVA XX%" seguido de importe
    cuotaIva: /IVA\s+\d{1,2}%[:\s]*(\d{1,4}(?:[,\.]\d{1,2})?)\s*€/gi,
    
    // TIPO IVA
    tipoIva: /IVA\s+(\d{1,2})%/gi,
    
    // Importes generales con € al final
    importe: /(\d{1,4}(?:[,\.]\d{1,2})?)\s*€/g,
    
    // Teléfonos
    telefono: /([679]\d{8})/g,
    
    // Emails
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  }
  
  // Extraer usando patrones
  const matches = {
    cifs: [...text.matchAll(patterns.cif)].map(m => m[1]),
    numeroFactura: [...text.matchAll(patterns.numeroFactura)].map(m => m[1]),
    fechas: [...text.matchAll(patterns.fecha)].map(m => m[1]),
    importes: [...text.matchAll(patterns.importe)].map(m => m[1]),
    totalBruto: [...text.matchAll(patterns.totalBruto)].map(m => m[1]),
    baseImponible: [...text.matchAll(patterns.baseImponible)].map(m => m[1]),
    cuotaIva: [...text.matchAll(patterns.cuotaIva)].map(m => m[1]),
    tipoIva: [...text.matchAll(patterns.tipoIva)].map(m => m[1] || m[2]).filter(Boolean),
    telefonos: [...text.matchAll(patterns.telefono)].map(m => m[1]),
    emails: [...text.matchAll(patterns.email)].map(m => m[1])
  }
  
  console.log('🔍 Matches encontrados:', matches)
  
  // Extraer nombre del proveedor (primeras líneas del documento)
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  let proveedorNombre = 'Proveedor no identificado'
  
  // Buscar en las primeras 15 líneas
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].trim()
    
    // Saltar líneas que parecen títulos o números
    if (/^(factura|invoice|albar[aá]n|n[úu]mero|fecha|cliente)/i.test(line)) continue
    if (/^\d+$/.test(line)) continue
    if (line.length < 3) continue
    if (/^[A-Z\s]+$/.test(line) && line.length < 10) continue // Solo mayúsculas cortas
    
    // Si la línea tiene entre 5 y 100 caracteres y contiene letras, probablemente es el proveedor
    if (line.length >= 5 && line.length <= 100 && /[a-zA-Z]/.test(line)) {
      // Verificar que no sea solo números o símbolos
      const letterCount = (line.match(/[a-zA-Z]/g) || []).length
      if (letterCount >= 3) {
        proveedorNombre = line
        break
      }
    }
  }
  
  // Si no se encontró, buscar patrones específicos
  if (proveedorNombre === 'Proveedor no identificado') {
    // Buscar líneas que contengan palabras como "S.L.", "S.A.", "Ltd", etc.
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim()
      if (/\b(S\.L\.|S\.A\.|Ltd|Inc|Corp|GmbH|S\.C\.|S\.C\.A\.|S\.C\.P\.|S\.C\.L\.|S\.C\.S\.|S\.C\.I\.|S\.C\.R\.|S\.C\.T\.|S\.C\.U\.|S\.C\.V\.|S\.C\.W\.|S\.C\.X\.|S\.C\.Y\.|S\.C\.Z\.)\b/i.test(line)) {
        if (line.length >= 5 && line.length <= 100) {
          proveedorNombre = line
          break
        }
      }
    }
  }
  
  // Función para convertir importe español a número
  function parseImporte(importeStr: string) {
    if (!importeStr) return 0
    
    // Limpiar el string
    let cleanStr = importeStr.trim()
    
    // Remover símbolos de moneda
    cleanStr = cleanStr.replace(/[€$£¥]/g, '')
    
    // Manejar formato español (1.234,56)
    if (cleanStr.includes(',') && cleanStr.includes('.')) {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
    }
    // Manejar formato inglés (1,234.56)
    else if (cleanStr.includes(',') && !cleanStr.includes('.')) {
      // Si solo hay una coma y está en posición de decimales
      const parts = cleanStr.split(',')
      if (parts.length === 2 && parts[1].length === 2) {
        cleanStr = cleanStr.replace(',', '.')
      }
    }
    
    const result = parseFloat(cleanStr)
    return isNaN(result) ? 0 : result
  }
  
  // Estructurar datos extraídos con lógica fiscal española correcta
  const extracted = {
    proveedor_nombre: proveedorNombre,
    proveedor_cif: matches.cifs[0] || null,
    numero_factura: matches.numeroFactura[0] || 'SIN_NUMERO',
    fecha_factura: matches.fechas[0] ? convertToISODate(matches.fechas[0]) : new Date().toISOString(),
    
    // LÓGICA FISCAL CORRECTA:
    total_factura: parseImporte(matches.totalBruto[0]) || 0,  // TOTAL CON IVA
    base_imponible: parseImporte(matches.baseImponible[0]) || 0,  // SIN IVA
    cuota_iva: parseImporte(matches.cuotaIva[0]) || 0,  // IMPUESTO
    tipo_iva: parseInt(matches.tipoIva[0]) || 21,  // PORCENTAJE
    
    confianza_global: 0.8
  }
  
  console.log('✅ Datos estructurados:', extracted)
  return extracted
}

// Función auxiliar para convertir fecha DD/MM/YYYY a ISO
function convertToISODate(dateStr: string) {
  try {
    const [day, month, year] = dateStr.split(/[\/\-]/)
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

Deno.serve(async (req) => {
  // MANEJAR PREFLIGHT OPTIONS REQUEST (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    console.log('🚀 === INICIANDO EDGE FUNCTION ===')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    console.log('📨 Parseando request JSON...')
    let requestBody
    try {
      requestBody = await req.json()
      console.log('✅ Request JSON parseado correctamente')
      console.log('📄 Request body:', requestBody)
    } catch (jsonError) {
      console.error('❌ Error parseando request JSON:', jsonError)
      throw new Error('Request JSON inválido')
    }

    // ADAPTADO PARA TU FORMATO DE app.js
    const { record: newFile } = requestBody
    console.log('📄 Datos del archivo:', newFile)
    
    if (!newFile || !newFile.name) {
      throw new Error('No se encontró información del archivo en el request')
    }

    const documentId = newFile.name
    console.log('🆔 Document ID:', documentId)

    // OBTENER LA RUTA REAL DEL ARCHIVO DESDE LA BD
    console.log('🔍 Buscando información del archivo en BD...')
    const { data: documentInfo, error: docError } = await supabaseClient
      .from('documentos')
      .select('url_storage, nombre_archivo, restaurante_id')
      .eq('id', documentId)
      .single()

    if (docError || !documentInfo) {
      console.error('❌ Error obteniendo info del documento:', docError)
      throw new Error(`Documento no encontrado: ${documentId}`)
    }

    const filePath = documentInfo.url_storage
    console.log('📍 Ruta del archivo:', filePath)

    // 2. Actualizar el estado del documento a "processing"
    console.log('🔄 Actualizando estado a processing...')
    await supabaseClient
      .from('documentos')
      .update({ estado: 'processing', fecha_procesamiento: new Date().toISOString() })
      .eq('id', documentId)

    // 3. Descargar el contenido del archivo desde Supabase Storage
    console.log('⬇️ Descargando archivo desde storage...')
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('documentos')
      .download(filePath)

    if (downloadError) {
      console.error('❌ Error descargando archivo:', downloadError)
      throw downloadError
    }

    const fileContent = await fileData.arrayBuffer()
    
    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileContent.byteLength > maxSize) {
      throw new Error(`Archivo demasiado grande: ${(fileContent.byteLength / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 10MB`)
    }
    
    // Convertir a base64 de manera más segura
    const uint8Array = new Uint8Array(fileContent)
    let base64File = ''
    for (let i = 0; i < uint8Array.length; i++) {
      base64File += String.fromCharCode(uint8Array[i])
    }
    base64File = btoa(base64File)
    console.log('✅ Archivo convertido a base64, tamaño:', base64File.length)

    // 4. Obtener access token
    console.log('🎫 === INICIANDO PROCESO DE AUTENTICACIÓN ===')
    const accessToken = await getAccessToken()
    console.log('✅ === AUTENTICACIÓN COMPLETADA ===')

    // 5. Llamar a Google Document AI
    console.log('🤖 === ENVIANDO A GOOGLE DOCUMENT AI ===')
    console.log('📍 Endpoint:', GOOGLE_API_ENDPOINT)
    console.log('🔑 Access Token (primeros 50 chars):', accessToken.substring(0, 50))
    console.log('📄 Archivo a procesar - Tamaño base64:', base64File.length)
    
    const documentAiRequest = {
      rawDocument: {
        content: base64File,
        mimeType: 'application/pdf',
      },
    }
    
    console.log('📤 Request body preparado:', JSON.stringify(documentAiRequest, null, 2))
    
    const googleAiResponse = await fetch(GOOGLE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentAiRequest),
    })

    console.log('📊 Respuesta Google Document AI - Status:', googleAiResponse.status)
    
    if (!googleAiResponse.ok) {
      const errorText = await googleAiResponse.text()
      console.error('❌ Error Google Document AI:', errorText)
      console.error('📊 Status Code:', googleAiResponse.status)
      console.error('📊 Status Text:', googleAiResponse.statusText)
      console.error('🔍 Headers de respuesta:', Object.fromEntries(googleAiResponse.headers.entries()))
      
      // Intentar parsear el error para más detalles
      try {
        const errorJson = JSON.parse(errorText)
        console.error('📋 Error detallado:', JSON.stringify(errorJson, null, 2))
        
        if (errorJson.error?.details) {
          console.error('🔍 Detalles del error:', errorJson.error.details)
        }
      } catch (parseError) {
        console.error('⚠️ No se pudo parsear el error como JSON')
      }
      
      throw new Error(`Error en Google Document AI: ${googleAiResponse.status} - ${errorText}`)
    }

    const responseText = await googleAiResponse.text()
    console.log('📝 Respuesta Google AI (primeros 200 chars):', responseText.substring(0, 200))
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Respuesta vacía de Google Document AI')
    }

    let extractedResult
    try {
      extractedResult = JSON.parse(responseText)
      console.log('✅ Google AI JSON parseado correctamente')
    } catch (parseError) {
      console.error('❌ Error parseando JSON Google AI:', parseError)
      throw new Error(`Error parseando respuesta de Google Document AI: ${parseError.message}`)
    }

    const documentText = extractedResult.document?.text || ''
    console.log('✅ Texto extraído, longitud:', documentText.length)

    // 6. Extraer datos REALES del texto
    console.log('🔍 Extrayendo datos del texto OCR...')
    console.log('📄 Texto a procesar (primeros 500 chars):', documentText.substring(0, 500))

    const extractedData = extractDataFromText(documentText)
    console.log('📊 Datos extraídos:', extractedData)

    // 7. Verificar estructura de la tabla y guardar en BD
    console.log('🔍 Verificando estructura de la tabla datos_extraidos_facturas...')
    
    // Intentar obtener información de la tabla
    const { data: tableInfo, error: tableError } = await supabaseClient
      .from('datos_extraidos_facturas')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Error accediendo a la tabla datos_extraidos_facturas:', tableError)
      console.error('🔍 Código de error:', tableError.code)
      console.error('🔍 Detalles del error:', tableError.details)
      throw new Error(`Error accediendo a la tabla: ${tableError.message}`)
    } else {
      console.log('✅ Tabla datos_extraidos_facturas accesible')
      if (tableInfo && tableInfo.length > 0) {
        console.log('📋 Ejemplo de registro existente:', tableInfo[0])
      }
    }
    
    console.log('💾 Guardando en base de datos...')
    console.log('📄 Datos a insertar:', {
      documento_id: documentId,
      restaurante_id: documentInfo.restaurante_id,
      ...extractedData,
    })
    
    const { data: insertResult, error: insertError } = await supabaseClient
      .from('datos_extraidos_facturas')
      .insert({
        documento_id: documentId,
        restaurante_id: documentInfo.restaurante_id,
        ...extractedData,
      })
      .select()

    if (insertError) {
      console.error('❌ Error insertando datos:', insertError)
      console.error('📄 Datos que se intentaron insertar:', {
        documento_id: documentId,
        restaurante_id: documentInfo.restaurante_id,
        ...extractedData,
      })
      console.error('🔍 Código de error:', insertError.code)
      console.error('🔍 Detalles del error:', insertError.details)
      console.error('🔍 Hint:', insertError.hint)
      throw new Error(`Error guardando datos: ${insertError.message}`)
    } else {
      console.log('✅ Datos guardados correctamente:', insertResult)
    }

    // 8. Actualizar estado
    console.log('🔄 Actualizando estado del documento a processed...')
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('documentos')
      .update({ estado: 'processed' })
      .eq('id', documentId)
      .select()

    if (updateError) {
      console.error('❌ Error actualizando estado del documento:', updateError)
      throw new Error(`Error actualizando estado: ${updateError.message}`)
    } else {
      console.log('✅ Estado del documento actualizado correctamente:', updateResult)
    }

    console.log('🎉 === PROCESAMIENTO COMPLETADO ===')
    console.log('📊 Resumen del procesamiento:')
    console.log('  - Documento ID:', documentId)
    console.log('  - Texto extraído:', documentText.length, 'caracteres')
    console.log('  - Datos guardados:', insertResult)
    console.log('  - Estado actualizado:', updateResult)

    return new Response(JSON.stringify({ 
      success: true, 
      documentId,
      message: 'Procesado exitosamente',
      textLength: documentText.length,
      extractedData,
      insertResult,
      updateResult
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })

  } catch (error) {
    console.error('❌ === ERROR EN EDGE FUNCTION ===')
    console.error('Error details:', error)
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })
  }
})
