# 🚀 Raspberry Pi 4b WLAN-zu-LAN Bridge (High-Performance Docker)

Nimmt das WLAN-Signal (`wlan0`) des Raspberry Pi 4b auf und gibt es mit voller Gigabit-Leistung über den LAN-Port (`eth0`) an angeschlossene Geräte (PC, Switch, Spielekonsole, Smart-TV etc.) aus.

---

## ❓ Geht das überhaupt?

**Ja, absolut!** Es gibt jedoch eine wichtige technische Besonderheit bei WLAN:

### Warum kein "klassisches" Layer-2-Bridging (`brctl` / `br0`)?
Der offizielle WLAN-Standard **IEEE 802.11** nutzt im normalen Client-Modus (Station Mode / STA) sogenannte **3-Address-Frames**. Der heimische WLAN-Router akzeptiert über die Verbindung des Raspberry Pi **nur dessen eigene MAC-Adresse**. Schließt man ein LAN-Gerät an, verwirft der Router dessen Pakete, weil die fremde MAC-Adresse nicht autorisiert ist (4-Address/WDS-Modus unterstützen normale Consumer-Router wie Fritz!Box oder Speedport in der Regel nicht).

### Die performanteste Lösung: Layer-3-Routing + NAT + DHCP
1. **Linux Kernel Netfilter (`iptables` MASQUERADE)**: Pakete des LAN-Geräts werden auf Hardware-/Kernel-Ebene geroutet.
2. **`dnsmasq` (C-basiert)**: Vergibt automatisch IP-Adressen an eingesteckte LAN-Geräte und cached DNS-Anfragen.
3. **Performance**: **Kein User-Space-Bottleneck** (wie bei Python/Go-Tunneln). Die Paketweiterleitung geschieht zu 100 % im Linux-Kernel in C. Der Raspberry Pi 4b schafft damit praktisch **volle Gigabit-Leitungskapazität bei minimalster CPU-Last (< 1 %)** und ca. **8 MB RAM-Verbrauch**.

---

## 📁 Projektstruktur

```text
├── Dockerfile              # Minimales Alpine 3.20 Image mit iptables & dnsmasq
├── docker-compose.yml      # Startet Bridge- & Dashboard-Container
├── entrypoint.sh           # Aktiviert IP-Forwarding, konfiguriert eth0 & iptables
├── .dockerignore
└── dashboard/              # Next.js 14 Web Dashboard
    ├── Dockerfile          # Multi-Stage Build (Minimaler Standalone Runner)
    ├── app/
    │   ├── api/metrics/    # API-Route: Liest Ping, iw Link-Rate, Durchsatz & Clients
    │   ├── page.tsx        # Modernes Dark-Mode Dashboard (Tailwind + Lucide)
    │   └── layout.tsx
    ├── package.json
    └── tailwind.config.js
```

---

## 📊 Live Web-Dashboard (Next.js)

Nach dem Start erreichst du das Dashboard direkt im Browser unter:
* Vom PC am LAN-Kabel: **`http://192.168.4.1:3000`**
* Oder aus dem Heimnetzwerk: **`http://<raspberrypi-wlan-ip>:3000`**

### Features des Dashboards:
1. **Live-Ping & Latenz-Verlauf**: Zeigt die Millisekunden-Latenz zu `1.1.1.1` inkl. 25-Punkte-Verlaufsgraph.
2. **WLAN-Geschwindigkeit**: Aktuelle Link-Rate (TX-Bitrate in MBit/s), Signalstärke in dBm und Empfangsqualität.
3. **Echtzeit-Durchsatz**: Live-Download- und Upload-Rate (MBit/s) über das WLAN-Interface.
4. **Verbundene LAN-Geräte**: Automatische Erkennung und Auflistung aller über `eth0` angeschlossenen Geräte (IP, MAC).

---

## 🛠️ Schnellstart auf dem Raspberry Pi

### 1. Vorbereitung auf dem Host-System
Der Raspberry Pi muss bereits mit deinem WLAN verbunden sein (z. B. via `raspi-config` oder `nmcli`).

*(Empfohlen)* Damit der Host-eigene DHCP-Client auf dem Raspberry Pi (z. B. `dhcpcd` oder `NetworkManager`) nicht versucht, am `eth0` selbst nach einer IP zu suchen, kannst du `eth0` für den Host ignorieren lassen:

Wenn Raspberry Pi OS **NetworkManager** nutzt:
```bash
sudo nmcli dev set eth0 managed no
```
*(Oder bei älterem `dhcpcd`: `denyinterfaces eth0` ans Ende von `/etc/dhcpcd.conf` anfügen).*

---

### 2. Projekt klonen oder kopieren
Kopiere diesen Ordner auf deinen Raspberry Pi:
```bash
git clone <dein-repo-url> wlan-bridge
cd wlan-bridge
```

---

### 3. Starten
Starte die Bridge mit Docker Compose:
```bash
docker compose up -d --build
```

Logs prüfen:
```bash
docker compose logs -f
```

---

## ⚙️ Konfiguration (`docker-compose.yml`)

Du kannst alle Parameter direkt in der `docker-compose.yml` über Environment-Variablen anpassen:

| Variable | Standardwert | Beschreibung |
| :--- | :--- | :--- |
| `WLAN_IF` | `wlan0` | Das Interface mit der Internetverbindung (WLAN) |
| `LAN_IF` | `eth0` | Das LAN-Interface für ausgehende Verbindungen |
| `LAN_IP` | `192.168.4.1` | Die Gateway-IP des Pi am LAN-Port |
| `LAN_CIDR` | `24` | Subnetzmaske (24 = `255.255.255.0`) |
| `DHCP_RANGE_START` | `192.168.4.10` | Erste IP, die an LAN-Clients vergeben wird |
| `DHCP_RANGE_END` | `192.168.4.100` | Letzte IP im DHCP-Pool |
| `DHCP_LEASE` | `12h` | Gültigkeitsdauer der DHCP-Adresse |
| `DNS_SERVERS` | `1.1.1.1,8.8.8.8` | DNS-Server (Cloudflare & Google) |

> [!IMPORTANT]
> **Subnetz-Kollision vermeiden**:
> Vergewissere dich, dass dein heimisches WLAN nicht denselben IP-Bereich nutzt wie `LAN_IP` (Standard ist `192.168.4.x`). Hat dein Heimrouter z. B. `192.168.178.1` (Fritz!Box), passt alles perfekt. Nutzt dein Heimrouter zufällig schon `192.168.4.x`, ändere `LAN_IP` z. B. auf `192.168.5.1`.

---

## 🛑 Stoppen / Deinstallieren

Wenn du den Container stoppst, bereinigt das Skript automatisch alle `iptables`-Regeln:
```bash
docker compose down
```

