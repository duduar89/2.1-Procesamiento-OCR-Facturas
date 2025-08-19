# Configuración del Modal de Login

## 🔧 Configuración de Supabase

Para que el modal de login funcione correctamente, necesitas configurar las credenciales de Supabase en el archivo `login/index.html`.

### 1. Obtener Credenciales de Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Ve a **Settings** → **API**
3. Copia la **URL** y la **anon key**

### 2. Actualizar el Código

En el archivo `login/index.html`, busca estas líneas (alrededor de la línea 650):

```javascript
// Configuración hardcodeada para el demo
const supabaseUrl = 'https://your-project.supabase.co'; // Cambiar por tu URL real
const supabaseAnonKey = 'your-anon-key'; // Cambiar por tu clave real
```

Y reemplázalas con tus credenciales reales:

```javascript
const supabaseUrl = 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = 'tu-clave-anonima-real';
```

### 3. Estructura de Base de Datos Requerida

El sistema espera estas tablas en Supabase:

#### Tabla `usuarios`
- `id` (UUID, primary key)
- `email` (text)
- `nombre` (text)
- `apellidos` (text)
- `rol` (text)
- `restaurante_id` (UUID, foreign key)

#### Tabla `restaurantes`
- `id` (UUID, primary key)
- `nombre` (text)
- `cif` (text)
- `activo` (boolean)

### 4. Usuarios de Prueba

El sistema incluye usuarios demo preconfigurados:

- **Bar Manolo**: admin@barmanolo.com / barmanolo123
- **Restaurante Paco**: admin@respaco.com / respaco123

### 5. Funcionalidades Implementadas

✅ **Autenticación completa con Supabase**
✅ **Validación de formularios**
✅ **Manejo de errores**
✅ **Estado de carga**
✅ **Usuarios demo**
✅ **Redirección post-login**
✅ **Almacenamiento local de sesión**
✅ **Sistema multi-tenant**

### 6. Seguridad

- Row Level Security (RLS) habilitado
- Validación de entrada del lado del cliente
- Manejo seguro de sesiones
- Redirección segura post-autenticación

### 7. Personalización

Puedes personalizar:
- Colores y estilos en las variables CSS
- Mensajes de error/éxito
- Redirección post-login
- Validaciones adicionales
- Campos del formulario

---

**⚠️ Importante**: Nunca subas las credenciales reales de Supabase a un repositorio público. Usa variables de entorno en producción.

