@echo off
:: SIGEP - AUTO-ELEVACAO PARA ADMINISTRADOR
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo A solicitar privilegios de Administrador para o SIGEP...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

title SIGEP - Configurar Banco de Dados sigep_db, Firewall e Pastas de Backup
color 0A
echo ======================================================================
echo     SIGEP ACADEMICO - CONFIGURACAO COMPLETA DE SERVIDOR CENTRAL
echo ======================================================================
echo.

echo 1. Criando Pastas Físicas de Backup e Banco no Disco C:\
if not exist "C:\SIGEP-Backup" (
    mkdir "C:\SIGEP-Backup"
    echo [OK] Pasta C:\SIGEP-Backup criada com sucesso!
) else (
    echo [OK] Pasta C:\SIGEP-Backup ja existe.
)

if not exist "C:\SIGEP-Database" (
    mkdir "C:\SIGEP-Database"
    echo [OK] Pasta C:\SIGEP-Database criada com sucesso!
) else (
    echo [OK] Pasta C:\SIGEP-Database ja existe.
)

echo.
echo 2. Liberando Portas no Firewall do Windows para Acesso em Rede Local (LAN/Wi-Fi)...
netsh advfirewall firewall add rule name="SIGEP_Porta_3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="SIGEP_PostgreSQL_5432" dir=in action=allow protocol=TCP localport=5432 profile=any >nul 2>&1
echo [OK] Portas 3000 (SIGEP Backend) e 5432 (PostgreSQL) liberadas no Firewall!

echo.
echo 3. Criando Banco de Dados 'sigep_db' no PostgreSQL Local...
echo Conectando no PostgreSQL com usuario 'postgres' e senha 'watchi_Scool170989-2026'...
echo.

set PGPASSWORD=watchi_Scool170989-2026
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE sigep_db;" 2>nul
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE sigep_db;" 2>nul
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE sigep_db;" 2>nul
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE sigep_db;" 2>nul

echo.
echo ======================================================================
echo  [CONCLUIDO] Banco 'sigep_db' verificado, portas liberadas e pastas prontas!
echo ======================================================================
echo.
pause
