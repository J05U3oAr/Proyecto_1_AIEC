import { existsSync, mkdirSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const directory = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(directory, '..');
const python = resolve(
  root,
  'server/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);
if (!existsSync(python)) {
  console.error('Falta server/.venv. Prepara el entorno Python según server/README.md.');
  process.exit(1);
}
const report = resolve(root, 'docs/evidence/m3/promptfoo-current');
mkdirSync(resolve(report, '..'), { recursive: true });
const stateDirectory = resolve(root, 'test-results/promptfoo');
mkdirSync(stateDirectory, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    resolve(directory, 'node_modules/promptfoo/dist/src/entrypoint.js'),
    'eval',
    '--config',
    resolve(directory, 'promptfooconfig.yaml'),
    '--repeat',
    '3',
    '--no-cache',
    '--output',
    report + '.json',
    '--output',
    report + '.html',
  ],
  {
    cwd: directory,
    stdio: 'inherit',
    env: {
      ...process.env,
      PROMPTFOO_PYTHON: python,
      PROMPTFOO_CONFIG_DIR: stateDirectory,
      PYTHONPATH: [resolve(root, 'server'), directory].join(delimiter),
      PROMPTFOO_DISABLE_TELEMETRY: '1',
      PROMPTFOO_DISABLE_UPDATE: '1',
      PROMPTFOO_DISABLE_REMOTE_GENERATION: 'true',
    },
  }
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
