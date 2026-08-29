'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ADVANCED_TOOLS_SCHEMA,
  assignedIdsFromCatalog,
  botToolsInstruction,
  defaultAssignedIds,
  readStoredAssignedIds,
  TOOLS_ASSIGN_EVENT,
  type ToolCatalogPayload,
} from './advanced-tools';
import { studioDownloadBase } from './desktop-auto-state';
import { useLanguage } from './language';

function studioBase() {
  return studioDownloadBase();
}

export function PlanningBanner({ current }: { current: string }) {
  const { t, language } = useLanguage();
  const liveHere = current === 'production' || current === 'bots';
  const onIndex = current === 'tools';
  const [copied, setCopied] = useState(false);
  const [instruction, setInstruction] = useState(() =>
    botToolsInstruction(language, readStoredAssignedIds() ?? defaultAssignedIds(), studioBase()),
  );

  useEffect(() => {
    let cancelled = false;
    const applyIds = (ids: string[]) => {
      setInstruction(botToolsInstruction(language, ids, studioBase()));
    };
    const onAssign = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) applyIds(detail);
    };
    window.addEventListener(TOOLS_ASSIGN_EVENT, onAssign);
    void fetch(`${studioBase()}/api/v2/tools?lang=${language}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ToolCatalogPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        if (payload?.schema !== ADVANCED_TOOLS_SCHEMA) throw new Error('bad catalog');
        if (payload.bot_instruction) setInstruction(payload.bot_instruction);
        else applyIds(assignedIdsFromCatalog(payload));
      })
      .catch(() => {
        if (!cancelled) applyIds(readStoredAssignedIds() ?? defaultAssignedIds());
      });
    return () => {
      cancelled = true;
      window.removeEventListener(TOOLS_ASSIGN_EVENT, onAssign);
    };
  }, [language]);

  const copyForBot = async () => {
    await navigator.clipboard?.writeText(instruction);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <aside className={`planning-banner${liveHere ? ' live' : ''}`} role="note">
      <div>
        <b>{t('지정은 사람, 실행은 웬만하면 봇', 'A person specifies. Prefer the bot to run it.', '人来指定，尽量由机器人执行', '指定は人、実行はなるべくボット')}</b>
        <p>
          {liveHere
            ? t(
                '이 화면에서도 렌더나 봇 기록을 할 수 있습니다. 웬만하면 도구 목록에서 지정한 뒤 봇에게 한 줄을 붙이세요.',
                'This page can still render or record bots. Prefer assigning it on the tool list, then pasting one line to the bot.',
                '此页面仍可渲染或记录机器人。尽量在工具列表里指定，再把一行贴给机器人。',
                'このページでもレンダーやボット記録はできます。なるべくツール一覧で指定してから、一文をボットに貼ってください。',
              )
            : onIndex
              ? t(
                  '카드에서 봇이 쓸 도구를 지정하세요. JSON은 카탈로그 보기 뒤에 있습니다.',
                  'Assign the tools the bot should use. JSON stays behind Show catalog.',
                  '在卡片上指定机器人该用的工具。JSON 在“查看目录”后面。',
                  'カードでボットが使うツールを指定してください。JSON は「カタログを見る」の後ろです。',
                )
              : t(
                  '이 화면은 열어 볼 수 있습니다. 실제 호출은 지정된 API를 봇이 칩니다.',
                  'You can open this screen. The bot should hit the assigned APIs.',
                  '你可以打开此画面。真正的调用由机器人打已指定的 API。',
                  'この画面は開けます。実際の呼び出しは指定された API をボットが叩きます。',
                )}
        </p>
      </div>
      <div className="planning-banner-actions">
        {onIndex ? null : <Link href="/tools" className="planning-banner-secondary">{t('도구에서 지정', 'Specify on the list', '在列表里指定', '一覧で指定')}</Link>}
        <button type="button" className="planning-banner-copy" onClick={() => void copyForBot()}>
          {copied
            ? t('복사됨', 'Copied', '已复制', 'コピー済み')
            : t('봇에게 이 말 복사', 'Copy this for the bot', '复制给机器人', 'ボットにこの文をコピー')}
        </button>
        <Link href="/" target="_blank" rel="noopener noreferrer">{t('기본 화면 열기', 'Open main screen', '打开主画面', '基本画面を開く')}</Link>
      </div>
    </aside>
  );
}
