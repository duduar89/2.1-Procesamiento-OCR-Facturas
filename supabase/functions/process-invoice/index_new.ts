import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_PROJECT_ID = 'gen-lang-client-0960907787'
const GOOGLE_LOCATION = 'us'
const GOOGLE_PROCESSOR_ID = 'd8f21f63e573ae81'
const GOOGLE_API_ENDPOINT = `https://documentai.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/processors/${GOOGLE_PROCESSOR_ID}:process`

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
  console.log('📝 Últimos 100 caracteres:', serviceAccountJson.substring(Math.max(0, serviceAccountJson.length - 100))
  
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

Deno.serve(async (req) => {
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

    const { record: newFile } = requestBody
    console.log('📄 Datos del archivo:', newFile)
    
    if (!newFile || !newFile.name) {
      throw new Error('No se encontró información del archivo en el request')
    }

    const documentId = newFile.name
    console.log('🆔 Document ID:', documentId)

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

    console.log('🔄 Actualizando estado a processing...')
    await supabaseClient
      .from('documentos')
      .update({ estado: 'processing', fecha_procesamiento: new Date().toISOString() })
      .eq('id', documentId)

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
    
    const maxSize = 10 * 1024 * 1024
    if (fileContent.byteLength > maxSize) {
      throw new Error(`Archivo demasiado grande: ${(fileContent.byteLength / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 10MB`)
    }
    
    const uint8Array = new Uint8Array(fileContent)
    let base64File = ''
    for (let i = 0; i < uint8Array.length; i++) {
      base64File += String.fromCharCode(uint8Array[i])
    }
    base64File = btoa(base64File)
    console.log('✅ Archivo convertido a base64, tamaño:', base64File.length)

    console.log('🎫 === INICIANDO PROCESO DE AUTENTICACIÓN ===')
    const accessToken = await getAccessToken()
    console.log('✅ === AUTENTICACIÓN COMPLETADA ===')

    console.log('🤖 === ENVIANDO A GOOGLE DOCUMENT AI ===')
    console.log('📍 Endpoint:', GOOGLE_API_ENDPOINT)
    
    const googleAiResponse = await fetch(GOOGLE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64File,
          mimeType: 'application/pdf',
        },
      }),
    })

    console.log('📊 Respuesta Google Document AI - Status:', googleAiResponse.status)
    
    if (!googleAiResponse.ok) {
      const errorText = await googleAiResponse.text()
      console.error('❌ Error Google Document AI:', errorText)
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

    const extractedData = {
      proveedor_nombre: 'Proveedor Extraído con IA',
      proveedor_cif: 'CIF Extraído con IA',
      numero_factura: 'FAC-123-IA',
      fecha_factura: new Date().toISOString(),
      total_factura: 121.00,
      confianza_global: 0.95,
    }

    console.log('💾 Guardando en base de datos...')
    await supabaseClient
      .from('datos_extraidos_facturas')
      .insert({
        documento_id: documentId,
        restaurante_id: documentInfo.restaurante_id,
        ...extractedData,
      })

    await supabaseClient
      .from('documentos')
      .update({ estado: 'processed' })
      .eq('id', documentId)

    console.log('🎉 === PROCESAMIENTO COMPLETADO ===')

    return new Response(JSON.stringify({ 
      success: true, 
      documentId,
      message: 'Procesado exitosamente',
      textLength: documentText.length
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
