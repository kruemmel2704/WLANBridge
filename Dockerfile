FROM alpine:3.20

# Installiere minimale und hocheffiziente Werkzeuge:
# - dnsmasq: Extrem ressourcenschonender DHCP- & DNS-Server in C (< 10 MB RAM)
# - iptables & iproute2: Direkte Steuerung des Linux-Kernels für Wire-Speed NAT & Routing
RUN apk add --no-cache \
    bash \
    dnsmasq \
    iptables \
    iproute2 \
    procps

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Stop-Signal für sauberes Aufräumen der iptables-Regeln
STOPSIGNAL SIGTERM

ENTRYPOINT ["/entrypoint.sh"]
