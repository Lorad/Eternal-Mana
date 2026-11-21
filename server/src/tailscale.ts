/** Erkennt lokale, LAN- und Tailscale-Adressen, unter denen der Server erreichbar ist. */
import { execFile } from 'node:child_process';
import os from 'node:os';
import type { ServerInfo } from '../../shared/src/types';

function isTailscaleIp(ip: string): boolean {
  const p = ip.split('.').map(Number);
  return p.length === 4 && p[0] === 100 && p[1] >= 64 && p[1] <= 127; // CGNAT-Bereich 100.64.0.0/10
}

function run(cmd: string, args: string[]): Promise<string | null> {
  return new Promise(resolve => {
    try {
      execFile(cmd, args, { timeout: 2500, windowsHide: true }, (err, stdout) => resolve(err ? null : String(stdout)));
    } catch { resolve(null); }
  });
}

export async function detectAddresses(port: number): Promise<Pick<ServerInfo, 'addresses' | 'tailscale'>> {
  const addresses: ServerInfo['addresses'] = [{ label: 'Dieser Rechner', url: `http://localhost:${port}`, kind: 'local' }];
  let tsIp: string | undefined, tsDns: string | undefined;
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (isTailscaleIp(a.address) || /tailscale/i.test(name)) tsIp = tsIp ?? a.address;
      else addresses.push({ label: `Heimnetz (${name})`, url: `http://${a.address}:${port}`, kind: 'lan' });
    }
  }
  // MagicDNS-Name über die Tailscale-CLI (falls installiert)
  const candidates = process.platform === 'win32'
    ? ['tailscale.exe', 'C:\\Program Files\\Tailscale\\tailscale.exe']
    : process.platform === 'darwin' ? ['tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'] : ['tailscale'];
  for (const bin of candidates) {
    const out = await run(bin, ['status', '--json']);
    if (!out) continue;
    try {
      const j = JSON.parse(out);
      if (j.BackendState && j.BackendState !== 'Running') break;
      const dns = String(j.Self?.DNSName ?? '').replace(/\.$/, '');
      if (dns) tsDns = dns;
      const ip = (j.Self?.TailscaleIPs ?? []).find((x: string) => x.includes('.'));
      if (ip) tsIp = ip;
    } catch { /* ignorieren */ }
    break;
  }
  if (tsIp) addresses.push({ label: 'Tailscale-IP', url: `http://${tsIp}:${port}`, kind: 'tailscale' });
  if (tsDns) addresses.push({ label: 'Tailscale MagicDNS', url: `http://${tsDns}:${port}`, kind: 'tailscale' });
  return { addresses, tailscale: { available: !!tsIp, ip: tsIp, dns: tsDns } };
}
