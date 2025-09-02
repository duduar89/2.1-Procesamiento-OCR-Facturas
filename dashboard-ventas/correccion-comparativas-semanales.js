/**
 * 🔧 CORRECCIÓN: CONTROLES DE COMPARATIVAS SEMANALES
 * 
 * Basado en el análisis del código, he identificado el problema:
 * Los event listeners se configuran ANTES de que el gráfico esté creado,
 * y además hay problemas con el orden de los datasets.
 */

// =============================================
// 🎯 PROBLEMA IDENTIFICADO
// =============================================

/*
ANÁLISIS DEL PROBLEMA:

1. **TIMING INCORRECTO**: setupChartControls() se llama en loadAnalisisSemanal() 
   en la línea 556, pero el gráfico se crea de forma asíncrona antes.

2. **ORDEN DE DATASETS**: Los datasets se crean dinámicamente según datos disponibles,
   pero los checkboxes asumen un orden fijo [0,1,2,3].

3. **SCOPE DE WEEKLYCHART**: La variable weeklyChart puede no estar disponible 
   globalmente cuando se ejecutan los event listeners.

4. **FALTA DE VALIDACIÓN**: toggleChartDataset no valida si el dataset existe
   antes de intentar modificarlo.

SOLUCIÓN: Reemplazar setupChartControls() con una versión corregida.
*/

// =============================================
// 🔧 VERSIÓN CORREGIDA DE SETUPCHARTCONTROLS
// =============================================

function setupChartControlsCorregido() {
    console.log('🔧 === CONFIGURANDO CONTROLES CORREGIDOS ===');
    
    // Verificar que el gráfico existe
    if (!window.weeklyChart) {
        console.warn('⚠️ weeklyChart no existe todavía. Reintentando en 500ms...');
        setTimeout(setupChartControlsCorregido, 500);
        return;
    }
    
    console.log('📊 Gráfico encontrado. Datasets disponibles:', window.weeklyChart.data.datasets.length);
    
    // Mapear checkboxes a datasets basado en el label, no en el índice fijo
    const checkboxMappings = [
        { id: 'toggle-actual', label: 'Esta Semana' },
        { id: 'toggle-anterior', label: 'Semana Anterior' },
        { id: 'toggle-mes-anterior', label: 'Misma Semana Mes Pasado' },
        { id: 'toggle-año-anterior', label: 'Misma Semana Año Pasado' }
    ];
    
    checkboxMappings.forEach(({ id, label }) => {
        const checkbox = document.getElementById(id);
        if (!checkbox) {
            console.warn(`⚠️ Checkbox ${id} no encontrado`);
            return;
        }
        
        // Encontrar el índice del dataset por su label
        const datasetIndex = window.weeklyChart.data.datasets.findIndex(ds => ds.label === label);
        
        if (datasetIndex === -1) {
            console.warn(`⚠️ Dataset "${label}" no encontrado. Datasets disponibles:`, 
                window.weeklyChart.data.datasets.map(ds => ds.label));
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
            return;
        }
        
        console.log(`✅ Mapeando ${id} → Dataset ${datasetIndex} ("${label}")`);
        
        // Remover listeners existentes clonando el elemento
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        
        // Configurar estado inicial basado en el dataset
        const dataset = window.weeklyChart.data.datasets[datasetIndex];
        newCheckbox.checked = !dataset.hidden;
        newCheckbox.disabled = false;
        newCheckbox.parentElement.style.opacity = '1';
        
        // Agregar event listener mejorado
        newCheckbox.addEventListener('change', function(event) {
            const isChecked = this.checked;
            console.log(`🔄 Usuario cambió ${label}: ${isChecked ? 'mostrar' : 'ocultar'}`);
            
            // Usar función de toggle mejorada
            const success = toggleChartDatasetMejorado(datasetIndex, isChecked);
            
            if (!success) {
                // Revertir checkbox si falló
                console.warn('⚠️ Revirtiendo checkbox debido a error');
                this.checked = !isChecked;
            }
            
            // Prevenir propagación
            event.stopPropagation();
        });
        
        console.log(`✅ Event listener configurado para ${id} → dataset ${datasetIndex}`);
    });
    
    console.log('✅ Controles configurados correctamente');
}

// =============================================
// 🔧 VERSIÓN MEJORADA DE TOGGLECHARTDATASET
// =============================================

function toggleChartDatasetMejorado(datasetIndex, show) {
    console.log(`🔄 Toggle dataset ${datasetIndex}: ${show ? 'mostrar' : 'ocultar'}`);
    
    // Validaciones
    if (!window.weeklyChart) {
        console.error('❌ weeklyChart no existe');
        return false;
    }
    
    if (typeof datasetIndex !== 'number' || datasetIndex < 0) {
        console.error('❌ datasetIndex inválido:', datasetIndex);
        return false;
    }
    
    if (!window.weeklyChart.data.datasets[datasetIndex]) {
        console.error(`❌ Dataset ${datasetIndex} no existe. Total datasets: ${window.weeklyChart.data.datasets.length}`);
        console.error('Datasets disponibles:', window.weeklyChart.data.datasets.map((ds, i) => `${i}: ${ds.label}`));
        return false;
    }
    
    const dataset = window.weeklyChart.data.datasets[datasetIndex];
    const previousState = !dataset.hidden;
    
    // Aplicar cambio
    dataset.hidden = !show;
    
    console.log(`   Dataset "${dataset.label}": ${previousState ? 'visible' : 'oculto'} → ${show ? 'visible' : 'oculto'}`);
    
    // Actualizar gráfico con manejo de errores
    try {
        window.weeklyChart.update('none'); // Sin animación para mejor rendimiento
        console.log('✅ Gráfico actualizado correctamente');
        
        // Verificar que el cambio se aplicó
        const newState = !window.weeklyChart.data.datasets[datasetIndex].hidden;
        if (newState === show) {
            console.log('✅ Estado confirmado correctamente');
            return true;
        } else {
            console.warn('⚠️ Estado no coincide después de actualizar');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error actualizando gráfico:', error);
        // Revertir cambio en caso de error
        dataset.hidden = !show;
        return false;
    }
}

// =============================================
// 🎯 FUNCIÓN DE INSTALACIÓN/REPARACIÓN
// =============================================

function instalarCorreccionComparativas() {
    console.log('🔧 === INSTALANDO CORRECCIÓN DE COMPARATIVAS ===');
    
    // 1. Reemplazar función global setupChartControls
    if (window.setupChartControls) {
        console.log('🔄 Reemplazando setupChartControls original...');
        window.setupChartControls = setupChartControlsCorregido;
    } else {
        console.log('➕ Agregando setupChartControls...');
        window.setupChartControls = setupChartControlsCorregido;
    }
    
    // 2. Reemplazar función global toggleChartDataset
    if (window.toggleChartDataset) {
        console.log('🔄 Reemplazando toggleChartDataset original...');
        window.toggleChartDataset = toggleChartDatasetMejorado;
    } else {
        console.log('➕ Agregando toggleChartDataset...');
        window.toggleChartDataset = toggleChartDatasetMejorado;
    }
    
    // 3. Si ya hay un gráfico creado, reconfigurar controles inmediatamente
    if (window.weeklyChart) {
        console.log('📊 Gráfico existente detectado. Reconfigurando controles...');
        setupChartControlsCorregido();
    } else {
        console.log('⏳ Esperando creación del gráfico...');
    }
    
    console.log('✅ Corrección instalada');
}

// =============================================
// 🎮 FUNCIONES DE UTILIDAD ADICIONALES
// =============================================

function verificarEstadoComparativas() {
    console.log('🔍 === VERIFICANDO ESTADO ACTUAL ===');
    
    if (!window.weeklyChart) {
        console.log('❌ No hay gráfico semanal');
        return;
    }
    
    console.log('📊 Estado actual de datasets:');
    window.weeklyChart.data.datasets.forEach((dataset, index) => {
        const checkbox = document.querySelector(`[data-dataset="${index}"], #toggle-${['actual', 'anterior', 'mes-anterior', 'año-anterior'][index]}`);
        console.log(`   ${index}: "${dataset.label}" - Visible: ${!dataset.hidden}, Checkbox: ${checkbox ? checkbox.checked : 'N/A'}`);
    });
}

function sincronizarCheckboxes() {
    console.log('🔄 Sincronizando checkboxes con estado del gráfico...');
    
    if (!window.weeklyChart) return;
    
    const checkboxIds = ['toggle-actual', 'toggle-anterior', 'toggle-mes-anterior', 'toggle-año-anterior'];
    
    window.weeklyChart.data.datasets.forEach((dataset, index) => {
        const checkboxId = checkboxIds[index];
        const checkbox = document.getElementById(checkboxId);
        
        if (checkbox) {
            checkbox.checked = !dataset.hidden;
            console.log(`   Sincronizado ${checkboxId}: ${!dataset.hidden}`);
        }
    });
}

// =============================================
// 🚀 AUTO-INSTALACIÓN
// =============================================

// Instalar corrección cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalarCorreccionComparativas);
} else {
    instalarCorreccionComparativas();
}

// También instalar cuando se navegue a la sección semanal
document.addEventListener('click', function(event) {
    if (event.target.textContent && event.target.textContent.includes('Análisis Semanal')) {
        setTimeout(instalarCorreccionComparativas, 100);
    }
});

// =============================================
// 🔧 EXPOSICIÓN GLOBAL PARA DEBUGGING
// =============================================

window.CorreccionComparativas = {
    instalar: instalarCorreccionComparativas,
    verificar: verificarEstadoComparativas,
    sincronizar: sincronizarCheckboxes,
    setupControls: setupChartControlsCorregido,
    toggle: toggleChartDatasetMejorado
};

console.log('🔧 Corrección de Comparativas Semanales cargada.');
console.log('📞 Uso: CorreccionComparativas.instalar() para aplicar manualmente');
console.log('🔍 Debug: CorreccionComparativas.verificar() para ver estado actual');
