-- ===== FIX PARA RESTRICCIÓN DE CLAVE FORÁNEA =====

-- Eliminar la restricción de clave foránea que está causando el error
ALTER TABLE productos_embeddings 
DROP CONSTRAINT IF EXISTS productos_embeddings_producto_id_fkey;

-- Hacer el campo producto_id opcional (nullable)
ALTER TABLE productos_embeddings 
ALTER COLUMN producto_id DROP NOT NULL;

-- Verificar que el cambio se aplicó correctamente
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'productos_embeddings' 
AND column_name = 'producto_id';
