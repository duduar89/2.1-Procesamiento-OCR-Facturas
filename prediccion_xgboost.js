
// Modelo XGBoost entrenado - Generado automáticamente
// Fecha: 2025-08-26T02:15:57.145648
// Métricas: MAE=830.11, R²=0.001, MAPE=113.5%

const MODELO_XGBOOST = {
  tipo: 'XGBoost',
  features: [
  "dia_semana_sin",
  "dia_semana_cos",
  "ventas_ma7",
  "ventas_lag1",
  "ventas_std7",
  "ventas_lag7",
  "invierno_x_precipitacion",
  "temp_optima_x_fin_semana",
  "temperatura_media",
  "precipitacion_binaria",
  "mes_cos",
  "es_fin_semana",
  "es_festivo",
  "temp_optima",
  "fin_semana_x_verano"
],
  metricas: {
  "mae": 830.1083526234569,
  "rmse": 1061.7554321710409,
  "r2": 0.0009543335295838506,
  "mape": 113.49082258785496,
  "feature_importance": {
    "dia_semana_sin": 0.22120104730129242,
    "dia_semana_cos": 0.16802875697612762,
    "ventas_ma7": 0.15784217417240143,
    "ventas_lag1": 0.11423453688621521,
    "ventas_std7": 0.07924218475818634,
    "es_fin_semana": 0.07867490500211716,
    "ventas_lag7": 0.05616781860589981,
    "temp_optima_x_fin_semana": 0.034636203199625015,
    "precipitacion_binaria": 0.02688269503414631,
    "temperatura_media": 0.024617217481136322,
    "invierno_x_precipitacion": 0.02266933210194111,
    "mes_cos": 0.014818473719060421,
    "temp_optima": 0.0009845838649198413,
    "es_festivo": 0.0,
    "fin_semana_x_verano": 0.0
  }
},
  
  // Función de predicción simplificada (aproximación lineal de XGBoost)
  predecir: function(datos) {
    // Preparar features
    const features = this.prepararFeatures(datos);
    
    // Aplicar modelo lineal (aproximación)
    let prediccion = 1290.86; // baseline
    
    // Añadir contribuciones de features importantes
        if (features.dia_semana_sin) prediccion += features.dia_semana_sin * 0.221201;
    if (features.dia_semana_cos) prediccion += features.dia_semana_cos * 0.168029;
    if (features.ventas_ma7) prediccion += features.ventas_ma7 * 0.157842;
    if (features.ventas_lag1) prediccion += features.ventas_lag1 * 0.114235;
    if (features.ventas_std7) prediccion += features.ventas_std7 * 0.079242;
    if (features.ventas_lag7) prediccion += features.ventas_lag7 * 0.056168;
    if (features.invierno_x_precipitacion) prediccion += features.invierno_x_precipitacion * 0.022669;
    if (features.temp_optima_x_fin_semana) prediccion += features.temp_optima_x_fin_semana * 0.034636;
    if (features.temperatura_media) prediccion += features.temperatura_media * 0.024617;
    if (features.precipitacion_binaria) prediccion += features.precipitacion_binaria * 0.026883;
    
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

module.exports = MODELO_XGBOOST;
