# 📧 Configuración Completa de Mailgun para Webhooks

## 🎯 Objetivo
Configurar Mailgun para recibir emails de facturas y enviarlos automáticamente a tu función de Supabase.

## 📋 Pasos de Configuración

### 1. 🔧 Configurar Dominio en Mailgun

#### 1.1 Agregar Dominio
1. Ve a tu dashboard de Mailgun
2. **Domains** → **Add Domain**
3. Agrega: `brainstormersagency.com`
4. Haz clic en **Add Domain**

#### 1.2 Configurar DNS
Mailgun te dará registros DNS para agregar a tu dominio. Necesitas agregar:

```
Tipo: MX
Nombre: @
Valor: mxa.mailgun.org
Prioridad: 10

Tipo: TXT
Nombre: @
Valor: v=spf1 include:mailgun.org ~all

Tipo: CNAME
Nombre: email
Valor: mailgun.org
```

### 2. 📧 Crear Email de Recepción

Una vez configurado el dominio, puedes crear emails como:
- `facturas@brainstormersagency.com`
- `test.x7k2m1@brainstormersagency.com`
- `pizza-roma.x7k2m1@brainstormersagency.com`

### 3. 🔗 Configurar Webhook

#### 3.1 Crear Webhook
1. En Mailgun: **Webhooks** → **Add Webhook**
2. **URL**: `https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/weebhook-mailgun`
3. **Events**: Selecciona `delivered`
4. **Method**: POST
5. Haz clic en **Add Webhook**

#### 3.2 Verificar Webhook
- Mailgun enviará un email de prueba
- Revisa los logs en Supabase para confirmar que funciona

### 4. 🧪 Probar el Sistema

#### 4.1 Email de Prueba
Envía un email a: `test.x7k2m1@brainstormersagency.com`

#### 4.2 Verificar Logs
1. Ve a Supabase Dashboard
2. **Edge Functions** → `weebhook-mailgun`
3. Pestaña **Logs**
4. Busca el log del email recibido

#### 4.3 Verificar Base de Datos
1. Ve a **Table Editor**
2. Tabla `documentos`
3. Deberías ver el documento creado

## 🔍 Troubleshooting

### Error 401 (Unauthorized)
- Verifica que la URL del webhook sea correcta
- Asegúrate de que la función esté deployed

### Error 404 (Restaurante no encontrado)
- Ejecuta el SQL `crear_restaurante_prueba.sql`
- Verifica que el `unique_id` coincida

### Error 500 (Internal Server Error)
- Revisa los logs de la función
- Verifica las variables de entorno

## 📊 Estructura de Emails

### Formato Esperado
```
[restaurante-nombre].[unique-id]@brainstormersagency.com
```

### Ejemplos
- `pizza-roma.x7k2m1@brainstormersagency.com`
- `restaurante-madrid.abc123@brainstormersagency.com`
- `bar-tapas.xyz789@brainstormersagency.com`

## 🎯 Próximos Pasos

1. ✅ Configurar dominio en Mailgun
2. ✅ Crear webhook
3. ✅ Ejecutar SQL para crear restaurante
4. ✅ Deploy función actualizada
5. ✅ Probar con email real
6. ✅ Verificar procesamiento automático

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Supabase
2. Verifica la configuración de Mailgun
3. Confirma que el dominio esté configurado correctamente

