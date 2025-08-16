-- ===== CREAR RESTAURANTE DE PRUEBA PARA WEBHOOK MAILGUN =====

-- Primero agregar la columna unique_id si no existe
ALTER TABLE restaurantes ADD COLUMN IF NOT EXISTS unique_id VARCHAR(50) UNIQUE;

-- Insertar restaurante de prueba con unique_id x7k2m1
INSERT INTO restaurantes (
    nombre,
    nombre_comercial,
    cif,
    email,
    unique_id,
    configuracion
) VALUES (
    'Pizza Roma',
    'Pizza Roma - Restaurante Italiano',
    'B12345678',
    'info@pizzaroma.com',
    'x7k2m1',
    '{
        "alertas_email": ["admin@pizzaroma.com"],
        "umbral_confianza": 0.8,
        "proveedores_confiables": ["A28004743"],
        "categorias_personalizadas": ["Carnes", "Pescados", "Verduras", "Lácteos", "Bebidas", "Otros"]
    }'
) ON CONFLICT (unique_id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    nombre_comercial = EXCLUDED.nombre_comercial,
    email = EXCLUDED.email,
    configuracion = EXCLUDED.configuracion;

-- Crear usuario administrador para el restaurante
INSERT INTO usuarios (
    email,
    nombre,
    apellidos,
    restaurante_id,
    rol
) VALUES (
    'admin@pizzaroma.com',
    'Admin',
    'Pizza Roma',
    (SELECT id FROM restaurantes WHERE unique_id = 'x7k2m1'),
    'admin_restaurante'
) ON CONFLICT (email) DO NOTHING;

-- Verificar que se creó correctamente
SELECT 
    id,
    nombre,
    unique_id,
    email,
    activo
FROM restaurantes 
WHERE unique_id = 'x7k2m1';

