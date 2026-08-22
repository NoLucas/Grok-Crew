import { getManifest, json, readJson, validateManifest } from '../shared';

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return json({ error: 'Send a JSON object with a manifest.' }, 400);
  const manifest = getManifest(body);
  const validation = validateManifest(manifest);
  return json({ schema: 'noh.reel-forge.validation/v1', manifestSchema: 'noh.reel-forge.local-agent/v1', ...validation });
}
