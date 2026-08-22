import { json } from '../reel-jobs/shared';

export async function GET() {
  return json({
    schema: 'noh.reel-forge.local-agent/v1',
    service: 'NOH Reel Forge local bot gateway',
    allowedActions: ['read_project_manifest', 'validate_quality_gates', 'create_edit_plan'],
    protectedActions: ['share_to_instagram', 'publish_media', 'reuse_source_asset'],
    endpoints: [
      { method: 'GET', path: '/api/health', purpose: 'Read local bridge readiness without exposing secrets.' },
      { method: 'GET', path: '/api/capabilities', purpose: 'Read this machine contract.' },
      { method: 'POST', path: '/api/reel-jobs/validate', purpose: 'Validate a manifest against Gate A, B, and C.' },
      { method: 'POST', path: '/api/reel-jobs/plan', purpose: 'Ask the configured local xAI bridge for an edit plan.' },
    ],
    request: {
      validate: { manifest: 'NOH handoff manifest, or the manifest directly' },
      plan: { manifest: 'NOH handoff manifest, or the manifest directly', instruction: 'optional focused editorial request' },
    },
    safety: ['No API key is returned by this gateway.', 'Human review remains required.', 'The gateway does not publish to Instagram.'],
  });
}
