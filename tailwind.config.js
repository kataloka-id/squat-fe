/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        qamaster: {
          primary: '#460073', // Deep Accenture Purple
          secondary: '#a100ff', // Vivid Violet
          dark: '#0f0024', // Almost Black Purple
          accent: '#e6007e', // Pinkish accent
        },
        brand: {
          50: 'rgb(var(--company-brand-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--company-brand-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--company-brand-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--company-brand-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--company-brand-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--company-brand-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--company-brand-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--company-brand-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--company-brand-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--company-brand-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--company-brand-950-rgb) / <alpha-value>)',
        },
        // Override Slate with Neutral Grays + Pure Black for a sharp Corporate look
        slate: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          850: '#111111', // Almost black
          900: '#000000', // Pure Black (Sidebar)
          950: '#030712',
        },
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0, 0, 0, 0.03)',
        glow: '0 0 15px rgb(var(--company-brand-500-rgb) / 0.3)',
      },
    },
  },
  plugins: [],
};
