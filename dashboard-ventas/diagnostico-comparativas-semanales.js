/**
 * 🔍 DIAGNÓSTICO: PROBLEMA CON CONTROLES DE COMPARATIVAS SEMANALES
 * 
 * Este archivo diagnostica por qué los checkboxes de comparativas
 * no funcionan correctamente en el gráfico semanal.
 */

// =============================================
// 🎯 FUNCIÓN DE DIAGNÓSTICO PRINCIPAL
// =============================================

function diagnosticarComparativasSemanales() {
    console.log('🔍 === INICIANDO DIAGNÓSTICO DE COMPARATIVAS SEMANALES ===');
    
    // 1. Verificar que el gráfico existe
    console.log('📊 1. Verificando gráfico semanal...');
    console.log('   weeklyChart existe:', !!window.weeklyChart);
    
    if (window.weeklyChart) {
        console.log('   Datasets disponibles:', window.weeklyChart.data.datasets.length);
        window.weeklyChart.data.datasets.forEach((dataset, index) => {
            console.log(`   Dataset ${index}: ${dataset.label} (hidden: ${dataset.hidden})`);
        });
    }
    
    // 2. Verificar elementos HTML de checkboxes
    console.log('📋 2. Verificando checkboxes...');
    const checkboxes = [
        { id: 'toggle-actual', label: 'Esta Semana', expectedIndex: 0 },
        { id: 'toggle-anterior', label: 'Semana Anterior', expectedIndex: 1 },
        { id: 'toggle-mes-anterior', label: 'Misma Semana Mes Pasado', expectedIndex: 2 },
        { id: 'toggle-año-anterior', label: 'Misma Semana Año Pasado', expectedIndex: 3 }
    ];
    
    checkboxes.forEach(({ id, label, expectedIndex }) => {
        const checkbox = document.getElementById(id);
        console.log(`   ${label}:`);
        console.log(`     - Elemento existe: ${!!checkbox}`);
        if (checkbox) {
            console.log(`     - Checked: ${checkbox.checked}`);
            console.log(`     - Eventos registrados: ${getEventListeners ? Object.keys(getEventListeners(checkbox)).length : 'No disponible'}`);
        }
    });
    
    // 3. Verificar función setupChartControls
    console.log('⚙️ 3. Verificando setupChartControls...');
    console.log('   setupChartControls existe:', typeof window.setupChartControls === 'function');
    
    // 4. Verificar función toggleChartDataset
    console.log('🔄 4. Verificando toggleChartDataset...');
    console.log('   toggleChartDataset existe:', typeof window.toggleChartDataset === 'function');
    
    // 5. Simular toggle para test
    console.log('🧪 5. Test de funcionalidad...');
    testToggleFunctionality();
    
    console.log('🔍 === DIAGNÓSTICO COMPLETADO ===');
}

// =============================================
// 🧪 FUNCIÓN DE TEST DE FUNCIONALIDAD
// =============================================

function testToggleFunctionality() {
    if (!window.weeklyChart) {
        console.warn('⚠️ No se puede hacer test: weeklyChart no existe');
        return;
    }
    
    console.log('🧪 Iniciando test de toggle...');
    
    // Test: ocultar y mostrar primer dataset
    const originalVisible = !window.weeklyChart.data.datasets[0].hidden;
    console.log(`   Dataset 0 inicialmente visible: ${originalVisible}`);
    
    // Ocultar
    if (window.toggleChartDataset) {
        console.log('   Probando ocultar dataset 0...');
        window.toggleChartDataset(0, false);
        console.log(`   Dataset 0 después de ocultar: ${!window.weeklyChart.data.datasets[0].hidden}`);
        
        // Restaurar
        setTimeout(() => {
            console.log('   Probando mostrar dataset 0...');
            window.toggleChartDataset(0, true);
            console.log(`   Dataset 0 después de mostrar: ${!window.weeklyChart.data.datasets[0].hidden}`);
        }, 1000);
    }
}

// =============================================
// 🔧 FUNCIÓN DE REPARACIÓN AUTOMÁTICA
// =============================================

function repararComparativasSemanales() {
    console.log('🔧 === INICIANDO REPARACIÓN AUTOMÁTICA ===');
    
    // 1. Re-configurar controles si es necesario
    if (typeof window.setupChartControls === 'function') {
        console.log('🔄 Re-aplicando setupChartControls...');
        window.setupChartControls();
    }
    
    // 2. Verificar y arreglar event listeners
    console.log('📋 Verificando y arreglando event listeners...');
    const checkboxes = [
        { id: 'toggle-actual', index: 0 },
        { id: 'toggle-anterior', index: 1 },
        { id: 'toggle-mes-anterior', index: 2 },
        { id: 'toggle-año-anterior', index: 3 }
    ];
    
    checkboxes.forEach(({ id, index }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            // Remover listeners existentes (si los hay)
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            
            // Agregar nuevo listener
            newCheckbox.addEventListener('change', function() {
                console.log(`🔄 Toggle ${id} (dataset ${index}): ${this.checked}`);
                if (window.toggleChartDataset) {
                    window.toggleChartDataset(index, this.checked);
                } else {
                    console.error('❌ toggleChartDataset no está disponible');
                }
            });
            
            console.log(`✅ Event listener reparado para ${id}`);
        } else {
            console.warn(`⚠️ Checkbox ${id} no encontrado`);
        }
    });
    
    console.log('✅ Reparación completada');
}

// =============================================
// 🎯 VERSIÓN MEJORADA DE TOGGLECHARTDATASET
// =============================================

function toggleChartDatasetMejorado(datasetIndex, show) {
    console.log(`🔄 toggleChartDatasetMejorado: dataset ${datasetIndex}, mostrar: ${show}`);
    
    if (!window.weeklyChart) {
        console.error('❌ weeklyChart no existe');
        return false;
    }
    
    if (!window.weeklyChart.data.datasets[datasetIndex]) {
        console.error(`❌ Dataset ${datasetIndex} no existe. Datasets disponibles: ${window.weeklyChart.data.datasets.length}`);
        return false;
    }
    
    const dataset = window.weeklyChart.data.datasets[datasetIndex];
    const wasHidden = dataset.hidden;
    
    dataset.hidden = !show;
    
    console.log(`   Dataset "${dataset.label}": ${wasHidden ? 'oculto' : 'visible'} → ${dataset.hidden ? 'oculto' : 'visible'}`);
    
    // Actualizar gráfico
    try {
        window.weeklyChart.update('none'); // Sin animación para mejor rendimiento
        console.log('✅ Gráfico actualizado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error actualizando gráfico:', error);
        return false;
    }
}

// =============================================
// 🎮 CONTROLES MANUALES PARA DEBUGGING
// =============================================

function mostrarTodasLasLineas() {
    console.log('👁️ Mostrando todas las líneas...');
    if (window.weeklyChart) {
        window.weeklyChart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = false;
            const checkbox = document.getElementById(['toggle-actual', 'toggle-anterior', 'toggle-mes-anterior', 'toggle-año-anterior'][index]);
            if (checkbox) checkbox.checked = true;
        });
        window.weeklyChart.update('none');
        console.log('✅ Todas las líneas mostradas');
    }
}

function ocultarTodasLasLineas() {
    console.log('🙈 Ocultando todas las líneas...');
    if (window.weeklyChart) {
        window.weeklyChart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = true;
            const checkbox = document.getElementById(['toggle-actual', 'toggle-anterior', 'toggle-mes-anterior', 'toggle-año-anterior'][index]);
            if (checkbox) checkbox.checked = false;
        });
        window.weeklyChart.update('none');
        console.log('✅ Todas las líneas ocultadas');
    }
}

function mostrarSoloLinea(datasetIndex) {
    console.log(`👁️ Mostrando solo línea ${datasetIndex}...`);
    if (window.weeklyChart) {
        window.weeklyChart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = index !== datasetIndex;
            const checkbox = document.getElementById(['toggle-actual', 'toggle-anterior', 'toggle-mes-anterior', 'toggle-año-anterior'][index]);
            if (checkbox) checkbox.checked = index === datasetIndex;
        });
        window.weeklyChart.update('none');
        console.log(`✅ Solo línea ${datasetIndex} mostrada`);
    }
}

// =============================================
// 🚀 AUTO-INICIALIZACIÓN Y EXPOSICIÓN GLOBAL
// =============================================

// Exponer funciones globalmente para debugging
window.DiagnosticoComparativas = {
    diagnosticar: diagnosticarComparativasSemanales,
    reparar: repararComparativasSemanales,
    toggleMejorado: toggleChartDatasetMejorado,
    mostrarTodas: mostrarTodasLasLineas,
    ocultarTodas: ocultarTodasLasLineas,
    mostrarSolo: mostrarSoloLinea,
    test: testToggleFunctionality
};

// Ejecutar diagnóstico automático cuando se carga el archivo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para que el gráfico se haya creado
    setTimeout(() => {
        console.log('🔍 Ejecutando diagnóstico automático de comparativas semanales...');
        diagnosticarComparativasSemanales();
    }, 3000);
});

console.log('🔍 Diagnóstico de Comparativas Semanales cargado.');
console.log('📞 Uso: DiagnosticoComparativas.diagnosticar() o DiagnosticoComparativas.reparar()');
console.log('🎮 Controles: DiagnosticoComparativas.mostrarTodas(), .ocultarTodas(), .mostrarSolo(index)');
