import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface ImportRequest {
  restaurante_id: string
  action: 'import_historical' | 'daily_sync' | 'get_nearest_station'
  fecha_inicio?: string
  fecha_fin?: string
  force_refresh?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const aemetApiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZHVhcmRvLmFndWlsYXIuY29sbGFkb0BnbWFpbC5jb20iLCJqdGkiOiI4NzgzNTk3Yi1lMjg0LTQzOGEtODc2Mi1jNTgzZDJmNzNkODQiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTc1NjEzMTUwMCwidXNlcklkIjoiODc4MzU5N2ItZTI4NC00MzhhLTg3NjItYzU4M2QyZjczZDg0Iiwicm9sZSI6IiJ9.A_yjNcePks7nOByl80J8hqUEP1BkB6pBPCnVnEEndgs'
    
    if (!aemetApiKey) {
      throw new Error('AEMET_API_KEY no configurada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const requestData: ImportRequest = await req.json()

    const { restaurante_id, action, fecha_inicio, fecha_fin } = requestData

    console.log(`🌤️ AEMET Importer - Acción: ${action} para restaurante: ${restaurante_id}`)

    let result: any = {}

    switch (action) {
      case 'get_nearest_station':
        result = await getNearestStation(supabase, restaurante_id, aemetApiKey)
        break
      case 'import_historical':
        result = await importHistoricalData(supabase, restaurante_id, aemetApiKey, fecha_inicio!, fecha_fin!)
        break
      case 'daily_sync':
        result = await dailySync(supabase, restaurante_id, aemetApiKey)
        break
      default:
        throw new Error(`Acción no soportada: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        data: result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Error en aemet-data-importer:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// FUNCIÓN: Encontrar estación más cercana
async function getNearestStation(supabase: any, restauranteId: string, apiKey: string) {
  // 1. Obtener coordenadas del restaurante
  const { data: restaurant } = await supabase
    .from('restaurantes')
    .select('latitud, longitud, nombre')
    .eq('id', restauranteId)
    .single()

  console.log(`🏪 Datos del restaurante:`, {
    nombre: restaurant?.nombre,
    latitud: restaurant?.latitud,
    longitud: restaurant?.longitud,
    tipo_latitud: typeof restaurant?.latitud,
    tipo_longitud: typeof restaurant?.longitud
  })

  if (!restaurant?.latitud || !restaurant?.longitud) {
    throw new Error('Coordenadas del restaurante no encontradas')
  }

  // 2. Obtener lista de estaciones de AEMET
  const estacionesUrl = `https://opendata.aemet.es/opendata/api/valores/climatologicos/inventarioestaciones/todasestaciones/?api_key=${apiKey}`
  
  const response = await fetch(estacionesUrl)
  const responseData = await response.json()
  
  if (!response.ok) {
    throw new Error(`Error AEMET API: ${response.status} - ${responseData.descripcion || 'Error desconocido'}`)
  }

  // 3. Obtener datos de estaciones
  const dataUrl = responseData.datos
  const dataResponse = await fetch(dataUrl)
  const estaciones = await dataResponse.json()

  // 4. Encontrar estación más cercana
  let estacionMasCercana = null
  let distanciaMinima = Infinity
  const estacionesCercanas: any[] = []

  estaciones.forEach((estacion: any) => {
    if (estacion.latitud && estacion.longitud) {
      // Convertir formato AEMET (393621N) a decimal (39.6058)
      const latAemet = convertirCoordenadasAemet(estacion.latitud)
      const lngAemet = convertirCoordenadasAemet(estacion.longitud)
      
      if (latAemet !== null && lngAemet !== null) {
        const distancia = calcularDistancia(
          restaurant.latitud, 
          restaurant.longitud,
          latAemet,
          lngAemet
        )
        
        // Guardar las 10 más cercanas para debugging
        if (estacionesCercanas.length < 10) {
          estacionesCercanas.push({
            nombre: estacion.nombre,
            provincia: estacion.provincia,
            distancia: distancia.toFixed(2),
            latitud: `${latAemet.toFixed(4)}`,
            longitud: `${lngAemet.toFixed(4)}`,
            original_lat: estacion.latitud,
            original_lng: estacion.longitud
          })
          estacionesCercanas.sort((a, b) => parseFloat(a.distancia) - parseFloat(b.distancia))
          if (estacionesCercanas.length > 10) estacionesCercanas.pop()
        }
        
        if (distancia < distanciaMinima) {
          distanciaMinima = distancia
          estacionMasCercana = estacion
        }
      }
    }
  })

  console.log(`🔍 Las 10 estaciones más cercanas:`)
  estacionesCercanas.forEach((est, i) => {
    console.log(`   ${i+1}. ${est.nombre} (${est.provincia}) - ${est.distancia}km - Lat:${est.latitud}, Lng:${est.longitud}`)
  })

  if (!estacionMasCercana) {
    throw new Error('No se encontró estación meteorológica cercana')
  }

  // 5. Guardar estación en BD
  await supabase
    .from('estaciones_aemet')
    .upsert({
      codigo: estacionMasCercana.indicativo,
      nombre: estacionMasCercana.nombre,
      provincia: estacionMasCercana.provincia,
      latitud: parseFloat(estacionMasCercana.latitud.replace(',', '.')),
      longitud: parseFloat(estacionMasCercana.longitud.replace(',', '.')),
      altitud: estacionMasCercana.altitud ? parseInt(estacionMasCercana.altitud) : null
    }, { onConflict: 'codigo' })

  console.log(`🎯 Estación más cercana: ${estacionMasCercana.nombre} (${distanciaMinima.toFixed(2)}km)`)

  return {
    estacion: estacionMasCercana,
    distancia_km: distanciaMinima,
    restaurante: restaurant
  }
}

// FUNCIÓN: Obtener múltiples estaciones cercanas
async function getMultipleNearestStations(supabase: any, restauranteId: string, apiKey: string, cantidad: number = 5) {
  // Reutilizar la lógica de getNearestStation pero devolver múltiples
  const { data: restaurant } = await supabase
    .from('restaurantes')
    .select('latitud, longitud, nombre')
    .eq('id', restauranteId)
    .single()

  if (!restaurant?.latitud || !restaurant?.longitud) {
    throw new Error('Coordenadas del restaurante no encontradas')
  }

  // Obtener estaciones de AEMET
  const estacionesUrl = `https://opendata.aemet.es/opendata/api/valores/climatologicos/inventarioestaciones/todasestaciones/?api_key=${apiKey}`
  const response = await fetch(estacionesUrl)
  const responseData = await response.json()
  
  if (!response.ok) {
    throw new Error(`Error AEMET API: ${response.status}`)
  }

  const dataUrl = responseData.datos
  const dataResponse = await fetch(dataUrl)
  const estaciones = await dataResponse.json()

  // Calcular distancias y ordenar
  const estacionesConDistancia = []

  estaciones.forEach((estacion: any) => {
    if (estacion.latitud && estacion.longitud) {
      const latAemet = convertirCoordenadasAemet(estacion.latitud)
      const lngAemet = convertirCoordenadasAemet(estacion.longitud)
      
      if (latAemet !== null && lngAemet !== null) {
        const distancia = calcularDistancia(
          restaurant.latitud, 
          restaurant.longitud,
          latAemet,
          lngAemet
        )
        
        estacionesConDistancia.push({
          codigo: estacion.indicativo,
          nombre: estacion.nombre,
          provincia: estacion.provincia,
          distancia_km: Math.round(distancia * 100) / 100,
          latitud: latAemet,
          longitud: lngAemet
        })
      }
    }
  })

  // Ordenar por distancia y tomar las más cercanas
  estacionesConDistancia.sort((a, b) => a.distancia_km - b.distancia_km)
  const estacionesSeleccionadas = estacionesConDistancia.slice(0, cantidad)
  
  console.log(`🔍 Top ${cantidad} estaciones seleccionadas:`)
  estacionesSeleccionadas.forEach((est, i) => {
    console.log(`   ${i+1}. ${est.nombre} (${est.provincia}) - ${est.distancia_km}km`)
  })

  return estacionesSeleccionadas
}

// FUNCIÓN: Importar datos históricos
async function importHistoricalData(supabase: any, restauranteId: string, apiKey: string, fechaInicio: string, fechaFin: string) {
  console.log(`📅 Importando datos históricos: ${fechaInicio} - ${fechaFin}`)
  
  // 1. Obtener estaciones cercanas (probar múltiples)
  const stationResult = await getNearestStation(supabase, restauranteId, apiKey)
  
  // Obtener las 5 estaciones más cercanas para probar
  const estacionesCercanas = await getMultipleNearestStations(supabase, restauranteId, apiKey, 5)
  
  // 2. Probar estaciones hasta encontrar una con datos
  for (const estacion of estacionesCercanas) {
    console.log(`🧪 Probando estación: ${estacion.nombre} (${estacion.distancia_km}km)`)
    
    const resultado = await probarEstacionParaDatos(supabase, restauranteId, apiKey, estacion.codigo, fechaInicio, fechaFin)
    
    if (resultado.exito) {
      console.log(`✅ Estación exitosa: ${estacion.nombre} - ${resultado.datos_importados} registros`)
      return {
        datos_importados: resultado.datos_importados,
        errores: resultado.errores,
        estacion_utilizada: estacion.nombre,
        periodo: `${fechaInicio} - ${fechaFin}`
      }
    } else {
      console.log(`❌ Estación ${estacion.nombre}: ${resultado.razon}`)
    }
  }
  
  // Si ninguna estación funciona
  throw new Error('Ninguna estación cercana tiene datos disponibles para el período solicitado')
}

// FUNCIÓN: Probar una estación específica para datos
async function probarEstacionParaDatos(supabase: any, restauranteId: string, apiKey: string, estacionCodigo: string, fechaInicio: string, fechaFin: string) {
  let datosImportados = 0
  let errores = 0

  // Procesar por chunks de 6 meses (limitación de AEMET)
  const fechaInicioObj = new Date(fechaInicio)
  const fechaFinObj = new Date(fechaFin)
  
  // Dividir en chunks de 6 meses
  const chunks = []
  let fechaActual = new Date(fechaInicioObj)
  
  while (fechaActual <= fechaFinObj) {
    const fechaChunkFin = new Date(fechaActual)
    fechaChunkFin.setMonth(fechaChunkFin.getMonth() + 6)
    
    // No pasarse de la fecha final
    if (fechaChunkFin > fechaFinObj) {
      fechaChunkFin.setTime(fechaFinObj.getTime())
    }
    
    chunks.push({
      inicio: fechaActual.toISOString().split('T')[0],
      fin: fechaChunkFin.toISOString().split('T')[0]
    })
    
    // Siguiente chunk
    fechaActual.setMonth(fechaActual.getMonth() + 6)
    fechaActual.setDate(fechaActual.getDate() + 1) // Evitar solapamiento
  }
  
  console.log(`📅 Dividido en ${chunks.length} chunks de 6 meses:`)
  chunks.forEach((chunk, i) => {
    console.log(`   Chunk ${i+1}: ${chunk.inicio} - ${chunk.fin}`)
  })
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    try {
      console.log(`📊 Procesando chunk ${i+1}/${chunks.length}: ${chunk.inicio} - ${chunk.fin}`)
      
      // 3. Llamar a AEMET API para este rango
      const datosUrl = `https://opendata.aemet.es/opendata/api/valores/climatologicos/diarios/datos/fechaini/${chunk.inicio}T00:00:00UTC/fechafin/${chunk.fin}T23:59:59UTC/estacion/${estacionCodigo}/?api_key=${apiKey}`
      
      const response = await fetch(datosUrl)
      const responseData = await response.json()
      
      console.log(`📊 Respuesta AEMET chunk ${i+1}:`, {
        status: response.status,
        ok: response.ok,
        data: responseData
      })
      
      if (!response.ok) {
        console.error(`Error chunk ${i+1}:`, responseData)
        errores++
        continue
      }

      // 4. Obtener datos reales
      const dataUrl = responseData.datos
      if (!dataUrl) {
        console.error(`❌ AEMET no devolvió URL de datos para chunk ${i+1}:`, responseData)
        errores++
        continue
      }
      
      console.log(`🔗 Obteniendo datos de: ${dataUrl}`)
      
      // Retry automático para errores de conexión
      let dataResponse
      let intentos = 0
      const maxIntentos = 3
      
      while (intentos < maxIntentos) {
        try {
          dataResponse = await fetch(dataUrl)
          break // Éxito
        } catch (error) {
          intentos++
          console.log(`⚠️ Intento ${intentos}/${maxIntentos} falló: ${error.message}`)
          if (intentos < maxIntentos) {
            console.log(`🔄 Reintentando en 3 segundos...`)
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      }
      
      if (!dataResponse) {
        console.error(`❌ Error obteniendo datos del chunk ${i+1}: Máximo de reintentos alcanzado`)
        errores++
        continue
      }
      
      if (!dataResponse.ok) {
        console.error(`❌ Error obteniendo datos del chunk ${i+1}: ${dataResponse.status}`)
        errores++
        continue
      }
      
      const datosMeteo = await dataResponse.json()

      // 5. Procesar y guardar datos
      for (const dato of datosMeteo) {
        try {
          await supabase
            .from('correlacion_clima_ventas')
            .upsert({
              restaurante_id: restauranteId,
              fecha: dato.fecha,
              estacion_aemet: estacionCodigo,
              temperatura_max: parseFloat(dato.tmax?.replace(',', '.')) || null,
              temperatura_min: parseFloat(dato.tmin?.replace(',', '.')) || null,
              temperatura_media: parseFloat(dato.tmed?.replace(',', '.')) || null,
              precipitacion: parseFloat(dato.prec?.replace(',', '.')) || 0,
              viento_velocidad: parseFloat(dato.velmedia?.replace(',', '.')) || null,
              condicion_principal: determinarCondicion(
                parseFloat(dato.prec?.replace(',', '.')) || 0,
                parseFloat(dato.tmed?.replace(',', '.')) || 0
              )
            }, { 
              onConflict: 'restaurante_id,fecha',
              ignoreDuplicates: false 
            })

          datosImportados++
        } catch (error) {
          console.error(`Error guardando dato ${dato.fecha}:`, error)
          errores++
        }
      }
      
      console.log(`✅ Chunk ${i+1} procesado: ${datosMeteo.length} registros`)
      
      // Pausa entre chunks para no sobrecargar API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
    } catch (error) {
      console.error(`Error procesando chunk ${i+1}:`, error)
      errores++
    }
  }

  // Verificar si encontramos datos
  if (datosImportados > 0) {
    return {
      exito: true,
      datos_importados: datosImportados,
      errores: errores
    }
  } else {
    return {
      exito: false,
      razon: 'No hay datos disponibles para este período',
      datos_importados: 0,
      errores: errores
    }
  }
}

// FUNCIÓN: Sync diario
async function dailySync(supabase: any, restauranteId: string, apiKey: string) {
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  const fechaAyer = ayer.toISOString().split('T')[0]
  
  return await importHistoricalData(supabase, restauranteId, apiKey, fechaAyer, fechaAyer)
}

// UTILIDADES
function convertirCoordenadasAemet(coordenada: string): number | null {
  try {
    // Formato AEMET: 393621N o 024224E
    // Significa: 39°36'21"N = 39 + 36/60 + 21/3600 = 39.6058
    
    if (!coordenada || coordenada.length < 6) return null
    
    const direccion = coordenada.slice(-1) // N, S, E, W
    const numero = coordenada.slice(0, -1) // 393621
    
    let grados, minutos, segundos
    
    if (numero.length === 6) {
      // Formato: DDMMSS
      grados = parseInt(numero.slice(0, 2))
      minutos = parseInt(numero.slice(2, 4))
      segundos = parseInt(numero.slice(4, 6))
    } else if (numero.length === 7) {
      // Formato: DDDMMSS
      grados = parseInt(numero.slice(0, 3))
      minutos = parseInt(numero.slice(3, 5))
      segundos = parseInt(numero.slice(5, 7))
    } else {
      return null
    }
    
    let decimal = grados + minutos/60 + segundos/3600
    
    // Aplicar signo según dirección
    if (direccion === 'S' || direccion === 'W') {
      decimal = -decimal
    }
    
    return decimal
  } catch (error) {
    console.error('Error convirtiendo coordenada AEMET:', coordenada, error)
    return null
  }
}

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function determinarCondicion(precipitacion: number, temperatura: number): string {
  if (precipitacion > 0.1) return 'Rain'
  if (temperatura > 25) return 'Clear'
  if (temperatura < 10) return 'Cold'
  return 'Clouds'
}