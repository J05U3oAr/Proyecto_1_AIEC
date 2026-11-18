import baseConfig from './tailwind.config.js';

export default {
  ...baseConfig,
  important: '[data-agichat-widget]',
  corePlugins: { preflight: false },
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/sdk/**/*.{js,ts,jsx,tsx}',
    './src/store/**/*.{js,ts,jsx,tsx}',
  ],
};
