#!/bin/bash
# =========================================================================
# Script de Backup Automático SIGEP para Linux / macOS / Docker
# =========================================================================
export DB_USER="postgres"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="sigep_db"
export PGPASSWORD="${DB_PASSWORD:-watchi_Scool170989-2026}"
export BACKUP_DIR="C:/SIGEP-Backup/Automaticos"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE_NAME="$BACKUP_DIR/sigep_db_${TIMESTAMP}.custom"

echo "[SIGEP BACKUP] Iniciando backup para $FILE_NAME..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc -v -f "$FILE_NAME" "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "[SUCESSO] Backup nativo concluído em $FILE_NAME"
    echo "Aplicando política de retenção..."
    find "$BACKUP_DIR" -name "backup_sigep_*.backup" -type f -mtime +5 -delete
else
    echo "[ERRO] pg_dump falhou ou não está instalado."
fi
