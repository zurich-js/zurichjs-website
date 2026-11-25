import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// `just up` resolves .env.schema with varlock and Compose hands the values to the `web` service by
// name, so a variable in the schema that docker-compose.yml does not name never reaches the site.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const schemaKeys = [...read('.env.schema').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);

const compose = read('docker-compose.yml');
const web = compose.slice(compose.indexOf('\n  web:\n'), compose.indexOf('\n  stripe:\n'));
const webKeys = [...web.matchAll(/^ {6}([A-Z][A-Z0-9_]*):/gm)].map((m) => m[1]);

describe('.env.schema and docker-compose.yml', () => {
  it('the schema declares variables, each once', () => {
    expect(schemaKeys.length).toBeGreaterThan(10);
    expect(schemaKeys).toEqual([...new Set(schemaKeys)]);
  });

  it('the web service gets every variable in the schema', () => {
    expect(schemaKeys.filter((key) => !webKeys.includes(key))).toEqual([]);
  });

  it('a workspace package has a node_modules volume', () => {
    for (const line of read('apps/web/package.json').matchAll(/"@zurichjs\/([a-z]+)": "workspace/g)) {
      expect(compose).toContain(`/app/packages/${line[1]}/node_modules`);
    }
  });
});
