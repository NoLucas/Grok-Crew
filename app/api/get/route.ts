import { corsHeaders, getLeadClientKey, isAllowedGetOrigin, takeGetLead, tooManyGetLeads } from '../../get-lead';

export const runtime = 'nodejs';

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(request.headers.get('origin') || '', request.url),
  });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '';
  if (origin && !isAllowedGetOrigin(origin, request.url)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, request.url),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || '';
  if (origin && !isAllowedGetOrigin(origin, request.url)) {
    return json(request, { ok: false, reason: 'email' }, 403);
  }
  if (tooManyGetLeads(getLeadClientKey(request))) {
    return json(request, { ok: false, reason: 'save' }, 429);
  }
  let body: { email?: string; website?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, reason: 'email' }, 400);
  }
  const result = await takeGetLead(body);
  if (!result.ok) {
    return json(request, result, result.reason === 'save' ? 500 : 400);
  }
  return json(request, result);
}
