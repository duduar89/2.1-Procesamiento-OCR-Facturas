import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../shared/cors.ts'

interface PopularityRequest {
  restaurante_id: string
  fecha_inicio: string
  fecha_fin: string
}

interface ProductPopularity {
  producto_nombre: string
  tickets_unicos: number
  unidades_totales: number
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { restaurante_id, fecha_inicio, fecha_fin }: PopularityRequest = await req.json()

    if (!restaurante_id || !fecha_inicio || !fecha_fin) {
      throw new Error('Faltan parámetros requeridos: restaurante_id, fecha_inicio, fecha_fin')
    }

    console.log(`🎯 Obteniendo popularidad real para restaurante: ${restaurante_id}`)
    console.log(`📅 Período: ${fecha_inicio} hasta ${fecha_fin}`)

    // Consultar popularidad usando función existente + consulta directa
    console.log('🔍 Usando consulta directa a ventas_lineas...')
    
    // Primero obtener IDs de ventas válidas para el restaurante y período
    const { data: ventasValidas, error: ventasError } = await supabase
      .rpc('get_prioritized_sales_data', {
        p_restaurante_id: restaurante_id,
        p_fecha_inicio: fecha_inicio,
        p_fecha_fin: fecha_fin
      })
    
    if (ventasError) {
      console.error('❌ Error obteniendo ventas válidas:', ventasError)
      throw new Error(`Error en consulta de ventas: ${ventasError.message}`)
    }
    
    const ventasIds = ventasValidas?.map((v: any) => v.id) || []
    console.log(`🎫 IDs de ventas válidas: ${ventasIds.length}`)
    
    if (ventasIds.length === 0) {
      console.log('⚠️ No hay ventas para el período especificado')
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          total_productos: 0,
          periodo: { fecha_inicio, fecha_fin }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Ahora consultar líneas de productos para esas ventas
    const { data: popularityData, error } = await supabase
      .from('ventas_lineas')
      .select(`
        producto_nombre,
        venta_id,
        cantidad
      `)
      .in('venta_id', ventasIds)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)
      .order('producto_nombre')

    if (error) {
      console.error('❌ Error obteniendo popularidad:', error)
      throw new Error(`Error en consulta de popularidad: ${error.message}`)
    }

    console.log(`📋 Datos raw obtenidos: ${popularityData?.length || 0} líneas`)
    
    // Procesar datos para calcular popularidad
    const productStats = new Map<string, { tickets: Set<string>, unidades: number }>()
    
    if (popularityData) {
      popularityData.forEach((line: any) => {
        const { producto_nombre, venta_id, cantidad } = line
        
        if (!productStats.has(producto_nombre)) {
          productStats.set(producto_nombre, {
            tickets: new Set(),
            unidades: 0
          })
        }
        
        const stats = productStats.get(producto_nombre)!
        stats.tickets.add(venta_id)
        stats.unidades += parseFloat(cantidad || 0)
      })
    }
    
    // Convertir a formato de salida
    const popularityResults: ProductPopularity[] = Array.from(productStats.entries())
      .map(([producto_nombre, stats]) => ({
        producto_nombre,
        tickets_unicos: stats.tickets.size,
        unidades_totales: stats.unidades
      }))
      .sort((a, b) => b.tickets_unicos - a.tickets_unicos)
    
    console.log(`✅ Popularidad calculada para ${popularityResults.length} productos`)
    
    // Log de algunos ejemplos
    if (popularityResults.length > 0) {
      console.log('📊 Top 5 productos por popularidad:')
      popularityResults.slice(0, 5).forEach(p => {
        console.log(`   ${p.producto_nombre}: ${p.unidades_totales} unidades en ${p.tickets_unicos} tickets únicos`)
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: popularityResults,
        total_productos: popularityResults.length,
        periodo: { fecha_inicio, fecha_fin }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error general en get-product-popularity:', error)
    
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
