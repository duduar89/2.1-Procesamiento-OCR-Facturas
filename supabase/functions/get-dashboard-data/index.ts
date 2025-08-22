// =============================================
// EDGE FUNCTION: get-dashboard-data CORREGIDA
// Soluciona problemas de consultas, joins y procesamiento de datos
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AGREGAR esta función al inicio del archivo, después de los imports
function calcularPeriodoAnterior(fechaInicio: string, fechaFin: string) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  // Calcular días de diferencia
  const diasDiferencia = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calcular período anterior
  const finAnterior = new Date(inicio.getTime() - 24 * 60 * 60 * 1000);
  const inicioAnterior = new Date(finAnterior.getTime() - (diasDiferencia - 1) * 24 * 60 * 60 * 1000);
  
  return {
    fecha_inicio_anterior: inicioAnterior.toISOString().split('T')[0],
    fecha_fin_anterior: finAnterior.toISOString().split('T')[0],
    dias_periodo: diasDiferencia
  };
}

// NUEVA FUNCIÓN: Obtener mapeo de categorías
async function obtenerCategoriasMap(supabase: any, restauranteId: string) {
  const { data: categorias } = await supabase
    .from('productos_catalogo')
    .select('categoria_id, categoria_nombre')
    .eq('restaurante_id', restauranteId)
    .not('categoria_nombre', 'is', null);
    
  const map = new Map();
  categorias?.forEach(cat => {
    if (cat.categoria_nombre && cat.categoria_id) {
      map.set(cat.categoria_id, cat.categoria_nombre);
    }
  });
  return map;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { restaurante_id, fecha_inicio, fecha_fin, tipo_rango } = await req.json()

    if (!restaurante_id || !fecha_inicio || !fecha_fin) {
      throw new Error('Faltan parámetros requeridos: restaurante_id, fecha_inicio, fecha_fin')
    }

    console.log(`Obteniendo datos para restaurante: ${restaurante_id}`)
    console.log(`Período: ${fecha_inicio} hasta ${fecha_fin}`)

    // NUEVO: Todas las consultas serán comparativas
    const siempreComparativo = true;
    const tipoRango = tipo_rango || 'custom';
    console.log(`Modo comparativo activado para rango: ${tipoRango}`);

    // Calcular período anterior
    const periodoAnterior = calcularPeriodoAnterior(fecha_inicio, fecha_fin);
    console.log(`Período anterior: ${periodoAnterior.fecha_inicio_anterior} hasta ${periodoAnterior.fecha_fin_anterior}`);

    // 1. OBTENER RESUMEN DE VENTAS
    const { data: ventasData, error: ventasError } = await supabase
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
        fecha_venta,
        fecha_hora_completa
      `)
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)

    if (ventasError) {
      console.error('Error obteniendo ventas:', ventasError)
      throw new Error('Error obteniendo datos de ventas')
    }

    // Procesar métricas básicas
    const ventasList = ventasData || []

    // NUEVO: Siempre obtener datos del período anterior
    let ventasDataAnterior: any = null;
    let ventasListAnterior: any[] = [];

    console.log(`Obteniendo datos del período anterior: ${periodoAnterior.fecha_inicio_anterior} - ${periodoAnterior.fecha_fin_anterior}`);

    const { data: ventasAnteriorData, error: ventasAnteriorError } = await supabase
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
        fecha_venta,
        fecha_hora_completa
      `)
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', periodoAnterior.fecha_inicio_anterior)
      .lte('fecha_venta', periodoAnterior.fecha_fin_anterior);

    if (!ventasAnteriorError) {
      ventasDataAnterior = ventasAnteriorData;
      ventasListAnterior = ventasAnteriorData || [];
      console.log(`Datos del período anterior obtenidos: ${ventasListAnterior.length} ventas`);
    } else {
      console.error('Error obteniendo ventas del período anterior:', ventasAnteriorError);
    }

    const totalVentasBruto = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_bruto) || 0), 0)
    const totalVentasNeto = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_neto) || 0), 0)
    const totalImpuestos = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_impuestos) || 0), 0)
    const totalDescuentos = ventasList.reduce((sum, v) => sum + (parseFloat(v.descuentos) || 0), 0)
    const totalPropinas = ventasList.reduce((sum, v) => sum + (parseFloat(v.propinas) || 0), 0)
    const totalComensales = ventasList.reduce((sum, v) => sum + (v.num_comensales || 0), 0)
    const totalTickets = ventasList.length
    const ticketPromedio = totalTickets > 0 ? totalVentasNeto / totalTickets : 0

    // NUEVO: Calcular métricas del período anterior
    let metricas_anteriores: any = null;

    if (ventasListAnterior.length > 0) {
      // Calcular métricas del período anterior
      const totalVentasNetoAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.total_neto) || 0), 0);
      const totalVentasBrutoAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.total_bruto) || 0), 0);
      const totalImpuestosAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.total_impuestos) || 0), 0);
      const totalDescuentosAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.descuentos) || 0), 0);
      const totalPropinasAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.propinas) || 0), 0);
      const totalComensalesAnterior = ventasListAnterior.reduce((sum, v) => sum + (v.num_comensales || 0), 0);
      const totalTicketsAnterior = ventasListAnterior.length;
      const ticketPromedioAnterior = totalTicketsAnterior > 0 ? totalVentasNetoAnterior / totalTicketsAnterior : 0;

      metricas_anteriores = {
        total_ventas: totalVentasNetoAnterior,
        total_ventas_bruto: totalVentasBrutoAnterior,
        total_impuestos: totalImpuestosAnterior,
        total_descuentos: totalDescuentosAnterior,
        total_propinas: totalPropinasAnterior,
        total_tickets: totalTicketsAnterior,
        ticket_promedio: ticketPromedioAnterior,
        total_comensales: totalComensalesAnterior
      };

      console.log('Métricas del período anterior calculadas:', metricas_anteriores);
    }

    // Calcular comparativas
    let comparativas = null;

    if (siempreComparativo && metricas_anteriores) {
      const calcularCambio = (actual, anterior) => {
        if (anterior === 0) return actual > 0 ? 100 : 0;
        return ((actual - anterior) / anterior) * 100;
      };

      comparativas = {
        total_ventas: {
          actual: totalVentasNeto,
          anterior: metricas_anteriores.total_ventas,
          cambio_pct: calcularCambio(totalVentasNeto, metricas_anteriores.total_ventas)
        },
        total_ventas_bruto: {
          actual: totalVentasBruto,
          anterior: metricas_anteriores.total_ventas_bruto,
          cambio_pct: calcularCambio(totalVentasBruto, metricas_anteriores.total_ventas_bruto)
        },
        total_tickets: {
          actual: totalTickets,
          anterior: metricas_anteriores.total_tickets,
          cambio_pct: calcularCambio(totalTickets, metricas_anteriores.total_tickets)
        },
        ticket_promedio: {
          actual: ticketPromedio,
          anterior: metricas_anteriores.ticket_promedio,
          cambio_pct: calcularCambio(ticketPromedio, metricas_anteriores.ticket_promedio)
        },
        total_comensales: {
          actual: totalComensales,
          anterior: metricas_anteriores.total_comensales,
          cambio_pct: calcularCambio(totalComensales, metricas_anteriores.total_comensales)
        },
        total_impuestos: {
          actual: totalImpuestos,
          anterior: metricas_anteriores.total_impuestos,
          cambio_pct: calcularCambio(totalImpuestos, metricas_anteriores.total_impuestos)
        },
        total_descuentos: {
          actual: totalDescuentos,
          anterior: metricas_anteriores.total_descuentos,
          cambio_pct: calcularCambio(totalDescuentos, metricas_anteriores.total_descuentos)
        },
        total_propinas: {
          actual: totalPropinas,
          anterior: metricas_anteriores.total_propinas,
          cambio_pct: calcularCambio(totalPropinas, metricas_anteriores.total_propinas)
        }
      };

      console.log('Comparativas calculadas:', comparativas);
    }

    // 2. PROCESAR MÉTODOS DE PAGO
    const metodosPago = {
      efectivo: 0,
      tarjeta: 0,
      otros: 0
    }

    ventasList.forEach(venta => {
      const metodo = (venta.metodo_pago || '').toLowerCase()
      const total = parseFloat(venta.total_neto) || 0
      
      if (metodo.includes(',')) {
        // Método mixto: "Efectivo:66.90, Tarjeta:13.50"
        const partes = metodo.split(',')
        partes.forEach(parte => {
          const [tipo, monto] = parte.split(':')
          const montoNum = parseFloat(monto) || 0
          if (tipo.trim().includes('efectivo')) {
            metodosPago.efectivo += montoNum
          } else if (tipo.trim().includes('tarjeta')) {
            metodosPago.tarjeta += montoNum
          } else {
            metodosPago.otros += montoNum
          }
        })
      } else {
        // Método único
        if (metodo.includes('efectivo') || metodo.includes('cash')) {
          metodosPago.efectivo += total
        } else if (metodo.includes('tarjeta') || metodo.includes('card')) {
          metodosPago.tarjeta += total
        } else {
          metodosPago.otros += total
        }
      }
    })

    // 3. VENTAS POR DÍA
    const ventasPorDiaMap = new Map()
    ventasList.forEach(venta => {
      const fecha = venta.fecha_venta
      const total = parseFloat(venta.total_neto) || 0
      
      ventasPorDiaMap.set(fecha, (ventasPorDiaMap.get(fecha) || 0) + total)
    })

    const ventasPorDia = Array.from(ventasPorDiaMap, ([fecha, ventas]) => ({
      fecha,
      ventas
    })).sort((a, b) => a.fecha.localeCompare(b.fecha))

    // 4. VENTAS POR HORA
    const ventasPorHoraMap = new Map()
    
    ventasList.forEach(venta => {
      if (venta.fecha_hora_completa) {
        try {
          const fechaHora = new Date(venta.fecha_hora_completa)
          const hora = fechaHora.getHours()
          const total = parseFloat(venta.total_neto) || 0
          
          if (!ventasPorHoraMap.has(hora)) {
            ventasPorHoraMap.set(hora, {
              hora,
              hora_formato: `${hora.toString().padStart(2, '0')}:00`,
              ventas: 0,
              cantidad_tickets: 0
            })
          }
          
          const horaData = ventasPorHoraMap.get(hora)
          horaData.ventas += total
          horaData.cantidad_tickets += 1
        } catch (error) {
          console.warn('Error procesando fecha_hora_completa:', venta.fecha_hora_completa)
        }
      }
    })

    const ventasPorHora = Array.from(ventasPorHoraMap.values())
      .sort((a, b) => a.hora - b.hora)

    // 5. OBTENER PRODUCTOS Y LÍNEAS DE VENTA
    const { data: lineasData, error: lineasError } = await supabase
      .from('ventas_lineas')
      .select(`
        producto_nombre,
        categoria_id,
        categoria_nombre,
        cantidad,
        precio_total,
        venta_id
      `)
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)

    if (lineasError) {
      console.error('Error obteniendo líneas de venta:', lineasError)
      // Continuar sin productos si hay error
    }

    // 6. PROCESAR PRODUCTOS TOP
    const productosMap = new Map()
    const lineasList = lineasData || []
    
    // ✅ NUEVO: Obtener mapeo de categorías
    const categoriasCatalogoMap = await obtenerCategoriasMap(supabase, restaurante_id);

    lineasList.forEach(linea => {
      const nombre = linea.producto_nombre || 'Sin nombre'
      let categoria = 'Sin categoría'
      
      // Prioridad: 1) categoria_nombre, 2) mapeo desde productos, 3) default
      if (linea.categoria_nombre && linea.categoria_nombre.trim() !== '') {
        categoria = linea.categoria_nombre
      } else if (linea.categoria_id && categoriasCatalogoMap.has(linea.categoria_id)) {
        categoria = categoriasCatalogoMap.get(linea.categoria_id) // ✅ "BEBIDAS" en lugar de "Categoría 55564"
      }
      
      const cantidad = parseFloat(linea.cantidad) || 0
      const importe = parseFloat(linea.precio_total) || 0
      
      if (productosMap.has(nombre)) {
        const existente = productosMap.get(nombre)
        existente.cantidad += cantidad
        existente.importe += importe
        existente.veces_vendido += 1
      } else {
        productosMap.set(nombre, {
          nombre,
          categoria,
          cantidad,
          importe,
          veces_vendido: 1
        })
      }
    })

    const productosTop = Array.from(productosMap.values())
      .sort((a, b) => b.importe - a.importe)

    // 7. PROCESAR CATEGORÍAS
    const categoriasMap = new Map()
    
    productosTop.forEach(producto => {
      const categoria = producto.categoria
      
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, {
          categoria,
          importe: 0,
          productos_count: 0
        })
      }
      
      if (producto.importe > 0) { // Solo contar productos con ventas
        const catData = categoriasMap.get(categoria)
        catData.importe += producto.importe
        catData.productos_count += 1
      }
    })

    const categoriasFinal = Array.from(categoriasMap.values())
      .filter(cat => cat.importe > 0) // Solo categorías con ventas
      .map(cat => ({
        ...cat,
        porcentaje: totalVentasNeto > 0 ? (cat.importe / totalVentasNeto) * 100 : 0
      }))
      .sort((a, b) => b.importe - a.importe)

    // 8. CALCULAR CRECIMIENTO VS PERÍODO ANTERIOR
    let crecimientoVsAnterior = 0
    if (siempreComparativo) {
      try {
        const diasRango = Math.ceil((new Date(fecha_fin).getTime() - new Date(fecha_inicio).getTime()) / (1000 * 60 * 60 * 24))
        const fechaInicioAnterior = new Date(new Date(fecha_inicio).getTime() - diasRango * 24 * 60 * 60 * 1000)
        const fechaFinAnterior = new Date(new Date(fecha_inicio).getTime() - 24 * 60 * 60 * 1000)

        const { data: ventasAnteriores } = await supabase
          .from('ventas_datos')
          .select('total_neto')
          .eq('restaurante_id', restaurante_id)
          .gte('fecha_venta', fechaInicioAnterior.toISOString().split('T')[0])
          .lte('fecha_venta', fechaFinAnterior.toISOString().split('T')[0])

        if (ventasAnteriores && ventasAnteriores.length > 0) {
          const totalAnterior = ventasAnteriores.reduce((sum, v) => sum + (parseFloat(v.total_neto) || 0), 0)
          if (totalAnterior > 0) {
            crecimientoVsAnterior = ((totalVentasNeto - totalAnterior) / totalAnterior) * 100
          }
        }
      } catch (error) {
        console.warn('Error calculando crecimiento vs período anterior:', error)
      }
    }

    // 9. CONSTRUIR RESPUESTA
    const dashboardData = {
      // Mantener estructura existente
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
      ventas_por_hora: ventasPorHora,
      productos_top: productosTop,
      categorias_ventas: categoriasFinal,
      ultimo_sync: new Date().toISOString(),
      stats: {
        ventas_procesadas: ventasList.length,
        lineas_procesadas: lineasList.length,
        productos_unicos: productosTop.length,
        categorias_encontradas: categoriasFinal.length
      },
      
      // CAMPOS COMPARATIVOS ACTUALIZADOS:
      es_comparativo: siempreComparativo,
      tipo_rango: tipoRango,
      periodo_anterior: {
        fecha_inicio: periodoAnterior.fecha_inicio_anterior,
        fecha_fin: periodoAnterior.fecha_fin_anterior,
        dias_periodo: periodoAnterior.dias_periodo
      },
      metricas_anteriores: metricas_anteriores,
      comparativas: comparativas
    }

    console.log('Datos del dashboard generados correctamente')
    console.log(`Total ventas: €${totalVentasNeto.toFixed(2)}`)
    console.log(`Total tickets: ${totalTickets}`)
    console.log(`Productos únicos: ${productosTop.length}`)
    console.log(`Líneas procesadas: ${lineasList.length}`)

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
    console.error('Error en get-dashboard-data:', error)
    
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