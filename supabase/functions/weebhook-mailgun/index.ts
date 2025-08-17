// supabase/functions/webhook-mailgun/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers CORS para permitir peticiones desde cualquier origen.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

// --- Configuración de la API de Mailgun ---
const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

/**
 * Descarga de forma segura los adjuntos de un email utilizando la API de Mailgun.
 * Este método es más fiable que usar las URLs temporales del webhook.
 * @param storageKey La clave única del mensaje almacenado en Mailgun.
 * @returns Una promesa que se resuelve con un array de objetos File.
 */
async function getMailgunAttachments(storageKey: string): Promise<File[]> {
  console.log("Obteniendo adjuntos de Mailgun API para storage key:", storageKey);

  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error("MAILGUN_API_KEY o MAILGUN_DOMAIN no configurados en las variables de entorno.");
  }

  try {
    const messageUrl = `https://api.mailgun.net/v3/domains/${MAILGUN_DOMAIN}/messages/${storageKey}`;
    console.log("Consultando mensaje vía API:", messageUrl);
    
    // Petición a la API de Mailgun para obtener los detalles del mensaje.
    const messageResponse = await fetch(messageUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        "Accept": "application/json",
      },
    });

    if (!messageResponse.ok) {
      console.error(`Error obteniendo mensaje de API: ${messageResponse.status} - ${messageResponse.statusText}`);
      return [];
    }

    const messageData = await messageResponse.json();
    
    const attachments: File[] = [];
    if (messageData.attachments && messageData.attachments.length > 0) {
      console.log(`Encontrados ${messageData.attachments.length} adjuntos en la API.`);
      
      // Itera sobre cada adjunto y lo descarga.
      for (const attachmentData of messageData.attachments) {
        console.log(`Descargando: ${attachmentData.name} desde ${attachmentData.url}`);
        
        const attachmentResponse = await fetch(attachmentData.url, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
          },
        });

        if (attachmentResponse.ok) {
          const blob = await attachmentResponse.blob();
          const file = new File([blob], attachmentData.name, { type: attachmentData["content-type"] });
          attachments.push(file);
          console.log(`Adjunto descargado vía API: ${file.name}, ${file.size} bytes`);
        } else {
          console.error(`Error descargando adjunto ${attachmentData.name}: ${attachmentResponse.status}`);
        }
      }
    } else {
      console.log("El mensaje obtenido de la API no contenía adjuntos.");
    }

    return attachments;

  } catch (error) {
    console.error("Error crítico en getMailgunAttachments:", error);
    return [];
  }
}

// --- Función Principal del Servidor (Edge Function) ---
Deno.serve(async (req) => {
  // Manejo de la petición pre-vuelo (preflight) de CORS.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  console.log("=== WEBHOOK MAILGUN INICIADO ===");

  try {
    // 1. Validar variables de entorno y crear cliente de Supabase.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey || !MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("Faltan variables de entorno críticas (Supabase o Mailgun)");
      return new Response("Configuración del servidor incompleta", { status: 500, headers: corsHeaders });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log("Cliente Supabase creado con Service Role");

    // 2. Parsear la petición entrante según su Content-Type.
    const contentType = req.headers.get("content-type") || "";
    console.log("Content-Type recibido:", contentType);

    let recipient = "";
    let sender = "";
    let subject = "";
    let messageId = "";
    let attachments: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      console.log("Procesando como FormData");
      const formData = await req.formData();
      
      recipient = formData.get("recipient") as string;
      sender = formData.get("sender") as string;
      subject = formData.get("subject") as string || "Sin asunto";
      messageId = formData.get("message-id") as string || "";
      const reportedAttachmentCount = parseInt(formData.get("attachment-count") as string || "0");
      
      for (let i = 1; i <= reportedAttachmentCount; i++) {
        const file = formData.get(`attachment-${i}`) as File;
        if (file) attachments.push(file);
      }
      console.log(`Procesados ${attachments.length} adjuntos desde FormData.`);

    } else if (contentType.includes("application/json") || contentType.includes("application/x-www-form-urlencoded")) {
      let data: Record<string, any>;

      if (contentType.includes("json")) {
        console.log("Procesando como JSON");
        data = await req.json();
      } else {
        console.log("Procesando como URL encoded");
        const text = await req.text();
        data = Object.fromEntries(new URLSearchParams(text));
      }
      
      recipient = data.recipient || "";
      sender = data.sender || "";
      subject = data.subject || "Sin asunto";
      messageId = data["message-id"] || data["Message-Id"] || "";
      const reportedAttachmentCount = parseInt(data["attachment-count"] || "0");

      // Lógica clave: si el webhook informa que hay adjuntos, usar la API para obtenerlos.
      if (reportedAttachmentCount > 0 && data["message-url"]) {
        console.log(`Webhook reporta ${reportedAttachmentCount} adjuntos. Obteniendo vía API...`);
        const messageUrl = data["message-url"];
        const urlParts = messageUrl.split("/");
        const storageKey = urlParts[urlParts.length - 1];
        
        if (storageKey) {
          attachments = await getMailgunAttachments(storageKey);
          console.log(`Se descargaron ${attachments.length} adjuntos reales vía API.`);
        } else {
          console.warn("No se pudo extraer storage key de 'message-url'. No se descargarán adjuntos.");
        }
      } else {
        console.log("El webhook no reporta adjuntos o no incluye 'message-url'.");
      }
      
    } else {
      console.error("Content-Type no soportado:", contentType);
      return new Response("Content-Type no soportado", { status: 400, headers: corsHeaders });
    }
    
    console.log("Email recibido y parseado:", { recipient, sender, subject, attachments: attachments.length, messageId });

    // 3. Validar destinatario y extraer el ID único del restaurante.
    if (!recipient || !recipient.includes("@facturas-restaurantes.brainstormersagency.com")) {
      console.error("Email recipient inválido:", recipient);
      return new Response("Email recipient inválido", { status: 400, headers: corsHeaders });
    }

    const emailPrefix = recipient.split("@")[0];
    const parts = emailPrefix.split(".");
    
    if (parts.length < 2) {
      console.error("Formato de email inválido:", emailPrefix);
      return new Response("Formato de email inválido", { status: 400, headers: corsHeaders });
    }
    
    const uniqueId = parts[parts.length - 1];
    console.log("Unique ID extraído:", uniqueId);

    // 4. Buscar el restaurante en la base de datos.
    const { data: restaurante, error: restauranteError } = await supabaseClient
      .from("restaurantes")
      .select("id, nombre")
      .eq("unique_id", uniqueId)
      .single();

    if (restauranteError || !restaurante) {
      console.error("Restaurante no encontrado:", uniqueId, restauranteError);
      return new Response(`Restaurante no encontrado para unique_id: ${uniqueId}`, { status: 404, headers: corsHeaders });
    }

    console.log("Restaurante identificado:", restaurante.nombre, "ID:", restaurante.id);

    // 5. Si no hay adjuntos, finalizar el proceso.
    if (attachments.length === 0) {
      console.log("Email sin adjuntos procesables, finalizando correctamente.");
      return new Response(JSON.stringify({ success: true, message: "Email recibido sin adjuntos" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 6. Procesar cada adjunto descargado.
    const documentosCreados: any[] = [];
    console.log(`Iniciando procesamiento de ${attachments.length} adjuntos...`);
    
    for (const attachment of attachments) {
      try {
        const { name: fileName, type: fileType, size } = attachment;
        console.log(`Procesando adjunto:`, { fileName, fileType, size });

        if (!fileName || size === 0) {
          console.log("Adjunto ignorado: sin nombre o tamaño cero.");
          continue;
        }

        const isValidFile = fileType?.includes("pdf") || fileType?.includes("image/") ||
          /\.(pdf|jpg|jpeg|png)$/i.test(fileName);

        if (!isValidFile) {
          console.log(`Adjunto ignorado: tipo no válido (${fileType || 'desconocido'})`);
          continue;
        }
        
        // 7. Subir el archivo a Supabase Storage.
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${restaurante.id}/${timestamp}_${cleanFileName}`;
        
        console.log("Subiendo a Storage en:", storagePath);

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from("documentos")
          .upload(storagePath, attachment, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error(`Error subiendo archivo '${fileName}':`, uploadError);
          continue;
        }

        console.log("Archivo subido a Storage:", uploadData.path);

        // 8. Crear el registro del documento en la base de datos.
        const { data: documento, error: documentoError } = await supabaseClient
          .from("documentos")
          .insert({
            restaurante_id: restaurante.id,
            nombre_archivo: fileName,
            url_storage: uploadData.path,
            tipo_archivo: fileType || "application/octet-stream",
            estado: "pending",
            origen: "email_mailgun",
            email_origen: sender,
            email_asunto: subject,
            tamano_archivo: size,
          })
          .select("id")
          .single();

        if (documentoError) {
          console.error(`Error creando registro en BD para '${fileName}':`, documentoError);
          continue;
        }

        console.log("Documento creado en BD:", documento.id);
        documentosCreados.push({ id: documento.id, nombre: fileName, estado: "pending" });

        // 9. Invocar la función de procesamiento de facturas de forma asíncrona.
        console.log("Invocando función 'procesar-factura' para el documento:", documento.id);
        fetch(`${supabaseUrl}/functions/v1/procesar-factura`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ record: { id: documento.id } }),
        }).catch(e => console.error("Error invocando 'procesar-factura':", e));

      } catch (attachmentError) {
        console.error("Error procesando un adjunto:", attachmentError);
      }
    }

    // 10. Enviar respuesta final.
    const responseData = {
      success: true,
      message: `Email procesado. ${documentosCreados.length} documentos creados.`,
      restaurante: restaurante.nombre,
      documentos_procesados: documentosCreados.length,
      documentos: documentosCreados,
    };

    console.log("Webhook completado exitosamente:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error crítico en webhook-mailgun:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
