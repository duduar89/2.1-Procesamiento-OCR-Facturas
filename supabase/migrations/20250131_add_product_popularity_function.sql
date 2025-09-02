-- =============================================
-- FUNCIÓN RPC: get_product_popularity_real
-- Fecha: 2025-01-31
-- Propósito: Obtener la popularidad REAL de productos (tickets únicos donde aparece cada producto)
-- =============================================

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
    )
    SELECT 
        vl.producto_nombre::TEXT as producto_nombre,
        COUNT(DISTINCT vl.venta_id)::BIGINT as tickets_unicos,
        SUM(vl.cantidad)::NUMERIC as unidades_totales
    FROM ventas_lineas vl
    INNER JOIN PrioritizedSales ps ON vl.venta_id = ps.id
    WHERE vl.fecha_venta >= p_fecha_inicio
      AND vl.fecha_venta <= p_fecha_fin
    GROUP BY vl.producto_nombre
    HAVING COUNT(DISTINCT vl.venta_id) > 0
    ORDER BY tickets_unicos DESC, unidades_totales DESC;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION get_product_popularity_real IS 
'Obtiene la popularidad REAL de productos contando tickets únicos donde aparece cada producto. Usa la misma lógica de priorización que get_prioritized_sales_data.';

-- Ejemplo de uso:
-- SELECT * FROM get_product_popularity_real('2852b1af-38d8-43ec-8872-2b2921d5a231', '2025-08-29', '2025-08-29');
