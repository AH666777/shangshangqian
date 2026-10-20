/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
    "./css/style.css",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FFF9E6',
          100: '#FFF3CC',
          200: '#FFE799',
          300: '#FFDB66',
          400: '#FFD133',
          500: '#FFC107',
          600: '#D4A005',
          700: '#A87F04',
          800: '#7C5E03',
          900: '#503C02'
        },
        fortune: {
          red: '#C41E3A',
          gold: '#D4A017',
          green: '#2E7D32',
          blue: '#1565C0',
          purple: '#7B1FA2'
        }
      },
      fontFamily: {
        brush: ['"STKaiti"', '"KaiTi"', '"楷体"', 'serif'],
        display: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif']
      },
      // 说明：仅保留页面真正使用 animate-xxx 工具类的动画。
      // 通过自定义 CSS 引用的关键帧（shake / particle）定义在 css/style.css 中，
      // 因为 Tailwind 只会为已使用的工具类输出 @keyframes。
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pop': 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'slideUp': 'slideUp 0.4s ease-out forwards',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pop: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '60%': { transform: 'scale(1.15) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    }
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}