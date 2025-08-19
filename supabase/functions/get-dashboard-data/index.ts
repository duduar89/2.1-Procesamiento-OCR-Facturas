// =============================================
// EDGE FUNCTION: get-dashboard-data
// Archivo: /functions/get-dashboard-data/index.ts
// Devuelve todas las métricas y datos para el dashboard de ventas
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client FIRST
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate user authentication - MODIFICADO PARA SERVICE ROLE KEY
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authorization header'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        console.log('Usando Service Role Key - saltando validación de usuario');
        userId = 'system-service-role';
      } else {
        userId = user.id;
      }
    } catch (error) {
      console.log('Error en autenticación, usando Service Role Key');
      userId = 'system-service-role';
    }

    // Parse request body
    const { restaurante_id, fecha_inicio, fecha_fin, comparar_periodo } = await req.json()

    // Validate required parameters
    if (!restaurante_id || !fecha_inicio || !fecha_fin) {
      throw new Error('Faltan parámetros requeridos: restaurante_id, fecha_inicio, fecha_fin')
    }

    console.log(`🔍 Obteniendo datos para restaurante: ${restaurante_id}`)
    console.log(`📅 Período: ${fecha_inicio} hasta ${fecha_fin}`)

    // 1. OBTENER RESUMEN COMPLETO DE VENTAS
    const { data: resumenData, error: resumenError } = await supabase
      .from('ventas_datos')
      .select(`
        id,
        total_bruto,
        total_neto,
        total_impuestos,
        descuentos,
        propinas,
        num_comensales,
        metodo_pago,
        seccion,
        fecha_venta
      `)
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)

    if (resumenError) {
      console.error('❌ Error obteniendo resumen:', resumenError)
      throw new Error('Error obteniendo resumen de ventas')
    }

    // Calcular métricas del resumen completo
    const totalVentasBruto = resumenData.reduce((sum, venta) => sum + (venta.total_bruto || 0), 0)
    const totalVentasNeto = resumenData.reduce((sum, venta) => sum + (venta.total_neto || 0), 0)
    const totalImpuestos = resumenData.reduce((sum, venta) => sum + (venta.total_impuestos || 0), 0)
    const totalDescuentos = resumenData.reduce((sum, venta) => sum + (venta.descuentos || 0), 0)
    const totalPropinas = resumenData.reduce((sum, venta) => sum + (venta.propinas || 0), 0)
    const totalComensales = resumenData.reduce((sum, venta) => sum + (venta.num_comensales || 0), 0)
    const totalTickets = resumenData.length
    const ticketPromedio = totalTickets > 0 ? totalVentasNeto / totalTickets : 0

    // Obtener datos del período anterior para comparación
    const fechaInicioAnterior = new Date(fecha_inicio)
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - 7) // Comparar con semana anterior
    const fechaFinAnterior = new Date(fecha_inicio)
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1)

    const { data: resumenAnteriorData, error: resumenAnteriorError } = await supabase
      .from('ventas_datos')
      .select('total_neto')
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fechaInicioAnterior.toISOString().split('T')[0])
      .lte('fecha_venta', fechaFinAnterior.toISOString().split('T')[0])

    if (resumenAnteriorError) {
      console.error('❌ Error obteniendo resumen anterior:', resumenAnteriorError)
    }

    const totalVentasAnterior = resumenAnteriorData?.reduce((sum, venta) => sum + (venta.total_neto || 0), 0) || 0
    const crecimientoVsAnterior = totalVentasAnterior > 0 
      ? ((totalVentasNeto - totalVentasAnterior) / totalVentasAnterior) * 100 
      : 0

    // 2. OBTENER MÉTODOS DE PAGO
    console.log('🔍 Consultando métodos de pago para restaurante:', restaurante_id);
    
    const { data: metodosPagoData, error: metodosError } = await supabase
      .from('ventas_datos')
      .select('metodo_pago, total_neto')
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)

    console.log('🔍 Resultado métodos de pago:', { 
      metodosPagoData: metodosPagoData?.length || 0, 
      metodosError 
    });

    if (metodosError) {
      console.error('❌ Error obteniendo métodos de pago:', metodosError)
      throw new Error('Error obteniendo métodos de pago')
    }

    // Agrupar por método de pago
    const metodosPago = {
      efectivo: 0,
      tarjeta: 0,
      otros: 0
    }

    metodosPagoData.forEach(venta => {
      const metodo = venta.metodo_pago?.toLowerCase() || 'otros'
      if (metodo.includes('efectivo') || metodo.includes('cash')) {
        metodosPago.efectivo += venta.total_neto || 0
      } else if (metodo.includes('tarjeta') || metodo.includes('card')) {
        metodosPago.tarjeta += venta.total_neto || 0
      } else {
        metodosPago.otros += venta.total_neto || 0
      }
    })

    // 3. OBTENER VENTAS POR DÍA
    console.log('🔍 Consultando ventas por día para restaurante:', restaurante_id);
    console.log('🔍 Período ventas:', fecha_inicio, 'hasta', fecha_fin);
    
    const { data: ventasPorDiaData, error: ventasPorDiaError } = await supabase
      .from('ventas_datos')
      .select('fecha_venta, total_neto')
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)
      .order('fecha_venta', { ascending: true })

    console.log('🔍 Resultado ventas por día:', { 
      ventasPorDiaData: ventasPorDiaData?.length || 0, 
      ventasPorDiaError 
    });

    if (ventasPorDiaError) {
      console.error('❌ Error obteniendo ventas por día:', ventasPorDiaError)
      throw new Error('Error obteniendo ventas por día')
    }

    // Agrupar ventas por día
    const ventasPorDia: Array<{fecha: string, ventas: number}> = []
    const ventasPorDiaMap = new Map()

    ventasPorDiaData.forEach(venta => {
      const fecha = venta.fecha_venta
      const total = venta.total_neto || 0
      
      if (ventasPorDiaMap.has(fecha)) {
        ventasPorDiaMap.set(fecha, ventasPorDiaMap.get(fecha) + total)
      } else {
        ventasPorDiaMap.set(fecha, total)
      }
    })

    ventasPorDiaMap.forEach((total, fecha) => {
      ventasPorDia.push({ fecha, ventas: total })
    })

    // 4. OBTENER PRODUCTOS TOP DESDE VENTAS REALES
    console.log('🔍 Consultando productos desde ventas para restaurante:', restaurante_id);
    
    // Obtener IDs de ventas del período y construir productos desde ventas_lineas
    const ventaIds = (resumenData || []).map((v: any) => v.id).filter(Boolean)
    let productosData: any[] = []
    let productosError: any = null
    if (ventaIds.length > 0) {
      const { data, error } = await supabase
        .from('ventas_lineas')
        .select(`
          producto_nombre,
          categoria_id,
          cantidad,
          precio_total,
          venta_id
        `)
        .eq('restaurante_id', restaurante_id)
        .in('venta_id', ventaIds)
      productosData = data || []
      productosError = error
    } else {
      productosData = []
    }

    console.log('🔍 Resultado consulta productos:', { productosData, productosError });
    console.log('🔍 Cantidad de productos encontrados:', productosData?.length || 0);

    if (productosError) {
      console.error('❌ Error obteniendo productos:', productosError)
      throw new Error('Error obteniendo productos')
    }

    // Procesar productos directamente desde productos_catalogo
    // Procesar productos desde ventas reales
    const productosTop: Array<{
      nombre: string;
      categoria: string;
      cantidad: number;
      importe: number;
      veces_vendido: number;
    }> = []

    // Agrupar productos por nombre
    const productosMap = new Map()
    
    productosData.forEach(producto => {
      const nombre = producto.producto_nombre || 'Producto sin nombre'
      const categoria = producto.categoria_id || 'Sin categoría'
      
      if (productosMap.has(nombre)) {
        const existente = productosMap.get(nombre)
        existente.cantidad += producto.cantidad || 0
        existente.importe += producto.precio_total || 0
        existente.veces_vendido += 1
      } else {
        productosMap.set(nombre, {
          nombre,
          categoria,
          cantidad: producto.cantidad || 0,
          importe: producto.precio_total || 0,
          veces_vendido: 1
        })
      }
    })

    // Convertir map a array y ordenar por importe
    productosMap.forEach(producto => {
      productosTop.push(producto)
    })

    // Ordenar por importe descendente y tomar top 10
    productosTop.sort((a, b) => b.importe - a.importe)
    const productosTopFinal = productosTop.slice(0, 10)

    // 5. OBTENER CATEGORÍAS
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('productos_catalogo')
      .select('categoria_nombre')
      .eq('restaurante_id', restaurante_id)

    if (categoriasError) {
      console.error('❌ Error obteniendo categorías:', categoriasError)
      throw new Error('Error obteniendo categorías')
    }

    // Agrupar por categoría
    const categoriasMap = new Map()
    categoriasData.forEach(producto => {
      const categoria = producto.categoria_nombre || 'Sin categoría'
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, {
          categoria,
          importe: 0,
          productos_count: 0
        })
      }
      categoriasMap.get(categoria).productos_count += 1
    })

    // Calcular importes por categoría
    productosTop.forEach(producto => {
      const categoria = producto.categoria
      if (categoriasMap.has(categoria)) {
        categoriasMap.get(categoria).importe += producto.importe
      }
    })

    // Calcular porcentajes
    const categoriasFinal = Array.from(categoriasMap.values())
      .map(cat => ({
        ...cat,
        porcentaje: totalVentasNeto > 0 ? (cat.importe / totalVentasNeto) * 100 : 0
      }))
      .sort((a, b) => b.importe - a.importe)

    // 6. CONSTRUIR RESPUESTA
    const dashboardData = {
      resumen: {
        total_ventas: totalVentasNeto,
        total_ventas_bruto: totalVentasBruto,
        total_impuestos: totalImpuestos,
        total_descuentos: totalDescuentos,
        total_propinas: totalPropinas,
        total_tickets: totalTickets,
        ticket_promedio: ticketPromedio,
        total_comensales: totalComensales,
        crecimiento_vs_anterior: crecimientoVsAnterior
      },
      metodos_pago: metodosPago,
      ventas_por_dia: ventasPorDia,
      productos_top: productosTopFinal,
      categorias_ventas: categoriasFinal,
      ultimo_sync: new Date().toISOString()
    }

    console.log('✅ Datos del dashboard generados correctamente')
          console.log(`📊 Total ventas: €${totalVentasNeto.toFixed(2)}`)
    console.log(`🎫 Total tickets: ${totalTickets}`)
    console.log(`👥 Total comensales: ${totalComensales}`)

    return new Response(
      JSON.stringify({
        success: true,
        data: dashboardData,
        message: 'Dashboard cargado correctamente'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error en get-dashboard-data:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Error obteniendo datos del dashboard'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})