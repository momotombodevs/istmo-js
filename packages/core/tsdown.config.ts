import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/phone.ts',
    'src/phone-input.ts',
    'src/money.ts',
    'src/dates.ts',
    'src/regions.ts',
    'src/react.ts',
  ],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  clean: true,
  unbundle: true,
  external: ['react'],
});
