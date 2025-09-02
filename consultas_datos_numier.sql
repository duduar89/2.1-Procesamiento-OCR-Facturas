-- =============================================
-- CONSULTAS PARA VER DATOS DE NUMIER TPV
-- =============================================

-- 1. VER CONFIGURACIÓN DE NUMIER PARA UN RESTAURANTE
SELECT 
    id,
    nombre,
    integraciones->'numier' as numier_config
FROM restaurantes 
WHERE id = '2852b1af-38d8-43ec-8872-2b2921d5a231';

-- 2. VER ÚLTIMAS VENTAS SINCRONIZADAS
SELECT 
    fecha_venta,
    id_externo,
    tpv_nombre,
    total_bruto,
    total_neto,
    num_comensales,
    ticket_medio,
    sistema_origen,
    fecha_hora_completa,
    created_at
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
ORDER BY fecha_venta DESC, created_at DESC
LIMIT 20;

-- 3. RESUMEN DIARIO DE VENTAS NUMIER
SELECT 
    fecha_venta,
    COUNT(*) as num_tickets,
    SUM(total_bruto) as total_bruto,
    SUM(total_neto) as total_neto,
    AVG(total_bruto) as ticket_promedio,
    SUM(num_comensales) as total_comensales,
    AVG(ticket_medio) as ticket_medio_promedio
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
  AND fecha_venta >= '2025-01-20'
GROUP BY fecha_venta
ORDER BY fecha_venta DESC;

-- 4. VER LÍNEAS DE VENTA (PRODUCTOS VENDIDOS)
SELECT 
    vd.fecha_venta,
    vd.id_externo as ticket,
    vl.producto_nombre,
    vl.categoria_nombre,
    vl.cantidad,
    vl.precio_unitario,
    vl.precio_total
FROM ventas_datos vd
JOIN ventas_lineas vl ON vd.id = vl.venta_id
WHERE vd.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND vd.sistema_origen = 'numier'
  AND vd.fecha_venta >= '2025-01-24'
ORDER BY vd.fecha_venta DESC, vd.id_externo, vl.id
LIMIT 50;

-- 5. PRODUCTOS MÁS VENDIDOS (ÚLTIMOS 7 DÍAS)
SELECT 
    vl.producto_nombre,
    vl.categoria_nombre,
    COUNT(*) as veces_vendido,
    SUM(vl.cantidad) as cantidad_total,
    SUM(vl.precio_total) as ingresos_totales,
    AVG(vl.precio_unitario) as precio_promedio
FROM ventas_datos vd
JOIN ventas_lineas vl ON vd.id = vl.venta_id
WHERE vd.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND vd.sistema_origen = 'numier'
  AND vd.fecha_venta >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY vl.producto_nombre, vl.categoria_nombre
ORDER BY cantidad_total DESC, ingresos_totales DESC
LIMIT 20;

-- 6. ANÁLISIS POR TPV
SELECT 
    tpv_nombre,
    tpv_id,
    COUNT(*) as num_tickets,
    SUM(total_bruto) as total_ventas,
    AVG(total_bruto) as ticket_promedio,
    MIN(fecha_venta) as primera_venta,
    MAX(fecha_venta) as ultima_venta
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
GROUP BY tpv_nombre, tpv_id
ORDER BY total_ventas DESC;

-- 7. VENTAS POR FRANJA HORARIA
SELECT 
    EXTRACT(HOUR FROM fecha_hora_completa::timestamp) as hora,
    COUNT(*) as num_tickets,
    SUM(total_bruto) as total_ventas,
    AVG(total_bruto) as ticket_promedio
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
  AND fecha_venta >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM fecha_hora_completa::timestamp)
ORDER BY hora;

-- 8. COMPARATIVA ENTRE SISTEMAS (si hay datos de ambos)
SELECT 
    sistema_origen,
    COUNT(*) as num_tickets,
    SUM(total_bruto) as total_ventas,
    AVG(total_bruto) as ticket_promedio,
    MIN(fecha_venta) as primera_venta,
    MAX(fecha_venta) as ultima_venta
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
GROUP BY sistema_origen
ORDER BY total_ventas DESC;

-- 9. DATOS ORIGINALES COMPLETOS DE NUMIER (SAMPLE)
SELECT 
    id_externo,
    fecha_venta,
    total_bruto,
    datos_originales
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
ORDER BY created_at DESC
LIMIT 5;

-- 10. VERIFICAR INCONSISTENCIAS EN DATOS
SELECT 
    'Ventas sin líneas' as tipo_problema,
    COUNT(*) as cantidad
FROM ventas_datos vd
LEFT JOIN ventas_lineas vl ON vd.id = vl.venta_id
WHERE vd.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND vd.sistema_origen = 'numier'
  AND vl.id IS NULL

UNION ALL

SELECT 
    'Tickets con total 0' as tipo_problema,
    COUNT(*) as cantidad
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
  AND (total_bruto = 0 OR total_bruto IS NULL)

UNION ALL

SELECT 
    'Tickets duplicados por fecha' as tipo_problema,
    COUNT(*) as cantidad
FROM (
    SELECT id_externo, fecha_venta
    FROM ventas_datos 
    WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
      AND sistema_origen = 'numier'
    GROUP BY id_externo, fecha_venta
    HAVING COUNT(*) > 1
) duplicados;
