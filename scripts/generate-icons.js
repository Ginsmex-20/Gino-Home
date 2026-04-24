/**
 * Icon-Generator für HaushaltsHub
 * Erstellt alle PWA + Electron Icons aus einer SVG-Quelle
 *
 * Benötigt: npm install -g sharp-cli  ODER  npm install sharp
 * Ausführen: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// SVG-Quell-Icon (Haus + Orange)
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#161616"/>
  <rect width="512" height="512" rx="96" fill="#f97316" opacity="0.12"/>
  <!-- Haus -->
  <path d="M256 120 L420 260 L380 260 L380 400 L300 400 L300 310 L212 310 L212 400 L132 400 L132 260 L92 260 Z" fill="#f97316"/>
  <rect x="212" y="310" width="88" height="90" rx="8" fill="#161616" opacity="0.6"/>
</svg>`;

const sizes = {
  pwa: [72, 96, 128, 144, 152, 192, 384, 512],
  electron: [16, 32, 48, 64, 128, 256, 512],
};

const pwaIconDir = path.join(__dirname, '../frontend/public/icons');
const electronIconDir = path.join(__dirname, '../electron');

// Ordner anlegen
if (!fs.existsSync(pwaIconDir)) fs.mkdirSync(pwaIconDir, { recursive: true });

// SVG speichern (als Fallback)
fs.writeFileSync(path.join(electronIconDir, 'icon.svg'), SVG);
fs.writeFileSync(path.join(pwaIconDir, 'icon.svg'), SVG);

console.log('✅ SVG Icons gespeichert');

// Versuche sharp zu verwenden (muss installiert sein)
try {
  const sharp = require('sharp');

  const svgBuffer = Buffer.from(SVG);

  // PWA Icons
  Promise.all(sizes.pwa.map(size =>
    sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(pwaIconDir, `icon-${size}.png`))
      .then(() => console.log(`✅ PWA icon-${size}.png`))
  )).then(() => {
    // Electron Icons (512x512 PNG)
    return sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(electronIconDir, 'icon.png'));
  }).then(() => {
    console.log('✅ Electron icon.png (512x512)');
    console.log('\n📌 Hinweis für Windows (.ico) und macOS (.icns):');
    console.log('   → Windows: icon.png mit https://convertio.co zu icon.ico konvertieren');
    console.log('   → macOS:   icon.png mit https://cloudconvert.com zu icon.icns konvertieren');
    console.log('   → Dateien nach electron/ kopieren');
  });
} catch (err) {
  console.log('\n⚠️  sharp nicht installiert — Fallback: SVG-Icons gespeichert');
  console.log('   Um PNG-Icons zu generieren:');
  console.log('   cd "C:\\Users\\ginsm\\Documents\\.Ginsmex\\claude\\home webseite"');
  console.log('   npm install sharp');
  console.log('   node scripts/generate-icons.js');
  console.log('\n📌 Oder direkt ein 512x512 PNG erstellen:');
  console.log('   → https://favicon.io/favicon-generator/');
  console.log('   → Als icon-512.png in frontend/public/icons/ speichern');
  console.log('   → Als icon.png in electron/ speichern');

  // Placeholder-PNGs als leere Dateien anlegen damit App nicht abstürzt
  // (werden vom Browser einfach ignoriert wenn leer)
  const allSizes = [...sizes.pwa, ...sizes.electron];
  allSizes.forEach(size => {
    const pwaPath = path.join(pwaIconDir, `icon-${size}.png`);
    if (!fs.existsSync(pwaPath)) {
      // Minimales 1x1 PNG (44 Bytes)
      const minPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(pwaPath, minPng);
    }
  });
  console.log('\n✅ Placeholder-Icons erstellt (funktionieren als Fallback)');
}
