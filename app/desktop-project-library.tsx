'use client';

import { useEffect, useRef, useState, type DragEvent, type FormEvent, type MouseEvent } from 'react';
import {
  groupLibraryProjects,
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const grouped = groupLibraryProjects(projects, folders);

  useEffect(() => {
    if (!menu) return;
    const close = (event: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const run = async (path: string, body?: Record<string, unknown>, ok?: string) => {
    setBusy(true);
    try {
      await request(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      if (ok) onMessage(ok);
      await onRefresh();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : t('요청을 처리하지 못했습니다.', 'Could not complete that.', '无法完成该操作。', '処理できませんでした。'));
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
    await run(
      `/api/v2/projects/${id}/trash`,
      {},
      t('프로젝트를 휴지통으로 보냈습니다.', 'Moved the project to the trash.', '已将项目移到废纸篓。', 'プロジェクトをゴミ箱へ移しました。'),
    );
    if (selectedId === id) onSelect('');
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
        <p>{t('복원하거나, 비우거나, 30일 뒤 자동으로 지워집니다.', 'Restore, empty, or it deletes itself after 30 days.', '可还原、清空，或 30 天后自动删除。', '復元、空にする、または30日後に自動削除。')}</p>
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
                  `휴지통 ${trash.length}개를 모두 완전히 지울까요? 되돌릴 수 없습니다.`,
                  `Permanently delete all ${trash.length} trash items? This cannot be undone.`,
                  `要永久清空废纸篓中的 ${trash.length} 项吗？无法恢复。`,
                  `ゴミ箱の ${trash.length} 件を完全に削除しますか？元に戻せません。`,
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
              <button type="button" role="menuitem" className="is-danger" onClick={() => void run(`/api/v2/project-folders/${menu.id}/delete`, {}, t('폴더를 지웠습니다. 프로젝트는 남아 있습니다.', 'Deleted the folder. Projects stay.', '已删除文件夹。项目仍在。', 'フォルダを消しました。プロジェクトは残ります。'))}>
                {t('폴더 삭제', 'Delete folder', '删除文件夹', 'フォルダを削除')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
