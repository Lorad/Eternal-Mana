# Tailscale einrichten

Tailscale verbindet eure Geräte zu einem privaten, verschlüsselten Netz („Tailnet“). Der Spielserver ist dann nur für
Geräte in diesem Netz erreichbar – **ohne Portfreigabe am Router und ohne öffentlich erreichbaren Server**.

## Was ihr braucht

- Ein kostenloses Tailscale-Konto (der Gastgeber).
- Tailscale auf **jedem** beteiligten Gerät: auf dem Rechner des Gastgebers und auf den Geräten aller Mitspieler.
- Das Spiel selbst muss nur der Gastgeber installieren. Mitspieler brauchen bloß Tailscale und einen Browser.

## Schritt für Schritt

### Gastgeber

1. Tailscale von https://tailscale.com/download installieren und anmelden.
2. Prüfen, dass Tailscale verbunden ist (Symbol in der Taskleiste bzw. `tailscale status`).
3. `start-server.bat` / `./start-server.sh` starten. Im Serverfenster erscheinen die Zeilen
   **Tailscale-IP** (z. B. `http://100.101.102.103:7777`) und – wenn MagicDNS aktiv ist – **Tailscale MagicDNS**
   (z. B. `http://mein-pc.tail1234.ts.net:7777`). Dieselben Adressen stehen im Spiel in der Charakterauswahl.
4. Diese Adresse an die Mitspieler schicken.

### Mitspieler ins Tailnet holen (eine von zwei Möglichkeiten)

- **Gerät teilen (empfohlen, wenn Freunde eigene Tailscale-Konten haben):** In der Tailscale-Admin-Konsole
  (https://login.tailscale.com/admin/machines) beim Gastgeber-Rechner *Share…* wählen und den Einladungslink verschicken.
  Die Freunde sehen dann nur diesen einen Rechner – nicht euer übriges Netz.
- **Nutzer einladen:** Unter *Users → Invite users* Freunde in das eigene Tailnet einladen. Sie sehen dann je nach ACL
  (siehe unten) alle Geräte.

### Mitspieler

1. Tailscale installieren, anmelden, Einladung annehmen.
2. Im Browser die Adresse des Gastgebers öffnen (`http://100.x.y.z:7777`), Namen eingeben, **Spielen**.
   Alternativ: `start-client.bat 100.x.y.z` bzw. `./start-client.sh 100.x.y.z`, falls das Projekt lokal vorhanden ist.

## ACLs (Zugriffsregeln)

Mit den Standardregeln eines neuen Tailnets dürfen alle Geräte einander erreichen – dann ist nichts zu tun.
Wer die Regeln eingeschränkt hat, muss TCP-Port **7777** zum Gastgeber erlauben. Beispiel für die Policy-Datei
(Admin-Konsole → *Access controls*), das nur den Spielport freigibt:

```jsonc
{
  "tagOwners": { "tag:gameserver": ["autogroup:admin"] },
  "acls": [
    // alle Mitglieder des Tailnets dürfen den Spielserver auf Port 7777 erreichen
    { "action": "accept", "src": ["autogroup:member"], "dst": ["tag:gameserver:7777"] }
  ]
}
```

Dem Gastgeber-Rechner dann in der Maschinenliste den Tag `gameserver` geben. Beim **Teilen eines Geräts** (Share) gilt:
Geteilte Nutzer erscheinen als `autogroup:shared`; soll die Regel auch für sie gelten, `"autogroup:shared"` zu `src`
hinzufügen.

## Firewall

Tailscale-Verkehr kommt über die virtuelle Schnittstelle `tailscale0` (Linux) bzw. den Adapter „Tailscale“ (Windows) an.

- **Windows:** Beim ersten Start fragt die Windows-Firewall, ob Node.js Verbindungen annehmen darf → **Zulassen**
  (mindestens für private Netze). Falls die Frage verpasst wurde, als Administrator:
  `netsh advfirewall firewall add rule name="Eternal Mana" dir=in action=allow protocol=TCP localport=7777`
- **Linux (ufw):** `sudo ufw allow in on tailscale0 to any port 7777 proto tcp` – erlaubt den Port **nur** über Tailscale.
- **macOS:** Systemeinstellungen → Netzwerk → Firewall: eingehende Verbindungen für `node` zulassen.

Am Router ist **keine** Portweiterleitung nötig und auch nicht erwünscht.

## Optional: HTTPS über Tailscale

Der Server spricht HTTP. Innerhalb des Tailnets ist der Verkehr bereits durch Tailscale (WireGuard) verschlüsselt.
Wer trotzdem HTTPS möchte – einige Browser geben z. B. Gamepads nur auf „sicheren“ Seiten frei –, kann Tailscale das
Zertifikat ausstellen lassen:

```bash
tailscale serve --bg 7777
```

Danach ist das Spiel unter `https://<rechnername>.<tailnet>.ts.net` erreichbar (MagicDNS und HTTPS-Zertifikate müssen in
der Admin-Konsole aktiviert sein). Mitspieler tragen dann diese `https://…`-Adresse ein.

## Ohne Tailscale

Fehlt Tailscale, startet der Server trotzdem und meldet „Tailscale wurde nicht gefunden“. Einzelspieler
(`http://localhost:7777`) und Spielen im selben Heimnetz (Heimnetz-Adresse) funktionieren weiterhin.

## Fehlersuche

| Symptom | Prüfen |
|---|---|
| Serverfenster zeigt keine Tailscale-Adresse | Läuft Tailscale und ist angemeldet? `tailscale status`. Danach Server neu starten. |
| Mitspieler: „Seite nicht erreichbar“ | Beide Geräte im selben Tailnet bzw. Gerät geteilt? `tailscale ping <gastgeber>` vom Mitspieler aus. Firewall des Gastgebers (siehe oben). ACLs. |
| MagicDNS-Name funktioniert nicht | Stattdessen die 100.x.y.z-Adresse nutzen oder MagicDNS in der Admin-Konsole aktivieren. |
| Verbindung bricht ab | Das Spiel verbindet sich automatisch neu; der Charakter bleibt 30 Sekunden geschützt in der Welt stehen. |
| Hohe Verzögerung | `tailscale status` zeigt, ob die Verbindung „direct“ ist oder über ein Relay („relay“) läuft. Relay ist langsamer; oft hilft es, UDP im Heimrouter nicht zu blockieren. |
