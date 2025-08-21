-- =============================================
-- FUNCIONES RPC PARA DASHBOARD DE VENTAS
-- Solo crea las funciones necesarias, NO toca tablas existentes
-- =============================================

-- 1. FUNCIÓN RPC PARA OBTENER MÉTRICAS DE PRODUCTOS
CREATE OR REPLACE FUNCTION get_product_metrics(
    restaurante_uuid UUID,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    nombre TEXT,
    categoria TEXT,
    importe_total DECIMAL(12,2),
    veces_vendido BIGINT,
    cantidad_total DECIMAL(12,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.producto_nombre::TEXT as nombre,
        COALESCE(
            CASE 
                WHEN vl.categoria_nombre != '' AND vl.categoria_nombre IS NOT NULL 
                THEN vl.categoria_nombre
                ELSE 'Sin categoría'
            END,
            'Sin categoría'
        )::TEXT as categoria,
        SUM(vl.precio_total)::DECIMAL(12,2) as importe_total,
        COUNT(DISTINCT vl.venta_id)::BIGINT as veces_vendido,
        SUM(vl.cantidad)::DECIMAL(12,2) as cantidad_total
    FROM ventas_lineas vl
    JOIN ventas v ON vl.venta_id = v.id
    WHERE v.restaurante_id = restaurante_uuid
        AND vl.fecha_venta >= fecha_inicio_param
        AND vl.fecha_venta <= fecha_fin_param
        AND v.estado = 'completada'
    GROUP BY vl.producto_nombre, vl.categoria_nombre
    ORDER BY importe_total DESC;
END;
$$;

-- 2. FUNCIÓN RPC PARA OBTENER MÉTRICAS GENERALES DEL DASHBOARD
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    restaurante_uuid UUID,
    fecha_inicio_param DATE,
    fecha_fin_param DATE
)
RETURNS TABLE (
    total_ventas DECIMAL(12,2),
    total_tickets BIGINT,
    ticket_promedio DECIMAL(10,2),
    total_comensales BIGINT,
    crecimiento_vs_anterior DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    periodo_actual DECIMAL(12,2);
    periodo_anterior DECIMAL(12,2);
    dias_periodo INTEGER;
BEGIN
    -- Calcular métricas del período actual
    SELECT 
        COALESCE(SUM(total_venta), 0),
        COUNT(*),
        COALESCE(AVG(total_venta), 0),
        COALESCE(SUM(comensales), 0)
    INTO 
        periodo_actual,
        total_tickets,
        ticket_promedio,
        total_comensales
    FROM ventas 
    WHERE restaurante_id = restaurante_uuid
        AND fecha >= fecha_inicio_param
        AND fecha <= fecha_fin_param
        AND estado = 'completada';
    
    total_ventas := periodo_actual;
    
    -- Calcular período anterior para comparación
    dias_periodo := fecha_fin_param - fecha_inicio_param + 1;
    
    SELECT COALESCE(SUM(total_venta), 0)
    INTO periodo_anterior
    FROM ventas 
    WHERE restaurante_id = restaurante_uuid
        AND fecha >= (fecha_inicio_param - dias_periodo)
        AND fecha < fecha_inicio_param
        AND estado = 'completada';
    
    -- Calcular crecimiento porcentual
    IF periodo_anterior > 0 THEN
        crecimiento_vs_anterior := ((periodo_actual - periodo_anterior) / periodo_anterior) * 100;
    ELSE
        crecimiento_vs_anterior := 0;
    END IF;
    
    RETURN NEXT;
END;
$$;

-- 3. VERIFICAR QUE LAS FUNCIONES SE CREARON CORRECTAMENTE
SELECT 'get_product_metrics creada correctamente' as status;
SELECT 'get_dashboard_metrics creada correctamente' as status;
