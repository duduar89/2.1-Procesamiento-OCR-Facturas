// supabase/functions/entrenar-modelo/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrainingRequest {
  restaurante_id: string;
  tipo_modelo?: 'regression' | 'ensemble';
  periodo_dias?: number; // Por defecto 700 (para cubrir desde nov 2023)
  forzar_reentrenamiento?: boolean;
}

interface TrainingData {
  fecha: string;
  ventas_dia: number;
  ventas_dia_original: number; // Ventas originales sin transformación
  temperatura_media: number;
  temperatura_cuadratica: number;
  precipitacion: number;
  precipitacion_binaria: number;
  viento_velocidad: number;
  dia_semana: number;
  mes: number;
  es_festivo: number;
  temperatura_lag1: number;
  ventas_lag7: number;
  // FASE 2: NUEVAS FEATURES ESTACIONALES
  semana_del_ano: number;
  dia_del_mes: number;
  dia_semana_sin: number;
  dia_semana_cos: number;
  mes_sin: number;
  mes_cos: number;
  es_verano: number;
  es_invierno: number;
  temp_x_precipitacion: number;
  fin_de_semana: number;
}

interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  r_squared: number;
  precision_porcentaje: number;
}

interface TrainedModel {
  tipo: 'regression';
  coeficientes: { [key: string]: number }; // Coeficientes dinámicos
  metricas: ModelMetrics;
  features_importancia: { [key: string]: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      restaurante_id, 
      tipo_modelo = 'regression',
      periodo_dias = 700,
      forzar_reentrenamiento = false 
    }: TrainingRequest = await req.json();

    if (!restaurante_id) {
      throw new Error('restaurante_id es requerido');
    }

    console.log(`Entrenando modelo para restaurante: ${restaurante_id}`);
    console.log(`Tipo: ${tipo_modelo}, Período: ${periodo_dias} días`);

    // 1. VERIFICAR SI YA EXISTE MODELO ENTRENADO
    if (!forzar_reentrenamiento) {
      const { data: modeloExistente } = await supabase
        .from('modelos_prediccion')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .eq('tipo_modelo', tipo_modelo)
        .eq('activo', true)
        .single();

      if (modeloExistente) {
        console.log('Modelo existente encontrado, usando modelo actual');
        return new Response(JSON.stringify({
          success: true,
          mensaje: 'Modelo ya entrenado disponible',
          modelo_existente: true,
          metricas: {
            mae: modeloExistente.mae,
            rmse: modeloExistente.rmse,
            mape: modeloExistente.mape,
            r_squared: modeloExistente.r_squared,
            precision_porcentaje: modeloExistente.precision_actual
          },
          fecha_entrenamiento: modeloExistente.fecha_entrenamiento
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // 2. OBTENER DATOS DE ENTRENAMIENTO
    const datosEntrenamiento = await obtenerDatosEntrenamiento(supabase, restaurante_id, periodo_dias);
    
    if (datosEntrenamiento.length < 30) {
      throw new Error(`Insuficientes datos para entrenamiento (mínimo 30 días, encontrados ${datosEntrenamiento.length})`);
    }

    console.log(`Datos de entrenamiento: ${datosEntrenamiento.length} registros`);

    // 3. PREPARAR FEATURES PARA ML
    const featuresPreparadas = prepararFeatures(datosEntrenamiento);
    console.log(`Features preparadas: ${featuresPreparadas.length} filas`);
    
    // 🔍 DEBUGGING: Analizar distribución de es_verano
    const veranoStats = analizarFeatureVerano(featuresPreparadas);
    console.log('📊 ANÁLISIS es_verano:', veranoStats);

    // 4. DIVIDIR EN TRAIN/TEST (80/20)
    const splitIndex = Math.floor(featuresPreparadas.length * 0.8);
    const trainData = featuresPreparadas.slice(0, splitIndex);
    const testData = featuresPreparadas.slice(splitIndex);

    console.log(`Train: ${trainData.length}, Test: ${testData.length}`);

    // 5. ENTRENAR MODELO
    let modeloEntrenado: TrainedModel;
    
    if (tipo_modelo === 'regression') {
      modeloEntrenado = entrenarRegresionMultiple(trainData);
    } else {
      throw new Error(`Tipo de modelo ${tipo_modelo} no soportado aún`);
    }

    // 6. VALIDAR CON DATOS DE TEST
    console.log('Realizando predicciones en datos de test...');
    const prediccionesTest = realizarPredicciones(modeloEntrenado, testData);
    console.log(`Predicciones generadas: ${prediccionesTest.length}`);
    console.log('Primeras 5 predicciones:', prediccionesTest.slice(0, 5));
    
    // Verificar que las predicciones son válidas
    const prediccionesValidas = prediccionesTest.filter(p => !isNaN(p) && isFinite(p));
    console.log(`Predicciones válidas: ${prediccionesValidas.length}/${prediccionesTest.length}`);
    
    // FASE 1: Usar valores originales para métricas (no logarítmicos)
    const ventasRealesTest = testData.map(d => d.ventas_dia_original);
    console.log('Primeras 5 ventas reales:', ventasRealesTest.slice(0, 5));
    
    if (prediccionesValidas.length === 0) {
      throw new Error('Todas las predicciones son inválidas (NaN o Infinity)');
    }
    
    const metricasValidacion = calcularMetricas(ventasRealesTest, prediccionesTest);

    modeloEntrenado.metricas = metricasValidacion;

    console.log('Métricas de validación:', metricasValidacion);

    // 7. GUARDAR MODELO EN BASE DE DATOS
    await guardarModelo(supabase, restaurante_id, modeloEntrenado, trainData.length);

    // 8. GENERAR RESPUESTA
    const respuesta = {
      success: true,
      mensaje: 'Modelo entrenado exitosamente',
      restaurante_id,
      tipo_modelo,
      datos_entrenamiento: {
        total_registros: datosEntrenamiento.length,
        train_registros: trainData.length,
        test_registros: testData.length,
        periodo_analizado: {
          inicio: datosEntrenamiento[0]?.fecha,
          fin: datosEntrenamiento[datosEntrenamiento.length - 1]?.fecha
        }
      },
      metricas: {
        mae: Math.round(metricasValidacion.mae * 100) / 100,
        rmse: Math.round(metricasValidacion.rmse * 100) / 100,
        mape: Math.round(metricasValidacion.mape * 100) / 100,
        r_squared: Math.round(metricasValidacion.r_squared * 1000) / 1000,
        precision_porcentaje: Math.round((100 - metricasValidacion.mape) * 100) / 100
      },
      features_importantes: modeloEntrenado.features_importancia,
      recomendacion: metricasValidacion.mape < 20 ? 
        'Modelo con precisión alta - listo para producción' : 
        'Modelo funcional - considerar más datos para mejorar precisión',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(respuesta), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en entrenamiento:', error);
    
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

// FUNCIÓN: Obtener datos combinados para entrenamiento
async function obtenerDatosEntrenamiento(supabase: any, restauranteId: string, diasPeriodo: number) {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - diasPeriodo);
  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

  // Obtener ventas
  const { data: ventas, error: errorVentas } = await supabase
    .from('ventas_datos')
    .select('fecha_venta, total_bruto')
    .eq('restaurante_id', restauranteId)
    .gte('fecha_venta', fechaInicioStr)
    .order('fecha_venta', { ascending: true });

  if (errorVentas) throw new Error(`Error obteniendo ventas: ${errorVentas.message}`);

  // Obtener clima
  const { data: clima, error: errorClima } = await supabase
    .from('correlacion_clima_ventas')
    .select('fecha, temperatura_media, precipitacion, viento_velocidad')
    .eq('restaurante_id', restauranteId)
    .gte('fecha', fechaInicioStr)
    .order('fecha', { ascending: true });

  if (errorClima) throw new Error(`Error obteniendo clima: ${errorClima.message}`);

  // Combinar por fecha
  const ventasPorFecha = new Map();
  ventas?.forEach(v => {
    const fecha = v.fecha_venta;
    if (!ventasPorFecha.has(fecha)) {
      ventasPorFecha.set(fecha, 0);
    }
    ventasPorFecha.set(fecha, ventasPorFecha.get(fecha) + parseFloat(v.total_bruto));
  });

  const climaPorFecha = new Map();
  clima?.forEach(c => {
    if (c.temperatura_media !== null) {
      climaPorFecha.set(c.fecha, c);
    }
  });

  const datosCombinados = [];
  ventasPorFecha.forEach((ventas, fecha) => {
    const climaData = climaPorFecha.get(fecha);
    if (climaData) {
      datosCombinados.push({
        fecha,
        ventas_dia: ventas,
        temperatura_media: parseFloat(climaData.temperatura_media),
        precipitacion: parseFloat(climaData.precipitacion) || 0,
        viento_velocidad: parseFloat(climaData.viento_velocidad) || 0
      });
    }
  });

  // USAR TODOS LOS DATOS (100% - sin filtrado)
  console.log(`Usando TODOS los datos disponibles: ${datosCombinados.length} registros (sin filtros)`);

  return datosCombinados.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// FUNCIÓN: Filtrar outliers (solo P5 inferior, mantener ventas altas P5-P100)
function filtrarOutliers(datos: any[]): any[] {
  if (datos.length < 10) return datos; // No filtrar si hay pocos datos
  
  // Calcular percentiles
  const ventas = datos.map(d => d.ventas_dia).sort((a, b) => a - b);
  const p5 = ventas[Math.floor(ventas.length * 0.05)];   // Percentil 5
  const p100 = Math.max(...ventas);  // Valor máximo real (P100)
  
  console.log(`Filtrando outliers: P5=€${p5.toFixed(2)}, P100=€${p100.toFixed(2)} (manteniendo ventas altas)`);
  
  // Solo filtrar el 5% inferior (días de ventas anormalmente bajas)
  const filtrados = datos.filter(d => d.ventas_dia >= p5);
  
  console.log(`Outliers removidos: ${datos.length - filtrados.length} registros (solo días muy bajos)`);
  return filtrados;
}

// FUNCIÓN: Analizar problema con es_verano
function analizarFeatureVerano(datos: TrainingData[]) {
  const totalDatos = datos.length;
  const diasVerano = datos.filter(d => d.es_verano === 1).length;
  const diasInvierno = datos.filter(d => d.es_invierno === 1).length;
  const diasNormales = totalDatos - diasVerano - diasInvierno;
  
  // Analizar ventas por temporada
  const ventasVerano = datos.filter(d => d.es_verano === 1).map(d => d.ventas_dia_original);
  const ventasInvierno = datos.filter(d => d.es_invierno === 1).map(d => d.ventas_dia_original);
  const ventasNormales = datos.filter(d => d.es_verano === 0 && d.es_invierno === 0).map(d => d.ventas_dia_original);
  
  const promedioVerano = ventasVerano.length > 0 ? ventasVerano.reduce((a,b) => a+b, 0) / ventasVerano.length : 0;
  const promedioInvierno = ventasInvierno.length > 0 ? ventasInvierno.reduce((a,b) => a+b, 0) / ventasInvierno.length : 0;
  const promedioNormal = ventasNormales.length > 0 ? ventasNormales.reduce((a,b) => a+b, 0) / ventasNormales.length : 0;
  
  // Buscar colinealidad con mes
  const mesesVerano = datos.filter(d => d.es_verano === 1).map(d => d.mes);
  const mesesUnicos = [...new Set(mesesVerano)];
  
  return {
    total_datos: totalDatos,
    dias_verano: diasVerano,
    dias_invierno: diasInvierno, 
    dias_normales: diasNormales,
    porcentaje_verano: ((diasVerano / totalDatos) * 100).toFixed(1) + '%',
    porcentaje_invierno: ((diasInvierno / totalDatos) * 100).toFixed(1) + '%',
    promedio_ventas_verano: promedioVerano.toFixed(2) + '€',
    promedio_ventas_invierno: promedioInvierno.toFixed(2) + '€',
    promedio_ventas_normal: promedioNormal.toFixed(2) + '€',
    meses_verano_detectados: mesesUnicos,
    varianza_entre_temporadas: {
      verano_vs_normal: ((promedioVerano - promedioNormal) / promedioNormal * 100).toFixed(1) + '%',
      invierno_vs_normal: ((promedioInvierno - promedioNormal) / promedioNormal * 100).toFixed(1) + '%'
    }
  };
}

// FUNCIÓN: Preparar features para machine learning
function prepararFeatures(datos: any[]): TrainingData[] {
  return datos.map((dato, index) => {
    const fechaObj = new Date(dato.fecha);
    const diaSemana = fechaObj.getDay();
    const mes = fechaObj.getMonth() + 1;
    
    return {
      fecha: dato.fecha,
      // FASE 1: NORMALIZACIÓN LOGARÍTMICA de ventas
      ventas_dia: Math.log(Math.max(dato.ventas_dia, 1)), // Log transform
      ventas_dia_original: dato.ventas_dia, // Guardar original para referencia
      temperatura_media: dato.temperatura_media,
      temperatura_cuadratica: Math.pow(dato.temperatura_media, 2),
      precipitacion: dato.precipitacion,
      precipitacion_binaria: dato.precipitacion > 0.5 ? 1 : 0,
      viento_velocidad: dato.viento_velocidad,
      dia_semana: diaSemana,
      mes: mes,
      es_festivo: esFestivo(dato.fecha) ? 1 : 0,
      temperatura_lag1: index > 0 ? datos[index - 1].temperatura_media : dato.temperatura_media,
      // FASE 1: También normalizar ventas_lag7
      ventas_lag7: index >= 7 ? Math.log(Math.max(datos[index - 7].ventas_dia, 1)) : Math.log(Math.max(dato.ventas_dia, 1)),
      
      // FASE 2: NUEVAS FEATURES ESTACIONALES
      semana_del_ano: Math.floor((fechaObj.getTime() - new Date(fechaObj.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
      dia_del_mes: fechaObj.getDate(),
      
      // FEATURES CÍCLICAS (mejor para ML que lineales)
      dia_semana_sin: Math.sin(2 * Math.PI * diaSemana / 7),
      dia_semana_cos: Math.cos(2 * Math.PI * diaSemana / 7),
      mes_sin: Math.sin(2 * Math.PI * mes / 12),
      mes_cos: Math.cos(2 * Math.PI * mes / 12),
      
      // TEMPORADAS
      es_verano: (mes >= 6 && mes <= 8) ? 1 : 0,
      es_invierno: (mes === 12 || mes <= 2) ? 1 : 0,
      
      // INTERACCIONES
      temp_x_precipitacion: dato.temperatura_media * (dato.precipitacion > 0 ? 1 : 0),
      fin_de_semana: (diaSemana === 0 || diaSemana === 6) ? 1 : 0
    };
  });
}

// FUNCIÓN: Entrenar modelo de regresión múltiple
function entrenarRegresionMultiple(datos: TrainingData[]): TrainedModel {
  console.log('Entrenando modelo de regresión múltiple...');
  
  // Preparar matrices X (features) e y (target)
  // FASE 2 + LAG: Features optimizadas con serie temporal
  const features = [
    // Features originales estables
    'temperatura_media', 'precipitacion_binaria', 'mes', 'es_festivo',
    // Features estacionales optimizadas
    'fin_de_semana', 'es_verano', 'es_invierno', 'dia_semana_sin', 'dia_semana_cos',
    // FEATURE TEMPORAL CRÍTICA
    'ventas_lag7'  // Ventas del mismo día de la semana anterior
  ];
  
  console.log(`Usando ${features.length} features seleccionadas:`, features);

  const X = datos.map(d => features.map(f => d[f as keyof TrainingData] as number));
  const y = datos.map(d => d.ventas_dia);

  // Añadir columna de intercepto (bias)
  const XConIntercepto = X.map(fila => [1, ...fila]);

  // Resolver usando mínimos cuadrados: β = (X'X)^-1 X'y
  const coeficientes = resolverMinimoCuadrados(XConIntercepto, y);

  // Calcular importancia de features (valor absoluto normalizado)
  const sumCoeficientes = coeficientes.slice(1).reduce((sum, coef) => sum + Math.abs(coef), 0);
  const importancia: { [key: string]: number } = {};
  features.forEach((feature, i) => {
    importancia[feature] = sumCoeficientes > 0 ? Math.abs(coeficientes[i + 1]) / sumCoeficientes : 0;
  });

  // Crear objeto de coeficientes dinámicamente
  const coeficientesObj: any = { intercept: coeficientes[0] };
  features.forEach((feature, i) => {
    coeficientesObj[feature] = coeficientes[i + 1];
  });

  const modelo: TrainedModel = {
    tipo: 'regression',
    coeficientes: coeficientesObj,
    metricas: { mae: 0, rmse: 0, mape: 0, r_squared: 0, precision_porcentaje: 0 },
    features_importancia: importancia
  };

  console.log('Modelo entrenado. Coeficientes:', modelo.coeficientes);
  return modelo;
}

// FUNCIÓN: Resolver sistema con Ridge Regression (regularización L2)
function resolverMinimoCuadrados(X: number[][], y: number[]): number[] {
  const n = X.length;
  const m = X[0].length;
  
  // Parámetro de regularización Ridge
  const lambda = 0.01; // Regularización moderada
  
  console.log(`Resolviendo sistema ${n}x${m} con Ridge λ=${lambda}`);

  // Calcular X'X + λI (Ridge regularization)
  const XtX: number[][] = [];
  for (let i = 0; i < m; i++) {
    XtX[i] = [];
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * X[k][j];
      }
      // Añadir regularización Ridge en la diagonal
      XtX[i][j] = sum + (i === j ? lambda : 0);
    }
  }

  // Calcular X'y
  const Xty: number[] = [];
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += X[k][i] * y[k];
    }
    Xty[i] = sum;
  }

  // Verificar condición de la matriz
  const condicionAprox = verificarCondicionMatriz(XtX);
  console.log(`Condición aprox. de X'X + λI: ${condicionAprox.toFixed(2)}`);

  // Resolver (X'X + λI)β = X'y usando eliminación gaussiana mejorada
  return resolverSistemaLinealMejorado(XtX, Xty);
}

// FUNCIÓN: Verificar condición numérica de una matriz
function verificarCondicionMatriz(A: number[][]): number {
  const n = A.length;
  // Estimar condición como ratio entre elemento max y min de la diagonal
  let maxDiag = 0;
  let minDiag = Infinity;
  
  for (let i = 0; i < n; i++) {
    const val = Math.abs(A[i][i]);
    maxDiag = Math.max(maxDiag, val);
    minDiag = Math.min(minDiag, val);
  }
  
  return minDiag > 0 ? maxDiag / minDiag : Infinity;
}

// FUNCIÓN: Resolver sistema lineal con verificaciones de estabilidad
function resolverSistemaLinealMejorado(A: number[][], b: number[]): number[] {
  const n = A.length;
  const Ab = A.map((fila, i) => [...fila, b[i]]);
  const EPS = 1e-10; // Tolerancia para valores muy pequeños

  // Eliminación hacia adelante con pivoteo parcial
  for (let i = 0; i < n; i++) {
    // Encontrar el mejor pivote
    let maxFila = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxFila][i])) {
        maxFila = k;
      }
    }
    
    // Intercambiar filas si es necesario
    if (maxFila !== i) {
      [Ab[i], Ab[maxFila]] = [Ab[maxFila], Ab[i]];
    }

    // Verificar si el pivote es muy pequeño (matriz singular)
    if (Math.abs(Ab[i][i]) < EPS) {
      console.error(`Pivote muy pequeño en fila ${i}: ${Ab[i][i]}`);
      // Usar regularización adicional en el lugar
      Ab[i][i] = EPS;
    }

    // Hacer ceros debajo del pivote
    for (let k = i + 1; k < n; k++) {
      const factor = Ab[k][i] / Ab[i][i];
      for (let j = i; j < n + 1; j++) {
        Ab[k][j] -= factor * Ab[i][j];
      }
    }
  }

  // Sustitución hacia atrás con verificaciones
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = Ab[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= Ab[i][j] * x[j];
    }
    
    // Verificar división por cero
    if (Math.abs(Ab[i][i]) < EPS) {
      console.error(`División por cero evitada en elemento ${i}: ${Ab[i][i]}`);
      x[i] = 0; // Valor por defecto
    } else {
      x[i] /= Ab[i][i];
    }
    
    // Verificar resultado válido
    if (!isFinite(x[i])) {
      console.error(`Coeficiente inválido en posición ${i}: ${x[i]}`);
      x[i] = 0;
    }
  }

  console.log('Primeros 3 coeficientes:', x.slice(0, 3));
  return x;
}

// FUNCIÓN: Resolver sistema lineal Ax = b (versión original - mantener para compatibilidad)
function resolverSistemaLineal(A: number[][], b: number[]): number[] {
  const n = A.length;
  const Ab = A.map((fila, i) => [...fila, b[i]]);

  // Eliminación hacia adelante
  for (let i = 0; i < n; i++) {
    // Encontrar pivote
    let maxFila = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxFila][i])) {
        maxFila = k;
      }
    }
    [Ab[i], Ab[maxFila]] = [Ab[maxFila], Ab[i]];

    // Hacer ceros debajo del pivote
    for (let k = i + 1; k < n; k++) {
      const factor = Ab[k][i] / Ab[i][i];
      for (let j = i; j < n + 1; j++) {
        Ab[k][j] -= factor * Ab[i][j];
      }
    }
  }

  // Sustitución hacia atrás
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = Ab[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= Ab[i][j] * x[j];
    }
    x[i] /= Ab[i][i];
  }

  return x;
}

// FUNCIÓN: Realizar predicciones con modelo entrenado
function realizarPredicciones(modelo: TrainedModel, datos: TrainingData[]): number[] {
  const coef = modelo.coeficientes;
  
  return datos.map(d => {
    // Predicción en escala logarítmica usando coeficientes dinámicos
    let logPrediccion = coef.intercept;
    
    // Sumar contribución de cada feature (con ventas_lag7 crítica)
    if (coef.temperatura_media !== undefined) logPrediccion += coef.temperatura_media * d.temperatura_media;
    if (coef.precipitacion_binaria !== undefined) logPrediccion += coef.precipitacion_binaria * d.precipitacion_binaria;
    if (coef.mes !== undefined) logPrediccion += coef.mes * d.mes;
    if (coef.es_festivo !== undefined) logPrediccion += coef.es_festivo * d.es_festivo;
    if (coef.fin_de_semana !== undefined) logPrediccion += coef.fin_de_semana * d.fin_de_semana;
    if (coef.es_verano !== undefined) logPrediccion += coef.es_verano * d.es_verano;
    if (coef.es_invierno !== undefined) logPrediccion += coef.es_invierno * d.es_invierno;
    if (coef.dia_semana_sin !== undefined) logPrediccion += coef.dia_semana_sin * d.dia_semana_sin;
    if (coef.dia_semana_cos !== undefined) logPrediccion += coef.dia_semana_cos * d.dia_semana_cos;
    if (coef.ventas_lag7 !== undefined) logPrediccion += coef.ventas_lag7 * d.ventas_lag7;
    
    // FASE 1: Convertir de vuelta a escala original (exponencial)
    return Math.exp(logPrediccion);
  });
}

// FUNCIÓN: Calcular métricas de evaluación
function calcularMetricas(yTrue: number[], yPred: number[]): ModelMetrics {
  const n = yTrue.length;
  
  console.log(`Calculando métricas para ${n} muestras`);
  
  // Validar que no hay NaN o Infinity
  const yTrueValidos = yTrue.filter(y => !isNaN(y) && isFinite(y));
  const yPredValidos = yPred.filter(y => !isNaN(y) && isFinite(y));
  
  console.log(`Valores válidos - yTrue: ${yTrueValidos.length}, yPred: ${yPredValidos.length}`);
  
  if (yTrueValidos.length !== n || yPredValidos.length !== n) {
    console.error('Datos inválidos detectados en métricas');
    return {
      mae: 0,
      rmse: 0,
      mape: 0,
      r_squared: 0,
      precision_porcentaje: 0
    };
  }
  
  // MAE (Mean Absolute Error)
  const mae = yTrue.reduce((sum, actual, i) => 
    sum + Math.abs(actual - yPred[i]), 0) / n;
  
  // RMSE (Root Mean Square Error)
  const mse = yTrue.reduce((sum, actual, i) => 
    sum + Math.pow(actual - yPred[i], 2), 0) / n;
  const rmse = Math.sqrt(mse);
  
  // MAPE (Mean Absolute Percentage Error) - evitar división por cero
  let mapeSum = 0;
  let mapeCount = 0;
  yTrue.forEach((actual, i) => {
    if (actual !== 0) {
      mapeSum += Math.abs((actual - yPred[i]) / actual);
      mapeCount++;
    }
  });
  const mape = mapeCount > 0 ? (mapeSum / mapeCount) * 100 : 0;
  
  // R² (Coefficient of determination)
  const yMean = yTrue.reduce((sum, val) => sum + val, 0) / n;
  const ssTot = yTrue.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const ssRes = yTrue.reduce((sum, actual, i) => sum + Math.pow(actual - yPred[i], 2), 0);
  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  const precisionPorcentaje = Math.max(0, 100 - mape);
  
  const metricas = {
    mae: isFinite(mae) ? mae : 0,
    rmse: isFinite(rmse) ? rmse : 0,
    mape: isFinite(mape) ? mape : 0,
    r_squared: isFinite(rSquared) ? rSquared : 0,
    precision_porcentaje: isFinite(precisionPorcentaje) ? precisionPorcentaje : 0
  };
  
  console.log('Métricas calculadas:', metricas);
  return metricas;
}

// FUNCIÓN: Guardar modelo en base de datos
async function guardarModelo(supabase: any, restauranteId: string, modelo: TrainedModel, numRegistros: number) {
  try {
    console.log('Guardando modelo con estrategia UPSERT...');
    
    // ESTRATEGIA: Borrar todos los modelos anteriores y crear uno nuevo
    const { error: deleteError } = await supabase
      .from('modelos_prediccion')
      .delete()
      .eq('restaurante_id', restauranteId)
      .eq('tipo_modelo', modelo.tipo);

    if (deleteError) {
      console.warn('Error borrando modelos anteriores:', deleteError);
    }

    // Insertar nuevo modelo
    const { error: insertError } = await supabase
      .from('modelos_prediccion')
      .insert({
        restaurante_id: restauranteId,
        nombre_modelo: `Ridge + LAG7 (Serie Temporal) - ${new Date().toISOString().split('T')[0]}`,
        tipo_modelo: modelo.tipo,
        activo: true,
        parametros: modelo.coeficientes,
        features_seleccionadas: Object.keys(modelo.features_importancia),
        precision_actual: modelo.metricas.precision_porcentaje,
        mae: modelo.metricas.mae,
        rmse: modelo.metricas.rmse,
        mape: modelo.metricas.mape,
        r_squared: modelo.metricas.r_squared,
        fecha_entrenamiento: new Date().toISOString(),
        datos_entrenamiento_desde: new Date(Date.now() - 700 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        datos_entrenamiento_hasta: new Date().toISOString().split('T')[0],
        num_registros_entrenamiento: numRegistros
      });

    if (insertError) {
      console.error('Error insertando modelo:', insertError);
      throw new Error(`Error guardando modelo: ${insertError.message}`);
    }

    console.log('Modelo guardado exitosamente con estrategia UPSERT');
  } catch (error) {
    console.error('Error en guardarModelo:', error);
    throw error;
  }
}

// FUNCIÓN: Verificar si es festivo
function esFestivo(fecha: string): boolean {
  const f = new Date(fecha);
  const mes = f.getMonth() + 1;
  const dia = f.getDate();
  
  const festivosFijos = [
    [1, 1], [1, 6], [5, 1], [8, 15], [10, 12], 
    [11, 1], [12, 6], [12, 8], [12, 25]
  ];

  return festivosFijos.some(([m, d]) => mes === m && dia === d);
}