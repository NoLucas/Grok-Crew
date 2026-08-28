import { createServer } from 'node:net';

export const DEFAULT_STUDIO_PORT = 7214;

function listenLoopback(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const bound = typeof address === 'object' && address ? address.port : port;
      server.close((error) => {
        if (error) reject(error);
        else resolve(bound);
      });
    });
  });
}

export function studioPortFromApiBase(apiBase, fallback = DEFAULT_STUDIO_PORT) {
  try {
    const url = new URL(String(apiBase || `http://127.0.0.1:${fallback}`));
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost' && url.hostname !== '[::1]') {
      return fallback;
    }
    if (!url.port) {
      if (url.protocol === 'https:') return 443;
      if (url.protocol === 'http:') return 80;
      return fallback;
    }
    const port = Number(url.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;
    return port;
  } catch {
    return fallback;
  }
}

export async function reserveLoopbackPort(preferred = DEFAULT_STUDIO_PORT) {
  const want = Number(preferred);
  const target = Number.isInteger(want) && want >= 1 && want <= 65535 ? want : DEFAULT_STUDIO_PORT;
  try {
    return await listenLoopback(target);
  } catch {
    return listenLoopback(0);
  }
}
