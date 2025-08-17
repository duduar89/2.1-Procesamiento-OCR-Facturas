// supabase/functions/cotejo-inteligente/index.ts

// ===== SISTEMA DE IDENTIFICADORES =====
// IMPORTANTE: Este sistema funciona con dos tipos de identificadores:
// 1. documento_id: Identificador lógico del negocio (envía el dashboard)
// 2. id: ID primario de la base de datos (usado internamente)
//
// FLUJO:
// Dashboard envía documento_id → Sistema busca factura por documento_id → 
// Sistema usa ID primario para todas las operaciones de BD (enlaces, actualizaciones)
// ======================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tipos
interface CotejoRequest {
  facturaId: string
  background?: boolean
  forceReprocess?: boolean
}

interface Candidato {
  albaran_id: string
  score: number
  metodo: string
  razones: string[]
  factores: Record<string, number>
  restaurante_id?: string
}

interface ResultadoCotejo {
  success: boolean
  enlaces_automaticos: number
  sugerencias: number
  requiere_revision: number
  message?: string
  notificacion: {
    tipo: 'alta_confianza' | 'media_confianza' | 'baja_confianza' | 'sin_albaran' | 'error'
    mensaje: string
    acciones_disponibles: string[]
  }
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
    const { facturaId, background = false, forceReprocess = false }: CotejoRequest = await req.json()

    if (!facturaId) {
      throw new Error('facturaId es requerido')
    }

    console.log(` === INICIANDO COTEJO INTELIGENTE ===`)
    console.log(` Factura ID: ${facturaId}`)
    console.log(`🔄 Background: ${background}`)
    console.log(`🔧 Force Reprocess: ${forceReprocess}`)

    // Ejecutar cotejo
    const resultado = await ejecutarCotejoInteligente(facturaId, forceReprocess)

    console.log(`✅ COTEJO COMPLETADO`)
    console.log(`📊 Resultado:`, resultado)

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ ERROR EN COTEJO:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        enlaces_automaticos: 0,
        sugerencias: 0,
        requiere_revision: 0,
        notificacion: {
          tipo: 'error',
          mensaje: `Error en cotejo: ${error.message}`,
          acciones_disponibles: ['revisar_logs', 'contactar_soporte']
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// FUNCIÓN PRINCIPAL DE COTEJO
async function ejecutarCotejoInteligente(facturaId: string, forceReprocess: boolean): Promise<ResultadoCotejo> {
  
  // NOTA IMPORTANTE: facturaId aquí es el documento_id que envía el dashboard
  // Internamente, el sistema obtiene la factura por documento_id y luego usa su ID primario
  // para todas las operaciones de base de datos (enlaces, actualizaciones, etc.)
  
  // 1. VALIDACIONES INICIALES
  console.log('🔍 Validando factura...')
  const factura = await obtenerFactura(facturaId)  // facturaId = documento_id
  if (!factura) {
    // En lugar de lanzar error, devolver resultado con estado de error
    return {
      success: false,
      error: `Factura con documento_id ${facturaId} no encontrada`,
      message: `La factura con documento_id ${facturaId} no existe en la base de datos`,
      enlaces_automaticos: 0,
      sugerencias: 0,
      requiere_revision: 0,
      notificacion: {
        tipo: 'error',
        mensaje: `Factura no encontrada: ${facturaId}`,
        acciones_disponibles: ['verificar_id', 'contactar_soporte']
      }
    }
  }

  const enlacesExistentes = await verificarEnlacesExistentes(facturaId)
  if (enlacesExistentes && !forceReprocess) {
    return {
      success: true,
      enlaces_automaticos: enlacesExistentes.length,
      sugerencias: 0,
      requiere_revision: 0,
      notificacion: {
        tipo: 'alta_confianza',
        mensaje: `Factura ya procesada anteriormente con ${enlacesExistentes.length} enlaces`,
        acciones_disponibles: ['ver_enlaces', 'reprocesar']
      }
    }
  }

  // 2. EJECUTAR 5 MÉTODOS DE BÚSQUEDA
  console.log(' Ejecutando métodos de búsqueda...')
  const resultados = await Promise.all([
    buscarReferenciasExplicitas(factura),
    buscarPorProximidadTemporal(factura),
    buscarPorAnalisisProductos(factura),
    buscarPorPatronesTemporal(factura),
    buscarUltimaOportunidad(factura)
  ])

  // 3. CONSOLIDAR Y PUNTUAR CANDIDATOS
  console.log('📊 Consolidando candidatos...')
  const candidatosConsolidados = consolidarCandidatos(resultados)
  const candidatosPuntuados = await calcularScoresFinal(candidatosConsolidados, factura)

  // 4. CATEGORIZAR POR CONFIANZA
  console.log('🎯 Categorizando por confianza...')
  const categorizacion = categorizarCandidatos(candidatosPuntuados)

  // 5. PROCESAR SEGÚN CATEGORÍA
  console.log('⚡ Procesando enlaces...')
  await procesarEnlacesAutomaticos(categorizacion.altaConfianza, facturaId)
  await crearSugerencias(categorizacion.mediaConfianza, facturaId)
  await marcarParaRevisionManual(categorizacion.bajaConfianza, facturaId)

  // 6. GUARDAR PARA APRENDIZAJE
  console.log('💾 Guardando para aprendizaje...')
  await guardarCandidatosDetectados(candidatosPuntuados, facturaId)

  // 7. GENERAR NOTIFICACIÓN
  console.log('🔔 Generando notificación...')
  const notificacion = await generarNotificacion(categorizacion, factura)

  // 8. ACTUALIZAR HUÉRFANOS
  console.log('📋 Actualizando huérfanos...')
  await actualizarEstadoHuerfanos(facturaId)

  return {
    success: true,
    enlaces_automaticos: categorizacion.altaConfianza.length,
    sugerencias: categorizacion.mediaConfianza.length,
    requiere_revision: categorizacion.bajaConfianza.length,
    notificacion: notificacion
  }
}

// FUNCIONES AUXILIARES PRINCIPALES

// FUNCIÓN AUXILIAR PARA OBTENER FACTURA
async function obtenerFactura(facturaId: string) {
  try {
    console.log(`🔍 Buscando factura por documento_id: ${facturaId}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // IMPORTANTE: Buscar por documento_id, no por id primario
    const { data: factura, error } = await supabase
      .from('datos_extraidos_facturas')
      .select(`
        *,
        restaurantes(nombre),
        productos_extraidos(
          descripcion_original,
          descripcion_normalizada,
          precio_total_linea_sin_iva,
          codigo_producto
        )
      `)
      .eq('documento_id', facturaId)  // ← CAMBIADO: de 'id' a 'documento_id'
      .maybeSingle()
    
    if (error) {
      console.error('❌ Error obteniendo factura:', error)
      return null
    }
    
    if (!factura) {
      console.log(`❌ Factura con documento_id ${facturaId} no encontrada`)
      return null
    }
    
    console.log(`✅ Factura encontrada: ${factura.numero_factura} - ${factura.proveedor_nombre}`)
    console.log(`📋 ID primario: ${factura.id}, Documento ID: ${factura.documento_id}`)
    return factura
    
  } catch (error) {
    console.error('❌ Error en obtenerFactura:', error)
    return null
  }
}

async function verificarEnlacesExistentes(facturaId: string) {
  try {
    console.log(`🔍 Verificando enlaces existentes para factura con documento_id: ${facturaId}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Primero obtener la factura para obtener su ID primario
    const factura = await obtenerFactura(facturaId)
    if (!factura) {
      console.log('⚠️ No se pudo obtener la factura para verificar enlaces')
      return []
    }
    
    // Buscar enlaces usando el ID primario de la factura
    const { data: enlaces, error } = await supabase
      .from('facturas_albaranes_enlaces')
      .select('*')
      .eq('factura_id', factura.id)  // ← Usar ID primario para la búsqueda de enlaces
      .eq('estado', 'confirmado')
    
    if (error) {
      console.error('❌ Error verificando enlaces:', error)
      return []
    }
    
    console.log(`✅ Enlaces existentes encontrados: ${enlaces?.length || 0}`)
    return enlaces || []
    
  } catch (error) {
    console.error('❌ Error en verificarEnlacesExistentes:', error)
    return []
  }
}

// FUNCIÓN AUXILIAR PARA BUSCAR ALBARÁN POR NÚMERO
async function buscarAlbaranPorNumero(numeroAlbaran: string, restauranteId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { data: albaran, error } = await supabase
      .from('datos_extraidos_albaranes')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('numero_albaran', numeroAlbaran)
      .maybeSingle()
    
    if (error || !albaran) {
      return null
    }
    
    return albaran
    
  } catch (error) {
    console.error('❌ Error buscando albarán:', error)
    return null
  }
}

// FUNCIÓN AUXILIAR PARA CALCULAR SCORE DE PROXIMIDAD TEMPORAL
function calcularScoreProximidadTemporal(factura: any, albaran: any): number {
  let score = 0.85 // Score base para este método
  
  // Factor fecha (más cercano = mejor score)
  if (factura.fecha_factura && albaran.fecha_albaran) {
    const fechaFactura = new Date(factura.fecha_factura)
    const fechaAlbaran = new Date(albaran.fecha_albaran)
    const diasDiferencia = Math.abs(fechaFactura.getTime() - fechaAlbaran.getTime()) / (1000 * 60 * 60 * 24)
    
    if (diasDiferencia <= 7) score += 0.1      // +10% si está en la misma semana
    else if (diasDiferencia <= 15) score += 0.05 // +5% si está en las 2 semanas
    else if (diasDiferencia <= 30) score += 0.02 // +2% si está en el mes
    else score -= 0.1                            // -10% si está muy lejos
  }
  
  // Factor importe (similar = mejor score)
  if (factura.total_factura && albaran.total_albaran) {
    const diferencia = Math.abs(factura.total_factura - albaran.total_albaran)
    const porcentajeDiferencia = (diferencia / factura.total_factura) * 100
    
    if (porcentajeDiferencia <= 5) score += 0.1      // +10% si diferencia < 5%
    else if (porcentajeDiferencia <= 10) score += 0.05 // +5% si diferencia < 10%
    else if (porcentajeDiferencia <= 20) score += 0.02 // +2% si diferencia < 20%
    else score -= 0.15                                // -15% si diferencia > 20%
  }
  
  // Limitar score entre 0 y 1
  return Math.max(0, Math.min(1, score))
}

// FUNCIÓN AUXILIAR PARA COMPARAR PRODUCTOS
function compararProductos(desc1: string, desc2: string): boolean {
  // Normalizar descripciones
  const normalizar = (str: string) => str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  const desc1Norm = normalizar(desc1)
  const desc2Norm = normalizar(desc2)
  
  // Comparación exacta
  if (desc1Norm === desc2Norm) return true
  
  // Comparación por palabras clave
  const palabras1 = desc1Norm.split(' ')
  const palabras2 = desc2Norm.split(' ')
  
  let palabrasComunes = 0
  for (const palabra of palabras1) {
    if (palabra.length > 2 && palabras2.includes(palabra)) {
      palabrasComunes++
    }
  }
  
  // Si más del 60% de las palabras coinciden
  return palabrasComunes / palabras1.length > 0.6
}

// FUNCIÓN AUXILIAR PARA BUSCAR ALBARANES POR PATRÓN
async function buscarAlbaranesPorPatron(factura: any, patron: any): Promise<any[]> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const patronDatos = patron.patron_datos
    const fechaFactura = new Date(factura.fecha_factura)
    
    // Calcular ventana basada en el patrón
    const diasMinimos = patronDatos.dias_minimos || 1
    const diasMaximos = patronDatos.dias_maximos || 30
    
    const fechaLimite = new Date(fechaFactura)
    fechaLimite.setDate(fechaLimite.getDate() - diasMaximos)
    
    const { data: albaranes, error } = await supabase
      .from('datos_extraidos_albaranes')
      .select('*')
      .eq('restaurante_id', factura.restaurante_id)
      .eq('proveedor_nombre', factura.proveedor_nombre)
      .gte('fecha_albaran', fechaLimite.toISOString().split('T')[0])
      .lte('fecha_albaran', fechaFactura.toISOString().split('T')[0])
      .order('fecha_albaran', { ascending: false })
    
    if (error) return []
    return albaranes || []
    
  } catch (error) {
    console.error('❌ Error buscando albaranes por patrón:', error)
    return []
  }
}

// FUNCIÓN AUXILIAR PARA CALCULAR SCORE DE ÚLTIMA OPORTUNIDAD
function calcularScoreUltimaOportunidad(factura: any, albaran: any): number {
  let score = 0.4 // Score base para este método
  
  // Factor fecha (más reciente = mejor score)
  if (factura.fecha_factura && albaran.fecha_albaran) {
    const fechaFactura = new Date(factura.fecha_factura)
    const fechaAlbaran = new Date(albaran.fecha_albaran)
    const diasDiferencia = Math.abs(fechaFactura.getTime() - fechaAlbaran.getTime()) / (1000 * 60 * 60 * 24)
    
    if (diasDiferencia <= 30) score += 0.1      // +10% si está en el último mes
    else if (diasDiferencia <= 60) score += 0.05 // +5% si está en los últimos 2 meses
    else score -= 0.1                            // -10% si está muy lejos
  }
  
  // Factor importe (similar = mejor score)
  if (factura.total_factura && albaran.total_albaran) {
    const diferencia = Math.abs(factura.total_factura - albaran.total_albaran)
    const porcentajeDiferencia = (diferencia / factura.total_factura) * 100
    
    if (porcentajeDiferencia <= 10) score += 0.1      // +10% si diferencia < 10%
    else if (porcentajeDiferencia <= 25) score += 0.05 // +5% si diferencia < 25%
    else score -= 0.15                                // -15% si diferencia > 25%
  }
  
  // Limitar score entre 0 y 1
  return Math.max(0, Math.min(1, score))
}

// FUNCIÓN AUXILIAR PARA MARCAR ALBARÁN COMO NO HUÉRFANO
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
      console.error('⚠️ Error actualizando estado de huérfano:', error)
    }
    
  } catch (error) {
    console.error('⚠️ Error marcando albarán como no huérfano:', error)
  }
}

// MÉTODOS DE DETECCIÓN

async function buscarReferenciasExplicitas(factura: any): Promise<Candidato[]> {
  try {
    console.log(` Método 1: Buscando referencias explícitas...`)
    
    if (!factura.productos_extraidos || factura.productos_extraidos.length === 0) {
      console.log('⚠️ No hay productos para analizar')
      return []
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const candidatos: Candidato[] = []
    
    // Buscar en productos de la factura
    for (const producto of factura.productos_extraidos) {
      const descripcion = producto.descripcion_original || producto.descripcion_normalizada || ''
      
      // Buscar patrones de albarán (ALB-12345, ALB12345, etc.)
      const patronesAlbaran = [
        /ALB[-\s]?(\d+)/i,
        /ALBARAN[-\s]?(\d+)/i,
        /DELIVERY[-\s]?(\d+)/i,
        /ENTREGA[-\s]?(\d+)/i
      ]
      
      for (const patron of patronesAlbaran) {
        const match = descripcion.match(patron)
        if (match) {
          const numeroAlbaran = match[1]
          console.log(`🎯 Referencia explícita encontrada: ${match[0]}`)
          
          // Buscar albarán correspondiente
          const albaran = await buscarAlbaranPorNumero(numeroAlbaran, factura.restaurante_id)
          if (albaran) {
            candidatos.push({
              albaran_id: albaran.id,
              score: 0.95, // 95% confianza
              metodo: 'referencia_explicita',
              razones: ['referencia_explicita_en_producto'],
              factores: {
                referencia_explicita: 0.95,
                proveedor: 1.0,
                fecha: 0.8
              },
              restaurante_id: factura.restaurante_id
            })
          }
        }
      }
    }
    
    // Buscar en observaciones de la factura
    if (factura.observaciones) {
      const patronesAlbaran = [
        /ALB[-\s]?(\d+)/i,
        /ALBARAN[-\s]?(\d+)/i
      ]
      
      for (const patron of patronesAlbaran) {
        const match = factura.observaciones.match(patron)
        if (match) {
          const numeroAlbaran = match[1]
          console.log(`🎯 Referencia explícita en observaciones: ${match[0]}`)
          
          const albaran = await buscarAlbaranPorNumero(numeroAlbaran, factura.restaurante_id)
          if (albaran) {
            candidatos.push({
              albaran_id: albaran.id,
              score: 0.95,
              metodo: 'referencia_explicita',
              razones: ['referencia_explicita_en_observaciones'],
              factores: {
                referencia_explicita: 0.95,
                proveedor: 1.0,
                fecha: 0.8
              },
              restaurante_id: factura.restaurante_id
            })
          }
        }
      }
    }
    
    console.log(`✅ Referencias explícitas encontradas: ${candidatos.length}`)
    return candidatos
    
  } catch (error) {
    console.error('❌ Error en buscarReferenciasExplicitas:', error)
    return []
  }
}

async function buscarPorProximidadTemporal(factura: any): Promise<Candidato[]> {
  try {
    console.log(` Método 2: Buscando por proximidad temporal...`)
    
    if (!factura.fecha_factura || !factura.proveedor_nombre) {
      console.log('⚠️ Faltan fecha o proveedor para análisis temporal')
      return []
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Calcular ventana temporal (45 días antes de la factura)
    const fechaFactura = new Date(factura.fecha_factura)
    const fechaLimite = new Date(fechaFactura)
    fechaLimite.setDate(fechaLimite.getDate() - 45)
    
    console.log(`📅 Ventana temporal: ${fechaLimite.toISOString()} a ${fechaFactura.toISOString()}`)
    
    // Buscar albaranes del mismo proveedor en la ventana temporal
    const { data: albaranes, error } = await supabase
      .from('datos_extraidos_albaranes')
      .select('*')
      .eq('restaurante_id', factura.restaurante_id)
      .eq('proveedor_nombre', factura.proveedor_nombre)
      .gte('fecha_albaran', fechaLimite.toISOString().split('T')[0])
      .lte('fecha_albaran', fechaFactura.toISOString().split('T')[0])
      .order('fecha_albaran', { ascending: false })
    
    if (error) {
      console.error('❌ Error buscando albaranes temporales:', error)
      return []
    }
    
    if (!albaranes || albaranes.length === 0) {
      console.log('⚠️ No se encontraron albaranes en la ventana temporal')
      return []
    }
    
    console.log(`📦 Albaranes encontrados en ventana temporal: ${albaranes.length}`)
    
    const candidatos: Candidato[] = []
    
    for (const albaran of albaranes) {
      // Calcular score basado en proximidad temporal y similitud de importes
      const score = calcularScoreProximidadTemporal(factura, albaran)
      
      if (score > 0.7) { // Solo candidatos con score > 70%
        candidatos.push({
          albaran_id: albaran.id,
          score: score,
          metodo: 'proximidad_temporal',
          razones: ['mismo_proveedor', 'fecha_coherente', 'importe_similar'],
          factores: {
            proveedor: 1.0,
            fecha: score * 0.4,
            importe: score * 0.4,
            productos: 0.0
          },
          restaurante_id: factura.restaurante_id
        })
      }
    }
    
    console.log(`✅ Candidatos por proximidad temporal: ${candidatos.length}`)
    return candidatos
    
  } catch (error) {
    console.error('❌ Error en buscarPorProximidadTemporal:', error)
    return []
  }
}

async function buscarPorAnalisisProductos(factura: any): Promise<Candidato[]> {
  try {
    console.log(` Método 3: Analizando productos...`)
    
    if (!factura.productos_extraidos || factura.productos_extraidos.length === 0) {
      console.log('⚠️ No hay productos para analizar')
      return []
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Buscar albaranes del mismo proveedor en los últimos 60 días
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 60)
    
    const { data: albaranes, error } = await supabase
      .from('datos_extraidos_albaranes')
      .select('*')
      .eq('restaurante_id', factura.restaurante_id)
      .eq('proveedor_nombre', factura.proveedor_nombre)
      .gte('fecha_albaran', fechaLimite.toISOString().split('T')[0])
      .order('fecha_albaran', { ascending: false })
    
    if (error || !albaranes || albaranes.length === 0) {
      console.log('⚠️ No se encontraron albaranes para análisis de productos')
      return []
    }
    
    console.log(` Analizando ${albaranes.length} albaranes por productos...`)
    
    const candidatos: Candidato[] = []
    
    for (const albaran of albaranes) {
      const score = await calcularScoreProductos(factura, albaran)
      
      if (score > 0.6) { // Solo candidatos con score > 60%
        candidatos.push({
          albaran_id: albaran.id,
          score: score,
          metodo: 'analisis_productos',
          razones: ['productos_similares', 'mismo_proveedor'],
          factores: {
            proveedor: 1.0,
            fecha: 0.3,
            importe: 0.2,
            productos: score * 0.8
          },
          restaurante_id: factura.restaurante_id
        })
      }
    }
    
    console.log(`✅ Candidatos por análisis de productos: ${candidatos.length}`)
    return candidatos
    
  } catch (error) {
    console.error('❌ Error en buscarPorAnalisisProductos:', error)
    return []
  }
}

// Función auxiliar para calcular score de productos
async function calcularScoreProductos(factura: any, albaran: any): Promise<number> {
  try {
    let score = 0.75 // Score base para este método
    
    // Obtener productos del albarán (si existen)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { data: productosAlbaran } = await supabase
      .from('productos_extraidos')
      .select('descripcion_original, descripcion_normalizada')
      .eq('documento_id', albaran.documento_id)
    
    if (!productosAlbaran || productosAlbaran.length === 0) {
      return score * 0.5 // Reducir score si no hay productos
    }
    
    // Comparar productos de factura vs albarán
    const productosFactura = factura.productos_extraidos || []
    let coincidencias = 0
    
    for (const productoFactura of productosFactura) {
      const descFactura = (productoFactura.descripcion_original || productoFactura.descripcion_normalizada || '').toLowerCase()
      
      for (const productoAlbaran of productosAlbaran) {
        const descAlbaran = (productoAlbaran.descripcion_original || productoAlbaran.descripcion_normalizada || '').toLowerCase()
        
        // Comparación simple de similitud
        if (compararProductos(descFactura, descAlbaran)) {
          coincidencias++
          break
        }
      }
    }
    
    // Calcular score basado en coincidencias
    if (productosFactura.length > 0) {
      const porcentajeCoincidencia = coincidencias / productosFactura.length
      score = score * (0.3 + porcentajeCoincidencia * 0.7)
    }
    
    return Math.max(0, Math.min(1, score))
    
  } catch (error) {
    console.error('❌ Error calculando score de productos:', error)
    return 0.5
  }
}

async function buscarPorPatronesTemporal(factura: any): Promise<Candidato[]> {
  try {
    console.log(` Método 4: Analizando patrones temporales...`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Buscar patrones aprendidos para este proveedor
    const { data: patrones, error } = await supabase
      .from('cotejo_patrones_aprendidos')
      .select('*')
      .eq('restaurante_id', factura.restaurante_id)
      .eq('proveedor_id', factura.proveedor_id)
      .eq('tipo_patron', 'ventana_temporal')
      .eq('activo', true)
      .order('porcentaje_efectividad', { ascending: false })
    
    if (error || !patrones || patrones.length === 0) {
      console.log('⚠️ No hay patrones temporales aprendidos para este proveedor')
      return []
    }
    
    console.log(`📊 Patrones temporales encontrados: ${patrones.length}`)
    
    const candidatos: Candidato[] = []
    
    for (const patron of patrones) {
      if (patron.porcentaje_efectividad > 0.7) { // Solo patrones efectivos
        const albaranes = await buscarAlbaranesPorPatron(factura, patron)
        
        for (const albaran of albaranes) {
          candidatos.push({
            albaran_id: albaran.id,
            score: 0.6 * patron.porcentaje_efectividad, // Score base * efectividad del patrón
            metodo: 'patron_temporal',
            razones: ['patron_temporal_aprendido', 'mismo_proveedor'],
            factores: {
              proveedor: 1.0,
              fecha: 0.6,
              importe: 0.3,
              productos: 0.0,
              patron: patron.porcentaje_efectividad
            },
            restaurante_id: factura.restaurante_id
          })
        }
      }
    }
    
    console.log(`✅ Candidatos por patrones temporales: ${candidatos.length}`)
    return candidatos
    
  } catch (error) {
    console.error('❌ Error en buscarPorPatronesTemporal:', error)
    return []
  }
}

async function buscarUltimaOportunidad(factura: any): Promise<Candidato[]> {
  try {
    console.log(` Método 5: Última oportunidad...`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Buscar albaranes huérfanos del mismo proveedor (últimos 90 días)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 90)
    
    const { data: albaranesHuerfanos, error } = await supabase
      .from('datos_extraidos_albaranes')
      .select('*')
      .eq('restaurante_id', factura.restaurante_id)
      .eq('proveedor_nombre', factura.proveedor_nombre)
      .gte('fecha_albaran', fechaLimite.toISOString().split('T')[0])
      .order('fecha_albaran', { ascending: false })
      .limit(10) // Limitar a 10 para evitar sobrecarga
    
    if (error || !albaranesHuerfanos || albaranesHuerfanos.length === 0) {
      console.log('⚠️ No hay albaranes huérfanos para análisis de última oportunidad')
      return []
    }
    
    console.log(` Analizando ${albaranesHuerfanos.length} albaranes huérfanos...`)
    
    const candidatos: Candidato[] = []
    
    for (const albaran of albaranesHuerfanos) {
      const score = calcularScoreUltimaOportunidad(factura, albaran)
      
      if (score > 0.3) { // Solo candidatos con score > 30%
        candidatos.push({
          albaran_id: albaran.id,
          score: score,
          metodo: 'ultima_oportunidad',
          razones: ['albaran_huerfano', 'mismo_proveedor', 'ventana_temporal_amplia'],
          factores: {
            proveedor: 1.0,
            fecha: 0.2,
            importe: 0.3,
            productos: 0.0,
            huerfano: 0.4
          },
          restaurante_id: factura.restaurante_id
        })
      }
    }
    
    console.log(`✅ Candidatos por última oportunidad: ${candidatos.length}`)
    return candidatos
    
  } catch (error) {
    console.error('❌ Error en buscarUltimaOportunidad:', error)
    return []
  }
}

// FUNCIONES DE PROCESAMIENTO

function consolidarCandidatos(resultados: any[]): any[] {
  try {
    console.log(`📊 Consolidando candidatos de ${resultados.length} métodos...`)
    
    const candidatosConsolidados = new Map<string, any>()
    
    // Procesar resultados de cada método
    for (const resultado of resultados) {
      if (Array.isArray(resultado)) {
        for (const candidato of resultado) {
          const key = candidato.albaran_id
          
          if (candidatosConsolidados.has(key)) {
            // Candidato ya existe, actualizar con mejor score
            const existente = candidatosConsolidados.get(key)
            if (candidato.score > existente.score) {
              candidatosConsolidados.set(key, candidato)
            }
          } else {
            // Nuevo candidato
            candidatosConsolidados.set(key, candidato)
          }
        }
      }
    }
    
    const consolidados = Array.from(candidatosConsolidados.values())
    console.log(`✅ Candidatos consolidados: ${consolidados.length}`)
    
    // Ordenar por score descendente
    consolidados.sort((a, b) => b.score - a.score)
    
    return consolidados
    
  } catch (error) {
    console.error('❌ Error en consolidarCandidatos:', error)
    return []
  }
}

async function calcularScoresFinal(candidatos: any[], factura: any) {
  try {
    console.log(`📊 Calculando scores finales para ${candidatos.length} candidatos...`)
    
    // Por ahora, simplemente retornamos los candidatos con sus scores
    // En el futuro, aquí se pueden aplicar algoritmos más sofisticados
    // como machine learning o ajustes basados en patrones históricos
    
    for (const candidato of candidatos) {
      // Asegurar que el restaurante_id esté presente
      if (!candidato.restaurante_id) {
        candidato.restaurante_id = factura.restaurante_id
      }
      
      // Ajustar score basado en factores adicionales si es necesario
      // Por ejemplo, si la factura tiene productos muy específicos
      if (factura.productos_extraidos && factura.productos_extraidos.length > 0) {
        // Bonus por tener productos específicos
        candidato.score = Math.min(1, candidato.score + 0.02)
      }
    }
    
    console.log(`✅ Scores finales calculados`)
    return candidatos
    
  } catch (error) {
    console.error('❌ Error en calcularScoresFinal:', error)
    return candidatos
  }
}

function categorizarCandidatos(candidatos: any[]) {
  try {
    console.log(`🎯 Categorizando ${candidatos.length} candidatos...`)
    
    const altaConfianza: any[] = []
    const mediaConfianza: any[] = []
    const bajaConfianza: any[] = []
    
    for (const candidato of candidatos) {
      if (candidato.score >= 0.9) {
        altaConfianza.push(candidato)
      } else if (candidato.score >= 0.7) {
        mediaConfianza.push(candidato)
      } else {
        bajaConfianza.push(candidato)
      }
    }
    
    console.log(`✅ Categorización completada:`)
    console.log(`   🟢 Alta confianza (>90%): ${altaConfianza.length}`)
    console.log(`   🟡 Media confianza (70-89%): ${mediaConfianza.length}`)
    console.log(`   🔴 Baja confianza (<70%): ${bajaConfianza.length}`)
    
    return {
      altaConfianza,
      mediaConfianza,
      bajaConfianza
    }
    
  } catch (error) {
    console.error('❌ Error en categorizarCandidatos:', error)
    return {
      altaConfianza: [],
      mediaConfianza: [],
      bajaConfianza: []
    }
  }
}

async function procesarEnlacesAutomaticos(candidatos: any[], facturaId: string) {
  try {
    console.log(`⚡ Procesando ${candidatos.length} enlaces automáticos...`)
    
    if (candidatos.length === 0) {
      console.log('⚠️ No hay candidatos para enlaces automáticos')
      return
    }
    
    // Obtener la factura para obtener su ID primario
    const factura = await obtenerFactura(facturaId)
    if (!factura) {
      console.error('❌ No se pudo obtener la factura para procesar enlaces')
      return
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    for (const candidato of candidatos) {
      try {
        // Crear enlace automático usando el ID primario de la factura
        const { error: errorEnlace } = await supabase
          .from('facturas_albaranes_enlaces')
          .insert({
            factura_id: factura.id,  // ← Usar ID primario de la factura
            albaran_id: candidato.albaran_id,
            restaurante_id: candidato.restaurante_id || 'sistema',
            metodo_deteccion: candidato.metodo,
            confianza_match: candidato.score,
            razon_match: candidato.razones,
            estado: 'detectado',
            fecha_cotejo: new Date().toISOString(),
            created_by: 'sistema'
          })
        
        if (errorEnlace) {
          console.error(`❌ Error creando enlace automático:`, errorEnlace)
        } else {
          console.log(`✅ Enlace automático creado: Factura ${factura.id} ↔ Albarán ${candidato.albaran_id}`)
        }
        
        // Marcar albarán como no huérfano
        await marcarAlbaranNoHuerfano(candidato.albaran_id)
        
      } catch (error) {
        console.error(`❌ Error procesando candidato ${candidato.albaran_id}:`, error)
      }
    }
    
    console.log(`✅ Procesamiento de enlaces automáticos completado`)
    
  } catch (error) {
    console.error('❌ Error en procesarEnlacesAutomaticos:', error)
  }
}

async function crearSugerencias(candidatos: any[], facturaId: string) {
  try {
    console.log(`💡 Creando ${candidatos.length} sugerencias...`)
    
    if (candidatos.length === 0) {
      console.log('⚠️ No hay candidatos para sugerencias')
      return
    }
    
    // Obtener la factura para obtener su ID primario
    const factura = await obtenerFactura(facturaId)
    if (!factura) {
      console.error('❌ No se pudo obtener la factura para crear sugerencias')
      return
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    for (const candidato of candidatos) {
      try {
        // Crear enlace como sugerencia usando el ID primario de la factura
        const { error: errorEnlace } = await supabase
          .from('facturas_albaranes_enlaces')
          .insert({
            factura_id: factura.id,  // ← Usar ID primario de la factura
            albaran_id: candidato.albaran_id,
            restaurante_id: candidato.restaurante_id || 'sistema',
            metodo_deteccion: candidato.metodo,
            confianza_match: candidato.score,
            razon_match: candidato.razones,
            estado: 'sugerido',
            fecha_cotejo: new Date().toISOString(),
            created_by: 'sistema'
          })
        
        if (errorEnlace) {
          console.error(`❌ Error creando sugerencia:`, errorEnlace)
        } else {
          console.log(`✅ Sugerencia creada: Factura ${factura.id} ↔ Albarán ${candidato.albaran_id} (${Math.round(candidato.score * 100)}%)`)
        }
        
      } catch (error) {
        console.error(`❌ Error procesando sugerencia ${candidato.albaran_id}:`, error)
      }
    }
    
    console.log(`✅ Creación de sugerencias completada`)
    
  } catch (error) {
    console.error('❌ Error en crearSugerencias:', error)
  }
}

async function marcarParaRevisionManual(candidatos: any[], facturaId: string) {
  try {
    console.log(`🔍 Marcando ${candidatos.length} candidatos para revisión manual...`)
    
    if (candidatos.length === 0) {
      console.log('⚠️ No hay candidatos para revisión manual')
      return
    }
    
    // Obtener la factura para obtener su ID primario
    const factura = await obtenerFactura(facturaId)
    if (!factura) {
      console.error('❌ No se pudo obtener la factura para marcar revisión')
      return
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Marcar factura como requiere revisión manual usando el ID primario
    const { error: errorFactura } = await supabase
      .from('datos_extraidos_facturas')
      .update({
        requiere_revision: true,
        fecha_ultima_modificacion: new Date().toISOString()
      })
      .eq('id', factura.id)  // ← Usar ID primario de la factura
    
    if (errorFactura) {
      console.error('❌ Error marcando factura para revisión:', errorFactura)
    } else {
      console.log(`✅ Factura ${factura.id} marcada para revisión manual`)
    }
    
    // Crear entrada en documentos_huerfanos si no hay candidatos
    if (candidatos.length === 0) {
      const { error: errorHuerfano } = await supabase
        .from('documentos_huerfanos')
        .insert({
          documento_id: factura.documento_id,  // ← Usar documento_id para documentos_huerfanos
          tipo_documento: 'factura',
          restaurante_id: factura.restaurante_id || 'sistema',
          estado: 'pendiente',
          prioridad: 'alta',
          fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
        })
      
      if (errorHuerfano) {
        console.error('❌ Error creando entrada de huérfano:', errorHuerfano)
      } else {
        console.log(`✅ Entrada de huérfano creada para factura ${factura.documento_id}`)
      }
    }
    
    console.log(`✅ Marcado para revisión manual completado`)
    
  } catch (error) {
    console.error('❌ Error en marcarParaRevisionManual:', error)
  }
}

async function guardarCandidatosDetectados(candidatos: any[], facturaId: string) {
  try {
    console.log(` Guardando ${candidatos.length} candidatos para aprendizaje...`)
    
    if (candidatos.length === 0) {
      console.log('⚠️ No hay candidatos para guardar')
      return
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Obtener información de la factura para el contexto
    const factura = await obtenerFactura(facturaId)
    if (!factura) {
      console.log('⚠️ No se pudo obtener información de la factura para contexto')
      return
    }
    
    for (const candidato of candidatos) {
      try {
        // Guardar candidato detectado
        const { error: errorCandidato } = await supabase
          .from('cotejo_candidatos_detectados')
          .insert({
            factura_id: facturaId,
            albaran_id: candidato.albaran_id,
            restaurante_id: factura.restaurante_id,
            metodo_deteccion: candidato.metodo,
            score_calculado: candidato.score,
            factores_puntuacion: candidato.factores,
            razon_deteccion: candidato.razones,
            contexto_cotejo: {
              fecha_factura: factura.fecha_factura,
              proveedor: factura.proveedor_nombre,
              total_factura: factura.total_factura,
              numero_productos: factura.productos_extraidos?.length || 0
            }
          })
        
        if (errorCandidato) {
          console.error(`❌ Error guardando candidato ${candidato.albaran_id}:`, errorCandidato)
        } else {
          console.log(`✅ Candidato guardado para aprendizaje: ${candidato.albaran_id}`)
        }
        
      } catch (error) {
        console.error(`❌ Error procesando candidato ${candidato.albaran_id}:`, error)
      }
    }
    
    console.log(`✅ Guardado de candidatos para aprendizaje completado`)
    
  } catch (error) {
    console.error('❌ Error en guardarCandidatosDetectados:', error)
  }
}

async function generarNotificacion(categorizacion: any, factura: any) {
  try {
    console.log(`🔔 Generando notificación inteligente...`)
    
    let tipo: 'alta_confianza' | 'media_confianza' | 'baja_confianza' | 'sin_albaran'
    let mensaje: string
    let acciones: string[] = []
    
    if (categorizacion.altaConfianza.length > 0) {
      tipo = 'alta_confianza'
      mensaje = `✅ COTEJO AUTOMÁTICO COMPLETADO\n ${factura.numero_factura} - ${factura.proveedor_nombre}\n📦 ${categorizacion.altaConfianza.length} albarán(es) enlazado(s) automáticamente\n🎯 Confianza: ${Math.round(categorizacion.altaConfianza[0].score * 100)}%`
      acciones = ['ver_enlaces', 'revisar_detalles']
      
    } else if (categorizacion.mediaConfianza.length > 0) {
      tipo = 'media_confianza'
      mensaje = `⚠️ COTEJO CON SUGERENCIAS\n ${factura.numero_factura} - ${factura.proveedor_nombre}\n📦 ${categorizacion.mediaConfianza.length} candidato(s) encontrado(s)\n🎯 Mejor candidato: ${Math.round(categorizacion.mediaConfianza[0].score * 100)}% confianza\n[REVISAR SUGERENCIAS]`
      acciones = ['revisar_sugerencias', 'confirmar_enlaces', 'buscar_mas']
      
    } else if (categorizacion.bajaConfianza.length > 0) {
      tipo = 'baja_confianza'
      mensaje = ` COTEJO MANUAL REQUERIDO\n ${factura.numero_factura} - ${factura.proveedor_nombre}\n❓ ${categorizacion.bajaConfianza.length} candidato(s) de baja confianza\n[BUSCAR MANUALMENTE]`
      acciones = ['buscar_manual', 'marcar_factura_directa', 'revisar_logs']
      
    } else {
      tipo = 'sin_albaran'
      mensaje = `📄 FACTURA DIRECTA\n ${factura.numero_factura} - ${factura.proveedor_nombre}\nℹ️ No se encontraron albaranes relacionados\n✅ Marcada como factura directa`
      acciones = ['confirmar_factura_directa', 'revisar_manualmente']
    }
    
    console.log(`✅ Notificación generada: ${tipo}`)
    
    return {
      tipo: tipo,  // ← Ya está tipado correctamente
      mensaje: mensaje,
      acciones_disponibles: acciones
    }
    
  } catch (error) {
    console.error('❌ Error en generarNotificacion:', error)
    return {
      tipo: 'baja_confianza' as const,  // ← Usar 'as const' para asegurar el tipo
      mensaje: 'Error generando notificación',
      acciones_disponibles: ['revisar_logs', 'contactar_soporte']
    }
  }
}

async function actualizarEstadoHuerfanos(facturaId: string) {
  try {
    console.log(`📋 Actualizando estado de huérfanos...`)
    
    // Obtener la factura para obtener su ID primario
    const factura = await obtenerFactura(facturaId)
    if (!factura) {
      console.error('❌ No se pudo obtener la factura para actualizar estado de huérfanos')
      return
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Verificar si la factura ya no es huérfana usando el ID primario
    const { data: enlaces, error: errorEnlaces } = await supabase
      .from('facturas_albaranes_enlaces')
      .select('id')
      .eq('factura_id', factura.id)  // ← Usar ID primario de la factura
      .in('estado', ['detectado', 'confirmado', 'sugerido'])
    
    if (errorEnlaces) {
      console.error('❌ Error verificando enlaces:', errorEnlaces)
      return
    }
    
    // Si hay enlaces, marcar como resuelto
    if (enlaces && enlaces.length > 0) {
      const { error: errorUpdate } = await supabase
        .from('documentos_huerfanos')
        .update({
          estado: 'resuelto',
          fecha_resolucion: new Date().toISOString(),
          resuelto_por: 'sistema'
        })
        .eq('documento_id', factura.documento_id)  // ← Usar documento_id para documentos_huerfanos
        .eq('tipo_documento', 'factura')
      
      if (errorUpdate && errorUpdate.code !== 'PGRST116') {
        console.error('⚠️ Error actualizando estado de huérfano:', errorUpdate)
      } else {
        console.log(`✅ Estado de huérfano actualizado para factura ${factura.documento_id}`)
      }
    }
    
    console.log(`✅ Actualización de estado de huérfanos completada`)
    
  } catch (error) {
    console.error('❌ Error en actualizarEstadoHuerfanos:', error)
  }
}