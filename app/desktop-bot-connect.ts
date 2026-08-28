export type CrewBot = {
  bot_id?: string;
  display_name?: string;
  presence?: string;
  seconds_since_checkin?: number;
};

export type CrewRoster = {
  bots?: CrewBot[];
};

export function connectedBot(roster?: CrewRoster | null): CrewBot | null {
  const bots = roster?.bots?.filter((item) => String(item.display_name || item.bot_id || "").trim()) ?? [];
  if (!bots.length) return null;
  return bots.find((item) => item.presence === "active") || null;
}

export function connectPaste(language: string): string {
  const lang = language.slice(0, 2);
  if (lang === "ko") {
    return [
      "이 컴퓨터의 Grok Crew에 먼저 체크인하세요. 같은 PC에서만 됩니다.",
      "다른 PC에서는 127.0.0.1에 붙지 마세요.",
      "",
      "python grok-crew.py entry --bot-id desk-bot --display-name \"당신의 이름\" --purpose edit_video",
      "(스크립트는 http://127.0.0.1:7214/downloads/grok-crew.py)",
      "",
      "체크인되면 이 창에 이름이 보입니다. 그다음 일을 받습니다.",
    ].join("\n");
  }
  if (lang === "zh") {
    return [
      "请先在这台电脑的 Grok Crew 签到。只能在同一台电脑。",
      "另一台电脑不要连接 127.0.0.1。",
      "",
      "python grok-crew.py entry --bot-id desk-bot --display-name \"你的名字\" --purpose edit_video",
      "(脚本：http://127.0.0.1:7214/downloads/grok-crew.py)",
      "",
      "签到后这个窗口会显示名字。然后再接工作。",
    ].join("\n");
  }
  if (lang === "ja") {
    return [
      "このパソコンの Grok Crew に先にチェックインしてください。同じ PC だけです。",
      "別の PC から 127.0.0.1 に接続しないでください。",
      "",
      "python grok-crew.py entry --bot-id desk-bot --display-name \"あなたの名前\" --purpose edit_video",
      "(スクリプトは http://127.0.0.1:7214/downloads/grok-crew.py)",
      "",
      "チェックインするとこの窓に名前が出ます。それから仕事を受けます。",
    ].join("\n");
  }
  return [
    "Check in to Grok Crew on this computer first. Same PC only.",
    "Do not connect to 127.0.0.1 from another PC.",
    "",
    "python grok-crew.py entry --bot-id desk-bot --display-name \"your name\" --purpose edit_video",
    "(script: http://127.0.0.1:7214/downloads/grok-crew.py)",
    "",
    "When this window shows your name, you are connected. Then take the job.",
  ].join("\n");
}
