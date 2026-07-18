@echo off
title VedyaAI Demo Start
cd /d "%~dp0"
echo.
echo  Starting VedyaAI (Postgres + API + Frontend)...
echo  Leave this window open while you demo.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-demo.ps1"
echo.
echo  If the browser did not open: http://localhost:3000
pause
