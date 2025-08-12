import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuración de la API de Google Document AI
const GOOGLE_CLOUD_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GOOGLE_PROJECT_ID = 'tu-proyecto-gcp' // Reemplazar
const GOOGLE_LOCATION = 'us' // Reemplazar
const GOOGLE_PROCESSOR_ID = 'tu-processor-id' // Reemplazar
const GOOGLE_API_ENDPOINT = `https://documentai.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/processors/${GOOGLE_PROCESSOR_ID}:process`

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Obtener la información del archivo que activó la función
    const { record: newFile } = await req.json()
    const filePath = newFile.path_tokens.join('/') // Ej: 'public/documentos/restaurante-uuid/archivo.pdf'
    const documentId = newFile.name // Asumimos que el nombre del objeto es el ID del documento

    // 2. Actualizar el estado del documento a "processing"
    await supabaseClient
      .from('documentos')
      .update({ estado: 'processing', fecha_procesamiento: new Date().toISOString() })
      .eq('id', documentId)

    // 3. Descargar el contenido del archivo desde Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('documentos') // Nombre de tu bucket
      .download(filePath)

    if (downloadError) throw downloadError

    const fileContent = await fileData.arrayBuffer()
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileContent)))

    // 4. Llamar a la API de Google Document AI de forma segura
    const googleAiResponse = await fetch(GOOGLE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_CLOUD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64File,
          mimeType: 'application/pdf', // O el tipo de archivo correspondiente
        },
      }),
    })

    if (!googleAiResponse.ok) {
      throw new Error(`Error en Google Document AI: ${await googleAiResponse.text()}`)
    }

    const extractedResult = await googleAiResponse.json()
    const documentText = extractedResult.document.text

    // 5. Procesar la respuesta y extraer los campos que necesitas
    //    (Aquí implementarías la lógica de tu NERExtractor del archivo ocr.txt) [cite: 21]
    const extractedData = {
      proveedor_nombre: 'Proveedor Extraído con IA', // Ejemplo
      proveedor_cif: 'CIF Extraído con IA', // Ejemplo
      numero_factura: 'FAC-123-IA', // Ejemplo
      fecha_factura: new Date().toISOString(), // Ejemplo
      total_factura: 121.00, // Ejemplo
      confianza_global: 0.95, // Ejemplo
      // ... más campos de tu tabla 'datos_extraidos_facturas' [cite: 97]
    }

    // 6. Guardar los datos extraídos en la base de datos
    await supabaseClient
      .from('datos_extraidos_facturas') // Nombre de tu tabla de facturas [cite: 97]
      .insert({
        documento_id: documentId,
        restaurante_id: newFile.owner, // El owner del archivo debería ser el restaurante_id
        ...extractedData,
      })

    // 7. Actualizar el estado final del documento a "processed"
    await supabaseClient
      .from('documentos')
      .update({ estado: 'processed' })
      .eq('id', documentId)

    return new Response(JSON.stringify({ success: true, documentId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error en la Edge Function:', error)
    // Opcional: Actualizar el estado a 'error' en la base de datos
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})