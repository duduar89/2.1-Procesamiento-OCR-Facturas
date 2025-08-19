// 🎯 FUNCIONES PARA CÁLCULOS INTELIGENTES DE PRECIOS

// Función para formatear moneda
function formatCurrency(value) {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// Detectar tipo de producto basado en descripción
function detectProductType(descripcion) {
    const desc = descripcion.toLowerCase();
    
    // 🥚 HUEVOS (PRIORIDAD ALTA)
    if (/(huevo|huevos|egg|eggs|clara|yema|gallina|pollo)/i.test(desc)) {
        return 'huevos';
    }
    
    // 🍺 BEBIDAS (INCLUYENDO TODOS LOS TIPOS DE VINO)
    if (/(cerveza|vino|refresco|agua|zumo|bebida|heineken|cruzcampo|estella|mahou|san miguel|estrella|damm|amstel|corona|budweiser|guinness|paulaner|franziskaner|klein|radler|sin alcohol|0\.0|0,0|amontillado|fino|oloroso|pedro ximenez|manzanilla|palo cortado|verdejo|albariño|godello|mencía|garnacha|tempranillo|rioja|ribera|ribera del duero|ribera del guadiana|ribera del júcar|ribera del tajo|ribera del segura|ribera del ebro|ribera del guadalquivir|ribera del guadiana|ribera del júcar|ribera del tajo|ribera del segura|ribera del ebro|ribera del guadalquivir|chardonnay|sauvignon blanc|pinot noir|merlot|cabernet|syrah|shiraz|malbec|pinot grigio|riesling|gewürztraminer|viognier|nebbiolo|sangiovese|barbera|dolcetto|montepulciano|primitivo|negroamaro|nero d'avola|agiorgitiko|xinomavro|limnio|mavrodaphne|kotsifali|mandilaria|vidiano|vilana|dafni|thrapsathiri|moschofilero|roditis|savvatiano|assyrtico|athiri|plagios|goumenissa|naoussa|nemeea|mantinia|patras|rhodes|santorini|crete|thessaloniki|macedonia|thrace|epirus|thessaly|central greece|peloponnese|aegean islands|ionian islands|crete|thessaloniki|macedonia|thrace|epirus|thessaly|central greece|peloponnese|aegean islands|ionian islands)/i.test(desc)) {
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
    console.log('🔍 parseFormat llamado con:', { formato, descripcion });
    
    if (!formato && !descripcion) {
        console.log('❌ No hay formato ni descripción');
        return null;
    }
    
    const text = (formato || descripcion).toLowerCase();
    console.log('🔍 Texto a analizar:', text);
    
    // 🥚 HUEVOS: "12ud", "30u", "docena", "24 huevos"
    const huevosMatch = text.match(/(\d+)\s*(ud|u|huevos?|unidades?|docena|docenas)/i);
    if (huevosMatch) {
        console.log('✅ Huevos detectados:', huevosMatch);
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
        console.log('✅ Bebida detectada:', bebidaMatch);
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
        console.log('✅ Peso detectado:', pesoMatch);
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
        console.log('✅ Unidades detectadas:', unidadMatch);
        return {
            tipo: 'unidades',
            unidades: parseInt(unidadMatch[1]),
            formatoOriginal: unidadMatch[0]
        };
    }
    
    // 🥛 LÁCTEOS: "1L", "500ml", "2L"
    const liquidoMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(l|ml|cl|litro|litros)/i);
    if (liquidoMatch) {
        console.log('✅ Líquido detectado:', liquidoMatch);
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
    
    // 🍷 VINOS SIN FORMATO ESPECÍFICO (ASUMIR BOTELLA ESTÁNDAR)
    if (/(vino|amontillado|fino|oloroso|pedro ximenez|manzanilla|palo cortado|verdejo|albariño|godello|mencía|garnacha|tempranillo|rioja|ribera|chardonnay|sauvignon blanc|pinot noir|merlot|cabernet|syrah|shiraz|malbec)/i.test(text)) {
        console.log('✅ Vino detectado sin formato específico, asumiendo botella estándar');
        return {
            tipo: 'bebida',
            unidades: 1,
            volumenPorUnidad: 0.75, // Botella estándar de vino
            volumenTotal: 0.75,
            formatoOriginal: 'botella estándar 75cl'
        };
    }
    
    console.log('❌ No se detectó ningún formato válido');
    return null;
}

// Calcular precios múltiples según tipo de producto
function calculateMultiplePrices(producto) {
    console.log('🔍 calculateMultiplePrices llamado con producto:', producto);
    
    const tipo = detectProductType(producto.descripcion_original);
    console.log('🔍 Tipo detectado:', tipo);
    
    const formato = parseFormat(producto.formato_comercial, producto.descripcion_original);
    console.log('🔍 Formato parseado:', formato);
    
    const precioUnitario = producto.precio_unitario_sin_iva || 0;
    const cantidad = producto.cantidad || 1;
    console.log('🔍 Precio unitario:', precioUnitario, 'Cantidad:', cantidad);
    
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
    
    if (!formato) {
        console.log('❌ No hay formato, retornando precios básicos');
        return precios;
    }
    
    switch (tipo) {
        case 'huevos':
            console.log('🥚 Procesando huevos...');
            if (formato.tipo === 'huevos') {
                // Precio por huevo individual
                precios.precioPorHuevo = precioUnitario / formato.unidades;
                console.log('✅ Precio por huevo calculado:', precios.precioPorHuevo);
            }
            break;
            
        case 'bebida':
            console.log('🍺 Procesando bebida...');
            if (formato.tipo === 'bebida') {
                // Precio por unidad de venta (botella/lata)
                precios.precioPorUnidad = precioUnitario / formato.unidades;
                
                // Precio por litro
                precios.precioPorLitro = precioUnitario / formato.volumenTotal;
                console.log('✅ Precios de bebida calculados:', { precioPorUnidad: precios.precioPorUnidad, precioPorLitro: precios.precioPorLitro });
            } else if (formato.tipo === 'unidades') {
                // Para vinos que solo tienen cantidad en unidades
                precios.precioPorUnidad = precioUnitario / formato.unidades;
                precios.precioPorLitro = precioUnitario / (formato.unidades * 0.75); // Asumir 75cl por botella
                console.log('✅ Precios de vino por unidades calculados:', { precioPorUnidad: precios.precioPorUnidad, precioPorLitro: precios.precioPorLitro });
            }
            break;
            
        case 'carne':
        case 'pescado':
            console.log('🥩 Procesando carne/pescado...');
            if (formato.tipo === 'peso') {
                // Precio por kg
                precios.precioPorKg = precioUnitario / formato.peso;
                console.log('✅ Precio por kg calculado:', precios.precioPorKg);
            } else if (formato.tipo === 'unidades') {
                // Precio por pieza
                precios.precioPorPieza = precioUnitario / formato.unidades;
                console.log('✅ Precio por pieza calculado:', precios.precioPorPieza);
            }
            break;
            
        case 'lacteo':
            console.log('🥛 Procesando lácteo...');
            if (formato.tipo === 'liquido') {
                // Precio por litro
                precios.precioPorLitro = precioUnitario / formato.volumen;
                console.log('✅ Precio por litro calculado:', precios.precioPorLitro);
            } else if (formato.tipo === 'peso') {
                // Precio por kg
                precios.precioPorKg = precioUnitario / formato.peso;
                console.log('✅ Precio por kg calculado:', precios.precioPorKg);
            }
            break;
            
        case 'verdura':
        case 'panaderia':
            console.log('🥬 Procesando verdura/panadería...');
            if (formato.tipo === 'peso') {
                precios.precioPorKg = precioUnitario / formato.peso;
                console.log('✅ Precio por kg calculado:', precios.precioPorKg);
            } else if (formato.tipo === 'unidades') {
                precios.precioPorPieza = precioUnitario / formato.unidades;
                console.log('✅ Precio por pieza calculado:', precios.precioPorPieza);
            }
            break;
            
        default:
            console.log('❓ Tipo no reconocido:', tipo);
    }
    
    console.log('🎯 Precios finales calculados:', precios);
    return precios;
}

// ===== EXPORTAR FUNCIONES GLOBALMENTE =====

// Hacer las funciones disponibles globalmente
window.detectProductType = detectProductType;
window.parseFormat = parseFormat;
window.calculateMultiplePrices = calculateMultiplePrices;
window.formatCurrency = formatCurrency;

console.log('✅ Funciones de smart-calculations disponibles globalmente:');
console.log('✅ detectProductType, parseFormat, calculateMultiplePrices, formatCurrency');
