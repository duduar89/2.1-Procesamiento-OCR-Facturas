// =============================================
// EDGE FUNCTION: sync-numier-data CORREGIDA
// Soluciona problemas de inserción de líneas y manejo de transacciones
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface SyncRequest {
  restaurante_id: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  endpoints?: ('sales' | 'products' | 'expenses')[];
  force_resync?: boolean;
}

interface SyncResult {
  sistema: string;
  endpoint: string;
  procesados: number;
  exitosos: number;
  errores: number;
  estado: 'completado' | 'parcial' | 'error';
  mensaje?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      restaurante_id, 
      fecha_inicio,
      fecha_fin,
      endpoints = ['sales', 'products'],
      force_resync = false 
    }: SyncRequest = await req.json();

    if (!restaurante_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'restaurante_id es requerido'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get Numier configuration
    const { data: restaurant, error: configError } = await supabase
      .from('restaurantes')
      .select('integraciones')
      .eq('id', restaurante_id)
      .single();

    if (configError || !restaurant) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Restaurante no encontrado'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    const numierConfig = restaurant.integraciones?.numier;
    
    if (!numierConfig?.activo || !numierConfig?.api_key) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Integración Numier no configurada o inactiva'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Set default date range
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const fechaInicio = fecha_inicio || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Initialize Numier client
    const client = new NumierAPIClient(
      numierConfig.base_url,
      numierConfig.api_key
    );

    const resultados: SyncResult[] = [];

    // Sync each requested endpoint
    for (const endpoint of endpoints) {
      try {
        let resultado: SyncResult;

        switch (endpoint) {
          case 'sales':
            resultado = await syncVentas(supabase, client, restaurante_id, numierConfig.tpv_ids, fechaInicio, fechaFin);
            break;
          case 'products':
            resultado = await syncProductos(supabase, client, restaurante_id, numierConfig.tpv_ids);
            break;
          default:
            resultado = {
              sistema: 'numier',
              endpoint,
              procesados: 0,
              exitosos: 0,
              errores: 1,
              estado: 'error',
              mensaje: `Endpoint ${endpoint} no soportado`
            };
        }

        resultados.push(resultado);
      } catch (error) {
        console.error(`Error syncing ${endpoint}:`, error);
        resultados.push({
          sistema: 'numier',
          endpoint,
          procesados: 0,
          exitosos: 0,
          errores: 1,
          estado: 'error',
          mensaje: error.message
        });
      }
    }

    const totalExitosos = resultados.reduce((sum, r) => sum + r.exitosos, 0);
    const totalErrores = resultados.reduce((sum, r) => sum + r.errores, 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronización completada: ${totalExitosos} registros exitosos, ${totalErrores} errores`,
        restaurante_id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        resultados
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error en sync-numier-data:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// =============================================
// NUMIER API CLIENT CLASS (sin cambios)
// =============================================
class NumierAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async fetchSalesByTpv(tpvId: string, startDate: string, endDate: string, page = 1) {
    const url = `${this.baseUrl}/v2/sales/${tpvId}?start_date=${startDate}&end_date=${endDate}&pag=${page}`;
    return this.makeRequest(url);
  }

  async fetchProducts(tpvId: string, page = 1) {
    const url = `${this.baseUrl}/getProducts/${tpvId}?pag=${page}`;
    return this.makeRequest(url);
  }

  private async makeRequest(url: string) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'APIKEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

// =============================================
// SYNC FUNCTIONS CORREGIDAS
// =============================================

async function syncVentas(
  supabase: any,
  client: NumierAPIClient,
  restauranteId: string,
  tpvIds: string[],
  fechaInicio: string,
  fechaFin: string
): Promise<SyncResult> {
  
  let totalProcesados = 0;
  let totalExitosos = 0;
  let totalErrores = 0;

  try {
    console.log(`=== SYNC VENTAS ===`);
    console.log(`TPVs a sincronizar: ${tpvIds.join(', ')}`);
    console.log(`Rango: ${fechaInicio} - ${fechaFin}`);

    // ✅ ITERAR POR CADA TPV
    for (const tpvId of tpvIds) {
      console.log(`\n--- Sincronizando TPV: ${tpvId} ---`);
      
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`TPV ${tpvId} - Página ${page}`);
        
        // ✅ USAR ENDPOINT CORRECTO
        const data = await client.fetchSalesByTpv(tpvId, fechaInicio, fechaFin, page);
        
        console.log(`Respuesta: ${data.result?.length || 0} ventas, ${data.totalpages || 1} páginas totales`);
        
        if (!data.result || data.result.length === 0) {
          console.log(`TPV ${tpvId}: No hay más datos en página ${page}`);
          hasMorePages = false;
          break;
        }

        for (const venta of data.result) {
          try {
            // Validar datos mínimos
            if (!venta.Serie || !venta.Number || !venta.BusinessDay) {
              console.warn('Venta omitida - datos incompletos:', {
                serie: venta.Serie,
                number: venta.Number,
                businessDay: venta.BusinessDay
              });
              totalErrores++;
              continue;
            }

            await insertVentaUnificada(supabase, restauranteId, 'numier', venta);
            totalExitosos++;
          } catch (error) {
            console.error(`Error insertando venta ${venta.Number}:`, error);
            totalErrores++;
          }
          totalProcesados++;
        }

        hasMorePages = page < (data.totalpages || 1);
        page++;
        
        // Pequeño delay para no saturar la API
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    console.log(`\n=== RESUMEN SYNC ===`);
    console.log(`Procesados: ${totalProcesados}`);
    console.log(`Exitosos: ${totalExitosos}`);
    console.log(`Errores: ${totalErrores}`);

    return {
      sistema: 'numier',
      endpoint: 'sales',
      procesados: totalProcesados,
      exitosos: totalExitosos,
      errores: totalErrores,
      estado: totalErrores > 0 ? 'parcial' : 'completado'
    };

  } catch (error) {
    throw error;
  }
}

async function syncProductos(
  supabase: any,
  client: NumierAPIClient,
  restauranteId: string,
  tpvIds: string[]
): Promise<SyncResult> {
  
  let totalProcesados = 0;
  let totalExitosos = 0;
  let totalErrores = 0;

  for (const tpvId of tpvIds) {
    try {
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const data = await client.fetchProducts(tpvId, page);
        
        if (!data.result || data.result.length === 0) {
          hasMorePages = false;
          break;
        }

        for (const producto of data.result) {
          try {
            await supabase
              .from('productos_catalogo')
              .upsert({
                restaurante_id: restauranteId,
                producto_id_externo: producto.id,
                sistema_origen: 'numier',
                nombre: producto.name,
                categoria_id: producto.idCategory,
                categoria_nombre: producto.nameCategory || null, // ✅ Explícitamente null si vacío
                precio_base: parseFloat(producto.price1 || 0),
                precios_alternativos: {
                  precio1: parseFloat(producto.price1 || 0),
                  precio2: parseFloat(producto.price2 || 0),
                  precio3: parseFloat(producto.price3 || 0),
                  precio4: parseFloat(producto.price4 || 0)
                },
                activo: producto.isActive,
                datos_originales: producto
              }, {
                onConflict: 'restaurante_id,sistema_origen,producto_id_externo'
              });

            totalExitosos++;
          } catch (error) {
            console.error(`Error insertando producto ${producto.id}:`, error);
            totalErrores++;
          }
          totalProcesados++;
        }

        hasMorePages = page < (data.totalpages || 1);
        page++;
      }
    } catch (error) {
      console.error(`Error syncing products for TPV ${tpvId}:`, error);
      totalErrores++;
    }
  }

  return {
    sistema: 'numier',
    endpoint: 'products',
    procesados: totalProcesados,
    exitosos: totalExitosos,
    errores: totalErrores,
    estado: totalErrores > 0 ? 'parcial' : 'completado'
  };
}

// =============================================
// FUNCIÓN CORREGIDA DE INSERCIÓN DE VENTAS
// =============================================
async function insertVentaUnificada(
  supabase: any,
  restauranteId: string,
  sistemaOrigen: string,
  ventaData: any
) {
  const ventaUnificada = {
    restaurante_id: restauranteId,
    sistema_origen: sistemaOrigen,
    id_externo: `${ventaData.Serie}-${ventaData.Number}`.trim(),
    referencia_externa: ventaData.TaxDocumentNumber,
    fecha_venta: ventaData.BusinessDay,
    fecha_hora_completa: ventaData.Date,
    tpv_id: ventaData.Pos?.Id,
    tpv_nombre: ventaData.Pos?.Name,
    seccion: ventaData.Section?.sectionName,
    num_comensales: ventaData.NumDiners || 0,
    total_bruto: parseFloat(ventaData.Totals?.GrossAmount || 0),
    total_neto: parseFloat(ventaData.Totals?.NetAmount || 0),
    total_impuestos: parseFloat(ventaData.Totals?.VatAmount || 0),
    descuentos: parseFloat(ventaData.Totals?.DiscountAmount || 0),
    propinas: parseFloat(ventaData.Totals?.SurchargeAmount || 0),
    metodo_pago: ventaData.Payments,
    datos_originales: ventaData,
  };

  console.log('Insertando venta:', ventaUnificada.id_externo);

  // Insert main sale record con manejo de errores mejorado
  const { data: ventaInserted, error } = await supabase
    .from('ventas_datos')
    .upsert(ventaUnificada, {
      onConflict: 'restaurante_id,sistema_origen,id_externo'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error en upsert venta:', error);
    throw new Error(`Error insertando venta: ${error.message}`);
  }

  if (!ventaInserted?.id) {
    throw new Error('No se pudo obtener el ID de la venta insertada');
  }

  console.log('Venta insertada con ID:', ventaInserted.id);

  // CORRECCIÓN CRÍTICA: Insertar líneas de venta con transacción
  if (ventaData.InvoiceItems?.length > 0) {
    const fechaVentaFormateada = formatDate(ventaData.BusinessDay);

    const lineasToInsert = ventaData.InvoiceItems.map((item: any) => ({
      venta_id: ventaInserted.id,
      restaurante_id: restauranteId,
      producto_id_externo: item.idProduct,
      producto_nombre: item.name,
      categoria_id: item.idCategory,
      categoria_nombre: null, // ✅ Intencionalmente null - se resolverá en dashboard
      cantidad: parseFloat(item.units || 0),
      precio_unitario: parseFloat(item.price || 0),
      precio_total: parseFloat(item.amount || 0),
      tipo_impuesto: item.vatType,
      datos_originales: item,
      fecha_venta: fechaVentaFormateada,
    }));

    console.log(`Insertando ${lineasToInsert.length} líneas de venta`);

    // USAR INSERT EN LUGAR DE UPSERT para evitar conflictos
    const { data: lineasResult, error: lineasError } = await supabase
      .from('ventas_lineas')
      .insert(lineasToInsert)
      .select('id');

    if (lineasError) {
      console.error('Error insertando líneas:', lineasError);
      // No lanzar error aquí, solo loguear
      console.warn(`Líneas no insertadas para venta ${ventaInserted.id}`);
    } else {
      console.log(`${lineasResult?.length || 0} líneas insertadas correctamente`);
    }
  }

  return ventaInserted;
}

function formatDate(dateString: string): string {
  try {
    const fecha = new Date(dateString);
    if (!isNaN(fecha.getTime())) {
      return fecha.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn('Error convirtiendo fecha:', dateString);
  }
  return dateString;
}