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
Name: "C:\SIGEP-Backup\Automaticos"
Name: "C:\SIGEP-Backup\Manuais"

[Files]
; Aplicação Principal
Source: "..\dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Utilitários e Scripts de Backup
Source: "..\Backups_SIGEP\*"; DestDir: "{app}\Backups_SIGEP"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; 1. Configurar Variável de Ambiente do Sistema DB_PASSWORD
Filename: "setx.exe"; Parameters: "/M DB_PASSWORD ""{#DBPassword}"""; Flags: runhidden

; 2. Liberar Porta 3000 no Firewall do Windows
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SIGEP Central Porta 3000"" dir=in action=allow protocol=TCP localport=3000"; Flags: runhidden

; 3. Iniciar Aplicação
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  FoundUSBDrive: string;
  FoundBackupFile: string;
  ShouldRestoreBackup: Boolean;

// Função auxiliar para procurar unidade USB com pasta SIGEP-Backup
function FindUSBBackupDrive(out BackupFilePath: string): string;
var
  DriveLetter: Char;
  DrivePath, AutoBackupDir, FoundFile, SearchPattern: string;
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
      SearchPattern := AutoBackupDir + '*.custom';
      
      if FindFirst(SearchPattern, FindRec) then
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
      'Detetei um backup do SIGEP na Pendrive [' + FoundUSBDrive + '].' + #13#10 + #13#10 +
      'Ficheiro localizado: ' + ExtractFileName(FoundBackupFile) + #13#10 + #13#10 +
      'Deseja restaurar o sistema e a base de dados a partir deste backup automático?',
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
  TargetLocalBackup: string;
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
        
        MsgBox('Restauro concluído com sucesso! O seu sistema foi recuperado a partir da Pendrive.', mbInformation, MB_OK);
      end
      else
      begin
        MsgBox('Aviso: Não foi possível copiar o ficheiro de backup da Pendrive para C:\SIGEP-Backup\Automaticos.', mbError, MB_OK);
      end;
    end;
  end;
end;
