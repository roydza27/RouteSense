@echo off
REM Metric Heartbeat - Server Startup Script (Windows)

echo.
echo ========================================
echo  Metric Heartbeat Backend Startup
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

REM Check if ports are available
echo [CHECK] Verifying ports...

netstat -ano | findstr :3002 > nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 3002 is already in use!
    echo Would you like to kill the process? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /PID %%a /F
        echo [OK] Port 3002 cleared
    ) else (
        echo [ERROR] Cannot start on port 3002
        pause
        exit /b 1
    )
)

netstat -ano | findstr :4001 > nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 4001 is already in use!
    echo Would you like to kill the process? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001') do taskkill /PID %%a /F
        echo [OK] Port 4001 cleared
    ) else (
        echo [ERROR] Cannot start on port 4001
        pause
        exit /b 1
    )
)

REM Check target backend
echo.
echo [CHECK] Looking for target backend on port 3001...
netstat -ano | findstr :3001 > nul
if %errorlevel% equ 0 (
    echo [OK] Target backend detected on port 3001
) else (
    echo [WARNING] Target backend is NOT running on port 3001
    echo The proxy will work but requests will fail.
    echo.
    echo Continue anyway? (Y/N)
    set /p choice=
    if /i not "%choice%"=="Y" (
        exit /b 1
    )
)

echo.
echo ========================================
echo  Starting Servers...
echo ========================================
echo.

REM Start both servers
call npm run dev

pause