TODAS LAS TABLAS

[
  {
    "table_name": "alertas",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "cola_procesamiento",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "configuracion_restaurantes",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "documentos",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "embeddings_documentos",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "historial_correcciones",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "metricas_procesamiento",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "movimientos_bancarios",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "productos_extraidos",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "productos_maestro",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "project_progress_summary",
    "table_type": "VIEW"
  },
  {
    "table_name": "project_todo_logs",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "project_todos",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "proveedores",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "relaciones_documentos",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "restaurantes",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "usuarios",
    "table_type": "BASE TABLE"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "table_type": "VIEW"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "table_type": "VIEW"
  },
  {
    "table_name": "vista_facturas_completas",
    "table_type": "VIEW"
  }
]

1. DATOS EXTRAIDOS FACTURAS

| column_name                | data_type                | is_nullable | column_default    | character_maximum_length |
| -------------------------- | ------------------------ | ----------- | ----------------- | ------------------------ |
| id                         | uuid                     | NO          | gen_random_uuid() | null                     |
| documento_id               | uuid                     | NO          | null              | null                     |
| restaurante_id             | uuid                     | NO          | null              | null                     |
| proveedor_nombre           | character varying        | YES         | null              | 255                      |
| proveedor_cif              | character varying        | YES         | null              | 20                       |
| proveedor_direccion        | text                     | YES         | null              | null                     |
| proveedor_codigo_postal    | character varying        | YES         | null              | 10                       |
| proveedor_ciudad           | character varying        | YES         | null              | 100                      |
| proveedor_telefono         | character varying        | YES         | null              | 20                       |
| proveedor_email            | character varying        | YES         | null              | 100                      |
| proveedor_web              | character varying        | YES         | null              | 255                      |
| confianza_proveedor        | numeric                  | YES         | 0                 | null                     |
| numero_factura             | character varying        | NO          | null              | 100                      |
| fecha_factura              | date                     | YES         | null              | null                     |
| fecha_vencimiento          | date                     | YES         | null              | null                     |
| fecha_operacion            | date                     | YES         | null              | null                     |
| periodo_facturacion        | character varying        | YES         | null              | 50                       |
| numero_pedido              | character varying        | YES         | null              | 50                       |
| numero_albaran_relacionado | character varying        | YES         | null              | 50                       |
| confianza_datos_fiscales   | numeric                  | YES         | 0                 | null                     |
| base_imponible             | numeric                  | YES         | null              | null                     |
| total_factura              | numeric                  | NO          | null              | null                     |
| confianza_importes         | numeric                  | YES         | 0                 | null                     |
| iva_tipos                  | jsonb                    | YES         | '[]'::jsonb       | null                     |
| total_iva                  | numeric                  | YES         | 0                 | null                     |
| retencion_irpf             | numeric                  | YES         | 0                 | null                     |
| porcentaje_retencion       | numeric                  | YES         | 0                 | null                     |
| recargo_equivalencia       | numeric                  | YES         | 0                 | null                     |
| descuentos                 | jsonb                    | YES         | '[]'::jsonb       | null                     |
| total_descuentos           | numeric                  | YES         | 0                 | null                     |
| direccion_entrega          | text                     | YES         | null              | null                     |
| fecha_entrega              | date                     | YES         | null              | null                     |
| transportista              | character varying        | YES         | null              | 255                      |
| condiciones_pago           | text                     | YES         | null              | null                     |
| metodo_pago_preferido      | character varying        | YES         | null              | 50                       |
| observaciones              | text                     | YES         | null              | null                     |
| referencias_externas       | jsonb                    | YES         | '{}'::jsonb       | null                     |
| confianza_global           | numeric                  | YES         | 0                 | null                     |
| requiere_revision          | boolean                  | YES         | false             | null                     |
| campos_con_baja_confianza  | ARRAY                    | YES         | null              | null                     |
| validaciones_matematicas   | jsonb                    | YES         | '{}'::jsonb       | null                     |
| errores_detectados         | ARRAY                    | YES         | null              | null                     |
| coordenadas_campos         | jsonb                    | YES         | '{}'::jsonb       | null                     |
| fecha_extraccion           | timestamp with time zone | YES         | now()             | null                     |
| fecha_ultima_modificacion  | timestamp with time zone | YES         | now()             | null                     |
| usuario_extraccion         | uuid                     | YES         | null              | null                     |
| usuario_modificacion       | uuid                     | YES         | null              | null                     |
| historial_cambios          | jsonb                    | YES         | '[]'::jsonb       | null                     |
| cuota_iva                  | numeric                  | YES         | null              | null                     |
| tipo_iva                   | numeric                  | YES         | null              | null                     |
| proveedor_id               | uuid                     | YES         | null              | null                     |


2. DOCUMENTOS

| column_name             | data_type                | is_nullable | column_default                | character_maximum_length |
| ----------------------- | ------------------------ | ----------- | ----------------------------- | ------------------------ |
| id                      | uuid                     | NO          | gen_random_uuid()             | null                     |
| restaurante_id          | uuid                     | NO          | null                          | null                     |
| nombre_archivo          | character varying        | NO          | null                          | 255                      |
| tipo_documento          | character varying        | NO          | null                          | 20                       |
| url_storage             | text                     | NO          | null                          | null                     |
| url_thumbnail           | text                     | YES         | null                          | null                     |
| tamaño_bytes            | bigint                   | NO          | null                          | null                     |
| numero_paginas          | integer                  | YES         | 1                             | null                     |
| estado                  | character varying        | NO          | 'uploaded'::character varying | 20                       |
| confianza_clasificacion | numeric                  | YES         | 0.5                           | null                     |
| calidad_estimada        | character varying        | YES         | 'media'::character varying    | 10                       |
| modelo_ia_version       | character varying        | YES         | 'v1.0'::character varying     | 50                       |
| tiempo_procesamiento_ms | integer                  | YES         | null                          | null                     |
| tokens_consumidos       | integer                  | YES         | null                          | null                     |
| costo_procesamiento_usd | numeric                  | YES         | 0                             | null                     |
| fecha_subida            | timestamp with time zone | YES         | now()                         | null                     |
| fecha_procesamiento     | timestamp with time zone | YES         | null                          | null                     |
| usuario_subida          | uuid                     | YES         | null                          | null                     |
| usuario_validacion      | uuid                     | YES         | null                          | null                     |
| checksum_archivo        | character varying        | YES         | null                          | 64                       |
| ip_subida               | inet                     | YES         | null                          | null                     |
| tags                    | ARRAY                    | YES         | '{}'::text[]                  | null                     |
| categoria_personalizada | character varying        | YES         | null                          | 100                      |
| notas                   | text                     | YES         | null                          | null                     |

3. RESTAURANTES

| column_name               | data_type                | is_nullable | column_default                                                                                                                                                                                                                                          | character_maximum_length |
| ------------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| id                        | uuid                     | NO          | gen_random_uuid()                                                                                                                                                                                                                                       | null                     |
| nombre                    | character varying        | NO          | null                                                                                                                                                                                                                                                    | 255                      |
| nombre_comercial          | character varying        | YES         | null                                                                                                                                                                                                                                                    | 255                      |
| cif                       | character varying        | NO          | null                                                                                                                                                                                                                                                    | 12                       |
| direccion                 | text                     | YES         | null                                                                                                                                                                                                                                                    | null                     |
| codigo_postal             | character varying        | YES         | null                                                                                                                                                                                                                                                    | 10                       |
| ciudad                    | character varying        | YES         | null                                                                                                                                                                                                                                                    | 100                      |
| provincia                 | character varying        | YES         | null                                                                                                                                                                                                                                                    | 100                      |
| pais                      | character varying        | YES         | 'España'::character varying                                                                                                                                                                                                                             | 50                       |
| telefono                  | character varying        | YES         | null                                                                                                                                                                                                                                                    | 20                       |
| email                     | character varying        | YES         | null                                                                                                                                                                                                                                                    | 100                      |
| web                       | character varying        | YES         | null                                                                                                                                                                                                                                                    | 255                      |
| configuracion             | jsonb                    | YES         | '{"idioma": "es", "moneda": "EUR", "zona_horaria": "Europe/Madrid", "alertas_email": [], "umbral_confianza": 0.7, "proveedores_confiables": [], "categorias_personalizadas": ["Carnes", "Pescados", "Verduras", "Lácteos", "Bebidas", "Otros"]}'::jsonb | null                     |
| limite_documentos_mes     | integer                  | YES         | 1000                                                                                                                                                                                                                                                    | null                     |
| documentos_procesados_mes | integer                  | YES         | 0                                                                                                                                                                                                                                                       | null                     |
| limite_storage_gb         | integer                  | YES         | 5                                                                                                                                                                                                                                                       | null                     |
| storage_utilizado_gb      | numeric                  | YES         | 0                                                                                                                                                                                                                                                       | null                     |
| activo                    | boolean                  | YES         | true                                                                                                                                                                                                                                                    | null                     |
| fecha_creacion            | timestamp with time zone | YES         | now()                                                                                                                                                                                                                                                   | null                     |
| fecha_ultima_actividad    | timestamp with time zone | YES         | now()                                                                                                                                                                                                                                                   | null                     |
| plan                      | character varying        | YES         | 'basico'::character varying                                                                                                                                                                                                                             | 20                       |
| fecha_vencimiento_plan    | timestamp with time zone | YES         | null                                                                                                                                                                                                                                                    | null                     |


4. PRODUCTOS EXTRAIDOS

| column_name                | data_type                | is_nullable | column_default    | character_maximum_length |
| -------------------------- | ------------------------ | ----------- | ----------------- | ------------------------ |
| id                         | uuid                     | NO          | gen_random_uuid() | null                     |
| documento_id               | uuid                     | NO          | null              | null                     |
| factura_id                 | uuid                     | YES         | null              | null                     |
| restaurante_id             | uuid                     | NO          | null              | null                     |
| linea_numero               | integer                  | NO          | null              | null                     |
| pagina_numero              | integer                  | YES         | 1                 | null                     |
| descripcion_original       | text                     | NO          | null              | null                     |
| descripcion_normalizada    | character varying        | YES         | null              | 255                      |
| codigo_producto            | character varying        | YES         | null              | 100                      |
| codigo_barras              | character varying        | YES         | null              | 20                       |
| codigo_interno_restaurante | character varying        | YES         | null              | 50                       |
| marca                      | character varying        | YES         | null              | 100                      |
| fabricante                 | character varying        | YES         | null              | 100                      |
| categoria_principal        | character varying        | YES         | null              | 50                       |
| subcategoria               | character varying        | YES         | null              | 50                       |
| tipo_producto              | character varying        | YES         | null              | 50                       |
| origen                     | character varying        | YES         | null              | 100                      |
| certificaciones            | ARRAY                    | YES         | null              | null                     |
| unidad_medida              | character varying        | NO          | null              | 20                       |
| formato_comercial          | character varying        | YES         | null              | 100                      |
| peso_neto                  | numeric                  | YES         | null              | null                     |
| peso_bruto                 | numeric                  | YES         | null              | null                     |
| volumen                    | numeric                  | YES         | null              | null                     |
| dimensiones                | character varying        | YES         | null              | 100                      |
| cantidad                   | numeric                  | NO          | null              | null                     |
| unidades_por_caja          | numeric                  | YES         | null              | null                     |
| factor_conversion          | numeric                  | YES         | 1                 | null                     |
| precio_unitario_sin_iva    | numeric                  | YES         | null              | null                     |
| precio_unitario_con_iva    | numeric                  | YES         | null              | null                     |
| precio_total_linea_sin_iva | numeric                  | YES         | null              | null                     |
| precio_total_linea_con_iva | numeric                  | YES         | null              | null                     |
| precio_por_kg              | numeric                  | YES         | null              | null                     |
| precio_por_litro           | numeric                  | YES         | null              | null                     |
| precio_por_unidad_base     | numeric                  | YES         | null              | null                     |
| tipo_iva                   | numeric                  | YES         | null              | null                     |
| cuota_iva_linea            | numeric                  | YES         | null              | null                     |
| descuento_porcentaje       | numeric                  | YES         | 0                 | null                     |
| descuento_importe          | numeric                  | YES         | 0                 | null                     |
| motivo_descuento           | character varying        | YES         | null              | 100                      |
| lote                       | character varying        | YES         | null              | 50                       |
| fecha_caducidad            | date                     | YES         | null              | null                     |
| fecha_consumo_preferente   | date                     | YES         | null              | null                     |
| temperatura_conservacion   | character varying        | YES         | null              | 50                       |
| instrucciones_conservacion | text                     | YES         | null              | null                     |
| coordenadas_linea          | jsonb                    | YES         | null              | null                     |
| confianza_linea            | numeric                  | YES         | 0                 | null                     |
| campos_inciertos           | ARRAY                    | YES         | null              | null                     |
| requiere_revision_linea    | boolean                  | YES         | false             | null                     |
| embedding_descripcion      | USER-DEFINED             | YES         | null              | null                     |
| productos_similares_ids    | ARRAY                    | YES         | null              | null                     |
| confianza_normalizacion    | numeric                  | YES         | null              | null                     |
| fecha_extraccion           | timestamp with time zone | YES         | now()             | null                     |
| fecha_normalizacion        | timestamp with time zone | YES         | null              | null                     |
| usuario_normalizacion      | uuid                     | YES         | null              | null                     |
| producto_maestro_id        | uuid                     | YES         | null              | null                     |



5. PRODCUTOS_MAESTRO


| column_name                | data_type                | is_nullable | column_default              | character_maximum_length |
| -------------------------- | ------------------------ | ----------- | --------------------------- | ------------------------ |
| id                         | uuid                     | NO          | gen_random_uuid()           | null                     |
| restaurante_id             | uuid                     | NO          | null                        | null                     |
| nombre_normalizado         | character varying        | NO          | null                        | 255                      |
| nombre_comercial           | character varying        | YES         | null                        | 255                      |
| codigo_barras              | character varying        | YES         | null                        | 20                       |
| codigo_interno             | character varying        | YES         | null                        | 50                       |
| categoria_principal        | character varying        | NO          | null                        | 100                      |
| subcategoria               | character varying        | YES         | null                        | 100                      |
| tipo_producto              | character varying        | YES         | null                        | 50                       |
| marca                      | character varying        | YES         | null                        | 100                      |
| fabricante                 | character varying        | YES         | null                        | 100                      |
| origen                     | character varying        | YES         | null                        | 100                      |
| unidad_base                | character varying        | YES         | 'unidad'::character varying | 20                       |
| peso_unitario_kg           | numeric                  | YES         | null                        | null                     |
| contenido_neto             | character varying        | YES         | null                        | 50                       |
| precio_medio               | numeric                  | YES         | null                        | null                     |
| precio_ultimo              | numeric                  | YES         | null                        | null                     |
| proveedor_habitual_id      | uuid                     | YES         | null                        | null                     |
| es_perecedero              | boolean                  | YES         | true                        | null                     |
| requiere_refrigeracion     | boolean                  | YES         | false                       | null                     |
| alergenos                  | ARRAY                    | YES         | null                        | null                     |
| frecuencia_compra_dias     | integer                  | YES         | null                        | null                     |
| cantidad_media_pedido      | numeric                  | YES         | null                        | null                     |
| total_gastado              | numeric                  | YES         | 0                           | null                     |
| numero_compras             | integer                  | YES         | 0                           | null                     |
| fecha_creacion             | timestamp with time zone | YES         | now()                       | null                     |
| fecha_ultima_compra        | date                     | YES         | null                        | null                     |
| fecha_ultima_actualizacion | timestamp with time zone | YES         | now()                       | null                     |
| es_activo                  | boolean                  | YES         | true                        | null                     |
| es_discontinuado           | boolean                  | YES         | false                       | null                     |