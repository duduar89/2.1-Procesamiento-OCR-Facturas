// ===== PARCHE PARA MOSTRAR ALBARANES Y ARREGLAR PROBLEMAS =====

console.log('🔧 Aplicando parche para mostrar albaranes...');

// ✅ 1. FUNCIÓN GLOBAL PARA FILTRAR POR TIPO DE DOCUMENTO
window.filterByDocumentType = function(tipo) {
    console.log(`🔍 Filtrando documentos por tipo: ${tipo}`);
    
    window.currentDocumentFilter = tipo;
    window.currentPage = 1; // Resetear paginación
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-filter="${tipo}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Renderizar tabla con filtro
    if (typeof window.renderFacturasTable === 'function') {
        window.renderFacturasTable();
    }
    
    // Actualizar contadores
    window.updateDocumentCounts();
}

// ✅ 2. FUNCIÓN PARA OBTENER DATOS FILTRADOS
window.getFilteredData = function() {
    const filter = window.currentDocumentFilter || 'todos';
    const allData = window.facturasData || [];
    
    if (filter === 'todos') {
        return allData;
    }
    
    return allData.filter(doc => doc.tipo_documento === filter);
}

// ✅ 3. FUNCIÓN PARA ACTUALIZAR CONTADORES
window.updateDocumentCounts = function() {
    const allData = window.facturasData || [];
    const facturas = allData.filter(doc => doc.tipo_documento === 'factura');
    const albaranes = allData.filter(doc => doc.tipo_documento === 'albaran');
    
    // Actualizar contadores en los botones
    const countTodos = document.getElementById('countTodos');
    const countFacturas = document.getElementById('countFacturas');
    const countAlbaranes = document.getElementById('countAlbaranes');
    
    if (countTodos) countTodos.textContent = allData.length;
    if (countFacturas) countFacturas.textContent = facturas.length;
    if (countAlbaranes) countAlbaranes.textContent = albaranes.length;
    
    console.log(`📊 Contadores actualizados: ${allData.length} total, ${facturas.length} facturas, ${albaranes.length} albaranes`);
    
    // Mostrar información en consola para debug
    if (albaranes.length > 0) {
        console.log('✅ ALBARANES ENCONTRADOS:');
        albaranes.forEach((albaran, index) => {
            console.log(`   ${index + 1}. ${albaran.proveedor_nombre} - ${albaran.numero_factura} - ${albaran.total_factura}€`);
        });
    } else {
        console.log('⚠️ NO se encontraron albaranes en los datos');
    }
}

// ✅ 4. MEJORAR FUNCIÓN DE RENDERIZADO DE TABLA
window.renderFacturasTableOriginal = window.renderFacturasTable;
window.renderFacturasTable = function(data = null) {
    // Usar datos filtrados si no se pasan datos específicos
    const dataToRender = data || window.getFilteredData();
    console.log(`🔄 Renderizando tabla con ${dataToRender.length} documentos (filtro: ${window.currentDocumentFilter || 'todos'})`);
    
    // Si hay función original, usarla con los datos filtrados
    if (window.renderFacturasTableOriginal) {
        return window.renderFacturasTableOriginal(dataToRender);
    }
    
    // Fallback básico si no hay función original
    const tbody = document.querySelector('.facturas-table tbody');
    if (!tbody) {
        console.error('❌ No se encontró tbody de la tabla');
        return;
    }
    
    if (dataToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h4>No hay documentos</h4>
                        <p>No se encontraron documentos para mostrar</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Renderizar filas básicas
    const html = dataToRender.map(doc => `
        <tr data-documento-id="${doc.id}">
            <td class="expand-column">📦</td>
            <td class="estado-column">
                <span class="status-badge status-${doc.estado}">${doc.estado}</span>
            </td>
            <td class="tipo-column">
                <span class="doc-type ${doc.tipo_documento}">
                    ${doc.tipo_documento === 'albaran' ? '📦 Albarán' : '🧾 Factura'}
                </span>
            </td>
            <td class="proveedor-column">${doc.proveedor_nombre}</td>
            <td class="numero-column">${doc.numero_factura}</td>
            <td class="fecha-column">${new Date(doc.fecha_factura).toLocaleDateString()}</td>
            <td class="total-column">${doc.total_factura}€</td>
            <td class="acciones-column">
                <button class="btn-action primary" onclick="openFacturaModal('${doc.id}')">Ver</button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

// ✅ 5. INICIALIZAR FILTROS CUANDO SE CARGUEN LOS DATOS
const originalLoadRealDataFromSupabase = window.loadRealDataFromSupabase;
if (originalLoadRealDataFromSupabase) {
    window.loadRealDataFromSupabase = async function() {
        const result = await originalLoadRealDataFromSupabase();
        
        // Actualizar contadores después de cargar datos
        setTimeout(() => {
            window.updateDocumentCounts();
        }, 500);
        
        return result;
    }
}

// ✅ 6. CONFIGURAR FILTROS AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar filtro por defecto
    window.currentDocumentFilter = 'todos';
    
    // Configurar event listeners para los filtros
    setTimeout(() => {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.dataset.filter;
                window.filterByDocumentType(filter);
            });
        });
        
        console.log(`✅ Configurados ${filterButtons.length} botones de filtro`);
    }, 1000);
});

// ✅ 7. FUNCIÓN PARA DEBUG - MOSTRAR DATOS ACTUALES
window.debugDocuments = function() {
    console.log('🔍 DEBUG - Datos actuales:');
    console.log('  - Total documentos:', window.facturasData?.length || 0);
    console.log('  - Filtro actual:', window.currentDocumentFilter);
    console.log('  - Datos filtrados:', window.getFilteredData()?.length || 0);
    
    if (window.facturasData && window.facturasData.length > 0) {
        const tipos = window.facturasData.reduce((acc, doc) => {
            acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1;
            return acc;
        }, {});
        console.log('  - Tipos de documento:', tipos);
    }
    
    return window.facturasData;
}

// ✅ 8. ARREGLAR BOTÓN DE COTEJO
window.ejecutarCotejoAutomaticoFixed = window.ejecutarCotejoAutomatico;
window.ejecutarCotejoAutomatico = async function(facturaId) {
    console.log('🤖 Ejecutando cotejo automático mejorado para:', facturaId);
    
    if (!facturaId) {
        console.error('❌ ID de factura/albarán requerido');
        return;
    }
    
    // Buscar el documento en los datos
    const documento = window.facturasData?.find(doc => 
        doc.id === facturaId || doc.documento_id === facturaId
    );
    
    if (!documento) {
        console.error('❌ Documento no encontrado:', facturaId);
        return;
    }
    
    console.log('✅ Documento encontrado:', documento.tipo_documento, documento.proveedor_nombre);
    
    // Ejecutar función original si existe
    if (window.ejecutarCotejoAutomaticoFixed) {
        return await window.ejecutarCotejoAutomaticoFixed(facturaId);
    }
}

console.log('✅ Parche aplicado correctamente');
console.log('📋 Funciones disponibles:');
console.log('  - filterByDocumentType(tipo) - Filtrar por "todos", "factura", "albaran"');
console.log('  - debugDocuments() - Ver estado actual de los datos');
console.log('  - updateDocumentCounts() - Actualizar contadores');