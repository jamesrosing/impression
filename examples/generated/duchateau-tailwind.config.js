/** @type {import('tailwindcss').Config} */
// Generated from: https://duchateau.com/
// Extracted: 2026-01-05T18:14:35.518Z
// Character: Luxury/editorial aesthetic with high contrast black/white palette, warm cream secondary, and pink accents. Typography-forward with dramatic scale. Minimal border-radius for sharp, architectural feel. WordPress/Elementor with Shopify integration.

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        secondarytext: '#333333',
        background: {
          DEFAULT: '#ffffff',
          secondary: '#fbf9f4',
          tertiary: '#000000'
        },
        foreground: {
          DEFAULT: '#000000',
          secondary: '#333333',
          muted: '#ffffff'
        },
        border: {
          DEFAULT: '#000000',
          secondary: '#333333'
        },
        accent: {
          DEFAULT: '#fbf9f4'
        },
        warmbackground: '#fbf9f4',
        nearblack: '#121212',
        linkblue: '#1863dc'
      },
      fontFamily: {
        serif: ['"beaufort-pro"', 'system-ui', 'sans-serif'],
        display: ['"ABC Social Condensed Bold"', 'system-ui', 'sans-serif'],
        sans: ['"Suisse Intl Regular"', 'system-ui', 'sans-serif']
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.4' }],
        '3xl': ['24px', { lineHeight: '1.2' }],
        '4xl': ['26px', { lineHeight: '1.2' }],
        '5xl': ['30px', { lineHeight: '1.2' }],
        '6xl': ['32px', { lineHeight: '1.2' }],
        '7xl': ['36px', { lineHeight: '1.2' }],
        '8xl': ['40px', { lineHeight: '1.1' }],
        '9xl': ['80px', { lineHeight: '1.1' }]
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700'
      },
      spacing: {
        1: '5px',
        2: '8px',
        '[10px]': '10px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        12: '48px',
        14: '56px',
        18: '72px',
        20: '80px',
        24: '96px',
        32: '128px',
        40: '160px'
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '2px',
        md: '6px',
        full: '50px'
      },
      boxShadow: {
        subtleelevation: 'rgba(0, 0, 0, 0.5) 0px 8px 13px -8px',
        topglow: 'rgba(172, 171, 171, 0.3) 0px -1px 10px 0px',
        modalshadow: 'rgba(0, 0, 0, 0.3) 0px 32px 68px 0px',
        sideshadow: 'rgba(0, 0, 0, 0.1) -17px 0px 35px 0px'
      },
      screens: {
        sm: '576px',
        md: '768px',
        lg: '992px',
        xl: '1200px',
        '2xl': '1440px',
        '1600': '1600px',
        '1920': '1920px'
      },
      transitionDuration: {
        fast: '100ms',
        normal: '200ms',
        DEFAULT: '300ms',
        slow: '400ms',
        slower: '500ms'
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
        in: 'ease-in-out',
        out: 'cubic-bezier(0, 0.33, 0.07, 1.03)'
      }
    }
  }
};
