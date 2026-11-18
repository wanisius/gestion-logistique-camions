@echo off
chcp 65001 >nul
cd /d "%~dp0"
call scripts\python.bat || goto :eof
echo Diagnostic du reseau (analyse non destructive)...
%PY% -m wsm diagnose
echo.
pause
