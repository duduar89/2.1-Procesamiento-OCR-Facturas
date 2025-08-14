-- ===== FIX PARA TABLA productos_embeddings =====

-- Añadir restricción única para evitar duplicados
-- Esto permitirá que el upsert funcione correctamente
ALTER TABLE productos_embeddings 
ADD CONSTRAINT productos_embeddings_unique 
UNIQUE (restaurante_id, descripcion_original);

-- Verificar que la restricción se añadió correctamente
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'productos_embeddings' 
AND constraint_type = 'UNIQUE';
