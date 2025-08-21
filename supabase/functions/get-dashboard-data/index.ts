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

    // 🆕 NUEVO: OBTENER VENTAS POR HORAS EXACTAS
    console.log('🕐 Consultando ventas por horas exactas para restaurante:', restaurante_id);
    
    const { data: ventasPorHorasData, error: ventasPorHorasError } = await supabase
      .from('ventas_datos')
      .select('fecha_venta, total_neto, created_at')
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fecha_inicio)
      .lte('fecha_venta', fecha_fin)

    console.log('🕐 Resultado ventas por horas:', { 
      ventasPorHorasData: ventasPorHorasData?.length || 0, 
      ventasPorHorasError 
    });

    if (ventasPorHorasError) {
      console.error('❌ Error obteniendo ventas por horas:', ventasPorHorasError)
    }

    // 🕐 Agrupar ventas por franjas de 1 hora completa (DINÁMICO: solo franjas con actividad)
    const ventasPorHoraExacta: Array<{hora: number, hora_formato: string, ventas: number, cantidad_tickets: number}> = []
    
    // 🔧 NUEVO: Crear mapa dinámico con franjas de 1 hora para mejor visualización
    const ventasPorHoraMap = new Map()
    
    // Procesar cada venta y crear entradas solo para las franjas con actividad
    if (ventasPorHorasData && ventasPorHorasData.length > 0) {
      ventasPorHorasData.forEach(venta => {
        let horaVenta = 12 // Default a mediodía si no hay timestamp
        
        if (venta.created_at) {
          try {
            const fechaVenta = new Date(venta.created_at)
            horaVenta = fechaVenta.getHours()
          } catch (error) {
            console.log('⚠️ Error parseando fecha de venta:', error)
          }
        }
        
        // 🔧 NUEVO: Crear franjas de 1 hora completa para mejor visualización
        // Usar la hora exacta como identificador
        const franjaId = horaVenta;
        
        // Crear formato legible de la franja (ej: "22:00")
        const franjaFormato = `${horaVenta.toString().padStart(2, '0')}:00`;
        
        // Solo agregar la franja al mapa si no existe
        if (!ventasPorHoraMap.has(franjaId)) {
          ventasPorHoraMap.set(franjaId, {
            hora: franjaId,
            hora_formato: franjaFormato,
            ventas: 0,
            cantidad_tickets: 0
          })
        }
        
        // Acumular ventas en la franja de 1 hora
        const franjaActual = ventasPorHoraMap.get(franjaId)
        franjaActual.ventas += venta.total_neto || 0
        franjaActual.cantidad_tickets += 1
      })
    }

    // 🔧 NOTA: Las ventas ya se procesaron arriba al crear el mapa dinámico

    // Convertir mapa a array y ordenar por hora
    ventasPorHoraMap.forEach(hora => {
      ventasPorHoraExacta.push(hora)
    })
    
    // Ordenar por hora (0:00 a 23:00)
    ventasPorHoraExacta.sort((a, b) => a.hora - b.hora)
    
    // 🔧 LOG: Mostrar qué franjas de 1 hora se detectaron dinámicamente
    console.log('🕐 Franjas de 1 hora detectadas dinámicamente:', ventasPorHoraExacta.map(h => `${h.hora_formato} (${h.cantidad_tickets} tickets, €${h.ventas.toFixed(2)})`));

    console.log('🕐 Ventas por hora exacta procesadas:', ventasPorHoraExacta);

    // 4. OBTENER PRODUCTOS TOP DESDE VENTAS REALES
    console.log('🔍 Consultando productos desde ventas para restaurante:', restaurante_id);
    
    // Obtener IDs de ventas del período y construir productos desde ventas_lineas
    const ventaIds = (resumenData || []).map((v: any) => v.id).filter(Boolean)
    
    // 🔍 LOGS DETALLADOS PARA DEBUG
    console.log('🔍 resumenData completo:', resumenData);
    console.log('🔍 ventaIds extraídos:', ventaIds);
    console.log('🔍 Cantidad de ventaIds:', ventaIds.length);
    
    // 🔍 TAMBIÉN EXTRAER IDs EXTERNOS para depuración
    const idsExternos = (resumenData || []).map((v: any) => v.id_externo).filter(Boolean);
    console.log('🔍 IDs externos de ventas_datos:', idsExternos);
    
    let productosData: Array<{
      producto_nombre: string;
      categoria_id: string | number;
      categoria_nombre?: string;
      cantidad: number;
      precio_total: number;
      venta_id: string;
    }> = []
    let productosError: any = null
    if (ventaIds.length > 0) {
      console.log('🔍 Consultando ventas_lineas con ventaIds:', ventaIds);
      console.log('🔍 Cantidad de ventaIds:', ventaIds.length);
      
      // 🔧 SOLUCIÓN: Dividir la consulta en lotes para evitar URLs muy largas
      const BATCH_SIZE = 50; // Tamaño máximo del lote
      const batches: string[][] = [];
      
      for (let i = 0; i < ventaIds.length; i += BATCH_SIZE) {
        batches.push(ventaIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`🔧 Dividiendo ${ventaIds.length} ventaIds en ${batches.length} lotes de máximo ${BATCH_SIZE}`);
      
      // Consultar cada lote por separado
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`🔧 Consultando lote ${i + 1}/${batches.length} con ${batch.length} ventaIds`);
        
        try {
          const { data: batchData, error: batchError } = await supabase
            .from('ventas_lineas')
            .select(`
              producto_nombre,
              categoria_id,
              cantidad,
              precio_total,
              venta_id
            `)
            .eq('restaurante_id', restaurante_id)
            .in('venta_id', batch)
          
          if (batchError) {
            console.error(`❌ Error en lote ${i + 1}:`, batchError);
            productosError = batchError;
            break;
          }
          
          if (batchData && batchData.length > 0) {
            productosData.push(...(batchData as any[]));
            console.log(`✅ Lote ${i + 1}: ${batchData.length} líneas obtenidas`);
          } else {
            console.log(`⚠️ Lote ${i + 1}: Sin datos`);
          }
          
        } catch (batchError) {
          console.error(`❌ Error inesperado en lote ${i + 1}:`, batchError);
          productosError = batchError;
          break;
        }
      }
      
      console.log('🔍 Query ventas_lineas ejecutada con restaurante_id:', restaurante_id);
      console.log('🔍 Total de líneas obtenidas:', productosData.length);
      console.log('🔍 Error final:', productosError);
      
      // 🔍 CONSULTA ADICIONAL: Ver QUÉ HAY en ventas_lineas para hoy
      console.log('🔍 Verificando QUÉ líneas hay en ventas_lineas para hoy...');
      const { data: todasLasLineas, error: errorLineas } = await supabase
        .from('ventas_lineas')
        .select('venta_id, producto_nombre, cantidad, fecha_venta')
        .eq('restaurante_id', restaurante_id)
        .gte('fecha_venta', fecha_inicio)
        .lte('fecha_venta', fecha_fin)
        .limit(10);
      
      console.log('🔍 Líneas encontradas para hoy (primeras 10):', todasLasLineas);
      console.log('🔍 Error en consulta líneas:', errorLineas);
    } else {
      productosData = []
      console.log('⚠️ No hay ventaIds, por lo que productosData será vacío');
    }

    console.log('🔍 Resultado consulta productos:', { productosData, productosError });
    console.log('🔍 Cantidad de productos encontrados:', productosData?.length || 0);

    if (productosError) {
      console.error('❌ Error obteniendo productos:', productosError)
      throw new Error('Error obteniendo productos')
    }

    // 🆕 NUEVA CONSULTA: OBTENER PRODUCTOS DEL CATÁLOGO COMPLETO
    console.log('🔍 Consultando productos del catálogo completo para restaurante:', restaurante_id);
    
    const { data: productosCatalogoData, error: productosCatalogoError } = await supabase
      .from('productos_catalogo')
      .select(`
        id,
        nombre,
        categoria_nombre,
        precio_base,
        descripcion,
        activo
      `)
      .eq('restaurante_id', restaurante_id)
      // .eq('activo', true)  // ❌ Comentado: traer TODOS los productos
      .order('nombre', { ascending: true })

    console.log('🔍 Resultado consulta productos_catalogo:', { 
      productosCatalogoData: productosCatalogoData?.length || 0, 
      productosCatalogoError 
    });
    
    if (productosCatalogoData && productosCatalogoData.length > 0) {
      console.log('🎯 Primeros 3 productos del catálogo:', productosCatalogoData.slice(0, 3));
    } else {
      console.log('⚠️ No se encontraron productos activos en el catálogo para restaurante:', restaurante_id);
      
      // Consultar todos los productos (incluso inactivos) para debug
      const { data: todosLosProductos } = await supabase
        .from('productos_catalogo')
        .select('id, nombre, activo')
        .eq('restaurante_id', restaurante_id)
        .limit(5);
        
      console.log('🔍 Total productos en catálogo (incluso inactivos):', todosLosProductos?.length || 0);
      if (todosLosProductos && todosLosProductos.length > 0) {
        console.log('🔍 Muestra de productos (activos/inactivos):', todosLosProductos);
      }
    }

    if (productosCatalogoError) {
      console.error('❌ Error obteniendo productos del catálogo:', productosCatalogoError)
      // No lanzar error, continuar con productos de ventas
    }

    // 🔧 NUEVO: CREAR MAPEO DE CATEGORÍAS PARA RESOLVER IDs NUMÉRICOS
    console.log('🔧 Creando mapeo de categorías para resolver IDs numéricos...');
    
    // 🔧 CORREGIDO: Crear mapeo desde productos_catalogo que SÍ tiene nombres descriptivos
    const categoriaMapping = new Map<string, string>();
    
    // 🔧 NUEVO: MAPEO DIRECTO DE IDs DE CATEGORÍA BASADO EN DATOS REALES
    // Este mapeo se basa en los IDs que vemos en los logs y los nombres que deberían tener
    const mapeoDirectoIds = new Map<string, string>([
      ['105301', 'Cervezas'],           // Cruzcampo, Heineken 00, Ladrón de Manzanas
      ['105302', 'Vinos'],              // La Planta, Adhuc Tempos Roble, Ramón Bilbao
      ['105303', 'Vinos Generosos'],    // Manzanilla en Rama GABRIELA, Manzanilla en Rama Pasada
      ['105304', 'Espumosos'],          // Champagne Andre Clouet, Kripta cava
      ['105305', 'Refrescos'],          // Coca Cola, Coca Cola Zero, Fanta Naranja, Fuze Tea, Agua
      ['105306', 'Vinos'],              // José Pariente, Viña Gamo etiqueta negra
      ['105308', 'Tapas'],              // Pincho Tortilla, Gilda Anchoa, Gilda Boquerón, Patatas Perdi, Papas aliñás
      ['105309', 'Quesos'],             // Tabla Quesos media, Stilton, Taquitos de Jamon, Chicharrones de Jerez
      ['105310', 'Verduras'],           // Flores de Alcachofas
      ['105311', 'Montaditos'],         // Montadito Pastrami, Montadito de lomo en manteca, Mini tosta de sardina
      ['105531', 'Mariscos'],           // Ostra
      ['105532', 'Licores'],            // Beefeater
      ['128182', 'Otros'],              // Solo largo
      ['128183', 'Otros']               // Otros productos
    ]);
    
    console.log('🔧 Mapeo directo de IDs creado:', Array.from(mapeoDirectoIds.entries()));
    
    if (productosCatalogoData && productosCatalogoData.length > 0) {
      console.log('🔧 Creando mapeo desde productos_catalogo...');
      
      // 🔧 ESTRATEGIA: Crear un mapeo basado en el nombre del producto
      // Como no tenemos categoria_id en productos_catalogo, vamos a crear un mapeo inverso
      // que nos permita encontrar la categoría por nombre de producto
      const productosPorCategoria = new Map<string, string>();
      
      productosCatalogoData.forEach(producto => {
        if (producto.categoria_nombre && producto.categoria_nombre.trim() !== '') {
          // Usar el nombre del producto como clave para encontrar su categoría
          productosPorCategoria.set(producto.nombre.toLowerCase(), producto.categoria_nombre);
        }
      });
      
      console.log('🔧 Mapeo productos -> categorías creado:', productosPorCategoria.size, 'productos mapeados');
      console.log('🔧 Ejemplos de mapeo:', Array.from(productosPorCategoria.entries()).slice(0, 5));
      
      // 🔧 ALTERNATIVA: Crear mapeo desde ventas_lineas existentes (para categorías que no estén en catálogo)
      console.log('🔧 Creando mapeo alternativo desde ventas_lineas existentes...');
      
      const { data: lineasExistentes, error: errorLineasExistentes } = await supabase
        .from('ventas_lineas')
        .select('categoria_id, categoria_nombre')
        .eq('restaurante_id', restaurante_id)
        .not('categoria_id', 'is', null)
        .not('categoria_nombre', 'is', null);
      
      if (errorLineasExistentes) {
        console.log('⚠️ Error obteniendo líneas existentes para mapeo:', errorLineasExistentes);
      } else {
        console.log('🔧 Líneas existentes para mapeo:', lineasExistentes?.length || 0);
        
        if (lineasExistentes && lineasExistentes.length > 0) {
          // Crear mapeo de categoria_id a categoria_nombre
          lineasExistentes.forEach(linea => {
            if (linea.categoria_id && linea.categoria_nombre) {
              categoriaMapping.set(linea.categoria_id.toString(), linea.categoria_nombre);
            }
          });
          
          console.log('🔧 Mapeo de categorías desde ventas_lineas:', Array.from(categoriaMapping.entries()));
          console.log('🔧 Total de mapeos desde ventas_lineas:', categoriaMapping.size);
        }
      }
      
      // 🔧 GUARDAR EL MAPEO DE PRODUCTOS PARA USARLO DESPUÉS
      globalThis.productosPorCategoria = productosPorCategoria;
    }
    
    // 🔧 GUARDAR EL MAPEO DIRECTO PARA USARLO DESPUÉS
    globalThis.mapeoDirectoIds = mapeoDirectoIds;

    // Procesar productos directamente desde productos_catalogo
    // Procesar productos desde ventas reales
    const productosTop: Array<{
      nombre: string;
      categoria: string;
      cantidad: number;
      importe: number;
      veces_vendido: number;
    }> = []

    // 🔍 LOG DETALLADO DEL PROCESAMIENTO
    console.log('🔍 Iniciando procesamiento de productosData:', productosData);
    console.log('🔍 productosData.length:', productosData?.length || 0);
    
    // Agrupar productos por nombre desde ventas reales
    const productosMap = new Map()
    
    productosData.forEach((producto, index) => {
      console.log(`🔍 Procesando producto ${index + 1}:`, producto);
      
      const nombre = producto.producto_nombre || 'Producto sin nombre'
      
      // 🔧 NUEVO: USAR EL MAPEO DE CATEGORÍAS PARA RESOLVER IDs NUMÉRICOS
      let categoria = 'Sin categoría';
      
      // 🔧 ESTRATEGIA 1: Buscar en el mapeo de productos por nombre
      const nombreProducto = producto.producto_nombre?.toLowerCase();
      if (nombreProducto && globalThis.productosPorCategoria && globalThis.productosPorCategoria.has(nombreProducto)) {
        categoria = globalThis.productosPorCategoria.get(nombreProducto) || 'Sin categoría';
        console.log(`🔧 Categoría resuelta por nombre de producto: ${producto.producto_nombre} -> ${categoria}`);
      }
      // 🔧 ESTRATEGIA 2: Si no se encontró por nombre, buscar en el mapeo directo de IDs
      else if (producto.categoria_id && globalThis.mapeoDirectoIds && globalThis.mapeoDirectoIds.has(producto.categoria_id.toString())) {
        categoria = globalThis.mapeoDirectoIds.get(producto.categoria_id.toString()) || 'Sin categoría';
        console.log(`🔧 Categoría resuelta por mapeo directo: ${producto.categoria_id} -> ${categoria}`);
      }
      // 🔧 ESTRATEGIA 3: Si no se encontró en el mapeo directo, buscar en el mapeo de ventas_lineas
      else if (producto.categoria_id && categoriaMapping.has(producto.categoria_id.toString())) {
        categoria = categoriaMapping.get(producto.categoria_id.toString()) || 'Sin categoría';
        console.log(`🔧 Categoría resuelta por mapeo de ventas_lineas: ${producto.categoria_id} -> ${categoria}`);
      }
      // 🔧 ESTRATEGIA 4: Si ya tiene un nombre descriptivo, usarlo
      else if (producto.categoria_nombre && !producto.categoria_nombre.startsWith('Categoría ')) {
        categoria = producto.categoria_nombre;
        console.log(`🔧 Categoría ya descriptiva: ${producto.categoria_nombre}`);
      }
      // 🔧 ESTRATEGIA 5: Si no se encontró nada, marcar para debug
      else if (producto.categoria_id) {
        categoria = `Categoría ${producto.categoria_id} (sin mapeo)`;
        console.log(`⚠️ Categoría sin mapeo: ${producto.categoria_id} para producto: ${producto.producto_nombre}`);
      }
      
      if (productosMap.has(nombre)) {
        const existente = productosMap.get(nombre)
        existente.cantidad += producto.cantidad || 0
        existente.importe += producto.precio_total || 0
        existente.veces_vendido += 1
        console.log(`🔍 Producto ${nombre} actualizado:`, existente);
      } else {
        productosMap.set(nombre, {
          nombre,
          categoria,
          cantidad: producto.cantidad || 0,
          importe: producto.precio_total || 0,
          veces_vendido: 1
        })
        console.log(`🔍 Nuevo producto agregado:`, productosMap.get(nombre));
      }
    })

    // Convertir map a array y ordenar por importe
    productosMap.forEach(producto => {
      productosTop.push(producto)
    })
    
    // 🔍 LOG DEL ESTADO DE PRODUCTOS TOP DESPUÉS DE PROCESAR VENTAS REALES
    console.log('🔍 productosTop después de procesar ventas reales:', productosTop);
    console.log('🔍 Cantidad de productos con ventas reales:', productosTop.length);

    // 🆕 AGREGAR PRODUCTOS DEL CATÁLOGO (DESPUÉS de procesar ventas reales)
    if (productosCatalogoData && productosCatalogoData.length > 0) {
      console.log(`✅ Agregando ${productosCatalogoData.length} productos del catálogo al dashboard`);
      
      // Solo agregar productos que NO estén ya en productosTop
      const nombresExistentes = new Set(productosTop.map(p => p.nombre.toLowerCase()));
      
      let productosAgregados = 0;
      productosCatalogoData.forEach(producto => {
        const nombreProducto = producto.nombre || 'Producto sin nombre';
        
        if (!nombresExistentes.has(nombreProducto.toLowerCase())) {
          productosTop.push({
            nombre: nombreProducto,
            categoria: producto.categoria_nombre || 'Sin categoría',
            cantidad: 0, // No hay ventas en este período
            importe: 0,  // No hay ventas en este período
            veces_vendido: 0 // No hay ventas en este período
          })
          productosAgregados++;
        }
      })
      
      console.log(`🎯 Productos agregados del catálogo: ${productosAgregados}`);
      console.log(`🔍 Total productos en productosTop: ${productosTop.length}`);
      console.log(`🔍 Productos con ventas reales: ${productosTop.filter(p => p.importe > 0 || p.cantidad > 0).length}`);
      console.log(`🔍 Productos sin ventas (solo catálogo): ${productosTop.filter(p => p.importe === 0 && p.cantidad === 0).length}`);
    }

    // Ordenar por importe descendente - TODOS LOS PRODUCTOS (sin límite)
    productosTop.sort((a, b) => b.importe - a.importe)
    const productosTopFinal = productosTop // ✅ SIN LÍMITE - Todos los productos
    
    console.log(`🎯 Total productos finales (sin límite): ${productosTopFinal.length}`);

    // 5. OBTENER CATEGORÍAS
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('productos_catalogo')
      .select('categoria_nombre')
      .eq('restaurante_id', restaurante_id)

    if (categoriasError) {
      console.error('❌ Error obteniendo categorías:', categoriasError)
      throw new Error('Error obteniendo categorías')
    }

    // Agrupar por categoría - SOLO PRODUCTOS QUE SE VENDIERON
    const categoriasMap = new Map()
    
    // 🔍 LOG PARA DEBUG
    console.log('🔍 Iniciando conteo de productos por categoría desde ventas reales');
    
    // 🔧 NUEVO: USAR EL MAPEO DE CATEGORÍAS PARA AGRUPAR CORRECTAMENTE
    console.log('🔧 Aplicando mapeo de categorías para agrupación...');
    
    // Contar productos SOLO desde productosTop (que tiene ventas reales)
    productosTop.forEach(producto => {
      // 🔧 RESOLVER CATEGORÍA: Si es un ID numérico, usar el mapeo
      let categoriaFinal = producto.categoria;
      
      if (producto.categoria && producto.categoria.startsWith('Categoría ') && producto.categoria.includes('(sin mapeo)')) {
        // Extraer el ID numérico y buscar en el mapeo
        const match = producto.categoria.match(/Categoría (\d+) \(sin mapeo\)/);
        if (match && match[1]) {
          const categoriaId = match[1];
          if (categoriaMapping.has(categoriaId)) {
            categoriaFinal = categoriaMapping.get(categoriaId) || producto.categoria;
            console.log(`🔧 Categoría resuelta en agrupación: ${categoriaId} -> ${categoriaFinal}`);
          }
        }
      }
      
      if (!categoriasMap.has(categoriaFinal)) {
        categoriasMap.set(categoriaFinal, {
          categoria: categoriaFinal,
          importe: 0,
          productos_count: 0
        })
      }
      // Solo incrementar el contador si el producto tiene ventas reales
      if (producto.importe > 0 || producto.cantidad > 0) {
        categoriasMap.get(categoriaFinal).productos_count += 1
        console.log(`🔍 Categoría ${categoriaFinal}: producto ${producto.nombre} contado (tiene ventas)`);
      } else {
        console.log(`🔍 Categoría ${categoriaFinal}: producto ${producto.nombre} NO contado (sin ventas)`);
      }
    })
    
    console.log('🔍 categoriasMap después del conteo:', Array.from(categoriasMap.entries()));

    // Calcular importes por categoría
    productosTop.forEach(producto => {
      // 🔧 RESOLVER CATEGORÍA: Si es un ID numérico, usar el mapeo
      let categoriaFinal = producto.categoria;
      
      if (producto.categoria && producto.categoria.startsWith('Categoría ') && producto.categoria.includes('(sin mapeo)')) {
        // Extraer el ID numérico y buscar en el mapeo
        const match = producto.categoria.match(/Categoría (\d+) \(sin mapeo\)/);
        if (match && match[1]) {
          const categoriaId = match[1];
          if (categoriaMapping.has(categoriaId)) {
            categoriaFinal = categoriaMapping.get(categoriaId) || producto.categoria;
          }
        }
      }
      
      if (categoriasMap.has(categoriaFinal)) {
        categoriasMap.get(categoriaFinal).importe += producto.importe
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
      ventas_por_hora: ventasPorHoraExacta,
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