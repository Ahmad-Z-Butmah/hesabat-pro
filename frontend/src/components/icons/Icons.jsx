/**
 * مجموعة أيقونات SVG خفيفة.
 * كل أيقونة تستخدم currentColor حتى يتحكم CSS بلونها،
 * وتقبل الخاصية size لتحديد الحجم.
 */
const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
})

export const Bars = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M5 19V12M10 19V6M15 19V14M20 19V9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const Bell = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const ChevronDown = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ChevronRight = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Pin = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

export const Plus = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
)

export const Search = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20.5 20.5 16.8 16.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const Edit = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M4 20h4L18 10l-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

export const Doc = ({ size = 24 }) => (
  <svg {...base(size)}>
    <rect x="5" y="3" width="14" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const Cash = ({ size = 24 }) => (
  <svg {...base(size)}>
    <rect x="3" y="6.5" width="18" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 9v6M18 9v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const Envelope = ({ size = 20 }) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Lock = ({ size = 20 }) => (
  <svg {...base(size)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.4" fill="currentColor" />
  </svg>
)

export const Eye = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

export const Building = ({ size = 20 }) => (
  <svg {...base(size)}>
    <rect x="5" y="4" width="14" height="16" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const ArrowLeft = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M15 12H5M9 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Home = ({ size = 24 }) => (
  <svg {...base(size)}>
    <path d="M4 11l8-6 8 6M6 10v9h12v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Bag = ({ size = 24 }) => (
  <svg {...base(size)}>
    <path d="M6.5 8h11l-1 12h-9l-1-12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

export const Fork = ({ size = 24 }) => (
  <svg {...base(size)}>
    <path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M16 3c-1.6 0-2.8 2.2-2.8 5.2 0 2.6 1.1 3.8 2.8 3.8m0 0v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Coffee = ({ size = 24 }) => (
  <svg {...base(size)}>
    <path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M16 10h2.5a2 2 0 0 1 0 4H16" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8 3v2M11.5 3v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const Grid = ({ size = 24 }) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

export const TrendUp = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M4 15l5-5 3 3 7-7M15 6h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const TrendDown = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M4 9l5 5 3-3 7 7M15 18h5v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Printer = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M7 8V3h10v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <rect x="3" y="8" width="18" height="9" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
    <path d="M7 14h10v7H7v-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M7.5 11.3h1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const Dots = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="5" cy="12" r="1.7" fill="currentColor" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    <circle cx="19" cy="12" r="1.7" fill="currentColor" />
  </svg>
)
