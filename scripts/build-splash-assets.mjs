import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');

const brandBg = { r: 112, g: 8, b: 140, alpha: 1 };
const videoPath = 'C:\\Users\\DELL\\Downloads\\VIDEO-2026-07-12-00-23-14.mp4';

const splashScreenLogoOut = path.join(assets, 'splash-screen-logo.png');
const bottomArtOut = path.join(assets, 'splash-bottom-art.png');
const glyphPath = path.join(assets, 'logo-glyph.png');
const frameOut = path.join(assets, '_splash_frame.png');

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Compact purple tile for the in-app splash centre (no extra white padding). */
async function buildSplashScreenLogo() {
  const glyph = await sharp(glyphPath)
    .resize(92, 92, { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 4,
      background: brandBg,
    },
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(splashScreenLogoOut);

  console.log(`  → ${splashScreenLogoOut} (128×128)`);
}

/** Bottom skyline + waves from the design reference video. */
async function buildBottomArt() {
  if (!(await fileExists(videoPath))) {
    console.warn(`Video not found, keeping existing splash-bottom-art.png:\n  ${videoPath}`);
    return;
  }

  execSync(
    `ffmpeg -y -i "${videoPath}" -vf "select=eq(n\\,45)" -vframes 1 -update 1 "${frameOut}"`,
    { stdio: 'pipe' }
  );
  execSync(
    `ffmpeg -y -i "${frameOut}" -vf "crop=720:400:0:880" -update 1 "${bottomArtOut}"`,
    { stdio: 'pipe' }
  );

  const { data, info } = await sharp(bottomArtOut)
    .extract({ left: 360, top: 30, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const [r, g, b] = data;
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  console.log(`  → ${bottomArtOut}`);
  console.log(`  Sampled sky colour: ${hex}`);
}

await mkdir(assets, { recursive: true });
console.log('Building splash assets…');
await buildSplashScreenLogo();
await buildBottomArt();
console.log('Done.');
