@echo off
echo 🚀 Configurando entorno para XGBoost/LightGBM
echo ============================================

echo 📦 Instalando dependencias de Python...
pip install -r requirements.txt

echo 🎯 Ejecutando entrenamiento de modelos...
python xgboost_model.py

echo ✅ ¡Completado!
echo 📁 Revisa los archivos generados:
echo    - modelo_xgboost_*.pkl
echo    - modelo_lightgbm_*.pkl  
echo    - prediccion_xgboost.js
echo    - prediccion_lightgbm.js

pause

