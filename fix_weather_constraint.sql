-- Eliminar la restricción problemática si existe
ALTER TABLE weather_data 
DROP CONSTRAINT IF EXISTS unique_current_weather;

-- Eliminar todos los registros duplicados actuales
-- Mantener solo el más reciente por restaurante
DELETE FROM weather_data 
WHERE es_actual = true 
AND id NOT IN (
    SELECT DISTINCT ON (restaurante_id) id
    FROM weather_data 
    WHERE es_actual = true 
    ORDER BY restaurante_id, created_at DESC
);

-- Crear una nueva restricción única más simple
-- Solo un registro actual por restaurante
CREATE UNIQUE INDEX IF NOT EXISTS unique_current_weather_per_restaurant 
ON weather_data (restaurante_id) 
WHERE es_actual = true;

-- Verificar que la tabla esté limpia
SELECT 
    restaurante_id,
    COUNT(*) as count,
    MAX(created_at) as latest
FROM weather_data 
WHERE es_actual = true
GROUP BY restaurante_id
HAVING COUNT(*) > 1;
