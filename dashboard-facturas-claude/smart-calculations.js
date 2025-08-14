// 🎯 FUNCIONES PARA CÁLCULOS INTELIGENTES DE PRECIOS

// Detectar tipo de producto basado en descripción
function detectProductType(descripcion) {
    const desc = descripcion.toLowerCase();
    
    // 🥚 HUEVOS (PRIORIDAD ALTA)
    if (/(huevo|huevos|egg|eggs|clara|yema|gallina|pollo)/i.test(desc)) {
        return 'huevos';
    }
    
    // 🍺 BEBIDAS
    if (/(cerveza|vino|refresco|agua|zumo|bebida|heineken|cruzcampo|estella|mahou|san miguel|estrella|damm|amstel|corona|budweiser|guinness|paulaner|franziskaner|klein|radler|sin alcohol|0\.0|0,0)/i.test(desc)) {
        return 'bebida';
    }
    
    // 🥩 CARNES
    if (/(chuleta|pollo|ternera|cerdo|carne|filete|lomo|solomillo|entrecot|costilla|panceta|jamón|salchicha|hamburguesa|albóndiga|salchichón|chorizo|morcilla|butifarra)/i.test(desc)) {
        return 'carne';
    }
    
    // 🐟 PESCADOS
    if (/(pescado|merluza|salmón|atún|gambas|langostinos|calamares|pulpo|sepia|bacalao|lubina|dorada|rodaballo|rape|pescadilla|boquerones|sardinas|anchoas)/i.test(desc)) {
        return 'pescado';
    }
    
    // 🥛 LÁCTEOS
    if (/(leche|queso|yogur|mantequilla|nata|crema|helado|cuajada|requesón|ricotta|mozzarella|gouda|cheddar|parmesano|manchego|roquefort|brie|camembert)/i.test(desc)) {
        return 'lacteo';
    }
    
    // 🥬 VERDURAS/FRUTAS
    if (/(lechuga|tomate|cebolla|patata|zanahoria|manzana|naranja|plátano|fresa|uva|melón|sandía|pimiento|berenjena|calabacín|pepino|espinaca|acelga)/i.test(desc)) {
        return 'verdura';
    }
    
    // 🍞 PANADERÍA
    if (/(pan|bollo|croissant|donut|magdalena|galleta|pastel|tarta|bizcocho|rosquilla|churro|ensaimada|brioche)/i.test(desc)) {
        return 'panaderia';
    }
    
    return 'general';
}

// Parsear formato inteligentemente
function parseFormat(formato, descripcion) {
    if (!formato && !descripcion) return null;
    
    const text = (formato || descripcion).toLowerCase();
    
    // 🥚 HUEVOS: "12ud", "30u", "docena", "24 huevos"
    const huevosMatch = text.match(/(\d+)\s*(ud|u|huevos?|unidades?|docena|docenas)/i);
    if (huevosMatch) {
        let unidades = parseInt(huevosMatch[1]);
        const unidad = huevosMatch[2].toLowerCase();
        
        // Convertir docenas a unidades
        if (unidad === 'docena' || unidad === 'docenas') {
            unidades = unidades * 12;
        }
        
        return {
            tipo: 'huevos',
            unidades: unidades,
            formatoOriginal: huevosMatch[0]
        };
    }
    
    // 🍺 BEBIDAS: "24x33cl", "6x1L", "12x330ml"
    const bebidaMatch = text.match(/(\d+)x(\d+(?:[.,]\d+)?)\s*(cl|ml|l|litro|litros)/i);
    if (bebidaMatch) {
        const unidades = parseInt(bebidaMatch[1]);
        const volumen = parseFloat(bebidaMatch[2].replace(',', '.'));
        const unidad = bebidaMatch[3].toLowerCase();
        
        // Convertir a litros
        let volumenL = volumen;
        if (unidad === 'cl') volumenL = volumen / 100;
        if (unidad === 'ml') volumenL = volumen / 1000;
        
        return {
            tipo: 'bebida',
            unidades: unidades,
            volumenPorUnidad: volumenL,
            volumenTotal: unidades * volumenL,
            formatoOriginal: bebidaMatch[0]
        };
    }
    
    // 🥩 CARNES/PESCADOS: "5kg", "2.5kg", "1,5kg"
    const pesoMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gramos|kilos)/i);
    if (pesoMatch) {
        const peso = parseFloat(pesoMatch[1].replace(',', '.'));
        const unidad = pesoMatch[2].toLowerCase();
        
        // Convertir a kg
        let pesoKg = peso;
        if (unidad === 'g' || unidad === 'gramos') pesoKg = peso / 1000;
        
        return {
            tipo: 'peso',
            peso: pesoKg,
            formatoOriginal: pesoMatch[0]
        };
    }
    
    // 📦 UNIDADES: "12ud", "6unidades", "24pcs"
    const unidadMatch = text.match(/(\d+)\s*(ud|unidades|pcs|piezas|unidad)/i);
    if (unidadMatch) {
        return {
            tipo: 'unidades',
            unidades: parseInt(unidadMatch[1]),
            formatoOriginal: unidadMatch[0]
        };
    }
    
    // 🥛 LÁCTEOS: "1L", "500ml", "2L"
    const liquidoMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(l|ml|cl|litro|litros)/i);
    if (liquidoMatch) {
        const volumen = parseFloat(liquidoMatch[1].replace(',', '.'));
        const unidad = liquidoMatch[2].toLowerCase();
        
        // Convertir a litros
        let volumenL = volumen;
        if (unidad === 'cl') volumenL = volumen / 100;
        if (unidad === 'ml') volumenL = volumen / 1000;
        
        return {
            tipo: 'liquido',
            volumen: volumenL,
            formatoOriginal: liquidoMatch[0]
        };
    }
    
    return null;
}

// Calcular precios múltiples según tipo de producto
function calculateMultiplePrices(producto) {
    const tipo = detectProductType(producto.descripcion_original);
    const formato = parseFormat(producto.formato_comercial, producto.descripcion_original);
    const precioUnitario = producto.precio_unitario_sin_iva || 0;
    const cantidad = producto.cantidad || 1;
    
    const precios = {
        tipo: tipo,
        formato: formato,
        precioUnitario: precioUnitario,
        precioPorUnidad: null,
        precioPorLitro: null,
        precioPorKg: null,
        precioPorPieza: null,
        precioPorHuevo: null
    };
    
    if (!formato) return precios;
    
    switch (tipo) {
        case 'huevos':
            if (formato.tipo === 'huevos') {
                // Precio por huevo individual
                precios.precioPorHuevo = precioUnitario / formato.unidades;
            }
            break;
            
        case 'bebida':
            if (formato.tipo === 'bebida') {
                // Precio por unidad de venta (botella/lata)
                precios.precioPorUnidad = precioUnitario / formato.unidades;
                
                // Precio por litro
                precios.precioPorLitro = precioUnitario / formato.volumenTotal;
            }
            break;
            
        case 'carne':
        case 'pescado':
            if (formato.tipo === 'peso') {
                // Precio por kg
                precios.precioPorKg = precioUnitario / formato.peso;
            } else if (formato.tipo === 'unidades') {
                // Precio por pieza
                precios.precioPorPieza = precioUnitario / formato.unidades;
            }
            break;
            
        case 'lacteo':
            if (formato.tipo === 'liquido') {
                // Precio por litro
                precios.precioPorLitro = precioUnitario / formato.volumen;
            } else if (formato.tipo === 'peso') {
                // Precio por kg
                precios.precioPorKg = precioUnitario / formato.peso;
            }
            break;
            
        case 'verdura':
        case 'panaderia':
            if (formato.tipo === 'peso') {
                precios.precioPorKg = precioUnitario / formato.peso;
            } else if (formato.tipo === 'unidades') {
                precios.precioPorPieza = precioUnitario / formato.unidades;
            }
            break;
    }
    
    return precios;
}
