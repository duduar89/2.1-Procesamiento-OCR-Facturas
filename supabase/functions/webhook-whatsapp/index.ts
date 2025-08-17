// supabase/functions/webhook-whatsapp/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // ⚡ TIMEOUT RÁPIDO para evitar reintentos de WhatsApp
  const startTime = Date.now()
  const MAX_EXECUTION_TIME = 4000 // 4 segundos máximo

  try {
    console.log("=== WEBHOOK WHATSAPP INICIADO ===")

    // 1. Parsear webhook de WhatsApp
    const body = await req.json()
    console.log("Datos recibidos:", body)

    // 2. Extraer mensaje
    const { entry } = body
    if (!entry || entry.length === 0) {
      return new Response("No hay entradas", { status: 400 })
    }

    const { changes } = entry[0]
    if (!changes || changes.length === 0) {
      return new Response("No hay cambios", { status: 400 })
    }

    const { value } = changes[0]
    if (!value.messages || value.messages.length === 0) {
      return new Response("No hay mensajes", { status: 200 })
    }

    const message = value.messages[0]
    const telefono = message.from
    const mediaId = message.image?.id || message.document?.id
    const texto = message.text?.body || ""
    // 🆕 NUEVO: Extraer respuesta de botón
    const buttonResponse = message.interactive?.button_reply?.id || ""

    console.log(`📱 Mensaje de ${telefono}:`, { mediaId, texto })

    // 🚨 VERIFICACIÓN DE IDEMPOTENCIA - AÑADIR DESPUÉS DE EXTRAER mediaId
    console.log('🔒 === VERIFICACIÓN DE IDEMPOTENCIA ===')
    console.log('📱 MediaId recibido:', mediaId)
    console.log('📞 Teléfono:', telefono)

    // 3. Validar que hay archivo
    if (!mediaId) {
      // 🆕 NUEVO: Verificar si es respuesta de botón
      if (buttonResponse) {
        console.log('🔘 Respuesta de botón detectada:', buttonResponse)
        await procesarRespuestaBoton(telefono, buttonResponse)
        return new Response("Botón procesado", { status: 200 })
      }
      
      await enviarMensajeWhatsApp(telefono, "Por favor, envía una imagen o PDF de la factura.")
      return new Response("Sin archivo", { status: 200 })
    }
    
    // Verificar si ya se procesó este mediaId
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    console.log(`🔍 Buscando número: "${telefono}"`)

    // Crear variaciones del número
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '')
    const variaciones = [
      telefonoLimpio,                    // 34622902777
      `+${telefonoLimpio}`,             // +34622902777
      telefonoLimpio.startsWith('34') ? telefonoLimpio.substring(2) : telefonoLimpio, // 622902777
      telefonoLimpio.startsWith('34') ? `+34${telefonoLimpio.substring(2)}` : `+34${telefonoLimpio}` // +34622902777
    ]

    // Eliminar duplicados
    const variacionesUnicas = [...new Set(variaciones)]
    console.log(`🔄 Variaciones a buscar:`, variacionesUnicas)

    let vinculacion = null
    let error = null

    // Buscar con cada variación
    for (const variacion of variacionesUnicas) {
      console.log(`🔍 Probando variación: "${variacion}"`)
      
      const { data: resultado, error: errorBusqueda } = await supabaseClient
        .from("whatsapp_vinculaciones")
        .select(`
          restaurante_id,
          telefono,
          restaurantes(id, nombre)
        `)
        .eq("telefono", variacion)
        .eq("activo", true)
        .single()
      
      if (resultado && !errorBusqueda) {
        console.log(`✅ Vinculación encontrada con "${variacion}":`, {
          restaurante: resultado.restaurantes.nombre,
          telefono_guardado: resultado.telefono
        })
        vinculacion = resultado
        break
      }
    }

    if (error || !vinculacion) {
      console.log(`❌ Número ${telefono} no vinculado después de probar todas las variaciones`)
      await enviarMensajeWhatsApp(telefono, 
        "Hola! No tienes acceso a este sistema. Contacta con tu administrador para vincular tu número."
      )
      return new Response("Número no vinculado", { status: 200 })
    }

    // 5. ✅ ¡IDENTIFICACIÓN EXITOSA!
    const restaurante = { 
      id: vinculacion.restaurante_id, 
      nombre: vinculacion.restaurantes.nombre 
    }
    console.log(`✅ Factura para: ${restaurante.nombre}`)

    // 🚨 VERIFICACIÓN DE IDEMPOTENCIA - DESPUÉS DE IDENTIFICAR RESTAURANTE
    console.log('🔒 === VERIFICACIÓN DE IDEMPOTENCIA ===')
    console.log('📱 MediaId recibido:', mediaId)
    console.log('🏢 Restaurante:', restaurante.nombre)

    // VERIFICAR SI YA PROCESAMOS ESTE ARCHIVO
    // Buscar por mediaId en el nombre del archivo (formato: whatsapp_${mediaId}_${nombre})
    console.log(`🔍 Buscando archivo con mediaId: ${mediaId}`)
    
    const { data: archivoExistente, error: archivoError } = await supabaseClient
      .from('documentos')
      .select('id, nombre_archivo, estado, fecha_subida, origen, url_storage')
      .eq('restaurante_id', restaurante.id)
      .ilike('nombre_archivo', `%${mediaId}%`)
      .order('fecha_subida', { ascending: false })
      .limit(1)

    if (archivoError) {
      console.error('❌ Error buscando archivo existente:', archivoError)
    }

    if (archivoExistente && !archivoError && archivoExistente.length > 0) {
      const archivo = archivoExistente[0]
      console.log('🔍 Archivo encontrado previamente:', {
        id: archivo.id,
        nombre: archivo.nombre_archivo,
        estado: archivo.estado,
        fecha: archivo.fecha_subida
      })
      
      // Verificar si ya se procesó o está en processing
      if (archivo.estado === 'processed') {
        console.log('✅ ARCHIVO YA PROCESADO - Enviando confirmación sin reprocesar')
        
        await enviarMensajeWhatsApp(telefono, 
          `✅ Este archivo ya fue procesado anteriormente.
          
🏢 ${restaurante.nombre}
📄 ${archivo.nombre_archivo}
⏰ Procesado: ${new Date(archivo.fecha_subida).toLocaleDateString()}

El documento ya está disponible en tu sistema.`
        )
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Archivo ya procesado anteriormente',
          documentId: archivo.id,
          action: 'DUPLICADO_EVITADO'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        })
      }
      
      if (archivo.estado === 'processing') {
        console.log('⏳ ARCHIVO EN PROCESAMIENTO - Evitando duplicación')
        
        await enviarMensajeWhatsApp(telefono, 
          `⏳ Este archivo ya se está procesando.
          
🏢 ${restaurante.nombre}
📄 ${archivo.nombre_archivo}
🤖 Te avisaremos cuando termine.

Por favor, espera unos momentos.`
        )
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Archivo ya en procesamiento',
          documentId: archivo.id,
          action: 'PROCESAMIENTO_EN_CURSO'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        })
      }
      
      if (archivo.estado === 'pending') {
        console.log('⚠️ ARCHIVO PENDIENTE - Verificando si se puede reprocesar')
        
        // Verificar si lleva mucho tiempo pending (más de 10 minutos)
        const fechaSubida = new Date(archivo.fecha_subida)
        const ahora = new Date()
        const minutosPendiente = (ahora.getTime() - fechaSubida.getTime()) / (1000 * 60)
        
        if (minutosPendiente < 10) {
          console.log(`⏳ Archivo pending hace solo ${Math.round(minutosPendiente)} minutos - Evitando duplicación`)
          
          await enviarMensajeWhatsApp(telefono, 
            `⏳ Este archivo ya está en cola de procesamiento.
            
🏢 ${restaurante.nombre}
📄 ${archivo.nombre_archivo}
⏰ En cola desde: ${Math.round(minutosPendiente)} minutos

Te avisaremos cuando termine de procesar.`
          )
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Archivo ya en cola de procesamiento',
            documentId: archivo.id,
            action: 'EN_COLA'
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          })
        } else {
          console.log(`🔄 Archivo pending hace ${Math.round(minutosPendiente)} minutos - Permitiendo reprocesamiento`)
        }
      }
    }

    console.log('✅ Archivo no procesado anteriormente - Continuando con descarga')
    console.log('🔒 === FIN VERIFICACIÓN DE IDEMPOTENCIA ===')

    // ⚡ VERIFICAR TIMEOUT
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log('⏰ TIMEOUT - Respondiendo rápido para evitar reintentos')
      await enviarMensajeWhatsApp(telefono, 
        `⏰ Tu factura está siendo procesada. Te avisaremos cuando termine.
        
🏢 ${restaurante.nombre}
📱 MediaId: ${mediaId}`
      )
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Procesamiento iniciado - Timeout para evitar reintentos',
        action: 'TIMEOUT_PREVENTION'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // 6. Descargar archivo de WhatsApp
    const archivo = await descargarArchivoWhatsApp(mediaId)
    if (!archivo) {
      await enviarMensajeWhatsApp(telefono, "Error descargando el archivo. Inténtalo de nuevo.")
      return new Response("Error descargando archivo", { status: 500 })
    }

    // ⚡ VERIFICAR TIMEOUT DESPUÉS DE DESCARGA
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log('⏰ TIMEOUT después de descarga - Respondiendo rápido')
      await enviarMensajeWhatsApp(telefono, 
        `⏰ Tu factura se descargó correctamente y está siendo procesada.
        
🏢 ${restaurante.nombre}
📄 ${archivo.name}
📱 MediaId: ${mediaId}

Te avisaremos cuando termine el procesamiento.`
      )
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Archivo descargado - Timeout para evitar reintentos',
        action: 'TIMEOUT_PREVENTION_AFTER_DOWNLOAD'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // 7. Subir a Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const storagePath = `${restaurante.id}/${timestamp}_whatsapp_${archivo.name}`

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("documentos")
      .upload(storagePath, archivo, { cacheControl: "3600", upsert: false })

    if (uploadError) {
      console.error("Error subiendo archivo:", uploadError)
      await enviarMensajeWhatsApp(telefono, "Error guardando el archivo. Inténtalo de nuevo.")
      return new Response("Error subiendo archivo", { status: 500 })
    }

    // 8. Crear registro en BD
    // Incluir mediaId en el nombre para mejor trazabilidad
    const nombreConMediaId = `whatsapp_${mediaId}_${archivo.name}`
    
    const { data: documento, error: documentoError } = await supabaseClient
      .from("documentos")
      .insert({
        restaurante_id: restaurante.id,
        nombre_archivo: nombreConMediaId,
        url_storage: uploadData.path,
        tipo_archivo: "factura",
        tamaño_bytes: archivo.size,  // ✅ VALOR OBLIGATORIO
        estado: "pending",
        origen: "whatsapp"
      })
      .select()
      .single()

    if (documentoError) {
      console.error("Error creando documento:", documentoError)
      await enviarMensajeWhatsApp(telefono, "Error registrando el documento. Inténtalo de nuevo.")
      return new Response("Error creando documento", { status: 500 })
    }

    // ⚡ VERIFICAR TIMEOUT ANTES DE PROCESS-INVOICE
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log('⏰ TIMEOUT antes de process-invoice - Respondiendo rápido')
      await enviarMensajeWhatsApp(telefono, 
        `⏰ Tu factura se guardó correctamente y está en cola de procesamiento.
        
🏢 ${restaurante.nombre}
📄 ${archivo.name}
📱 MediaId: ${mediaId}
🆔 ID: ${documento.id}

El procesamiento se iniciará automáticamente. Te avisaremos cuando termine.`
      )
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Documento guardado - Timeout para evitar reintentos',
        documentId: documento.id,
        action: 'TIMEOUT_PREVENTION_BEFORE_PROCESSING'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // 9. Llamar a la función de procesamiento de facturas
    try {
      console.log("🔄 Llamando a process-invoice con documento ID:", documento.id)
      
      const procesarResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          documentId: documento.id,
          telefono: telefono  // 👈 SOLO ESTO
        })
      })

      // 👈 AÑADIR ESTAS 3 LÍNEAS:
      const responseText = await procesarResponse.text()
      console.log("📤 Status de process-invoice:", procesarResponse.status)
      console.log("📤 Respuesta completa:", responseText)

      if (procesarResponse.ok) {
        console.log("IA processing iniciado correctamente")
        await enviarMensajeWhatsApp(telefono, 
          `✅ Hemos recibido tu factura para "${restaurante.nombre}"\n\n📄 ${archivo.name}\n🤖 Cuando termine de procesar te avisaremos.`
        )
      } else {
        console.error("Error en process-invoice:", procesarResponse.status)
        console.error("📤 Error detallado:", responseText)  // 👈 Y ESTA LÍNEA
        await enviarMensajeWhatsApp(telefono, 
          `✅ Factura guardada para "${restaurante.nombre}"\n\n📄 ${archivo.name}\n⚠️ El procesamiento se iniciará pronto.`
        )
      }

    } catch (procesarError) {
      console.error("Error llamando a process-invoice:", procesarError)
      await enviarMensajeWhatsApp(telefono, 
        `✅ Factura guardada para "${restaurante.nombre}"\n\n📄 ${archivo.name}\n⚠️ El procesamiento se iniciará pronto.`
      )
    }

    const executionTime = Date.now() - startTime
    console.log(`⚡ Webhook completado en ${executionTime}ms`)
    
    return new Response(JSON.stringify({
      success: true,
      restaurante: restaurante.nombre,
      documento: documento.id,
      mensaje: "Factura procesada correctamente",
      executionTime: `${executionTime}ms`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`❌ Error crítico en webhook WhatsApp después de ${executionTime}ms:`, error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      executionTime: `${executionTime}ms`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
})

// Función para descargar archivo de WhatsApp
async function descargarArchivoWhatsApp(mediaId: string): Promise<File | null> {
  try {
    console.log('🔍 === INICIANDO DESCARGA DE ARCHIVO WHATSAPP ===')
    console.log('📱 Media ID:', mediaId)
    
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")
    if (!accessToken) {
      console.error("❌ WHATSAPP_ACCESS_TOKEN no configurado")
      return null
    }
    
    console.log('🔑 Access Token disponible, longitud:', accessToken.length)
    console.log('🔑 Access Token (primeros 20 chars):', accessToken.substring(0, 20))

    // 1. Obtener URL del archivo
    const mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`
    console.log('🌐 Llamando a WhatsApp Media API:', mediaUrl)
    
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    })

    console.log('📡 Respuesta Media API - Status:', mediaResponse.status)
    console.log('📡 Respuesta Media API - Headers:', Object.fromEntries(mediaResponse.headers.entries()))

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text()
      console.error('❌ Error obteniendo URL del archivo:', mediaResponse.status)
      console.error('❌ Error detallado:', errorText)
      return null
    }

    const mediaData = await mediaResponse.json()
    console.log('✅ Media data obtenida:', JSON.stringify(mediaData, null, 2))
    
    const downloadUrl = mediaData.url
    if (!downloadUrl) {
      console.error('❌ No se encontró URL de descarga en la respuesta')
      return null
    }
    
    console.log('🔗 URL de descarga:', downloadUrl)

    // 2. Descargar archivo
    console.log('⬇️ Descargando archivo desde URL...')
    const fileResponse = await fetch(downloadUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    })

    console.log('📥 Respuesta descarga - Status:', fileResponse.status)
    console.log('📥 Respuesta descarga - Headers:', Object.fromEntries(fileResponse.headers.entries()))

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text()
      console.error('❌ Error descargando archivo:', fileResponse.status)
      console.error('❌ Error detallado:', errorText)
      return null
    }

    const blob = await fileResponse.blob()
    console.log('✅ Archivo descargado, tamaño:', blob.size, 'bytes')
    
    const fileName = `whatsapp_${Date.now()}.${mediaData.mime_type?.split('/')[1] || 'jpg'}`
    console.log('📝 Nombre del archivo generado:', fileName)
    console.log('📝 Tipo MIME:', mediaData.mime_type)
    
    const file = new File([blob], fileName, { type: mediaData.mime_type || 'image/jpeg' })
    console.log('✅ Archivo File creado exitosamente')
    
    return file

  } catch (error) {
    console.error('❌ Error crítico descargando archivo WhatsApp:', error)
    console.error('❌ Stack trace:', error.stack)
    return null
  }
}

// 🆕 FUNCIÓN PARA PROCESAR RESPUESTAS DE BOTONES
async function procesarRespuestaBoton(telefono: string, buttonId: string) {
  try {
    console.log('🔘 === PROCESANDO RESPUESTA DE BOTÓN ===')
    console.log('📱 Teléfono:', telefono)
    console.log('🔘 Botón presionado:', buttonId)
    
    // Buscar documento pendiente de revisión
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    
    // Buscar vinculación del usuario - USAR LA MISMA LÓGICA QUE FUNCIONA
    console.log(`🔍 Buscando número: "${telefono}"`)

    // Crear variaciones del número (MISMA LÓGICA QUE FUNCIONA)
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '')
    const variaciones = [
      telefonoLimpio,                    // 34622902777
      `+${telefonoLimpio}`,             // +34622902777
      telefonoLimpio.startsWith('34') ? telefonoLimpio.substring(2) : telefonoLimpio, // 622902777
      telefonoLimpio.startsWith('34') ? `+34${telefonoLimpio.substring(2)}` : `+34${telefonoLimpio}` // +34622902777
    ]

    // Eliminar duplicados
    const variacionesUnicas = [...new Set(variaciones)]
    console.log(`🔄 Variaciones a buscar:`, variacionesUnicas)

    let vinculacion = null
    let error = null

    // Buscar con cada variación (MISMA LÓGICA QUE FUNCIONA)
    for (const variacion of variacionesUnicas) {
      console.log(`🔍 Probando variación: "${variacion}"`)
      
      const { data: resultado, error: errorBusqueda } = await supabaseClient
        .from("whatsapp_vinculaciones")
        .select(`
          restaurante_id,
          telefono,
          restaurantes(id, nombre)
        `)
        .eq("telefono", variacion)
        .eq("activo", true)
        .single()
      
      if (resultado && !errorBusqueda) {
        console.log(`✅ Vinculación encontrada con "${variacion}":`, {
          restaurante: resultado.restaurantes.nombre,
          telefono_guardado: resultado.telefono
        })
        vinculacion = resultado
        break
      }
    }

    if (error || !vinculacion) {
      console.log(`❌ Número ${telefono} no vinculado después de probar todas las variaciones`)
      return
    }
    
    // Buscar documento que necesita revisión
    const { data: documento } = await supabaseClient
      .from("documentos")
      .select("id, nombre_archivo, tipo_documento")
      .eq("restaurante_id", vinculacion.restaurante_id)
      .eq("requiere_revision_tipo", true)
      .eq("estado", "pending")
      .order("fecha_subida", { ascending: false })
      .limit(1)
      .single()
    
    if (!documento) {
      console.log('❌ No hay documentos pendientes de revisión')
      await enviarMensajeWhatsApp(telefono, "No hay documentos pendientes de revisión.")
      return
    }
    
    // Determinar tipo según botón
    let nuevoTipo = ""
    if (buttonId === "btn_factura") {
      nuevoTipo = "factura"
    } else if (buttonId === "btn_albaran") {
      nuevoTipo = "albaran"
    } else {
      console.log('❌ Botón no reconocido:', buttonId)
      return
    }
    
    console.log('✅ Actualizando documento:', {
      id: documento.id,
      tipo_anterior: documento.tipo_documento,
      tipo_nuevo: nuevoTipo
    })
    
    // Actualizar documento
    const { error: updateError } = await supabaseClient
      .from("documentos")
      .update({
        tipo_documento: nuevoTipo,
        requiere_revision_tipo: false,
        estado: "processing"
      })
      .eq("id", documento.id)
    
    if (updateError) {
      console.error('❌ Error actualizando documento:', updateError)
      await enviarMensajeWhatsApp(telefono, "Error actualizando el documento. Inténtalo de nuevo.")
      return
    }
    
    console.log('✅ Documento actualizado exitosamente')
    
    // Reanudar procesamiento
    await enviarMensajeWhatsApp(telefono, 
      `✅ Documento clasificado como ${nuevoTipo.toUpperCase()}
      
📄 ${documento.nombre_archivo}
🤖 El procesamiento se reanudará automáticamente.

Te avisaremos cuando termine.`
    )
    
    // Llamar a process-invoice para reanudar
    try {
      const procesarResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          documentId: documento.id,
          telefono: telefono,
          tipoConfirmado: nuevoTipo
        })
      })
      
      if (procesarResponse.ok) {
        console.log('✅ Procesamiento reanudado correctamente')
      } else {
        console.error('❌ Error reanudando procesamiento:', procesarResponse.status)
      }
      
    } catch (error) {
      console.error('❌ Error llamando a process-invoice:', error)
    }
    
  } catch (error) {
    console.error('❌ Error procesando respuesta de botón:', error)
    await enviarMensajeWhatsApp(telefono, "Error procesando tu respuesta. Inténtalo de nuevo.")
  }
}

// Función para enviar mensaje por WhatsApp
async function enviarMensajeWhatsApp(telefono: string, mensaje: string) {
  try {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
    
    if (!accessToken || !phoneNumberId) {
      console.error("Variables de WhatsApp no configuradas")
      return
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: mensaje }
      })
    })

    if (!response.ok) {
      console.error("Error enviando mensaje WhatsApp:", response.status)
    } else {
      console.log("Mensaje WhatsApp enviado correctamente")
    }

  } catch (error) {
    console.error("Error enviando mensaje WhatsApp:", error)
  }
}