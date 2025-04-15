/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        fade: 'fadeIn 0.4s ease-in-out',
        pulseSlow: 'pulse 2s ease-in-out infinite',
        pingFast: 'ping 0.7s cubic-bezier(0, 0, 0.2, 1) infinite',
        bounceChat: 'bounceIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      boxShadow: {
        chat: '0 4px 12px rgba(0,0,0,0.08)',
      },
      colors: {
        brand: {
          DEFAULT: '#2563eb',
          dark: '#1e40af',
          light: '#dbeafe',
        },
        bg: {
          DEFAULT: '#f9fafb',
          soft: '#f3f4f6',
          hard: '#e5e7eb',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
