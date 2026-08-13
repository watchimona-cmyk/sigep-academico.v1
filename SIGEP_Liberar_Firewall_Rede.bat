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

title SIGEP - Liberar Firewall do Windows para Rede Local
color 0B
echo ======================================================================
echo          SIGEP ACADEMICO - LIBERACAO DE FIREWALL WINDOWS LAN
echo ======================================================================
echo.
echo Adicionando regras de entrada no Firewall do Windows...
echo.

netsh advfirewall firewall delete rule name="SIGEP_Porta_3000" >nul 2>&1
netsh advfirewall firewall delete rule name="SIGEP_PostgreSQL_5432" >nul 2>&1

netsh advfirewall firewall add rule name="SIGEP_Porta_3000" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="SIGEP_PostgreSQL_5432" dir=in action=allow protocol=TCP localport=5432 profile=any

echo.
echo ======================================================================
echo  [SUCESSO] Portas 3000 (SIGEP) e 5432 (PostgreSQL) liberadas!
echo  Outros computadores da escola ja podem acessar via http://<IP-DO-SERVIDOR>:3000
echo ======================================================================
echo.
pause
