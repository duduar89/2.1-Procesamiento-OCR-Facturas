-- CONSULTAS PARA VER HISTORIAL DE PRECIOS DE PRODUCTOS
-- Ejecutar en Supabase SQL Editor

-- 1. 📊 VER PRODUCTOS CON MÚLTIPLES PRECIOS (RESUMEN)
SELECT 
    pm.nombre_normalizado,
    pm.categoria_principal,
    COUNT(hpp.id) as total_registros,
    MIN(hpp.precio_unitario) as precio_minimo,
    MAX(hpp.precio_unitario) as precio_maximo,
    AVG(hpp.precio_unitario)::DECIMAL(10,2) as precio_promedio,
    pm.precio_ultimo,
    pm.precio_minimo as precio_min_tabla,
    pm.precio_maximo as precio_max_tabla,
    pm.numero_compras
FROM productos_maestro pm
JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'  -- Tu restaurante ID
GROUP BY pm.id, pm.nombre_normalizado, pm.categoria_principal, pm.precio_ultimo, pm.precio_minimo, pm.precio_maximo, pm.numero_compras
HAVING COUNT(hpp.id) > 1  -- Solo productos con más de 1 precio
ORDER BY COUNT(hpp.id) DESC, pm.nombre_normalizado;

-- 2. 📈 VER HISTORIAL DETALLADO DE UN PRODUCTO ESPECÍFICO
-- (Cambia el nombre del producto que quieras ver)
SELECT 
    pm.nombre_normalizado,
    hpp.precio_unitario,
    hpp.cantidad_comprada,
    hpp.precio_total_linea,
    hpp.fecha_compra,
    def.numero_factura,
    def.proveedor_nombre,
    EXTRACT(DAY FROM NOW() - hpp.fecha_compra) as dias_desde_compra
FROM historial_precios_productos hpp
JOIN productos_maestro pm ON hpp.producto_maestro_id = pm.id
LEFT JOIN datos_extraidos_facturas def ON hpp.documento_id = def.documento_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND pm.nombre_normalizado LIKE '%descuento%'  -- Cambiar por el producto que quieras
ORDER BY hpp.fecha_compra DESC;

-- 3. 🎯 VER TODOS LOS PRODUCTOS CON SUS ESTADÍSTICAS
SELECT 
    pm.nombre_normalizado,
    pm.categoria_principal,
    pm.numero_compras,
    pm.precio_ultimo,
    pm.precio_minimo,
    pm.precio_maximo,
    pm.precio_promedio_30dias,
    pm.variacion_porcentaje,
    pm.fecha_ultima_compra,
    COUNT(hpp.id) as registros_historial
FROM productos_maestro pm
LEFT JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
GROUP BY pm.id, pm.nombre_normalizado, pm.categoria_principal, pm.numero_compras, 
         pm.precio_ultimo, pm.precio_minimo, pm.precio_maximo, pm.precio_promedio_30dias,
         pm.variacion_porcentaje, pm.fecha_ultima_compra
ORDER BY pm.numero_compras DESC, pm.nombre_normalizado;

-- 4. 📊 TOP 10 PRODUCTOS MÁS COMPRADOS
SELECT 
    pm.nombre_normalizado,
    pm.numero_compras,
    pm.precio_ultimo,
    pm.precio_minimo,
    pm.precio_maximo,
    CASE 
        WHEN pm.precio_minimo > 0 THEN 
            ROUND(((pm.precio_maximo - pm.precio_minimo) / pm.precio_minimo * 100)::DECIMAL, 2)
        ELSE 0 
    END as variacion_precio_porcentaje,
    pm.fecha_ultima_compra
FROM productos_maestro pm
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND pm.numero_compras > 1
ORDER BY pm.numero_compras DESC
LIMIT 10;

-- 5. 🔍 PRODUCTOS CON MAYOR VARIACIÓN DE PRECIO
SELECT 
    pm.nombre_normalizado,
    pm.numero_compras,
    pm.precio_ultimo,
    pm.precio_minimo,
    pm.precio_maximo,
    CASE 
        WHEN pm.precio_minimo > 0 THEN 
            ROUND(((pm.precio_maximo - pm.precio_minimo) / pm.precio_minimo * 100)::DECIMAL, 2)
        ELSE 0 
    END as variacion_porcentaje,
    pm.fecha_ultima_compra
FROM productos_maestro pm
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND pm.numero_compras > 1
    AND pm.precio_minimo > 0
ORDER BY 
    CASE 
        WHEN pm.precio_minimo > 0 THEN 
            ((pm.precio_maximo - pm.precio_minimo) / pm.precio_minimo * 100)
        ELSE 0 
    END DESC
LIMIT 10;
