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

// FUNCIÓN CORREGIDA: Calcular período anterior con zona horaria española
function calcularPeriodoAnterior(fechaInicio: string, fechaFin: string) {
  console.log(`📅 Calculando período anterior para: ${fechaInicio} - ${fechaFin}`);
  
  // Crear fechas en zona horaria local (no UTC) para evitar problemas de medianoche
  const inicio = new Date(fechaInicio + 'T12:00:00'); // Mediodía para evitar problemas de zona horaria
  const fin = new Date(fechaFin + 'T12:00:00');
  
  // Calcular días de diferencia (incluyendo ambos extremos)
  const diasDiferencia = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  console.log(`📊 Días en el período actual: ${diasDiferencia}`);
  
  // DETECCIÓN INTELIGENTE: ¿Es un rango semanal?
  const esSemanal = detectarRangoSemanal(inicio, fin, diasDiferencia);
  
  let inicioAnterior: Date;
  let finAnterior: Date;
  
  if (esSemanal) {
    console.log(`🗓️ Detectado rango SEMANAL - calculando mismos días de semana anterior`);
    // Para rangos semanales: retroceder exactamente 7 días (mismos días de la semana anterior)
    // Si esta semana es Lun-Vie, semana anterior debe ser Lun-Vie también
    inicioAnterior = new Date(inicio.getTime() - 7 * 24 * 60 * 60 * 1000);
    finAnterior = new Date(fin.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`📊 Semana actual: ${inicio.toDateString()} - ${fin.toDateString()}`);
    console.log(`📊 Semana anterior: ${inicioAnterior.toDateString()} - ${finAnterior.toDateString()}`);
  } else {
    console.log(`📅 Rango ESTÁNDAR - aplicando lógica por días consecutivos`);
    // Para otros rangos: lógica estándar
    inicioAnterior = new Date(inicio.getTime() - diasDiferencia * 24 * 60 * 60 * 1000);
    finAnterior = new Date(inicioAnterior.getTime() + (diasDiferencia - 1) * 24 * 60 * 60 * 1000);
  }
  
  const resultado = {
    fecha_inicio_anterior: inicioAnterior.toISOString().split('T')[0],
    fecha_fin_anterior: finAnterior.toISOString().split('T')[0],
    dias_periodo: diasDiferencia
  };
  
  console.log(`📅 Período anterior calculado: ${resultado.fecha_inicio_anterior} - ${resultado.fecha_fin_anterior}`);
  return resultado;
}

// FUNCIÓN AUXILIAR: Detectar si es un rango semanal
function detectarRangoSemanal(inicio: Date, fin: Date, diasDiferencia: number): boolean {
  const inicioDay = inicio.getDay(); // 0=Domingo, 1=Lunes, etc.
  const finDay = fin.getDay();
  
  // Convertir domingo=0 a domingo=7 para facilitar cálculos
  const inicioLunes = inicioDay === 0 ? 7 : inicioDay;
  const finLunes = finDay === 0 ? 7 : finDay;
  
  // Es semanal si:
  // 1. Empieza en Lunes (1) 
  // 2. Tiene entre 4-7 días
  // 3. O es claramente un patrón semanal
  const empiezaEnLunes = inicioLunes === 1;
  const rangoSemanal = diasDiferencia >= 4 && diasDiferencia <= 7;
  
  console.log(`🔍 Detección semanal: inicio=${inicioLunes} (${inicioLunes===1?'Lunes':'No-Lunes'}), días=${diasDiferencia}, rango=${rangoSemanal}`);
  
  return empiezaEnLunes && rangoSemanal;
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

    // =================================================================
    // PASO 1: CREAR VISTA LÓGICA CON DATOS PRIORIZADOS (ANTI-DUPLICADOS)
    // AJUSTE: Para negocios que cierran después de medianoche, extender 1 día
    // =================================================================
    
    // CAMBIO: NO extender fechas en RPC, obtener datos exactos y filtrar después
    const rpc_params = {
      p_restaurante_id: restaurante_id,
      p_fecha_inicio: fecha_inicio,
      p_fecha_fin: fecha_fin
    };
    
    console.log("RPC Params (Current):", rpc_params);

    const { data: ventasData, error: ventasError } = await supabase
      .rpc('get_prioritized_sales_data', rpc_params);
    
    console.log(`📊 DATOS RECIBIDOS - Período actual (${fecha_inicio} a ${fecha_fin}):`);
    console.log(`   - Total registros: ${ventasData?.length || 0}`);
    if (ventasData && ventasData.length > 0) {
      console.log(`   - Fechas encontradas:`, [...new Set(ventasData.map(v => v.fecha_venta))].sort());
      console.log(`   - Sistemas origen:`, [...new Set(ventasData.map(v => v.sistema_origen))]);
    }

    if (ventasError) {
      console.error('Error llamando a RPC get_prioritized_sales_data (current):', ventasError);
      throw new Error('Error obteniendo datos de ventas priorizados');
    }
    
    // =================================================================
    // PASO 2: OBTENER DATOS PRIORIZADOS DEL PERIODO ANTERIOR
    // AJUSTE: También extender el período anterior para ventas nocturnas
    // =================================================================
    
    // CAMBIO: NO extender fechas en RPC, obtener datos exactos del período anterior
    const rpc_params_anterior = {
      p_restaurante_id: restaurante_id,
      p_fecha_inicio: periodoAnterior.fecha_inicio_anterior,
      p_fecha_fin: periodoAnterior.fecha_fin_anterior
    };
    
    console.log("RPC Params (Anterior):", rpc_params_anterior);

    const { data: ventasAnteriorData, error: ventasAnteriorError } = await supabase
      .rpc('get_prioritized_sales_data', rpc_params_anterior);
      
    console.log(`📊 DATOS RECIBIDOS - Período anterior (${periodoAnterior.fecha_inicio_anterior} a ${periodoAnterior.fecha_fin_anterior}):`);
    console.log(`   - Total registros: ${ventasAnteriorData?.length || 0}`);
    if (ventasAnteriorData && ventasAnteriorData.length > 0) {
      console.log(`   - Fechas encontradas:`, [...new Set(ventasAnteriorData.map(v => v.fecha_venta))].sort());
      console.log(`   - Sistemas origen:`, [...new Set(ventasAnteriorData.map(v => v.sistema_origen))]);
    }

    if (ventasAnteriorError) {
      console.error('Error llamando a RPC get_prioritized_sales_data (anterior):', ventasAnteriorError);
      // No lanzar error, puede que no haya datos anteriores
    }

    // Procesar métricas básicas
    let ventasList = ventasData || [];
    let ventasListAnterior = ventasAnteriorData || [];

    // TEMPORALMENTE: NO filtrar, usar datos tal como vienen para diagnosticar
    const ventasOriginales = ventasList.length;
    const ventasAnterioresOriginales = ventasListAnterior.length;
    
    console.log(`🚨 MODO DIAGNÓSTICO - SIN FILTROS:`);
    console.log(`   - Datos actuales: ${ventasList.length} registros`);
    console.log(`   - Datos anteriores: ${ventasListAnterior.length} registros`);
    
    // DIAGNÓSTICO DETALLADO: Mostrar todos los tickets del 22 agosto
    if (fecha_inicio === '2025-08-22' && fecha_fin === '2025-08-22') {
      console.log(`🔍 DETALLE DE TICKETS DEL 22 AGOSTO:`);
      ventasList.forEach((venta, index) => {
        console.log(`   ${index + 1}. ID: ${venta.id_externo} | Ref: ${venta.referencia_externa} | Total: €${venta.total_bruto} | Hora: ${venta.fecha_hora_completa}`);
      });
    }

    console.log(`🕐 ANÁLISIS DE FILTRADO:`);
    console.log(`   - Originales: ${ventasOriginales} actuales, ${ventasAnterioresOriginales} anteriores`);
    console.log(`   - Filtradas: ${ventasList.length} actuales, ${ventasListAnterior.length} anteriores`);
    console.log(`🔍 DESGLOSE DE FILTRADO ACTUAL:`);
    console.log(`   - Período solicitado: ${fecha_inicio} a ${fecha_fin}`);
    console.log(`🔍 DESGLOSE DE FILTRADO ANTERIOR:`);
    console.log(`   - Período anterior: ${periodoAnterior.fecha_inicio_anterior} a ${periodoAnterior.fecha_fin_anterior}`);

    // NUEVO: Todas las consultas ahora usan `ventasList` y `ventasListAnterior` que ya están priorizadas y filtradas.
    
    const totalVentasBruto = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_bruto) || 0), 0)
    const totalVentasNeto = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_neto) || 0), 0)
    const totalImpuestos = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_impuestos) || 0), 0)
    const totalDescuentos = ventasList.reduce((sum, v) => sum + (parseFloat(v.descuentos) || 0), 0)
    const totalPropinas = ventasList.reduce((sum, v) => sum + (parseFloat(v.propinas) || 0), 0)
    const totalComensales = ventasList.reduce((sum, v) => sum + (v.num_comensales || 0), 0)
    const totalTickets = ventasList.length
    const ticketPromedio = totalTickets > 0 ? totalVentasBruto / totalTickets : 0

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
      const ticketPromedioAnterior = totalTicketsAnterior > 0 ? totalVentasBrutoAnterior / totalTicketsAnterior : 0;

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

    // 2. PROCESAR MÉTODOS DE PAGO (Usa ventasList ya filtrado)
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

    // 3. VENTAS POR DÍA (Usa ventasList ya filtrado)
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

    // 4. VENTAS POR HORA (Usa ventasList ya filtrado)
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

    // 5. OBTENER PRODUCTOS Y LÍNEAS DE VENTA (Filtrado por venta_id de ventas priorizadas)
    const ventaIds = ventasList.map(v => v.id);

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
      .in('venta_id', ventaIds) // <-- MODIFICADO: Usar solo IDs de ventas priorizadas

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
        // ✅ USAR LOS DATOS YA CALCULADOS EN LUGAR DE HACER UNA NUEVA CONSULTA
        if (metricas_anteriores) {
          const totalAnterior = metricas_anteriores.total_ventas || 0;
          if (totalAnterior > 0) {
            crecimientoVsAnterior = ((totalVentasNeto - totalAnterior) / totalAnterior) * 100;
            console.log(`📈 Crecimiento calculado: ${totalVentasNeto} vs ${totalAnterior} = ${crecimientoVsAnterior.toFixed(2)}%`);
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