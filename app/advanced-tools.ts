import source from "../local_studio/advanced-tools.json" with { type: "json" };
import type { LocalizedQuad } from "./desktop-appearance";

export const ADVANCED_TOOLS_SCHEMA = "grok-crew.advanced-tools/v1";

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

export function primaryToolApi(tool: AdvancedTool): string {
  return tool.botApi.write[0] || tool.botApi.read[0] || "";
}

export function formatToolApi(tool: AdvancedTool): string {
  const parts = [...tool.botApi.read, ...tool.botApi.write];
  return parts.length ? parts.join(" · ") : "";
}

export function toolCatalogPayload(language: "ko" | "en" | "zh" | "ja"): ToolCatalogPayload {
  return {
    schema: ADVANCED_TOOLS_SCHEMA,
    same_pc_only: true,
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
      name: localizeQuad(tool.name, language),
      detail: localizeQuad(tool.detail, language),
      use_when: localizeQuad(tool.useWhen, language),
      never: localizeQuad(tool.never, language),
      bot_api: { read: tool.botApi.read, write: tool.botApi.write },
      cli: tool.cli,
    })),
  };
}
