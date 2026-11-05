import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  sparkles: (
    <>
      <path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v5h7V4" />
      <path d="M8 20v-6h8v6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  check: <path d="M5 12l5 5 9-10" />,
  building: (
    <>
      <path d="M5 21V4h9v17" />
      <path d="M14 9h5v12" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </>
  ),
  undo: (
    <>
      <path d="M9 7L4 12l5 5" />
      <path d="M4 12h10a6 6 0 010 8" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 10-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  gavel: (
    <>
      <path d="M14 4l6 6-3 3-6-6z" />
      <path d="M11 7L4 14l3 3 7-7" />
      <path d="M4 21h9" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4h3l8 5V5L7 10z" />
      <path d="M19 9a4 4 0 010 6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
