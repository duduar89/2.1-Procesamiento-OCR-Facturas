// =============================================
// CORRECCIÓN: sync-numier-data para múltiples tickets
// PROBLEMA: upsert sobrescribe tickets con mismo Serie-Number
// SOLUCIÓN: ID más único y mejor manejo de duplicados
// =============================================

// 🔧 CORRECCIÓN EN insertVentaUnificada (línea ~412):

// ❌ ANTES (PROBLEMÁTICO):
// id_externo: `${ventaData.Serie}-${ventaData.Number}`.trim(),

// ✅ DESPUÉS (CORREGIDO):
id_externo: `${ventaData.Serie}-${ventaData.Number}-${ventaData.TaxDocumentNumber || ventaData.Date}`.trim(),

// O incluso más único:
id_externo: `${ventaData.Serie}-${ventaData.Number}-${new Date(ventaData.Date).getTime()}`.trim(),

// =============================================
// EXPLICACIÓN DEL PROBLEMA:
// =============================================
/*
1. Numier devuelve múltiples tickets del día: T-001, T-002, T-003...
2. Todos pueden tener Serie="ABC" y Number="123" (patrón común)
3. El id_externo="ABC-123" es el MISMO para todos
4. upsert() sobrescribe: solo queda el último ticket insertado
5. Resultado: 1 ticket en BD en lugar de 3

SOLUCIÓN:
- Hacer id_externo más único incluyendo fecha/hora exacta
- O usar TaxDocumentNumber que suele ser único por ticket
*/

// =============================================
// CÓDIGO COMPLETO CORREGIDO:
// =============================================

async function insertVentaUnificada(
  supabase: any,
  restauranteId: string,
  sistemaOrigen: string,
  ventaData: any
) {
  // ✅ CALCULAR TICKET MEDIO para cada venta del TPV
  const totalBruto = parseFloat(ventaData.Totals?.GrossAmount || 0);
  const numComensales = ventaData.NumDiners || 0;
  
  // 🔧 CORRECCIÓN: Si no hay comensales, asumir 1 comensal (el ticket completo para 1 persona)
  const comensalesParaCalculo = numComensales > 0 ? numComensales : 1;
  const ticketMedio = totalBruto / comensalesParaCalculo;

  // ✅ GENERAR ID ÚNICO MEJORADO
  let idExterno = `${ventaData.Serie}-${ventaData.Number}`.trim();
  
  // Si TaxDocumentNumber existe, usarlo para mayor unicidad
  if (ventaData.TaxDocumentNumber) {
    idExterno = `${idExterno}-${ventaData.TaxDocumentNumber}`;
  } else {
    // Fallback: usar timestamp para garantizar unicidad
    idExterno = `${idExterno}-${new Date(ventaData.Date).getTime()}`;
  }

  const ventaUnificada = {
    restaurante_id: restauranteId,
    sistema_origen: sistemaOrigen,
    id_externo: idExterno,  // ✅ ID ÚNICO MEJORADO
    referencia_externa: ventaData.TaxDocumentNumber,
    fecha_venta: ventaData.BusinessDay,
    fecha_hora_completa: ventaData.Date,
    tpv_id: ventaData.Pos?.Id,
    tpv_nombre: ventaData.Pos?.Name,
    seccion: ventaData.Section?.sectionName,
    num_comensales: numComensales,
    total_bruto: totalBruto,
    total_neto: parseFloat(ventaData.Totals?.NetAmount || 0),
    total_impuestos: parseFloat(ventaData.Totals?.VatAmount || 0),
    descuentos: parseFloat(ventaData.Totals?.DiscountAmount || 0),
    propinas: parseFloat(ventaData.Totals?.SurchargeAmount || 0),
    ticket_medio: ticketMedio,  // ✅ NUEVO: Guardar ticket medio calculado
    metodo_pago: ventaData.Payments,
    datos_originales: ventaData,
  };

  console.log(`💰 Insertando ticket: ${idExterno} | €${totalBruto} | ${numComensales} comensales`);

  // ✅ OPCIÓN ALTERNATIVA: Usar INSERT con manejo de conflictos
  // Si quieres permitir duplicados reales, cambiar a:
  /*
  const { data: ventaInserted, error } = await supabase
    .from('ventas_datos')
    .insert(ventaUnificada)
    .select('id')
    .single();
  */

  // ✅ MANTENER UPSERT con ID mejorado
  const { data: ventaInserted, error } = await supabase
    .from('ventas_datos')
    .upsert(ventaUnificada, {
      onConflict: 'restaurante_id,sistema_origen,id_externo'  // Ahora con ID único
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error en upsert venta:', error);
    console.error('Datos de la venta:', ventaUnificada);
    throw new Error(`Error insertando venta: ${error.message}`);
  }

  if (!ventaInserted?.id) {
    throw new Error('No se pudo obtener el ID de la venta insertada');
  }

  console.log(`✅ Venta insertada: ID=${ventaInserted.id}, Externo=${idExterno}`);

  // ... resto del código para líneas de venta igual ...

  return ventaInserted;
}
