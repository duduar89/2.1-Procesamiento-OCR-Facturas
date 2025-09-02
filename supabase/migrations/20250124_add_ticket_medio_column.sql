-- =============================================
-- MIGRACIÓN: Agregar columna ticket_medio a ventas_datos
-- Fecha: 2025-01-24
-- Propósito: Permitir que la carga masiva inteligente guarde el ticket medio
--           y que get-dashboard-data lo use cuando esté disponible
-- =============================================

-- Agregar columna ticket_medio (nullable para compatibilidad)
ALTER TABLE ventas_datos 
ADD COLUMN ticket_medio NUMERIC(10,2) DEFAULT NULL;

-- Añadir comentario explicativo
COMMENT ON COLUMN ventas_datos.ticket_medio IS 
'Ticket medio calculado durante la carga de datos. NULL = calcular dinámicamente, valor = usar el guardado';

-- Crear índice para mejorar rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_ventas_datos_ticket_medio 
ON ventas_datos(ticket_medio) 
WHERE ticket_medio IS NOT NULL;

-- Log de la migración
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('20250124_add_ticket_medio_column', NOW())
ON CONFLICT (version) DO NOTHING;
