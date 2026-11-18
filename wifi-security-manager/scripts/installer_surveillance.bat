@echo off
chcp 65001 >nul
echo Cette commande cree une tache planifiee Windows "WiFi Security Manager"
echo qui lance la surveillance a votre ouverture de session (sans droits administrateur).
echo Le tableau de bord restera disponible sur http://127.0.0.1:8765/
echo.
choice /M "Confirmez-vous la creation de la tache"
if errorlevel 2 (echo Annule. & pause & goto :eof)
schtasks /Create /F /SC ONLOGON /TN "WiFi Security Manager" /TR "wscript.exe \"%~dp0surveillance_cachee.vbs\""
if errorlevel 1 (echo Echec de creation de la tache. & pause & goto :eof)
wscript.exe "%~dp0surveillance_cachee.vbs"
echo Tache creee et surveillance demarree.
pause
