-- =============================================
-- VERIFICAR SI NUMIER ESTÁ ENVIANDO DATOS DE SECCIÓN
-- =============================================

-- 1. VER LOS DATOS ORIGINALES COMPLETOS DE NUMIER
SELECT 
    id_externo,
    seccion,
    datos_originales->'Section' as section_completa,
    datos_originales->'Section'->>'sectionName' as section_name_extraido,
    datos_originales->'Pos'->>'Name' as tpv_name,
    total_bruto
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
ORDER BY created_at DESC
LIMIT 10;

-- 2. CONTAR VENTAS CON Y SIN SECCIÓN
SELECT 
    CASE 
        WHEN seccion IS NULL OR seccion = '' THEN 'Sin sección'
        ELSE 'Con sección'
    END as tiene_seccion,
    COUNT(*) as cantidad,
    SUM(total_bruto) as total_ventas
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
GROUP BY 
    CASE 
        WHEN seccion IS NULL OR seccion = '' THEN 'Sin sección'
        ELSE 'Con sección'
    END;

-- 3. VER TODAS LAS SECCIONES DIFERENTES
SELECT DISTINCT 
    seccion,
    COUNT(*) as num_tickets
FROM ventas_datos 
WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
  AND sistema_origen = 'numier'
GROUP BY seccion
ORDER BY num_tickets DESC;
