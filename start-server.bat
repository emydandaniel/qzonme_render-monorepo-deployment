@echo off
echo 🚀 Starting QzonMe production server...

REM Check if required environment variables are set
if "%DATABASE_URL%"=="" (
    echo ❌ ERROR: DATABASE_URL environment variable is not set
    exit /b 1
)

if "%SESSION_SECRET%"=="" (
    echo ❌ ERROR: SESSION_SECRET environment variable is not set
    exit /b 1
)

REM Set NODE_ENV to production if not already set
if "%NODE_ENV%"=="" set NODE_ENV=production

echo ✅ Environment: %NODE_ENV%
echo ✅ Database connection configured

REM Change to project directory
cd /d "C:\Users\hp\Downloads\qzonmenewest\PersonalQuizBuilder"

REM Start the server
echo 🔧 Starting server...
node dist/index.js
pause
