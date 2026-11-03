// Builds the offline web bundle that the Android app loads (www/).
// Usage: node tools/build-android-web.mjs
//
// - Copies the single-file game to www/index.html.
// - Rewrites every raw.githubusercontent.com asset URL of this repository to a
//   relative path, and copies those images and sounds into www/, so the app
//   plays without a network connection.
// - Marks the page as running inside the app: Android already shows it
//   full screen, so the browser fullscreen prompts are turned off.
import {readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const source = join(root, 'touhou_board_game_github_textures.html');
const remote = 'https://raw.githubusercontent.com/khooruizhe-rgb/TBG/main/';

let html = readFileSync(source, 'utf8');

// Collect every asset path that the page loads from this repository.
const assets = new Set();
const pattern = new RegExp(remote.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '([^"\'()\\s]+)', 'g');
for (const match of html.matchAll(pattern)) {
  const path = decodeURIComponent(match[1].replace(/[?#].*$/, ''));
  assets.add(path);
}
const missing = [...assets].filter(path => !existsSync(join(root, path)));
if (missing.length) {
  console.error('These assets are referenced but missing from the repository:\n' + missing.join('\n'));
  process.exit(1);
}
html = html.split(remote).join('./');

// Native shell: no browser fullscreen prompts (the app is already immersive).
const replacements = [
  ['function fullscreenAvailable(){return ', 'function fullscreenAvailable(){if(window.TBG_NATIVE_APP)return false;return '],
  ['function setFullscreenMessage(text){', 'function setFullscreenMessage(text){if(window.TBG_NATIVE_APP)text=\'\';'],
];
for (const [from, to] of replacements) {
  if (!html.includes(from)) {
    console.error('Could not find expected code to patch: ' + from);
    process.exit(1);
  }
  html = html.replace(from, to);
}
const nativeHead = '<script>window.TBG_NATIVE_APP=true;</script>\n'
  + '<style>#fullscreen-btn,#menu-fullscreen-btn,#mobile-screen-message,#menu-fullscreen-message{display:none!important}</style>\n';
html = html.replace('</head>', nativeHead + '</head>');

rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
writeFileSync(join(out, 'index.html'), html);
for (const path of assets) {
  const target = join(out, path);
  mkdirSync(dirname(target), {recursive: true});
  cpSync(join(root, path), target);
}
console.log(`www/ ready: index.html + ${assets.size} assets`);
