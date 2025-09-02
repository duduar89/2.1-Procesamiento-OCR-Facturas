-- =============================================
-- ACTUALIZACIÓN: Función get_prioritized_sales_data con ticket_medio
-- Fecha: 2025-01-24
-- Propósito: Incluir la nueva columna ticket_medio en la función RPC
-- =============================================

CREATE OR REPLACE FUNCTION get_prioritized_sales_data(
    p_restaurante_id UUID,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS TABLE (
    id UUID,
    restaurante_id UUID,
    sistema_origen VARCHAR,
    id_externo VARCHAR,
    referencia_externa VARCHAR,
    fecha_venta DATE,
    fecha_hora_completa TIMESTAMPTZ,
    tpv_id VARCHAR,
    tpv_nombre VARCHAR,
    seccion VARCHAR,
    num_comensales INT,
    mesa VARCHAR,
    cliente_id VARCHAR,
    cliente_nombre VARCHAR,
    total_bruto NUMERIC,
    total_neto NUMERIC,
    total_impuestos NUMERIC,
    descuentos NUMERIC,
    propinas NUMERIC,
    ticket_medio NUMERIC,  -- ✅ NUEVA COLUMNA
    metodo_pago VARCHAR,
    metodos_pago JSONB,
    datos_originales JSONB,
    datos_procesados JSONB,
    estado VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    procesado_por UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ExtendedDateRange AS (
        -- Extender el rango para incluir ventas nocturnas del día siguiente
        SELECT 
            p_fecha_inicio as start_date,
            p_fecha_fin + INTERVAL '1 day' as end_date_extended
    ),
    AllSalesInRange AS (
        -- Obtener todas las ventas en el rango extendido
        SELECT 
            vd.*,
            EXTRACT(HOUR FROM vd.fecha_hora_completa) as sale_hour
        FROM ventas_datos vd, ExtendedDateRange edr
        WHERE vd.restaurante_id = p_restaurante_id
          AND (
              -- Ventas del período exacto solicitado
              (vd.fecha_venta >= edr.start_date AND vd.fecha_venta <= p_fecha_fin)
              OR
              -- Ventas nocturnas del día siguiente (hasta las 06:00h)
              (vd.fecha_venta = p_fecha_fin + INTERVAL '1 day' 
               AND vd.fecha_hora_completa IS NOT NULL 
               AND EXTRACT(HOUR FROM vd.fecha_hora_completa) <= 6)
          )
          -- EXCLUSIONES AUTOMÁTICAS:
          -- Excluir importaciones manuales con valor 0 si hay datos TPV del mismo día
          AND NOT (
              vd.sistema_origen = 'import_manual' 
              AND (vd.total_bruto = 0 OR vd.total_bruto IS NULL)
              AND EXISTS (
                  SELECT 1 FROM ventas_datos vd2 
                  WHERE vd2.restaurante_id = p_restaurante_id 
                    AND vd2.fecha_venta = vd.fecha_venta 
                    AND vd2.sistema_origen = 'numier'
              )
          )
    ),
    PrioritizedSource AS (
        -- Para cada día, determinar cuál es la fuente de datos prioritaria
        SELECT
            asr.fecha_venta,
            MIN(CASE 
                WHEN asr.sistema_origen = 'numier' THEN 1
                ELSE 2 
            END) as priority
        FROM AllSalesInRange asr
        GROUP BY asr.fecha_venta
    )
    -- Seleccionar solo los registros con la fuente prioritaria por día
    SELECT
        asr.id,
        asr.restaurante_id,
        asr.sistema_origen,
        asr.id_externo,
        asr.referencia_externa,
        asr.fecha_venta,
        asr.fecha_hora_completa,
        asr.tpv_id,
        asr.tpv_nombre,
        asr.seccion,
        asr.num_comensales,
        asr.mesa,
        asr.cliente_id,
        asr.cliente_nombre,
        asr.total_bruto,
        asr.total_neto,
        asr.total_impuestos,
        asr.descuentos,
        asr.propinas,
        asr.ticket_medio,  -- ✅ INCLUIR NUEVA COLUMNA
        asr.metodo_pago,
        asr.metodos_pago,
        asr.datos_originales,
        asr.datos_procesados,
        asr.estado,
        asr.created_at,
        asr.updated_at,
        asr.procesado_por
    FROM
        AllSalesInRange asr
    JOIN
        PrioritizedSource ps ON asr.fecha_venta = ps.fecha_venta
    WHERE
        -- Solo incluir registros de la fuente prioritaria
        (
            (ps.priority = 1 AND asr.sistema_origen = 'numier')
            OR
            (ps.priority = 2 AND asr.sistema_origen = 'import_manual')
        )
    ORDER BY asr.fecha_hora_completa;
END;
$$;

-- Comentario de la actualización
COMMENT ON FUNCTION get_prioritized_sales_data IS 
'Función actualizada para incluir ticket_medio. Prioriza TPV oficial sobre importaciones manuales y permite usar ticket medio precalculado cuando esté disponible.';
