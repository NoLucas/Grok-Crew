'use client';

import { useState } from 'react';
import {
  applyEditPreset,
  findEditPreset,
  listEditPresetOptions,
  presetHint,
  presetLabel,
  useDesktopEditPresets,
  type EditMethodSnapshot,
} from './desktop-edit-presets';
import { useLanguage } from './language';

type Props = {
  method: EditMethodSnapshot;
  lockQuality: boolean;
  onApply: (next: EditMethodSnapshot) => void;
};

export function DesktopEditPresetControls({ method, lockQuality, onApply }: Props) {
  const { t, language } = useLanguage();
  const { store, rememberSelection, savePreset, deletePreset } = useDesktopEditPresets();
  const [selectedId, setSelectedId] = useState('');
  const [presetName, setPresetName] = useState('');
  const options = listEditPresetOptions(store);
  const selected = findEditPreset(store, selectedId);

  const applyId = (id: string) => {
    setSelectedId(id);
    rememberSelection(id);
    if (!id) return;
    const preset = findEditPreset(store, id);
    if (!preset) return;
    if (preset.kind === 'saved') setPresetName(preset.name.ko);
    onApply(applyEditPreset(method, preset.method, { lockQuality }));
  };

  const saveCurrent = () => {
    const next = savePreset(presetName, method);
    if (!next) return;
    const id = next.lastSelectedId;
    setSelectedId(id);
    const saved = findEditPreset(next, id);
    if (saved) setPresetName(saved.name.ko);
  };

  const removeCurrent = () => {
    if (!selected || selected.kind !== 'saved') return;
    deletePreset(selected.id);
    setSelectedId('');
    setPresetName('');
  };

  return (
    <div className="desktop-edit-presets">
      <div className="desktop-edit-presets-row">
        <label>
          {t('편집 스타일', 'Edit style', '剪辑风格', '編集スタイル')}
          <select
            value={selectedId}
            onChange={(event) => applyId(event.target.value)}
            aria-label={t('편집 스타일', 'Edit style', '剪辑风格', '編集スタイル')}
          >
            <option value="">{t('스타일을 고르면 아래 값이 채워집니다', 'Pick a style to fill the controls', '选择风格以填入下方选项', 'スタイルを選ぶと下の値が入ります')}</option>
            <optgroup label={t('플랫폼 스타일', 'Platform styles', '平台风格', 'プラットフォーム')}>
              {options.filter((item) => item.kind === 'builtin').map((item) => (
                <option key={item.id} value={item.id}>{presetLabel(item, language)}</option>
              ))}
            </optgroup>
            {store.saved.length > 0 ? (
              <optgroup label={t('내가 저장한 스타일', 'Saved styles', '已保存样式', '保存したスタイル')}>
                {options.filter((item) => item.kind === 'saved').map((item) => (
                  <option key={item.id} value={item.id}>{presetLabel(item, language)}</option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
      </div>
      <p>{selected
        ? presetHint(selected, language)
        : t('유튜브 쇼츠, 인스타 릴스, 틱톡 등에서 고르거나, 지금 값을 이름으로 저장합니다.', 'Choose Shorts, Reels, TikTok, or save the current knobs under a name.', '可选 Shorts、Reels、TikTok，或把当前选项存成名字。', 'ショート・リール・TikTok を選ぶか、今の値を名前で保存します。')}</p>
      <div className="desktop-edit-presets-save">
        <label>
          {t('내 스타일 이름', 'Style name', '样式名称', 'スタイル名')}
          <input
            value={presetName}
            maxLength={40}
            placeholder={t('예: 밤 브이로그', 'e.g. Night vlog', '例如：夜间 vlog', '例: 夜のVlog')}
            onChange={(event) => setPresetName(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="desktop-secondary"
          disabled={!presetName.trim()}
          onClick={saveCurrent}
        >
          {t('스타일 저장', 'Save style', '保存样式', 'スタイルを保存')}
        </button>
        {selected?.kind === 'saved' ? (
          <button type="button" className="desktop-danger" onClick={removeCurrent}>
            {t('이 스타일 삭제', 'Delete style', '删除样式', 'このスタイルを削除')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
