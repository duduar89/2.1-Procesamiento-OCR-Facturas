-- Script para extraer datos directamente de Supabase
-- Ejecuta esto en Supabase Dashboard > SQL Editor

-- 1. DATOS DE VENTAS
SELECT 
    fecha,
    ventas_dia,
    tickets_dia
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
ORDER BY fecha ASC;

-- 2. DATOS DE CLIMA (ejecutar separadamente)
-- SELECT 
--     fecha,
--     temperatura_media,
--     precipitacion,
--     viento_velocidad
-- FROM correlacion_clima_ventas 
-- WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
-- ORDER BY fecha ASC;

