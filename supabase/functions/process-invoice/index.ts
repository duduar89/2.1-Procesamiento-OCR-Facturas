import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuración de la API de Google Document AI
const GOOGLE_PROJECT_ID = 'gen-lang-client-0960907787'
const GOOGLE_LOCATION = 'eu'
const GOOGLE_PROCESSOR_ID = '49b7920fa26bebc' // ✅ Procesador de OCR Text Extractor
const GOOGLE_API_ENDPOINT = `https://eu-documentai.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/processors/${GOOGLE_PROCESSOR_ID}:process`

// Configuración de OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

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

// 🔧 FUNCIÓN AUXILIAR PARA EXTRAER COORDENADAS CORRECTAMENTE
function extractCoordinates(field: any, confidence: number, fieldValue: string) {
  try {
    // Intentar diferentes formatos de coordenadas que puede devolver Google AI
    let vertices: any[] | null = null;
    
    // Formato 1: layout.boundingPoly.normalizedVertices (OCR)
    if (field.layout && field.layout.boundingPoly && field.layout.boundingPoly.normalizedVertices) {
      vertices = field.layout.boundingPoly.normalizedVertices
      console.log('📍 Usando layout.boundingPoly.normalizedVertices (coordenadas normalizadas)')
    }
    // Formato 2: layout.boundingPoly.vertices (coordenadas absolutas)
    else if (field.layout && field.layout.boundingPoly && field.layout.boundingPoly.vertices) {
      vertices = field.layout.boundingPoly.vertices
      console.log('📍 Usando layout.boundingPoly.vertices (coordenadas absolutas)')
    }
    // Formato 3: boundingBox.vertices (algunos tipos)
    if (field.boundingBox && field.boundingBox.vertices) {
      vertices = field.boundingBox.vertices;
      console.log('📍 Usando boundingBox.vertices (coordenadas absolutas)');
    }
    // Formato 4: boundingPoly.normalizedVertices (coordenadas normalizadas 0-1)
    else if (field.boundingPoly && field.boundingPoly.normalizedVertices) {
      vertices = field.boundingPoly.normalizedVertices;
      console.log('📍 Usando boundingPoly.normalizedVertices (coordenadas normalizadas)');
    }
    // Formato 5: boundingPoly.vertices (coordenadas absolutas)
    else if (field.boundingPoly && field.boundingPoly.vertices) {
      vertices = field.boundingPoly.vertices;
      console.log('📍 Usando boundingPoly.vertices (coordenadas absolutas)');
    }
    
    if (!vertices || vertices.length < 4) {
      console.log('⚠️ No se encontraron coordenadas válidas para el campo');
      return null;
    }
    
    // Calcular coordenadas del rectángulo
    const x = vertices[0]?.x || 0;
    const y = vertices[0]?.y || 0;
    const width = Math.abs((vertices[1]?.x || 0) - (vertices[0]?.x || 0));
    const height = Math.abs((vertices[2]?.y || 0) - (vertices[0]?.y || 0));
    
    // Si las coordenadas están normalizadas (0-1), convertirlas a píxeles
    // Preferir dimensiones reales de página si existen
    const pageWidth = (field.pageWidth || field.width || field.layout?.width || field.layout?.pageWidth || 595);
    const pageHeight = (field.pageHeight || field.height || field.layout?.height || field.layout?.pageHeight || 842);
    
    let finalX = x;
    let finalY = y;
    let finalWidth = width;
    let finalHeight = height;
    
    // Detectar si son coordenadas normalizadas
    if (x <= 1 && y <= 1 && width <= 1 && height <= 1) {
      console.log('🔄 Convirtiendo coordenadas normalizadas a píxeles...');
      finalX = Math.round(x * pageWidth);
      finalY = Math.round(y * pageHeight);
      finalWidth = Math.round(width * pageWidth);
      finalHeight = Math.round(height * pageHeight);
    }
    
    console.log(`📍 Coordenadas extraídas: x=${finalX}, y=${finalY}, w=${finalWidth}, h=${finalHeight}`);
    
    return {
      x: finalX,
      y: finalY,
      width: finalWidth,
      height: finalHeight,
      confidence: confidence,
      text: fieldValue,
      original_coordinates: {
        x: x,
        y: y,
        width: width,
        height: height,
        normalized: (x <= 1 && y <= 1)
      },
      // Adjuntar dimensiones de página usadas para que el frontend pueda escalar de forma exacta
      page_width: pageWidth,
      page_height: pageHeight
    };
    
  } catch (error) {
    console.error('❌ Error extrayendo coordenadas:', error);
    return null;
  }
}

// 🧮 FUNCIÓN AUXILIAR PARA EXTRAER COORDENADAS DEL FORM PARSER
function extractCoordinatesFromField(fieldValue: any) {
  try {
    // La estructura real en el JSON es fieldValue.boundingPoly.normalizedVertices
    if (fieldValue?.boundingPoly?.normalizedVertices) {
      const vertices = fieldValue.boundingPoly.normalizedVertices
      return {
        normalizedVertices: vertices,
        confidence: fieldValue.confidence || 0.5,
        x: vertices[0]?.x || 0,
        y: vertices[0]?.y || 0,
        width: Math.abs((vertices[1]?.x || 0) - (vertices[0]?.x || 0)),
        height: Math.abs((vertices[2]?.y || 0) - (vertices[0]?.y || 0)),
        // Información adicional para el frontend
        page_width: 1.0, // Coordenadas normalizadas
        page_height: 1.0,
        type: 'form_field'
      }
    }
    return null
  } catch (error) {
    console.warn('⚠️ Error extrayendo coordenadas:', error)
    return null
  }
}



// 🧮 FUNCIÓN CORREGIDA PARA EXTRAER DATOS DESDE FORM FIELDS (ESPAÑOL)
function extractFromFormFields(formFields: any[], fullText: string, extractedData: any) {
  console.log('🔋 Extrayendo desde Form Fields estructurados (optimizado para español)...')
  console.log('🔍 === INICIO DE EXTRACTFROMFORMFIELDS ===')
  console.log('📊 Número de formFields recibidos:', formFields?.length || 0)
  console.log('📝 Longitud del texto completo:', fullText?.length || 0)
  console.log('🔍 Estructura del primer formField:', JSON.stringify(formFields[0], null, 2))
  
  formFields.forEach((field, index) => {
    try {
      // ✅ EXTRAER DATOS USANDO textAnchor CORRECTAMENTE
      let fieldName = ''
      let fieldValue = ''
      let confidence = 0.5
      
      // ✅ MÉTODO PRINCIPAL: Usar textAnchor para extraer texto
      if (field.fieldName && field.fieldName.textAnchor) {
        fieldName = getTextFromAnchor(fullText, field.fieldName.textAnchor)
        console.log(`🔍 FieldName extraído vía textAnchor: "${fieldName}"`)
      } else if (field.fieldName && field.fieldName.content) {
        // ✅ FALLBACK: Si existe .content directamente
        fieldName = field.fieldName.content
        console.log(`🔍 FieldName extraído vía .content: "${fieldName}"`)
      }
      
      if (field.fieldValue && field.fieldValue.textAnchor) {
        fieldValue = getTextFromAnchor(fullText, field.fieldValue.textAnchor)
        console.log(`🔍 FieldValue extraído vía textAnchor: "${fieldValue}"`)
      } else if (field.fieldValue && field.fieldValue.content) {
        // ✅ FALLBACK: Si existe .content directamente
        fieldValue = field.fieldValue.content
        console.log(`🔍 FieldValue extraído vía .content: "${fieldValue}"`)
      }
      
      // ✅ EXTRAER CONFIANZA
      if (field.fieldValue && typeof field.fieldValue.confidence === 'number') {
        confidence = field.fieldValue.confidence
      } else if (field.confidence && typeof field.confidence === 'number') {
        confidence = field.confidence
      }
      
      console.log(`🔍 Campo ${index + 1}: "${fieldName.trim()}" = "${fieldValue.trim()}" (${Math.round(confidence * 100)}%)`)
      
      // Limpiar nombres de campo (quitar saltos de línea, espacios, puntos)
      const normalizedFieldName = fieldName.toLowerCase().trim().replace(/[\n\r\:\.\s]/g, '')
      const cleanFieldValue = fieldValue.trim().replace(/[\n\r]/g, '')
      
      // 🎯 MAPEO ESPECÍFICO PARA CAMPOS ESPAÑOLES DEL FORM PARSER
      
      // ✅ FECHA DE FACTURA
      if (normalizedFieldName.includes('fecha') && !normalizedFieldName.includes('vto')) {
        if (cleanFieldValue && cleanFieldValue.length >= 8) {
          try {
            // Parsear fecha española: "31/07/2025"
            const fechaParts = cleanFieldValue.split('/')
            if (fechaParts.length === 3) {
              const [dia, mes, año] = fechaParts
              const fechaISO = new Date(`${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`).toISOString()
              extractedData.fecha_factura = fechaISO
              extractedData.confianza_datos_fiscales = Math.max(extractedData.confianza_datos_fiscales, confidence)
              
              // 🗺️ COORDENADAS de la fecha
              const coords = extractCoordinatesFromField(field.fieldValue)
              if (coords) {
                extractedData.coordenadas_campos.fecha_factura = coords
              }
              
              console.log(`✅ Fecha extraída: ${cleanFieldValue} → ${fechaISO}`)
            }
          } catch (dateError) {
            console.warn(`⚠️ Error parseando fecha: ${cleanFieldValue}`)
          }
        }
      }
      
      // ✅ NÚMERO DE FACTURA  
      else if (normalizedFieldName.includes('factura') || normalizedFieldName.includes('nºdefactura') || normalizedFieldName.includes('numerofactura')) {
        if (cleanFieldValue && cleanFieldValue.length > 0) {
          // Limpiar número de factura: "526 / 2025" → "526/2025"
          const numeroLimpio = cleanFieldValue.replace(/\s+/g, '')
          extractedData.numero_factura = numeroLimpio
          extractedData.confianza_datos_fiscales = Math.max(extractedData.confianza_datos_fiscales, confidence)
          
          // 🗺️ COORDENADAS del número de factura
          const coords = extractCoordinatesFromField(field.fieldValue)
          if (coords) {
            extractedData.coordenadas_campos.numero_factura = coords
          }
          
          console.log(`✅ Número de factura extraído: ${cleanFieldValue} → ${numeroLimpio}`)
        }
      }
      
      // ✅ CIF / NIF
      else if (normalizedFieldName.includes('nif') || normalizedFieldName.includes('cif')) {
        if (cleanFieldValue && cleanFieldValue.length >= 8) {
          // Validar formato CIF español básico
          const cifCleaned = cleanFieldValue.replace(/[\s\-\.]/g, '').toUpperCase()
          if (/^[A-Z]\d{8}[A-Z0-9]?$/.test(cifCleaned) || /^\d{8}[A-Z]$/.test(cifCleaned)) {
            extractedData.proveedor_cif = cifCleaned
            extractedData.confianza_datos_fiscales = Math.max(extractedData.confianza_datos_fiscales, confidence)
            
            // 🗺️ COORDENADAS del CIF
            const coords = extractCoordinatesFromField(field.fieldValue)
            if (coords) {
              extractedData.coordenadas_campos.proveedor_cif = coords
            }
            
            console.log(`✅ CIF extraído: ${cifCleaned}`)
          }
        }
      }
      
      // ✅ TOTAL FACTURA
      else if (normalizedFieldName.includes('totalfactura') || normalizedFieldName.includes('totalapagar')) {
        if (cleanFieldValue) {
          const totalAmount = parseSpanishAmount(cleanFieldValue)
          if (totalAmount && totalAmount > 0) {
            extractedData.total_factura = totalAmount
            extractedData.confianza_importes = Math.max(extractedData.confianza_importes, confidence)
            
            // 🗺️ COORDENADAS del total
            const coords = extractCoordinatesFromField(field.fieldValue)
            if (coords) {
              extractedData.coordenadas_campos.total_factura = coords
            }
            
            console.log(`✅ Total extraído: ${cleanFieldValue} → ${totalAmount}€`)
          }
        }
      }
      
      // ✅ BASE IMPONIBLE / TOTAL CONCEPTOS
      else if (normalizedFieldName.includes('totalconceptos') || normalizedFieldName.includes('base') || normalizedFieldName.includes('subtotal')) {
        if (cleanFieldValue) {
          const baseAmount = parseSpanishAmount(cleanFieldValue)
          if (baseAmount && baseAmount > 0) {
            extractedData.base_imponible = baseAmount
            extractedData.confianza_importes = Math.max(extractedData.confianza_importes, confidence)
            
            // 🗺️ COORDENADAS de la base
            const coords = extractCoordinatesFromField(field.fieldValue)
            if (coords) {
              extractedData.coordenadas_campos.base_imponible = coords
            }
            
            console.log(`✅ Base imponible extraída: ${cleanFieldValue} → ${baseAmount}€`)
          }
        }
      }
      
      // ✅ TOTAL LÍQUIDO (otro nombre para total)
      else if (normalizedFieldName.includes('totalliquido')) {
        if (cleanFieldValue) {
          const liquidoAmount = parseSpanishAmount(cleanFieldValue)
          if (liquidoAmount && liquidoAmount > 0 && extractedData.total_factura === 0) {
            extractedData.total_factura = liquidoAmount
            extractedData.confianza_importes = Math.max(extractedData.confianza_importes, confidence)
            
            console.log(`✅ Total líquido extraído: ${cleanFieldValue} → ${liquidoAmount}€`)
          }
        }
      }
      
      // ✅ IDENTIFICACIÓN CLIENTE (para proveedor)
      else if (normalizedFieldName.includes('identificacioncliente') || cleanFieldValue.includes('CORRELIMO HUELVA')) {
        if (cleanFieldValue && cleanFieldValue.length > 10) {
          // Extraer nombre del cliente de la cadena
          const lines = cleanFieldValue.split('\n').filter(line => line.trim().length > 0)
          if (lines.length >= 2) {
            const nombreCliente = lines[1] // Segunda línea suele ser el nombre
            if (nombreCliente && nombreCliente.length > 5) {
              extractedData.proveedor_nombre = nombreCliente.trim()
              extractedData.confianza_proveedor = Math.max(extractedData.confianza_proveedor, confidence)
              
              console.log(`✅ Proveedor extraído de identificación: ${nombreCliente}`)
            }
          }
        }
      }
      
      // ✅ EXPEDIDA EN (ciudad)
      else if (normalizedFieldName.includes('expedidaen')) {
        if (cleanFieldValue && cleanFieldValue.length > 2) {
          // Podemos usar esto para completar información del proveedor
          console.log(`✅ Ciudad expedición: ${cleanFieldValue}`)
        }
      }
      
      // 🔍 LOG para campos no reconocidos (ayuda a identificar nuevos campos)
      else if (cleanFieldValue && cleanFieldValue.length > 3 && confidence > 0.5) {
        console.log(`🤔 Campo no reconocido: "${normalizedFieldName}" = "${cleanFieldValue}" (confianza: ${Math.round(confidence * 100)}%)`)
      }
      
    } catch (error) {
      console.error(`❌ Error procesando campo ${index + 1}:`, error)
    }
  })
  
  // ✅ CALCULAR IVA si tenemos base y total
  if (extractedData.base_imponible > 0 && extractedData.total_factura > 0) {
    extractedData.cuota_iva = Math.round((extractedData.total_factura - extractedData.base_imponible) * 100) / 100
    if (extractedData.cuota_iva > 0) {
      extractedData.tipo_iva = Math.round((extractedData.cuota_iva / extractedData.base_imponible) * 100)
      console.log(`✅ IVA calculado: ${extractedData.cuota_iva}€ (${extractedData.tipo_iva}%)`)
    }
  }
  
  console.log('✅ Form Fields procesados correctamente')
  console.log(`📊 Datos extraídos: Proveedor="${extractedData.proveedor_nombre}" | Total=${extractedData.total_factura}€ | CIF=${extractedData.proveedor_cif}`)
}

// 🏷️ FUNCIÓN PARA EXTRAER DATOS DESDE ENTITIES ESTRUCTURADAS
function extractFromEntities(entities: any[], fullText: string, extractedData: any) {
  console.log('🏷️ Extrayendo desde Entities estructuradas...')
  
  entities.forEach((entity, index) => {
    try {
      const entityType = entity.type || ''
      const mentionText = entity.mentionText || ''
      const normalizedValue = entity.normalizedValue?.text || entity.normalizedValue || mentionText
      const confidence = entity.confidence || 0.5
      
      console.log(`🔍 Entity ${index + 1}: Tipo="${entityType}" | Texto="${mentionText}" | Valor="${normalizedValue}" (${Math.round(confidence * 100)}%)`)
      
      // 🎯 MAPEAR ENTITY TYPES A NUESTROS DATOS
      const normalizedType = entityType.toLowerCase().trim()
      
      // PROVEEDOR / SUPPLIER (reconocimiento español + inglés)
      if (normalizedType.includes('proveedor') ||
          normalizedType.includes('empresa') ||
          normalizedType.includes('compañia') ||
          normalizedType.includes('compañía') ||
          normalizedType.includes('entidad') ||
          normalizedType.includes('supplier') || 
          normalizedType.includes('vendor') ||
          normalizedType.includes('company') ||
          normalizedType.includes('seller') ||
          normalizedType.includes('merchant')) {
        
        if (normalizedValue.trim().length > 3) {
          extractedData.proveedor_nombre = normalizedValue.trim()
          extractedData.confianza_proveedor = Math.max(extractedData.confianza_proveedor, confidence)
          
          // 🗺️ COORDENADAS del proveedor
          const coords = extractCoordinates(entity, confidence, normalizedValue)
          if (coords) {
            extractedData.coordenadas_campos.proveedor_nombre = coords
          }
        }
      }
      
      // CIF / NIF / TAX ID (reconocimiento español + inglés)
      if (normalizedType.includes('cif') ||
          normalizedType.includes('nif') ||
          normalizedType.includes('identificación') ||
          normalizedType.includes('identificacion') ||
          normalizedType.includes('tax') ||
          normalizedType.includes('vat') ||
          normalizedType.includes('ein') ||
          normalizedType.includes('business') ||
          normalizedType.includes('registration')) {
        
        if (normalizedValue.trim().length >= 8) {
          extractedData.proveedor_cif = normalizedValue.replace(/[\s\-]/g, '')
          extractedData.confianza_datos_fiscales = Math.max(extractedData.confianza_datos_fiscales, confidence)
          
          // 🗺️ COORDENADAS del CIF
          const coords = extractCoordinates(entity, confidence, normalizedValue)
          if (coords) {
            extractedData.coordenadas_campos.proveedor_cif = coords
          }
        }
      }
      
      // NÚMERO DE FACTURA / INVOICE NUMBER (reconocimiento español + inglés)
      if (normalizedType.includes('factura') ||
          normalizedType.includes('numero') ||
          normalizedType.includes('número') ||
          normalizedType.includes('documento') ||
          normalizedType.includes('folio') ||
          normalizedType.includes('referencia') ||
          normalizedType.includes('invoice') ||
          normalizedType.includes('document') ||
          normalizedType.includes('reference') ||
          normalizedType.includes('number')) {
        
        // Verificar que no sea una fecha u otro número
        if (normalizedValue.trim().length >= 1 && 
            !normalizedValue.includes('/') && 
            !normalizedValue.includes('-') &&
            !normalizedValue.includes('.') &&
            !/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(normalizedValue)) {
          
          extractedData.numero_factura = normalizedValue.trim()
          extractedData.confianza_datos_fiscales = Math.max(extractedData.confianza_datos_fiscales, confidence)
          
          // 🗺️ COORDENADAS del número de factura
          const coords = extractCoordinates(entity, confidence, normalizedValue)
          if (coords) {
            extractedData.coordenadas_campos.numero_factura = coords
          }
        }
      }
      
      // FECHA / DATE (reconocimiento español + inglés)
      if (normalizedType.includes('fecha') ||
          normalizedType.includes('emisión') ||
          normalizedType.includes('emision') ||
          normalizedType.includes('date') ||
          normalizedType.includes('time')) {
        
        if (normalizedValue.trim().length >= 6) {
          const parsedDate = parseSpanishDate(normalizedValue)
          if (parsedDate) {
            extractedData.fecha_factura = parsedDate
            extractedData.confianza_datos_fiscales = Math.max(extractedData.confianza_datos_fiscales, confidence)
            
            // 🗺️ COORDENADAS de la fecha
            const coords = extractCoordinates(entity, confidence, normalizedValue)
            if (coords) {
              extractedData.coordenadas_campos.fecha_factura = coords
            }
          }
        }
      }
      
      // IMPORTES / MONEY (reconocimiento español + inglés)
      if (normalizedType.includes('dinero') ||
          normalizedType.includes('importe') ||
          normalizedType.includes('total') ||
          normalizedType.includes('precio') ||
          normalizedType.includes('coste') ||
          normalizedType.includes('costo') ||
          normalizedType.includes('valor') ||
          normalizedType.includes('money') ||
          normalizedType.includes('currency') ||
          normalizedType.includes('amount') ||
          normalizedType.includes('price') ||
          normalizedType.includes('cost')) {
        
        const parsedAmount = parseSpanishAmount(normalizedValue)
        if (parsedAmount && parsedAmount > 0) {
          
          // Determinar qué tipo de importe es basándose en el contexto del texto
          if (normalizedType.includes('total') || normalizedType.includes('importe')) {
            extractedData.total_factura = parsedAmount
            extractedData.confianza_importes = Math.max(extractedData.confianza_importes, confidence)
            
            // 🗺️ COORDENADAS del total
            const coords = extractCoordinates(entity, confidence, normalizedValue)
            if (coords) {
              extractedData.coordenadas_campos.total_factura = coords
            }
          } else if (normalizedType.includes('base') || normalizedType.includes('neto')) {
            extractedData.base_imponible = parsedAmount
            extractedData.confianza_importes = Math.max(extractedData.confianza_importes, confidence)
            
            // 🗺️ COORDENADAS de la base
            const coords = extractCoordinates(entity, confidence, normalizedValue)
            if (coords) {
              extractedData.coordenadas_campos.base_imponible = coords
            }
          } else if (normalizedType.includes('iva') || normalizedType.includes('impuesto')) {
            extractedData.cuota_iva = parsedAmount
            extractedData.confianza_importes = Math.max(extractedData.confianza_importes, confidence)
            
            // 🗺️ COORDENADAS del IVA
            const coords = extractCoordinates(entity, confidence, normalizedValue)
            if (coords) {
              extractedData.coordenadas_campos.cuota_iva = coords
            }
          }
        }
      }
      
      // DIRECCIÓN / ADDRESS (reconocimiento español + inglés)
      if (normalizedType.includes('dirección') ||
          normalizedType.includes('direccion') ||
          normalizedType.includes('domicilio') ||
          normalizedType.includes('ubicación') ||
          normalizedType.includes('ubicacion') ||
          normalizedType.includes('address') ||
          normalizedType.includes('location')) {
        
        // Podemos usar esto para mejorar la información del proveedor
        console.log(`📍 Dirección encontrada: ${normalizedValue}`)
      }
      
    } catch (error) {
      console.error(`❌ Error procesando entity ${index}:`, error)
    }
  })
  
  // Actualizar confianza global
  extractedData.confianza_global = Math.max(0.3, (
    extractedData.confianza_proveedor +
    extractedData.confianza_datos_fiscales +
    extractedData.confianza_importes
  ) / 3)
  
  console.log('✅ Entities procesadas correctamente')
  console.log(`📊 Confianzas actualizadas: Global=${Math.round(extractedData.confianza_global * 100)}% | Proveedor=${Math.round(extractedData.confianza_proveedor * 100)}% | Datos=${Math.round(extractedData.confianza_datos_fiscales * 100)}% | Importes=${Math.round(extractedData.confianza_importes * 100)}%`)
}

// 🧮 FUNCIÓN PARA EXTRAER DATOS DESDE GOOGLE DOCUMENT AI FORM PARSER
function extractDataFromFormParser(googleAIResponse: any) {
  console.log('🎯 Iniciando extracción desde Form Parser...')
  console.log('🔍 === DEBUGGING: VERIFICANDO ESTRUCTURA DE LA RESPUESTA ===')
  console.log('📄 Tipo de respuesta:', typeof googleAIResponse)
  console.log('🔑 Claves en la respuesta:', Object.keys(googleAIResponse || {}))
  
  try {
    const document = googleAIResponse.document
    if (!document) {
      throw new Error('No se encontró documento en la respuesta')
    }
    
    console.log('📄 Documento Form Parser encontrado en respuesta')
    console.log('📝 Texto presente:', !!document.text)
    console.log('📝 Longitud texto:', document.text?.length || 0)
    console.log('📄 Páginas presentes:', !!document.pages)
    console.log('📄 Número de páginas:', document.pages?.length || 0)
    
    // 🔍 VERIFICAR ESTRUCTURA DE PÁGINAS
    if (document.pages && document.pages.length > 0) {
      document.pages.forEach((page: any, pageIndex: number) => {
        console.log(`📄 Página ${pageIndex + 1}:`)
        console.log(`  - FormFields: ${page.formFields?.length || 0}`)
        console.log(`  - Tables: ${page.tables?.length || 0}`)
        console.log(`  - Entities: ${page.entities?.length || 0}`)
      })
    }
    
    let extractedData = {
      proveedor_nombre: 'Proveedor no identificado',
      proveedor_cif: null as string | null,
      numero_factura: 'SIN_NUMERO',
      fecha_factura: new Date().toISOString(),
      total_factura: 0,
      base_imponible: 0,
      cuota_iva: 0,
      tipo_iva: 21,
      confianza_global: 0.3,
      confianza_proveedor: 0.3,
      confianza_datos_fiscales: 0.3,
      confianza_importes: 0.3,
      coordenadas_campos: {},
      campos_con_baja_confianza: [] as string[]
    }
    
    // 🔥 FORM FIELDS - Aquí están los datos estructurados clave (nivel páginas)
    console.log('🔍 === PROCESANDO FORM FIELDS ===')
    console.log('🔍 DEBUGGING: document.pages existe?', !!document.pages)
    console.log('🔍 DEBUGGING: document.pages.length:', document.pages?.length || 0)
    if (document.pages && document.pages.length > 0) {
      document.pages.forEach((page: any, pageIndex: number) => {
        console.log(`📄 Procesando página ${pageIndex + 1}...`)
        console.log(`🔍 DEBUGGING: page.formFields existe?`, !!page.formFields)
        console.log(`🔍 DEBUGGING: page.formFields.length:`, page.formFields?.length || 0)
        if (page.formFields && page.formFields.length > 0) {
          console.log(`🎯 ${page.formFields.length} form fields encontrados en página ${pageIndex + 1}`)
          console.log('🔍 Llamando a extractFromFormFields...')
          console.log('🔍 === ANTES DE LLAMAR A EXTRACTFROMFORMFIELDS ===')
          console.log('📊 FormFields a procesar:', page.formFields.length)
          console.log('📝 Primer formField:', JSON.stringify(page.formFields[0], null, 2))
          try {
            extractFromFormFields(page.formFields, document.text, extractedData)
            console.log('✅ extractFromFormFields completado')
          } catch (error) {
            console.error('❌ Error en extractFromFormFields:', error)
            console.error('🔍 Stack trace:', error.stack)
          }
        } else {
          console.log(`⚠️ Página ${pageIndex + 1} no tiene form fields`)
        }
      })
    } else {
      console.log(`⚠️ Documento no tiene páginas con form fields`)
    }
    
    // 🔥 TABLES - Para productos (nivel documento)
    if (document.tables && document.tables.length > 0) {
      console.log(`📊 ${document.tables.length} tablas encontradas a nivel de documento`)
      // Las tablas se procesarán por separado en la función de productos
    }
    
    // 🔥 ENTITIES - Para identificar elementos específicos (nivel documento)
    if (document.entities && document.entities.length > 0) {
      console.log(`🔍 ${document.entities.length} entities encontradas a nivel de documento`)
      extractFromEntities(document.entities, document.text, extractedData)
    }
    
    // 🔥 PÁGINAS - Para información adicional si es necesaria
    if (document.pages && document.pages.length > 0) {
      document.pages.forEach((page: any, pageIndex: number) => {
        console.log(`📄 Procesando página ${pageIndex + 1} para información adicional`)
        
        // Aquí se pueden procesar elementos específicos de página si es necesario
        // Por ahora, los datos principales vienen del nivel documento
      })
    }
    
    // ✅ VALIDACIÓN Y CÁLCULOS FISCALES
    // Si tenemos base e IVA pero no total, calcularlo
    if (extractedData.base_imponible > 0 && extractedData.cuota_iva > 0 && extractedData.total_factura === 0) {
      extractedData.total_factura = extractedData.base_imponible + extractedData.cuota_iva
      console.log('✅ Total calculado desde base e IVA:', extractedData.total_factura.toFixed(2))
    }
    
    // Si tenemos total e IVA pero no base, calcularla
    if (extractedData.total_factura > 0 && extractedData.cuota_iva > 0 && extractedData.base_imponible === 0) {
      extractedData.base_imponible = extractedData.total_factura - extractedData.cuota_iva
      console.log('✅ Base calculada desde total e IVA:', extractedData.base_imponible.toFixed(2))
    }
    
    // Si tenemos total y base pero no IVA, calcularlo
    if (extractedData.total_factura > 0 && extractedData.base_imponible > 0 && extractedData.cuota_iva === 0) {
      extractedData.cuota_iva = extractedData.total_factura - extractedData.base_imponible
      console.log('✅ IVA calculado desde total y base:', extractedData.cuota_iva.toFixed(2))
    }
    
    // ✅ FALLBACK INTELIGENTE: Solo para campos críticos faltantes
    console.log('🔍 === EVALUANDO NECESIDAD DE FALLBACK ===')
    const datosCompletos = {
      proveedor: extractedData.proveedor_nombre !== 'Proveedor no identificado',
      cif: extractedData.proveedor_cif !== null,
      numero: extractedData.numero_factura !== 'SIN_NUMERO',
      total: extractedData.total_factura > 0,
      base: extractedData.base_imponible > 0
    }
    
    console.log('📊 Estado de completitud:', datosCompletos)
    
    // Solo aplicar fallback si faltan datos CRÍTICOS (no para todo)
    const camposCriticosFaltantes: string[] = []
    if (!datosCompletos.proveedor) camposCriticosFaltantes.push('proveedor')
    if (!datosCompletos.total) camposCriticosFaltantes.push('total')
    
    if (camposCriticosFaltantes.length > 0) {
      console.log(`⚠️ Campos críticos faltantes: ${camposCriticosFaltantes.join(', ')}`)
      console.log('🔄 Aplicando fallback SELECTIVO (solo para campos faltantes)...')
      
      const fallbackData = extractDataFromTextFallback(document.text)
      
      // Solo reemplazar campos que realmente faltan
      if (!datosCompletos.proveedor && fallbackData.proveedor_nombre !== 'Proveedor no identificado') {
        extractedData.proveedor_nombre = fallbackData.proveedor_nombre
        extractedData.confianza_proveedor = Math.min(extractedData.confianza_proveedor, 0.6) // Reducir confianza
        console.log('✅ Proveedor obtenido por fallback:', extractedData.proveedor_nombre)
      }
      
      if (!datosCompletos.cif && fallbackData.proveedor_cif) {
        extractedData.proveedor_cif = fallbackData.proveedor_cif
        extractedData.confianza_datos_fiscales = Math.min(extractedData.confianza_datos_fiscales, 0.6)
        console.log('✅ CIF obtenido por fallback:', extractedData.proveedor_cif)
      }
      
      if (!datosCompletos.numero && fallbackData.numero_factura !== 'SIN_NUMERO') {
        extractedData.numero_factura = fallbackData.numero_factura
        extractedData.confianza_datos_fiscales = Math.min(extractedData.confianza_datos_fiscales, 0.6)
        console.log('✅ Número de factura obtenido por fallback:', extractedData.numero_factura)
      }
      
      if (!datosCompletos.total && fallbackData.total_factura > 0) {
        extractedData.total_factura = fallbackData.total_factura
        extractedData.base_imponible = fallbackData.base_imponible
        extractedData.cuota_iva = fallbackData.cuota_iva
        extractedData.confianza_importes = Math.min(extractedData.confianza_importes, 0.5)
        console.log('✅ Importes obtenidos por fallback:', {
          total: extractedData.total_factura,
          base: extractedData.base_imponible,
          iva: extractedData.cuota_iva
        })
      }
      
      // Marcar que se usó fallback
      extractedData.campos_con_baja_confianza = [
        ...extractedData.campos_con_baja_confianza,
        ...camposCriticosFaltantes.map(campo => `fallback_${campo}`)
      ]
    } else {
      console.log('✅ Form Parser proporcionó todos los datos críticos - NO se necesita fallback')
    }
    
    // 🔍 LOG TEMPORAL PARA DEBUGGING - Ver qué extrae realmente extractFromFormFields
    console.log('�� === DEBUGGING: DATOS EXTRAÍDOS DESDE FORM FIELDS ===')
    console.log('📋 Proveedor:', extractedData.proveedor_nombre)
    console.log('🆔 CIF:', extractedData.proveedor_cif)
    console.log('📄 Número factura:', extractedData.numero_factura)
    console.log('📅 Fecha:', extractedData.fecha_factura)
    console.log('💰 Total:', extractedData.total_factura)
    console.log('💵 Base:', extractedData.base_imponible)
    console.log('🏛️ IVA:', extractedData.cuota_iva)
    console.log('📊 Confianza global:', extractedData.confianza_global)
    console.log('🗺️ Coordenadas:', Object.keys(extractedData.coordenadas_campos))
    
    // Redondear importes
    extractedData.total_factura = Math.round(extractedData.total_factura * 100) / 100
    extractedData.base_imponible = Math.round(extractedData.base_imponible * 100) / 100
    extractedData.cuota_iva = Math.round(extractedData.cuota_iva * 100) / 100
    
    console.log('✅ Form Parser extracción completada:', {
      proveedor: extractedData.proveedor_nombre.substring(0, 30) + '...',
      cif: extractedData.proveedor_cif,
      factura: extractedData.numero_factura,
      total: extractedData.total_factura + '€',
      coordenadas: Object.keys(extractedData.coordenadas_campos).length,
      confianza: Math.round(extractedData.confianza_global * 100) + '%'
    })
    
    return extractedData
    
  } catch (error) {
    console.error('❌ Error en Form Parser:', error)
    console.log('🔄 Usando extracción manual completa como fallback...')
    const datosFallback = extractDataFromTextFallback((document as any)?.text || '')
    datosFallback.coordenadas_campos = {}
    datosFallback.campos_con_baja_confianza.push('error_form_parser')
    return datosFallback
  }
}

// 🌍 FUNCIÓN UNIVERSAL PARA CUALQUIER TIPO DE FACTURA - CON COORDENADAS Y CONFIANZA
function extractDataFromGoogleAI(googleAIResponse: any) {
  console.log('🌍 Iniciando extracción desde Google AI OCR...')
  
  try {
    const document = googleAIResponse.document
    if (!document || !document.text) {
      throw new Error('No se encontró texto en la respuesta de Google AI')
    }

    console.log('📄 Documento encontrado en respuesta')
    console.log('📝 Texto presente:', !!document.text)
    console.log('📝 Longitud texto:', document.text?.length || 0)
    
    // ✅ NUEVO: Extraer coordenadas del OCR puro para visualización avanzada
    // Estas coordenadas se usarán en el botón "AVANZADO" para mostrar overlays en el PDF
    let coordenadasCampos = {}
    
    if (document.pages && document.pages.length > 0) {
      console.log('🔍 Buscando coordenadas en páginas del OCR para visualización...')
      
      // Utilidad: reconstruir texto desde textAnchor
      const getTextFromAnchor = (fullText: string, textAnchor: any): string => {
        try {
          if (!textAnchor || !textAnchor.textSegments) return ''
          let combined = ''
          for (const seg of textAnchor.textSegments) {
            const start = typeof seg.startIndex !== 'undefined' ? Number(seg.startIndex) : 0
            const end = typeof seg.endIndex !== 'undefined' ? Number(seg.endIndex) : 0
            if (Number.isFinite(start) && Number.isFinite(end) && end > start && end <= fullText.length) {
              combined += fullText.substring(start, end)
            }
          }
          return combined.trim()
        } catch (e) {
          return ''
        }
      }

      document.pages.forEach((page: any, pageIndex: number) => {
        console.log(`📄 Procesando página ${pageIndex + 1} para coordenadas...`)
        
        // Preferir layout de elementos estructurados: blocks, paragraphs, lines, tokens
        const containers = [
          { key: 'block', items: page.blocks || [], conf: 0.7 },
          { key: 'paragraph', items: page.paragraphs || [], conf: 0.75 },
          { key: 'line', items: page.lines || [], conf: 0.85 },
          { key: 'token', items: page.tokens || [], conf: 0.9 }
        ]

        containers.forEach(container => {
          if (container.items && container.items.length > 0) {
            console.log(`  📍 ${container.items.length} ${container.key}s con layout`)
            container.items.forEach((item: any, idx: number) => {
              const itemText = getTextFromAnchor(document.text, item.layout?.textAnchor)
              const coords = extractCoordinates(item, container.conf, itemText)
              if (coords) {
                const key = `pagina_${pageIndex + 1}_${container.key}_${idx + 1}`
                coordenadasCampos[key] = {
                  ...coords,
                  texto: itemText,
                  pagina: pageIndex + 1,
                  tipo: container.key
                }
              }
            })
          }
        })
        
        // Buscar coordenadas en boundingPoly de la página (formato alternativo)
        if (page.boundingPoly && page.boundingPoly.vertices) {
          console.log(`  📍 Encontradas coordenadas de página ${pageIndex + 1}`)
          const pageCoords = extractCoordinates(page, 0.9, `Página ${pageIndex + 1}`)
          if (pageCoords) {
            coordenadasCampos[`pagina_${pageIndex + 1}_completa`] = {
              ...pageCoords,
              texto: `Página ${pageIndex + 1}`,
              pagina: pageIndex + 1,
              tipo: 'pagina_completa'
            }
          }
        }
      })
      
      console.log(`🎯 Total de coordenadas extraídas: ${Object.keys(coordenadasCampos).length}`)
    } else {
      console.log('⚠️ No se encontraron páginas con coordenadas en la respuesta OCR')
    }
    
    // ✅ Extraer datos del texto usando fallback manual
    console.log('🔄 Usando extracción manual del texto OCR...')
    const datosExtraidos = extractDataFromTextFallback(document.text)
    
    // ✅ INTEGRAR COORDENADAS REALES para visualización avanzada
    // Estas coordenadas se usarán en el botón "AVANZADO" para mostrar overlays en el PDF
    datosExtraidos.coordenadas_campos = coordenadasCampos
    
    // ✅ Marcar campos con baja confianza basado en coordenadas
    if (Object.keys(coordenadasCampos).length === 0) {
      datosExtraidos.campos_con_baja_confianza = ['coordenadas_no_disponibles']
      console.log('⚠️ No se pudieron extraer coordenadas para visualización avanzada')
    } else {
      console.log('✅ Coordenadas disponibles para visualización avanzada en botón')
      console.log('🎯 Las coordenadas se pueden usar para:')
      console.log('   - Mostrar overlays en el PDF original')
      console.log('   - Resaltar campos extraídos')
      console.log('   - Visualización interactiva de datos')
      console.log('   - Análisis de posicionamiento del texto')
    }
    
    return datosExtraidos
    
  } catch (error) {
    console.error('❌ Error en extracción desde Google AI:', error)
    
    // FALLBACK: Usar extracción manual si falla Google AI
    console.log('🔄 Usando extracción manual como fallback...')
    const datosFallback = extractDataFromTextFallback(googleAIResponse.document?.text || '')
    datosFallback.coordenadas_campos = {}
    datosFallback.campos_con_baja_confianza.push('error_coordenadas')
    return datosFallback
  }
}

// 🌍 FUNCIÓN DE FALLBACK (extracción manual original)
function extractDataFromTextFallback(text: string) {
  console.log('🌍 Iniciando extracción MANUAL de fallback...')
  console.log('📄 Longitud del texto:', text.length)
  
  // Limpiar y preparar texto
  const cleanText = text.replace(/\s+/g, ' ').trim()
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  console.log('📋 Líneas procesadas:', lines.length)
  
  // ✅ PATRONES UNIVERSALES MEJORADOS - Optimizados para facturas españolas
  // Incluyen formatos específicos como "Nº FACTURA\n905", "FECHA\n29/05/2025", etc.
  const patterns: {
    cif: RegExp[];
    numeroFactura: RegExp[];
    fecha: RegExp[];
    totalBruto: RegExp[];
    baseImponible: RegExp[];
    cuotaIva: RegExp[];
    tipoIva: RegExp[];
  } = {
    // ✅ PATRONES MEJORADOS PARA CIF - FORMATO ESPAÑOL
    cif: [
      // Formato español: "A-11024361" (con guión)
      /\b([A-Z]\-\d{8}\d{1,2})\b/gi,
      // Formato español: "B56390065" (sin guión)
      /\b([A-Z]\d{8}[A-Z0-9]?)\b/gi,
      // Formato español: "CIF: B56390065"
      /(?:CIF|C\.I\.F\.)\s*[:\s]*([A-Z][\-\d]{8,10})/gi,
      // Formato genérico: cualquier CIF válido
      /\b([A-Z]\d{8}[A-Z0-9]?)\b|\b([A-Z][\s\-]?\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\s\-]?[A-Z0-9])\b|\b(\d{8}[A-Z])\b/gi
    ],
    
    // ✅ PATRONES MEJORADOS PARA NÚMERO DE FACTURA - FORMATO ESPAÑOL
    numeroFactura: [
      // Formato español: "Nº FACTURA\n905" (con salto de línea)
      /(?:Nº?\s*FACTURA|N[ÚU]MERO?\s*FACTURA)\s*\n?(\d+)/gi,
      // Formato español: "FACTURA\n905" (con salto de línea)
      /(?:FACTURA|factura|Factura)\s*\n?(\d+)/gi,
      // Formato español: "Nº\n905" (con salto de línea)
      /(?:Nº|NUMERO?|num|NUM)\s*\n?(\d+)/gi,
      // Formato español: "F.N: 905"
      /(?:f\.?n\.?|F\.?N\.?)\s*[:\s]*(\d+)/gi,
      // Formato genérico: "FACTURA: 905"
      /(?:FACTURA|factura|Factura)\s*[:\s#\-]*([A-Z0-9\-\/\.\s]{1,20})/gi,
      // Formato genérico: "invoice: 905"
      /(?:invoice|Invoice|INVOICE)\s*[:\s#\-]*([A-Z0-9\-\/\.\s]{1,20})/gi
    ],
    
    // ✅ PATRONES MEJORADOS PARA FECHA - FORMATO ESPAÑOL
    fecha: [
      // Formato español: "FECHA\n29/05/2025" (con salto de línea)
      /(?:FECHA|fecha|Date|date)\s*\n?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
      // Formato español: "29/05/2025" (sin etiqueta)
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      // Formato español: "29-05-2025"
      /(\d{1,2}\-\d{1,2}\-\d{4})/g,
      // Formato español: "29.05.2025"
      /(\d{1,2}\.\d{1,2}\.\d{4})/g,
      // Formato YYYY/MM/DD
      /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,  // YYYY/MM/DD, YYYY-MM-DD
      // Formato texto: "29 de mayo de 2025"
      /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/gi        // 12 de enero de 2024
    ],
    
    // TOTAL - Máxima variedad de términos
    totalBruto: [
      /(?:TOTAL|total|Total)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:L[íi]quido|LIQUIDO|liquido)\s*(?:\(EUR\))?\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:IMPORTE\s*TOTAL|importe\s*total)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:TOTAL\s*FACTURA|total\s*factura)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:SUMA\s*TOTAL|suma\s*total)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi
    ],
    
    // ✅ BASE IMPONIBLE - PATRONES MEJORADOS Y MÁS ESPECÍFICOS
    baseImponible: [
      /(?:BASE\s*IMPONIBLE|base\s*imponible)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:SUBTOTAL|subtotal|Subtotal)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:BASE|base|Base)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:IMPORTE\s*NETO|importe\s*neto)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:NETO|neto|Neto)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      // ✅ NUEVOS PATRONES MÁS ESPECÍFICOS
      /(?:BASE\s*IMPONIBLE|base\s*imponible)\s*(\d{1,8}[,\.]\d{1,2})/gi,
      /(\d{1,8}[,\.]\d{1,2})\s*€?\s*(?:BASE|base|Base)/gi,
      /(?:SUBTOTAL|subtotal)\s*(\d{1,8}[,\.]\d{1,2})/gi,
      /(?:BASE\s*IMPONIBLE|base\s*imponible)\s*(\d{1,8})/gi,
      /(\d{1,8})\s*(?:BASE|base|Base)/gi
    ],
    
    // ✅ CUOTA IVA - PATRONES MEJORADOS Y MÁS ESPECÍFICOS
    cuotaIva: [
      /(?:IVA|iva)\s*\d{1,2}%?\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:CUOTA\s*IVA|cuota\s*iva)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      /(?:I\.V\.A\.|i\.v\.a\.)\s*[:\s]*(\d{1,8}[,\.]\d{1,2})\s*€?/gi,
      // ✅ NUEVOS PATRONES MÁS ESPECÍFICOS
      /(?:IVA|iva)\s*(\d{1,8}[,\.]\d{1,2})/gi,
      /(\d{1,8}[,\.]\d{1,2})\s*€?\s*(?:IVA|iva)/gi,
      /(?:CUOTA\s*IVA|cuota\s*iva)\s*(\d{1,8}[,\.]\d{1,2})/gi,
      /(?:IVA|iva)\s*(\d{1,8})/gi,
      /(\d{1,8})\s*(?:IVA|iva)/gi
    ],
    
    // Tipo de IVA - Todos los formatos
    tipoIva: [
      /(?:IVA|iva|I\.V\.A\.)\s*(\d{1,2})[%\s]/gi,
      /(\d{1,2})\s*%\s*(?:IVA|iva)/gi,
      /(?:al|AL)\s*(\d{1,2})\s*%/gi
    ]
  }
  
  // FUNCIÓN UNIVERSAL PARA EXTRAER CON MÚLTIPLES PATRONES
  function extractWithPatterns(patterns: RegExp[], text: string): string[] {
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)]
      results.push(...matches.map(m => m[1]?.trim()).filter(Boolean))
    }
    return results
  }
  
  // FUNCIÓN UNIVERSAL PARA EXTRAER CON UN PATRÓN
  function extractWithPattern(pattern: RegExp, text: string): string[] {
    return [...text.matchAll(pattern)].map(m => m[1]?.trim()).filter(Boolean)
  }
  
  // EXTRAER TODOS LOS MATCHES CON MÁXIMA FLEXIBILIDAD
  console.log('🔍 Aplicando patrones universales...')
  
  const matches = {
    cifs: extractWithPatterns(patterns.cif, text).map(cif => cif.replace(/[\s\-\.]/g, '')),
    numeroFactura: extractWithPatterns(patterns.numeroFactura, text),
    fechas: patterns.fecha.flatMap(pattern => extractWithPattern(pattern, text)),
    totalBruto: extractWithPatterns(patterns.totalBruto, text),
    baseImponible: extractWithPatterns(patterns.baseImponible, text),
    cuotaIva: extractWithPatterns(patterns.cuotaIva, text),
    tipoIva: patterns.tipoIva.flatMap(pattern => extractWithPattern(pattern, text))
      .map(t => parseInt(t)).filter(n => !isNaN(n) && n >= 0 && n <= 30)
  }
  
  // ✅ LOGGING DETALLADO PARA DEBUG
  console.log('🔍 === EXTRACCIÓN DE TEXTO OCR ===')
  console.log('📄 Texto completo (primeros 1000 chars):', text.substring(0, 1000))
  console.log('📊 Matches universales encontrados:', {
    cifs: matches.cifs.length,
    facturas: matches.numeroFactura.length,
    fechas: matches.fechas.length,
    totales: matches.totalBruto.length,
    bases: matches.baseImponible.length,
    iva: matches.cuotaIva.length,
    tipoIva: matches.tipoIva.length
  })
  
  // ✅ LOGGING ESPECÍFICO PARA IMPORTES
  if (matches.baseImponible.length > 0) {
    console.log('✅ Base imponible encontrada:', matches.baseImponible)
  } else {
    console.log('❌ NO se encontró base imponible')
  }
  
  if (matches.cuotaIva.length > 0) {
    console.log('✅ Cuota IVA encontrada:', matches.cuotaIva)
  } else {
    console.log('❌ NO se encontró cuota IVA')
  }
  
  if (matches.totalBruto.length > 0) {
    console.log('✅ Total encontrado:', matches.totalBruto)
  } else {
    console.log('❌ NO se encontró total')
  }
  
  console.log('🔍 === FIN EXTRACCIÓN ===')
  
  // FUNCIÓN UNIVERSAL PARA PARSING DE IMPORTES
  function parseImporte(importeStr: string): number {
    if (!importeStr) return 0
    
    let cleanStr = importeStr.trim().replace(/[€$£¥\s]/g, '')
    
    // ✅ DETECCIÓN AUTOMÁTICA MEJORADA PARA FORMATOS ESPAÑOLES
    if (cleanStr.includes('.') && cleanStr.includes(',')) {
      // Formato europeo: 1.234,56 o 1,234.56
      const lastComma = cleanStr.lastIndexOf(',')
      const lastDot = cleanStr.lastIndexOf('.')
      
      if (lastComma > lastDot) {
        // Formato español: 1.234,56 (punto para miles, coma para decimales)
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
        console.log('✅ Formato español detectado:', importeStr, '→', cleanStr)
      } else {
        // Formato inglés: 1,234.56 (coma para miles, punto para decimales)
        cleanStr = cleanStr.replace(/,/g, '')
        console.log('✅ Formato inglés detectado:', importeStr, '→', cleanStr)
      }
    } else if (cleanStr.includes(',')) {
      // Solo coma - puede ser decimal o separador de miles
      const parts = cleanStr.split(',')
      if (parts.length === 2 && parts[1].length <= 2) {
        // Decimal: 123,45
        cleanStr = cleanStr.replace(',', '.')
        console.log('✅ Decimal detectado:', importeStr, '→', cleanStr)
      } else {
        // Miles: 1,234
        cleanStr = cleanStr.replace(/,/g, '')
        console.log('✅ Miles detectado:', importeStr, '→', cleanStr)
      }
    } else if (cleanStr.includes('.')) {
      // Solo punto - puede ser decimal o separador de miles
      const parts = cleanStr.split('.')
      if (parts.length === 2 && parts[1].length <= 2) {
        // Decimal: 123.45
        console.log('✅ Decimal con punto detectado:', importeStr, '→', cleanStr)
      } else {
        // Miles: 1.234
        cleanStr = cleanStr.replace(/\./g, '')
        console.log('✅ Miles con punto detectado:', importeStr, '→', cleanStr)
      }
    }
    
    const result = parseFloat(cleanStr)
    const finalResult = isNaN(result) ? 0 : Math.round(result * 100) / 100
    
    console.log(`✅ Importe parseado: "${importeStr}" → ${cleanStr} → ${finalResult}`)
    return finalResult
  }
  
  // FUNCIÓN UNIVERSAL PARA FECHAS
  function convertToISODate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString()
    
    try {
      const cleanDate = dateStr.trim()
      
      // Formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
      if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(cleanDate)) {
        const [day, month, year] = cleanDate.split(/[\/\-\.]/)
        const fullYear = year.length === 2 ? (parseInt(year) < 50 ? '20' + year : '19' + year) : year
        return new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day)).toISOString()
      }
      
      // Formato YYYY/MM/DD o YYYY-MM-DD
      if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(cleanDate)) {
        const [year, month, day] = cleanDate.split(/[\/\-\.]/)
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString()
      }
      
      // Formato texto: "12 de enero de 2024"
      if (cleanDate.includes('de')) {
        const meses = {
          'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
          'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        }
        const match = cleanDate.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
        if (match) {
          const [_, day, mesNombre, year] = match
          const month = meses[mesNombre.toLowerCase()]
          if (month !== undefined) {
            return new Date(parseInt(year), month, parseInt(day)).toISOString()
          }
        }
      }
      
      throw new Error('Formato no reconocido')
    } catch (error) {
      console.log('⚠️ Error parseando fecha:', dateStr)
      return new Date().toISOString()
    }
  }
  
  // EXTRACCIÓN UNIVERSAL DEL PROVEEDOR
  console.log('🏢 Extrayendo proveedor universalmente...')
  
  let proveedorNombre = 'Proveedor no identificado'
  
  // ESTRATEGIA 1: Buscar cerca del CIF (universal)
  if (matches.cifs.length > 0) {
    const cif = matches.cifs[0]
    console.log('🔍 Usando CIF como referencia:', cif)
    
    // Buscar líneas que contengan el CIF
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(cif) || lines[i].includes(cif.substring(0, 8))) {
        console.log('📍 CIF encontrado en línea', i + ':', lines[i])
        
        // Buscar nombre en líneas cercanas (±4 líneas)
        for (let j = Math.max(0, i-4); j <= Math.min(lines.length-1, i+4); j++) {
          const candidateLine = lines[j].trim()
          
          if (candidateLine.includes(cif)) continue // Saltar línea del CIF
          if (candidateLine.length < 5 || candidateLine.length > 120) continue
          if (/^\d+$/.test(candidateLine)) continue // Solo números
          if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(candidateLine)) continue // Fechas
          if (/^(FACTURA|INVOICE|factura|invoice|fecha|date|cliente|customer)/i.test(candidateLine)) continue
          
          // Verificar características de nombre comercial
          const letterCount = (candidateLine.match(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g) || []).length
          const hasGoodLetterRatio = letterCount >= 4 && letterCount >= candidateLine.length * 0.3
          
          if (hasGoodLetterRatio) {
            proveedorNombre = candidateLine
            console.log('✅ Proveedor por proximidad al CIF:', proveedorNombre)
            break
          }
        }
        
        if (proveedorNombre !== 'Proveedor no identificado') break
      }
    }
  }
  
  // ✅ ESTRATEGIA 1 MEJORADA: Buscar después de "INSCRITA EN EL REGISTRO MERCANTIL"
  if (proveedorNombre === 'Proveedor no identificado') {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('INSCRITA EN EL REGISTRO MERCANTIL')) {
        console.log('🔍 Encontrado registro mercantil, buscando proveedor...')
        
        // Buscar en las siguientes 3 líneas
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const candidateLine = lines[j].trim()
          
          if (candidateLine.length > 5 && candidateLine.length < 120 &&
              !candidateLine.includes('CIF') && !candidateLine.includes('TELÉFONO') &&
              !candidateLine.includes('C/') && !candidateLine.includes('POLÍGONO') &&
              !candidateLine.includes('INDUSTRIAL') && !candidateLine.includes('CTRA') &&
              !candidateLine.includes('KM') && !candidateLine.includes('CÁDIZ') &&
              !candidateLine.includes('SANLÚCAR') && !candidateLine.includes('BARRAMEDA')) {
            
            proveedorNombre = candidateLine
            console.log('✅ Proveedor encontrado por registro mercantil:', proveedorNombre)
            break
          }
        }
        
        if (proveedorNombre !== 'Proveedor no identificado') break
      }
    }
  }
  
  // ESTRATEGIA 2: Buscar por indicadores empresariales universales
  if (proveedorNombre === 'Proveedor no identificado') {
    const indicadoresEmpresa = [
      'S.L.', 'S.A.', 'S.L.U.', 'S.C.', 'C.B.', 'SL', 'SA', 'SLU',
      'Ltd', 'Inc', 'Corp', 'GmbH', 'LLC', 'LTD',
      'Sociedad', 'Limitada', 'Anónima', 'Company', 'Compañía'
    ]
    
    for (let i = 0; i < Math.min(25, lines.length); i++) {
      const line = lines[i].trim()
      
      if (line.length < 5 || line.length > 120) continue
      if (/^(FACTURA|INVOICE|factura|fecha|total|cliente|€)/i.test(line)) continue
      
      // Buscar indicadores empresariales
      for (const indicador of indicadoresEmpresa) {
        if (line.includes(indicador)) {
          proveedorNombre = line
          console.log('✅ Proveedor por indicador empresarial:', indicador)
          break
        }
      }
      
      if (proveedorNombre !== 'Proveedor no identificado') break
    }
  }
  
  // ESTRATEGIA 3: Nombre más probable en primeras líneas
  if (proveedorNombre === 'Proveedor no identificado') {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i].trim()
      
      if (line.length < 8 || line.length > 100) continue
      if (/^(FACTURA|INVOICE|factura|fecha|total|base|€)/i.test(line)) continue
      if (/^\d/.test(line)) continue // Empieza por número
      if (/^(C\/|CALLE|AV\.|AVENIDA|PLAZA)/i.test(line)) continue // Direcciones
      
      const letterCount = (line.match(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g) || []).length
      const wordCount = line.split(/\s+/).length
      
      if (letterCount >= 8 && wordCount >= 2 && wordCount <= 8) {
        proveedorNombre = line
        console.log('✅ Proveedor probable en primeras líneas:', proveedorNombre)
        break
      }
    }
  }
  
  console.log('🏢 Proveedor final:', proveedorNombre)
  
  // SELECCIÓN INTELIGENTE DE VALORES
  console.log('🎯 Seleccionando mejores valores...')
  
  // Número de factura - el más corto y con más números
  let numeroFactura = 'SIN_NUMERO'
  if (matches.numeroFactura.length > 0) {
    const candidatos = matches.numeroFactura
      .map(f => f.replace(/\s+/g, ' ').trim())
      .filter(f => f.length >= 1 && f.length <= 25)
      .filter(f => /\d/.test(f)) // Debe tener al menos un número
    
    if (candidatos.length > 0) {
      // Preferir el más corto (más probable que sea solo el número)
      numeroFactura = candidatos.sort((a, b) => a.length - b.length)[0]
    }
  }
  
  // Fecha - la primera válida en rango razonable
  let fechaFactura = new Date().toISOString()
  for (const fecha of matches.fechas) {
    try {
      const fechaISO = convertToISODate(fecha)
      const fechaObj = new Date(fechaISO)
      const ahora = new Date()
      const hace10Anos = new Date(ahora.getFullYear() - 10, 0, 1)
      const en2Anos = new Date(ahora.getFullYear() + 2, 11, 31)
      
      if (fechaObj >= hace10Anos && fechaObj <= en2Anos) {
        fechaFactura = fechaISO
        console.log('📅 Fecha válida seleccionada:', fecha)
        break
      }
    } catch (error) {
      continue
    }
  }
  
  // CIF - el primero que parezca válido
  const proveedorCif = matches.cifs.find(cif => cif.length >= 9) || matches.cifs[0] || null
  
  // IMPORTES - Seleccionar los más coherentes
  const totalCandidatos = matches.totalBruto.map(parseImporte).filter(n => n > 0).sort((a, b) => b - a)
  const baseCandidatos = matches.baseImponible.map(parseImporte).filter(n => n > 0).sort((a, b) => b - a)
  const ivaCandidatos = matches.cuotaIva.map(parseImporte).filter(n => n > 0).sort((a, b) => b - a)
  
  let totalFactura = totalCandidatos[0] || 0
  let baseImponible = baseCandidatos[0] || 0
  let cuotaIva = ivaCandidatos[0] || 0
  let tipoIva = matches.tipoIva.find(t => [4, 10, 21].includes(t)) || matches.tipoIva[0] || 21
  
  // VALIDACIÓN FISCAL UNIVERSAL
  if (totalFactura > 0 && baseImponible === 0 && tipoIva > 0) {
    // Calcular base imponible desde total e IVA
    baseImponible = totalFactura / (1 + tipoIva / 100)
    cuotaIva = totalFactura - baseImponible
    console.log('✅ Base imponible calculada desde total e IVA:', baseImponible.toFixed(2))
    console.log('✅ Cuota IVA calculada desde total e IVA:', cuotaIva.toFixed(2))
  } else if (baseImponible > 0 && cuotaIva === 0 && tipoIva > 0) {
    // Calcular cuota IVA desde base e IVA
    cuotaIva = baseImponible * (tipoIva / 100)
    totalFactura = baseImponible + cuotaIva
    console.log('✅ Cuota IVA calculada desde base e IVA:', cuotaIva.toFixed(2))
    console.log('✅ Total calculado desde base e IVA:', totalFactura.toFixed(2))
  } else if (baseImponible > 0 && cuotaIva > 0 && totalFactura === 0) {
    // Calcular total desde base e IVA
    totalFactura = baseImponible + cuotaIva
    console.log('✅ Total calculado desde base e IVA:', totalFactura.toFixed(2))
  } else if (baseImponible > 0 && totalFactura > 0 && cuotaIva === 0) {
    // Calcular cuota IVA desde base y total
    cuotaIva = totalFactura - baseImponible
    console.log('✅ Cuota IVA calculada desde base y total:', cuotaIva.toFixed(2))
  }
  
  // ✅ VALIDACIÓN ADICIONAL: Verificar coherencia matemática
  if (baseImponible > 0 && cuotaIva > 0 && totalFactura > 0) {
    const diferencia = Math.abs(totalFactura - (baseImponible + cuotaIva))
    if (diferencia > 0.01) {
      console.log('⚠️ ADVERTENCIA: Los importes no son coherentes matemáticamente')
      console.log(`  - Base: ${baseImponible.toFixed(2)}`)
      console.log(`  - IVA: ${cuotaIva.toFixed(2)}`)
      console.log(`  - Total: ${totalFactura.toFixed(2)}`)
      console.log(`  - Diferencia: ${diferencia.toFixed(2)}`)
      
      // Intentar corregir el total
      const totalCalculado = baseImponible + cuotaIva
      if (Math.abs(totalFactura - totalCalculado) > 0.01) {
        console.log('✅ Corrigiendo total para que sea coherente')
        totalFactura = totalCalculado
      }
    } else {
      console.log('✅ Importes matemáticamente coherentes')
    }
  }
  
  // Redondear
  totalFactura = Math.round(totalFactura * 100) / 100
  baseImponible = Math.round(baseImponible * 100) / 100
  cuotaIva = Math.round(cuotaIva * 100) / 100
  
  // CÁLCULO DE CONFIANZA UNIVERSAL
  let confianza = 0.3 // Base conservadora
  
  if (proveedorNombre !== 'Proveedor no identificado') confianza += 0.2
  if (proveedorCif && proveedorCif.length >= 9) confianza += 0.15
  if (numeroFactura !== 'SIN_NUMERO' && numeroFactura.length >= 2) confianza += 0.1
  if (totalFactura > 0) confianza += 0.15
  if (baseImponible > 0) confianza += 0.1
  if (Math.abs(totalFactura - (baseImponible + cuotaIva)) <= 0.1) confianza += 0.1
  
  confianza = Math.min(confianza, 1)
  
  const resultado = {
    proveedor_nombre: proveedorNombre,
    proveedor_cif: proveedorCif,
    numero_factura: numeroFactura,
    fecha_factura: fechaFactura,
    total_factura: totalFactura,
    base_imponible: baseImponible,
    cuota_iva: cuotaIva,
    tipo_iva: tipoIva,
    confianza_global: Math.round(confianza * 100) / 100,
    confianza_proveedor: Math.round(confianza * 0.8 * 100) / 100,
    confianza_datos_fiscales: Math.round(confianza * 0.9 * 100) / 100,
    confianza_importes: Math.round(confianza * 0.85 * 100) / 100,
    coordenadas_campos: {},
    campos_con_baja_confianza: [] as string[]
  }
  
  console.log('✅ EXTRACCIÓN MANUAL COMPLETADA:', {
    proveedor: resultado.proveedor_nombre.substring(0, 30) + '...',
    cif: resultado.proveedor_cif,
    factura: resultado.numero_factura,
    total: resultado.total_factura + '€',
    confianza: Math.round(resultado.confianza_global * 100) + '%'
  })
  
  return resultado
}

// ===== EXTRACCIÓN DE PRODUCTOS DESDE FORM PARSER =====

// 🔧 FUNCIÓN AUXILIAR CORREGIDA: Extraer texto desde textAnchor
function getTextFromAnchor(fullText: string, textAnchor: any): string {
  if (!textAnchor || !fullText) {
    console.warn('⚠️ getTextFromAnchor: textAnchor o fullText no válidos')
    return ''
  }
  
  try {
    // ✅ VERIFICAR ESTRUCTURA COMPLETA DEL textAnchor
    console.log('🔍 textAnchor structure:', JSON.stringify(textAnchor, null, 2))
    
    // Si textAnchor tiene segmentos, extraer de ellos
    if (textAnchor.textSegments && Array.isArray(textAnchor.textSegments) && textAnchor.textSegments.length > 0) {
      const segments = textAnchor.textSegments
      let extractedText = ''
      
      console.log(`🔍 Procesando ${segments.length} segmentos de texto...`)
      
      segments.forEach((segment: any, index: number) => {
        if (segment && typeof segment === 'object') {
          // ✅ MANEJO MEJORADO DE ÍNDICES
          const startIndex = segment.startIndex
          const endIndex = segment.endIndex
          
          console.log(`  📍 Segmento ${index + 1}: startIndex=${startIndex}, endIndex=${endIndex}`)
          
          // Validar que los índices sean números válidos
          if (startIndex !== undefined && endIndex !== undefined) {
            const start = parseInt(String(startIndex))
            const end = parseInt(String(endIndex))
            
            if (!isNaN(start) && !isNaN(end) && 
                start >= 0 && end <= fullText.length && 
                start < end) {
              
              const segmentText = fullText.substring(start, end)
              extractedText += segmentText
              console.log(`    ✅ Texto extraído: "${segmentText}"`)
            } else {
              console.warn(`    ⚠️ Índices inválidos: start=${start}, end=${end}, textLength=${fullText.length}`)
            }
          } else {
            console.warn(`    ⚠️ Segmento sin índices válidos:`, segment)
          }
        }
      })
      
      const result = extractedText.trim()
      console.log(`✅ Texto final extraído: "${result}"`)
      return result
    }
    
    // ✅ VERIFICAR SI HAY CONTENIDO DIRECTO
    if (textAnchor.content && typeof textAnchor.content === 'string') {
      console.log(`✅ Contenido directo encontrado: "${textAnchor.content}"`)
      return textAnchor.content.trim()
    }
    
    // ✅ VERIFICAR SI HAY TEXTO DIRECTO
    if (textAnchor.text && typeof textAnchor.text === 'string') {
      console.log(`✅ Texto directo encontrado: "${textAnchor.text}"`)
      return textAnchor.text.trim()
    }
    
    console.warn('⚠️ No se pudo extraer texto del textAnchor - estructura no reconocida')
    return ''
    
  } catch (error) {
    console.error('❌ Error en getTextFromAnchor:', error)
    console.error('🔍 textAnchor problemático:', textAnchor)
    return ''
  }
}

// 💰 FUNCIÓN AUXILIAR: Parsear importes españoles
function parseSpanishAmount(amountStr: string): number | null {
  if (!amountStr) return null
  
  try {
    // Limpiar el string
    let cleanStr = amountStr.toString().trim()
    
    // Eliminar símbolos de moneda
    cleanStr = cleanStr.replace(/[€$£¥]/g, '')
    
    // Eliminar espacios
    cleanStr = cleanStr.replace(/\s/g, '')
    
    // Manejar formato español: 1.234,56
    if (cleanStr.includes(',') && cleanStr.includes('.')) {
      // Formato: 1.234,56 (punto para miles, coma para decimales)
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
    } else if (cleanStr.includes(',')) {
      // Solo coma: 1234,56
      cleanStr = cleanStr.replace(',', '.')
    }
    
    // Parsear a número
    const amount = parseFloat(cleanStr)
    
    // Validar que sea un número válido
    if (isNaN(amount) || amount < 0) {
      return null
    }
    
    return amount
  } catch (error) {
    console.warn('⚠️ Error parseando importe:', amountStr, error)
    return null
  }
}

// 🧹 FUNCIÓN AUXILIAR: Normalizar nombres de productos (CONSERVADORA)
function normalizeProductName(originalName: string): string {
  if (!originalName) return ''
  
  let normalized = originalName.toLowerCase().trim()
  
  // ✅ NORMALIZACIÓN CONSISTENTE
  // Reemplazar solo caracteres problemáticos para bases de datos
  normalized = normalized.replace(/[""'']/g, '"') // Normalizar comillas
  normalized = normalized.replace(/[–—]/g, '-')   // Normalizar guiones
  normalized = normalized.replace(/\s+/g, ' ')    // Normalizar espacios múltiples
  
  // ✅ ELIMINAR VARIACIONES MENORES QUE CAUSAN DUPLICADOS
  // Quitar letras sueltas al final que pueden variar entre facturas
  normalized = normalized.replace(/\s+[a-z]\s*$/g, '') // "grundy e" → "grundy"
  normalized = normalized.replace(/\s+es\s*$/g, '')     // "caja es" → "caja"
  normalized = normalized.replace(/\s+cc\s*$/g, '')     // "50 cc" → "50"
  
  // ✅ NORMALIZAR SÍMBOLOS COMUNES
  normalized = normalized.replace(/×/g, 'x')          // "24×33" → "24x33"
  normalized = normalized.replace(/\./g, '')          // "s.l." → "sl"
  
  console.log(`🧹 Normalización: "${originalName}" → "${normalized.trim()}"`)
  
  return normalized.trim()
}

// 🔢 FUNCIÓN AUXILIAR: Extraer cantidad desde texto
function extractQuantityFromText(text: string): number {
  if (!text) return 1
  
  // Buscar patrones de cantidad: "5 kg", "2,5 unidades", "1,25 L", etc.
  const quantityPatterns = [
    /(\d+[,\.]\d+)\s*(?:kg|kilogramos?|gramos?|g|unidades?|uds?|piezas?|litros?|l|ml)/i,
    /(\d+)\s*(?:kg|kilogramos?|gramos?|g|unidades?|uds?|piezas?|litros?|l|ml)/i,
    /^(\d+[,\.]\d+)/,  // Número al inicio
    /^(\d+)/           // Entero al inicio
  ]
  
  for (const pattern of quantityPatterns) {
    const match = text.match(pattern)
    if (match) {
      const quantity = parseFloat(match[1].replace(',', '.'))
      if (!isNaN(quantity) && quantity > 0) {
        console.log(`🔢 Cantidad extraída: ${quantity} desde "${text}"`)
        return quantity
      }
    }
  }
  
  return 1 // Cantidad por defecto
}

// 💰 FUNCIÓN AUXILIAR: Extraer precio desde texto
function extractPriceFromText(text: string): number | null {
  if (!text) return null
  
  // Buscar patrones de precio: "25,30€", "€15.50", "25,30 euros", etc.
  const pricePatterns = [
    /(\d+[,\.]\d{2})\s*€/,
    /€\s*(\d+[,\.]\d{2})/,
    /(\d+[,\.]\d{2})\s*euros?/i,
    /(\d+[,\.]\d{2})\s*eur/i,
    /(\d+[,\.]\d{2})$/,  // Número con decimales al final
    /(\d+)\s*€/,
    /€\s*(\d+)/
  ]
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern)
    if (match) {
      const price = parseFloat(match[1].replace(',', '.'))
      if (!isNaN(price) && price > 0) {
        console.log(`💰 Precio extraído: ${price}€ desde "${text}"`)
        return price
      }
    }
  }
  
  return null
}

// 🏷️ FUNCIÓN AUXILIAR: Extraer código desde texto
function extractCodeFromText(text: string): string | null {
  if (!text) return null
  
  // Buscar patrones de códigos: alfanuméricos al inicio o números con letras
  const codePatterns = [
    /^([A-Z0-9]{3,10})\s/,    // Código alfanumérico al inicio
    /^(\d{4,8})\s/,           // Número de código al inicio
    /([A-Z]{2,4}\d{2,6})/,    // Letras seguidas de números
    /(\d{3,6}[A-Z]{1,3})/     // Números seguidos de letras
  ]
  
  for (const pattern of codePatterns) {
    const match = text.match(pattern)
    if (match) {
      console.log(`🏷️ Código extraído: ${match[1]} desde "${text}"`)
      return match[1]
    }
  }
  
  return null
}

// 📏 FUNCIÓN AUXILIAR: Extraer unidad de medida desde texto
function extractUnitFromText(text: string): string | null {
  if (!text) return null
  
  // Buscar unidades de medida
  const unitPatterns = [
    /(kg|kilogramos?)/i,
    /(g|gramos?)/i,
    /(l|litros?)/i,
    /(ml|mililitros?)/i,
    /(uds?|unidades?)/i,
    /(piezas?|pzas?)/i,
    /(cajas?)/i,
    /(paquetes?)/i
  ]
  
  for (const pattern of unitPatterns) {
    const match = text.match(pattern)
    if (match) {
      console.log(`📏 Unidad extraída: ${match[1]} desde "${text}"`)
      return match[1].toLowerCase()
    }
  }
  
  return null
}

// 📝 FUNCIÓN AUXILIAR: Extraer productos desde texto completo
function extractProductsFromFullText(fullText: string): any[] {
  console.log('📝 === EXTRAYENDO PRODUCTOS DESDE TEXTO COMPLETO ===')
  
  const productos: any[] = []
  
  if (!fullText) {
    console.log('⚠️ No hay texto para analizar')
    return productos
  }
  
  // Dividir en líneas y buscar patrones de productos
  const lines = fullText.split('\n').filter(line => line.trim().length > 0)
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    
    // Buscar líneas que parezcan productos
    const isProductLine = (
      // Contiene palabras clave de productos cárnicos
      /carne|meat|ternera|cerdo|pollo|beef|pork|chicken/i.test(trimmedLine) ||
      // Contiene unidades de medida
      /\d+[,\.]?\d*\s*(kg|g|gramos?|kilogramos?|unidades?|uds?|piezas?)/i.test(trimmedLine) ||
      // Contiene precios
      /\d+[,\.]\d{2}\s*€|€\s*\d+[,\.]\d{2}/i.test(trimmedLine) ||
      // Línea larga con números y letras (descripción de producto)
      (trimmedLine.length > 15 && /\d/.test(trimmedLine) && /[a-záéíóúñ]{3,}/i.test(trimmedLine))
    )
    
    if (isProductLine && trimmedLine.length > 5) {
      const producto = {
        linea_original: trimmedLine,
        numero_linea: productos.length + 1,
        confianza_linea: 0.6, // Confianza media para extracción de texto
        descripcion_original: trimmedLine,
        cantidad: extractQuantityFromText(trimmedLine),
        precio_total_linea_sin_iva: extractPriceFromText(trimmedLine),
        precio_unitario_sin_iva: null as number | null,
        codigo_producto: extractCodeFromText(trimmedLine),
        unidad_medida: extractUnitFromText(trimmedLine),
        descripcion_normalizada: normalizeProductName(trimmedLine),
        tipo_iva: 21
      }
      
      // Calcular precio unitario si tenemos total y cantidad
      if (producto.precio_total_linea_sin_iva && producto.cantidad > 0) {
        producto.precio_unitario_sin_iva = producto.precio_total_linea_sin_iva / producto.cantidad
      }
      
      // Solo añadir si tiene información útil
      if (producto.descripcion_normalizada.length > 3) {
        productos.push(producto)
        console.log(`✅ Producto extraído desde texto:`, producto)
      }
    }
  })
  
  console.log(`📝 Productos extraídos desde texto completo: ${productos.length}`)
  return productos
}

// 🛒 FUNCIÓN PARA EXTRAER PRODUCTOS DESDE FORM PARSER (TABLAS)
function extractProductsFromFormParser(extractedResult: any) {
  console.log('🛒 === EXTRAYENDO PRODUCTOS DESDE FORM PARSER ===')
  
  const productos: any[] = []
  
  try {
    // ✅ CORRECCIÓN: Las tablas están en las páginas, no a nivel de documento
    if (extractedResult.document && extractedResult.document.pages && extractedResult.document.pages.length > 0) {
      extractedResult.document.pages.forEach((page: any, pageIndex: number) => {
        if (page.tables && page.tables.length > 0) {
          console.log(`📊 Encontradas ${page.tables.length} tablas en página ${pageIndex + 1}`)
          
          page.tables.forEach((table: any, tableIndex: number) => {
            console.log(`📋 Procesando tabla ${tableIndex + 1} de página ${pageIndex + 1}...`)
            
            // Procesar filas de la tabla
            if (table.headerRows && table.headerRows.length > 0) {
              const headers = table.headerRows[0].cells.map((cell: any) => 
                getTextFromAnchor(extractedResult.document.text || '', cell.layout.textAnchor)
              )
              console.log(`📋 Headers de tabla:`, headers)
              
              // Buscar columnas relevantes
              const cantidadIndex = headers.findIndex((h: string) => 
                /cantidad|uds?|unidades?|qty/i.test(h)
              )
              const descripcionIndex = headers.findIndex((h: string) => 
                /descripci[oó]n|concepto|art[ií]culo|producto|item/i.test(h)
              )
              const precioIndex = headers.findIndex((h: string) => 
                /precio|importe|total|euros?|€/i.test(h)
              )
              const codigoIndex = headers.findIndex((h: string) => 
                /c[oó]digo|ref|referencia|sku/i.test(h)
              )
              
              console.log(`🔍 Índices encontrados: cantidad=${cantidadIndex}, descripción=${descripcionIndex}, precio=${precioIndex}, código=${codigoIndex}`)
              
              // Procesar filas de datos
              if (table.bodyRows && table.bodyRows.length > 0) {
                table.bodyRows.forEach((row: any, rowIndex: number) => {
                  try {
                    const cells = row.cells.map((cell: any) => 
                      getTextFromAnchor(extractedResult.document.text || '', cell.layout.textAnchor)
                    )
                    
                    console.log(`📝 Fila ${rowIndex + 1}:`, cells)
                    
                    // Extraer datos de la fila
                    const descripcion = descripcionIndex >= 0 ? cells[descripcionIndex] : null
                    const cantidad = cantidadIndex >= 0 ? parseSpanishAmount(cells[cantidadIndex]) : 1
                    const precio = precioIndex >= 0 ? parseSpanishAmount(cells[precioIndex]) : null
                    const codigo = codigoIndex >= 0 ? cells[codigoIndex] : null
                    
                    // Validar que sea un producto válido
                    if (descripcion && descripcion.length > 2 && precio && precio > 0) {
                      const producto = {
                        linea_original: cells.join(' | '),
                        numero_linea: rowIndex + 1,
                        confianza_linea: 0.9, // Alta confianza para datos estructurados
                        descripcion_original: descripcion.trim(),
                        cantidad: cantidad || 1,
                        precio_total_linea_sin_iva: precio,
                        precio_unitario_sin_iva: precio / (cantidad || 1),
                        codigo_producto: codigo || null,
                        unidad_medida: null, // Se puede inferir del header si es necesario
                        descripcion_normalizada: normalizeProductName(descripcion.trim()),
                        tipo_iva: 21 // Por defecto
                      }
                      
                      productos.push(producto)
                      console.log(`✅ Producto extraído desde tabla:`, producto)
                    } else {
                      console.log(`❌ Fila descartada - datos insuficientes:`, { descripcion, precio })
                    }
                  } catch (rowError) {
                    console.warn(`⚠️ Error procesando fila ${rowIndex + 1}:`, rowError)
                  }
                })
              }
            }
          })
        }
      })
    } else {
      console.log(`⚠️ No se encontraron tablas en las páginas del documento`)
    }
    
    // Si no hay tablas, intentar extraer desde formFields y texto
    if (productos.length === 0) {
      console.log('🔄 No se encontraron tablas, buscando productos en formFields y texto...')
      
      // MÉTODO 1: Buscar en formFields que puedan ser productos
      if (extractedResult.document && extractedResult.document.pages && extractedResult.document.pages.length > 0) {
        extractedResult.document.pages.forEach((page: any, pageIndex: number) => {
          if (page.formFields && page.formFields.length > 0) {
            page.formFields.forEach((field: any) => {
              let fieldName = ''
              let fieldValue = ''
              
              // Extraer fieldName y fieldValue usando función corregida
              if (field.fieldName && field.fieldName.textAnchor) {
                fieldName = getTextFromAnchor(extractedResult.document.text || '', field.fieldName.textAnchor)
              } else if (field.fieldName && field.fieldName.content) {
                fieldName = field.fieldName.content
              }
              
              if (field.fieldValue && field.fieldValue.textAnchor) {
                fieldValue = getTextFromAnchor(extractedResult.document.text || '', field.fieldValue.textAnchor)
              } else if (field.fieldValue && field.fieldValue.content) {
                fieldValue = field.fieldValue.content
              }
              
              console.log(`🔍 Evaluando campo para productos: "${fieldName.trim()}" = "${fieldValue.trim()}"`)
              
              // Buscar campos que parezcan productos (patrones ampliados)
              if (fieldName && fieldValue && fieldValue.trim().length > 3) {
                const isProductField = (
                  /producto|art[ií]culo|concepto|descripci[oó]n|item|mercancia|mercancía/i.test(fieldName) ||
                  /carne|meat|kg|unidad|gramos|litros|pieza/i.test(fieldValue) ||
                  (fieldValue.length > 10 && /\d/.test(fieldValue) && /[a-záéíóúñ]/i.test(fieldValue))
                )
                
                if (isProductField) {
                const producto = {
                  linea_original: `${fieldName}: ${fieldValue}`,
                  numero_linea: productos.length + 1,
                  confianza_linea: 0.7,
                  descripcion_original: fieldValue.trim(),
                    cantidad: extractQuantityFromText(fieldValue),
                    precio_total_linea_sin_iva: extractPriceFromText(fieldValue),
                    precio_unitario_sin_iva: null as number | null,
                    codigo_producto: extractCodeFromText(fieldValue),
                    unidad_medida: extractUnitFromText(fieldValue),
                  descripcion_normalizada: normalizeProductName(fieldValue.trim()),
                  tipo_iva: 21
                }
                  
                  // Calcular precio unitario si tenemos total y cantidad
                  if (producto.precio_total_linea_sin_iva && producto.cantidad > 0) {
                    producto.precio_unitario_sin_iva = producto.precio_total_linea_sin_iva / producto.cantidad
                }
                
                productos.push(producto)
                console.log(`✅ Producto extraído desde formField:`, producto)
                }
              }
            })
          }
        })
      }
      
      // MÉTODO 2: Si aún no hay productos, analizar texto completo para patrones de productos
      if (productos.length === 0) {
        console.log('🔍 Analizando texto completo para encontrar productos...')
        const productosTexto = extractProductsFromFullText(extractedResult.document.text)
        productos.push(...productosTexto)
      }
    }
    
    console.log(`🎉 Extracción desde Form Parser completada. ${productos.length} productos encontrados`)
    return productos
    
  } catch (error) {
    console.error('❌ Error extrayendo productos desde Form Parser:', error)
    return []
  }
}

// 🔍 FUNCIÓN AUXILIAR PARA BUSCAR PROVEEDOR POR NOMBRE
async function searchProveedorByName(nombreProveedor: string, restauranteId: string, supabaseClient: any): Promise<string | null> {
  console.log('🔍 === BUSCANDO PROVEEDOR POR NOMBRE ===')
  console.log(`📝 Nombre a buscar: "${nombreProveedor}"`)
  
  try {
    // Normalizar nombre para búsqueda más flexible
    const nombreNormalizado = nombreProveedor.toLowerCase()
      .replace(/s\.?l\.?/gi, 'sl')
      .replace(/s\.?a\.?/gi, 'sa')
      .replace(/[.,\-\s]+/g, ' ')
      .trim()
    
    console.log(`📝 Nombre normalizado: "${nombreNormalizado}"`)
    
    // 1. Buscar proveedor existente por nombre (búsqueda flexible)
    const { data: existingProveedores, error: searchError } = await supabaseClient
      .from('proveedores')
      .select('id, nombre, numero_facturas')
      .eq('restaurante_id', restauranteId)
      .ilike('nombre', `%${nombreNormalizado.split(' ')[0]}%`) // Buscar por primera palabra
    
    if (existingProveedores && existingProveedores.length > 0) {
      // Si hay múltiples coincidencias, tomar la que más se parezca
      const mejorCoincidencia = existingProveedores.find(prov => 
        prov.nombre.toLowerCase().includes(nombreNormalizado.split(' ')[0])
      ) || existingProveedores[0]
      
      console.log(`✅ Proveedor encontrado por nombre: ${mejorCoincidencia.nombre} (${mejorCoincidencia.id})`)
      
      // Actualizar último contacto
      await supabaseClient
        .from('proveedores')
        .update({
          fecha_ultima_factura: new Date().toISOString().split('T')[0],
          numero_facturas: (mejorCoincidencia.numero_facturas || 0) + 1
        })
        .eq('id', mejorCoincidencia.id)
      
      return mejorCoincidencia.id
    }
    
    // 2. Si no existe, crear nuevo proveedor SIN CIF (evitar conflictos)
    console.log(`🆕 Creando nuevo proveedor sin CIF: ${nombreProveedor}`)
    
    const nuevoProveedor = {
      id: crypto.randomUUID(),
      restaurante_id: restauranteId,
      nombre: nombreProveedor,
      cif: null, // ✅ SIN CIF para evitar conflictos
      fecha_creacion: new Date().toISOString(),
      fecha_ultima_factura: new Date().toISOString().split('T')[0],
      numero_facturas: 1,
      total_facturado: 0,
      es_activo: true,
      dias_pago: 30,
      tipo_proveedor: 'distribuidor',
      tipo_proveedor_especifico: 'alimentacion',
      pais: 'España'
    }
    
    const { data: newProveedor, error: insertError } = await supabaseClient
      .from('proveedores')
      .insert(nuevoProveedor)
      .select('id')
      .single()
    
    if (insertError) {
      console.error(`❌ Error creando proveedor sin CIF: ${insertError.message}`)
      return null
    } else {
      console.log(`✅ Nuevo proveedor creado sin CIF: ${newProveedor.id}`)
      return newProveedor.id
    }
    
  } catch (error) {
    console.error('❌ Error en searchProveedorByName:', error)
    return null
  }
}

// 🏢 FUNCIÓN PARA PROCESAR PROVEEDOR Y HACER UPSERT
async function processProveedorUpsert(nombreProveedor: string, cifProveedor: string, restauranteId: string, supabaseClient: any): Promise<string | null> {
  console.log('🏢 === PROCESANDO UPSERT DE PROVEEDOR ===')
  
  try {
    // Solo buscar/crear por CIF (no por embeddings como dijiste)
    if (!cifProveedor || cifProveedor === 'Sin CIF') {
      console.log('⚠️ No hay CIF válido, no se puede crear/buscar proveedor')
      return null
    }
    
    // ✅ VERIFICAR QUE EL CIF NO PERTENEZCA AL RESTAURANTE ACTUAL
    console.log(`🔍 Verificando que CIF ${cifProveedor} no pertenezca al restaurante...`)
    console.log(`🏢 RestauranteId actual: ${restauranteId}`)
    
    const { data: restauranteData, error: restauranteError } = await supabaseClient
      .from('restaurantes')
      .select('cif, nombre')
      .eq('id', restauranteId)
      .single()
    
    console.log(`📊 Datos del restaurante obtenidos:`, restauranteData)
    console.log(`❌ Error de consulta restaurante:`, restauranteError)
    
    if (restauranteData && restauranteData.cif === cifProveedor) {
      console.log(`⚠️ ADVERTENCIA: El CIF ${cifProveedor} pertenece al restaurante ${restauranteData.nombre}`)
      console.log(`🔄 Buscando proveedor por nombre en lugar de CIF...`)
      
      // Si el CIF es del restaurante, buscar proveedor por nombre
      return await searchProveedorByName(nombreProveedor, restauranteId, supabaseClient)
    } else {
      console.log(`✅ CIF ${cifProveedor} NO pertenece al restaurante (CIF restaurante: ${restauranteData?.cif || 'NULL'})`)
    }
    
    // ✅ VERIFICAR QUE EL CIF NO PERTENEZCA A OTROS RESTAURANTES
    const { data: otrosRestaurantes, error: otrosError } = await supabaseClient
      .from('restaurantes')
      .select('cif, nombre')
      .eq('cif', cifProveedor)
      .neq('id', restauranteId)
    
    if (otrosRestaurantes && otrosRestaurantes.length > 0) {
      console.log(`⚠️ ADVERTENCIA: El CIF ${cifProveedor} pertenece a otro restaurante: ${otrosRestaurantes[0].nombre}`)
      console.log(`🔄 Buscando proveedor por nombre en lugar de CIF...`)
      
      // Si el CIF pertenece a otro restaurante, buscar por nombre
      return await searchProveedorByName(nombreProveedor, restauranteId, supabaseClient)
    }
    
    console.log(`✅ CIF ${cifProveedor} no pertenece a ningún restaurante, procediendo con búsqueda de proveedor...`)
    console.log(`🔍 Buscando proveedor con CIF: ${cifProveedor}`)
    
    // 1. Buscar si ya existe en proveedores por CIF
    const { data: existingProveedor, error: searchError } = await supabaseClient
      .from('proveedores')
      .select('id, nombre, numero_facturas, total_facturado')
      .eq('restaurante_id', restauranteId)
      .eq('cif', cifProveedor)
      .single()
    
    let proveedorId: string
    
    if (existingProveedor && !searchError) {
      // 2a. Actualizar proveedor existente
      console.log(`✅ Proveedor existente encontrado: ${existingProveedor.id}`)
      
      const { error: updateError } = await supabaseClient
        .from('proveedores')
        .update({
          fecha_ultima_factura: new Date().toISOString().split('T')[0], // Solo fecha
          numero_facturas: (existingProveedor.numero_facturas || 0) + 1,
          // total_facturado se actualizará cuando tengamos el importe de la factura
        })
        .eq('id', existingProveedor.id)
      
      if (updateError) {
        console.error(`❌ Error actualizando proveedor: ${updateError.message}`)
      } else {
        console.log(`✅ Proveedor actualizado: ${existingProveedor.id}`)
      }
      
      proveedorId = existingProveedor.id
      
    } else {
      // 2b. Crear nuevo proveedor
      console.log(`🆕 Creando nuevo proveedor: ${nombreProveedor} (${cifProveedor})`)
      
      const nuevoProveedor = {
        id: crypto.randomUUID(),
        restaurante_id: restauranteId,
        nombre: nombreProveedor,
        cif: cifProveedor,
        fecha_creacion: new Date().toISOString(),
        fecha_ultima_factura: new Date().toISOString().split('T')[0],
        numero_facturas: 1,
        total_facturado: 0, // Se actualizará después
        es_activo: true,
        dias_pago: 30, // Default
        tipo_proveedor: 'distribuidor', // Default
        tipo_proveedor_especifico: 'alimentacion', // Default
        pais: 'España' // Default
      }
      
      const { data: newProveedor, error: insertError } = await supabaseClient
        .from('proveedores')
        .insert(nuevoProveedor)
        .select('id')
        .single()
      
      if (insertError) {
        console.error(`❌ Error creando proveedor: ${insertError.message}`)
        return null
      } else {
        console.log(`✅ Nuevo proveedor creado: ${newProveedor.id}`)
        proveedorId = newProveedor.id
      }
    }
    
    return proveedorId
    
  } catch (error) {
    console.error(`❌ Error procesando proveedor:`, error)
    return null
  }
}

// 🎯 FUNCIÓN NUEVA: Búsqueda inteligente en cascada
async function findExistingProduct(descripcionOriginal: string, restauranteId: string, supabaseClient: any): Promise<any> {
  console.log(`🔍 === BÚSQUEDA INTELIGENTE EN CASCADA ===`)
  console.log(`📝 Buscando: "${descripcionOriginal}"`)
  
  // 🎯 PASO 1: Búsqueda exacta por nombre comercial (90% de casos)
  console.log(`🎯 PASO 1: Búsqueda exacta por nombre comercial...`)
  let { data: exactMatch, error: exactError } = await supabaseClient
    .from('productos_maestro')
    .select('id, precio_ultimo, nombre_normalizado, nombre_comercial')
    .eq('restaurante_id', restauranteId)
    .eq('nombre_comercial', descripcionOriginal)
    .single()
  
  if (exactMatch && !exactError) {
    console.log(`✅ COINCIDENCIA EXACTA encontrada: "${exactMatch.nombre_comercial}"`)
    return exactMatch
  }
  
  // 🔍 PASO 2: Búsqueda por nombre normalizado (casos con variaciones menores)
  console.log(`🔍 PASO 2: Búsqueda por nombre normalizado...`)
  const normalizado = normalizeProductName(descripcionOriginal)
  let { data: normalizedMatch, error: normalizedError } = await supabaseClient
    .from('productos_maestro')
    .select('id, precio_ultimo, nombre_normalizado, nombre_comercial')
    .eq('restaurante_id', restauranteId)
    .eq('nombre_normalizado', normalizado)
    .single()
  
  if (normalizedMatch && !normalizedError) {
    console.log(`✅ COINCIDENCIA NORMALIZADA encontrada: "${normalizedMatch.nombre_comercial}"`)
    return normalizedMatch
  }
  
  // 🤖 PASO 3: Búsqueda inteligente por similitud (albaranes a mano, etc.)
  console.log(`🤖 PASO 3: Búsqueda inteligente por similitud...`)
  
  // Extraer palabras clave principales (sin artículos)
  const palabrasClave = descripcionOriginal
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\sñáéíóúü]/g, ' ') // Limpiar caracteres especiales
    .split(' ')
    .filter(word => word.length > 2) // Solo palabras de 3+ caracteres
    .filter(word => !['del', 'con', 'sin', 'para', 'por', 'los', 'las', 'una', 'uno'].includes(word)) // Sin artículos
    .slice(0, 3) // Solo las 3 palabras más importantes
  
  if (palabrasClave.length > 0) {
    console.log(`🔍 Palabras clave extraídas: [${palabrasClave.join(', ')}]`)
    
    // Buscar productos que contengan las palabras clave principales
    let queryBuilder = supabaseClient
      .from('productos_maestro')
      .select('id, precio_ultimo, nombre_normalizado, nombre_comercial')
      .eq('restaurante_id', restauranteId)
    
    // Construir búsqueda ILIKE para las palabras clave
    let ilikePattern = `%${palabrasClave.join('%')}%`
    queryBuilder = queryBuilder.or(`nombre_comercial.ilike.${ilikePattern},nombre_normalizado.ilike.${ilikePattern}`)
    
    const { data: similarProducts, error: similarError } = await queryBuilder.limit(10)
    
    if (similarProducts && similarProducts.length > 0) {
      console.log(`🔍 Encontrados ${similarProducts.length} productos similares:`)
      
      // Calcular puntuación de similitud para cada producto
      let bestMatch = null
      let bestScore = 0
      
      for (const prod of similarProducts) {
        const score = calculateProductSimilarity(descripcionOriginal, prod.nombre_comercial, prod.nombre_normalizado)
        console.log(`  - "${prod.nombre_comercial}": ${Math.round(score * 100)}% similitud`)
        
        if (score > bestScore && score >= 0.75) { // Threshold: 75%
          bestScore = score
          bestMatch = prod
        }
      }
      
      if (bestMatch) {
        console.log(`✅ PRODUCTO SIMILAR encontrado: "${bestMatch.nombre_comercial}" (${Math.round(bestScore * 100)}% similitud)`)
        console.log(`⚠️ RECOMENDACIÓN: Revisar si es el mismo producto o crear nuevo`)
        return bestMatch
      }
    }
  }
  
  console.log(`❌ NO se encontró producto similar. Se creará nuevo producto.`)
  return null
}

// 🧮 FUNCIÓN AUXILIAR: Calcular similitud entre productos
function calculateProductSimilarity(original: string, comercial: string, normalizado: string): number {
  const cleanOriginal = original.toLowerCase().replace(/[^a-zA-Z0-9ñáéíóúü]/g, ' ').replace(/\s+/g, ' ').trim()
  const cleanComercial = comercial.toLowerCase().replace(/[^a-zA-Z0-9ñáéíóúü]/g, ' ').replace(/\s+/g, ' ').trim()
  const cleanNormalizado = normalizado.toLowerCase().replace(/[^a-zA-Z0-9ñáéíóúü]/g, ' ').replace(/\s+/g, ' ').trim()
  
  // Calcular similitud con ambos nombres
  const similitudComercial = calculateStringSimilarity(cleanOriginal, cleanComercial)
  const similitudNormalizada = calculateStringSimilarity(cleanOriginal, cleanNormalizado)
  
  // Devolver la mejor similitud
  return Math.max(similitudComercial, similitudNormalizada)
}

// 🔤 FUNCIÓN AUXILIAR: Calcular similitud entre strings
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ').filter(w => w.length > 2)
  const words2 = str2.split(' ').filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  let matches = 0
  const totalWords = Math.max(words1.length, words2.length)
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      // Coincidencia exacta
      if (word1 === word2) {
        matches++
        break
      }
      // Coincidencia parcial (una palabra contiene a la otra)
      if (word1.length > 3 && word2.length > 3 && 
          (word1.includes(word2) || word2.includes(word1))) {
        matches += 0.8
        break
      }
      // Coincidencia por similitud (diferencia de 1-2 caracteres)
      if (Math.abs(word1.length - word2.length) <= 2) {
        const longer = word1.length > word2.length ? word1 : word2
        const shorter = word1.length > word2.length ? word2 : word1
        if (longer.includes(shorter) || levenshteinDistance(word1, word2) <= 2) {
          matches += 0.6
          break
        }
      }
    }
  }
  
  return matches / totalWords
}

// 🔢 FUNCIÓN AUXILIAR: Distancia Levenshtein simplificada
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  const n = str1.length
  const m = str2.length
  
  if (n === 0) return m
  if (m === 0) return n
  
  for (let i = 0; i <= m; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[m][n]
}

// 🔄 FUNCIÓN PARA PROCESAR PRODUCTOS Y HACER UPSERT
async function processProductsUpsert(productos: any[], restauranteId: string, proveedorId: string | null, documentId: string, supabaseClient: any) {
  console.log('🔄 === PROCESANDO UPSERT DE PRODUCTOS ===')
  
  // 🔍 DEBUG: Listar productos existentes en la BD para este restaurante
  try {
    const { data: existingProducts, error: listError } = await supabaseClient
      .from('productos_maestro')
      .select('id, nombre_normalizado, nombre_comercial')
      .eq('restaurante_id', restauranteId)
    
    console.log(`🔍 === PRODUCTOS EXISTENTES EN BD (${existingProducts?.length || 0}) ===`)
    if (existingProducts && existingProducts.length > 0) {
      existingProducts.forEach((prod: any, index: number) => {
        console.log(`  ${index + 1}. "${prod.nombre_normalizado}" (comercial: "${prod.nombre_comercial}")`)
      })
    } else {
      console.log('  No hay productos existentes en la BD')
    }
    console.log(`🔍 === FIN LISTA PRODUCTOS EXISTENTES ===`)
  } catch (error) {
    console.log('⚠️ No se pudieron listar productos existentes:', error)
  }
  
  const productosConMaestroId: any[] = []
  
  for (const producto of productos) {
    try {
      console.log(`🔍 === PROCESANDO PRODUCTO ${productos.indexOf(producto) + 1}/${productos.length} ===`)
      console.log(`📝 Descripción original: "${producto.descripcion_original}"`)
      console.log(`🔍 Restaurante ID: "${restauranteId}"`)
      
      // 🎯 USAR NUEVA BÚSQUEDA INTELIGENTE EN CASCADA
      const existingProduct = await findExistingProduct(
        producto.descripcion_original,
        restauranteId,
        supabaseClient
      )
      
      let productoMaestroId: string | null
      
      if (existingProduct) {
        // 2a. Actualizar producto existente
        console.log(`✅ Producto existente encontrado: ${existingProduct.id}`)
        
        // ✅ USAR NUEVA FUNCIÓN DE ESTADÍSTICAS
        await updateProductPriceStatistics(
          existingProduct.id, 
          producto.precio_unitario_sin_iva,
          producto.peso_neto,
          producto.formato_comercial,
          supabaseClient
        )
        
        productoMaestroId = existingProduct.id
        
      } else {
        // 2b. Crear nuevo producto maestro
        console.log(`🆕 Creando nuevo producto maestro: ${producto.descripcion_normalizada}`)
        
        const nuevoProductoMaestroId = crypto.randomUUID()
        const nuevoProductoMaestro = {
          id: nuevoProductoMaestroId,
          restaurante_id: restauranteId,
          nombre_normalizado: producto.descripcion_normalizada,
          nombre_comercial: producto.descripcion_original,
          unidad_base: producto.unidad_medida,
          categoria_principal: inferCategory(producto.descripcion_original),
          precio_ultimo: producto.precio_unitario_sin_iva,
          peso_unitario_kg: producto.peso_neto,
          contenido_neto: producto.formato_comercial,
          fecha_ultimo_precio: new Date().toISOString(),
          precio_minimo_historico: producto.precio_unitario_sin_iva,
          precio_maximo_historico: producto.precio_unitario_sin_iva,
          precio_promedio_30dias: producto.precio_unitario_sin_iva,
          variacion_precio_porcentaje: 0,
          numero_compras_historicas: 1,
          fecha_ultima_compra: new Date().toISOString(),
          fecha_creacion: new Date().toISOString()
        }
        
        const { data: newProduct, error: insertError } = await supabaseClient
          .from('productos_maestro')
          .insert(nuevoProductoMaestro)
          .select('id')
          .single()
        
        if (insertError) {
          console.error(`❌ Error creando producto maestro: ${insertError.message}`)
          productoMaestroId = null
        } else {
          console.log(`✅ Nuevo producto maestro creado: ${newProduct.id}`)
          productoMaestroId = newProduct.id
        }
      }
      
      // 3. ✅ CREAR ENTRADA EN HISTORIAL DE PRECIOS
      if (productoMaestroId && producto.precio_unitario_sin_iva > 0) {
        await createPriceHistoryEntry(
          producto, 
          productoMaestroId, 
          restauranteId, 
          proveedorId, 
          documentId, 
          supabaseClient
        )
      }
      
      // 4. Preparar producto extraído con enlace al maestro
      const productoParaInsertar = {
        ...producto,
        producto_maestro_id: productoMaestroId,
        fecha_extraccion: new Date().toISOString()
      }
      
      productosConMaestroId.push(productoParaInsertar)
      
    } catch (error) {
      console.error(`❌ Error procesando producto ${producto.descripcion_normalizada}:`, error)
      // Continuar con el siguiente producto
      productosConMaestroId.push({
        ...producto,
        producto_maestro_id: null,
        fecha_extraccion: new Date().toISOString()
      })
    }
  }
  
  console.log(`🔄 Productos procesados con upsert: ${productosConMaestroId.length}`)
  return productosConMaestroId
}

// 🏷️ FUNCIÓN PARA INFERIR CATEGORÍA DE PRODUCTO
function inferCategory(description: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('aceite') || desc.includes('vinagre') || desc.includes('sal')) return 'condimentos'
  if (desc.includes('carne') || desc.includes('pollo') || desc.includes('ternera')) return 'carnes'
  if (desc.includes('pescado') || desc.includes('merluza') || desc.includes('salmon')) return 'pescados'
  if (desc.includes('verdura') || desc.includes('tomate') || desc.includes('lechuga')) return 'verduras'
  if (desc.includes('fruta') || desc.includes('manzana') || desc.includes('naranja')) return 'frutas'
  if (desc.includes('pan') || desc.includes('harina') || desc.includes('pasta')) return 'panaderia'
  if (desc.includes('leche') || desc.includes('queso') || desc.includes('yogur')) return 'lacteos'
  if (desc.includes('cerveza') || desc.includes('vino') || desc.includes('refresco')) return 'bebidas'
  if (desc.includes('limpieza') || desc.includes('detergente') || desc.includes('papel')) return 'limpieza'
  
  return 'general'
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

// 📅 FUNCIÓN AUXILIAR: Parsear fechas españolas
function parseSpanishDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  try {
    let cleanDate = dateStr.toString().trim()
    
    // Patrones de fecha española
    const patterns = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/,
      // DD/MM/YY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
      // DD-MM-YY
      /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
      // DD.MM.YY
      /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/
    ]
    
    for (const pattern of patterns) {
      const match = cleanDate.match(pattern)
      if (match) {
        let day = parseInt(match[1])
        let month = parseInt(match[2])
        let year = parseInt(match[3])
        
        // Ajustar año si es de 2 dígitos
        if (year < 100) {
          year += 2000
        }
        
        // Validar día y mes
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          // Crear fecha ISO
          const date = new Date(year, month - 1, day)
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date.toISOString()
          }
        }
      }
    }
    
    // Si no coincide con ningún patrón, intentar parsear con Date nativo
    const parsedDate = new Date(cleanDate)
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString()
    }
    
    return null
  } catch (error) {
    console.warn('⚠️ Error parseando fecha:', dateStr, error)
    return null
  }
}

// ===== FUNCIONES DE CÁLCULO DE PRODUCTOS =====

// 📏 FUNCIÓN PARA EXTRAER FORMATO COMERCIAL
function extractProductFormat(description: string): { formato_comercial: string | null, peso_neto: number | null, volumen: number | null } {
  if (!description) return { formato_comercial: null, peso_neto: null, volumen: null }
  
  const desc = description.toLowerCase()
  let formato_comercial: string | null = null
  let peso_neto: number | null = null
  let volumen: number | null = null
  
  // Patrones para peso (kg, g)
  const pesoPatterns = [
    /(\d+(?:[,\.]\d+)?)\s*kg/i,
    /(\d+(?:[,\.]\d+)?)\s*kilogramos?/i,
    /(\d+(?:[,\.]\d+)?)\s*g(?:\s|$)/i,
    /(\d+(?:[,\.]\d+)?)\s*gr(?:\s|$)/i,
    /(\d+(?:[,\.]\d+)?)\s*gramos?/i
  ]
  
  // Patrones para volumen (l, ml)
  const volumenPatterns = [
    /(\d+(?:[,\.]\d+)?)\s*l(?:\s|$)/i,
    /(\d+(?:[,\.]\d+)?)\s*litros?/i,
    /(\d+(?:[,\.]\d+)?)\s*ml/i,
    /(\d+(?:[,\.]\d+)?)\s*mililitros?/i,
    /(\d+(?:[,\.]\d+)?)\s*cl/i,
    /(\d+(?:[,\.]\d+)?)\s*centilitros?/i
  ]
  
  // Buscar peso
  for (const pattern of pesoPatterns) {
    const match = desc.match(pattern)
    if (match) {
      const valor = parseFloat(match[1].replace(',', '.'))
      if (desc.includes('kg') || desc.includes('kilogram')) {
        peso_neto = valor
        formato_comercial = `${valor} kg`
      } else {
        peso_neto = valor / 1000 // convertir g a kg
        formato_comercial = `${valor} g`
      }
      break
    }
  }
  
  // Buscar volumen (solo si no hay peso)
  if (!peso_neto) {
    for (const pattern of volumenPatterns) {
      const match = desc.match(pattern)
      if (match) {
        const valor = parseFloat(match[1].replace(',', '.'))
        if (desc.includes('ml') || desc.includes('mililitro')) {
          volumen = valor / 1000 // convertir ml a litros
          formato_comercial = `${valor} ml`
        } else if (desc.includes('cl') || desc.includes('centilitro')) {
          volumen = valor / 100 // convertir cl a litros
          formato_comercial = `${valor} cl`
        } else {
          volumen = valor
          formato_comercial = `${valor} l`
        }
        break
      }
    }
  }
  
  console.log(`📏 Formato extraído de "${description}": ${formato_comercial}, peso: ${peso_neto}kg, volumen: ${volumen}l`)
  return { formato_comercial, peso_neto, volumen }
}

// 💰 FUNCIÓN PARA CALCULAR PRECIO POR KG
function calculatePricePerKg(precioUnitario: number, pesoNeto: number | null): number | null {
  if (!precioUnitario || !pesoNeto || pesoNeto <= 0) return null
  
  const precioPorKg = precioUnitario / pesoNeto
  console.log(`💰 Precio por kg: ${precioUnitario}€ / ${pesoNeto}kg = ${precioPorKg.toFixed(2)}€/kg`)
  return Math.round(precioPorKg * 100) / 100
}

// 🫗 FUNCIÓN PARA CALCULAR PRECIO POR LITRO
function calculatePricePerLiter(precioUnitario: number, volumen: number | null): number | null {
  if (!precioUnitario || !volumen || volumen <= 0) return null
  
  const precioPorLitro = precioUnitario / volumen
  console.log(`🫗 Precio por litro: ${precioUnitario}€ / ${volumen}l = ${precioPorLitro.toFixed(2)}€/l`)
  return Math.round(precioPorLitro * 100) / 100
}

// 🔢 FUNCIÓN MEJORADA PARA CORREGIR PRECIOS Y CALCULAR IVA
function fixPriceCalculation(producto: any): any {
  const tipoIva = producto.tipo_iva || 21; // IVA por defecto 21%
  const factorIva = 1 + (tipoIva / 100); // Factor para calcular con IVA
  
  console.log(`🔢 === CALCULANDO PRECIOS PARA: ${producto.descripcion_original} ===`);
  console.log(`🧮 Datos iniciales:`, {
    precio_unitario_sin_iva: producto.precio_unitario_sin_iva,
    precio_unitario_con_iva: producto.precio_unitario_con_iva,
    precio_total_linea_sin_iva: producto.precio_total_linea_sin_iva,
    precio_total_linea_con_iva: producto.precio_total_linea_con_iva,
    cantidad: producto.cantidad,
    tipo_iva: tipoIva
  });

  // ===== CÁLCULOS DE PRECIO UNITARIO =====
  
  // Si tiene precio CON IVA pero no SIN IVA → Calcular SIN IVA
  if (producto.precio_unitario_con_iva && 
      (!producto.precio_unitario_sin_iva || producto.precio_unitario_sin_iva === 0)) {
    producto.precio_unitario_sin_iva = producto.precio_unitario_con_iva / factorIva;
    console.log(`🔢 Precio unitario SIN IVA calculado: ${producto.precio_unitario_con_iva}€ / ${factorIva} = ${producto.precio_unitario_sin_iva.toFixed(4)}€`);
  }
  
  // Si tiene precio SIN IVA pero no CON IVA → Calcular CON IVA
  if (producto.precio_unitario_sin_iva && 
      (!producto.precio_unitario_con_iva || producto.precio_unitario_con_iva === 0)) {
    producto.precio_unitario_con_iva = producto.precio_unitario_sin_iva * factorIva;
    console.log(`🔢 Precio unitario CON IVA calculado: ${producto.precio_unitario_sin_iva}€ × ${factorIva} = ${producto.precio_unitario_con_iva.toFixed(4)}€`);
  }

  // ===== CÁLCULOS DE TOTAL LÍNEA =====
  
  // Si tiene total CON IVA pero no SIN IVA → Calcular SIN IVA
  if (producto.precio_total_linea_con_iva && 
      (!producto.precio_total_linea_sin_iva || producto.precio_total_linea_sin_iva === 0)) {
    producto.precio_total_linea_sin_iva = producto.precio_total_linea_con_iva / factorIva;
    console.log(`🔢 Total línea SIN IVA calculado: ${producto.precio_total_linea_con_iva}€ / ${factorIva} = ${producto.precio_total_linea_sin_iva.toFixed(2)}€`);
  }
  
  // Si tiene total SIN IVA pero no CON IVA → Calcular CON IVA
  if (producto.precio_total_linea_sin_iva && 
      (!producto.precio_total_linea_con_iva || producto.precio_total_linea_con_iva === 0)) {
    producto.precio_total_linea_con_iva = producto.precio_total_linea_sin_iva * factorIva;
    console.log(`🔢 Total línea CON IVA calculado: ${producto.precio_total_linea_sin_iva}€ × ${factorIva} = ${producto.precio_total_linea_con_iva.toFixed(2)}€`);
  }

  // ===== CÁLCULOS CRUZADOS (UNITARIO ↔ TOTAL) =====
  
  // Si no tiene precio unitario pero sí total y cantidad → Calcular unitario
  if ((!producto.precio_unitario_sin_iva || producto.precio_unitario_sin_iva === 0) && 
      producto.precio_total_linea_sin_iva && 
      producto.cantidad && producto.cantidad > 0) {
    
    producto.precio_unitario_sin_iva = producto.precio_total_linea_sin_iva / producto.cantidad;
    producto.precio_unitario_con_iva = producto.precio_unitario_sin_iva * factorIva;
    console.log(`🔢 Precio unitario calculado desde total: ${producto.precio_total_linea_sin_iva}€ / ${producto.cantidad} = ${producto.precio_unitario_sin_iva.toFixed(4)}€/ud`);
  }
  
  // Si no tiene precio total pero sí unitario y cantidad → Calcular total
  if ((!producto.precio_total_linea_sin_iva || producto.precio_total_linea_sin_iva === 0) && 
      producto.precio_unitario_sin_iva && 
      producto.cantidad && producto.cantidad > 0) {
    
    producto.precio_total_linea_sin_iva = producto.precio_unitario_sin_iva * producto.cantidad;
    producto.precio_total_linea_con_iva = producto.precio_total_linea_sin_iva * factorIva;
    console.log(`🔢 Precio total calculado desde unitario: ${producto.precio_unitario_sin_iva}€ × ${producto.cantidad} = ${producto.precio_total_linea_sin_iva.toFixed(2)}€`);
  }

  // ===== CÁLCULOS DESDE PRECIO CON IVA CUANDO FALTA TODO =====
  
  // Si solo tiene precio CON IVA y cantidad → Calcular todo lo demás
  if (producto.precio_unitario_con_iva && producto.cantidad && 
      (!producto.precio_total_linea_sin_iva || producto.precio_total_linea_sin_iva === 0)) {
    
    producto.precio_unitario_sin_iva = producto.precio_unitario_con_iva / factorIva;
    producto.precio_total_linea_sin_iva = producto.precio_unitario_sin_iva * producto.cantidad;
    producto.precio_total_linea_con_iva = producto.precio_unitario_con_iva * producto.cantidad;
    console.log(`🔢 Calculado todo desde precio CON IVA: ${producto.precio_unitario_con_iva}€/ud`);
  }
  
  // Si solo tiene total CON IVA y cantidad → Calcular todo lo demás
  if (producto.precio_total_linea_con_iva && producto.cantidad && 
      (!producto.precio_unitario_sin_iva || producto.precio_unitario_sin_iva === 0)) {
    
    producto.precio_total_linea_sin_iva = producto.precio_total_linea_con_iva / factorIva;
    producto.precio_unitario_sin_iva = producto.precio_total_linea_sin_iva / producto.cantidad;
    producto.precio_unitario_con_iva = producto.precio_unitario_sin_iva * factorIva;
    console.log(`🔢 Calculado todo desde total CON IVA: ${producto.precio_total_linea_con_iva}€`);
  }

  console.log(`✅ Precios finales calculados:`, {
    precio_unitario_sin_iva: producto.precio_unitario_sin_iva?.toFixed(4),
    precio_unitario_con_iva: producto.precio_unitario_con_iva?.toFixed(4),
    precio_total_linea_sin_iva: producto.precio_total_linea_sin_iva?.toFixed(2),
    precio_total_linea_con_iva: producto.precio_total_linea_con_iva?.toFixed(2)
  });
  
  return producto;
}

// 📊 FUNCIÓN PARA CREAR ENTRADA EN HISTORIAL DE PRECIOS
async function createPriceHistoryEntry(producto: any, productoMaestroId: string, restauranteId: string, proveedorId: string | null, documentId: string, supabaseClient: any) {
  console.log('📊 === CREANDO ENTRADA EN HISTORIAL DE PRECIOS ===')
  
  try {
    const historialEntry = {
      id: crypto.randomUUID(),
      producto_maestro_id: productoMaestroId,
      restaurante_id: restauranteId,
      proveedor_id: proveedorId,
      documento_id: documentId,
      
      // PRECIOS
      precio_unitario_sin_iva: producto.precio_unitario_sin_iva,
      precio_unitario_con_iva: producto.precio_unitario_sin_iva * (1 + (producto.tipo_iva || 21) / 100),
      precio_por_kg: producto.precio_por_kg || null,
      precio_por_litro: producto.precio_por_litro || null,
      precio_por_unidad_base: producto.precio_unitario_sin_iva, // Es lo mismo que unitario
      
      // CONTEXTO
      cantidad_comprada: producto.cantidad,
      unidad_medida: producto.unidad_medida,
      formato_comercial: producto.formato_comercial,
      tipo_iva: producto.tipo_iva || 21,
      
      // METADATOS
      fecha_compra: new Date().toISOString().split('T')[0], // Solo fecha
      fecha_registro: new Date().toISOString(),
      tipo_documento: 'factura',
      numero_documento: null
    }
    
    const { data: historialResult, error: historialError } = await supabaseClient
      .from('historial_precios_productos')
      .insert(historialEntry)
      .select()
    
    if (historialError) {
      console.error('❌ Error creando historial de precios:', historialError)
      return null
    } else {
      console.log(`✅ Entrada de historial creada: ${historialResult[0].id}`)
      return historialResult[0].id
    }
    
  } catch (error) {
    console.error('❌ Error en createPriceHistoryEntry:', error)
    return null
  }
}

// 📈 FUNCIÓN PARA ACTUALIZAR ESTADÍSTICAS DE PRECIOS EN PRODUCTO MAESTRO
async function updateProductPriceStatistics(productoMaestroId: string, nuevoPrecio: number, pesoUnitarioKg: number | null, contenidoNeto: string | null, supabaseClient: any) {
  console.log('📈 === ACTUALIZANDO ESTADÍSTICAS DE PRECIOS ===')
  
  try {
    // 1. Obtener historial de precios de los últimos 30 días
    const { data: historialPrecios, error: historialError } = await supabaseClient
      .from('historial_precios_productos')
      .select('precio_unitario_sin_iva, fecha_compra')
      .eq('producto_maestro_id', productoMaestroId)
      .gte('fecha_compra', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('fecha_compra', { ascending: false })
    
    if (historialError) {
      console.error('❌ Error obteniendo historial:', historialError)
      return
    }
    
    const precios = historialPrecios?.map(h => h.precio_unitario_sin_iva) || []
    precios.push(nuevoPrecio) // Incluir el precio actual
    
    // 2. Calcular estadísticas
    const precioMinimo = Math.min(...precios)
    const precioMaximo = Math.max(...precios)
    const precioPromedio = precios.reduce((sum, precio) => sum + precio, 0) / precios.length
    
    // 3. Calcular variación porcentual (vs precio anterior)
    let variacionPorcentaje = 0
    if (precios.length > 1) {
      const precioAnterior = precios[1] // El segundo en la lista (ordenada desc)
      if (precioAnterior > 0) {
        variacionPorcentaje = ((nuevoPrecio - precioAnterior) / precioAnterior) * 100
      }
    }
    
    // 4. Actualizar producto maestro
    const { error: updateError } = await supabaseClient
      .from('productos_maestro')
      .update({
        precio_ultimo: nuevoPrecio,
        fecha_ultimo_precio: new Date().toISOString(),
        precio_minimo_historico: precioMinimo,
        precio_maximo_historico: precioMaximo,
        precio_promedio_30dias: Math.round(precioPromedio * 100) / 100,
        variacion_precio_porcentaje: Math.round(variacionPorcentaje * 100) / 100,
        numero_compras_historicas: precios.length,
        fecha_ultima_compra: new Date().toISOString(),
        peso_unitario_kg: pesoUnitarioKg,
        contenido_neto: contenidoNeto
      })
      .eq('id', productoMaestroId)
    
    if (updateError) {
      console.error('❌ Error actualizando estadísticas:', updateError)
    } else {
      console.log(`✅ Estadísticas actualizadas:`, {
        precio_ultimo: nuevoPrecio,
        precio_minimo: precioMinimo,
        precio_maximo: precioMaximo,
        precio_promedio_30dias: Math.round(precioPromedio * 100) / 100,
        variacion_porcentaje: Math.round(variacionPorcentaje * 100) / 100,
        numero_compras: precios.length,
        peso_unitario_kg: pesoUnitarioKg,
        contenido_neto: contenidoNeto
      })
    }
    
  } catch (error) {
    console.error('❌ Error en updateProductPriceStatistics:', error)
  }
}

// 🤖 FUNCIÓN PARA EXTRAER DATOS CON OpenAI
async function extractDataWithOpenAI(text: string): Promise<any> {
  console.log('🤖 === INICIANDO EXTRACCIÓN CON OpenAI ===')
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY no encontrada en variables de entorno')
  }
  
  const prompt = `
Eres un experto en extracción de datos de facturas españolas. Extrae TODOS los datos siguientes del texto de la factura.

⚠️ CRÍTICO - IDENTIFICACIÓN DE PROVEEDOR: 
Esta es una factura de COMPRA de un restaurante. Identifica CORRECTAMENTE el PROVEEDOR:

🏢 PROVEEDOR (quien VENDE/EMITE la factura):
- Aparece en la parte SUPERIOR de la factura
- Incluye logo, nombre comercial y CIF/NIF del emisor
- Suele tener textos como "Factura", "Invoice", número de factura cerca
- Ejemplos: "DISTRIBUIDORA XYZ S.L. CIF: B12345678"

🍽️ CLIENTE/RESTAURANTE (quien COMPRA/RECIBE la factura):
- Aparece más abajo, en secciones como "Facturar a:", "Cliente:", "Destinatario:"
- Puede aparecer con direcciones de entrega
- NO es el proveedor, es el comprador

REGLA: Si ves el mismo CIF/nombre en ambas posiciones, el PROVEEDOR es quien aparece ARRIBA con el logo/encabezado.

TEXTO DE LA FACTURA:
${text}

EXTRAE EXACTAMENTE ESTOS DATOS en formato JSON:

{
  "factura": {
    "proveedor_nombre": {
      "valor": "nombre del proveedor/empresa (quien EMITE la factura, NO el cliente)",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "proveedor_cif": {
      "valor": "CIF/NIF del PROVEEDOR (quien emite la factura, formato: A12345678)",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "numero_factura": {
      "valor": "número de factura",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "fecha_factura": {
      "valor": "YYYY-MM-DD",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "total_factura": {
      "valor": número (sin €, formato: 123.45),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "base_imponible": {
      "valor": número (sin €, formato: 123.45),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "cuota_iva": {
      "valor": número (sin €, formato: 123.45),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "tipo_iva": {
      "valor": número (formato: 21 para 21%),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    }
  },
  "productos": [
    {
      "descripcion_original": "descripción exacta del producto (ej: PRINGÁ CASERA ABUELO JUAN 1 KG)",
      "cantidad": número (ej: 8.0),
      "unidad_medida": "kg/litros/unidades/etc",
      "precio_unitario_sin_iva": número (ej: 11.00),
      "precio_total_linea_sin_iva": número (ej: 88.00),
      "codigo_producto": "código si existe (ej: 02360)",
      "tipo_iva": número (ej: 10 para 10%),
      "confianza_linea": 0.0-1.0,
      "texto_fuente": "línea exacta donde lo encontraste"
    }
  ]
}

REGLAS IMPORTANTES:
1. Si no encuentras un dato, pon null en "valor" y 0.0 en "confianza"
2. Las fechas SIEMPRE en formato YYYY-MM-DD
3. Los números sin símbolos de moneda (€) ni separadores de miles
4. Usa punto (.) para decimales, no coma (,)
5. La confianza debe reflejar qué tan seguro estás del dato:
   - 1.0 = texto exacto y claro (ej: "Total: 123.45€")
   - 0.9 = texto claro pero con formato distinto (ej: "123,45 euros")
   - 0.8 = texto algo ambiguo pero probable (ej: número cerca de "total")
   - 0.7 = inferido de contexto (ej: fecha sin etiqueta clara)
   - 0.5 = muy incierto o múltiples interpretaciones
   - 0.0 = no encontrado

⚠️ IDENTIFICACIÓN DE PROVEEDOR (MUY IMPORTANTE):
6. El PROVEEDOR aparece en el ENCABEZADO de la factura (primeras líneas)
7. Busca nombres comerciales + CIF en la parte SUPERIOR del documento
8. IGNORA COMPLETAMENTE nombres que aparezcan como "Cliente:", "Facturar a:", "Destinatario:", "Enviar a:"
9. Si ves múltiples CIFs, el del PROVEEDOR está en la parte superior junto al logo/membrete
10. Ejemplos de proveedores: "SABORES DEL SUR S.L. CIF: B06359418"

⚠️ REGLA CRÍTICA - DOBLE VERIFICACIÓN:
11. Si encuentras el MISMO CIF en dos lugares, toma el que esté más ARRIBA en el documento
12. El proveedor SIEMPRE aparece con logo/membrete en la parte superior
13. El cliente/restaurante aparece en secciones claramente marcadas como destinatario
14. NUNCA tomes datos de secciones que digan "Facturar a" o "Cliente"

PRODUCTOS:
11. Busca productos en TODO el texto, incluyendo líneas de productos, tablas, y cualquier formato
12. Si hay varios productos, inclúyelos todos en el array
13. Para productos sin precio individual, calcula precio_unitario = precio_total / cantidad
14. Los productos pueden aparecer como: "02360 PRINGÁ CASERA ABUELO JUAN 1 KG Lote: 01082026 F. Caducidad: 07/07/25"
15. Busca patrones como: código + descripción + cantidad + precio + total
16. NO dejes el array de productos vacío si ves productos en la factura

DEVUELVE SOLO EL JSON con la estructura exacta especificada arriba.
`

  try {
    console.log('📤 Enviando request a OpenAI...')
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Baja temperatura para respuestas más consistentes
        max_tokens: 4000,
        response_format: { type: "json_object" } // ✅ Forzar respuesta JSON válida
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error OpenAI:', response.status, errorText)
      throw new Error(`Error OpenAI: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log('✅ Respuesta OpenAI recibida')
    
    const content = responseData.choices[0]?.message?.content
    if (!content) {
      throw new Error('No se recibió contenido de OpenAI')
    }

    console.log('📝 Contenido OpenAI (JSON garantizado):', content.substring(0, 300) + '...')

    // Parsear JSON (OpenAI garantiza JSON válido con response_format)
    const extractedData = JSON.parse(content)
    
    console.log('✅ Datos extraídos por OpenAI:', {
      proveedor: extractedData.factura?.proveedor_nombre?.valor,
      cif: extractedData.factura?.proveedor_cif?.valor,
      total: extractedData.factura?.total_factura?.valor,
      productos: extractedData.productos?.length || 0
    })

    return extractedData

  } catch (error) {
    console.error('❌ Error en OpenAI:', error)
    throw error
  }
}

// 🗺️ FUNCIÓN PARA MAPEAR COORDENADAS
function mapCoordinatesToExtractedData(openaiData: any, coordenadasOCR: any): any {
  console.log('🗺️ === MAPEANDO COORDENADAS ===')
  
  const coordenadasCampos: any = {}
  
  // Helper para encontrar coordenadas por texto
  function findCoordinatesByText(textoFuente: string): any {
    if (!textoFuente || !coordenadasOCR) return null
    
    // Buscar en todas las coordenadas del OCR
    for (const [key, coordData] of Object.entries(coordenadasOCR)) {
      const coordInfo = coordData as any
      if (coordInfo.texto && coordInfo.texto.includes(textoFuente.trim())) {
        console.log(`✅ Coordenadas encontradas para "${textoFuente}":`, coordInfo)
        return {
          x: coordInfo.x,
          y: coordInfo.y,
          width: coordInfo.width,
          height: coordInfo.height,
          confidence: coordInfo.confidence,
          page_width: coordInfo.page_width,
          page_height: coordInfo.page_height
        }
      }
    }
    
    console.log(`⚠️ No se encontraron coordenadas para: "${textoFuente}"`)
    return null
  }
  
  // Mapear coordenadas para campos de factura
  if (openaiData.factura) {
    for (const [campo, datos] of Object.entries(openaiData.factura)) {
      const campoData = datos as any
      if (campoData?.texto_fuente) {
        const coords = findCoordinatesByText(campoData.texto_fuente)
        if (coords) {
          coordenadasCampos[campo] = coords
        }
      }
    }
  }
  
  console.log(`🎯 Coordenadas mapeadas: ${Object.keys(coordenadasCampos).length} campos`)
  return coordenadasCampos
}

// 🔄 FUNCIÓN PARA CONVERTIR DATOS DE OpenAI AL FORMATO ESPERADO
function convertOpenAIToExpectedFormat(openaiData: any, coordenadasCampos: any): any {
  console.log('🔄 === CONVIRTIENDO FORMATO OpenAI ===')
  
  const factura = openaiData.factura || {}
  
  return {
    proveedor_nombre: factura.proveedor_nombre?.valor || 'Proveedor no identificado',
    proveedor_cif: factura.proveedor_cif?.valor || null,
    numero_factura: factura.numero_factura?.valor || 'SIN_NUMERO',
    fecha_factura: factura.fecha_factura?.valor || new Date().toISOString(),
    total_factura: factura.total_factura?.valor || 0,
    base_imponible: factura.base_imponible?.valor || 0,
    cuota_iva: factura.cuota_iva?.valor || 0,
    tipo_iva: factura.tipo_iva?.valor || 21,
    confianza_global: (
      (factura.proveedor_nombre?.confianza || 0) +
      (factura.total_factura?.confianza || 0) +
      (factura.numero_factura?.confianza || 0)
    ) / 3,
    confianza_proveedor: factura.proveedor_nombre?.confianza || 0,
    confianza_datos_fiscales: (
      (factura.numero_factura?.confianza || 0) +
      (factura.fecha_factura?.confianza || 0) +
      (factura.proveedor_cif?.confianza || 0)
    ) / 3,
    confianza_importes: (
      (factura.total_factura?.confianza || 0) +
      (factura.base_imponible?.confianza || 0) +
      (factura.cuota_iva?.confianza || 0)
    ) / 3,
    coordenadas_campos: coordenadasCampos,
    campos_con_baja_confianza: [] as string[]
  }
}

// 🛒 FUNCIÓN PARA PROCESAR PRODUCTOS DE OpenAI
function processOpenAIProducts(openaiData: any): any[] {
  console.log('🛒 === PROCESANDO PRODUCTOS DE OpenAI CON CÁLCULOS ===')
  
  const productos = openaiData.productos || []
  
  return productos.map((producto: any, index: number) => {
    console.log(`🔍 Procesando producto ${index + 1}: ${producto.descripcion_original}`)
    
    // 1. ✅ CORREGIR PRECIOS (calcular unitario si falta)
    let productoCorregido: any = {
      linea_original: producto.texto_fuente || '',
      numero_linea: index + 1,
      confianza_linea: producto.confianza_linea || 0.7,
      descripcion_original: producto.descripcion_original || '',
      cantidad: producto.cantidad || 1,
      precio_total_linea_sin_iva: producto.precio_total_linea_sin_iva || 0,
      precio_unitario_sin_iva: producto.precio_unitario_sin_iva || 0,
      codigo_producto: producto.codigo_producto || null,
      unidad_medida: producto.unidad_medida || null,
      descripcion_normalizada: normalizeProductName(producto.descripcion_original || ''),
      tipo_iva: producto.tipo_iva || 21,
      // ✅ INICIALIZAR CAMPOS PARA CÁLCULOS
      formato_comercial: null,
      peso_neto: null,
      volumen: null,
      precio_por_kg: null,
      precio_por_litro: null
    }
    
    // 2. ✅ APLICAR CORRECCIÓN DE PRECIOS
    productoCorregido = fixPriceCalculation(productoCorregido)
    
    // 3. ✅ EXTRAER FORMATO COMERCIAL Y PESOS
    const formato = extractProductFormat(productoCorregido.descripcion_original)
    productoCorregido.formato_comercial = formato.formato_comercial
    productoCorregido.peso_neto = formato.peso_neto
    productoCorregido.volumen = formato.volumen
    
    // 4. ✅ CALCULAR PRECIOS NORMALIZADOS
    if (productoCorregido.precio_unitario_sin_iva > 0) {
      productoCorregido.precio_por_kg = calculatePricePerKg(
        productoCorregido.precio_unitario_sin_iva, 
        formato.peso_neto
      )
      
      productoCorregido.precio_por_litro = calculatePricePerLiter(
        productoCorregido.precio_unitario_sin_iva, 
        formato.volumen
      )
    }
    
    console.log(`✅ Producto ${index + 1} procesado:`, {
      descripcion: productoCorregido.descripcion_original,
      formato: productoCorregido.formato_comercial,
      precio_unitario: productoCorregido.precio_unitario_sin_iva,
      precio_por_kg: productoCorregido.precio_por_kg,
      precio_por_litro: productoCorregido.precio_por_litro
    })
    
    return productoCorregido
  })
}

// 📍 FUNCIÓN PARA EXTRAER COORDENADAS DEL OCR
function extractCoordinatesFromOCR(extractedResult: any): any {
  console.log('📍 === EXTRAYENDO COORDENADAS DEL OCR ===')
  
  const coordenadasCampos: any = {}
  
  try {
    const document = extractedResult.document
    if (!document || !document.pages || document.pages.length === 0) {
      console.log('⚠️ No se encontraron páginas en el OCR')
      return coordenadasCampos
    }

    const getTextFromAnchor = (fullText: string, textAnchor: any): string => {
      try {
        if (!textAnchor || !textAnchor.textSegments) return ''
        let combined = ''
        for (const seg of textAnchor.textSegments) {
          const start = typeof seg.startIndex !== 'undefined' ? Number(seg.startIndex) : 0
          const end = typeof seg.endIndex !== 'undefined' ? Number(seg.endIndex) : 0
          if (Number.isFinite(start) && Number.isFinite(end) && end > start && end <= fullText.length) {
            combined += fullText.substring(start, end)
          }
        }
        return combined.trim()
      } catch (e) {
        return ''
      }
    }

    document.pages.forEach((page: any, pageIndex: number) => {
      console.log(`📄 Procesando página ${pageIndex + 1} para coordenadas...`)
      
      // Extraer coordenadas de TODOS los elementos disponibles
      const containers = [
        { key: 'block', items: page.blocks || [], conf: 0.7 },
        { key: 'paragraph', items: page.paragraphs || [], conf: 0.75 },
        { key: 'line', items: page.lines || [], conf: 0.85 },
        { key: 'token', items: page.tokens || [], conf: 0.9 },
        { key: 'formField', items: page.formFields || [], conf: 0.8 },
        { key: 'table', items: page.tables || [], conf: 0.8 },
        { key: 'tableRow', items: page.tableRows || [], conf: 0.8 },
        { key: 'tableCell', items: page.tableCells || [], conf: 0.8 }
      ]

              containers.forEach(container => {
          if (container.items && container.items.length > 0) {
            console.log(`  📍 ${container.items.length} ${container.key}s encontrados`)
            container.items.forEach((item: any, idx: number) => {
              // Extraer texto según el tipo de elemento
              let itemText = ''
              if (item.layout?.textAnchor) {
                itemText = getTextFromAnchor(document.text, item.layout.textAnchor)
              } else if (item.fieldName?.textAnchor) {
                itemText = getTextFromAnchor(document.text, item.fieldName.textAnchor)
              } else if (item.fieldValue?.textAnchor) {
                itemText = getTextFromAnchor(document.text, item.fieldValue.textAnchor)
              } else if (item.headerRows && item.headerRows.length > 0) {
                itemText = 'Tabla: ' + item.headerRows.map((row: any) => 
                  row.cells.map((cell: any) => getTextFromAnchor(document.text, cell.layout?.textAnchor)).join(' | ')
                ).join('; ')
              } else if (item.bodyRows && item.bodyRows.length > 0) {
                itemText = 'Filas: ' + item.bodyRows.map((row: any) => 
                  row.cells.map((cell: any) => getTextFromAnchor(document.text, cell.layout?.textAnchor)).join(' | ')
                ).join('; ')
              }
              
              const coords = extractCoordinates(item, container.conf, itemText)
              if (coords) {
                const key = `pagina_${pageIndex + 1}_${container.key}_${idx + 1}`
                coordenadasCampos[key] = {
                  ...coords,
                  texto: itemText || `Elemento ${container.key} ${idx + 1}`,
                  pagina: pageIndex + 1,
                  tipo: container.key
                }
              }
            })
          }
        })
    })
    
    console.log(`🎯 Total de coordenadas extraídas: ${Object.keys(coordenadasCampos).length}`)
    return coordenadasCampos
    
  } catch (error) {
    console.error('❌ Error extrayendo coordenadas del OCR:', error)
    return coordenadasCampos
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
    
    // CONSTRUIR URL COMPLETA PARA SUPABASE STORAGE
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const bucketName = 'documentos'
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    
    console.log('🔗 URL completa de Storage:', storageUrl)

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
    
    // Verificar configuración del procesador
    console.log('🔍 === VERIFICACIÓN DE CONFIGURACIÓN ===')
    console.log('📋 Configuración actual:')
    console.log('  - Project ID:', GOOGLE_PROJECT_ID)
    console.log('  - Location:', GOOGLE_LOCATION)
    console.log('  - Processor ID:', GOOGLE_PROCESSOR_ID)
    console.log('  - Endpoint completo:', GOOGLE_API_ENDPOINT)
    console.log('  - Access Token válido:', accessToken.length > 100 ? 'SÍ' : 'NO')
    console.log('  - Access Token longitud:', accessToken.length)
    console.log('🔍 === FIN VERIFICACIÓN ===')

    // 5. Llamar a Google Document AI
    console.log('🤖 === ENVIANDO A GOOGLE DOCUMENT AI ===')
    console.log('📍 Endpoint:', GOOGLE_API_ENDPOINT)
    console.log('🔑 Access Token (primeros 50 chars):', accessToken.substring(0, 50))
    console.log('�� Archivo a procesar - Tamaño base64:', base64File.length)
    console.log('🏢 Google Project ID:', GOOGLE_PROJECT_ID)
    console.log('🌍 Google Location:', GOOGLE_LOCATION)
    console.log('🔧 Google Processor ID:', GOOGLE_PROCESSOR_ID)
    console.log('📋 Tipo de procesador: OCR Puro (solo extrae texto)')
    
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

    // 🔍 === DIAGNÓSTICO COMPLETO DE GOOGLE AI ===
    console.log('🔍 === DIAGNÓSTICO COMPLETO DE GOOGLE AI ===')
    console.log('📊 Respuesta completa de Google AI:')
    console.log('  - Status:', googleAiResponse.status)
    console.log('  - Headers:', Object.fromEntries(googleAiResponse.headers.entries()))
    console.log('  - Longitud respuesta:', responseText.length)
    
    // Analizar estructura de la respuesta
    if (extractedResult.document) {
      console.log('📄 Documento encontrado en respuesta')
      console.log('  - MIME Type:', extractedResult.document.mimeType)
      console.log('  - URI:', extractedResult.document.uri)
      console.log('  - Texto presente:', !!extractedResult.document.text)
      console.log('  - Longitud texto:', extractedResult.document.text?.length || 0)
      
      if (extractedResult.document.pages) {
        console.log('📋 Páginas encontradas:', extractedResult.document.pages.length)
        
        // Analizar cada página en detalle
        extractedResult.document.pages.forEach((page: any, index: number) => {
          console.log(`  📄 Página ${index + 1}:`)
          console.log('    - Width:', page.width)
          console.log('    - Height:', page.height)
          console.log('    - Form Fields:', page.formFields?.length || 0)
          console.log('    - Entities:', page.entities?.length || 0)
          console.log('    - Layout:', page.layout?.textAnchor?.textSegments?.length || 0)
          
          // Log detallado de Form Fields si existen
          if (page.formFields && page.formFields.length > 0) {
            console.log(`    🔍 Form Fields de página ${index + 1}:`)
            page.formFields.forEach((field: any, fieldIndex: number) => {
              console.log(`      Campo ${fieldIndex + 1}:`)
              console.log('        - Field Name:', field.fieldName)
              console.log('        - Field Value:', field.fieldValue)
              console.log('        - Confidence:', field.confidence)
              console.log('        - Bounding Box:', field.boundingBox)
              console.log('        - Bounding Poly:', field.boundingPoly)
              console.log('        - Layout:', field.layout)
            })
          } else {
            console.log(`    ⚠️ Página ${index + 1} NO tiene Form Fields`)
          }
          
          // Log detallado de Entities si existen
          if (page.entities && page.entities.length > 0) {
            console.log(`    🔍 Entities de página ${index + 1}:`)
            page.entities.forEach((entity: any, entityIndex: number) => {
              console.log(`      Entity ${entityIndex + 1}:`)
              console.log('        - Type:', entity.type)
              console.log('        - Mention Text:', entity.mentionText)
              console.log('        - Confidence:', entity.confidence)
              console.log('        - Bounding Poly:', entity.boundingPoly)
              console.log('        - Page Anchor:', entity.pageAnchor)
            })
          } else {
            console.log(`    ⚠️ Página ${index + 1} NO tiene Entities`)
          }
        })
      } else {
        console.log('⚠️ NO se encontraron páginas en la respuesta')
      }
      
      // Verificar si hay otros campos en la respuesta
      const responseKeys = Object.keys(extractedResult)
      console.log('🔑 Claves en la respuesta:', responseKeys)
      
      if (extractedResult.error) {
        console.error('❌ Error en respuesta de Google AI:', extractedResult.error)
      }
      
      if (extractedResult.name) {
        console.log('📝 Nombre del procesamiento:', extractedResult.name)
      }
      
    } else {
      console.log('❌ NO se encontró documento en la respuesta')
      console.log('🔍 Estructura completa de la respuesta:', JSON.stringify(extractedResult, null, 2))
    }
    
    console.log('🔍 === FIN DEL DIAGNÓSTICO ===')

    console.log('✅ Resultado del Form Parser obtenido')

    // 6. Extraer datos REALES del texto con OpenAI
    console.log('🤖 === EXTRAYENDO DATOS CON OpenAI ===')
    console.log('📄 Resultado del OCR keys:', Object.keys(extractedResult || {}))
    console.log('📄 Resultado del OCR document exists:', !!extractedResult?.document)

    // Obtener el texto del OCR
    const fullText = extractedResult?.document?.text || ''
    console.log('📝 Texto extraído del OCR (primeros 500 chars):', fullText.substring(0, 500))

    // Extraer coordenadas del OCR (como antes)
    console.log('📍 === EXTRAYENDO COORDENADAS DEL OCR ===')
    const coordenadasOCR = extractCoordinatesFromOCR(extractedResult)
    console.log('🎯 Total coordenadas extraídas del OCR:', Object.keys(coordenadasOCR).length)
    console.log('📋 Tipos de coordenadas encontradas:', [...new Set(Object.values(coordenadasOCR).map((c: any) => c.tipo))])
    
    // Extraer datos con OpenAI
    console.log('🚀 === LLAMANDO A OPENAI ===')
    console.log('📝 Longitud del texto a enviar:', fullText.length)
    console.log('📝 Primeros 200 caracteres del texto:', fullText.substring(0, 200))
    
    let openaiResult: any
    try {
      openaiResult = await extractDataWithOpenAI(fullText)
      console.log('✅ OpenAI completado exitosamente')
      console.log('📊 Resultado OpenAI:', JSON.stringify(openaiResult, null, 2))
    } catch (error) {
      console.error('❌ Error en OpenAI:', error)
      throw error
    }
    
    // Mapear coordenadas a los datos extraídos
    const coordenadasCampos = mapCoordinatesToExtractedData(openaiResult, coordenadasOCR)
    
    // Convertir al formato esperado por el resto del sistema
    const extractedData = convertOpenAIToExpectedFormat(openaiResult, coordenadasCampos)
    console.log('📊 Datos extraídos con OpenAI:', extractedData)

    // 7. Extraer productos con OpenAI
    console.log('🛒 === EXTRAYENDO PRODUCTOS CON OpenAI ===')
    const productosExtraidos = processOpenAIProducts(openaiResult)
    console.log(`🛒 Productos extraídos: ${productosExtraidos.length}`)
    
    // 8. Verificación de emergencia anti-confusión ANTES del procesamiento
    console.log('🚨 === VERIFICACIÓN ANTI-CONFUSIÓN DE EMERGENCIA ===')
    const { data: restauranteCheck, error: checkError } = await supabaseClient
      .from('restaurantes')
      .select('cif, nombre')
      .eq('id', documentInfo.restaurante_id)
      .single()
    
    if (restauranteCheck && extractedData.proveedor_cif === restauranteCheck.cif) {
      console.log(`🚨 ALERTA: OpenAI confundió proveedor con restaurante!`)
      console.log(`🔄 Forzando re-extracción con prompt estricto...`)
      
      // Re-extraer con prompt más estricto
      const promptEstricto = `
EMERGENCY EXTRACTION - La extracción anterior fue incorrecta.

Esta factura tiene DOS entidades:
1. PROVEEDOR/EMISOR: Quien vende (parte superior con logo)
2. CLIENTE/DESTINATARIO: Quien compra (sección "Facturar a")

El restaurante "${restauranteCheck.nombre}" con CIF "${restauranteCheck.cif}" es el CLIENTE.
NO extraigas este CIF como proveedor.

TEXTO DE LA FACTURA:
${fullText}

Extrae SOLO el proveedor (emisor) que NO sea "${restauranteCheck.nombre}":
{
  "proveedor_nombre": "nombre del verdadero proveedor/emisor",
  "proveedor_cif": "CIF del verdadero proveedor (NO ${restauranteCheck.cif})"
}
`
      
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: promptEstricto }],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: "json_object" }
          })
        })
        
        if (response.ok) {
          const correctedData = await response.json()
          const correctedContent = JSON.parse(correctedData.choices[0]?.message?.content || '{}')
          
          if (correctedContent.proveedor_cif && correctedContent.proveedor_cif !== restauranteCheck.cif) {
            console.log(`✅ Re-extracción exitosa: ${correctedContent.proveedor_nombre} (${correctedContent.proveedor_cif})`)
            extractedData.proveedor_nombre = correctedContent.proveedor_nombre
            extractedData.proveedor_cif = correctedContent.proveedor_cif
          } else {
            // Si OpenAI sigue confundido, forzar valores genéricos
            console.log(`⚠️ OpenAI sigue confundido, usando valores de fallback`)
            extractedData.proveedor_nombre = 'Proveedor no identificado'
            extractedData.proveedor_cif = null
          }
        }
      } catch (error) {
        console.log(`⚠️ Re-extracción falló, usando buscar por nombre como fallback`)
        extractedData.proveedor_nombre = 'Proveedor no identificado'
        extractedData.proveedor_cif = null
      }
    }

    // 9. Procesar proveedor (normalización y upsert en proveedores)
    console.log('🏢 === PROCESANDO PROVEEDOR ===')
    console.log(`📋 Datos extraídos del proveedor:`)
    console.log(`📝 Nombre: "${extractedData.proveedor_nombre}"`)
    console.log(`🏢 CIF: "${extractedData.proveedor_cif}"`)
    console.log(`🆔 RestauranteId del documento: "${documentInfo.restaurante_id}"`)
    
    const proveedorId = await processProveedorUpsert(
      extractedData.proveedor_nombre || 'Sin nombre',
      extractedData.proveedor_cif || 'Sin CIF',
      documentInfo.restaurante_id,
      supabaseClient
    )
    
    // 9. Procesar productos (normalización y upsert en productos_maestro)
    console.log('🔄 === PROCESANDO PRODUCTOS MAESTROS ===')
    const productosConMaestroId = await processProductsUpsert(
      productosExtraidos,
      documentInfo.restaurante_id,
      proveedorId,
      documentId,
      supabaseClient
    )
    
    // 9. Verificar estructura de la tabla y guardar en BD
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
    
    console.log('💾 Guardando en base de datos con confianza individual...')
    console.log('📄 Datos a insertar:', {
      documento_id: documentId,
      restaurante_id: documentInfo.restaurante_id,
      ...extractedData,
    })
    
    // Preparar datos para inserción con todos los campos de confianza
    const datosParaInsertar = {
      documento_id: documentId,
      restaurante_id: documentInfo.restaurante_id,
      proveedor_nombre: extractedData.proveedor_nombre,
      proveedor_cif: extractedData.proveedor_cif,
      numero_factura: extractedData.numero_factura,
      fecha_factura: extractedData.fecha_factura,
      total_factura: extractedData.total_factura,
      base_imponible: extractedData.base_imponible,
      cuota_iva: extractedData.cuota_iva,
      tipo_iva: extractedData.tipo_iva,
      confianza_global: extractedData.confianza_global,
      confianza_proveedor: extractedData.confianza_proveedor,
      confianza_datos_fiscales: extractedData.confianza_datos_fiscales,
      confianza_importes: extractedData.confianza_importes,
      coordenadas_campos: extractedData.coordenadas_campos,
      campos_con_baja_confianza: extractedData.campos_con_baja_confianza,
      fecha_extraccion: new Date().toISOString()
    }
    
    console.log('📋 Datos estructurados para inserción:', datosParaInsertar)
    
    const { data: insertResult, error: insertError } = await supabaseClient
      .from('datos_extraidos_facturas')
      .insert(datosParaInsertar)
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

    // 10. Guardar productos extraídos en la tabla productos_extraidos
    if (productosConMaestroId.length > 0) {
      console.log('🛒 === GUARDANDO PRODUCTOS EXTRAÍDOS ===')
      console.log(`🛒 Insertando ${productosConMaestroId.length} productos en productos_extraidos`)
      
      try {
        const productosParaInsertar = productosConMaestroId.map(producto => ({
          id: crypto.randomUUID(),
          documento_id: documentId,
          restaurante_id: documentInfo.restaurante_id,
          producto_maestro_id: producto.producto_maestro_id,
          descripcion_original: producto.descripcion_original,
          descripcion_normalizada: producto.descripcion_normalizada,
          cantidad: producto.cantidad,
          unidad_medida: producto.unidad_medida,
          precio_unitario_sin_iva: producto.precio_unitario_sin_iva,
          precio_total_linea_sin_iva: producto.precio_total_linea_sin_iva,
          tipo_iva: producto.tipo_iva,
          linea_numero: producto.numero_linea,
          fecha_extraccion: producto.fecha_extraccion,
          codigo_producto: producto.codigo_producto || null,
          // ✅ NUEVOS CAMPOS CALCULADOS
          confianza_linea: producto.confianza_linea || 0.7,
          formato_comercial: producto.formato_comercial,
          peso_neto: producto.peso_neto,
          volumen: producto.volumen,
          precio_por_kg: producto.precio_por_kg,
          precio_por_litro: producto.precio_por_litro
        }))
        
        const { data: productosInsertResult, error: productosInsertError } = await supabaseClient
          .from('productos_extraidos')
          .insert(productosParaInsertar)
          .select()
        
        if (productosInsertError) {
          console.error('❌ Error insertando productos:', productosInsertError)
          console.error('🔍 Datos que se intentaron insertar:', productosParaInsertar[0]) // Solo el primero para debug
          // No lanzar error aquí, solo advertir
          console.warn('⚠️ Los productos no se pudieron guardar, pero la factura sí se procesó correctamente')
        } else {
          console.log(`✅ ${productosInsertResult.length} productos guardados correctamente en productos_extraidos`)
        }
        
      } catch (error) {
        console.error('❌ Error en proceso de guardado de productos:', error)
        console.warn('⚠️ Los productos no se pudieron guardar, pero la factura sí se procesó correctamente')
      }
    } else {
      console.log('📝 No se encontraron productos para guardar en esta factura')
    }

    // 11. Actualizar estado Y URL completa de Storage
    console.log('🔄 Actualizando estado del documento y URL de Storage...')
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('documentos')
      .update({ 
        estado: 'processed',
        url_storage: storageUrl // Guardar URL completa en lugar del path relativo
      })
      .eq('id', documentId)
      .select()

    if (updateError) {
      console.error('❌ Error actualizando estado del documento:', updateError)
      throw new Error(`Error actualizando estado: ${updateError.message}`)
    } else {
      console.log('✅ Estado del documento y URL de Storage actualizados correctamente:', updateResult)
    }

    console.log('🎉 === PROCESAMIENTO COMPLETADO ===')
    console.log('📊 Resumen del procesamiento:')
    console.log('  - Documento ID:', documentId)
    console.log('  - Datos extraídos del Form Parser')
    console.log('  - Productos extraídos:', productosExtraidos.length)
    console.log('  - Productos procesados:', productosConMaestroId.length)
    console.log('  - Datos guardados:', insertResult)
    console.log('  - Estado actualizado:', updateResult)

    return new Response(JSON.stringify({ 
      success: true, 
      documentId,
      message: 'Procesado exitosamente',
      formParserData: extractedResult,
      extractedData,
      productosExtraidos: productosExtraidos.length,
      productosConMaestro: productosConMaestroId.length,
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
