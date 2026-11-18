@echo off
chcp 65001 >nul
cd /d "%~dp0"
call scripts\python.bat || goto :eof
%PY% -m wsm serve
