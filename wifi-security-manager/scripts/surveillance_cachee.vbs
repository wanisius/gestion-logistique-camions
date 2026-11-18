' Lance la surveillance en arrière-plan, sans fenêtre (utilisé par la tâche planifiée).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
On Error Resume Next
sh.Run "pyw -3 -m wsm monitor", 0, False
If Err.Number <> 0 Then
  Err.Clear
  sh.Run "pythonw -m wsm monitor", 0, False
End If
