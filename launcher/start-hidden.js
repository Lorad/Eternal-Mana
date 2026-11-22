// Windows Script Host (JScript, kein Node): startet den Launcher ganz ohne Konsolenfenster.
// Aufruf: wscript.exe //nologo //e:jscript launcher\start-hidden.js  (so machen es Eternal-Mana.bat und die Verknuepfung)
var shell = new ActiveXObject("WScript.Shell");
var fso = new ActiveXObject("Scripting.FileSystemObject");
shell.CurrentDirectory = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName));
try {
  shell.Run('node "launcher\\launcher.mjs"', 0, false);
} catch (e) {
  shell.Popup("Node.js fehlt. Bitte Node.js 22.13 oder neuer installieren: https://nodejs.org/", 0, "Eternal Mana", 48);
}
