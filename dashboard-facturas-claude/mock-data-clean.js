// ===== MOCK DATA - DATOS REALISTAS PARA TESTING =====

// Datos de ejemplo basados en tu estructura real de BD
const mockFacturas = [
    {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        documento_id: "doc-001",
        restaurante_id: "rest-madaco-001", 
        numero_factura: "FAC-2024-1301",
        proveedor_nombre: "MADACO 2019, S.L.U.",
        proveedor_cif: "B10824431",
        proveedor_direccion: "CL GESSAMÍ Nº 13, 08397 PINEDA DE MAR",
        fecha_factura: "2024-11-12",
        fecha_vencimiento: "2024-12-12",
        total_factura: 1534.39,
        base_imponible: 1387.40,
        total_iva: 147.00,
        tipo_iva: 21,
        confianza_global: 0.85,
        confianza_proveedor: 0.95,
        confianza_datos_fiscales: 0.82,
        confianza_importes: 0.88,
        requiere_revision: false,
        campos_con_baja_confianza: [],
        estado: 'processed',
        fecha_extraccion: "2024-11-12T10:30:00Z",
        coordenadas_campos: {
            "proveedor_nombre": {"x": 50, "y": 120, "width": 200, "height": 25},
            "proveedor_cif": {"x": 50, "y": 145, "width": 100, "height": 18},
            "numero_factura": {"x": 350, "y": 80, "width": 120, "height": 20},
            "fecha_factura": {"x": 350, "y": 100, "width": 100, "height": 18},
            "total_factura": {"x": 400, "y": 600, "width": 100, "height": 20},
            "base_imponible": {"x": 400, "y": 580, "width": 100, "height": 18},
            "total_iva": {"x": 400, "y": 590, "width": 80, "height": 18}
        },
        productos: [
            {
                id: "prod-008",
                linea_numero: 1,
                descripcion_original: "SOLOMILLO DE TERNERA KG",
                cantidad: 5,
                unidad_medida: "kg",
                precio_unitario_sin_iva: 28.50,
                precio_total_linea_sin_iva: 142.50,
                tipo_iva: 10,
                confianza_linea: 0.91,
                coordenadas_linea: {"x": 48, "y": 185, "width": 490, "height": 20}
            },
            {
                id: "prod-009",
                linea_numero: 2,
                descripcion_original: "ENTRECOT DE TERNERA KG",
                cantidad: 8,
                unidad_medida: "kg",
                precio_unitario_sin_iva: 24.75,
                precio_total_linea_sin_iva: 198.00,
                tipo_iva: 10,
                confianza_linea: 0.86,
                coordenadas_linea: {"x": 48, "y": 205, "width": 490, "height": 20}
            },
            {
                id: "prod-010",
                linea_numero: 3,
                descripcion_original: "COSTILLA DE CERDO KG",
                cantidad: 12,
                unidad_medida: "kg",
                precio_unitario_sin_iva: 15.20,
                precio_total_linea_sin_iva: 182.40,
                tipo_iva: 10,
                confianza_linea: 0.93,
                coordenadas_linea: {"x": 48, "y": 225, "width": 490, "height": 20}
            }
        ]
    },
    {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        documento_id: "doc-002",
        restaurante_id: "rest-madaco-001",
        numero_factura: "INV-2024-0542",
        proveedor_nombre: "COCA-COLA EUROPEAN PARTNERS ESPAÑA, S.L.",
        proveedor_cif: "A28174363", 
        proveedor_direccion: "C/ RIBERA DEL LOIRA, 54-56, 28042 MADRID",
        fecha_factura: "2024-11-13",
        fecha_vencimiento: "2024-12-13",
        total_factura: 2156.78,
        base_imponible: 1781.14,
        total_iva: 375.64,
        tipo_iva: 21,
        confianza_global: 0.72,
        confianza_proveedor: 0.88,
        confianza_datos_fiscales: 0.65,
        confianza_importes: 0.91,
        requiere_revision: true,
        campos_con_baja_confianza: ["numero_factura", "fecha_vencimiento"],
        estado: 'pending',
        fecha_extraccion: "2024-11-13T14:22:00Z",
        coordenadas_campos: {
            "proveedor_nombre": {"x": 45, "y": 110, "width": 280, "height": 30},
            "numero_factura": {"x": 380, "y": 85, "width": 140, "height": 22},
            "total_factura": {"x": 420, "y": 650, "width": 110, "height": 24}
        },
        productos: [
            {
                id: "prod-004",
                linea_numero: 1,
                descripcion_original: "COCA-COLA ZERO 2L PET",
                cantidad: 24,
                unidad_medida: "unidad",
                precio_unitario_sin_iva: 1.85,
                precio_total_linea_sin_iva: 44.40,
                tipo_iva: 21,
                confianza_linea: 0.94,
                coordenadas_linea: {"x": 45, "y": 190, "width": 520, "height": 20}
            },
            {
                id: "prod-005",
                linea_numero: 2,
                descripcion_original: "FANTA NARANJA 2L PET",
                cantidad: 12,
                unidad_medida: "unidad", 
                precio_unitario_sin_iva: 1.75,
                precio_total_linea_sin_iva: 21.00,
                tipo_iva: 21,
                confianza_linea: 0.87,
                coordenadas_linea: {"x": 45, "y": 210, "width": 520, "height": 20}
            }
        ]
    }
];

// Métricas calculadas automáticamente
const mockMetrics = {
    totalFacturas: mockFacturas.length,
    pendientesRevision: mockFacturas.filter(f => f.requiere_revision).length,
    aprobadas: mockFacturas.filter(f => f.estado === 'approved').length,
    conErrores: mockFacturas.filter(f => f.estado === 'error').length,
    totalImportes: mockFacturas.reduce((sum, f) => sum + f.total_factura, 0),
    confianzaPromedio: mockFacturas.reduce((sum, f) => sum + f.confianza_global, 0) / mockFacturas.length
};

// Proveedores únicos
const mockProveedores = [
    ...new Set(mockFacturas.map(f => f.proveedor_nombre))
].filter(Boolean);

// Historial de cambios de ejemplo
const mockHistorial = {
    "f47ac10b-58cc-4372-a567-0e02b2c3d479": [
        {
            id: "hist-001",
            fecha: "2024-11-12T10:35:00Z",
            usuario: "admin@barmanolo.com",
            accion: "Factura procesada automáticamente",
            detalles: "Extracción completada con confianza global del 85%",
            cambios: {}
        }
    ]
};

// URLs de PDF de ejemplo
const mockPdfUrls = {
    "f47ac10b-58cc-4372-a567-0e02b2c3d479": "https://example.com/factura-1.pdf",
    "f47ac10b-58cc-4372-a567-0e02b2c3d480": "https://example.com/factura-2.pdf"
};

// ===== FUNCIONES MOCK API =====

// Simular delay de red
const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Obtener facturas con filtros
async function mockGetFacturas(filters = {}) {
    await mockDelay();
    
    let filteredFacturas = [...mockFacturas];
    
    // Aplicar filtros
    if (filters.proveedor) {
        filteredFacturas = filteredFacturas.filter(f => 
            f.proveedor_nombre.toLowerCase().includes(filters.proveedor.toLowerCase())
        );
    }
    
    if (filters.estado) {
        filteredFacturas = filteredFacturas.filter(f => f.estado === filters.estado);
    }
    
    if (filters.confianza) {
        filteredFacturas = filteredFacturas.filter(f => {
            const confianza = f.confianza_global;
            switch (filters.confianza) {
                case 'alta': return confianza >= 0.9;
                case 'media': return confianza >= 0.7 && confianza < 0.9;
                case 'baja': return confianza < 0.7;
                default: return true;
            }
        });
    }
    
    return {
        data: filteredFacturas,
        metrics: {
            ...mockMetrics,
            totalFacturas: filteredFacturas.length,
            totalImportes: filteredFacturas.reduce((sum, f) => sum + f.total_factura, 0)
        }
    };
}

// Obtener factura completa
async function mockGetFacturaCompleta(facturaId) {
    await mockDelay();
    return mockFacturas.find(f => f.id === facturaId);
}

// Actualizar campo
async function mockUpdateCampo(facturaId, fieldName, newValue) {
    await mockDelay();
    const factura = mockFacturas.find(f => f.id === facturaId);
    if (factura) {
        factura[fieldName] = newValue;
        return { success: true, factura };
    }
    throw new Error('Factura no encontrada');
}

// Aprobar factura
async function mockAprobarFactura(facturaId) {
    await mockDelay();
    const factura = mockFacturas.find(f => f.id === facturaId);
    if (factura) {
        factura.estado = 'approved';
        factura.requiere_revision = false;
        return { success: true, factura };
    }
    throw new Error('Factura no encontrada');
}

// ===== FUNCIONES UTILITARIAS =====

// Formatear moneda
function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('es-ES');
    } catch (error) {
        return dateString;
    }
}

// Formatear fecha y hora
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('es-ES');
    } catch (error) {
        return dateString;
    }
}

// Obtener clase CSS para confianza
function getConfidenceClass(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
}

// Obtener etiqueta de confianza
function getConfidenceLabel(confidence) {
    if (confidence >= 0.9) return 'Alta';
    if (confidence >= 0.7) return 'Media';
    return 'Baja';
}

// Obtener badge de estado
function getEstadoBadge(estado) {
    switch (estado) {
        case 'approved': return 'Aprobada';
        case 'pending': return 'Pendiente';
        case 'processed': return 'Procesada';
        case 'error': return 'Error';
        default: return 'Desconocido';
    }
}

// ===== EXPORTAR PARA USO GLOBAL =====

window.mockData = {
    facturas: mockFacturas,
    metrics: mockMetrics,
    proveedores: mockProveedores,
    historial: mockHistorial,
    pdfUrls: mockPdfUrls
};

window.mockApi = {
    getFacturas: mockGetFacturas,
    getFacturaCompleta: mockGetFacturaCompleta,
    updateCampo: mockUpdateCampo,
    aprobarFactura: mockAprobarFactura
};

window.mockUtils = {
    formatCurrency,
    formatDate,
    formatDateTime,
    getConfidenceClass,
    getConfidenceLabel,
    getEstadoBadge,
    mockDelay
};

console.log('Mock data cargado correctamente');
console.log('Facturas disponibles:', mockFacturas.length);
console.log('mockApi disponible:', !!window.mockApi);
