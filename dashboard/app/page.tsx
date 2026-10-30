'use client';

import React, { useEffect, useState } from 'react';
import { 
  Wifi, 
  Activity, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Network, 
  Laptop, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

interface MetricData {
  timestamp: string;
  isOnline: boolean;
  isSimulated: boolean;
  ping: {
    latencyMs: number | null;
    target: string;
    status: 'excellent' | 'good' | 'fair' | 'offline';
  };
  wifi: {
    interface: string;
    ssid: string;
    signalDbm: number | null;
    signalPercent: number;
    linkSpeedMbps: number;
    traffic: {
      rxKbps: number;
      txKbps: number;
      rxMbps: string;
      txMbps: string;
    };
  };
  lan: {
    interface: string;
    clientCount: number;
    clients: Array<{ ip: string; mac: string; name?: string }>;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('API-Fehler');
      const json: MetricData = await res.json();
      setData(json);
      setError(null);

      if (json.ping.latencyMs !== null) {
        setPingHistory(prev => {
          const next = [...prev, json.ping.latencyMs!];
          return next.slice(-25); // Max 25 Einträge behalten
        });
      }
    } catch (err: any) {
      setError(err.message || 'Verbindungsfehler zur Bridge-API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const getPingColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'good':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'fair':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
  };

  const getSignalBars = (percent: number) => {
    const bars = [25, 50, 75, 100];
    return (
      <div className="flex items-end gap-1 h-5">
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{ height: `${(i + 1) * 25}%` }}
            className={`w-1.5 rounded-sm transition-all duration-300 ${
              percent >= bar ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-12 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
              <Network className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                WLAN Bridge Monitor
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  Raspberry Pi 4b
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Echtzeit-Überwachung von Latenz, WLAN-Verbindung und LAN-Ausgabe
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.isSimulated && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300">
              Demo-Modus (Nicht-Linux)
            </span>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium">
            {data?.isOnline ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400">Online & Geroutet</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                <span className="text-rose-400">Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: Ping / Latenz */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Internet-Ping
            </span>
            {data && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getPingColor(data.ping.status)}`}>
                {data.ping.status === 'excellent' ? 'Exzellent' : data.ping.status === 'good' ? 'Gut' : data.ping.status === 'fair' ? 'Mittel' : 'Offline'}
              </span>
            )}
          </div>

          <div className="my-5">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white font-mono">
                {data?.ping.latencyMs !== null && data?.ping.latencyMs !== undefined ? data.ping.latencyMs.toFixed(1) : '--'}
              </span>
              <span className="text-slate-400 text-lg font-medium">ms</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Zielhost: {data?.ping.target || '1.1.1.1'}</p>
          </div>

          {/* Mini Ping Chart */}
          <div>
            <div className="text-[11px] text-slate-400 mb-1.5 flex justify-between">
              <span>Latenz-Verlauf</span>
              <span>25 Messungen</span>
            </div>
            <div className="h-10 flex items-end gap-1 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              {pingHistory.map((val, idx) => {
                const maxVal = Math.max(...pingHistory, 60);
                const barHeight = Math.min(100, Math.max(15, (val / maxVal) * 100));
                return (
                  <div
                    key={idx}
                    title={`${val} ms`}
                    style={{ height: `${barHeight}%` }}
                    className="flex-1 bg-cyan-500/70 hover:bg-cyan-400 transition-all rounded-xs"
                  />
                );
              })}
              {pingHistory.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                  Lade Messdaten...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: WLAN-Geschwindigkeit & Link Speed */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              WLAN-Geschwindigkeit
            </span>
            {data && getSignalBars(data.wifi.signalPercent)}
          </div>

          <div className="my-5">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white font-mono">
                {data?.wifi.linkSpeedMbps ? data.wifi.linkSpeedMbps.toFixed(0) : '--'}
              </span>
              <span className="text-slate-400 text-lg font-medium">MBit/s</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Link-Rate (TX-Bitrate)</p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block">WLAN SSID</span>
              <span className="font-semibold text-white">{data?.wifi.ssid || 'Suche...'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Signalstärke</span>
              <span className="font-mono text-emerald-400 font-medium">
                {data?.wifi.signalDbm ? `${data.wifi.signalDbm} dBm` : `${data?.wifi.signalPercent || 0} %`}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: Live Durchsatz (Traffic) */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-400" />
              Echtzeit-Durchsatz
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
              wlan0
            </span>
          </div>

          <div className="my-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                Download
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {data?.wifi.traffic.rxMbps || '0.00'}
              </div>
              <div className="text-[10px] text-slate-500">MBit/s</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
                Upload
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {data?.wifi.traffic.txMbps || '0.00'}
              </div>
              <div className="text-[10px] text-slate-500">MBit/s</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Aktiver Datenstrom</span>
            <span className="font-mono text-slate-300">
              {((Number(data?.wifi.traffic.rxKbps || 0) + Number(data?.wifi.traffic.txKbps || 0)) / 1024).toFixed(2)} MB/s Gesamt
            </span>
          </div>
        </div>

      </div>

      {/* LAN Bridge Clients Card */}
      <div className="mt-8 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Angeschlossene LAN-Geräte (eth0)</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            {data?.lan.clientCount || 0} {data?.lan.clientCount === 1 ? 'Gerät' : 'Geräte'} aktiv
          </span>
        </div>

        {data?.lan.clients && data.lan.clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-lg">Gerätename / Host</th>
                  <th className="py-2.5 px-4">Zugewiesene IP</th>
                  <th className="py-2.5 px-4">MAC-Adresse</th>
                  <th className="py-2.5 px-4 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {data.lan.clients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {client.name || 'LAN Client'}
                    </td>
                    <td className="py-3 px-4 text-cyan-300">{client.ip}</td>
                    <td className="py-3 px-4 text-slate-400">{client.mac}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                        Aktiv geroutet
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/80">
            <Laptop className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-slate-400">Aktuell ist kein Gerät am LAN-Port angeschlossen.</p>
            <p className="text-xs text-slate-500 mt-1">
              Sobald du ein Gerät (PC, Switch, Konsole) einsteckst, vergibt der Pi automatisch per DHCP eine IP.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-center gap-4">
        <span>Hardware: Raspberry Pi 4 Model B</span>
        <span className="hidden md:inline">•</span>
        <span>Routing: Linux Kernel Netfilter (iptables)</span>
        <span className="hidden md:inline">•</span>
        <span>DHCP & DNS: dnsmasq</span>
      </footer>
    </main>
  );
}

