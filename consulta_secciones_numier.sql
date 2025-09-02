-- =============================================
-- CONSULTA DIRECTA PARA VER SECCIONES DE NUMIER
-- =============================================

-- 1. VER TODAS LAS SECCIONES DISPONIBLES
SELECT DISTINCT 
    seccion,
    COUNT(*) as num_tickets,
    SUM(total_bruto) as total_ventas,
    AVG(total_bruto) as ticket_promedio
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
  AND fecha_venta >= '2025-01-20'
GROUP BY seccion
ORDER BY total_ventas DESC;

-- 2. ÚLTIMAS VENTAS CON SECCIÓN
SELECT 
    fecha_venta,
    fecha_hora_completa,
    id_externo,
    seccion,
    tpv_nombre,
    total_bruto,
    num_comensales,
    ticket_medio
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
ORDER BY fecha_venta DESC, fecha_hora_completa DESC
LIMIT 20;

-- 3. DATOS ORIGINALES COMPLETOS DE NUMIER
SELECT 
    id_externo,
    seccion,
    datos_originales->'Section' as section_data,
    datos_originales->'Pos' as pos_data,
    datos_originales->'Totals' as totals_data
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
ORDER BY created_at DESC
LIMIT 10;
