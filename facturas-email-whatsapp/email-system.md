# Sistema de Emails Automáticos por Restaurante
## Documentación Técnica y Funcional

---

## 📋 Resumen del Sistema de Emails

Sistema que **genera automáticamente** una dirección de email única para cada restaurante en el momento del registro. Cada email está vinculado de forma inequívoca a un restaurante específico, eliminando cualquier posibilidad de confusión o error de asignación.

### Objetivo Principal
- **Precisión del 100%:** Cada email pertenece a UN SOLO restaurante
- **Generación automática:** Sin intervención manual
- **Identificación inmediata:** Por la dirección de destino
- **Escalabilidad:** Funciona para 1, 100 o 10,000 restaurantes

---

## 🏗️ Arquitectura del Sistema de Emails

### Componentes Principales
1. **Generador de IDs únicos** durante el registro
2. **Constructor automático de emails** con formato estándar
3. **Servidor de correo Mailgun** con catch-all configurado
4. **Webhook processor** que identifica por email receptor

### Flujo de Datos
```
Registro → Generar ID → Crear Email → Guardar BD → Mostrar Dashboard
     ↓
Email único: restaurante.id@facturas-restaurantes.brainstormersagency.com
```

---

## 🔄 Flujo Completo de Generación Automática

### FASE 1: Registro de Restaurante

#### 1.1 Usuario completa formulario
```javascript
// Formulario de registro
const datosRestaurante = {
  nombre: "Pizza Roma",
  cif: "B12345678",
  direccion: "Calle Mayor 123",
  telefono: "+34 600 123 456",
  email_contacto: "admin@pizzaroma.com"
  // NO incluye email_facturas - se genera automáticamente
}
```

#### 1.2 Backend genera automáticamente
```typescript
async function crearRestaurante(datosFormulario) {
  // ✅ 1. Generar ID único alfanumérico
  const uniqueId = generarUniqueId() // "x7k2m1"
  
  // ✅ 2. Crear slug del nombre (opcional para legibilidad)
  const slug = crearSlug(datosFormulario.nombre) // "pizza-roma"
  
  // ✅ 3. Construir email único AUTOMÁTICAMENTE
  const emailFacturas = `${slug}.${uniqueId}@facturas-restaurantes.brainstormersagency.com`
  
  // ✅ 4. Guardar en base de datos
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .insert({
      id: crypto.randomUUID(),
      nombre: datosFormulario.nombre,
      unique_id: uniqueId,
      slug: slug,
      email_facturas: emailFacturas,
      email_contacto: datosFormulario.email_contacto,
      cif: datosFormulario.cif,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  
  console.log(`✅ Restaurante creado con email: ${emailFacturas}`)
  return restaurante
}
```

#### 1.3 Función generadora de IDs únicos
```typescript
function generarUniqueId(): string {
  const caracteres = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let resultado = ''
  
  // Generar 6 caracteres aleatorios
  for (let i = 0; i < 6; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
  }
  
  // Verificar que no existe en BD (aunque es estadísticamente improbable)
  return verificarUnicidad(resultado)
}

async function verificarUnicidad(id: string): Promise<string> {
  const { data } = await supabase
    .from('restaurantes')
    .select('unique_id')
    .eq('unique_id', id)
    .single()
  
  // Si existe, generar otro (recursivo)
  if (data) {
    return generarUniqueId()
  }
  
  return id
}
```

#### 1.4 Función creadora de slugs
```typescript
function crearSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Quitar caracteres especiales
    .replace(/\s+/g, '-')     // Espacios → guiones
    .replace(/-+/g, '-')      // Múltiples guiones → uno solo
    .trim()
    .substring(0, 30)         // Máximo 30 caracteres
}

// Ejemplos:
// "Pizza Roma" → "pizza-roma"
// "El Rincón de María" → "el-rincon-de-maria"
// "Restaurante Los Ángeles" → "restaurante-los-angeles"
```

---

## 📧 Formato y Estructura de Emails

### Formato Estándar
```
[slug-restaurante].[unique-id]@facturas-restaurantes.brainstormersagency.com
```

### Ejemplos Reales
```
pizza-roma.x7k2m1@facturas-restaurantes.brainstormersagency.com
el-asador.j9p3n2@facturas-restaurantes.brainstormersagency.com
la-trattoria.m5q8r4@facturas-restaurantes.brainstormersagency.com
marisqueria-pepe.k2w7t1@facturas-restaurantes.brainstormersagency.com
```

### Ventajas del Formato
✅ **Legible:** El slug indica el restaurante
✅ **Único:** El ID garantiza unicidad absoluta
✅ **Escalable:** Millones de combinaciones posibles
✅ **Profesional:** Dominio dedicado a facturas

---

## 🗄️ Estructura de Base de Datos

### Tabla: restaurantes (extendida)
```sql
CREATE TABLE restaurantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  unique_id VARCHAR(10) UNIQUE NOT NULL, -- "x7k2m1"
  slug VARCHAR(50) NOT NULL,             -- "pizza-roma"
  email_facturas VARCHAR(255) UNIQUE NOT NULL, -- Email generado automáticamente
  email_contacto VARCHAR(255),          -- Email del administrador
  cif VARCHAR(20),
  direccion TEXT,
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para búsquedas rápidas
  CONSTRAINT unique_email_facturas UNIQUE (email_facturas),
  CONSTRAINT unique_unique_id UNIQUE (unique_id)
);

-- Índices adicionales
CREATE INDEX idx_restaurantes_unique_id ON restaurantes(unique_id);
CREATE INDEX idx_restaurantes_email_facturas ON restaurantes(email_facturas);
```

### Tabla: email_logs (auditoría)
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID REFERENCES restaurantes(id),
  email_destino VARCHAR(255), -- Email que recibió la factura
  email_remitente VARCHAR(255), -- Quien envió
  asunto TEXT,
  num_adjuntos INTEGER DEFAULT 0,
  tamano_total BIGINT, -- Tamaño total de adjuntos
  fecha_recepcion TIMESTAMP DEFAULT NOW(),
  procesado BOOLEAN DEFAULT false,
  error TEXT,
  
  -- Para métricas y debugging
  mailgun_message_id VARCHAR(255),
  mailgun_timestamp TIMESTAMP
);
```

---

## ⚙️ Configuración del Servidor de Correo

### Mailgun Domain Setup
```bash
# Dominio configurado en Mailgun
Domain: facturas-restaurantes.brainstormersagency.com
Type: Receiving domain with catch-all

# DNS Records necesarios:
MX Record: facturas-restaurantes.brainstormersagency.com → mxa.mailgun.org (Priority: 10)
MX Record: facturas-restaurantes.brainstormersagency.com → mxb.mailgun.org (Priority: 10)
TXT Record: "v=spf1 include:mailgun.org ~all"
CNAME Record: email.facturas-restaurantes → mailgun.org
```

### Webhook Configuration
```bash
# Mailgun Webhook Settings
URL: https://tudominio.com/functions/v1/webhook-mailgun
Events: message.received
HTTP Method: POST
Username: api
Password: [MAILGUN_API_KEY]
```

---

## 🔄 Procesamiento de Emails Entrantes

### Webhook Processor (ya existente, mejorado)
```typescript
// En webhook-mailgun/index.ts
async function procesarEmailEntrante(req: Request) {
  const formData = await req.formData()
  
  // ✅ 1. Extraer email receptor (clave para identificación)
  const recipient = formData.get('recipient') as string
  // Ej: "pizza-roma.x7k2m1@facturas-restaurantes.brainstormersagency.com"
  
  // ✅ 2. Validar dominio
  if (!recipient.includes('@facturas-restaurantes.brainstormersagency.com')) {
    return new Response('Dominio inválido', { status: 400 })
  }
  
  // ✅ 3. Extraer unique_id del email
  const emailPrefix = recipient.split('@')[0] // "pizza-roma.x7k2m1"
  const parts = emailPrefix.split('.')
  const uniqueId = parts[parts.length - 1] // "x7k2m1" (último elemento)
  
  // ✅ 4. Buscar restaurante por unique_id
  const { data: restaurante, error } = await supabase
    .from('restaurantes')
    .select('id, nombre, email_facturas')
    .eq('unique_id', uniqueId)
    .single()
  
  if (error || !restaurante) {
    console.error(`❌ Restaurante no encontrado para unique_id: ${uniqueId}`)
    return new Response('Restaurante no encontrado', { status: 404 })
  }
  
  console.log(`✅ Email identificado para: ${restaurante.nombre}`)
  
  // ✅ 5. Procesar adjuntos normalmente
  const adjuntos = extraerAdjuntos(formData)
  
  for (const adjunto of adjuntos) {
    await procesarFactura(adjunto, restaurante.id)
  }
  
  // ✅ 6. Log para auditoría
  await registrarEmailRecibido(restaurante.id, recipient, formData)
  
  return new Response('OK', { status: 200 })
}
```

### Función de auditoría
```typescript
async function registrarEmailRecibido(restauranteId: string, emailDestino: string, formData: FormData) {
  await supabase.from('email_logs').insert({
    restaurante_id: restauranteId,
    email_destino: emailDestino,
    email_remitente: formData.get('sender') as string,
    asunto: formData.get('subject') as string || 'Sin asunto',
    num_adjuntos: parseInt(formData.get('attachment-count') as string || '0'),
    mailgun_message_id: formData.get('message-id') as string,
    mailgun_timestamp: new Date().toISOString(),
    procesado: true
  })
}
```

---

## 🎛️ Dashboard del Restaurante

### Información mostrada automáticamente
```typescript
// Componente React para mostrar info del email
function EmailFacturasInfo({ restaurante }) {
  return (
    <div className="email-info-card">
      <h3>📧 Tu Email de Facturas</h3>
      
      <div className="email-display">
        <code>{restaurante.email_facturas}</code>
        <button onClick={() => copyToClipboard(restaurante.email_facturas)}>
          📋 Copiar
        </button>
      </div>
      
      <div className="instructions">
        <p>✅ <strong>Este es tu email único para facturas</strong></p>
        <p>• Compártelo con tus proveedores</p>
        <p>• Reenvía facturas que recibas en otros emails</p>
        <p>• Solo funciona para tu restaurante "{restaurante.nombre}"</p>
      </div>
      
      <div className="actions">
        <button onClick={() => enviarEmailPrueba()}>
          📤 Enviar Email de Prueba
        </button>
        <button onClick={() => verHistorialEmails()}>
          📋 Ver Historial
        </button>
      </div>
    </div>
  )
}
```

### Función de email de prueba
```typescript
async function enviarEmailPrueba(restauranteId: string, emailFacturas: string) {
  // Enviar email automático al email de facturas para verificar funcionamiento
  const testEmail = {
    to: emailFacturas,
    from: 'test@tudominio.com',
    subject: 'Prueba de email de facturas - Sistema funcionando ✅',
    text: `
      ¡Perfecto! Tu email de facturas está funcionando correctamente.
      
      Este email de prueba confirma que:
      ✅ El email ${emailFacturas} está configurado
      ✅ Los mensajes se reciben correctamente
      ✅ El sistema puede procesar tus facturas
      
      Ya puedes empezar a usar este email para tus facturas.
    `,
    attachments: [
      {
        filename: 'factura-prueba.pdf',
        path: './assets/factura-ejemplo.pdf'
      }
    ]
  }
  
  // Enviar usando tu servicio de email (SendGrid, Mailgun, etc.)
  await enviarEmail(testEmail)
}
```

---

## 📊 Métricas y Monitoreo

### KPIs del Sistema de Emails
```typescript
async function obtenerMetricasEmails() {
  // Emails recibidos por período
  const emailsHoy = await supabase
    .from('email_logs')
    .select('count')
    .gte('fecha_recepcion', new Date().toISOString().split('T')[0])
  
  // Restaurantes activos (que han recibido emails)
  const restaurantesActivos = await supabase
    .from('email_logs')
    .select('restaurante_id')
    .gte('fecha_recepcion', new Date(Date.now() - 30*24*60*60*1000).toISOString())
    .group('restaurante_id')
  
  // Errores de procesamiento
  const errores = await supabase
    .from('email_logs')
    .select('count')
    .eq('procesado', false)
    .gte('fecha_recepcion', new Date(Date.now() - 24*60*60*1000).toISOString())
  
  return {
    emailsRecibidosHoy: emailsHoy.length,
    restaurantesActivos: restaurantesActivos.length,
    erroresUltimas24h: errores.length,
    tasaExito: ((emailsHoy.length - errores.length) / emailsHoy.length * 100).toFixed(2)
  }
}
```

### Dashboard de administración
```typescript
function AdminEmailDashboard() {
  const [metricas, setMetricas] = useState(null)
  
  return (
    <div className="admin-dashboard">
      <h2>📧 Sistema de Emails - Estado</h2>
      
      <div className="metricas-grid">
        <div className="metrica">
          <h3>Emails Hoy</h3>
          <span className="numero">{metricas?.emailsRecibidosHoy}</span>
        </div>
        
        <div className="metrica">
          <h3>Restaurantes Activos</h3>
          <span className="numero">{metricas?.restaurantesActivos}</span>
        </div>
        
        <div className="metrica">
          <h3>Tasa de Éxito</h3>
          <span className="numero">{metricas?.tasaExito}%</span>
        </div>
      </div>
      
      <div className="logs-recientes">
        <h3>📋 Emails Recientes</h3>
        <EmailLogsList />
      </div>
    </div>
  )
}
```

---

## 🔒 Seguridad y Validaciones

### Validaciones del Sistema
```typescript
// Validaciones antes de procesar email
async function validarEmailEntrante(recipient: string, sender: string) {
  // 1. Validar dominio de destino
  if (!recipient.endsWith('@facturas-restaurantes.brainstormersagency.com')) {
    throw new Error('Dominio de destino inválido')
  }
  
  // 2. Validar formato del unique_id
  const uniqueId = extraerUniqueId(recipient)
  if (!/^[a-z0-9]{6}$/.test(uniqueId)) {
    throw new Error('Formato de unique_id inválido')
  }
  
  // 3. Rate limiting por remitente
  const emailsRecientes = await contarEmailsRecientes(sender)
  if (emailsRecientes > 50) { // Máximo 50 emails por hora por remitente
    throw new Error('Rate limit excedido')
  }
  
  // 4. Validar tamaño de adjuntos
  const tamanoTotal = calcularTamanoAdjuntos(formData)
  if (tamanoTotal > 50 * 1024 * 1024) { // Máximo 50MB
    throw new Error('Tamaño de adjuntos excede el límite')
  }
}
```

### Protección contra spam
```typescript
async function proteccionAntiSpam(sender: string, subject: string) {
  // Lista negra de remitentes
  const blacklist = await supabase
    .from('email_blacklist')
    .select('email')
    .eq('email', sender)
    .single()
  
  if (blacklist) {
    throw new Error('Remitente en lista negra')
  }
  
  // Detectar patrones de spam en asunto
  const spamPatterns = [
    /viagra/i, /casino/i, /lottery/i, /winner/i,
    /urgent/i, /congratulations/i, /claim.*prize/i
  ]
  
  const esSpam = spamPatterns.some(pattern => pattern.test(subject))
  if (esSpam) {
    await supabase.from('spam_attempts').insert({
      sender, subject, timestamp: new Date().toISOString()
    })
    throw new Error('Email detectado como spam')
  }
}
```

---

## 🚀 Ventajas del Sistema Automático

### Para el Desarrollo
✅ **Cero configuración manual:** Todo automático en el registro
✅ **Escalabilidad infinita:** Funciona para millones de restaurantes
✅ **Mantenimiento mínimo:** Una vez configurado, funciona solo
✅ **Debugging simple:** Logs completos de todo el proceso

### Para el Restaurante
✅ **Inmediato:** Email listo al terminar registro
✅ **Único:** Imposible confusión con otros restaurantes
✅ **Memorable:** Include el nombre del restaurante
✅ **Profesional:** Dominio dedicado y serio

### Para el Negocio
✅ **Diferenciador:** Feature única en el mercado
✅ **Confiabilidad:** Sistema robusto y probado
✅ **Escalable:** Costo fijo independiente del número de restaurantes
✅ **Automatizado:** Reduce carga operativa

---

## 🔧 Configuración e Instalación

### Variables de Entorno
```bash
# Mailgun (ya configuradas)
MAILGUN_API_KEY=key-xxxxx
MAILGUN_DOMAIN=facturas-restaurantes.brainstormersagency.com

# Supabase (ya configuradas)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Nuevas para emails automáticos
EMAIL_DOMAIN=facturas-restaurantes.brainstormersagency.com
EMAIL_WEBHOOK_URL=https://tudominio.com/functions/v1/webhook-mailgun
```

### Migration SQL
```sql
-- Añadir campos nuevos a tabla restaurantes
ALTER TABLE restaurantes 
ADD COLUMN IF NOT EXISTS unique_id VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS slug VARCHAR(50),
ADD COLUMN IF NOT EXISTS email_facturas VARCHAR(255) UNIQUE;

-- Generar datos para restaurantes existentes
UPDATE restaurantes 
SET 
  unique_id = generate_unique_id(),
  slug = create_slug(nombre),
  email_facturas = concat(create_slug(nombre), '.', generate_unique_id(), '@facturas-restaurantes.brainstormersagency.com')
WHERE unique_id IS NULL;

-- Crear tabla de logs
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID REFERENCES restaurantes(id),
  email_destino VARCHAR(255),
  email_remitente VARCHAR(255),
  asunto TEXT,
  num_adjuntos INTEGER DEFAULT 0,
  fecha_recepcion TIMESTAMP DEFAULT NOW(),
  procesado BOOLEAN DEFAULT false,
  mailgun_message_id VARCHAR(255)
);
```

---

## 📈 Roadmap de Mejoras

### Fase 1: Básico ✅
- [x] Generación automática de emails
- [x] Webhook de procesamiento
- [x] Dashboard básico

### Fase 2: Avanzado
- [ ] Email de bienvenida automático con instrucciones
- [ ] Reenvío de facturas desde email personal
- [ ] Templates personalizables de respuesta

### Fase 3: Premium
- [ ] Dominio personalizado por restaurante
- [ ] Múltiples emails por restaurante
- [ ] Integración con gestores de email existentes

---

*Última actualización: Agosto 2025*
*Versión: 1.0*