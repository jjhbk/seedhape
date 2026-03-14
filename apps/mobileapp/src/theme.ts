export const C = {
  // Backgrounds
  bg:              '#09090B', // zinc-950
  surface:         '#18181B', // zinc-900
  surfaceHigh:     '#27272A', // zinc-800

  // Borders
  border:          '#3F3F46', // zinc-700
  borderDim:       '#27272A', // zinc-800

  // Green (payment success / brand)
  green:           '#22C55E', // green-500
  greenBright:     '#4ADE80', // green-400
  greenDim:        '#16A34A', // green-600
  greenSurface:    '#052E16', // green-950
  greenBorder:     '#166534', // green-800

  // Status colors
  red:             '#F87171', // red-400
  redSurface:      '#2D0A0A',
  redBorder:       '#7F1D1D',

  amber:           '#FCD34D', // amber-300
  amberSurface:    '#1C1400',
  amberBorder:     '#78350F',

  blue:            '#60A5FA', // blue-400
  blueSurface:     '#0A1929',
  blueBorder:      '#1E3A5F',

  // Text
  text:            '#F4F4F5', // zinc-100
  textSub:         '#A1A1AA', // zinc-400
  textMuted:       '#71717A', // zinc-500
} as const;

export const STATUS_SCHEME: Record<string, { surface: string; text: string; border: string }> = {
  VERIFIED:  { surface: C.greenSurface,  text: C.greenBright, border: C.greenBorder },
  RESOLVED:  { surface: C.blueSurface,   text: C.blue,        border: C.blueBorder },
  PENDING:   { surface: C.amberSurface,  text: C.amber,       border: C.amberBorder },
  CREATED:   { surface: C.surfaceHigh,   text: C.textSub,     border: C.border },
  DISPUTED:  { surface: C.amberSurface,  text: C.amber,       border: C.amberBorder },
  EXPIRED:   { surface: C.surface,       text: C.textMuted,   border: C.borderDim },
  REJECTED:  { surface: C.redSurface,    text: C.red,         border: C.redBorder },
};
