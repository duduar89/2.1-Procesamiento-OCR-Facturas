-- ===== ESQUEMA DE BASE DE DATOS PARA DASHBOARD DE VENTAS =====

-- 1. TABLA DE VENTAS PRINCIPAL
CREATE TABLE IF NOT EXISTS ventas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
    numero_ticket VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    total_venta DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    comensales INTEGER DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'completada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE PRODUCTOS EN VENTAS (RELACIÓN MANY-TO-MANY)
CREATE TABLE IF NOT EXISTS productos_venta (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS categorias_productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurante_id UUID NOT NULL REFERENCES restaurantes(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ÍNDICES PARA OPTIMIZAR CONSULTAS =====

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_restaurante_fecha ON ventas(restaurante_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago ON ventas(metodo_pago);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_restaurante ON productos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);

-- Índices para productos_venta
CREATE INDEX IF NOT EXISTS idx_productos_venta_venta_id ON productos_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_productos_venta_producto_id ON productos_venta(producto_id);

-- ===== POLÍTICAS RLS (ROW LEVEL SECURITY) =====

-- Habilitar RLS en todas las tablas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_productos ENABLE ROW LEVEL SECURITY;

-- Política para ventas: solo el restaurante puede ver sus ventas
CREATE POLICY "Usuarios pueden ver ventas de su restaurante" ON ventas
    FOR SELECT USING (
        restaurante_id IN (
            SELECT restaurante_id FROM usuarios_restaurantes 
            WHERE usuario_id = auth.uid()
        )
    );

-- Política para productos: solo el restaurante puede ver sus productos
CREATE POLICY "Usuarios pueden ver productos de su restaurante" ON productos
    FOR SELECT USING (
        restaurante_id IN (
            SELECT restaurante_id FROM usuarios_restaurantes 
            WHERE usuario_id = auth.uid()
        )
    );

-- Política para productos_venta: solo el restaurante puede ver sus productos vendidos
CREATE POLICY "Usuarios pueden ver productos vendidos de su restaurante" ON productos_venta
    FOR SELECT USING (
        venta_id IN (
            SELECT id FROM ventas 
            WHERE restaurante_id IN (
                SELECT restaurante_id FROM usuarios_restaurantes 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- ===== DATOS DE PRUEBA =====

-- Insertar categorías de ejemplo
INSERT INTO categorias_productos (restaurante_id, nombre, descripcion) VALUES
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pizzas', 'Pizzas tradicionales y especiales'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pastas', 'Pastas frescas y secas'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Carnes', 'Carnes a la parrilla y guisadas'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pescados', 'Pescados frescos del día'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Postres', 'Postres caseros'),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Bebidas', 'Bebidas y vinos');

-- Insertar productos de ejemplo
INSERT INTO productos (restaurante_id, nombre, categoria, precio_unitario) VALUES
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pizza Margherita', 'Pizzas', 12.50),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pizza Pepperoni', 'Pizzas', 14.00),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pasta Carbonara', 'Pastas', 15.00),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Pasta Bolognese', 'Pastas', 13.50),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Ensalada César', 'Ensaladas', 8.50),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Tiramisú', 'Postres', 6.50),
('2852b1af-38d8-43ec-8872-2b2921d5a231', 'Vino Tinto', 'Bebidas', 18.00);

-- ===== FUNCIÓN PARA ACTUALIZAR TIMESTAMP =====

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== VISTAS ÚTILES =====

-- Vista para resumen de ventas diarias
CREATE OR REPLACE VIEW vista_ventas_diarias AS
SELECT 
    v.restaurante_id,
    v.fecha,
    COUNT(*) as total_tickets,
    SUM(v.total_venta) as total_ventas,
    AVG(v.total_venta) as ticket_promedio,
    SUM(v.comensales) as total_comensales
FROM ventas v
WHERE v.estado = 'completada'
GROUP BY v.restaurante_id, v.fecha
ORDER BY v.fecha DESC;

-- Vista para productos más vendidos
CREATE OR REPLACE VIEW vista_productos_top AS
SELECT 
    p.restaurante_id,
    p.nombre,
    p.categoria,
    SUM(pv.cantidad) as cantidad_total,
    SUM(pv.cantidad * pv.precio_unitario) as importe_total,
    COUNT(DISTINCT pv.venta_id) as veces_vendido
FROM productos p
JOIN productos_venta pv ON p.id = pv.producto_id
JOIN ventas v ON pv.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY p.id, p.restaurante_id, p.nombre, p.categoria
ORDER BY importe_total DESC;
