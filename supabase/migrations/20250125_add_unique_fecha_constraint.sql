-- Agregar constraint único para permitir enriquecimiento por fecha
-- Esto permite que el upsert funcione correctamente con onConflict: 'restaurante_id, fecha_venta'

-- Primero, eliminar duplicados existentes si los hay (mantener el más reciente)
WITH duplicados AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY restaurante_id, fecha_venta 
      ORDER BY created_at DESC
    ) as rn
  FROM ventas_datos
)
DELETE FROM ventas_datos 
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);

-- Crear el constraint único
ALTER TABLE ventas_datos 
ADD CONSTRAINT ventas_datos_restaurante_fecha_unique 
UNIQUE (restaurante_id, fecha_venta);

-- Comentario explicativo
COMMENT ON CONSTRAINT ventas_datos_restaurante_fecha_unique ON ventas_datos IS 
'Permite enriquecimiento de datos por fecha: si existe la fecha, actualiza; si no existe, crea nuevo registro';
