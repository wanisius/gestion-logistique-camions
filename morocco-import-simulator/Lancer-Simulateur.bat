@echo off
chcp 65001 >nul
title Morocco Import Simulator
cd /d "%~dp0"
echo ==========================================================
echo   MOROCCO IMPORT SIMULATOR - Academie de l'importation
echo ==========================================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe : ouverture de la version autonome.
  start "" "%~dp0livrable\MoroccoImportSimulator.html"
  exit /b 0
)
if not exist node_modules (
  echo Premiere execution : installation des dependances...
  call npm install
  if errorlevel 1 ( echo Echec de npm install. & pause & exit /b 1 )
)
echo Construction de l'application...
call npm run build
if errorlevel 1 ( echo Echec de la construction. & pause & exit /b 1 )
echo Le simulateur s'ouvre dans votre navigateur : http://localhost:4173
echo Fermez cette fenetre pour arreter le simulateur.
call npx vite preview --port 4173 --open
