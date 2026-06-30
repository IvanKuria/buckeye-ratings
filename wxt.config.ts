import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'BuckeyeRatings',
    version: '1.0.0',
    description:
      "View professor ratings from Rate My Professors while browsing Ohio State's Class Search.",
    permissions: ['storage', 'sidePanel'],
    action: {},
    host_permissions: [
      'https://classes.osu.edu/*',
      'https://www.ratemyprofessors.com/*',
    ],
    web_accessible_resources: [
      {
        resources: ['icons/app/*.png', 'images/*'],
        matches: ['https://classes.osu.edu/*'],
      },
    ],
    icons: {
      '16': 'icons/app/icon-16.png',
      '48': 'icons/app/icon-48.png',
      '128': 'icons/app/icon-128.png',
    },
  },
});
