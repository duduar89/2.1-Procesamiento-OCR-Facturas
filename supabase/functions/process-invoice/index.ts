import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuración de la API de Google Document AI
const GOOGLE_PROJECT_ID = 'gen-lang-client-0960907787'
const GOOGLE_LOCATION = 'eu'
const GOOGLE_PROCESSOR_ID = '49b7920fa26bebc' // ✅ Procesador de OCR puro (solo extrae texto)
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
    console.log('📄 Archivo a procesar - Tamaño base64:', base64File.length)
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

    const documentText = extractedResult.document?.text || ''
    console.log('✅ Texto extraído, longitud:', documentText.length)

    // 6. Extraer datos REALES del texto
    console.log('🔍 Extrayendo datos del texto OCR...')
    console.log('📄 Texto a procesar (primeros 500 chars):', documentText.substring(0, 500))

    const extractedData = extractDataFromGoogleAI(extractedResult)
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

    // 8. Actualizar estado Y URL completa de Storage
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
