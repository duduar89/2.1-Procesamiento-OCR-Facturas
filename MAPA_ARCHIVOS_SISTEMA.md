# 🗺️ MAPA COMPLETO DEL SISTEMA - Archivos y Carpetas

## 📁 ESTRUCTURA COMPLETA DEL SISTEMA

```
📂 modulo 2 v1/                    ← CARPETA PRINCIPAL (RAÍZ)
├── 🏠 index.html                  ← PÁGINA PRINCIPAL DEL SISTEMA
├── 🔐 login.html                  ← PÁGINA DE LOGIN
├── 🎨 style.css                   ← ESTILOS BASE DEL SISTEMA
├── ⚙️ config.js                   ← CONFIGURACIÓN GLOBAL
├── 🚀 app.js                      ← LÓGICA PRINCIPAL DEL SISTEMA
├── 📊 dashboard-facturas.js       ← DASHBOARD ANTIGUO (NO USAR)
├── 🧪 test-dashboard.html         ← PÁGINA DE PRUEBAS
└── 📂 dashboard-facturas-claude/  ← CARPETA DEL DASHBOARD NUEVO
    ├── 📊 dashboard-facturas.html ← DASHBOARD PRINCIPAL (USAR ESTE)
    ├── ⚙️ dashboard-facturas.js   ← LÓGICA DEL DASHBOARD
    ├── 🎨 dashboard-facturas.css  ← ESTILOS DEL DASHBOARD
    ├── 📋 mock-data.js            ← DATOS DE PRUEBA
    └── 📄 pdf-overlay-system.js   ← SISTEMA DE VISUALIZACIÓN PDF
```

## 🎯 **ARCHIVOS PRINCIPALES (CARPETA RAÍZ)**

### 1. **`index.html`** ← **PÁGINA PRINCIPAL**
- **¿Qué es?** La página principal donde subes facturas
- **¿Dónde está?** En la carpeta raíz (`modulo 2 v1/`)
- **¿Para qué sirve?** Para procesar facturas nuevas
- **¿Qué archivos usa?** 
  - `style.css` (estilos)
  - `config.js` (configuración)
  - `app.js` (lógica)

### 2. **`login.html`** ← **PÁGINA DE LOGIN**
- **¿Qué es?** Página para iniciar sesión
- **¿Dónde está?** En la carpeta raíz (`modulo 2 v1/`)
- **¿Para qué sirve?** Autenticación de usuarios
- **¿Qué archivos usa?** 
  - `style.css` (estilos)
  - `config.js` (configuración)

### 3. **`style.css`** ← **ESTILOS BASE**
- **¿Qué es?** Archivo de estilos CSS principal
- **¿Dónde está?** En la carpeta raíz (`modulo 2 v1/`)
- **¿Para qué sirve?** Estilos generales del sistema
- **¿Quién lo usa?** 
  - `index.html`
  - `login.html`
  - `dashboard-facturas.html`

### 4. **`config.js`** ← **CONFIGURACIÓN GLOBAL**
- **¿Qué es?** Archivo de configuración del sistema
- **¿Dónde está?** En la carpeta raíz (`modulo 2 v1/`)
- **¿Para qué sirve?** Variables globales, credenciales, etc.
- **¿Quién lo usa?** 
  - `app.js`
  - `dashboard-facturas.js`

### 5. **`app.js`** ← **LÓGICA PRINCIPAL**
- **¿Qué es?** Archivo JavaScript principal del sistema
- **¿Dónde está?** En la carpeta raíz (`modulo 2 v1/`)
- **¿Para qué sirve?** Lógica de procesamiento de facturas
- **¿Qué archivos usa?** 
  - `config.js` (configuración)
- **¿Quién lo usa?** `index.html`

## 📊 **ARCHIVOS DEL DASHBOARD (SUBCARPETA)**

### 6. **`dashboard-facturas-claude/dashboard-facturas.html`** ← **DASHBOARD PRINCIPAL**
- **¿Qué es?** La página del dashboard de facturas
- **¿Dónde está?** En `dashboard-facturas-claude/`
- **¿Para qué sirve?** Ver y gestionar facturas procesadas
- **¿Qué archivos usa?** 
  - `../style.css` (estilos base del directorio padre)
  - `dashboard-facturas.css` (estilos específicos)
  - `../config.js` (configuración del directorio padre)
  - `mock-data.js` (datos de prueba)
  - `pdf-overlay-system.js` (sistema PDF)
  - `dashboard-facturas.js` (lógica del dashboard)

### 7. **`dashboard-facturas-claude/dashboard-facturas.js`** ← **LÓGICA DEL DASHBOARD**
- **¿Qué es?** Archivo JavaScript del dashboard
- **¿Dónde está?** En `dashboard-facturas-claude/`
- **¿Para qué sirve?** Funcionalidades del dashboard
- **¿Qué archivos usa?** 
  - `../config.js` (configuración del directorio padre)
- **¿Quién lo usa?** `dashboard-facturas.html`

### 8. **`dashboard-facturas-claude/dashboard-facturas.css`** ← **ESTILOS DEL DASHBOARD**
- **¿Qué es?** Estilos específicos del dashboard
- **¿Dónde está?** En `dashboard-facturas-claude/`
- **¿Para qué sirve?** Estilos únicos del dashboard
- **¿Quién lo usa?** `dashboard-facturas.html`

### 9. **`dashboard-facturas-claude/mock-data.js`** ← **DATOS DE PRUEBA**
- **¿Qué es?** Datos simulados para el dashboard
- **¿Dónde está?** En `dashboard-facturas-claude/`
- **¿Para qué sirve?** Mostrar datos de ejemplo
- **¿Quién lo usa?** `dashboard-facturas.html`

### 10. **`dashboard-facturas-claude/pdf-overlay-system.js`** ← **SISTEMA PDF**
- **¿Qué es?** Sistema de visualización de confianza en PDFs
- **¿Dónde está?** En `dashboard-facturas-claude/`
- **¿Para qué sirve?** Mostrar niveles de confianza en documentos
- **¿Quién lo usa?** `dashboard-facturas.html`

## 🔄 **FLUJO DE NAVEGACIÓN**

```
1. Usuario accede a: index.html (carpeta raíz)
   ↓
2. Hace login en: login.html (carpeta raíz)
   ↓
3. Procesa facturas en: index.html (carpeta raíz)
   ↓
4. Ve resultados en: dashboard-facturas.html (subcarpeta)
   ↓
5. Puede volver a: index.html (carpeta raíz)
```

## 📍 **RUTAS RELATIVAS IMPORTANTES**

| **Desde** | **Hacia** | **Ruta** | **Explicación** |
|-----------|-----------|----------|-----------------|
| `dashboard-facturas.html` | `style.css` | `../style.css` | Subir un nivel y acceder a style.css |
| `dashboard-facturas.html` | `config.js` | `../config.js` | Subir un nivel y acceder a config.js |
| `dashboard-facturas.html` | `index.html` | `../index.html` | Subir un nivel y acceder a index.html |
| `dashboard-facturas.html` | `login.html` | `../login.html` | Subir un nivel y acceder a login.html |
| `index.html` | `dashboard-facturas.html` | `dashboard-facturas-claude/dashboard-facturas.html` | Bajar a la subcarpeta |

## 🚨 **ARCHIVOS QUE NO USAR**

- ❌ `dashboard-facturas.js` (en carpeta raíz) - **ANTIGUO, NO USAR**
- ❌ `test-dashboard.html` - Solo para pruebas

## ✅ **ARCHIVOS QUE SÍ USAR**

- ✅ `index.html` - Sistema principal
- ✅ `login.html` - Login
- ✅ `dashboard-facturas-claude/dashboard-facturas.html` - Dashboard
- ✅ Todos los archivos de soporte en sus carpetas correspondientes

## 🎯 **RESUMEN SIMPLE**

1. **CARPETA RAÍZ**: Sistema principal (subir facturas)
2. **SUBCARPETA**: Dashboard (ver facturas procesadas)
3. **RUTAS**: Usar `../` para subir un nivel desde el dashboard
4. **NAVEGACIÓN**: Bidireccional entre ambos módulos

---

**¿Te queda más claro ahora?** 🎯
