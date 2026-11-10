' NOVA Drop - Silent One-Click Desktop Launcher
' Runs NOVA Drop in the background with zero console window and opens browser
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

strScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Check if server is built
If Not FSO.FileExists(strScriptDir & "\server\dist\server.js") Then
    WshShell.Run "cmd /c npm run build", 0, True
End If

' Launch background server silently (0 = hide window)
WshShell.Run "node """ & strScriptDir & "\server\dist\server.js""", 0, False

' Give server half a second to bind
WScript.Sleep 500

' Open default browser
WshShell.Run "http://127.0.0.1:3000", 1, False
