#!/bin/bash
set -e

# Standard-Konfiguration (über Environment-Variablen im docker-compose anpassbar)
WLAN_IF="${WLAN_IF:-wlan0}"
LAN_IF="${LAN_IF:-eth0}"
LAN_IP="${LAN_IP:-192.168.4.1}"
LAN_CIDR="${LAN_CIDR:-24}"
DHCP_RANGE_START="${DHCP_RANGE_START:-192.168.4.10}"
DHCP_RANGE_END="${DHCP_RANGE_END:-192.168.4.100}"
DHCP_LEASE="${DHCP_LEASE:-12h}"
DNS_SERVERS="${DNS_SERVERS:-1.1.1.1,8.8.8.8}"

echo "======================================================"
echo "    Raspberry Pi WLAN-to-LAN Bridge (High-Perf NAT)   "
echo "======================================================"
echo "WLAN Interface (Internet):  $WLAN_IF"
echo "LAN Interface (Ausgabe):    $LAN_IF"
echo "LAN Gateway IP:             $LAN_IP/$LAN_CIDR"
echo "DHCP Range:                 $DHCP_RANGE_START - $DHCP_RANGE_END ($DHCP_LEASE)"
echo "Upstream DNS:               $DNS_SERVERS"
echo "======================================================"

# 1. Prüfen, ob die Interfaces existieren
if ! ip link show "$WLAN_IF" >/dev/null 2>&1; then
    echo "[FEHLER] WLAN-Interface '$WLAN_IF' nicht gefunden!"
    exit 1
fi

if ! ip link show "$LAN_IF" >/dev/null 2>&1; then
    echo "[FEHLER] LAN-Interface '$LAN_IF' nicht gefunden!"
    exit 1
fi

# 2. IP-Forwarding im Linux-Kernel aktivieren
echo "[+] Aktiviere IPv4 Forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward || sysctl -w net.ipv4.ip_forward=1

# 3. LAN Interface konfigurieren
echo "[+] Konfiguriere $LAN_IF mit $LAN_IP/$LAN_CIDR..."
ip link set "$LAN_IF" up
ip addr flush dev "$LAN_IF"
ip addr add "$LAN_IP/$LAN_CIDR" dev "$LAN_IF"

# 4. iptables NAT & Forwarding einrichten (Wire-Speed im Kernel)
echo "[+] Setze iptables Routing- und NAT-Regeln..."
iptables -t nat -A POSTROUTING -o "$WLAN_IF" -j MASQUERADE
iptables -A FORWARD -i "$WLAN_IF" -o "$LAN_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i "$LAN_IF" -o "$WLAN_IF" -j ACCEPT

# Aufräum-Funktion bei Container-Stop
cleanup() {
    echo ""
    echo "[!] Container wird beendet. Bereinige iptables-Regeln..."
    iptables -t nat -D POSTROUTING -o "$WLAN_IF" -j MASQUERADE 2>/dev/null || true
    iptables -D FORWARD -i "$WLAN_IF" -o "$LAN_IF" -m state --state RELATED,ESTABLISHED 2>/dev/null || true
    iptables -D FORWARD -i "$LAN_IF" -o "$WLAN_IF" -j ACCEPT 2>/dev/null || true
    echo "[+] Fertig. Tschüss!"
    exit 0
}

trap cleanup SIGTERM SIGINT

# 5. dnsmasq Konfiguration generieren
cat <<EOF > /etc/dnsmasq.conf
# Minimal & High Performance dnsmasq Config
interface=$LAN_IF
bind-interfaces
dhcp-range=$DHCP_RANGE_START,$DHCP_RANGE_END,$DHCP_LEASE
dhcp-option=option:router,$LAN_IP
dhcp-option=option:dns-server,$LAN_IP
bogus-priv
domain-needed
no-poll
EOF

# Upstream DNS-Server eintragen
IFS=',' read -ra ADDR <<< "$DNS_SERVERS"
for dns in "${ADDR[@]}"; do
    echo "server=$dns" >> /etc/dnsmasq.conf
done

echo "[+] Starte dnsmasq im Vordergrund..."
# -k / --keep-in-foreground, -d / --no-daemon (für Docker Logging)
exec dnsmasq -k -q

