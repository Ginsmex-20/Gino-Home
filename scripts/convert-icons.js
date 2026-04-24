const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../electron/icon.png');
const input = fs.readFileSync(src);

// Windows .ico
const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, true);
if (ico) {
  fs.writeFileSync(path.join(__dirname, '../electron/icon.ico'), ico);
  console.log('✅ icon.ico erstellt (Windows)');
} else {
  console.error('❌ ICO-Konvertierung fehlgeschlagen');
}

// macOS .icns
const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (icns) {
  fs.writeFileSync(path.join(__dirname, '../electron/icon.icns'), icns);
  console.log('✅ icon.icns erstellt (macOS)');
} else {
  console.error('❌ ICNS-Konvertierung fehlgeschlagen');
}
