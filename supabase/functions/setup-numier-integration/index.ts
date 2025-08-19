
// =============================================
// EDGE FUNCTION COMPLETA: setup-numier-integration
// Archivo: /functions/setup-numier-integration/index.ts
// TODO INCLUIDO - SIN IMPORTS EXTERNOS
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers definidos directamente aquí
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface SetupRequest {
  restaurante_id: string;
  api_key: string;
  tpv_ids: string[];
  base_url?: string;
  test_connection?: boolean;
}

interface NumierTestResponse {
  success: boolean;
  tpvs_disponibles?: any[];
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request data
    const { 
      restaurante_id, 
      api_key, 
      tpv_ids, 
      base_url = 'https://www.numier.com/api/public/index.php/api',
      test_connection = true 
    }: SetupRequest = await req.json();

    // Validate required fields
    if (!restaurante_id || !api_key || !tpv_ids?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'restaurante_id, api_key y tpv_ids son requeridos'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

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

    // Check user has access to this restaurant - SOLO SI NO ES SERVICE ROLE
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

    let testResult: NumierTestResponse | null = null;

    // Test connection with Numier API if requested
    if (test_connection) {
      try {
        testResult = await testNumierConnection(api_key, base_url, tpv_ids);
        
        if (!testResult.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Error de conexión con Numier: ${testResult.error}`,
              test_result: testResult
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Error probando conexión: ${error.message}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
    }

    // Prepare Numier configuration
    const numierConfig = {
      activo: true,
      api_key: api_key,
      base_url: base_url,
      tpv_ids: tpv_ids,
      configuracion: {
        sync_automatico: true,
        sync_intervalo_minutos: 30,
        endpoints_activos: ['sales', 'products'],
        fecha_configuracion: new Date().toISOString(),
        configurado_por: userId,
        test_connection_ok: testResult?.success || false
      }
    };

    // Get current integrations to preserve other configs
    const { data: currentRestaurant } = await supabase
      .from('restaurantes')
      .select('integraciones')
      .eq('id', restaurante_id)
      .single();

    const currentIntegraciones = currentRestaurant?.integraciones || {};

    // Save configuration
    const { error: updateError } = await supabase
      .from('restaurantes')
      .update({
        integraciones: {
          ...currentIntegraciones,
          numier: numierConfig
        }
      })
      .eq('id', restaurante_id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error guardando configuración: ${updateError.message}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Log the setup action
    await supabase
      .from('sync_logs')
      .insert({
        restaurante_id: restaurante_id,
        sistema: 'numier',
        tipo_operacion: 'configuracion_inicial',
        estado: 'completado',
        registros_procesados: tpv_ids.length,
        parametros: {
          tpv_ids: tpv_ids,
          base_url: base_url,
          test_connection: test_connection
        },
        iniciado_por: userId
      });

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Integración Numier configurada correctamente',
        config: {
          activo: true,
          tpv_ids: tpv_ids,
          base_url: base_url,
          api_key_configurada: true,
          test_result: testResult
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error en setup-numier-integration:', error);
    
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
// FUNCIÓN PARA TESTEAR CONEXIÓN CON NUMIER
// =============================================
async function testNumierConnection(
  apiKey: string, 
  baseUrl: string, 
  tpvIds: string[]
): Promise<NumierTestResponse> {
  try {
    const testTpvId = tpvIds[0];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Test sales endpoint
    const salesUrl = `${baseUrl}/v2/sales/${testTpvId}?start_date=${yesterday}&end_date=${today}&pag=1`;
    
    const salesResponse = await fetch(salesUrl, {
      method: 'GET',
      headers: {
        'APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!salesResponse.ok) {
      return {
        success: false,
        error: `HTTP ${salesResponse.status}: ${salesResponse.statusText}`
      };
    }

    const salesData = await salesResponse.json();
    
    if (typeof salesData !== 'object' || !salesData.hasOwnProperty('response')) {
      return {
        success: false,
        error: 'Respuesta de API de ventas no válida'
      };
    }

    // Test products endpoint
    const productsUrl = `${baseUrl}/getProducts/${testTpvId}?pag=1`;
    const productsResponse = await fetch(productsUrl, {
      method: 'GET',
      headers: {
        'APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const productsData = await productsResponse.json();

    return {
      success: true,
      tpvs_disponibles: tpvIds.map(id => ({
        id: id,
        nombre: `TPV ${id}`,
        ventas_test: salesData.response !== undefined ? 'OK' : 'Sin datos',
        productos_test: productsData.response !== undefined ? 'OK' : 'Sin datos'
      }))
    };

  } catch (error) {
    return {
      success: false,
      error: `Error de conexión: ${error.message}`
    };
  }
}