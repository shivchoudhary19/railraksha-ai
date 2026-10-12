import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OfflineThreatCacheManager } from '../src/offline-cache.ts';
import { evaluatePlayIntegrityAttestation } from '../src/integrity.ts';

describe('RailRaksha Mobile Smoke Tests', () => {
  it('offline cache resolves official railway domains accurately', () => {
    const cache = new OfflineThreatCacheManager();
    const official = cache.getDomainStatus('irctc.co.in');
    assert.ok(official);
    assert.equal(official.category, 'OFFICIAL');
    assert.equal(official.title, 'IRCTC Official Portal');

    const blocked = cache.getDomainStatus('https://irctc-refund-help.shop/verify');
    assert.ok(blocked);
    assert.equal(blocked.category, 'BLOCKED');
  });

  it('offline message scanner detects high-risk scam patterns', () => {
    const cache = new OfflineThreatCacheManager();
    const result = cache.scanOfflineMessage('Dear user, download apk from telegram to claim refund immediately');
    assert.equal(result.isSuspicious, true);
    assert.ok(result.matchedIndicators.length > 0);

    const benign = cache.scanOfflineMessage('Your train 12951 will depart on platform 1');
    assert.equal(benign.isSuspicious, false);
  });

  it('Play Integrity evaluates strong device attestation', () => {
    const payload = {
      requestDetails: {
        requestPackageName: 'in.gov.railraksha',
        nonce: 'nonce-12345'
      },
      appIntegrity: {
        appRecognitionVerdict: 'PLAY_RECOGNIZED'
      },
      deviceIntegrity: {
        deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY', 'MEETS_BASIC_INTEGRITY']
      }
    };

    const evaluation = evaluatePlayIntegrityAttestation(payload, 'nonce-12345');
    assert.equal(evaluation.isTampered, false);
    assert.equal(evaluation.deviceRecognitionVerdict, 'MEETS_DEVICE_INTEGRITY');
    assert.equal(evaluation.appRecognitionVerdict, 'PLAY_RECOGNIZED');
  });

  it('Play Integrity flags tampered APK or mismatched nonce', () => {
    const payload = {
      requestDetails: {
        requestPackageName: 'in.scam.fakeapp',
        nonce: 'bad-nonce'
      },
      appIntegrity: {
        appRecognitionVerdict: 'UNRECOGNIZED_VERSION'
      },
      deviceIntegrity: {
        deviceRecognitionVerdict: ['NO_INTEGRITY']
      }
    };

    const evaluation = evaluatePlayIntegrityAttestation(payload, 'expected-nonce');
    assert.equal(evaluation.isTampered, true);
  });
});
