import fs from 'fs/promises';
import { passkeyMetadataJsonSchema } from '../../src/lib/auth/aaguid/parse.js';

const AAGUID_URL = "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/refs/heads/main/aaguid.json"
const FILE_PATH = new URL('../../aaguid.json', import.meta.url);


async function updateAAGUIDs() {
  const response = await fetch(AAGUID_URL);
  const data = await response.json();
  const parsed = passkeyMetadataJsonSchema.parse(data); // if aaguid.json structure is compromised, it will throw here

  await fs.writeFile(FILE_PATH, JSON.stringify(parsed, null, 4), 'utf-8');
}

updateAAGUIDs().then(() => {
  console.log('AAGUID data updated successfully.');
}).catch((error) => {
  console.error('Error updating AAGUID data:', error);
});