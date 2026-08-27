'use client';

import Link from 'next/link';
import { useLanguage } from './language';

export function PlanningBanner({ current }: { current: string }) {
  const { t } = useLanguage();
  const liveHere = current === 'production' || current === 'bots';
  const onIndex = current === 'tools';
  return (
    <aside className={`planning-banner${liveHere ? ' live' : ''}`} role="note">
      <div>
        <b>{t('기본 화면이 컷과 게시의 자리입니다', 'The main screen is where cuts and publishes happen', '剪辑和发布在主画面进行', 'カットと公開は基本画面の仕事です')}</b>
        <p>
          {liveHere
            ? t(
                '이 페이지에서도 렌더나 봇 기록이 됩니다. 타임라인과 쇼츠 게시는 기본 화면에서 하세요.',
                'This page can still render or record bots. Timeline edits and short-form publishing belong on the main screen.',
                '此页面仍可渲染或记录机器人。时间线编辑和短视频发布请在主画面进行。',
                'このページでもレンダーやボット記録はできます。タイムラインとショート公開は基本画面で行ってください。',
              )
            : onIndex
              ? t(
                  '아래 목록에서 실행과 초안을 고르세요. 대부분 기획·미리보기입니다.',
                  'Pick a live console or a draft below. Most pages are planning and preview.',
                  '在下面选择运行中的控制台或草稿。多数页面只是策划和预览。',
                  '下の一覧から稼働中のコンソールか草案を選んでください。ほとんどは企画とプレビューです。',
                )
              : t(
                  '이 페이지는 기획·미리보기입니다. 실제 편집, 렌더, 게시는 기본 화면에서 합니다.',
                  'This page is for planning and preview. Real edits, renders, and publishes happen on the main screen.',
                  '此页面用于策划和预览。真正的编辑、渲染和发布在主画面进行。',
                  'このページは企画とプレビューです。実際の編集・レンダー・公開は基本画面で行います。',
                )}
        </p>
      </div>
      <div className="planning-banner-actions">
        {onIndex ? null : <Link href="/tools" className="planning-banner-secondary">{t('도구 목록', 'Tool list', '工具列表', 'ツール一覧')}</Link>}
        <Link href="/">{t('기본 화면 열기', 'Open main screen', '打开主画面', '基本画面を開く')}</Link>
      </div>
    </aside>
  );
}
