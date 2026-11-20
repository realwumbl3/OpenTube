import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (platform() === 'win32') {
  const r = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts', 'ensure-node.ps1')],
    { stdio: 'inherit', cwd: root },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
  const dev = spawnSync('npm', ['run', 'dev:app'], { stdio: 'inherit', cwd: root, shell: true });
  process.exit(dev.status ?? 1);
}

const sh = spawnSync('bash', [path.join(root, 'scripts', 'run.sh'), 'dev'], {
  stdio: 'inherit',
  cwd: root,
});
process.exit(sh.status ?? 1);
