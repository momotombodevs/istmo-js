import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/phone.ts', 'src/money.ts', 'src/dates.ts', 'src/regions.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  clean: true,
  unbundle: true,
});
