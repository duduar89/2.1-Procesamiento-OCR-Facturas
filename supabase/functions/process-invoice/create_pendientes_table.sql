-- Crear tabla para documentos pendientes de revisión
CREATE TABLE IF NOT EXISTS documentos_pendientes_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id VARCHAR(255) UNIQUE,
  origen VARCHAR(50) NOT NULL, -- 'whatsapp', 'email', 'upload', 'api'
  telefono VARCHAR(50),
  usuario_id UUID,
  tipo_sugerido VARCHAR(20) NOT NULL, -- 'factura', 'albaran'
  confianza INTEGER NOT NULL,
  razones TEXT[],
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente_respuesta', -- 'pendiente_respuesta', 'pendiente_revision_manual', 'resuelto'
  respuesta_usuario VARCHAR(20),
  timestamp TIMESTAMP DEFAULT NOW(),
  resuelto_at TIMESTAMP,
  resuelto_por VARCHAR(50),
  datos_documento JSONB -- Almacenar datos extraídos para procesamiento posterior
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_pendientes_origen ON documentos_pendientes_revision(origen);
CREATE INDEX IF NOT EXISTS idx_pendientes_estado ON documentos_pendientes_revision(estado);
CREATE INDEX IF NOT EXISTS idx_pendientes_tipo ON documentos_pendientes_revision(tipo_sugerido);
CREATE INDEX IF NOT EXISTS idx_pendientes_timestamp ON documentos_pendientes_revision(timestamp);

-- Comentarios para documentar la tabla
COMMENT ON TABLE documentos_pendientes_revision IS 'Documentos que requieren revisión manual por baja confianza en identificación automática';
COMMENT ON COLUMN documentos_pendientes_revision.origen IS 'Canal de origen del documento: whatsapp, email, upload, api';
COMMENT ON COLUMN documentos_pendientes_revision.tipo_sugerido IS 'Tipo sugerido por el sistema: factura o albaran';
COMMENT ON COLUMN documentos_pendientes_revision.confianza IS 'Porcentaje de confianza en la identificación (0-100)';
COMMENT ON COLUMN documentos_pendientes_revision.estado IS 'Estado actual: pendiente_respuesta, pendiente_revision_manual, resuelto';
COMMENT ON COLUMN documentos_pendientes_revision.razones IS 'Array de razones por las que se requiere revisión';
