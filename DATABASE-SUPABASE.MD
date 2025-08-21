[
  {
    "table_name": "alertas",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "alertas",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "alertas",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "alertas",
    "column_name": "tipo_alerta",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "categoria",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "prioridad",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "titulo",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "mensaje",
    "data_type": "text"
  },
  {
    "table_name": "alertas",
    "column_name": "descripcion_detallada",
    "data_type": "text"
  },
  {
    "table_name": "alertas",
    "column_name": "contexto",
    "data_type": "jsonb"
  },
  {
    "table_name": "alertas",
    "column_name": "impacto_estimado",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "importe_afectado",
    "data_type": "numeric"
  },
  {
    "table_name": "alertas",
    "column_name": "proveedores_afectados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "alertas",
    "column_name": "productos_afectados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "alertas",
    "column_name": "acciones_sugeridas",
    "data_type": "ARRAY"
  },
  {
    "table_name": "alertas",
    "column_name": "accion_automatica",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "requiere_accion_humana",
    "data_type": "boolean"
  },
  {
    "table_name": "alertas",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "alertas",
    "column_name": "asignada_a",
    "data_type": "uuid"
  },
  {
    "table_name": "alertas",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "alertas",
    "column_name": "fecha_asignacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "alertas",
    "column_name": "fecha_resolucion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "alertas",
    "column_name": "tiempo_resolucion_minutos",
    "data_type": "integer"
  },
  {
    "table_name": "alertas",
    "column_name": "resolucion",
    "data_type": "text"
  },
  {
    "table_name": "alertas",
    "column_name": "usuario_resolucion",
    "data_type": "uuid"
  },
  {
    "table_name": "alertas",
    "column_name": "valoracion_resolucion",
    "data_type": "integer"
  },
  {
    "table_name": "alertas",
    "column_name": "nivel_escalado",
    "data_type": "integer"
  },
  {
    "table_name": "alertas",
    "column_name": "canales_enviados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "alertas",
    "column_name": "fecha_ultimo_envio",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "alertas",
    "column_name": "usuarios_notificados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "alertas",
    "column_name": "precision_alerta",
    "data_type": "numeric"
  },
  {
    "table_name": "alertas",
    "column_name": "feedback_usuario",
    "data_type": "jsonb"
  },
  {
    "table_name": "alertas",
    "column_name": "alerta_recurrente",
    "data_type": "boolean"
  },
  {
    "table_name": "alertas",
    "column_name": "alertas_relacionadas",
    "data_type": "ARRAY"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "descripcion",
    "data_type": "text"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "categorias_productos",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "prioridad",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "intentos",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "max_intentos",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "ultimo_error",
    "data_type": "text"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "codigo_error",
    "data_type": "character varying"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "fecha_programada",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "fecha_inicio_procesamiento",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "fecha_finalizacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "tiempo_estimado_ms",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "tiempo_real_ms",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "tipo_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "tamaño_archivo",
    "data_type": "bigint"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "numero_paginas",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "servidor_procesamiento",
    "data_type": "character varying"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "tokens_ocr_utilizados",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "tokens_ner_utilizados",
    "data_type": "integer"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "costo_procesamiento_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "cola_procesamiento",
    "column_name": "configuracion_procesamiento",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "modelo_ocr_preferido",
    "data_type": "character varying"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "modelo_ner_preferido",
    "data_type": "character varying"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "umbral_confianza_general",
    "data_type": "numeric"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "umbrales_por_campo",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "alertas_activadas",
    "data_type": "boolean"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "canales_alertas",
    "data_type": "ARRAY"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "emails_alertas",
    "data_type": "ARRAY"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "telefono_alertas",
    "data_type": "character varying"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "horario_alertas_inicio",
    "data_type": "time without time zone"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "horario_alertas_fin",
    "data_type": "time without time zone"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "proveedores_confiables",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "proveedores_bloqueados",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "umbrales_precio_por_categoria",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "categorias_personalizadas",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "productos_favoritos",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "alertas_precio_productos",
    "data_type": "boolean"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "porcentaje_alerta_precio",
    "data_type": "numeric"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "regimen_fiscal",
    "data_type": "character varying"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "tipos_iva_habituales",
    "data_type": "ARRAY"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "retencion_irpf_habitual",
    "data_type": "numeric"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "auto_archivar_documentos",
    "data_type": "boolean"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "dias_antes_archivar",
    "data_type": "integer"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "backup_automatico",
    "data_type": "boolean"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "frecuencia_backup",
    "data_type": "character varying"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "integracion_contabilidad",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "webhook_url",
    "data_type": "character varying"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "api_keys_externas",
    "data_type": "jsonb"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "fecha_ultima_modificacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "configuracion_restaurantes",
    "column_name": "usuario_ultima_modificacion",
    "data_type": "uuid"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "pregunta_original",
    "data_type": "text"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "respuesta_correcta",
    "data_type": "text"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "embedding_pregunta",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "contexto",
    "data_type": "text"
  },
  {
    "table_name": "correcciones_embeddings",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "factura_id",
    "data_type": "uuid"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "campo",
    "data_type": "character varying"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "valor_original",
    "data_type": "text"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "valor_corregido",
    "data_type": "text"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "contexto_error",
    "data_type": "text"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "coordenadas_error",
    "data_type": "jsonb"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "timestamp_correccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "usuario_id",
    "data_type": "uuid"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "razon_correccion",
    "data_type": "character varying"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "tipo_error",
    "data_type": "character varying"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "impacto_confianza",
    "data_type": "numeric"
  },
  {
    "table_name": "correcciones_usuario",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "factura_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "albaran_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "metodo_deteccion",
    "data_type": "character varying"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "score_calculado",
    "data_type": "numeric"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "factores_puntuacion",
    "data_type": "jsonb"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "razon_deteccion",
    "data_type": "jsonb"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "fue_confirmado",
    "data_type": "boolean"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "usuario_decision",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "fecha_decision",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "razon_rechazo",
    "data_type": "text"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "contexto_cotejo",
    "data_type": "jsonb"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "fecha_deteccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cotejo_candidatos_detectados",
    "column_name": "fecha_ultima_modificacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "proveedor_id",
    "data_type": "uuid"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "tipo_patron",
    "data_type": "character varying"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "patron_datos",
    "data_type": "jsonb"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "confianza_patron",
    "data_type": "numeric"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "ejemplos_positivos",
    "data_type": "integer"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "ejemplos_negativos",
    "data_type": "integer"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "ultima_validacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "porcentaje_efectividad",
    "data_type": "numeric"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "fecha_deteccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "fecha_ultima_actualizacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "cotejo_patrones_aprendidos",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_cif",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_proveedor",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "numero_albaran",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_albaran",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "hora_entrega",
    "data_type": "time without time zone"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "numero_pedido_relacionado",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "numero_factura_relacionada",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_datos_albaran",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "direccion_entrega",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_entrega",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "hora_entrega_real",
    "data_type": "time without time zone"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "transportista",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "matricula_vehiculo",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "nombre_conductor",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "telefono_conductor",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "estado_entrega",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "observaciones_entrega",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "incidencias",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "recibido_por",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "firma_digital",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_recepcion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "conformidad",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "observaciones_recepcion",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "incluye_precios",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "total_albaran",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_global",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "requiere_revision",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_extraccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_ultima_modificacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "usuario_extraccion",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "numero_factura",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_factura",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_vencimiento",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "fecha_operacion",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "periodo_facturacion",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "numero_pedido",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "numero_albaran_relacionado",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_datos_fiscales",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "base_imponible",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "total_factura",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_importes",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "iva_tipos",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "total_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "retencion_irpf",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "porcentaje_retencion",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "recargo_equivalencia",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "descuentos",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "total_descuentos",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "condiciones_pago",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "metodo_pago_preferido",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "observaciones",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "referencias_externas",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "campos_con_baja_confianza",
    "data_type": "ARRAY"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "validaciones_matematicas",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "errores_detectados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "coordenadas_campos",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "usuario_modificacion",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "historial_cambios",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "cuota_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "tipo_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_openai_global",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_openai_proveedor",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_openai_numero_factura",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_openai_fecha",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "confianza_openai_importes",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "prompt_utilizado",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "modelo_openai",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "texto_completo_extracto",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "coordenadas_ocr",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_nuevo",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_direccion",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_codigo_postal",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_ciudad",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_telefono",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_email",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "proveedor_web",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_albaranes",
    "column_name": "estado_cotejacion",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_cif",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_direccion",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_codigo_postal",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_ciudad",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_telefono",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_email",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_web",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_proveedor",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "numero_factura",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "fecha_factura",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "fecha_vencimiento",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "fecha_operacion",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "periodo_facturacion",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "numero_pedido",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "numero_albaran_relacionado",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_datos_fiscales",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "base_imponible",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "total_factura",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_importes",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "iva_tipos",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "total_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "retencion_irpf",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "porcentaje_retencion",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "recargo_equivalencia",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "descuentos",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "total_descuentos",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "direccion_entrega",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "fecha_entrega",
    "data_type": "date"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "transportista",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "condiciones_pago",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "metodo_pago_preferido",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "observaciones",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "referencias_externas",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_global",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "requiere_revision",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "campos_con_baja_confianza",
    "data_type": "ARRAY"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "validaciones_matematicas",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "errores_detectados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "coordenadas_campos",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "fecha_extraccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "fecha_ultima_modificacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "usuario_extraccion",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "usuario_modificacion",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "historial_cambios",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "cuota_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "tipo_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_id",
    "data_type": "uuid"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_openai_global",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_openai_proveedor",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_openai_numero_factura",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_openai_fecha",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "confianza_openai_importes",
    "data_type": "numeric"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "prompt_utilizado",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "modelo_openai",
    "data_type": "character varying"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "texto_completo_extracto",
    "data_type": "text"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "coordenadas_ocr",
    "data_type": "jsonb"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "proveedor_nuevo",
    "data_type": "boolean"
  },
  {
    "table_name": "datos_extraidos_facturas",
    "column_name": "estado_cotejacion",
    "data_type": "text"
  },
  {
    "table_name": "documentos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos",
    "column_name": "nombre_archivo",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "tipo_archivo",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "url_storage",
    "data_type": "text"
  },
  {
    "table_name": "documentos",
    "column_name": "url_thumbnail",
    "data_type": "text"
  },
  {
    "table_name": "documentos",
    "column_name": "tamaño_bytes",
    "data_type": "bigint"
  },
  {
    "table_name": "documentos",
    "column_name": "numero_paginas",
    "data_type": "integer"
  },
  {
    "table_name": "documentos",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "confianza_clasificacion",
    "data_type": "numeric"
  },
  {
    "table_name": "documentos",
    "column_name": "calidad_estimada",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "modelo_ia_version",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "tiempo_procesamiento_ms",
    "data_type": "integer"
  },
  {
    "table_name": "documentos",
    "column_name": "tokens_consumidos",
    "data_type": "integer"
  },
  {
    "table_name": "documentos",
    "column_name": "costo_procesamiento_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "documentos",
    "column_name": "fecha_subida",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "documentos",
    "column_name": "fecha_procesamiento",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "documentos",
    "column_name": "usuario_subida",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos",
    "column_name": "usuario_validacion",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos",
    "column_name": "checksum_archivo",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "ip_subida",
    "data_type": "inet"
  },
  {
    "table_name": "documentos",
    "column_name": "tags",
    "data_type": "ARRAY"
  },
  {
    "table_name": "documentos",
    "column_name": "categoria_personalizada",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "notas",
    "data_type": "text"
  },
  {
    "table_name": "documentos",
    "column_name": "telefono_origen",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "origen_canal",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "origen",
    "data_type": "text"
  },
  {
    "table_name": "documentos",
    "column_name": "tipo_documento",
    "data_type": "text"
  },
  {
    "table_name": "documentos",
    "column_name": "tipo_documento_detectado",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos",
    "column_name": "requiere_revision_tipo",
    "data_type": "boolean"
  },
  {
    "table_name": "documentos",
    "column_name": "patrones_detectados",
    "data_type": "jsonb"
  },
  {
    "table_name": "documentos",
    "column_name": "revisado_por",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos",
    "column_name": "fecha_revision_tipo",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "documentos",
    "column_name": "estado_cotejacion",
    "data_type": "text"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "clasificacion_original",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "decision_usuario",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "metodo_feedback",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "texto_clave",
    "data_type": "text"
  },
  {
    "table_name": "documentos_feedback_clasificacion",
    "column_name": "fecha_feedback",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "tipo_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "numero_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "proveedor_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "proveedor_id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "fecha_documento",
    "data_type": "date"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "importe_documento",
    "data_type": "numeric"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "dias_sin_enlace",
    "data_type": "integer"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "razon_estado",
    "data_type": "text"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "intentos_busqueda",
    "data_type": "integer"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "ultima_busqueda",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "candidatos_evaluados",
    "data_type": "integer"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "asignado_a",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "prioridad",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "fecha_limite",
    "data_type": "date"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "fecha_deteccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "fecha_resolucion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "resuelto_por",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_huerfanos",
    "column_name": "fecha_ultima_modificacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "documento_id",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "origen",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "telefono",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "usuario_id",
    "data_type": "uuid"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "tipo_sugerido",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "confianza",
    "data_type": "integer"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "razones",
    "data_type": "ARRAY"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "respuesta_usuario",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "timestamp",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "resuelto_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "resuelto_por",
    "data_type": "character varying"
  },
  {
    "table_name": "documentos_pendientes_revision",
    "column_name": "datos_documento",
    "data_type": "jsonb"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "embedding_proveedor",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "embedding_productos",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "embedding_contenido_general",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "embedding_descripcion_factura",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "embedding_productos_categoria",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "modelo_embedding",
    "data_type": "character varying"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "version_modelo",
    "data_type": "character varying"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "tokens_utilizados",
    "data_type": "integer"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "costo_generacion_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "similitudes_proveedores",
    "data_type": "jsonb"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "similitudes_documentos",
    "data_type": "jsonb"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "similitudes_globales",
    "data_type": "jsonb"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "calidad_embedding",
    "data_type": "numeric"
  },
  {
    "table_name": "embeddings_documentos",
    "column_name": "ultimo_uso",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "factura_id",
    "data_type": "uuid"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "albaran_id",
    "data_type": "uuid"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "numero_referencia",
    "data_type": "character varying"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "importe_referencia",
    "data_type": "numeric"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "importe_diferencia",
    "data_type": "numeric"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "metodo_deteccion",
    "data_type": "character varying"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "confianza_match",
    "data_type": "numeric"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "razon_match",
    "data_type": "jsonb"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "usuario_validacion",
    "data_type": "uuid"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "fecha_validacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "observaciones",
    "data_type": "text"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "fecha_cotejo",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "fecha_ultima_modificacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "usuario_extraccion",
    "data_type": "uuid"
  },
  {
    "table_name": "facturas_albaranes_enlaces",
    "column_name": "created_by",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "campo_corregido",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "tabla_origen",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "registro_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "valor_ia_original",
    "data_type": "text"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "valor_corregido",
    "data_type": "text"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "confianza_ia_original",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "tipo_error",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "subtipo_error",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "gravedad_error",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "afecta_calculos",
    "data_type": "boolean"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "tiempo_correccion_ms",
    "data_type": "integer"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "metodo_correccion",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "coordenadas_campo",
    "data_type": "jsonb"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "texto_contexto",
    "data_type": "text"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "usuario_correccion",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "sesion_id",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "dispositivo",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "navegador",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "fecha_correccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "momento_en_sesion",
    "data_type": "integer"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "tiempo_desde_carga_ms",
    "data_type": "integer"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "confirmacion_usuario",
    "data_type": "boolean"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "motivo_correccion",
    "data_type": "text"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "dificultad_percibida",
    "data_type": "integer"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "utilizada_para_entrenamiento",
    "data_type": "boolean"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "peso_para_ml",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "modelo_version_cuando_error",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "error_repetido",
    "data_type": "boolean"
  },
  {
    "table_name": "historial_correcciones",
    "column_name": "mejora_confianza_posterior",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "producto_maestro_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "proveedor_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "precio_unitario_sin_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "precio_unitario_con_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "precio_por_kg",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "precio_por_litro",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "precio_por_unidad_base",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "cantidad_comprada",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "unidad_medida",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "formato_comercial",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "tipo_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "fecha_compra",
    "data_type": "date"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "fecha_registro",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "tipo_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "numero_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "proveedor_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "historial_precios_productos",
    "column_name": "es_primera_compra",
    "data_type": "boolean"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "fecha",
    "data_type": "date"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "documentos_procesados",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "documentos_facturas",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "documentos_albaranes",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "documentos_tickets",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "documentos_con_error",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "precision_global",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "precision_proveedores",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "precision_importes",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "precision_productos",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "precision_fechas",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tiempo_promedio_procesamiento_ms",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tiempo_promedio_ocr_ms",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tiempo_promedio_ner_ms",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tiempo_promedio_validacion_ms",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tokens_openai_consumidos",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "costo_openai_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tokens_google_consumidos",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "costo_google_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "costo_total_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "reintentos_totales",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tipos_error_frecuentes",
    "data_type": "jsonb"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "mejoras_precision_ml",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "usuarios_activos",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "correcciones_manuales",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tiempo_promedio_correccion_ms",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "alertas_generadas",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "alertas_criticas",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "alertas_resueltas",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "tiempo_promedio_resolucion_alertas_horas",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "storage_utilizado_gb",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_procesamiento",
    "column_name": "documentos_archivados",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "fecha",
    "data_type": "date"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "tipo_metrica",
    "data_type": "character varying"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "total_ventas",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "total_tickets",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "ticket_promedio",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "total_comensales",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "efectivo",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "tarjeta",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "otros_pagos",
    "data_type": "numeric"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "productos_vendidos",
    "data_type": "integer"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "categoria_top",
    "data_type": "character varying"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "producto_top",
    "data_type": "character varying"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "ventas_por_sistema",
    "data_type": "jsonb"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "calculado_en",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "metricas_restaurante",
    "column_name": "datos_completos",
    "data_type": "jsonb"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "numero_cuenta",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "entidad_bancaria",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "numero_operacion",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "referencia_bancaria",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "fecha_operacion",
    "data_type": "date"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "fecha_valor",
    "data_type": "date"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "importe",
    "data_type": "numeric"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "tipo_movimiento",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "concepto",
    "data_type": "text"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "concepto_normalizado",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "codigo_transaccion",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "factura_relacionada_id",
    "data_type": "uuid"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "confianza_conciliacion",
    "data_type": "numeric"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "metodo_conciliacion",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "categoria",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "subcategoria",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "proveedor_detectado",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "estado_conciliacion",
    "data_type": "character varying"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "fecha_importacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "usuario_importacion",
    "data_type": "uuid"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "fecha_conciliacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "usuario_conciliacion",
    "data_type": "uuid"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "observaciones",
    "data_type": "text"
  },
  {
    "table_name": "movimientos_bancarios",
    "column_name": "tags",
    "data_type": "ARRAY"
  },
  {
    "table_name": "patrones_error",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "patrones_error",
    "column_name": "campo",
    "data_type": "character varying"
  },
  {
    "table_name": "patrones_error",
    "column_name": "patron_error",
    "data_type": "text"
  },
  {
    "table_name": "patrones_error",
    "column_name": "contexto_problematico",
    "data_type": "text"
  },
  {
    "table_name": "patrones_error",
    "column_name": "frecuencia_error",
    "data_type": "integer"
  },
  {
    "table_name": "patrones_error",
    "column_name": "solucion_aplicada",
    "data_type": "text"
  },
  {
    "table_name": "patrones_error",
    "column_name": "timestamp_ultimo_error",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "patrones_error",
    "column_name": "timestamp_primer_error",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "patrones_error",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "patrones_error",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "patrones_error",
    "column_name": "severidad",
    "data_type": "character varying"
  },
  {
    "table_name": "patrones_error",
    "column_name": "campos_afectados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "patrones_error",
    "column_name": "prompt_corregido",
    "data_type": "text"
  },
  {
    "table_name": "patrones_error",
    "column_name": "version_prompt",
    "data_type": "character varying"
  },
  {
    "table_name": "productos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "productos",
    "column_name": "categoria",
    "data_type": "character varying"
  },
  {
    "table_name": "productos",
    "column_name": "precio",
    "data_type": "numeric"
  },
  {
    "table_name": "productos",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "productos",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "producto_id_externo",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "sistema_origen",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "descripcion",
    "data_type": "text"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "categoria_id",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "categoria_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "subcategoria",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "precio_base",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "precios_alternativos",
    "data_type": "jsonb"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "disponible",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "datos_originales",
    "data_type": "jsonb"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "imagen_url",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "tags",
    "data_type": "jsonb"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_catalogo",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "producto_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "descripcion_original",
    "data_type": "text"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "embedding",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "categoria",
    "data_type": "text"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "sinonimos",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "frecuencia_uso",
    "data_type": "integer"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "ultima_actualizacion",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "productos_embeddings",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "factura_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "linea_numero",
    "data_type": "integer"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "pagina_numero",
    "data_type": "integer"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "descripcion_original",
    "data_type": "text"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "descripcion_normalizada",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "codigo_producto",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "codigo_barras",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "codigo_interno_restaurante",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "marca",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "fabricante",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "categoria_principal",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "subcategoria",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "tipo_producto",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "origen",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "certificaciones",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "unidad_medida",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "formato_comercial",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "peso_neto",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "peso_bruto",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "volumen",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "dimensiones",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "cantidad",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "unidades_por_caja",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "factor_conversion",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_unitario_sin_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_unitario_con_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_total_linea_sin_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_total_linea_con_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_por_kg",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_por_litro",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "precio_por_unidad_base",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "tipo_iva",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "cuota_iva_linea",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "descuento_porcentaje",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "descuento_importe",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "motivo_descuento",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "lote",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "fecha_caducidad",
    "data_type": "date"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "fecha_consumo_preferente",
    "data_type": "date"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "temperatura_conservacion",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "instrucciones_conservacion",
    "data_type": "text"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "coordenadas_linea",
    "data_type": "jsonb"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "confianza_linea",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "campos_inciertos",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "requiere_revision_linea",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "embedding_descripcion",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "productos_similares_ids",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "confianza_normalizacion",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "fecha_extraccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "fecha_normalizacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "usuario_normalizacion",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "producto_maestro_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "linea_original",
    "data_type": "text"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "numero_linea",
    "data_type": "integer"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "es_primera_compra",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "proveedor_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_extraidos",
    "column_name": "numero_factura",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "nombre_normalizado",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "nombre_comercial",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "codigo_barras",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "codigo_interno",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "categoria_principal",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "subcategoria",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "tipo_producto",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "marca",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "fabricante",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "origen",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "unidad_base",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "peso_unitario_kg",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "contenido_neto",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "precio_medio",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "precio_ultimo",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "proveedor_habitual_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "es_perecedero",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "requiere_refrigeracion",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "alergenos",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "frecuencia_compra_dias",
    "data_type": "integer"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "cantidad_media_pedido",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "total_gastado",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "numero_compras",
    "data_type": "integer"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "fecha_ultima_compra",
    "data_type": "date"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "fecha_ultima_actualizacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "es_activo",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "es_discontinuado",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "fecha_ultimo_precio",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "precio_minimo_historico",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "precio_maximo_historico",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "precio_promedio_30dias",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "variacion_precio_porcentaje",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "numero_compras_historicas",
    "data_type": "integer"
  },
  {
    "table_name": "productos_maestro",
    "column_name": "es_primera_compra",
    "data_type": "boolean"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "nombre_normalizado",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "categoria",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "peso_tipico_kg",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "volumen_tipico_l",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "unidad_base",
    "data_type": "character varying"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "formatos_comunes",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "palabras_clave",
    "data_type": "ARRAY"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "productos_tipicos",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "productos_venta",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_venta",
    "column_name": "venta_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_venta",
    "column_name": "producto_id",
    "data_type": "uuid"
  },
  {
    "table_name": "productos_venta",
    "column_name": "cantidad",
    "data_type": "integer"
  },
  {
    "table_name": "productos_venta",
    "column_name": "precio_unitario",
    "data_type": "numeric"
  },
  {
    "table_name": "productos_venta",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "module_name",
    "data_type": "character varying"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "total_tasks",
    "data_type": "bigint"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "completed_tasks",
    "data_type": "bigint"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "in_progress_tasks",
    "data_type": "bigint"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "pending_tasks",
    "data_type": "bigint"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "completion_percentage",
    "data_type": "numeric"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "total_estimated_hours",
    "data_type": "numeric"
  },
  {
    "table_name": "project_progress_summary",
    "column_name": "total_actual_hours",
    "data_type": "numeric"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "todo_id",
    "data_type": "uuid"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "action",
    "data_type": "character varying"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "old_value",
    "data_type": "text"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "new_value",
    "data_type": "text"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "comment",
    "data_type": "text"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "project_todo_logs",
    "column_name": "created_by",
    "data_type": "uuid"
  },
  {
    "table_name": "project_todos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "project_todos",
    "column_name": "task_title",
    "data_type": "character varying"
  },
  {
    "table_name": "project_todos",
    "column_name": "task_description",
    "data_type": "text"
  },
  {
    "table_name": "project_todos",
    "column_name": "module_name",
    "data_type": "character varying"
  },
  {
    "table_name": "project_todos",
    "column_name": "status",
    "data_type": "character varying"
  },
  {
    "table_name": "project_todos",
    "column_name": "priority",
    "data_type": "integer"
  },
  {
    "table_name": "project_todos",
    "column_name": "difficulty",
    "data_type": "character varying"
  },
  {
    "table_name": "project_todos",
    "column_name": "estimated_hours",
    "data_type": "numeric"
  },
  {
    "table_name": "project_todos",
    "column_name": "actual_hours",
    "data_type": "numeric"
  },
  {
    "table_name": "project_todos",
    "column_name": "completion_percentage",
    "data_type": "integer"
  },
  {
    "table_name": "project_todos",
    "column_name": "module_order",
    "data_type": "integer"
  },
  {
    "table_name": "project_todos",
    "column_name": "task_order",
    "data_type": "integer"
  },
  {
    "table_name": "project_todos",
    "column_name": "tags",
    "data_type": "ARRAY"
  },
  {
    "table_name": "project_todos",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "project_todos",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "project_todos",
    "column_name": "started_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "project_todos",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "project_todos",
    "column_name": "assigned_to",
    "data_type": "uuid"
  },
  {
    "table_name": "project_todos",
    "column_name": "created_by",
    "data_type": "uuid"
  },
  {
    "table_name": "project_todos",
    "column_name": "depends_on",
    "data_type": "ARRAY"
  },
  {
    "table_name": "project_todos",
    "column_name": "blocks",
    "data_type": "ARRAY"
  },
  {
    "table_name": "project_todos",
    "column_name": "notes",
    "data_type": "text"
  },
  {
    "table_name": "project_todos",
    "column_name": "completion_notes",
    "data_type": "text"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "version",
    "data_type": "character varying"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "prompt_text",
    "data_type": "text"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "campos_cubiertos",
    "data_type": "ARRAY"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "reglas_especiales",
    "data_type": "ARRAY"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "precision_global",
    "data_type": "numeric"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "precision_por_campo",
    "data_type": "jsonb"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "creado_por",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "descripcion",
    "data_type": "text"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "cambios_aplicados",
    "data_type": "ARRAY"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "facturas_procesadas",
    "data_type": "integer"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "errores_corregidos",
    "data_type": "integer"
  },
  {
    "table_name": "prompts_optimizados",
    "column_name": "prompt_anterior_id",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "nombre_prompt",
    "data_type": "character varying"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "prompt_text",
    "data_type": "text"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "campos_especiales",
    "data_type": "ARRAY"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "proveedores_frecuentes",
    "data_type": "ARRAY"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "reglas_especiales",
    "data_type": "ARRAY"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "fecha_ultima_edicion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "creado_por",
    "data_type": "uuid"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "version",
    "data_type": "character varying"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "descripcion",
    "data_type": "text"
  },
  {
    "table_name": "prompts_restaurante",
    "column_name": "tags",
    "data_type": "ARRAY"
  },
  {
    "table_name": "proveedores",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "proveedores",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "proveedores",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "cif",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "direccion_completa",
    "data_type": "text"
  },
  {
    "table_name": "proveedores",
    "column_name": "codigo_postal",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "ciudad",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "provincia",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "pais",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "telefono",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "email",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "web",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "tipo_proveedor",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "categoria_principal",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "es_activo",
    "data_type": "boolean"
  },
  {
    "table_name": "proveedores",
    "column_name": "forma_pago",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "dias_pago",
    "data_type": "integer"
  },
  {
    "table_name": "proveedores",
    "column_name": "descuento_habitual",
    "data_type": "numeric"
  },
  {
    "table_name": "proveedores",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "proveedores",
    "column_name": "fecha_ultima_factura",
    "data_type": "date"
  },
  {
    "table_name": "proveedores",
    "column_name": "total_facturado",
    "data_type": "numeric"
  },
  {
    "table_name": "proveedores",
    "column_name": "numero_facturas",
    "data_type": "integer"
  },
  {
    "table_name": "proveedores",
    "column_name": "tipo_proveedor_especifico",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "afecta_cogs",
    "data_type": "boolean"
  },
  {
    "table_name": "proveedores",
    "column_name": "iban",
    "data_type": "character varying"
  },
  {
    "table_name": "proveedores",
    "column_name": "alias",
    "data_type": "ARRAY"
  },
  {
    "table_name": "proveedores",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "proveedor_id",
    "data_type": "uuid"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "nombre_proveedor",
    "data_type": "text"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "embedding",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "alias",
    "data_type": "ARRAY"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "frecuencia_uso",
    "data_type": "integer"
  },
  {
    "table_name": "proveedores_embeddings",
    "column_name": "sinonimos",
    "data_type": "text"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "user_id",
    "data_type": "uuid"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "subscription_data",
    "data_type": "jsonb"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "documento_origen_id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "documento_destino_id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "tipo_relacion",
    "data_type": "character varying"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "confianza_relacion",
    "data_type": "numeric"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "metodo_matching",
    "data_type": "character varying"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "discrepancias_detectadas",
    "data_type": "jsonb"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "diferencias_importantes",
    "data_type": "boolean"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "requiere_revision_manual",
    "data_type": "boolean"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "validada_por",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "fecha_validacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "fecha_deteccion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "usuario_deteccion",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "algoritmo_version",
    "data_type": "character varying"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "notas",
    "data_type": "text"
  },
  {
    "table_name": "relaciones_documentos",
    "column_name": "motivo_rechazo",
    "data_type": "text"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "prompt_id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "factura_id",
    "data_type": "uuid"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "resultado_extraccion",
    "data_type": "jsonb"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "confianza_obtenida",
    "data_type": "numeric"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "campos_extraidos_correctamente",
    "data_type": "ARRAY"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "campos_con_error",
    "data_type": "ARRAY"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "timestamp_procesamiento",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "tiempo_procesamiento_ms",
    "data_type": "integer"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "tokens_consumidos",
    "data_type": "integer"
  },
  {
    "table_name": "relaciones_prompts",
    "column_name": "costo_procesamiento_usd",
    "data_type": "numeric"
  },
  {
    "table_name": "restaurantes",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "restaurantes",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "nombre_comercial",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "cif",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "direccion",
    "data_type": "text"
  },
  {
    "table_name": "restaurantes",
    "column_name": "codigo_postal",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "ciudad",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "provincia",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "pais",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "telefono",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "email",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "web",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "configuracion",
    "data_type": "jsonb"
  },
  {
    "table_name": "restaurantes",
    "column_name": "limite_documentos_mes",
    "data_type": "integer"
  },
  {
    "table_name": "restaurantes",
    "column_name": "documentos_procesados_mes",
    "data_type": "integer"
  },
  {
    "table_name": "restaurantes",
    "column_name": "limite_storage_gb",
    "data_type": "integer"
  },
  {
    "table_name": "restaurantes",
    "column_name": "storage_utilizado_gb",
    "data_type": "numeric"
  },
  {
    "table_name": "restaurantes",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "restaurantes",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "restaurantes",
    "column_name": "fecha_ultima_actividad",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "restaurantes",
    "column_name": "plan",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "fecha_vencimiento_plan",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "restaurantes",
    "column_name": "unique_id",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "email_facturas",
    "data_type": "character varying"
  },
  {
    "table_name": "restaurantes",
    "column_name": "integraciones",
    "data_type": "jsonb"
  },
  {
    "table_name": "sync_logs",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "sync_logs",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "sync_logs",
    "column_name": "sistema",
    "data_type": "character varying"
  },
  {
    "table_name": "sync_logs",
    "column_name": "tipo_operacion",
    "data_type": "character varying"
  },
  {
    "table_name": "sync_logs",
    "column_name": "fecha_inicio",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "sync_logs",
    "column_name": "fecha_fin",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "sync_logs",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "sync_logs",
    "column_name": "registros_procesados",
    "data_type": "integer"
  },
  {
    "table_name": "sync_logs",
    "column_name": "registros_exitosos",
    "data_type": "integer"
  },
  {
    "table_name": "sync_logs",
    "column_name": "registros_error",
    "data_type": "integer"
  },
  {
    "table_name": "sync_logs",
    "column_name": "fecha_desde",
    "data_type": "date"
  },
  {
    "table_name": "sync_logs",
    "column_name": "fecha_hasta",
    "data_type": "date"
  },
  {
    "table_name": "sync_logs",
    "column_name": "errores",
    "data_type": "jsonb"
  },
  {
    "table_name": "sync_logs",
    "column_name": "mensaje_error",
    "data_type": "text"
  },
  {
    "table_name": "sync_logs",
    "column_name": "parametros",
    "data_type": "jsonb"
  },
  {
    "table_name": "sync_logs",
    "column_name": "duracion_segundos",
    "data_type": "integer"
  },
  {
    "table_name": "sync_logs",
    "column_name": "iniciado_por",
    "data_type": "uuid"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "nombre_mostrar",
    "data_type": "character varying"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "descripcion",
    "data_type": "text"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "logo_url",
    "data_type": "character varying"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "documentacion_url",
    "data_type": "character varying"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "configuracion_esquema",
    "data_type": "jsonb"
  },
  {
    "table_name": "tipos_integracion",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "usuarios",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "usuarios",
    "column_name": "email",
    "data_type": "character varying"
  },
  {
    "table_name": "usuarios",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "usuarios",
    "column_name": "apellidos",
    "data_type": "character varying"
  },
  {
    "table_name": "usuarios",
    "column_name": "telefono",
    "data_type": "character varying"
  },
  {
    "table_name": "usuarios",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "usuarios",
    "column_name": "rol",
    "data_type": "character varying"
  },
  {
    "table_name": "usuarios",
    "column_name": "permisos",
    "data_type": "jsonb"
  },
  {
    "table_name": "usuarios",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "usuarios",
    "column_name": "ultimo_acceso",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "usuarios",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "usuarios",
    "column_name": "creado_por",
    "data_type": "uuid"
  },
  {
    "table_name": "usuarios",
    "column_name": "configuracion_ui",
    "data_type": "jsonb"
  },
  {
    "table_name": "ventas",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas",
    "column_name": "numero_ticket",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas",
    "column_name": "total_venta",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas",
    "column_name": "comensales",
    "data_type": "integer"
  },
  {
    "table_name": "ventas",
    "column_name": "metodo_pago",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas",
    "column_name": "fecha",
    "data_type": "date"
  },
  {
    "table_name": "ventas",
    "column_name": "hora",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "ventas",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "ventas",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "sistema_origen",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "id_externo",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "referencia_externa",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "fecha_venta",
    "data_type": "date"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "fecha_hora_completa",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "tpv_id",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "tpv_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "seccion",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "num_comensales",
    "data_type": "integer"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "mesa",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "cliente_id",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "cliente_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "total_bruto",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "total_neto",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "total_impuestos",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "descuentos",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "propinas",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "metodo_pago",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "metodos_pago",
    "data_type": "jsonb"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "datos_originales",
    "data_type": "jsonb"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "datos_procesados",
    "data_type": "jsonb"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "ventas_datos",
    "column_name": "procesado_por",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "venta_id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "producto_id_externo",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "producto_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "categoria_id",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "categoria_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "cantidad",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "precio_unitario",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "precio_total",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "descuento_linea",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "tipo_impuesto",
    "data_type": "character varying"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "porcentaje_impuesto",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "importe_impuesto",
    "data_type": "numeric"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "modificadores",
    "data_type": "jsonb"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "datos_originales",
    "data_type": "jsonb"
  },
  {
    "table_name": "ventas_lineas",
    "column_name": "fecha_venta",
    "data_type": "date"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "restaurante_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "cola_id",
    "data_type": "uuid"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "documento_id",
    "data_type": "uuid"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "nombre_archivo",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "tipo_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "prioridad",
    "data_type": "integer"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "intentos",
    "data_type": "integer"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "fecha_programada",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "minutos_en_cola",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_cola_por_restaurante",
    "column_name": "ultimo_error",
    "data_type": "text"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "restaurante_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "activo",
    "data_type": "boolean"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "documentos_mes_actual",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "facturas_mes_actual",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "confianza_promedio",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "documentos_con_error",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "alertas_activas",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "alertas_criticas",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "storage_utilizado_gb",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "limite_storage_gb",
    "data_type": "integer"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "porcentaje_storage",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "fecha_ultima_actividad",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "vista_dashboard_restaurante",
    "column_name": "ultimo_documento_subido",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "nombre_archivo",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "fecha_subida",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "estado",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "tipo_documento",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "proveedor_nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "proveedor_cif",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "numero_factura",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "fecha_factura",
    "data_type": "date"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "total_factura",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_facturas_completas",
    "column_name": "confianza_global",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_productos_top",
    "column_name": "nombre",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_productos_top",
    "column_name": "categoria",
    "data_type": "character varying"
  },
  {
    "table_name": "vista_productos_top",
    "column_name": "total_vendido",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_productos_top",
    "column_name": "total_importe",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_productos_top",
    "column_name": "veces_vendido",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_ventas_diarias",
    "column_name": "fecha",
    "data_type": "date"
  },
  {
    "table_name": "vista_ventas_diarias",
    "column_name": "total_tickets",
    "data_type": "bigint"
  },
  {
    "table_name": "vista_ventas_diarias",
    "column_name": "total_ventas",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_ventas_diarias",
    "column_name": "ticket_promedio",
    "data_type": "numeric"
  },
  {
    "table_name": "vista_ventas_diarias",
    "column_name": "total_comensales",
    "data_type": "bigint"
  },
  {
    "table_name": "whatsapp_vinculaciones",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "whatsapp_vinculaciones",
    "column_name": "restaurante_id",
    "data_type": "uuid"
  },
  {
    "table_name": "whatsapp_vinculaciones",
    "column_name": "telefono",
    "data_type": "character varying"
  }
]