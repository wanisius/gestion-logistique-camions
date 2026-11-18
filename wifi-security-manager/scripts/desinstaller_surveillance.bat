@echo off
chcp 65001 >nul
choice /M "Supprimer la tache planifiee WiFi Security Manager"
if errorlevel 2 goto :eof
schtasks /Delete /F /TN "WiFi Security Manager"
echo La surveillance ne demarrera plus automatiquement. Pour larreter maintenant, fermez la session ou terminez pythonw.exe.
pause
