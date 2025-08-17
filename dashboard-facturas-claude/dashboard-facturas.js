// ===== DASHBOARD DE FACTURAS - SISTEMA COMPLETO =====

// Variables globales
let supabaseClient = null;
let currentUser = null;
let currentFile = null;
let processingState = false;
let facturasData = [];
let currentPage = 1;
const itemsPerPage = 10;
// hybridPDFModal se inicializa desde hybrid-pdf-modal.js

// ===== SISTEMA DE TEMAS =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('dashboard-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'oscuro';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`Tema ${newTheme === 'light' ? 'claro' : 'oscuro'} activado`, 'info');
    
    // Enviar notificación push si están habilitadas
    if (Notification.permission === 'granted') {
        sendCustomNotification(
            'Tema Cambiado 🎨',
            `Tema ${newTheme === 'light' ? 'claro' : 'oscuro'} activado`,
            { requireInteraction: false }
        );
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        themeIcon.parentElement.title = `Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`;
    }
}

// ===== FUNCIONES DE COTEJO INTELIGENTE =====

// Función para ejecutar cotejo automático después de procesar factura
async function ejecutarCotejoAutomatico(facturaId) {
  try {
    console.log('🔄 Ejecutando cotejo automático...')
    
    // Mostrar loading
    const enlacesLoading = document.getElementById('enlacesLoading')
    const enlacesContainer = document.getElementById('enlaces-factura-modal')
    
    if (enlacesLoading) enlacesLoading.style.display = 'flex'
    if (enlacesContainer) enlacesContainer.style.display = 'none'
    
    const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/cotejo-inteligente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
      },
      body: JSON.stringify({
        facturaId: facturaId,
        background: false,
        forceReprocess: false
      })
    })
    
    const resultado = await response.json()
    
    // Ocultar loading
    if (enlacesLoading) enlacesLoading.style.display = 'none'
    if (enlacesContainer) enlacesContainer.style.display = 'block'
    
    if (resultado.success) {
      console.log('✅ Cotejo completado:', resultado)
      
      // Mostrar notificación del resultado
      mostrarNotificacionCotejo(resultado)
      
      // Actualizar la interfaz con los enlaces
      await actualizarEnlacesFactura(facturaId)
      
      return resultado
    } else {
      console.error('❌ Error en cotejo:', resultado.error)
      showNotification('Error en cotejo automático', 'error')
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando cotejo:', error)
    showNotification('Error ejecutando cotejo', 'error')
    
    // Ocultar loading en caso de error
    const enlacesLoading = document.getElementById('enlacesLoading')
    const enlacesContainer = document.getElementById('enlaces-factura-modal')
    
    if (enlacesLoading) enlacesLoading.style.display = 'none'
    if (enlacesContainer) enlacesContainer.style.display = 'block'
  }
}
  
  // Función para mostrar notificación del resultado del cotejo
  function mostrarNotificacionCotejo(resultado) {
    const { notificacion } = resultado
    
    let tipo = 'info'
    if (notificacion.tipo === 'alta_confianza') tipo = 'success'
    else if (notificacion.tipo === 'media_confianza') tipo = 'warning'
    else if (notificacion.tipo === 'baja_confianza') tipo = 'error'
    
    showNotification(notificacion.mensaje, tipo)
    
    // Si hay enlaces automáticos, mostrar mensaje especial
    if (resultado.enlaces_automaticos > 0) {
      setTimeout(() => {
        showNotification(`🎉 ¡${resultado.enlaces_automaticos} albarán(es) enlazado(s) automáticamente!`, 'success')
      }, 2000)
    }
  }
  
  // Función para actualizar la interfaz con los enlaces de una factura
async function actualizarEnlacesFactura(facturaId) {
  try {
    // Obtener enlaces de la factura
    const { data: enlaces, error } = await supabaseClient
      .from('facturas_albaranes_enlaces')
      .select(`
        *,
        datos_extraidos_albaranes(
          numero_albaran,
          fecha_albaran,
          total_albaran,
          proveedor_nombre
        )
      `)
      .eq('factura_id', facturaId)
      .order('fecha_cotejo', { ascending: false })
    
    if (error) {
      console.error('❌ Error obteniendo enlaces:', error)
      return
    }
    
    // Actualizar contadores en la tabla
    actualizarContadoresAlbaranes(facturaId, enlaces || [])
    
    // Actualizar la interfaz
    actualizarInterfazEnlaces(facturaId, enlaces || [])
    
  } catch (error) {
    console.error('❌ Error actualizando enlaces:', error)
  }
}

// Función para actualizar contadores de albaranes en la tabla
function actualizarContadoresAlbaranes(facturaId, enlaces) {
  const contadorTabla = document.getElementById(`albaranes-count-${facturaId}`)
  const contadorExpandido = document.getElementById(`albaranes-count-expanded-${facturaId}`)
  
  if (contadorTabla) {
    contadorTabla.textContent = enlaces.length
    contadorTabla.className = enlaces.length > 0 ? 'albaranes-count has-albaranes' : 'albaranes-count'
  }
  
  if (contadorExpandido) {
    contadorExpandido.textContent = enlaces.length
  }
}

// Función para alternar la fila de albaranes
async function toggleAlbaranesRow(facturaId, buttonElement) {
  const albaranesRow = document.getElementById(`albaranes-row-${facturaId}`)
  const isExpanded = buttonElement.classList.contains('expanded')
  
  if (!isExpanded) {
    // Expandir
    buttonElement.classList.add('expanded')
    albaranesRow.style.display = 'table-row'
    albaranesRow.classList.add('expanding')
    
    // Cargar albaranes si no están cargados
    await cargarAlbaranesParaFactura(facturaId)
  } else {
    // Contraer
    buttonElement.classList.remove('expanded')
    albaranesRow.style.display = 'none'
    albaranesRow.classList.remove('expanding')
  }
}

// Función para cargar albaranes de una factura
async function cargarAlbaranesParaFactura(facturaId) {
  try {
    console.log('🔗 Cargando albaranes para factura:', facturaId)
    
    // Obtener enlaces existentes
    const { data: enlaces, error } = await supabaseClient
      .from('facturas_albaranes_enlaces')
      .select(`
        *,
        datos_extraidos_albaranes(
          numero_albaran,
          fecha_albaran,
          total_albaran,
          proveedor_nombre
        )
      `)
      .eq('factura_id', facturaId)
      .order('fecha_cotejo', { ascending: false })
      
    if (error) {
      console.error('❌ Error cargando albaranes:', error)
      showNotification('Error cargando albaranes', 'error')
      return
    }
    
    console.log(`✅ ${enlaces?.length || 0} albaranes cargados para factura ${facturaId}`)
    
    renderizarAlbaranesEnTabla(facturaId, enlaces || [])
    
  } catch (error) {
    console.error('❌ Error en cargarAlbaranesParaFactura:', error)
    showNotification('Error cargando albaranes', 'error')
  }
}

// Función para renderizar albaranes en la tabla
function renderizarAlbaranesEnTabla(facturaId, enlaces) {
  const albaranesGrid = document.getElementById(`albaranes-grid-${facturaId}`)
  
  if (!albaranesGrid) {
    console.error('❌ No se encontró el contenedor de albaranes')
    return
  }
  
  if (enlaces.length === 0) {
    albaranesGrid.innerHTML = `
      <div class="text-center text-muted py-3">
        <i class="fas fa-info-circle"></i> No hay albaranes enlazados
      </div>
    `
    return
  }
  
  // Renderizar albaranes
  albaranesGrid.innerHTML = enlaces.map(enlace => {
    const albaran = enlace.datos_extraidos_albaranes
    const estado = enlace.estado
    const confianza = Math.round(enlace.confianza_match * 100)
    
    let badgeEstado = ''
    let acciones = ''
    
    switch (estado) {
      case 'confirmado':
        badgeEstado = `<span class="enlace-badge confirmado">✅ Confirmado</span>`
        break
      case 'sugerido':
        badgeEstado = `<span class="enlace-badge sugerencia">⚠️ Sugerencia (${confianza}%)</span>`
        acciones = `
          <button class="btn-enlace-action confirmar" onclick="confirmarSugerencia('${enlace.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Confirmar
          </button>
          <button class="btn-enlace-action rechazar" onclick="rechazarSugerencia('${enlace.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Rechazar
          </button>
        `
        break
      case 'detectado':
        badgeEstado = `<span class="enlace-badge detectado">🔍 Detectado (${confianza}%)</span>`
        break
      case 'rechazado':
        badgeEstado = `<span class="enlace-badge rechazado">❌ Rechazado</span>`
        break
    }
    
    return `
      <div class="enlace-card-table">
        <div class="enlace-header-table">
          <h6 class="enlace-title-table">
            📦 ${albaran.numero_albaran || 'Sin número'}
          </h6>
          ${badgeEstado}
        </div>
        
        <div class="enlace-details-table">
          <div class="enlace-detail-table">
            <span>Proveedor</span>
            <div class="value">${albaran.proveedor_nombre || 'N/A'}</div>
          </div>
          <div class="enlace-detail-table">
            <span>Fecha</span>
            <div class="value">${albaran.fecha_albaran || 'N/A'}</div>
          </div>
          <div class="enlace-detail-table">
            <span>Total</span>
            <div class="value">€${albaran.total_albaran || '0.00'}</div>
          </div>
          <div class="enlace-detail-table">
            <span>Método</span>
            <div class="value">${enlace.metodo_deteccion || 'N/A'}</div>
          </div>
        </div>
        
        ${acciones ? `<div class="enlace-actions-table">${acciones}</div>` : ''}
      </div>
    `
  }).join('')
}

// ===== FUNCIONES PARA GESTIONAR SUGERENCIAS =====

// Función para confirmar una sugerencia
async function confirmarSugerencia(enlaceId) {
  try {
    console.log('✅ Confirmando sugerencia:', enlaceId)
    
    const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/gestionar-sugerencias-cotejo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'confirmar',
        enlaceId: enlaceId,
        usuarioId: CONFIG.USUARIO_ID || '00000000-0000-0000-0000-000000000000'
      })
    })
    
    const resultado = await response.json()
    
    if (resultado.success) {
      showNotification('✅ Sugerencia confirmada exitosamente', 'success')
      
      // Recargar albaranes en todas las filas expandidas
      await recargarAlbaranesExpandidos()
      
    } else {
      showNotification(`❌ Error: ${resultado.message}`, 'error')
    }
    
  } catch (error) {
    console.error('❌ Error confirmando sugerencia:', error)
    showNotification('Error confirmando sugerencia', 'error')
  }
}

// Función para rechazar una sugerencia
async function rechazarSugerencia(enlaceId) {
  try {
    console.log('❌ Rechazando sugerencia:', enlaceId)
    
    const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/gestionar-sugerencias-cotejo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'rechazar',
        enlaceId: enlaceId,
        usuarioId: CONFIG.USUARIO_ID || '00000000-0000-0000-0000-000000000000'
      })
    })
    
    const resultado = await response.json()
    
    if (resultado.success) {
      showNotification('❌ Sugerencia rechazada exitosamente', 'success')
      
      // Recargar albaranes en todas las filas expandidas
      await recargarAlbaranesExpandidos()
      
    } else {
      showNotification(`❌ Error: ${resultado.message}`, 'error')
    }
    
  } catch (error) {
    console.error('❌ Error rechazando sugerencia:', error)
    showNotification('Error rechazando sugerencia', 'error')
  }
}

// Función para recargar albaranes en todas las filas expandidas
async function recargarAlbaranesExpandidos() {
  const filasExpandidas = document.querySelectorAll('.albaranes-row.expanding')
  
  for (const fila of filasExpandidas) {
    const facturaId = fila.id.replace('albaranes-row-', '')
    await cargarAlbaranesParaFactura(facturaId)
  }
}
  
  // Función para actualizar la interfaz de enlaces
function actualizarInterfazEnlaces(facturaId, enlaces) {
  // Buscar tanto en la tabla como en el modal
  const contenedorEnlaces = document.getElementById(`enlaces-factura-${facturaId}`) || 
                           document.getElementById('enlaces-factura-modal')
  
  if (!contenedorEnlaces) return
  
  // Limpiar contenedor
  contenedorEnlaces.innerHTML = ''
  
  if (enlaces.length === 0) {
    contenedorEnlaces.innerHTML = `
      <div class="text-center text-muted py-3">
        <i class="fas fa-info-circle"></i> No hay albaranes enlazados
      </div>
    `
    return
  }
  
  // Crear lista de enlaces
  enlaces.forEach(enlace => {
    const albaran = enlace.datos_extraidos_albaranes
    const estado = enlace.estado
    const confianza = Math.round(enlace.confianza_match * 100)
    
    let badgeEstado = ''
    let acciones = ''
    
    switch (estado) {
      case 'confirmado':
        badgeEstado = `<span class="enlace-badge confirmado">✅ Confirmado</span>`
        break
      case 'sugerido':
        badgeEstado = `<span class="enlace-badge sugerencia">⚠️ Sugerencia (${confianza}%)</span>`
        acciones = `
          <button class="btn-enlace-action confirmar" onclick="confirmarSugerencia('${enlace.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Confirmar
          </button>
          <button class="btn-enlace-action rechazar" onclick="rechazarSugerencia('${enlace.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Rechazar
          </button>
        `
        break
      case 'detectado':
        badgeEstado = `<span class="enlace-badge detectado">🔍 Detectado (${confianza}%)</span>`
        break
      case 'rechazado':
        badgeEstado = `<span class="enlace-badge rechazado">❌ Rechazado</span>`
        break
    }
    
    const enlaceHTML = `
      <div class="enlace-card">
        <div class="enlace-header">
          <h6 class="enlace-title">
            📦 ${albaran.numero_albaran || 'Sin número'}
          </h6>
          ${badgeEstado}
        </div>
        
        <div class="enlace-details">
          <div class="enlace-detail">
            <span>Proveedor</span>
            <div class="value">${albaran.proveedor_nombre || 'N/A'}</div>
          </div>
          <div class="enlace-detail">
            <span>Fecha</span>
            <div class="value">${albaran.fecha_albaran || 'N/A'}</div>
          </div>
          <div class="enlace-detail">
            <span>Total</span>
            <div class="value">€${albaran.total_albaran || '0.00'}</div>
          </div>
          <div class="enlace-detail">
            <span>Método</span>
            <div class="value">${enlace.metodo_deteccion || 'N/A'}</div>
          </div>
        </div>
        
        ${acciones ? `<div class="enlace-actions">${acciones}</div>` : ''}
      </div>
    `
    
    contenedorEnlaces.innerHTML += enlaceHTML
  })
}
  
  // Función para confirmar una sugerencia
  async function confirmarSugerencia(enlaceId) {
    try {
      const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/gestionar-sugerencias-cotejo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
        },
        body: JSON.stringify({
          accion: 'confirmar_sugerencia',
          enlace_id: enlaceId,
          usuario_id: '9d32f558-ffdf-49a4-b0c9-67025d44f9f2', // Tu usuario
          observaciones: 'Confirmado desde dashboard'
        })
      })
      
      const resultado = await response.json()
      
      if (resultado.success) {
        showNotification('✅ Sugerencia confirmada exitosamente', 'success')
        // Recargar enlaces de la factura
        const facturaId = await obtenerFacturaIdDelEnlace(enlaceId)
        if (facturaId) {
          await actualizarEnlacesFactura(facturaId)
        }
      } else {
        showNotification('❌ Error confirmando sugerencia', 'error')
      }
      
    } catch (error) {
      console.error('❌ Error confirmando sugerencia:', error)
      showNotification('Error confirmando sugerencia', 'error')
    }
  }
  
  // Función para rechazar una sugerencia
  async function rechazarSugerencia(enlaceId) {
    const razon = prompt('¿Por qué rechazas esta sugerencia? (opcional)')
    
    try {
      const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/gestionar-sugerencias-cotejo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
        },
        body: JSON.stringify({
          accion: 'rechazar_sugerencia',
          enlace_id: enlaceId,
          usuario_id: '9d32f558-ffdf-49a4-b0c9-67025d44f9f2', // Tu usuario
          razon_rechazo: razon || 'Rechazo por usuario',
          observaciones: 'Rechazado desde dashboard'
        })
      })
      
      const resultado = await response.json()
      
      if (resultado.success) {
        showNotification('❌ Sugerencia rechazada exitosamente', 'info')
        // Recargar enlaces de la factura
        const facturaId = await obtenerFacturaIdDelEnlace(enlaceId)
        if (facturaId) {
          await actualizarEnlacesFactura(facturaId)
        }
      } else {
        showNotification('❌ Error rechazando sugerencia', 'error')
      }
      
    } catch (error) {
      console.error('❌ Error rechazando sugerencia:', error)
      showNotification('Error rechazando sugerencia', 'error')
    }
  }
  
  // Función auxiliar para obtener factura_id de un enlace
  async function obtenerFacturaIdDelEnlace(enlaceId) {
    try {
      const { data: enlace, error } = await supabaseClient
        .from('facturas_albaranes_enlaces')
        .select('factura_id')
        .eq('id', enlaceId)
        .single()
      
      if (error || !enlace) return null
      return enlace.factura_id
      
    } catch (error) {
      console.error('❌ Error obteniendo factura_id:', error)
      return null
    }
  }
  
  // Función para marcar factura como directa
  async function marcarFacturaDirecta(facturaId) {
    try {
      const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/gestionar-sugerencias-cotejo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
        },
        body: JSON.stringify({
          accion: 'marcar_factura_directa',
          factura_id: facturaId,
          usuario_id: '9d32f558-ffdf-49a4-b0c9-67025d44f9f2', // Tu usuario
          observaciones: 'Marcada como factura directa desde dashboard'
        })
      })
      
      const resultado = await response.json()
      
      if (resultado.success) {
        showNotification('📄 Factura marcada como directa', 'success')
        // Recargar enlaces de la factura
        await actualizarEnlacesFactura(facturaId)
      } else {
        showNotification('❌ Error marcando factura directa', 'error')
      }
      
    } catch (error) {
      console.error('❌ Error marcando factura directa:', error)
      showNotification('Error marcando factura directa', 'error')
    }
  }

// ===== SISTEMA DE NOTIFICACIONES =====
async function handleEnableNotifications() {
    const notificationBtn = document.getElementById('enableNotificationsBtn');
    
    try {
        // Verificar si el navegador soporta notificaciones push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            showNotification('❌ Tu navegador no soporta notificaciones push', 'error');
            return;
        }

        // Verificar si ya están habilitadas
        if (Notification.permission === 'granted') {
            showNotification('✅ Las notificaciones ya están habilitadas', 'info');
            updateNotificationButtonState(true);
            return;
        }

        // Registrar Service Worker primero
        const registration = await registerServiceWorker();
        if (!registration) {
            throw new Error('No se pudo registrar el Service Worker');
        }

        // Solicitar permiso y crear suscripción
        await askForNotificationPermission();
        
        // Actualizar estado del botón
        updateNotificationButtonState(true);
        
        // Guardar estado en localStorage
        localStorage.setItem('notifications-enabled', 'true');
        
        // Enviar notificación de prueba
        sendTestNotification();
        
    } catch (error) {
        console.error('Error al habilitar notificaciones:', error);
        
        if (error.message === 'Permiso denegado') {
            showNotification('❌ Permiso de notificaciones denegado', 'error');
            updateNotificationButtonState(false);
            localStorage.setItem('notifications-enabled', 'false');
        } else {
            showNotification('❌ Error al habilitar notificaciones: ' + error.message, 'error');
        }
    }
}

function updateNotificationButtonState(enabled) {
    const notificationBtn = document.getElementById('enableNotificationsBtn');
    const testButtons = document.querySelector('.notification-test-buttons');
    
    if (notificationBtn) {
        if (enabled) {
            notificationBtn.classList.add('notifications-enabled');
            notificationBtn.title = 'Notificaciones habilitadas';
            
            // Mostrar botones de prueba
            if (testButtons) {
                testButtons.classList.add('show');
            }
        } else {
            notificationBtn.classList.remove('notifications-enabled');
            notificationBtn.title = 'Activar notificaciones';
            
            // Ocultar botones de prueba
            if (testButtons) {
                testButtons.classList.remove('show');
            }
        }
    }
}

function sendTestNotification() {
    if (Notification.permission === 'granted') {
        new Notification('FacturasIA - Notificaciones', {
            body: '¡Las notificaciones están funcionando correctamente!',
            icon: '/favicon.ico', // Puedes cambiar por tu icono
            badge: '/favicon.ico',
            tag: 'test-notification'
        });
    }
}

// Función para enviar notificaciones personalizadas
function sendCustomNotification(title, body, options = {}) {
    if (Notification.permission === 'granted') {
        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'facturas-notification',
            requireInteraction: false,
            ...options
        };
        
        new Notification(title, defaultOptions);
    }
}

// Función para enviar notificación push al servidor (para otros usuarios)
async function sendPushNotificationToUser(userId, title, body, options = {}) {
    try {
        if (!supabaseClient) {
            throw new Error('Cliente Supabase no disponible');
        }

        const { data, error } = await supabaseClient.functions.invoke('send-push-notification', {
            body: {
                user_id: userId,
                title: title,
                body: body,
                options: options
            }
        });

        if (error) {
            throw error;
        }

        console.log('✅ Notificación push enviada al servidor:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Error enviando notificación push:', error);
        throw error;
    }
}

// Función para enviar notificación push a todos los usuarios de un restaurante
async function sendPushNotificationToRestaurant(restauranteId, title, body, options = {}) {
    try {
        if (!supabaseClient) {
            throw new Error('Cliente Supabase no disponible');
        }

        const { data, error } = await supabaseClient.functions.invoke('send-push-notification', {
            body: {
                restaurante_id: restauranteId,
                title: title,
                body: body,
                options: options
            }
        });

        if (error) {
            throw error;
        }

        console.log('✅ Notificación push enviada al restaurante:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Error enviando notificación push:', error);
        throw error;
    }
}

// Función para obtener suscripciones existentes del usuario
async function getUserSubscriptions() {
    try {
        if (!currentUser || !CONFIG.TENANT.RESTAURANTE_ID) {
            return [];
        }

        const { data, error } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID);

        if (error) {
            console.error('❌ Error obteniendo suscripciones:', error);
            return [];
        }

        return data || [];
        
    } catch (error) {
        console.error('❌ Error obteniendo suscripciones:', error);
        return [];
    }
}

// Función para eliminar suscripción
async function removeSubscription(subscriptionId) {
    try {
        const { error } = await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('id', subscriptionId);

        if (error) {
            throw error;
        }

        console.log('✅ Suscripción eliminada:', subscriptionId);
        showNotification('Suscripción eliminada correctamente', 'success');
        
        // Actualizar estado del botón
        updateNotificationButtonState(false);
        localStorage.removeItem('notifications-enabled');
        
    } catch (error) {
        console.error('❌ Error eliminando suscripción:', error);
        showNotification('Error al eliminar suscripción', 'error');
    }
}

// Función para desactivar todas las notificaciones
async function disableAllNotifications() {
    try {
        // Obtener suscripciones del usuario
        const subscriptions = await getUserSubscriptions();
        
        // Eliminar suscripciones de la base de datos
        for (const subscription of subscriptions) {
            await removeSubscription(subscription.id);
        }
        
        // Desuscribir del Service Worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                    console.log('✅ Usuario desuscrito del Service Worker');
                }
            }
        }
        
        showNotification('Notificaciones desactivadas correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error desactivando notificaciones:', error);
        showNotification('Error al desactivar notificaciones', 'error');
    }
}

// Verificar si hay una nueva versión del Service Worker
function checkForServiceWorkerUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
            .then((registration) => {
                if (registration) {
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 Nueva versión del Service Worker disponible');
                        
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Mostrar notificación de actualización
                                if (Notification.permission === 'granted') {
                                    sendCustomNotification(
                                        'Actualización Disponible 🔄',
                                        'Hay una nueva versión del dashboard disponible. Recarga la página para actualizar.',
                                        { requireInteraction: true }
                                    );
                                }
                                
                                // Opcional: Mostrar banner de actualización en la UI
                                showUpdateBanner();
                            }
                        });
                    });
                }
            });
    }
}

// Mostrar banner de actualización
function showUpdateBanner() {
    // Crear banner de actualización
    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #00D4AA, #14B8A6);
            color: white;
            padding: 12px 20px;
            text-align: center;
            z-index: 9999;
            font-family: var(--bs-font-family);
            font-weight: 600;
            box-shadow: 0 4px 20px rgba(0, 212, 170, 0.3);
        ">
            🔄 Nueva versión disponible
            <button onclick="updateServiceWorker()" style="
                background: white;
                color: #00D4AA;
                border: none;
                padding: 6px 16px;
                border-radius: 20px;
                margin-left: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Actualizar Ahora
            </button>
        </div>
    `;
    
    document.body.appendChild(banner);
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
        if (banner.parentNode) {
            banner.parentNode.removeChild(banner);
        }
    }, 10000);
}

// Función para actualizar el Service Worker
function updateServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
            .then((registration) => {
                if (registration && registration.waiting) {
                    // Enviar mensaje al Service Worker para activar la nueva versión
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    
                    // Recargar la página después de un breve delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            });
    }
}

// Verificar estado de notificaciones al cargar
async function checkNotificationStatus() {
    try {
        const notificationsEnabled = localStorage.getItem('notifications-enabled') === 'true';
        const permission = Notification.permission;
        
        // Verificar si hay soporte para notificaciones push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            updateNotificationButtonState(false);
            const btn = document.getElementById('enableNotificationsBtn');
            if (btn) btn.style.display = 'none';
            return;
        }
        
        // Verificar si el Service Worker está registrado
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                console.log('✅ Service Worker ya registrado:', registration);
            }
        }
        
        if (permission === 'granted' || (permission === 'default' && notificationsEnabled)) {
            updateNotificationButtonState(true);
        } else {
            updateNotificationButtonState(false);
        }
        
    } catch (error) {
        console.error('Error verificando estado de notificaciones:', error);
        updateNotificationButtonState(false);
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Iniciando Dashboard de Facturas...');
    await initializeDashboard();
});

// ===== INICIALIZAR DASHBOARD =====
async function initializeDashboard() {
    try {
        // Inicializar tema
        initializeTheme();
        
        // Verificar estado de notificaciones
        await checkNotificationStatus();
        
        // Registrar Service Worker para notificaciones push
        await registerServiceWorker();
        
        // Verificar actualizaciones del Service Worker
        checkForServiceWorkerUpdate();
        
        // Verificar que existe config.js
        if (!window.CONFIG) {
            throw new Error('Archivo config.js no encontrado');
        }

        // Inicializar Supabase
        supabaseClient = supabase.createClient(
            CONFIG.SUPABASE.URL,
            CONFIG.SUPABASE.ANON_KEY
        );

        console.log('Supabase inicializado correctamente');

        // Verificar autenticación
        await checkAuthentication();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar datos iniciales
        await loadInitialData();

        // ✅ INICIALIZAR MODAL HÍBRIDO DE PDF CON ROBUSTEZ
        console.log('🔍 Inicializando Modal Híbrido de PDF...');
        await initializeHybridPDFModal();
        


        console.log('Dashboard inicializado correctamente');

    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        
        if (error?.message && error.message.includes('Configuración')) {
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
        }
    }
}

// ===== FUNCIÓN PARA INICIALIZAR MODAL HÍBRIDO DE PDF =====
async function initializeHybridPDFModal() {
    return new Promise((resolve) => {
        const maxAttempts = 5;
        let attempts = 0;
        
        function attemptInitialization() {
            attempts++;
            console.log(`🔄 Intento ${attempts}/${maxAttempts} de inicialización del Modal Híbrido...`);
            
            // Verificar si el modal híbrido ya está disponible
            if (window.hybridPDFModal && typeof window.hybridPDFModal.open === 'function') {
                console.log('✅ Modal Híbrido ya inicializado correctamente');
                resolve(true);
                return;
            }
            
            // Verificar si la función de inicialización está disponible
            if (typeof window.initializeHybridModal === 'function') {
                console.log('🔧 Usando función de inicialización del Modal Híbrido...');
                const success = window.initializeHybridModal();
                if (success) {
                    console.log('✅ Modal Híbrido inicializado exitosamente');
                    resolve(true);
                    return;
                } else {
                    console.warn(`⚠️ Intento ${attempts} falló`);
                }
            } else if (window.HybridPDFModal && typeof window.HybridPDFModal === 'function') {
                try {
                    console.log('🔧 Creando instancia directa del Modal Híbrido...');
                    window.hybridPDFModal = new window.HybridPDFModal();
                    console.log('✅ Modal Híbrido inicializado directamente');
                    resolve(true);
                    return;
                } catch (error) {
                    console.error(`❌ Error creando instancia directa (intento ${attempts}):`, error);
                }
            } else {
                console.warn(`⚠️ Clase HybridPDFModal no disponible (intento ${attempts})`);
            }
            
            // Reintentar si no hemos alcanzado el máximo
            if (attempts < maxAttempts) {
                console.log(`🔄 Reintentando en 500ms... (intento ${attempts + 1}/${maxAttempts})`);
                setTimeout(attemptInitialization, 500);
            } else {
                console.error('❌ Modal Híbrido no pudo inicializarse después de varios intentos');
                console.log('🔍 Estado final:');
                console.log('- window.HybridPDFModal:', typeof window.HybridPDFModal);
                console.log('- window.hybridPDFModal:', typeof window.hybridPDFModal);
                console.log('- window.initializeHybridModal:', typeof window.initializeHybridModal);
                resolve(false);
            }
        }
        
        // Comenzar intentos
        attemptInitialization();
    });
}

// ===== VERIFICAR AUTENTICACIÓN =====
async function checkAuthentication() {
    try {
        // 🚫 MODO DESARROLLO: Saltarse autenticación en localhost para debugging
        if (window.location.hostname === 'localhost' && CONFIG.TENANT?.MODO === 'desarrollo') {
            console.log('🔧 MODO DESARROLLO: Saltando verificación de autenticación');
            // Configurar usuario y restaurante de prueba
            currentUser = { id: 'dev-user', nombre: 'Usuario Desarrollo', email: 'dev@test.com' };
            CONFIG.TENANT.RESTAURANTE_ID = '2852b1af-38d8-43ec-8872-2b2921d5a231'; // ID hardcodeado para desarrollo
            CONFIG.TENANT.RESTAURANTE_ACTUAL = { id: CONFIG.TENANT.RESTAURANTE_ID, nombre: 'Restaurante Desarrollo' };
            updateUserInfo();
            return;
        }
        
        // Verificar que tenemos la configuración necesaria
        if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
            throw new Error('Configuración de Supabase incompleta');
        }

        // Verificar sesión de Supabase
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            throw new Error('Error verificando sesión: ' + sessionError.message);
        }
        
        if (!session) {
            console.log('Redirigiendo a login: no hay sesión activa');
            window.location.href = '../login.html';
            return;
        }

        // Obtener datos del usuario del localStorage
        const userInfo = localStorage.getItem('user_info');
        const restauranteInfo = localStorage.getItem('restaurante_actual');
        
        if (!userInfo || !restauranteInfo) {
            console.log('Redirigiendo a login: datos de usuario no encontrados');
            // Limpiar sesión de Supabase si no hay datos locales
            await supabaseClient.auth.signOut();
            window.location.href = '../login.html';
            return;
        }

        currentUser = JSON.parse(userInfo);
        const restauranteData = JSON.parse(restauranteInfo);
        
        // Verificar que los datos son válidos
        if (!currentUser.id || !restauranteData.id) {
            console.error('Datos de usuario o restaurante inválidos');
            localStorage.removeItem('user_info');
            localStorage.removeItem('restaurante_actual');
            await supabaseClient.auth.signOut();
            window.location.href = '../login.html';
            return;
        }
        
        CONFIG.TENANT.RESTAURANTE_ID = restauranteData.id;
        CONFIG.TENANT.RESTAURANTE_ACTUAL = restauranteData;

        console.log('Usuario autenticado:', currentUser.nombre);
        console.log('Restaurante:', restauranteData.nombre);
        console.log('Restaurante ID:', restauranteData.id);
        
        updateUserInfo();

    } catch (error) {
        console.error('Error verificando autenticación:', error);
        // Limpiar datos locales y redirigir al login
        localStorage.removeItem('user_info');
        localStorage.removeItem('restaurante_actual');
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        window.location.href = '../login.html';
    }
}

// ===== CARGAR DATOS INICIALES =====
async function loadInitialData() {
    try {
        console.log('Cargando datos iniciales...');
        
        // Cargar datos reales de Supabase
        await loadRealDataFromSupabase();
        
        // Enviar notificación de bienvenida si están habilitadas
        if (Notification.permission === 'granted') {
            setTimeout(() => {
                sendCustomNotification(
                    'FacturasIA - Dashboard Cargado',
                    'Tu dashboard está listo para gestionar facturas',
                    { requireInteraction: false }
                );
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        // NO más mock data - solo datos reales
        showNotification('Error cargando datos: ' + error.message, 'error');
    }
}

// ===== ACTUALIZAR INFO DEL USUARIO =====
function updateUserInfo() {
    const restauranteInfo = document.getElementById('restauranteInfo');
    if (restauranteInfo && CONFIG.TENANT.RESTAURANTE_ACTUAL) {
        restauranteInfo.textContent = `${CONFIG.TENANT.RESTAURANTE_ACTUAL.nombre} - ${currentUser.nombre}`;
    }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupEventListeners() {
    // Upload zone
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    let fileDialogOpen = false; // evitar doble apertura

    // Click en zona de upload
    if (uploadZone) {
        uploadZone.addEventListener('click', (e) => {
            // Evitar propagación desde el botón interno
            if (e.target && (e.target.id === 'selectFileBtn' || e.target.closest('#selectFileBtn'))) return;
            if (!processingState && !fileDialogOpen) {
                fileDialogOpen = true;
                fileInput.click();
            }
        });
    }

    // Click en botón de selección
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!processingState && !fileDialogOpen) {
                fileDialogOpen = true;
                fileInput.click();
            }
        });
    }

    // Drag & Drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => { e.stopPropagation(); handleDragOver(e); });
        uploadZone.addEventListener('drop', (e) => { e.stopPropagation(); handleDrop(e); });
        uploadZone.addEventListener('dragleave', (e) => { e.stopPropagation(); handleDragLeave(e); });
    }

    // Input de archivo
    if (fileInput) {
        fileInput.addEventListener('change', (e) => { fileDialogOpen = false; handleFileSelect(e); });
    }

    // Botones de filtros
    const filterBtn = document.getElementById('aplicarFiltros');
    const clearBtn = document.getElementById('limpiarFiltros');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', applyFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }

    // Botones de tabla
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Botón de notificaciones
    const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
    if (enableNotificationsBtn) {
        enableNotificationsBtn.addEventListener('click', handleEnableNotifications);
        
        // Clique derecho para desactivar notificaciones
        enableNotificationsBtn.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            if (Notification.permission === 'granted') {
                const confirmar = confirm('¿Deseas desactivar todas las notificaciones?');
                if (confirmar) {
                    await disableAllNotifications();
                }
            } else {
                showNotification('Las notificaciones no están habilitadas', 'info');
            }
        });
        
        // Tooltip para clic derecho
        enableNotificationsBtn.title = 'Clic izquierdo: Activar notificaciones | Clic derecho: Desactivar notificaciones';
    }
    
    // Escuchar mensajes del Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('💬 Mensaje del Service Worker:', event.data);
            
            if (event.data && event.data.type === 'refresh_data') {
                // Recargar datos del dashboard
                refreshData();
            }
        });
    }

    // Botón de upload
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (!processingState) {
                fileInput.click();
            }
        });
    }

    // Botón de prueba de Storage
    const testStorageBtn = document.getElementById('testStorageBtn');
    if (testStorageBtn) {
        testStorageBtn.addEventListener('click', async () => {
            try {
                testStorageBtn.disabled = true;
                testStorageBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                    Probando...
                `;
                
                const result = await testSupabaseStorage();
                
                if (result) {
                    showNotification('✅ Conexión con Storage verificada', 'success');
                    testStorageBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Storage OK
                    `;
                    testStorageBtn.style.background = '#16a34a';
                } else {
                    showNotification('❌ Error en la conexión con Storage', 'error');
                    testStorageBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Error Storage
                    `;
                    testStorageBtn.style.background = '#dc2626';
                }
                
                // Restaurar botón después de 3 segundos
                setTimeout(() => {
                    testStorageBtn.disabled = false;
                    testStorageBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Probar Storage
                    `;
                    testStorageBtn.style.background = '';
                }, 3000);
                
            } catch (error) {
                console.error('Error en prueba de Storage:', error);
                showNotification('❌ Error en la prueba', 'error');
                testStorageBtn.disabled = false;
                testStorageBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Probar Storage
                `;
                testStorageBtn.style.background = '';
            }
        });
    }

    // Modal de factura
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeFacturaModal);
    }

    // Cerrar modal al hacer clic fuera
    const facturaModal = document.getElementById('facturaModal');
    if (facturaModal) {
        facturaModal.addEventListener('click', (e) => {
            if (e.target === facturaModal) {
                closeFacturaModal();
            }
        });
    }

            // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFacturaModal();
            }
        });
        
        // Controles del PDF (placeholder para la siguiente fase)
        setupPdfControls();
        
        // Botón de prueba del agente
        const testAgenteBtn = document.getElementById('testAgenteBtn');
        if (testAgenteBtn) {
            testAgenteBtn.addEventListener('click', testAgente);
        }
}

// ===== SISTEMA DE NOTIFICACIONES PUSH =====

// Función para registrar el Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registrado con éxito:', registration);
            return registration;
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
        }
    } else {
        console.warn('⚠️ Notificaciones Push no soportadas en este navegador.');
        // Opcional: Ocultar el botón si no hay soporte
        const btn = document.getElementById('enableNotificationsBtn');
        if (btn) btn.style.display = 'none';
    }
}

// Función para pedir permiso y suscribir al usuario
async function askForNotificationPermission() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        showNotification('Permiso de notificaciones denegado', 'warning');
        throw new Error('Permiso denegado');
    }
    
    console.log('✅ Permiso de notificaciones concedido');
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: CONFIG.VAPID.PUBLIC_KEY // ¡IMPORTANTE! Necesitas estas claves
    });

    console.log('✅ Suscripción Push creada:', subscription);
    
    await saveSubscriptionToSupabase(subscription);
}

// Función para guardar la suscripción en tu tabla de Supabase
async function saveSubscriptionToSupabase(subscription) {
    if (!currentUser || !CONFIG.TENANT.RESTAURANTE_ID) {
        throw new Error('Usuario o restaurante no identificado');
    }

    const { error } = await supabaseClient
        .from('push_subscriptions')
        .insert({
            user_id: currentUser.id,
            restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
            subscription_data: subscription
        });

    if (error) {
        console.error('❌ Error guardando suscripción:', error);
        showNotification('Error al guardar la suscripción', 'error');
    } else {
        console.log('✅ Suscripción guardada en Supabase');
        showNotification('¡Notificaciones activadas!', 'success');
    }
}

// ===== MANEJO DE ARCHIVOS =====
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFiles([file]);
    }
}

// ===== FUNCIÓN PRINCIPAL DE MANEJO DE ARCHIVOS =====
async function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    try {
        // Validaciones
        if (!validateFile(file)) {
            return;
        }

        currentFile = file;
        
        // Mostrar estado de carga
        showUploadStatus('Subiendo archivo...', 'uploading');
        
        // Iniciar procesamiento
        await processDocument(file);

    } catch (error) {
        console.error('Error procesando archivo:', error);
        showUploadStatus('Error: ' + error.message, 'error');
        setTimeout(() => {
            hideUploadStatus();
        }, 5000);
    }
}

// ===== VALIDAR ARCHIVO =====
function validateFile(file) {
    // Verificar tipo
            if (!CONFIG?.APP?.ALLOWED_TYPES || !CONFIG.APP.ALLOWED_TYPES.includes(file.type)) {
        showUploadStatus('Solo se permiten archivos PDF', 'error');
        return false;
    }

    // Verificar tamaño
    if (file.size > CONFIG.APP.MAX_FILE_SIZE) {
        showUploadStatus('El archivo es demasiado grande. Máximo 10MB', 'error');
        return false;
    }

    return true;
}

// ===== PROCESAR DOCUMENTO =====
async function processDocument(file) {
    try {
        processingState = true;
        showUploadStatus('Subiendo archivo...', 'uploading');
        updateFileInfo(file.name, file.size);

        // 1. Subir archivo a Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${CONFIG.TENANT.RESTAURANTE_ID}/${fileName}`;

        showUploadStatus('Subiendo archivo a storage...', 'uploading');
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from(CONFIG.SUPABASE.STORAGE_BUCKET)
            .upload(filePath, file);

        if (uploadError) {
            throw new Error(`Error subiendo archivo: ${uploadError.message}`);
        }

        showUploadStatus('Archivo subido, iniciando procesamiento...', 'processing');

        // 2. Crear registro en tabla documentos
        const documentId = crypto.randomUUID();
        
        const { data: docData, error: docError } = await supabaseClient
            .from('documentos')
            .insert({
                id: documentId,
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
                nombre_archivo: file.name,
                tipo_archivo: 'factura',
                url_storage: filePath,
                tamaño_bytes: file.size,
                numero_paginas: 1,
                estado: 'uploaded',
                confianza_clasificacion: 0.5,
                calidad_estimada: 'media',
                checksum_archivo: await calculateFileHash(file),
                usuario_subida: currentUser?.id
            })
            .select()
            .single();

        if (docError) {
            throw new Error(`Error creando registro: ${docError.message}`);
        }

        showUploadStatus('Procesando con IA...', 'processing');

        // 3. Llamar a la Edge Function process-invoice con timeout
        console.log('🚀 Invocando Edge Function process-invoice...')
        
        const { data: processData, error: processError } = await Promise.race([
            supabaseClient.functions.invoke('process-invoice', {
                body: {
                    record: {
                        name: documentId,
                        bucket_id: CONFIG.SUPABASE.STORAGE_BUCKET
                    }
                }
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: La función tardó más de 2 minutos')), 120000)
            )
        ]);

        if (processError) {
            console.error('❌ Error de Supabase:', processError)
            throw new Error(`Error en procesamiento: ${processError.message}`);
        }

        console.log('✅ Respuesta exitosa de Edge Function:', processData)
        showUploadStatus('¡Archivo procesado exitosamente!', 'success');
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Factura Procesada ✅',
                `La factura "${file.name}" se ha procesado correctamente`,
                { requireInteraction: true }
            );
        }
        
        // Recargar datos del dashboard
        setTimeout(async () => {
            await loadRealDataFromSupabase();
            hideUploadStatus();
        }, 2000);

    } catch (error) {
        console.error('Error en procesamiento:', error);
        showUploadStatus('Error: ' + error.message, 'error');
        
        // Enviar notificación push de error si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Error en Procesamiento ❌',
                `Error al procesar "${file.name}": ${error.message}`,
                { requireInteraction: true }
            );
        }
        
        setTimeout(() => {
            hideUploadStatus();
        }, 5000);
    } finally {
        processingState = false;
    }
}

// Función para calcular hash del archivo
async function calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function updateFileInfo(fileName, fileSize) {
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.textContent = `${fileName} (${formatBytes(fileSize)})`;
        fileInfo.style.color = '#166534';
        fileInfo.style.fontWeight = '600';
        fileInfo.classList.add('has-file');
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function showUploadStatus(text, statusType = 'info') {
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadText = document.getElementById('uploadText');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const statusIcon = document.getElementById('statusIcon');
    
    if (uploadStatus && uploadText && progressFill && progressText && statusIcon) {
        uploadStatus.style.display = 'block';
        uploadText.textContent = text;
        
        // Cambiar el icono según el estado
        if (statusType === 'uploading') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V7L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (statusType === 'processing') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (statusType === 'success') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else if (statusType === 'error') {
            statusIcon.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            statusIcon.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        }
        
        // Animar la entrada
        uploadStatus.style.animation = 'none';
        uploadStatus.offsetHeight; // Trigger reflow
        uploadStatus.style.animation = 'slideInUp 0.4s ease';
    }
}

function hideUploadStatus() {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
        uploadStatus.style.display = 'none';
        // Resetear información del archivo
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) {
            fileInfo.textContent = 'No hay archivo seleccionado';
            fileInfo.style.color = '#6b7280';
            fileInfo.style.fontWeight = '500';
            fileInfo.classList.remove('has-file');
        }
    }
}

// ===== FUNCIÓN DEBOUCE =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== FUNCIONES DE LOADING GLOBAL =====
function showGlobalLoading(text = 'Cargando...') {
    const loadingOverlay = document.getElementById('globalLoading');
    const loadingText = document.getElementById('globalLoadingText');
    
    if (loadingOverlay && loadingText) {
        loadingText.textContent = text;
        loadingOverlay.style.display = 'flex';
    }
}

function hideGlobalLoading() {
    const loadingOverlay = document.getElementById('globalLoading');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// ===== FUNCIONES DE UTILIDAD =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
    `;
    
    // Aplicar estilos según el tipo
    switch (type) {
        case 'info':
            notification.style.background = '#3498db';
            break;
        case 'success':
            notification.style.background = '#27ae60';
            break;
        case 'warning':
            notification.style.background = '#f39c12';
            break;
        case 'error':
            notification.style.background = '#e74c3c';
            break;
        default:
            notification.style.background = '#3498db';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('es-ES');
    } catch (error) {
        return dateString;
    }
}

async function calculateFileHash(file) {
    // Función simple para generar hash del archivo
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== FUNCIONES DE FILTROS =====
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    const estado = document.getElementById('estadoFilter')?.value || '';
    const confianza = document.getElementById('confianzaFilter')?.value || '';
    const fechaDesde = document.getElementById('fechaDesde')?.value || '';
    const fechaHasta = document.getElementById('fechaHasta')?.value || '';

    // Aplicar filtros a los datos
    let filteredData = (window.facturasData || []).filter(factura => {
        let matches = true;

        // Filtro de búsqueda
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            matches = matches && (
                (factura.proveedor_nombre && factura.proveedor_nombre.toLowerCase().includes(searchLower)) ||
                (factura.numero_factura && factura.numero_factura.toLowerCase().includes(searchLower)) ||
                (factura.proveedor_cif && factura.proveedor_cif.toLowerCase().includes(searchLower))
            );
        }

        // Filtro de estado
        if (estado && factura.estado !== estado) {
            matches = false;
        }

        // Filtro de confianza
        if (confianza) {
            const confianzaValue = parseFloat(confianza);
            if (factura.confianza_global < confianzaValue) {
                matches = false;
            }
        }

        // Filtros de fecha
        if (fechaDesde) {
            const fechaFactura = new Date(factura.fecha_factura);
            const desde = new Date(fechaDesde);
            if (fechaFactura < desde) {
                matches = false;
            }
        }

        if (fechaHasta) {
            const fechaFactura = new Date(factura.fecha_factura);
            const hasta = new Date(fechaHasta);
            if (fechaFactura > hasta) {
                matches = false;
            }
        }

        return matches;
    });

    // Actualizar tabla con datos filtrados
    renderFacturasTable(filteredData);
    updatePagination(filteredData.length);
}

function clearFilters() {
    // Limpiar campos de filtro
    document.getElementById('searchInput').value = '';
    document.getElementById('estadoFilter').value = '';
    document.getElementById('confianzaFilter').value = '';
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';

    // Restaurar datos originales
    renderFacturasTable(window.facturasData || []);
    updatePagination((window.facturasData || []).length);
}

// ===== FUNCIONES DE TABLA =====
function renderFacturasTable(data = window.facturasData || []) {
    console.log('Renderizando tabla con', data.length, 'facturas');
    
    const tbody = document.querySelector('.facturas-table tbody');
    const tableEmpty = document.getElementById('tableEmpty');
    
    if (!tbody) {
        console.error('❌ No se encontró tbody de la tabla');
        return;
    }
    
    // Ocultar mensaje de tabla vacía
    if (tableEmpty) {
        tableEmpty.style.display = 'none';
    }
    
    if (data.length === 0) {
        console.log('No hay datos para mostrar');
        if (tableEmpty) {
            tableEmpty.style.display = 'block';
        }
        tbody.innerHTML = '';
        return;
    }

    // Calcular rango de paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const facturasPage = data.slice(startIndex, endIndex);
    
    console.log('🔍 ===== VERIFICANDO PAGINACIÓN =====');
    console.log('🔍 currentPage:', currentPage);
    console.log('🔍 itemsPerPage:', itemsPerPage);
    console.log('🔍 startIndex:', startIndex);
    console.log('🔍 endIndex:', endIndex);
    console.log('🔍 facturasPage.length:', facturasPage.length);
    console.log('🔍 Facturas a renderizar:', facturasPage);
    
    if (facturasPage.length === 0) {
        console.warn('⚠️ No hay facturas en esta página');
        alert('⚠️ No hay facturas en esta página');
        return;
    }
    
    console.log('✅ Facturas de página válidas, continuando...');
    
    // Ocultar loading cuando se complete el renderizado
    hideTableLoading();
    
    // ✅ DEBUG: Verificar datos antes de generar HTML
    console.log('🔍 ===== GENERANDO HTML DE LA TABLA =====');
    console.log('🔍 facturasPage.length:', facturasPage.length);
    console.log('🔍 Primera factura para renderizar:', facturasPage[0]);
    
    const htmlContent = facturasPage.map((factura, index) => `
        <tr data-factura-id="${factura.documento_id || factura.id}" data-documento-id="${factura.documento_id || factura.id}">
            <td class="expand-column">
                <button class="expand-btn" onclick="toggleProductsRow('${factura.documento_id || factura.id}', this)" title="Ver productos">
                    ➤
                </button>
            </td>
            <td>
                <span class="estado-badge ${getEstadoClass(factura.estado)}">
                    ${getEstadoLabel(factura.estado)}
                </span>
            </td>
            <td>${factura.numero_factura || 'N/A'}</td>
            <td>${factura.proveedor_nombre || 'N/A'}</td>
            <td>${formatDate(factura.fecha_factura)}</td>
            <td>${formatCurrency(factura.importe_neto || 0)}</td>
            <td>${formatCurrency(factura.iva || 0)}</td>
            <td class="total-factura">💰 ${formatCurrency(factura.total_factura || 0)}</td>
            <td>
                <div class="confidence-display">
                    <span class="confidence-value">${Math.round((factura.confianza_global || 0) * 100)}%</span>
                    <span class="confidence-badge ${getConfidenceClass(factura.confianza_global)}">
                        ${getConfidenceLabel(factura.confianza_global)}
                    </span>
                </div>
            </td>
            <td>
                <div class="proveedor-indicator ${factura.proveedor_nuevo ? 'proveedor-nuevo' : 'proveedor-existente'}">
                    ${factura.proveedor_nuevo ? 'Nuevo' : 'Existente'}
                </div>
            </td>
            <td>
                <div class="albaranes-column">
                    <div class="albaranes-status" id="albaranes-status-${factura.documento_id || factura.id}">
                        <span class="albaranes-count" id="albaranes-count-${factura.documento_id || factura.id}">0</span>
                        <button class="btn-albaranes" onclick="toggleAlbaranesRow('${factura.documento_id || factura.id}', this)" title="Ver albaranes enlazados">
                            🔗
                        </button>
                    </div>
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-cotejo" onclick="ejecutarCotejoParaFactura('${factura.id}')" title="Ejecutar cotejo automático para esta factura">
                        🔄 Cotejo
                    </button>
                    <button class="btn btn-avanzado" onclick="openInvoiceAdvanced('${factura.id}')" title="Ver factura con coordenadas y análisis">
                        🎓 Enseñale
                    </button>
                </div>
            </td>
        </tr>
        <tr class="products-row" id="products-row-${factura.documento_id || factura.id}" style="display: none;">
            <td colspan="12">
                <div class="products-container">
                    <div class="products-header">
                        <div class="products-title">
                            📦 Productos de la factura
                            <span class="products-count" id="products-count-${factura.documento_id || factura.id}">0</span>
                        </div>
                    </div>
                    <div class="products-grid" id="products-grid-${factura.documento_id || factura.id}">
                        <!-- Los productos se cargarán dinámicamente -->
                    </div>
                </div>
            </td>
        </tr>
        
        <!-- 🆕 FILA EXPANDIBLE PARA ALBARANES -->
        <tr class="albaranes-row" id="albaranes-row-${factura.documento_id || factura.id}" style="display: none;">
            <td colspan="12">
                <div class="albaranes-container">
                    <div class="albaranes-header">
                        <div class="albaranes-title">
                            🔗 Albaranes Enlazados
                            <span class="albaranes-count" id="albaranes-count-expanded-${factura.documento_id || factura.id}">0</span>
                        </div>
                        <div class="albaranes-actions">
                            <button class="btn-albaranes-action" onclick="ejecutarCotejoAutomatico('${factura.documento_id || factura.id}')" title="Ejecutar cotejo automático">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                </svg>
                                Cotejo Automático
                            </button>
                            <button class="btn-albaranes-action secondary" onclick="marcarFacturaDirecta('${factura.documento_id || factura.id}')" title="Marcar como factura directa">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 12l2 2 4-4"/>
                                </svg>
                                Factura Directa
                            </button>
                        </div>
                    </div>
                    <div class="albaranes-grid" id="albaranes-grid-${factura.documento_id || factura.id}">
                        <!-- Los albaranes se cargarán dinámicamente -->
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-info-circle"></i> Ejecuta el cotejo automático para buscar albaranes
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
    
    console.log('🔍 HTML generado (primeros 500 chars):', htmlContent.substring(0, 500));
    console.log('🔍 HTML generado (últimos 500 chars):', htmlContent.substring(htmlContent.length - 500));
    
    // ✅ DEBUG COMPLETO: Ver el HTML completo de una fila
    if (htmlContent.length > 0) {
        const firstRow = htmlContent.split('</tr>')[0] + '</tr>';
        console.log('🔍 PRIMERA FILA COMPLETA:', firstRow);
        
        // Verificar si contiene el botón avanzado
        if (firstRow && firstRow.includes('btn-advanced')) {
            console.log('✅ El botón avanzado SÍ está en el HTML generado');
        } else {
            console.log('❌ El botón avanzado NO está en el HTML generado');
            console.log('🔍 Buscando "btn-advanced" en:', firstRow);
        }
    }
    
    // ✅ APLICAR HTML A LA TABLA
    tbody.innerHTML = htmlContent;
    
    console.log('🔍 HTML aplicado a la tabla');
    console.log('🔍 ===== FIN GENERACIÓN HTML =====');
    
    // ✅ DEBUG: Verificar que los botones se crearon correctamente
    console.log('🔍 ===== VERIFICANDO BOTONES =====');
    const advancedButtons = document.querySelectorAll('.btn-advanced');
    console.log(`🔍 Botones "Avanzado" encontrados: ${advancedButtons.length}`);
    
    if (advancedButtons.length === 0) {
        console.warn('⚠️ PROBLEMA: No se encontraron botones "Avanzado"');
        console.warn('⚠️ Verificando HTML generado...');
        
        // Verificar el HTML de la tabla
        const tbody = document.querySelector('.facturas-table tbody');
        if (tbody) {
            console.log('🔍 HTML de la tabla generado:', tbody.innerHTML.substring(0, 500) + '...');
        }
    } else {
        advancedButtons.forEach((btn, index) => {
            console.log(`🔍 Botón ${index + 1}:`, btn.outerHTML);
        });
    }
    
    console.log('🔍 ===== FIN VERIFICACIÓN BOTONES =====');
}

function getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'alta';
    if (confidence >= 0.6) return 'media';
    return 'baja';
}

function getConfidenceLabel(confidence) {
    if (confidence >= 0.9) return 'Alta';
    if (confidence >= 0.7) return 'Media';
    return 'Baja';
}

// ===== FUNCIONES DE ESTADO =====
function getEstadoClass(estado) {
    switch (estado) {
        case 'processed': return 'procesado';
        case 'approved': return 'procesado';
        case 'pending': return 'pendiente';
        case 'error': return 'error';
        case 'uploaded': return 'pendiente';
        default: return 'pendiente';
    }
}

function getEstadoLabel(estado) {
    switch (estado) {
        case 'processed': return 'Procesado';
        case 'approved': return 'Aprobado';
        case 'pending': return 'Pendiente';
        case 'error': return 'Error';
        case 'uploaded': return 'Subido';
        default: return 'Desconocido';
    }
}

// ===== FUNCIONES DE ACCIÓN =====
// Funciones viewFactura y editFactura removidas - solo usamos Enseñale ahora

// ===== FUNCIÓN PARA ACTUALIZAR CABECERA DEL MODAL =====
function updateModalHeader(factura, mode = 'view') {
    console.log('🎨 Actualizando cabecera del modal con información específica...');
    console.log('📊 Datos de factura recibidos:', {
        proveedor: factura.proveedor_nombre,
        numero: factura.numero_factura,
        id: factura.id
    });
    
    // ✅ TÍTULO PRINCIPAL - FORMATO: [PROVEEDOR - NÚMERO FACTURA]
    const modalTitle = document.getElementById('modalTitle');
    console.log('🔍 Elemento modalTitle encontrado:', !!modalTitle);
    
    if (modalTitle) {
        const proveedor = factura.proveedor_nombre || 'Proveedor desconocido';
        const numeroFactura = factura.numero_factura || 'S/N';
        const tituloNuevo = `${proveedor} - ${numeroFactura}`;
        
        console.log('✅ Actualizando título a:', tituloNuevo);
        modalTitle.textContent = tituloNuevo;
        
        // Verificar que se aplicó correctamente
        console.log('✅ Título actual en DOM:', modalTitle.textContent);
    } else {
        console.error('❌ No se encontró el elemento modalTitle en el DOM');
    }
    
    // ✅ BUSCAR ELEMENTOS ALTERNATIVOS (por si existen)
    const modalFacturaTitle = document.getElementById('modalFacturaTitle');
    if (modalFacturaTitle) {
        const proveedor = factura.proveedor_nombre || 'Proveedor desconocido';
        const numeroFactura = factura.numero_factura || 'S/N';
        modalFacturaTitle.textContent = `${proveedor} - ${numeroFactura}`;
    }
    
    // ✅ SUBTÍTULO CON INFORMACIÓN ADICIONAL
    const proveedorInfo = document.getElementById('modalProveedorInfo');
    if (proveedorInfo) {
        const fecha = factura.fecha_factura ? formatDate(factura.fecha_factura) : 'Fecha no disponible';
        const total = factura.total_factura ? `${factura.total_factura.toFixed(2)}€` : 'Total no disponible';
        proveedorInfo.textContent = `${fecha} • ${total}`;
    }
    
    // ✅ BADGE DE CONFIANZA
    const confidenceBadge = document.getElementById('modalConfidenceBadge');
    const confidenceText = document.getElementById('modalConfidenceText');
    if (confidenceBadge && confidenceText) {
        const confianza = factura.confianza_global || 0.5;
        const porcentaje = Math.round(confianza * 100);
        confidenceText.textContent = `${porcentaje}%`;
        
        // Actualizar color del badge según confianza
        confidenceBadge.className = 'confidence-badge';
        if (confianza >= 0.8) {
            confidenceBadge.style.background = 'linear-gradient(135deg, #10B981, #34D399)';
        } else if (confianza >= 0.6) {
            confidenceBadge.style.background = 'linear-gradient(135deg, #F59E0B, #FBBF24)';
        } else {
            confidenceBadge.style.background = 'linear-gradient(135deg, #EF4444, #F87171)';
        }
    }
    
    // ✅ BADGE DE ESTADO
    const statusBadge = document.getElementById('modalStatusBadge');
    if (statusBadge) {
        const estado = factura.estado || 'processed';
        const estadoInfo = getEstadoInfo(estado);
        
        statusBadge.className = `status-badge ${estadoInfo.class}`;
        statusBadge.innerHTML = `
            <i class="${estadoInfo.icon}"></i>
            ${estadoInfo.label}
        `;
    }
    
    console.log('✅ Cabecera del modal actualizada correctamente');
}

function getEstadoInfo(estado) {
    switch (estado) {
        case 'processed':
        case 'approved':
            return { class: 'procesado', icon: 'fas fa-check-circle', label: 'Procesado' };
        case 'pending':
        case 'uploaded':
            return { class: 'pendiente', icon: 'fas fa-clock', label: 'Pendiente' };
        case 'error':
            return { class: 'error', icon: 'fas fa-exclamation-triangle', label: 'Error' };
        default:
            return { class: 'procesado', icon: 'fas fa-check-circle', label: 'Procesado' };
    }
}

// ===== FUNCIÓN PARA APLICAR COLORES DE CONFIANZA =====
function aplicarColoresConfianza(factura) {
    console.log('🎨 Aplicando colores de confianza por campo...');
    console.log('📊 Datos de confianza:', {
        confianza_proveedor: factura.confianza_proveedor,
        confianza_datos_fiscales: factura.confianza_datos_fiscales,
        confianza_importes: factura.confianza_importes
    });

    // ✅ FUNCIÓN AUXILIAR PARA DETERMINAR CLASE DE CONFIANZA
    function getConfianzaClass(confianza) {
        if (confianza >= 0.8) return 'campo-confianza-alta';
        if (confianza >= 0.6) return 'campo-confianza-media';
        return 'campo-confianza-baja';
    }

    // ✅ FUNCIÓN AUXILIAR PARA APLICAR ESTILO A UN CONTENEDOR
    function aplicarEstiloConfianza(elementId, confianza, label = '') {
        const element = document.getElementById(elementId);
        if (element) {
            const container = element.closest('.form-group') || element.parentElement;
            if (container) {
                // Remover clases previas
                container.classList.remove('campo-confianza-alta', 'campo-confianza-media', 'campo-confianza-baja');
                // Aplicar nueva clase
                const claseConfianza = getConfianzaClass(confianza);
                container.classList.add(claseConfianza);
                
                // Agregar etiqueta de confianza si no existe
                const existingLabel = container.querySelector('.campo-confianza-label');
                if (!existingLabel && label) {
                    const confidenceLabel = document.createElement('span');
                    confidenceLabel.className = `campo-confianza-label ${claseConfianza.replace('campo-confianza-', '')}`;
                    confidenceLabel.textContent = `${Math.round(confianza * 100)}%`;
                    confidenceLabel.title = `Confianza de ${label}: ${Math.round(confianza * 100)}%`;
                    container.appendChild(confidenceLabel);
                }
                
                console.log(`✅ Aplicado ${claseConfianza} a ${elementId} (${Math.round(confianza * 100)}%)`);
            }
        }
    }

    // 🏢 APLICAR A CAMPOS DE PROVEEDOR
    const confianzaProveedor = factura.confianza_proveedor || 0.5;
    aplicarEstiloConfianza('proveedor', confianzaProveedor, 'proveedor');
    aplicarEstiloConfianza('cifProveedor', confianzaProveedor, 'CIF');

    // 📄 APLICAR A CAMPOS DE DATOS FISCALES  
    const confianzaDatosFiscales = factura.confianza_datos_fiscales || 0.5;
    aplicarEstiloConfianza('numeroFactura', confianzaDatosFiscales, 'número');
    aplicarEstiloConfianza('fechaFactura', confianzaDatosFiscales, 'fecha');

    // 💰 APLICAR A CAMPOS DE IMPORTES
    const confianzaImportes = factura.confianza_importes || 0.5;
    aplicarEstiloConfianza('baseImponible', confianzaImportes, 'base imponible');
    aplicarEstiloConfianza('ivaAmount', confianzaImportes, 'IVA');
    aplicarEstiloConfianza('totalConIva', confianzaImportes, 'total');

    console.log('🎨 Colores de confianza aplicados correctamente');
}

// ===== FUNCIONES DEL MODAL =====
async function openFacturaModal(facturaId, mode = 'view') {
    try {
        console.log('🔍 Buscando factura con ID:', facturaId);
        
        // 🚀 SOLUCIÓN: Obtener datos COMPLETOS desde la base de datos
        let factura = null;
        
        try {
            // 1. Intentar obtener datos completos desde datos_extraidos_facturas
            const { data: datosExtraidos, error: errorExtraidos } = await supabaseClient
                .from('datos_extraidos_facturas')
                .select('*')
                .eq('documento_id', facturaId)
                .single();
            
            if (datosExtraidos && !errorExtraidos) {
                console.log('✅ Datos extraídos encontrados:', datosExtraidos);
                factura = {
                    ...datosExtraidos,
                    id: facturaId, // Asegurar que tenga el ID correcto
                    // Mapear campos si es necesario
                    numero_factura: datosExtraidos.numero_factura,
                    proveedor_nombre: datosExtraidos.proveedor_nombre,
                    proveedor_cif: datosExtraidos.proveedor_cif,
                    base_imponible: datosExtraidos.base_imponible,
                    cuota_iva: datosExtraidos.cuota_iva, // ← ESTE ES EL CAMPO CLAVE
                    total_factura: datosExtraidos.total_factura,
                    estado: 'processed'
                };
            } else {
                console.log('⚠️ No se encontraron datos extraídos, usando datos del dashboard');
                // 2. Fallback a datos del dashboard
                factura = (window.facturasData || []).find(f => f.id === facturaId);
            }
        } catch (dbError) {
            console.log('⚠️ Error obteniendo datos extraídos, usando datos del dashboard:', dbError);
            // 3. Fallback a datos del dashboard
            factura = (window.facturasData || []).find(f => f.id === facturaId);
        }
        
        if (!factura) {
            console.error('❌ Factura no encontrada con ID:', facturaId);
            showNotification('Factura no encontrada', 'error');
            return;
        }
        
        console.log('✅ Factura preparada para modal:', factura);
        console.log('💰 IVA disponible:', factura.cuota_iva);

        // ✅ ACTUALIZAR CABECERA BRAIN STORMERS CON INFORMACIÓN ESPECÍFICA
        console.log('🔄 Llamando updateModalHeader con factura:', factura.proveedor_nombre, factura.numero_factura);
        updateModalHeader(factura, mode);

        // Cargar datos en el modal
        loadFacturaDataInModal(factura, mode);

        // Mostrar el modal
        const modal = document.getElementById('facturaModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevenir scroll
            
            // ✅ DAR UN MOMENTO AL DOM PARA RENDERIZAR Y LUEGO ACTUALIZAR TÍTULO
            setTimeout(() => {
                console.log('🔄 Actualizando título después de mostrar modal...');
                updateModalHeader(factura, mode);
            }, 100);
        }

        // Cargar el PDF de la factura
        console.log('🔄 Iniciando carga del PDF...');
        await loadPdfFromFacturaId(facturaId);

        // Cargar productos en el modal
        console.log('🛒 Cargando productos para el modal...');
        await loadProductsInModal(facturaId);

        // 🆕 CARGAR ENLACES DE ALBARANES AUTOMÁTICAMENTE
        console.log('🔗 Cargando enlaces de albaranes para el modal...');
        await actualizarEnlacesFactura(facturaId);

        console.log('Modal abierto para factura:', facturaId, 'Modo:', mode);
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Factura Abierta 📄',
                `Modal abierto para factura ${factura.numero_factura || facturaId}`,
                { requireInteraction: false }
            );
        }

    } catch (error) {
        console.error('Error abriendo modal:', error);
        showNotification('Error abriendo la factura', 'error');
        
        // Enviar notificación push de error si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Error Abriendo Factura ❌',
                `Error al abrir la factura: ${error.message}`,
                { requireInteraction: true }
            );
        }
    }
}

function loadFacturaDataInModal(factura, mode) {
    try {
        console.log('📝 Cargando datos en modal para factura:', factura.id);
        
        // 🆕 GUARDAR ID DE FACTURA ACTUAL
        window.currentFacturaId = factura.documento_id || factura.id;
        
        // Cargar datos básicos con colores de confianza
        document.getElementById('numeroFactura').value = factura.numero_factura || '';
        document.getElementById('proveedor').value = factura.proveedor_nombre || '';
        document.getElementById('cifProveedor').value = factura.proveedor_cif || '';
        document.getElementById('provinciaProveedor').value = factura.proveedor_provincia || '';
        document.getElementById('fechaFactura').value = factura.fecha_factura || '';
        document.getElementById('fechaVencimiento').value = factura.fecha_vencimiento || '';
        document.getElementById('concepto').value = factura.concepto || '';
        
        // ✅ APLICAR COLORES DE CONFIANZA A CAMPOS ESPECÍFICOS
        aplicarColoresConfianza(factura);
        
        // Actualizar estado de la factura
        const statusElement = document.getElementById('facturaStatus');
        if (statusElement) {
            statusElement.textContent = getEstadoLabel(factura.estado || 'processed');
            statusElement.className = `status-badge ${getEstadoClass(factura.estado || 'processed')}`;
        }

        // Cargar datos financieros
        document.getElementById('baseImponible').textContent = formatCurrency(factura.base_imponible || 0);
        document.getElementById('ivaAmount').textContent = formatCurrency(factura.cuota_iva || 0);
        document.getElementById('totalConIva').textContent = formatCurrency(factura.total_factura || 0);
        document.getElementById('retencion').textContent = formatCurrency(factura.retencion || 0);

        // 🆕 CARGAR PRODUCTOS AUTOMÁTICAMENTE
        loadProductosInModal(factura.productos || []);

        // Configurar modo de edición
        setModalEditMode(mode);

        console.log('✅ Datos cargados en modal:', factura);

    } catch (error) {
        console.error('❌ Error cargando datos en modal:', error);
        showNotification('Error cargando datos de la factura', 'error');
    }
}

async function loadProductosInModal(productos) {
    try {
        console.log('🛒 Cargando productos en modal:', productos);
        
        // Si no hay productos, cargar desde la base de datos
        if (!productos || productos.length === 0) {
            console.log('📊 No hay productos en factura, cargando desde BD...');
            await loadProductsInModalFromDB();
            return;
        }

        const productosTable = document.getElementById('productosTableBody');
        if (!productosTable) {
            console.error('❌ Tabla de productos no encontrada');
            return;
        }

        let totalSuma = 0;

        productosTable.innerHTML = productos.map(producto => {
            const total = (producto.precio || 0) * (producto.cantidad || 0);
            totalSuma += total;
            
            // 🎨 APLICAR COLORES DE CONFIANZA
            const confianza = producto.confianza_linea || 0.5;
            const confianzaClass = getConfidenceClass(confianza);
            const confianzaPercent = Math.round(confianza * 100);

            return `
                <tr class="producto-row ${confianzaClass}" data-confianza="${confianza}">
                    <td class="producto-ean">${producto.ean || 'N/A'}</td>
                    <td class="producto-descripcion">
                        <div class="producto-info">
                            <span class="producto-nombre">${producto.descripcion || 'N/A'}</span>
                            <span class="producto-confianza ${confianzaClass}">${confianzaPercent}%</span>
                        </div>
                    </td>
                    <td class="producto-unidad">${producto.unidad || 'N/A'}</td>
                    <td class="producto-cantidad">${producto.cantidad || 0}</td>
                    <td class="producto-precio">${formatCurrency(producto.precio || 0)}</td>
                    <td class="producto-descuento">${producto.descuento || '0%'}</td>
                    <td class="producto-total">${formatCurrency(total)}</td>
                    <td class="producto-acciones">
                        <button class="btn-edit-producto" onclick="editProducto('${producto.id || ''}')" title="Editar producto">
                            ✏️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Actualizar suma total
        const sumaTotalElement = document.getElementById('sumaTotal');
        if (sumaTotalElement) {
            sumaTotalElement.textContent = formatCurrency(totalSuma);
        }

        console.log('✅ Productos cargados en modal:', productos.length);

    } catch (error) {
        console.error('❌ Error cargando productos en modal:', error);
    }
}

// 🆕 FUNCIÓN PARA CARGAR PRODUCTOS DESDE LA BASE DE DATOS
async function loadProductsInModalFromDB() {
    try {
        console.log('🔄 Cargando productos desde BD...');
        
        // Obtener el documento_id de la factura actual
        const facturaId = window.currentFacturaId;
        if (!facturaId) {
            console.error('❌ No hay factura actual');
            return;
        }
        
        const { data: productos, error } = await supabaseClient
            .from('productos_extraidos')
            .select(`
                *,
                productos_maestro!fk_productos_extraidos_maestro (
                    nombre_normalizado,
                    categoria_principal,
                    precio_ultimo
                )
            `)
            .eq('documento_id', facturaId)
            .order('id', { ascending: true });
            
        if (error) {
            console.error('❌ Error cargando productos:', error);
            return;
        }
        
        console.log('📊 Productos encontrados:', productos?.length || 0);
        
        // Renderizar productos con intervalos de confianza cromáticos
        renderProductosInModalWithConfidence(productos || []);
        
    } catch (error) {
        console.error('❌ Error en loadProductsInModalFromDB:', error);
    }
}

// 🆕 FUNCIÓN PARA RENDERIZAR PRODUCTOS CON CONFIANZA CROMÁTICA
function renderProductosInModalWithConfidence(productos) {
    const productosTable = document.getElementById('productosTableBody');
    if (!productosTable) return;
    
    if (productos.length === 0) {
        productosTable.innerHTML = `
            <tr>
                <td colspan="8" class="text-center no-products">
                    📦 No se encontraron productos extraídos
                </td>
            </tr>
        `;
        return;
    }
    
    productosTable.innerHTML = productos.map(producto => {
        const confianza = producto.confianza_linea || 0.5;
        const confianzaClass = getConfidenceClass(confianza);
        const confianzaPercent = Math.round(confianza * 100);
        const maestro = producto.productos_maestro;
        
        return `
            <tr class="producto-row ${confianzaClass}" data-confianza="${confianza}">
                <td class="producto-codigo">${producto.codigo_producto || 'N/A'}</td>
                <td class="producto-descripcion">
                    <div class="producto-info">
                        <span class="producto-nombre">${producto.descripcion_original || 'N/A'}</span>
                        <span class="producto-confianza ${confianzaClass}">${confianzaPercent}%</span>
                    </div>
                </td>
                <td class="producto-unidad">${producto.unidad_medida || 'ud'}</td>
                <td class="producto-cantidad">${producto.cantidad || 0}</td>
                <td class="producto-precio">${formatCurrency(producto.precio_unitario_sin_iva || 0)}</td>
                <td class="producto-iva">${producto.tipo_iva || 21}%</td>
                <td class="producto-total">${formatCurrency(producto.precio_total_linea_sin_iva || 0)}</td>
                <td class="producto-acciones">
                    <button class="btn-edit-producto" onclick="editProducto('${producto.id}')" title="Editar producto">
                        ✏️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Productos renderizados con confianza cromática:', productos.length);
}

// 🆕 FUNCIÓN PARA EDITAR PRODUCTO
function editProducto(productoId) {
    try {
        console.log('✏️ Editando producto:', productoId);
        
        // Buscar el producto en la tabla
        const productoRow = document.querySelector(`tr[data-producto-id="${productoId}"]`);
        if (!productoRow) {
            console.error('❌ Producto no encontrado en la tabla');
            return;
        }
        
        // Convertir la fila en modo edición
        const celdas = productoRow.querySelectorAll('td:not(.producto-acciones)');
        celdas.forEach((celda, index) => {
            const valorActual = celda.textContent.trim();
            
            // Crear input de edición
            const input = document.createElement('input');
            input.type = 'text';
            input.value = valorActual;
            input.className = 'edit-producto-input';
            input.style.width = '100%';
            input.style.padding = '4px';
            input.style.border = '1px solid #d1d5db';
            input.style.borderRadius = '4px';
            
            // Reemplazar contenido de la celda
            celda.innerHTML = '';
            celda.appendChild(input);
            
            // Enfocar el input
            input.focus();
        });
        
        // Cambiar botón de editar por guardar/cancelar
        const accionesCell = productoRow.querySelector('.producto-acciones');
        accionesCell.innerHTML = `
            <button class="btn-save-producto" onclick="saveProducto('${productoId}')" title="Guardar cambios">
                💾
            </button>
            <button class="btn-cancel-producto" onclick="cancelEditProducto('${productoId}')" title="Cancelar">
                ❌
            </button>
        `;
        
        console.log('✅ Producto en modo edición');
        
    } catch (error) {
        console.error('❌ Error editando producto:', error);
    }
}

// 🆕 FUNCIÓN PARA GUARDAR CAMBIOS DE PRODUCTO
async function saveProducto(productoId) {
    try {
        console.log('💾 Guardando producto:', productoId);
        
        // Recopilar datos editados
        const productoRow = document.querySelector(`tr[data-producto-id="${productoId}"]`);
        const inputs = productoRow.querySelectorAll('.edit-producto-input');
        
        const datosEditados = {
            descripcion_original: inputs[1]?.value || '',
            cantidad: parseFloat(inputs[3]?.value) || 0,
            precio_unitario_sin_iva: parseFloat(inputs[4]?.value) || 0,
            tipo_iva: parseFloat(inputs[5]?.value) || 21
        };
        
        // Actualizar en base de datos
        const { error } = await supabaseClient
            .from('productos_extraidos')
            .update(datosEditados)
            .eq('id', productoId);
            
        if (error) {
            throw new Error(`Error guardando producto: ${error.message}`);
        }
        
        // Recargar productos
        await loadProductsInModalFromDB();
        
        showNotification('Producto actualizado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error guardando producto:', error);
        showNotification(`Error guardando producto: ${error.message}`, 'error');
    }
}

// 🆕 FUNCIÓN PARA CANCELAR EDICIÓN DE PRODUCTO
function cancelEditProducto(productoId) {
    try {
        console.log('❌ Cancelando edición de producto:', productoId);
        
        // Recargar productos sin guardar cambios
        loadProductsInModalFromDB();
        
    } catch (error) {
        console.error('❌ Error cancelando edición:', error);
    }
}

function setModalEditMode(mode) {
    const isEditMode = mode === 'edit';
    const inputs = document.querySelectorAll('#facturaModal input, #facturaModal select, #facturaModal textarea');
    
    inputs.forEach(input => {
        // Los campos readonly siempre están deshabilitados
        if (input.hasAttribute('readonly')) {
            input.disabled = true;
        } else {
            // Los demás campos se habilitan/deshabilitan según el modo
            input.disabled = !isEditMode;
            
            // 🎨 MANTENER COLORES DE CONFIANZA PERO HACER EDITABLE
            if (isEditMode) {
                input.style.opacity = '1';
                input.style.cursor = 'text';
                // Remover cualquier estilo que haga parecer deshabilitado
                input.style.backgroundColor = '';
                input.style.color = '';
            }
        }
    });

    // Mostrar/ocultar botones según el modo
    const editButton = document.querySelector('#facturaModal .btn-secondary');
    if (editButton) {
        editButton.style.display = isEditMode ? 'none' : 'block';
    }
}

function closeFacturaModal() {
    try {
        const modal = document.getElementById('facturaModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restaurar scroll
        }
        
        // Limpiar recursos del PDF al cerrar el modal
        cleanupPdfResources();
        
        console.log('Modal cerrado');
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Modal Cerrado 📄',
                'El modal de factura se ha cerrado',
                { requireInteraction: false }
            );
        }
        
    } catch (error) {
        console.error('Error cerrando modal:', error);
    }
}

function refreshData() {
    showNotification('Actualizando datos...', 'info');
    loadRealDataFromSupabase();
}

function exportData() {
    const data = {
        facturas: facturasData,
        fecha_exportacion: new Date().toISOString(),
        restaurante: CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturas_${CONFIG.TENANT.RESTAURANTE_ACTUAL?.nombre}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Datos exportados correctamente', 'success');
}

// ===== FUNCIONES DE PAGINACIÓN =====
function updatePagination(totalItems = (window.facturasData || []).length) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!paginationInfo || !paginationNumbers || !prevBtn || !nextBtn) return;
    
    // Actualizar info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} facturas`;
    
    // Actualizar botones prev/next
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Generar números de página
    paginationNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.onclick = () => goToPage(i);
        paginationNumbers.appendChild(pageBtn);
    }
}

function goToPage(page) {
    currentPage = page;
    renderFacturasTable();
    updatePagination();
}

function nextPage() {
    if (currentPage < Math.ceil(facturasData.length / itemsPerPage)) {
        currentPage++;
        renderFacturasTable();
        updatePagination();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderFacturasTable();
        updatePagination();
    }
}

// ===== FUNCIONES ADICIONALES DEL MODAL =====
function closeModal() {
    closeFacturaModal();
}

function switchTab(tabName) {
    // Función para cambiar entre pestañas del modal (si se implementan)
    console.log('Cambiando a pestaña:', tabName);
}

function navigateFactura(direction) {
    // Función para navegar entre facturas (si se implementa)
    console.log('Navegando factura:', direction);
}

function setFieldValue(fieldId, value, confidence) {
    const input = document.getElementById(fieldId);
    const confidenceEl = document.getElementById(`conf${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
    
    if (input) {
        input.value = value || '';
    }
    
    if (confidenceEl && confidence !== undefined) {
        const percentage = Math.round(confidence * 100);
        confidenceEl.textContent = `${percentage}%`;
        confidenceEl.className = `confidence-indicator ${getConfidenceClass(confidence)}`;
    }
}

function loadProductos(productos) {
    const container = document.getElementById('productosContainer');
    
    if (!productos || productos.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No hay productos extraídos</p>';
        return;
    }
    
    container.innerHTML = productos.map(producto => `
        <div class="producto-item" data-producto-id="${producto.id}">
            <div class="producto-header">
                <div class="producto-descripcion">${producto.descripcion_original}</div>
                <div class="producto-confianza confidence-badge ${getConfidenceClass(producto.confianza_linea)}">
                    ${Math.round(producto.confianza_linea * 100)}%
                </div>
            </div>
            <div class="producto-details">
                <div class="producto-detail-item">
                    <span>Cantidad:</span>
                    <span>${producto.cantidad} ${producto.unidad_medida}</span>
                </div>
                <div class="producto-detail-item">
                    <span>Precio unitario:</span>
                    <span>${formatCurrency(producto.precio_unitario_sin_iva)}</span>
                </div>
                <div class="producto-detail-item">
                    <span>Total línea:</span>
                    <span>${formatCurrency(producto.precio_total_linea_sin_iva)}</span>
                </div>
                <div class="producto-detail-item">
                    <span>IVA:</span>
                    <span>${producto.tipo_iva}%</span>
                </div>
            </div>
            ${producto.campos_inciertos && producto.campos_inciertos.length > 0 ? 
                `<div style="color: var(--warning); font-size: 0.8rem; margin-top: 8px;">
                    ⚠️ Campos inciertos: ${producto.campos_inciertos.join(', ')}
                </div>` : ''
            }
        </div>
    `).join('');
}

function loadHistorial(historial) {
    const container = document.getElementById('historialContainer');
    
    if (!historial || historial.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No hay historial de cambios</p>';
        return;
    }
    
    container.innerHTML = historial.map(evento => `
        <div class="historial-item">
            <div class="historial-header">
                <div class="historial-accion">${evento.accion}</div>
                <div class="historial-fecha">${formatDate(evento.fecha)}</div>
            </div>
            <div class="historial-detalles">
                ${evento.detalles}
                ${evento.usuario ? `<br><small>Por: ${evento.usuario}</small>` : ''}
            </div>
        </div>
    `).join('');
}

// ===== EDICIÓN DE CAMPOS =====
function editField(fieldName) {
    const input = document.getElementById(fieldName.replace('_', '').replace(/([A-Z])/g, (match, letter, index) => 
        index === 0 ? letter.toLowerCase() : letter
    ));
    
    if (input) {
        input.removeAttribute('readonly');
        input.focus();
        input.select();
        
        // Cambiar el botón de editar por guardar
        const editBtn = input.parentElement.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.innerHTML = '💾';
            editBtn.onclick = () => saveField(fieldName, input);
        }
    }
}

async function saveField(fieldName, input) {
    try {
        const newValue = input.value;
        
        showGlobalLoading('Guardando cambio...');
        
        await mockApi.updateCampo(currentFacturaId, fieldName, newValue);
        
        // Hacer el campo readonly de nuevo
        input.setAttribute('readonly', true);
        
        // Restaurar botón de editar
        const editBtn = input.parentElement.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.innerHTML = '✏️';
            editBtn.onclick = () => editField(fieldName);
        }
        
        hideGlobalLoading();
        showNotification('Campo actualizado correctamente', 'success');
        
        // Actualizar la confianza si es necesario
        // En un caso real, el backend devolvería la nueva confianza
        
    } catch (error) {
        console.error('Error guardando campo:', error);
        showNotification('Error guardando cambio: ' + error.message, 'error');
        hideGlobalLoading();
    }
}

// ===== ACCIONES DE FACTURA =====
async function aprobarFactura() {
    if (!confirm('¿Estás seguro de que quieres aprobar esta factura?')) {
        return;
    }
    
    try {
        showGlobalLoading('Aprobando factura...');
        
        await mockApi.aprobarFactura(currentFacturaId);
        
        hideGlobalLoading();
        showNotification('Factura aprobada correctamente', 'success');
        
        closeModal();
        refreshData(); // Actualizar la tabla
        
    } catch (error) {
        console.error('Error aprobando factura:', error);
        showNotification('Error aprobando factura: ' + error.message, 'error');
        hideGlobalLoading();
    }
}

async function guardarCambios() {
    showNotification('Todos los cambios se guardan automáticamente', 'info');
}

async function rechazarFactura() {
    if (!confirm('¿Estás seguro de que quieres rechazar esta factura?')) {
        return;
    }
    
    // En un caso real, habría una API para rechazar
    showNotification('Función de rechazo pendiente de implementar', 'warning');
}

// ===== PDF VIEWER =====
async function loadPdfViewer(pdfUrl, coordenadas) {
    const pdfLoading = document.getElementById('pdfLoading');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const overlaysContainer = document.getElementById('pdfOverlays');
    
    try {
        pdfLoading.style.display = 'flex';
        
        // Por ahora, mostrar una imagen placeholder
        // En implementación real, usarías PDF.js
        
        const img = new Image();
        img.onload = () => {
            // Configurar canvas
            const canvas = pdfCanvas;
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Crear overlays
            createOverlays(coordenadas, overlaysContainer, canvas);
            
            pdfLoading.style.display = 'none';
        };
        
        img.src = pdfUrl;
        
    } catch (error) {
        console.error('Error cargando PDF:', error);
        pdfLoading.innerHTML = '<p style="color: var(--error);">Error cargando PDF</p>';
    }
}

function createOverlays(coordenadas, container, canvas) {
    container.innerHTML = '';
    
    if (!coordenadas) return;
    
    Object.entries(coordenadas).forEach(([campo, coords]) => {
        const overlay = document.createElement('div');
        overlay.className = 'pdf-overlay confidence-medium'; // Por defecto media
        overlay.style.left = coords.x + 'px';
        overlay.style.top = coords.y + 'px';
        overlay.style.width = coords.width + 'px';
        overlay.style.height = coords.height + 'px';
        
        overlay.onclick = () => {
            // Seleccionar campo correspondiente
            const fieldId = campo.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            const input = document.getElementById(fieldId);
            if (input) {
                switchTab('general');
                input.focus();
                overlay.classList.add('selected');
                
                // Quitar selección después de 2 segundos
                setTimeout(() => overlay.classList.remove('selected'), 2000);
            }
        };
        
        container.appendChild(overlay);
    });
}

// ===== UTILIDADES DE UI =====
function showTableLoading() {
    document.getElementById('tableLoading').style.display = 'block';
    document.getElementById('facturasTableBody').innerHTML = '';
}

function hideTableLoading() {
    document.getElementById('tableLoading').style.display = 'none';
}

function showGlobalLoading(text = 'Cargando...') {
    const overlay = document.getElementById('globalLoading');
    const loadingText = document.getElementById('globalLoadingText');
    
    loadingText.textContent = text;
    overlay.style.display = 'flex';
}

function hideGlobalLoading() {
    document.getElementById('globalLoading').style.display = 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notifications');
    container.appendChild(notification);
    
    // Auto-remover después de 15 segundos (más tiempo para verla)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 15000);
}

// ===== OTRAS ACCIONES =====
async function refreshData() {
    console.log('Actualizando datos...');
    await loadInitialData();
    showNotification('Datos actualizados', 'success');
    
    // Enviar notificación push si están habilitadas
    if (Notification.permission === 'granted') {
        sendCustomNotification(
            'Dashboard Actualizado 🔄',
            'Los datos del dashboard se han actualizado correctamente',
            { requireInteraction: false }
        );
    }
}

function exportData() {
    const data = {
        facturas: facturasData,
        filtros: currentFilters,
        fecha_exportacion: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Datos exportados correctamente', 'success');
    
    // Enviar notificación push si están habilitadas
    if (Notification.permission === 'granted') {
        sendCustomNotification(
            'Exportación Completada 📊',
            'Los datos se han exportado correctamente',
            { requireInteraction: false }
        );
    }
}

// ===== FUNCIÓN DE LOGOUT =====
async function handleLogout() {
    try {
        console.log('Cerrando sesión...');
        
        // Enviar notificación push de cierre de sesión si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Sesión Cerrada 🔒',
                'Has cerrado sesión correctamente',
                { requireInteraction: false }
            );
        }
        
        // Limpiar datos locales
        localStorage.removeItem('user_info');
        localStorage.removeItem('restaurante_actual');
        
        // Cerrar sesión de Supabase
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        
        // Redirigir al login
        window.location.href = '../login.html';
        
    } catch (error) {
        console.error('Error en logout:', error);
        // Forzar redirección incluso si hay error
        window.location.href = '../login.html';
    }
}

// ===== UTILIDADES =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== CONEXIÓN CON API REAL (FUTURO) =====
async function connectToRealApi() {
    // Esta función reemplazará las mockApi por llamadas reales
    try {
        const { data, error } = await supabaseClient
            .from('vista_facturas_completas') // Vista creada en tu BD
            .select('*')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .order('fecha_subida', { ascending: false });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error conectando con API real:', error);
        throw error;
    }
}

// Función para cuando se conecte con tu Edge Function real
async function getRealFacturasData() {
    try {
        const { data, error } = await supabaseClient.functions
            .invoke('get-facturas-dashboard', {
                body: {
                    restaurante_id: CONFIG.TENANT.RESTAURANTE_ID,
                    filters: currentFilters
                }
            });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error en Edge Function:', error);
        throw error;
    }
}

// ===== CARGAR DATOS REALES DE SUPABASE =====
async function loadRealDataFromSupabase() {
    try {
        console.log('Cargando datos reales de Supabase...');
        
        // Mostrar loading al inicio
        showTableLoading();
        
        // Verificar que hay RESTAURANTE_ID
        if (!CONFIG.TENANT.RESTAURANTE_ID) {
            console.error('❌ No hay RESTAURANTE_ID configurado');
            hideTableLoading();
            throw new Error('No hay restaurante configurado');
        }
        
        // Cargar facturas de la tabla datos_extraidos_facturas
        const { data: facturasFromSupabase, error: facturasError } = await supabaseClient
            .from('datos_extraidos_facturas')
            .select('*')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .order('fecha_extraccion', { ascending: false });

        if (facturasError) {
            console.error('Error cargando facturas:', facturasError);
            throw new Error('Error cargando facturas: ' + facturasError.message);
        }

        if (!facturasFromSupabase || facturasFromSupabase.length === 0) {
            console.log('No hay facturas en Supabase');
            showNotification('No se encontraron facturas en la base de datos', 'info');
            return;
        }

        console.log('Facturas cargadas de Supabase:', facturasFromSupabase.length);
        
        // Debug: Ver qué campos llegan realmente de Supabase
        if (facturasFromSupabase.length > 0) {
            console.log('🔍 DEBUG - Campos que llegan de Supabase en primera factura:');
            console.log('  - Todos los campos:', Object.keys(facturasFromSupabase[0]));
            console.log('  - url_storage:', facturasFromSupabase[0].url_storage);
            console.log('  - archivo_nombre:', facturasFromSupabase[0].archivo_nombre);
            console.log('  - documento_id:', facturasFromSupabase[0].documento_id);
        }
        
        // Transformar datos de Supabase al formato del dashboard
        const transformedFacturas = facturasFromSupabase.map(factura => ({
            id: factura.documento_id || factura.id,
            documento_id: factura.documento_id,
            restaurante_id: factura.restaurante_id,
            numero_factura: factura.numero_factura || 'N/A',
            proveedor_nombre: factura.proveedor_nombre || 'Proveedor Desconocido',
            proveedor_cif: factura.proveedor_cif || 'Sin CIF',
            proveedor_direccion: factura.proveedor_direccion || 'Sin dirección',
            fecha_factura: factura.fecha_factura || new Date().toISOString(),
            fecha_vencimiento: factura.fecha_vencimiento || null,
            total_factura: factura.total_factura || 0,
            // ✅ CORRECCIÓN: Usar valores reales de la base de datos, NO estimaciones
            importe_neto: factura.base_imponible || 0,
            iva: factura.cuota_iva || 0,
            base_imponible: factura.base_imponible || 0,
            total_iva: factura.cuota_iva || 0,
            tipo_iva: factura.tipo_iva || 21,
            confianza_global: factura.confianza_global || 0.5,
            confianza_proveedor: factura.confianza_proveedor || 0.5,
            confianza_datos_fiscales: factura.confianza_datos_fiscales || 0.5,
            confianza_importes: factura.confianza_importes || 0.5,
            requiere_revision: factura.requiere_revision || false,
            proveedor_nuevo: factura.proveedor_nuevo || false,
            campos_con_baja_confianza: factura.campos_con_baja_confianza || [],
            estado: factura.estado || 'processed',
            fecha_extraccion: factura.fecha_extraccion || new Date().toISOString(),
            coordenadas_campos: factura.coordenadas_campos || {},
            // Campos de archivo y coordenadas
            archivo_nombre: factura.archivo_nombre || factura.documento_id || null,
            url_storage: factura.url_storage || null, // ← AÑADIDO: URL directa del storage
            coordenadas_numero_factura: factura.coordenadas_numero_factura || null,
            coordenadas_proveedor_nombre: factura.coordenadas_proveedor_nombre || null,
            coordenadas_proveedor_cif: factura.coordenadas_proveedor_cif || null,
            coordenadas_fecha_factura: factura.coordenadas_fecha_factura || null,
            coordenadas_importe_neto: factura.coordenadas_importe_neto || null,
            coordenadas_iva: factura.coordenadas_iva || null,
            coordenadas_total_factura: factura.coordenadas_total_factura || null,
            productos: [] // Se cargarán por separado si es necesario
        }));

        // Actualizar datos globales
        window.facturasData = transformedFacturas;
        
        console.log('📊 Datos globales actualizados:', window.facturasData.length, 'facturas');
        console.log('📋 Primera factura:', window.facturasData[0]);
        
        // Debug: Verificar campos de coordenadas
        if (window.facturasData.length > 0) {
            const primeraFactura = window.facturasData[0];
            console.log('🔍 DEBUG - Campos de coordenadas en primera factura:');
            console.log('  - archivo_nombre:', primeraFactura.archivo_nombre);
            console.log('  - documento_id:', primeraFactura.documento_id);
            console.log('  - coordenadas_numero_factura:', primeraFactura.coordenadas_numero_factura);
            console.log('  - coordenadas_proveedor_nombre:', primeraFactura.coordenadas_proveedor_nombre);
            console.log('  - coordenadas_total_factura:', primeraFactura.coordenadas_total_factura);
        }
        
        // Calcular métricas reales
        updateRealMetrics(transformedFacturas);
        
        // Actualizar métricas avanzadas y gráficos
        await updateAdvancedMetrics(transformedFacturas);
        
        // Renderizar tabla
        console.log('🎯 ANTES de renderFacturasTable()');
        console.log('🎯 window.facturasData.length:', window.facturasData.length);
        console.log('🎯 window.facturasData:', window.facturasData);
        console.log('🎯 currentPage:', currentPage);
        console.log('🎯 itemsPerPage:', itemsPerPage);
        console.log('🎯 Llamando a renderFacturasTable()...');
        
        // ✅ VERIFICAR QUE LAS VARIABLES ESTÉN DEFINIDAS
        if (typeof currentPage === 'undefined') {
            console.error('❌ ERROR: currentPage no está definida');
            alert('❌ ERROR: currentPage no está definida');
            return;
        }
        
        if (typeof itemsPerPage === 'undefined') {
            console.error('❌ ERROR: itemsPerPage no está definida');
            alert('❌ ERROR: itemsPerPage no está definida');
            return;
        }
        
        renderFacturasTable();
        
        console.log('🎯 DESPUÉS de renderFacturasTable()');
        console.log('🎯 Verificando botones en la tabla...');
        
        // Verificar que los botones se crearon
        setTimeout(() => {
            const advancedButtons = document.querySelectorAll('.btn-advanced');
            console.log(`🎯 Botones "Avanzado" encontrados después de renderizar: ${advancedButtons.length}`);
            if (advancedButtons.length === 0) {
                console.warn('⚠️ NO se encontraron botones "Avanzado" - Problema en el renderizado');
            }
        }, 100);
        
        updatePagination();
        
        console.log('Datos reales cargados correctamente');
        
        // Ocultar loading después de un pequeño delay para mejor UX
        setTimeout(() => {
            hideTableLoading();
        }, 500);
        
    } catch (error) {
        console.error('Error cargando datos reales:', error);
        showNotification('Error cargando datos: ' + error.message, 'error');
    }
}

// ===== ACTUALIZAR MÉTRICAS REALES =====
function updateRealMetrics(facturas) {
    const metrics = {
        totalFacturas: facturas.length,
        pendientesRevision: facturas.filter(f => f.requiere_revision).length,
        aprobadas: facturas.filter(f => f.estado === 'approved').length,
        conErrores: facturas.filter(f => f.estado === 'error').length,
        totalImportes: facturas.reduce((sum, f) => sum + (f.total_factura || 0), 0),
        confianzaPromedio: facturas.reduce((sum, f) => sum + (f.confianza_global || 0), 0) / facturas.length
    };

    // Actualizar métricas en el dashboard
    updateMetricsDisplay(metrics);
}

// ===== ACTUALIZAR DISPLAY DE MÉTRICAS =====
function updateMetricsDisplay(metrics) {
    const totalFacturasEl = document.querySelector('[data-metric="total"] .metric-value');
    const pendientesEl = document.querySelector('[data-metric="pendientes"] .metric-value');
    const aprobadasEl = document.querySelector('[data-metric="aprobadas"] .metric-value');
    const totalImportesEl = document.querySelector('[data-metric="importes"] .metric-value');

    if (totalFacturasEl) totalFacturasEl.textContent = metrics.totalFacturas;
    if (pendientesEl) pendientesEl.textContent = metrics.pendientesRevision;
    if (aprobadasEl) aprobadasEl.textContent = metrics.aprobadas;
    if (totalImportesEl) totalImportesEl.textContent = formatCurrency(metrics.totalImportes);
}

// ===== FUNCIONES UTILITARIAS =====
function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// ===== FUNCIÓN DE FALLBACK A MOCK DATA =====
// ELIMINADA - Solo datos reales de Supabase
// function loadMockData() { ... }

console.log('Dashboard de Facturas cargado correctamente');

// ===== FUNCIÓN PARA CONFIGURAR CONTROLES DEL PDF =====
function setupPdfControls() {
    // Controles de navegación
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            console.log('Navegación: Página anterior');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            console.log('Navegación: Página siguiente');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            console.log('Zoom: Aumentar');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            console.log('Zoom: Disminuir');
            // TODO: Implementar en la siguiente fase
        });
    }
    
    // Por ahora, deshabilitar los controles
    [prevPageBtn, nextPageBtn, zoomInBtn, zoomOutBtn].forEach(btn => {
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
    
        if (pageInfo) {
            pageInfo.textContent = 'PDF no disponible';
            pageInfo.style.opacity = '0.5';
        }
    }

// ===== FUNCIÓN PARA CARGAR PDF DESDE URL COMPLETA =====
async function loadPdfFromFacturaId(facturaId) {
    try {
        console.log('🔄 Iniciando carga de PDF para factura:', facturaId);
        
        // Buscar la factura en los datos
        const factura = (window.facturasData || []).find(f => f.id === facturaId);
        if (!factura) {
            throw new Error('Factura no encontrada');
        }
        
        console.log('📋 Factura encontrada:', factura);
        
        // Obtener el documento_id para buscar en la tabla documentos
        const documentoId = factura.documento_id;
        if (!documentoId) {
            throw new Error('No se encontró documento_id en la factura');
        }
        
        console.log('📄 Documento ID:', documentoId);
        
        // Buscar la URL completa en la tabla documentos
        const { data: documentoInfo, error: docError } = await supabaseClient
            .from('documentos')
            .select('url_storage')
            .eq('id', documentoId)
            .single();
            
        if (docError || !documentoInfo) {
            throw new Error(`Error obteniendo información del documento: ${docError?.message || 'Documento no encontrado'}`);
        }
        
        const pdfUrl = documentoInfo.url_storage;
        console.log('🔗 URL del PDF:', pdfUrl);
        
        if (!pdfUrl) {
            throw new Error('No se encontró URL del PDF en la base de datos');
        }
        
        // Verificar si la URL es válida
        if (!pdfUrl.startsWith('http')) {
            throw new Error('URL del PDF no es válida');
        }
        
        // Cargar el documento PDF usando PDF.js directamente desde la URL
        console.log('📥 Cargando PDF desde URL...');
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDocument = await loadingTask.promise;
        
        console.log('✅ PDF cargado correctamente');
        console.log('📄 Número de páginas:', pdfDocument.numPages);
        
        // Guardar el documento en variable global para uso posterior
        window.currentPdfDocument = pdfDocument;
        
        // Actualizar información de páginas
        updatePageInfo(1, pdfDocument.numPages);
        
        // Renderizar la primera página automáticamente
        await renderPdfPage(1);
        
        return pdfDocument;
        
    } catch (error) {
        console.error('❌ Error cargando PDF desde URL:', error);
        showNotification(`Error cargando el PDF: ${error.message}`, 'error');
        return null;
    }
}

// ===== FUNCIÓN PARA ACTUALIZAR INFORMACIÓN DE PÁGINAS =====
function updatePageInfo(currentPage, totalPages) {
    const pageInfoElement = document.getElementById('pageInfo');
    if (pageInfoElement) {
        pageInfoElement.textContent = `Página ${currentPage} de ${totalPages}`;
        pageInfoElement.style.opacity = '1';
    }
}

// ===== FUNCIÓN PARA RENDERIZAR PÁGINA DEL PDF =====
async function renderPdfPage(pageNumber = 1) {
    try {
        if (!window.currentPdfDocument) {
            console.log('❌ No hay PDF cargado');
            return;
        }
        
        console.log(`🔄 Renderizando página ${pageNumber}`);
        
        // Obtener la página específica
        const page = await window.currentPdfDocument.getPage(pageNumber);
        
        // Obtener el canvas
        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) {
            console.error('❌ Canvas no encontrado');
            return;
        }
        
        // Configurar el contexto del canvas
        const context = canvas.getContext('2d');
        
        // 🔥 CORREGIR ESCALADO: Calcular escala para ajustar al contenedor
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calcular escala que mantenga proporción y quepa en el contenedor
        const scaleX = containerWidth / page.getViewport({ scale: 1.0 }).width;
        const scaleY = containerHeight / page.getViewport({ scale: 1.0 }).height;
        const scale = Math.min(scaleX, scaleY, 1.0); // No escalar más del 100%
        
        console.log('🔍 Escalado del PDF:', { scale, containerWidth, containerHeight });
        
        const viewport = page.getViewport({ scale: scale });
        
        // Ajustar tamaño del canvas con la escala correcta
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        
        // Renderizar la página con la escala correcta
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Ocultar placeholder y mostrar canvas
        const placeholder = document.getElementById('pdfPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
        canvas.style.display = 'block';
        
        // 🔥 GUARDAR LA ESCALA ACTUAL PARA LAS COORDENADAS
        window.currentPdfScale = scale;
        window.currentPdfViewport = viewport;
        
        console.log(`✅ Página ${pageNumber} renderizada correctamente`);
        
        // Actualizar página actual
        window.currentPage = pageNumber;
        
    } catch (error) {
        console.error('❌ Error renderizando página:', error);
        showNotification('Error renderizando la página del PDF', 'error');
    }
}

// ===== FUNCIÓN PARA LIMPIAR RECURSOS DEL PDF =====
function cleanupPdfResources() {
    try {
        // Limpiar documento PDF
        if (window.currentPdfDocument) {
            window.currentPdfDocument.destroy();
            window.currentPdfDocument = null;
            console.log('🧹 Documento PDF limpiado');
        }
        
        // Limpiar página actual
        window.currentPage = null;
        
        // Ocultar canvas y mostrar placeholder
        const canvas = document.getElementById('pdfCanvas');
        const placeholder = document.getElementById('pdfPlaceholder');
        
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        
        console.log('🧹 Recursos del PDF limpiados correctamente');
        
    } catch (error) {
        console.error('❌ Error limpiando recursos del PDF:', error);
    }
}



// ===== FUNCIÓN DE PRUEBA PARA VERIFICAR STORAGE =====
async function testSupabaseStorage() {
    try {
        console.log('🧪 Iniciando prueba de Supabase Storage...');
        
        if (!supabaseClient) {
            throw new Error('Cliente de Supabase no inicializado');
        }
        
        // 1. Verificar buckets disponibles
        console.log('📦 Verificando buckets disponibles...');
        const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
        
        if (bucketsError) {
            throw new Error(`Error listando buckets: ${bucketsError.message}`);
        }
        
        console.log('✅ Buckets disponibles:', buckets);
        console.log('📋 Nombres de buckets:', buckets.map(b => b.name));
        
        // 2. Verificar si existe el bucket 'facturas'
        const facturasBucket = buckets.find(b => b.name === 'facturas');
        if (!facturasBucket) {
            console.warn('⚠️ Bucket "facturas" no encontrado. Buckets disponibles:', buckets.map(b => b.name));
            
            // Intentar crear el bucket si no existe
            console.log('🔄 Intentando crear bucket "facturas"...');
            const { data: createData, error: createError } = await supabaseClient.storage.createBucket('facturas', {
                public: false,
                allowedMimeTypes: ['application/pdf'],
                fileSizeLimit: 10485760 // 10MB
            });
            
            if (createError) {
                console.warn('⚠️ No se pudo crear bucket "facturas":', createError.message);
                console.warn('⚠️ Detalles del error:', createError);
            } else {
                console.log('✅ Bucket "facturas" creado correctamente');
            }
        } else {
            console.log('✅ Bucket "facturas" encontrado:', facturasBucket);
        }
        
        // 3. Verificar archivos en el bucket (si existe)
        try {
            const { data: files, error: filesError } = await supabaseClient.storage
                .from('facturas')
                .list();
                
            if (filesError) {
                console.warn('⚠️ Error listando archivos:', filesError.message);
            } else {
                console.log('📁 Archivos en bucket "facturas":', files);
            }
        } catch (error) {
            console.warn('⚠️ No se pudo listar archivos del bucket:', error.message);
        }
        
        // 4. Verificar permisos de lectura
        console.log('🔐 Verificando permisos de lectura...');
        
        // Intentar acceder a un archivo de prueba (debería fallar si no existe)
        const { data: testFile, error: testError } = await supabaseClient.storage
            .from('facturas')
            .download('test-file.pdf');
            
        if (testError) {
            if (testError?.message && testError.message.includes('not found')) {
                console.log('✅ Permisos de lectura verificados (archivo no encontrado, pero acceso permitido)');
            } else {
                console.warn('⚠️ Posible problema de permisos:', testError.message);
            }
        }
        
        console.log('✅ Prueba de Storage completada');
        return true;
        
    } catch (error) {
        console.error('❌ Error en prueba de Storage:', error);
        return false;
    }
}

// ===== FUNCIÓN DE DEBUG TEMPORAL =====
function debugFacturasData() {
    console.log('🔍 DEBUG - Datos de facturas disponibles:');
    console.log('📊 Total de facturas:', (window.facturasData || []).length);
    
            if (window.facturasData && window.facturasData.length > 0) {
            window.facturasData.forEach((factura, index) => {
                console.log(`📋 Factura ${index + 1}:`, {
                    id: factura.id,
                    documento_id: factura.documento_id,
                    archivo_nombre: factura.archivo_nombre,
                    url_storage: factura.url_storage, // ← AÑADIDO
                    numero_factura: factura.numero_factura,
                    proveedor_nombre: factura.proveedor_nombre,
                    coordenadas_disponibles: Object.keys(factura).filter(key => key.startsWith('coordenadas_')),
                    coordenadas_numero_factura: factura.coordenadas_numero_factura,
                    coordenadas_proveedor_nombre: factura.coordenadas_proveedor_nombre,
                    coordenadas_total_factura: factura.coordenadas_total_factura
                });
            });
            
            // Mostrar en pantalla también
            const debugInfo = window.facturasData.map((f, i) => 
                `Factura ${i + 1}: ${f.numero_factura} - URL: ${f.url_storage ? '✅' : '❌'}`
            ).join('\n');
            
            alert(`🔍 DEBUG - Datos de Facturas:\n\n${debugInfo}`);
        } else {
        console.log('❌ No hay datos de facturas disponibles');
        alert('❌ No hay datos de facturas disponibles');
    }
}

// ===== FUNCIONES PARA PRODUCTOS EN MODAL =====

// Función para cargar productos en el modal
async function loadProductsInModal(facturaId) {
    const loadingElement = document.getElementById('modalProductsLoading');
    const containerElement = document.getElementById('modalProductsContainer');
    const noProductsElement = document.getElementById('modalNoProducts');
    const countElement = document.getElementById('modalProductsCount');
    
    try {
        // Mostrar loading
        if (loadingElement) loadingElement.style.display = 'flex';
        if (containerElement) containerElement.style.display = 'none';
        if (noProductsElement) noProductsElement.style.display = 'none';
        
        console.log('🛒 Cargando productos para modal de factura:', facturaId);
        
        const { data: productos, error } = await supabaseClient
            .from('productos_extraidos')
            .select(`
                *,
                productos_maestro!fk_productos_extraidos_maestro (
                    nombre_normalizado,
                    categoria_principal,
                    unidad_base,
                    precio_ultimo
                )
            `)
            .eq('documento_id', facturaId)
            .order('id', { ascending: true });
            
        // Obtener precio anterior para cada producto
        if (productos) {
            for (let producto of productos) {
                if (producto.producto_maestro_id) {
                    console.log(`🔍 [MODAL] Obteniendo precio anterior para: ${producto.descripcion_original} (maestro_id: ${producto.producto_maestro_id})`);
                    producto.precio_anterior = await getPrecioAnterior(producto.producto_maestro_id, producto.fecha_extraccion);
                    console.log(`💰 [MODAL] Precio anterior: ${producto.precio_anterior}`);
                }
            }
        }
            
        if (error) {
            console.error('❌ Error cargando productos para modal:', error);
            throw error;
        }
        
        console.log(`✅ ${productos?.length || 0} productos cargados para modal`);
        
        // Ocultar loading
        if (loadingElement) loadingElement.style.display = 'none';
        
        // Actualizar contador
        if (countElement) {
            countElement.textContent = `${productos?.length || 0} productos`;
        }
        
        if (!productos || productos.length === 0) {
            // Mostrar mensaje de no productos
            if (noProductsElement) noProductsElement.style.display = 'block';
            if (containerElement) containerElement.style.display = 'none';
        } else {
            // Renderizar productos
            if (containerElement) {
                containerElement.style.display = 'grid';
                renderProductsInModal(productos);
            }
            if (noProductsElement) noProductsElement.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error en loadProductsInModal:', error);
        
        // Ocultar loading y mostrar error
        if (loadingElement) loadingElement.style.display = 'none';
        if (containerElement) containerElement.style.display = 'none';
        if (noProductsElement) {
            noProductsElement.style.display = 'block';
            noProductsElement.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h4>Error cargando productos</h4>
                    <p>No se pudieron cargar los productos de esta factura</p>
                </div>
            `;
        }
        if (countElement) {
            countElement.textContent = 'Error cargando';
        }
    }
}

// Función para renderizar productos en el modal
function renderProductsInModal(productos) {
    const container = document.getElementById('modalProductsContainer');
    if (!container) return;
    
    container.innerHTML = productos.map(producto => {
        const confidence = producto.confianza_linea || 0.5;
        const confidenceClass = getConfidenceClass(confidence);
        
        return `
            <div class="product-card ${confidenceClass}">
                <div class="product-name">${producto.descripcion_original || 'Producto sin descripción'}</div>
                <div class="product-details">
                    <span>Cantidad: ${producto.cantidad || 0} ${producto.unidad_medida || 'ud'}</span>
                    <span class="${getPriceChangeClass(producto.precio_unitario_sin_iva, producto.precio_anterior)}">
                        Precio: ${formatCurrency(producto.precio_unitario_sin_iva || 0)}
                        ${producto.precio_anterior ? `<span class="precio-anterior">(Anterior: ${formatCurrency(producto.precio_anterior)})</span>` : '<span class="precio-anterior">(Primera compra)</span>'}
                    </span>
                    <span>Total: ${formatCurrency(producto.precio_total_linea_sin_iva || 0)}</span>
                    <span>IVA: ${producto.tipo_iva || 21}%</span>
                    ${(() => {
                        // Intentar obtener formato de formato_comercial o extraer de la descripción
                        let formato = producto.formato_comercial;
                        
                        if (!formato && producto.descripcion_original) {
                            // Buscar patrones de formato en la descripción
                            const formatoMatch = producto.descripcion_original.match(/(\d+(?:[.,]\d+)?\s*(?:KG|kg|Kg|L|l|LITRO|litro|ML|ml|GR|gr|GRAMOS|gramos|UNIDADES|ud|UD))/i);
                            if (formatoMatch) {
                                formato = formatoMatch[1].toUpperCase();
                            }
                        }
                        
                        return formato ? `<span>📦 Formato: ${formato}</span>` : '';
                    })()}
                </div>
            </div>
        `;
    }).join('');
}

// ===== FUNCIONES PARA TABLA EXPANDIBLE DE PRODUCTOS =====

// Función para alternar la fila de productos
async function toggleProductsRow(facturaId, buttonElement) {
    const productsRow = document.getElementById(`products-row-${facturaId}`);
    const isExpanded = buttonElement.classList.contains('expanded');
    
    if (!isExpanded) {
        // Expandir
        buttonElement.classList.add('expanded');
        productsRow.style.display = 'table-row';
        productsRow.classList.add('expanding');
        
        // Cargar productos si no están cargados
        await loadProductsForFactura(facturaId);
    } else {
        // Contraer
        buttonElement.classList.remove('expanded');
        productsRow.style.display = 'none';
        productsRow.classList.remove('expanding');
    }
}

// Función para cargar productos de una factura
async function loadProductsForFactura(facturaId) {
    try {
        console.log('🛒 Cargando productos para factura:', facturaId);
        
        const { data: productos, error } = await supabaseClient
            .from('productos_extraidos')
            .select(`
                *,
                productos_maestro!fk_productos_extraidos_maestro (
                    nombre_normalizado,
                    categoria_principal,
                    unidad_base,
                    precio_ultimo
                )
            `)
            .eq('documento_id', facturaId)
            .order('id', { ascending: true });
            
        // Obtener precio anterior para cada producto
        if (productos) {
            for (let producto of productos) {
                if (producto.producto_maestro_id) {
                    console.log(`🔍 [MODAL] Obteniendo precio anterior para: ${producto.descripcion_original} (maestro_id: ${producto.producto_maestro_id})`);
                    producto.precio_anterior = await getPrecioAnterior(producto.producto_maestro_id, producto.fecha_extraccion);
                    console.log(`💰 [MODAL] Precio anterior: ${producto.precio_anterior}`);
                }
            }
        }
            
        if (error) {
            console.error('❌ Error cargando productos:', error);
            showNotification('Error cargando productos', 'error');
            return;
        }
        
        console.log(`✅ ${productos?.length || 0} productos cargados para factura ${facturaId}`);
        
        renderProductsInRow(facturaId, productos || []);
        
    } catch (error) {
        console.error('❌ Error en loadProductsForFactura:', error);
        showNotification('Error cargando productos', 'error');
    }
}

// Función para renderizar productos en la fila expandida
function renderProductsInRow(facturaId, productos) {
    const productsGrid = document.getElementById(`products-grid-${facturaId}`);
    const productsCount = document.getElementById(`products-count-${facturaId}`);
    
    if (!productsGrid || !productsCount) {
        console.error('❌ No se encontraron elementos para renderizar productos');
        return;
    }
    
    // Actualizar contador
    productsCount.textContent = productos.length;
    
    if (productos.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <p style="color: #6b7280; text-align: center; grid-column: 1/-1; padding: 20px;">
                    📦 No se encontraron productos extraídos en esta factura
                </p>
            </div>
        `;
        return;
    }
    
    // Renderizar productos
    // Renderizar productos con formato horizontal compacto como en la imagen
    productsGrid.innerHTML = `
        <div class="products-compact-horizontal">
            ${productos.map(producto => {
        const confidence = producto.confianza_linea || 0.5;
        const confidenceClass = getConfidenceClass(confidence);
        const maestro = producto.productos_maestro;
        
        return `
                    <div class="product-card-compact">
                        <!-- Título del producto -->
                        <div class="product-title-compact">
                    ${producto.descripcion_original || 'Producto sin descripción'}
                </div>
                
                        <!-- Grid horizontal de datos REORGANIZADO - PRECIO ANTERIOR MÁS IMPORTANTE -->
                        <div class="product-data-horizontal">
                            <!-- Cantidad -->
                            <div class="data-block">
                                <div class="data-label-compact">Cantidad:</div>
                                <div class="data-value-compact quantity">${producto.cantidad || 0} ${producto.unidad_medida || 'ud'}</div>
                            </div>
                            
                            <!-- Precio Unit con Precio Anterior PROMINENTE -->
                            <div class="data-block precio-anterior-block">
                                <div class="data-label-compact">Precio unit.:</div>
                                <div class="data-value-compact price ${getPriceChangeClass(producto.precio_unitario_sin_iva, producto.precio_anterior)}">
                                    ${producto.precio_unitario_sin_iva ? formatCurrency(producto.precio_unitario_sin_iva) : '-'}
                                    ${producto.precio_anterior ? `<span class="precio-anterior-highlight">(Ant: ${formatCurrency(producto.precio_anterior)})</span>` : '<span class="precio-anterior-highlight">(Primera compra)</span>'}
                                </div>
                            </div>
                            
                            <!-- IVA (MENOS PROMINENTE) -->
                            <div class="data-block">
                                <div class="data-label-compact">IVA:</div>
                                <div class="data-value-compact iva">${producto.tipo_iva || 21}%</div>
                            </div>
                            
                            <!-- Total línea -->
                            <div class="data-block">
                                <div class="data-label-compact">Total línea:</div>
                                <div class="data-value-compact total">${formatCurrency(producto.precio_total_linea_sin_iva || 0)}</div>
                            </div>
                            
                            <!-- Formato -->
                            ${(() => {
                                let formato = producto.formato_comercial;
                                if (!formato && producto.descripcion_original) {
                                    const formatoMatch = producto.descripcion_original.match(/(\d+(?:[.,]\d+)?\s*(?:KG|kg|Kg|L|l|LITRO|litro|ML|ml|GR|gr|GRAMOS|gramos|UNIDADES|ud|UD))/i);
                                    if (formatoMatch) {
                                        formato = formatoMatch[1].toUpperCase();
                                    }
                                }
                                return formato ? `
                                    <div class="data-block">
                                        <div class="data-label-compact">📦 Formato:</div>
                                        <div class="data-value-compact format">${formato}</div>
                                    </div>
                                ` : '';
                            })()}
                            
                            <!-- €/kg - €/L -->
                            ${producto.precio_por_kg || producto.precio_por_litro ? `
                                <div class="data-block unit-price-block">
                                    <div class="data-label-compact">💰 €/Unidad:</div>
                                    <div class="data-value-compact unit-prices">
                                        ${producto.precio_por_kg ? `${formatCurrency(producto.precio_por_kg)}/kg` : ''}
                                        ${producto.precio_por_litro ? `${formatCurrency(producto.precio_por_litro)}/L` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Categoría -->
                            <div class="data-block">
                                <div class="data-label-compact">Categoría:</div>
                                <div class="data-value-compact category">${maestro?.categoria_principal || 'general'}</div>
                            </div>
                            
                            <!-- Normalizado -->
                            ${maestro?.nombre_normalizado ? `
                                <div class="data-block">
                                    <div class="data-label-compact">Normalizado:</div>
                                    <div class="data-value-compact normalized">${maestro.nombre_normalizado}</div>
                                </div>
                            ` : ''}
                        </div>
                
                        <!-- Confianza -->
                        <div class="product-confidence-compact ${confidenceClass}">
                    Confianza: ${Math.round(confidence * 100)}%
                </div>
            </div>
        `;
            }).join('')}
        </div>
    `;
}

// ===== FUNCIONES PARA MÉTRICAS AVANZADAS =====

// Función para actualizar todas las métricas avanzadas
async function updateAdvancedMetrics(facturas) {
    try {
        console.log('📊 Actualizando métricas avanzadas...');
        
        // Métricas básicas
        updateBasicMetrics(facturas);
        
        // Métricas de pagos
        await updatePaymentMetrics();
        
        // Métricas de proveedores y productos
        await updateSuppliersAndProductsMetrics();
        
        // Inicializar gráficos
        await initializeCharts(facturas);
        
        console.log('✅ Métricas avanzadas actualizadas');
        
    } catch (error) {
        console.error('❌ Error actualizando métricas avanzadas:', error);
    }
}

// Función para métricas básicas
function updateBasicMetrics(facturas) {
    const totalFacturas = facturas.length;
    const pendientesRevision = facturas.filter(f => f.requiere_revision || f.confianza_global < 0.7).length;
    const aprobadas = facturas.filter(f => f.estado === 'approved').length;
    const totalImportes = facturas.reduce((sum, f) => sum + (f.total_factura || 0), 0);
    
    // Actualizar elementos
    updateMetricValue('total', totalFacturas);
    updateMetricValue('pendientes', pendientesRevision);
    updateMetricValue('aprobadas', aprobadas);
    updateMetricValue('importes', formatCurrency(totalImportes));
}

// Función para métricas de pagos usando datos reales
async function updatePaymentMetrics() {
    try {
        const now = new Date();
        
        // Obtener facturas con información de proveedores para calcular fechas de vencimiento
        const { data: facturasConProveedores, error } = await supabaseClient
            .from('datos_extraidos_facturas')
            .select(`
                *,
                proveedores!inner (
                    dias_pago,
                    nombre
                )
            `)
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .not('proveedores.dias_pago', 'is', null);
            
        if (error) {
            console.error('❌ Error obteniendo facturas con proveedores:', error);
            return;
        }
        
        let pagos7Dias = 0;
        let pagos15Dias = 0;
        let pagos30Dias = 0;
        let facturas7Dias = 0;
        let facturas15Dias = 0;
        let facturas30Dias = 0;
        let facturasVencidas = 0;
        
        facturasConProveedores.forEach(factura => {
            const fechaFactura = new Date(factura.fecha_factura);
            const diasPago = factura.proveedores.dias_pago || 30;
            const fechaVencimiento = new Date(fechaFactura.getTime() + diasPago * 24 * 60 * 60 * 1000);
            const diasHastaVencimiento = Math.ceil((fechaVencimiento.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            const importe = factura.total_factura || 0;
            
            if (diasHastaVencimiento < 0) {
                // Ya vencida
                facturasVencidas++;
            } else if (diasHastaVencimiento <= 7) {
                pagos7Dias += importe;
                facturas7Dias++;
            } else if (diasHastaVencimiento <= 15) {
                pagos15Dias += importe;
                facturas15Dias++;
            } else if (diasHastaVencimiento <= 30) {
                pagos30Dias += importe;
                facturas30Dias++;
            }
        });
        
        // Actualizar métricas
        updateMetricValue('pagos_7_dias', formatCurrency(pagos7Dias));
        updateMetricTrend('pagos_7_dias', `${facturas7Dias} facturas pendientes`);
        
        updateMetricValue('pagos_15_dias', formatCurrency(pagos15Dias));
        updateMetricTrend('pagos_15_dias', `${facturas15Dias} facturas pendientes`);
        
        updateMetricValue('pagos_30_dias', formatCurrency(pagos30Dias));
        updateMetricTrend('pagos_30_dias', `${facturas30Dias} facturas pendientes`);
        
        updateMetricValue('facturas_vencidas', facturasVencidas);
        
    } catch (error) {
        console.error('❌ Error actualizando métricas de pagos:', error);
    }
}

// Función para métricas de proveedores y productos
async function updateSuppliersAndProductsMetrics() {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Contar proveedores totales (de la tabla proveedores)
        const { data: proveedores, error: proveedoresError } = await supabaseClient
            .from('proveedores')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .eq('es_activo', true);
            
        if (!proveedoresError) {
            updateMetricValue('total_proveedores', proveedores.length);
        }
        
        // Contar nuevos proveedores esta semana
        const { data: nuevosProveedores, error: nuevosProveedoresError } = await supabaseClient
            .from('proveedores')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .eq('es_activo', true)
            .gte('fecha_creacion', oneWeekAgo.toISOString());
            
        if (!nuevosProveedoresError) {
            updateMetricValue('nuevos_proveedores', nuevosProveedores.length);
            updateMetricTrend('total_proveedores', `${nuevosProveedores.length} nuevos esta semana`);
        }
        
        // Contar productos maestros
        const { data: productos, error: productosError } = await supabaseClient
            .from('productos_maestro')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID);
            
        if (!productosError) {
            updateMetricValue('total_productos', productos.length);
        }
        
        // Contar nuevos productos esta semana
        const { data: nuevosProductos, error: nuevosProductosError } = await supabaseClient
            .from('productos_maestro')
            .select('id')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID)
            .gte('fecha_creacion', oneWeekAgo.toISOString());
            
        if (!nuevosProductosError) {
            updateMetricValue('nuevos_productos', nuevosProductos.length);
            updateMetricTrend('total_productos', `${nuevosProductos.length} nuevos esta semana`);
        }
        
    } catch (error) {
        console.error('❌ Error actualizando métricas de proveedores y productos:', error);
    }
}

// ===== FUNCIÓN CORREGIDA PARA OBTENER PRECIO ANTERIOR =====
async function getPrecioAnterior(productoMaestroId, fechaActual) {
    try {
        console.log(`🔍 === DEBUG getPrecioAnterior ===`);
        console.log(`📝 Producto maestro ID: ${productoMaestroId}`);
        console.log(`📅 Fecha actual: ${fechaActual}`);
        
        if (!productoMaestroId) {
            console.log(`❌ No hay producto_maestro_id, retornando null`);
            return null;
        }
        
        const fechaComparacion = fechaActual ? fechaActual.split('T')[0] : new Date().toISOString().split('T')[0];
        console.log(`📅 Buscando precios anteriores a: ${fechaComparacion}`);
        
        // 🎯 BUSCAR EN HISTORIAL DE PRECIOS (CORREGIDO - POR FECHA DE FACTURA)
        console.log(`🔍 Buscando en historial_precios_productos...`);
        const { data: historial, error } = await supabaseClient
            .from('historial_precios_productos')
            .select('id, precio_unitario_sin_iva, fecha_compra, numero_documento, documento_id, fecha_registro')
            .eq('producto_maestro_id', productoMaestroId)
            .order('fecha_compra', { ascending: false }) // Ordenar por fecha_compra (fecha de factura) para obtener los más recientes
            .limit(10); // Obtener más registros para debug
            
        if (error) {
            console.error('❌ Error obteniendo historial:', error);
            return null;
        }
        
        console.log(`📊 Historial encontrado (${historial?.length || 0} registros):`);
        if (historial && historial.length > 0) {
            historial.forEach((h, i) => {
                console.log(`   ${i + 1}. Fecha: ${h.fecha_compra}, Precio: ${h.precio_unitario_sin_iva}€, Doc: ${h.numero_documento || 'N/A'}, Registro: ${h.fecha_registro}`);
            });
        } else {
            console.log(`   ℹ️ No hay registros en historial_precios_productos`);
            return null;
        }
        
        // 🎯 LÓGICA MEJORADA: Buscar precios diferentes al actual
        if (historial && historial.length >= 2) {
            const precioActual = historial[0].precio_unitario_sin_iva;
            console.log(`💰 Precio actual: ${precioActual}€`);
            
            // Buscar el primer precio diferente al actual
            for (let i = 1; i < historial.length; i++) {
                const precioComparar = historial[i].precio_unitario_sin_iva;
                if (Math.abs(precioActual - precioComparar) > 0.01) { // Si el precio es diferente
                    console.log(`✅ Precio anterior encontrado: ${precioComparar}€ (fecha: ${historial[i].fecha_compra}, doc: ${historial[i].numero_documento || 'N/A'})`);
                    console.log(`📊 Precio actual vs anterior: ${precioActual}€ vs ${precioComparar}€`);
                    return precioComparar;
                }
            }
            
            // Si todos los precios son iguales
            console.log(`ℹ️ Todos los precios son iguales (${precioActual}€), no hay variación`);
            return null;
        } else if (historial && historial.length === 1) {
            console.log(`ℹ️ Primera compra de este producto (solo 1 registro en historial)`);
            return null;
        } else {
            console.log(`ℹ️ No hay historial de precios para este producto`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error en getPrecioAnterior:', error);
        return null;
    }
}

// ===== FUNCIÓN PARA OBTENER CLASE DE COLOR SEGÚN CAMBIO DE PRECIO =====
function getPriceChangeClass(precioActual, precioAnterior) {
    if (!precioAnterior) return 'price-first'; // Primera compra
    
    if (Math.abs(precioActual - precioAnterior) < 0.01) {
        return 'price-same'; // Verde - precio igual
    } else {
        return 'price-changed'; // Rojo - precio cambió
    }
}

// Función auxiliar para actualizar valor de métrica
function updateMetricValue(metricKey, value) {
    const element = document.querySelector(`[data-metric="${metricKey}"] .metric-value`);
    if (element) {
        element.textContent = value;
    }
}

// Función auxiliar para actualizar tendencia de métrica
function updateMetricTrend(metricKey, trend) {
    const element = document.querySelector(`[data-metric="${metricKey}"] .metric-trend`);
    if (element) {
        element.textContent = trend;
    }
}

// ===== INICIALIZACIÓN DE GRÁFICOS ===== 

// Variables globales para los gráficos
let proveedorChart = null;
let categoriaChart = null;
let evolutionChart = null;

// ===== FUNCIÓN PARA CARGAR CHART.JS DE FORMA ROBUSTA =====
async function ensureChartJSLoaded() {
    if (typeof Chart !== 'undefined') {
        console.log('✅ Chart.js ya está disponible');
        return true;
    }
    
    console.log('📥 Intentando cargar Chart.js...');
    
    // ✅ LISTA DE CDNs CON CHART.JS 3.x (COMPATIBLE)
    const chartCDNs = [
        'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
        'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
        'https://unpkg.com/chart.js@3.9.1/dist/chart.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.8.0/chart.min.js',
        'https://cdn.jsdelivr.net/npm/chart.js@3.8.0/dist/chart.min.js'
    ];
    
    for (let i = 0; i < chartCDNs.length; i++) {
        try {
            console.log(`🔄 Intentando CDN ${i + 1}: ${chartCDNs[i]}`);
            
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = chartCDNs[i];
                script.type = 'text/javascript';
                script.async = true;
                
                // Timeout de 10 segundos para cada CDN (más rápido)
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout cargando desde ${chartCDNs[i]}`));
                }, 10000);
                
                script.onload = () => {
                    clearTimeout(timeout);
                    console.log(`✅ Chart.js cargado desde: ${chartCDNs[i]}`);
                    resolve();
                };
                
                script.onerror = () => {
                    clearTimeout(timeout);
                    console.warn(`⚠️ Falló CDN ${i + 1}: ${chartCDNs[i]}`);
                    reject(new Error(`CDN ${i + 1} falló`));
                };
                
                document.head.appendChild(script);
            });
            
            // Esperar un poco más para asegurar que se inicialice
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar que se cargó correctamente
            if (typeof Chart !== 'undefined') {
                console.log('✅ Chart.js verificado y disponible');
                return true;
            } else {
                console.warn(`⚠️ Chart.js no disponible después de cargar desde ${chartCDNs[i]}`);
                // Intentar con el siguiente CDN
                continue;
            }
            
        } catch (error) {
            console.warn(`❌ Error cargando desde CDN ${i + 1}:`, error);
            if (i === chartCDNs.length - 1) {
                throw new Error('No se pudo cargar Chart.js desde ningún CDN');
            }
        }
    }
    
    throw new Error('No se pudo cargar Chart.js desde ningún CDN');
}

// Función para inicializar todos los gráficos
async function initializeCharts(facturas) {
    try {
        console.log('📈 Inicializando gráficos...');
        console.log('📊 Datos de facturas recibidos:', facturas ? facturas.length : 0);
        
        // ✅ Verificar estado inicial de Chart.js
        const initialStatus = checkChartJSStatus();
        console.log('📊 Estado inicial de Chart.js:', initialStatus);
        
        // ✅ Asegurar que Chart.js esté disponible
        await ensureChartJSLoaded();
        
        // ✅ Verificar estado después de cargar
        const finalStatus = checkChartJSStatus();
        console.log('📊 Estado final de Chart.js:', finalStatus);
        
        if (!finalStatus.chartAvailable) {
            throw new Error('Chart.js no está disponible después de intentar cargarlo');
        }
        
        console.log('✅ Chart.js disponible, iniciando gráficos...');
        
        // Verificar que los elementos HTML existan
        const proveedorCtx = document.getElementById('proveedorChart');
        const categoriaCtx = document.getElementById('categoriaChart');
        const evolutionCtx = document.getElementById('evolutionChart');
        
        console.log('🔍 Elementos HTML encontrados:', {
            proveedorChart: !!proveedorCtx,
            categoriaChart: !!categoriaCtx,
            evolutionChart: !!evolutionCtx
        });
        
        if (!proveedorCtx || !categoriaCtx || !evolutionCtx) {
            throw new Error('No se encontraron todos los elementos de gráficos');
        }
        
        // Inicializar gráficos uno por uno con manejo de errores individual
        let chartsInitialized = 0;
        const totalCharts = 3;
        
        try {
            await initProveedorChart(facturas);
            console.log('✅ Gráfico de proveedores inicializado');
            chartsInitialized++;
        } catch (error) {
            console.error('❌ Error en gráfico de proveedores:', error);
        }
        
        try {
            await initCategoriaChart();
            console.log('✅ Gráfico de categorías inicializado');
            chartsInitialized++;
        } catch (error) {
            console.error('❌ Error en gráfico de categorías:', error);
        }
        
        try {
            await initEvolutionChart(facturas);
            console.log('✅ Gráfico de evolución inicializado');
            chartsInitialized++;
        } catch (error) {
            console.error('❌ Error en gráfico de evolución:', error);
        }
        
        console.log(`✅ ${chartsInitialized}/${totalCharts} gráficos inicializados correctamente`);
        
        if (chartsInitialized === 0) {
            throw new Error('No se pudo inicializar ningún gráfico');
        }
        
    } catch (error) {
        console.error('❌ Error inicializando gráficos:', error);
        showNotification('Error al cargar los gráficos: ' + error.message, 'error');
        
        // Mostrar información de debug
        console.log('🔍 Debug - Estado actual de Chart.js:');
        checkChartJSStatus();
    }
}

// Gráfico de distribución por proveedor
async function initProveedorChart(facturas) {
    try {
        const ctx = document.getElementById('proveedorChart');
        if (!ctx) {
            console.error('❌ Elemento proveedorChart no encontrado');
            return;
        }
        
        console.log('📊 Inicializando gráfico de proveedores con', facturas ? facturas.length : 0, 'facturas');
        
        // Calcular datos
        const proveedorData = {};
        if (facturas && Array.isArray(facturas)) {
            facturas.forEach(f => {
                const proveedor = f.proveedor_nombre || 'Sin proveedor';
                const importe = parseFloat(f.total_factura) || 0;
                proveedorData[proveedor] = (proveedorData[proveedor] || 0) + importe;
            });
        }
        
        // Si no hay datos, usar datos de ejemplo
        if (Object.keys(proveedorData).length === 0) {
            console.log('📊 No hay datos de facturas, usando datos de ejemplo');
            proveedorData['Proveedor A'] = 1500;
            proveedorData['Proveedor B'] = 1200;
            proveedorData['Proveedor C'] = 800;
            proveedorData['Proveedor D'] = 600;
            proveedorData['Proveedor E'] = 400;
        }
        
        // Tomar top 10 proveedores
        const sortedProveedores = Object.entries(proveedorData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        const labels = sortedProveedores.map(([proveedor]) => 
            proveedor.length > 20 ? proveedor.substring(0, 20) + '...' : proveedor
        );
        const data = sortedProveedores.map(([,total]) => total);
        
        console.log('📊 Datos del gráfico de proveedores:', { labels, data });
        
        // Crear gráfico
        if (proveedorChart) {
            proveedorChart.destroy();
        }
        
        proveedorChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#00D4AA', '#1DE9B6', '#14B8A6', '#10B981', '#26D0CE',
                        '#0F2027', '#2C3E50', '#64748b', '#94a3b8', '#cbd5e1'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#00D4AA'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                family: 'Inter',
                                size: 10,
                                weight: '500'
                            },
                            color: '#64748b'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#0F2027',
                        bodyColor: '#64748b',
                        borderColor: '#00D4AA',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        titleFont: {
                            size: 12
                        },
                        bodyFont: {
                            size: 11
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = formatCurrency(context.parsed);
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
        
        console.log('✅ Gráfico de proveedores creado exitosamente');
        
    } catch (error) {
        console.error('❌ Error creando gráfico de proveedores:', error);
        throw error;
    }
}

// Gráfico de categorías (simulado - necesita datos de productos)
async function initCategoriaChart() {
    const ctx = document.getElementById('categoriaChart');
    if (!ctx) return;
    
    try {
        // Obtener datos de categorías de productos
        const { data: productos, error } = await supabaseClient
            .from('productos_maestro')
            .select('categoria_principal')
            .eq('restaurante_id', CONFIG.TENANT.RESTAURANTE_ID);
            
        let categoriaData = {};
        
        if (!error && productos) {
            productos.forEach(p => {
                const categoria = p.categoria_principal || 'General';
                categoriaData[categoria] = (categoriaData[categoria] || 0) + 1;
            });
        } else {
            // Datos de ejemplo si no hay productos
            categoriaData = {
                'General': 10,
                'Condimentos': 8,
                'Carnes': 6,
                'Verduras': 5,
                'Bebidas': 4
            };
        }
        
        const labels = Object.keys(categoriaData);
        const data = Object.values(categoriaData);
        
        if (categoriaChart) {
            categoriaChart.destroy();
        }
        
        categoriaChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Productos por categoría',
                    data: data,
                    backgroundColor: [
                        '#00D4AA', '#1DE9B6', '#14B8A6', '#10B981', '#26D0CE',
                        '#0F2027', '#2C3E50', '#64748b', '#94a3b8', '#cbd5e1'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    hoverBackgroundColor: [
                        '#00BFA5', '#00D4AA', '#0F766E', '#059669', '#0891b2',
                        '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#0F2027',
                        bodyColor: '#64748b',
                        borderColor: '#00D4AA',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        titleFont: {
                            size: 12
                        },
                        bodyFont: {
                            size: 11
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 10
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(100, 116, 139, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 1,
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 10
                            }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando gráfico de categorías:', error);
    }
}

// Gráfico de evolución de facturas
async function initEvolutionChart(facturas) {
    try {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) {
            console.error('❌ Elemento evolutionChart no encontrado');
            return;
        }
        
        console.log('📈 Inicializando gráfico de evolución con', facturas ? facturas.length : 0, 'facturas');
        
        // Generar últimos 30 días
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last30Days.push(date.toISOString().split('T')[0]);
        }
        
        // Agrupar facturas por día
        const facturasPorDia = {};
        const importesPorDia = {};
        
        last30Days.forEach(day => {
            facturasPorDia[day] = 0;
            importesPorDia[day] = 0;
        });
        
        if (facturas && Array.isArray(facturas)) {
            facturas.forEach(f => {
                const day = f.fecha_factura ? f.fecha_factura.split('T')[0] : null;
                if (day && facturasPorDia.hasOwnProperty(day)) {
                    facturasPorDia[day]++;
                    importesPorDia[day] += parseFloat(f.total_factura) || 0;
                }
            });
        }
        
        // Si no hay datos, usar datos de ejemplo
        if (Object.values(facturasPorDia).every(val => val === 0)) {
            console.log('📈 No hay datos de facturas, usando datos de ejemplo');
            // Generar datos de ejemplo para los últimos 30 días
            last30Days.forEach((day, index) => {
                facturasPorDia[day] = Math.floor(Math.random() * 5) + 1;
                importesPorDia[day] = Math.floor(Math.random() * 1000) + 100;
            });
        }
        
        const labels = last30Days.map(day => {
            const date = new Date(day);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        });
        
        console.log('📈 Datos del gráfico de evolución:', { 
            labels: labels.length, 
            facturas: Object.values(facturasPorDia).slice(0, 5),
            importes: Object.values(importesPorDia).slice(0, 5)
        });
        
        if (evolutionChart) {
            evolutionChart.destroy();
        }
        
        evolutionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de facturas',
                    data: Object.values(facturasPorDia),
                    borderColor: '#00D4AA',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y',
                    pointBackgroundColor: '#00D4AA',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                }, {
                    label: 'Importe total (€)',
                    data: Object.values(importesPorDia),
                    borderColor: '#14B8A6',
                    backgroundColor: 'rgba(20, 184, 166, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#14B8A6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(100, 116, 139, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 10
                            }
                        },
                        title: {
                            display: true,
                            text: 'Fecha',
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(100, 116, 139, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 10
                            }
                        },
                        title: {
                            display: true,
                            text: 'Número de facturas',
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '600'
                            }
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 10
                            }
                        },
                        title: {
                            display: true,
                            text: 'Importe (€)',
                            color: '#64748b',
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '600'
                            }
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                family: 'Inter',
                                size: 10,
                                weight: '500'
                            },
                            color: '#64748b'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#0F2027',
                        bodyColor: '#64748b',
                        borderColor: '#00D4AA',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        titleFont: {
                            size: 12
                        },
                        bodyFont: {
                            size: 11
                        },
                        callbacks: {
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                const fecha = last30Days[index];
                                return `Fecha: ${fecha}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
        
        console.log('✅ Gráfico de evolución creado exitosamente');
        
    } catch (error) {
        console.error('❌ Error creando gráfico de evolución:', error);
        throw error;
    }
}

// ===== MODAL HÍBRIDO DE PDF =====
async function openInvoiceAdvanced(facturaId) {
    try {
        console.log('🚀 ===== INICIO OPENINVOICEADVANCED =====');
        console.log('🚀 Abriendo modal híbrido para factura:', facturaId);
        
        // ✅ VERIFICAR INICIALIZACIÓN
        if (!window.hybridPDFModal) {
            console.error('❌ Modal híbrido no inicializado');
            showNotification('Modal híbrido no disponible. Recargando página...', 'warning');
            setTimeout(() => window.location.reload(), 1500);
            return;
        }
        
        // ✅ BUSCAR LA FACTURA
        const factura = (window.facturasData || []).find(f => f.id === facturaId);
        if (!factura) {
            throw new Error('Factura no encontrada en los datos cargados');
        }
        
        console.log('✅ Factura encontrada:', factura);
        
        // ✅ VERIFICAR COORDENADAS
        const hasCoordinates = factura.coordenadas_campos && 
            Object.keys(factura.coordenadas_campos).length > 0;
            
        if (!hasCoordinates) {
            showNotification('Esta factura no tiene coordenadas de campos disponibles', 'warning');
            // Abrir modal normal en su lugar
            openFacturaModal(facturaId);
            return;
        }
        
        // ✅ PROCESAR COORDENADAS
        const coordinates = {};
        Object.entries(factura.coordenadas_campos).forEach(([fieldName, coordData]) => {
            if (coordData && typeof coordData === 'object' && 
                coordData.x !== undefined && coordData.y !== undefined && 
                coordData.width !== undefined && coordData.height !== undefined) {
                coordinates[fieldName] = coordData;
                console.log(`✅ Coordenada válida: ${fieldName}`, coordData);
            }
        });
        
        console.log(`📍 Total coordenadas válidas: ${Object.keys(coordinates).length}`);
        
        if (Object.keys(coordinates).length === 0) {
            showNotification('No se encontraron coordenadas válidas', 'warning');
            openFacturaModal(facturaId);
            return;
        }
        
        // ✅ OBTENER URL DEL PDF
        const documentoId = factura.documento_id;
        if (!documentoId) {
            throw new Error('No se encontró documento_id en la factura');
        }
        
        const { data: documentoInfo, error: docError } = await supabaseClient
            .from('documentos')
            .select('url_storage')
            .eq('id', documentoId)
            .single();
            
        if (docError || !documentoInfo || !documentoInfo.url_storage) {
            throw new Error(`Error obteniendo PDF: ${docError?.message || 'URL no encontrada'}`);
        }
        
        const pdfUrl = documentoInfo.url_storage;
        console.log('🔗 URL del PDF:', pdfUrl);
        
        // ✅ PREPARAR DATOS EXTRAÍDOS
        const toNumber = (v) => (v == null ? 0 : Number(v));
        const extractedData = {
            numero_factura: factura.numero_factura ?? 'N/A',
            proveedor_nombre: factura.proveedor_nombre ?? 'N/A',
            proveedor_cif: factura.proveedor_cif ?? 'N/A',
            fecha_factura: factura.fecha_factura ?? 'N/A',
            base_imponible: toNumber(factura.base_imponible ?? factura.importe_neto),
            cuota_iva: toNumber(factura.cuota_iva ?? factura.iva),
            total_factura: toNumber(factura.total_factura),
            retencion: toNumber(factura.retencion),
            confianza_global: factura.confianza_global ?? 0,
            confianza_proveedor: factura.confianza_proveedor ?? 0,
            confianza_datos_fiscales: factura.confianza_datos_fiscales ?? 0,
            confianza_importes: factura.confianza_importes ?? 0,
        };
        
        console.log('📊 Datos extraídos:', extractedData);
        
        // ✅ ABRIR MODAL NORMAL PRIMERO
        console.log('🔄 Abriendo modal base...');
        const modal = document.getElementById('facturaModal');
        if (!modal) {
            throw new Error('Modal de factura no encontrado en el DOM');
        }
        
        // Asegurar que el modal se ve correctamente
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // ✅ ACTUALIZAR TÍTULO DEL MODAL HÍBRIDO
        console.log('🎨 Actualizando título del modal híbrido...');
        updateModalHeader(factura, 'hybrid');
        
        // ✅ RELLENAR FORMULARIO
        console.log('📝 Rellenando formulario del modal...');
        await loadPdfFromFacturaId(facturaId);
        
        // ✅ DAR TIEMPO AL DOM PARA ESTABILIZARSE
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ ACTIVAR FUNCIONALIDADES HÍBRIDAS
        console.log('🎯 Activando funcionalidades híbridas...');
        await window.hybridPDFModal.open(pdfUrl, coordinates, extractedData);
        
        console.log('✅ Modal híbrido abierto correctamente');
        showNotification('Modal híbrido con coordenadas activado', 'success');
        
    } catch (error) {
        console.error('❌ Error en openInvoiceAdvanced:', error);
        showNotification(`Error abriendo modal avanzado: ${error.message}`, 'error');
        
        // Fallback: abrir modal normal
        try {
            openFacturaModal(facturaId);
        } catch (fallbackError) {
            console.error('❌ Error en fallback:', fallbackError);
        }
    }
}

// ===== FUNCIÓN DE PRUEBA DEL AGENTE IA =====
async function testAgente() {
    try {
        console.log('🤖 === PROBANDO AGENTE IA ===');
        console.log('📝 Pregunta: ¿Cuántas facturas tengo?');
        console.log('🏢 Restaurante ID:', CONFIG.TENANT.RESTAURANTE_ID);
        
        // Mostrar loading
        const btn = document.getElementById('testAgenteBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Probando...
        `;
        
        // Llamar a la Edge Function
        const { data, error } = await supabaseClient.functions.invoke('ask-my-invoices', {
            body: {
                pregunta: "¿Cuántas facturas tengo?",
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
            }
        });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Respuesta completa del agente:', data);
        
        // Mostrar resultado
        showNotification(`🤖 Agente IA: ${data.respuesta}`, 'success');
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Agente IA Respondió 🤖',
                `Respuesta: ${data.respuesta.substring(0, 100)}...`,
                { requireInteraction: true }
            );
        }
        
        // Mostrar detalles en consola
        console.log('📊 SQL generado:', data.sql);
        console.log('📊 Datos obtenidos:', data.datos);
        
    } catch (error) {
        console.error('❌ Error probando agente:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        const btn = document.getElementById('testAgenteBtn');
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"/>
                <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"/>
            </svg>
            Probar Agente IA
        `;
    }
}

// ===== FUNCIÓN PARA PROBAR CON PREGUNTAS PERSONALIZADAS =====
async function testAgenteConPregunta(pregunta) {
    try {
        console.log('🤖 === PROBANDO AGENTE IA CON PREGUNTA PERSONALIZADA ===');
        console.log('📝 Pregunta:', pregunta);
        console.log('🏢 Restaurante ID:', CONFIG.TENANT.RESTAURANTE_ID);
        
        // Llamar a la Edge Function
        const { data, error } = await supabaseClient.functions.invoke('ask-my-invoices', {
            body: {
                pregunta: pregunta,
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
            }
        });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Respuesta completa del agente:', data);
        
        // Mostrar resultado
        showNotification(`🤖 Agente IA: ${data.respuesta}`, 'success');
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Agente IA Respondió 🤖',
                `Respuesta: ${data.respuesta.substring(0, 100)}...`,
                { requireInteraction: true }
            );
        }
        
        // Mostrar detalles en consola
        console.log('📊 SQL generado:', data.sql);
        console.log('📊 Datos obtenidos:', data.datos);
        
        return data;
        
    } catch (error) {
        console.error('❌ Error probando agente:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
        throw error;
    }
}

// ===== CHAT AGENTE IA - FUNCIONES COMPLETAS =====
let chatHistory = [];

// Inicializar chat
function initChat() {
    console.log('💬 === INICIANDO CHAT AGENTE IA ===');
    
    const chatButton = document.getElementById('chatButton');
    const chatPanel = document.getElementById('chatPanel');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const quickQuestions = document.querySelectorAll('.quick-question');
    
    // Abrir/cerrar chat
    chatButton.addEventListener('click', () => {
        chatPanel.classList.add('active');
        chatInput.focus();
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Chat IA Abierto 💬',
                'El chat del agente IA está listo para ayudarte',
                { requireInteraction: false }
            );
        }
    });
    
    chatClose.addEventListener('click', () => {
        chatPanel.classList.remove('active');
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Chat IA Cerrado 💬',
                'El chat del agente IA se ha cerrado',
                { requireInteraction: false }
            );
        }
    });
    
    // Enviar mensaje con Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Enviar mensaje con botón
    chatSend.addEventListener('click', sendMessage);
    
    // Preguntas rápidas
    quickQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.getAttribute('data-question');
            addUserMessage(question);
            processMessage(question);
        });
    });
    
    console.log('✅ Chat inicializado correctamente');
}

// Añadir mensaje del usuario
function addUserMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Guardar en historial
    chatHistory.push({
        type: 'user',
        message: message,
        timestamp: new Date()
    });
}

// Añadir mensaje del agente
function addAgentMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent-message';
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Guardar en historial
    chatHistory.push({
        type: 'agent',
        message: message,
        timestamp: new Date()
    });
}

// Añadir mensaje de loading
function addLoadingMessage() {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent-message';
    messageDiv.id = 'loadingMessage';
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>🤔 Pensando...</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Remover mensaje de loading
function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Scroll al final del chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enviar mensaje
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Limpiar input
    chatInput.value = '';
    
    // Añadir mensaje del usuario
    addUserMessage(message);
    
    // Enviar notificación push si están habilitadas
    if (Notification.permission === 'granted') {
        sendCustomNotification(
            'Mensaje Enviado 💬',
            `Mensaje enviado al agente IA: ${message.substring(0, 50)}...`,
            { requireInteraction: false }
        );
    }
    
    // Procesar mensaje
    await processMessage(message);
}

// Procesar mensaje con el agente
async function processMessage(message) {
    try {
        // Mostrar loading
        addLoadingMessage();
        
        console.log('🤖 === PROCESANDO MENSAJE EN CHAT ===');
        console.log('📝 Mensaje:', message);
        
        // Llamar al agente
        const { data, error } = await supabaseClient.functions.invoke('ask-my-invoices', {
            body: {
                pregunta: message,
                restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
            }
        });
        
        // Remover loading
        removeLoadingMessage();
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Respuesta del agente:', data);
        
        // Añadir respuesta del agente
        addAgentMessage(data.respuesta);
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Agente IA Respondió 🤖',
                `Respuesta: ${data.respuesta.substring(0, 100)}...`,
                { requireInteraction: true }
            );
        }
        
    } catch (error) {
        console.error('❌ Error en chat:', error);
        removeLoadingMessage();
        addAgentMessage(`❌ Lo siento, ha ocurrido un error: ${error.message}`);
    }
}

// Inicializar chat cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que se cargue todo lo demás
    setTimeout(() => {
        initChat();
    }, 1000);
});

// ===== FUNCIÓN PARA RECARGAR GRÁFICOS =====
async function reloadCharts() {
    try {
        console.log('🔄 Recargando gráficos...');
        showNotification('Recargando gráficos...', 'info');
        
        // Obtener datos actuales de facturas
        const facturas = window.facturasData || [];
        console.log('📊 Datos de facturas disponibles para gráficos:', facturas.length);
        
        // Recargar gráficos
        await initializeCharts(facturas);
        
        showNotification('Gráficos recargados correctamente', 'success');
        
        // Enviar notificación push si están habilitadas
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                'Gráficos Recargados 📊',
                'Los gráficos del dashboard se han actualizado',
                { requireInteraction: false }
            );
        }
        
        console.log('✅ Gráficos recargados exitosamente');
        
    } catch (error) {
        console.error('❌ Error recargando gráficos:', error);
        showNotification('Error al recargar gráficos', 'error');
    }
}

// ===== FUNCIÓN PARA VERIFICAR ESTADO DE CHART.JS =====
function checkChartJSStatus() {
    const status = {
        chartAvailable: typeof Chart !== 'undefined',
        chartVersion: typeof Chart !== 'undefined' ? Chart.version : 'No disponible',
        chartConstructor: typeof Chart === 'function',
        chartPrototype: typeof Chart !== 'undefined' && Chart.prototype ? 'Disponible' : 'No disponible'
    };
    
    console.log('🔍 Estado de Chart.js:', status);
    return status;
}

// ===== FUNCIÓN PARA FORZAR RECARGA DE CHART.JS =====
async function forceReloadChartJS() {
    try {
        console.log('🔄 Forzando recarga de Chart.js...');
        showNotification('Forzando recarga de Chart.js...', 'info');
        
        // Verificar estado actual
        const statusBefore = checkChartJSStatus();
        console.log('📊 Estado antes de recargar:', statusBefore);
        
        // Limpiar gráficos existentes
        if (proveedorChart) {
            proveedorChart.destroy();
            proveedorChart = null;
        }
        if (categoriaChart) {
            categoriaChart.destroy();
            categoriaChart = null;
        }
        if (evolutionChart) {
            evolutionChart.destroy();
            evolutionChart = null;
        }
        
        // Forzar recarga de Chart.js
        await ensureChartJSLoaded();
        
        // Verificar estado después de recargar
        const statusAfter = checkChartJSStatus();
        console.log('📊 Estado después de recargar:', statusAfter);
        
        // Recargar gráficos con datos actuales
        const facturas = window.facturasData || [];
        await initializeCharts(facturas);
        
        showNotification('Chart.js recargado y gráficos actualizados', 'success');
        console.log('✅ Chart.js recargado exitosamente');
        
    } catch (error) {
        console.error('❌ Error forzando recarga de Chart.js:', error);
        showNotification('Error al recargar Chart.js: ' + error.message, 'error');
    }
}

// ===== FUNCIONES DE PRUEBA DE NOTIFICACIONES PUSH =====

// Función para probar notificación push desde el servidor
async function testServerPushNotification() {
    try {
        if (!Notification.permission === 'granted') {
            showNotification('❌ Las notificaciones no están habilitadas', 'error');
            return;
        }

        showNotification('🔄 Enviando notificación de prueba desde el servidor...', 'info');
        
        // Enviar notificación de prueba al servidor
        const result = await sendPushNotificationToUser(
            currentUser?.id,
            'Prueba de Notificación Push 🧪',
            'Esta es una notificación de prueba enviada desde el servidor',
            {
                requireInteraction: true,
                data: {
                    test: true,
                    timestamp: Date.now(),
                    source: 'dashboard-test'
                }
            }
        );
        
        showNotification('✅ Notificación de prueba enviada al servidor', 'success');
        console.log('📱 Resultado de prueba de notificación:', result);
        
    } catch (error) {
        console.error('❌ Error en prueba de notificación push:', error);
        showNotification('❌ Error en prueba: ' + error.message, 'error');
    }
}

// Función para probar notificación push a todo el restaurante
async function testRestaurantPushNotification() {
    try {
        if (!Notification.permission === 'granted') {
            showNotification('❌ Las notificaciones no están habilitadas', 'error');
            return;
        }

        if (!CONFIG.TENANT.RESTAURANTE_ID) {
            showNotification('❌ ID de restaurante no disponible', 'error');
            return;
        }

        showNotification('🔄 Enviando notificación de prueba al restaurante...', 'info');
        
        // Enviar notificación de prueba al restaurante
        const result = await sendPushNotificationToRestaurant(
            CONFIG.TENANT.RESTAURANTE_ID,
            'Notificación del Restaurante 🏢',
            'Esta es una notificación de prueba para todo el restaurante',
            {
                requireInteraction: false,
                data: {
                    test: true,
                    timestamp: Date.now(),
                    source: 'restaurant-test',
                    restaurante_id: CONFIG.TENANT.RESTAURANTE_ID
                }
            }
        );
        
        showNotification('✅ Notificación de prueba enviada al restaurante', 'success');
        console.log('🏢 Resultado de prueba de notificación al restaurante:', result);
        
    } catch (error) {
        console.error('❌ Error en prueba de notificación al restaurante:', error);
        showNotification('❌ Error en prueba: ' + error.message, 'error');
    }
}

// Función para obtener estadísticas de notificaciones
async function getNotificationStats() {
    try {
        const subscriptions = await getUserSubscriptions();
        
        const stats = {
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: subscriptions.filter(sub => sub.active !== false).length,
            lastSubscription: subscriptions.length > 0 ? subscriptions[0].created_at : null,
            browserSupport: {
                serviceWorker: 'serviceWorker' in navigator,
                pushManager: 'PushManager' in window,
                notifications: 'Notification' in window
            },
            permission: Notification.permission
        };
        
        console.log('📊 Estadísticas de notificaciones:', stats);
        
        // Mostrar estadísticas en una notificación
        if (Notification.permission === 'granted') {
            sendCustomNotification(
                '📊 Estadísticas de Notificaciones',
                `Suscripciones activas: ${stats.activeSubscriptions}/${stats.totalSubscriptions}`,
                { requireInteraction: true }
            );
        }
        
        return stats;
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
    }
}

// Función para limpiar todas las suscripciones de prueba
async function cleanupTestSubscriptions() {
    try {
        const subscriptions = await getUserSubscriptions();
        const testSubscriptions = subscriptions.filter(sub => 
            sub.subscription_data && 
            sub.subscription_data.data && 
            sub.subscription_data.data.test
        );
        
        if (testSubscriptions.length === 0) {
            showNotification('✅ No hay suscripciones de prueba para limpiar', 'info');
            return;
        }
        
        showNotification(`🔄 Limpiando ${testSubscriptions.length} suscripciones de prueba...`, 'info');
        
        for (const subscription of testSubscriptions) {
            await removeSubscription(subscription.id);
        }
        
        showNotification('✅ Suscripciones de prueba limpiadas correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error limpiando suscripciones de prueba:', error);
        showNotification('❌ Error limpiando suscripciones: ' + error.message, 'error');
    }
}

console.log('🚀 Sistema de notificaciones push completamente implementado');

// ===== MODO DESARROLLO =====
// Función para habilitar modo desarrollo (mostrar botones de prueba)
function enableDevelopmentMode() {
    const testButtons = document.querySelector('.notification-test-buttons');
    if (testButtons) {
        testButtons.style.display = 'flex';
        console.log('🔧 Modo desarrollo habilitado - Botones de prueba visibles');
    }
}

// Función para deshabilitar modo desarrollo
function disableDevelopmentMode() {
    const testButtons = document.querySelector('.notification-test-buttons');
    if (testButtons) {
        testButtons.style.display = 'none';
        console.log('🔧 Modo desarrollo deshabilitado - Botones de prueba ocultos');
    }
}

// Habilitar modo desarrollo en desarrollo (comentar en producción)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Habilitar modo desarrollo automáticamente en localhost
    setTimeout(() => {
        enableDevelopmentMode();
    }, 2000);
}

// Función global para alternar modo desarrollo (útil para debugging)
window.toggleDevelopmentMode = function() {
    const testButtons = document.querySelector('.notification-test-buttons');
    if (testButtons && testButtons.style.display === 'none') {
        enableDevelopmentMode();
    } else {
        disableDevelopmentMode();
    }
};

// Función global para limpiar suscripciones de prueba
window.cleanupTestSubscriptions = cleanupTestSubscriptions;

// Función global para obtener estadísticas
window.getNotificationStats = getNotificationStats;

// ===== 🆕 FUNCIÓN DE DIAGNÓSTICO DE ALBARANES =====
function diagnosticarAlbaranes() {
    console.log('🔍 ===== DIAGNÓSTICO COMPLETO DE ALBARANES =====');
    
    // 1. Verificar si las funciones están definidas
    console.log('✅ Función ejecutarCotejoAutomatico:', typeof ejecutarCotejoAutomatico);
    console.log('✅ Función toggleAlbaranesRow:', typeof toggleAlbaranesRow);
    console.log('✅ Función cargarAlbaranesParaFactura:', typeof cargarAlbaranesParaFactura);
    console.log('✅ Función renderizarAlbaranesEnTabla:', typeof renderizarAlbaranesEnTabla);
    
    // 2. Verificar si la columna de albaranes existe en la tabla
    const columnaAlbaranes = document.querySelector('[data-field="albaranes"]');
    console.log('✅ Columna de albaranes en HTML:', columnaAlbaranes ? 'SÍ existe' : 'NO existe');
    
    // 3. Verificar si hay botones de albaranes en la tabla
    const botonesAlbaranes = document.querySelectorAll('.btn-albaranes');
    console.log(`✅ Botones de albaranes en tabla: ${botonesAlbaranes.length} encontrados`);
    
    // 4. Verificar si hay filas expandibles de albaranes
    const filasAlbaranes = document.querySelectorAll('.albaranes-row');
    console.log(`✅ Filas expandibles de albaranes: ${filasAlbaranes.length} encontradas`);
    
    // 5. Verificar si hay botones de cotejo automático
    const botonesCotejo = document.querySelectorAll('.btn-albaranes-action');
    console.log(`✅ Botones de cotejo automático: ${botonesCotejo.length} encontrados`);
    
    // 6. Verificar si la tabla tiene el número correcto de columnas
    const headers = document.querySelectorAll('.facturas-table th');
    console.log(`✅ Número de columnas en la tabla: ${headers.length}`);
    headers.forEach((header, index) => {
        console.log(`   Columna ${index + 1}: ${header.textContent.trim()}`);
    });
    
    // 7. Verificar si hay datos de facturas
    const filasFacturas = document.querySelectorAll('.facturas-table tbody tr:not(.albaranes-row)');
    console.log(`✅ Filas de facturas en la tabla: ${filasFacturas.length} encontradas`);
    
    // 8. Verificar si hay errores en la consola
    console.log('✅ Verifica la consola para errores de JavaScript');
    
    console.log('🔍 ===== FIN DIAGNÓSTICO =====');
    
    // Mostrar resumen en pantalla
    const resumen = `
        🔍 DIAGNÓSTICO DE ALBARANES:
        
        ✅ Funciones definidas: ${typeof ejecutarCotejoAutomatico !== 'undefined' ? 'SÍ' : 'NO'}
        ✅ Columna en HTML: ${columnaAlbaranes ? 'SÍ' : 'NO'}
        ✅ Botones en tabla: ${botonesAlbaranes.length}
        ✅ Filas expandibles: ${filasAlbaranes.length}
        ✅ Botones de cotejo: ${botonesCotejo.length}
        ✅ Columnas totales: ${headers.length}
        ✅ Filas de facturas: ${filasFacturas.length}
        
        📋 Si algún valor es 0 o NO, hay un problema.
        🔄 Recarga la página (Ctrl+F5) y ejecuta de nuevo.
    `;
    
    alert(resumen);
}

// Función para probar la funcionalidad de albaranes
function probarAlbaranes() {
    console.log('🧪 ===== PROBANDO FUNCIONALIDAD DE ALBARANES =====');
    
    // 1. Buscar la primera factura en la tabla
    const primeraFactura = document.querySelector('.facturas-table tbody tr:not(.albaranes-row)');
    if (!primeraFactura) {
        console.error('❌ No se encontraron facturas en la tabla');
        return;
    }
    
    // 2. Obtener el ID de la factura
    const facturaId = primeraFactura.getAttribute('data-factura-id');
    console.log('✅ Factura encontrada con ID:', facturaId);
    
    // 3. Buscar el botón de albaranes de esta factura
    const botonAlbaranes = primeraFactura.querySelector('.btn-albaranes');
    if (!botonAlbaranes) {
        console.error('❌ No se encontró botón de albaranes en la primera factura');
        return;
    }
    
    console.log('✅ Botón de albaranes encontrado:', botonAlbaranes.outerHTML);
    
    // 4. Simular click en el botón
    console.log('🔄 Simulando click en botón de albaranes...');
    botonAlbaranes.click();
    
    // 5. Verificar si se expandió la fila
    setTimeout(() => {
        const filaExpandida = document.getElementById(`albaranes-row-${facturaId}`);
        if (filaExpandida && filaExpandida.style.display !== 'none') {
            console.log('✅ Fila de albaranes expandida correctamente');
            
            // 6. Buscar botón de cotejo automático
            const botonCotejo = filaExpandida.querySelector('.btn-albaranes-action');
            if (botonCotejo) {
                console.log('✅ Botón de cotejo automático encontrado:', botonCotejo.outerHTML);
            } else {
                console.error('❌ No se encontró botón de cotejo automático');
            }
        } else {
            console.error('❌ La fila de albaranes no se expandió');
        }
    }, 100);
    
    console.log('🧪 ===== FIN PRUEBA =====');
}

// Hacer las funciones disponibles globalmente
window.diagnosticarAlbaranes = diagnosticarAlbaranes;
window.probarAlbaranes = probarAlbaranes;

// Mostrar instrucciones en la consola
console.log('🔧 FUNCIONES DE DIAGNÓSTICO DISPONIBLES:');
console.log('🔧 diagnosticarAlbaranes() - Diagnóstico completo');
console.log('🔧 probarAlbaranes() - Prueba funcionalidad');
console.log('🔧 Ejecuta estas funciones en la consola para verificar el estado');

// ===== 🆕 BOTÓN FLOTANTE DE COTEJO AUTOMÁTICO =====
function crearBotonCotejoFloante() {
    // Crear botón flotante si no existe
    if (document.getElementById('boton-cotejo-flotante')) {
        return;
    }
    
    const botonFloante = document.createElement('div');
    botonFloante.id = 'boton-cotejo-flotante';
    botonFloante.innerHTML = `
        <button onclick="ejecutarCotejoManual()" title="Ejecutar Cotejo Automático">
            🔄 Cotejo Automático
        </button>
    `;
    
    // Estilos del botón flotante
    botonFloante.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        background: var(--bs-primary);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 15px 25px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    botonFloante.onmouseover = function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
    };
    
    botonFloante.onmouseout = function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    };
    
    document.body.appendChild(botonFloante);
    console.log('✅ Botón flotante de cotejo creado');
}

// Función para ejecutar cotejo para una factura específica
async function ejecutarCotejoParaFactura(facturaId) {
    try {
        console.log('🔄 Ejecutando cotejo para factura específica:', facturaId);
        
        // Mostrar notificación
        showNotification(`🔄 Ejecutando cotejo para factura ${facturaId}...`, 'info');
        
        // Verificar que tenemos un ID válido
        if (!facturaId) {
            showNotification('❌ ID de factura inválido', 'error');
            return;
        }
        
        // IMPORTANTE: Verificar si la factura existe en la base de datos
        console.log('🔍 Verificando si la factura existe en la base de datos...');
        
        // Llamar a la Edge Function
        const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/cotejo-inteligente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
            },
            body: JSON.stringify({
                facturaId: facturaId,
                background: false,
                forceReprocess: true
            })
        });
        
        const resultado = await response.json();
        console.log('✅ Respuesta del cotejo:', resultado);
        
        if (resultado.success) {
            const enlaces = resultado.enlaces_automaticos || 0;
            const sugerencias = resultado.sugerencias || 0;
            
            showNotification(`✅ Cotejo completado para factura ${facturaId}: ${enlaces} enlaces, ${sugerencias} sugerencias`, 'success');
            
            // Recargar albaranes para esta factura específica
            await actualizarEnlacesFactura(facturaId);
            
            // Actualizar contador en la tabla
            const contador = document.getElementById(`albaranes-count-${facturaId}`);
            if (contador) {
                contador.textContent = enlaces + sugerencias;
                contador.className = (enlaces + sugerencias) > 0 ? 'albaranes-count has-albaranes' : 'albaranes-count';
            }
            
        } else {
            showNotification(`❌ Error en cotejo: ${resultado.message}`, 'error');
            
            // Si la factura no se encuentra, mostrar ayuda
            if (resultado?.message && resultado.message.includes('no encontrada')) {
                showNotification('💡 Consejo: La factura puede no estar procesada completamente. Intenta recargar la página.', 'info');
            }
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando cotejo para factura:', facturaId, error);
        showNotification(`❌ Error ejecutando cotejo para factura ${facturaId}`, 'error');
    }
}

// Función para ejecutar cotejo manual (mantenida para compatibilidad)
async function ejecutarCotejoManual() {
    try {
        console.log('🔄 Ejecutando cotejo manual...');
        
        // Mostrar notificación
        showNotification('🔄 Ejecutando cotejo automático...', 'info');
        
        // Obtener la primera factura disponible
        const primeraFactura = document.querySelector('.facturas-table tbody tr:not(.albaranes-row)');
        if (!primeraFactura) {
            showNotification('❌ No se encontraron facturas para procesar', 'error');
            return;
        }
        
        // Obtener el ID correcto de la factura (documento_id)
        let facturaId = primeraFactura.getAttribute('data-factura-id');
        
        // Si no hay data-factura-id, intentar obtener el ID de la fila
        if (!facturaId) {
            const facturaRow = primeraFactura.querySelector('td:last-child .btn-avanzado');
            if (facturaRow) {
                const onclick = facturaRow.getAttribute('onclick');
                const match = onclick.match(/openInvoiceAdvanced\('([^']+)'\)/);
                if (match) {
                    facturaId = match[1];
                }
            }
        }
        
        // Verificar que tenemos un ID válido
        if (!facturaId) {
            showNotification('❌ No se pudo obtener el ID de la factura', 'error');
            return;
        }
        
        console.log('✅ Ejecutando cotejo para factura (documento_id):', facturaId);
        
        // Llamar a la Edge Function
        const response = await fetch('https://yurqgcpgwsgdnxnpyxes.supabase.co/functions/v1/cotejo-inteligente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
            },
            body: JSON.stringify({
                facturaId: facturaId,
                background: false,
                forceReprocess: true
            })
        });
        
        const resultado = await response.json();
        console.log('✅ Respuesta del cotejo:', resultado);
        
        if (resultado.success) {
            showNotification(`✅ Cotejo completado: ${resultado.enlaces_automaticos || 0} enlaces creados`, 'success');
            
            // Recargar albaranes para todas las facturas
            await recargarAlbaranesTodasFacturas();
            
        } else {
            showNotification(`❌ Error en cotejo: ${resultado.message}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando cotejo manual:', error);
        showNotification('❌ Error ejecutando cotejo automático', 'error');
    }
}

// Función para verificar facturas disponibles en la base de datos
async function verificarFacturasDisponibles() {
    try {
        console.log('🔍 Verificando facturas disponibles en la base de datos...');
        
        const { data: facturas, error } = await supabaseClient
            .from('datos_extraidos_facturas')
            .select('id, numero_factura, proveedor_nombre, fecha_factura, total_factura')
            .limit(5);
            
        if (error) {
            console.error('❌ Error obteniendo facturas:', error);
            return;
        }
        
        console.log(`✅ ${facturas?.length || 0} facturas encontradas en la base de datos:`);
        facturas?.forEach((factura, index) => {
            console.log(`   ${index + 1}. ID: ${factura.id}, Número: ${factura.numero_factura}, Proveedor: ${factura.proveedor_nombre}`);
        });
        
        // Mostrar en pantalla
        if (facturas && facturas.length > 0) {
            showNotification(`✅ ${facturas.length} facturas disponibles en la base de datos`, 'success');
        } else {
            showNotification('❌ No hay facturas en la base de datos', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error verificando facturas:', error);
    }
}

// Función para recargar albaranes de todas las facturas
async function recargarAlbaranesTodasFacturas() {
    try {
        console.log('🔄 Recargando albaranes de todas las facturas...');
        
        const facturas = document.querySelectorAll('.facturas-table tbody tr:not(.albaranes-row)');
        
        for (const factura of facturas) {
            const facturaId = factura.getAttribute('data-factura-id');
            if (facturaId) {
                await actualizarEnlacesFactura(facturaId);
            }
        }
        
        console.log('✅ Albaranes recargados para todas las facturas');
        
    } catch (error) {
        console.error('❌ Error recargando albaranes:', error);
    }
}

// Función para forzar mostrar botones de cotejo
function forzarMostrarBotonesCotejo() {
    console.log('🔧 Forzando mostrar botones de cotejo...');
    
    // Buscar todas las filas expandibles de albaranes
    const filasAlbaranes = document.querySelectorAll('.albaranes-row');
    
    filasAlbaranes.forEach((fila, index) => {
        // Mostrar la fila
        fila.style.display = 'table-row';
        
        // Buscar y verificar botones
        const botonCotejo = fila.querySelector('.btn-albaranes-action');
        const botonFacturaDirecta = fila.querySelector('.btn-albaranes-action.secondary');
        
        if (botonCotejo) {
            console.log(`✅ Botón cotejo encontrado en fila ${index + 1}`);
            botonCotejo.style.display = 'inline-flex';
        } else {
            console.log(`❌ Botón cotejo NO encontrado en fila ${index + 1}`);
        }
        
        if (botonFacturaDirecta) {
            console.log(`✅ Botón factura directa encontrado en fila ${index + 1}`);
            botonFacturaDirecta.style.display = 'inline-flex';
        } else {
            console.log(`❌ Botón factura directa NO encontrado en fila ${index + 1}`);
        }
    });
    
    console.log(`🔧 ${filasAlbaranes.length} filas de albaranes procesadas`);
}

// Crear botón flotante cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        crearBotonCotejoFloante();
        console.log('✅ Botón flotante de cotejo habilitado');
    }, 2000);
});

// Hacer las funciones disponibles globalmente
window.ejecutarCotejoManual = ejecutarCotejoManual;
window.ejecutarCotejoParaFactura = ejecutarCotejoParaFactura;
window.forzarMostrarBotonesCotejo = forzarMostrarBotonesCotejo;
window.recargarAlbaranesTodasFacturas = recargarAlbaranesTodasFacturas;
window.verificarFacturasDisponibles = verificarFacturasDisponibles;

// Mostrar instrucciones en la consola
console.log('🔧 FUNCIONES DE COTEJO HABILITADAS:');
console.log('🔧 ejecutarCotejoManual() - Ejecuta cotejo automático');
console.log('🔧 forzarMostrarBotonesCotejo() - Muestra botones ocultos');
console.log('🔧 recargarAlbaranesTodasFacturas() - Recarga todos los albaranes');
console.log('🔧 Botón flotante creado en la esquina inferior derecha');