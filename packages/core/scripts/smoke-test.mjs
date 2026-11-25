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
  execFileSync(
    'npm',
    ['install', '--silent', '--no-audit', '--no-fund', join(workDir, tarball), 'react@19', '@types/react@19'],
    { cwd: workDir },
  );

  const esm = `
    import { formatMoney, parsePhone, today } from '@momotombodevs/istmo';
    import { parseMoney } from '@momotombodevs/istmo/money';
    import { isValidPhone } from '@momotombodevs/istmo/phone';
    import { parseDate } from '@momotombodevs/istmo/dates';
    import { countries } from '@momotombodevs/istmo/regions';
    import { formatPhoneInput } from '@momotombodevs/istmo/phone-input';
    import { usePhoneInput } from '@momotombodevs/istmo/react';
    const checks = [
      formatMoney('1250.5', 'NIO') === 'C$\\u00a01,250.50',
      parsePhone('8123 4567', 'NI')?.e164 === '+50581234567',
      /^\\d{4}-\\d{2}-\\d{2}$/.test(today('NI')),
      parseMoney('C$ 1,250.50', 'NIO') === '1250.50',
      isValidPhone('+506 8312 3456'),
      parseDate('24/11/2026') === '2026-11-24',
      countries.length === 7,
      formatPhoneInput('812345', 'NI').text === '8123 45',
      typeof usePhoneInput === 'function',
    ];
    if (checks.includes(false)) throw new Error('ESM smoke test failed: ' + JSON.stringify(checks));
  `;
  const cjs = `
    const { formatMoney } = require('@momotombodevs/istmo');
    const { parsePhone } = require('@momotombodevs/istmo/phone');
    const { usePhoneInput } = require('@momotombodevs/istmo/react');
    if (typeof usePhoneInput !== 'function') throw new Error('CJS react subpath failed');
    if (formatMoney('5', 'USD') !== '$\\u00a05.00' || parsePhone('8123 4567', 'NI')?.e164 !== '+50581234567') {
      throw new Error('CJS smoke test failed');
    }
  `;
  writeFileSync(join(workDir, 'esm.mjs'), esm);
  writeFileSync(join(workDir, 'cjs.cjs'), cjs);
  execFileSync('node', ['esm.mjs'], { cwd: workDir, stdio: 'inherit' });
  execFileSync('node', ['cjs.cjs'], { cwd: workDir, stdio: 'inherit' });

  const consumer = `
    import { type PhoneError, formatMoney, validatePhone } from '@momotombodevs/istmo';
    import { parseMoney } from '@momotombodevs/istmo/money';
    import { isCountryCode, country } from '@momotombodevs/istmo/regions';
    import { type PhoneInput, usePhoneInput } from '@momotombodevs/istmo/react';
    export function useField(): PhoneInput {
      return usePhoneInput({ defaultCountry: 'NI', type: 'mobile', countries: ['NI', 'CR'] });
    }
    const messages: Record<PhoneError, string> = {
      format: 'a', missing_country: 'b', too_short: 'c', too_long: 'd', country: 'e', invalid: 'f', type: 'g',
    };
    const result = validatePhone('8123 4567', 'NI', { type: 'mobile' });
    const shown: string = result.valid ? result.phone.e164 : messages[result.error];
    const code: unknown = 'NI';
    const name: string | undefined = isCountryCode(code) ? country(code)?.name : undefined;
    const price: string | null = parseMoney('C$ 5', 'NIO');
    export const values = [shown, name, price, formatMoney('5', 'USD')];
  `;
  writeFileSync(join(workDir, 'consumer.ts'), consumer);
  const tsc = resolve(packageDir, '../../node_modules/.bin/tsc');
  for (const [module, moduleResolution] of [
    ['esnext', 'bundler'],
    ['node16', 'node16'],
  ]) {
    execFileSync(
      tsc,
      [
        '--noEmit',
        '--strict',
        '--exactOptionalPropertyTypes',
        '--skipLibCheck',
        'false',
        '--types',
        '',
        '--module',
        module,
        '--moduleResolution',
        moduleResolution,
        '--target',
        'es2020',
        'consumer.ts',
      ],
      { cwd: workDir, stdio: 'inherit' },
    );
  }
  console.log(`Smoke test passed for ${tarball} (ESM, CJS, every subpath, and TypeScript with bundler and node16).`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
