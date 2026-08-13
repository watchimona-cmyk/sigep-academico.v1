@echo off
title Criar Banco de Dados SIGEP no PostgreSQL
echo =========================================================
echo  SIGEP - Criador Automatico do Banco 'sigep_db'
echo =========================================================
echo.
set PGPASSWORD=watchi_Scool170989-2026
psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE sigep_db;"
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Banco de dados 'sigep_db' verificado/criado com sucesso no PostgreSQL!
) else (
    echo [INFO] Se o banco ja existia, esta tudo pronto para operacao do SIGEP.
)
echo.
pause
