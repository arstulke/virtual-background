const fs = require('fs');
const file = fs.readFileSync('dist/manifest.webmanifest', 'utf-8');
const manifest = JSON.parse(file);
manifest.icons.forEach(icon => {
    icon.src = icon.src.replace(/^\.\/(?!assets)/, './assets/');
});
const newFile = JSON.stringify(manifest);
fs.writeFileSync('dist/manifest.webmanifest', newFile);