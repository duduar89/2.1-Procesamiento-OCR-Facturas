-- =============================================
-- CORRECCIÓN V2: get_prioritized_sales_data
-- SOLUCIÓN: Sin ambigüedades y lógica simplificada
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
    -- ✅ LÓGICA SIMPLIFICADA: Incluir TODOS los datos de Numier
    -- + datos manuales solo para días que NO tienen Numier
    SELECT
        vd.id,
        vd.restaurante_id,
        vd.sistema_origen,
        vd.id_externo,
        vd.referencia_externa,
        vd.fecha_venta,
        vd.fecha_hora_completa,
        vd.tpv_id,
        vd.tpv_nombre,
        vd.seccion,
        vd.num_comensales,
        vd.mesa,
        vd.cliente_id,
        vd.cliente_nombre,
        vd.total_bruto,
        vd.total_neto,
        vd.total_impuestos,
        vd.descuentos,
        vd.propinas,
        vd.ticket_medio,
        vd.metodo_pago,
        vd.metodos_pago,
        vd.datos_originales,
        vd.datos_procesados,
        vd.estado,
        vd.created_at,
        vd.updated_at,
        vd.procesado_por
    FROM ventas_datos vd
    WHERE vd.restaurante_id = p_restaurante_id
      AND (
          -- Ventas del período exacto solicitado
          (vd.fecha_venta >= p_fecha_inicio AND vd.fecha_venta <= p_fecha_fin)
          OR
          -- Ventas nocturnas del día siguiente (hasta las 06:00h)
          (vd.fecha_venta = p_fecha_fin + INTERVAL '1 day' 
           AND vd.fecha_hora_completa IS NOT NULL 
           AND EXTRACT(HOUR FROM vd.fecha_hora_completa) <= 6)
      )
      -- EXCLUSIONES AUTOMÁTICAS:
      AND NOT (
          vd.sistema_origen = 'import_manual' 
          AND (vd.total_bruto = 0 OR vd.total_bruto IS NULL)
      )
      AND (
          -- ✅ INCLUIR TODOS los tickets de Numier
          vd.sistema_origen = 'numier'
          OR
          -- ✅ INCLUIR datos manuales SOLO en días que NO tienen Numier
          (
              vd.sistema_origen = 'import_manual' 
              AND NOT EXISTS (
                  SELECT 1 FROM ventas_datos vd2 
                  WHERE vd2.restaurante_id = p_restaurante_id
                    AND vd2.fecha_venta = vd.fecha_venta
                    AND vd2.sistema_origen = 'numier'
              )
          )
      )
    ORDER BY vd.fecha_hora_completa;
END;
$$;

-- Comentario de la corrección
COMMENT ON FUNCTION get_prioritized_sales_data IS 
'V2 CORREGIDA - Sin ambigüedades. Incluye TODOS los tickets de Numier sin filtrar por día. Solo usa datos manuales en días sin Numier.';

-- =============================================
-- VERIFICACIÓN: Después de aplicar, ejecutar:
-- SELECT fecha_venta, sistema_origen, COUNT(*) as tickets, SUM(total_bruto) as total
-- FROM get_prioritized_sales_data('2852b1af-38d8-43ec-8872-2b2921d5a231', '2025-08-25', '2025-08-27')
-- GROUP BY fecha_venta, sistema_origen
-- ORDER BY fecha_venta, sistema_origen;
-- =============================================
