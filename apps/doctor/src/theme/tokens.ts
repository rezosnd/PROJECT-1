export const colors = {
  background: '#F4F7F2',
  surface: '#FFFFFF',
  forest: '#0B3D1A',
  lime: '#B9F84B',
  ink: '#111111',
  muted: '#64748B',
  border: '#E2E8F0',
  red: '#E11D48',
  orange: '#EA580C',
  teal: '#0D9488',
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
};
