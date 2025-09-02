# =============================================
# SCRIPT POWERSHELL PARA PROBAR NUMIER
# =============================================

$SUPABASE_URL = "https://ucchhjdatbukbzjxdxpf.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY2hqZGF0YnVrYnpqeGR4cGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNDI0NjU4MSwiZXhwIjoyMDM5ODIyNTgxfQ.s9HK8vSW2uKhp0b4Q7Hel7YW_nFMr-vYxIwEHVmvGjU"
$RESTAURANTE_ID = "2852b1af-38d8-43ec-8872-2b2921d5a231"

Write-Host "🏪 PROBANDO API NUMIER TPV" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 1. TEST API NUMIER
Write-Host "`n🔍 1. Probando API de Numier..." -ForegroundColor Yellow

$testBody = @{
    restaurante_id = $RESTAURANTE_ID
    fecha_inicio = "2025-01-24"
    fecha_fin = "2025-01-25"
} | ConvertTo-Json

try {
    $testResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/test-numier-api" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $testBody

    Write-Host "✅ API Test Result:" -ForegroundColor Green
    Write-Host "Total Records: $($testResponse.total_records)" -ForegroundColor Cyan
    Write-Host "TPVs Tested: $($testResponse.resultados.Count)" -ForegroundColor Cyan
    
    foreach ($tpv in $testResponse.resultados) {
        if ($tpv.success) {
            Write-Host "  TPV $($tpv.tpv_id): ✅ $($tpv.records_found) records" -ForegroundColor Green
        } else {
            Write-Host "  TPV $($tpv.tpv_id): ❌ Error" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Error testing API: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. SINCRONIZAR DATOS
Write-Host "`n🔄 2. Sincronizando datos..." -ForegroundColor Yellow

$syncBody = @{
    restaurante_id = $RESTAURANTE_ID
    fecha_inicio = "2025-01-24"
    fecha_fin = "2025-01-25"
    endpoints = @("sales", "products")
} | ConvertTo-Json

try {
    $syncResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/sync-numier-data" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $syncBody

    Write-Host "✅ Sync Result:" -ForegroundColor Green
    Write-Host "Message: $($syncResponse.message)" -ForegroundColor Cyan
    
    foreach ($resultado in $syncResponse.resultados) {
        Write-Host "  $($resultado.endpoint): $($resultado.exitosos)/$($resultado.procesados) exitosos" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error syncing: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. VER DATOS EN BASE DE DATOS
Write-Host "`n📊 3. Consultando ventas en base de datos..." -ForegroundColor Yellow

try {
    $ventasResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/ventas_datos?restaurante_id=eq.$RESTAURANTE_ID&sistema_origen=eq.numier&order=fecha_venta.desc&limit=10" `
        -Method GET `
        -Headers @{
            "apikey" = $SUPABASE_KEY
            "Authorization" = "Bearer $SUPABASE_KEY"
        }

    Write-Host "✅ Últimas ventas encontradas: $($ventasResponse.Count)" -ForegroundColor Green
    
    if ($ventasResponse.Count -gt 0) {
        Write-Host "`nDetalles de ventas:" -ForegroundColor Cyan
        Write-Host "Fecha       | Ticket      | Sección     | Total    | Comensales" -ForegroundColor White
        Write-Host "------------|-------------|-------------|----------|----------" -ForegroundColor White
        
        foreach ($venta in $ventasResponse) {
            $seccion = if ($venta.seccion) { $venta.seccion } else { "Sin sección" }
            $total = [math]::Round($venta.total_bruto, 2)
            Write-Host "$($venta.fecha_venta) | $($venta.id_externo.PadRight(11)) | $($seccion.PadRight(11)) | €$($total.ToString().PadLeft(7)) | $($venta.num_comensales)" -ForegroundColor White
        }
        
        # Análisis por sección
        $secciones = $ventasResponse | Group-Object seccion
        Write-Host "`n📊 Resumen por sección:" -ForegroundColor Cyan
        
        foreach ($grupo in $secciones) {
            $seccionNombre = if ($grupo.Name) { $grupo.Name } else { "Sin sección" }
            $totalSeccion = ($grupo.Group | Measure-Object total_bruto -Sum).Sum
            Write-Host "  $seccionNombre`: $($grupo.Count) tickets, €$([math]::Round($totalSeccion, 2))" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Error querying database: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Análisis completado!" -ForegroundColor Green
