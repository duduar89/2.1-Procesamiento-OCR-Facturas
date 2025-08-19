¡Ah, perfecto! Te explico **exactamente** lo que necesitamos para las APIs:

## 🔌 **APIs - Lo que necesitamos**

### **Para cada API (Numier, Revel, etc.) necesitamos:**

#### **1. Credenciales de Conexión**
```javascript
// NUMIER necesita:
{
  api_key: "Y8anMRi7qGmBt35xTgVeNvJ0WukF2KCw",
  base_url: "https://www.numier.com/api/public/index.php/api",
  tpv_ids: ["9763", "9764"] // IDs de las cajas registradoras
}

// REVEL necesitaría:
{
  api_key: "revel_key_123",
  api_secret: "revel_secret_456", 
  establishment_id: "12345"
}

// SQUARE necesitaría:
{
  access_token: "square_token_789",
  location_id: "L123ABC"
}
```

#### **2. Configuración de Sincronización**
```javascript
{
  sync_automatico: true,           // ¿Sincronizar automáticamente?
  sync_intervalo_horas: 6,         // Cada cuánto sincronizar
  fecha_desde: "2025-01-01",       // Desde cuándo traer datos
  endpoints_activos: ["sales", "products"], // Qué datos traer
  horario_sync: "02:00"           // A qué hora del día
}
```

#### **3. Configuración de Mapeo (igual que CSV)**
```javascript
// Porque cada API devuelve campos diferentes:

// NUMIER devuelve:
{
  "BusinessDay": "2025-01-15",
  "Totals.GrossAmount": 125.50,
  "Payments": "Efectivo"
}

// REVEL devolvería:
{
  "sale_date": "2025-01-15", 
  "total_amount": 125.50,
  "payment_type": "Cash"
}

// Necesitamos mapear:
NUMIER: "BusinessDay" → fecha_venta
REVEL: "sale_date" → fecha_venta

NUMIER: "Totals.GrossAmount" → total_bruto  
REVEL: "total_amount" → total_bruto
```

## 🔧 **Lo que hay que crear:**

### **1. Configurador de API** (Frontend)
```
┌─────────────────────────────────────┐
│  🔌 Configurar API                  │
├─────────────────────────────────────┤
│  Tipo: [Numier ▼]                  │
│  API Key: [___________________]     │
│  TPV IDs: [9763, 9764]             │
│  URL Base: [auto-completado]       │
│                                     │
│  📊 Configuración Sync:             │
│  ☑ Automático cada 6 horas         │
│  ☑ Traer ventas                    │
│  ☑ Traer productos                 │
│  Desde: [2024-01-01]               │
│                                     │
│  [🧪 Probar Conexión]              │
│  [💾 Guardar Configuración]        │
└─────────────────────────────────────┘
```

### **2. Mapeador de Campos de API**
```
┌─────────────────────────────────────────┐
│  🗃️ Mapear Campos - API Numier          │
├─────────────────────────────────────────┤
│  API DEVUELVE:           MAPEAR A:      │
│  BusinessDay        →    fecha_venta    │
│  Totals.GrossAmount →    total_bruto    │  
│  Payments           →    metodo_pago    │
│  Pos.Id             →    tpv_id         │
│  NumDiners          →    num_comensales │
│                                         │
│  [💾 Guardar Mapeo] [🔄 Auto-detectar] │
└─────────────────────────────────────────┘
```

### **3. Edge Functions Específicas**

```typescript
// Para cada API:
// /functions/setup-numier-api/index.ts
// /functions/setup-revel-api/index.ts  
// /functions/setup-square-api/index.ts

// Universal:
// /functions/sync-all-apis/index.ts - Sincroniza todas las APIs activas
// /functions/configure-api-mapping/index.ts - Guarda mapeo de campos
```

## 📋 **Tabla de Configuración Universal**

```sql
CREATE TABLE api_configuraciones (
  id UUID PRIMARY KEY,
  restaurante_id UUID,
  tipo_api VARCHAR(50),              -- 'numier', 'revel', 'square'
  credenciales JSONB,                -- API keys, URLs, etc.
  configuracion_sync JSONB,          -- Cuándo y qué sincronizar  
  mapeo_campos JSONB,                -- Cómo mapear campos
  activo BOOLEAN DEFAULT true,
  ultima_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 **Flujo Completo para APIs**

### **Configuración Inicial:**
```
1. Usuario selecciona tipo de API (Numier, Revel, etc.)
2. Introduce credenciales (API key, URLs, etc.)
3. Sistema hace petición de prueba
4. Muestra campos que devuelve la API
5. Usuario mapea campos a formato unificado
6. Se guarda todo en la tabla api_configuraciones
```

### **Sincronización Automática:**
```
1. Edge Function corre cada X horas
2. Lee apis activas de cada restaurante
3. Para cada API:
   - Usa sus credenciales
   - Llama a sus endpoints
   - Aplica su mapeo de campos
   - Inserta en formato unificado
4. Log de resultados
```

## ❓ **¿Te queda claro ahora?**

La diferencia principal es que:
- **CSV/Excel**: Usuario mapea campos **manualmente**
- **APIs**: Sistema mapea campos **automáticamente** según configuración guardada

**¿Empezamos creando el configurador de APIs o tienes alguna duda?**