'use client';

import { useLanguage } from './language';

function SmartScreenFigure({
  step,
  title,
  caption,
  kind,
}: {
  step: string;
  title: string;
  caption: string;
  kind: 'shield' | 'more' | 'run';
}) {
  return (
    <figure className="desktop-simple-figure">
      <svg viewBox="0 0 220 132" role="img" aria-label={title}>
        <rect width="220" height="132" rx="8" fill="#f3f4f6" />
        <rect x="18" y="14" width="184" height="104" rx="6" fill="#fff" stroke="#d6d8de" />
        <rect x="18" y="14" width="184" height="22" rx="6" fill="#1b4fd8" />
        <rect x="18" y="30" width="184" height="6" fill="#1b4fd8" />
        <text x="28" y="29" fill="#fff" fontSize="9" fontFamily="Segoe UI, sans-serif">{step}</text>
        {kind === 'shield' ? (
          <>
            <circle cx="52" cy="72" r="16" fill="#f3b000" />
            <path d="M52 60l12 20H40z" fill="#1b4fd8" />
            <text x="78" y="70" fill="#1a1c21" fontSize="11" fontFamily="Segoe UI, sans-serif">Windows</text>
            <text x="78" y="86" fill="#4b5160" fontSize="10" fontFamily="Segoe UI, sans-serif">{title}</text>
          </>
        ) : null}
        {kind === 'more' ? (
          <>
            <text x="32" y="68" fill="#1a1c21" fontSize="11" fontFamily="Segoe UI, sans-serif">{title}</text>
            <text x="32" y="88" fill="#1b4fd8" fontSize="11" fontFamily="Segoe UI, sans-serif" textDecoration="underline">{caption}</text>
          </>
        ) : null}
        {kind === 'run' ? (
          <>
            <text x="32" y="68" fill="#1a1c21" fontSize="11" fontFamily="Segoe UI, sans-serif">{title}</text>
            <rect x="118" y="86" width="70" height="18" rx="3" fill="#1b4fd8" />
            <text x="128" y="99" fill="#fff" fontSize="9" fontFamily="Segoe UI, sans-serif">{caption}</text>
          </>
        ) : null}
      </svg>
      <figcaption>
        <b>{title}</b>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function DesktopInstallHelp() {
  const { t } = useLanguage();
  return (
    <details className="desktop-spec-advanced desktop-simple-install">
      <summary>{t('안 열리면', 'If it will not open', '打不开时', '開かないとき')}</summary>
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
        />
        <SmartScreenFigure
          step="2"
          kind="more"
          title={t('추가 정보를 엽니다', 'Open more info', '打开更多信息', '詳細情報を開く')}
          caption={t('추가 정보', 'More info', '更多信息', '詳細情報')}
        />
        <SmartScreenFigure
          step="3"
          kind="run"
          title={t('그래도 실행합니다', 'Then run it anyway', '然后仍要运行', 'それでも実行する')}
          caption={t('그래도 실행', 'Run anyway', '仍要运行', '実行')}
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
