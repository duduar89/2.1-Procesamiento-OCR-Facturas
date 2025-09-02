// =============================================
// EDGE FUNCTION: weather-manager
// Gestiona datos meteorológicos para correlacionar con ventas
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

interface WeatherRequest {
  restaurante_id: string
  action: 'current' | 'forecast' | 'correlation' | 'cleanup'
  force_refresh?: boolean
}

interface WeatherData {
  temperatura: number
  sensacion_termica: number
  humedad: number
  presion: number
  nubosidad: number
  precipitacion: number
  viento_velocidad: number
  viento_direccion: number
  condicion_principal: string
  condicion_descripcion: string
  icono_codigo: string
  icono_emoji: string
  indice_uv: number
  probabilidad_lluvia: number
  visibilidad: number
  api_timestamp: number
  datos_raw: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openweatherApiKey = Deno.env.get('OPENWEATHER_API_KEY')!
    
    if (!openweatherApiKey) {
      throw new Error('OPENWEATHER_API_KEY no configurada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    let requestData: WeatherRequest
    try {
      requestData = await req.json()
    } catch (error) {
      throw new Error('JSON inválido en el request')
    }

    const { restaurante_id, action = 'current', force_refresh = false } = requestData

    if (!restaurante_id) {
      throw new Error('restaurante_id es requerido')
    }

    console.log(`🌤️ Weather Manager - Acción: ${action} para restaurante: ${restaurante_id}`)

    let result: any = {}

    switch (action) {
      case 'current':
        result = await getCurrentWeather(supabase, restaurante_id, openweatherApiKey, force_refresh)
        break
      case 'forecast':
        result = await getForecastWeather(supabase, restaurante_id, openweatherApiKey)
        break
      case 'correlation':
        result = await getWeatherCorrelation(supabase, restaurante_id)
        break
      case 'cleanup':
        result = await cleanupOldWeatherData(supabase, restaurante_id)
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
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error en weather-manager:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        action: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// =============================================
// FUNCIÓN: OBTENER CLIMA ACTUAL
// =============================================
async function getCurrentWeather(
  supabase: any, 
  restauranteId: string, 
  apiKey: string, 
  forceRefresh: boolean
): Promise<any> {
  
  console.log('🌡️ Obteniendo clima actual...')

  // 1. Obtener coordenadas del restaurante
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurantes')
    .select('latitud, longitud, nombre, ciudad')
    .eq('id', restauranteId)
    .single()

  if (restaurantError || !restaurant) {
    throw new Error(`Restaurante no encontrado: ${restauranteId}`)
  }

  if (!restaurant.latitud || !restaurant.longitud) {
    throw new Error(`Coordenadas no configuradas para el restaurante ${restaurant.nombre}`)
  }

  // 2. Verificar si tenemos datos actuales recientes (< 10 minutos)
  if (!forceRefresh) {
    const { data: recentWeather } = await supabase
      .from('weather_data')
      .select('*')
      .eq('restaurante_id', restauranteId)
      .eq('es_actual', true)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .single()

    if (recentWeather) {
      console.log('⚡ Usando datos en caché (< 10 min)')
      return {
        source: 'cache',
        weather: recentWeather,
        restaurant_info: {
          nombre: restaurant.nombre,
          ciudad: restaurant.ciudad || 'Huelva' // fallback
        },
        cached_minutes_ago: Math.round((Date.now() - new Date(recentWeather.created_at).getTime()) / 60000)
      }
    }
  }

  // 3. Llamar a OpenWeather API
  const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${restaurant.latitud}&lon=${restaurant.longitud}&units=metric&lang=es&exclude=minutely,alerts&appid=${apiKey}`
  
  console.log('🌐 Llamando a OpenWeather API...')
  const response = await fetch(apiUrl)
  
  if (!response.ok) {
    throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`)
  }

  const weatherApiData = await response.json()

  // 4. Procesar datos actuales
  const currentData = weatherApiData.current
  const weatherData: WeatherData = {
    temperatura: currentData.temp,
    sensacion_termica: currentData.feels_like,
    humedad: currentData.humidity,
    presion: currentData.pressure,
    nubosidad: currentData.clouds,
    precipitacion: currentData.rain?.['1h'] || 0,
    viento_velocidad: currentData.wind_speed,
    viento_direccion: currentData.wind_deg || 0,
    condicion_principal: currentData.weather[0]?.main || 'Unknown',
    condicion_descripcion: currentData.weather[0]?.description || 'Sin descripción',
    icono_codigo: currentData.weather[0]?.icon || '01d',
    icono_emoji: getWeatherEmoji(currentData.weather[0]?.icon || '01d'),
    indice_uv: currentData.uvi || 0,
    probabilidad_lluvia: 0, // Current weather no tiene POP
    visibilidad: currentData.visibility || 10000,
    ciudad: restaurant.ciudad || weatherApiData.timezone?.split('/')[1]?.replace('_', ' ') || 'Madrid', // Usar ciudad del restaurante
    api_timestamp: currentData.dt,
    datos_raw: weatherApiData
  }

  // 5. Marcar todos los registros actuales como no actuales
  await supabase
    .from('weather_data')
    .update({ es_actual: false })
    .eq('restaurante_id', restauranteId)
    .eq('es_actual', true)

  // 6. Insertar nuevo registro actual
  const fecha = new Date().toISOString().split('T')[0]
  const hora = new Date().getHours()
  
  const { data: insertedWeather, error: insertError } = await supabase
    .from('weather_data')
    .insert({
      restaurante_id: restauranteId,
      fecha: fecha,
      hora: hora,
      es_actual: true,
      es_prediccion: false,
      api_timestamp: Date.now(),
      ...weatherData
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Error guardando clima: ${insertError.message}`)
  }

  // 7. TAMBIÉN GUARDAR COMO HISTÓRICO para consultas futuras
  // Verificar si ya existe un registro histórico para hoy
  const { data: existingHistory } = await supabase
    .from('weather_data')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('fecha', fecha)
    .eq('es_actual', false)
    .eq('es_prediccion', false)
    .limit(1)

  if (!existingHistory || existingHistory.length === 0) {
    // Solo crear registro histórico si no existe uno para hoy
    const { error: historyError } = await supabase
      .from('weather_data')
      .insert({
        restaurante_id: restauranteId,
        fecha: fecha,
        hora: 12, // Usar mediodía como hora representativa del día
        es_actual: false,
        es_prediccion: false,
        api_timestamp: Date.now(),
        ...weatherData
      })

    if (historyError) {
      console.warn('⚠️ Error guardando histórico meteorológico:', historyError.message)
    } else {
      console.log('📚 Registro histórico meteorológico guardado para:', fecha)
    }
  }

  console.log('✅ Clima actual guardado en BD')

  return {
    source: 'api',
    weather: insertedWeather,
    restaurant_info: {
      nombre: restaurant.nombre,
      ciudad: restaurant.ciudad || 'Huelva' // fallback
    },
    api_calls_used: 1
  }
}

// =============================================
// FUNCIÓN: OBTENER PREDICCIONES
// =============================================
async function getForecastWeather(
  supabase: any, 
  restauranteId: string, 
  apiKey: string
): Promise<any> {
  
  console.log('📅 Obteniendo predicciones meteorológicas...')

  // Obtener coordenadas del restaurante
  const { data: restaurant } = await supabase
    .from('restaurantes')
    .select('latitud, longitud')
    .eq('id', restauranteId)
    .single()

  if (!restaurant?.latitud || !restaurant?.longitud) {
    throw new Error('Coordenadas del restaurante no encontradas')
  }

  // Llamar a OpenWeather API (datos ya incluyen forecast en la llamada anterior)
  const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${restaurant.latitud}&lon=${restaurant.longitud}&units=metric&lang=es&exclude=minutely,alerts&appid=${apiKey}`
  
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`OpenWeather API error: ${response.status}`)
  }

  const weatherApiData = await response.json()

  // Procesar predicciones diarias (próximos 7 días)
  const dailyForecasts: any[] = []
  
  for (const dayData of weatherApiData.daily.slice(0, 7)) { // Incluir hoy (próximos 7 días)
    const fecha = new Date(dayData.dt * 1000).toISOString().split('T')[0]
    
    const forecastData = {
      restaurante_id: restauranteId,
      fecha: fecha,
      hora: null, // Datos diarios
      temperatura: dayData.temp.day,
      sensacion_termica: dayData.feels_like.day,
      humedad: dayData.humidity,
      presion: dayData.pressure,
      nubosidad: dayData.clouds,
      precipitacion: dayData.rain || 0,
      viento_velocidad: dayData.wind_speed,
      viento_direccion: dayData.wind_deg || 0,
      condicion_principal: dayData.weather[0]?.main || 'Unknown',
      condicion_descripcion: dayData.weather[0]?.description || 'Sin descripción',
      icono_codigo: dayData.weather[0]?.icon || '01d',
      icono_emoji: getWeatherEmoji(dayData.weather[0]?.icon || '01d'),
      indice_uv: dayData.uvi || 0,
      probabilidad_lluvia: (dayData.pop || 0) * 100, // Convertir a porcentaje
      visibilidad: 10000, // No disponible en daily
      api_timestamp: dayData.dt,
      es_actual: false,
      es_prediccion: true,
      datos_raw: dayData
    }

    dailyForecasts.push(forecastData)
  }

  // Limpiar predicciones anteriores
  await supabase
    .from('weather_data')
    .delete()
    .eq('restaurante_id', restauranteId)
    .eq('es_prediccion', true)

  // Insertar nuevas predicciones
  const { data: insertedForecasts, error: insertError } = await supabase
    .from('weather_data')
    .insert(dailyForecasts)
    .select()

  if (insertError) {
    throw new Error(`Error insertando predicciones: ${insertError.message}`)
  }

  console.log(`✅ ${insertedForecasts.length} predicciones guardadas`)

  return {
    forecasts_inserted: insertedForecasts.length,
    forecasts: insertedForecasts,
    api_calls_used: 1
  }
}

// =============================================
// FUNCIÓN: CORRELACIÓN CLIMA-VENTAS
// =============================================
async function getWeatherCorrelation(supabase: any, restauranteId: string): Promise<any> {
  console.log('📊 Calculando correlación clima-ventas...')

  // Obtener datos de los últimos 30 días con clima y ventas
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: correlationData, error } = await supabase
    .from('weather_data')
    .select(`
      fecha,
      temperatura,
      precipitacion,
      condicion_principal
    `)
    .eq('restaurante_id', restauranteId)
    .gte('fecha', thirtyDaysAgo)
    .is('es_prediccion', false)
    .order('fecha', { ascending: true })

  if (error) {
    throw new Error(`Error obteniendo datos de correlación: ${error.message}`)
  }

  // TODO: Implementar correlación real con datos de ventas
  // Por ahora, devolver estructura básica

  return {
    period_days: 30,
    weather_days: correlationData?.length || 0,
    correlations: {
      temperature_sales: 0.65, // Ejemplo
      rain_delivery: 0.82, // Ejemplo
      sunny_terrace: 0.71 // Ejemplo
    },
    insights: [
      "Días soleados aumentan ventas en terraza +40%",
      "Lluvia incrementa pedidos delivery +25%",
      "Temperaturas >25°C impulsan bebidas frías +60%"
    ]
  }
}

// =============================================
// FUNCIÓN: LIMPIAR DATOS ANTIGUOS
// =============================================
async function cleanupOldWeatherData(supabase: any, restauranteId: string): Promise<any> {
  console.log('🧹 Limpiando datos meteorológicos antiguos...')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('weather_data')
    .delete()
    .eq('restaurante_id', restauranteId)
    .eq('es_prediccion', false)
    .lt('created_at', thirtyDaysAgo)
    .select('id')

  if (error) {
    throw new Error(`Error limpiando datos antiguos: ${error.message}`)
  }

  console.log(`🗑️ ${data?.length || 0} registros antiguos eliminados`)

  return {
    deleted_records: data?.length || 0,
    cutoff_date: thirtyDaysAgo
  }
}

// =============================================
// FUNCIÓN UTILIDAD: EMOJI DEL CLIMA
// =============================================
function getWeatherEmoji(iconCode: string): string {
  const emojiMap: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', // clear sky
    '02d': '⛅', '02n': '☁️', // few clouds
    '03d': '☁️', '03n': '☁️', // scattered clouds
    '04d': '☁️', '04n': '☁️', // broken clouds
    '09d': '🌦️', '09n': '🌧️', // shower rain
    '10d': '🌦️', '10n': '🌧️', // rain
    '11d': '⛈️', '11n': '⛈️', // thunderstorm
    '13d': '❄️', '13n': '❄️', // snow
    '50d': '🌫️', '50n': '🌫️'  // mist
  }
  
  return emojiMap[iconCode] || '🌤️'
}