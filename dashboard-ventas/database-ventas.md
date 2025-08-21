| column_name         | data_type                | is_nullable | column_default                 | character_maximum_length |
| ------------------- | ------------------------ | ----------- | ------------------------------ | ------------------------ |
| id                  | uuid                     | NO          | gen_random_uuid()              | null                     |
| restaurante_id      | uuid                     | NO          | null                           | null                     |
| sistema_origen      | character varying        | NO          | null                           | 50                       |
| id_externo          | character varying        | YES         | null                           | 100                      |
| referencia_externa  | character varying        | YES         | null                           | 200                      |
| fecha_venta         | date                     | NO          | null                           | null                     |
| fecha_hora_completa | timestamp with time zone | YES         | null                           | null                     |
| tpv_id              | character varying        | YES         | null                           | 50                       |
| tpv_nombre          | character varying        | YES         | null                           | 100                      |
| seccion             | character varying        | YES         | null                           | 100                      |
| num_comensales      | integer                  | YES         | 0                              | null                     |
| mesa                | character varying        | YES         | null                           | 50                       |
| cliente_id          | character varying        | YES         | null                           | 50                       |
| cliente_nombre      | character varying        | YES         | null                           | 100                      |
| total_bruto         | numeric                  | NO          | null                           | null                     |
| total_neto          | numeric                  | YES         | null                           | null                     |
| total_impuestos     | numeric                  | YES         | null                           | null                     |
| descuentos          | numeric                  | YES         | 0                              | null                     |
| propinas            | numeric                  | YES         | 0                              | null                     |
| metodo_pago         | character varying        | YES         | null                           | 100                      |
| metodos_pago        | jsonb                    | YES         | null                           | null                     |
| datos_originales    | jsonb                    | YES         | null                           | null                     |
| datos_procesados    | jsonb                    | YES         | null                           | null                     |
| estado              | character varying        | YES         | 'procesado'::character varying | 20                       |
| created_at          | timestamp with time zone | YES         | now()                          | null                     |
| updated_at          | timestamp with time zone | YES         | now()                          | null                     |
| procesado_por       | uuid                     | YES         | null                           | null                     |

[
  {
    "id": "8d43ce39-8f22-4518-bb12-4df2daee415e",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "sistema_origen": "numier",
    "id_externo": "0101-0024379",
    "referencia_externa": "FS 0101/0024379",
    "fecha_venta": "2025-08-11",
    "fecha_hora_completa": "2025-08-11 21:05:49+00",
    "tpv_id": "9763",
    "tpv_nombre": "Correlimos",
    "seccion": "Terraza",
    "num_comensales": 0,
    "mesa": null,
    "cliente_id": null,
    "cliente_nombre": null,
    "total_bruto": "10.50",
    "total_neto": "9.55",
    "total_impuestos": "0.95",
    "descuentos": "0.00",
    "propinas": "0.00",
    "metodo_pago": "Tarjeta",
    "metodos_pago": null,
    "datos_originales": {
      "Pos": {
        "Id": "9763",
        "Name": "Correlimos"
      },
      "Date": "2025-08-11T21:05:49",
      "User": {},
      "Serie": " 0101",
      "Number": "0024379",
      "Totals": {
        "Taxes": {
          "10": {
            "NetAmount": 9.55,
            "VatAmount": 0.95
          }
        },
        "NetAmount": 9.55,
        "VatAmount": 0.95,
        "GrossAmount": 10.5,
        "SurchargeAmount": 0
      },
      "Channel": "Caja",
      "Section": {
        "sectionName": "Terraza",
        "sectionNumber": "3"
      },
      "Payments": "Tarjeta",
      "NumDiners": 0,
      "StartTime": "2025-08-11T20:23:40",
      "Workplace": {
        "Id": "5160",
        "Name": "Correlimo TPV"
      },
      "PrintCount": 0,
      "BusinessDay": "2025-08-11",
      "VatIncluded": true,
      "DocumentType": "FS",
      "InvoiceItems": [
        {
          "PLU": "",
          "name": "Cruzcampo",
          "price": "1.90",
          "units": "2.000",
          "amount": "3.80",
          "vatType": "10",
          "idProduct": "3081869",
          "idCategory": "105301",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Barril Cruzcampo",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4757788"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Anchoa mariposa con mantequilla ahumada",
          "price": "4.70",
          "units": "1.000",
          "amount": "4.70",
          "vatType": "10",
          "idProduct": "3388401",
          "idCategory": "105311",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Anchoa mariposa (Caja 12 Latas)",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4757799"
            },
            {
              "PLU": "",
              "name": "Mantequilla ahumada",
              "type": "B",
              "variation": 0,
              "idSubproduct": "5510557"
            },
            {
              "PLU": "",
              "name": "Pan pueblo",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4596058"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Coca Cola Zero",
          "price": "2.00",
          "units": "1.000",
          "amount": "2.00",
          "vatType": "10",
          "idProduct": "3081859",
          "idCategory": "105305",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Cocacola Zero",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4752943"
            }
          ],
          "discountType": 0
        }
      ],
      "OpenCashDate": "2025-08-11T19:58:58",
      "TaxDocumentNumber": "FS 0101/0024379"
    },
    "datos_procesados": null,
    "estado": "procesado",
    "created_at": "2025-08-18 22:51:19.856961+00",
    "updated_at": "2025-08-18 22:51:19.856961+00",
    "procesado_por": null
  },
  {
    "id": "816a5330-823b-40b0-8836-4cf2af05ba80",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "sistema_origen": "numier",
    "id_externo": "0101-0024376",
    "referencia_externa": "FS 0101/0024376",
    "fecha_venta": "2025-08-11",
    "fecha_hora_completa": "2025-08-11 20:43:56+00",
    "tpv_id": "9763",
    "tpv_nombre": "Correlimos",
    "seccion": "Baja",
    "num_comensales": 0,
    "mesa": null,
    "cliente_id": null,
    "cliente_nombre": null,
    "total_bruto": "4.50",
    "total_neto": "4.09",
    "total_impuestos": "0.41",
    "descuentos": "0.00",
    "propinas": "0.00",
    "metodo_pago": "Efectivo",
    "metodos_pago": null,
    "datos_originales": {
      "Pos": {
        "Id": "9763",
        "Name": "Correlimos"
      },
      "Date": "2025-08-11T20:43:56",
      "User": {},
      "Serie": " 0101",
      "Number": "0024376",
      "Totals": {
        "Taxes": {
          "10": {
            "NetAmount": 4.09,
            "VatAmount": 0.41
          }
        },
        "NetAmount": 4.09,
        "VatAmount": 0.41,
        "GrossAmount": 4.5,
        "SurchargeAmount": 0
      },
      "Channel": "Caja",
      "Section": {
        "sectionName": "Baja",
        "sectionNumber": "4"
      },
      "Payments": "Efectivo",
      "NumDiners": 0,
      "StartTime": "2025-08-11T20:19:32",
      "Workplace": {
        "Id": "5160",
        "Name": "Correlimo TPV"
      },
      "PrintCount": 0,
      "BusinessDay": "2025-08-11",
      "VatIncluded": true,
      "DocumentType": "FS",
      "InvoiceItems": [
        {
          "PLU": "",
          "name": "Schweppes",
          "price": "2.00",
          "units": "1.000",
          "amount": "2.00",
          "vatType": "10",
          "idProduct": "3081865",
          "idCategory": "105305",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Tónica Schweppes",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4752954"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Heineken 00",
          "price": "2.50",
          "units": "1.000",
          "amount": "2.50",
          "vatType": "10",
          "idProduct": "3081873",
          "idCategory": "105301",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Heineken 00",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4755187"
            }
          ],
          "discountType": 0
        }
      ],
      "OpenCashDate": "2025-08-11T19:58:58",
      "TaxDocumentNumber": "FS 0101/0024376"
    },
    "datos_procesados": null,
    "estado": "procesado",
    "created_at": "2025-08-18 22:51:20.072486+00",
    "updated_at": "2025-08-18 22:51:20.072486+00",
    "procesado_por": null
  },
  {
    "id": "8b5b2c72-9074-4717-982f-9670c9d66e21",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "sistema_origen": "numier",
    "id_externo": "0101-0024387",
    "referencia_externa": "FS 0101/0024387",
    "fecha_venta": "2025-08-11",
    "fecha_hora_completa": "2025-08-11 22:30:12+00",
    "tpv_id": "9763",
    "tpv_nombre": "Correlimos",
    "seccion": "Barra",
    "num_comensales": 0,
    "mesa": null,
    "cliente_id": null,
    "cliente_nombre": null,
    "total_bruto": "14.60",
    "total_neto": "13.27",
    "total_impuestos": "1.33",
    "descuentos": "0.00",
    "propinas": "0.00",
    "metodo_pago": "Efectivo",
    "metodos_pago": null,
    "datos_originales": {
      "Pos": {
        "Id": "9763",
        "Name": "Correlimos"
      },
      "Date": "2025-08-11T22:30:12",
      "User": {},
      "Serie": " 0101",
      "Number": "0024387",
      "Totals": {
        "Taxes": {
          "10": {
            "NetAmount": 13.27,
            "VatAmount": 1.33
          }
        },
        "NetAmount": 13.27,
        "VatAmount": 1.33,
        "GrossAmount": 14.6,
        "SurchargeAmount": 0
      },
      "Channel": "Caja",
      "Section": {
        "sectionName": "Barra",
        "sectionNumber": "1"
      },
      "Payments": "Efectivo",
      "NumDiners": 0,
      "StartTime": "2025-08-11T20:14:33",
      "Workplace": {
        "Id": "5160",
        "Name": "Correlimo TPV"
      },
      "PrintCount": 0,
      "BusinessDay": "2025-08-11",
      "VatIncluded": true,
      "DocumentType": "FS",
      "InvoiceItems": [
        {
          "PLU": "",
          "name": "Cruzcampo",
          "price": "1.90",
          "units": "6.000",
          "amount": "11.40",
          "vatType": "10",
          "idProduct": "3081869",
          "idCategory": "105301",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Barril Cruzcampo",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4757788"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Almendritas Fritas",
          "price": "3.20",
          "units": "1.000",
          "amount": "3.20",
          "vatType": "10",
          "idProduct": "3081910",
          "idCategory": "105308",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Almendra frita",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6037061"
            },
            {
              "PLU": "",
              "name": "Papel sulfúrizado personalizado",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6082324"
            }
          ],
          "discountType": 0
        }
      ],
      "OpenCashDate": "2025-08-11T19:58:58",
      "TaxDocumentNumber": "FS 0101/0024387"
    },
    "datos_procesados": null,
    "estado": "procesado",
    "created_at": "2025-08-18 22:51:20.200549+00",
    "updated_at": "2025-08-18 22:51:20.200549+00",
    "procesado_por": null
  },
  {
    "id": "bafd043b-8b2d-422d-a8b6-5b264e0a04e9",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "sistema_origen": "numier",
    "id_externo": "0101-0024375",
    "referencia_externa": "FS 0101/0024375",
    "fecha_venta": "2025-08-11",
    "fecha_hora_completa": "2025-08-11 20:37:20+00",
    "tpv_id": "9763",
    "tpv_nombre": "Correlimos",
    "seccion": "Baja",
    "num_comensales": 0,
    "mesa": null,
    "cliente_id": null,
    "cliente_nombre": null,
    "total_bruto": "10.20",
    "total_neto": "9.27",
    "total_impuestos": "0.93",
    "descuentos": "0.00",
    "propinas": "0.00",
    "metodo_pago": "Tarjeta",
    "metodos_pago": null,
    "datos_originales": {
      "Pos": {
        "Id": "9763",
        "Name": "Correlimos"
      },
      "Date": "2025-08-11T20:37:20",
      "User": {},
      "Serie": " 0101",
      "Number": "0024375",
      "Totals": {
        "Taxes": {
          "10": {
            "NetAmount": 9.27,
            "VatAmount": 0.93
          }
        },
        "NetAmount": 9.27,
        "VatAmount": 0.93,
        "GrossAmount": 10.2,
        "SurchargeAmount": 0
      },
      "Channel": "Caja",
      "Section": {
        "sectionName": "Baja",
        "sectionNumber": "4"
      },
      "Payments": "Tarjeta",
      "NumDiners": 0,
      "StartTime": "2025-08-11T20:15:45",
      "Workplace": {
        "Id": "5160",
        "Name": "Correlimo TPV"
      },
      "PrintCount": 0,
      "BusinessDay": "2025-08-11",
      "VatIncluded": true,
      "DocumentType": "FS",
      "InvoiceItems": [
        {
          "PLU": "",
          "name": "Almendritas Fritas",
          "price": "3.20",
          "units": "1.000",
          "amount": "3.20",
          "vatType": "10",
          "idProduct": "3081910",
          "idCategory": "105308",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Almendra frita",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6037061"
            },
            {
              "PLU": "",
              "name": "Papel sulfúrizado personalizado",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6082324"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Schweppes",
          "price": "2.00",
          "units": "1.000",
          "amount": "2.00",
          "vatType": "10",
          "idProduct": "3081865",
          "idCategory": "105305",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Tónica Schweppes",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4752954"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Tostada Gran Reserva  00",
          "price": "2.50",
          "units": "1.000",
          "amount": "2.50",
          "vatType": "10",
          "idProduct": "3081875",
          "idCategory": "105301",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Tostada Gran Reserva 00",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4755188"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Aquarius Naranja",
          "price": "2.50",
          "units": "1.000",
          "amount": "2.50",
          "vatType": "10",
          "idProduct": "3081855",
          "idCategory": "105305",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Aquarius Naranja",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4752950"
            }
          ],
          "discountType": 0
        }
      ],
      "OpenCashDate": "2025-08-11T19:58:58",
      "TaxDocumentNumber": "FS 0101/0024375"
    },
    "datos_procesados": null,
    "estado": "procesado",
    "created_at": "2025-08-18 22:51:19.731882+00",
    "updated_at": "2025-08-18 22:51:19.731882+00",
    "procesado_por": null
  },
  {
    "id": "53bb4872-0c0f-4371-989d-66be9691a1de",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "sistema_origen": "numier",
    "id_externo": "0101-0024388",
    "referencia_externa": "FS 0101/0024388",
    "fecha_venta": "2025-08-11",
    "fecha_hora_completa": "2025-08-11 22:32:44+00",
    "tpv_id": "9763",
    "tpv_nombre": "Correlimos",
    "seccion": "Terraza",
    "num_comensales": 0,
    "mesa": null,
    "cliente_id": null,
    "cliente_nombre": null,
    "total_bruto": "19.30",
    "total_neto": "17.55",
    "total_impuestos": "1.75",
    "descuentos": "0.00",
    "propinas": "0.00",
    "metodo_pago": "Tarjeta",
    "metodos_pago": null,
    "datos_originales": {
      "Pos": {
        "Id": "9763",
        "Name": "Correlimos"
      },
      "Date": "2025-08-11T22:32:44",
      "User": {},
      "Serie": " 0101",
      "Number": "0024388",
      "Totals": {
        "Taxes": {
          "10": {
            "NetAmount": 17.55,
            "VatAmount": 1.75
          }
        },
        "NetAmount": 17.55,
        "VatAmount": 1.75,
        "GrossAmount": 19.3,
        "SurchargeAmount": 0
      },
      "Channel": "Caja",
      "Section": {
        "sectionName": "Terraza",
        "sectionNumber": "3"
      },
      "Payments": "Tarjeta",
      "NumDiners": 0,
      "StartTime": "2025-08-11T20:38:28",
      "Workplace": {
        "Id": "5160",
        "Name": "Correlimo TPV"
      },
      "PrintCount": 0,
      "BusinessDay": "2025-08-11",
      "VatIncluded": true,
      "DocumentType": "FS",
      "InvoiceItems": [
        {
          "PLU": "",
          "name": "Cruzcampo",
          "price": "1.90",
          "units": "4.000",
          "amount": "7.60",
          "vatType": "10",
          "idProduct": "3081869",
          "idCategory": "105301",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Barril Cruzcampo",
              "type": "B",
              "variation": 0,
              "idSubproduct": "4757788"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "Mojama de atún",
          "price": "8.40",
          "units": "1.000",
          "amount": "8.40",
          "vatType": "10",
          "idProduct": "3388384",
          "idCategory": "105309",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "Almendra frita",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6037061"
            },
            {
              "PLU": "",
              "name": "Aceite de oliva virgen extra",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6076713"
            },
            {
              "PLU": "",
              "name": "Mojama de atún",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6076711"
            },
            {
              "PLU": "",
              "name": "Papel sulfúrizado personalizado",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6082324"
            }
          ],
          "discountType": 0
        },
        {
          "PLU": "",
          "name": "La Planta",
          "price": "3.30",
          "units": "1.000",
          "amount": "3.30",
          "vatType": "10",
          "idProduct": "3663927",
          "idCategory": "105302",
          "percentDto": "0%",
          "subproducts": [
            {
              "PLU": "",
              "name": "La Planta",
              "type": "B",
              "variation": 0,
              "idSubproduct": "6033806"
            }
          ],
          "discountType": 0
        }
      ],
      "OpenCashDate": "2025-08-11T19:58:58",
      "TaxDocumentNumber": "FS 0101/0024388"
    },
    "datos_procesados": null,
    "estado": "procesado",
    "created_at": "2025-08-18 22:51:20.647857+00",
    "updated_at": "2025-08-18 22:51:20.647857+00",
    "procesado_por": null
  }
]

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "column_name": "venta_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "restaurante_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "producto_id_externo",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "producto_nombre",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "categoria_id",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "categoria_nombre",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "cantidad",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "precio_unitario",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "precio_total",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "descuento_linea",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "column_name": "tipo_impuesto",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 50
  },
  {
    "column_name": "porcentaje_impuesto",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "importe_impuesto",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "modificadores",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "datos_originales",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "fecha_venta",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  }
]

[
  {
    "id": "3cc2311c-7041-455d-98d4-106b1ec48dc0",
    "venta_id": "f3c6ed63-7150-4cd7-b2eb-d694c2139631",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081869",
    "producto_nombre": "Cruzcampo",
    "categoria_id": "105301",
    "categoria_nombre": null,
    "cantidad": "2.000",
    "precio_unitario": "1.90",
    "precio_total": "3.80",
    "descuento_linea": "0.00",
    "tipo_impuesto": "10",
    "porcentaje_impuesto": null,
    "importe_impuesto": null,
    "modificadores": null,
    "datos_originales": {
      "PLU": "",
      "name": "Cruzcampo",
      "price": "1.90",
      "units": "2.000",
      "amount": "3.80",
      "vatType": "10",
      "idProduct": "3081869",
      "idCategory": "105301",
      "percentDto": "0%",
      "subproducts": [
        {
          "PLU": "",
          "name": "Barril Cruzcampo",
          "type": "B",
          "variation": 0,
          "idSubproduct": "4757788"
        }
      ],
      "discountType": 0
    },
    "fecha_venta": "2025-08-13"
  },
  {
    "id": "e09304a4-5222-421c-88bb-8d7fe1f55565",
    "venta_id": "f3c6ed63-7150-4cd7-b2eb-d694c2139631",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081859",
    "producto_nombre": "Coca Cola Zero",
    "categoria_id": "105305",
    "categoria_nombre": null,
    "cantidad": "1.000",
    "precio_unitario": "2.00",
    "precio_total": "2.00",
    "descuento_linea": "0.00",
    "tipo_impuesto": "10",
    "porcentaje_impuesto": null,
    "importe_impuesto": null,
    "modificadores": null,
    "datos_originales": {
      "PLU": "",
      "name": "Coca Cola Zero",
      "price": "2.00",
      "units": "1.000",
      "amount": "2.00",
      "vatType": "10",
      "idProduct": "3081859",
      "idCategory": "105305",
      "percentDto": "0%",
      "subproducts": [
        {
          "PLU": "",
          "name": "Cocacola Zero",
          "type": "B",
          "variation": 0,
          "idSubproduct": "4752943"
        }
      ],
      "discountType": 0
    },
    "fecha_venta": "2025-08-13"
  },
  {
    "id": "837574b4-a8df-44de-8fc1-ab4a85bb9b1d",
    "venta_id": "9013acf7-c8b0-4563-93df-7276f63e25cf",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081923",
    "producto_nombre": "Pincho Tortilla",
    "categoria_id": "105308",
    "categoria_nombre": null,
    "cantidad": "1.000",
    "precio_unitario": "3.70",
    "precio_total": "3.70",
    "descuento_linea": "0.00",
    "tipo_impuesto": "10",
    "porcentaje_impuesto": null,
    "importe_impuesto": null,
    "modificadores": null,
    "datos_originales": {
      "PLU": "",
      "name": "Pincho Tortilla",
      "price": "3.70",
      "units": "1.000",
      "amount": "3.70",
      "vatType": "10",
      "idProduct": "3081923",
      "idCategory": "105308",
      "percentDto": "0%",
      "subproducts": [
        {
          "PLU": "",
          "name": "Picos almonteños",
          "type": "B",
          "variation": 0,
          "idSubproduct": "6038566"
        },
        {
          "PLU": "",
          "name": "Mayonesa",
          "type": "B",
          "variation": 0,
          "idSubproduct": "6076703"
        },
        {
          "PLU": "",
          "name": "Tortilla",
          "type": "B",
          "variation": 0,
          "idSubproduct": "4596044"
        }
      ],
      "discountType": 0
    },
    "fecha_venta": "2025-08-13"
  },
  {
    "id": "e03a69e6-107b-49c8-8102-bf2a27e5cd08",
    "venta_id": "9013acf7-c8b0-4563-93df-7276f63e25cf",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3090355",
    "producto_nombre": "Fuze Tea Maracuya",
    "categoria_id": "105305",
    "categoria_nombre": null,
    "cantidad": "1.000",
    "precio_unitario": "2.50",
    "precio_total": "2.50",
    "descuento_linea": "0.00",
    "tipo_impuesto": "10",
    "porcentaje_impuesto": null,
    "importe_impuesto": null,
    "modificadores": null,
    "datos_originales": {
      "PLU": "",
      "name": "Fuze Tea Maracuya",
      "price": "2.50",
      "units": "1.000",
      "amount": "2.50",
      "vatType": "10",
      "idProduct": "3090355",
      "idCategory": "105305",
      "percentDto": "0%",
      "subproducts": [
        {
          "PLU": "",
          "name": "Fuze Tea Maracuya",
          "type": "B",
          "variation": 0,
          "idSubproduct": "4752963"
        }
      ],
      "discountType": 0
    },
    "fecha_venta": "2025-08-13"
  },
  {
    "id": "c7a4ff36-98b9-4d0a-b308-cfb0da97ca8e",
    "venta_id": "9013acf7-c8b0-4563-93df-7276f63e25cf",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081857",
    "producto_nombre": "Coca Cola",
    "categoria_id": "105305",
    "categoria_nombre": null,
    "cantidad": "1.000",
    "precio_unitario": "2.00",
    "precio_total": "2.00",
    "descuento_linea": "0.00",
    "tipo_impuesto": "10",
    "porcentaje_impuesto": null,
    "importe_impuesto": null,
    "modificadores": null,
    "datos_originales": {
      "PLU": "",
      "name": "Coca Cola",
      "price": "2.00",
      "units": "1.000",
      "amount": "2.00",
      "vatType": "10",
      "idProduct": "3081857",
      "idCategory": "105305",
      "percentDto": "0%",
      "subproducts": [
        {
          "PLU": "",
          "name": "CocaCola",
          "type": "B",
          "variation": 0,
          "idSubproduct": "4752964"
        }
      ],
      "discountType": 0
    },
    "fecha_venta": "2025-08-13"
  }
]

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "column_name": "restaurante_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "producto_id_externo",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "sistema_origen",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 50
  },
  {
    "column_name": "nombre",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "descripcion",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "categoria_id",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "categoria_nombre",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "subcategoria",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "precio_base",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "precios_alternativos",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "activo",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "true",
    "character_maximum_length": null
  },
  {
    "column_name": "disponible",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "true",
    "character_maximum_length": null
  },
  {
    "column_name": "datos_originales",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "imagen_url",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 500
  },
  {
    "column_name": "tags",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()",
    "character_maximum_length": null
  }
]

[
  {
    "id": "cab30a5e-8c47-4127-b9b7-0d1d3707f159",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3221613",
    "sistema_origen": "numier",
    "nombre": "ZANAHORIA EN ESCABECHE",
    "descripcion": null,
    "categoria_id": "105308",
    "categoria_nombre": "Entrantes",
    "subcategoria": null,
    "precio_base": "0.00",
    "precios_alternativos": {
      "precio1": 0,
      "precio2": 0,
      "precio3": 0,
      "precio4": 0
    },
    "activo": false,
    "disponible": true,
    "datos_originales": {
      "id": "3221613",
      "PLU1": "",
      "PLU2": "",
      "PLU3": "",
      "PLU4": "",
      "name": "ZANAHORIA EN ESCABECHE",
      "price1": 0,
      "price2": 0,
      "price3": 0,
      "price4": 0,
      "vatType": 10,
      "isActive": false,
      "idCategory": "105308",
      "namePrice1": "Tarifa 1",
      "namePrice2": "Tarifa 2",
      "namePrice3": "Tarifa 3",
      "namePrice4": "Tarifa 4",
      "nameCategory": "Entrantes"
    },
    "imagen_url": null,
    "tags": null,
    "created_at": "2025-08-18 22:30:19.087224+00",
    "updated_at": "2025-08-18 22:30:19.087224+00"
  },
  {
    "id": "078f2617-6a8c-4f4e-8e28-42d219640763",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081912",
    "sistema_origen": "numier",
    "nombre": "Banderillas de Atún y Queso",
    "descripcion": null,
    "categoria_id": "105308",
    "categoria_nombre": "Entrantes",
    "subcategoria": null,
    "precio_base": "3.50",
    "precios_alternativos": {
      "precio1": 3.5,
      "precio2": 3.5,
      "precio3": 3.5,
      "precio4": 3.5
    },
    "activo": false,
    "disponible": true,
    "datos_originales": {
      "id": "3081912",
      "PLU1": "",
      "PLU2": "",
      "PLU3": "",
      "PLU4": "",
      "name": "Banderillas de Atún y Queso",
      "price1": 3.5,
      "price2": 3.5,
      "price3": 3.5,
      "price4": 3.5,
      "vatType": 10,
      "isActive": false,
      "idCategory": "105308",
      "namePrice1": "Tarifa 1",
      "namePrice2": "Tarifa 2",
      "namePrice3": "Tarifa 3",
      "namePrice4": "Tarifa 4",
      "nameCategory": "Entrantes"
    },
    "imagen_url": null,
    "tags": null,
    "created_at": "2025-08-18 22:30:19.143343+00",
    "updated_at": "2025-08-18 22:30:19.143343+00"
  },
  {
    "id": "9d1fe26e-7d34-4c27-ba40-bcf193263e46",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081913",
    "sistema_origen": "numier",
    "nombre": "Carpaccio de Gambas",
    "descripcion": null,
    "categoria_id": "105308",
    "categoria_nombre": "Entrantes",
    "subcategoria": null,
    "precio_base": "16.50",
    "precios_alternativos": {
      "precio1": 16.5,
      "precio2": 16.5,
      "precio3": 16.5,
      "precio4": 16.5
    },
    "activo": false,
    "disponible": true,
    "datos_originales": {
      "id": "3081913",
      "PLU1": "",
      "PLU2": "",
      "PLU3": "",
      "PLU4": "",
      "name": "Carpaccio de Gambas",
      "price1": 16.5,
      "price2": 16.5,
      "price3": 16.5,
      "price4": 16.5,
      "vatType": 10,
      "isActive": false,
      "idCategory": "105308",
      "namePrice1": "Tarifa 1",
      "namePrice2": "Tarifa 2",
      "namePrice3": "Tarifa 3",
      "namePrice4": "Tarifa 4",
      "nameCategory": "Entrantes"
    },
    "imagen_url": null,
    "tags": null,
    "created_at": "2025-08-18 22:30:19.20003+00",
    "updated_at": "2025-08-18 22:30:19.20003+00"
  },
  {
    "id": "33a6f481-4ab8-4b25-a0c4-1b8dba698b23",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081915",
    "sistema_origen": "numier",
    "nombre": "Chicharrones Jerez",
    "descripcion": null,
    "categoria_id": "105308",
    "categoria_nombre": "Entrantes",
    "subcategoria": null,
    "precio_base": "4.50",
    "precios_alternativos": {
      "precio1": 4.5,
      "precio2": 4.5,
      "precio3": 4.5,
      "precio4": 4.5
    },
    "activo": false,
    "disponible": true,
    "datos_originales": {
      "id": "3081915",
      "PLU1": "",
      "PLU2": "",
      "PLU3": "",
      "PLU4": "",
      "name": "Chicharrones Jerez",
      "price1": 4.5,
      "price2": 4.5,
      "price3": 4.5,
      "price4": 4.5,
      "vatType": 10,
      "isActive": false,
      "idCategory": "105308",
      "namePrice1": "Tarifa 1",
      "namePrice2": "Tarifa 2",
      "namePrice3": "Tarifa 3",
      "namePrice4": "Tarifa 4",
      "nameCategory": "Entrantes"
    },
    "imagen_url": null,
    "tags": null,
    "created_at": "2025-08-18 22:30:19.262942+00",
    "updated_at": "2025-08-18 22:30:19.262942+00"
  },
  {
    "id": "57d9db2f-2edc-4b11-a803-92085ae54aaf",
    "restaurante_id": "2852b1af-38d8-43ec-8872-2b2921d5a231",
    "producto_id_externo": "3081918",
    "sistema_origen": "numier",
    "nombre": "Hueva de atún",
    "descripcion": null,
    "categoria_id": "105308",
    "categoria_nombre": "Entrantes",
    "subcategoria": null,
    "precio_base": "8.00",
    "precios_alternativos": {
      "precio1": 8,
      "precio2": 8,
      "precio3": 8,
      "precio4": 8
    },
    "activo": false,
    "disponible": true,
    "datos_originales": {
      "id": "3081918",
      "PLU1": "",
      "PLU2": "",
      "PLU3": "",
      "PLU4": "",
      "name": "Hueva de atún",
      "price1": 8,
      "price2": 8,
      "price3": 8,
      "price4": 8,
      "vatType": 10,
      "isActive": false,
      "idCategory": "105308",
      "namePrice1": "Tarifa 1",
      "namePrice2": "Tarifa 2",
      "namePrice3": "Tarifa 3",
      "namePrice4": "Tarifa 4",
      "nameCategory": "Entrantes"
    },
    "imagen_url": null,
    "tags": null,
    "created_at": "2025-08-18 22:30:19.334588+00",
    "updated_at": "2025-08-18 22:30:19.334588+00"
  }
]

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null
  },
  {
    "column_name": "nombre",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "nombre_comercial",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "cif",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 12
  },
  {
    "column_name": "direccion",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "codigo_postal",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 10
  },
  {
    "column_name": "ciudad",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "provincia",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "pais",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "'España'::character varying",
    "character_maximum_length": 50
  },
  {
    "column_name": "telefono",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 20
  },
  {
    "column_name": "email",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 100
  },
  {
    "column_name": "web",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "configuracion",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{\"idioma\": \"es\", \"moneda\": \"EUR\", \"zona_horaria\": \"Europe/Madrid\", \"alertas_email\": [], \"umbral_confianza\": 0.7, \"proveedores_confiables\": [], \"categorias_personalizadas\": [\"Carnes\", \"Pescados\", \"Verduras\", \"Lácteos\", \"Bebidas\", \"Otros\"]}'::jsonb",
    "character_maximum_length": null
  },
  {
    "column_name": "limite_documentos_mes",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "1000",
    "character_maximum_length": null
  },
  {
    "column_name": "documentos_procesados_mes",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "column_name": "limite_storage_gb",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "5",
    "character_maximum_length": null
  },
  {
    "column_name": "storage_utilizado_gb",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "0",
    "character_maximum_length": null
  },
  {
    "column_name": "activo",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "true",
    "character_maximum_length": null
  },
  {
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "column_name": "fecha_ultima_actividad",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()",
    "character_maximum_length": null
  },
  {
    "column_name": "plan",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "'basico'::character varying",
    "character_maximum_length": 20
  },
  {
    "column_name": "fecha_vencimiento_plan",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null
  },
  {
    "column_name": "unique_id",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 10
  },
  {
    "column_name": "email_facturas",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": 255
  },
  {
    "column_name": "integraciones",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "character_maximum_length": null
  }
]

[
  {
    "table_name": "configuracion_restaurantes"
  },
  {
    "table_name": "correcciones_usuario"
  },
  {
    "table_name": "historial_precios_productos"
  },
  {
    "table_name": "metricas_restaurante"
  },
  {
    "table_name": "productos_catalogo"
  },
  {
    "table_name": "productos_embeddings"
  },
  {
    "table_name": "productos_extraidos"
  },
  {
    "table_name": "productos_maestro"
  },
  {
    "table_name": "productos_tipicos"
  },
  {
    "table_name": "project_todo_logs"
  },
  {
    "table_name": "prompts_restaurante"
  },
  {
    "table_name": "restaurantes"
  },
  {
    "table_name": "sync_logs"
  },
  {
    "table_name": "usuarios"
  },
  {
    "table_name": "ventas_datos"
  },
  {
    "table_name": "ventas_lineas"
  }
]

relaciones tablas

[
  {
    "table_name": "ventas_lineas",
    "column_name": "venta_id",
    "foreign_table_name": "ventas_datos",
    "foreign_column_name": "id"
  }
]
[
  {
    "fecha_min": "2025-07-31",
    "fecha_max": "2025-08-21",
    "total_registros": 406
  }
]

[
  {
    "metodo_pago": "Tarjeta",
    "cantidad": 268,
    "total_importe": "7289.60"
  },
  {
    "metodo_pago": "Efectivo",
    "cantidad": 132,
    "total_importe": "2399.87"
  },
  {
    "metodo_pago": "Cheque",
    "cantidad": 2,
    "total_importe": "0.00"
  },
  {
    "metodo_pago": "Efectivo:66.90, Tarjeta:13.50",
    "cantidad": 1,
    "total_importe": "73.09"
  },
  {
    "metodo_pago": "Efectivo:29.00, Tarjeta:26.20",
    "cantidad": 1,
    "total_importe": "50.18"
  },
  {
    "metodo_pago": "Efectivo:120.00, Tarjeta:32.80",
    "cantidad": 1,
    "total_importe": "138.91"
  },
  {
    "metodo_pago": "Efectivo:21.00, Tarjeta:19.50",
    "cantidad": 1,
    "total_importe": "36.82"
  }
]

[
  {
    "categoria_nombre": "Entrantes",
    "cantidad_productos": 18
  },
  {
    "categoria_nombre": "Cervezas",
    "cantidad_productos": 6
  },
  {
    "categoria_nombre": "Abacería",
    "cantidad_productos": 6
  },
  {
    "categoria_nombre": "Principales",
    "cantidad_productos": 5
  },
  {
    "categoria_nombre": "Espumosos",
    "cantidad_productos": 4
  },
  {
    "categoria_nombre": "Fuera de carta",
    "cantidad_productos": 3
  },
  {
    "categoria_nombre": "Vinos blancos",
    "cantidad_productos": 2
  },
  {
    "categoria_nombre": "Generosos",
    "cantidad_productos": 2
  },
  {
    "categoria_nombre": "",
    "cantidad_productos": 2
  },
  {
    "categoria_nombre": "Entre panes",
    "cantidad_productos": 1
  },
  {
    "categoria_nombre": "Refrescos",
    "cantidad_productos": 1
  }
]

[
  {
    "categoria_nombre": "Categoría 105301",
    "cantidad_lineas": 1539,
    "total_importe": "9565.00"
  },
  {
    "categoria_nombre": null,
    "cantidad_lineas": 1431,
    "total_importe": "8765.55"
  },
  {
    "categoria_nombre": "Categoría 105309",
    "cantidad_lineas": 874,
    "total_importe": "6746.00"
  },
  {
    "categoria_nombre": "Categoría 105308",
    "cantidad_lineas": 1242,
    "total_importe": "6615.80"
  },
  {
    "categoria_nombre": "Categoría 105311",
    "cantidad_lineas": 894,
    "total_importe": "5965.30"
  },
  {
    "categoria_nombre": "Categoría 105306",
    "cantidad_lineas": 262,
    "total_importe": "2101.10"
  },
  {
    "categoria_nombre": "Categoría 105305",
    "cantidad_lineas": 807,
    "total_importe": "1918.50"
  },
  {
    "categoria_nombre": "Categoría 105310",
    "cantidad_lineas": 157,
    "total_importe": "1742.30"
  },
  {
    "categoria_nombre": "Categoría 105302",
    "cantidad_lineas": 227,
    "total_importe": "1554.30"
  },
  {
    "categoria_nombre": "Categoría 105303",
    "cantidad_lineas": 164,
    "total_importe": "1344.30"
  },
  {
    "categoria_nombre": "Categoría 105304",
    "cantidad_lineas": 51,
    "total_importe": "790.50"
  },
  {
    "categoria_nombre": "Categoría 105531",
    "cantidad_lineas": 84,
    "total_importe": "756.00"
  },
  {
    "categoria_nombre": "Categoría 105532",
    "cantidad_lineas": 42,
    "total_importe": "490.00"
  },
  {
    "categoria_nombre": "Categoría 128182",
    "cantidad_lineas": 42,
    "total_importe": "84.00"
  },
  {
    "categoria_nombre": "Categoría 128183",
    "cantidad_lineas": 42,
    "total_importe": "51.80"
  }
]

[
  {
    "ventas_sin_lineas": 290
  }
]
[
  {
    "lineas_huerfanas": 0
  }
]

[
  {
    "producto_nombre": "Montadito de lomo en manteca"
  },
  {
    "producto_nombre": "Patatas Perdi"
  },
  {
    "producto_nombre": "Kripta cava"
  },
  {
    "producto_nombre": "Pazo Cilleiro Albariño"
  },
  {
    "producto_nombre": "Fuze Tea Maracuya"
  },
  {
    "producto_nombre": "Distraído"
  },
  {
    "producto_nombre": "Mojama de atún"
  },
  {
    "producto_nombre": "Brioche de sobrasada y queso azul"
  },
  {
    "producto_nombre": "Papas aliñás de mi madre"
  },
  {
    "producto_nombre": "Copa cerveza"
  }
]