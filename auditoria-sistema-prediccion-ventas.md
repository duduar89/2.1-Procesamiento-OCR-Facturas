1.1 verificar tablas existentes
[
  {
    "table_name": "correlacion_clima_ventas",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "productos_catalogo",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "restaurantes",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "ventas_datos",
    "table_type": "BASE TABLE"
  }
]

1.2 verificar columnas de la tabla princpal de veentas

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "column_name": "restaurante_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "sistema_origen",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "id_externo",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "referencia_externa",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "fecha_venta",
    "data_type": "date",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "fecha_hora_completa",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "tpv_id",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "tpv_nombre",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "seccion",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "num_comensales",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "mesa",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "cliente_id",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "cliente_nombre",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "total_bruto",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "total_neto",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "total_impuestos",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "descuentos",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "propinas",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "metodo_pago",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "metodos_pago",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "datos_originales",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "datos_procesados",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "estado",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "'procesado'::character varying"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "procesado_por",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "ticket_medio",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "NULL::numeric"
  }
]

1.3 Verificar columnas de tabla clima

[
  {
    "column_name": "id",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "nextval('correlacion_clima_ventas_id_seq'::regclass)"
  },
  {
    "column_name": "restaurante_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "fecha",
    "data_type": "date",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "estacion_aemet",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "temperatura_max",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "temperatura_min",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "temperatura_media",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "precipitacion",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "viento_velocidad",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "condicion_principal",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "ventas_total",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "tickets_total",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "comensales_total",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "factor_temperatura",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "1.000"
  },
  {
    "column_name": "factor_precipitacion",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "1.000"
  },
  {
    "column_name": "impacto_total",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "1.000"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]


-- =============================================
-- AUDITORÍA COMPLETA BASE DE DATOS
-- Sistema de Predicción de Ventas
-- =============================================

-- =====================================
-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
-- =====================================

-- 1.1 Verificar tablas existentes
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('restaurantes', 'ventas_datos', 'lineas_venta', 
                     'productos_catalogo', 'correlacion_clima_ventas')
ORDER BY table_name;

-- 1.2 Verificar columnas de tabla principal de ventas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ventas_datos' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.3 Verificar columnas de tabla clima
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'correlacion_clima_ventas' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================
-- PASO 2: ANÁLISIS CALIDAD DATOS VENTAS
-- =====================================
2852b1af-38d8-43ec-8872-2b2921d5a231
2852b1af-38d8-43ec-8872-2b2921d5a231
2852b1af-38d8-43ec-8872-2b2921d5a231
-- 2.1 Rango temporal de datos disponibles

[
  {
    "fecha_inicio": "2023-11-03",
    "fecha_fin": "2025-08-25",
    "dias_unicos": 543,
    "total_tickets": 543
  }
]


2.2 distribucion por sistmea de origen

[
  {
    "sistema_origen": "import_manual",
    "tickets": 542,
    "dias_activo": 542,
    "primera_fecha": "2023-11-03",
    "ultima_fecha": "2025-08-23",
    "ticket_medio_promedio": "1190.88",
    "ventas_totales": "645458.00"
  },
  {
    "sistema_origen": "numier",
    "tickets": 1,
    "dias_activo": 1,
    "primera_fecha": "2025-08-25",
    "ultima_fecha": "2025-08-25",
    "ticket_medio_promedio": "1.90",
    "ventas_totales": "1.90"
  }
]

2.3 Caldad de datos criticos para ML

[
  {
    "campo": "total_bruto",
    "total_registros": 543,
    "valores_no_null": 543,
    "valores_positivos": 543,
    "valores_cero_negativo": 0,
    "promedio": "1188.69",
    "minimo": "1.90",
    "maximo": "6153.70"
  }
]

[
  {
    "campo": "ticket_medio",
    "total_registros": 543,
    "valores_no_null": 541,
    "valores_positivos": 541,
    "valores_problematicos": 2,
    "promedio": "21.42",
    "minimo": "1.90",
    "maximo": "80.73"
  }
]

[
  {
    "campo": "num_comensales",
    "total_registros": 543,
    "valores_no_null": 543,
    "valores_positivos": 0,
    "valores_problematicos": 543,
    "promedio": "0.00",
    "minimo": "0.00",
    "maximo": "0.00"
  }
]

2.4 Distribucion temporal

[
  {
    "dia_semana": "0",
    "nombre_dia": "Domingo",
    "tickets": 2,
    "dias_activos": 2,
    "ticket_promedio": "331.85",
    "ventas_totales": "663.70"
  },
  {
    "dia_semana": "1",
    "nombre_dia": "Lunes",
    "tickets": 13,
    "dias_activos": 13,
    "ticket_promedio": "559.25",
    "ventas_totales": "7270.25"
  },
  {
    "dia_semana": "2",
    "nombre_dia": "Martes",
    "tickets": 13,
    "dias_activos": 13,
    "ticket_promedio": "579.29",
    "ventas_totales": "7530.79"
  },
  {
    "dia_semana": "3",
    "nombre_dia": "Miércoles",
    "tickets": 13,
    "dias_activos": 13,
    "ticket_promedio": "1023.83",
    "ventas_totales": "13309.80"
  },
  {
    "dia_semana": "4",
    "nombre_dia": "Jueves",
    "tickets": 13,
    "dias_activos": 13,
    "ticket_promedio": "821.95",
    "ventas_totales": "10685.35"
  },
  {
    "dia_semana": "5",
    "nombre_dia": "Viernes",
    "tickets": 13,
    "dias_activos": 13,
    "ticket_promedio": "1265.26",
    "ventas_totales": "16448.40"
  },
  {
    "dia_semana": "6",
    "nombre_dia": "Sábado",
    "tickets": 13,
    "dias_activos": 13,
    "ticket_promedio": "757.07",
    "ventas_totales": "9841.90"
  }
]

-- 2.5 Distribución por mes (tendencias anuales)

[
  {
    "mes": "8",
    "año": "2025",
    "tickets": 22,
    "dias_activos": 22,
    "ticket_promedio": "540.19",
    "ventas_totales": "11884.15"
  },
  {
    "mes": "7",
    "año": "2025",
    "tickets": 27,
    "dias_activos": 27,
    "ticket_promedio": "718.37",
    "ventas_totales": "19395.90"
  },
  {
    "mes": "6",
    "año": "2025",
    "tickets": 26,
    "dias_activos": 26,
    "ticket_promedio": "1079.19",
    "ventas_totales": "28058.99"
  },
  {
    "mes": "5",
    "año": "2025",
    "tickets": 30,
    "dias_activos": 30,
    "ticket_promedio": "1296.66",
    "ventas_totales": "38899.80"
  },
  {
    "mes": "4",
    "año": "2025",
    "tickets": 26,
    "dias_activos": 26,
    "ticket_promedio": "1864.55",
    "ventas_totales": "48478.30"
  },
  {
    "mes": "3",
    "año": "2025",
    "tickets": 25,
    "dias_activos": 25,
    "ticket_promedio": "1273.44",
    "ventas_totales": "31835.96"
  },
  {
    "mes": "2",
    "año": "2025",
    "tickets": 23,
    "dias_activos": 23,
    "ticket_promedio": "1134.02",
    "ventas_totales": "26082.35"
  },
  {
    "mes": "1",
    "año": "2025",
    "tickets": 25,
    "dias_activos": 25,
    "ticket_promedio": "1382.33",
    "ventas_totales": "34558.25"
  },
  {
    "mes": "12",
    "año": "2024",
    "tickets": 28,
    "dias_activos": 28,
    "ticket_promedio": "1730.22",
    "ventas_totales": "48446.10"
  },
  {
    "mes": "11",
    "año": "2024",
    "tickets": 26,
    "dias_activos": 26,
    "ticket_promedio": "1417.12",
    "ventas_totales": "36845.10"
  },
  {
    "mes": "10",
    "año": "2024",
    "tickets": 27,
    "dias_activos": 27,
    "ticket_promedio": "912.10",
    "ventas_totales": "24626.65"
  },
  {
    "mes": "9",
    "año": "2024",
    "tickets": 25,
    "dias_activos": 25,
    "ticket_promedio": "841.16",
    "ventas_totales": "21029.00"
  },
  {
    "mes": "8",
    "año": "2024",
    "tickets": 5,
    "dias_activos": 5,
    "ticket_promedio": "966.48",
    "ventas_totales": "4832.40"
  },
  {
    "mes": "7",
    "año": "2024",
    "tickets": 27,
    "dias_activos": 27,
    "ticket_promedio": "502.08",
    "ventas_totales": "13556.25"
  },
  {
    "mes": "6",
    "año": "2024",
    "tickets": 24,
    "dias_activos": 24,
    "ticket_promedio": "1048.05",
    "ventas_totales": "25153.25"
  },
  {
    "mes": "5",
    "año": "2024",
    "tickets": 27,
    "dias_activos": 27,
    "ticket_promedio": "1275.57",
    "ventas_totales": "34440.35"
  },
  {
    "mes": "4",
    "año": "2024",
    "tickets": 25,
    "dias_activos": 25,
    "ticket_promedio": "1239.86",
    "ventas_totales": "30996.40"
  },
  {
    "mes": "3",
    "año": "2024",
    "tickets": 27,
    "dias_activos": 27,
    "ticket_promedio": "1496.24",
    "ventas_totales": "40398.45"
  },
  {
    "mes": "2",
    "año": "2024",
    "tickets": 24,
    "dias_activos": 24,
    "ticket_promedio": "1282.52",
    "ventas_totales": "30780.55"
  },
  {
    "mes": "1",
    "año": "2024",
    "tickets": 25,
    "dias_activos": 25,
    "ticket_promedio": "1221.32",
    "ventas_totales": "30533.10"
  },
  {
    "mes": "12",
    "año": "2023",
    "tickets": 29,
    "dias_activos": 29,
    "ticket_promedio": "1498.57",
    "ventas_totales": "43458.50"
  },
  {
    "mes": "11",
    "año": "2023",
    "tickets": 20,
    "dias_activos": 20,
    "ticket_promedio": "1058.51",
    "ventas_totales": "21170.10"
  }
]

- =====================================
-- PASO 3: ANÁLISIS DATOS METEOROLÓGICOS
-- =====================================

-- 3.1 Disponibilidad de datos AEMET

[
  {
    "fecha_inicio": "2023-11-03",
    "fecha_fin": "2025-08-22",
    "registros_totales": 474,
    "dias_unicos": 474,
    "temp_disponible": 472,
    "lluvia_disponible": 474,
    "viento_disponible": 474,
    "condicion_disponible": 474
  }
]

-- 3.2 Calidad datos meteorológicos

[
  {
    "variable": "temperatura_media",
    "total_registros": 474,
    "valores_no_null": 472,
    "promedio": "17.17",
    "minimo": "7.40",
    "maximo": "33.80",
    "desviacion_std": "5.58"
  }
]

[
  {
    "variable": "precipitacion",
    "total_registros": 474,
    "valores_no_null": 474,
    "promedio": "1.94",
    "minimo": "0.00",
    "maximo": "94.60",
    "desviacion_std": "7.44"
  }
]

[
  {
    "variable": "viento_velocidad",
    "total_registros": 474,
    "valores_no_null": 474,
    "promedio": "3.07",
    "minimo": "0.80",
    "maximo": "8.60",
    "desviacion_std": "1.32"
  }
]

-- 3.3 Distribución condiciones climáticas

[
  {
    "condicion_principal": "Clouds",
    "dias": 274,
    "temp_promedio": "16.0",
    "lluvia_promedio": "0.0"
  },
  {
    "condicion_principal": "Rain",
    "dias": 121,
    "temp_promedio": "14.8",
    "lluvia_promedio": "7.6"
  },
  {
    "condicion_principal": "Clear",
    "dias": 66,
    "temp_promedio": "28.0",
    "lluvia_promedio": "0.0"
  },
  {
    "condicion_principal": "Cold",
    "dias": 13,
    "temp_promedio": "9.3",
    "lluvia_promedio": "0.0"
  }
]

-- =====================================
-- PASO 4: CORRELACIÓN VENTAS-CLIMA
-- =====================================

 4.1 Datos combinados ventas + clima por día

 [
  {
    "fecha_venta": "2025-08-25",
    "tickets_dia": 1,
    "ventas_dia": "1.90",
    "ticket_promedio_dia": "1.90",
    "temperatura_media": null,
    "precipitacion": null,
    "viento_velocidad": null,
    "condicion_principal": null
  },
  {
    "fecha_venta": "2025-08-23",
    "tickets_dia": 1,
    "ventas_dia": "301.60",
    "ticket_promedio_dia": "301.60",
    "temperatura_media": null,
    "precipitacion": null,
    "viento_velocidad": null,
    "condicion_principal": null
  },
  {
    "fecha_venta": "2025-08-22",
    "tickets_dia": 1,
    "ventas_dia": "522.90",
    "ticket_promedio_dia": "522.90",
    "temperatura_media": "25.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-21",
    "tickets_dia": 1,
    "ventas_dia": "750.90",
    "ticket_promedio_dia": "750.90",
    "temperatura_media": "25.10",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-20",
    "tickets_dia": 1,
    "ventas_dia": "498.20",
    "ticket_promedio_dia": "498.20",
    "temperatura_media": "25.40",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-19",
    "tickets_dia": 1,
    "ventas_dia": "239.50",
    "ticket_promedio_dia": "239.50",
    "temperatura_media": null,
    "precipitacion": "0.00",
    "viento_velocidad": "3.90",
    "condicion_principal": "Cold"
  },
  {
    "fecha_venta": "2025-08-18",
    "tickets_dia": 1,
    "ventas_dia": "503.15",
    "ticket_promedio_dia": "503.15",
    "temperatura_media": "31.70",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-16",
    "tickets_dia": 1,
    "ventas_dia": "496.40",
    "ticket_promedio_dia": "496.40",
    "temperatura_media": "31.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-15",
    "tickets_dia": 1,
    "ventas_dia": "521.30",
    "ticket_promedio_dia": "521.30",
    "temperatura_media": "28.60",
    "precipitacion": "0.00",
    "viento_velocidad": "2.80",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-14",
    "tickets_dia": 1,
    "ventas_dia": "381.80",
    "ticket_promedio_dia": "381.80",
    "temperatura_media": "28.80",
    "precipitacion": "0.00",
    "viento_velocidad": "2.80",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-13",
    "tickets_dia": 1,
    "ventas_dia": "281.50",
    "ticket_promedio_dia": "281.50",
    "temperatura_media": "32.50",
    "precipitacion": "0.00",
    "viento_velocidad": "3.10",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-12",
    "tickets_dia": 1,
    "ventas_dia": "250.30",
    "ticket_promedio_dia": "250.30",
    "temperatura_media": "32.40",
    "precipitacion": "0.00",
    "viento_velocidad": "3.10",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-11",
    "tickets_dia": 1,
    "ventas_dia": "840.80",
    "ticket_promedio_dia": "840.80",
    "temperatura_media": "31.20",
    "precipitacion": "0.00",
    "viento_velocidad": "3.10",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-09",
    "tickets_dia": 1,
    "ventas_dia": "459.90",
    "ticket_promedio_dia": "459.90",
    "temperatura_media": "25.70",
    "precipitacion": "0.00",
    "viento_velocidad": "2.50",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-08",
    "tickets_dia": 1,
    "ventas_dia": "764.40",
    "ticket_promedio_dia": "764.40",
    "temperatura_media": "23.70",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-08-07",
    "tickets_dia": 1,
    "ventas_dia": "630.80",
    "ticket_promedio_dia": "630.80",
    "temperatura_media": "25.00",
    "precipitacion": "0.00",
    "viento_velocidad": "2.80",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-08-06",
    "tickets_dia": 1,
    "ventas_dia": "839.70",
    "ticket_promedio_dia": "839.70",
    "temperatura_media": "26.20",
    "precipitacion": "0.00",
    "viento_velocidad": "3.10",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-05",
    "tickets_dia": 1,
    "ventas_dia": "618.90",
    "ticket_promedio_dia": "618.90",
    "temperatura_media": "27.40",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-04",
    "tickets_dia": 1,
    "ventas_dia": "730.90",
    "ticket_promedio_dia": "730.90",
    "temperatura_media": "27.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.90",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-03",
    "tickets_dia": 1,
    "ventas_dia": "430.10",
    "ticket_promedio_dia": "430.10",
    "temperatura_media": "27.20",
    "precipitacion": "0.00",
    "viento_velocidad": "3.90",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-02",
    "tickets_dia": 1,
    "ventas_dia": "612.10",
    "ticket_promedio_dia": "612.10",
    "temperatura_media": "28.80",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-08-01",
    "tickets_dia": 1,
    "ventas_dia": "1207.10",
    "ticket_promedio_dia": "1207.10",
    "temperatura_media": "28.00",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-31",
    "tickets_dia": 1,
    "ventas_dia": "892.10",
    "ticket_promedio_dia": "892.10",
    "temperatura_media": "28.70",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-30",
    "tickets_dia": 1,
    "ventas_dia": "934.00",
    "ticket_promedio_dia": "934.00",
    "temperatura_media": "28.80",
    "precipitacion": "0.00",
    "viento_velocidad": "3.10",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-29",
    "tickets_dia": 1,
    "ventas_dia": "426.90",
    "ticket_promedio_dia": "426.90",
    "temperatura_media": "25.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-28",
    "tickets_dia": 1,
    "ventas_dia": "563.50",
    "ticket_promedio_dia": "563.50",
    "temperatura_media": "28.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-26",
    "tickets_dia": 1,
    "ventas_dia": "419.70",
    "ticket_promedio_dia": "419.70",
    "temperatura_media": "28.80",
    "precipitacion": "0.00",
    "viento_velocidad": "3.10",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-25",
    "tickets_dia": 1,
    "ventas_dia": "773.60",
    "ticket_promedio_dia": "773.60",
    "temperatura_media": "26.80",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-24",
    "tickets_dia": 1,
    "ventas_dia": "429.90",
    "ticket_promedio_dia": "429.90",
    "temperatura_media": "26.30",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-23",
    "tickets_dia": 1,
    "ventas_dia": "585.80",
    "ticket_promedio_dia": "585.80",
    "temperatura_media": "25.40",
    "precipitacion": "0.00",
    "viento_velocidad": "4.70",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-22",
    "tickets_dia": 1,
    "ventas_dia": "386.40",
    "ticket_promedio_dia": "386.40",
    "temperatura_media": "25.20",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-21",
    "tickets_dia": 1,
    "ventas_dia": "610.60",
    "ticket_promedio_dia": "610.60",
    "temperatura_media": "25.20",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-19",
    "tickets_dia": 1,
    "ventas_dia": "588.20",
    "ticket_promedio_dia": "588.20",
    "temperatura_media": "26.50",
    "precipitacion": "0.00",
    "viento_velocidad": "4.70",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-18",
    "tickets_dia": 1,
    "ventas_dia": "922.00",
    "ticket_promedio_dia": "922.00",
    "temperatura_media": "27.00",
    "precipitacion": "0.00",
    "viento_velocidad": "5.80",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-17",
    "tickets_dia": 1,
    "ventas_dia": "509.30",
    "ticket_promedio_dia": "509.30",
    "temperatura_media": "30.00",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-16",
    "tickets_dia": 1,
    "ventas_dia": "1283.25",
    "ticket_promedio_dia": "1283.25",
    "temperatura_media": "27.10",
    "precipitacion": "0.00",
    "viento_velocidad": "3.90",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-15",
    "tickets_dia": 1,
    "ventas_dia": "649.55",
    "ticket_promedio_dia": "649.55",
    "temperatura_media": "27.80",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-14",
    "tickets_dia": 1,
    "ventas_dia": "574.10",
    "ticket_promedio_dia": "574.10",
    "temperatura_media": "28.10",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-12",
    "tickets_dia": 1,
    "ventas_dia": "755.70",
    "ticket_promedio_dia": "755.70",
    "temperatura_media": "23.20",
    "precipitacion": "0.00",
    "viento_velocidad": "5.00",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-07-11",
    "tickets_dia": 1,
    "ventas_dia": "1729.00",
    "ticket_promedio_dia": "1729.00",
    "temperatura_media": "21.60",
    "precipitacion": "0.00",
    "viento_velocidad": "5.60",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-07-10",
    "tickets_dia": 1,
    "ventas_dia": "818.15",
    "ticket_promedio_dia": "818.15",
    "temperatura_media": "23.80",
    "precipitacion": "0.00",
    "viento_velocidad": "4.40",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-07-09",
    "tickets_dia": 1,
    "ventas_dia": "642.20",
    "ticket_promedio_dia": "642.20",
    "temperatura_media": "24.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.90",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-07-08",
    "tickets_dia": 1,
    "ventas_dia": "452.10",
    "ticket_promedio_dia": "452.10",
    "temperatura_media": "24.00",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clouds"
  },
  {
    "fecha_venta": "2025-07-07",
    "tickets_dia": 1,
    "ventas_dia": "518.00",
    "ticket_promedio_dia": "518.00",
    "temperatura_media": "27.90",
    "precipitacion": "0.00",
    "viento_velocidad": "3.90",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-05",
    "tickets_dia": 1,
    "ventas_dia": "525.60",
    "ticket_promedio_dia": "525.60",
    "temperatura_media": "25.80",
    "precipitacion": "0.00",
    "viento_velocidad": "3.30",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-04",
    "tickets_dia": 1,
    "ventas_dia": "1023.70",
    "ticket_promedio_dia": "1023.70",
    "temperatura_media": "26.20",
    "precipitacion": "0.00",
    "viento_velocidad": "4.20",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-03",
    "tickets_dia": 1,
    "ventas_dia": "614.00",
    "ticket_promedio_dia": "614.00",
    "temperatura_media": "27.00",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-02",
    "tickets_dia": 1,
    "ventas_dia": "1354.95",
    "ticket_promedio_dia": "1354.95",
    "temperatura_media": "30.00",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-07-01",
    "tickets_dia": 1,
    "ventas_dia": "413.60",
    "ticket_promedio_dia": "413.60",
    "temperatura_media": "31.60",
    "precipitacion": "0.00",
    "viento_velocidad": "3.60",
    "condicion_principal": "Clear"
  },
  {
    "fecha_venta": "2025-06-30",
    "tickets_dia": 1,
    "ventas_dia": "579.50",
    "ticket_promedio_dia": "579.50",
    "temperatura_media": "31.90",
    "precipitacion": "0.00",
    "viento_velocidad": "2.80",
    "condicion_principal": "Clear"
  }
]
- 4.2 Resumen cobertura clima vs ventas

[
  {
    "dias_totales_ventas": 543,
    "dias_con_clima": 404,
    "dias_sin_clima": 139,
    "porcentaje_cobertura_clima": "74.40",
    "ventas_totales": "645459.90",
    "ventas_con_clima": "519396.30",
    "porcentaje_ventas_con_clima": "80.47"
  }
]

-- =====================================
-- PASO 5: DETECCIÓN DE PROBLEMAS
-- =====================================

-- 5.1 Días sin ventas (gaps en datos)

[
  {
    "fecha_sin_ventas": "2025-08-24",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-08-17",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-08-10",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-07-27",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-07-20",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-07-13",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-07-06",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-06-29",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-06-22",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-06-15",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  },
  {
    "fecha_sin_ventas": "2025-06-08",
    "dia_semana_num": "0",
    "dia_semana_nombre": "Domingo"
  }
]

-- 5.2 Tickets con datos anómalos

[
  {
    "fecha_venta": "2025-08-25",
    "id_externo": "0101-0024582",
    "sistema_origen": "numier",
    "total_bruto": "1.90",
    "ticket_medio": "1.90",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-23",
    "id_externo": "IMP_2025-08-23_1383fd78",
    "sistema_origen": "import_manual",
    "total_bruto": "301.60",
    "ticket_medio": "20.11",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-22",
    "id_externo": "IMP_2025-08-22_dbf1d964",
    "sistema_origen": "import_manual",
    "total_bruto": "522.90",
    "ticket_medio": "34.86",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-21",
    "id_externo": "IMP_2025-08-21_254b075c",
    "sistema_origen": "import_manual",
    "total_bruto": "750.90",
    "ticket_medio": "34.13",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-20",
    "id_externo": "IMP_2025-08-20_5635175b",
    "sistema_origen": "import_manual",
    "total_bruto": "498.20",
    "ticket_medio": "26.22",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-19",
    "id_externo": "IMP_2025-08-19_df1d82e6",
    "sistema_origen": "import_manual",
    "total_bruto": "239.50",
    "ticket_medio": "19.96",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-18",
    "id_externo": "IMP_2025-08-18_527214cb",
    "sistema_origen": "import_manual",
    "total_bruto": "503.15",
    "ticket_medio": "29.60",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-16",
    "id_externo": "IMP_2025-08-16_3e5b8ba9",
    "sistema_origen": "import_manual",
    "total_bruto": "496.40",
    "ticket_medio": "41.37",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-15",
    "id_externo": "IMP_2025-08-15_1f7b864c",
    "sistema_origen": "import_manual",
    "total_bruto": "521.30",
    "ticket_medio": "23.70",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-14",
    "id_externo": "IMP_2025-08-14_7c214564",
    "sistema_origen": "import_manual",
    "total_bruto": "381.80",
    "ticket_medio": "25.45",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-13",
    "id_externo": "IMP_2025-08-13_2dd923fc",
    "sistema_origen": "import_manual",
    "total_bruto": "281.50",
    "ticket_medio": "20.11",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-12",
    "id_externo": "IMP_2025-08-12_db80d9c3",
    "sistema_origen": "import_manual",
    "total_bruto": "250.30",
    "ticket_medio": "20.86",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-11",
    "id_externo": "IMP_2025-08-11_a54a5c57",
    "sistema_origen": "import_manual",
    "total_bruto": "840.80",
    "ticket_medio": "30.03",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-09",
    "id_externo": "IMP_2025-08-09_3d0208e8",
    "sistema_origen": "import_manual",
    "total_bruto": "459.90",
    "ticket_medio": "35.38",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-08",
    "id_externo": "IMP_2025-08-08_0dec4d28",
    "sistema_origen": "import_manual",
    "total_bruto": "764.40",
    "ticket_medio": "24.66",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-07",
    "id_externo": "IMP_2025-08-07_7e9ffde8",
    "sistema_origen": "import_manual",
    "total_bruto": "630.80",
    "ticket_medio": "25.23",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-06",
    "id_externo": "IMP_2025-08-06_f1edf1df",
    "sistema_origen": "import_manual",
    "total_bruto": "839.70",
    "ticket_medio": "31.10",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-05",
    "id_externo": "IMP_2025-08-05_e78d94ac",
    "sistema_origen": "import_manual",
    "total_bruto": "618.90",
    "ticket_medio": "30.95",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-04",
    "id_externo": "IMP_2025-08-04_e1858e74",
    "sistema_origen": "import_manual",
    "total_bruto": "730.90",
    "ticket_medio": "33.22",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-03",
    "id_externo": "IMP_2025-08-03_7c0a75ef",
    "sistema_origen": "import_manual",
    "total_bruto": "430.10",
    "ticket_medio": "22.64",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-02",
    "id_externo": "IMP_2025-08-02_975883a9",
    "sistema_origen": "import_manual",
    "total_bruto": "612.10",
    "ticket_medio": "34.01",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-08-01",
    "id_externo": "IMP_2025-08-01_2560119d",
    "sistema_origen": "import_manual",
    "total_bruto": "1207.10",
    "ticket_medio": "27.43",
    "num_comensales": 0,
    "tipo_anomalia": "Venta muy alta (>1000€)"
  },
  {
    "fecha_venta": "2025-07-31",
    "id_externo": "IMP_2025-07-31_1d26f561",
    "sistema_origen": "import_manual",
    "total_bruto": "892.10",
    "ticket_medio": "29.74",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-07-30",
    "id_externo": "IMP_2025-07-30_13d695b6",
    "sistema_origen": "import_manual",
    "total_bruto": "934.00",
    "ticket_medio": "33.36",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-07-29",
    "id_externo": "IMP_2025-07-29_345c1c76",
    "sistema_origen": "import_manual",
    "total_bruto": "426.90",
    "ticket_medio": "23.72",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-07-28",
    "id_externo": "IMP_2025-07-28_b0bed472",
    "sistema_origen": "import_manual",
    "total_bruto": "563.50",
    "ticket_medio": "23.48",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  },
  {
    "fecha_venta": "2025-07-26",
    "id_externo": "IMP_2025-07-26_b42a042e",
    "sistema_origen": "import_manual",
    "total_bruto": "419.70",
    "ticket_medio": "22.09",
    "num_comensales": 0,
    "tipo_anomalia": "Comensales faltante"
  }
]

6.2 berificar vista Ml creada
[
  {
    "total_dias_datos": 543,
    "dias_con_clima": 406,
    "fecha_inicio": "2023-11-03",
    "fecha_fin": "2025-08-25",
    "ventas_promedio_dia": "1188.69",
    "tickets_promedio_dia": "1.0",
    "temp_promedio": "17.3"
  }
]
