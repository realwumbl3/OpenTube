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
  const api = spawnSync('npm', ['run', 'server:exec'], { stdio: 'inherit', cwd: root, shell: true });
  process.exit(api.status ?? 1);
}

const sh = spawnSync('bash', [path.join(root, 'scripts', 'run.sh'), 'server'], {
  stdio: 'inherit',
  cwd: root,
});
process.exit(sh.status ?? 1);
