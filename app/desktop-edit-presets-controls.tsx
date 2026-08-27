'use client';

import { useEffect, useState } from 'react';
import {
  CUSTOM_EDIT_PRESET,
  CUSTOM_EDIT_PRESET_ID,
  applyEditPreset,
  findEditPreset,
  listEditPresetOptions,
  methodsMatch,
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
  const [pickedId, setPickedId] = useState(CUSTOM_EDIT_PRESET_ID);
  const [appliedId, setAppliedId] = useState(CUSTOM_EDIT_PRESET_ID);
  const [presetName, setPresetName] = useState('');
  const options = listEditPresetOptions(store);
  const picked = findEditPreset(store, pickedId) ?? CUSTOM_EDIT_PRESET;
  const canAssign = picked.kind !== 'custom';

  useEffect(() => {
    if (appliedId === CUSTOM_EDIT_PRESET_ID) return;
    const applied = findEditPreset(store, appliedId);
    if (!applied || applied.kind === 'custom') return;
    if (methodsMatch(method, applied.method, { lockQuality })) return;
    setAppliedId(CUSTOM_EDIT_PRESET_ID);
    setPickedId((current) => (current === appliedId ? CUSTOM_EDIT_PRESET_ID : current));
  }, [appliedId, lockQuality, method, store]);

  const assignPicked = () => {
    if (!canAssign) return;
    onApply(applyEditPreset(method, picked.method, { lockQuality }));
    setAppliedId(picked.id);
    rememberSelection(picked.id);
  };

  const saveCurrent = () => {
    savePreset(presetName, method);
  };

  const removePicked = () => {
    if (picked.kind !== 'saved') return;
    deletePreset(picked.id);
    setPickedId(CUSTOM_EDIT_PRESET_ID);
    if (appliedId === picked.id) setAppliedId(CUSTOM_EDIT_PRESET_ID);
  };

  return (
    <div className="desktop-edit-presets">
      <div className="desktop-edit-presets-apply">
        <label>
          {t('편집 스타일', 'Edit style', '剪辑风格', '編集スタイル')}
          <select
            value={pickedId}
            onChange={(event) => setPickedId(event.target.value || CUSTOM_EDIT_PRESET_ID)}
            aria-label={t('편집 스타일', 'Edit style', '剪辑风格', '編集スタイル')}
          >
            <option value={CUSTOM_EDIT_PRESET_ID}>{presetLabel(CUSTOM_EDIT_PRESET, language)}</option>
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
        <button type="button" className="desktop-secondary" disabled={!canAssign} onClick={assignPicked}>
          {t('스타일 지정', 'Assign style', '指定风格', 'スタイルを指定')}
        </button>
      </div>
      <p>{picked.kind === 'custom'
        ? presetHint(CUSTOM_EDIT_PRESET, language)
        : t(
          `${presetHint(picked, language)}. 지정해야 아래에 반영됩니다.`,
          `${presetHint(picked, language)}. Assign to fill the controls.`,
          `${presetHint(picked, language)}。指定后才会填到下方。`,
          `${presetHint(picked, language)}。指定すると下に入ります。`,
        )}</p>
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
        {picked.kind === 'saved' ? (
          <button type="button" className="desktop-danger" onClick={removePicked}>
            {t('이 스타일 삭제', 'Delete style', '删除样式', 'このスタイルを削除')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
