// ===== ARREGLO INMEDIATO PARA SUBIDA DE ARCHIVOS =====
// Este archivo SOBRESCRIBE la función rota

console.log('🚀 APLICANDO ARREGLO INMEDIATO PARA SUBIDA...');

// ✅ CONFIGURAR USUARIO REAL
window.currentUser = {
    id: '9d32f558-ffdf-49a4-b0c9-67025d44f9f2', // TU UUID REAL
    email: 'eduardo.aguilar.collado@gmail.com',
    nombre: 'Eduardo',
    apellidos: 'Aguilar',
    restaurante_id: '2852b1af-38d8-43ec-8872-2b2921d5a231',
    rol: 'admin_restaurante'
};

console.log('✅ currentUser FORZADO:', window.currentUser.email);

// ✅ SOBRESCRIBIR processDocument COMPLETAMENTE
window.processDocument = async function(file) {
    console.log('🚀 === PROCESANDO ARCHIVO CON ARREGLO ===');
    console.log('📄 Archivo:', file.name);
    console.log('👤 Usuario:', window.currentUser.email);
    console.log('🆔 User ID:', window.currentUser.id);
    
    try {
        // Mostrar estado de subida
        if (window.showUploadStatus) {
            window.showUploadStatus('Subiendo archivo...', 'uploading');
        }
        
        // 1. Subir archivo a Storage primero
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('documentos')
            .upload(fileName, file);
            
        if (uploadError) {
            console.error('❌ Error subiendo archivo:', uploadError);
            throw new Error('Error subiendo archivo: ' + uploadError.message);
        }
        
        console.log('✅ Archivo subido a Storage:', uploadData.path);
        
        // 2. Crear registro en documentos
        const documentId = crypto.randomUUID();
        const documentRecord = {
            id: documentId,
            restaurante_id: '2852b1af-38d8-43ec-8872-2b2921d5a231', // TU RESTAURANTE
            nombre_archivo: file.name,
            tipo_archivo: 'factura',
            url_storage: uploadData.path,
            tamaño_bytes: file.size,
            numero_paginas: 1,
            estado: 'uploaded',
            confianza_clasificacion: 0.5,
            calidad_estimada: 'media',
            usuario_subida: '9d32f558-ffdf-49a4-b0c9-67025d44f9f2' // TU UUID REAL
        };
        
        console.log('📤 Creando registro:', documentRecord);
        
        const { data: docData, error: docError } = await window.supabaseClient
            .from('documentos')
            .insert([documentRecord])
            .select()
            .single();
            
        if (docError) {
            console.error('❌ Error creando documento:', docError);
            throw new Error('Error creando registro: ' + docError.message);
        }
        
        console.log('✅ Documento creado en BD:', docData);
        
        // Mostrar estado de procesamiento
        if (window.showUploadStatus) {
            window.showUploadStatus('Procesando con IA...', 'processing');
        }
        
        // 3. Llamar a Edge Function para procesamiento IA
        console.log('🤖 Llamando a Edge Function...');
        
        const processResponse = await fetch(`${window.CONFIG.SUPABASE.URL}/functions/v1/process-invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.CONFIG.SUPABASE.ANON_KEY}`
            },
            body: JSON.stringify({
                documentId: docData.id,
                fileName: file.name,
                restauranteId: '2852b1af-38d8-43ec-8872-2b2921d5a231',
                userId: '9d32f558-ffdf-49a4-b0c9-67025d44f9f2'
            })
        });
        
        if (!processResponse.ok) {
            console.error('❌ Error en Edge Function:', processResponse.status);
            throw new Error('Error en procesamiento IA');
        }
        
        const processResult = await processResponse.json();
        console.log('✅ Procesamiento IA completado:', processResult);
        
        // Mostrar éxito
        if (window.showUploadStatus) {
            window.showUploadStatus('¡Archivo procesado exitosamente!', 'success');
        }
        
        if (window.showNotification) {
            window.showNotification('✅ Archivo procesado correctamente', 'success');
        }
        
        // Recargar datos del dashboard
        setTimeout(async () => {
            if (window.loadRealDataFromSupabase) {
                await window.loadRealDataFromSupabase();
            }
        }, 2000);
        
        return processResult;
        
    } catch (error) {
        console.error('❌ Error en procesamiento:', error);
        
        if (window.showUploadStatus) {
            window.showUploadStatus('Error en procesamiento', 'error');
        }
        
        if (window.showNotification) {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
        
        throw error;
    }
};

console.log('✅ FUNCIÓN processDocument SOBRESCRITA COMPLETAMENTE');
console.log('🎯 AHORA PUEDES SUBIR ARCHIVOS SIN PROBLEMAS');