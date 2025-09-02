-- =============================================
-- LIMPIAR TABLA ventas_datos COMPLETAMENTE
-- Fecha: 2025-01-24
-- Propósito: Borrar todos los datos para empezar limpio
-- =============================================

-- Borrar todos los datos de ventas
DELETE FROM ventas_datos;

-- Reiniciar secuencias si las hay
-- (PostgreSQL manejará automáticamente los UUIDs)

-- Log de la limpieza
DO $$
BEGIN
    RAISE NOTICE 'Tabla ventas_datos limpiada completamente en %', NOW();
END $$;

-- Verificar que está vacía
SELECT COUNT(*) as registros_restantes FROM ventas_datos;
