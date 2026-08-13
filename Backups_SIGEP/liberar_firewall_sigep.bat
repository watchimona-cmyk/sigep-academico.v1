@echo off
title Liberar Firewall do Windows para o SIGEP
echo =========================================================
echo  SIGEP - Liberador da Porta 3000 e 5432 no Firewall do Windows
echo =========================================================
echo.
echo Executando regra de liberacao para a Porta 3000 e 5432...
netsh advfirewall firewall add rule name="SIGEP_Porta_3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="SIGEP_Postgres_5432" dir=in action=allow protocol=TCP localport=5432
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Portas 3000 e 5432 liberadas com sucesso no Firewall do Windows!
    echo Todos os computadores da rede LAN/Wi-Fi poderao aceder ao SIGEP.
) else (
    echo [ATENÇÃO] Para liberar as portas, clique com o botao direito neste ficheiro
    echo e selecione "Executar como Administrador".
)
echo.
pause
