import test from 'node:test';
import assert from 'node:assert/strict';
import { issueStoryCapabilities, scopeAllows, verifyCapability } from '../src/security.js';


test('owner and reader capabilities are separate tokens and hashes', async () => {
  const issued = await issueStoryCapabilities();
  assert.notEqual(issued.ownerToken, issued.readerToken);
  assert.notEqual(issued.ownerHash, issued.readerHash);
  assert.equal(await verifyCapability(issued.ownerToken, issued.ownerHash), true);
  assert.equal(await verifyCapability(issued.readerToken, issued.ownerHash), false);
});

test('reader can read/listen but cannot edit', () => {
  assert.equal(scopeAllows('reader', 'read'), true);
  assert.equal(scopeAllows('reader', 'listen'), true);
  assert.equal(scopeAllows('reader', 'edit'), false);
  assert.equal(scopeAllows('owner', 'edit'), true);
});
