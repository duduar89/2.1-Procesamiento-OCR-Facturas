-- CONSULTAS CORREGIDAS PARA VER HISTORIAL DE PRECIOS DE PRODUCTOS
-- Ejecutar en Supabase SQL Editor

-- 1. 📊 VER PRODUCTOS CON MÚLTIPLES PRECIOS (RESUMEN)
SELECT 
    pm.nombre_normalizado,
    pm.categoria_principal,
    COUNT(hpp.id) as total_registros,
    MIN(hpp.precio_unitario_sin_iva) as precio_minimo,
    MAX(hpp.precio_unitario_sin_iva) as precio_maximo,
    AVG(hpp.precio_unitario_sin_iva)::DECIMAL(10,2) as precio_promedio,
    pm.precio_ultimo,
    pm.numero_compras
FROM productos_maestro pm
JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'  -- Tu restaurante ID
GROUP BY pm.id, pm.nombre_normalizado, pm.categoria_principal, pm.precio_ultimo, pm.numero_compras
HAVING COUNT(hpp.id) > 1  -- Solo productos con más de 1 precio
ORDER BY COUNT(hpp.id) DESC, pm.nombre_normalizado;

-- 2. 📈 VER HISTORIAL DETALLADO DE UN PRODUCTO ESPECÍFICO
SELECT 
    pm.nombre_normalizado,
    hpp.precio_unitario_sin_iva,
    hpp.cantidad_comprada,
    hpp.fecha_compra,
    def.numero_factura,
    def.proveedor_nombre,
    EXTRACT(DAY FROM NOW()::date - hpp.fecha_compra::date) as dias_desde_compra
FROM historial_precios_productos hpp
JOIN productos_maestro pm ON hpp.producto_maestro_id = pm.id
LEFT JOIN datos_extraidos_facturas def ON hpp.documento_id = def.documento_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND pm.nombre_normalizado LIKE '%20l10kg%'  -- Cambiar por el producto que quieras
ORDER BY hpp.fecha_compra DESC;

-- 3. 🎯 VER TODOS LOS PRODUCTOS CON SUS ESTADÍSTICAS
SELECT 
    pm.nombre_normalizado,
    pm.categoria_principal,
    pm.numero_compras,
    pm.precio_ultimo,
    pm.precio_minimo,
    pm.precio_maximo,
    pm.fecha_ultima_compra,
    COUNT(hpp.id) as registros_historial
FROM productos_maestro pm
LEFT JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
GROUP BY pm.id, pm.nombre_normalizado, pm.categoria_principal, pm.numero_compras, 
         pm.precio_ultimo, pm.precio_minimo, pm.precio_maximo, pm.fecha_ultima_compra
ORDER BY pm.numero_compras DESC, pm.nombre_normalizado;

-- 4. 📊 TOP 10 PRODUCTOS MÁS COMPRADOS
SELECT 
    pm.nombre_normalizado,
    pm.numero_compras,
    pm.precio_ultimo,
    pm.precio_minimo,
    pm.precio_maximo,
    pm.fecha_ultima_compra
FROM productos_maestro pm
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND pm.numero_compras > 1
ORDER BY pm.numero_compras DESC
LIMIT 10;

-- 5. 🔍 CONSULTA SIMPLE PARA VER QUE FUNCIONA
SELECT 
    pm.nombre_normalizado,
    hpp.precio_unitario_sin_iva,
    hpp.fecha_compra
FROM productos_maestro pm
JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
ORDER BY hpp.fecha_compra DESC
LIMIT 20;
