import {
  DISCONNECT_ACTION,
  grokKeepBeatBody,
  grokSeatEntryBody,
} from './desktop-bot-links';
import { type BotRole } from './bot-skills';

export type DeskKeepPost = (path: string, body: unknown) => Promise<unknown>;

export function heartbeatLastAction(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const row = payload as { bot?: { last_action?: unknown }; last_action?: unknown };
  if (row.bot && typeof row.bot === 'object' && row.bot.last_action != null) {
    return String(row.bot.last_action).trim();
  }
  return String(row.last_action || '').trim();
}

export async function enterGrokSeatOnDesk(input: {
  post: DeskKeepPost;
  role: BotRole;
  language?: string;
}): Promise<void> {
  await input.post('/api/bot-entry', grokSeatEntryBody(input.role, input.language));
}

/** Desk-side presence only. Do not pull next-invite here — that would take the job from the seat. */
export async function runDeskKeepTick(input: {
  post: DeskKeepPost;
  role: BotRole;
  language?: string;
}): Promise<'ok' | 'disconnected'> {
  const beat = await input.post('/api/bots/heartbeat', grokKeepBeatBody(input.role, input.language));
  if (heartbeatLastAction(beat) === DISCONNECT_ACTION) return 'disconnected';
  return 'ok';
}
