; Inno Setup Script for NOVA Drop
#define MyAppName "NOVA Drop"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "NOVA Software"
#define MyAppURL "https://github.com/patilomkar7570/NOVA-Drop"
#define MyAppExeName "NOVA-Drop.exe"

[Setup]
AppId={{5C1D8291-7685-4E7B-A484-938BF97D964E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\NOVA Drop
DefaultGroupName=NOVA Drop
DisableProgramGroupPage=yes
LicenseFile=LICENSE
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=.
OutputBaseFilename=NOVA-Drop-Setup
SetupIconFile=logo.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "launcher\NOVA-Drop.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "server\dist\*"; DestDir: "{app}\server\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "server\public\*"; DestDir: "{app}\server\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "server\package.json"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "server\node_modules\*"; DestDir: "{app}\server\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "logo.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\logo.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\logo.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch NOVA Drop immediately"; Flags: nowait postinstall skipifsilent
