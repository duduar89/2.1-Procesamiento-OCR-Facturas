// =============================================
// EDGE FUNCTION: sync-numier-data
// Archivo: /functions/sync-numier-data/index.ts
// Sincroniza ventas, productos y gastos desde Numier API
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request data
    const { 
      restaurante_id, 
      fecha_inicio,
      fecha_fin,
      endpoints = ['sales', 'products'],
      force_resync = false 
    }: SyncRequest = await req.json();

    // Validate required fields
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

    // Authenticate user - MODIFICADO PARA SERVICE ROLE KEY
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

    // Verificar si es Service Role Key o JWT de usuario
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      // Intentar obtener usuario del token (puede ser JWT o Service Role Key)
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        // Si falla, asumir que es Service Role Key y usar un usuario del sistema
        console.log('Usando Service Role Key - saltando validación de usuario');
        userId = 'system-service-role';
      } else {
        userId = user.id;
      }
    } catch (error) {
      // Si hay error, asumir Service Role Key
      console.log('Error en autenticación, usando Service Role Key');
      userId = 'system-service-role';
    }

    // Si es usuario real, verificar acceso al restaurante
    if (userId !== 'system-service-role') {
      const { data: userAccess, error: accessError } = await supabase
        .from('usuarios')
        .select('restaurante_id, rol')
        .eq('id', userId)
        .eq('restaurante_id', restaurante_id)
        .eq('activo', true)
        .single();

      if (accessError || !userAccess) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No tienes acceso a este restaurante'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        );
      }
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

    // Set default date range if not provided
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
            resultado = await syncVentas(supabase, client, restaurante_id, numierConfig.tpv_ids, fechaInicio, fechaFin, userId);
            break;
          case 'products':
            resultado = await syncProductos(supabase, client, restaurante_id, numierConfig.tpv_ids, userId);
            break;
          case 'expenses':
            resultado = await syncGastos(supabase, client, restaurante_id, numierConfig.tpv_ids, fechaInicio, fechaFin, userId);
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
// NUMIER API CLIENT CLASS
// =============================================
class NumierAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async fetchSales(tpvId: string, startDate: string, endDate: string, page = 1) {
    const url = `${this.baseUrl}/v2/sales/${tpvId}?start_date=${startDate}&end_date=${endDate}&pag=${page}`;
    return this.makeRequest(url);
  }

  async fetchSalesByCompany(startDate: string, endDate: string, page = 1) {
    const url = `${this.baseUrl}/v2/salesByCompany?start_date=${startDate}&end_date=${endDate}&pag=${page}`;
    return this.makeRequest(url);
  }

  async fetchProducts(tpvId: string, page = 1) {
    const url = `${this.baseUrl}/getProducts/${tpvId}?pag=${page}`;
    return this.makeRequest(url);
  }

  async fetchExpenses(tpvId: string, startDate: string, endDate: string, page = 1) {
    const url = `${this.baseUrl}/v2/expenses/${tpvId}?start_date=${startDate}&end_date=${endDate}&pag=${page}`;
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
// SYNC FUNCTIONS
// =============================================

async function syncVentas(
  supabase: any,
  client: NumierAPIClient,
  restauranteId: string,
  tpvIds: string[],
  fechaInicio: string,
  fechaFin: string,
  userId: string
): Promise<SyncResult> {
  
  // Create sync log - TEMPORALMENTE COMENTADO POR ERROR
  /*
  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({
      restaurante_id: restauranteId,
      sistema: 'numier',
      tipo_operacion: 'sync_ventas',
      fecha_desde: fechaInicio,
      fecha_hasta: fechaFin,
      parametros: { tpv_ids: tpvIds },
      iniciado_por: userId
    })
    .select('id')
    .single();
  */

  let totalProcesados = 0;
  let totalExitosos = 0;
  let totalErrores = 0;

  try {
    // Use company-wide endpoint (más eficiente)
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const data = await client.fetchSalesByCompany(fechaInicio, fechaFin, page);
      
      if (!data.result || data.result.length === 0) {
        hasMorePages = false;
        break;
      }

      for (const venta of data.result) {
        try {
          // Validar que la venta tenga los datos mínimos necesarios
          if (!venta.Serie || !venta.Number || !venta.BusinessDay) {
            console.warn(`⚠️ Venta omitida - datos incompletos:`, {
              serie: venta.Serie,
              number: venta.Number,
              businessDay: venta.BusinessDay
            });
            totalErrores++;
            continue; // Saltar esta venta y continuar con la siguiente
          }

          await insertVentaUnificada(supabase, restauranteId, 'numier', venta);
          totalExitosos++;
        } catch (error) {
          console.error(`❌ Error insertando venta ${venta.Number}:`, error);
          totalErrores++;
        }
        totalProcesados++;
      }

      // Check if there are more pages
      hasMorePages = page < (data.totalpages || 1);
      page++;
    }

    // Update sync log - TEMPORALMENTE COMENTADO POR ERROR
    /*
    await supabase
      .from('sync_logs')
      .update({
        fecha_fin: new Date().toISOString(),
        estado: totalErrores > 0 ? 'parcial' : 'completado',
        registros_procesados: totalProcesados,
        registros_exitosos: totalExitosos,
        registros_error: totalErrores
      })
      .eq('id', syncLog.id);
    */

    return {
      sistema: 'numier',
      endpoint: 'sales',
      procesados: totalProcesados,
      exitosos: totalExitosos,
      errores: totalErrores,
      estado: totalErrores > 0 ? 'parcial' : 'completado'
    };

  } catch (error) {
    // Update sync log - TEMPORALMENTE COMENTADO POR ERROR
    /*
    await supabase
      .from('sync_logs')
      .update({
        fecha_fin: new Date().toISOString(),
        estado: 'error',
        mensaje_error: error.message
      })
      .eq('id', syncLog.id);
    */

    throw error;
  }
}

async function syncProductos(
  supabase: any,
  client: NumierAPIClient,
  restauranteId: string,
  tpvIds: string[],
  userId: string
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
                categoria_nombre: producto.nameCategory,
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

async function syncGastos(
  supabase: any,
  client: NumierAPIClient,
  restauranteId: string,
  tpvIds: string[],
  fechaInicio: string,
  fechaFin: string,
  userId: string
): Promise<SyncResult> {
  
  // Por ahora, implementación básica
  // TODO: Implementar sync de gastos cuando sea necesario
  
  return {
    sistema: 'numier',
    endpoint: 'expenses',
    procesados: 0,
    exitosos: 0,
    errores: 0,
    estado: 'completado',
    mensaje: 'Sync de gastos no implementado aún'
  };
}

// =============================================
// HELPER FUNCTION TO INSERT UNIFIED SALES
// =============================================
async function insertVentaUnificada(
  supabase: any,
  restauranteId: string,
  sistemaOrigen: string,
  ventaData: any
) {
  // Transform Numier data to unified format
  const ventaUnificada = {
    restaurante_id: restauranteId,
    sistema_origen: sistemaOrigen,
    id_externo: `${ventaData.Serie}-${ventaData.Number}`.trim(), // Limpiar espacios
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

  console.log('🔍 Datos a insertar:', ventaUnificada);

  // Insert main sale record
  const { data: ventaInserted, error } = await supabase
    .from('ventas_datos')
    .upsert(ventaUnificada, {
      onConflict: 'restaurante_id,sistema_origen,id_externo'
    })
    .select('id')
    .single();

  console.log('🔍 Resultado upsert:', { ventaInserted, error });

  if (error) {
    console.error('❌ Error en upsert:', error);
    throw error;
  }

  // Verificar que ventaInserted.id existe
  if (!ventaInserted || !ventaInserted.id) {
    console.error('❌ Error: ventaInserted.id es null o undefined');
    console.log('ventaInserted:', ventaInserted);
    throw new Error('No se pudo obtener el ID de la venta insertada');
  }

  console.log('✅ Venta insertada correctamente con ID:', ventaInserted.id);

  // Insert sale lines
  if (ventaData.InvoiceItems?.length > 0) {
    const lineasToInsert = ventaData.InvoiceItems.map((item: any) => ({
      venta_id: ventaInserted.id,
      restaurante_id: restauranteId,
      producto_id_externo: item.idProduct,
      producto_nombre: item.name,
      categoria_id: item.idCategory,
      cantidad: parseFloat(item.units || 0),
      precio_unitario: parseFloat(item.price || 0),
      precio_total: parseFloat(item.amount || 0),
      tipo_impuesto: item.vatType,
      datos_originales: item,
      fecha_venta: ventaData.BusinessDay,
    }));

    console.log('🔍 Insertando líneas de venta:', lineasToInsert.length);

    await supabase
      .from('ventas_lineas')
      .upsert(lineasToInsert, {
        onConflict: 'venta_id,producto_id_externo'
      });
  }

  return ventaInserted;
}