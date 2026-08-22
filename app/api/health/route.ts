import { json } from '../reel-jobs/shared';

export async function GET() {
  return json({
    service: 'NOH Reel Forge local bot gateway',
    status: 'ready',
    runtime: 'local-first',
    xaiBridge: process.env.XAI_API_KEY ? 'configured' : 'not_configured',
    localTokenGuard: process.env.REEL_FORGE_LOCAL_TOKEN ? 'enabled' : 'optional',
    timestamp: new Date().toISOString(),
  });
}
