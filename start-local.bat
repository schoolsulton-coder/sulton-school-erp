@echo off
chcp 65001 >nul
echo ================================================
echo   Sulton School ERP - lokal serverlar
echo ================================================
echo.
echo Backend  : http://localhost:4000
echo Frontend : http://localhost:3005
echo.
echo Ikkita terminal oynasi ochiladi - ularni YOPMANG.
echo To'xtatish: shu oynalarni yoping yoki Ctrl+C.
echo.

start "Sulton Backend (4000)"  cmd /k "cd /d %~dp0backend && npm run start:dev"
timeout /t 2 >nul
start "Sulton Frontend (3005)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Ishga tushirildi. ~20 soniyadan so'ng brauzerda oching:
echo    http://localhost:3005
echo.
pause
