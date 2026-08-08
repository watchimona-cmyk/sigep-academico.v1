@echo off
:: =========================================================================
:: Script de Backup Automático SIGEP para Agendador de Tarefas do Windows
:: =========================================================================
:: Configurações de Ligação PostgreSQL (Extraídas das credenciais ativas)
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=sigep_db

:: Ler a senha mestra da variável de ambiente do sistema ou usar a padrão
if "%DB_PASSWORD%"=="" (
    set PGPASSWORD=watchi_Scool170989-2026
) else (
    set PGPASSWORD=%DB_PASSWORD%
)

:: Diretórios de Armazenamento
set BACKUP_DIR=C:\SIGEP-Backup\Automaticos

:: Cria os diretórios se não existirem
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Obter Carimbo de Data/Hora universal
set DATE_STAMP=%date:~-4%%date:~3,2%%date:~0,2%
set TIME_STAMP=%time:~0,2%%time:~3,2%%time:~6,2%
set TIME_STAMP=%TIME_STAMP: =0%

set FILE_NAME=%BACKUP_DIR%\sigep_db_%DATE_STAMP%_%TIME_STAMP%.custom

echo [SIGEP BACKUP] Iniciando cópia de segurança para %FILE_NAME%...

:: Procura o pg_dump em caminhos padrão se não estiver no PATH
set PG_DUMP_EXE=pg_dump.exe
if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" set PG_DUMP_EXE="C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" set PG_DUMP_EXE="C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" set PG_DUMP_EXE="C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
if exist "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" set PG_DUMP_EXE="C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"

:: Executa o Backup no Formato Customizado (-Fc) compactado
%PG_DUMP_EXE% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -Fc -v -f "%FILE_NAME%"

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] O backup falhou com o código de erro %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo [SUCESSO] Backup concluído com sucesso: %FILE_NAME%

:: Executa a Política de Retenção de Dados (Manter últimos 5 dias)
echo Aplicando política de retenção de dados (Limpeza automática superior a 5 dias)...
forfiles /p "%BACKUP_DIR%" /m "sigep_db_*.custom" /d -5 /c "cmd /c del @path"

echo Processo de contingência e retenção concluído!
