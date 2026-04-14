$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("$env:USERPROFILE\Desktop\SENKI BOM Manager.lnk")
$s.TargetPath = "D:\Bom\release2\win-unpacked\SENKI BOM Manager.exe"
$s.WorkingDirectory = "D:\Bom\release2\win-unpacked"
$s.Description = "SENKI - Quan Ly San Xuat va BOM"
$s.Save()
Write-Host "Shortcut created at Desktop"
