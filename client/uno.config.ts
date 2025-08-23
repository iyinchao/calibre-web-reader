import { defineConfig, presetIcons } from 'unocss';
import { presetWind3 } from '@unocss/preset-wind3';

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  theme: {
    colors: {
      primary: [],
    },
  },
});
