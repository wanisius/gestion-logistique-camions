@echo off
rem Trouve un interpreteur Python 3.10+ et le place dans %%PY%%.
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY (
  echo Python 3.10 ou plus recent est requis : https://www.python.org/downloads/windows/
  echo Cochez "Add python.exe to PATH" pendant linstallation.
  pause
  exit /b 1
)
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" || (echo Python 3.10+ requis. & pause & exit /b 1)
exit /b 0
