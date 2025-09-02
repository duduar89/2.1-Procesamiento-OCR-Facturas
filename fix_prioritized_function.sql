-- =============================================
-- CORRECCIÓN: get_prioritized_sales_data
-- PROBLEMA: Solo devuelve 1 fuente de datos por día
-- SOLUCIÓN: Priorizar Numier pero incluir TODOS los tickets disponibles
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
    -- ✅ NUEVA LÓGICA: Verificar qué días tienen datos de Numier
    DaysWithNumierData AS (
        SELECT DISTINCT fecha_venta
        FROM AllSalesInRange 
        WHERE sistema_origen = 'numier'
    )
    -- ✅ SELECCIÓN INTELIGENTE:
    -- - Si un día tiene datos Numier: SOLO Numier para ese día
    -- - Si un día NO tiene Numier: TODOS los datos manuales para ese día
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
        -- ✅ LÓGICA CORREGIDA:
        (
            -- Caso 1: Día CON datos Numier → Solo incluir Numier
            (EXISTS (SELECT 1 FROM DaysWithNumierData dwnd WHERE dwnd.fecha_venta = asr.fecha_venta)
             AND asr.sistema_origen = 'numier')
        )
        OR
        (
            -- Caso 2: Día SIN datos Numier → Incluir datos manuales
            (NOT EXISTS (SELECT 1 FROM DaysWithNumierData dwnd WHERE dwnd.fecha_venta = asr.fecha_venta)
             AND asr.sistema_origen = 'import_manual')
        )
    ORDER BY asr.fecha_hora_completa;
END;
$$;

-- ✅ COMENTARIO EXPLICATIVO
COMMENT ON FUNCTION get_prioritized_sales_data IS 
'CORREGIDA: Prioriza Numier sobre manual, pero incluye TODOS los tickets disponibles de la fuente elegida por día. 
- Día con Numier: TODOS los tickets de Numier
- Día sin Numier: TODOS los tickets manuales
- Elimina duplicados pero mantiene múltiples tickets por día.';
