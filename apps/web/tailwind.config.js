/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F3F5F7',
        surface: '#FFFFFF',
        card: {
          DEFAULT: '#FFFFFF',
          soft: '#F0F2F5',
          mint: '#E8F8F0',
          sand: '#FFF4E5',
          sky: '#E8F1FF',
          rose: '#FFE8EE',
        },
        ink: {
          DEFAULT: '#111111',
          light: '#2A2A2A',
        },
        muted: '#6B7280',
        hairline: '#E5E7EB',
        navy: '#0A2540',
        blue: {
          DEFAULT: '#1D4ED8',
          light: '#E8F1FF',
        },
        teal: {
          DEFAULT: '#0F766E',
          light: '#E6F7F4',
        },
        green: {
          DEFAULT: '#059669',
          light: '#E8F8F0',
        },
        orange: {
          DEFAULT: '#D97706',
          light: '#FFF4E5',
        },
        red: {
          DEFAULT: '#DC2626',
          light: '#FEECEC',
        },
      },
      borderRadius: {
        card: '22px',
        panel: '28px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 17, 17, 0.06)',
        float: '0 18px 40px rgba(17, 17, 17, 0.08)',
        inset: 'inset 0 0 0 1px rgba(17,17,17,0.04)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Noto Sans Devanagari', 'Noto Sans Oriya', 'sans-serif'],
        display: ['Sora', '"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
