export type JsonRecord = Record<string, unknown>;

export type GateResult = {
  id: 'A' | 'B' | 'C';
  name: string;
  pass: boolean;
  detail: string;
};

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function readJson(request: Request): Promise<JsonRecord | null> {
  try {
    const value: unknown = await request.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nested(value: unknown, key: string): JsonRecord {
  return isRecord(value) && isRecord(value[key]) ? value[key] : {};
}

function words(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function similarity(one: string, two: string) {
  const left = words(one);
  const right = words(two);
  const all = new Set([...left, ...right]);
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / Math.max(1, all.size);
}

function englishOnly(value: string) {
  return !/[\uAC00-\uD7A3]/.test(value) && /[a-zA-Z]/.test(value);
}

export function getManifest(body: JsonRecord) {
  return isRecord(body.manifest) ? body.manifest : body;
}

export function validateManifest(manifest: JsonRecord) {
  const project = nested(manifest, 'project');
  const sceneA = nested(project, 'sceneA');
  const sceneB = nested(project, 'sceneB');
  const agent = nested(manifest, 'agent');
  const edit = nested(manifest, 'edit');
  const quality = nested(manifest, 'quality');
  const packet = nested(manifest, 'captionPacket');
  const source = nested(manifest, 'source');

  const copy = [
    text(sceneA.headline), text(sceneA.body), text(sceneA.accent),
    text(sceneB.headline), text(sceneB.body), text(sceneB.accent),
  ].filter(Boolean);
  const durationA = Number(project.durationA ?? 0);
  const durationB = Number(project.durationB ?? 0);
  const duration = durationA + durationB;
  const similarityScore = similarity(`${text(sceneA.headline)} ${text(sceneA.body)}`, `${text(sceneB.headline)} ${text(sceneB.body)}`);
  const transition = text(edit.transition) || 'hard_cut';
  const sceneAMotion = text(sceneA.motion);
  const sceneBMotion = text(sceneB.motion);
  const originalReupload = Boolean(source.originalPostReupload ?? project.originalReupload);
  const tags = Array.isArray(packet.tags) ? packet.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [];
  const gates: GateResult[] = [
    {
      id: 'A',
      name: 'Copy discipline',
      pass: copy.length >= 4 && copy.every(englishOnly),
      detail: copy.length < 4 ? 'Add Scene A and B copy before asking a bot to edit.' : copy.every(englishOnly) ? 'English copy is present for both scenes.' : 'Reel copy must be English only.',
    },
    {
      id: 'B',
      name: 'Cut and scene contrast',
      pass: transition === 'hard_cut' && similarityScore < 0.8 && sceneAMotion !== sceneBMotion && !originalReupload && duration >= 8 && duration <= 12,
      detail: transition !== 'hard_cut' ? 'Use a hard cut, not a dissolve.' : similarityScore >= 0.8 ? 'Scene A and B are too similar.' : sceneAMotion === sceneBMotion ? 'Give Scene A and B different motion.' : originalReupload ? 'Original-post re-upload must stay off.' : duration < 8 || duration > 12 ? 'Keep the reel between 8 and 12 seconds.' : 'Two distinct scenes with a hard cut are ready.',
    },
    {
      id: 'C',
      name: 'Handoff and review',
      pass: Boolean(text(agent.role) && text(packet.hook) && text(packet.body) && tags.length && text(packet.commentPrompt)) && Boolean(quality.humanReviewRequired ?? quality.humanReview),
      detail: !(quality.humanReviewRequired ?? quality.humanReview) ? 'Human review must stay enabled.' : 'Add the agent role, caption packet, and comment prompt before handoff.',
    },
  ];

  return {
    accepted: gates.every((gate) => gate.pass),
    gates,
    checks: {
      durationSeconds: duration,
      sceneSimilarity: Number(similarityScore.toFixed(2)),
      transition,
      originalReupload,
      humanReviewRequired: Boolean(quality.humanReviewRequired ?? quality.humanReview),
    },
  };
}

export function hasValidLocalToken(request: Request) {
  const expected = process.env.REEL_FORGE_LOCAL_TOKEN;
  if (!expected) return true;
  return request.headers.get('authorization') === `Bearer ${expected}`;
}

export function getResponseText(payload: unknown): string {
  if (!isRecord(payload)) return '';
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (Array.isArray(payload.output)) {
    const chunks: string[] = [];
    for (const item of payload.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (!isRecord(content)) continue;
        if (typeof content.text === 'string') chunks.push(content.text);
        if (typeof content.output_text === 'string') chunks.push(content.output_text);
      }
    }
    if (chunks.length) return chunks.join('\n');
  }
  if (Array.isArray(payload.choices)) {
    const first = payload.choices[0];
    if (isRecord(first) && isRecord(first.message) && typeof first.message.content === 'string') return first.message.content;
  }
  return '';
}
