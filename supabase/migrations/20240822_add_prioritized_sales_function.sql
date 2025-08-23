-- =================================================================
-- FUNCIÓN SQL: get_prioritized_sales_data
-- Descripción:
-- Esta función selecciona datos de ventas de la tabla `ventas_datos`
-- dentro de un rango de fechas para un restaurante específico.
--
-- Lógica de Priorización (Anti-duplicados):
-- 1. Para cada día dentro del rango, determina si existen ventas
--    sincronizadas desde el TPV (`sistema_origen` = 'numier').
-- 2. Si existen datos del TPV para un día, SELECCIONA ÚNICAMENTE
--    esos datos y descarta los de `import_manual`.
-- 3. Si para un día NO existen datos del TPV, entonces selecciona
--    los datos de `import_manual`.
--
-- Esto asegura que los datos oficiales del TPV siempre tengan
-- prioridad, eliminando duplicados a nivel de dashboard.
--
-- Parámetros:
-- p_restaurante_id: UUID del restaurante.
-- p_fecha_inicio: Fecha de inicio del rango.
-- p_fecha_fin: Fecha de fin del rango.
--
-- Retorna:
-- Una tabla con las mismas columnas que `ventas_datos`, pero
-- conteniendo únicamente los registros de ventas priorizados.
-- =================================================================

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
    WITH PrioritizedSource AS (
        -- Paso 1: Para cada día, determinar cuál es la fuente de datos prioritaria.
        -- 'numier' (1) tiene prioridad sobre 'import_manual' (2).
        SELECT
            vd.fecha_venta,
            MIN(CASE 
                WHEN vd.sistema_origen = 'numier' THEN 1
                ELSE 2 
            END) as priority
        FROM ventas_datos vd
        WHERE vd.restaurante_id = p_restaurante_id
          AND vd.fecha_venta >= p_fecha_inicio
          AND vd.fecha_venta <= p_fecha_fin
        GROUP BY vd.fecha_venta
    )
    -- Paso 2: Unir la tabla de ventas con la fuente prioritaria para cada día.
    SELECT
        vd.*
    FROM
        ventas_datos vd
    JOIN
        PrioritizedSource ps ON vd.fecha_venta = ps.fecha_venta
    WHERE
        vd.restaurante_id = p_restaurante_id
        AND vd.fecha_venta >= p_fecha_inicio
        AND vd.fecha_venta <= p_fecha_fin
        AND (
            -- Si la prioridad del día es 1 (numier), solo coger numier.
            (ps.priority = 1 AND vd.sistema_origen = 'numier')
            OR
            -- Si la prioridad del día es 2 (import_manual), coger import_manual.
            (ps.priority = 2 AND vd.sistema_origen = 'import_manual')
        );
END;
$$;

-- Ejemplo de uso:
-- SELECT * FROM get_prioritized_sales_data('TU_RESTAURANTE_ID', '2024-01-01', '2024-01-31');
