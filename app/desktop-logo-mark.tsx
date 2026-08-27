export function DesktopLogoMark({ title = 'Grok Crew' }: { title?: string }) {
  return (
    <svg className="desktop-logo-mark" viewBox="0 0 32 32" role="img">
      {title ? <title>{title}</title> : null}
      <rect x="13.4" y="8.8" width="5.2" height="14.4" rx="2.6" fill="currentColor" />
      <path
        d="M12 24.4A8.4 9.2 0 0 0 12 7.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
      <path
        d="M20 7.6A8.4 9.2 0 0 1 20 24.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
