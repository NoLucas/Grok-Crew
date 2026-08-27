import type { LocalizedQuad } from "./desktop-appearance";

export const ADVANCED_TOOLS_SCHEMA = "grok-crew.advanced-tools/v1";

export type AdvancedToolApi = {
  read: string[];
  write: string[];
};

export type AdvancedTool = {
  id: string;
  url: string;
  live: boolean;
  name: LocalizedQuad;
  detail: LocalizedQuad;
  useWhen: LocalizedQuad;
  never: LocalizedQuad;
  botApi: AdvancedToolApi;
  cli: string[];
};

export const ADVANCED_TOOLS_RULE: LocalizedQuad = [
  "같은 PC 봇은 HTML을 긁지 않습니다. GET /api/v2/tools를 읽고, 도구마다 적힌 API만 호출합니다. 원격 봇은 127.0.0.1에 붙지 않습니다.",
  "A same-PC bot must not scrape HTML. Read GET /api/v2/tools, then call only the APIs listed for that tool. Remote bots must not attach to 127.0.0.1.",
  "同一台电脑上的机器人不要抓 HTML。先读 GET /api/v2/tools，再只调用该工具列出的 API。远程机器人不要连接 127.0.0.1。",
  "同じ PC のボットは HTML を掻きません。GET /api/v2/tools を読み、そのツールに書かれた API だけを呼びます。リモートボットは 127.0.0.1 に接続しません。",
];

export const ADVANCED_TOOLS_NEVER: LocalizedQuad[] = [
  [
    "고급 도구 페이지 HTML을 긁거나 클릭 자동화하지 않습니다.",
    "Do not scrape or click-automate advanced-tool HTML.",
    "不要抓取或点击自动化高级工具页面的 HTML。",
    "高度なツールの HTML を掻いたりクリック自動化したりしません。",
  ],
  [
    "초안 페이지를 실제 타임라인으로 쓰지 않습니다. 컷은 기본 화면에 있습니다.",
    "Do not treat draft pages as the live timeline. Cuts live on the main screen.",
    "不要把草稿页当成真正的时间线。剪辑在主画面。",
    "草案ページを本番タイムラインとして使いません。カットは基本画面にあります。",
  ],
  [
    "수집 문과 편집 문을 섞지 않습니다.",
    "Do not mix the collector door with the editor door.",
    "不要混用收集门和剪辑门。",
    "収集ドアと編集ドアを混ぜません。",
  ],
  [
    "화질을 바꾸지 않습니다. 작업 공간 밖 경로와 비밀값을 읽지 않습니다.",
    "Do not change quality. Do not read paths or secrets outside the workspace.",
    "不要改画质。不要读取工作区外的路径或秘密。",
    "画質は変えません。作業空間の外の経路や秘密は読みません。",
  ],
];

export const ADVANCED_TOOLS: AdvancedTool[] = [
  {
    id: "hub",
    url: "/tools",
    live: false,
    name: ["고급 도구 목록", "Advanced tools index", "高级工具目录", "高度なツール一覧"],
    detail: [
      "실행 콘솔과 초안을 한곳에 모아 둡니다. 봇은 이 화면이 아니라 JSON 카탈로그를 읽습니다.",
      "Live consoles and drafts in one place. Bots read the JSON catalog, not this screen.",
      "把运行中的控制台和草稿放在一处。机器人读 JSON 目录，不读这个画面。",
      "稼働コンソールと草案を一箇所にまとめています。ボットはこの画面ではなく JSON カタログを読みます。",
    ],
    useWhen: [
      "어떤 콘솔이 실제 작업인지, 어떤 API를 써야 하는지 고를 때.",
      "When choosing which console is live and which API to call.",
      "要区分哪个控制台会真正干活、该调用哪个 API 时。",
      "どのコンソールが本番で、どの API を使うか選ぶとき。",
    ],
    never: [
      "이 페이지를 파싱하지 마세요. GET /api/v2/tools를 읽으세요.",
      "Do not parse this page. Read GET /api/v2/tools.",
      "不要解析此页。请读 GET /api/v2/tools。",
      "このページを解析しないでください。GET /api/v2/tools を読んでください。",
    ],
    botApi: { read: ["GET /api/v2/tools", "GET /api/bot-guide"], write: [] },
    cli: ["python local_studio/grok_crew.py tools", "python local_studio/grok_crew.py guide"],
  },
  {
    id: "production",
    url: "/production",
    live: true,
    name: ["제작", "Production", "制作", "制作"],
    detail: [
      "로컬 프로젝트를 만들고 MoviePy 렌더와 Instagram 대기열을 돌립니다. 타임라인은 없습니다.",
      "Create a local project, then run MoviePy renders and the Instagram queue. There is no timeline here.",
      "创建本地项目，运行 MoviePy 渲染和 Instagram 队列。这里没有时间线。",
      "ローカルプロジェクトを作り、MoviePy レンダーと Instagram キューを回します。タイムラインはありません。",
    ],
    useWhen: [
      "프로젝트를 만들거나, 렌더를 대기열에 넣거나, Instagram 작업을 넣을 때.",
      "When creating a project, queueing a render, or queueing Instagram.",
      "要创建项目、排队渲染、或排队 Instagram 时。",
      "プロジェクト作成、レンダー待ち、Instagram 作業を入れるとき。",
    ],
    never: [
      "여기서 타임라인을 자르지 마세요. 화질은 바꾸지 마세요.",
      "Do not cut a timeline here. Do not change quality.",
      "不要在这里剪时间线。不要改画质。",
      "ここでタイムラインを切らないでください。画質は変えないでください。",
    ],
    botApi: {
      read: ["GET /api/projects", "GET /api/projects/{id}", "GET /api/jobs", "GET /api/jobs/{id}", "GET /api/edit-method", "GET /api/presets"],
      write: ["POST /api/projects", "POST /api/projects/{id}/render", "POST /api/projects/{id}/instagram", "POST /api/jobs/{id}/run", "POST /api/jobs/{id}/cancel"],
    },
    cli: ["python local_studio/grok_crew.py projects list", "python local_studio/grok_crew.py jobs render --project {id} --bot-id {bot_id}"],
  },
  {
    id: "bots",
    url: "/bots",
    live: true,
    name: ["봇 확인", "Bot check", "机器人检查", "ボット確認"],
    detail: [
      "이 PC에 들어온 봇, 실행 정책, 최근 기록을 봅니다.",
      "See bots on this PC, their render policy, and recent activity.",
      "查看这台电脑上的机器人、执行策略和最近记录。",
      "この PC に入ったボット、実行ポリシー、最近の記録を見ます。",
    ],
    useWhen: [
      "입장, 하트비트, 실행 정책을 읽거나 남길 때.",
      "When entering, sending a heartbeat, or reading the execution policy.",
      "要签到、发送心跳、或读写执行策略时。",
      "入場、ハートビート、実行ポリシーを読む・残すとき。",
    ],
    never: [
      "하트비트 없이 활성 봇이라고 말하지 마세요.",
      "Do not claim a bot is active without a current heartbeat.",
      "没有当前心跳不要声称机器人在线。",
      "現在のハートビートなしでボットが稼働中だと言わないでください。",
    ],
    botApi: {
      read: ["GET /api/bot-entry", "GET /api/bots", "GET /api/bots/{bot_id}/execution-policy", "GET /api/bot-activity", "GET /api/bot-entries"],
      write: ["POST /api/bot-entry", "POST /api/bots/heartbeat", "POST /api/bots/execution-policy"],
    },
    cli: ["python local_studio/grok_crew.py entry --bot-id {bot_id} --display-name {name}", "python local_studio/grok_crew.py bots activity"],
  },
  {
    id: "edit",
    url: "/edit",
    live: false,
    name: ["편집실", "Edit lab", "编辑室", "編集ラボ"],
    detail: [
      "10초 연출 초안입니다. 실제 컷이 아닙니다.",
      "A 10-second motion draft. It is not a real cut.",
      "10 秒的演出草稿。不是真正的剪辑。",
      "10秒の演出草案です。実カットではありません。",
    ],
    useWhen: [
      "훅·템포·룩 같은 편집 방식을 맞출 때. 실제 컷은 기본 화면입니다.",
      "When aligning hook, pacing, or look. The real cut is on the main screen.",
      "要对齐开场、节奏或风格时。真正的剪辑在主画面。",
      "フック・テンポ・ルックを合わせるとき。実カットは基本画面です。",
    ],
    never: [
      "이 미리보기를 타임라인이나 렌더 입력으로 쓰지 마세요.",
      "Do not use this preview as a timeline or render input.",
      "不要把这个预览当成时间线或渲染输入。",
      "このプレビューをタイムラインやレンダー入力に使わないでください。",
    ],
    botApi: { read: ["GET /api/edit-method"], write: ["POST /api/edit-method"] },
    cli: ["python local_studio/grok_crew.py method get", "python local_studio/grok_crew.py method set --file method.json"],
  },
  {
    id: "cut",
    url: "/cut",
    live: false,
    name: ["컷 로그", "Cut log", "剪辑记录", "カットログ"],
    detail: [
      "브라우저에만 남는 구간 메모입니다. 제작에서 새 프로젝트를 만들 때 읽습니다.",
      "Segment notes that stay in this browser. Production reads them when you create a project.",
      "只留在此浏览器的片段笔记。制作页新建项目时会读取。",
      "このブラウザにだけ残る区間メモです。制作で新規プロジェクトを作るときに読みます。",
    ],
    useWhen: [
      "프로젝트에 남길 말 구간을 비파괴 컷 맵으로 저장할 때.",
      "When saving keep-segments as a non-destructive cut map on a project.",
      "要把保留片段存成项目上的非破坏剪辑图时。",
      "残す発話区間をプロジェクトの非破壊カットマップとして保存するとき。",
    ],
    never: [
      "브라우저 localStorage 메모를 진실로 쓰지 마세요. 프로젝트 cut-map API를 쓰세요.",
      "Do not treat browser localStorage notes as source of truth. Use the project cut-map API.",
      "不要把浏览器 localStorage 笔记当成真相。请用项目 cut-map API。",
      "ブラウザ localStorage のメモを正本にしないでください。プロジェクトの cut-map API を使ってください。",
    ],
    botApi: {
      read: ["GET /api/projects/{id}/operations"],
      write: ["POST /api/projects/{id}/cut-map"],
    },
    cli: ["python local_studio/grok_crew.py ops cut-map --project {id} --file segments.json"],
  },
  {
    id: "operations",
    url: "/operations",
    live: false,
    name: ["운영 센터", "Operations", "运营中心", "オペレーション"],
    detail: [
      "검사·작업 보드 초안 화면입니다. 기록 API는 살아 있고, 렌더는 시작하지 않습니다.",
      "A draft of the inspection board. The record APIs are live. It does not start a render.",
      "检查看板的草稿界面。记录 API 是活的，不会开始渲染。",
      "検査ボードの草案画面です。記録 API は生きています。レンダーは始めません。",
    ],
    useWhen: [
      "검사, 품질 보고, 기억, 작업, 브랜드 키트를 프로젝트에 남길 때.",
      "When recording inspection, quality, memory, tasks, or a brand kit on a project.",
      "要在项目上留下检查、质量、记忆、任务或品牌套装时。",
      "検査・品質・記憶・タスク・ブランドキットをプロジェクトに残すとき。",
    ],
    never: [
      "이 화면에서 렌더나 게시를 시작하지 마세요.",
      "Do not start a render or a publish from this screen.",
      "不要从这个页面开始渲染或发布。",
      "この画面からレンダーや公開を始めないでください。",
    ],
    botApi: {
      read: ["GET /api/projects/{id}/operations", "GET /api/brand-kits"],
      write: [
        "POST /api/projects/{id}/inspect",
        "POST /api/projects/{id}/quality-check",
        "POST /api/projects/{id}/artifacts",
        "POST /api/artifacts/{id}/update",
        "POST /api/brand-kits",
      ],
    },
    cli: ["python local_studio/grok_crew.py ops show --project {id}", "python local_studio/grok_crew.py ops inspect --project {id}"],
  },
  {
    id: "terminal",
    url: "/terminal",
    live: false,
    name: ["터미널", "Terminal", "终端", "ターミナル"],
    detail: [
      "같은 PC 봇이 쓰는 CLI 안내입니다.",
      "CLI instructions for a bot on this same PC.",
      "给同一台电脑上的机器人用的 CLI 说明。",
      "同じ PC のボットが使う CLI 案内です。",
    ],
    useWhen: [
      "브라우저 대신 터미널에서 같은 API를 호출할 때.",
      "When calling the same APIs from a terminal instead of the browser.",
      "要在终端而不是浏览器里调用同一套 API 时。",
      "ブラウザではなくターミナルから同じ API を呼ぶとき。",
    ],
    never: [
      "7214 포트에 브라우저 페이지를 열지 마세요. site --page 주소를 쓰세요.",
      "Do not open browser pages on port 7214. Use the site --page URLs.",
      "不要在 7214 端口打开浏览器页面。请用 site --page 地址。",
      "7214 番でブラウザページを開かないでください。site --page の URL を使ってください。",
    ],
    botApi: {
      read: ["GET /api/terminal-contract", "GET /downloads/grok-crew.py"],
      write: [],
    },
    cli: ["python local_studio/grok_crew.py contract", "python local_studio/grok_crew.py site --page tools"],
  },
  {
    id: "bot-guide",
    url: "/bot-guide",
    live: false,
    name: ["봇 설명서", "Bot guide", "机器人指南", "ボットガイド"],
    detail: [
      "기계가 읽는 플레이북입니다. advanced_tools 카탈로그가 포함됩니다.",
      "The machine-readable playbook. It includes the advanced_tools catalog.",
      "给机器读的操作手册。里面含 advanced_tools 目录。",
      "機械が読むプレイブックです。advanced_tools カタログが含まれます。",
    ],
    useWhen: [
      "작업 전 규칙과 도구 API를 한 번에 읽을 때.",
      "When reading the rules and tool APIs before work.",
      "开工前要一次读完规则和工具 API 时。",
      "作業前にルールとツール API をまとめて読むとき。",
    ],
    never: [
      "안내 화면을 긁지 마세요. GET /api/bot-guide를 읽으세요.",
      "Do not scrape the guide screen. Read GET /api/bot-guide.",
      "不要抓指南页面。请读 GET /api/bot-guide。",
      "ガイド画面を掻かないでください。GET /api/bot-guide を読んでください。",
    ],
    botApi: { read: ["GET /api/bot-guide", "GET /api/v2/tools"], write: [] },
    cli: ["python local_studio/grok_crew.py guide", "python local_studio/grok_crew.py tools --lang ko"],
  },
  {
    id: "library",
    url: "/library",
    live: false,
    name: ["라이브러리", "Library", "素材库", "ライブラリ"],
    detail: [
      "참고 메모입니다. 작업 공간 밖 파일을 열지 않습니다.",
      "Reference notes. It does not open files outside the workspace.",
      "参考笔记。不会打开工作区外的文件。",
      "参考メモです。作業空間の外のファイルは開きません。",
    ],
    useWhen: [
      "로컬 참고만 필요할 때. 폴더 판은 handoff folders API입니다.",
      "When you only need local reference. The folder board is the handoff folders API.",
      "只需本地参考时。文件夹板用 handoff folders API。",
      "ローカルの参考だけが必要なとき。フォルダ板は handoff folders API です。",
    ],
    never: [
      "작업 공간 밖 파일을 열거나 가져오지 마세요.",
      "Do not open or import files outside the workspace.",
      "不要打开或导入工作区外的文件。",
      "作業空間の外のファイルを開いたり取り込んだりしないでください。",
    ],
    botApi: { read: ["GET /api/v2/handoff/folders"], write: [] },
    cli: ["python local_studio/grok_crew.py handoff status"],
  },
  {
    id: "agent",
    url: "/agent",
    live: false,
    name: ["에이전트", "Agent", "智能体", "エージェント"],
    detail: [
      "프롬프트 계약 초안입니다. Cursor나 편집 Agent 연결이 아닙니다.",
      "A prompt-contract draft. It is not a Cursor or Editor Agent connection.",
      "提示词契约草稿。不是 Cursor 或剪辑 Agent 연결。",
      "プロンプト契約の草案です。Cursor や編集 Agent の接続ではありません。",
    ],
    useWhen: [
      "브라우저에 적힌 브리프를 사람이 볼 때. 봇은 프로젝트 API를 씁니다.",
      "When a person reads the in-browser brief. Bots use the project APIs.",
      "人要看浏览器里的简报时。机器人用项目 API。",
      "人がブラウザのブリーフを見るとき。ボットはプロジェクト API を使います。",
    ],
    never: [
      "이 화면을 Cursor 연결이나 원격 에이전트 채널로 쓰지 마세요.",
      "Do not treat this screen as a Cursor connection or a remote-agent channel.",
      "不要把这个页面当成 Cursor 连接或远程智能体通道。",
      "この画面を Cursor 接続やリモートエージェント経路に使わないでください。",
    ],
    botApi: { read: [], write: [] },
    cli: [],
  },
  {
    id: "connect",
    url: "/connect",
    live: false,
    name: ["로컬 도구", "Local tools", "本地工具", "ローカルツール"],
    detail: [
      "오프라인으로 넘길 JSON을 만듭니다.",
      "Build a JSON packet to hand off offline.",
      "生成离线交接用的 JSON。",
      "オフラインで渡す JSON を作ります。",
    ],
    useWhen: [
      "사람이 오프라인 패킷을 만들 때. 원격 봇은 handoff 폴더를 씁니다.",
      "When a person builds an offline packet. Remote bots use handoff folders.",
      "人要做离线数据包时。远程机器人用 handoff 文件夹。",
      "人がオフラインパケットを作るとき。リモートボットは handoff フォルダを使います。",
    ],
    never: [
      "이 JSON을 127.0.0.1 호출 대신 쓰지 마세요. 원격은 handoff inbox입니다.",
      "Do not use this JSON instead of 127.0.0.1. Remote work uses the handoff inbox.",
      "不要用这份 JSON 代替 127.0.0.1。远程工作走 handoff inbox。",
      "この JSON を 127.0.0.1 の代わりに使わないでください。リモートは handoff inbox です。",
    ],
    botApi: { read: [], write: [] },
    cli: [],
  },
  {
    id: "packet",
    url: "/packet",
    live: false,
    name: ["패킷", "Packet", "数据包", "パケット"],
    detail: ["캡션 패키지 초안입니다.", "A caption-package draft.", "字幕包装草稿。", "キャプション一式の草案です。"],
    useWhen: [
      "사람이 캡션 초안을 볼 때. 전달 제약은 프로젝트와 가이드를 따릅니다.",
      "When a person reviews a caption draft. Delivery constraints follow the project and the guide.",
      "人要看字幕草稿时。交付约束跟项目和指南。",
      "人がキャプション草案を見るとき。受け渡しの制約はプロジェクトとガイドに従います。",
    ],
    never: [
      "이 초안을 게시 준비 완료로 말하지 마세요.",
      "Do not call this draft publish-ready.",
      "不要把这份草稿说成可以发布。",
      "この草案を公開準備完了と呼ばないでください。",
    ],
    botApi: { read: [], write: [] },
    cli: [],
  },
  {
    id: "gates",
    url: "/gates",
    live: false,
    name: ["게이트", "Gates", "关卡", "ゲート"],
    detail: [
      "게시 전 체크리스트 초안입니다.",
      "A pre-publish checklist draft.",
      "发布前检查清单草稿。",
      "公開前チェックリストの草案です。",
    ],
    useWhen: [
      "품질 보고를 프로젝트에 남긴 뒤, 사람이 이 초안을 볼 때.",
      "After recording a quality report on the project, when a person reviews this draft.",
      "已在项目上留下质量报告后，人要看这份草稿时。",
      "品質報告をプロジェクトに残したあと、人がこの草案を見るとき。",
    ],
    never: [
      "이 체크리스트만 보고 게시했다고 말하지 마세요. quality-check API를 쓰세요.",
      "Do not claim a publish from this checklist alone. Use the quality-check API.",
      "不要只凭这张清单就声称已发布。请用 quality-check API。",
      "このチェックリストだけで公開したと言わないでください。quality-check API を使ってください。",
    ],
    botApi: { read: ["GET /api/projects/{id}/operations"], write: ["POST /api/projects/{id}/quality-check"] },
    cli: ["python local_studio/grok_crew.py ops quality --project {id} --stage pre_render"],
  },
  {
    id: "export",
    url: "/export",
    live: false,
    name: ["내보내기", "Export", "导出", "エクスポート"],
    detail: [
      "출력 형식 초안입니다. 실제 MP4는 제작 또는 기본 화면에서 만듭니다.",
      "An output-format draft. Real MP4s come from Production or the main screen.",
      "输出格式草稿。真正的 MP4 在制作页或主画面生成。",
      "出力形式の草案です。実際の MP4 は制作または基本画面で作ります。",
    ],
    useWhen: [
      "사람이 출력 형식을 볼 때. 실제 파일은 렌더 API입니다.",
      "When a person reviews output formats. The real file comes from the render API.",
      "人要看出格式时。真正的文件来自渲染 API。",
      "人が出力形式を見るとき。実際のファイルはレンダー API です。",
    ],
    never: [
      "이 초안에서 MP4가 나왔다고 말하지 마세요.",
      "Do not claim an MP4 came from this draft.",
      "不要声称 MP4 出自这份草稿。",
      "この草案から MP4 が出たと言わないでください。",
    ],
    botApi: { read: ["GET /api/presets"], write: ["POST /api/projects/{id}/render"] },
    cli: ["python local_studio/grok_crew.py presets", "python local_studio/grok_crew.py jobs render --project {id} --bot-id {bot_id}"],
  },
  {
    id: "privacy",
    url: "/privacy",
    live: false,
    name: ["개인정보·설정", "Privacy & settings", "隐私与设置", "プライバシー・設定"],
    detail: [
      "이 기기 작업 공간 이름을 바꿉니다.",
      "Rename the workspace on this device.",
      "更改这台设备上的工作区名称。",
      "この端末の作業空間名を変えます。",
    ],
    useWhen: [
      "로컬 범위와 이름을 존중할 때.",
      "When respecting the local scope and workspace name.",
      "要尊重本地范围和工作区名称时。",
      "ローカル範囲と名前を尊重するとき。",
    ],
    never: [
      "브라우저 저장소, .env, SQLite에서 비밀값을 읽지 마세요.",
      "Do not read secrets from browser storage, .env, or SQLite.",
      "不要从浏览器存储、.env 或 SQLite 读取秘密。",
      "ブラウザ保存、.env、SQLite から秘密を読まないでください。",
    ],
    botApi: { read: [], write: [] },
    cli: [],
  },
];

export function localizeQuad(value: LocalizedQuad, language: "ko" | "en" | "zh" | "ja"): string {
  const index = { ko: 0, en: 1, zh: 2, ja: 3 }[language];
  return value[index];
}

export function liveAdvancedTools(): AdvancedTool[] {
  return ADVANCED_TOOLS.filter((tool) => tool.id !== "hub" && tool.live);
}

export function draftAdvancedTools(): AdvancedTool[] {
  return ADVANCED_TOOLS.filter((tool) => tool.id !== "hub" && !tool.live);
}

export function formatToolApi(tool: AdvancedTool): string {
  const parts = [...tool.botApi.read, ...tool.botApi.write];
  return parts.length ? parts.join(" · ") : "";
}
