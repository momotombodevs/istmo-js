import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const packageDir = resolve(import.meta.dirname, '..');
const workDir = mkdtempSync(join(tmpdir(), 'istmo-smoke-'));

try {
  const tarball = execFileSync('npm', ['pack', '--silent', '--pack-destination', workDir], { cwd: packageDir })
    .toString()
    .trim()
    .split('\n')
    .pop();
  writeFileSync(join(workDir, 'package.json'), '{"private":true}');
  execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', join(workDir, tarball)], { cwd: workDir });

  const esm = `
    import { formatMoney, parsePhone, today } from '@momotombodevs/istmo';
    import { parseMoney } from '@momotombodevs/istmo/money';
    import { isValidPhone } from '@momotombodevs/istmo/phone';
    import { parseDate } from '@momotombodevs/istmo/dates';
    import { countries } from '@momotombodevs/istmo/regions';
    const checks = [
      formatMoney('1250.5', 'NIO') === 'C$\\u00a01,250.50',
      parsePhone('8123 4567', 'NI')?.e164 === '+50581234567',
      /^\\d{4}-\\d{2}-\\d{2}$/.test(today('NI')),
      parseMoney('C$ 1,250.50', 'NIO') === '1250.50',
      isValidPhone('+506 8312 3456'),
      parseDate('24/11/2026') === '2026-11-24',
      countries.length === 7,
    ];
    if (checks.includes(false)) throw new Error('ESM smoke test failed: ' + JSON.stringify(checks));
  `;
  const cjs = `
    const { formatMoney } = require('@momotombodevs/istmo');
    const { parsePhone } = require('@momotombodevs/istmo/phone');
    if (formatMoney('5', 'USD') !== '$\\u00a05.00' || parsePhone('8123 4567', 'NI')?.e164 !== '+50581234567') {
      throw new Error('CJS smoke test failed');
    }
  `;
  writeFileSync(join(workDir, 'esm.mjs'), esm);
  writeFileSync(join(workDir, 'cjs.cjs'), cjs);
  execFileSync('node', ['esm.mjs'], { cwd: workDir, stdio: 'inherit' });
  execFileSync('node', ['cjs.cjs'], { cwd: workDir, stdio: 'inherit' });
  console.log(`Smoke test passed for ${tarball} (ESM, CJS and every subpath).`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
