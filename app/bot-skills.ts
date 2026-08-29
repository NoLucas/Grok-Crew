/** Built-in role skills. Bots read these on connect. This app does not scrape. */

import { marketFromLanguage, marketLabel, marketPlanCode, resolveCrewMarket, type CrewMarket } from './crew-market';
import { resolveVoiceModelId, voiceAccentsForModel, voiceModelLabel } from './desktop-voice-models';
import { resolveVoicePersona, voicePersonaLabel } from './desktop-voice-personas';

export const BOT_ROLES = ['planner', 'scraper', 'editor'] as const;
export type BotRole = (typeof BOT_ROLES)[number];

export const BOT_SKILL_PATHS = {
  planner: '/bot-skills/planner.md',
  scraper: '/bot-skills/scraper.md',
  editor: '/bot-skills/editor.md',
  'edit-plan': '/bot-skills/edit-plan.md',
  'public-pick': '/bot-skills/public-pick.md',
  'cut-to-plan': '/bot-skills/cut-to-plan.md',
} as const;

export const ROLE_EXTRA_SKILLS = {
  planner: ['edit-plan'],
  scraper: ['public-pick'],
  editor: ['cut-to-plan'],
} as const;

type L4 = { ko: string; en: string; zh: string; ja: string };

function langOf(language?: string): keyof L4 {
  const lang = String(language || 'ko').slice(0, 2);
  return lang === 'en' || lang === 'zh' || lang === 'ja' ? lang : 'ko';
}

function pick(map: L4, language?: string): string {
  return map[langOf(language)];
}

export function isBotRole(value: unknown): value is BotRole {
  return value === 'planner' || value === 'scraper' || value === 'editor';
}

export function roleLabel(role: BotRole, language = 'ko'): string {
  const lang = langOf(language);
  if (role === 'planner') {
    if (lang === 'zh') return '策划';
    if (lang === 'ja') return '企画者';
    return lang === 'en' ? 'Planner' : '기획자';
  }
  if (role === 'scraper') {
    if (lang === 'zh') return '抓取';
    if (lang === 'ja') return '収集';
    return lang === 'en' ? 'Scraper' : '스크래핑';
  }
  if (lang === 'zh') return '剪辑';
  if (lang === 'ja') return '編集者';
  return lang === 'en' ? 'Editor' : '편집자';
}

export function seatName(kind: 'grok' | 'custom' | string, role: BotRole, language = 'ko'): string {
  const family = kind === 'grok' ? 'Grok Bot' : 'Agent';
  return `${family} ${roleLabel(role, language)}`;
}

/** Short lamp labels on the follow bar and crew cards. Not the seat chat name. */
export function seatShortLabel(role: BotRole, language = 'ko'): string {
  const lang = langOf(language);
  if (role === 'planner') {
    if (lang === 'zh') return '策划';
    if (lang === 'ja') return '企画';
    return lang === 'en' ? 'Plan' : '기획';
  }
  if (role === 'scraper') {
    if (lang === 'zh') return '抓取';
    if (lang === 'ja') return 'スクラップ';
    return lang === 'en' ? 'Scrap' : '스크랩';
  }
  if (lang === 'zh') return '剪辑';
  if (lang === 'ja') return '編集';
  return lang === 'en' ? 'Cut' : '편집';
}

const LOOPBACK: L4 = {
  ko: '봇이 돌아가는 리눅스나 다른 컴퓨터에서 127.0.0.1을 열지 않습니다. 그 주소는 이 책상이 아닙니다. Windows 체크인은 초대문 겉문장만 따릅니다.',
  en: 'Do not open 127.0.0.1 from the bot Linux or another computer. That address is not this desk. Windows check-in is only in the connect wrapper.',
  zh: '不要从机器人所在的 Linux 或另一台电脑打开 127.0.0.1。那个地址不是这张桌子。Windows 签到只写在连接信封里。',
  ja: 'ボットの Linux や別のコンピュータから 127.0.0.1 を開かないでください。その住所はこの机ではありません。Windows のチェックインは接続文の外側だけです。',
};

const LOGIN_WALL: L4 = {
  ko: '로그인 막힌 인스타·틱톡·유튜브·더우인·샤오홍슈',
  en: 'login-walled Instagram, TikTok, YouTube, Douyin, or Xiaohongshu',
  zh: '必须登录的 Instagram、TikTok、YouTube、抖音、小红书',
  ja: 'ログインが要る Instagram・TikTok・YouTube・抖音・小紅書',
};

type MarketCopy = {
  windows: L4;
  skipWindows: L4;
  hook: L4;
  length: L4;
  cuts: L4;
  fx: L4;
  captions: L4;
  habit: L4;
  editorHook: L4;
  editorCuts: L4;
  editorFx: L4;
  editorCaptions: L4;
  crossExample: L4;
  swapBan: L4;
  overlayFix: L4;
  audioFix: L4;
  extraScreenBan: L4;
};

const MARKET_COPY: Record<CrewMarket, MarketCopy> = {
  kr: {
    windows: {
      ko: '네이버 TV 공개, 공개 뉴스·공공·브랜드, 공개 홈페이지',
      en: 'Naver TV public pages, public news/government/brand pages, public homepages',
      zh: 'Naver TV 公开页、公开新闻/政府/品牌页、公开主页',
      ja: 'Naver TV の公開、公開ニュース・公共・ブランド、公開ホームページ',
    },
    skipWindows: {
      ko: '빌리빌리·니코니코를 기본으로 넣지 않습니다.',
      en: 'Do not default to Bilibili or Niconico.',
      zh: '不要把哔哩哔哩或 Niconico 当作默认窗口。',
      ja: 'ビリビリやニコニコを初期値にしないでください。',
    },
    hook: {
      ko: '첫 1초 글자·얼굴·가게. 한글로.',
      en: 'Text, a face, or a shop in the first second. In Korean.',
      zh: '第一秒出字、脸或店面。用韩文。',
      ja: '最初の1秒は文字・顔・店。韓国語で。',
    },
    length: {
      ko: '15–30초. 형태가 있으면 그 길이를 지킵니다.',
      en: '15–30 seconds. Keep the recipe length when there is one.',
      zh: '15–30 秒。有形态就守那个长度。',
      ja: '15–30秒。形があればその長さを守ります。',
    },
    cuts: {
      ko: '중간',
      en: 'medium',
      zh: '中等',
      ja: '中くらい',
    },
    fx: {
      ko: '적음',
      en: 'low',
      zh: '少',
      ja: '少なめ',
    },
    captions: {
      ko: '자막이 큽니다. 한글.',
      en: 'Captions are large. Korean.',
      zh: '字幕大。韩文。',
      ja: '字幕は大きい。韓国語。',
    },
    habit: {
      ko: '첫 1초 글자·얼굴·가게. 자막이 큽니다. 컷은 중간, 효과는 적음. 15–30초.',
      en: 'Text, a face, or a shop in the first second. Large captions. Medium cuts, low effects. 15–30 seconds.',
      zh: '第一秒出字、脸或店面。字幕大。剪辑中等，特效少。15–30 秒。',
      ja: '最初の1秒は文字・顔・店。字幕は大きい。カットは中、効果は少なめ。15–30秒。',
    },
    editorHook: {
      ko: '한글 훅. 글자·얼굴·가게.',
      en: 'A Korean hook. Text, a face, or a shop.',
      zh: '韩文钩子。字、脸或店面。',
      ja: '韓国語のフック。文字・顔・店。',
    },
    editorCuts: {
      ko: '컷은 중간.',
      en: 'Cuts stay medium.',
      zh: '剪辑保持中等。',
      ja: 'カットは中くらい。',
    },
    editorFx: {
      ko: '효과는 적게.',
      en: 'Keep effects low.',
      zh: '特效少用。',
      ja: '効果は少なめ。',
    },
    editorCaptions: {
      ko: '자막 크게. 한글.',
      en: 'Large Korean captions.',
      zh: '字幕大。韩文。',
      ja: '字幕は大きく。韓国語。',
    },
    crossExample: {
      ko: '예: 중국 영상 → 한국 컷.',
      en: 'Example: a Chinese video → a Korea cut.',
      zh: '例：中国影像 → 韩国成片。',
      ja: '例: 中国の映像 → 韓国のカット。',
    },
    swapBan: {
      ko: '비슷한 한국 영상으로 갈아치우지 않습니다.',
      en: 'Do not swap in a similar Korean video.',
      zh: '不要换成相似的韩国影像。',
      ja: '似た韓国の映像に差し替えないでください。',
    },
    overlayFix: {
      ko: '원본 위 외국어 글자·가격·유행어는 계획이 시키면 가리거나 한글로 덮습니다.',
      en: 'If the plan says so, cover foreign on-screen text, prices, or slang with Korean.',
      zh: '计划要求时，把原片上的外文、价格、流行语用韩文盖住。',
      ja: '計画が言えば、元の外国語の文字・値段・流行語を韓国語で覆います。',
    },
    audioFix: {
      ko: '원본 말이 외국어면 소리를 두고 한글 자막. 더빙은 운영자가 준 한국어 소리만.',
      en: 'If the source speech is not Korean, keep the audio and add Korean captions. Dub only with operator Korean audio.',
      zh: '原声不是韩语就保留原声，加韩文字幕。配音只用操作员给的韩语音频。',
      ja: '元の言葉が韓国語でなければ音は残し、韓国語字幕。吹き替えは運営者の韓国語音声だけ。',
    },
    extraScreenBan: {
      ko: '계획에 없는 한국 화면을 끼워 넣지 않습니다.',
      en: 'Do not insert Korean shots that are not in the plan.',
      zh: '不要塞进计划里没有的韩国画面。',
      ja: '計画にない韓国の画面を差し込まないでください。',
    },
  },
  us: {
    windows: {
      ko: 'Vimeo 공개, 공개 뉴스·공공·브랜드, 공개 홈페이지',
      en: 'Vimeo public pages, public news/government/brand pages, public homepages',
      zh: 'Vimeo 公开页、公开新闻/政府/品牌页、公开主页',
      ja: 'Vimeo の公開、公開ニュース・公共・ブランド、公開ホームページ',
    },
    skipWindows: {
      ko: '네이버·빌리빌리를 기본으로 넣지 않습니다.',
      en: 'Do not default to Naver or Bilibili.',
      zh: '不要把 Naver 或哔哩哔哩当作默认窗口。',
      ja: 'Naver やビリビリを初期値にしないでください。',
    },
    hook: {
      ko: '말로 훅. 얼굴·제품.',
      en: 'A spoken hook. A face or the product.',
      zh: '用说话做钩子。脸或产品。',
      ja: '言葉でフック。顔か製品。',
    },
    length: {
      ko: '형태 길이. 없으면 짧게 유지합니다.',
      en: 'Keep the recipe length. If none, keep it short.',
      zh: '守形态长度。没有就保持短。',
      ja: '形の長さ。なければ短く保ちます。',
    },
    cuts: {
      ko: '분명하게',
      en: 'clear and distinct',
      zh: '清楚分明',
      ja: 'はっきり',
    },
    fx: {
      ko: '절제',
      en: 'restrained',
      zh: '克制',
      ja: '抑える',
    },
    captions: {
      ko: '말 훅이 우선. 글자는 필요할 때만.',
      en: 'The spoken hook comes first. On-screen text only when needed.',
      zh: '说话钩子优先。字只在需要时加。',
      ja: '話しフックが先。字は必要なときだけ。',
    },
    habit: {
      ko: '말로 훅. 얼굴·제품. 컷은 분명, 효과는 절제.',
      en: 'A spoken hook. A face or the product. Clear cuts, restrained effects.',
      zh: '用说话做钩子。脸或产品。剪辑清楚，特效克制。',
      ja: '言葉でフック。顔か製品。カットははっきり、効果は抑える。',
    },
    editorHook: {
      ko: '말 훅을 살립니다. 얼굴·제품.',
      en: 'Keep the spoken hook. A face or the product.',
      zh: '保住说话钩子。脸或产品。',
      ja: '話しフックを残す。顔か製品。',
    },
    editorCuts: {
      ko: '컷은 분명하게.',
      en: 'Make cuts distinct.',
      zh: '剪辑要清楚。',
      ja: 'カットははっきり。',
    },
    editorFx: {
      ko: '효과는 필요할 때만.',
      en: 'Effects only when needed.',
      zh: '特效只在需要时。',
      ja: '効果は必要なときだけ。',
    },
    editorCaptions: {
      ko: '말 훅이 우선.',
      en: 'The spoken hook comes first.',
      zh: '说话钩子优先。',
      ja: '話しフックが先。',
    },
    crossExample: {
      ko: '예: 한국 영상 → 미국 컷.',
      en: 'Example: a Korean video → a United States cut.',
      zh: '例：韩国影像 → 美国成片。',
      ja: '例: 韓国の映像 → アメリカのカット。',
    },
    swapBan: {
      ko: '비슷한 미국 영상으로 갈아치우지 않습니다.',
      en: 'Do not swap in a similar United States video.',
      zh: '不要换成相似的美国影像。',
      ja: '似たアメリカの映像に差し替えないでください。',
    },
    overlayFix: {
      ko: '원본 위 외국어 글자·가격·유행어는 계획이 시키면 가리거나 영어로 덮습니다.',
      en: 'If the plan says so, cover foreign on-screen text, prices, or slang with English.',
      zh: '计划要求时，把原片上的外文、价格、流行语用英文盖住。',
      ja: '計画が言えば、元の外国語の文字・値段・流行語を英語で覆います。',
    },
    audioFix: {
      ko: '원본 말이 영어가 아니면 소리를 두고 영어 자막. 더빙은 운영자가 준 영어 소리만.',
      en: 'If the source speech is not English, keep the audio and add English captions. Dub only with operator English audio.',
      zh: '原声不是英语就保留原声，加英文字幕。配音只用操作员给的英语音频。',
      ja: '元の言葉が英語でなければ音は残し、英語字幕。吹き替えは運営者の英語音声だけ。',
    },
    extraScreenBan: {
      ko: '계획에 없는 미국 화면을 끼워 넣지 않습니다.',
      en: 'Do not insert United States shots that are not in the plan.',
      zh: '不要塞进计划里没有的美国画面。',
      ja: '計画にないアメリカの画面を差し込まないでください。',
    },
  },
  cn: {
    windows: {
      ko: '빌리빌리 공개, 공개 뉴스·공공·브랜드',
      en: 'Bilibili public pages, public news/government/brand pages',
      zh: '哔哩哔哩公开页、公开新闻/政府/品牌页',
      ja: 'ビリビリの公開、公開ニュース・公共・ブランド',
    },
    skipWindows: {
      ko: '더우인·샤오홍슈는 로그인 벽입니다. 네이버·니코니코를 기본으로 넣지 않습니다.',
      en: 'Douyin and Xiaohongshu are login walls. Do not default to Naver or Niconico.',
      zh: '抖音、小红书是登录墙。不要把 Naver 或 Niconico 当作默认窗口。',
      ja: '抖音・小紅書はログイン壁。Naver やニコニコを初期値にしないでください。',
    },
    hook: {
      ko: '첫 화면이 크고 빠릅니다. 글자가 많습니다.',
      en: 'The first frame is large and fast. Lots of on-screen text.',
      zh: '第一屏又大又快。字很多。',
      ja: '最初の画面は大きく速い。字が多い。',
    },
    length: {
      ko: '짧게, 초반이 더 빽빽합니다.',
      en: 'Keep it short. The opening is denser.',
      zh: '保持短。开头更密。',
      ja: '短く。冒頭はより密。',
    },
    cuts: {
      ko: '많음. 전환은 짧음',
      en: 'frequent, with short transitions',
      zh: '多，转场短',
      ja: '多め。転換は短い',
    },
    fx: {
      ko: '계획이 적은 밀도만',
      en: 'only the density written in the plan',
      zh: '只用计划写明的密度',
      ja: '計画に書いた密度だけ',
    },
    captions: {
      ko: '화면 글자가 많고 큽니다.',
      en: 'On-screen text is frequent and large.',
      zh: '画面字又多又大。',
      ja: '画面の字は多く大きい。',
    },
    habit: {
      ko: '첫 화면이 크고 빠릅니다. 글자가 많습니다. 컷이 많고 전환이 짧습니다.',
      en: 'The first frame is large and fast. Lots of text. Frequent cuts and short transitions.',
      zh: '第一屏又大又快。字很多。剪辑多，转场短。',
      ja: '最初の画面は大きく速い。字が多い。カットが多く転換が短い。',
    },
    editorHook: {
      ko: '크고 빠른 첫 화면. 글자 많음.',
      en: 'A large, fast first frame. Lots of text.',
      zh: '又大又快的第一屏。字多。',
      ja: '大きく速い最初の画面。字が多い。',
    },
    editorCuts: {
      ko: '컷을 더 자주. 전환은 짧게.',
      en: 'Cut more often. Keep transitions short.',
      zh: '剪得更勤。转场要短。',
      ja: 'カットをより頻繁に。転換は短く。',
    },
    editorFx: {
      ko: '효과가 많다고 적히면 그 밀도만.',
      en: 'If the plan asks for more effects, use only that density.',
      zh: '计划写了特效多，就只用那个密度。',
      ja: '効果が多いと書いてあればその密度だけ。',
    },
    editorCaptions: {
      ko: '글자를 크게.',
      en: 'Keep on-screen text large.',
      zh: '字要大。',
      ja: '字を大きく。',
    },
    crossExample: {
      ko: '예: 미국 영상 → 중국 컷.',
      en: 'Example: a United States video → a China cut.',
      zh: '例：美国影像 → 中国成片。',
      ja: '例: アメリカの映像 → 中国のカット。',
    },
    swapBan: {
      ko: '비슷한 중국 유행 영상으로 갈아치우지 않습니다.',
      en: 'Do not swap in a similar Chinese trend video.',
      zh: '不要换成相似的中国流行影像。',
      ja: '似た中国の流行映像に差し替えないでください。',
    },
    overlayFix: {
      ko: '원본 위 외국어 글자·가격·유행어는 계획이 시키면 가리거나 중문으로 덮습니다.',
      en: 'If the plan says so, cover foreign on-screen text, prices, or slang with Chinese.',
      zh: '计划要求时，把原片上的外文、价格、流行语用中文盖住。',
      ja: '計画が言えば、元の外国語の文字・値段・流行語を中国語で覆います。',
    },
    audioFix: {
      ko: '원본 말이 중국어가 아니면 소리를 두고 중문 자막. 더빙은 운영자가 준 중국어 소리만.',
      en: 'If the source speech is not Chinese, keep the audio and add Chinese captions. Dub only with operator Chinese audio.',
      zh: '原声不是中文就保留原声，加中文字幕。配音只用操作员给的中文音频。',
      ja: '元の言葉が中国語でなければ音は残し、中国語字幕。吹き替えは運営者の中国語音声だけ。',
    },
    extraScreenBan: {
      ko: '계획에 없는 중국 화면을 끼워 넣지 않습니다.',
      en: 'Do not insert Chinese shots that are not in the plan.',
      zh: '不要塞进计划里没有的中国画面。',
      ja: '計画にない中国の画面を差し込まないでください。',
    },
  },
  jp: {
    windows: {
      ko: '니코니코 공개, 공개 뉴스·공공·브랜드',
      en: 'Niconico public pages, public news/government/brand pages',
      zh: 'Niconico 公开页、公开新闻/政府/品牌页',
      ja: 'ニコニコの公開、公開ニュース・公共・ブランド',
    },
    skipWindows: {
      ko: '빌리빌리·네이버를 기본으로 넣지 않습니다.',
      en: 'Do not default to Bilibili or Naver.',
      zh: '不要把哔哩哔哩或 Naver 当作默认窗口。',
      ja: 'ビリビリや Naver を初期値にしないでください。',
    },
    hook: {
      ko: '호흡이 조금 깁니다. 화면이 정돈됩니다.',
      en: 'The breath is a little longer. The frame stays tidy.',
      zh: '呼吸稍长。画面整齐。',
      ja: '呼吸が少し長い。画面は整えます。',
    },
    length: {
      ko: '조금 여유 있게. 형태가 있으면 그 길이를 지킵니다.',
      en: 'Leave a little more air. Keep the recipe length when there is one.',
      zh: '稍留余地。有形态就守那个长度。',
      ja: '少し余裕を。形があればその長さを守ります。',
    },
    cuts: {
      ko: '적음~중간',
      en: 'low to medium',
      zh: '少到中等',
      ja: '少なめ〜中',
    },
    fx: {
      ko: '적음',
      en: 'low',
      zh: '少',
      ja: '少なめ',
    },
    captions: {
      ko: '화면을 정돈합니다. 글자는 과하지 않게.',
      en: 'Keep the frame tidy. Do not overdo on-screen text.',
      zh: '画面整齐。字不要过多。',
      ja: '画面を整える。字はやりすぎない。',
    },
    habit: {
      ko: '호흡이 조금 깁니다. 화면이 정돈됩니다. 컷은 적음~중간, 효과는 적음.',
      en: 'The breath is a little longer. The frame stays tidy. Cuts are low to medium. Effects stay low.',
      zh: '呼吸稍长。画面整齐。剪辑少到中等，特效少。',
      ja: '呼吸が少し長い。画面は整える。カットは少なめ〜中、効果は少なめ。',
    },
    editorHook: {
      ko: '정돈된 첫 화면. 호흡 조금 김.',
      en: 'A tidy first frame. A slightly longer breath.',
      zh: '整齐的第一屏。呼吸稍长。',
      ja: '整った最初の画面。呼吸は少し長い。',
    },
    editorCuts: {
      ko: '컷을 덜 자주.',
      en: 'Cut less often.',
      zh: '剪得少一些。',
      ja: 'カットは控えめに。',
    },
    editorFx: {
      ko: '효과는 과하지 않게.',
      en: 'Do not overdo effects.',
      zh: '特效不要过头。',
      ja: '効果はやりすぎない。',
    },
    editorCaptions: {
      ko: '화면을 정돈. 글자는 과하지 않게.',
      en: 'Keep the frame tidy. Do not overdo text.',
      zh: '画面整齐。字不要过多。',
      ja: '画面を整える。字はやりすぎない。',
    },
    crossExample: {
      ko: '예: 한국 영상 → 일본 컷.',
      en: 'Example: a Korean video → a Japan cut.',
      zh: '例：韩国影像 → 日本成片。',
      ja: '例: 韓国の映像 → 日本のカット。',
    },
    swapBan: {
      ko: '비슷한 일본 영상으로 갈아치우지 않습니다.',
      en: 'Do not swap in a similar Japanese video.',
      zh: '不要换成相似的日本影像。',
      ja: '似た日本の映像に差し替えないでください。',
    },
    overlayFix: {
      ko: '원본 위 외국어 글자·가격·유행어는 계획이 시키면 가리거나 일본어로 덮습니다.',
      en: 'If the plan says so, cover foreign on-screen text, prices, or slang with Japanese.',
      zh: '计划要求时，把原片上的外文、价格、流行语用日文盖住。',
      ja: '計画が言えば、元の外国語の文字・値段・流行語を日本語で覆います。',
    },
    audioFix: {
      ko: '원본 말이 일본어가 아니면 소리를 두고 일본어 자막. 더빙은 운영자가 준 일본어 소리만.',
      en: 'If the source speech is not Japanese, keep the audio and add Japanese captions. Dub only with operator Japanese audio.',
      zh: '原声不是日语就保留原声，加日文字幕。配音只用操作员给的日语音频。',
      ja: '元の言葉が日本語でなければ音は残し、日本語字幕。吹き替えは運営者の日本語音声だけ。',
    },
    extraScreenBan: {
      ko: '계획에 없는 일본 화면을 끼워 넣지 않습니다.',
      en: 'Do not insert Japanese shots that are not in the plan.',
      zh: '不要塞进计划里没有的日本画面。',
      ja: '計画にない日本の画面を差し込まないでください。',
    },
  },
};

function countryOnlyLine(market: CrewMarket, language?: string): string {
  const name = marketLabel(market, language);
  return pick({
    ko: `이 스킬은 ${name}만 다룹니다. 다른 나라 버릇을 같이 적지 않습니다.`,
    en: `This skill covers ${name} only. Do not list habits for the other countries.`,
    zh: `这项技能只讲 ${name}。不要同时写其他国家的习惯。`,
    ja: `このスキルは ${name} だけです。ほかの国の癖を並べないでください。`,
  }, language);
}

function plannerCore(language: string, market: CrewMarket): string {
  const dest = marketLabel(market, language);
  const loop = pick(LOOPBACK, language);
  const wall = pick(LOGIN_WALL, language);
  const title = pick({ ko: '기획자', en: 'Planner', zh: '策划', ja: '企画者' }, language);
  const body = pick({
    ko: `# Grok Crew · ${title}

당신은 기획자입니다. 편집자도, 스크래핑도 아닙니다.

## 하는 일
1. 운영자가 준 말만 읽습니다. 영상 주소이거나, 원하는 편집 방법입니다. 한국어만이 아닙니다.
2. 어떤 컷인지 한 줄로 정합니다. 원본 나라·보낼 곳(${dest}), 길이, 훅, 장면 순서, 컷 밀도, 효과, 가져올 공개 자료.
3. 스크래핑 봇에게 **직접 파일 URL**만 한 줄에 하나씩 적습니다. 검색어·공개 페이지 탐방은 적지 않습니다. ${wall}는 적지 않습니다. URL이 없으면 그 장면은 missing입니다.
4. 초대문의 자료함 절대경로를 목록과 함께 SendToAgent로 수집에게 넘깁니다. 채팅에 @를 치지 않습니다. 편집자에게는 자를 방법만 넘깁니다. 파일을 직접 자르지 않습니다.
5. 운영자가 마음에 안 든다고 다시 말하면, 그 말만 보고 계획을 고칩니다.

## 하지 않는 일
- ${loop}
- 사이트를 긁지 않습니다. 이 프로그램도 긁지 않습니다.
- 화질을 바꾸지 않습니다.
- 올리지 않습니다.`,
    en: `# Grok Crew · ${title}

You are the planner. You are not the editor or the scraper.

## What you do
1. Read only the operator's words. That may be a video URL or the cut they want. It is not English-only.
2. Name the cut in one line: source country, destination (${dest}), length, hook, scene order, cut density, effects, and public clips to fetch.
3. Write **direct file URLs** only, one per line, for the scraper. Do not write a search phrase or a page crawl. Do not name ${wall}. If a scene has no URL, mark it missing.
4. SendToAgent the URL list plus the invite materials path to the scraper. Do not type @ in chat. Hand the editor a method. Do not cut files yourself.
5. If the operator asks for a change, change only that.

## What you do not do
- ${loop}
- Do not scrape. This app does not scrape either.
- Do not change picture quality.
- Do not upload.`,
    zh: `# Grok Crew · ${title}

你是策划。你不是剪辑，也不是抓取。

## 要做的
1. 只读操作员给的话。可能是影像地址，或想要的剪法。不只是中文。
2. 用一句话定成片：原片国家、去向（${dest}）、长度、钩子、镜头顺序、剪辑密度、特效、要取的公开素材。
3. 给抓取只写**可直接下载的文件地址**，一行一个。不要写搜索词或逛公开页。不要写 ${wall}。没有地址的镜头写成 missing。
4. 用 SendToAgent 把地址清单和邀请里的资料箱路径交给抓取。不要在聊天里打 @。只把剪法交给剪辑。不要自己剪文件。
5. 操作员说改，就只改那一句。

## 不要做
- ${loop}
- 不要抓站。这个程序也不抓。
- 不要改画质。
- 不要上传。`,
    ja: `# Grok Crew · ${title}

あなたは企画者です。編集者でも収集でもありません。

## すること
1. 運営者が渡した言葉だけ読む。映像の住所か、欲しい切り方。日本語だけではありません。
2. カットを一行で決める。元の国、送り先（${dest}）、長さ、フック、場面順、カット密度、効果、取る公開素材。
3. 収集には**直接ファイル URL** だけを一行ずつ書く。検索語や公開ページ巡りは書かない。${wall} は書かない。URL がなければその場面は missing。
4. 招待文の資料箱の絶対パスと一覧を SendToAgent で収集に渡す。チャットに @ を打たない。編集者には切り方だけ渡す。自分で切らない。
5. 運営者が直してと言ったら、その言葉だけ見て直す。

## しないこと
- ${loop}
- サイトを掻かない。このプログラムも掻きません。
- 画質を変えない。
- 上げない。`,
  }, language);
  return `---
name: grok-crew-planner
description: Turn the operator prompt into an edit plan. Do not cut or scrape.
---

${body}
`;
}

function editPlanSkill(language: string, market: CrewMarket): string {
  const dest = marketLabel(market, language);
  const facts = MARKET_COPY[market];
  const loop = pick(LOOPBACK, language);
  const wall = pick(LOGIN_WALL, language);
  const only = countryOnlyLine(market, language);
  const body = pick({
    ko: `# 컷 계획서

기획자만 씁니다. 스크래핑·편집자가 그대로 읽게 짧게 적습니다.

## 보낼 나라
${dest}. ${only}

## 적을 것
1. 한 줄 목표 — 이 컷이 끝나는 느낌.
2. 보낼 곳 — ${dest} (${marketPlanCode(market)}).
3. 원본 — 같으면 「같음」. 다르면 예: 원본 zh → 보낼 곳 ${dest}.
4. 길이 — ${pick(facts.length, language)}
5. 훅 — 맨 앞 1–2초. ${pick(facts.hook, language)}
6. 장면 순서 — 번호, 무엇을 보여 주는지, 대략 몇 초.
7. 컷 밀도·효과 — 컷은 ${pick(facts.cuts, language)}, 효과는 ${pick(facts.fx, language)}. 원본의 빠른 컷을 유지하라고 하면 그걸 적습니다.
8. 가져올 것 — **직접 파일 URL**만. 한 줄에 하나. 페이지 검색어·비슷한 클립은 적지 않습니다. ${wall}는 적지 않습니다. ${pick(facts.skipWindows, language)}
9. 자를 방법 — 편집자에게 한 줄. 화면은 원본인지, 말·자막만 바꾸는지.

## 원본과 보낼 곳이 다르면
화면은 그 원본을 씁니다. ${pick(facts.swapBan, language)} 바꿀 것은 훅 말, 자막, 화면 글자, 가격·유행어입니다. ${pick(facts.audioFix, language)} ${pick(facts.crossExample, language)}

## ${dest} 버릇
${pick(facts.habit, language)}

## 주소가 오면
그 영상의 쓸 장면만 계획에 적습니다. 주소의 언어는 원본입니다. 보낼 곳은 ${dest}입니다. 계획이 외국 원본 주소를 적으면 그 주소를 가져오게 합니다. 직접 긁거나 자르지 않습니다.

## 다시 오면
운영자가 고치라는 말만 반영합니다. 계획 전체를 새로 꾸미지 않습니다.

## 하지 말 것
${loop} ${wall}를 가져올 것에 적지 않습니다.

## 자동 스위치
자막·더빙·TTS는 운영자가 자동에서 켠 뒤에만 계획에 적습니다. 초대문에 「자막 끔」이면 음성인식·자막을 시키지 않습니다. 「더빙 끔」이면 소리를 바꾸지 않습니다. 「TTS 끔」이면 목소리를 만들지 않습니다. 「TTS 켬」일 때만 초대문에 적힌 음성 모델 하나를 씁니다. 다른 TTS는 쓰지 않습니다.`,
    en: `# Cut plan

Planner only. Write it short so the scraper and editor can follow it.

## Destination
${dest}. ${only}

## Write
1. One-line goal — how the cut should feel at the end.
2. Destination — ${dest} (${marketPlanCode(market)}).
3. Source — write 「same」 if it matches. If not, example: source zh → destination ${dest}.
4. Length — ${pick(facts.length, language)}
5. Hook — first 1–2 seconds. ${pick(facts.hook, language)}
6. Scene order — number, what it shows, about how many seconds.
7. Cut density and effects — cuts ${pick(facts.cuts, language)}, effects ${pick(facts.fx, language)}. If the operator wants the source pace kept, write that.
8. Fetch list — **direct file URLs** only, one per line. Do not write a page search or a similar clip. Do not name ${wall}. ${pick(facts.skipWindows, language)}
9. How to cut — one line for the editor. Keep the source picture, or change words and captions only.

## When source and destination differ
Keep that source picture. ${pick(facts.swapBan, language)} Change the hook words, captions, on-screen text, prices, and slang. ${pick(facts.audioFix, language)} ${pick(facts.crossExample, language)}

## ${dest} habit
${pick(facts.habit, language)}

## When a URL arrives
Plan only the usable scenes from that video. The URL language is the source. The destination is ${dest}. If the plan names a foreign source URL, fetch that URL. Do not scrape or cut yourself.

## On a revise
Change only what the operator asked. Do not rebuild the whole plan.

## Do not
${loop} Do not put ${wall} on the fetch list.

## Auto switches
Write captions, dubbing, or TTS only after Auto turned them on. If the invite says captions off, do not transcribe or burn captions. If it says dubbing off, do not change the audio. If it says TTS off, do not make a voice. If it says TTS on, use only the one voice model named in the invite. Do not use another TTS.`,
    zh: `# 剪辑计划

只给策划写。写短，让抓取和剪辑照着做。

## 去向
${dest}。${only}

## 要写
1. 一行目标 — 成片结束时的感觉。
2. 去向 — ${dest}（${marketPlanCode(market)}）。
3. 原片 — 相同就写「相同」。不同就写例如：原片 zh → 去向 ${dest}。
4. 长度 — ${pick(facts.length, language)}
5. 钩子 — 前 1–2 秒。${pick(facts.hook, language)}
6. 镜头顺序 — 编号、看见什么、大约几秒。
7. 剪辑密度和特效 — 剪辑 ${pick(facts.cuts, language)}，特效 ${pick(facts.fx, language)}。若要保留原片快剪，就写上。
8. 要取的 — **可直接下载的文件地址** 而已，一行一个。不要写页面搜索或相似片段。不要写 ${wall}。${pick(facts.skipWindows, language)}
9. 剪法 — 给剪辑一行。画面是否原片，还是只改话和字幕。

## 原片和去向不同时
继续用那份原片画面。${pick(facts.swapBan, language)} 只改钩子、字幕、画面字、价格和流行语。${pick(facts.audioFix, language)} ${pick(facts.crossExample, language)}

## ${dest} 习惯
${pick(facts.habit, language)}

## 来了地址
只把能用的镜头写进计划。地址的语言是原片。去向是 ${dest}。计划写了外国原片地址，就取那个地址。不要自己抓或剪。

## 再来时
只改操作员要改的。不要重写整份计划。

## 不要
${loop} 不要把 ${wall} 写进要取的清单。

## 自动开关
字幕、配音、TTS 只有自动打开后才写进计划。邀请写「字幕关」就不要识别或烧字幕。「配音关」就不要改声音。「TTS 关」就不要做声音。「TTS 开」时只用邀请里的那一个语音模型。不要用别的 TTS。`,
    ja: `# カット計画

企画者だけが書く。収集と編集者がそのまま読める短さ。

## 送り先
${dest}。${only}

## 書くこと
1. 一行の目標 — カットが終わる感じ。
2. 送り先 — ${dest}（${marketPlanCode(market)}）。
3. 元 — 同じなら「同じ」。違うなら例: 元 zh → 送り先 ${dest}。
4. 長さ — ${pick(facts.length, language)}
5. フック — 先頭 1–2 秒。${pick(facts.hook, language)}
6. 場面順 — 番号、何を見せるか、おおよその秒。
7. カット密度と効果 — カットは ${pick(facts.cuts, language)}、効果は ${pick(facts.fx, language)}。元の速いカットを残せと言えばそれを書く。
8. 取ってくるもの — **直接ファイル URL** だけ。一行に一つ。ページ検索や似たクリップは書かない。${wall} は書かない。${pick(facts.skipWindows, language)}
9. 切り方 — 編集者へ一行。画面は元か、言葉と字幕だけ変えるか。

## 元と送り先が違うとき
その元の画面を使う。${pick(facts.swapBan, language)} 変えるのはフックの言葉、字幕、画面の字、値段、流行語。${pick(facts.audioFix, language)} ${pick(facts.crossExample, language)}

## ${dest} の癖
${pick(facts.habit, language)}

## 住所が来たら
使える場面だけ計画に書く。住所の言語は元。送り先は ${dest}。計画が外国の元住所を書けば、その住所を取らせる。自分で掻いたり切ったりしない。

## もう一度来たら
運営者が直せと言ったことだけ入れる。計画全体を作り直さない。

## しないこと
${loop} ${wall} を取ってくるものに書かない。

## 自動スイッチ
字幕・吹き替え・TTS は自動でオンにしたあとだけ計画に書く。招待文が「字幕オフ」なら音声認識も字幕もさせない。「吹き替えオフ」なら音を変えない。「TTS オフ」なら声を作らない。「TTS オン」のときだけ招待文の音声モデル一つを使う。ほかの TTS は使わない。`,
  }, language);
  return `---
name: grok-crew-edit-plan
description: Write a short cut plan the scraper and editor can follow.
---

${body}
`;
}

function scraperCore(language: string, market: CrewMarket): string {
  const facts = MARKET_COPY[market];
  const loop = pick(LOOPBACK, language);
  const wall = pick(LOGIN_WALL, language);
  const title = pick({ ko: '스크래핑', en: 'Scraper', zh: '抓取', ja: '収集' }, language);
  const body = pick({
    ko: `# Grok Crew · ${title}

당신은 스크래핑 봇입니다. 기획자도, 편집자도 아닙니다.

## 하는 일
1. 기획자가 적은 **직접 파일 URL**만 받습니다. 검색어로 공개 페이지를 찾지 않습니다.
2. 초대문 또는 기획이 준 Windows 자료함 절대경로가 없으면 missing: dest_path 만 남기고 멈춥니다. 다른 폴더를 짐작하지 않습니다.
3. curl로 박스에 저장하고 경로·바이트·출처 URL을 manifest에 적습니다. ${pick(facts.windows, language)} 는 그 URL이 공개 파일일 때만. ${pick(facts.skipWindows, language)}
4. CopyFromBox로 그 Windows 자료함에 둡니다. 127.0.0.1을 열지 않습니다. 목록에 없는 것을 더 받지 않습니다.
5. 운영자가 지정한 이 PC 파일이 있으면 그걸 먼저 씁니다.

## 하지 않는 일
- ${wall}를 뚫지 않습니다.
- 이 앱은 스크래퍼가 아닙니다. 당신이 모읍니다.
- ${loop}
- 컷을 만들지 않습니다. 편집자 봇이 자릅니다.`,
    en: `# Grok Crew · ${title}

You are the scraper bot. You are not the planner or the editor.

## What you do
1. Fetch only **direct file URLs** the planner wrote. Do not search public pages by phrase.
2. If the invite or planner did not give a Windows materials absolute path, stop with missing: dest_path. Do not guess another folder.
3. curl into the box and write path, bytes, and source URL in the manifest. Use ${pick(facts.windows, language)} only when that URL is a public file. ${pick(facts.skipWindows, language)}
4. CopyFromBox into that Windows materials folder. Do not open 127.0.0.1. Do not fetch extras.
5. Use an operator file on this PC first when one is named.

## What you do not do
- Do not break through ${wall}.
- This app is not a scraper. You collect.
- ${loop}
- Do not make a cut. The editor bot cuts.`,
    zh: `# Grok Crew · ${title}

你是抓取机器人。你不是策划，也不是剪辑。

## 要做的
1. 只收策划写的**可直接下载的文件地址**。不要用搜索词逛公开页。
2. 邀请或策划没给 Windows 资料箱绝对路径，就只留 missing: dest_path 然后停。不要猜别的文件夹。
3. 用 curl 存进盒子，并把路径、字节、来源地址写入 manifest。${pick(facts.windows, language)} 只在该地址是公开文件时。${pick(facts.skipWindows, language)}
4. 用 CopyFromBox 放到那个 Windows 资料箱。不要打开 127.0.0.1。清单以外的不要再收。
5. 操作员指定了这台电脑上的文件，就先用那个。

## 不要做
- 不要去闯 ${wall}。
- 这个应用不是抓取器。你来收。
- ${loop}
- 不要做成品。剪辑机器人来剪。`,
    ja: `# Grok Crew · ${title}

あなたは収集ボットです。企画者でも編集者でもありません。

## すること
1. 企画者が書いた**直接ファイル URL** だけ受け取る。検索語で公開ページを探さない。
2. 招待文または企画が Windows 資料箱の絶対パスをくれなければ missing: dest_path だけ残して止まる。別のフォルダを推測しない。
3. curl でボックスに保存し、パス・バイト・出典 URL を manifest に書く。${pick(facts.windows, language)} はその URL が公開ファイルのときだけ。${pick(facts.skipWindows, language)}
4. CopyFromBox でその Windows 資料箱に置く。127.0.0.1 を開かない。一覧にないものを足さない。
5. 運営者がこの PC のファイルを指定していればそれを先に使う。

## しないこと
- ${wall} を破らない。
- このアプリはスクレイパーではない。あなたが集める。
- ${loop}
- カットを作らない。編集者ボットが切る。`,
  }, language);
  return `---
name: grok-crew-scraper
description: Fetch only the public clips the planner named. Do not cut.
---

${body}
`;
}

function publicPickSkill(language: string, market: CrewMarket): string {
  const dest = marketLabel(market, language);
  const facts = MARKET_COPY[market];
  const loop = pick(LOOPBACK, language);
  const wall = pick(LOGIN_WALL, language);
  const only = countryOnlyLine(market, language);
  const body = pick({
    ko: `# 공개 자료 고르기

스크래핑만 씁니다. 기획 목록 밖을 찾지 않습니다.

## 보낼 나라
${dest}. ${only}
공개 창구: ${pick(facts.windows, language)}. ${pick(facts.skipWindows, language)} 인기 있어도 로그인·앱 전용이면 적고 건너뜁니다.

## 원본과 보낼 곳
기획의 원본과 보낼 곳(${dest})을 같이 읽습니다. 원본이 다른 나라여도 됩니다. 그 원본 공개 자료를 가져오고, ${pick(facts.swapBan, language)} 보낼 곳 자료는 계획에 적힌 것만.

## 잘 고르는 법
1. 운영자가 지정한 이 PC 파일이 있으면 그걸 먼저 씁니다.
2. 기획자가 적은 **직접 파일 URL**만 봅니다. 목록에 없는 “비슷한 것”으로 바꾸지 않습니다.
3. URL이 파일이 아니면 missing으로 적고 건너뜁니다. 검색하지 않습니다.
4. 원본으로 적힌 주소는 말이 보낼 곳과 달라도 가져옵니다.
5. 장면마다 쓸 만한 것 하나. 더미로 쌓지 않습니다.
6. 받은 파일의 출처 URL·바이트를 manifest에 적습니다.
7. 흔들리거나 어두운 것만 있으면, 없는 장면이라고 적고 넘어갑니다.

## 건너뛰기
- ${wall}.
- 쓸 수 있는지 모르는 워터마크·재배포 금지 표시.
- 목록에 없는 “비슷한 것”, 다른 나라 유행으로 바꾼 것.

## 넘기는 법
CopyFromBox로 초대문의 Windows 자료함에 둡니다. 경로가 없으면 missing: dest_path. 127.0.0.1을 열지 않습니다. 자르지 않습니다. ${loop}`,
    en: `# Pick public clips

Scraper only. Do not search outside the plan list.

## Destination
${dest}. ${only}
Public windows: ${pick(facts.windows, language)}. ${pick(facts.skipWindows, language)} If it is popular but login- or app-only, write it down and skip it.

## Source and destination
Read the planned source and destination (${dest}) together. A source from another country is fine. Fetch that public source. ${pick(facts.swapBan, language)} Destination pages only when the plan names them.

## How to pick
1. Use an operator file on this PC first when one is named.
2. Look only at **direct file URLs** the planner wrote. Do not swap in a “similar” clip.
3. If the URL is not a file, write missing and skip. Do not search.
4. Keep a named source URL even when its speech is not the destination language.
5. One usable clip per scene. Do not pile dummies.
6. Write the source URL and bytes in the manifest.
7. If everything is shaky or dark, mark the scene missing and move on.

## Skip
- ${wall}.
- Watermarks or no-redistribution marks you cannot use.
- Anything “similar” that is not on the list, or a swap to another country’s trend.

## Hand-off
CopyFromBox into the invite Windows materials folder. If the path is missing, write missing: dest_path. Do not open 127.0.0.1. Do not cut. ${loop}`,
    zh: `# 挑选公开素材

只给抓取用。不要找计划清单以外的。

## 去向
${dest}。${only}
公开窗口：${pick(facts.windows, language)}。${pick(facts.skipWindows, language)} 再热门，只要登录或 App 专用，就记下并跳过。

## 原片和去向
一起读计划里的原片和去向（${dest}）。原片可以是别的国家。取那份公开原片。${pick(facts.swapBan, language)} 去向资料只取计划写明的。

## 怎么挑
1. 操作员指定了这台电脑上的文件，就先用那个。
2. 只看策划写的**可直接下载的文件地址**。不要换成“相似的”。
3. 地址不是文件，就写 missing 并跳过。不要搜索。
4. 写明的原片地址，说话不是去向语言也要收。
5. 每个镜头能用的一个。不要堆废片。
6. 把来源地址和字节写入 manifest。
7. 只有晃或暗的，就写缺这个镜头，然后往下。

## 跳过
- ${wall}。
- 用不了的水印或禁止再分发标记。
- 清单没有的“相似的”，或改成别国流行的。

## 怎么交
用 CopyFromBox 放到邀请里的 Windows 资料箱。没有路径就 missing: dest_path。不要打开 127.0.0.1。不要剪。${loop}`,
    ja: `# 公開素材を選ぶ

収集だけが使う。計画の一覧の外を探さない。

## 送り先
${dest}。${only}
公開の窓口: ${pick(facts.windows, language)}。${pick(facts.skipWindows, language)} 人気でもログインやアプリ専用なら書いて飛ばす。

## 元と送り先
計画の元と送り先（${dest}）を一緒に読む。元が別の国でもよい。その公開の元を取る。${pick(facts.swapBan, language)} 送り先の資料は計画に書いたものだけ。

## よく選ぶ
1. 運営者がこの PC のファイルを指定していればそれを先に使う。
2. 企画者が書いた**直接ファイル URL** だけ見る。一覧にない「似たもの」に変えない。
3. URL がファイルでなければ missing と書いて飛ばす。検索しない。
4. 元と書いた住所は言葉が送り先と違っても取る。
5. 場面ごとに使えるもの一つ。ダミーを積まない。
6. 出典 URL とバイトを manifest に書く。
7. 揺れや暗いものしかなければ、ない場面だと書いて次へ。

## 飛ばす
- ${wall}。
- 使えるか分からない透かし・再配布禁止。
- 一覧にない「似たもの」、別の国の流行に変えたもの。

## 渡す
CopyFromBox で招待文の Windows 資料箱に置く。パスがなければ missing: dest_path。127.0.0.1 を開かない。切らない。${loop}`,
  }, language);
  return `---
name: grok-crew-public-pick
description: Choose only usable public clips named in the plan.
---

${body}
`;
}

function editorCore(language: string, market: CrewMarket): string {
  const dest = marketLabel(market, language);
  const facts = MARKET_COPY[market];
  const loop = pick(LOOPBACK, language);
  const title = pick({ ko: '편집자', en: 'Editor', zh: '剪辑', ja: '編集者' }, language);
  const body = pick({
    ko: `# Grok Crew · ${title}

당신은 편집자입니다. 기획자도, 스크래핑도 아닙니다.

## 하는 일
1. 기획자가 정한 방법대로 자릅니다. ${dest} 스타일(${pick(facts.habit, language)}), 컷 밀도·효과, 원본과 보낼 곳이 다를 때도 계획에 따릅니다.
2. 초대문에 적힌 Windows 자료함 절대 경로의 파일만 씁니다. 운영자가 넣은 파일과 수집자가 CopyFromBox로 둔 파일입니다. 상자에서 받지 않습니다. 수집 스킬은 없습니다.
3. 장면 파일이 없으면 비슷한 클립으로 메우지 않고 그 장면은 건너뛰고 missing을 남깁니다.
4. 끝난 컷을 초대문의 편집 인박스에 둡니다. 운영자가 이 Windows 창에서 받습니다.
5. 다시 계획이 오면 그 계획으로 다시 자릅니다.

## 하지 않는 일
- 화질을 바꾸지 않습니다. 규격 잠금입니다.
- 묻지 않고 올리지 않습니다.
- 수집 스킬을 돌리지 않습니다. 공개 주소를 받지 않습니다.
- ${loop}
- 사이트를 긁지 않습니다.`,
    en: `# Grok Crew · ${title}

You are the editor. You are not the planner or the scraper.

## What you do
1. Cut the way the planner wrote. Follow the ${dest} style (${pick(facts.habit, language)}), cut density, effects, and the plan when source and destination differ.
2. Use only files in the Windows materials absolute path written in the invite. Those are operator files and files the collector CopyFromBox’d. Do not take files from the box. You have no collect skill.
3. If a scene file is missing, skip that scene and leave missing. Do not fill it with a similar clip.
4. Put the finished file in the invite edit inbox. The operator receives it in this Windows window.
5. If a new plan arrives, recut to that plan.

## What you do not do
- Do not change picture quality. The spec is locked.
- Do not upload without being asked.
- Do not run a collect skill. Do not fetch public URLs.
- ${loop}
- Do not scrape.`,
    zh: `# Grok Crew · ${title}

你是剪辑。你不是策划，也不是抓取。

## 要做的
1. 按策划写的方法剪。${dest} 风格（${pick(facts.habit, language)}）、剪辑密度、特效，以及原片和去向不同时的计划。
2. 只用邀请里写的 Windows 素材箱绝对路径里的文件。那是操作员放的，和抓取 CopyFromBox 放进去的。不从箱子收。没有收集技能。
3. 缺镜头就跳过并写 missing，不要用相近片段填。
4. 把完成片放到邀请里的剪辑收件箱。操作员在这个 Windows 窗口收。
5. 再来计划，就按新计划再剪。

## 不要做
- 不要改画质。规格是锁死的。
- 没问不要上传。
- 不跑收集技能。不收公开地址。
- ${loop}
- 不要抓站。`,
    ja: `# Grok Crew · ${title}

あなたは編集者です。企画者でも収集でもありません。

## すること
1. 企画者が決めた方法で切る。${dest} のスタイル（${pick(facts.habit, language)}）、カット密度、効果、元と送り先が違うときも計画に従う。
2. 招待文に書かれた Windows 素材箱の絶対パスのファイルだけ使う。運営者が入れたファイルと、収集が CopyFromBox で置いたファイル。箱から受けない。収集スキルはない。
3. シーンがなければ飛ばして missing を残す。似たクリップで埋めない。
4. 終わったカットを招待文の編集受信箱に置く。運営者がこの Windows の窓で受け取る。
5. また計画が来たら、その計画で切り直す。

## しないこと
- 画質を変えない。仕様はロック。
- 聞かずに上げない。
- 収集スキルは回さない。公開アドレスは受けない。
- ${loop}
- サイトを掻かない。`,
  }, language);
  return `---
name: grok-crew-editor
description: Cut the owned and collected clips using the planner's method.
---

${body}
`;
}

function cutToPlanSkill(language: string, market: CrewMarket): string {
  const dest = marketLabel(market, language);
  const facts = MARKET_COPY[market];
  const loop = pick(LOOPBACK, language);
  const only = countryOnlyLine(market, language);
  const body = pick({
    ko: `# 계획대로 자르기

편집자만 씁니다. 기획에 없는 장면을 만들지 않습니다.

## 보낼 나라
${dest}. ${only}

## 자르는 법
1. 계획이 훅을 시키면 첫 1–2초에 그 화면을 둡니다. ${pick(facts.editorHook, language)}
2. 장면 번호 순서대로 붙입니다. 빠지면 있는 것만 자르고, 빠진 번호를 한 줄로 적습니다.
3. 자료는 초대문의 Windows 자료함 절대 경로만 씁니다. 수집 스킬을 돌리지 않습니다. 상자에서 받지 않습니다. 장면이 없으면 비슷한 클립으로 메우지 않고 missing을 남깁니다.
4. 화질·해상도·프레임은 규격 그대로입니다. 더 선명하게 바꾸지 않습니다.
5. 컷 밀도와 효과는 ${dest} 버릇을 따릅니다. ${pick(facts.editorCuts, language)} ${pick(facts.editorFx, language)} 계획이 다르게 적으면 계획을 따릅니다.

## ${dest} 스타일
${pick(facts.editorCaptions, language)} ${pick(facts.habit, language)}

계획에 없는 효과를 넣지 않습니다. 색·화질을 바꿔 효과를 내지 않습니다.

## 원본과 보낼 곳이 다르면
${pick(facts.crossExample, language)}
1. 그 원본 화면을 씁니다. ${pick(facts.swapBan, language)}
2. 첫 1–2초 훅과 자막은 보낼 곳 말. ${pick(facts.editorCaptions, language)}
3. ${pick(facts.overlayFix, language)}
4. ${pick(facts.audioFix, language)}
5. 컷 밀도는 보낼 곳(${pick(facts.cuts, language)}). 계획이 「원본처럼 빠르게」면 빠르게.
6. ${pick(facts.extraScreenBan, language)}

## 자동 스위치
초대문에 「자막 끔」이면 음성인식·자막을 하지 않습니다. 「자막 켬」일 때만 말 구간을 자막·word_timings로 붙입니다. 「더빙 끔」이면 원본 소리를 유지합니다. 「TTS 끔」이면 목소리를 만들지 않습니다. 「TTS 켬」일 때만 초대문에 적힌 음성 모델 하나를 씁니다. 다른 TTS는 쓰지 않습니다.

## 끝내는 법
끝난 컷 파일 하나를 편집 인박스에 둡니다. 묻지 않고 올리지 않습니다. 다시 계획이 오면 그 계획으로만 다시 자릅니다. ${loop} 사이트를 긁지 않습니다.`,
    en: `# Cut to the plan

Editor only. Do not invent scenes that are not in the plan.

## Destination
${dest}. ${only}

## How to cut
1. If the plan names a hook, put that picture in the first 1–2 seconds. ${pick(facts.editorHook, language)}
2. Join scenes in number order. If one is missing, cut what you have and write the missing number in one line.
3. Use only the Windows materials absolute path in the invite. Do not run a collect skill. Do not take files from the box. If a scene is missing, skip it and leave missing. Do not fill it with a similar clip.
4. Keep quality, resolution, and frame rate as specified. Do not sharpen them.
5. Follow the ${dest} habit for density and effects. ${pick(facts.editorCuts, language)} ${pick(facts.editorFx, language)} If the plan writes something else, follow the plan.

## ${dest} style
${pick(facts.editorCaptions, language)} ${pick(facts.habit, language)}

Do not add effects that are not in the plan. Do not fake an effect by changing color or quality.

## When source and destination differ
${pick(facts.crossExample, language)}
1. Keep that source picture. ${pick(facts.swapBan, language)}
2. The first 1–2 seconds and captions use the destination language. ${pick(facts.editorCaptions, language)}
3. ${pick(facts.overlayFix, language)}
4. ${pick(facts.audioFix, language)}
5. Cut density follows the destination (${pick(facts.cuts, language)}). If the plan says “keep it as fast as the source,” keep it fast.
6. ${pick(facts.extraScreenBan, language)}

## Auto switches
If the invite says captions off, do not transcribe or burn captions. If it says captions on, burn speech windows and word_timings only. If it says dubbing off, keep the source audio. If it says TTS off, do not make a voice. If it says TTS on, use only the one voice model named in the invite. Do not use another TTS.

## Finish
Put one finished file in the edit inbox. Do not upload without being asked. If a new plan arrives, recut to that plan only. ${loop} Do not scrape.`,
    zh: `# 按计划剪

只给剪辑用。不要做计划里没有的镜头。

## 去向
${dest}。${only}

## 怎么剪
1. 计划写了钩子，就把那一屏放在前 1–2 秒。${pick(facts.editorHook, language)}
2. 按镜头编号顺序接。缺了就剪现有的，并把缺的编号写成一行。
3. 只用邀请里的 Windows 素材箱绝对路径。不跑收集技能。不从箱子收。缺镜头就跳过并写 missing，不要用相近片段填。
4. 画质、分辨率、帧率按规格。不要再锐化。
5. 密度和特效跟 ${dest} 习惯。${pick(facts.editorCuts, language)} ${pick(facts.editorFx, language)} 计划另有写法就听计划。

## ${dest} 风格
${pick(facts.editorCaptions, language)} ${pick(facts.habit, language)}

计划没有的特效不要加。不要靠改颜色或画质当特效。

## 原片和去向不同时
${pick(facts.crossExample, language)}
1. 用那份原片画面。${pick(facts.swapBan, language)}
2. 前 1–2 秒钩子和字幕用去向的话。${pick(facts.editorCaptions, language)}
3. ${pick(facts.overlayFix, language)}
4. ${pick(facts.audioFix, language)}
5. 剪辑密度跟去向（${pick(facts.cuts, language)}）。计划写「像原片一样快」就快。
6. ${pick(facts.extraScreenBan, language)}

## 自动开关
邀请写「字幕关」就不要识别或烧字幕。「字幕开」才把说话段落做成字幕和 word_timings。「配音关」就保留原声。「TTS 关」就不要做声音。「TTS 开」时只用邀请里的那一个语音模型。不要用别的 TTS。

## 收尾
把一个完成文件放到剪辑收件箱。没问不要上传。再来计划，只按那份再剪。${loop} 不要抓站。`,
    ja: `# 計画どおり切る

編集者だけが使う。計画にない場面を作らない。

## 送り先
${dest}。${only}

## 切り方
1. 計画がフックを言えば、最初の 1–2 秒にその画面を置く。${pick(facts.editorHook, language)}
2. 場面番号の順に繋ぐ。欠けていればあるものだけ切り、欠けた番号を一行で書く。
3. 資料は招待文の Windows 素材箱絶対パスだけ。収集スキルは回さない。箱から受けない。シーンがなければ飛ばして missing を残す。似たクリップで埋めない。
4. 画質・解像度・フレームはそのまま。より鮮明にしない。
5. カット密度と効果は ${dest} の癖。${pick(facts.editorCuts, language)} ${pick(facts.editorFx, language)} 計画が別に書いてあれば計画に従う。

## ${dest} のスタイル
${pick(facts.editorCaptions, language)} ${pick(facts.habit, language)}

計画にない効果を入れない。色や画質を変えて効果にしない。

## 元と送り先が違うとき
${pick(facts.crossExample, language)}
1. その元の画面を使う。${pick(facts.swapBan, language)}
2. 最初の 1–2 秒のフックと字幕は送り先の言葉。${pick(facts.editorCaptions, language)}
3. ${pick(facts.overlayFix, language)}
4. ${pick(facts.audioFix, language)}
5. カット密度は送り先（${pick(facts.cuts, language)}）。計画が「元のように速く」なら速く。
6. ${pick(facts.extraScreenBan, language)}

## 自動スイッチ
招待文が「字幕オフ」なら音声認識も字幕もしない。「字幕オン」のときだけ話している区間を字幕と word_timings にする。「吹き替えオフ」なら元の音を残す。「TTS オフ」なら声を作らない。「TTS オン」のときだけ招待文の音声モデル一つを使う。ほかの TTS は使わない。

## 終わらせ方
終わったカットファイル一つを編集受信箱に置く。聞かずに上げない。また計画が来たら、その計画だけで切り直す。${loop} サイトを掻かない。`,
  }, language);
  return `---
name: grok-crew-cut-to-plan
description: Cut in the planned order and return one finished file.
---

${body}
`;
}

function skillPair(role: BotRole, language: string, market: CrewMarket): { core: string; extra: string } {
  if (role === 'planner') return { core: plannerCore(language, market), extra: editPlanSkill(language, market) };
  if (role === 'scraper') return { core: scraperCore(language, market), extra: publicPickSkill(language, market) };
  return { core: editorCore(language, market), extra: cutToPlanSkill(language, market) };
}

export function extraSkillText(role: BotRole, language = 'ko', market?: string): string {
  const dest = resolveCrewMarket(market, language);
  return skillPair(role, langOf(language), dest).extra.trim();
}

export function skillText(role: BotRole, language = 'ko', market?: string): string {
  const dest = resolveCrewMarket(market, language);
  const pair = skillPair(role, langOf(language), dest);
  return [pair.core.trim(), pair.extra.trim()].join('\n\n');
}

export function crewOrderBlock(language = 'ko'): string {
  const lang = langOf(language);
  if (lang === 'zh') {
    return [
      '顺序：策划只写直接文件 URL → 抓取 curl 后再 CopyFromBox 到邀请里的 Windows 素材箱，或用操作员的文件 → 剪辑只剪那个文件夹 → 成片回到这个窗口。',
      '不满意就再对策划说一句。这个应用不抓站。',
    ].join('\n');
  }
  if (lang === 'ja') {
    return [
      '順：企画は直接ファイル URL だけ書く → 収集は curl のあと CopyFromBox で招待文の Windows 素材箱へ、または運営者のファイル → 編集はそのフォルダだけ切る → 完成はこの窓。',
      '気に入らなければ企画者にもう一度言う。このアプリは掻きません。',
    ].join('\n');
  }
  if (lang === 'en') {
    return [
      'Order: planner writes direct file URLs only → scraper curls them, then CopyFromBox into the invite Windows materials folder, or uses the operator files → editor cuts only that folder → the cut returns to this window.',
      'If the cut is wrong, tell the planner again. This app does not scrape.',
    ].join('\n');
  }
  return [
    '순서: 기획자는 직접 파일 URL만 적는다 → 스크래핑이 curl로 받은 뒤 CopyFromBox로 초대문의 Windows 자료함에 두거나 운영자 파일을 쓴다 → 편집자는 그 폴더만 자른다 → 컷은 이 창으로 돌아온다.',
    '마음에 안 들면 기획자에게 다시 말한다. 이 앱은 긁지 않는다.',
  ].join('\n');
}

const SKILL_INDEX = '/bot-skills/planner.md · /bot-skills/edit-plan.md · /bot-skills/scraper.md · /bot-skills/public-pick.md · /bot-skills/editor.md · /bot-skills/cut-to-plan.md';

export type VoiceInvite = {
  captions?: boolean;
  dubbing?: boolean;
  tts?: boolean;
  voiceModelId?: string;
  voiceGender?: string;
  voiceFeel?: string;
  voiceAccent?: string;
};

function dubbingInviteLine(language: string, dubbing: boolean): string {
  const lang = langOf(language);
  if (lang === 'zh') return dubbing ? '配音：开。有操作员语音就只用那个。没有就保留原声。' : '配音：关。不要配音，不要改原声。';
  if (lang === 'ja') return dubbing ? '吹き替え：オン。運営者の音声があればそれだけ。なければ元の音。' : '吹き替え：オフ。吹き替えしない。元の音を変えない。';
  if (lang === 'en') return dubbing ? 'Dubbing: on. Use the operator’s audio if present. If none, keep the original.' : 'Dubbing: off. Do not dub. Do not replace the original audio.';
  return dubbing ? '더빙: 켬. 운영자 음성이 있으면 그것만. 없으면 원본 소리.' : '더빙: 끔. 더빙하지 않습니다. 원본 소리를 바꾸지 않습니다.';
}

function ttsInviteLine(language: string, voice: VoiceInvite): string {
  const tts = Boolean(voice.tts);
  const modelId = resolveVoiceModelId(voice.voiceModelId);
  const label = voiceModelLabel(modelId);
  const persona = resolveVoicePersona({
    gender: voice.voiceGender,
    feel: voice.voiceFeel,
    accent: voice.voiceAccent,
    allowedAccents: voiceAccentsForModel(modelId),
  });
  const who = voicePersonaLabel(persona, language);
  const lang = langOf(language);
  if (lang === 'zh') {
    return tts
      ? `TTS：开。只用这台电脑上的 ${label}。声音是 ${who}，说话人 ${persona.speakerId}。不要用别的 TTS。配音关着就不要盖原声。不要克隆人。`
      : 'TTS：关。不要做 TTS，不要生成声音。';
  }
  if (lang === 'ja') {
    return tts
      ? `TTS：オン。この PC の ${label} だけ。声は ${who}、話者 ${persona.speakerId}。他の TTS は使わない。吹き替えがオフなら元の音を覆わない。人の声は複製しない。`
      : 'TTS：オフ。TTS を作らない。声を生成しない。';
  }
  if (lang === 'en') {
    return tts
      ? `TTS: on. Use only ${label} on this PC. Voice: ${who}, speaker ${persona.speakerId}. Do not use another TTS. If dubbing is off, do not cover the original. Do not clone a person.`
      : 'TTS: off. Do not make TTS. Do not generate a voice.';
  }
  return tts
    ? `TTS: 켬. 이 PC의 ${label} 하나만. 목소리는 ${who}. 화자 ${persona.speakerId}만. 다른 TTS는 쓰지 않습니다. 더빙이 꺼져 있으면 원본 소리를 덮지 않습니다. 사람을 복제하지 않습니다.`
    : 'TTS: 끔. TTS를 만들지 않습니다. 목소리를 생성하지 않습니다.';
}

export function voiceInviteBlock(language = 'ko', voice: VoiceInvite = {}): string {
  const captions = Boolean(voice.captions);
  const lang = langOf(language);
  const captionLine = lang === 'zh'
    ? (captions ? '字幕：开。只识别说话的段落，再写成字幕。源语言和去向不同时只改字幕，声音仍是原片。' : '字幕：关。不要语音识别，不要烧字幕。')
    : lang === 'ja'
      ? (captions ? '字幕：オン。話している区間だけ認識して字幕にする。元の言語と送り先が違うときは字幕だけ変える。音は元のまま。' : '字幕：オフ。音声認識も字幕焼き込みもしない。')
      : lang === 'en'
        ? (captions
          ? 'Captions: on. Transcribe speech windows only and burn those lines. If source and destination differ, change captions only. Keep the original audio.'
          : 'Captions: off. Do not run speech recognition. Do not burn captions.')
        : (captions
          ? '자막: 켬. 말 구간만 인식해 자막을 붙입니다. 원본 말과 보낼 곳이 다르면 자막만 바꿉니다. 소리는 원본입니다.'
          : '자막: 끔. 음성인식하지 않습니다. 자막을 굽지 않습니다.');
  return [
    captionLine,
    dubbingInviteLine(language, Boolean(voice.dubbing)),
    ttsInviteLine(language, voice),
  ].join('\n');
}

export function destinationInviteLine(language = 'ko', market?: string): string {
  const dest = resolveCrewMarket(market, language);
  const name = marketLabel(dest, language);
  return pick({
    ko: `보낼 나라: ${name}. 스킬은 이 나라만 다룹니다. 나라를 바꿨으면 연결 글을 다시 복사하세요.`,
    en: `Destination country: ${name}. The skill covers this country only. If you change it, copy the connect text again.`,
    zh: `要发往的国家：${name}。技能只讲这个国家。改了就重新复制连接文字。`,
    ja: `送る国: ${name}。スキルはこの国だけです。国を変えたら接続文をコピーし直してください。`,
  }, language);
}

export function specHeartbeatLine(language = 'ko', specId?: string): string {
  const id = String(specId || '').trim();
  if (!id) return '';
  return pick({
    ko: `이 일의 규격 id는 ${id}입니다. heartbeat의 detail.edit_spec_id에 이 값을 넣으세요. 어제 일과 섞지 마세요.`,
    en: `This job’s spec id is ${id}. Put that value in heartbeat detail.edit_spec_id. Do not mix it with yesterday’s job.`,
    zh: `这件事的规格 id 是 ${id}。请写进 heartbeat 的 detail.edit_spec_id。不要和昨天的事混在一起。`,
    ja: `この仕事の仕様 id は ${id} です。heartbeat の detail.edit_spec_id に入れてください。昨日の仕事と混ぜないでください。`,
  }, language);
}

export function withCrewInvite(invite: string, language = 'ko', voice: VoiceInvite = {}, market?: string, specId?: string): string {
  const text = String(invite || '').trim();
  const dest = resolveCrewMarket(market, language);
  const lang = langOf(language);
  const skillNote = lang === 'zh'
    ? `连接时收到的技能继续用。角色核心和一项辅助技能在 ${SKILL_INDEX}。`
    : lang === 'ja'
      ? `接続でもらったスキルを使い続ける。役割の本体と補助スキルは ${SKILL_INDEX}。`
      : lang === 'en'
        ? `Keep using the skill you received at connect. Role core plus one extra: ${SKILL_INDEX}.`
        : `연결할 때 받은 스킬을 그대로 쓰세요. 역할 코어와 보조 스킬은 ${SKILL_INDEX}.`;
  return [
    text,
    '',
    specHeartbeatLine(language, specId),
    destinationInviteLine(language, dest),
    crewOrderBlock(language),
    voiceInviteBlock(language, voice),
    skillNote,
    '',
    skillText('planner', language, dest),
  ].filter(Boolean).join('\n');
}

export { marketFromLanguage, resolveCrewMarket };
