
// Modelo LightGBM entrenado - Generado automáticamente
// Fecha: 2025-08-26T02:15:57.379361
// Métricas: MAE=361.61, R²=0.019, MAPE=52.9%

const MODELO_LIGHTGBM = {
  tipo: 'LightGBM',
  features: [
  "temperatura_media",
  "temperatura_cuadratica",
  "precipitacion",
  "precipitacion_binaria",
  "viento_velocidad",
  "dia_semana_sin",
  "dia_semana_cos",
  "mes_sin",
  "mes_cos",
  "es_fin_semana",
  "es_verano",
  "es_invierno",
  "es_festivo",
  "ventas_lag1",
  "ventas_lag7",
  "ventas_lag30",
  "ventas_ma7",
  "ventas_ma30",
  "ventas_std7",
  "temp_x_precipitacion",
  "fin_semana_x_verano",
  "fin_semana_x_festivo",
  "lluvia_x_festivo",
  "temp_alta_x_fin_semana",
  "invierno_x_precipitacion",
  "verano_x_temp_extrema",
  "festivo_x_mes",
  "lluvia_x_dia_semana",
  "temp_optima",
  "temp_optima_x_fin_semana"
],
  metricas: {
  "mae": 361.6141440567552,
  "rmse": 469.7966214029616,
  "r2": 0.018594603385767572,
  "mape": 52.90921301719765
},
  
  // Función de predicción simplificada (aproximación lineal de LightGBM)
  predecir: function(datos) {
    // Preparar features
    const features = this.prepararFeatures(datos);
    
    // Aplicar modelo lineal (aproximación)
    let prediccion = 1041.09; // baseline
    
    // Añadir contribuciones de features importantes
        if (features.temperatura_media) prediccion += features.temperatura_media * 270.000000;
    if (features.temperatura_cuadratica) prediccion += features.temperatura_cuadratica * 61.000000;
    if (features.precipitacion) prediccion += features.precipitacion * 35.000000;
    if (features.precipitacion_binaria) prediccion += features.precipitacion_binaria * 0.000000;
    if (features.viento_velocidad) prediccion += features.viento_velocidad * 109.000000;
    if (features.dia_semana_sin) prediccion += features.dia_semana_sin * 73.000000;
    if (features.dia_semana_cos) prediccion += features.dia_semana_cos * 77.000000;
    if (features.mes_sin) prediccion += features.mes_sin * 24.000000;
    if (features.mes_cos) prediccion += features.mes_cos * 32.000000;
    if (features.es_fin_semana) prediccion += features.es_fin_semana * 1.000000;
    
    return Math.max(0, prediccion);
  },
  
  prepararFeatures: function(dato) {
    const fechaObj = new Date(dato.fecha);
    const diaSemana = fechaObj.getDay();
    const mes = fechaObj.getMonth() + 1;
    
    return {
      temperatura_media: dato.temperatura_media || 15,
      temperatura_cuadratica: Math.pow(dato.temperatura_media || 15, 2),
      precipitacion: dato.precipitacion || 0,
      precipitacion_binaria: (dato.precipitacion || 0) > 0.5 ? 1 : 0,
      viento_velocidad: dato.viento_velocidad || 10,
      dia_semana_sin: Math.sin(2 * Math.PI * diaSemana / 7),
      dia_semana_cos: Math.cos(2 * Math.PI * diaSemana / 7),
      mes_sin: Math.sin(2 * Math.PI * mes / 12),
      mes_cos: Math.cos(2 * Math.PI * mes / 12),
      es_fin_semana: [0, 6].includes(diaSemana) ? 1 : 0,
      es_verano: [6, 7, 8].includes(mes) ? 1 : 0,
      es_invierno: [12, 1, 2].includes(mes) ? 1 : 0,
      es_festivo: 0, // Simplificado
      ventas_lag1: dato.ventas_lag1 || dato.ventas_dia || 1000,
      ventas_lag7: dato.ventas_lag7 || dato.ventas_dia || 1000,
      ventas_lag30: dato.ventas_lag30 || dato.ventas_dia || 1000,
      ventas_ma7: dato.ventas_ma7 || dato.ventas_dia || 1000,
      ventas_ma30: dato.ventas_ma30 || dato.ventas_dia || 1000,
      ventas_std7: dato.ventas_std7 || 200,
      temp_x_precipitacion: (dato.temperatura_media || 15) * ((dato.precipitacion || 0) > 0.5 ? 1 : 0),
      fin_semana_x_verano: ([0, 6].includes(diaSemana) ? 1 : 0) * ([6, 7, 8].includes(mes) ? 1 : 0)
    };
  }
};

module.exports = MODELO_LIGHTGBM;
