-- =============================================
-- ELIMINAR CONSTRAINT QUE BLOQUEA MÚLTIPLES TICKETS
-- PROBLEMA: ventas_datos_restaurante_fecha_unique impide múltiples tickets por día
-- SOLUCIÓN: Eliminar el constraint para permitir múltiples registros TPV por fecha
-- =============================================

-- Eliminar el constraint problemático
ALTER TABLE ventas_datos 
DROP CONSTRAINT ventas_datos_restaurante_fecha_unique;

-- Comentario explicativo
-- El constraint anterior era para "enriquecimiento por fecha" (1 registro por día)
-- Pero impide múltiples tickets reales del TPV Numier por día
-- La unicidad real debe ser por id_externo (ya existe en el onConflict)

-- VERIFICACIÓN: Después de ejecutar esto, la sincronización de Numier debería funcionar
-- y insertar múltiples tickets por día correctamente.
