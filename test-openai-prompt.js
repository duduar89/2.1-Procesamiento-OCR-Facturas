// Script de prueba para verificar el prompt de OpenAI corregido

function generateOpenAIPrompt(text, documentType = 'factura', contextAnalysis) {
  console.log('🤖 === GENERANDO PROMPT PARA OPENAI ===')
  console.log('📄 Tipo de documento:', documentType)
  
  // 🎯 ADAPTAR PROMPT SEGÚN TIPO DE DOCUMENTO
  const tipoTexto = documentType === 'albaran' ? 'albarán de entrega' : 'factura'
  const tipoAccion = documentType === 'albaran' ? 'ENTREGA/ENVÍA' : 'VENDE/EMITE'
  const tipoDocumento = documentType === 'albaran' ? 'albarán' : 'factura'
  
  let contextInstructions = ''
  
  if (contextAnalysis?.hasRestaurantCIF) {
    contextInstructions = `
⚠️ CONTEXTO CRÍTICO - IDENTIFICACIÓN DE PROVEEDOR:
- El restaurante "${contextAnalysis.restaurante?.nombre}" con CIF "${contextAnalysis.excludeCIF}" es el CLIENTE
- Este restaurante COMPRA/recibe el ${tipoDocumento}, NO lo emite
- El proveedor tiene un CIF DIFERENTE y aparece en la parte SUPERIOR del ${tipoDocumento}
- NUNCA extraigas "${contextAnalysis.excludeCIF}" como proveedor_cif
- Busca otro CIF que NO sea del restaurante

INDICADORES ENCONTRADOS:
- Proveedor: ${contextAnalysis.proveedorIndicators.join(', ')}
- Cliente: ${contextAnalysis.clienteIndicators.join(', ')}

REGLAS OBLIGATORIAS:
1. El proveedor aparece en el ENCABEZADO con logo/membrete
2. El cliente aparece en secciones como "Facturar a:", "Cliente:"
3. Si ves el CIF "${contextAnalysis.excludeCIF}", es del CLIENTE, NO del proveedor
4. El proveedor tiene un CIF diferente que aparece en la parte superior

`
  }
  
  const prompt = `${contextInstructions}
Eres un experto en extracción de datos de documentos comerciales españoles. Extrae TODOS los datos siguientes del texto del ${tipoTexto}.

⚠️ CRÍTICO - IDENTIFICACIÓN DE PROVEEDOR: 
Este es un ${tipoTexto} de COMPRA de un restaurante. Identifica CORRECTAMENTE el PROVEEDOR:

🏢 PROVEEDOR (quien ${tipoAccion} el ${tipoDocumento}):
- Aparece en la parte SUPERIOR del ${tipoDocumento}
- Incluye logo, nombre comercial y CIF/NIF del emisor
- Suele tener textos como "${documentType === 'albaran' ? 'Albarán' : 'Factura'}", "${documentType === 'albaran' ? 'ALBARAN CARGO' : 'Invoice'}", número de ${tipoDocumento} cerca
- Ejemplos: "DISTRIBUIDORA XYZ S.L. CIF: B12345678"

🍽️ CLIENTE/RESTAURANTE (quien RECIBE el ${tipoDocumento}):
- Aparece más abajo, en secciones como "Facturar a:", "Cliente:", "Destinatario:"
- Puede aparecer con direcciones de entrega
- NO es el proveedor, es el receptor

REGLA: Si ves el mismo CIF/nombre en ambas posiciones, el PROVEEDOR es quien aparece ARRIBA con el logo/encabezado.

TEXTO DEL ${tipoTexto.toUpperCase()}:
${text}

EXTRAE EXACTAMENTE ESTOS DATOS en formato JSON:

{
  "factura": {
    "proveedor_nombre": {
      "valor": "nombre del proveedor/empresa (quien ${tipoAccion.toLowerCase()} el ${tipoDocumento}, NO el cliente)",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "proveedor_cif": {
      "valor": "CIF/NIF del PROVEEDOR (quien ${tipoAccion.toLowerCase()} el ${tipoDocumento}, formato: A12345678)",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "numero_factura": {
      "valor": "número de ${tipoDocumento}",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "fecha_factura": {
      "valor": "YYYY-MM-DD",
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "total_factura": {
      "valor": número (sin €, formato: 123.45),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "base_imponible": {
      "valor": número (sin €, formato: 123.45),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "cuota_iva": {
      "valor": número (sin €, formato: 123.45),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    },
    "tipo_iva": {
      "valor": número (formato: 21 para 21%),
      "confianza": 0.0-1.0,
      "texto_fuente": "texto exacto donde lo encontraste"
    }
  },
  "productos": [
    {
      "descripcion_original": "descripción exacta del producto (ej: CRUZCAMPO Especial Barril 50L)",
      "cantidad": número (ej: 3.0),
      "unidad_medida": "kg/litros/unidades/BAR/CAJ/etc",
      "precio_unitario_sin_iva": número (ej: 156.32),
      "precio_total_linea_sin_iva": número (ej: 468.96),
      "codigo_producto": "código si existe (ej: 55)",
      "tipo_iva": número (ej: 21 para 21%),
      "confianza_linea": 0.0-1.0,
      "texto_fuente": "línea exacta donde lo encontraste"
    }
  ]
}

${documentType === 'albaran' ? `
⚠️ ESPECIAL PARA ALBARANES:
- Los albaranes pueden NO tener precios, pon null si no hay
- Enfócate en CANTIDAD y DESCRIPCIÓN del producto
- El "número de albarán" va en "numero_factura"
- La "fecha de albarán" va en "fecha_factura"
- Si no hay totales monetarios, pon 0 o null
` : ''}

REGLAS IMPORTANTES:
1. Si no encuentras un dato, pon null en "valor" y 0.0 en "confianza"
2. Las fechas SIEMPRE en formato YYYY-MM-DD
3. Los números sin símbolos de moneda (€) ni separadores de miles
4. Usa punto (.) para decimales, no coma (,)
5. La confianza debe reflejar qué tan seguro estás del dato:
   - 1.0 = texto exacto y claro (ej: "Total: 123.45€")
   - 0.9 = texto claro pero con formato distinto (ej: "123,45 euros")
   - 0.8 = texto algo ambiguo pero probable (ej: número cerca de "total")
   - 0.7 = inferido de contexto (ej: fecha sin etiqueta clara)
   - 0.5 = muy incierto o múltiples interpretaciones
   - 0.0 = no encontrado

⚠️ IDENTIFICACIÓN DE PROVEEDOR (MUY IMPORTANTE):
6. El PROVEEDOR aparece en el ENCABEZADO del ${tipoDocumento} (primeras líneas)
7. Busca nombres comerciales + CIF en la parte SUPERIOR del documento
8. IGNORA COMPLETAMENTE nombres que aparezcan como "Cliente:", "Facturar a:", "Destinatario:", "Enviar a:"
9. Si ves múltiples CIFs, el del PROVEEDOR está en la parte superior junto al logo/membrete
10. Ejemplos de proveedores: "SABORES DEL SUR S.L. CIF: B06359418", "Distrib GODOVISI CIF: A214121838"

DEVUELVE SOLO EL JSON con la estructura exacta especificada arriba.
`

  return prompt
}

// 🧪 TEXTO DEL ALBARÁN PROBLEMÁTICO
const textoAlbaran = `ALBARAN CARGO
Número:
Fecha:
CODOY
Pedido previo:
Tipo:
N.Pedido:
Cliente:
3111865
N.L.F.: B56390065
Dirección: RABIDA 9., 9
A214121838
23/07/2025
1104782438
Venta
101305
CORRELIMO
CORRELIMO HUELVA SL
Moneda: EUR Via: Domiciliación SEPA
HUELVA
Dir.Fiscal: RABIDA 9
HUELVA
RUTA REPARTO: ZHUE1141
RUTA PREVENTA: ZHUE1204
CP:
21001
CP.Fiscal: 21001
MATERIAL DENOMINACION
55
CRUZCAMP0 Especial
CANT UNI
3 BAR
PRECIO
VALOR
156,32
468.96
Barril 501. Grundy ES
90,03
Bonificaciones
Impuestos
Subtotal produc`

console.log('🧪 === PRUEBA DE PROMPT PARA ALBARÁN ===')
console.log('📝 Tipo de documento: albaran')

const contextAnalysis = {
  hasRestaurantCIF: false,
  restaurante: { nombre: 'CORRELIMO HUELVA SL' },
  excludeCIF: 'B56390065',
  proveedorIndicators: [],
  clienteIndicators: []
}

const promptAlbaran = generateOpenAIPrompt(textoAlbaran, 'albaran', contextAnalysis)

console.log('\n🎯 === PROMPT GENERADO PARA ALBARÁN ===')
console.log('📋 Características del prompt:')
console.log('- ✅ Identifica como "albarán de entrega"')
console.log('- ✅ Busca "ALBARAN CARGO" en lugar de "Factura"')
console.log('- ✅ Adapta instrucciones para albaranes')
console.log('- ✅ Mantiene estructura JSON compatible')

console.log('\n📝 Prompt (primeros 500 chars):')
console.log(promptAlbaran.substring(0, 500) + '...')

console.log('\n✅ === RESULTADO ESPERADO ===')
console.log('Con este prompt, OpenAI debería:')
console.log('1. Reconocer que es un ALBARÁN')
console.log('2. Extraer correctamente el proveedor (no CORRELIMO)')
console.log('3. Mapear numero_albaran → numero_factura')
console.log('4. Procesar productos aunque tenga precios')
console.log('5. Mantener compatibilidad con código existente')