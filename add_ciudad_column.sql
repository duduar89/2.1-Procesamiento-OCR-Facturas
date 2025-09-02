-- 1. Agregar columna ciudad a la tabla weather_data
ALTER TABLE weather_data 
ADD COLUMN IF NOT EXISTS ciudad TEXT;

-- 2. Verificar datos del restaurante
SELECT id, nombre, ciudad, latitud, longitud 
FROM restaurantes 
WHERE id = '2852b1af-38d8-43ec-8872-2b2921d5a231';

-- 3. Si el restaurante no tiene ciudad configurada, actualizarla basándose en las coordenadas
-- Las coordenadas 37.2614, -6.9447 corresponden a Huelva
UPDATE restaurantes 
SET ciudad = 'Huelva'
WHERE id = '2852b1af-38d8-43ec-8872-2b2921d5a231' 
AND (ciudad IS NULL OR ciudad = '');

-- 4. Actualizar registros existentes de clima con la ciudad correcta
UPDATE weather_data 
SET ciudad = (
    SELECT ciudad 
    FROM restaurantes 
    WHERE restaurantes.id = weather_data.restaurante_id
)
WHERE ciudad IS NULL;
