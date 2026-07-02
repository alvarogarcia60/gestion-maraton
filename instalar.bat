@echo off
:: Configurar codificación de caracteres a UTF-8 para mostrar tildes correctamente
chcp 65001 > nul

echo ===================================================
echo   CONFIGURACIÓN AUTOMÁTICA DEL PROYECTO
echo ===================================================
echo.

:: 1. Comprobar si Git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git no está instalado en este sistema.
    echo Intentando instalar Git usando winget...
    winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] No se pudo instalar Git automáticamente.
        echo Por favor, descárgalo e instálalo manualmente desde: https://git-scm.com/
        pause
        exit /b
    )
    echo [OK] Git instalado correctamente. Por favor, reinicia este script para aplicar los cambios de Git.
    pause
    exit /b
) else (
    echo [OK] Git detectado.
)

:: 2. Comprobar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js no está instalado en este sistema.
    echo Intentando instalar Node.js LTS usando winget...
    winget install --id OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] No se pudo instalar Node.js automáticamente.
        echo Por favor, descárgalo e instálalo manualmente desde: https://nodejs.org/
        pause
        exit /b
    )
    echo [OK] Node.js instalado correctamente. Por favor, reinicia este script para aplicar los cambios.
    pause
    exit /b
) else (
    echo [OK] Node.js detectado.
)

:: 3. Clonar el repositorio si no existe la carpeta gestion-maraton
if not exist "gestion-maraton" (
    echo.
    echo [PROCESO] Clonando el repositorio...
    git clone https://github.com/alvarogarcia60/gestion-maraton.git
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo clonar el repositorio. Verifica tu conexión a internet o los permisos.
        pause
        exit /b
    )
) else (
    echo [INFO] La carpeta "gestion-maraton" ya existe. Saltando clonado.
)

:: 4. Entrar al proyecto e instalar dependencias
cd gestion-maraton
echo.
echo [PROCESO] Instalando dependencias de Node.js (esto puede tardar unos minutos)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Hubo un error al instalar las dependencias con 'npm install'.
    pause
    exit /b
)
echo [OK] Dependencias instaladas correctamente.

:: 5. Abrir VS Code en el proyecto
echo.
echo [PROCESO] Abriendo Visual Studio Code...
code .
if %errorlevel% neq 0 (
    echo [INFO] No se pudo abrir VS Code automáticamente. Asegúrate de tenerlo instalado y en tu PATH.
)

:: 6. Ejecutar servidor de desarrollo
echo.
echo [PROCESO] Iniciando servidor de desarrollo...
echo El servidor se iniciará en http://localhost:3000
echo.
npm run dev

pause
