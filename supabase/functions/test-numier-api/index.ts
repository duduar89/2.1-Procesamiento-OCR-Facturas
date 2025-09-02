// =============================================
// EDGE FUNCTION: test-numier-api
// Función de prueba para verificar la API de Numier directamente
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

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
      restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231',
      fecha_inicio = '2025-08-22',
      fecha_fin = '2025-08-22'
    } = await req.json().catch(() => ({}));

    console.log(`🔍 Testing Numier API for: ${restaurante_id}`);
    console.log(`📅 Fecha: ${fecha_inicio} - ${fecha_fin}`);

    // Get Numier configuration
    const { data: restaurant, error: configError } = await supabase
      .from('restaurantes')
      .select('integraciones')
      .eq('id', restaurante_id)
      .single();

    if (configError || !restaurant) {
      console.error('❌ Error obteniendo restaurante:', configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Restaurante no encontrado',
          details: configError
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    const numierConfig = restaurant.integraciones?.numier;
    
    console.log('🔧 Configuración Numier:', {
      activo: numierConfig?.activo,
      base_url: numierConfig?.base_url,
      tpv_ids: numierConfig?.tpv_ids,
      api_key_present: !!numierConfig?.api_key
    });

    if (!numierConfig?.activo || !numierConfig?.api_key) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Integración Numier no configurada o inactiva',
          config: {
            activo: numierConfig?.activo,
            api_key_present: !!numierConfig?.api_key
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Test cada TPV
    const resultados = [];

    for (const tpvId of numierConfig.tpv_ids) {
      console.log(`\n🧪 Testing TPV: ${tpvId}`);
      
      try {
        const url = `${numierConfig.base_url}/v2/sales/${tpvId}?start_date=${fecha_inicio}&end_date=${fecha_fin}&pag=1`;
        console.log(`📡 URL: ${url}`);
        
        const startTime = Date.now();
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'APIKEY': numierConfig.api_key,
            'Content-Type': 'application/json',
          },
        });

        const responseTime = Date.now() - startTime;
        console.log(`⏱️ Response time: ${responseTime}ms`);
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          console.error(`❌ HTTP Error: ${response.status}`);
          const errorText = await response.text();
          console.error(`📄 Error response: ${errorText}`);
          
          resultados.push({
            tpv_id: tpvId,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            response_time: responseTime
          });
          continue;
        }

        const data = await response.json();
        console.log(`✅ Response successful for TPV ${tpvId}`);
        console.log(`📊 Records found: ${data.result?.length || 0}`);
        console.log(`📄 Total pages: ${data.totalpages || 1}`);
        console.log(`🔍 Response structure:`, {
          has_result: !!data.result,
          result_type: Array.isArray(data.result) ? 'array' : typeof data.result,
          result_length: data.result?.length,
          has_totalpages: !!data.totalpages,
          response_field: data.response
        });

        // Log ALL records if date is 2025-08-22 (detailed analysis)
        if (data.result && data.result.length > 0 && fecha_inicio === '2025-08-22') {
          console.log(`🔍 ANÁLISIS DETALLADO - TODOS LOS TICKETS DEL 22 AGOSTO:`);
          data.result.forEach((ticket, index) => {
            console.log(`📋 Ticket ${index + 1}:`, {
              Serie: ticket.Serie,
              Number: ticket.Number,
              TaxDocumentNumber: ticket.TaxDocumentNumber,
              BusinessDay: ticket.BusinessDay,
              Date: ticket.Date,
              GrossAmount: ticket.Totals?.GrossAmount,
              NetAmount: ticket.Totals?.NetAmount,
              VatAmount: ticket.Totals?.VatAmount,
              Payments: ticket.Payments,
              DocumentType: ticket.DocumentType,
              NumDiners: ticket.NumDiners,
              Channel: ticket.Channel
            });
          });
          
          // Calcular totales
          const totalGross = data.result.reduce((sum, t) => sum + (parseFloat(t.Totals?.GrossAmount) || 0), 0);
          const totalNet = data.result.reduce((sum, t) => sum + (parseFloat(t.Totals?.NetAmount) || 0), 0);
          console.log(`💰 TOTALES CALCULADOS:`, {
            total_tickets: data.result.length,
            total_bruto: totalGross,
            total_neto: totalNet,
            ticket_promedio: totalGross / data.result.length
          });
        } else if (data.result && data.result.length > 0) {
          console.log(`🎯 First record sample:`, {
            Serie: data.result[0].Serie,
            Number: data.result[0].Number,
            BusinessDay: data.result[0].BusinessDay,
            Date: data.result[0].Date,
            GrossAmount: data.result[0].Totals?.GrossAmount
          });
        }

        resultados.push({
          tpv_id: tpvId,
          success: true,
          records_found: data.result?.length || 0,
          total_pages: data.totalpages || 1,
          response_time: responseTime,
          sample_record: data.result?.[0] ? {
            Serie: data.result[0].Serie,
            Number: data.result[0].Number,
            BusinessDay: data.result[0].BusinessDay,
            Date: data.result[0].Date,
            GrossAmount: data.result[0].Totals?.GrossAmount
          } : null
        });

      } catch (error) {
        console.error(`❌ Error testing TPV ${tpvId}:`, error);
        resultados.push({
          tpv_id: tpvId,
          success: false,
          error: error.message,
          response_time: null
        });
      }
    }

    const totalRecords = resultados.reduce((sum, r) => sum + (r.records_found || 0), 0);
    console.log(`\n📈 RESUMEN: ${totalRecords} registros totales encontrados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Prueba completada: ${totalRecords} registros encontrados`,
        fecha_inicio,
        fecha_fin,
        config: {
          base_url: numierConfig.base_url,
          tpv_ids: numierConfig.tpv_ids,
          api_key_present: true
        },
        resultados,
        total_records: totalRecords
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error en test-numier-api:', error);
    
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
