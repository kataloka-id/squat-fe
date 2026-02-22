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
        // Accenture-inspired Palette
        // Primary Accent: Vivid Purple (#A100FF)
        brand: {
          50: '#fbf5ff',
          100: '#f5eaff',
          200: '#ebd6ff',
          300: '#daadff',
          400: '#c27aff',
          500: '#a100ff', // Primary Brand Color
          600: '#8a00d6', // Hover
          700: '#7500b3',
          800: '#630094',
          900: '#460073', // Deep Purple
          950: '#24003b',
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
        glow: '0 0 15px rgba(161, 0, 255, 0.3)', // Purple glow
      },
    },
  },
  plugins: [],
};
