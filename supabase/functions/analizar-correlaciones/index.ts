// supabase/functions/analizar-correlaciones/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrelationRequest {
  restaurante_id: string;
  dias_analisis?: number; // Por defecto 700 (para cubrir desde nov 2023)
}

interface DatosDiarios {
  fecha: string;
  ventas_dia: number;
  tickets_dia: number;
  temperatura_media: number;
  precipitacion: number;
  viento_velocidad: number;
  condicion_principal: string;
  dia_semana: number;
  mes: number;
  es_festivo: boolean;
}

interface ResultadoCorrelacion {
  correlacion: number;
  significancia: 'alta' | 'media' | 'baja' | 'insignificante';
  descripcion: string;
}

interface AnalisisEstacional {
  por_dia_semana: {
    dia: number;
    nombre: string;
    ventas_promedio: number;
    tickets_promedio: number;
    dias_activos: number;
  }[];
  por_mes: {
    mes: number;
    nombre: string;
    ventas_promedio: number;
    tickets_promedio: number;
    dias_activos: number;
  }[];
  temperatura_optima: {
    rango: [number, number];
    ventas_promedio_en_rango: number;
    descripcion: string;
  };
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { restaurante_id, dias_analisis = 700 }: CorrelationRequest = await req.json();

    if (!restaurante_id) {
      throw new Error('restaurante_id es requerido');
    }

    console.log(`Analizando correlaciones para restaurante: ${restaurante_id}`);
    console.log(`Días de análisis: ${dias_analisis}`);

    // 1. OBTENER DATOS COMBINADOS VENTAS + CLIMA
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias_analisis);
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

    const { data: datosVentas, error: errorVentas } = await supabase
      .from('ventas_datos')
      .select('fecha_venta, total_bruto')
      .eq('restaurante_id', restaurante_id)
      .gte('fecha_venta', fechaInicioStr)
      .order('fecha_venta', { ascending: true });

    if (errorVentas) {
      throw new Error(`Error obteniendo ventas: ${errorVentas.message}`);
    }

    const { data: datosClima, error: errorClima } = await supabase
      .from('correlacion_clima_ventas')
      .select('fecha, temperatura_media, precipitacion, viento_velocidad, condicion_principal')
      .eq('restaurante_id', restaurante_id)
      .gte('fecha', fechaInicioStr)
      .order('fecha', { ascending: true });

    if (errorClima) {
      throw new Error(`Error obteniendo clima: ${errorClima.message}`);
    }

    console.log(`Datos ventas: ${datosVentas?.length || 0} registros`);
    console.log(`Datos clima: ${datosClima?.length || 0} registros`);

    // 2. COMBINAR Y PROCESAR DATOS
    const datosCombinados = combinarDatos(datosVentas || [], datosClima || []);
    
    if (datosCombinados.length < 30) {
      throw new Error(`Insuficientes datos para análisis (mínimo 30 días, encontrados ${datosCombinados.length})`);
    }

    console.log(`Datos combinados: ${datosCombinados.length} días`);

    // 3. CALCULAR CORRELACIONES
    const correlaciones = {
      temperatura_ventas: calcularCorrelacionPearson(
        datosCombinados.map(d => d.temperatura_media),
        datosCombinados.map(d => d.ventas_dia)
      ),
      precipitacion_ventas: calcularCorrelacionPearson(
        datosCombinados.map(d => d.precipitacion),
        datosCombinados.map(d => d.ventas_dia)
      ),
      viento_ventas: calcularCorrelacionPearson(
        datosCombinados.map(d => d.viento_velocidad),
        datosCombinados.map(d => d.ventas_dia)
      )
    };

    // 4. ANÁLISIS ESTACIONAL
    const analisisEstacional = analizarPatronesEstacionales(datosCombinados);

    // 5. TEMPERATURA ÓPTIMA
    const temperaturaOptima = encontrarTemperaturaOptima(datosCombinados);

    // 6. IMPACTO DE FESTIVOS
    const impactoFestivos = analizarImpactoFestivos(datosCombinados);

    // 7. GUARDAR CORRELACIONES EN BD
    await guardarCorrelaciones(supabase, restaurante_id, correlaciones, analisisEstacional);

    const respuesta = {
      success: true,
      restaurante_id,
      datos_analizados: {
        total_dias: datosCombinados.length,
        periodo: {
          inicio: datosCombinados[0]?.fecha,
          fin: datosCombinados[datosCombinados.length - 1]?.fecha
        }
      },
      correlaciones: {
        temperatura_ventas: interpretarCorrelacion(correlaciones.temperatura_ventas, 'temperatura'),
        precipitacion_ventas: interpretarCorrelacion(correlaciones.precipitacion_ventas, 'precipitación'),
        viento_ventas: interpretarCorrelacion(correlaciones.viento_ventas, 'viento')
      },
      analisis_estacional: analisisEstacional,
      temperatura_optima: temperaturaOptima,
      impacto_festivos: impactoFestivos,
      resumen_ejecutivo: generarResumenEjecutivo(correlaciones, analisisEstacional, temperaturaOptima),
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(respuesta), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en análisis de correlaciones:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// FUNCIÓN: Combinar datos de ventas y clima por fecha
function combinarDatos(ventas: any[], clima: any[]): DatosDiarios[] {
  const ventasPorFecha = new Map();
  const climaPorFecha = new Map();

  // Indexar ventas por fecha
  ventas.forEach(venta => {
    const fecha = venta.fecha_venta;
    if (!ventasPorFecha.has(fecha)) {
      ventasPorFecha.set(fecha, { ventas: 0, tickets: 0 });
    }
    const existing = ventasPorFecha.get(fecha);
    existing.ventas += parseFloat(venta.total_bruto) || 0;
    existing.tickets += 1;
  });

  // Indexar clima por fecha
  clima.forEach(c => {
    climaPorFecha.set(c.fecha, c);
  });

  const resultado: DatosDiarios[] = [];
  
  // Combinar por fechas comunes
  ventasPorFecha.forEach((ventaData, fecha) => {
    const climaData = climaPorFecha.get(fecha);
    
    if (climaData && climaData.temperatura_media !== null) {
      const fechaObj = new Date(fecha);
      
      resultado.push({
        fecha,
        ventas_dia: ventaData.ventas,
        tickets_dia: ventaData.tickets,
        temperatura_media: parseFloat(climaData.temperatura_media) || 0,
        precipitacion: parseFloat(climaData.precipitacion) || 0,
        viento_velocidad: parseFloat(climaData.viento_velocidad) || 0,
        condicion_principal: climaData.condicion_principal || 'unknown',
        dia_semana: fechaObj.getDay(), // 0=domingo, 6=sábado
        mes: fechaObj.getMonth() + 1,
        es_festivo: esFestivoEspanol(fecha)
      });
    }
  });

  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// FUNCIÓN: Calcular correlación de Pearson
function calcularCorrelacionPearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sum_x = x.reduce((sum, val) => sum + val, 0);
  const sum_y = y.reduce((sum, val) => sum + val, 0);
  const sum_xy = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sum_xx = x.reduce((sum, val) => sum + val * val, 0);
  const sum_yy = y.reduce((sum, val) => sum + val * val, 0);

  const numerador = n * sum_xy - sum_x * sum_y;
  const denominador = Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y));

  return denominador === 0 ? 0 : numerador / denominador;
}

// FUNCIÓN: Interpretar significancia de correlación
function interpretarCorrelacion(r: number, variable: string): ResultadoCorrelacion {
  const rAbs = Math.abs(r);
  let significancia: 'alta' | 'media' | 'baja' | 'insignificante';
  let descripcion: string;

  if (rAbs >= 0.7) {
    significancia = 'alta';
    descripcion = `${variable} tiene un impacto ${r > 0 ? 'muy positivo' : 'muy negativo'} en las ventas (r=${r.toFixed(3)})`;
  } else if (rAbs >= 0.4) {
    significancia = 'media';
    descripcion = `${variable} tiene un impacto ${r > 0 ? 'positivo moderado' : 'negativo moderado'} en las ventas (r=${r.toFixed(3)})`;
  } else if (rAbs >= 0.2) {
    significancia = 'baja';
    descripcion = `${variable} tiene un impacto ${r > 0 ? 'ligeramente positivo' : 'ligeramente negativo'} en las ventas (r=${r.toFixed(3)})`;
  } else {
    significancia = 'insignificante';
    descripcion = `${variable} no muestra correlación significativa con las ventas (r=${r.toFixed(3)})`;
  }

  return { correlacion: r, significancia, descripcion };
}

// FUNCIÓN: Análisis de patrones estacionales
function analizarPatronesEstacionales(datos: DatosDiarios[]): AnalisisEstacional {
  const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const nombresMeses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Análisis por día de la semana
  const porDiaSemana = Array.from({ length: 7 }, (_, i) => {
    const datosDia = datos.filter(d => d.dia_semana === i);
    return {
      dia: i,
      nombre: nombresDias[i],
      ventas_promedio: datosDia.length > 0 ? 
        datosDia.reduce((sum, d) => sum + d.ventas_dia, 0) / datosDia.length : 0,
      tickets_promedio: datosDia.length > 0 ? 
        datosDia.reduce((sum, d) => sum + d.tickets_dia, 0) / datosDia.length : 0,
      dias_activos: datosDia.length
    };
  });

  // Análisis por mes
  const porMes = Array.from({ length: 12 }, (_, i) => {
    const mesDatos = datos.filter(d => d.mes === i + 1);
    return {
      mes: i + 1,
      nombre: nombresMeses[i + 1],
      ventas_promedio: mesDatos.length > 0 ? 
        mesDatos.reduce((sum, d) => sum + d.ventas_dia, 0) / mesDatos.length : 0,
      tickets_promedio: mesDatos.length > 0 ? 
        mesDatos.reduce((sum, d) => sum + d.tickets_dia, 0) / mesDatos.length : 0,
      dias_activos: mesDatos.length
    };
  }).filter(m => m.dias_activos > 0);

  return {
    por_dia_semana: porDiaSemana,
    por_mes: porMes,
    temperatura_optima: encontrarTemperaturaOptima(datos)
  };
}

// FUNCIÓN: Encontrar temperatura óptima
function encontrarTemperaturaOptima(datos: DatosDiarios[]) {
  // Agrupar por rangos de temperatura de 3°C
  const rangos = new Map();
  
  datos.forEach(d => {
    const rangoBase = Math.floor(d.temperatura_media / 3) * 3;
    const rangoKey = `${rangoBase}-${rangoBase + 3}`;
    
    if (!rangos.has(rangoKey)) {
      rangos.set(rangoKey, { ventas: [], rango: [rangoBase, rangoBase + 3] });
    }
    rangos.get(rangoKey).ventas.push(d.ventas_dia);
  });

  // Encontrar el rango con mayor promedio de ventas
  let mejorRango = null;
  let mejorPromedio = 0;

  rangos.forEach((data, key) => {
    if (data.ventas.length >= 5) { // Mínimo 5 días para considerar
      const promedio = data.ventas.reduce((sum, v) => sum + v, 0) / data.ventas.length;
      if (promedio > mejorPromedio) {
        mejorPromedio = promedio;
        mejorRango = {
          rango: data.rango as [number, number],
          ventas_promedio_en_rango: promedio,
          descripcion: `Las ventas son óptimas entre ${data.rango[0]}°C y ${data.rango[1]}°C (promedio: €${promedio.toFixed(0)})`
        };
      }
    }
  });

  return mejorRango || {
    rango: [18, 25] as [number, number],
    ventas_promedio_en_rango: 0,
    descripcion: 'No se pudo determinar temperatura óptima con los datos disponibles'
  };
}

// FUNCIÓN: Analizar impacto de festivos
function analizarImpactoFestivos(datos: DatosDiarios[]) {
  const festivos = datos.filter(d => d.es_festivo);
  const noFestivos = datos.filter(d => !d.es_festivo);

  if (festivos.length === 0) {
    return {
      dias_festivos_analizados: 0,
      impacto_promedio: 0,
      descripcion: 'No hay suficientes días festivos para análisis'
    };
  }

  const ventasPromedioFestivos = festivos.reduce((sum, d) => sum + d.ventas_dia, 0) / festivos.length;
  const ventasPromedioNormal = noFestivos.reduce((sum, d) => sum + d.ventas_dia, 0) / noFestivos.length;
  
  const impacto = ((ventasPromedioFestivos - ventasPromedioNormal) / ventasPromedioNormal) * 100;

  return {
    dias_festivos_analizados: festivos.length,
    ventas_promedio_festivos: ventasPromedioFestivos,
    ventas_promedio_normales: ventasPromedioNormal,
    impacto_promedio: impacto,
    descripcion: `Los días festivos ${impacto > 0 ? 'aumentan' : 'reducen'} las ventas en un ${Math.abs(impacto).toFixed(1)}%`
  };
}

// FUNCIÓN: Verificar si es festivo español
function esFestivoEspanol(fecha: string): boolean {
  const f = new Date(fecha);
  const mes = f.getMonth() + 1;
  const dia = f.getDate();
  
  // Festivos fijos españoles principales
  const festivosFijos = [
    [1, 1],   // Año Nuevo
    [1, 6],   // Reyes
    [5, 1],   // Día del Trabajo
    [8, 15],  // Asunción
    [10, 12], // Día de la Hispanidad
    [11, 1],  // Todos los Santos
    [12, 6],  // Día de la Constitución
    [12, 8],  // Inmaculada Concepción
    [12, 25], // Navidad
  ];

  return festivosFijos.some(([m, d]) => mes === m && dia === d);
}

// FUNCIÓN: Guardar correlaciones calculadas
async function guardarCorrelaciones(supabase: any, restauranteId: string, correlaciones: any, analisis: any) {
  try {
    // Actualizar tabla correlacion_clima_ventas con los resultados
    const { error } = await supabase
      .from('correlacion_clima_ventas')
      .update({
        correlacion_temperatura: correlaciones.temperatura_ventas,
        correlacion_lluvia: correlaciones.precipitacion_ventas,
        correlacion_viento: correlaciones.viento_ventas,
        updated_at: new Date().toISOString()
      })
      .eq('restaurante_id', restauranteId);

    if (error) {
      console.warn('Error guardando correlaciones en BD:', error);
    } else {
      console.log('Correlaciones guardadas exitosamente');
    }
  } catch (error) {
    console.warn('Error en guardarCorrelaciones:', error);
  }
}

// FUNCIÓN: Generar resumen ejecutivo
function generarResumenEjecutivo(correlaciones: any, analisis: any, temperaturaOptima: any) {
  const insights = [];
  
  // Correlación más fuerte
  const corrMasFuerte = Math.max(
    Math.abs(correlaciones.temperatura_ventas),
    Math.abs(correlaciones.precipitacion_ventas),
    Math.abs(correlaciones.viento_ventas)
  );

  if (corrMasFuerte >= 0.4) {
    if (Math.abs(correlaciones.temperatura_ventas) === corrMasFuerte) {
      insights.push(`La temperatura es el factor climático más influyente (r=${correlaciones.temperatura_ventas.toFixed(2)})`);
    }
  }

  // Día más fuerte
  const mejorDia = analisis.por_dia_semana.reduce((mejor, dia) => 
    dia.ventas_promedio > mejor.ventas_promedio ? dia : mejor
  );
  insights.push(`${mejorDia.nombre} es el día más fuerte (€${mejorDia.ventas_promedio.toFixed(0)} promedio)`);

  // Temperatura óptima
  if (temperaturaOptima && temperaturaOptima.rango) {
    insights.push(`Temperatura óptima: ${temperaturaOptima.rango[0]}°C - ${temperaturaOptima.rango[1]}°C`);
  }

  return {
    puntos_clave: insights,
    recomendacion: correlaciones.temperatura_ventas > 0.3 ? 
      'Considera promociones especiales en días de buen tiempo' : 
      'El clima tiene impacto limitado, enfócate en otros factores'
  };
}