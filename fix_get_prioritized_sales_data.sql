-- =============================================
-- CORRECCIÓN CRÍTICA: get_prioritized_sales_data
-- PROBLEMA: Filtra mal por día, excluye tickets legítimos de Numier
-- SOLUCIÓN: Incluir TODOS los tickets de Numier + datos manuales solo si no hay Numier
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
    ticket_medio NUMERIC,
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
          -- Excluir importaciones manuales con valor 0
          AND NOT (
              vd.sistema_origen = 'import_manual' 
              AND (vd.total_bruto = 0 OR vd.total_bruto IS NULL)
          )
    ),
    DaysWithNumierData AS (
        -- NUEVO: Identificar qué días tienen datos de Numier
        SELECT DISTINCT asr.fecha_venta
        FROM AllSalesInRange asr
        WHERE asr.sistema_origen = 'numier'
    )
    -- ✅ NUEVA LÓGICA: Incluir TODOS los tickets de Numier + manuales solo en días sin Numier
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
        asr.ticket_medio,
        asr.metodo_pago,
        asr.metodos_pago,
        asr.datos_originales,
        asr.datos_procesados,
        asr.estado,
        asr.created_at,
        asr.updated_at,
        asr.procesado_por
    FROM AllSalesInRange asr
    WHERE 
        -- ✅ INCLUIR TODOS los tickets de Numier (sin filtrar por día)
        (asr.sistema_origen = 'numier')
        OR
        -- ✅ INCLUIR datos manuales SOLO en días que NO tienen Numier
        (
            asr.sistema_origen = 'import_manual' 
            AND NOT EXISTS (
                SELECT 1 FROM DaysWithNumierData dwnd 
                WHERE dwnd.fecha_venta = asr.fecha_venta
            )
        )
    ORDER BY asr.fecha_hora_completa;
END;
$$;

-- Comentario de la corrección
COMMENT ON FUNCTION get_prioritized_sales_data IS 
'CORREGIDA - Incluye TODOS los tickets de Numier sin filtrar por día. Solo usa datos manuales en días sin Numier.';

-- =============================================
-- VERIFICACIÓN: Después de aplicar, ejecutar:
-- SELECT fecha_venta, sistema_origen, COUNT(*) as tickets, SUM(total_bruto) as total
-- FROM get_prioritized_sales_data('2852b1af-38d8-43ec-8872-2b2921d5a231', '2025-08-25', '2025-08-27')
-- GROUP BY fecha_venta, sistema_origen
-- ORDER BY fecha_venta, sistema_origen;
-- =============================================
