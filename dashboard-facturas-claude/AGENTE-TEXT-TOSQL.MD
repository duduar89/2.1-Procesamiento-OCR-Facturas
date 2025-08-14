Sí, correcto, vamos a por el **Agente Text-to-SQL**, potenciado por un sistema de aprendizaje a través de tus correcciones.

Aquí tienes el plan de acción detallado y listo para que empieces a implementarlo.

-----

## **Plan de Implementación: Agente de IA con Aprendizaje por Corrección**

Este documento describe los pasos para crear un agente que aprende de las correcciones del usuario, haciendo tu sistema de extracción de facturas más preciso con cada uso.

### **Fase 1: Preparar la Base de Datos (La "Memoria" del Agente)**

El primer paso es darle a tu agente un lugar donde almacenar su conocimiento.

#### **Acción 1.1: Activar la Extensión `pgvector`**

1.  Ve a tu panel de control de Supabase.
2.  Navega a `Database` \> `Extensions`.
3.  Busca `vector` y actívalo. Esto te permitirá realizar búsquedas semánticas.

#### **Acción 1.2: Crear la Tabla de Aprendizaje**

Crea una nueva tabla para guardar las correcciones confirmadas por los usuarios. Esta es la "memoria" que consultará el agente. Ejecuta el siguiente código en tu editor SQL de Supabase:

```sql
-- Tabla para almacenar las correcciones manuales de los usuarios
CREATE TABLE public.mapeos_confirmados_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  texto_original_factura TEXT NOT NULL,
  vector_texto public.vector(1536) NOT NULL, -- Para embeddings de OpenAI
  producto_maestro_id UUID NOT NULL REFERENCES public.productos_maestro(id) ON DELETE CASCADE,
  fecha_confirmacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Evita que el mismo texto se corrija dos veces para el mismo restaurante
  CONSTRAINT uq_restaurante_texto UNIQUE (restaurante_id, texto_original_factura)
);

-- Habilitar seguridad a nivel de fila (esencial para multi-tenant)
ALTER TABLE public.mapeos_confirmados_productos ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Usuarios pueden gestionar sus propios mapeos"
ON public.mapeos_confirmados_productos
FOR ALL
USING (auth.uid() = (SELECT user_id FROM restaurantes WHERE id = restaurante_id)); -- Simplificado, ajusta a tu esquema
```

-----

### **Fase 2: Construir la Lógica del Agente (Backend)**

Ahora creamos las funciones que permitirán al agente aprender y aplicar ese conocimiento.

#### **Acción 2.1: Crear Edge Function `corregir-mapeo-producto`**

Esta función recibirá la corrección del usuario y la guardará en la "memoria".

  * **Trigger:** Llamada desde el frontend.
  * **Input:** `{ texto_original: string, producto_maestro_id_corregido: uuid, proveedor_id: uuid }`.
  * **Lógica:**
    1.  Validar que el usuario tiene permiso sobre el `restaurante_id` actual.
    2.  Llamar a la API de OpenAI para crear un embedding vectorial del `texto_original`.
    3.  Hacer un `UPSERT` en la tabla `mapeos_confirmados_productos` con los datos recibidos y el vector generado. El `UPSERT` (en lugar de `INSERT`) te permite actualizar una corrección si ya existía.

#### **Acción 2.2: Modificar Edge Function `process-invoice`**

Actualiza tu función de extracción principal para que consulte la "memoria" antes de usar la IA genérica.

  * **Fichero a modificar:** `index.ts`.
  * **Lógica a añadir:** Dentro del bucle que procesa cada producto de una nueva factura:
    1.  Para el `descripcion_original` del producto, **crea un embedding vectorial**.
    2.  **Realiza una búsqueda semántica** en `mapeos_confirmados_productos` usando ese vector y filtrando por el `restaurante_id` actual. Para esto, puedes usar una función RPC de Supabase como la que definimos en la fase anterior.
    3.  **Implementa la decisión:**
          * **Si la búsqueda devuelve un resultado** con una similitud alta (ej. \> 0.9):
              * ¡Éxito\! El agente ha encontrado una corrección previa. Usa el `producto_maestro_id` devuelto.
              * Esto evita la llamada a la IA genérica, ahorrando costes y aumentando la precisión.
          * **Si no hay resultados fiables:**
              * Procede con tu lógica actual (usar OpenAI para clasificar).

-----

### **Fase 3: Crear la Interfaz de Corrección (Frontend)**

Ahora, dale al usuario las herramientas para que pueda "enseñar" a tu agente.

#### **Acción 3.1: Añadir la Opción de Corregir**

  * **Fichero a modificar:** `dashboard-facturas.js`.
  * **Lógica:** En el modal donde muestras los detalles de la factura, junto a cada producto extraído, añade un botón o icono de "Corregir" ✏️.

#### **Acción 3.2: Construir el Formulario de Corrección**

  * Al hacer clic en "Corregir", muestra un pequeño modal o formulario con dos campos clave:
    1.  **Un campo de texto** pre-rellenado con la descripción original, por si el usuario necesita refinarla.
    2.  **Un desplegable con buscador** que permita al usuario seleccionar el producto correcto de la tabla `productos_maestro`. Este es el componente más importante.
  * Un botón de **"Guardar Corrección"** que, al ser pulsado, recoja los datos y llame a la Edge Function `corregir-mapeo-producto`.

-----

### **Fase 4: Probar el Circuito de Aprendizaje**

Verifica que todo el flujo funciona de principio a fin.

1.  **Sube una factura** donde sepas que la IA comete un error de clasificación en un producto.
2.  **Verifica el error** en la interfaz del dashboard.
3.  **Usa tu nueva interfaz de corrección** para arreglar el mapeo del producto, asociándolo al `producto_maestro` correcto.
4.  **Verifica en la base de datos** que se ha creado una nueva entrada en `mapeos_confirmados_productos`.
5.  **Sube una factura diferente pero con un producto muy similar**.
6.  **Comprueba el resultado:** La IA ahora debería clasificar el producto correctamente, basándose en tu corrección anterior. ¡Tu agente ha aprendido\!