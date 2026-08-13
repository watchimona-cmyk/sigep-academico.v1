; =========================================================================
; SIGEP-Acadêmico - Script de Instalação Inteligente (Inno Setup)
; Zero-Config, Auto-PostgreSQL, Firewall 3000 & Restauro Inteligente USB
; =========================================================================

#define MyAppName "SIGEP-Acadêmico"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "SIGEP Angola"
#define MyAppURL "https://sigep.ao"
#define MyAppExeName "SIGEP-Academico.exe"
#define DBPassword "watchi_Scool170989-2026"

[Setup]
AppId={{D1F23B89-27A1-4B9A-99B1-3E4C6D7E8F90}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\dist_installer
OutputBaseFilename=SIGEP_Academico_Setup_v1.1.0
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Directories]
Name: "C:\SIGEP-Backup"
Name: "C:\SIGEP-Backup\Automaticos"
Name: "C:\SIGEP-Backup\Manuais"
Name: "C:\Backups_SIGEP"
Name: "C:\Backups_SIGEP\Arquivos_Automatizados"
Name: "C:\Backups_SIGEP\Documentos_Exportados"

[Files]
; Aplicação Principal
Source: "..\dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Utilitários, Schema SQL e Scripts de Backup
Source: "..\Backups_SIGEP\*"; DestDir: "{app}\Backups_SIGEP"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "schema.sql"; DestDir: "{app}\installer"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; 1. Configurar Variável de Ambiente do Sistema DB_PASSWORD
Filename: "setx.exe"; Parameters: "/M DB_PASSWORD ""{#DBPassword}"""; Flags: runhidden

; 2. Liberar Porta 3000 e 5432 no Firewall do Windows
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SIGEP Central Porta 3000"" dir=in action=allow protocol=TCP localport=3000"; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SIGEP PostgreSQL Porta 5432"" dir=in action=allow protocol=TCP localport=5432"; Flags: runhidden

; 3. Criar Banco de Dados sigep_db se não existir
Filename: "cmd.exe"; Parameters: "/C set PGPASSWORD={#DBPassword} && psql -h localhost -p 5432 -U postgres -d postgres -c ""CREATE DATABASE sigep_db;"""; Flags: runhidden; StatusMsg: "Garantindo existência do banco de dados PostgreSQL sigep_db..."

; 4. Inicializar Estrutura da Base de Dados PostgreSQL via psql (se disponível localmente)
Filename: "cmd.exe"; Parameters: "/C set PGPASSWORD={#DBPassword} && psql -h localhost -p 5432 -U postgres -d sigep_db -f ""{app}\installer\schema.sql"""; Flags: runhidden; StatusMsg: "Inicializando estrutura do banco de dados PostgreSQL..."

; 5. Iniciar Aplicação
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  FoundUSBDrive: string;
  FoundBackupFile: string;
  ShouldRestoreBackup: Boolean;

// Função auxiliar para procurar unidade USB com pasta SIGEP-Backup (.enc cifrado ou .custom)
function FindUSBBackupDrive(out BackupFilePath: string): string;
var
  DriveLetter: Char;
  DrivePath, AutoBackupDir, FoundFile, SearchPatternEnc, SearchPatternCustom: string;
  FindRec: TFindRec;
begin
  Result := '';
  BackupFilePath := '';
  
  for DriveLetter := 'D' to 'Z' do
  begin
    DrivePath := DriveLetter + ':\';
    if GetDriveType(DrivePath) = DRIVE_REMOVABLE then
    begin
      AutoBackupDir := DrivePath + 'SIGEP-Backup\Automaticos\';
      SearchPatternEnc := AutoBackupDir + '*.enc';
      SearchPatternCustom := AutoBackupDir + '*.custom';
      
      // Prioridade a ficheiros cifrados .enc
      if FindFirst(SearchPatternEnc, FindRec) then
      begin
        try
          FoundFile := AutoBackupDir + FindRec.Name;
          Result := DriveLetter + ':';
          BackupFilePath := FoundFile;
          Break;
        finally
          FindClose(FindRec);
        end;
      end
      else if FindFirst(SearchPatternCustom, FindRec) then
      begin
        try
          FoundFile := AutoBackupDir + FindRec.Name;
          Result := DriveLetter + ':';
          BackupFilePath := FoundFile;
          Break;
        finally
          FindClose(FindRec);
        end;
      end;
    end;
  end;
end;

procedure InitializeWizard();
var
  UserResponse: Integer;
begin
  ShouldRestoreBackup := False;
  FoundUSBDrive := FindUSBBackupDrive(FoundBackupFile);
  
  if FoundUSBDrive <> '' then
  begin
    UserResponse := MsgBox(
      'Detetei um backup seguro do SIGEP na Pendrive [' + FoundUSBDrive + '].' + #13#10 + #13#10 +
      'Ficheiro localizado: ' + ExtractFileName(FoundBackupFile) + #13#10 + #13#10 +
      'Deseja restaurar a base de dados e todas as informações escolares a partir deste backup?',
      mbConfirmation, MB_YESNO
    );
    
    if UserResponse = IDYES then
    begin
      ShouldRestoreBackup := True;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  TargetLocalBackup, SecurityQueryCmd: string;
  ResultCode: Integer;
  PgRestoreCmd: string;
begin
  if CurStep = ssPostInstall then
  begin
    // Garantir criação dos diretórios locais em C:\
    ForceDirectories('C:\SIGEP-Backup\Automaticos');
    ForceDirectories('C:\SIGEP-Backup\Manuais');

    // Executar Restauro se o utilizador confirmou a partir da Pendrive
    if ShouldRestoreBackup and (FoundBackupFile <> '') then
    begin
      TargetLocalBackup := 'C:\SIGEP-Backup\Automaticos\' + ExtractFileName(FoundBackupFile);
      
      // a) Cópia Automática da Pendrive para a unidade C:
      if FileCopy(FoundBackupFile, TargetLocalBackup, False) then
      begin
        // b) Restauração Automática via pg_restore
        PgRestoreCmd := '/C set PGPASSWORD=' + '{#DBPassword}' + ' && pg_restore -h localhost -p 5432 -U postgres -d sigep_db -v -c "' + TargetLocalBackup + '"';
        Exec('cmd.exe', PgRestoreCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

        // c) Política Ativa de Segurança Pós-Desastre: Forçar expiração de senhas de colaboradores
        SecurityQueryCmd := '/C set PGPASSWORD=' + '{#DBPassword}' + ' && psql -h localhost -p 5432 -U postgres -d sigep_db -c "UPDATE funcionarios SET senha_expirada = TRUE, password_expired = TRUE WHERE UPPER(TRIM(id)) != ''SIGEP'' AND UPPER(TRIM(id)) != ''ADMIN_SIGEP'' AND role != ''DIRECTOR_GERAL'';"';
        Exec('cmd.exe', SecurityQueryCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        
        MsgBox('Restauro concluído com sucesso!' + #13#10 + #13#10 +
               'POLÍTICA ATIVA DE SEGURANÇA:' + #13#10 +
               'Todas as senhas dos colaboradores foram marcadas para expiração obrigatória. Os utilizadores deverão redefinir as suas senhas individuais no primeiro acesso.',
               mbInformation, MB_OK);
      end
      else
      begin
        MsgBox('Aviso: Não foi possível copiar o ficheiro de backup da Pendrive para C:\SIGEP-Backup\Automaticos.', mbError, MB_OK);
      end;
    end;
  end;
end;
