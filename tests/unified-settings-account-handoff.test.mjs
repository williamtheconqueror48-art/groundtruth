import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settingsSource = readFileSync(
  resolve(root, 'src/components/UnifiedSettings.ts'),
  'utf8',
);

function extractMethod(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected method ${signature}`);
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced method ${signature}`);
}

function transpileHarness(methods, dependencies = []) {
  const js = ts.transpileModule(
    `class Harness { ${methods.join('\n')} }`,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
      },
    },
  ).outputText;
  // eslint-disable-next-line no-new-func
  return new Function(...dependencies, `${js}\nreturn Harness;`);
}

describe('UnifiedSettings account handoff', () => {
  it('synchronously clears every account-owned cache and invalidates old requests', async () => {
    let currentUserId = 'A';
    let resolveKeys = () => {};
    const keysResult = new Promise((resolve) => {
      resolveKeys = resolve;
    });
    const Harness = transpileHarness(
      [
        extractMethod(settingsSource, 'private handleAccountIdentityChange('),
        extractMethod(settingsSource, 'private closeDeletionDialog('),
        extractMethod(settingsSource, 'private captureAccountRequest('),
        extractMethod(settingsSource, 'private isAccountRequestCurrent('),
        extractMethod(settingsSource, 'private async loadApiKeys('),
      ],
      ['getAuthState', 'listApiKeys'],
    )(
      () => ({ user: currentUserId ? { id: currentUserId } : null }),
      () => keysResult,
    );
    const instance = new Harness();
    const renders = [];
    instance.accountUserId = 'A';
    instance.accountDataGeneration = 4;
    instance.accountEntitlementRefreshPending = false;
    instance.apiKeys = [{ id: 'key-a' }];
    instance.apiKeysLoading = false;
    instance.apiKeysError = 'A error';
    instance.newlyCreatedKey = 'wm_a_plaintext';
    instance.overlay = { classList: { contains: () => true } };
    instance.render = (loadAccountData) => renders.push(loadAccountData);
    let listRenders = 0;
    instance.renderApiKeysList = () => {
      listRenders += 1;
    };

    const requestA = instance.captureAccountRequest();
    const loadA = instance.loadApiKeys();
    currentUserId = 'B';
    instance.handleAccountIdentityChange('B');
    resolveKeys([{ id: 'late-key-a', name: 'A secret' }]);
    await loadA;

    assert.equal(instance.accountDataGeneration, 5);
    assert.equal(instance.accountEntitlementRefreshPending, true);
    assert.deepEqual(instance.apiKeys, []);
    assert.equal(instance.apiKeysLoading, false);
    assert.equal(instance.apiKeysError, '');
    assert.equal(instance.newlyCreatedKey, null, 'a wm_ plaintext must never survive an account handoff');
    assert.deepEqual(renders, [false], 'the synchronous rerender must suppress account loads');
    assert.equal(listRenders, 1, 'A settlement must not render after B clears the surface');
    assert.equal(instance.isAccountRequestCurrent(requestA), false);
  });

  it('generation-guards every account-scoped async settings path', () => {
    const guardedMethods = [
      'loadApiKeys',
      'handleCreateApiKey',
      'handleRevokeApiKey',
    ];
    for (const method of guardedMethods) {
      const body = extractMethod(settingsSource, `private async ${method}(`);
      assert.match(body, /captureAccountRequest\(\)/, `${method} must capture the initiating account`);
      assert.match(body, /isAccountRequestCurrent\(request\)/, `${method} must discard stale settlement`);
    }
  });
});
