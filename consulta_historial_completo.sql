-- CONSULTAS PARA VER HISTORIAL COMPLETO DE PRECIOS
-- Aunque no haya variación de precio, podemos ver frecuencia de compra

-- 1. 📊 HISTORIAL COMPLETO DE CADA PRODUCTO CON FECHAS
SELECT 
    pm.nombre_normalizado,
    hpp.precio_unitario_sin_iva,
    hpp.cantidad_comprada,
    hpp.fecha_compra,
    hpp.fecha_registro,
    def.numero_factura,
    def.proveedor_nombre,
    EXTRACT(DAY FROM NOW()::date - hpp.fecha_compra::date) as dias_desde_compra
FROM historial_precios_productos hpp
JOIN productos_maestro pm ON hpp.producto_maestro_id = pm.id
LEFT JOIN datos_extraidos_facturas def ON hpp.documento_id = def.documento_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
ORDER BY pm.nombre_normalizado, hpp.fecha_compra DESC;

-- 2. 🔍 FRECUENCIA DE COMPRA POR PRODUCTO
SELECT 
    pm.nombre_normalizado,
    COUNT(hpp.id) as veces_comprado,
    MIN(hpp.fecha_compra) as primera_compra,
    MAX(hpp.fecha_compra) as ultima_compra,
    EXTRACT(DAY FROM MAX(hpp.fecha_compra)::date - MIN(hpp.fecha_compra)::date) as dias_entre_primera_y_ultima,
    pm.precio_ultimo,
    SUM(hpp.cantidad_comprada) as cantidad_total_comprada
FROM productos_maestro pm
JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
GROUP BY pm.id, pm.nombre_normalizado, pm.precio_ultimo
ORDER BY COUNT(hpp.id) DESC, pm.nombre_normalizado;

-- 3. 📈 HISTORIAL DE UN PRODUCTO ESPECÍFICO CON DETALLES
-- (Cambia el nombre del producto que quieras ver)
SELECT 
    hpp.fecha_compra,
    hpp.precio_unitario_sin_iva,
    hpp.cantidad_comprada,
    hpp.precio_unitario_sin_iva * hpp.cantidad_comprada as total_linea,
    def.numero_factura,
    def.proveedor_nombre,
    def.fecha_factura,
    EXTRACT(DAY FROM LAG(hpp.fecha_compra) OVER (ORDER BY hpp.fecha_compra) - hpp.fecha_compra) as dias_desde_compra_anterior
FROM historial_precios_productos hpp
JOIN productos_maestro pm ON hpp.producto_maestro_id = pm.id
LEFT JOIN datos_extraidos_facturas def ON hpp.documento_id = def.documento_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND pm.nombre_normalizado LIKE '%20m05kg%'  -- CAMBIAR POR EL PRODUCTO QUE QUIERAS
ORDER BY hpp.fecha_compra DESC;

-- 4. 🗓️ CRONOLOGÍA DE TODAS LAS COMPRAS
SELECT 
    hpp.fecha_compra,
    pm.nombre_normalizado,
    hpp.precio_unitario_sin_iva,
    hpp.cantidad_comprada,
    def.numero_factura,
    def.proveedor_nombre
FROM historial_precios_productos hpp
JOIN productos_maestro pm ON hpp.producto_maestro_id = pm.id
LEFT JOIN datos_extraidos_facturas def ON hpp.documento_id = def.documento_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
ORDER BY hpp.fecha_compra DESC, pm.nombre_normalizado;

-- 5. 💰 GASTO TOTAL POR PRODUCTO (HISTORIAL)
SELECT 
    pm.nombre_normalizado,
    COUNT(hpp.id) as veces_comprado,
    SUM(hpp.cantidad_comprada) as cantidad_total,
    SUM(hpp.precio_unitario_sin_iva * hpp.cantidad_comprada) as gasto_total,
    AVG(hpp.precio_unitario_sin_iva)::DECIMAL(10,2) as precio_promedio,
    pm.precio_ultimo
FROM productos_maestro pm
JOIN historial_precios_productos hpp ON pm.id = hpp.producto_maestro_id
WHERE pm.restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
GROUP BY pm.id, pm.nombre_normalizado, pm.precio_ultimo
ORDER BY SUM(hpp.precio_unitario_sin_iva * hpp.cantidad_comprada) DESC;
