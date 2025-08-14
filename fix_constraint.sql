-- SOLUCIÓN: Permitir precios negativos para descuentos
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar la restricción actual
ALTER TABLE productos_extraidos 
DROP CONSTRAINT IF EXISTS productos_precios_coherentes;

-- 2. Crear nueva restricción que permite descuentos (precios negativos)
ALTER TABLE productos_extraidos 
ADD CONSTRAINT productos_precios_coherentes CHECK (
    -- Permitir precios negativos para descuentos
    (precio_unitario_sin_iva IS NULL OR precio_unitario_sin_iva IS NOT NULL) AND
    (precio_total_linea_sin_iva IS NULL OR precio_total_linea_sin_iva IS NOT NULL) AND
    -- Solo verificar que no sean campos inválidos (como NaN)
    (precio_unitario_sin_iva IS NULL OR precio_unitario_sin_iva = precio_unitario_sin_iva) AND
    (precio_total_linea_sin_iva IS NULL OR precio_total_linea_sin_iva = precio_total_linea_sin_iva)
);

-- 3. ALTERNATIVA: Si quieres ser más específico
-- Comentario: Podrías usar esta restricción más específica si prefieres:
/*
ALTER TABLE productos_extraidos 
ADD CONSTRAINT productos_precios_coherentes CHECK (
    -- Permitir precios negativos solo si la descripción contiene "descuento"
    (precio_unitario_sin_iva IS NULL OR 
     precio_unitario_sin_iva >= 0 OR 
     LOWER(descripcion_original) LIKE '%descuento%' OR
     LOWER(descripcion_original) LIKE '%rappel%' OR
     LOWER(descripcion_original) LIKE '%devolucion%'
    ) AND
    (precio_total_linea_sin_iva IS NULL OR 
     precio_total_linea_sin_iva >= 0 OR
     LOWER(descripcion_original) LIKE '%descuento%' OR
     LOWER(descripcion_original) LIKE '%rappel%' OR
     LOWER(descripcion_original) LIKE '%devolucion%'
    )
);
*/
