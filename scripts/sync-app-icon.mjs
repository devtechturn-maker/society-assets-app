import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');

const defaultSources = [
  'C:\\Users\\DELL\\Downloads\\APP_ICON.png',
  'C:\\Users\\DELL\\Downloads\\APP ICON.png',
];

const brandBg = { r: 112, g: 8, b: 140, alpha: 1 };
const brandHex = '#70088c';

const sourceOut = path.join(assets, 'app-icon-source.png');
const logoOut = path.join(assets, 'logo.png');
const logoGlyphOut = path.join(assets, 'logo-glyph.png');
const notificationLogoOut = path.join(assets, 'notification-logo.png');
const splashOut = path.join(assets, 'splash-logo.png');
const splashIconOut = path.join(assets, 'splash-icon.png');
const iconOut = path.join(assets, 'icon.png');
const adaptiveIconOut = path.join(assets, 'adaptive-icon.png');
const notificationIconOut = path.join(assets, 'notification-icon.png');

async function resolveSourcePath() {
  if (process.env.APP_ICON_SOURCE?.trim()) {
    return process.env.APP_ICON_SOURCE.trim();
  }
  for (const candidate of defaultSources) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    `App icon source not found. Set APP_ICON_SOURCE or place APP_ICON.png in Downloads.\nTried:\n  ${defaultSources.join('\n  ')}`
  );
}

async function trimmedLogo(source) {
  return sharp(source).trim({ threshold: 12 }).png().toBuffer();
}

async function logoOnBrandBackground(trimmedBuffer, canvasSize, logoScale = 0.88) {
  const logoSize = Math.round(canvasSize * logoScale);
  const logoBuffer = await sharp(trimmedBuffer)
    .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: brandBg,
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9 });
}

async function whiteGlyphOnTransparent(trimmedBuffer, size) {
  return sharp(trimmedBuffer)
    .resize(size, size, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png({ compressionLevel: 9 });
}

const source = await resolveSourcePath();
await mkdir(assets, { recursive: true });
await copyFile(source, sourceOut);

const meta = await sharp(source).metadata();
if (!meta.width || !meta.height) {
  throw new Error(`Could not read image: ${source}`);
}

const trimmed = await trimmedLogo(source);

/** Trimmed white glyph for flexible in-app sizing */
await sharp(trimmed).resize(320, 320, { fit: 'inside' }).png({ compressionLevel: 9 }).toFile(logoGlyphOut);

/** In-app branding: white cutout logo on theme purple */
await (await logoOnBrandBackground(trimmed, 512, 0.9)).toFile(logoOut);
await (await logoOnBrandBackground(trimmed, 256, 0.92)).toFile(notificationLogoOut);

/** Splash + launcher icons */
await (await logoOnBrandBackground(trimmed, 400, 0.88)).toFile(splashOut);
await copyFile(splashOut, splashIconOut);
await (await logoOnBrandBackground(trimmed, 1024, 0.86)).toFile(iconOut);
await (await logoOnBrandBackground(trimmed, 1024, 0.86)).toFile(adaptiveIconOut);

/** Android status-bar glyph (white cutout, transparent background) */
await (await whiteGlyphOnTransparent(trimmed, 96)).toFile(notificationIconOut);

console.log(`Synced app icon from:\n  ${source}`);
console.log(`  → ${sourceOut}`);
console.log(`  → ${logoGlyphOut}`);
console.log(`  → ${logoOut}`);
console.log(`  → ${notificationLogoOut}`);
console.log(`  → ${splashOut}`);
console.log(`  → ${iconOut}`);
console.log(`  → ${notificationIconOut}`);
console.log(`Theme background: ${brandHex}`);
