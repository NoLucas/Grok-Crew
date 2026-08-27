'use client';

import { useEffect, useRef, useState, type DragEvent, type FormEvent, type MouseEvent } from 'react';
import {
  groupLibraryProjects,
  summarizeTrash,
  trashDaysLeft,
  type LibraryFolder,
  type LibraryProject,
  type TrashItem,
} from './desktop-project-library-model';
import { useLanguage } from './language';

type StudioRequest = (path: string, init?: RequestInit) => Promise<unknown>;

type MenuState =
  | { kind: 'project'; id: string; x: number; y: number; moveOpen: boolean }
  | { kind: 'folder'; id: string; x: number; y: number };

type FolderUndo = {
  id: string;
  title: string;
  sort_order: number;
  project_ids: string[];
};

type SourceAction = 'keep' | 'trash' | 'delete';

type PurgePrompt = {
  id: string;
  title: string;
  hasSource: boolean;
};

const FOLDER_UNDO_MS = 20_000;

type Props = {
  projects: LibraryProject[];
  folders: LibraryFolder[];
  trash: TrashItem[];
  selectedId: string;
  specDeskOpen: boolean;
  studioState: 'loading' | 'ready' | 'error';
  senderLabel: (project: LibraryProject) => string;
  request: StudioRequest;
  onSelect: (projectId: string) => void;
  onRefresh: () => Promise<void> | void;
  onMessage: (text: string) => void;
};

export function DesktopProjectLibrary({
  projects,
  folders,
  trash,
  selectedId,
  specDeskOpen,
  studioState,
  senderLabel,
  request,
  onSelect,
  onRefresh,
  onMessage,
}: Props) {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renaming, setRenaming] = useState<{ kind: 'project' | 'folder'; id: string; value: string } | null>(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [dropId, setDropId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [folderUndo, setFolderUndo] = useState<FolderUndo | null>(null);
  const [purgePrompt, setPurgePrompt] = useState<PurgePrompt | null>(null);
  const [sourceAction, setSourceAction] = useState<SourceAction>('keep');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const grouped = groupLibraryProjects(projects, folders);
  const expiry = summarizeTrash(trash);

  useEffect(() => {
    if (!menu) return;
    const close = (event: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  useEffect(() => {
    if (!folderUndo) return undefined;
    const timer = window.setTimeout(() => setFolderUndo(null), FOLDER_UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [folderUndo]);

  const run = async (path: string, body?: Record<string, unknown>, ok?: string) => {
    setBusy(true);
    try {
      const result = await request(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      if (ok) onMessage(ok);
      await onRefresh();
      return result;
    } catch (error) {
      onMessage(error instanceof Error ? error.message : t('요청을 처리하지 못했습니다.', 'Could not complete that.', '无法完成该操作。', '処理できませんでした。'));
      return null;
    } finally {
      setBusy(false);
      setMenu(null);
    }
  };

  const createFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    await run('/api/v2/project-folders', { title: folderName.trim() }, t('폴더를 만들었습니다.', 'Created the folder.', '已创建文件夹。', 'フォルダを作りました。'));
    setFolderName('');
    setAddingFolder(false);
  };

  const commitRename = async () => {
    if (!renaming || !renaming.value.trim()) {
      setRenaming(null);
      return;
    }
    if (renaming.kind === 'folder') {
      await run(`/api/v2/project-folders/${renaming.id}/rename`, { title: renaming.value.trim() }, t('폴더 이름을 바꿨습니다.', 'Renamed the folder.', '已重命名文件夹。', 'フォルダ名を変えました。'));
    } else {
      await run(`/api/v2/projects/${renaming.id}/rename`, { title: renaming.value.trim() }, t('프로젝트 이름을 바꿨습니다.', 'Renamed the project.', '已重命名项目。', 'プロジェクト名を変えました。'));
    }
    setRenaming(null);
  };

  const trashProject = async (id: string) => {
    const result = await run(`/api/v2/projects/${id}/trash`, {}) as {
      project?: { stopped?: { jobs?: number; control_jobs?: number } };
    } | null;
    if (!result) return;
    const stopped = (result?.project?.stopped?.jobs ?? 0) + (result?.project?.stopped?.control_jobs ?? 0);
    onMessage(
      stopped
        ? t('휴지통으로 보냈고, 진행 중이던 작업은 멈췄습니다.', 'Moved to the trash and stopped work still in flight.', '已移到废纸篓，并停止了进行中的工作。', 'ゴミ箱へ移し、進行中の作業を止めました。')
        : t('프로젝트를 휴지통으로 보냈습니다.', 'Moved the project to the trash.', '已将项目移到废纸篓。', 'プロジェクトをゴミ箱へ移しました。'),
    );
    if (selectedId === id) onSelect('');
  };

  const undoFolder = async () => {
    if (!folderUndo) return;
    await run('/api/v2/project-folders/undelete', {
      id: folderUndo.id,
      title: folderUndo.title,
      sort_order: folderUndo.sort_order,
      project_ids: folderUndo.project_ids,
    }, t('폴더를 되돌렸습니다.', 'Restored the folder.', '已恢复文件夹。', 'フォルダを戻しました。'));
    setFolderUndo(null);
  };

  const deleteFolder = async (id: string) => {
    const folder = folders.find((item) => item.id === id);
    const result = await run(`/api/v2/project-folders/${id}/delete`, {}) as {
      id?: string;
      title?: string;
      sort_order?: number;
      project_ids?: string[];
    } | null;
    if (result?.id) {
      setFolderUndo({
        id: result.id,
        title: String(result.title || folder?.title || ''),
        sort_order: Number(result.sort_order || 0),
        project_ids: Array.isArray(result.project_ids) ? result.project_ids.map(String) : [],
      });
      onMessage(t('폴더를 지웠습니다. 프로젝트는 남아 있습니다.', 'Deleted the folder. Projects stay.', '已删除文件夹。项目仍在。', 'フォルダを消しました。プロジェクトは残ります。'));
    }
  };

  const confirmPurge = async () => {
    if (!purgePrompt) return;
    await run(
      `/api/v2/trash/${purgePrompt.id}/purge`,
      { source_action: purgePrompt.hasSource ? sourceAction : 'keep' },
      sourceAction === 'delete'
        ? t('기록과 원본을 지웠습니다.', 'Deleted the record and the source.', '已删除记录和原片。', '記録と原本を削除しました。')
        : sourceAction === 'trash'
          ? t('기록은 지웠고 원본은 휴지통에 있습니다.', 'Deleted the record. The source is in the trash.', '已删除记录，原片在废纸篓。', '記録は消し、原本はゴミ箱にあります。')
          : t('기록만 지웠습니다. 원본 파일은 그대로입니다.', 'Deleted the record. The source file stays.', '已删除记录。原片文件仍在。', '記録だけ消し、原本ファイルはそのままです。'),
    );
    setPurgePrompt(null);
    setSourceAction('keep');
  };

  const onDragStart = (projectId: string) => (event: DragEvent) => {
    event.dataTransfer.setData('text/project-id', projectId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (folderId: string | '') => (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropId(folderId);
  };

  const onDrop = (folderId: string | null) => async (event: DragEvent) => {
    event.preventDefault();
    const projectId = event.dataTransfer.getData('text/project-id');
    setDropId(null);
    if (!projectId) return;
    await run(
      `/api/v2/projects/${projectId}/move`,
      { folder_id: folderId },
      t('폴더로 옮겼습니다.', 'Moved to the folder.', '已移到文件夹。', 'フォルダへ移しました。'),
    );
  };

  const openProjectMenu = (event: MouseEvent, id: string) => {
    event.preventDefault();
    setMenu({ kind: 'project', id, x: event.clientX, y: event.clientY, moveOpen: false });
  };

  const openFolderMenu = (event: MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ kind: 'folder', id, x: event.clientX, y: event.clientY });
  };

  const renderProject = (item: LibraryProject) => {
    const renamingThis = renaming?.kind === 'project' && renaming.id === item.id;
    return (
      <div
        key={item.id}
        className={!specDeskOpen && item.id === selectedId ? 'desktop-library-item is-active' : 'desktop-library-item'}
        draggable={!renamingThis}
        onDragStart={onDragStart(item.id)}
        onContextMenu={(event) => openProjectMenu(event, item.id)}
      >
        <button
          type="button"
          className="desktop-library-open"
          onClick={() => onSelect(item.id)}
          onContextMenu={(event) => openProjectMenu(event, item.id)}
        >
          <span>▣</span>
          <div>
            {renamingThis ? (
              <input
                autoFocus
                value={renaming.value}
                onChange={(event) => setRenaming({ ...renaming, value: event.target.value })}
                onBlur={() => void commitRename()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void commitRename();
                  if (event.key === 'Escape') setRenaming(null);
                }}
              />
            ) : <b>{item.title}</b>}
            <small>{senderLabel(item)} · v{item.current_revision ?? 1} · {new Date(item.updated_at).toLocaleDateString()}</small>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="desktop-library">
      <div className="desktop-library-toolbar">
        <button type="button" className="desktop-secondary" disabled={busy} onClick={() => setAddingFolder((value) => !value)}>
          {t('폴더 추가', 'Add folder', '添加文件夹', 'フォルダを追加')}
        </button>
      </div>
      {folderUndo ? (
        <div className="desktop-library-undo">
          <p>{t(`“${folderUndo.title}” 폴더를 지웠습니다. 프로젝트는 남아 있습니다.`, `Removed “${folderUndo.title}”. Projects stay.`, `已删除“${folderUndo.title}”文件夹。项目仍在。`, `「${folderUndo.title}」フォルダを消しました。プロジェクトは残ります。`)}</p>
          <button type="button" className="desktop-secondary" disabled={busy} onClick={() => void undoFolder()}>
            {t('되돌리기', 'Undo', '撤销', '元に戻す')}
          </button>
        </div>
      ) : null}
      {addingFolder ? (
        <form className="desktop-library-add" onSubmit={(event) => void createFolder(event)}>
          <input
            autoFocus
            value={folderName}
            maxLength={80}
            placeholder={t('폴더 이름', 'Folder name', '文件夹名', 'フォルダ名')}
            onChange={(event) => setFolderName(event.target.value)}
          />
          <button type="submit" className="desktop-secondary" disabled={!folderName.trim() || busy}>{t('만들기', 'Create', '创建', '作成')}</button>
        </form>
      ) : null}
      <div className="desktop-project-list desktop-library-list">
        {grouped.folders.map(({ folder, projects: items }) => (
          <details
            key={folder.id}
            className={dropId === folder.id ? 'desktop-library-folder is-drop' : 'desktop-library-folder'}
            open={!folded[folder.id]}
            onToggle={(event) => {
              const nextOpen = event.currentTarget.open;
              setFolded((current) => ({ ...current, [folder.id]: !nextOpen }));
            }}
            onDragOver={onDragOver(folder.id)}
            onDragLeave={() => setDropId((current) => (current === folder.id ? null : current))}
            onDrop={onDrop(folder.id)}
          >
            <summary onContextMenu={(event) => openFolderMenu(event, folder.id)}>
              <span>▸</span>
              {renaming?.kind === 'folder' && renaming.id === folder.id ? (
                <input
                  autoFocus
                  value={renaming.value}
                  onClick={(event) => event.preventDefault()}
                  onChange={(event) => setRenaming({ ...renaming, value: event.target.value })}
                  onBlur={() => void commitRename()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void commitRename();
                    }
                    if (event.key === 'Escape') setRenaming(null);
                  }}
                />
              ) : <b>{folder.title}</b>}
              <em>{items.length}</em>
            </summary>
            {items.length ? items.map(renderProject) : <p className="desktop-library-empty">{t('이 폴더는 비어 있습니다. 프로젝트를 끌어다 놓으세요.', 'This folder is empty. Drop a project here.', '这个文件夹是空的。把项目拖进来。', 'このフォルダは空です。プロジェクトをドロップしてください。')}</p>}
          </details>
        ))}
        <div
          className={dropId === '' ? 'desktop-library-unfiled is-drop' : 'desktop-library-unfiled'}
          onDragOver={onDragOver('')}
          onDragLeave={() => setDropId((current) => (current === '' ? null : current))}
          onDrop={onDrop(null)}
        >
          {folders.length ? <p className="desktop-library-label">{t('폴더 없음', 'No folder', '未分组', 'フォルダなし')}</p> : null}
          {grouped.unfiled.map(renderProject)}
        </div>
        {studioState === 'loading' && !projects.length ? <p className="desktop-side-empty">{t('Local Studio에 연결하는 중…', 'Connecting to Local Studio…', '正在连接本地工作室…', 'Local Studio に接続しています…')}</p> : null}
        {studioState === 'error' && !projects.length ? <p className="desktop-side-empty">{t('연결하지 못했습니다. 다시 시도하세요.', 'Could not connect. Retry from the banner.', '无法连接。请从横幅重试。', '接続できません。バナーから再試行してください。')}</p> : null}
        {studioState === 'ready' && !projects.length && !folders.length ? (
          <div className="desktop-side-empty">
            <p>{t('아직 컷이 없습니다. 가운데에서 제목을 적거나 영상을 놓으세요.', 'No cut yet. Write a title in the middle, or drop a video.', '还没有剪辑。请在中间写标题，或放进视频。', 'カットはまだありません。中央にタイトルを書くか、映像を置いてください。')}</p>
          </div>
        ) : null}
      </div>
      <details className="desktop-library-trash">
        <summary>
          <b>{t('휴지통', 'Trash', '废纸篓', 'ゴミ箱')}</b>
          <span>{trash.length}</span>
        </summary>
        <p>{t('복원하거나 비우세요. 책상을 연다고 30일 지난 항목이 지워지지는 않습니다.', 'Restore or empty it. Opening the desk does not delete items after 30 days.', '可还原或清空。打开工作台不会自动删除满 30 天的项目。', '復元するか空にしてください。デスクを開いても30日後に自動削除されません。')}</p>
        {expiry.expired || expiry.dueSoon ? (
          <div className="desktop-library-expiry">
            <p>
              {expiry.expired
                ? t(`만료 ${expiry.expired}개. 원하면 지금 지울 수 있습니다.`, `${expiry.expired} expired. You can delete them now.`, `${expiry.expired} 项已过期。可以现在删除。`, `期限切れ ${expiry.expired} 件。今すぐ消せます。`)
                : t(`${expiry.dueSoon}개가 3일 안에 만료됩니다.`, `${expiry.dueSoon} due within 3 days.`, `${expiry.dueSoon} 项将在 3 天内到期。`, `${expiry.dueSoon} 件が3日以内に期限切れです。`)}
            </p>
            {expiry.expired ? (
              <button
                type="button"
                className="desktop-secondary"
                disabled={busy}
                onClick={() => {
                  if (typeof window !== 'undefined' && !window.confirm(
                    t(
                      `만료된 ${expiry.expired}개를 지울까요? 프로젝트는 기록만 지우고 원본은 남습니다.`,
                      `Delete ${expiry.expired} expired items? Project records go; source files stay.`,
                      `要删除已过期的 ${expiry.expired} 项吗？项目只删记录，原片留下。`,
                      `期限切れ ${expiry.expired} 件を消しますか？プロジェクトは記録だけ消し、原本は残ります。`,
                    ),
                  )) return;
                  void run('/api/v2/trash/purge-expired', {}, t('만료된 항목을 지웠습니다.', 'Cleared expired trash.', '已清除过期项。', '期限切れを消しました。'));
                }}
              >
                {t('만료된 항목 지우기', 'Clear expired', '清除过期项', '期限切れを消す')}
              </button>
            ) : null}
          </div>
        ) : null}
        {!trash.length ? <p className="desktop-library-empty">{t('휴지통이 비어 있습니다.', 'Trash is empty.', '废纸篓是空的。', 'ゴミ箱は空です。')}</p> : null}
        {trash.map((item) => (
          <div key={item.id} className="desktop-library-trash-item">
            <div>
              <b>{item.title}</b>
              <small>
                {item.kind === 'file' ? t('파일', 'File', '文件', 'ファイル') : t('프로젝트', 'Project', '项目', 'プロジェクト')}
                {item.original_path ? ` · ${item.original_path}` : ''}
                · {t(`${trashDaysLeft(item.purge_after)}일 남음`, `${trashDaysLeft(item.purge_after)} days left`, `剩余 ${trashDaysLeft(item.purge_after)} 天`, `残り${trashDaysLeft(item.purge_after)}日`)}
              </small>
            </div>
            <button type="button" className="desktop-secondary" disabled={busy} onClick={() => void run(`/api/v2/trash/${item.id}/restore`, {}, t('복원했습니다.', 'Restored.', '已还原。', '復元しました。'))}>
              {t('복원', 'Restore', '还原', '復元')}
            </button>
            <button
              type="button"
              className="desktop-danger"
              disabled={busy}
              onClick={() => {
                if (item.kind === 'project') {
                  setSourceAction('keep');
                  setPurgePrompt({ id: item.id, title: item.title, hasSource: Boolean(item.has_source) });
                  return;
                }
                if (typeof window !== 'undefined' && !window.confirm(
                  t(
                    `${item.title}을 완전히 지울까요? 되돌릴 수 없습니다.`,
                    `Delete ${item.title} for good? This cannot be undone.`,
                    `要永久删除 ${item.title} 吗？无法恢复。`,
                    `${item.title} を完全に削除しますか？元に戻せません。`,
                  ),
                )) return;
                void run(`/api/v2/trash/${item.id}/purge`, {}, t('완전히 지웠습니다.', 'Deleted for good.', '已永久删除。', '完全に削除しました。'));
              }}
            >
              {t('지금 삭제', 'Delete now', '立即删除', '今すぐ削除')}
            </button>
          </div>
        ))}
        {trash.length ? (
          <button
            type="button"
            className="desktop-danger"
            disabled={busy}
            onClick={() => {
              if (typeof window !== 'undefined' && !window.confirm(
                t(
                  `휴지통 ${trash.length}개를 비울까요? 파일은 완전히 지워지고, 프로젝트는 기록만 지워지며 원본은 남습니다.`,
                  `Empty ${trash.length} trash items? Files are deleted for good. Project records go; source files stay.`,
                  `要清空 ${trash.length} 项吗？文件会永久删除。项目只删记录，原片留下。`,
                  `ゴミ箱の ${trash.length} 件を空にしますか？ファイルは完全に消え、プロジェクトは記録だけ消し、原本は残ります。`,
                ),
              )) return;
              void run('/api/v2/trash/empty', {}, t('휴지통을 비웠습니다.', 'Emptied the trash.', '已清空废纸篓。', 'ゴミ箱を空にしました。'));
            }}
          >
            {t('휴지통 비우기', 'Empty trash', '清空废纸篓', 'ゴミ箱を空にする')}
          </button>
        ) : null}
      </details>
      {menu ? (
        <div ref={menuRef} className="desktop-handoff-menu desktop-library-menu" style={{ left: menu.x, top: menu.y }} role="menu">
          {menu.kind === 'project' ? (
            <>
              <button type="button" role="menuitem" onClick={() => { onSelect(menu.id); setMenu(null); }}>{t('열기', 'Open', '打开', '開く')}</button>
              <button type="button" role="menuitem" onClick={() => {
                const project = projects.find((item) => item.id === menu.id);
                setRenaming({ kind: 'project', id: menu.id, value: project?.title ?? '' });
                setMenu(null);
              }}>{t('이름 변경', 'Rename', '重命名', '名前を変更')}</button>
              <button type="button" role="menuitem" onClick={() => setMenu({ ...menu, moveOpen: !menu.moveOpen })}>
                {t('폴더로 이동', 'Move to folder', '移到文件夹', 'フォルダへ移動')}
              </button>
              {menu.moveOpen ? (
                <div className="desktop-library-submenu">
                  <button type="button" role="menuitem" onClick={() => void run(`/api/v2/projects/${menu.id}/move`, { folder_id: null }, t('폴더에서 뺐습니다.', 'Removed from the folder.', '已移出文件夹。', 'フォルダから外しました。'))}>
                    {t('폴더 없음', 'No folder', '未分组', 'フォルダなし')}
                  </button>
                  {folders.map((folder) => (
                    <button key={folder.id} type="button" role="menuitem" onClick={() => void run(`/api/v2/projects/${menu.id}/move`, { folder_id: folder.id }, t('폴더로 옮겼습니다.', 'Moved to the folder.', '已移到文件夹。', 'フォルダへ移しました。'))}>
                      {folder.title}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" role="menuitem" className="is-danger" onClick={() => void trashProject(menu.id)}>
                {t('휴지통으로', 'Move to trash', '移到废纸篓', 'ゴミ箱へ')}
              </button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => {
                const folder = folders.find((item) => item.id === menu.id);
                setRenaming({ kind: 'folder', id: menu.id, value: folder?.title ?? '' });
                setMenu(null);
              }}>{t('이름 변경', 'Rename', '重命名', '名前を変更')}</button>
              <button type="button" role="menuitem" className="is-danger" onClick={() => void deleteFolder(menu.id)}>
                {t('폴더 삭제', 'Delete folder', '删除文件夹', 'フォルダを削除')}
              </button>
            </>
          )}
        </div>
      ) : null}
      {purgePrompt ? (
        <div className="desktop-library-dialog" role="dialog" aria-modal="true">
          <b>{t(`${purgePrompt.title} 기록을 지웁니다`, `Delete the record for ${purgePrompt.title}`, `删除 ${purgePrompt.title} 的记录`, `${purgePrompt.title} の記録を消します`)}</b>
          <p>
            {purgePrompt.hasSource
              ? t('원본 영상은 어떻게 할까요?', 'What should happen to the source file?', '原片文件要怎么处理？', '原本ファイルはどうしますか？')
              : t('이 컷의 원본 파일은 이미 없거나 이 워크스페이스 밖입니다. 기록만 지웁니다.', 'The source is already gone or outside this workspace. Only the record will be deleted.', '原片已不在或在工作区外。只会删除记录。', '原本はもうないか、このワークスペースの外です。記録だけ消します。')}
          </p>
          {purgePrompt.hasSource ? (
            <div className="desktop-library-choices">
              <label>
                <input type="radio" name="source-action" checked={sourceAction === 'keep'} onChange={() => setSourceAction('keep')} />
                <span>{t('기록만 삭제 — 원본은 그대로 둡니다', 'Record only — leave the source file', '只删记录 — 原片留下', '記録だけ削除 — 原本はそのまま')}</span>
              </label>
              <label>
                <input type="radio" name="source-action" checked={sourceAction === 'trash'} onChange={() => setSourceAction('trash')} />
                <span>{t('원본도 휴지통 — 파일은 30일 동안 복원할 수 있습니다', 'Also trash the source — file can be restored for 30 days', '原片也进废纸篓 — 30 天内可还原', '原本もゴミ箱へ — 30日間復元できます')}</span>
              </label>
              <label>
                <input type="radio" name="source-action" checked={sourceAction === 'delete'} onChange={() => setSourceAction('delete')} />
                <span>{t('원본까지 즉시 삭제 — 되돌릴 수 없습니다', 'Delete the source now — this cannot be undone', '连原片立即删除 — 无法恢复', '原本も今すぐ削除 — 元に戻せません')}</span>
              </label>
            </div>
          ) : null}
          <div className="desktop-library-dialog-actions">
            <button type="button" className="desktop-secondary" disabled={busy} onClick={() => { setPurgePrompt(null); setSourceAction('keep'); }}>
              {t('취소', 'Cancel', '取消', 'キャンセル')}
            </button>
            <button type="button" className="desktop-danger" disabled={busy} onClick={() => void confirmPurge()}>
              {t('삭제', 'Delete', '删除', '削除')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
