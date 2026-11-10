import os from 'os';

/**
 * Discovers the local Wi-Fi / Ethernet IPv4 address for local network transfers
 */
export function getLocalIpAddress(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      // Look for IPv4 non-internal interfaces
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}
