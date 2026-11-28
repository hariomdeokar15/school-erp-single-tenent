@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
  echo Missing .env file. Copy .env.example to .env and configure it first.
  pause
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop and try again.
  pause
  exit /b 1
)

echo Starting PostgreSQL and Redis...
docker compose up -d
if errorlevel 1 (
  echo Could not start Docker services. Check that Docker Desktop is running.
  pause
  exit /b 1
)

echo Starting API and web app in separate windows...
start "SchoolERP API" /D "%~dp0" cmd /k "corepack pnpm --filter @schoolerp/api start:dev"
start "SchoolERP Web" /D "%~dp0" cmd /k "corepack pnpm --filter @schoolerp/web dev"
timeout /t 3 /nobreak >nul
start "" http://localhost:3001

echo SchoolERP is starting. Keep the API and Web windows open while using it.
endlocal
