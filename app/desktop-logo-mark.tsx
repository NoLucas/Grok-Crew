export function DesktopLogoMark({ title = 'Grok Crew' }: { title?: string }) {
  return (
    <svg className="desktop-logo-mark" viewBox="0 0 32 32" role="img">
      {title ? <title>{title}</title> : null}
      <defs>
        <mask id="grok-crew-logo-reel">
          <rect width="32" height="32" fill="#fff" />
          <rect x="13.6" y="10.8" width="4.8" height="10.4" rx="2.4" fill="#000" />
        </mask>
      </defs>
      <g fill="currentColor" mask="url(#grok-crew-logo-reel)">
        <circle cx="16" cy="11.9" r="6.4" />
        <circle cx="19.5" cy="18.1" r="6.4" />
        <circle cx="12.5" cy="18.1" r="6.4" />
      </g>
    </svg>
  );
}
