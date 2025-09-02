// =============================================
// EDGE FUNCTION: get-dashboard-data CORREGIDA
// Soluciona problemas de consultas, joins y procesamiento de datos
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// FUNCIÓN: OBTENER DATOS METEOROLÓGICOS PARA DASHBOARD
// =============================================
async function obtenerDatosMeteorologicos(
  supabase: any, 
  restauranteId: string, 
  fechaInicio: string, 
  fechaFin: string,
  tipoRango?: string
): Promise<any[]> {
  console.log(`🌤️ Obteniendo datos meteorológicos para: ${fechaInicio} - ${fechaFin}`);
  
  try {
    // 1. Obtener datos meteorológicos del período (predicciones + históricos)
    const { data: weatherData, error } = await supabase
      .from('weather_data')
      .select(`
        fecha,
        hora,
        temperatura,
        sensacion_termica,
        humedad,
        precipitacion,
        condicion_principal,
        condicion_descripcion,
        icono_codigo,
        icono_emoji,
        indice_uv,
        probabilidad_lluvia,
        es_actual,
        es_prediccion,
        created_at,
        api_timestamp
      `)
      .eq('restaurante_id', restauranteId)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .is('es_actual', false)     // Excluir solo datos actuales (incluir predicciones + históricos)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: false }); // Más reciente primero
    
    if (error) {
      console.error('❌ Error obteniendo datos meteorológicos:', error);
      return [];
    }
    
    // ✅ PARA VISTA SEMANAL: SIEMPRE VERIFICAR Y OBTENER DATOS COMPLETOS
    if (tipoRango === 'week') {
      console.log('📅 Vista semanal detectada - verificando cobertura completa de datos meteorológicos');
      
      // Calcular días necesarios para la semana completa
      const fechaInicioDate = new Date(fechaInicio + 'T00:00:00');
      const fechaFinDate = new Date(fechaFin + 'T23:59:59');
      const diasNecesarios = Math.ceil((fechaFinDate - fechaInicioDate) / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`🔍 Días necesarios: ${diasNecesarios}, datos disponibles: ${weatherData?.length || 0}`);
      
      // Si no tenemos datos completos, forzar obtención
      if (!weatherData || weatherData.length < diasNecesarios) {
        console.log('🔄 Datos incompletos - forzando obtención de pronósticos completos...');
        try {
          await obtenerDatosMeteorologicosReales(supabase, restauranteId);
          
          // Reintentar consulta después de obtener datos reales
          const { data: weatherDataRetry, error: retryError } = await supabase
            .from('weather_data')
            .select(`
              fecha, hora, temperatura, sensacion_termica, humedad, precipitacion,
              condicion_principal, condicion_descripcion, icono_codigo, icono_emoji,
              indice_uv, probabilidad_lluvia, es_actual, es_prediccion, created_at, api_timestamp
            `)
            .eq('restaurante_id', restauranteId)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .is('es_actual', false)     // Predicciones (no datos actuales)
            .order('fecha', { ascending: true });
          
          if (!retryError && weatherDataRetry && weatherDataRetry.length > 0) {
            console.log(`✅ Reintento exitoso: ${weatherDataRetry.length} días con datos meteorológicos`);
            weatherData = weatherDataRetry;
          }
        } catch (error) {
          console.warn('⚠️ No se pudieron obtener datos meteorológicos reales:', error);
        }
      }
    }
    
    if (!weatherData || weatherData.length === 0) {
      console.log('🚫 Sin datos meteorológicos reales disponibles - no se mostrarán iconos');
      return [];
    }
    
    // 2. Si es vista semanal, asegurar que tenemos datos para todos los días
    if (tipoRango === 'week') {
      return procesarDatosMeteorologicosSemana(weatherData, fechaInicio, fechaFin);
    }
    
    // 3. Para otros rangos, devolver datos únicos por fecha (preferir horario diurno)
    const weatherByDate = new Map();
    weatherData.forEach(w => {
      if (!weatherByDate.has(w.fecha)) {
        weatherByDate.set(w.fecha, w);
      } else {
        // Aplicar misma lógica de selección de hora que en vista semanal
        const datoExistente = weatherByDate.get(w.fecha);
        const horaExistente = (datoExistente.hora && typeof datoExistente.hora === 'string') ? 
          parseInt(datoExistente.hora.split(':')[0]) : 12;
        const horaNueva = (w.hora && typeof w.hora === 'string') ? 
          parseInt(w.hora.split(':')[0]) : 12;
        
        const esHoraDiurnaExistente = horaExistente >= 10 && horaExistente <= 16;
        const esHoraDiurnaNueva = horaNueva >= 10 && horaNueva <= 16;
        
        if (esHoraDiurnaNueva && !esHoraDiurnaExistente) {
          weatherByDate.set(w.fecha, w);
        } else if (esHoraDiurnaNueva && esHoraDiurnaExistente) {
          const distanciaExistente = Math.abs(horaExistente - 12);
          const distanciaNueva = Math.abs(horaNueva - 12);
          if (distanciaNueva < distanciaExistente) {
            weatherByDate.set(w.fecha, w);
          }
        }
      }
    });
    
    const resultado = Array.from(weatherByDate.values());
    console.log(`✅ ${resultado.length} días con datos meteorológicos obtenidos`);
    
    // Debug: mostrar qué datos se encontraron
    if (resultado.length > 0) {
      console.log('🔍 Datos meteorológicos encontrados:');
      resultado.forEach((w, i) => {
        const hora = (w.hora && typeof w.hora === 'string') ? w.hora : 'sin hora';
        console.log(`   ${w.fecha} ${hora}: es_actual=${w.es_actual}, es_prediccion=${w.es_prediccion}, api_timestamp=${w.api_timestamp}`);
      });
    }
    
    return resultado;
    
  } catch (error) {
    console.error('💥 Error crítico obteniendo datos meteorológicos:', error);
    console.log('🚫 Sin datos meteorológicos disponibles - no se mostrarán iconos');
    return [];
  }
}

// =============================================
// FUNCIÓN: PROCESAR DATOS METEOROLÓGICOS PARA SEMANA
// =============================================
function procesarDatosMeteorologicosSemana(weatherData: any[], fechaInicio: string, fechaFin: string): any[] {
  console.log('📅 Procesando datos meteorológicos para vista semanal');
  
  // Considerar datos reales: predicciones (es_prediccion=true) O históricos (es_prediccion=false + api_timestamp)
  const datosReales = weatherData.filter(w => 
    w.api_timestamp || 
    w.es_prediccion === true ||
    (w.es_actual === false && w.es_prediccion === false && w.created_at) // Datos históricos
  );
  
  // FILTRAR PARA OBTENER SOLO UN DATO POR DÍA (preferir mediodía)
  const datosPorDia = new Map();
  
  datosReales.forEach(dato => {
    const fecha = dato.fecha;
    
    // Si no hay dato para esta fecha, añadirlo
    if (!datosPorDia.has(fecha)) {
      datosPorDia.set(fecha, dato);
    } else {
      // Si ya hay un dato, quedarse con el más cercano al mediodía (12:00)
      const datoExistente = datosPorDia.get(fecha);
      const horaExistente = (datoExistente.hora && typeof datoExistente.hora === 'string') ? 
        parseInt(datoExistente.hora.split(':')[0]) : 12;
      const horaNueva = (dato.hora && typeof dato.hora === 'string') ? 
        parseInt(dato.hora.split(':')[0]) : 12;
      
      // Preferir datos entre 10:00 y 16:00 (horario diurno representativo)
      const esHoraDiurnaExistente = horaExistente >= 10 && horaExistente <= 16;
      const esHoraDiurnaNueva = horaNueva >= 10 && horaNueva <= 16;
      
      if (esHoraDiurnaNueva && !esHoraDiurnaExistente) {
        // El nuevo dato está en horario diurno y el existente no
        datosPorDia.set(fecha, dato);
      } else if (esHoraDiurnaNueva && esHoraDiurnaExistente) {
        // Ambos en horario diurno, preferir el más cercano a las 12:00
        const distanciaExistente = Math.abs(horaExistente - 12);
        const distanciaNueva = Math.abs(horaNueva - 12);
        if (distanciaNueva < distanciaExistente) {
          datosPorDia.set(fecha, dato);
        }
      }
      // Si ninguno está en horario diurno, mantener el existente
    }
  });
  
  // Solo devolver datos reales disponibles - NO INVENTAR DATOS
  const datosFinales = Array.from(datosPorDia.values());
  console.log(`📊 Datos meteorológicos ÚNICOS por día: ${datosFinales.length} días`);
  
  // Debug: mostrar qué hora se seleccionó para cada día y normalizar iconos
  datosFinales.forEach(dato => {
    const hora = (dato.hora && typeof dato.hora === 'string') ? dato.hora : 'sin hora';
    let icono = dato.icono_emoji || '❓';
    const condicion = dato.condicion_descripcion || 'sin descripción';
    const temperatura = dato.temperatura || 'N/A';
    
    // NORMALIZAR ICONOS NOCTURNOS PARA VISTA DIURNA
    if (icono === '🌙') {
      // Verificar si es "cielo claro" nocturno → convertir a sol diurno
      if (condicion.toLowerCase().includes('claro') || condicion.toLowerCase().includes('despejado')) {
        icono = '☀️';
        dato.icono_emoji = '☀️'; // Actualizar el dato original
      }
    }
    
    // Determinar el tipo de dato
    let tipoData = '❓ DESCONOCIDO';
    if (dato.es_prediccion === true) {
      tipoData = '🔮 PREDICCIÓN';
    } else if (dato.es_prediccion === false && dato.api_timestamp) {
      tipoData = '📚 HISTÓRICO';
    }
    
    console.log(`   ${dato.fecha} ${hora}: ${icono} ${condicion} (${temperatura}°C) ${tipoData}`);
  });
  
  return datosFinales;
}

// =============================================
// FUNCIÓN: GENERAR DATOS METEOROLÓGICOS DE FALLBACK
// =============================================
function generarDatosMeteorologicosFallback(fechaInicio: string, fechaFin: string, tipoRango?: string): any[] {
  console.log('🔄 Generando datos meteorológicos de fallback');
  
  const inicio = new Date(fechaInicio + 'T12:00:00');
  const fin = new Date(fechaFin + 'T12:00:00');
  const daysDiff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 1000)) + 1;
  
  const iconosFallback = ['☀️', '⛅', '🌤️', '🌧️', '☁️', '🌦️', '☀️'];
  const condicionesFallback = ['Soleado', 'Parcialmente nublado', 'Mayormente soleado', 'Lluvia ligera', 'Nublado', 'Chubascos', 'Despejado'];
  
  const resultado = [];
  
  for (let i = 0; i < Math.min(daysDiff, 7); i++) {
    const fecha = new Date(inicio.getTime() + i * 24 * 60 * 60 * 1000);
    const fechaStr = fecha.toISOString().split('T')[0];
    
    resultado.push(generarDatoMeteorologicoFallback(fechaStr, i));
  }
  
  console.log(`🎲 ${resultado.length} datos de fallback generados`);
  return resultado;
}

function generarDatoMeteorologicoFallback(fecha: string, index: number): any {
  const iconosFallback = ['☀️', '⛅', '🌤️', '🌧️', '☁️', '🌦️', '☀️'];
  const condicionesFallback = ['Soleado', 'Parcialmente nublado', 'Mayormente soleado', 'Lluvia ligera', 'Nublado', 'Chubascos', 'Despejado'];
  
  return {
    fecha: fecha,
    hora: null,
    temperatura: Math.round(18 + Math.random() * 8), // 18-26°C
    sensacion_termica: Math.round(17 + Math.random() * 9),
    humedad: Math.round(40 + Math.random() * 40), // 40-80%
    precipitacion: Math.random() > 0.7 ? Math.round(Math.random() * 5) : 0,
    condicion_principal: index % 4 === 3 ? 'Rain' : 'Clear',
    condicion_descripcion: condicionesFallback[index % condicionesFallback.length],
    icono_codigo: `0${1 + (index % 4)}d`,
    icono_emoji: iconosFallback[index % iconosFallback.length],
    indice_uv: Math.round(Math.random() * 8),
    probabilidad_lluvia: Math.round(Math.random() * 100),
    es_actual: false,
    es_prediccion: true,
    created_at: new Date().toISOString()
  };
}

// =============================================
// FUNCIÓN: OBTENER DATOS METEOROLÓGICOS REALES
// =============================================
async function obtenerDatosMeteorologicosReales(supabase: any, restauranteId: string): Promise<void> {
  console.log('🌤️ Llamando al weather-manager para obtener pronósticos reales...');
  
  try {
    // Obtener URL base de Supabase desde variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno de Supabase no encontradas');
    }
    
    // Llamar al weather-manager
    const weatherManagerUrl = `${supabaseUrl}/functions/v1/weather-manager`;
    
    const response = await fetch(weatherManagerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurante_id: restauranteId,
        action: 'forecast',
        force_refresh: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Weather manager error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Weather manager ejecutado: ${result.data?.forecasts_inserted || 0} pronósticos obtenidos`);
    } else {
      throw new Error(`Weather manager falló: ${result.error || 'Error desconocido'}`);
    }
    
  } catch (error) {
    console.error('❌ Error llamando al weather-manager:', error);
    throw error;
  }
}

// FUNCIÓN CORREGIDA: Calcular período anterior con zona horaria española
function calcularPeriodoAnterior(fechaInicio: string, fechaFin: string) {
  console.log(`📅 Calculando período anterior para: ${fechaInicio} - ${fechaFin}`);
  
  // Crear fechas en zona horaria local (no UTC) para evitar problemas de medianoche
  const inicio = new Date(fechaInicio + 'T12:00:00'); // Mediodía para evitar problemas de zona horaria
  const fin = new Date(fechaFin + 'T12:00:00');
  
  // Calcular días de diferencia (incluyendo ambos extremos)
  const diasDiferencia = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  console.log(`📊 Días en el período actual: ${diasDiferencia}`);
  
  // DETECCIÓN INTELIGENTE: ¿Es un rango semanal?
  const esSemanal = detectarRangoSemanal(inicio, fin, diasDiferencia);
  
  let inicioAnterior: Date;
  let finAnterior: Date;
  
  if (esSemanal) {
    console.log(`🗓️ Detectado rango SEMANAL - calculando mismos días de semana anterior`);
    // Para rangos semanales: retroceder exactamente 7 días (mismos días de la semana anterior)
    // Si esta semana es Lun-Vie, semana anterior debe ser Lun-Vie también
    inicioAnterior = new Date(inicio.getTime() - 7 * 24 * 60 * 60 * 1000);
    finAnterior = new Date(fin.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`📊 Semana actual: ${inicio.toDateString()} - ${fin.toDateString()}`);
    console.log(`📊 Semana anterior: ${inicioAnterior.toDateString()} - ${finAnterior.toDateString()}`);
  } else {
    console.log(`📅 Rango ESTÁNDAR - aplicando lógica por días consecutivos`);
    // Para otros rangos: lógica estándar
    inicioAnterior = new Date(inicio.getTime() - diasDiferencia * 24 * 60 * 60 * 1000);
    finAnterior = new Date(inicioAnterior.getTime() + (diasDiferencia - 1) * 24 * 60 * 60 * 1000);
  }
  
  const resultado = {
    fecha_inicio_anterior: inicioAnterior.toISOString().split('T')[0],
    fecha_fin_anterior: finAnterior.toISOString().split('T')[0],
    dias_periodo: diasDiferencia
  };
  
  console.log(`📅 Período anterior calculado: ${resultado.fecha_inicio_anterior} - ${resultado.fecha_fin_anterior}`);
  return resultado;
}

// FUNCIÓN AUXILIAR: Detectar si es un rango semanal
function detectarRangoSemanal(inicio: Date, fin: Date, diasDiferencia: number): boolean {
  const inicioDay = inicio.getDay(); // 0=Domingo, 1=Lunes, etc.
  const finDay = fin.getDay();
  
  // Convertir domingo=0 a domingo=7 para facilitar cálculos
  const inicioLunes = inicioDay === 0 ? 7 : inicioDay;
  const finLunes = finDay === 0 ? 7 : finDay;
  
  // Es semanal si:
  // 1. Empieza en Lunes (1) 
  // 2. Tiene entre 4-7 días
  // 3. O es claramente un patrón semanal
  const empiezaEnLunes = inicioLunes === 1;
  const rangoSemanal = diasDiferencia >= 4 && diasDiferencia <= 7;
  
  console.log(`🔍 Detección semanal: inicio=${inicioLunes} (${inicioLunes===1?'Lunes':'No-Lunes'}), días=${diasDiferencia}, rango=${rangoSemanal}`);
  
  return empiezaEnLunes && rangoSemanal;
}

// NUEVA FUNCIÓN: Detectar rango horario inteligente
function detectarRangoHorario(ventasPorHora: any[], tipoRango?: string): any {
  console.log(`🚨🚨🚨 FUNCIÓN DETECTAR RANGO HORARIO EJECUTÁNDOSE 🚨🚨🚨`);
  console.log(`🕐 Detectando rango horario inteligente para ${ventasPorHora.length} horas con datos (tipo: ${tipoRango})`);
  
  // Si no hay ventas, usar rango por defecto
  if (!ventasPorHora || ventasPorHora.length === 0) {
    // NUEVO: Si es "today", asumir turno nocturno por defecto
    if (tipoRango === 'today') {
      console.log(`📅 Sin datos para "hoy", asumiendo turno nocturno por defecto: 19:00-03:00`);
      return {
        inicio: 19,
        fin: 3,
        es_nocturno: true,
        horas_mostrar: [19, 20, 21, 22, 23, 0, 1, 2, 3],
        descripcion: 'Turno nocturno por defecto (sin datos hoy)'
      };
    }
    
    console.log(`📅 Sin datos de ventas, usando rango por defecto: 12:00-22:00`);
    return {
      inicio: 12,
      fin: 22,
      es_nocturno: false,
      horas_mostrar: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
      descripcion: 'Rango por defecto (sin datos)'
    };
  }
  
  const horasConVentas = ventasPorHora.map(v => v.hora).sort((a, b) => a - b);
  const horaMin = Math.min(...horasConVentas);
  const horaMax = Math.max(...horasConVentas);
  
  console.log(`📊 Horas con ventas: ${horasConVentas.join(', ')} (min: ${horaMin}, max: ${horaMax})`);
  
  // ✅ NUEVO: DETECCIÓN INTELIGENTE DE TURNOS NOCTURNOS
  // Si hay ventas después de las 00:00, extender el rango para mostrar continuidad
  let horasArray = [];
  let rangoExtendido = false;
  
  // Detectar si es un turno nocturno (ventas que cruzan medianoche)
  const esNocturno = horaMax < horaMin || (horaMin >= 19 && horaMax <= 3);
  
  // ✅ NUEVO: LÓGICA MEJORADA PARA TURNOS NOCTURNOS
  // Siempre extender el rango cuando sea un turno nocturno típico, incluso sin ventas después de medianoche
  if (esNocturno || horaMax <= 3 || (horaMin >= 19 && horaMax >= 22)) {
    // TURNO NOCTURNO: Extender el rango para mostrar continuidad visual
    
    // Caso 1: Turno que empieza tarde (19:00+) y termina tarde (22:00+)
    if (horaMin >= 19 && horaMax >= 22) {
      console.log(`🌙 TURNO NOCTURNO TÍPICO DETECTADO: ${horaMin}:00 a ${horaMax}:00 - Extendiendo rango para continuidad visual`);
      
      // Crear rango extendido: desde la hora de inicio hasta 03:00 del día siguiente
      for (let h = horaMin; h <= 23; h++) {
        horasArray.push(h);
      }
      // Siempre incluir las primeras horas del día siguiente para continuidad
      for (let h = 0; h <= 3; h++) {
        horasArray.push(h);
      }
      
      rangoExtendido = true;
      console.log(`🌙 Rango nocturno extendido: ${horasArray.join(', ')} (${horasArray.length} horas)`);
    } else if (horaMin >= 19 && horaMax <= 3) {
      // Caso 2: Turno que empieza tarde y termina temprano (ya existía)
      console.log(`🌙 TURNO NOCTURNO CORTO DETECTADO: ${horaMin}:00 a ${horaMax}:00 - Extendiendo rango para continuidad visual`);
      
      for (let h = horaMin; h <= 23; h++) {
        horasArray.push(h);
      }
      for (let h = 0; h <= 3; h++) {
        horasArray.push(h);
      }
      
      rangoExtendido = true;
      console.log(`🌙 Rango nocturno extendido: ${horasArray.join(', ')} (${horasArray.length} horas)`);
    } else if (horaMax < horaMin) {
      // Caso 3: Ventas que cruzan medianoche (ya existía)
      console.log(`🌙 CRUCE DE MEDIANOCHE DETECTADO: ${horaMin}:00 a ${horaMax}:00 - Extendiendo rango para continuidad visual`);
      
      for (let h = horaMin; h <= 23; h++) {
        horasArray.push(h);
      }
      for (let h = 0; h <= horaMax; h++) {
        horasArray.push(h);
      }
      
      rangoExtendido = true;
      console.log(`🌙 Rango de medianoche extendido: ${horasArray.join(', ')} (${horasArray.length} horas)`);
    }
  }
  
  // Si no se extendió el rango, usar el rango normal
  if (!rangoExtendido) {
    for (let h = horaMin; h <= horaMax; h++) {
      horasArray.push(h);
    }
    console.log(`📅 Rango normal: ${horaMin}:00 a ${horaMax}:00 (${horasArray.length} horas)`);
  }
  
  // Generar descripción inteligente
  let descripcion = '';
  if (rangoExtendido) {
    if (esNocturno) {
      descripcion = `Turno nocturno extendido (${horaMin}:00-${horaMax}:00) - Continuidad visual`;
    } else {
      descripcion = `Rango extendido para continuidad (${horaMin}:00-${horaMax}:00)`;
    }
  } else {
    descripcion = `Rango real de ventas (${horaMin}:00-${horaMax}:00)`;
  }
  
  console.log(`🎯 Rango final: ${horasArray.length} horas - ${descripcion}`);
  console.log(`🚨🚨🚨 FUNCIÓN COMPLETADA - RANGO: ${horasArray[0]}:00-${horasArray[horasArray.length-1]}:00 🚨🚨🚨`);
  
  return {
    inicio: horasArray[0],
    fin: horasArray[horasArray.length-1],
    es_nocturno: esNocturno,
    horas_mostrar: horasArray,
    descripcion: descripcion,
    rango_extendido: rangoExtendido
  };
}

// NUEVA FUNCIÓN: Obtener mapeo de categorías
async function obtenerCategoriasMap(supabase: any, restauranteId: string) {
  const { data: categorias } = await supabase
    .from('productos_catalogo')
    .select('categoria_id, categoria_nombre')
    .eq('restaurante_id', restauranteId)
    .not('categoria_nombre', 'is', null);
    
  const map = new Map();
  categorias?.forEach(cat => {
    if (cat.categoria_nombre && cat.categoria_id) {
      map.set(cat.categoria_id, cat.categoria_nombre);
    }
  });
  return map;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { restaurante_id, fecha_inicio, fecha_fin, tipo_rango } = await req.json()

    if (!restaurante_id || !fecha_inicio || !fecha_fin) {
      throw new Error('Faltan parámetros requeridos: restaurante_id, fecha_inicio, fecha_fin')
    }

    console.log(`Obteniendo datos para restaurante: ${restaurante_id}`)
    console.log(`Período: ${fecha_inicio} hasta ${fecha_fin}`)

    // NUEVO: Todas las consultas serán comparativas
    const siempreComparativo = true;
    const tipoRango = tipo_rango || 'custom';
    console.log(`Modo comparativo activado para rango: ${tipoRango}`);
    
    // NUEVO: Detectar si es un turno nocturno (2 días consecutivos para "today")
    const esTurnoNocturno = tipoRango === 'today' && fecha_inicio !== fecha_fin;
    if (esTurnoNocturno) {
      console.log(`🌙 Detectado turno nocturno: ${fecha_inicio} a ${fecha_fin}`);
    }

    // Calcular período anterior
    const periodoAnterior = calcularPeriodoAnterior(fecha_inicio, fecha_fin);
    console.log(`Período anterior: ${periodoAnterior.fecha_inicio_anterior} hasta ${periodoAnterior.fecha_fin_anterior}`);

    // =================================================================
    // PASO 1: CREAR VISTA LÓGICA CON DATOS PRIORIZADOS (ANTI-DUPLICADOS)
    // AJUSTE: Para negocios que cierran después de medianoche, extender 1 día
    // =================================================================
    
    // CAMBIO: NO extender fechas en RPC, obtener datos exactos y filtrar después
    const rpc_params = {
      p_restaurante_id: restaurante_id,
      p_fecha_inicio: fecha_inicio,
      p_fecha_fin: fecha_fin
    };
    
    console.log("RPC Params (Current):", rpc_params);

    const { data: ventasData, error: ventasError } = await supabase
      .rpc('get_prioritized_sales_data', rpc_params);
    
    console.log(`📊 DATOS RECIBIDOS - Período actual (${fecha_inicio} a ${fecha_fin}):`);
    console.log(`   - Total registros: ${ventasData?.length || 0}`);
    if (ventasData && ventasData.length > 0) {
      console.log(`   - Fechas encontradas:`, [...new Set(ventasData.map(v => v.fecha_venta))].sort());
      console.log(`   - Sistemas origen:`, [...new Set(ventasData.map(v => v.sistema_origen))]);
    }

    if (ventasError) {
      console.error('Error llamando a RPC get_prioritized_sales_data (current):', ventasError);
      throw new Error('Error obteniendo datos de ventas priorizados');
    }
    
    // =================================================================
    // PASO 2: OBTENER DATOS PRIORIZADOS DEL PERIODO ANTERIOR
    // AJUSTE: También extender el período anterior para ventas nocturnas
    // =================================================================
    
    // CAMBIO: NO extender fechas en RPC, obtener datos exactos del período anterior
    const rpc_params_anterior = {
      p_restaurante_id: restaurante_id,
      p_fecha_inicio: periodoAnterior.fecha_inicio_anterior,
      p_fecha_fin: periodoAnterior.fecha_fin_anterior
    };
    
    console.log("RPC Params (Anterior):", rpc_params_anterior);

    const { data: ventasAnteriorData, error: ventasAnteriorError } = await supabase
      .rpc('get_prioritized_sales_data', rpc_params_anterior);
      
    console.log(`📊 DATOS RECIBIDOS - Período anterior (${periodoAnterior.fecha_inicio_anterior} a ${periodoAnterior.fecha_fin_anterior}):`);
    console.log(`   - Total registros: ${ventasAnteriorData?.length || 0}`);
    if (ventasAnteriorData && ventasAnteriorData.length > 0) {
      console.log(`   - Fechas encontradas:`, [...new Set(ventasAnteriorData.map(v => v.fecha_venta))].sort());
      console.log(`   - Sistemas origen:`, [...new Set(ventasAnteriorData.map(v => v.sistema_origen))]);
    }

    if (ventasAnteriorError) {
      console.error('Error llamando a RPC get_prioritized_sales_data (anterior):', ventasAnteriorError);
      // No lanzar error, puede que no haya datos anteriores
    }

    // Procesar métricas básicas
    let ventasList = ventasData || [];
    let ventasListAnterior = ventasAnteriorData || [];

    // NUEVO: Filtrar por horario nocturno si es necesario
    if (esTurnoNocturno) {
      console.log(`🌙 Aplicando filtro de turno nocturno (19:00-03:00)`);
      
      ventasList = ventasList.filter(venta => {
        if (!venta.fecha_hora_completa) return false;
        
        try {
          const fechaHora = new Date(venta.fecha_hora_completa);
          const hora = fechaHora.getHours();
          const fechaVenta = venta.fecha_venta;
          
          // Para el primer día (ayer): solo ventas desde las 19:00
          if (fechaVenta === fecha_inicio) {
            return hora >= 19;
          }
          // Para el segundo día (hoy): solo ventas hasta las 03:00
          else if (fechaVenta === fecha_fin) {
            return hora <= 3;
          }
          
          return false;
        } catch (error) {
          console.warn('Error procesando fecha para filtro nocturno:', venta.fecha_hora_completa);
          return false;
        }
      });
      
      console.log(`🌙 Filtro nocturno aplicado: ${ventasList.length} ventas del turno`);
    }

    // TEMPORALMENTE: NO filtrar, usar datos tal como vienen para diagnosticar
    const ventasOriginales = ventasList.length;
    const ventasAnterioresOriginales = ventasListAnterior.length;
    
    console.log(`🚨 MODO DIAGNÓSTICO - SIN FILTROS:`);
    console.log(`   - Datos actuales: ${ventasList.length} registros`);
    console.log(`   - Datos anteriores: ${ventasListAnterior.length} registros`);
    
    // DIAGNÓSTICO DETALLADO: Mostrar todos los tickets del 22 agosto
    if (fecha_inicio === '2025-08-22' && fecha_fin === '2025-08-22') {
      console.log(`🔍 DETALLE DE TICKETS DEL 22 AGOSTO:`);
      ventasList.forEach((venta, index) => {
        console.log(`   ${index + 1}. ID: ${venta.id_externo} | Ref: ${venta.referencia_externa} | Total: €${venta.total_bruto} | Hora: ${venta.fecha_hora_completa}`);
      });
    }

    console.log(`🕐 ANÁLISIS DE FILTRADO:`);
    console.log(`   - Originales: ${ventasOriginales} actuales, ${ventasAnterioresOriginales} anteriores`);
    console.log(`   - Filtradas: ${ventasList.length} actuales, ${ventasListAnterior.length} anteriores`);
    console.log(`🔍 DESGLOSE DE FILTRADO ACTUAL:`);
    console.log(`   - Período solicitado: ${fecha_inicio} a ${fecha_fin}`);
    console.log(`🔍 DESGLOSE DE FILTRADO ANTERIOR:`);
    console.log(`   - Período anterior: ${periodoAnterior.fecha_inicio_anterior} a ${periodoAnterior.fecha_fin_anterior}`);

    // NUEVO: Todas las consultas ahora usan `ventasList` y `ventasListAnterior` que ya están priorizadas y filtradas.
    
    // 🔍 DEBUG CRÍTICO: Verificar datos antes de sumar
    console.log(`🔍 DEBUG SUMA - Datos a procesar: ${ventasList.length} ventas`);
    console.log(`🔍 PERÍODO SOLICITADO: ${fecha_inicio} a ${fecha_fin}`);
    
    if (ventasList.length === 0) {
        console.log(`❌ ERROR: No hay ventas para el período ${fecha_inicio} a ${fecha_fin}`);
        console.log(`🔍 Verificar consulta SQL y datos en base de datos`);
    }
    
    ventasList.forEach((venta, index) => {
        console.log(`   ${index + 1}. Fecha: ${venta.fecha_venta}, Total Bruto: ${venta.total_bruto}, Total Neto: ${venta.total_neto}, Sistema: ${venta.sistema_origen}, ID: ${venta.id_externo || 'N/A'}`);
    });
    
    // 🔍 VERIFICAR SUMA MANUAL
    let sumaManualBruto = 0;
    let sumaManualNeto = 0;
    ventasList.forEach((venta, index) => {
        const bruto = parseFloat(venta.total_bruto) || 0;
        const neto = parseFloat(venta.total_neto) || 0;
        sumaManualBruto += bruto;
        sumaManualNeto += neto;
        console.log(`   ${index + 1}. Suma manual: Bruto += €${bruto} (Total: €${sumaManualBruto}), Neto += €${neto} (Total: €${sumaManualNeto})`);
    });
    
    console.log(`🔍 SUMA MANUAL VERIFICADA:`);
    console.log(`   - Total Bruto Manual: €${sumaManualBruto.toFixed(2)}`);
    console.log(`   - Total Neto Manual: €${sumaManualNeto.toFixed(2)}`);
    
    const totalVentasBruto = ventasList.reduce((sum, v) => {
        const valor = parseFloat(v.total_bruto) || 0;
        console.log(`   Sumando: €${valor} (${v.fecha_venta}) → Acumulado: €${sum + valor}`);
        return sum + valor;
    }, 0);
    
    const totalVentasNeto = ventasList.reduce((sum, v) => {
        const valor = parseFloat(v.total_neto) || 0;
        console.log(`   Sumando Neto: €${valor} (${v.fecha_venta}) → Acumulado: €${sum + valor}`);
        return sum + valor;
    }, 0);
    
    const totalImpuestos = ventasList.reduce((sum, v) => sum + (parseFloat(v.total_impuestos) || 0), 0)
    const totalDescuentos = ventasList.reduce((sum, v) => sum + (parseFloat(v.descuentos) || 0), 0)
    const totalPropinas = ventasList.reduce((sum, v) => sum + (parseFloat(v.propinas) || 0), 0)
    const totalComensales = ventasList.reduce((sum, v) => sum + (v.num_comensales || 0), 0)
    
    console.log(`🔍 DEBUG SUMA - RESULTADOS FINALES:`);
    console.log(`   - Total Ventas Bruto: €${totalVentasBruto.toFixed(2)}`);
    console.log(`   - Total Ventas Neto: €${totalVentasNeto.toFixed(2)}`);
    console.log(`   - Total Impuestos: €${totalImpuestos.toFixed(2)}`);
    console.log(`   - Total Descuentos: €${totalDescuentos.toFixed(2)}`);
    console.log(`   - Total Propinas: €${totalPropinas.toFixed(2)}`);
    
    // ✅ SIMPLIFICADO: Usar directamente ticket_medio de la base de datos
    let totalTickets = 0;
    
    ventasList.forEach(v => {
        const totalBruto = parseFloat(v.total_bruto) || 0;
        const ticketMedio = parseFloat(v.ticket_medio) || 0;
        
        if (ticketMedio > 0) {
            // 🎫 CALCULAR TICKETS: total_bruto ÷ ticket_medio
            const numTickets = Math.round(totalBruto / ticketMedio);
            totalTickets += numTickets;
            console.log(`   Ticket: €${totalBruto} ÷ €${ticketMedio} = ${numTickets} tickets`);
        } else {
            // 🎫 FALLBACK: si no hay ticket_medio, contar como 1 ticket
            totalTickets++;
            console.log(`   Fallback: 1 ticket (sin ticket_medio)`);
        }
    });
    
    console.log(`🎫 TOTAL TICKETS CALCULADOS: ${totalTickets}`);
    
    // ✅ SIMPLIFICADO: Usar directamente ticket_medio guardado
    let ticketPromedio = 0;
    const ventasConTicketMedio = ventasList.filter(v => v.ticket_medio && parseFloat(v.ticket_medio) > 0);
    
    if (ventasConTicketMedio.length > 0) {
        // Usar el promedio de los ticket_medio guardados
        const sumaTicketsMedios = ventasConTicketMedio.reduce((sum, v) => sum + parseFloat(v.ticket_medio), 0);
        ticketPromedio = sumaTicketsMedios / ventasConTicketMedio.length;
        console.log(`📊 Ticket promedio desde BD: €${ticketPromedio.toFixed(2)} (${ventasConTicketMedio.length}/${totalTickets} ventas)`);
    } else {
        // Fallback: calcular dinámicamente
        ticketPromedio = totalTickets > 0 ? totalVentasBruto / totalTickets : 0;
        console.log(`🔢 Ticket promedio calculado: €${ticketPromedio.toFixed(2)}`);
    }

    // ✅ 8. OBTENER DATOS METEOROLÓGICOS
    console.log('🌤️ Obteniendo datos meteorológicos...');
    const datosMeteorologicos = await obtenerDatosMeteorologicos(
      supabase, 
      restaurante_id, 
      fecha_inicio, 
      fecha_fin,
      tipoRango
    );

    // NUEVO: Calcular métricas del período anterior
    let metricas_anteriores: any = null;

    if (ventasListAnterior.length > 0) {
      // Calcular métricas del período anterior
      // 🔍 DEBUG CRÍTICO: Verificar datos del período anterior
      console.log(`🔍 DEBUG SUMA ANTERIOR - Datos a procesar: ${ventasListAnterior.length} ventas`);
      ventasListAnterior.forEach((venta, index) => {
          console.log(`   ${index + 1}. Fecha: ${venta.fecha_venta}, Total Bruto: ${venta.total_bruto}, Total Neto: ${venta.total_neto}, Sistema: ${venta.sistema_origen}`);
      });
      
      const totalVentasNetoAnterior = ventasListAnterior.reduce((sum, v) => {
          const valor = parseFloat(v.total_neto) || 0;
          console.log(`   Sumando Anterior Neto: €${valor} (${v.fecha_venta}) → Acumulado: €${sum + valor}`);
          return sum + valor;
      }, 0);
      
      const totalVentasBrutoAnterior = ventasListAnterior.reduce((sum, v) => {
          const valor = parseFloat(v.total_bruto) || 0;
          console.log(`   Sumando Anterior Bruto: €${valor} (${v.fecha_venta}) → Acumulado: €${sum + valor}`);
          return sum + valor;
      }, 0);
      const totalImpuestosAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.total_impuestos) || 0), 0);
      const totalDescuentosAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.descuentos) || 0), 0);
      const totalPropinasAnterior = ventasListAnterior.reduce((sum, v) => sum + (parseFloat(v.propinas) || 0), 0);
      const totalComensalesAnterior = ventasListAnterior.reduce((sum, v) => sum + (v.num_comensales || 0), 0);
      
      // ✅ CÁLCULO INTELIGENTE DE TICKETS ANTERIOR (CORREGIDO):
      let totalTicketsAnterior = 0;
      
      ventasListAnterior.forEach(v => {
          const totalBruto = parseFloat(v.total_bruto) || 0;
          const ticketMedio = parseFloat(v.ticket_medio) || 0;
          
          if (ticketMedio > 0) {
              // 🎫 CALCULAR TICKETS: total_bruto ÷ ticket_medio
              const numTickets = Math.round(totalBruto / ticketMedio);
              totalTicketsAnterior += numTickets;
              console.log(`   Ticket Anterior: €${totalBruto} ÷ €${ticketMedio} = ${numTickets} tickets`);
          } else {
              // 🎫 FALLBACK: si no hay ticket_medio, contar como 1 ticket
              totalTicketsAnterior++;
              console.log(`   Fallback Anterior: 1 ticket (sin ticket_medio)`);
          }
      });
      
      console.log(`🎫 TOTAL TICKETS ANTERIORES: ${totalTicketsAnterior}`);
      
      // ✅ SIMPLIFICADO: Usar directamente ticket_medio guardado para período anterior
      let ticketPromedioAnterior = 0;
      const ventasAnterioresConTicketMedio = ventasListAnterior.filter(v => v.ticket_medio && parseFloat(v.ticket_medio) > 0);
      
      if (ventasAnterioresConTicketMedio.length > 0) {
          // Usar el promedio de los ticket_medio guardados
          const sumaTicketsMediosAnterior = ventasAnterioresConTicketMedio.reduce((sum, v) => sum + parseFloat(v.ticket_medio), 0);
          ticketPromedioAnterior = sumaTicketsMediosAnterior / ventasAnterioresConTicketMedio.length;
          console.log(`📊 Ticket promedio anterior desde BD: €${ticketPromedioAnterior.toFixed(2)} (${ventasAnterioresConTicketMedio.length}/${totalTicketsAnterior} ventas)`);
      } else {
          // Fallback: calcular dinámicamente
          ticketPromedioAnterior = totalTicketsAnterior > 0 ? totalVentasBrutoAnterior / totalTicketsAnterior : 0;
          console.log(`🔢 Ticket promedio anterior calculado: €${ticketPromedioAnterior.toFixed(2)}`);
      }

      metricas_anteriores = {
        total_ventas: totalVentasNetoAnterior,
        total_ventas_bruto: totalVentasBrutoAnterior,
        total_impuestos: totalImpuestosAnterior,
        total_descuentos: totalDescuentosAnterior,
        total_propinas: totalPropinasAnterior,
        total_tickets: totalTicketsAnterior,
        ticket_promedio: ticketPromedioAnterior,
        total_comensales: totalComensalesAnterior
      };

      console.log('Métricas del período anterior calculadas:', metricas_anteriores);
    }

    // Calcular comparativas
    let comparativas = null;

    if (siempreComparativo && metricas_anteriores) {
      const calcularCambio = (actual, anterior) => {
        if (anterior === 0) return actual > 0 ? 100 : 0;
        return ((actual - anterior) / anterior) * 100;
      };

      comparativas = {
        total_ventas: {
          actual: totalVentasNeto,
          anterior: metricas_anteriores.total_ventas,
          cambio_pct: calcularCambio(totalVentasNeto, metricas_anteriores.total_ventas)
        },
        total_ventas_bruto: {
          actual: totalVentasBruto,
          anterior: metricas_anteriores.total_ventas_bruto,
          cambio_pct: calcularCambio(totalVentasBruto, metricas_anteriores.total_ventas_bruto)
        },
        total_tickets: {
          actual: totalTickets,
          anterior: metricas_anteriores.total_tickets,
          cambio_pct: calcularCambio(totalTickets, metricas_anteriores.total_tickets)
        },
        ticket_promedio: {
          actual: ticketPromedio,
          anterior: metricas_anteriores.ticket_promedio,
          cambio_pct: calcularCambio(ticketPromedio, metricas_anteriores.ticket_promedio)
        },
        total_comensales: {
          actual: totalComensales,
          anterior: metricas_anteriores.total_comensales,
          cambio_pct: calcularCambio(totalComensales, metricas_anteriores.total_comensales)
        },
        total_impuestos: {
          actual: totalImpuestos,
          anterior: metricas_anteriores.total_impuestos,
          cambio_pct: calcularCambio(totalImpuestos, metricas_anteriores.total_impuestos)
        },
        total_descuentos: {
          actual: totalDescuentos,
          anterior: metricas_anteriores.total_descuentos,
          cambio_pct: calcularCambio(totalDescuentos, metricas_anteriores.total_descuentos)
        },
        total_propinas: {
          actual: totalPropinas,
          anterior: metricas_anteriores.total_propinas,
          cambio_pct: calcularCambio(totalPropinas, metricas_anteriores.total_propinas)
        }
      };

      console.log('Comparativas calculadas:', comparativas);
    }

    // 2. PROCESAR MÉTODOS DE PAGO (Usa ventasList ya filtrado)
    const metodosPago = {
      efectivo: 0,
      tarjeta: 0,
      otros: 0
    }

    ventasList.forEach(venta => {
      const metodo = (venta.metodo_pago || '').toLowerCase()
      const total = parseFloat(venta.total_bruto) || 0  // 🔧 CAMBIO: usar total_bruto
      
      if (metodo.includes(',')) {
        // Método mixto: "Efectivo:66.90, Tarjeta:13.50"
        const partes = metodo.split(',')
        partes.forEach(parte => {
          const [tipo, monto] = parte.split(':')
          const montoNum = parseFloat(monto) || 0
          if (tipo.trim().includes('efectivo')) {
            metodosPago.efectivo += montoNum
          } else if (tipo.trim().includes('tarjeta')) {
            metodosPago.tarjeta += montoNum
          } else {
            metodosPago.otros += montoNum
          }
        })
      } else {
        // Método único
        if (metodo.includes('efectivo') || metodo.includes('cash')) {
          metodosPago.efectivo += total
        } else if (metodo.includes('tarjeta') || metodo.includes('card')) {
          metodosPago.tarjeta += total
        } else {
          metodosPago.otros += total
        }
      }
    })

    // 3. VENTAS POR DÍA CON TICKETS (Usa ventasList ya filtrado)
    const ventasPorDiaMap = new Map()
    ventasList.forEach(venta => {
      const fecha = venta.fecha_venta
      const total = parseFloat(venta.total_bruto) || 0  // 🔧 CRÍTICO: Cambiar a total_bruto
      const sistemaOrigen = venta.sistema_origen || ''
      const ticketMedio = parseFloat(venta.ticket_medio) || 0
      
      if (!ventasPorDiaMap.has(fecha)) {
        ventasPorDiaMap.set(fecha, { 
          fecha, 
          ventas: 0, 
          total_tickets: 0,
          tickets_tpv: 0,
          tickets_historicos: 0
        })
      }
      
      const diaData = ventasPorDiaMap.get(fecha)
      diaData.ventas += total
      
      // Calcular tickets según el sistema origen
      if (sistemaOrigen === 'numier') {
        // TPV: 1 registro = 1 ticket
        diaData.tickets_tpv += 1
        diaData.total_tickets += 1
      } else if (sistemaOrigen === 'import_manual' && ticketMedio > 0) {
        // Histórico: calcular tickets = total_ventas ÷ ticket_medio
        const numTicketsCalculados = Math.round(total / ticketMedio)
        diaData.tickets_historicos += numTicketsCalculados
        diaData.total_tickets += numTicketsCalculados
      } else {
        // Fallback: otros sistemas = 1 registro = 1 ticket
        diaData.tickets_tpv += 1
        diaData.total_tickets += 1
      }
    })

    const ventasPorDia = Array.from(ventasPorDiaMap.values())
      .map(dia => ({
        fecha: dia.fecha,
        ventas: dia.ventas,
        tickets: dia.total_tickets,
        tickets_tpv: dia.tickets_tpv,
        tickets_historicos: dia.tickets_historicos,
        ticket_medio: dia.total_tickets > 0 ? dia.ventas / dia.total_tickets : 0
      })).sort((a, b) => a.fecha.localeCompare(b.fecha))

    // 4. VENTAS POR HORA (Usa ventasList ya filtrado)
    const ventasPorHoraMap = new Map()
    
    ventasList.forEach(venta => {
      if (venta.fecha_hora_completa) {
        try {
          const fechaHora = new Date(venta.fecha_hora_completa)
          const hora = fechaHora.getHours()
          const total = parseFloat(venta.total_bruto) || 0  // 🔧 CAMBIO: usar total_bruto
          
          if (!ventasPorHoraMap.has(hora)) {
            ventasPorHoraMap.set(hora, {
              hora,
              hora_formato: `${hora.toString().padStart(2, '0')}:00`,
              ventas: 0,
              cantidad_tickets: 0
            })
          }
          
          const horaData = ventasPorHoraMap.get(hora)
          horaData.ventas += total
          horaData.cantidad_tickets += 1
        } catch (error) {
          console.warn('Error procesando fecha_hora_completa:', venta.fecha_hora_completa)
        }
      }
    })

    const ventasPorHora = Array.from(ventasPorHoraMap.values())
      .sort((a, b) => a.hora - b.hora)
    
    console.log(`🚨🚨🚨 PROCESAMIENTO DE VENTAS POR HORA 🚨🚨🚨`);
    console.log(`📊 ventasPorHoraMap.size: ${ventasPorHoraMap.size}`);
    console.log(`📊 ventasPorHora procesadas:`, ventasPorHora);
    console.log(`🔍 Primeras 3 ventas por hora:`, ventasPorHora.slice(0, 3));
    console.log(`🔍 Últimas 3 ventas por hora:`, ventasPorHora.slice(-3));

    // 4.1. DETECTAR RANGO HORARIO INTELIGENTE
    console.log(`🚨🚨🚨 ANTES DE LLAMAR detectarRangoHorario 🚨🚨🚨`);
    console.log(`📊 ventasPorHora recibidas:`, ventasPorHora);
    console.log(`🔍 tipoRango: ${tipoRango}`);
    console.log(`🔍 ventasPorHora.length: ${ventasPorHora.length}`);
    
    const rangoHorarioInteligente = detectarRangoHorario(ventasPorHora, tipoRango);
    
    console.log(`🚨🚨🚨 DESPUÉS DE detectarRangoHorario 🚨🚨🚨`);
    console.log(`🕐 Rango horario detectado: ${rangoHorarioInteligente.descripcion}`);
    console.log(`📊 Horas a mostrar: ${rangoHorarioInteligente.horas_mostrar.join(', ')}`);
    console.log(`🔍 rangoHorarioInteligente completo:`, rangoHorarioInteligente);

    // 5. OBTENER PRODUCTOS Y LÍNEAS DE VENTA (Filtrado por venta_id de ventas priorizadas)
    const ventaIds = ventasList.map(v => v.id);

    const { data: lineasData, error: lineasError } = await supabase
      .from('ventas_lineas')
      .select(`
        producto_nombre,
        categoria_id,
        categoria_nombre,
        cantidad,
        precio_total,
        venta_id
      `)
      .in('venta_id', ventaIds) // <-- MODIFICADO: Usar solo IDs de ventas priorizadas

    if (lineasError) {
      console.error('Error obteniendo líneas de venta:', lineasError)
      // Continuar sin productos si hay error
    }

    // 6. PROCESAR PRODUCTOS TOP
    const productosMap = new Map()
    const lineasList = lineasData || []
    
    // ✅ NUEVO: Obtener mapeo de categorías
    const categoriasCatalogoMap = await obtenerCategoriasMap(supabase, restaurante_id);
    
    // 🔧 IMPORTANTE: veces_vendido ahora suma las unidades reales vendidas, no solo cuenta tickets

    lineasList.forEach(linea => {
      const nombre = linea.producto_nombre || 'Sin nombre'
      let categoria = 'Sin categoría'
      
      // Prioridad: 1) categoria_nombre, 2) mapeo desde productos, 3) default
      if (linea.categoria_nombre && linea.categoria_nombre.trim() !== '') {
        categoria = linea.categoria_nombre
      } else if (linea.categoria_id && categoriasCatalogoMap.has(linea.categoria_id)) {
        categoria = categoriasCatalogoMap.get(linea.categoria_id) // ✅ "BEBIDAS" en lugar de "Categoría 55564"
      }
      
      const cantidad = parseFloat(linea.cantidad) || 0
      const importe = parseFloat(linea.precio_total) || 0
      
      if (productosMap.has(nombre)) {
        const existente = productosMap.get(nombre)
        existente.cantidad += cantidad
        existente.importe += importe
        existente.veces_vendido += cantidad  // ✅ CORREGIDO: Sumar unidades reales, no solo contar tickets
      } else {
        productosMap.set(nombre, {
          nombre,
          categoria,
          cantidad,
          importe,
          veces_vendido: cantidad  // ✅ CORREGIDO: Inicializar con unidades reales
        })
      }
    })

    const productosTop = Array.from(productosMap.values())
      .sort((a, b) => b.importe - a.importe)

    // ✅ NUEVO: PROCESAR PRODUCTOS TOP DEL PERÍODO ANTERIOR
    let productosTopAnterior: any[] = [];
    
    if (ventasListAnterior.length > 0) {
      console.log('📊 Procesando productos del período anterior...');
      
      // Obtener IDs de ventas del período anterior
      const ventaIdsAnterior = ventasListAnterior.map(v => v.id);
      
      // Obtener líneas de venta del período anterior
      const { data: lineasDataAnterior, error: lineasErrorAnterior } = await supabase
        .from('ventas_lineas')
        .select(`
          producto_nombre,
          categoria_id,
          categoria_nombre,
          cantidad,
          precio_total,
          venta_id
        `)
        .in('venta_id', ventaIdsAnterior);
      
      if (lineasErrorAnterior) {
        console.warn('⚠️ Error obteniendo líneas de venta del período anterior:', lineasErrorAnterior);
      } else {
        // Procesar productos del período anterior
        const productosMapAnterior = new Map();
        const lineasListAnterior = lineasDataAnterior || [];
        
        console.log(`📦 Procesando ${lineasListAnterior.length} líneas del período anterior`);
        
        lineasListAnterior.forEach(linea => {
          const nombre = linea.producto_nombre || 'Sin nombre';
          let categoria = 'Sin categoría';
          
          // Prioridad: 1) categoria_nombre, 2) mapeo desde productos, 3) default
          if (linea.categoria_nombre && linea.categoria_nombre.trim() !== '') {
            categoria = linea.categoria_nombre;
          } else if (linea.categoria_id && categoriasCatalogoMap.has(linea.categoria_id)) {
            categoria = categoriasCatalogoMap.get(linea.categoria_id);
          }
          
          const cantidad = parseFloat(linea.cantidad) || 0;
          const importe = parseFloat(linea.precio_total) || 0;
          
          if (productosMapAnterior.has(nombre)) {
            const existente = productosMapAnterior.get(nombre);
            existente.cantidad += cantidad;
            existente.importe += importe;
            existente.veces_vendido += cantidad;  // ✅ Sumar unidades reales
          } else {
            productosMapAnterior.set(nombre, {
              nombre,
              categoria,
              cantidad,
              importe,
              veces_vendido: cantidad  // ✅ Inicializar con unidades reales
            });
          }
        });
        
        productosTopAnterior = Array.from(productosMapAnterior.values())
          .sort((a, b) => b.importe - a.importe);
        
        console.log(`✅ Productos del período anterior procesados: ${productosTopAnterior.length} productos`);
        console.log('📊 Muestra de productos anteriores:', productosTopAnterior.slice(0, 3).map(p => ({
          nombre: p.nombre,
          importe: p.importe,
          veces_vendido: p.veces_vendido
        })));
      }
    }

    // 7. PROCESAR CATEGORÍAS
    const categoriasMap = new Map()
    
    productosTop.forEach(producto => {
      const categoria = producto.categoria
      
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, {
          categoria,
          importe: 0,
          productos_count: 0
        })
      }
      
      if (producto.importe > 0) { // Solo contar productos con ventas
        const catData = categoriasMap.get(categoria)
        catData.importe += producto.importe
        catData.productos_count += 1
      }
    })

    const categoriasFinal = Array.from(categoriasMap.values())
      .filter(cat => cat.importe > 0) // Solo categorías con ventas
      .map(cat => ({
        ...cat,
        porcentaje: totalVentasNeto > 0 ? (cat.importe / totalVentasNeto) * 100 : 0
      }))
      .sort((a, b) => b.importe - a.importe)

    // 8. CALCULAR CRECIMIENTO VS PERÍODO ANTERIOR
    let crecimientoVsAnterior = 0
    if (siempreComparativo) {
      try {
        // ✅ USAR LOS DATOS YA CALCULADOS EN LUGAR DE HACER UNA NUEVA CONSULTA
        if (metricas_anteriores) {
          const totalAnterior = metricas_anteriores.total_ventas || 0;
          if (totalAnterior > 0) {
            crecimientoVsAnterior = ((totalVentasNeto - totalAnterior) / totalAnterior) * 100;
            console.log(`📈 Crecimiento calculado: ${totalVentasNeto} vs ${totalAnterior} = ${crecimientoVsAnterior.toFixed(2)}%`);
          }
        }
      } catch (error) {
        console.warn('Error calculando crecimiento vs período anterior:', error)
      }
    }

    // 9. CONSTRUIR RESPUESTA
    const dashboardData = {
      // Mantener estructura existente
      resumen: {
        total_ventas: totalVentasNeto,
        total_ventas_bruto: totalVentasBruto,
        total_impuestos: totalImpuestos,
        total_descuentos: totalDescuentos,
        total_propinas: totalPropinas,
        total_tickets: totalTickets,
        ticket_promedio: ticketPromedio,
        total_comensales: totalComensales,
        crecimiento_vs_anterior: crecimientoVsAnterior
      },
      metodos_pago: metodosPago,
      ventas_por_dia: ventasPorDia,
      ventas_por_hora: ventasPorHora,
      productos_top: productosTop,
      productos_top_anterior: productosTopAnterior, // ✅ NUEVO: Productos del período anterior
      categorias_ventas: categoriasFinal,
      ventasList: ventasList, // ✅ DATOS INDIVIDUALES CON TICKET_MEDIO
      ultimo_sync: new Date().toISOString(),
      stats: {
        ventas_procesadas: ventasList.length,
        lineas_procesadas: lineasList.length,
        productos_unicos: productosTop.length,
        categorias_encontradas: categoriasFinal.length,
        dias_meteorologicos: datosMeteorologicos.length // ✅ NUEVO
      },
      
      // CAMPOS COMPARATIVOS ACTUALIZADOS:
      es_comparativo: siempreComparativo,
      tipo_rango: tipoRango,
      periodo_anterior: {
        fecha_inicio: periodoAnterior.fecha_inicio_anterior,
        fecha_fin: periodoAnterior.fecha_fin_anterior,
        dias_periodo: periodoAnterior.dias_periodo
      },
      metricas_anteriores: metricas_anteriores,
      comparativas: comparativas,
      
      // NUEVO: Rango horario inteligente
      rango_horario_inteligente: rangoHorarioInteligente,
      
      // ✅ DATOS METEOROLÓGICOS
      weather_forecast: datosMeteorologicos,
      weather_info: {
        total_dias: datosMeteorologicos.length,
        tiene_datos_reales: datosMeteorologicos.some(d => !d.es_prediccion),
        ultima_actualizacion: datosMeteorologicos.length > 0 ? 
          datosMeteorologicos[0].created_at : null
      }
    }

    console.log('✅ Dashboard con datos meteorológicos generado')
    console.log(`Total ventas: €${totalVentasNeto.toFixed(2)}`)
    console.log(`Total tickets: ${totalTickets}`)
    console.log(`Productos únicos: ${productosTop.length}`)
    console.log(`Líneas procesadas: ${lineasList.length}`)
    console.log(`🌤️ ${datosMeteorologicos.length} días con datos meteorológicos incluidos`)

    // ✅ PASO 3: LOGS DE DEBUG ESPECÍFICOS
    console.log('=== RESUMEN DATOS METEOROLÓGICOS REALES ===');
    if (datosMeteorologicos.length > 0) {
      console.log(`🌍 ${datosMeteorologicos.length} días con datos meteorológicos REALES de OpenWeather API`);
      console.log('📅 Pronósticos reales por día:');
      datosMeteorologicos.forEach((weather, i) => {
        console.log(`   ${weather.fecha}: ${weather.icono_emoji} ${weather.condicion_descripcion} (${weather.temperatura}°C) 🌍 REAL`);
        // Debug detallado del primer registro
        if (i === 0) {
          console.log(`🔍 Validación: es_prediccion=${weather.es_prediccion}, api_timestamp=${weather.api_timestamp}, created_at=${weather.created_at}`);
        }
      });
    } else {
      console.log('🚫 No hay datos meteorológicos reales disponibles - iconos desactivados');
    }
    console.log('=== FIN RESUMEN METEOROLÓGICOS ===')

    console.log(`🚨🚨🚨 ENVIANDO RESPUESTA FINAL 🚨🚨🚨`);
    console.log(`🔍 rango_horario_inteligente incluido:`, dashboardData.rango_horario_inteligente);
    console.log(`🔍 ventas_por_hora incluido:`, dashboardData.ventas_por_hora);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: dashboardData,
        message: 'Dashboard cargado correctamente'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error en get-dashboard-data:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Error obteniendo datos del dashboard'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})