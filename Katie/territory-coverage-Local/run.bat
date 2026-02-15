@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ========================================
echo Territory Coverage - Install and Run
echo ========================================
echo.

REM --- Check Node.js ---
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js 18+ from https://nodejs.org/
    echo Make sure to check "Add to PATH" during installation.
    echo.
    pause
    exit /b 1
)
node --version
echo Node.js found!
echo.

REM --- Install dependencies ---
echo [2/6] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo Dependencies installed!
echo.

REM --- Create .env if missing ---
echo [3/6] Checking environment...
if not exist ".env" (
    echo .env not found. Creating with generated AUTH_SECRET...
    for /f "delims=" %%a in ('node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"') do set AUTH_SECRET=%%a
    echo AUTH_SECRET=!AUTH_SECRET!> .env
    echo .env created with AUTH_SECRET.
) else (
    echo .env already exists.
)
echo.

REM --- Database setup ---
echo [4/6] Running Prisma migrations...
call npx prisma migrate deploy
if errorlevel 1 (
    echo Migration deploy failed. Trying prisma db push for fresh setup...
    call npx prisma db push
    if errorlevel 1 (
        echo ERROR: Database setup failed
        pause
        exit /b 1
    )
)
echo Database ready!
echo.

REM --- Seed database ---
echo [5/6] Seeding database...
call npm run prisma:seed
if errorlevel 1 (
    echo WARNING: Seed failed - database may already be seeded. Continuing...
)
echo.

REM --- Start dev server ---
echo [6/6] Starting development server...
echo.
echo ========================================
echo App will be available at http://localhost:3000
echo Default login: kpursel3 / iloveyou
echo Press Ctrl+C to stop the server
echo ========================================
echo.
call npm run dev

pause
