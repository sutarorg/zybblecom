import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

export function GmailIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2.3" fill="#F1F3F4" />
      <path
        fill="#4285F4"
        d="M2 6.3 6 9.2V20H4.3A2.3 2.3 0 0 1 2 17.7V6.3z"
      />
      <path
        fill="#34A853"
        d="M22 6.3 18 9.2V20h1.7a2.3 2.3 0 0 0 2.3-2.3V6.3z"
      />
      <path
        fill="#EA4335"
        d="M2 6.3V5.1A2.3 2.3 0 0 1 4.3 4h15.4A2.3 2.3 0 0 1 22 5.1v1.2L12 13.3 2 6.3z"
      />
    </svg>
  );
}

export function GoogleIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function LinkedInIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        fill="#ffffff"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"
      />
    </svg>
  );
}

export function HubSpotIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <path
        d="m13.4 10.6 5-5M10.6 13.4l-5 5"
        stroke="#FF7A59"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.6" fill="#FF7A59" />
      <circle
        cx="19.4"
        cy="4.6"
        r="2.3"
        fill="none"
        stroke="#FF7A59"
        strokeWidth="1.8"
      />
      <circle
        cx="4.6"
        cy="19.4"
        r="2.3"
        fill="none"
        stroke="#FF7A59"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SalesforceIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <path
        fill="#00A1E0"
        d="M8.1 18.9a4.7 4.7 0 0 1-.9-9.3 5.9 5.9 0 0 1 5.5-4 5.9 5.9 0 0 1 5.6 4.3 4.2 4.2 0 0 1-.7 8.3H8.1z"
      />
      <path
        fill="#ffffff"
        opacity="0.85"
        d="M9.1 13.1c.3-.9 1-1.4 1.9-1.4.6 0 1.1.2 1.5.6.3-.4.9-.6 1.4-.6 1 0 1.8.7 1.9 1.7.6.2 1 .7 1 1.3 0 .8-.7 1.4-1.5 1.4H9.6a1.6 1.6 0 0 1-.5-3z"
      />
    </svg>
  );
}

export function SlackIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <rect x="2.4" y="5.3" width="8.6" height="3.4" rx="1.7" fill="#36C5F0" />
      <circle cx="13.6" cy="7" r="1.7" fill="#36C5F0" />
      <rect x="15.3" y="2.4" width="3.4" height="8.6" rx="1.7" fill="#2EB67D" />
      <circle cx="17" cy="13.6" r="1.7" fill="#2EB67D" />
      <rect x="13" y="15.3" width="8.6" height="3.4" rx="1.7" fill="#ECB22E" />
      <circle cx="10.4" cy="17" r="1.7" fill="#ECB22E" />
      <rect x="5.3" y="13" width="3.4" height="8.6" rx="1.7" fill="#E01E5A" />
      <circle cx="7" cy="10.4" r="1.7" fill="#E01E5A" />
    </svg>
  );
}

export function OutlookIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#0F6CBD" />
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.8"
      />
    </svg>
  );
}

export function ZoomIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#2D8CFF" />
      <path
        fill="#ffffff"
        d="M6.2 8.6h7.4a1.2 1.2 0 0 1 1.2 1.2v4.4a1.2 1.2 0 0 1-1.2 1.2H6.2a1.2 1.2 0 0 1-1.2-1.2V9.8a1.2 1.2 0 0 1 1.2-1.2zm9.8 2.3 3-1.9v6l-3-1.9v-2.2z"
      />
    </svg>
  );
}
