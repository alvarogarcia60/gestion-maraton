@echo off
echo ===================================================
echo   CONFIGURACION AUTOMATICA DEL PROYECTO
echo ===================================================
echo.

:: 1. Comprobar Git
git --version >nul 2>&1
if %errorlevel% equ 0 goto check_node

echo [!] Git no esta instalado en este sistema.
echo Intentando instalar Git usando winget...
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
if %errorlevel% equ 0 goto git_installed_ok

echo.
echo [ERROR] No se pudo instalar Git automaticamente.
echo Por favor, descargalo e instalalo manualmente desde: https://git-scm.com/
pause
exit /b

:git_installed_ok
echo.
echo [OK] Git instalado correctamente. 
echo Cierra esta ventana y vuelve a abrir el archivo para continuar.
pause
exit /b


:: 2. Comprobar Node.js
:check_node
echo [OK] Git detectado.
node --version >nul 2>&1
if %errorlevel% equ 0 goto clone_repo

echo [!] Node.js no esta instalado en este sistema.
echo Intentando instalar Node.js LTS usando winget...
winget install --id OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
if %errorlevel% equ 0 goto node_installed_ok

echo.
echo [ERROR] No se pudo instalar Node.js automaticamente.
echo Por favor, descargalo e instalalo manualmente desde: https://nodejs.org/
pause
exit /b

:node_installed_ok
echo.
echo [OK] Node.js instalado correctamente.
echo Cierra esta ventana y vuelve a abrir el archivo para continuar.
pause
exit /b


:: 3. Clonar repositorio
:clone_repo
echo [OK] Node.js detectado.
if exist "gestion-maraton" goto install_deps

echo.
echo [PROCESO] Clonando el repositorio...
git clone https://github.com/alvarogarcia60/gestion-maraton.git
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo clonar el repositorio. Verifica tu conexion a internet.
    pause
    exit /b
)
goto install_deps


:: 4. Instalar dependencias
:install_deps
if not exist "gestion-maraton" (
    echo [ERROR] No se encuentra la carpeta del proyecto.
    pause
    exit /b
)

cd gestion-maraton
echo.
echo [PROCESO] Instalando dependencias (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Error al ejecutar 'npm install'.
    pause
    exit /b
)
echo [OK] Dependencias instaladas.


:: 5. Abrir VS Code y arrancar
echo.
echo [PROCESO] Abriendo Visual Studio Code...
code .

echo.
echo [PROCESO] Iniciando servidor de desarrollo...
echo La aplicacion deberia abrirse en http://localhost:3000
echo.
call npm run dev
pause

