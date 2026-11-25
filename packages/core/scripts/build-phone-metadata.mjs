import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = new URL('../', import.meta.url);
const regions = JSON.parse(readFileSync(new URL('src/regions.json', core), 'utf8'));
const full = require('libphonenumber-js/metadata.max.json');
const mobileExamples = require('libphonenumber-js/mobile/examples');
const { version } = require('libphonenumber-js/package.json');

const codes = regions.countries.map(({ code }) => code);
const callingCodes = Object.fromEntries(
  Object.entries(full.country_calling_codes).filter(([, owners]) => owners.some((owner) => codes.includes(owner))),
);
for (const [callingCode, owners] of Object.entries(callingCodes)) {
  if (owners.length !== 1 || !codes.includes(owners[0])) {
    throw new Error(`Calling code ${callingCode} is shared with countries outside the package: ${owners.join(', ')}`);
  }
}

const metadata = {
  version: full.version,
  country_calling_codes: callingCodes,
  countries: Object.fromEntries(codes.map((code) => [code, full.countries[code]])),
};

const examples = Object.fromEntries(codes.map((code) => [code, mobileExamples[code]]));
const files = [
  ['src/phone-metadata.json', `${JSON.stringify(metadata)}\n`],
  ['src/phone-examples.json', `${JSON.stringify(examples)}\n`],
];

if (process.argv.includes('--check')) {
  const stale = files
    .filter(([path, json]) => readFileSync(new URL(path, core), 'utf8') !== json)
    .map(([path]) => path);
  if (stale.length > 0) {
    console.error(`${stale.join(', ')} out of date with libphonenumber-js ${version}. Run npm run build:metadata.`);
    process.exit(1);
  }
} else {
  for (const [path, json] of files) writeFileSync(new URL(path, core), json);
  console.log(`Wrote phone metadata and examples for ${codes.join(', ')} from libphonenumber-js ${version}.`);
}
