import { getManifest, getResponseText, hasValidLocalToken, isRecord, json, readJson, validateManifest } from '../shared';

const SYSTEM_PROMPT = `You are the editorial planning bridge for NOH Reel Forge. Return a concise, executable edit plan in English. Respect all constraints in the supplied manifest. Never recommend publishing, sharing to Instagram, copying source assets, re-uploading a source post, removing human review, crossfading, or changing the hard cut requirement. If a quality gate fails, lead with the specific correction. Include: 1) Gate risks, 2) Scene A direction, 3) Scene B direction, 4) 8–12 second timing map, 5) captions/audio notes, 6) a final request for human approval.`;

export async function POST(request: Request) {
  if (!hasValidLocalToken(request)) return json({ error: 'This local gateway requires its configured bearer token.' }, 401);
  const body = await readJson(request);
  if (!body) return json({ error: 'Send a JSON object with a manifest.' }, 400);
  const manifest = getManifest(body);
  const serialized = JSON.stringify(manifest);
  if (serialized.length > 36000) return json({ error: 'Manifest is too large for a planning request. Keep it under 36 KB.' }, 413);

  const validation = validateManifest(manifest);
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return json({ error: 'AI bridge is not configured locally. Add XAI_API_KEY to .env.local, then restart the local server.', validation }, 503);

  const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 2000) : 'Create the safest practical edit plan for this manifest.';
  const model = process.env.XAI_MODEL || 'latest';
  let response: Response;
  try {
    response = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Instruction: ${instruction}\n\nManifest:\n${serialized}\n\nLocal validation:\n${JSON.stringify(validation)}` },
        ],
        max_output_tokens: 1100,
      }),
    });
  } catch {
    return json({ error: 'Could not reach xAI from this local server. Check your connection and try again.', validation }, 502);
  }

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string' ? payload.error.message : 'xAI did not accept the planning request.';
    return json({ error: message, validation }, response.status);
  }
  const plan = getResponseText(payload);
  return json({
    schema: 'noh.reel-forge.plan/v1',
    provider: 'xAI',
    model: isRecord(payload) && typeof payload.model === 'string' ? payload.model : model,
    validation,
    plan: plan || 'The provider returned no readable text. Try again with a smaller instruction.',
    reviewRequired: true,
  });
}
