import { corsHeaders, takeGetLead } from '../../get-lead';

export const runtime = 'nodejs';

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(request.headers.get('origin') || '', request.url),
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin') || '', request.url),
  });
}

export async function POST(request: Request) {
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
