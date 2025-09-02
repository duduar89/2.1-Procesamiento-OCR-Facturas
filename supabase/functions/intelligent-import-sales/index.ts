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
  detectedStructure: 'ventas' | 'productos' | 'tickets_medios' | 'unknown'
  mappedColumns?: {
    fecha?: number
    hora?: number
    numero_ticket?: number
    cliente?: number
    producto?: number
    cantidad?: number
    precio?: number
    total?: number
    ticket_medio?: number
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
// FUNCIÓN: Validar compatibilidad de datos
// =============================================
async function validateDataCompatibility(
  supabase: any,
  analysisData: FileAnalysis,
  restauranteId: string
): Promise<{ valid: boolean; conflictos: string[]; sugerencia: string; accion: 'crear' | 'enriquecer' }> {
  console.log('🔍 Analizando datos para importación inteligente...');
  
  const conflictos: string[] = [];
  let sugerencia = '';
  let accion: 'crear' | 'enriquecer' = 'crear';
  
  // Extraer fechas del archivo a importar
  const fechasArchivo = new Set<string>();
  const dataRows = analysisData.allRows || analysisData.sampleRows;
  
  if (analysisData.mappedColumns?.fecha !== undefined) {
    dataRows.forEach(row => {
      const fechaRaw = row[analysisData.mappedColumns!.fecha!];
      if (fechaRaw) {
        const fecha = parseSpanishDate(fechaRaw.toString());
        if (fecha) {
          fechasArchivo.add(fecha.toISOString().split('T')[0]);
        }
      }
    });
  }
  
  if (fechasArchivo.size === 0) {
    return { valid: true, conflictos: [], sugerencia: 'No se detectaron fechas para validar', accion: 'crear' };
  }
  
  // Verificar qué datos existen para estas fechas
  const fechasArray = Array.from(fechasArchivo);
  const { data: datosExistentes, error } = await supabase
    .from('ventas_datos')
    .select('fecha_venta, ticket_medio, sistema_origen, total_bruto, num_comensales')
    .eq('restaurante_id', restauranteId)
    .in('fecha_venta', fechasArray);
    
  if (error) {
    console.warn('Error validando datos existentes:', error);
    return { valid: true, conflictos: [], sugerencia: 'Error de validación, procediendo...', accion: 'crear' };
  }
  
  if (datosExistentes.length === 0) {
    // No hay datos existentes - crear nuevos
    sugerencia = 'No hay datos existentes para estas fechas. Se crearán registros nuevos.';
    accion = 'crear';
  } else {
    // Hay datos existentes - analizar si se pueden enriquecer
    accion = 'enriquecer';
    const fechasConDatos = datosExistentes.length;
    const fechasConTicketMedio = datosExistentes.filter(d => d.ticket_medio && parseFloat(d.ticket_medio) > 0).length;
    
    console.log(`📊 Datos existentes encontrados:`);
    console.log(`   - ${fechasConDatos} fechas con datos`);
    console.log(`   - ${fechasConTicketMedio} con ticket_medio`);
    
    // ✅ NUEVA LÓGICA: ENRIQUECIMIENTO INTELIGENTE
    const tipoArchivoActual = analysisData.detectedStructure;
    const nuevosValores = analysisData.mappedColumns;
    
    if (tipoArchivoActual === 'tickets_medios' && nuevosValores?.ticket_medio !== undefined) {
      sugerencia = `Se enriquecerán ${fechasConDatos} registros existentes con datos de ticket_medio del Excel.`;
    } else if (nuevosValores?.producto !== undefined) {
      sugerencia = `Se enriquecerán ${fechasConDatos} registros existentes con datos de productos del Excel.`;
    } else {
      sugerencia = `Se enriquecerán ${fechasConDatos} registros existentes con la nueva información disponible.`;
    }
    
    console.log(`✅ MODO ENRIQUECIMIENTO: Los datos existentes se complementarán con la nueva información`);
  }
  
  console.log(`🎯 Validación completada: ${conflictos.length} conflictos, acción: ${accion}`);
  
  return {
    valid: true,  // ✅ SIEMPRE PERMITIR (modo inteligente)
    conflictos,
    sugerencia,
    accion
  };
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
  
  // ✅ VALIDAR COMPATIBILIDAD ANTES DE IMPORTAR
  const validacion = await validateDataCompatibility(supabase, analysisData, restauranteId);
  if (!validacion.valid) {
    throw new Error(`Conflicto de datos: ${validacion.conflictos.join(', ')}. ${validacion.sugerencia}`);
  }
  
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
    // Extraer datos comunes - 🔧 CORREGIDO: Usar parseSpanishDate
    const fechaRaw = mappedColumns?.fecha !== undefined ? row[mappedColumns.fecha] : null;
    console.log(`🔍 DEBUG fecha - valor raw = "${fechaRaw}"`);
    const fecha = fechaRaw ? parseSpanishDate(fechaRaw.toString()) : new Date();
    if (fecha && fechaRaw) {
      console.log(`✅ FECHA procesada: "${fechaRaw}" → ${fecha.toISOString().split('T')[0]}`);
    } else if (fechaRaw) {
      console.warn(`❌ FECHA no procesada: "${fechaRaw}"`);
    }
    const hora = mappedColumns?.hora !== undefined ? row[mappedColumns.hora] : '';
    const producto = mappedColumns?.producto !== undefined ? row[mappedColumns.producto] : '';
    const cantidad = mappedColumns?.cantidad !== undefined ? parseFloat(row[mappedColumns.cantidad]) || 1 : 1;
    const precio = mappedColumns?.precio !== undefined ? parseFloat(row[mappedColumns.precio]) || 0 : 0;
    const total = mappedColumns?.total !== undefined ? parseFloat(row[mappedColumns.total]) || (precio * cantidad) : (precio * cantidad);
    // ✅ DEBUGGING: Extraer ticket_medio con logging detallado
    let ticketMedio = null;
    if (mappedColumns?.ticket_medio !== undefined) {
      const rawValue = row[mappedColumns.ticket_medio];
      console.log(`🔍 DEBUG ticket_medio - valor raw = "${rawValue}", tipo = ${typeof rawValue}`);
      
      if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
        const parsedValue = parseFloat(rawValue);
        
        // 🛡️ FILTRO MONETARIO: Validar rango razonable para ticket medio
        if (!isNaN(parsedValue) && parsedValue > 0) {
          if (parsedValue >= 1 && parsedValue <= 500) {
            ticketMedio = parsedValue;
            console.log(`✅ FILTRO: Ticket medio válido: €${ticketMedio}`);
          } else {
            console.warn(`❌ FILTRO: Ticket medio fuera de rango: €${parsedValue} (permitido: €1-€500)`);
          }
        } else {
          console.warn(`❌ FILTRO: Ticket medio no numérico: parseFloat("${rawValue}") = ${parsedValue}`);
        }
      } else {
        console.log(`❌ FILTRO: Ticket medio vacío: "${rawValue}"`);
      }
    }
    const categoria = mappedColumns?.categoria !== undefined ? row[mappedColumns.categoria] || 'Sin categoría' : 'Sin categoría';
    const numeroTicket = mappedColumns?.numero_ticket !== undefined ? row[mappedColumns.numero_ticket] : null;
    const cliente = mappedColumns?.cliente !== undefined ? row[mappedColumns.cliente] : null;
    const metodoPago = mappedColumns?.metodo_pago !== undefined ? row[mappedColumns.metodo_pago] || 'Efectivo' : 'Efectivo';
    
    // 🛡️ FILTROS DE VALIDACIÓN ROBUSTOS
    const filaVacia = !producto && !total && !numeroTicket;
    if (filaVacia) {
      continue;
    }
    
    // 🛡️ FILTRO: Fecha obligatoria y válida
    if (!fecha) {
      console.warn(`❌ FILTRO: Fila sin fecha válida, saltando`);
      continue;
    }
    
    // 🛡️ FILTRO: Total debe estar en rango razonable
    if (total < 0 || total > 50000) {
      console.warn(`❌ FILTRO: Total fuera de rango: €${total} (permitido: €0-€50,000)`);
      continue;
    }
    
    // 🛡️ FILTRO: Cantidad debe ser razonable
    if (cantidad <= 0 || cantidad > 1000) {
      console.warn(`❌ FILTRO: Cantidad fuera de rango: ${cantidad} (permitido: 1-1000)`);
      continue;
    }
    
    // 🛡️ FILTRO: Precio unitario debe ser razonable
    if (precio < 0 || precio > 1000) {
      console.warn(`❌ FILTRO: Precio unitario fuera de rango: €${precio} (permitido: €0-€1,000)`);
      continue;
    }
    
    console.log(`✅ FILTRO: Fila válida - Fecha: ${fecha.toISOString().split('T')[0]}, Total: €${total}, Producto: ${producto}`);
    
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
          ticket_medio: ticketMedio,  // ✅ AGREGAR TICKET_MEDIO
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
            ticket_medio: ticketMedio,  // ✅ AGREGAR TICKET_MEDIO
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

      // ✅ CONSTRUIR OBJETO DE VENTA CON TICKET_MEDIO SI APLICA
      const ventaObject: any = {
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
      };

      // ✅ ENRIQUECIMIENTO INTELIGENTE: Solo agregar campos que tengan valor
      console.log(`🔍 DEBUG ventaData.ticket_medio: "${ventaData.ticket_medio}", tipo: ${typeof ventaData.ticket_medio}`);
      
      // Solo agregar ticket_medio si tiene un valor válido
      if (ventaData.ticket_medio && parseFloat(ventaData.ticket_medio) > 0) {
        ventaObject.ticket_medio = parseFloat(ventaData.ticket_medio);
        console.log(`💰 ✅ ENRIQUECIENDO con ticket_medio: €${ventaObject.ticket_medio} para ${ventaData.fecha_venta}`);
      }
      
      // Solo agregar num_comensales si tiene un valor válido  
      if (ventaData.num_comensales && parseInt(ventaData.num_comensales) > 0) {
        ventaObject.num_comensales = parseInt(ventaData.num_comensales);
        console.log(`👥 ✅ ENRIQUECIENDO con num_comensales: ${ventaObject.num_comensales} para ${ventaData.fecha_venta}`);
      }
      
      console.log(`🔧 Objeto a guardar/actualizar:`, Object.keys(ventaObject));
      console.log(`🔧 TICKET_MEDIO en objeto:`, ventaObject.ticket_medio);
      console.log(`🔧 Fecha a upsert:`, ventaObject.fecha_venta);

      // 1. Usar UPSERT para insertar la venta y evitar duplicados a nivel de transacción
      const { data: venta, error: ventaError } = await supabase
        .from('ventas_datos')
        .upsert(ventaObject, {
          onConflict: 'restaurante_id, fecha_venta',
          ignoreDuplicates: false  // 🔧 CRÍTICO: Permite actualizar registros existentes
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
  
  // 🛡️ FILTRO FINAL: Validar calidad de la importación
  const totalFilas = ventasMap.size;
  const porcentajeExito = totalFilas > 0 ? (ventasInsertadas / totalFilas * 100) : 0;
  const porcentajeErrores = totalFilas > 0 ? (errores.length / totalFilas * 100) : 0;
  
  console.log(`📊 === ESTADÍSTICAS DE FILTROS ===`);
  console.log(`✅ Registros válidos: ${ventasInsertadas}/${totalFilas} (${porcentajeExito.toFixed(1)}%)`);
  console.log(`❌ Registros filtrados: ${errores.length}/${totalFilas} (${porcentajeErrores.toFixed(1)}%)`);
  
  // 🛡️ FILTRO: Advertir si hay muchos errores
  if (porcentajeErrores > 50) {
    console.warn(`🚨 ADVERTENCIA: ${porcentajeErrores.toFixed(1)}% de datos fueron filtrados. Revisa el formato del archivo.`);
  }
  
  console.log(`================================================================\n`);
  
  return {
    productos_count: productosInsertados,
    ventas_count: ventasInsertadas,
    lineas_count: lineasInsertadas,
    tipo_datos: tipoDetectado,
    errores: errores.length > 0 ? errores : null,
    quality_check: {
      success_rate: porcentajeExito,
      error_rate: porcentajeErrores,
      status: porcentajeExito >= 80 ? 'excellent' : porcentajeExito >= 60 ? 'good' : 'warning'
    },
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
    
    // ✅ NUEVA LÓGICA: Detección inteligente de estructura
    let detectedStructure: 'ventas' | 'productos' | 'tickets_medios' | 'unknown' = 'unknown'
    
    if (mappedColumns.ticket_medio !== undefined) {
        detectedStructure = 'tickets_medios'
        console.log('🎯 Detectado: Archivo de TICKETS MEDIOS')
    } else if (mappedColumns.producto !== undefined) {
        detectedStructure = 'ventas'
        console.log('🎯 Detectado: Archivo de VENTAS INDIVIDUALES')
    } else {
        console.log('❓ Estructura no reconocida automáticamente')
    }

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
    // 🔧 CORREGIDO: Usar parseSpanishDate en lugar de new Date()
    const parsedDate = parseSpanishDate(val.toString());
    return parsedDate !== null;
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
    console.log(`🔍 MUESTRA de fechas detectadas: ${fechaByContent.sampleData.join(', ')}`);
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
  
  // ✅ NUEVO: Detectar columna ticket_medio
  const ticketMedioPatterns = [
    'ticket_medio', 'ticket medio', 'ticketmedio', 'ticket promedio', 'ticket average', 'avg_ticket', 'promedio_ticket', 'promedio', 'medio',
    'precio medio por ticket', 'precio_medio_por_ticket', 'preciomedioporticket', 'ticket_price_avg', 'avg_ticket_price'
  ]
  console.log(`🔍 DEBUG: Buscando ticket_medio en headers: ${normalizedHeaders.join(', ')}`);
  
  for (let i = 0; i < normalizedHeaders.length; i++) {
    // ❌ EXCLUIR explícitamente "precio medio por comensal"
    if (normalizedHeaders[i].includes('comensal') || normalizedHeaders[i].includes('comensales')) {
      console.log(`❌ EXCLUIDO: "${headers[i]}" contiene 'comensal' - NO es ticket medio`);
      continue;
    }
    
    const foundPattern = ticketMedioPatterns.find(p => normalizedHeaders[i].includes(p));
    if (foundPattern) {
      mapping.ticket_medio = i
      console.log(`✅ Ticket medio detectado en columna ${i}: "${headers[i]}" (normalizado: "${normalizedHeaders[i]}") usando patrón: "${foundPattern}"`);
      break
    }
  }
  
  if (mapping.ticket_medio === undefined) {
    console.log(`❌ NO se detectó columna ticket_medio en: ${headers.join(', ')}`);
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

// ✅ FUNCIÓN HELPER: Parseador de fechas con filtros robustos
function parseSpanishDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  try {
    let cleanDate = dateStr.toString().trim();
    
    // 🛡️ FILTRO 1: Rechazar fechas obviamente incorrectas
    if (cleanDate.length < 6 || cleanDate.length > 10) {
      console.warn(`❌ FILTRO: Longitud de fecha inválida: "${cleanDate}"`);
      return null;
    }
    
    // Patrones de fecha española
    const patterns = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/,
      // DD/MM/YY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
      // DD-MM-YY
      /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
      // DD.MM.YY
      /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/
    ];
    
    for (const pattern of patterns){
      const match = cleanDate.match(pattern);
      if (match) {
        let day = parseInt(match[1]);
        let month = parseInt(match[2]);
        let year = parseInt(match[3]);
        
        // 🛡️ FILTRO 2: Validar día y mes antes de procesar
        if (day < 1 || day > 31 || month < 1 || month > 12) {
          console.warn(`❌ FILTRO: Día/mes inválido: ${day}/${month}/${year}`);
          continue;
        }
        
        // Ajustar año si es de 2 dígitos
        if (year < 100) {
          // Si el año es menor a 50, asumimos 2000s (00-49 = 2000-2049)
          // Si el año es mayor a 50, asumimos 1900s (50-99 = 1950-1999)
          if (year < 50) {
            year += 2000;
          } else {
            year += 1900;
          }
        }
        
        // 🛡️ FILTRO 3: Rango de años MENOS RESTRICTIVO para restaurantes
        const currentYear = new Date().getFullYear();
        if (year < 1990 || year > currentYear + 2) {
          console.warn(`❌ FILTRO: Año fuera de rango: ${year} (permitido: 1990-${currentYear + 2})`);
          continue;
        }
        
        // 🛡️ FILTRO 4: Crear fecha y validar que sea real
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
          console.warn(`❌ FILTRO: Fecha no existe: ${day}/${month}/${year}`);
          continue;
        }
        
        // 🛡️ FILTRO 5: Permitir fechas futuras razonables (hasta 30 días)
        const maxFutureDate = new Date();
        maxFutureDate.setDate(maxFutureDate.getDate() + 30);
        if (date > maxFutureDate) {
          console.warn(`❌ FILTRO: Fecha demasiado futura: ${date.toISOString()}`);
          continue;
        }
        
        console.log(`✅ FILTRO: Fecha válida: ${day}/${month}/${year} → ${date.toISOString().split('T')[0]}`);
        return date;
      }
    }
    
    console.warn(`❌ FILTRO: Formato de fecha no reconocido: "${cleanDate}"`);
    return null;
  } catch (error) {
    console.warn('❌ FILTRO: Error parseando fecha:', dateStr, error);
    return null;
  }
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
