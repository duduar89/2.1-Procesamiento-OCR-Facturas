-- =============================================
-- LIMPIAR DATOS DE 25, 26 Y 27 AGOSTO PARA RE-SINCRONIZAR
-- ESTO ELIMINARÁ TODOS LOS DATOS DE ESOS DÍAS PARA EMPEZAR LIMPIO
-- =============================================

-- 1. ELIMINAR LÍNEAS DE VENTA DE ESOS DÍAS
DELETE FROM ventas_lineas 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND fecha_venta IN ('2025-08-25', '2025-08-26', '2025-08-27');

-- 2. ELIMINAR DATOS DE VENTAS PRINCIPALES DE ESOS DÍAS
DELETE FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND fecha_venta IN ('2025-08-25', '2025-08-26', '2025-08-27');

-- 3. VERIFICAR QUE SE ELIMINARON CORRECTAMENTE
SELECT 
    'DESPUÉS DE LIMPIAR' as estado,
    fecha_venta, 
    sistema_origen, 
    COUNT(*) as tickets_restantes,
    SUM(total_bruto) as total_restante
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    AND fecha_venta IN ('2025-08-25', '2025-08-26', '2025-08-27')
GROUP BY fecha_venta, sistema_origen
ORDER BY fecha_venta, sistema_origen;

-- Si no devuelve resultados, significa que se eliminó todo correctamente

-- =============================================
-- INFORMACIÓN: Después de ejecutar este SQL:
-- 1. Ve al dashboard de ventas
-- 2. Haz click en "Sincronizar" 
-- 3. Revisa los logs de sync-numier-data en Supabase
-- 4. Verifica que se inserten todos los tickets de esos días
-- =============================================
