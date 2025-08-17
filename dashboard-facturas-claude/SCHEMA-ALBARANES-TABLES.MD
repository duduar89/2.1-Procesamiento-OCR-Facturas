CREATE TABLE facturas_albaranes_enlaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- RELACIONES PRINCIPALES (siguiendo tu patrón)
  factura_id UUID NOT NULL REFERENCES datos_extraidos_facturas(id),
  albaran_id UUID NOT NULL REFERENCES datos_extraidos_albaranes(id), 
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
  
  -- INFORMACIÓN DEL ENLACE
  numero_referencia VARCHAR(100),     -- "ALB-12345" como apareció en la factura
  importe_referencia NUMERIC(10,2),   -- Importe de la línea en la factura
  importe_diferencia NUMERIC(10,2),   -- Diferencia entre factura y albarán
  
  -- MÉTODO DE DETECCIÓN
  metodo_deteccion VARCHAR(50) NOT NULL, -- 'referencia_explicita', 'temporal_proveedor', 'analisis_productos', 'patron_temporal', 'manual'
  confianza_match NUMERIC(3,2) NOT NULL, -- 0.00 a 1.00 (siguiendo tu patrón de confianza)
  razon_match JSONB,                   -- ["mismo_numero", "fecha_coherente", "importe_similar"]
  
  -- ESTADO Y VALIDACIÓN (siguiendo tu patrón)
  estado VARCHAR(20) DEFAULT 'detectado', -- 'detectado', 'confirmado', 'rechazado', 'corregido'
  usuario_validacion UUID REFERENCES usuarios(id),
  fecha_validacion TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  
  -- AUDITORÍA (siguiendo tu patrón)
  fecha_cotejo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_extraccion UUID REFERENCES usuarios(id),
  
  -- CONSTRAINTS
  UNIQUE(factura_id, albaran_id),
  CHECK (confianza_match >= 0 AND confianza_match <= 1),
  CHECK (estado IN ('detectado', 'confirmado', 'rechazado', 'corregido'))
);

-- ÍNDICES PARA PERFORMANCE (siguiendo tu patrón)
CREATE INDEX idx_enlaces_factura ON facturas_albaranes_enlaces(factura_id);
CREATE INDEX idx_enlaces_albaran ON facturas_albaranes_enlaces(albaran_id);
CREATE INDEX idx_enlaces_restaurante ON facturas_albaranes_enlaces(restaurante_id);
CREATE INDEX idx_enlaces_estado ON facturas_albaranes_enlaces(estado);
CREATE INDEX idx_enlaces_metodo ON facturas_albaranes_enlaces(metodo_deteccion);

CREATE TABLE cotejo_candidatos_detectados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- RELACIÓN EVALUADA (siguiendo tu patrón)
  factura_id UUID NOT NULL REFERENCES datos_extraidos_facturas(id),
  albaran_id UUID NOT NULL REFERENCES datos_extraidos_albaranes(id),
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
  
  -- ANÁLISIS DEL CANDIDATO
  metodo_deteccion VARCHAR(50) NOT NULL,
  score_calculado NUMERIC(3,2) NOT NULL, -- 0.00 a 1.00
  factores_puntuacion JSONB NOT NULL,    -- {"proveedor": 0.25, "fecha": 0.20, "importe": 0.15, "productos": 0.30}
  razon_deteccion JSONB,                 -- ["mismo_proveedor", "fecha_coherente", "productos_similares"]
  
  -- RESULTADO FINAL
  fue_confirmado BOOLEAN,                -- NULL=pendiente, TRUE=confirmado, FALSE=rechazado
  usuario_decision UUID REFERENCES usuarios(id),
  fecha_decision TIMESTAMP WITH TIME ZONE,
  razon_rechazo TEXT,                    -- Si fue rechazado, por qué
  
  -- CONTEXTO PARA APRENDIZAJE
  contexto_cotejo JSONB,                 -- Información adicional del momento del cotejo
  fecha_deteccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AUDITORÍA (siguiendo tu patrón)
  fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CONSTRAINTS
  CHECK (score_calculado >= 0 AND score_calculado <= 1)
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_candidatos_factura ON cotejo_candidatos_detectados(factura_id);
CREATE INDEX idx_candidatos_restaurante ON cotejo_candidatos_detectados(restaurante_id);
CREATE INDEX idx_candidatos_metodo ON cotejo_candidatos_detectados(metodo_deteccion);
CREATE INDEX idx_candidatos_confirmado ON cotejo_candidatos_detectados(fue_confirmado);
CREATE INDEX idx_candidatos_score ON cotejo_candidatos_detectados(score_calculado);


CREATE TABLE documentos_huerfanos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- DOCUMENTO HUÉRFANO (siguiendo tu patrón)
  documento_id UUID NOT NULL,           -- ID del documento sin enlace
  tipo_documento VARCHAR(20) NOT NULL, -- 'factura' o 'albaran'
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
  
  -- INFORMACIÓN DEL DOCUMENTO
  numero_documento VARCHAR(100),
  proveedor_nombre VARCHAR(255),
  proveedor_id UUID REFERENCES proveedores(id),
  fecha_documento DATE,
  importe_documento NUMERIC(10,2),
  
  -- ESTADO DEL HUÉRFANO
  dias_sin_enlace INTEGER GENERATED ALWAYS AS (DATE_PART('day', NOW() - fecha_documento)) STORED,
  estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'resuelto', 'factura_directa', 'ignorado'
  razon_estado TEXT,                       -- Explicación del estado
  
  -- INTENTOS DE RESOLUCIÓN
  intentos_busqueda INTEGER DEFAULT 0,
  ultima_busqueda TIMESTAMP WITH TIME ZONE,
  candidatos_evaluados INTEGER DEFAULT 0,
  
  -- GESTIÓN
  asignado_a UUID REFERENCES usuarios(id),
  prioridad VARCHAR(10) DEFAULT 'media', -- 'alta', 'media', 'baja'
  fecha_limite DATE,                      -- Cuándo debe resolverse
  
  -- AUDITORÍA (siguiendo tu patrón)
  fecha_deteccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  resuelto_por UUID REFERENCES usuarios(id),
  fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CONSTRAINTS
  CHECK (tipo_documento IN ('factura', 'albaran')),
  CHECK (estado IN ('pendiente', 'resuelto', 'factura_directa', 'ignorado')),
  CHECK (prioridad IN ('alta', 'media', 'baja'))
);

-- ÍNDICES PARA ALERTAS Y DASHBOARDS
CREATE INDEX idx_huerfanos_estado ON documentos_huerfanos(estado);
CREATE INDEX idx_huerfanos_dias ON documentos_huerfanos(dias_sin_enlace);
CREATE INDEX idx_huerfanos_prioridad ON documentos_huerfanos(prioridad);
CREATE INDEX idx_huerfanos_restaurante ON documentos_huerfanos(restaurante_id);
CREATE INDEX idx_huerfanos_tipo ON documentos_huerfanos(tipo_documento);

CREATE TABLE cotejo_patrones_aprendidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CONTEXTO DEL PATRÓN (siguiendo tu patrón)
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
  proveedor_id UUID REFERENCES proveedores(id),        -- NULL = patrón general del restaurante
  tipo_patron VARCHAR(50) NOT NULL,                    -- 'referencia_numerica', 'ventana_temporal', 'productos_tipicos'
  
  -- PATRÓN DETECTADO
  patron_datos JSONB NOT NULL,                         -- Estructura variable según tipo
  confianza_patron NUMERIC(3,2) NOT NULL,             -- Qué tan confiable es este patrón
  ejemplos_positivos INTEGER DEFAULT 0,               -- Cuántas veces ha funcionado
  ejemplos_negativos INTEGER DEFAULT 0,               -- Cuántas veces ha fallado
  
  -- EFECTIVIDAD
  ultima_validacion TIMESTAMP WITH TIME ZONE,
  porcentaje_efectividad NUMERIC(3,2) GENERATED ALWAYS AS (
    CASE 
      WHEN (ejemplos_positivos + ejemplos_negativos) = 0 THEN 0
      ELSE ejemplos_positivos::NUMERIC / (ejemplos_positivos + ejemplos_negativos)
    END
  ) STORED,
  
  -- METADATOS (siguiendo tu patrón)
  fecha_deteccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE,
  
  -- CONSTRAINTS
  CHECK (confianza_patron >= 0 AND confianza_patron <= 1),
  CHECK (ejemplos_positivos >= 0 AND ejemplos_negativos >= 0)
);

-- ÍNDICES PARA CONSULTAS RÁPIDAS
CREATE INDEX idx_patrones_restaurante ON cotejo_patrones_aprendidos(restaurante_id);
CREATE INDEX idx_patrones_proveedor ON cotejo_patrones_aprendidos(proveedor_id);
CREATE INDEX idx_patrones_tipo ON cotejo_patrones_aprendidos(tipo_patron);
CREATE INDEX idx_patrones_efectividad ON cotejo_patrones_aprendidos(porcentaje_efectividad);