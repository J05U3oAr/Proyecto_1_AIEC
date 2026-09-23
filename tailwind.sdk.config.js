import baseConfig from './tailwind.config.js';

export default {
  ...baseConfig,
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/sdk/**/*.{js,ts,jsx,tsx}',
    './src/store/**/*.{js,ts,jsx,tsx}',
  ],
};
