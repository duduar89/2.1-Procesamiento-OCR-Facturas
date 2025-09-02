-- Añadir columna numero_mesas a la tabla restaurantes
-- Esta columna almacenará el número de mesas de cada restaurante

ALTER TABLE restaurantes 
ADD COLUMN numero_mesas INTEGER DEFAULT NULL;

-- Añadir comentario explicativo
COMMENT ON COLUMN restaurantes.numero_mesas IS 'Número total de mesas del restaurante';

-- Opcional: Añadir constraint para valores válidos (mayor que 0)
ALTER TABLE restaurantes 
ADD CONSTRAINT chk_numero_mesas_positivo 
CHECK (numero_mesas IS NULL OR numero_mesas > 0);

-- Verificar que la columna se añadió correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'restaurantes' 
AND column_name = 'numero_mesas';

-- Ejemplo de actualización para los restaurantes existentes
-- (Descomenta y ajusta los valores según sea necesario)

/*
UPDATE restaurantes SET numero_mesas = 12 WHERE nombre = 'Bar Manolo S.L.';
UPDATE restaurantes SET numero_mesas = 25 WHERE nombre = 'Correlimos Huelva SL';
UPDATE restaurantes SET numero_mesas = 18 WHERE nombre = 'Restaurante Paco S.L.';
UPDATE restaurantes SET numero_mesas = 8 WHERE nombre = 'Pizza Roma';
*/
