import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../shared/cors.ts'

interface Ticket {
  id: number
  id_externo?: string
  fecha_hora_completa: string
  fecha_venta: string
  tpv_id?: string
  tpv_nombre?: string
  total_neto: number
  metodo_pago: string
  num_lineas?: number
  sistema_origen?: string
  restaurante_id: number
  total_bruto?: number
  total_impuestos?: number
  descuentos?: number
  propinas?: number
  num_comensales?: number
  seccion?: string
}

interface RequestBody {
  restaurante_id: string | number
  limit?: number
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Método no permitido. Solo se permite POST.' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variables de entorno faltantes')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuración del servidor incompleta' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parsear body de la request
    const body: RequestBody = await req.json()
    
    if (!body.restaurante_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'restaurante_id es requerido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const limit = body.limit || 5
    const restauranteId = body.restaurante_id

    console.log(`🔍 Buscando últimos ${limit} tickets para restaurante ${restauranteId}`)

    // Consultar últimos tickets sincronizados
    const { data: tickets, error } = await supabase
      .from('ventas_datos')
      .select(`
        id,
        fecha_hora_completa,
        fecha_venta,
        total_neto,
        metodo_pago,
        restaurante_id,
        total_bruto,
        total_impuestos,
        descuentos,
        propinas,
        num_comensales,
        seccion
      `)
      .eq('restaurante_id', restauranteId)
      .order('fecha_hora_completa', { ascending: false })
      .order('fecha_venta', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error consultando tickets:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error en la base de datos: ${error.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Encontrados ${tickets?.length || 0} tickets`)

    // Retornar respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        data: tickets || [],
        count: tickets?.length || 0,
        message: `Se encontraron ${tickets?.length || 0} tickets`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error general en get-latest-tickets:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error interno del servidor: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})