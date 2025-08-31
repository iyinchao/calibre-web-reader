import { defineConfig } from 'unocss';
import { presetWind3 } from '@unocss/preset-wind3';
import presetIcons from '@unocss/preset-icons';

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({
      warn: true,
      collections: {
        mdi: () => import('@iconify-json/mdi').then(i => i.icons),
      },
    }),
  ],
  theme: {
    colors: {
      primary: [],
    },
  },
});
