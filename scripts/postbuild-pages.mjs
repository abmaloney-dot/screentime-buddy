// Turns `expo export -p web` output (dist/) into a GitHub Pages site.
// Run by `npm run build:pages`; EXPO_BASE_URL must match the export's.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const base = process.env.EXPO_BASE_URL || '';
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');

// 1. expo-sqlite on web needs cross-origin isolation (COOP/COEP headers), and
//    GitHub Pages can't set headers. coi-serviceworker (public/, MIT) adds
//    them from a service worker, reloading once on the first visit.
//    `require-corp` rather than `credentialless`: Safari only supports the
//    former, and every file the app loads is same-origin anyway.
//    Guards against reload loops: the worker can only control pages under the
//    app's path, so it registers only there, and it reloads at most once per
//    tab session (a page it can't control would otherwise reload forever).
const coiConfig = `window.coi = {
  coepCredentialless: () => false,
  shouldRegister: () => location.pathname.startsWith(${JSON.stringify(`${base}/`)}),
  doReload: () => {
    try {
      if (sessionStorage.getItem('coi-reloaded')) return;
      sessionStorage.setItem('coi-reloaded', '1');
    } catch (e) {
      return;
    }
    location.reload();
  },
};`;
const coi = `<script>${coiConfig}</script><script src="${base}/coi-serviceworker.js"></script>`;
if (!html.includes('coi-serviceworker.js')) {
  html = html.replace('<head>', `<head>${coi}`);
  writeFileSync(indexPath, html);
}

// 2. Pages only knows real files: a direct link to /theme would 404. Its 404
//    page is the app itself, so the router takes over from any deep link.
copyFileSync(indexPath, join(dist, '404.html'));

// 3. Expo's build folders start with "_" (e.g. _expo/), which Jekyll hides.
writeFileSync(join(dist, '.nojekyll'), '');

console.log(`GitHub Pages build ready in ${dist}/ (base path: "${base || '/'}")`);
