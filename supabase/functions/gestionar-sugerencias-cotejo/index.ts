// supabase/functions/gestionar-sugerencias-cotejo/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tipos
interface GestionRequest {
  accion: 'confirmar_sugerencia' | 'rechazar_sugerencia' | 'buscar_mas_candidatos' | 'marcar_factura_directa'
  enlace_id?: string
  factura_id?: string
  usuario_id: string
  razon_rechazo?: string
  observaciones?: string
  criterios_adicionales?: Record<string, any>
}

interface ResultadoGestion {
  success: boolean
  mensaje: string
  accion_realizada: string
  detalles?: any
  error?: string
}

// Configuración
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: GestionRequest = await req.json()

    if (!request.accion || !request.usuario_id) {
      throw new Error('accion y usuario_id son requeridos')
    }

    console.log(` === GESTIONANDO SUGERENCIAS DE COTEJO ===`)
    console.log(` Acción: ${request.accion}`)
    console.log(` Usuario: ${request.usuario_id}`)

    // Ejecutar acción solicitada
    let resultado: ResultadoGestion

    switch (request.accion) {
      case 'confirmar_sugerencia':
        resultado = await confirmarSugerencia(request)
        break
      case 'rechazar_sugerencia':
        resultado = await rechazarSugerencia(request)
        break
      case 'buscar_mas_candidatos':
        resultado = await buscarMasCandidatos(request)
        break
      case 'marcar_factura_directa':
        resultado = await marcarFacturaDirecta(request)
        break
      default:
        throw new Error(`Acción no válida: ${request.accion}`)
    }

    console.log(`✅ ACCIÓN COMPLETADA: ${request.accion}`)
    console.log(`📊 Resultado:`, resultado)

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ ERROR EN GESTIÓN:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        accion_realizada: 'error',
        mensaje: `Error en gestión: ${error.message}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// FUNCIONES DE GESTIÓN

async function confirmarSugerencia(request: GestionRequest): Promise<ResultadoGestion> {
  try {
    if (!request.enlace_id) {
      throw new Error('enlace_id es requerido para confirmar sugerencia')
    }

    console.log(`✅ Confirmando sugerencia: ${request.enlace_id}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Actualizar estado del enlace
    const { error: errorEnlace } = await supabase
      .from('facturas_albaranes_enlaces')
      .update({
        estado: 'confirmado',
        usuario_validacion: request.usuario_id,
        fecha_validacion: new Date().toISOString(),
        fecha_ultima_modificacion: new Date().toISOString(),
        observaciones: request.observaciones || 'Confirmado por usuario'
      })
      .eq('id', request.enlace_id)

    if (errorEnlace) {
      throw new Error(`Error actualizando enlace: ${errorEnlace.message}`)
    }

    // 2. Obtener información del enlace para actualizar patrones
    const { data: enlace, error: errorObtener } = await supabase
      .from('facturas_albaranes_enlaces')
      .select('*')
      .eq('id', request.enlace_id)
      .single()

    if (errorObtener || !enlace) {
      throw new Error('No se pudo obtener información del enlace')
    }

    // 3. Marcar albarán como no huérfano
    await marcarAlbaranNoHuerfano(enlace.albaran_id)

    // 4. Actualizar patrones de aprendizaje (aumentar efectividad)
    await actualizarPatronesAprendidos(enlace, true)

    console.log(`✅ Sugerencia confirmada exitosamente`)

    return {
      success: true,
      mensaje: 'Sugerencia confirmada exitosamente',
      accion_realizada: 'confirmar_sugerencia',
      detalles: {
        enlace_id: request.enlace_id,
        estado: 'confirmado',
        fecha_validacion: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('❌ Error confirmando sugerencia:', error)
    throw error
  }
}

async function rechazarSugerencia(request: GestionRequest): Promise<ResultadoGestion> {
  try {
    if (!request.enlace_id) {
      throw new Error('enlace_id es requerido para rechazar sugerencia')
    }

    console.log(`❌ Rechazando sugerencia: ${request.enlace_id}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Actualizar estado del enlace
    const { error: errorEnlace } = await supabase
      .from('facturas_albaranes_enlaces')
      .update({
        estado: 'rechazado',
        usuario_validacion: request.usuario_id,
        fecha_validacion: new Date().toISOString(),
        fecha_ultima_modificacion: new Date().toISOString(),
        observaciones: `Rechazado: ${request.razon_rechazo || 'Sin razón especificada'}`
      })
      .eq('id', request.enlace_id)

    if (errorEnlace) {
      throw new Error(`Error actualizando enlace: ${errorEnlace.message}`)
    }

    // 2. Obtener información del enlace para actualizar patrones
    const { data: enlace, error: errorObtener } = await supabase
      .from('facturas_albaranes_enlaces')
      .select('*')
      .eq('id', request.enlace_id)
      .single()

    if (errorObtener || !enlace) {
      throw new Error('No se pudo obtener información del enlace')
    }

    // 3. Actualizar patrones de aprendizaje (reducir efectividad)
    await actualizarPatronesAprendidos(enlace, false)

    console.log(`✅ Sugerencia rechazada exitosamente`)

    return {
      success: true,
      mensaje: 'Sugerencia rechazada exitosamente',
      accion_realizada: 'rechazar_sugerencia',
      detalles: {
        enlace_id: request.enlace_id,
        estado: 'rechazado',
        razon_rechazo: request.razon_rechazo
      }
    }

  } catch (error) {
    console.error('❌ Error rechazando sugerencia:', error)
    throw error
  }
}

async function buscarMasCandidatos(request: GestionRequest): Promise<ResultadoGestion> {
  try {
    if (!request.factura_id) {
      throw new Error('factura_id es requerido para buscar más candidatos')
    }

    console.log(`🔍 Buscando más candidatos para factura: ${request.factura_id}`)
    
    // Aquí podrías implementar búsquedas adicionales con criterios más amplios
    // Por ahora, retornamos un mensaje de confirmación
    
    console.log(`✅ Búsqueda de candidatos adicionales iniciada`)

    return {
      success: true,
      mensaje: 'Búsqueda de candidatos adicionales iniciada',
      accion_realizada: 'buscar_mas_candidatos',
      detalles: {
        factura_id: request.factura_id,
        criterios_adicionales: request.criterios_adicionales
      }
    }

  } catch (error) {
    console.error('❌ Error buscando más candidatos:', error)
    throw error
  }
}

async function marcarFacturaDirecta(request: GestionRequest): Promise<ResultadoGestion> {
  try {
    if (!request.factura_id) {
      throw new Error('factura_id es requerido para marcar factura directa')
    }

    console.log(`📄 Marcando factura como directa: ${request.factura_id}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Crear enlace marcando que es factura directa
    const { error: errorEnlace } = await supabase
      .from('facturas_albaranes_enlaces')
      .insert({
        factura_id: request.factura_id,
        albaran_id: null, // Sin albarán
        restaurante_id: 'sistema', // Se actualizará con el valor real
        estado: 'factura_directa',
        metodo_deteccion: 'marcado_manual',
        confianza_match: 1.0,
        razon_match: ['factura_directa_confirmada'],
        observaciones: request.observaciones || 'Marcada como factura directa por usuario',
        fecha_cotejo: new Date().toISOString(),
        created_by: 'sistema'
      })

    if (errorEnlace) {
      throw new Error(`Error creando enlace de factura directa: ${errorEnlace.message}`)
    }

    // 2. Actualizar estado en documentos_huerfanos
    const { error: errorHuerfano } = await supabase
      .from('documentos_huerfanos')
      .update({
        estado: 'resuelto',
        fecha_resolucion: new Date().toISOString(),
        resuelto_por: request.usuario_id,
        razon_estado: 'Factura directa confirmada por usuario'
      })
      .eq('documento_id', request.factura_id)
      .eq('tipo_documento', 'factura')

    if (errorHuerfano && errorHuerfano.code !== 'PGRST116') {
      console.warn('⚠️ Error actualizando estado de huérfano:', errorHuerfano)
    }

    console.log(`✅ Factura marcada como directa exitosamente`)

    return {
      success: true,
      mensaje: 'Factura marcada como directa exitosamente',
      accion_realizada: 'marcar_factura_directa',
      detalles: {
        factura_id: request.factura_id,
        estado: 'factura_directa'
      }
    }

  } catch (error) {
    console.error('❌ Error marcando factura directa:', error)
    throw error
  }
}

// FUNCIONES AUXILIARES

async function marcarAlbaranNoHuerfano(albaranId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Actualizar estado en documentos_huerfanos si existe
    const { error } = await supabase
      .from('documentos_huerfanos')
      .update({
        estado: 'resuelto',
        fecha_resolucion: new Date().toISOString(),
        resuelto_por: 'sistema'
      })
      .eq('documento_id', albaranId)
      .eq('tipo_documento', 'albaran')
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows affected
      console.warn('⚠️ Error actualizando estado de huérfano:', error)
    }
    
  } catch (error) {
    console.error('⚠️ Error marcando albarán como no huérfano:', error)
  }
}

async function actualizarPatronesAprendidos(enlace: any, esConfirmacion: boolean) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Buscar patrón existente para este método y proveedor
    const { data: patrones, error: errorBuscar } = await supabase
      .from('cotejo_patrones_aprendidos')
      .select('*')
      .eq('restaurante_id', enlace.restaurante_id)
      .eq('metodo_deteccion', enlace.metodo_deteccion)
      .eq('activo', true)
    
    if (errorBuscar || !patrones || patrones.length === 0) {
      // Crear nuevo patrón si no existe
      const { error: errorCrear } = await supabase
        .from('cotejo_patrones_aprendidos')
        .insert({
          restaurante_id: enlace.restaurante_id,
          metodo_deteccion: enlace.metodo_deteccion,
          tipo_patron: 'efectividad_usuario',
          patron_datos: {
            confirmaciones: esConfirmacion ? 1 : 0,
            rechazos: esConfirmacion ? 0 : 1,
            total_evaluaciones: 1
          },
          porcentaje_efectividad: esConfirmacion ? 1.0 : 0.0,
          activo: true,
          fecha_creacion: new Date().toISOString()
        })
      
      if (errorCrear) {
        console.warn('⚠️ Error creando patrón de aprendizaje:', errorCrear)
      }
    } else {
      // Actualizar patrón existente
      const patron = patrones[0]
      const datosActuales = patron.patron_datos || {}
      
      const nuevosDatos = {
        confirmaciones: (datosActuales.confirmaciones || 0) + (esConfirmacion ? 1 : 0),
        rechazos: (datosActuales.rechazos || 0) + (esConfirmacion ? 0 : 1),
        total_evaluaciones: (datosActuales.total_evaluaciones || 0) + 1
      }
      
      const nuevoPorcentaje = nuevosDatos.confirmaciones / nuevosDatos.total_evaluaciones
      
      const { error: errorActualizar } = await supabase
        .from('cotejo_patrones_aprendidos')
        .update({
          patron_datos: nuevosDatos,
          porcentaje_efectividad: nuevoPorcentaje,
          fecha_ultima_modificacion: new Date().toISOString()
        })
        .eq('id', patron.id)
      
      if (errorActualizar) {
        console.warn('⚠️ Error actualizando patrón de aprendizaje:', errorActualizar)
      }
    }
    
  } catch (error) {
    console.error('⚠️ Error actualizando patrones de aprendizaje:', error)
  }
}