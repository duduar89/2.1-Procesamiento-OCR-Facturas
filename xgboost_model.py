#!/usr/bin/env python3
"""
Sistema de Predicción de Ventas - XGBoost Local
Entrena modelo avanzado y lo exporta para Supabase
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb
import pickle
import json
import os
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# ================================
# 1. CONFIGURACIÓN Y CONEXIÓN
# ================================

# ✅ CONFIGURACIÓN CORRECTA DE SUPABASE
SUPABASE_URL = "https://yurqgcpgwsgdnxnpyxes.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cnFnY3Bnd3NnZG54bnB5eGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjgzODIsImV4cCI6MjA3MDUwNDM4Mn0.iOPGaCYvtE9EQgkl7ytKAymvKKQzsfwlPUyM5ChDiRg"
RESTAURANTE_ID = "2852b1af-38d8-43ec-8872-2b2921d5a231"

# 🎯 CONFIGURACIÓN DE MUESTREO
SAMPLING_METHOD = "stratified"  # Opciones: "stratified", "temporal", "random"

# FORZAR CONEXIÓN - Resolver DNS manualmente
import ssl
import urllib3
import socket
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Intentar resolver DNS manualmente
def resolver_dns():
    """Resuelve DNS manualmente para evitar problemas de conectividad"""
    try:
        # Resolver la IP de Supabase CORRECTA
        ip = socket.gethostbyname('yurqgcpgwsgdnxnpyxes.supabase.co')
        print(f"🌐 DNS resuelto: yurqgcpgwsgdnxnpyxes.supabase.co → {ip}")
        return ip
    except Exception as e:
        print(f"❌ Error DNS: {e}")
        return None

print("🚀 Sistema de Predicción de Ventas - XGBoost")
print("=" * 50)

# Verificar conectividad desde el inicio
print("🔍 Verificando conectividad...")
ip_resuelto = resolver_dns()
if ip_resuelto:
    print(f"✅ Conexión OK - IP: {ip_resuelto}")
else:
    print("⚠️  DNS no resuelto, intentando conexión directa...")

# ================================
# 2. EXTRACCIÓN DE DATOS
# ================================

def extraer_datos_supabase():
    """Extrae datos de ventas y clima desde Supabase"""
    print("📊 Extrayendo datos de Supabase...")
    
    try:
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        
        # Configurar sesión con reintentos
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        # Headers para autenticación
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': 'XGBoost-Model/1.0'
        }
        
        # 1. Extraer datos de ventas (COLUMNAS CORRECTAS)
        ventas_url = f"{SUPABASE_URL}/rest/v1/ventas_datos"
        ventas_params = {
            'restaurante_id': f'eq.{RESTAURANTE_ID}',
            'select': 'fecha_venta,total_bruto,num_comensales',  # Columnas reales
            'order': 'fecha_venta.asc'
        }
        
        # 🚨 CAMBIO CRÍTICO: Extraer ventas reales primero
        print("   💰 Extrayendo ventas REALES de ventas_datos...")
        ventas_response = session.get(ventas_url, headers=headers, params=ventas_params, timeout=30)
        
        if ventas_response.status_code != 200:
            print(f"   ❌ Error ventas: {ventas_response.status_code} - {ventas_response.text}")
            return None, None
            
        ventas_data = ventas_response.json()
        print(f"   ✅ Ventas reales: {len(ventas_data)} registros")
        
        # 2. Extraer datos climáticos (SIN ventas_dia porque está en 0)
        clima_url = f"{SUPABASE_URL}/rest/v1/correlacion_clima_ventas"
        clima_params = {
            'restaurante_id': f'eq.{RESTAURANTE_ID}',
            'select': 'fecha,temperatura_media,precipitacion,viento_velocidad',  # ❌ NO incluir ventas_dia
            'order': 'fecha.asc'
        }
        
        print("   🌤️  Obteniendo datos de clima...")
        clima_response = session.get(clima_url, headers=headers, params=clima_params, timeout=30)
        
        if clima_response.status_code != 200:
            print(f"   ❌ Error clima: {clima_response.status_code} - {clima_response.text}")
            return None, None
            
        clima_data = clima_response.json()
        
        # 3. Verificar datos
        print(f"   ✅ Ventas: {len(ventas_data)} registros")
        print(f"   ✅ Clima: {len(clima_data)} registros")
        
        if not ventas_data or not clima_data:
            print("   ❌ No se encontraron datos suficientes")
            return None, None
            
        # 4. Convertir a DataFrames
        df_ventas = pd.DataFrame(ventas_data)
        df_clima = pd.DataFrame(clima_data)
        
        # Renombrar columnas para merge
        df_ventas = df_ventas.rename(columns={
            'fecha_venta': 'fecha',
            'total_bruto': 'ventas_dia'
        })
        
        print(f"   📊 Ventas columnas: {list(df_ventas.columns)}")
        print(f"   📊 Clima columnas: {list(df_clima.columns)}")
        
        return df_ventas, df_clima
        
    except Exception as e:
        print(f"❌ Error extrayendo datos: {e}")
        print("🔄 Intentando método alternativo...")
        
        # Método alternativo: usar la función Edge existente
        try:
            print("   📡 Llamando función entrenar-modelo para obtener datos...")
            entrenar_url = f"{SUPABASE_URL}/functions/v1/entrenar-modelo"
            
            payload = {
                "restaurante_id": RESTAURANTE_ID,
                "solo_datos": True  # Flag especial para solo obtener datos
            }
            
            response = session.post(entrenar_url, headers=headers, json=payload, timeout=60)
            if response.status_code == 200:
                data = response.json()
                if 'datos_entrenamiento' in data:
                    print("   ✅ Datos obtenidos via Edge Function")
                    # Aquí procesarías los datos...
                    # Por ahora, devolvemos None para que uses el método manual
            
        except Exception as e2:
            print(f"   ❌ Método alternativo falló: {e2}")
        
        print("\n💡 SOLUCIÓN: Proporciona los datos manualmente")
        print("   1. Ve a Supabase Dashboard")
        print("   2. Ejecuta: SELECT * FROM ventas_datos WHERE restaurante_id = '2852b1af-38d8-43ec-8872-2b2921d5a231'")
        print("   3. Exporta como CSV y guárdalo como 'ventas_data.csv'")
        print("   4. Haz lo mismo con correlacion_clima_ventas → 'clima_data.csv'")
        print("   5. Re-ejecuta el script")
        
        return None, None

# ================================
# 3. PREPARACIÓN DE FEATURES
# ================================

def preparar_features(df_ventas, df_clima):
    """Prepara features avanzadas para XGBoost"""
    print("🔧 Preparando features avanzadas...")
    
    # 🚨 CAMBIO: Combinar datos de ventas reales + clima
    if df_ventas is None or df_clima is None:
        raise Exception("Datos insuficientes: falta df_ventas o df_clima")
    
    # Convertir fechas
    df_ventas['fecha'] = pd.to_datetime(df_ventas['fecha'])
    df_clima['fecha'] = pd.to_datetime(df_clima['fecha'])
    
    # Combinar por fecha (INNER JOIN para tener ambos datos)
    df = pd.merge(df_ventas, df_clima, on='fecha', how='inner')
    df = df.sort_values('fecha').reset_index(drop=True)
    
    print(f"   📊 Ventas: {len(df_ventas)} registros")
    print(f"   📊 Clima: {len(df_clima)} registros") 
    print(f"   📊 Combinados: {len(df)} registros")
    
    # Features temporales básicas
    df['dia_semana'] = df['fecha'].dt.dayofweek
    df['mes'] = df['fecha'].dt.month
    df['dia_mes'] = df['fecha'].dt.day
    df['semana_ano'] = df['fecha'].dt.isocalendar().week
    
    # Features cíclicas (mejor para ML)
    df['dia_semana_sin'] = np.sin(2 * np.pi * df['dia_semana'] / 7)
    df['dia_semana_cos'] = np.cos(2 * np.pi * df['dia_semana'] / 7)
    df['mes_sin'] = np.sin(2 * np.pi * df['mes'] / 12)
    df['mes_cos'] = np.cos(2 * np.pi * df['mes'] / 12)
    
    # Features estacionales
    df['es_fin_semana'] = (df['dia_semana'].isin([5, 6])).astype(int)
    df['es_verano'] = df['mes'].isin([6, 7, 8]).astype(int)
    df['es_invierno'] = df['mes'].isin([12, 1, 2]).astype(int)
    
    # Features climáticas  
    df['precipitacion_binaria'] = (df['precipitacion'] > 0.5).astype(int)
    df['temperatura_cuadratica'] = df['temperatura_media'] ** 2
    
    # Asegurar que tenemos la columna de ventas correcta
    if 'ventas_dia' not in df.columns:
        df['ventas_dia'] = df.get('ventas_total', df.get('total_bruto', 0))
    
    if 'tickets_dia' not in df.columns:
        df['tickets_dia'] = df.get('tickets_total', df.get('num_comensales', 1))
    
    # 🔧 CONVERSIÓN DE TIPOS - CRÍTICO para XGBoost
    print("   🔧 Convirtiendo tipos de datos...")
    
    # Convertir columnas numéricas principales
    numeric_columns = ['ventas_dia', 'temperatura_media', 'precipitacion', 'viento_velocidad', 'tickets_dia']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Features lag (serie temporal) - CONVERSIÓN FORZADA
    df['ventas_lag1'] = pd.to_numeric(df['ventas_dia'].shift(1), errors='coerce').fillna(df['ventas_dia'].mean())
    df['ventas_lag7'] = pd.to_numeric(df['ventas_dia'].shift(7), errors='coerce').fillna(df['ventas_dia'].mean())
    df['ventas_lag30'] = pd.to_numeric(df['ventas_dia'].shift(30), errors='coerce').fillna(df['ventas_dia'].mean())
    
    # Rolling features (tendencias) - CONVERSIÓN FORZADA
    df['ventas_ma7'] = pd.to_numeric(df['ventas_dia'].rolling(window=7, min_periods=1).mean(), errors='coerce').fillna(df['ventas_dia'].mean())
    df['ventas_ma30'] = pd.to_numeric(df['ventas_dia'].rolling(window=30, min_periods=1).mean(), errors='coerce').fillna(df['ventas_dia'].mean())
    df['ventas_std7'] = pd.to_numeric(df['ventas_dia'].rolling(window=7, min_periods=1).std(), errors='coerce').fillna(200)
    
    # 🎯 PRIMERO: Features de festivos (DEBE IR ANTES DE INTERACCIONES)
    fechas_festivos = [
        '2024-01-01', '2024-01-06', '2024-03-29', '2024-05-01', 
        '2024-08-15', '2024-10-12', '2024-11-01', '2024-12-06', 
        '2024-12-08', '2024-12-25', '2025-01-01', '2025-01-06'
    ]
    df['es_festivo'] = df['fecha'].dt.strftime('%Y-%m-%d').isin(fechas_festivos).astype(int)
    
    # 🚀 DESPUÉS: FEATURES DE INTERACCIÓN BÁSICAS - CONVERSIÓN FORZADA
    df['temp_x_precipitacion'] = pd.to_numeric(df['temperatura_media'] * df['precipitacion_binaria'], errors='coerce').fillna(0)
    df['fin_semana_x_verano'] = pd.to_numeric(df['es_fin_semana'] * df['es_verano'], errors='coerce').fillna(0)
    
    # 🆕 NUEVAS INTERACCIONES POTENTES (AHORA SÍ EXISTE es_festivo)
    df['fin_semana_x_festivo'] = pd.to_numeric(df['es_fin_semana'] * df['es_festivo'], errors='coerce').fillna(0)  # Efecto doble
    df['lluvia_x_festivo'] = pd.to_numeric(df['precipitacion_binaria'] * df['es_festivo'], errors='coerce').fillna(0)  # ¿Lluvia en festivo?
    df['temp_alta_x_fin_semana'] = pd.to_numeric((df['temperatura_media'] > 25).astype(int) * df['es_fin_semana'], errors='coerce').fillna(0)  # Calor + fin de semana
    df['invierno_x_precipitacion'] = pd.to_numeric(df['es_invierno'] * df['precipitacion'], errors='coerce').fillna(0)  # Lluvia en invierno
    df['verano_x_temp_extrema'] = pd.to_numeric(df['es_verano'] * (df['temperatura_media'] > 30).astype(int), errors='coerce').fillna(0)  # Calor extremo verano
    
    # 🎯 INTERACCIONES TEMPORALES
    df['festivo_x_mes'] = pd.to_numeric(df['es_festivo'] * df['mes'], errors='coerce').fillna(0)  # ¿Festivos de qué mes?
    df['lluvia_x_dia_semana'] = pd.to_numeric(df['precipitacion_binaria'] * df['dia_semana'], errors='coerce').fillna(0)  # ¿Lluvia qué día?
    df['temp_optima'] = pd.to_numeric(((df['temperatura_media'] >= 15) & (df['temperatura_media'] <= 25)).astype(int), errors='coerce').fillna(0)  # Zona comfort
    df['temp_optima_x_fin_semana'] = pd.to_numeric(df['temp_optima'] * df['es_fin_semana'], errors='coerce').fillna(0)  # Temperatura perfecta + fin de semana
    
    # Eliminar filas con NaN (por los lags)
    df = df.dropna().reset_index(drop=True)
    
    # 🔧 VALIDACIÓN FINAL DE TIPOS
    print("   🔍 Validando tipos de datos finales...")
    
    # Asegurar que TODAS las columnas sean numéricas
    for col in df.columns:
        if col not in ['fecha']:  # Excluir fecha
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Verificar tipos
    problematic_cols = []
    for col in df.columns:
        if col != 'fecha' and df[col].dtype == 'object':
            problematic_cols.append(col)
    
    if problematic_cols:
        print(f"   ⚠️  Columnas problemáticas: {problematic_cols}")
        for col in problematic_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    print(f"   ✅ Features preparadas: {len(df)} filas, {df.shape[1]} columnas")
    print(f"   📊 Tipos de datos: {df.dtypes.value_counts().to_dict()}")
    
    # 🚨 DEBUGGING CRÍTICO - DETECTAR OVERFITTING
    print(f"\n🔍 ANÁLISIS DE DATOS (DEBUGGING):")
    print(f"   📊 Ventas únicas: {df['ventas_dia'].nunique()} de {len(df)}")
    print(f"   📊 Rango ventas: €{df['ventas_dia'].min():.2f} - €{df['ventas_dia'].max():.2f}")
    print(f"   📊 Media ventas: €{df['ventas_dia'].mean():.2f}")
    print(f"   📊 Std ventas: €{df['ventas_dia'].std():.2f}")
    print(f"   📊 Fechas únicas: {df['fecha'].dt.date.nunique()}")
    print(f"   📊 Primera fecha: {df['fecha'].min()}")
    print(f"   📊 Última fecha: {df['fecha'].max()}")
    
    # Verificar duplicados
    duplicados = df.duplicated().sum()
    if duplicados > 0:
        print(f"   ⚠️  DUPLICADOS ENCONTRADOS: {duplicados} registros")
    
    # Verificar constantes
    constantes = (df['ventas_dia'].std() < 0.01)
    if constantes:
        print(f"   ⚠️  VENTAS CASI CONSTANTES: std = {df['ventas_dia'].std():.6f}")
    
    # Mostrar muestra de datos
    print(f"\n📋 MUESTRA DE DATOS:")
    print(df[['fecha', 'ventas_dia', 'temperatura_media', 'precipitacion']].head(10))
    
    return df

# ================================
# 4. ENTRENAMIENTO XGBOOST
# ================================

def entrenar_xgboost(df):
    """Entrena modelo XGBoost optimizado"""
    print("🎯 Entrenando modelo XGBoost...")
    
    # Seleccionar features
    # 🚀 FEATURES EXPANDIDAS CON INTERACCIONES
    feature_cols = [
        # Clima básico
        'temperatura_media', 'temperatura_cuadratica', 'precipitacion', 'precipitacion_binaria',
        'viento_velocidad',
        # Temporales cíclicas
        'dia_semana_sin', 'dia_semana_cos', 'mes_sin', 'mes_cos',
        'es_fin_semana', 'es_verano', 'es_invierno', 'es_festivo',
        # Series temporales (lag y rolling)
        'ventas_lag1', 'ventas_lag7', 'ventas_lag30', 'ventas_ma7', 'ventas_ma30', 'ventas_std7',
        # 🆕 INTERACCIONES BÁSICAS
        'temp_x_precipitacion', 'fin_semana_x_verano',
        # 🆕 INTERACCIONES AVANZADAS (NUEVAS)
        'fin_semana_x_festivo', 'lluvia_x_festivo', 'temp_alta_x_fin_semana',
        'invierno_x_precipitacion', 'verano_x_temp_extrema', 'festivo_x_mes',
        'lluvia_x_dia_semana', 'temp_optima', 'temp_optima_x_fin_semana'
    ]
    
    # 🎯 SELECCIÓN DE FEATURES ANTI-OVERFITTING (TOP 15)
    feature_cols_reduced = [
        # 🥇 TOP FEATURES TEMPORALES (más importantes del resultado anterior)
        'dia_semana_sin', 'dia_semana_cos',           # Los 2 más importantes (0.319, 0.190)
        # 🥈 SERIES TEMPORALES CRÍTICAS  
        'ventas_ma7', 'ventas_lag1', 'ventas_std7', 'ventas_lag7',  # Tendencias (0.080, 0.046)
        # 🥉 INTERACCIONES EFECTIVAS (probadas en resultado anterior)
        'invierno_x_precipitacion', 'temp_optima_x_fin_semana',     # (0.036, 0.033)
        # 📊 CLIMA BÁSICO (selectivo)
        'temperatura_media', 'precipitacion_binaria',               # Clima esencial
        # 🗓️ TEMPORALES BÁSICAS
        'mes_cos', 'es_fin_semana', 'es_festivo',                   # Patrones temporales
        # 🎯 INTERACCIONES BÁSICAS (2 mejores)
        'temp_optima', 'fin_semana_x_verano'                        # Las más estables
    ]
    
    # Verificar que existen todas las features
    available_features = [f for f in feature_cols_reduced if f in df.columns]
    missing_features = [f for f in feature_cols_reduced if f not in df.columns]
    
    if missing_features:
        print(f"   ⚠️  Features faltantes: {missing_features}")
        print(f"   📊 Disponibles: {len(available_features)}/15")
        feature_cols = available_features
    else:
        feature_cols = feature_cols_reduced
        print(f"   🎯 FEATURES REDUCIDAS: {len(feature_cols)} (anti-overfitting)")
    
    X = df[feature_cols]
    y = df['ventas_dia']
    
    print(f"   📊 Features finales: {len(feature_cols)}")
    print(f"   📊 Muestras: {len(X)}")
    
    # 🔧 VALIDACIÓN CRÍTICA DE TIPOS PARA XGBOOST
    print("   🔍 Validación pre-XGBoost...")
    
    # Convertir X a numérico FORZADO
    for col in feature_cols:
        if col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
    
    # Verificar que no hay NaN ni objetos
    nan_cols = X.isnull().sum()[X.isnull().sum() > 0]
    if len(nan_cols) > 0:
        print(f"   ⚠️  Rellenando NaN en: {list(nan_cols.index)}")
        X = X.fillna(0)
    
    # Verificar tipos finales
    object_cols = X.select_dtypes(include=['object']).columns
    if len(object_cols) > 0:
        print(f"   ⚠️  Convirtiendo objeto a numérico: {list(object_cols)}")
        for col in object_cols:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
    
    print(f"   ✅ Tipos X: {X.dtypes.value_counts().to_dict()}")
    print(f"   ✅ Tipo y: {y.dtype}")
    
    # 🎯 MUESTREO INTELIGENTE (configurable)
    from sklearn.model_selection import train_test_split
    
    print(f"   🎲 Método de muestreo: {SAMPLING_METHOD}")
    
    if SAMPLING_METHOD == "stratified":
        # 📊 MUESTREO ESTRATIFICADO POR RANGO DE VENTAS
        y_bins = pd.qcut(y, q=5, labels=['Muy_Bajo', 'Bajo', 'Medio', 'Alto', 'Muy_Alto'])
        
        print(f"   📊 Distribución original: {y_bins.value_counts().to_dict()}")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=0.2,
            stratify=y_bins,     # Mantener proporción por rango
            random_state=42,
            shuffle=True
        )
        
        # Verificar distribución mantenida
        train_bins = y_bins[X_train.index].value_counts()
        test_bins = y_bins[X_test.index].value_counts()
        print(f"   🚂 Train distribución: {train_bins.to_dict()}")
        print(f"   🧪 Test distribución: {test_bins.to_dict()}")
        
    elif SAMPLING_METHOD == "temporal":
        # 📅 MUESTREO TEMPORAL BALANCEADO (cada N días)
        print("   📅 Muestreo temporal: tomando cada 5° día para test")
        
        indices = list(range(len(X)))
        test_indices = indices[4::5]  # Cada 5° registro (spread temporal)
        train_indices = [i for i in indices if i not in test_indices]
        
        X_train, X_test = X.iloc[train_indices], X.iloc[test_indices]
        y_train, y_test = y.iloc[train_indices], y.iloc[test_indices]
        
    else:  # "random"
        # 🎲 MUESTREO COMPLETAMENTE ALEATORIO
        print("   🎲 Muestreo aleatorio simple")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=0.2,
            random_state=42,
            shuffle=True
        )
    
    print(f"   🚂 Train: {len(X_train)} muestras ({SAMPLING_METHOD})")
    print(f"   🧪 Test: {len(X_test)} muestras ({SAMPLING_METHOD})")
    
    # 🚨 DEBUGGING SPLIT
    print(f"\n🔍 ANÁLISIS DEL SPLIT:")
    print(f"   📊 Train - Media: €{y_train.mean():.2f}, Std: €{y_train.std():.2f}")
    print(f"   📊 Test  - Media: €{y_test.mean():.2f}, Std: €{y_test.std():.2f}")
    print(f"   📊 Train - Rango: €{y_train.min():.2f} - €{y_train.max():.2f}")
    print(f"   📊 Test  - Rango: €{y_test.min():.2f} - €{y_test.max():.2f}")
    
    # Verificar si hay overlap problemático
    if y_train.std() < 0.01 or y_test.std() < 0.01:
        print(f"   ⚠️  PROBLEMA: Datos casi constantes detectados!")
    
    if len(set(y_train).intersection(set(y_test))) > len(y_test) * 0.8:
        print(f"   ⚠️  PROBLEMA: Demasiado overlap entre train y test!")
    
    # 🚨 PARÁMETROS ANTI-OVERFITTING EXTREMO (RATIO 3.05 → <1.5)
    xgb_params = {
        'objective': 'reg:squarederror',
        'max_depth': 3,           # 🚨 EXTREMO: 4→3 (aún menos complejidad)
        'learning_rate': 0.01,    # 🚨 EXTREMO: 0.03→0.01 (ultra lento)
        'n_estimators': 300,      # 🔧 REDUCIDO: 500→300 (por compatibilidad)
        'subsample': 0.6,         # 🚨 EXTREMO: 0.7→0.6 (más regularización)
        'colsample_bytree': 0.6,  # 🚨 EXTREMO: 0.7→0.6 (menos features)
        'colsample_bylevel': 0.6, # 🆕 NUEVO: Regularización por nivel
        'gamma': 2.0,             # 🚨 EXTREMO: 1.0→2.0 (más penalización)
        'reg_alpha': 0.5,         # 🚨 EXTREMO: 0.1→0.5 (L1 agresivo)
        'reg_lambda': 2.0,        # 🚨 EXTREMO: 1.0→2.0 (L2 agresivo)
        'min_child_weight': 5,    # 🚨 EXTREMO: 3→5 (mínimo por hoja)
        'max_delta_step': 1,      # 🆕 NUEVO: Limitar cambios
        'random_state': 42,
        'n_jobs': -1,
        'verbosity': 0,
        'early_stopping_rounds': None  # 🔧 Manejar separadamente
    }
    
    # 🚀 VALIDACIÓN CRUZADA TEMPORAL (TimeSeriesSplit)
    from sklearn.model_selection import TimeSeriesSplit
    
    print("   🔄 Realizando validación cruzada temporal...")
    tscv = TimeSeriesSplit(n_splits=5)  # 5 folds temporales
    cv_scores = []
    
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
        X_cv_train, X_cv_val = X.iloc[train_idx], X.iloc[val_idx]
        y_cv_train, y_cv_val = y.iloc[train_idx], y.iloc[val_idx]
        
        # Entrenar en fold
        modelo_cv = xgb.XGBRegressor(**xgb_params)
        modelo_cv.fit(X_cv_train, y_cv_train, verbose=False)
        
        # Predecir en validación
        y_cv_pred = modelo_cv.predict(X_cv_val)
        
        # Calcular MAE del fold
        fold_mae = np.mean(np.abs(y_cv_val - y_cv_pred))
        cv_scores.append(fold_mae)
        print(f"   📊 Fold {fold}: MAE = €{fold_mae:.2f}")
    
    cv_mean = np.mean(cv_scores)
    cv_std = np.std(cv_scores)
    print(f"   🎯 CV MAE: €{cv_mean:.2f} ± €{cv_std:.2f}")
    
    # 🚨 ENTRENAR CON EARLY STOPPING (anti-overfitting)
    # Dividir train en train/validation para early stopping
    val_size = int(len(X_train) * 0.2)
    X_train_es, X_val_es = X_train[:-val_size], X_train[-val_size:]
    y_train_es, y_val_es = y_train[:-val_size], y_train[-val_size:]
    
    print(f"   🛑 Early Stopping: Train={len(X_train_es)}, Val={len(X_val_es)}")
    
    # 🚨 CORREGIR EARLY STOPPING - Método compatible
    modelo_xgb = xgb.XGBRegressor(**xgb_params)
    
    try:
        # Intentar con early stopping (método moderno)
        modelo_xgb.fit(
            X_train_es, y_train_es,
            eval_set=[(X_val_es, y_val_es)],
            early_stopping_rounds=50,
            verbose=False
        )
        print(f"   🎯 Early stopping activado en iteración: {modelo_xgb.best_iteration}")
        
    except Exception as e:
        # Fallback: entrenar sin early stopping pero con menos iteraciones
        print(f"   ⚠️  Early stopping falló: {e}")
        print("   🔄 Entrenando con iteraciones reducidas...")
        
        # Reducir iteraciones manualmente para simular early stopping
        xgb_params_reduced = xgb_params.copy()
        xgb_params_reduced['n_estimators'] = 200  # Reducir de 500 a 200
        
        modelo_xgb = xgb.XGBRegressor(**xgb_params_reduced)
        modelo_xgb.fit(X_train_es, y_train_es, verbose=False)
        print(f"   ✅ Entrenado con {xgb_params_reduced['n_estimators']} iteraciones")
    
    # Predicciones
    y_pred_train = modelo_xgb.predict(X_train)
    y_pred_test = modelo_xgb.predict(X_test)
    
    # Métricas - CONVERSIÓN A PYTHON NATIVO
    mae_train = float(mean_absolute_error(y_train, y_pred_train))
    mae_test = float(mean_absolute_error(y_test, y_pred_test))
    rmse_test = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))
    r2_test = float(r2_score(y_test, y_pred_test))
    mape_test = float(np.mean(np.abs((y_test - y_pred_test) / y_test)) * 100)
    
    # 🚨 ANÁLISIS DE OVERFITTING
    overfitting_ratio = mae_test / mae_train if mae_train > 0 else float('inf')
    overfitting_status = "🟢 BUENO" if overfitting_ratio < 1.2 else "🟡 MODERADO" if overfitting_ratio < 1.5 else "🔴 ALTO"
    
    print(f"\n📊 RESULTADOS XGBOOST REGULARIZADO:")
    print(f"   📊 Features utilizadas: {len(feature_cols)}")
    print(f"   🎯 CV MAE (robusto):     €{cv_mean:.2f} ± €{cv_std:.2f}")
    print(f"   🚂 MAE Train:           €{mae_train:.2f}")
    print(f"   🧪 MAE Test:            €{mae_test:.2f}")
    print(f"   📈 RMSE Test:           €{rmse_test:.2f}")
    print(f"   📊 R² Test:             {r2_test:.3f}")
    print(f"   📊 MAPE Test:           {mape_test:.1f}%")
    print(f"   🔍 Overfitting Ratio:   {overfitting_ratio:.2f} {overfitting_status}")
    print(f"   💡 Train vs Test GAP:   €{mae_test - mae_train:.2f}")
    
    # Feature importance - CONVERSIÓN A PYTHON NATIVO
    importance = modelo_xgb.feature_importances_
    feature_importance = {feature: float(imp) for feature, imp in zip(feature_cols, importance)}
    feature_importance = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
    
    print("\n🎯 FEATURE IMPORTANCE:")
    for feature, imp in list(feature_importance.items())[:10]:
        print(f"   {feature:<20}: {imp:.3f}")
    
    return modelo_xgb, feature_cols, {
        'mae': float(mae_test),
        'rmse': float(rmse_test),
        'r2': float(r2_test),
        'mape': float(mape_test),
        'feature_importance': feature_importance  # Ya convertido arriba
    }

# ================================
# 5. ENTRENAMIENTO LIGHTGBM
# ================================

def entrenar_lightgbm(df):
    """Entrena modelo LightGBM optimizado"""
    print("⚡ Entrenando modelo LightGBM...")
    
    # Mismas features que XGBoost
    # 🚀 FEATURES EXPANDIDAS CON INTERACCIONES
    feature_cols = [
        # Clima básico
        'temperatura_media', 'temperatura_cuadratica', 'precipitacion', 'precipitacion_binaria',
        'viento_velocidad',
        # Temporales cíclicas
        'dia_semana_sin', 'dia_semana_cos', 'mes_sin', 'mes_cos',
        'es_fin_semana', 'es_verano', 'es_invierno', 'es_festivo',
        # Series temporales (lag y rolling)
        'ventas_lag1', 'ventas_lag7', 'ventas_lag30', 'ventas_ma7', 'ventas_ma30', 'ventas_std7',
        # 🆕 INTERACCIONES BÁSICAS
        'temp_x_precipitacion', 'fin_semana_x_verano',
        # 🆕 INTERACCIONES AVANZADAS (NUEVAS)
        'fin_semana_x_festivo', 'lluvia_x_festivo', 'temp_alta_x_fin_semana',
        'invierno_x_precipitacion', 'verano_x_temp_extrema', 'festivo_x_mes',
        'lluvia_x_dia_semana', 'temp_optima', 'temp_optima_x_fin_semana'
    ]
    
    X = df[feature_cols]
    y = df['ventas_dia']
    
    # Split temporal
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Parámetros optimizados para LightGBM
    lgb_params = {
        'objective': 'regression',
        'metric': 'mae',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.1,
        'n_estimators': 200,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'n_jobs': -1,
        'verbose': -1
    }
    
    # Entrenar modelo
    modelo_lgb = lgb.LGBMRegressor(**lgb_params)
    modelo_lgb.fit(X_train, y_train)
    
    # Predicciones
    y_pred_test = modelo_lgb.predict(X_test)
    
    # Métricas - CONVERSIÓN A PYTHON NATIVO
    mae_test = float(mean_absolute_error(y_test, y_pred_test))
    rmse_test = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))
    r2_test = float(r2_score(y_test, y_pred_test))
    mape_test = float(np.mean(np.abs((y_test - y_pred_test) / y_test)) * 100)
    
    print("\n📊 RESULTADOS LIGHTGBM:")
    print(f"   MAE Test:  {mae_test:.2f}€")
    print(f"   RMSE Test: {rmse_test:.2f}€")
    print(f"   R² Test:   {r2_test:.3f}")
    print(f"   MAPE Test: {mape_test:.1f}%")
    
    return modelo_lgb, feature_cols, {
        'mae': float(mae_test),
        'rmse': float(rmse_test),
        'r2': float(r2_test),
        'mape': float(mape_test)
    }

# ================================
# 6. EXPORTACIÓN PARA SUPABASE
# ================================

def exportar_modelo(modelo, feature_cols, metricas, tipo_modelo):
    """Exporta modelo entrenado para integración con Supabase"""
    print(f"\n💾 Exportando modelo {tipo_modelo}...")
    
    # Guardar modelo completo
    model_filename = f"modelo_{tipo_modelo.lower()}_{datetime.now().strftime('%Y%m%d_%H%M')}.pkl"
    with open(model_filename, 'wb') as f:
        pickle.dump({
            'modelo': modelo,
            'features': feature_cols,
            'metricas': metricas,
            'timestamp': datetime.now().isoformat()
        }, f)
    
    print(f"   ✅ Modelo guardado: {model_filename}")
    
    # Crear función de predicción para Supabase (JavaScript)
    js_code = generar_codigo_javascript(modelo, feature_cols, metricas, tipo_modelo)
    
    js_filename = f"prediccion_{tipo_modelo.lower()}.js"
    with open(js_filename, 'w') as f:
        f.write(js_code)
    
    print(f"   ✅ Código JS generado: {js_filename}")
    
    return model_filename, js_filename

def generar_codigo_javascript(modelo, feature_cols, metricas, tipo_modelo):
    """Genera código JavaScript para predicción en Supabase"""
    
    # Obtener los parámetros del modelo entrenado
    if tipo_modelo == 'XGBoost':
        # Para XGBoost, necesitaríamos serializar el árbol completo
        # Por simplicidad, creamos una aproximación lineal
        importances = dict(zip(feature_cols, modelo.feature_importances_))
    else:
        importances = dict(zip(feature_cols, modelo.feature_importances_))
    
    js_code = f"""
// Modelo {tipo_modelo} entrenado - Generado automáticamente
// Fecha: {datetime.now().isoformat()}
// Métricas: MAE={metricas['mae']:.2f}, R²={metricas['r2']:.3f}, MAPE={metricas['mape']:.1f}%

const MODELO_{tipo_modelo.upper()} = {{
  tipo: '{tipo_modelo}',
  features: {json.dumps(feature_cols, indent=2)},
  metricas: {json.dumps(metricas, indent=2)},
  
  // Función de predicción simplificada (aproximación lineal de {tipo_modelo})
  predecir: function(datos) {{
    // Preparar features
    const features = this.prepararFeatures(datos);
    
    // Aplicar modelo lineal (aproximación)
    let prediccion = {modelo.predict(np.zeros((1, len(feature_cols))))[0]:.2f}; // baseline
    
    // Añadir contribuciones de features importantes
    {chr(10).join([f'    if (features.{feat}) prediccion += features.{feat} * {importances[feat]:.6f};' for feat in feature_cols[:10]])}
    
    return Math.max(0, prediccion);
  }},
  
  prepararFeatures: function(dato) {{
    const fechaObj = new Date(dato.fecha);
    const diaSemana = fechaObj.getDay();
    const mes = fechaObj.getMonth() + 1;
    
    return {{
      temperatura_media: dato.temperatura_media || 15,
      temperatura_cuadratica: Math.pow(dato.temperatura_media || 15, 2),
      precipitacion: dato.precipitacion || 0,
      precipitacion_binaria: (dato.precipitacion || 0) > 0.5 ? 1 : 0,
      viento_velocidad: dato.viento_velocidad || 10,
      dia_semana_sin: Math.sin(2 * Math.PI * diaSemana / 7),
      dia_semana_cos: Math.cos(2 * Math.PI * diaSemana / 7),
      mes_sin: Math.sin(2 * Math.PI * mes / 12),
      mes_cos: Math.cos(2 * Math.PI * mes / 12),
      es_fin_semana: [0, 6].includes(diaSemana) ? 1 : 0,
      es_verano: [6, 7, 8].includes(mes) ? 1 : 0,
      es_invierno: [12, 1, 2].includes(mes) ? 1 : 0,
      es_festivo: 0, // Simplificado
      ventas_lag1: dato.ventas_lag1 || dato.ventas_dia || 1000,
      ventas_lag7: dato.ventas_lag7 || dato.ventas_dia || 1000,
      ventas_lag30: dato.ventas_lag30 || dato.ventas_dia || 1000,
      ventas_ma7: dato.ventas_ma7 || dato.ventas_dia || 1000,
      ventas_ma30: dato.ventas_ma30 || dato.ventas_dia || 1000,
      ventas_std7: dato.ventas_std7 || 200,
      temp_x_precipitacion: (dato.temperatura_media || 15) * ((dato.precipitacion || 0) > 0.5 ? 1 : 0),
      fin_semana_x_verano: ([0, 6].includes(diaSemana) ? 1 : 0) * ([6, 7, 8].includes(mes) ? 1 : 0)
    }};
  }}
}};

module.exports = MODELO_{tipo_modelo.upper()};
"""
    
    return js_code

# ================================
# 7. FUNCIÓN PRINCIPAL
# ================================

def main():
    """Función principal"""
    print("🚀 Iniciando entrenamiento de modelos avanzados...")
    
    # 1. Extraer datos
    df_ventas, df_clima = extraer_datos_supabase()
    
    # Si falló la conexión, intentar cargar datos locales
    if df_ventas is None:
        print("🔄 Intentando cargar datos locales...")
        try:
            if os.path.exists('ventas_data.csv') and os.path.exists('clima_data.csv'):
                print("   📁 Archivos locales encontrados")
                df_ventas = pd.read_csv('ventas_data.csv')
                df_clima = pd.read_csv('clima_data.csv')
                print(f"   ✅ Ventas: {len(df_ventas)} registros")
                print(f"   ✅ Clima: {len(df_clima)} registros")
            else:
                print("❌ No se encontraron archivos locales. Verifica la configuración.")
                return
        except Exception as e:
            print(f"❌ Error cargando datos locales: {e}")
            return
    
    # 2. Preparar features
    df = preparar_features(df_ventas, df_clima)
    
    # 3. Entrenar XGBoost
    modelo_xgb, features_xgb, metricas_xgb = entrenar_xgboost(df)
    archivo_xgb, js_xgb = exportar_modelo(modelo_xgb, features_xgb, metricas_xgb, 'XGBoost')
    
    # 4. Entrenar LightGBM
    modelo_lgb, features_lgb, metricas_lgb = entrenar_lightgbm(df)
    archivo_lgb, js_lgb = exportar_modelo(modelo_lgb, features_lgb, metricas_lgb, 'LightGBM')
    
    # 5. Comparación final
    print("\n" + "="*50)
    print("📊 COMPARACIÓN FINAL DE MODELOS")
    print("="*50)
    print(f"XGBoost  - MAE: {metricas_xgb['mae']:.2f}€, R²: {metricas_xgb['r2']:.3f}, MAPE: {metricas_xgb['mape']:.1f}%")
    print(f"LightGBM - MAE: {metricas_lgb['mae']:.2f}€, R²: {metricas_lgb['r2']:.3f}, MAPE: {metricas_lgb['mape']:.1f}%")
    
    mejor_modelo = 'XGBoost' if metricas_xgb['mae'] < metricas_lgb['mae'] else 'LightGBM'
    print(f"\n🏆 Mejor modelo: {mejor_modelo}")
    
    print(f"\n📁 Archivos generados:")
    print(f"   • {archivo_xgb}")
    print(f"   • {js_xgb}")
    print(f"   • {archivo_lgb}")
    print(f"   • {js_lgb}")
    
    print("\n✅ ¡Entrenamiento completado!")
    print("🔧 Próximo paso: Integrar el mejor modelo en Supabase Edge Functions")

if __name__ == "__main__":
    main()
