'use client';

import { useLanguage } from './language';

function SmartScreenFigure({
  step,
  title,
  caption,
  kind,
  dontRun,
  unknownPublisher,
}: {
  step: string;
  title: string;
  caption: string;
  kind: 'shield' | 'more' | 'run';
  dontRun: string;
  unknownPublisher: string;
}) {
  return (
    <figure className="desktop-simple-figure">
      <svg viewBox="0 0 240 168" role="img" aria-label={`${step}. ${title}`}>
        <rect width="240" height="168" rx="10" fill="#0b5ed7" />
        <rect x="10" y="10" width="220" height="148" rx="6" fill="#0b5ed7" />
        <text x="20" y="28" fill="#fff" fontSize="11" fontFamily="Segoe UI, sans-serif" fontWeight="700">{title}</text>
        {kind === 'shield' ? (
          <>
            <circle cx="36" cy="58" r="12" fill="#f3b000" />
            <path d="M36 48l9 16H27z" fill="#fff" />
            <text x="54" y="56" fill="#fff" fontSize="11" fontFamily="Segoe UI, sans-serif">Microsoft Defender</text>
            <text x="54" y="70" fill="#d7e6ff" fontSize="10" fontFamily="Segoe UI, sans-serif">SmartScreen</text>
            <text x="20" y="96" fill="#fff" fontSize="10" fontFamily="Segoe UI, sans-serif">GrokCrew-Windows.exe</text>
            <text x="20" y="112" fill="#d7e6ff" fontSize="9" fontFamily="Segoe UI, sans-serif">{caption}</text>
            <rect x="118" y="128" width="100" height="20" rx="3" fill="#fff" />
            <text x="128" y="142" fill="#0b5ed7" fontSize="9" fontFamily="Segoe UI, sans-serif">{dontRun}</text>
          </>
        ) : null}
        {kind === 'more' ? (
          <>
            <text x="20" y="56" fill="#fff" fontSize="11" fontFamily="Segoe UI, sans-serif">{caption}</text>
            <text x="20" y="88" fill="#d7e6ff" fontSize="10" fontFamily="Segoe UI, sans-serif">{unknownPublisher}</text>
            <text x="20" y="130" fill="#fff" fontSize="11" fontFamily="Segoe UI, sans-serif" textDecoration="underline">{caption}</text>
          </>
        ) : null}
        {kind === 'run' ? (
          <>
            <text x="20" y="56" fill="#d7e6ff" fontSize="10" fontFamily="Segoe UI, sans-serif">{unknownPublisher}</text>
            <text x="20" y="88" fill="#fff" fontSize="12" fontFamily="Segoe UI, sans-serif" fontWeight="700">{caption}</text>
            <rect x="20" y="124" width="92" height="22" rx="3" fill="#fff" />
            <text x="32" y="139" fill="#0b5ed7" fontSize="10" fontFamily="Segoe UI, sans-serif" fontWeight="700">{caption}</text>
          </>
        ) : null}
      </svg>
      <figcaption>
        <b>{`${step}. ${title}`}</b>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function DesktopInstallHelp({ variant = 'fold' }: { variant?: 'fold' | 'open' }) {
  const { t } = useLanguage();
  const dontRun = t('실행하지 않음', 'Don’t run', '不运行', '実行しない');
  const unknownPublisher = t('게시자를 확인할 수 없음', 'Publisher could not be verified', '无法验证发布者', '発行元を確認できません');
  const figures = (
    <>
      <ol className="desktop-simple-help">
        <li>{t('받은 파일은 GrokCrew-Windows.exe 하나입니다.', 'The file you received is GrokCrew-Windows.exe.', '你收到的文件是 GrokCrew-Windows.exe。', '受け取ったファイルは GrokCrew-Windows.exe 一つ。')}</li>
        <li>{t('파란 “Windows의 PC 보호”가 뜨면 아래 그림대로 추가 정보 → 그래도 실행.', 'If you see “Windows protected your PC”, follow the three pictures: More info → Run anyway.', '若出现“Windows 已保护你的电脑”，按下图：更多信息 → 仍要运行。', '「Windows によって PC が保護されました」なら、下の絵どおり 詳細情報 → 実行。')}</li>
      </ol>
      <div className="desktop-simple-help-figures" aria-label={t('SmartScreen 세 장', 'Three SmartScreen pictures', '三张 SmartScreen 图', 'SmartScreen の三枚')}>
        <SmartScreenFigure
          step="1"
          kind="shield"
          title={t('Windows의 PC 보호', 'Windows protected your PC', 'Windows 已保护你的电脑', 'Windows によって PC が保護されました')}
          caption={t('파란 보호 화면', 'The blue shield', '蓝色保护屏', '青い保護画面')}
          dontRun={dontRun}
          unknownPublisher={unknownPublisher}
        />
        <SmartScreenFigure
          step="2"
          kind="more"
          title={t('추가 정보를 엽니다', 'Open more info', '打开更多信息', '詳細情報を開く')}
          caption={t('추가 정보', 'More info', '更多信息', '詳細情報')}
          dontRun={dontRun}
          unknownPublisher={unknownPublisher}
        />
        <SmartScreenFigure
          step="3"
          kind="run"
          title={t('그래도 실행합니다', 'Then run it anyway', '然后仍要运行', 'それでも実行する')}
          caption={t('그래도 실행', 'Run anyway', '仍要运行', '実行')}
          dontRun={dontRun}
          unknownPublisher={unknownPublisher}
        />
      </div>
      <p className="desktop-simple-help">
        {t(
          '그래도 안 되면 압축 실행 파일을 풀어 Grok Crew.exe 를 엽니다. 관리자 비밀번호는 필요 없습니다. 서명이 생기면 이 파란 화면은 줄어듭니다.',
          'If it still will not open, unzip the portable file and open Grok Crew.exe. No administrator password. A signed exe makes this blue screen rarer.',
          '还是不行就解压便携包，打开 Grok Crew.exe。不需要管理员密码。有签名后，蓝屏会变少。',
          'まだ開かないなら圧縮ファイルを解いて Grok Crew.exe を開く。管理者パスワードは不要。署名が付けばこの青い画面は減ります。',
        )}
      </p>
    </>
  );

  if (variant === 'open') {
    return (
      <section className="desktop-install-open" aria-label={t('안 열리면', 'If it will not open', '打不开时', '開かないとき')}>
        <b>{t('안 열리면', 'If it will not open', '打不开时', '開かないとき')}</b>
        {figures}
      </section>
    );
  }

  return (
    <details className="desktop-spec-advanced desktop-simple-install">
      <summary>{t('안 열리면', 'If it will not open', '打不开时', '開かないとき')}</summary>
      {figures}
      <details className="desktop-spec-advanced">
        <summary>{t('다른 방법', 'Other method', '其他方法', '別の方法')}</summary>
        <p className="desktop-simple-help">
          <a href={`${typeof window !== 'undefined' && window.grokCrew?.apiBase ? window.grokCrew.apiBase : 'http://127.0.0.1:7214'}/downloads/grok-crew-bot.zip`}>
            {t('봇에게 줄 파일', 'File for the bot', '给机器人的文件', 'ボット用ファイル')}
          </a>
        </p>
      </details>
    </details>
  );
}
