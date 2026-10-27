/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: {
          bg: '#F6F5F1',
          surface: '#FFFFFF',
          'surface-2': '#EFEDE7',
          border: '#DAD6CC',
          'border-strong': '#8C8A82',
        },
        civic: {
          text: '#1B1F24',
          muted: '#5B6068',
          primary: '#1F3A5F',
          'primary-hover': '#17304F',
          sidebar: '#14233A',
          'sidebar-text': '#E8EDF3',
          'sidebar-muted': '#A9B6C6',
          accent: '#8A4B08',
          focus: '#1F6FEB',
        },
        status: {
          high: { text: '#B42318', bg: '#FDECEA', border: '#F8B7B2' },
          medium: { text: '#9A4A00', bg: '#FFF3E0', border: '#FCD299' },
          info: { text: '#175CD3', bg: '#E8F0FE', border: '#B8D5FA' },
          ok: { text: '#067647', bg: '#E6F4EC', border: '#A8E2C2' },
        },
        chart: {
          1: '#2a78d6',
          2: '#eb6834',
          3: '#1baf7a',
          4: '#eda100',
        },
        // Legacy dark theme colors kept for unmigrated components
        surface: {
          DEFAULT: '#0a0f1e',
          secondary: '#0d1528',
          card: '#111827',
        }
      },
      borderRadius: {
        control: '4px',
        card: '6px',
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.25s ease-out',
        'pulse-slow': 'pulse-slow 2.5s ease-in-out infinite',
      }
    }
  },
  plugins: []
}
