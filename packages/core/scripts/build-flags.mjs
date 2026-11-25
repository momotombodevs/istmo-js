import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const core = new URL('../', import.meta.url).pathname;
const source = join(dirname(require.resolve('flag-icons/package.json')), 'flags', '4x3');
const { countries } = JSON.parse(readFileSync(join(core, 'src/regions.json'), 'utf8'));
const target = join(core, 'flags');
const files = [...countries.map(({ code }) => `${code.toLowerCase()}.svg`), 'LICENSE'];
const sourceOf = (file) => (file === 'LICENSE' ? join(source, '../../LICENSE') : join(source, file));

if (process.argv.includes('--check')) {
  const stale = files.filter((file) => {
    try {
      return readFileSync(sourceOf(file), 'utf8') !== readFileSync(join(target, file), 'utf8');
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`flags/ is out of date with flag-icons: ${stale.join(', ')}. Run npm run build:flags.`);
    process.exit(1);
  }
} else {
  mkdirSync(target, { recursive: true });
  for (const file of files) copyFileSync(sourceOf(file), join(target, file));
  console.log(`Copied ${files.length - 1} flags and the flag-icons license to flags/.`);
}
