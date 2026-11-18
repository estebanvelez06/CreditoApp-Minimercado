
@echo off
title CreditoApp - Inicio completo

echo =====================================
echo       INICIANDO CREDITOAPP
echo =====================================

echo.
echo [1/3] Iniciando backend...

cd /d "C:\Users\ADMIN\Documents\creditoapp\CreditoApp\backend"

start "CreditoApp - Backend" cmd /k "C:\Users\ADMIN\Documents\creditoapp\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 4 /nobreak >nul

echo [2/3] Iniciando Cloudflare Tunnel...

start "CreditoApp - Cloudflare" cmd /k "cloudflared tunnel --url http://127.0.0.1:8000"

timeout /t 3 /nobreak >nul

echo [3/3] Abriendo CreditoApp...

start http://127.0.0.1:8000/

echo.
echo CreditoApp se esta iniciando.
echo No cierres las ventanas del backend ni Cloudflare.
echo.
pause