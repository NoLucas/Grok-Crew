import source from "../local_studio/advanced-tools.json" with { type: "json" };
import type { LocalizedQuad } from "./desktop-appearance";

export const ADVANCED_TOOLS_SCHEMA = "grok-crew.advanced-tools/v1";
export const TOOLS_ASSIGN_EVENT = "grok-crew-advanced-tools-assign";
export const TOOLS_ASSIGN_STORAGE = "grokCrewAdvancedToolIds";
export const TOOLS_API_BASE = "http://127.0.0.1:7214";

type Loc = { ko: string; en: string; zh: string; ja: string };

export type AdvancedToolApi = {
  read: string[];
  write: string[];
};

export type AdvancedToolHub = "index" | "featured" | "more";

export type AdvancedTool = {
  id: string;
  url: string;
  live: boolean;
  screenLive: boolean;
  apiLive: boolean;
  hub: AdvancedToolHub;
  operator: "bot";
  humanMaySpecify: true;
  name: LocalizedQuad;
  detail: LocalizedQuad;
  useWhen: LocalizedQuad;
  never: LocalizedQuad;
  botApi: AdvancedToolApi;
  cli: string[];
};

export type ToolCatalogPayload = {
  schema: string;
  same_pc_only: true;
  operator: "bot";
  human_may_specify: true;
  assigned: string[];
  bot_instruction: string;
  rule: string;
  cli: string;
  never: string[];
  tools: Array<{
    id: string;
    url: string;
    live: boolean;
    screen_live: boolean;
    api_live: boolean;
    hub: AdvancedToolHub;
    operator: "bot";
    human_may_specify: true;
    assigned: boolean;
    name: string;
    detail: string;
    use_when: string;
    never: string;
    bot_api: AdvancedToolApi;
    cli: string[];
  }>;
};

function quad(value: Loc): LocalizedQuad {
  return [value.ko, value.en, value.zh, value.ja];
}

const catalog = source as {
  schema: string;
  cli: string;
  rule: Loc;
  never: Loc[];
  tools: Array<{
    id: string;
    url: string;
    screen_live: boolean;
    api_live: boolean;
    hub: AdvancedToolHub;
    name: Loc;
    detail: Loc;
    use_when: Loc;
    never: Loc;
    bot_api: AdvancedToolApi;
    cli: string[];
  }>;
};

export const ADVANCED_TOOLS_RULE = quad(catalog.rule);
export const ADVANCED_TOOLS_NEVER = catalog.never.map(quad);
export const ADVANCED_TOOLS_CLI = catalog.cli;

export const ADVANCED_TOOLS: AdvancedTool[] = catalog.tools.map((tool) => {
  const screenLive = Boolean(tool.screen_live);
  return {
    id: tool.id,
    url: tool.url,
    live: screenLive,
    screenLive,
    apiLive: Boolean(tool.api_live),
    hub: tool.hub,
    operator: "bot",
    humanMaySpecify: true,
    name: quad(tool.name),
    detail: quad(tool.detail),
    useWhen: quad(tool.use_when),
    never: quad(tool.never),
    botApi: { read: [...(tool.bot_api.read ?? [])], write: [...(tool.bot_api.write ?? [])] },
    cli: [...(tool.cli ?? [])],
  };
});

export function localizeQuad(value: LocalizedQuad, language: "ko" | "en" | "zh" | "ja"): string {
  const index = { ko: 0, en: 1, zh: 2, ja: 3 }[language];
  return value[index];
}

export function featuredAdvancedTools(): AdvancedTool[] {
  return ADVANCED_TOOLS.filter((tool) => tool.hub === "featured");
}

export function moreAdvancedTools(): AdvancedTool[] {
  return ADVANCED_TOOLS.filter((tool) => tool.hub === "more");
}

export function liveAdvancedTools(): AdvancedTool[] {
  return featuredAdvancedTools().filter((tool) => tool.screenLive);
}

export function draftAdvancedTools(): AdvancedTool[] {
  return featuredAdvancedTools().filter((tool) => !tool.screenLive);
}

export function defaultAssignedIds(): string[] {
  return ADVANCED_TOOLS.filter((tool) => tool.apiLive).map((tool) => tool.id);
}

export function normalizeAssignedIds(ids: string[] | null | undefined): string[] {
  if (!ids) return defaultAssignedIds();
  const known = new Set(ADVANCED_TOOLS.map((tool) => tool.id));
  const cleaned: string[] = [];
  for (const raw of ids) {
    const id = String(raw || "").trim();
    if (id && known.has(id) && !cleaned.includes(id)) cleaned.push(id);
  }
  return cleaned;
}

export function assignedIdsFromCatalog(payload: ToolCatalogPayload | null | undefined): string[] {
  if (payload && Array.isArray(payload.assigned)) return normalizeAssignedIds(payload.assigned);
  if (payload?.tools?.length) {
    return normalizeAssignedIds(payload.tools.filter((tool) => tool.assigned).map((tool) => tool.id));
  }
  return defaultAssignedIds();
}

export function readStoredAssignedIds(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOOLS_ASSIGN_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? normalizeAssignedIds(parsed.map(String)) : null;
  } catch {
    return null;
  }
}

export function writeStoredAssignedIds(ids: string[]): string[] {
  const cleaned = normalizeAssignedIds(ids);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOOLS_ASSIGN_STORAGE, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent(TOOLS_ASSIGN_EVENT, { detail: cleaned }));
  }
  return cleaned;
}

export function botToolsInstruction(
  language: "ko" | "en" | "zh" | "ja",
  ids: string[],
  base = TOOLS_API_BASE,
): string {
  const usable = normalizeAssignedIds(ids).filter((id) => {
    const tool = ADVANCED_TOOLS.find((item) => item.id === id);
    return Boolean(tool?.apiLive) && id !== "hub";
  });
  const lines = {
    ko: {
      some: `고급 도구는 지정된 것만 쓰세요. GET ${base}/api/v2/tools?lang=ko 를 읽고 assigned가 true이고 api_live가 true인 도구의 bot_api만 호출하세요. HTML을 긁거나 화면을 클릭하지 마세요. 지정: ${usable.join(", ")}. 실행은 봇이 합니다. 사람은 지정만 합니다.`,
      none: `고급 도구는 지금은 지정된 것이 없습니다. GET ${base}/api/v2/tools?lang=ko 를 읽고 assigned를 확인하세요. 지정될 때까지 고급 도구 write API를 치지 마세요. HTML을 긁지 마세요.`,
    },
    en: {
      some: `Use only the assigned advanced tools. Read GET ${base}/api/v2/tools?lang=en and call bot_api only for tools where assigned is true and api_live is true. Do not scrape or click the screens. Assigned: ${usable.join(", ")}. The bot runs them. A person only specifies.`,
      none: `No advanced tools are assigned. Read GET ${base}/api/v2/tools?lang=en and check assigned. Do not hit advanced-tool write APIs until something is assigned. Do not scrape HTML.`,
    },
    zh: {
      some: `只使用已指定的高级工具。读取 GET ${base}/api/v2/tools?lang=zh，只调用 assigned 为 true 且 api_live 为 true 的工具的 bot_api。不要抓取或点击页面。指定：${usable.join(", ")}。由机器人执行。人只负责指定。`,
      none: `现在没有指定的高级工具。读取 GET ${base}/api/v2/tools?lang=zh 并查看 assigned。在指定之前不要打高级工具的 write API。不要抓 HTML。`,
    },
    ja: {
      some: `指定された高度なツールだけを使ってください。GET ${base}/api/v2/tools?lang=ja を読み、assigned が true で api_live が true のツールの bot_api だけを呼びます。HTML を掻いたり画面をクリックしたりしないでください。指定: ${usable.join(", ")}。実行はボットです。人は指定だけします。`,
      none: `高度なツールは今指定がありません。GET ${base}/api/v2/tools?lang=ja を読んで assigned を確認してください。指定されるまで高度なツールの write API を叩かないでください。HTML は掻きません。`,
    },
  }[language];
  return usable.length ? lines.some : lines.none;
}

export function primaryToolApi(tool: AdvancedTool): string {
  return tool.botApi.write[0] || tool.botApi.read[0] || "";
}

export function formatToolApi(tool: AdvancedTool): string {
  const parts = [...tool.botApi.read, ...tool.botApi.write];
  return parts.length ? parts.join(" · ") : "";
}

export function toolCatalogPayload(
  language: "ko" | "en" | "zh" | "ja",
  assigned = defaultAssignedIds(),
): ToolCatalogPayload {
  const ids = normalizeAssignedIds(assigned);
  return {
    schema: ADVANCED_TOOLS_SCHEMA,
    same_pc_only: true,
    operator: "bot",
    human_may_specify: true,
    assigned: ids,
    bot_instruction: botToolsInstruction(language, ids),
    rule: localizeQuad(ADVANCED_TOOLS_RULE, language),
    cli: ADVANCED_TOOLS_CLI,
    never: ADVANCED_TOOLS_NEVER.map((item) => localizeQuad(item, language)),
    tools: ADVANCED_TOOLS.map((tool) => ({
      id: tool.id,
      url: tool.url,
      live: tool.screenLive,
      screen_live: tool.screenLive,
      api_live: tool.apiLive,
      hub: tool.hub,
      operator: "bot",
      human_may_specify: true,
      assigned: ids.includes(tool.id),
      name: localizeQuad(tool.name, language),
      detail: localizeQuad(tool.detail, language),
      use_when: localizeQuad(tool.useWhen, language),
      never: localizeQuad(tool.never, language),
      bot_api: { read: tool.botApi.read, write: tool.botApi.write },
      cli: tool.cli,
    })),
  };
}
