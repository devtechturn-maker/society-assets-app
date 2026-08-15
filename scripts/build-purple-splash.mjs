import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, '..', 'assets');

const W = 1080;
const H = 1920;
const brand = { r: 112, g: 8, b: 140, alpha: 1 }; // #70088c

async function makeGlow(size = 720) {
  const svg = `
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#8a2aa5" stop-opacity="0.55"/>
        <stop offset="55%" stop-color="#70088c" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#70088c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const logo = await sharp(path.join(assets, 'splash-logo.png'))
  .resize(420, 420, { fit: 'inside' })
  .png()
  .toBuffer();

const glowBuf = await makeGlow(720);

const splashOut = path.join(assets, 'splash.png');
await sharp({
  create: { width: W, height: H, channels: 4, background: brand },
})
  .composite([
    {
      input: glowBuf,
      top: Math.round((H - 720) / 2),
      left: Math.round((W - 720) / 2),
    },
    { input: logo, gravity: 'center' },
  ])
  .png({ compressionLevel: 9 })
  .toFile(splashOut);

console.log(`Wrote ${splashOut} (${W}x${H})`);

const glyph = await sharp(path.join(assets, 'splash-logo.png'))
  .resize(280, 280, { fit: 'inside' })
  .png()
  .toBuffer();

const tileOut = path.join(assets, 'splash-screen-logo.png');
await sharp({
  create: { width: 512, height: 512, channels: 4, background: brand },
})
  .composite([{ input: glyph, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(tileOut);

console.log(`Wrote ${tileOut} (512x512)`);
