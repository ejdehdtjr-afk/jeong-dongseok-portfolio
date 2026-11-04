const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const dest = path.join(base, 'phishing-defender/vendor');
fs.mkdirSync(dest, {recursive: true});
const copy = (src, dst) => fs.copyFileSync(path.join(base, 'node_modules', src), path.join(dest, dst));
for (const name of ['tesseract.min.js', 'worker.min.js']) copy(`tesseract.js/dist/${name}`, name);
fs.mkdirSync(path.join(dest, 'core'), {recursive:true});
for (const name of fs.readdirSync(path.join(base, 'node_modules/tesseract.js-core'))) {
  if (/^tesseract-core.*\.(wasm|js)$/.test(name)) copy(`tesseract.js-core/${name}`, `core/${name}`);
}
fs.mkdirSync(path.join(dest, 'lang'), {recursive:true});
for (const lang of ['kor', 'eng']) copy(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, `lang/${lang}.traineddata.gz`);
copy('tesseract.js/LICENSE.md', 'TESSERACT-LICENSE.md');
copy('tesseract.js-core/LICENSE', 'CORE-LICENSE');
console.log('OCR runtime, WebAssembly and Korean/English language files copied to same-origin vendor directory.');
