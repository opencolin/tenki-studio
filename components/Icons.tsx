import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Cloud = (p: P) => (
  <Svg {...p}>
    <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.6A4 4 0 0 0 7 19h10.5z" />
  </Svg>
);
export const ChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const ChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const ChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);
export const PanelIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M9.5 4v16" />
  </Svg>
);
export const Bolt = (p: P) => (
  <Svg {...p}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </Svg>
);
export const Stack = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="7" rx="1.5" />
    <rect x="3" y="14" width="18" height="7" rx="1.5" />
  </Svg>
);
export const Pencil = (p: P) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5l4 4L7 21l-5 1 1-5L16.5 3.5z" />
  </Svg>
);
export const People = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 11a3.5 3.5 0 1 0-2-6.4" />
    <path d="M17.5 13.6A6.5 6.5 0 0 1 21.5 20" />
  </Svg>
);
export const Wrench = (p: P) => (
  <Svg {...p}>
    <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z" />
  </Svg>
);
export const Book = (p: P) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Svg>
);
export const Waves = (p: P) => (
  <Svg {...p}>
    <path d="M3 7c3 0 3 2 6 2s3-2 6-2 3 2 6 2" />
    <path d="M3 13c3 0 3 2 6 2s3-2 6-2 3 2 6 2" />
  </Svg>
);
export const Link = (p: P) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
);
export const Key = (p: P) => (
  <Svg {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.8 12.2L21 2l-3 0 0 3-2 0 0 2-2 0-1.2 1.2" />
  </Svg>
);
export const Chart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V10" />
    <path d="M12 20V4" />
    <path d="M20 20v-7" />
  </Svg>
);
export const Card = (p: P) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M2.5 10h19" />
  </Svg>
);
export const Gear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.38 2.54a7 7 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .47.05.94.14 1.4l-2 1.55 2 3.46 2.36-.95a7 7 0 0 0 2.42 1.4l.38 2.54h3.4l.38-2.54a7 7 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.09-.46.14-.93.14-1.4z" />
  </Svg>
);
export const Search = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
);
export const Sparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8L12 3z" />
  </Svg>
);
export const User = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
export const Clipboard = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="3.5" width="12" height="17" rx="2" />
    <path d="M9 3.5v2h6v-2" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </Svg>
);
export const Clock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </Svg>
);
export const Undo = (p: P) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Svg>
);
export const Plus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);
export const Minus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const Fit = (p: P) => (
  <Svg {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </Svg>
);
export const Warning = (p: P) => (
  <Svg strokeWidth={2.3} {...p}>
    <path d="M12 3L2 20h20L12 3z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.5" />
  </Svg>
);
export const Check = (p: P) => (
  <Svg strokeWidth={3} {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Svg>
);
export const CheckCircle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 5-5.5" />
  </Svg>
);
export const X = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Svg>
);
export const Share = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path d="M8.7 10.6l6.6-3.2" />
    <path d="M8.7 13.4l6.6 3.2" />
  </Svg>
);
export const Download = (p: P) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
);
export const Dots = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);
export const Play = ({ size = 12, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M6 4l14 8-14 8V4z" />
  </svg>
);
export const Stop = ({ size = 11, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);
export const Cursor = ({ size = 15, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M5 3l14 8.5-6.2 1.4L9.6 19z" />
  </svg>
);
export const Hand = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2.2-4a1.5 1.5 0 0 1 2.4-1.7L8 14" />
  </Svg>
);
export const Comment = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.5A7.5 7.5 0 1 1 20 12z" />
  </Svg>
);
export const Code = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M8 8l-4 4 4 4" />
    <path d="M16 8l4 4-4 4" />
  </Svg>
);
export const File = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
    <path d="M14 3v5h5" />
  </Svg>
);
export const Image = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 16l5-4 5 4 3-2 3 2.5" />
  </Svg>
);
export const Copy = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
);
export const Star = ({ size = 15, filled, ...rest }: P & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />
  </svg>
);
export const Sun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const Moon = (p: P) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Svg>
);
export const Crew = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="12" cy="18" r="2.5" />
    <path d="M6 8.5v3A2.5 2.5 0 0 0 8.5 14h7A2.5 2.5 0 0 0 18 11.5v-3" />
    <path d="M12 14v1.5" />
  </Svg>
);
export const Arrow = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </Svg>
);
export const External = (p: P) => (
  <Svg {...p}>
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </Svg>
);
export const Trash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
    <path d="M6.5 7l1 13h9l1-13" />
  </Svg>
);
export const Refresh = (p: P) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.3" />
    <path d="M21 3v6h-6" />
  </Svg>
);
export const Clip = (p: P) => (
  <Svg {...p}>
    <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 5a3.7 3.7 0 0 1 5.2 5.2L10 18.4a1.85 1.85 0 0 1-2.6-2.6L15 8.2" />
  </Svg>
);
export const Menu = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h10" />
  </Svg>
);
export const Box = (p: P) => (
  <Svg {...p}>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Svg>
);
