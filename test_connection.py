#!/usr/bin/env python3
"""
Test de conexión a Supabase - Diagnóstico
"""
import requests
import json

# Configuración actual
SUPABASE_URL = "https://rpagcxryqqnfmmqiaaoy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYWdjeHJ5cXFuZm1tcWlhYW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Njk0NDgsImV4cCI6MjA1MzM0NTQ0OH0.n8lBPFGPT1M9TZxGfYKjnCFSozGCBAUOHCmCqVpqL5w"
RESTAURANTE_ID = "2852b1af-38d8-43ec-8872-2b2921d5a231"

print("🔍 DIAGNÓSTICO DE CONEXIÓN A SUPABASE")
print("=" * 50)

# Headers para autenticación
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'User-Agent': 'Python-Test/1.0'
}

print(f"📡 URL: {SUPABASE_URL}")
print(f"🔑 API Key: {SUPABASE_KEY[:20]}...")
print(f"🏪 Restaurante ID: {RESTAURANTE_ID}")

# Test 1: Ping básico
print("\n1️⃣ Test de conectividad básica...")
try:
    response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, timeout=10)
    print(f"   ✅ Status: {response.status_code}")
    print(f"   ✅ Headers: {dict(response.headers)}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: Listar tablas disponibles
print("\n2️⃣ Test de acceso a base de datos...")
try:
    response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, timeout=10)
    if response.status_code == 200:
        print(f"   ✅ Acceso a DB: OK")
    else:
        print(f"   ❌ Status: {response.status_code}")
        print(f"   ❌ Response: {response.text}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Verificar tabla ventas_datos
print("\n3️⃣ Test tabla 'ventas_datos'...")
try:
    url = f"{SUPABASE_URL}/rest/v1/ventas_datos"
    params = {'limit': '1'}
    response = requests.get(url, headers=headers, params=params, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Tabla existe: {len(data)} registros encontrados")
        if data:
            print(f"   📊 Estructura: {list(data[0].keys())}")
    else:
        print(f"   ❌ Error: {response.text}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 4: Verificar tabla correlacion_clima_ventas
print("\n4️⃣ Test tabla 'correlacion_clima_ventas'...")
try:
    url = f"{SUPABASE_URL}/rest/v1/correlacion_clima_ventas"
    params = {'limit': '1'}
    response = requests.get(url, headers=headers, params=params, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Tabla existe: {len(data)} registros encontrados")
        if data:
            print(f"   📊 Estructura: {list(data[0].keys())}")
    else:
        print(f"   ❌ Error: {response.text}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 5: Consulta específica con restaurante_id
print("\n5️⃣ Test con filtro restaurante_id...")
try:
    url = f"{SUPABASE_URL}/rest/v1/ventas_datos"
    params = {
        'restaurante_id': f'eq.{RESTAURANTE_ID}',
        'limit': '5',
        'order': 'fecha.desc'
    }
    response = requests.get(url, headers=headers, params=params, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Registros encontrados: {len(data)}")
        for record in data:
            print(f"   📅 {record.get('fecha', 'N/A')}: €{record.get('ventas_dia', 'N/A')}")
    else:
        print(f"   ❌ Error: {response.text}")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 50)
print("🔍 DIAGNÓSTICO COMPLETADO")
print("Si hay errores, comparte el resultado para corregir la configuración.")

