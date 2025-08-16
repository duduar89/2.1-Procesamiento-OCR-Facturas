# Sistema de Facturas por WhatsApp
## Documentación Técnica y Funcional

---

## 📋 Resumen Ejecutivo

Sistema híbrido inteligente que permite a los restaurantes enviar facturas tanto por **email** como por **WhatsApp** de forma automática y sin fricción. El sistema identifica automáticamente a qué restaurante pertenece cada factura y la procesa con IA para extraer datos estructurados.

### Objetivos Clave
- **Precisión del 100%:** Cero facturas asignadas a restaurante incorrecto
- **Automatización del 95%:** Procesamiento sin intervención humana
- **Velocidad:** Confirmación en menos de 60 segundos
- **Experiencia fluida:** Simple como "reenviar un correo"

---

## 🏗️ Arquitectura del Sistema

### Canales de Entrada
1. **Email:** Direcciones únicas por restaurante (`restaurante.id@facturas.tudominio.com`)
2. **WhatsApp:** Un número único que recibe de múltiples remitentes identificados

### Estrategia Anti-Líos (3 Capas de Identificación)

#### Capa 1: Identificación por Canal Único (Método Preferido)
- **Email:** Cada restaurante tiene dirección única generada automáticamente
- **WhatsApp:** Identificación por número de teléfono del remitente vinculado previamente

#### Capa 2: Identificación por Interacción (Ambigüedad)
- Se activa cuando un número está vinculado a múltiples restaurantes
- Sistema inicia diálogo de clarificación automático

#### Capa 3: Identificación por Contenido (Verificación)
- OCR para leer CIF/NIF del documento
- Verificación de coherencia y fallback para casos edge

---

## 🔄 Flujo Completo del Sistema

### FASE 1: Registro/Auth Automático

#### 1.1 Usuario completa registro
```
Formulario incluye:
├── Nombre restaurante: "Pizza Roma"
├── Email: "admin@pizzaroma.com"
├── Teléfono administrador: "+34 600 123 456" ← Campo clave
├── CIF, dirección, etc.
└── Otros datos del negocio
```

#### 1.2 Backend automático (sin intervención)
```typescript
async function procesarRegistro(datosFormulario) {
  const uniqueId = generarUniqueId() // "x7k2m1"
  
  // ✅ Crear restaurante
  const restaurante = await supabase.from('restaurantes').insert({
    nombre: "Pizza Roma",
    unique_id: "x7k2m1",
    email_facturas: "pizza-roma.x7k2m1@facturas.tudominio.com"
  }).select().single()
  
  // ✅ Vincular WhatsApp automáticamente
  await supabase.from('whatsapp_vinculaciones').insert({
    restaurante_id: restaurante.id,
    telefono: "+34600123456",
    nombre_contacto: "Administrador",
    es_admin: true,
    activo: true
  })
}
```

#### 1.3 Dashboard muestra canales listos
```
┌─ TUS CANALES DE FACTURAS ─────────────────┐
│                                           │
│ 📧 EMAIL:                                 │
│ pizza-roma.x7k2m1@facturas.tudominio.com  │
│ [Copiar] [Enviar prueba]                  │
│                                           │
│ 📱 WHATSAPP:                              │
│ Envía desde: +34 600 123 456              │
│ Al número: +34 XXX XXX XXX                │
│ [Prueba] [Gestionar números]              │
└───────────────────────────────────────────┘
```

### FASE 2: Envío por WhatsApp

#### 2.1 Usuario envía factura
- Usuario abre WhatsApp desde su móvil registrado
- Busca contacto: +34 XXX XXX XXX (número único del sistema)
- Envía imagen/PDF de factura
- Opcionalmente añade texto descriptivo

#### 2.2 Webhook recibe mensaje
```typescript
async function procesarMensajeWhatsApp(webhookData) {
  const telefono = message.from // "+34600123456"
  const mediaId = message.image?.id || message.document?.id
  const texto = message.text?.body || ""
  
  console.log(`📱 Mensaje de ${telefono} con archivo ${mediaId}`)
}
```

### FASE 3: Procesamiento Inteligente

#### Escenario A: Un Restaurante (95% de casos)
```typescript
const vinculaciones = await buscarVinculaciones(telefono)

if (vinculaciones.length === 1) {
  const restaurante = vinculaciones[0].restaurantes
  
  // ✅ Identificación automática exitosa
  console.log(`Asignación automática: ${restaurante.nombre}`)
  
  // Procesar factura inmediatamente
  await procesarFacturaCompleta(mediaId, restaurante.id, telefono)
  
  // Confirmar al usuario
  await enviarWhatsApp(telefono, 
    `✅ Factura para "${restaurante.nombre}" procesada correctamente!`
  )
}
```

#### Escenario B: Múltiples Restaurantes (4% de casos)
```typescript
if (vinculaciones.length > 1) {
  // Guardar archivo temporalmente
  const tempId = await guardarTemporalmente(mediaId, telefono)
  
  // Iniciar diálogo
  let mensaje = "¡Hola! Gestionas varios restaurantes:\n\n"
  vinculaciones.forEach((v, i) => {
    mensaje += `${i + 1}. ${v.restaurantes.nombre}\n`
  })
  mensaje += "\n¿A cuál pertenece esta factura? Responde con el número."
  
  await enviarWhatsApp(telefono, mensaje)
  
  // Guardar estado del diálogo
  await guardarDialogo(telefono, tempId, vinculaciones)
}
```

#### Escenario C: Número Desconocido (1% de casos)
```typescript
if (vinculaciones.length === 0) {
  await enviarWhatsApp(telefono, 
    `Hola! Soy Gem, tu asistente de facturas 🤖
    
    Para procesar tus documentos necesitas:
    1️⃣ Registrarte en nuestra app
    2️⃣ Vincular este número
    
    Regístrate: https://tu-app.com/registro`
  )
}
```

### FASE 4: Resolución de Diálogos

#### 4.1 Usuario responde a diálogo múltiple
```
Usuario: "2"
Sistema: Recupera archivo temporal + Asigna al restaurante #2
```

#### 4.2 Procesamiento final
```typescript
async function resolverDialogo(telefono, respuesta) {
  const dialogo = await recuperarDialogoPendiente(telefono)
  const numeroSeleccionado = parseInt(respuesta)
  const restauranteElegido = dialogo.opciones[numeroSeleccionado - 1]
  
  // Procesar archivo guardado
  const archivo = await recuperarArchivoTemporal(dialogo.archivo_temp_id)
  await procesarFactura(archivo, restauranteElegido.restaurante_id)
  
  await enviarWhatsApp(telefono, 
    `✅ Factura asignada a "${restauranteElegido.restaurantes.nombre}"`
  )
}
```

---

## 🗄️ Estructura de Base de Datos

### Tabla: whatsapp_vinculaciones
```sql
CREATE TABLE whatsapp_vinculaciones (
  id UUID PRIMARY KEY,
  restaurante_id UUID REFERENCES restaurantes(id),
  telefono VARCHAR(20) UNIQUE, -- Un número = un restaurante
  nombre_contacto VARCHAR(100), -- "Gerente", "Encargado", etc.
  es_admin BOOLEAN DEFAULT false, -- Puede gestionar otros números
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: whatsapp_dialogos (temporal)
```sql
CREATE TABLE whatsapp_dialogos (
  id UUID PRIMARY KEY,
  telefono VARCHAR(20),
  archivo_temp_id VARCHAR(100),
  opciones JSONB, -- Lista de restaurantes para elegir
  estado VARCHAR(50), -- 'esperando_respuesta', 'completado'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour')
);
```

### Extensión tabla documentos
```sql
-- Añadir campos para origen WhatsApp
ALTER TABLE documentos ADD COLUMN telefono_origen VARCHAR(20);
ALTER TABLE documentos ADD COLUMN mensaje_original TEXT;
```

---

## 🔧 Configuración Técnica

### Variables de Entorno Requeridas
```bash
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Supabase (ya existentes)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Webhook WhatsApp (Nuevo)
```
URL: https://tudominio.com/functions/v1/webhook-whatsapp
Método: POST
Verificación: GET con verify_token
```

### Integración con Sistema Existente
- Reutiliza función `procesar-factura` existente
- Compatible con flujo email actual
- Misma tabla `documentos` para ambos canales

---

## 📱 Gestión de Múltiples Números

### Casos de Uso
1. **Restaurante con varios administradores**
2. **Cadenas de restaurantes** (director + gerentes locales)
3. **Equipos de administración** (propietario + contable + encargados)

### Dashboard de Gestión
```
📱 NÚMEROS AUTORIZADOS:
┌─────────────────────────────────────────┐
│ ✅ +34 600 111 111 (Gerente - Admin)    │
│ ✅ +34 600 222 222 (Encargado mañana)   │
│ ✅ +34 600 333 333 (Contable)           │
│                                         │
│ [+ Añadir número] [Gestionar permisos]  │
└─────────────────────────────────────────┘
```

### Funcionalidades
- **Múltiples números por restaurante:** ✅ Soportado
- **Roles diferenciados:** Admin vs Usuario
- **Gestión de permisos:** Solo admins pueden añadir/quitar
- **Auditoría:** Log de quién envía cada factura

---

## 🚀 Ventajas del Sistema

### Para el Restaurante
✅ **Cero fricción:** Envía desde donde ya trabaja (WhatsApp)
✅ **Automático:** No códigos que recordar
✅ **Flexible:** Múltiples personas pueden enviar
✅ **Rápido:** Confirmación inmediata
✅ **Familiar:** Usa WhatsApp que ya conoce

### Para el Negocio
✅ **Escalable:** Un número para 1000+ restaurantes
✅ **Económico:** Costo fijo bajo vs números únicos
✅ **Robusto:** Maneja casos edge automáticamente
✅ **Diferenciador:** Feature única en el mercado
✅ **Upsell:** Base para features premium futuras

### Técnicas
✅ **Confiable:** API oficial de WhatsApp
✅ **Integrado:** Reutiliza infraestructura existente
✅ **Monitoreado:** Logs y métricas completas
✅ **Futuro-proof:** Base sólida para crecimiento

---

## 📊 Métricas y Monitoreo

### KPIs Clave
- **Precisión de asignación:** >99.5%
- **Tiempo de procesamiento:** <60 segundos
- **Casos que requieren intervención:** <5%
- **Satisfacción del usuario:** Confirmaciones automáticas

### Alertas Automáticas
- Errores en procesamiento
- Números desconocidos frecuentes
- Diálogos sin resolver >1 hora
- Fallos en API de WhatsApp

---

## 🛠️ Plan de Implementación

### Fase 1: Base (Semana 1-2)
- [x] Configurar WhatsApp Business API
- [x] Crear webhook básico
- [x] Implementar identificación por número
- [x] Integrar con sistema existente

### Fase 2: Inteligencia (Semana 3)
- [x] Sistema de diálogos múltiples restaurantes
- [x] Manejo de números desconocidos
- [x] Confirmaciones automáticas

### Fase 3: Gestión Avanzada (Semana 4)
- [x] Dashboard múltiples números
- [x] Roles y permisos
- [x] Métricas y monitoreo

### Fase 4: Optimización (Ongoing)
- [ ] Machine learning para casos edge
- [ ] Features premium (números únicos)
- [ ] Integración con otros canales

---

## 🔒 Consideraciones de Seguridad

### Validaciones
- Verificación de webhook con verify_token
- Sanitización de números de teléfono
- Límites de rate para prevenir spam
- Validación de tipos de archivo

### Privacy
- Números de teléfono encriptados en BD
- Archivos temporales con expiración
- Logs sin información personal
- Cumplimiento GDPR

---

## 💰 Modelo de Costos

### Costos Operativos
- **WhatsApp Business API:** ~€0.005-0.02 por mensaje
- **Número WhatsApp:** ~€5-10/mes total
- **Storage adicional:** Incluido en Supabase actual

### Proyección 100 Restaurantes
- **Mensajes/mes:** ~5,000 (50 facturas × 100 restaurantes)
- **Costo WhatsApp:** ~€25-100/mes
- **Costo total:** <€150/mes
- **Revenue potencial:** €2,000/mes (+€20/restaurante)
- **ROI:** >1,200%

---

## 🔮 Roadmap Futuro

### Features Premium
- **Números únicos por restaurante** (+€15/mes)
- **Notificaciones proactivas** (recordatorios, reportes)
- **Integración con proveedores** (envío automático de facturas)

### Expansión de Canales
- **Telegram Business**
- **Microsoft Teams**
- **Slack para empresas**

### IA Avanzada
- **Predicción de proveedores** por patrones
- **Detección de duplicados** automática
- **Sugerencias de categorización**

---

## 📞 Contacto y Soporte

**Documentación técnica:** Este documento
**Logs del sistema:** Panel admin Supabase
**Monitoreo WhatsApp:** Dashboard Meta Business
**Escalación:** Equipo de desarrollo

---

*Última actualización: Agosto 2025*
*Versión: 1.0*