export const colors = {
  // Pure Clean Professional White Canvas
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  canvasBg: '#F8FAFC',
  cardSoft: '#F1F5F9',
  border: '#E2E8F0',
  hairline: '#F1F5F9',

  // Iconic Vibrant Card Colors (from the cool doctor design)
  cardLime: '#B4F481',
  cardYellow: '#FCE354',
  cardLavender: '#E9D5FF',
  cardSky: '#BAE6FD',
  cardTeal: '#99F6E4',

  // Interactive Elements
  pillBlack: '#0F172A',
  pillWhite: '#FFFFFF',
  pillGreen: '#B4F481',
  pillYellow: '#FCE354',

  // Ink & Typography
  ink: '#0F172A',
  inkLight: '#334155',
  muted: '#64748B',
  subtle: '#94A3B8',

  // Brand Palette
  navy: '#0B2A5B',
  blue: '#2563EB',
  blueLight: '#EFF6FF',

  // Clinical Semantic Status
  teal: '#0D9488',
  tealLight: '#F0FDFA',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  red: '#E11D48',
  redLight: '#FFF1F2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenPadding: 18,
  cardPadding: 16,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  card: 28,
  sheet: 36,
  pill: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

export const typography = {
  fontFamilies: {
    headingBold: 'SpaceGrotesk-Bold',
    headingSemiBold: 'SpaceGrotesk-SemiBold',
    body: 'Inter-Regular',
    bodyMedium: 'Inter-Medium',
    bodySemiBold: 'Inter-SemiBold',
    bodyBold: 'Inter-Bold',
    devanagari: 'NotoSansDevanagari-Regular',
    devanagariBold: 'NotoSansDevanagari-Bold',
    oriya: 'NotoSansOriya-Regular',
    oriyaBold: 'NotoSansOriya-Bold',
  },
  sizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 15,
    bodySmall: 13,
    caption: 11,
    badge: 10,
  },
} as const;

export const layout = {
  buttonHeight: 52,
  minTouchTarget: 48,
  inputHeight: 52,
  headerHeight: 56,
} as const;
