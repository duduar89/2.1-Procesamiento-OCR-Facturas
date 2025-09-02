-- =============================================
-- CONSULTAS SQL PARA VENTAS: HOY, AYER Y ANTEAYER
-- Para usar en Supabase SQL Editor
-- =============================================

-- 🔍 1. VENTAS DE HOY
SELECT 
    id,
    sistema_origen,
    id_externo,
    fecha_venta,
    fecha_hora_completa,
    total_bruto,
    total_neto,
    num_comensales,
    ticket_medio,
    tpv_nombre,
    seccion
FROM ventas_datos 
WHERE fecha_venta = CURRENT_DATE
ORDER BY fecha_hora_completa DESC;

-- 🔍 2. VENTAS DE AYER
SELECT 
    id,
    sistema_origen,
    id_externo,
    fecha_venta,
    fecha_hora_completa,
    total_bruto,
    total_neto,
    num_comensales,
    ticket_medio,
    tpv_nombre,
    seccion
FROM ventas_datos 
WHERE fecha_venta = CURRENT_DATE - INTERVAL '1 day'
ORDER BY fecha_hora_completa DESC;

-- 🔍 3. VENTAS DE ANTEAYER
SELECT 
    id,
    sistema_origen,
    id_externo,
    fecha_venta,
    fecha_hora_completa,
    total_bruto,
    total_neto,
    num_comensales,
    ticket_medio,
    tpv_nombre,
    seccion
FROM ventas_datos 
WHERE fecha_venta = CURRENT_DATE - INTERVAL '2 days'
ORDER BY fecha_hora_completa DESC;

-- =============================================
-- 📊 RESUMEN COMPARATIVO DE LOS 3 DÍAS
-- =============================================
SELECT 
    fecha_venta,
    COUNT(*) as num_tickets,
    SUM(total_bruto) as facturacion_total,
    AVG(total_bruto) as ticket_medio_real,
    SUM(num_comensales) as comensales_total,
    MIN(fecha_hora_completa) as primer_ticket,
    MAX(fecha_hora_completa) as ultimo_ticket
FROM ventas_datos 
WHERE fecha_venta >= CURRENT_DATE - INTERVAL '2 days'
    AND fecha_venta <= CURRENT_DATE
GROUP BY fecha_venta
ORDER BY fecha_venta DESC;

-- =============================================
-- 🎯 CONSULTA COMPACTA - LOS 3 DÍAS EN UNA SOLA QUERY
-- =============================================
SELECT 
    CASE 
        WHEN fecha_venta = CURRENT_DATE THEN 'HOY'
        WHEN fecha_venta = CURRENT_DATE - INTERVAL '1 day' THEN 'AYER'
        WHEN fecha_venta = CURRENT_DATE - INTERVAL '2 days' THEN 'ANTEAYER'
    END as periodo,
    fecha_venta,
    sistema_origen,
    id_externo,
    total_bruto,
    num_comensales,
    ticket_medio,
    fecha_hora_completa
FROM ventas_datos 
WHERE fecha_venta >= CURRENT_DATE - INTERVAL '2 days'
    AND fecha_venta <= CURRENT_DATE
ORDER BY fecha_venta DESC, fecha_hora_completa DESC;

-- =============================================
-- 🔧 CONSULTA ESPECÍFICA PARA TU RESTAURANTE
-- (Reemplaza el UUID con el de tu restaurante)
-- =============================================
SELECT 
    CASE 
        WHEN fecha_venta = CURRENT_DATE THEN 'HOY'
        WHEN fecha_venta = CURRENT_DATE - INTERVAL '1 day' THEN 'AYER'
        WHEN fecha_venta = CURRENT_DATE - INTERVAL '2 days' THEN 'ANTEAYER'
    END as periodo,
    fecha_venta,
    COUNT(*) as tickets,
    SUM(total_bruto) as facturacion,
    AVG(total_bruto) as ticket_medio,
    SUM(num_comensales) as comensales
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'  -- ← TU RESTAURANTE ID
    AND fecha_venta >= CURRENT_DATE - INTERVAL '2 days'
    AND fecha_venta <= CURRENT_DATE
GROUP BY fecha_venta
ORDER BY fecha_venta DESC;
