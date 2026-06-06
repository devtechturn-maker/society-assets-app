import { execSync } from 'node:child_process';

const DEPLOY_BRANCH = 'development';

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const branch = currentBranch();

if (branch !== DEPLOY_BRANCH) {
  console.error('');
  console.error('[EAS] Device builds must run from the development branch (Render backend).');
  console.error(`[EAS] Current branch: "${branch || '(unknown)'}"`);
  console.error('');
  console.error('Do this first:');
  console.error('  git checkout development');
  console.error('  git merge local          # or your feature branch');
  console.error('  git push origin development');
  console.error('  npm run build:android:dev');
  console.error('  git checkout local');
  console.error('');
  process.exit(1);
}

console.log(`[EAS] Branch OK: ${DEPLOY_BRANCH} — build will use Render API from eas.json`);
