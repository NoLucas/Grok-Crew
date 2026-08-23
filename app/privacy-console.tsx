'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from './site-header';
import { clearBrowserWorkspaceData, useWorkspaceProfile } from './workspace-profile';
import { useLanguage } from './language';

export default function PrivacyConsole() {
  const { t } = useLanguage();
  const { profile, save } = useWorkspaceProfile();
  const [workspaceName, setWorkspaceName] = useState(profile.workspaceName);
  const [botLabel, setBotLabel] = useState(profile.defaultBotLabel);
  const [message, setMessage] = useState('');
  useEffect(() => { setWorkspaceName(profile.workspaceName); setBotLabel(profile.defaultBotLabel); }, [profile]);
  const saveProfile = () => { save({ workspaceName, defaultBotLabel: botLabel }); setMessage(t('이 기기의 브라우저에만 작업 공간 이름과 기본 봇 표시명이 저장되었습니다.', 'The workspace name and default bot label were saved only in this browser on this device.')); };
  const erase = () => {
    if (!window.confirm(t('이 브라우저에 저장한 편집 초안, 봇 응답, 이름 설정을 지울까요? 로컬 Studio의 미디어와 SQLite 기록은 지우지 않습니다.', 'Remove saved browser drafts, bot responses, and names? This does not delete Local Studio media or SQLite records.'))) return;
    clearBrowserWorkspaceData();
    window.location.assign('/');
  };
  return <><SiteHeader current="privacy" /><main className="privacy-main">
    <section className="privacy-hero"><p className="kicker">LOCAL PRIVACY + PERSONALIZATION</p><h1>{t('이름은 내가 정하고,', 'Name the workspace yourself,')}<br /><span>{t('기록은 내 기기에만 둡니다.', 'keep its records on your device.')}</span></h1><p>{t('공용 화면에는 특정 사용자·봇·프로젝트의 이름을 기본값으로 넣지 않습니다. 여기서 정한 이름은 이 브라우저와 이 기기에만 저장됩니다.', 'The shared interface has no default user, bot, or project identity. Names set here stay only in this browser on this device.')}</p></section>
    <section className="privacy-grid"><article className="privacy-card"><div className="privacy-card-head"><span>WORKSPACE IDENTITY</span><em>{t('이 기기 전용', 'this device only')}</em></div><label>{t('작업 공간 이름', 'Workspace name')}<input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={80} placeholder={t('예: 내 영상 작업실', 'e.g. My video workspace')} /></label><label>{t('기본 봇 표시명', 'Default bot label')}<input value={botLabel} onChange={(event) => setBotLabel(event.target.value)} maxLength={80} placeholder={t('예: 로컬 편집 봇', 'e.g. Local editor bot')} /></label><button onClick={saveProfile}>{t('이 기기에만 저장', 'Save on this device')}</button><p>{t('실제 bot_id와 표시명은 봇이 입장할 때 직접 보냅니다. 이 기본 표시명은 안내용이며 서버·공유 사이트로 전송되지 않습니다.', 'A real bot_id and display name are supplied by the bot at entry. This label is only for guidance and is never sent to a server or a shared site.')}</p></article>
      <article className="privacy-card privacy-boundary"><div className="privacy-card-head"><span>DATA BOUNDARY</span><em>LOCAL ONLY</em></div><ul><li>{t('브라우저 초안·설정: 이 브라우저의 local storage', 'Browser drafts and settings: this browser’s local storage')}</li><li>{t('프로젝트·봇 작업 기록: 이 PC의 Local Studio SQLite', 'Project and bot records: Local Studio SQLite on this PC')}</li><li>{t('미디어: local_studio/workspace 내부의 로컬 파일', 'Media: local files under local_studio/workspace')}</li><li>{t('기본값에 다른 사용자의 봇 이름·프로젝트·SNS 주소는 포함하지 않음', 'No other user’s bot name, project, or social link is included as a default')}</li></ul><button className="privacy-danger" onClick={erase}>{t('이 브라우저의 저장된 초안 지우기', 'Clear saved browser drafts')}</button><p>{t('미디어나 SQLite 작업 기록을 지우려면 파일과 프로젝트를 확인한 뒤 별도로 관리하세요. 이 버튼은 그 데이터를 삭제하지 않습니다.', 'Media and SQLite work records are not deleted by this button; manage them separately after reviewing the exact files and projects.')}</p></article></section>
    <p className="privacy-message" aria-live="polite">{message}</p>
  </main></>;
}
