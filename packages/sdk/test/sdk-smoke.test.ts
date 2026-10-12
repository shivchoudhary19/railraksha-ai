import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RailRakshaClient } from '../src/index.ts';

describe('RailRaksha TypeScript SDK Smoke Tests', () => {
  it('instantiates client with API key and baseUrl', () => {
    const client = new RailRakshaClient('rr_test_sandbox_123456', { baseUrl: 'http://127.0.0.1:8000' });
    assert.ok(client);
  });

  it('throws error if API key is missing', () => {
    assert.throws(() => {
      new RailRakshaClient('');
    }, /requires an API key/);
  });

  it('SDK client methods exist and are callable', () => {
    const client = new RailRakshaClient('rr_test_sandbox_123456');
    assert.equal(typeof client.verify, 'function');
    assert.equal(typeof client.scanUrl, 'function');
    assert.equal(typeof client.analyzeMessage, 'function');
    assert.equal(typeof client.getThreatFeed, 'function');
    assert.equal(typeof client.testWebhook, 'function');
  });
});
