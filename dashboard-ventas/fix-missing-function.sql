-- =============================================
-- SOLUCIÓN: CREAR FUNCIÓN get_product_popularity_real FALTANTE
-- Fecha: 2025-01-30
-- Problema: La función no existe en el esquema de la base de datos
-- =============================================

-- Verificar si la función ya existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_product_popularity_real'
    ) THEN
        RAISE NOTICE 'La función get_product_popularity_real ya existe';
    ELSE
        RAISE NOTICE 'La función get_product_popularity_real NO existe - creándola...';
    END IF;
END $$;

-- Crear la función faltante
CREATE OR REPLACE FUNCTION get_product_popularity_real(
    p_restaurante_id UUID,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS TABLE (
    producto_nombre TEXT,
    tickets_unicos BIGINT,
    unidades_totales NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'Ejecutando get_product_popularity_real para restaurante: % desde % hasta %', 
                 p_restaurante_id, p_fecha_inicio, p_fecha_fin;
    
    RETURN QUERY
    WITH PrioritizedSales AS (
        -- Usar la misma lógica de priorización que get_prioritized_sales_data
        SELECT 
            vd.id,
            vd.fecha_venta
        FROM ventas_datos vd
        WHERE vd.restaurante_id = p_restaurante_id
          AND vd.fecha_venta >= p_fecha_inicio
          AND vd.fecha_venta <= p_fecha_fin
          AND vd.estado = 'completada'
    ),
    ProductPopularity AS (
        SELECT 
            vl.producto_nombre::TEXT as producto_nombre,
            COUNT(DISTINCT vl.venta_id)::BIGINT as tickets_unicos,
            SUM(vl.cantidad)::NUMERIC as unidades_totales
        FROM ventas_lineas vl
        INNER JOIN PrioritizedSales ps ON vl.venta_id = ps.id
        WHERE vl.fecha_venta >= p_fecha_inicio
          AND vl.fecha_venta <= p_fecha_fin
          AND vl.producto_nombre IS NOT NULL
          AND vl.producto_nombre != ''
        GROUP BY vl.producto_nombre
        HAVING COUNT(DISTINCT vl.venta_id) > 0
    )
    SELECT 
        pp.producto_nombre,
        pp.tickets_unicos,
        pp.unidades_totales
    FROM ProductPopularity pp
    ORDER BY pp.tickets_unicos DESC, pp.unidades_totales DESC;
    
    -- Log de resultados
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE 'Función completada. Productos devueltos: %', row_count;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION get_product_popularity_real IS 
'Obtiene la popularidad REAL de productos contando tickets únicos donde aparece cada producto. Usa la misma lógica de priorización que get_prioritized_sales_data. CREADA PARA SOLUCIONAR ERROR DE FUNCIÓN FALTANTE.';

-- Verificar que la función se creó correctamente
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_product_popularity_real'
    ) THEN
        RAISE NOTICE '✅ Función get_product_popularity_real creada exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: La función get_product_popularity_real NO se creó';
    END IF;
END $$;

-- Test opcional de la función (descomenta para probar)
/*
-- Test con datos de ejemplo
SELECT 'TESTING get_product_popularity_real...' as test_inicio;

SELECT 
    producto_nombre,
    tickets_unicos,
    unidades_totales
FROM get_product_popularity_real(
    '2852b1af-38d8-43ec-8872-2b2921d5a231'::UUID,  -- restaurante_id típico
    CURRENT_DATE - INTERVAL '1 day',                -- ayer
    CURRENT_DATE                                     -- hoy
)
LIMIT 5;

SELECT 'Test completado' as test_fin;
*/

-- Crear función alternativa si la principal falla
CREATE OR REPLACE FUNCTION get_product_metrics(
    p_restaurante_id UUID,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS TABLE (
    producto_nombre TEXT,
    tickets_unicos BIGINT,
    unidades_totales NUMERIC,
    importe_total NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'Ejecutando get_product_metrics (función alternativa)';
    
    RETURN QUERY
    SELECT 
        pt.nombre::TEXT as producto_nombre,
        COALESCE(pt.veces_vendido, 0)::BIGINT as tickets_unicos,
        COALESCE(pt.veces_vendido, 0)::NUMERIC as unidades_totales,
        COALESCE(pt.importe, 0)::NUMERIC as importe_total
    FROM (
        SELECT 
            vl.producto_nombre as nombre,
            COUNT(DISTINCT vl.venta_id) as veces_vendido,
            SUM(vl.cantidad * vl.precio_unitario) as importe
        FROM ventas_lineas vl
        INNER JOIN ventas_datos vd ON vl.venta_id = vd.id
        WHERE vd.restaurante_id = p_restaurante_id
          AND vd.fecha_venta >= p_fecha_inicio
          AND vd.fecha_venta <= p_fecha_fin
          AND vd.estado = 'completada'
        GROUP BY vl.producto_nombre
    ) pt
    ORDER BY pt.importe DESC;
END;
$$;

COMMENT ON FUNCTION get_product_metrics IS 
'Función alternativa para obtener métricas de productos cuando get_product_popularity_real no está disponible.';

-- Verificación final
SELECT 
    'get_product_popularity_real' as funcion,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_product_popularity_real') 
         THEN '✅ Existe' 
         ELSE '❌ No existe' 
    END as estado
UNION ALL
SELECT 
    'get_product_metrics' as funcion,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_product_metrics') 
         THEN '✅ Existe' 
         ELSE '❌ No existe' 
    END as estado;

-- Ejemplo de uso exitoso
SELECT 'Ejemplos de uso:' as info;
SELECT '-- SELECT * FROM get_product_popularity_real(''2852b1af-38d8-43ec-8872-2b2921d5a231'', ''2025-08-29'', ''2025-08-29'');' as ejemplo1;
SELECT '-- SELECT * FROM get_product_metrics(''2852b1af-38d8-43ec-8872-2b2921d5a231'', ''2025-08-29'', ''2025-08-29'');' as ejemplo2;
