import { execSync } from 'node:child_process';

const DEPLOY_BRANCHES = ['master', 'development'];

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const branch = currentBranch();

if (!DEPLOY_BRANCHES.includes(branch)) {
  console.error('');
  console.error('[EAS] Device builds must run from master or development (hosted backend in eas.json).');
  console.error(`[EAS] Current branch: "${branch || '(unknown)'}"`);
  console.error('');
  console.error('Do this first:');
  console.error('  git checkout master        # or development');
  console.error('  git merge local            # or your feature branch');
  console.error('  git push origin master');
  console.error('  npm run build:android:dev');
  console.error('  git checkout local');
  console.error('');
  process.exit(1);
}

console.log(`[EAS] Branch OK: ${branch} — build will use API URL from eas.json`);
