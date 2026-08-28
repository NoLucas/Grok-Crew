'use client';

import { DesktopLogoMark } from './desktop-logo-mark';
import { type AppLanguage } from './language';

const CHOICES: Array<{ id: AppLanguage; name: string; code: string }> = [
  { id: 'en', name: 'English', code: 'EN' },
  { id: 'ko', name: '한국어', code: 'KO' },
  { id: 'zh', name: '中文', code: 'ZH' },
  { id: 'ja', name: '日本語', code: 'JA' },
];

export const LANGUAGE_GATE_BODY_CLASS = 'desktop-body desktop-language-first';

type Props = {
  onPick: (language: AppLanguage) => void;
};

export function DesktopLanguageGate({ onPick }: Props) {
  return (
    <section className="desktop-language-gate" role="dialog" aria-modal="true" aria-label="Language">
      <div className="desktop-language-gate-brand" aria-hidden="true">
        <span className="desktop-logo"><DesktopLogoMark /></span>
        <span>GROK <em>CREW</em></span>
      </div>
      <div className="desktop-language-terminal">
        <div className="desktop-language-terminal-top">
          <span className="desktop-language-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>grok-crew</span>
        </div>
        <div className="desktop-language-choices">
          {CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="desktop-language-choice"
              onClick={() => onPick(choice.id)}
            >
              <span aria-hidden="true">›</span>
              <b>{choice.name}</b>
              <em>{choice.code}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
