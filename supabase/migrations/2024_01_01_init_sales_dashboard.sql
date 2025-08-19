-- =============================================
-- INICIALIZACIÓN DEL DASHBOARD DE VENTAS
-- Archivo: /migrations/2024_01_01_init_sales_dashboard.sql
-- =============================================

-- 1. TABLA VENTAS
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id UUID NOT NULL,
    numero_ticket VARCHAR(50) NOT NULL,
    total_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
    comensales INTEGER DEFAULT 1,
    metodo_pago VARCHAR(50) DEFAULT 'efectivo',
    fecha DATE NOT NULL,
    hora TIME DEFAULT CURRENT_TIME,
    estado VARCHAR(20) DEFAULT 'completada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Sin categoría',
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA PRODUCTOS_VENTA (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS productos_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA CATEGORIAS_PRODUCTOS
CREATE TABLE IF NOT EXISTS categorias_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id UUID NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ÍNDICES PARA OPTIMIZAR CONSULTAS
CREATE INDEX IF NOT EXISTS idx_ventas_restaurante_fecha ON ventas(restaurante_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_productos_restaurante ON productos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_venta_venta ON productos_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_productos_venta_producto ON productos_venta(producto_id);

-- 6. FUNCIÓN PARA ACTUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. TRIGGERS PARA ACTUALIZAR TIMESTAMP
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_productos_updated_at BEFORE UPDATE ON categorias_productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. VISTAS ÚTILES PARA EL DASHBOARD
CREATE OR REPLACE VIEW vista_ventas_diarias AS
SELECT 
    fecha,
    COUNT(*) as total_tickets,
    SUM(total_venta) as total_ventas,
    AVG(total_venta) as ticket_promedio,
    SUM(comensales) as total_comensales
FROM ventas 
WHERE estado = 'completada'
GROUP BY fecha
ORDER BY fecha DESC;

CREATE OR REPLACE VIEW vista_productos_top AS
SELECT 
    p.nombre,
    p.categoria,
    SUM(pv.cantidad) as total_vendido,
    SUM(pv.cantidad * pv.precio_unitario) as total_importe,
    COUNT(DISTINCT pv.venta_id) as veces_vendido
FROM productos_venta pv
JOIN productos p ON pv.producto_id = p.id
JOIN ventas v ON pv.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY p.id, p.nombre, p.categoria
ORDER BY total_importe DESC;

-- 9. DATOS DE PRUEBA (OPCIONAL)
INSERT INTO categorias_productos (restaurante_id, nombre, descripcion) VALUES
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Bebidas', 'Bebidas y refrescos'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Platos Principales', 'Platos principales del menú'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Postres', 'Postres y dulces'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Entrantes', 'Entrantes y aperitivos');

-- 10. POLÍTICAS RLS (Row Level Security)
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_productos ENABLE ROW LEVEL SECURITY;

-- Política para ventas
CREATE POLICY "Usuarios pueden ver ventas de su restaurante" ON ventas
    FOR SELECT USING (restaurante_id IN (
        SELECT restaurante_id FROM usuarios WHERE id = auth.uid()
    ));

-- Política para productos
CREATE POLICY "Usuarios pueden ver productos de su restaurante" ON productos
    FOR SELECT USING (restaurante_id IN (
        SELECT restaurante_id FROM usuarios WHERE id = auth.uid()
    ));

-- Política para productos_venta
CREATE POLICY "Usuarios pueden ver productos_venta de su restaurante" ON productos_venta
    FOR SELECT USING (venta_id IN (
        SELECT id FROM ventas WHERE restaurante_id IN (
            SELECT restaurante_id FROM usuarios WHERE id = auth.uid()
        )
    ));

-- Política para categorias_productos
CREATE POLICY "Usuarios pueden ver categorias de su restaurante" ON categorias_productos
    FOR SELECT USING (restaurante_id IN (
        SELECT restaurante_id FROM usuarios WHERE id = auth.uid()
    ));

COMMIT;
