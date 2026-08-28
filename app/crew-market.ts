/** Destination country for bot skills. Separate from UI language. */

export const CREW_MARKETS = ['kr', 'us', 'cn', 'jp'] as const;
export type CrewMarket = (typeof CREW_MARKETS)[number];

const LANGUAGE_TO_MARKET: Record<string, CrewMarket> = {
  ko: 'kr',
  en: 'us',
  zh: 'cn',
  ja: 'jp',
};

const ALIASES: Record<string, CrewMarket> = {
  kr: 'kr',
  ko: 'kr',
  korea: 'kr',
  한국: 'kr',
  us: 'us',
  en: 'us',
  usa: 'us',
  미국: 'us',
  cn: 'cn',
  zh: 'cn',
  china: 'cn',
  중국: 'cn',
  jp: 'jp',
  ja: 'jp',
  japan: 'jp',
  일본: 'jp',
};

export function isCrewMarket(value: unknown): value is CrewMarket {
  return CREW_MARKETS.includes(String(value || '') as CrewMarket);
}

export function marketFromLanguage(language?: string): CrewMarket {
  const lang = String(language || 'ko').slice(0, 2).toLowerCase();
  return LANGUAGE_TO_MARKET[lang] ?? 'kr';
}

export function resolveCrewMarket(value?: unknown, language?: string): CrewMarket {
  const raw = String(value || '').trim().toLowerCase();
  if (raw && ALIASES[raw]) return ALIASES[raw];
  if (isCrewMarket(raw)) return raw;
  return marketFromLanguage(language);
}

export function marketLabel(market: CrewMarket, language = 'ko'): string {
  const lang = language.slice(0, 2);
  if (market === 'kr') {
    if (lang === 'zh') return '韩国';
    if (lang === 'ja') return '韓国';
    return lang === 'en' ? 'Korea' : '한국';
  }
  if (market === 'us') {
    if (lang === 'zh') return '美国';
    if (lang === 'ja') return 'アメリカ';
    return lang === 'en' ? 'United States' : '미국';
  }
  if (market === 'cn') {
    if (lang === 'zh') return '中国';
    if (lang === 'ja') return '中国';
    return lang === 'en' ? 'China' : '중국';
  }
  if (lang === 'zh') return '日本';
  if (lang === 'ja') return '日本';
  return lang === 'en' ? 'Japan' : '일본';
}

export function marketPlanCode(market: CrewMarket): string {
  if (market === 'us') return 'en';
  if (market === 'cn') return 'zh';
  if (market === 'jp') return 'ja';
  return 'ko';
}
