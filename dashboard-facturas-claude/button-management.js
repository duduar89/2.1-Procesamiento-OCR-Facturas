// ===== SISTEMA DE GESTIÓN CENTRALIZADA DE BOTONES =====
// Versión 2.0 - Mejorada para el Dashboard de Facturas

class ButtonManager {
    constructor() {
        this.buttonsState = new Map();
        this.initializeStyles();
    }

    // ✅ INICIALIZAR ESTILOS CSS PARA ESTADOS DE BOTONES
    initializeStyles() {
        const styles = `
            <style id="button-manager-styles">
                .btn-loading {
                    position: relative;
                    color: transparent !important;
                    pointer-events: none;
                    cursor: not-allowed;
                }

                .btn-loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 16px;
                    height: 16px;
                    margin: -8px 0 0 -8px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: btn-spin 1s linear infinite;
                }

                @keyframes btn-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .btn-disabled {
                    opacity: 0.6;
                    pointer-events: none;
                    cursor: not-allowed;
                }

                .btn-success-state {
                    background-color: #10b981 !important;
                    border-color: #10b981 !important;
                }

                .btn-error-state {
                    background-color: #ef4444 !important;
                    border-color: #ef4444 !important;
                }
            </style>
        `;
        
        if (!document.getElementById('button-manager-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    // ✅ DESHABILITAR BOTÓN CON ESTADO DE CARGA
    disableButton(buttonId, loadingText = 'Cargando...', options = {}) {
        const button = this.getButton(buttonId);
        if (!button) return false;

        // Guardar estado original
        this.buttonsState.set(buttonId, {
            originalText: button.textContent,
            originalHTML: button.innerHTML,
            originalDisabled: button.disabled,
            originalClasses: button.className,
            timestamp: Date.now()
        });

        // Aplicar estado de carga
        button.disabled = true;
        button.classList.add('btn-loading');
        
        if (options.showSpinner !== false) {
            button.textContent = loadingText;
        }

        console.log(`✅ Botón ${buttonId} deshabilitado`);
        return true;
    }

    // ✅ HABILITAR BOTÓN Y RESTAURAR ESTADO
    enableButton(buttonId, options = {}) {
        const button = this.getButton(buttonId);
        if (!button) return false;

        const savedState = this.buttonsState.get(buttonId);
        if (!savedState) {
            console.warn(`⚠️ No hay estado guardado para el botón ${buttonId}`);
            button.disabled = false;
            button.classList.remove('btn-loading', 'btn-disabled');
            return true;
        }

        // Restaurar estado original
        button.disabled = savedState.originalDisabled;
        button.textContent = savedState.originalText;
        button.className = savedState.originalClasses;

        // Limpiar estado guardado
        this.buttonsState.delete(buttonId);

        console.log(`✅ Botón ${buttonId} habilitado`);
        return true;
    }

    // ✅ MOSTRAR ESTADO DE ÉXITO TEMPORAL
    showSuccess(buttonId, successText = '✅ Completado', duration = 2000) {
        const button = this.getButton(buttonId);
        if (!button) return false;

        const originalText = button.textContent;
        const originalClasses = button.className;

        button.textContent = successText;
        button.classList.add('btn-success-state');
        button.disabled = true;

        setTimeout(() => {
            button.textContent = originalText;
            button.className = originalClasses;
            button.disabled = false;
        }, duration);

        return true;
    }

    // ✅ MOSTRAR ESTADO DE ERROR TEMPORAL
    showError(buttonId, errorText = '❌ Error', duration = 3000) {
        const button = this.getButton(buttonId);
        if (!button) return false;

        const originalText = button.textContent;
        const originalClasses = button.className;

        button.textContent = errorText;
        button.classList.add('btn-error-state');

        setTimeout(() => {
            button.textContent = originalText;
            button.className = originalClasses;
            button.disabled = false;
        }, duration);

        return true;
    }

    // ✅ VALIDAR ACCIÓN ANTES DE EJECUTAR
    validateAction(buttonId, requiredData = null, customValidator = null) {
        const button = this.getButton(buttonId);
        if (!button) {
            console.error(`❌ Botón ${buttonId} no encontrado`);
            return false;
        }

        if (button.disabled) {
            console.warn(`⚠️ Botón ${buttonId} está deshabilitado`);
            return false;
        }

        if (requiredData !== null && !requiredData) {
            console.error(`❌ Datos requeridos no disponibles para ${buttonId}`);
            if (window.showNotification) {
                window.showNotification('Datos requeridos no disponibles', 'warning');
            }
            return false;
        }

        if (customValidator && typeof customValidator === 'function') {
            const validationResult = customValidator();
            if (!validationResult) {
                console.error(`❌ Validación personalizada falló para ${buttonId}`);
                return false;
            }
        }

        return true;
    }

    // ✅ EJECUTAR ACCIÓN CON MANEJO AUTOMÁTICO DE ESTADOS
    async executeAction(buttonId, action, options = {}) {
        const {
            loadingText = 'Procesando...',
            successText = '✅ Completado',
            errorText = '❌ Error',
            requiredData = null,
            validator = null,
            successDuration = 2000,
            errorDuration = 3000
        } = options;

        // Validar antes de ejecutar
        if (!this.validateAction(buttonId, requiredData, validator)) {
            return { success: false, error: 'Validación falló' };
        }

        // Deshabilitar botón
        this.disableButton(buttonId, loadingText);

        try {
            // Ejecutar acción
            const result = await action();

            // Mostrar éxito
            this.showSuccess(buttonId, successText, successDuration);

            return { success: true, data: result };

        } catch (error) {
            console.error(`❌ Error ejecutando acción para ${buttonId}:`, error);

            // Mostrar error
            this.showError(buttonId, errorText, errorDuration);

            return { success: false, error: error.message };
        }
    }

    // ✅ OBTENER ELEMENTO BOTÓN CON VALIDACIÓN
    getButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) {
            console.error(`❌ Botón con ID '${buttonId}' no encontrado`);
            return null;
        }
        return button;
    }

    // ✅ OBTENER ESTADO DE TODOS LOS BOTONES
    getButtonsState() {
        return Array.from(this.buttonsState.entries()).map(([id, state]) => ({
            id,
            ...state,
            element: this.getButton(id)
        }));
    }

    // ✅ LIMPIAR TODOS LOS ESTADOS
    clearAllStates() {
        this.buttonsState.forEach((state, buttonId) => {
            this.enableButton(buttonId);
        });
        this.buttonsState.clear();
    }

    // ✅ CONFIGURAR BOTÓN CON EVENT LISTENER MEJORADO
    setupButton(buttonId, action, options = {}) {
        const button = this.getButton(buttonId);
        if (!button) return false;

        // Remover listeners previos
        button.replaceWith(button.cloneNode(true));
        const newButton = this.getButton(buttonId);

        // Agregar nuevo listener
        newButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            await this.executeAction(buttonId, action, options);
        });

        console.log(`✅ Botón ${buttonId} configurado con listener mejorado`);
        return true;
    }
}

// ===== INSTANCIA GLOBAL =====
window.buttonManager = new ButtonManager();

// ===== FUNCIONES DE CONVENIENCIA GLOBALES =====
window.disableButton = (buttonId, loadingText) => window.buttonManager.disableButton(buttonId, loadingText);
window.enableButton = (buttonId) => window.buttonManager.enableButton(buttonId);
window.validateButtonAction = (buttonId, requiredData, validator) => window.buttonManager.validateAction(buttonId, requiredData, validator);
window.executeButtonAction = (buttonId, action, options) => window.buttonManager.executeAction(buttonId, action, options);

// ===== FUNCIONES ESPECÍFICAS PARA EL DASHBOARD =====
window.dashboardButtons = {
    // Botón de actualizar datos
    setupRefreshButton() {
        return window.buttonManager.setupButton('refreshBtn', async () => {
            if (typeof loadFacturasData === 'function') {
                await loadFacturasData();
                return 'Datos actualizados';
            }
            throw new Error('Función loadFacturasData no disponible');
        }, {
            loadingText: '🔄 Actualizando...',
            successText: '✅ Actualizado',
            errorText: '❌ Error al actualizar'
        });
    },

    // Botón de exportar
    setupExportButton() {
        return window.buttonManager.setupButton('exportBtn', async () => {
            if (typeof exportFacturasData === 'function') {
                await exportFacturasData();
                return 'Datos exportados';
            }
            throw new Error('Función exportFacturasData no disponible');
        }, {
            loadingText: '📤 Exportando...',
            successText: '✅ Exportado',
            errorText: '❌ Error al exportar'
        });
    },

    // Botón de cotejo automático
    setupCotejoButton(facturaId) {
        return window.buttonManager.setupButton('cotejoBtn', async () => {
            if (typeof ejecutarCotejoAutomatico === 'function') {
                const resultado = await ejecutarCotejoAutomatico(facturaId);
                return resultado;
            }
            throw new Error('Función ejecutarCotejoAutomatico no disponible');
        }, {
            loadingText: '🤖 Cotejando...',
            successText: '✅ Cotejo completado',
            errorText: '❌ Error en cotejo',
            requiredData: facturaId,
            validator: () => facturaId && facturaId !== 'undefined'
        });
    }
};

console.log('✅ Sistema de gestión centralizada de botones cargado');