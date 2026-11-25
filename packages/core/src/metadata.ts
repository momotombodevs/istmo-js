import type { MetadataJson } from 'libphonenumber-js/core';
import metadataJson from './phone-metadata.json';

export const metadata = metadataJson as unknown as MetadataJson;
