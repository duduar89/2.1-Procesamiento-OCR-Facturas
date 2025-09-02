#!/usr/bin/env python3
"""
EXTRACTOR RÁPIDO - Alternativa a conexión directa
Usa diferentes métodos para obtener los datos
"""

import pandas as pd
import json
import subprocess
import os

def metodo_1_supabase_cli():
    """Intenta usar Supabase CLI si está instalado"""
    print("🔧 Método 1: Supabase CLI...")
    try:
        # Verificar si supabase CLI está disponible
        result = subprocess.run(['supabase', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"   ✅ Supabase CLI encontrado: {result.stdout.strip()}")
            
            # Ejecutar consulta
            ventas_query = """
            SELECT fecha, ventas_dia, tickets_dia 
            FROM ventas_datos 
            WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
            ORDER BY fecha ASC
            """
            
            result = subprocess.run([
                'supabase', 'db', 'query', ventas_query, 
                '--project-ref', 'rpagcxryqqnfmmqiaaoy'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("   ✅ Datos extraídos exitosamente")
                return result.stdout
        else:
            print("   ❌ Supabase CLI no encontrado")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return None

def metodo_2_curl():
    """Usa curl para hacer la petición"""
    print("🌐 Método 2: cURL...")
    try:
        # Comando curl para ventas
        curl_cmd = [
            'curl', '-X', 'GET',
            'https://rpagcxryqqnfmmqiaaoy.supabase.co/rest/v1/ventas_datos',
            '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYWdjeHJ5cXFuZm1tcWlhYW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Njk0NDgsImV4cCI6MjA1MzM0NTQ0OH0.n8lBPFGPT1M9TZxGfYKjnCFSozGCBAUOHCmCqVpqL5w',
            '-H', 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYWdjeHJ5cXFuZm1tcWlhYW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Njk0NDgsImV4cCI6MjA1MzM0NTQ0OH0.n8lBPFGPT1M9TZxGfYKjnCFSozGCBAUOHCmCqVpqL5w',
            '--get',
            '--data-urlencode', 'restaurante_id=eq.2852b1af-38d8-43ec-8872-2b2921d5a231',
            '--data-urlencode', 'select=fecha,ventas_dia,tickets_dia',
            '--data-urlencode', 'order=fecha.asc'
        ]
        
        result = subprocess.run(curl_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("   ✅ cURL exitoso")
            data = json.loads(result.stdout)
            
            # Guardar como CSV
            df = pd.DataFrame(data)
            df.to_csv('ventas_data.csv', index=False)
            print(f"   💾 Guardado ventas_data.csv: {len(df)} registros")
            
            # Ahora datos de clima
            curl_cmd_clima = [
                'curl', '-X', 'GET',
                'https://rpagcxryqqnfmmqiaaoy.supabase.co/rest/v1/correlacion_clima_ventas',
                '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYWdjeHJ5cXFuZm1tcWlhYW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Njk0NDgsImV4cCI6MjA1MzM0NTQ0OH0.n8lBPFGPT1M9TZxGfYKjnCFSozGCBAUOHCmCqVpqL5w',
                '-H', 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYWdjeHJ5cXFuZm1tcWlhYW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Njk0NDgsImV4cCI6MjA1MzM0NTQ0OH0.n8lBPFGPT1M9TZxGfYKjnCFSozGCBAUOHCmCqVpqL5w',
                '--get',
                '--data-urlencode', 'restaurante_id=eq.2852b1af-38d8-43ec-8872-2b2921d5a231',
                '--data-urlencode', 'select=fecha,temperatura_media,precipitacion,viento_velocidad',
                '--data-urlencode', 'order=fecha.asc'
            ]
            
            result_clima = subprocess.run(curl_cmd_clima, capture_output=True, text=True)
            
            if result_clima.returncode == 0:
                data_clima = json.loads(result_clima.stdout)
                df_clima = pd.DataFrame(data_clima)
                df_clima.to_csv('clima_data.csv', index=False)
                print(f"   💾 Guardado clima_data.csv: {len(df_clima)} registros")
                return True
                
        else:
            print(f"   ❌ Error cURL: {result.stderr}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return False

def metodo_3_manual():
    """Proporciona instrucciones para extracción manual"""
    print("📋 Método 3: Extracción Manual...")
    print("""
    🔗 PASOS MANUALES:
    
    1. Ve a: https://supabase.com/dashboard/project/rpagcxryqqnfmmqiaaoy
    2. Ve a 'SQL Editor'
    3. Ejecuta esta consulta:
    
    SELECT fecha, ventas_dia, tickets_dia 
    FROM ventas_datos 
    WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    ORDER BY fecha ASC;
    
    4. Click 'Download CSV' y guárdalo como 'ventas_data.csv'
    
    5. Ejecuta esta segunda consulta:
    
    SELECT fecha, temperatura_media, precipitacion, viento_velocidad 
    FROM correlacion_clima_ventas 
    WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'
    ORDER BY fecha ASC;
    
    6. Click 'Download CSV' y guárdalo como 'clima_data.csv'
    
    7. Re-ejecuta: python xgboost_model.py
    """)

def main():
    print("🚀 EXTRACTOR RÁPIDO DE DATOS")
    print("=" * 40)
    
    # Verificar si ya tenemos los archivos
    if os.path.exists('ventas_data.csv') and os.path.exists('clima_data.csv'):
        print("✅ Archivos CSV ya existen")
        print("🚀 Ejecuta: python xgboost_model.py")
        return
    
    # Probar métodos en orden
    success = False
    
    # Método 1: Supabase CLI
    # result = metodo_1_supabase_cli()
    # if result:
    #     success = True
    
    # Método 2: cURL
    if not success:
        success = metodo_2_curl()
    
    # Método 3: Manual
    if not success:
        metodo_3_manual()
    else:
        print("\n✅ ¡DATOS EXTRAÍDOS EXITOSAMENTE!")
        print("🚀 Ahora ejecuta: python xgboost_model.py")

if __name__ == "__main__":
    main()

