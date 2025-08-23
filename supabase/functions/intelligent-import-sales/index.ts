// =============================================
// EDGE FUNCTION: intelligent-import-sales
// FASE 1 Y 2: Receptor, analizador e importador de archivos
// Guarda ventas en ventas_datos y productos en ventas_lineas
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.159.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configuración fija para España
const SPAIN_CONFIG = {
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
  decimalSep: ',',
  thousandsSep: '.'
}

interface FileAnalysis {
  fileType: 'csv' | 'excel' | 'json' | 'unknown'
  headers: string[]
  sampleRows: any[][]
  totalRows: number
  encoding: string
  detectedStructure: 'ventas' | 'productos' | 'unknown'
  mappedColumns?: {
    fecha?: number
    hora?: number
    numero_ticket?: number
    cliente?: number
    producto?: number
    cantidad?: number
    precio?: number
    total?: number
    metodo_pago?: number
    categoria?: number
  }
}

serve(async (req) => {
  // Manejar OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response('No autorizado', { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response('Usuario no válido', { status: 401, headers: corsHeaders })
    }

    // Obtener datos del formulario
    const formData = await req.formData()
    const file = formData.get('file') as File
    const restauranteId = formData.get('restaurante_id') as string
    const action = formData.get('action') as string || 'analyze'
    const analyzedData = formData.get('analyzed_data') as string

    if (!restauranteId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falta restaurante_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar acceso al restaurante
    const { data: restaurant } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('id', restauranteId)
      .single()

    if (!restaurant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurante no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Acción solicitada: ${action}`)

    // Procesar según la acción
    switch (action) {
      case 'analyze':
        if (!file) {
          return new Response(
            JSON.stringify({ success: false, error: 'Falta archivo para analizar' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`📁 Procesando archivo: ${file.name} (${file.size} bytes)`)
        const analysis = await analyzeFile(file)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: analysis,
            message: 'Archivo analizado correctamente'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'import':
        if (!analyzedData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Faltan datos analizados para importar' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const parsedData = JSON.parse(analyzedData)
        console.log(`📊 Importando ${parsedData.totalRows} filas de datos...`)
        
        const importResult = await importToVentasDatosYLineas(
          supabase, 
          parsedData, 
          restauranteId, 
          user.id
        )
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: importResult,
            message: `${importResult.ventas_count} ventas con ${importResult.lineas_count} productos importados exitosamente`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Acción no válida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('❌ Error en intelligent-import-sales:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// =============================================
// FUNCIÓN: Generar Hash SHA-256 de un string
// =============================================
async function generateStringHash(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================
// FUNCIÓN: Importar a ventas_datos (cabecera) y ventas_lineas (productos)
// =============================================
async function importToVentasDatosYLineas(
  supabase: any, 
  analysisData: FileAnalysis, 
  restauranteId: string,
  userId: string
) {
  console.log('🔄 Iniciando importación a ventas_datos y ventas_lineas...')
  
  const { headers, sampleRows, mappedColumns } = analysisData
  
  // ================================================================
  // MEJORA CRÍTICA 1: Usar TODOS los datos, no solo samples
  // ================================================================
  const dataRows = analysisData.allRows || analysisData.sampleRows;
  console.log(`📦 MEJORA: Procesando ${dataRows.length} filas COMPLETAS (no solo muestra)...`);
  
  // =================================================================
  // LÓGICA DE PROCESAMIENTO INTELIGENTE DE VENTAS
  // =================================================================
  console.log('🔄 Procesando datos con lógica inteligente...');
  
  // ================================================================
  // SISTEMA INTELIGENTE DE DETECCIÓN DE TIPO DE DATOS v5.0
  // ================================================================
  
  // Analizar qué campos tenemos
  const tieneNumeroTicket = mappedColumns?.numero_ticket !== undefined;
  const tieneFechaHora = mappedColumns?.fecha !== undefined || mappedColumns?.hora !== undefined;
  const tieneMetodoPago = mappedColumns?.metodo_pago !== undefined;
  const tieneProductos = mappedColumns?.producto !== undefined;
  const tieneTotal = mappedColumns?.total !== undefined;
  const tieneCantidad = mappedColumns?.cantidad !== undefined;
  const tienePrecio = mappedColumns?.precio !== undefined;
  const tieneCategoria = mappedColumns?.categoria !== undefined;
  
  // Detectar patrones en los datos para clasificar el tipo
  let tipoDetectado = 'unknown';
  let requiereProductos = false;
  let requiereVentas = false;
  
  // CASO 1: Cierres TPV (PRIORIDAD ALTA)
  // Indicadores: tiene tickets/numeros + fechas + totales, pero NO productos individuales
  if (tieneNumeroTicket && tieneFechaHora && tieneTotal && !tieneProductos) {
    tipoDetectado = 'cierres_tpv';
    requiereVentas = true;
    console.log('📋 TIPO DETECTADO: Cierres TPV/Resumen diario');
    console.log(`🔍 Indicadores: ticket=✅, fecha=✅, total=✅, productos=❌`);
  }
  // CASO 2: Datos de PRODUCTOS/INVENTARIO
  // Indicadores: tiene productos + precios/categorias, pero NO fechas de venta ni tickets
  else if (tieneProductos && (tienePrecio || tieneCategoria) && !tieneNumeroTicket && !tieneFechaHora) {
    tipoDetectado = 'productos';
    requiereProductos = true;
    console.log('📦 TIPO DETECTADO: Datos de PRODUCTOS/INVENTARIO');
  }
  // CASO 3: Datos MIXTOS
  // Indicadores: tiene productos + fechas + totales (catálogo con ventas)
  else if (tieneProductos && tieneFechaHora && tieneTotal) {
    tipoDetectado = 'mixto';
    requiereProductos = true;
    requiereVentas = true;
    console.log('🔄 TIPO DETECTADO: Datos MIXTOS (productos + ventas)');
  }
  // CASO 4: Datos de VENTAS (FALLBACK)
  // Indicadores: tiene fechas + totales + productos
  else if (tieneFechaHora && tieneTotal && tieneProductos) {
    tipoDetectado = 'ventas';
    requiereVentas = true;
    console.log('💰 TIPO DETECTADO: Datos de VENTAS');
  }
  
  console.log(`\n🎯 =================== RESUMEN DE DETECCIÓN ===================`);
  console.log(`📂 Archivo: ${analysisData.headers ? analysisData.headers.join(', ').substring(0, 100) : 'Unknown'}...`);
  console.log(`📊 Tipo detectado: ${tipoDetectado.toUpperCase()}`);
  console.log(`🎲 Columnas mapeadas:`);
  console.log(`   - Fecha: ${mappedColumns?.fecha !== undefined ? `Columna ${mappedColumns.fecha} (${analysisData.headers[mappedColumns.fecha]})` : '❌ No detectada'}`);
  console.log(`   - Ticket/ID: ${mappedColumns?.numero_ticket !== undefined ? `Columna ${mappedColumns.numero_ticket} (${analysisData.headers[mappedColumns.numero_ticket]})` : '❌ No detectada'}`);
  console.log(`   - Total/Ventas: ${mappedColumns?.total !== undefined ? `Columna ${mappedColumns.total} (${analysisData.headers[mappedColumns.total]})` : '❌ No detectada'}`);
  console.log(`   - Productos: ${mappedColumns?.producto !== undefined ? `Columna ${mappedColumns.producto} (${analysisData.headers[mappedColumns.producto]})` : '❌ No detectada'}`);
  console.log(`🎯 Estrategia: ${tipoDetectado === 'cierres_tpv' ? 'Cada fila = 1 cierre diario' : tipoDetectado === 'ventas' ? 'Cada fila = 1 venta con productos' : 'Catálogo de productos'}`);
  console.log(`📦 Tablas objetivo: ${requiereProductos ? '🏪 productos ' : ''}${requiereVentas ? '💰 ventas_datos + ventas_lineas' : ''}`);
  console.log(`===========================================================\n`);
  
  // Contenedores para diferentes tipos de datos
  const productosParaInsertar: any[] = [];
  const ventasMap = new Map<string, any>();
  
  // ================================================================
  // PROCESAMIENTO INTELIGENTE POR TIPO DE DATOS
  // ================================================================
  
  console.log(`📦 Procesando ${dataRows.length} filas de datos...`);
  
  for (const row of dataRows) {
    // Extraer datos comunes
    const fecha = mappedColumns?.fecha !== undefined ? parseDate(row[mappedColumns.fecha]) : new Date();
    const hora = mappedColumns?.hora !== undefined ? row[mappedColumns.hora] : '';
    const producto = mappedColumns?.producto !== undefined ? row[mappedColumns.producto] : '';
    const cantidad = mappedColumns?.cantidad !== undefined ? parseFloat(row[mappedColumns.cantidad]) || 1 : 1;
    const precio = mappedColumns?.precio !== undefined ? parseFloat(row[mappedColumns.precio]) || 0 : 0;
    const total = mappedColumns?.total !== undefined ? parseFloat(row[mappedColumns.total]) || (precio * cantidad) : (precio * cantidad);
    const categoria = mappedColumns?.categoria !== undefined ? row[mappedColumns.categoria] || 'Sin categoría' : 'Sin categoría';
    const numeroTicket = mappedColumns?.numero_ticket !== undefined ? row[mappedColumns.numero_ticket] : null;
    const cliente = mappedColumns?.cliente !== undefined ? row[mappedColumns.cliente] : null;
    const metodoPago = mappedColumns?.metodo_pago !== undefined ? row[mappedColumns.metodo_pago] || 'Efectivo' : 'Efectivo';
    
    // Validaciones básicas
    const filaVacia = !producto && !total && !numeroTicket;
    if (filaVacia) {
      continue;
    }
    
    // ================================================================
    // CASO 1: DATOS DE PRODUCTOS/INVENTARIO
    // ================================================================
    if (tipoDetectado === 'productos' || requiereProductos) {
      if (producto && producto.trim() !== '') {
        const productoData = {
          nombre: producto.trim(),
          categoria: categoria || 'Sin categoría',
          precio_base: precio || 0,
          precio_venta: precio || 0,
          stock_actual: cantidad || 0,
          activo: true,
          fecha_creacion: new Date().toISOString(),
          datos_originales: {
            import_date: new Date().toISOString(),
            source: 'manual_import'
          }
        };
        
        productosParaInsertar.push(productoData);
        console.log(`📦 PRODUCTO INVENTARIO detectado:`);
        console.log(`   🏷️ Nombre: ${producto} | 💰 Precio: €${precio} | 🏢 Categoría: ${categoria}`);
        console.log(`   📦 Stock: ${cantidad} unidades`);
      }
    }
    
    // ================================================================
    // CASO 2: DATOS DE VENTAS
    // ================================================================
    if (tipoDetectado === 'ventas' || tipoDetectado === 'cierres_tpv' || requiereVentas) {
      
      // Para cierres TPV, crear venta resumen
      if (tipoDetectado === 'cierres_tpv') {
        if (!fecha || isNaN(fecha.getTime()) || total <= 0) {
          console.log(`⚠️ Saltando cierre inválido: fecha=${fecha}, total=${total}`);
          continue;
        }
        
        const ventaKey = `cierre_${numeroTicket || fecha.toISOString().split('T')[0]}`;
        const fechaHoraCompleta = hora ? 
          new Date(`${fecha.toISOString().split('T')[0]}T${hora}`).toISOString() : 
          fecha.toISOString();
        
        ventasMap.set(ventaKey, {
          fecha_venta: fecha.toISOString().split('T')[0],
          fecha_hora_completa: fechaHoraCompleta,
          metodo_pago: metodoPago,
          numero_ticket: numeroTicket,
          cliente: cliente,
          lineas: [{
            producto_nombre: `Cierre TPV ${numeroTicket || fecha.toISOString().split('T')[0]}`,
            categoria_nombre: 'Resumen Diario',
            cantidad: 1,
            precio_unitario: total,
            precio_total: total,
            fecha_venta: fecha.toISOString().split('T')[0]
          }],
          total_bruto: total,
          total_neto: total / 1.10,
          total_impuestos: total - (total / 1.10)
        });
        
        console.log(`📋 CIERRE TPV procesado:`);
        console.log(`   🏦 Nº: ${numeroTicket || 'Sin número'} | 📅 Fecha: ${fecha.toISOString().split('T')[0]} | 💰 Total: €${total}`);
        console.log(`   🔑 Clave: ${ventaKey} | 💳 Método: ${metodoPago}`);
      }
      // Para ventas detalladas
      else {
        if (!producto || producto.trim() === '' || total <= 0) {
          continue;
        }
        
        // Crear clave única para agrupar
        let ventaKey: string;
        if (numeroTicket) {
          ventaKey = `ticket_${numeroTicket}_${fecha.toISOString().split('T')[0]}`;
        } else {
          ventaKey = `venta_${fecha.toISOString().split('T')[0]}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        }
        
        if (!ventasMap.has(ventaKey)) {
          const fechaHoraCompleta = hora ? 
            new Date(`${fecha.toISOString().split('T')[0]}T${hora}`).toISOString() : 
            fecha.toISOString();
          
          ventasMap.set(ventaKey, {
            fecha_venta: fecha.toISOString().split('T')[0],
            fecha_hora_completa: fechaHoraCompleta,
            metodo_pago: metodoPago,
            numero_ticket: numeroTicket,
            cliente: cliente,
            lineas: [],
            total_bruto: 0,
            total_neto: 0,
            total_impuestos: 0
          });
        }
        
        const venta = ventasMap.get(ventaKey);
        venta.lineas.push({
          producto_nombre: producto,
          categoria_nombre: categoria,
          cantidad: cantidad,
          precio_unitario: precio,
          precio_total: total,
          fecha_venta: fecha.toISOString().split('T')[0]
        });
        
        const iva = 0.10;
        venta.total_bruto += total;
        venta.total_neto += total / (1 + iva);
        venta.total_impuestos += total - (total / (1 + iva));
        
        console.log(`💰 VENTA DETALLADA procesada:`);
        console.log(`   🍽️ Producto: ${producto} | 📝 Cantidad: ${cantidad} | 💰 Total: €${total}`);
        console.log(`   🔑 Ticket: ${numeroTicket || 'Sin ticket'} | 📅 Fecha: ${fecha.toISOString().split('T')[0]}`);
      }
    }
  }
  
  // ================================================================
  // INSERCIÓN INTELIGENTE EN BASE DE DATOS
  // ================================================================
  
  let productosInsertados = 0;
  let ventasInsertadas = 0;
  let lineasInsertadas = 0;
  const errores: string[] = [];
  
  console.log(`📊 Resumen de procesamiento:`);
  console.log(`  - Productos para insertar: ${productosParaInsertar.length}`);
  console.log(`  - Ventas para insertar: ${ventasMap.size}`);
  
  // ================================================================
  // INSERTAR PRODUCTOS (si los hay)
  // ================================================================
  if (requiereProductos && productosParaInsertar.length > 0) {
    console.log(`📦 Insertando ${productosParaInsertar.length} productos...`);
    
    try {
      // Verificar si la tabla productos existe
      const { data: tablaProductos, error: errorTabla } = await supabase
        .from('productos')
        .select('id')
        .limit(1);
      
      if (errorTabla) {
        console.log('⚠️ Tabla productos no encontrada, saltando inserción de productos');
        errores.push('Tabla productos no disponible');
      } else {
        // Insertar productos con upsert para evitar duplicados
        const { data: productosData, error: productosError } = await supabase
          .from('productos')
          .upsert(productosParaInsertar, {
            onConflict: 'nombre', // Asumir que el nombre es único
            ignoreDuplicates: false
          })
          .select();
        
        if (productosError) {
          console.error('❌ Error insertando productos:', productosError);
          errores.push(`Productos: ${productosError.message}`);
        } else {
          productosInsertados = productosData?.length || 0;
          console.log(`✅ ${productosInsertados} productos insertados/actualizados`);
        }
      }
    } catch (error) {
      console.error('❌ Error en inserción de productos:', error);
      errores.push(`Productos: ${error.message}`);
    }
  }
  
  // ================================================================
  // INSERTAR VENTAS (si las hay)
  // ================================================================
  if (requiereVentas && ventasMap.size > 0) {
    console.log(`💰 Insertando ${ventasMap.size} ventas...`);
  
  // Procesar cada venta
  for (const [ventaKey, ventaData] of ventasMap) {
    if (ventaData.lineas.length === 0) continue;
    try {
      // Crear un identificador único y determinista para esta transacción
      const lineasIdentifier = ventaData.lineas
        .map(l => `${l.producto_nombre}:${l.cantidad}:${l.precio_total}`)
        .sort() // Ordenar para asegurar consistencia
        .join('|');
      
      const ventaHash = await generateStringHash(lineasIdentifier);
      const id_externo = `IMP_${ventaData.fecha_venta}_${ventaHash.substring(0, 8)}`;

      // 1. Usar UPSERT para insertar la venta y evitar duplicados a nivel de transacción
      const { data: venta, error: ventaError } = await supabase
        .from('ventas_datos')
        .upsert({
          restaurante_id: restauranteId,
          sistema_origen: 'import_manual',
          id_externo: id_externo,
          referencia_externa: ventaData.numero_ticket ? 
            `Ticket ${ventaData.numero_ticket}` : 
            `Importación ${ventaData.fecha_venta} ${ventaData.fecha_hora_completa.split('T')[1]?.substring(0, 5) || ''}`,
          fecha_venta: ventaData.fecha_venta,
          fecha_hora_completa: ventaData.fecha_hora_completa,
          total_bruto: ventaData.total_bruto.toFixed(2),
          total_neto: ventaData.total_neto.toFixed(2),
          total_impuestos: ventaData.total_impuestos.toFixed(2),
          descuentos: 0,
          propinas: 0,
          metodo_pago: ventaData.metodo_pago,
          num_comensales: 0,
          seccion: 'Importado',
          estado: 'procesado',
          procesado_por: userId,
          datos_originales: { 
            import_date: new Date().toISOString(),
            source: 'manual_import',
            productos_count: ventaData.lineas.length,
            cliente: ventaData.cliente,
            numero_ticket: ventaData.numero_ticket
          }
        }, {
          onConflict: 'restaurante_id, sistema_origen, id_externo'
        })
        .select()
        .single()
      
      if (ventaError) {
        console.error('❌ Error insertando venta:', ventaError)
        errores.push(`Venta ${ventaData.fecha_venta}: ${ventaError.message}`)
      } else {
        ventasInsertadas++;
        console.log(`✅ Venta insertada: ${venta.id} - ${ventaData.numero_ticket || ventaData.fecha_venta}`)
        
        // 2. Insertar líneas de productos en ventas_lineas
        const lineasParaInsertar = ventaData.lineas.map(linea => ({
          venta_id: venta.id,
          restaurante_id: restauranteId,
          producto_nombre: linea.producto_nombre,
          categoria_nombre: linea.categoria_nombre,
          cantidad: linea.cantidad,
          precio_unitario: linea.precio_unitario,
          precio_total: linea.precio_total,
          fecha_venta: linea.fecha_venta,
          datos_originales: {
            import_date: new Date().toISOString()
          }
        }))
        
        const { data: lineasData, error: lineasError } = await supabase
          .from('ventas_lineas')
          .insert(lineasParaInsertar)
          .select()
        
        if (lineasError) {
          console.error('❌ Error insertando líneas:', lineasError)
          errores.push(`Líneas de ${ventaData.fecha_venta}: ${lineasError.message}`)
        } else {
          lineasInsertadas += lineasParaInsertar.length
          console.log(`✅ ${lineasParaInsertar.length} productos insertados para venta ${venta.id}`)
        }
      }
      
    } catch (error) {
      console.error('❌ Error procesando venta:', error)
      errores.push(`Venta ${ventaData.fecha_venta}: ${error.message}`)
    }
    }
  }
  
  // ================================================================
  // RESUMEN FINAL
  // ================================================================
  
  // Calcular totales para el resumen
  let totalBrutoImportado = 0;
  for (const [_, ventaData] of ventasMap) {
    totalBrutoImportado += ventaData.total_bruto;
  }
  
  console.log(`\n🎉 =================== IMPORTACIÓN COMPLETADA ===================`);
  console.log(`📊 Tipo de datos procesado: ${tipoDetectado.toUpperCase()}`);
  
  if (tipoDetectado === 'cierres_tpv') {
    console.log(`📋 CIERRES TPV:`);
    console.log(`   ✅ ${ventasInsertadas} cierres diarios importados`);
    console.log(`   💰 Total facturado: €${totalBrutoImportado.toFixed(2)}`);
    console.log(`   📅 Rango de fechas procesado`);
  }
  
  if (requiereProductos) {
    console.log(`📦 PRODUCTOS/INVENTARIO:`);
    console.log(`   ✅ ${productosInsertados} productos insertados/actualizados en tabla 'productos'`);
  }
  
  if (requiereVentas && tipoDetectado !== 'cierres_tpv') {
    console.log(`💰 VENTAS DETALLADAS:`);
    console.log(`   ✅ ${ventasInsertadas} ventas insertadas en tabla 'ventas_datos'`);
    console.log(`   📝 ${lineasInsertadas} líneas de productos en tabla 'ventas_lineas'`);
    console.log(`   💰 Total vendido: €${totalBrutoImportado.toFixed(2)}`);
  }
  
  if (errores.length > 0) {
    console.log(`⚠️ ERRORES: ${errores.length}`);
    errores.forEach(error => console.log(`   ❌ ${error}`));
  }
  
  console.log(`🎯 TABLAS AFECTADAS: ${[...(requiereProductos ? ['productos'] : []), ...(requiereVentas ? ['ventas_datos', 'ventas_lineas'] : [])].join(', ')}`);
  console.log(`================================================================\n`);
  
  return {
    productos_count: productosInsertados,
    ventas_count: ventasInsertadas,
    lineas_count: lineasInsertadas,
    tipo_datos: tipoDetectado,
    errores: errores.length > 0 ? errores : null,
    resumen: {
      tipo_archivo: tipoDetectado,
      productos_insertados: productosInsertados,
      ventas_procesadas: ventasMap.size,
      ventas_insertadas: ventasInsertadas,
      productos_vendidos: lineasInsertadas,
      total_bruto_importado: totalBrutoImportado.toFixed(2),
      promedio_productos_por_venta: ventasInsertadas > 0 ? (lineasInsertadas / ventasInsertadas).toFixed(1) : '0',
      tablas_afectadas: [
        ...(requiereProductos ? ['productos'] : []),
        ...(requiereVentas ? ['ventas_datos', 'ventas_lineas'] : [])
      ]
    }
  }
}

// =============================================
// FUNCIÓN: Analizar archivo
// =============================================
async function analyzeFile(file: File): Promise<FileAnalysis> {
  console.log(`🔍 Analizando archivo: ${file.name}`)
  
  const fileType = detectFileType(file.name)
  const buffer = await file.arrayBuffer()
  
  let data: any[][] = []
  
  try {
    switch (fileType) {
      case 'csv':
        data = await parseCSV(buffer)
        break
      case 'excel':
        data = await parseExcel(buffer)
        break
      case 'json':
        data = await parseJSON(buffer)
        break
      default:
        throw new Error('Tipo de archivo no soportado')
    }

    if (data.length === 0) {
      throw new Error('El archivo está vacío')
    }

    // =================================================================
    // SISTEMA HÍBRIDO DE PROCESAMIENTO DE ARCHIVOS v4.0
    // =================================================================
    console.log(`📊 Estructura detectada: ${data[0]?.length || 0} columnas en la primera fila`);
    
    // CASO 1: Archivo con UNA SOLA COLUMNA -> Buscar delimitadores
    if (data[0] && data[0].length === 1 && data.length > 1) {
      console.log('🔍 CASO 1: Archivo con columna única - Buscando delimitadores...');
      console.log('⚠️ Detectada columna única. Iniciando análisis inteligente de delimitadores...');
      
      // Imprimir las primeras 5 filas para debug
      console.log('📝 Primeras 5 filas del archivo (sin procesar):');
      for (let i = 0; i < Math.min(5, data.length); i++) {
        console.log(`  Fila ${i}: "${data[i][0]}"`);
      }
      
      // Lista extendida de delimitadores posibles (ordenados por prioridad)
      const possibleDelimiters = [
        '|',      // Pipe
        ';',      // Punto y coma
        '\t',     // Tab
        ',',      // Coma
        ':',      // Dos puntos
        '/',      // Barra
        '-',      // Guión
        '_',      // Guión bajo
        '#',      // Numeral
        '@',      // Arroba
        '~',      // Tilde
        '^',      // Circunflejo
        '&',      // Ampersand
        '*',      // Asterisco
        '=',      // Igual
        '+',      // Más
        '§',      // Sección
        '¦',      // Barra partida
        '÷',      // División
        '•',      // Bullet
        '→',      // Flecha
        '║',      // Doble barra vertical
        '│',      // Barra vertical simple
        '╪',      // Box drawing
        '▪',      // Cuadrado negro
        '◊'       // Rombo
      ];
      
      let bestDelimiter: string | null = null;
      let maxConsistency = 0;
      let delimiterCounts: { [key: string]: number[] } = {};
      
      // Analizar cada delimitador posible
      for (const delim of possibleDelimiters) {
        const counts: number[] = [];
        let hasVariation = false;
        
        // Contar ocurrencias en las primeras 20 filas (o todas si hay menos)
        for (let i = 0; i < Math.min(20, data.length); i++) {
          if (data[i] && data[i][0]) {
            const content = data[i][0].toString();
            const count = (content.match(new RegExp(delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            counts.push(count);
            if (count > 0) hasVariation = true;
          }
        }
        
        // Si encontramos el delimitador en al menos algunas filas
        if (hasVariation) {
          // Calcular la consistencia (cuántas filas tienen el mismo número de delimitadores)
          const nonZeroCounts = counts.filter(c => c > 0);
          if (nonZeroCounts.length > 0) {
            // Encontrar el modo (valor más frecuente)
            const mode = nonZeroCounts.sort((a, b) => 
              nonZeroCounts.filter(v => v === b).length - nonZeroCounts.filter(v => v === a).length
            )[0];
            
            const consistency = nonZeroCounts.filter(c => c === mode).length / nonZeroCounts.length;
            const avgCount = nonZeroCounts.reduce((a, b) => a + b, 0) / nonZeroCounts.length;
            
            // Puntuación basada en consistencia y número promedio de campos
            const score = consistency * avgCount;
            
            delimiterCounts[delim] = counts;
            
            console.log(`  Delimitador "${delim}": consistencia=${(consistency * 100).toFixed(1)}%, campos_promedio=${avgCount.toFixed(1)}, puntuación=${score.toFixed(2)}`);
            
            // Si este delimitador es mejor que el anterior
            if (score > maxConsistency && avgCount >= 2) { // Mínimo 2 campos esperados
              maxConsistency = score;
              bestDelimiter = delim;
            }
          }
        }
      }
      
      // Si no encontramos delimitador con el método anterior, intentar detectar patrones
      if (!bestDelimiter) {
        console.log('🔍 No se encontró delimitador consistente. Analizando patrones...');
        
        // Buscar patrones de espacios múltiples o estructuras regulares
        for (let i = 1; i < Math.min(10, data.length); i++) {
          if (data[i] && data[i][0]) {
            const content = data[i][0].toString();
            
            // Detectar múltiples espacios como delimitador
            if (content.match(/\s{2,}/)) {
              bestDelimiter = '  '; // Doble espacio
              console.log('✅ Detectado patrón de espacios múltiples');
              break;
            }
            
            // Detectar patrones tipo "campo1:valor1 campo2:valor2"
            if (content.match(/\w+:\w+\s+\w+:\w+/)) {
              bestDelimiter = ' ';
              console.log('✅ Detectado patrón clave:valor con espacios');
              break;
            }
          }
        }
      }
      
      if (bestDelimiter) {
        console.log(`✅ DELIMITADOR SELECCIONADO: "${bestDelimiter}"`);
        console.log(`📊 Reconstruyendo datos con el delimitador detectado...`);
        
        try {
          // Reconstruir los datos usando el delimitador detectado
          const newData = data.map((row, index) => {
            if (row && row[0]) {
              const content = row[0].toString();
              
              // Para espacios múltiples, usar split con regex
              if (bestDelimiter === '  ') {
                return content.split(/\s{2,}/).map(field => field.trim()).filter(f => f.length > 0);
              }
              
              // Para otros delimitadores
              const fields = content.split(bestDelimiter).map(field => field.trim());
              
              // Filtrar campos vacíos solo si hay suficientes campos con contenido
              const nonEmptyFields = fields.filter(f => f.length > 0);
              return nonEmptyFields.length >= 2 ? nonEmptyFields : fields;
            }
            return row;
          });
          
          // Verificar que la reconstrucción fue exitosa
          if (newData[0] && newData[0].length > 1) {
            data = newData;
            console.log('✨ Datos reconstruidos exitosamente');
            console.log(`📋 Nueva estructura - Columnas detectadas: ${data[0].length}`);
            console.log('📋 Headers:', data[0]);
            console.log('📋 Primera fila de datos:', data[1]);
          } else {
            console.log('⚠️ La reconstrucción no produjo múltiples columnas, manteniendo formato original');
          }
        } catch (splitError) {
          console.error('❌ Error al reconstruir datos:', splitError);
        }
      } else {
        console.log('❌ No se pudo detectar ningún delimitador válido');
        console.log('💡 Sugerencia: Verifica que el archivo use un delimitador consistente');
      }
    }
    // CASO 2: Archivo con MÚTIPLES COLUMNAS -> Procesar directamente
    else if (data[0] && data[0].length > 1) {
      console.log(`📋 CASO 2: Archivo con múltiples columnas (${data[0].length}) - Procesamiento directo`);
      console.log('📊 Estructura detectada como Excel/CSV bien formateado');
      
      // Mostrar información de las columnas para debug
      console.log('📋 Columnas detectadas:', data[0].slice(0, 10)); // Primeras 10 columnas
      if (data[1]) {
        console.log('📋 Primera fila de datos:', data[1].slice(0, 10)); // Primeros 10 valores
      }
    }
    // CASO 3: Archivo mal formateado o vacío
    else {
      console.log('⚠️ CASO 3: Archivo con estructura desconocida o vacío');
      if (data.length === 0) {
        throw new Error('El archivo está vacío');
      }
    }
    // =================================================================

    const headers = data[0] || []
    const sampleRows = data.slice(1, Math.min(11, data.length)) // Primeras 10 filas de datos
    
    // Detectar estructura y mapear columnas
    const mappedColumns = detectColumnMapping(headers, sampleRows)
    const detectedStructure = mappedColumns.producto !== undefined ? 'ventas' : 'unknown'

    console.log(`✅ Análisis completado: ${data.length} filas, estructura: ${detectedStructure}`)
    
    return {
      fileType,
      headers,
      sampleRows: data.slice(1), // Enviar todas las filas de datos (sin headers)
      totalRows: data.length - 1,
      encoding: 'utf-8',
      detectedStructure,
      mappedColumns
    }

  } catch (error) {
    console.error('❌ Error analizando archivo:', error)
    throw new Error(`Error procesando archivo: ${error.message}`)
  }
}

// =============================================
// MEJORA CRÍTICA 3: Mapeo inteligente basado en contenido
// =============================================
function analyzeColumnContent(columnData: any[]): string {
  if (!columnData || columnData.length === 0) return 'unknown';
  
  const samples = columnData.slice(0, 10).filter(val => val != null && val !== '');
  if (samples.length === 0) return 'unknown';
  
  // Analizar patrones en los datos reales
  const hasNumbers = samples.some(val => !isNaN(parseFloat(val.toString())));
  const hasDates = samples.some(val => {
    const date = new Date(val.toString());
    return isValidDate(date);
  });
  const hasProducts = samples.some(val => {
    const str = val.toString().toLowerCase();
    return str.length > 3 && /[a-z]/.test(str) && !/^\d+$/.test(str);
  });
  const hasTicketNumbers = samples.every(val => {
    const num = parseInt(val.toString());
    return !isNaN(num) && num > 0 && num < 10000;
  });
  const hasMoneyAmounts = samples.some(val => {
    const num = parseFloat(val.toString());
    return !isNaN(num) && num > 0 && num < 100000;
  });
  
  // Determinar tipo basado en contenido
  if (hasDates) return 'fecha';
  if (hasTicketNumbers && samples.length > 5) return 'numero_ticket';
  if (hasProducts) return 'producto';
  if (hasMoneyAmounts) return 'precio_o_total';
  if (hasNumbers) return 'numerico';
  
  return 'texto';
}

function detectColumnMapping(headers: string[], sampleRows: any[][]) {
  console.log(`🔍 MEJORA: Analizando contenido de columnas para mapeo inteligente...`);
  const mapping: any = {}
  
  // Normalizar headers para comparación
  const normalizedHeaders = headers.map(h => h.toString().toLowerCase().trim())
  
  // Analizar contenido real de cada columna
  const columnAnalysis = headers.map((_, index) => {
    const columnData = sampleRows.map(row => row[index]).filter(val => val != null);
    return {
      index,
      header: normalizedHeaders[index],
      contentType: analyzeColumnContent(columnData),
      sampleData: columnData.slice(0, 3)
    };
  });
  
  console.log(`📊 Análisis de contenido por columna:`);
  columnAnalysis.forEach(col => {
    console.log(`  Col ${col.index}: "${col.header}" -> ${col.contentType} [${col.sampleData.join(', ')}]`);
  });
  
  // DETECCIÓN MEJORADA: Usar header + análisis de contenido
  
  // Detectar columna de fecha
  const fechaPatterns = ['fecha', 'date', 'dia', 'day', 'fecha_venta', 'fecha venta', 'f.venta', 'fventa']
  
  // Priorizar por contenido real de fecha
  const fechaByContent = columnAnalysis.find(col => col.contentType === 'fecha');
  if (fechaByContent) {
    mapping.fecha = fechaByContent.index;
    console.log(`✅ Fecha detectada por CONTENIDO en columna ${fechaByContent.index}: "${fechaByContent.header}"`);
  } else {
    // Fallback a detección por header
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (fechaPatterns.some(p => normalizedHeaders[i].includes(p)) && 
          !normalizedHeaders[i].includes('hora')) {
        mapping.fecha = i;
        console.log(`✅ Fecha detectada por HEADER en columna ${i}: "${normalizedHeaders[i]}"`);
        break;
      }
    }
  }
  
  // Detectar columna de hora
  const horaPatterns = ['hora', 'time', 'tiempo', 'hour', 'h.venta', 'hventa']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (horaPatterns.some(p => normalizedHeaders[i].includes(p))) {
      mapping.hora = i
      break
    }
  }
  
  // Detectar columna de número de ticket/factura
  const ticketPatterns = ['ticket', 'numero', 'factura', 'invoice', 'recibo', 'receipt', 'nº', 'num', '#', 'id_venta', 'venta_id', 'transaccion', 'transaction', 'cierre']
  
  // Priorizar por contenido de números de ticket
  const ticketByContent = columnAnalysis.find(col => col.contentType === 'numero_ticket');
  if (ticketByContent) {
    mapping.numero_ticket = ticketByContent.index;
    console.log(`✅ Número ticket detectado por CONTENIDO en columna ${ticketByContent.index}: "${ticketByContent.header}"`);
  } else {
    // Fallback a detección por header
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (ticketPatterns.some(p => normalizedHeaders[i].includes(p)) &&
          !normalizedHeaders[i].includes('linea') &&
          !normalizedHeaders[i].includes('producto')) {
        mapping.numero_ticket = i;
        console.log(`✅ Número ticket detectado por HEADER en columna ${i}: "${normalizedHeaders[i]}"`);
        break;
      }
    }
  }
  
  // Detectar columna de cliente
  const clientePatterns = ['cliente', 'client', 'customer', 'comprador', 'buyer', 'nombre_cliente']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (clientePatterns.some(p => normalizedHeaders[i].includes(p))) {
      mapping.cliente = i
      break
    }
  }
  
  // Detectar columna de producto
  const productoPatterns = ['producto', 'product', 'articulo', 'item', 'descripcion', 'nombre', 'description', 'name']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (productoPatterns.some(p => normalizedHeaders[i].includes(p)) &&
        !normalizedHeaders[i].includes('categoria') &&
        !normalizedHeaders[i].includes('tipo')) {
      mapping.producto = i
      break
    }
  }
  
  // Detectar columna de cantidad
  const cantidadPatterns = ['cantidad', 'quantity', 'qty', 'unidades', 'units', 'cant']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (cantidadPatterns.some(p => normalizedHeaders[i].includes(p))) {
      mapping.cantidad = i
      break
    }
  }
  
  // Detectar columna de precio unitario
  const precioPatterns = ['precio', 'price', 'coste', 'cost', 'unitario', 'unit', 'pu', 'p.u']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (precioPatterns.some(p => normalizedHeaders[i].includes(p)) && 
        !normalizedHeaders[i].includes('total')) {
      mapping.precio = i
      break
    }
  }
  
  // Detectar columna de total/ventas
  const totalPatterns = ['total', 'importe', 'amount', 'subtotal', 'suma', 'ventas', 'venta', 'facturacion', 'ingresos']
  
  // Priorizar por contenido de cantidades monetarias
  const totalByContent = columnAnalysis.find(col => 
    col.contentType === 'precio_o_total' && 
    (totalPatterns.some(p => col.header.includes(p)) || col.header.includes('ventas'))
  );
  
  if (totalByContent) {
    mapping.total = totalByContent.index;
    console.log(`✅ Total/Ventas detectado por CONTENIDO en columna ${totalByContent.index}: "${totalByContent.header}"`);
  } else {
    // Fallback a detección por header
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (totalPatterns.some(p => normalizedHeaders[i].includes(p))) {
        mapping.total = i;
        console.log(`✅ Total detectado por HEADER en columna ${i}: "${normalizedHeaders[i]}"`);
        break;
      }
    }
  }
  
  // Detectar columna de método de pago
  const pagoPatterns = ['pago', 'payment', 'metodo', 'method', 'forma', 'tipo_pago', 'tipo pago']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (pagoPatterns.some(p => normalizedHeaders[i].includes(p))) {
      mapping.metodo_pago = i
      break
    }
  }
  
  // Detectar columna de categoría
  const categoriaPatterns = ['categoria', 'category', 'tipo', 'type', 'grupo', 'group', 'familia']
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (categoriaPatterns.some(p => normalizedHeaders[i].includes(p))) {
      mapping.categoria = i
      break
    }
  }
  
  console.log('📊 Mapeo detectado:', mapping)
  console.log('📋 Headers encontrados:', headers)
  
  return mapping
}

// =============================================
// FUNCIÓN: Detectar tipo de archivo
// =============================================
function detectFileType(filename: string): 'csv' | 'excel' | 'json' | 'unknown' {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'csv':
      return 'csv'
    case 'xlsx':
    case 'xls':
      return 'excel'
    case 'json':
      return 'json'
    default:
      return 'unknown'
  }
}

// =============================================
// MEJORA CRÍTICA 2: Validación de fechas más robusta
// =============================================
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime()) && 
         date.getFullYear() > 1900 && date.getFullYear() < 2030;
}

function parseDate(dateStr: any): Date {
  if (!dateStr) return new Date()
  
  // Si ya es una fecha válida
  if (dateStr instanceof Date) return dateStr
  
  const str = dateStr.toString().trim()
  
  // Intentar varios formatos
  // Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]))
  }
  
  // Formato YYYY-MM-DD
  const ymdMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]))
  }
  
  // Formato MM/DD/YYYY (americano)
  const mdyMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (mdyMatch) {
    // Verificar si el primer número es mayor a 12 (entonces es día)
    const first = parseInt(mdyMatch[1])
    const second = parseInt(mdyMatch[2])
    if (first > 12) {
      // Es DD/MM/YYYY
      return new Date(parseInt(mdyMatch[3]), second - 1, first)
    } else if (second > 12) {
      // Es MM/DD/YYYY
      return new Date(parseInt(mdyMatch[3]), first - 1, second)
    }
    // Por defecto, asumir formato español DD/MM/YYYY
    return new Date(parseInt(mdyMatch[3]), second - 1, first)
  }
  
  // Intentar parse directo
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  
  // Si todo falla, retornar fecha actual
  console.warn(`⚠️ No se pudo parsear la fecha: ${str}`)
  return new Date()
}

// =============================================
// PARSERS DE ARCHIVOS
// =============================================
async function parseCSV(buffer: ArrayBuffer): Promise<any[][]> {
  const text = new TextDecoder('utf-8').decode(buffer)
  const lines = text.split('\n').filter(line => line.trim())
  
  return lines.map(line => {
    // Parser CSV mejorado - detecta comas y punto y coma
    const delimiter = line.includes(';') ? ';' : ','
    
    // Manejar campos con comillas
    const regex = new RegExp(`(?:^|${delimiter})("(?:[^"]*(?:""[^"]*)*)"|[^${delimiter}]*)`, 'g')
    const fields = []
    let match
    
    while ((match = regex.exec(line)) !== null) {
      let field = match[1]
      if (field.startsWith('"') && field.endsWith('"')) {
        field = field.slice(1, -1).replace(/""/g, '"')
      }
      fields.push(field.trim())
    }
    
    return fields
  })
}

async function parseExcel(buffer: ArrayBuffer): Promise<any[][]> {
  try {
    console.log('🔄 Intentando cargar XLSX library...')
    
    // Intentar múltiples CDNs como fallback
    let XLSX;
    try {
      XLSX = await import('https://esm.sh/xlsx@0.18.5')
    } catch (esm_error) {
      console.log('❌ Error con esm.sh, intentando skypack...', esm_error)
      try {
        XLSX = await import('https://cdn.skypack.dev/xlsx@0.18.5')
      } catch (skypack_error) {
        console.log('❌ Error con skypack, intentando jspm...', skypack_error)
        XLSX = await import('https://jspm.dev/xlsx@0.18.5')
      }
    }
    
    console.log('✅ XLSX library cargada exitosamente')
    
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convertir a array de arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false })
    
    console.log(`📝 Excel crudo parseado: ${rawData.length} filas`)
    
    // ================================================================
    // DETECCIÓN INTELIGENTE DE INICIO DE DATOS
    // ================================================================
    let dataStartIndex = 0;
    const potentialHeaders = ['fecha', 'producto', 'venta', 'total', 'precio', 'cantidad', 'nº', 'numero', 'cierre', 'efectivo', 'tarjeta'];
    
    // Buscar la primera fila que parezca una cabecera real de datos
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      if (rawData[i] && Array.isArray(rawData[i]) && rawData[i].length > 1) {
        const firstRow = rawData[i].map(cell => (cell || '').toString().toLowerCase());
        
        // Si la fila tiene múltiples campos y al menos uno parece una cabecera
        const hasHeaderPattern = firstRow.some(cell => 
          potentialHeaders.some(pattern => cell.includes(pattern))
        );
        
        if (hasHeaderPattern && firstRow.filter(cell => cell.trim() !== '').length >= 3) {
          dataStartIndex = i;
          console.log(`🎯 Detectado inicio de datos en fila ${i}: [${firstRow.slice(0, 5).join(', ')}...]`);
          break;
        }
      }
    }
    
    // Si no encontramos una cabecera clara, buscar la primera fila con múltiples columnas numeras
    if (dataStartIndex === 0) {
      for (let i = 1; i < Math.min(15, rawData.length); i++) {
        if (rawData[i] && Array.isArray(rawData[i]) && rawData[i].length > 3) {
          const hasNumericData = rawData[i].some(cell => {
            const str = (cell || '').toString();
            return /\d/.test(str) && (str.includes(',') || str.includes('.') || /^\d+$/.test(str));
          });
          
          if (hasNumericData) {
            dataStartIndex = Math.max(0, i - 1); // Tomar la fila anterior como cabecera
            console.log(`🔢 Detectado inicio de datos numéricos en fila ${i}, usando fila ${dataStartIndex} como cabecera`);
            break;
          }
        }
      }
    }
    
    // Extraer solo los datos relevantes
    const jsonData = rawData.slice(dataStartIndex);
    
    // Filtrar filas vacías o con una sola celda
    const cleanData = jsonData.filter(row => 
      row && Array.isArray(row) && row.length > 1 && 
      row.some(cell => cell && cell.toString().trim() !== '')
    );
    
    console.log(`📋 Primeras 3 filas procesadas:`);
    for (let i = 0; i < Math.min(3, cleanData.length); i++) {
      console.log(`  Fila ${i}: [${cleanData[i].slice(0, 5).map(c => `"${c}"`).join(', ')}${cleanData[i].length > 5 ? '...' : ''}]`);
    }
    
    console.log(`✅ Excel procesado: ${cleanData.length} filas de datos (omitidas ${rawData.length - cleanData.length} filas de metadata)`);
    return cleanData as any[][];
  } catch (error) {
    console.error('❌ Error parseando Excel:', error)
    console.error('❌ Stack trace:', error.stack)
    throw new Error(`Error procesando archivo Excel: ${error.message}`)
  }
}

async function parseJSON(buffer: ArrayBuffer): Promise<any[][]> {
  const text = new TextDecoder('utf-8').decode(buffer)
  const jsonData = JSON.parse(text)
  
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    // Si es array de objetos, convertir a array de arrays
    if (typeof jsonData[0] === 'object') {
      const headers = Object.keys(jsonData[0])
      const rows = [headers, ...jsonData.map(obj => headers.map(key => obj[key]))]
      return rows
    }
  }
  
  throw new Error('Formato JSON no soportado')
}

console.log('🚀 Edge Function intelligent-import-sales iniciada con soporte de importación a nivel de transacción (anti-duplicados)')
