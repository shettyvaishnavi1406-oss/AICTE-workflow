import assert from 'node:assert';
import { deriveCityFromApplication } from '../src/components/evc/EVCManagement';
import { clearApplicationStorage, STORAGE_KEYS } from '../src/data/mockData';
import { Application } from '../src/types';

let passed = 0;
let failed = 0;

function it(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          console.log(`  ✓ ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ ${name}:`, err.message);
          failed++;
        });
    } else {
      console.log(`  ✓ ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('AICTE Workflow Automation — Scheduling & Storage Tests');
  console.log('============================================================\n');

  console.log('1. Testing City Derivation from Application Data:');
  const appMumbai: Partial<Application> = {
    id: 'app-test-1',
    instituteName: 'Vidyalankar Institute of Technology',
    instituteCode: 'VIT-MUM-142',
    state: 'Maharashtra',
    region: 'Western'
  };
  it('Derives Mumbai for Maharashtra / MUM code', () => {
    assert.strictEqual(deriveCityFromApplication(appMumbai as Application), 'Mumbai');
  });

  const appDelhi: Partial<Application> = {
    id: 'app-test-2',
    instituteName: 'Delhi Technological Institute',
    instituteCode: 'DTIE-DEL-089',
    state: 'Delhi',
    region: 'Northern'
  };
  it('Derives New Delhi for Delhi / DEL code', () => {
    assert.strictEqual(deriveCityFromApplication(appDelhi as Application), 'New Delhi');
  });

  const appBengaluru: Partial<Application> = {
    id: 'app-test-3',
    instituteName: 'Bangalore College of Technology',
    instituteCode: 'BCT-BLR-011',
    state: 'Karnataka',
    region: 'South-Western'
  };
  it('Derives Bangalore for Karnataka / BLR code', () => {
    assert.strictEqual(deriveCityFromApplication(appBengaluru as Application), 'Bangalore');
  });

  const appCustomCity: Partial<Application> = {
    id: 'app-test-4',
    instituteName: 'Government Polytechnic Pune',
    instituteCode: 'GPP-PUN-001',
    state: 'Maharashtra',
    region: 'Western'
  };
  it('Derives Pune for PUN signature', () => {
    assert.strictEqual(deriveCityFromApplication(appCustomCity as Application), 'Pune');
  });

  console.log('\n2. Testing Safe Reset (Targeted localStorage clearing):');
  // Mock localStorage
  const mockStorage: Record<string, string> = {
    'aicte_portal_applications': '[{}]',
    'aicte_portal_evc_visits': '[{}]',
    'aicte_portal_compliance': '[{}]',
    'aicte_portal_audit_logs': '[{}]',
    'aicte_portal_experts': '[{}]',
    'unrelated_user_session_token': 'secret-token-12345',
    'theme_preference': 'dark'
  };

  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; },
    removeItem: (k: string) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };

  it('Identifies exactly 5 application storage keys', () => {
    const keys = Object.values(STORAGE_KEYS);
    assert.strictEqual(keys.length, 5);
    assert.deepStrictEqual(keys.sort(), [
      'aicte_portal_applications',
      'aicte_portal_audit_logs',
      'aicte_portal_compliance',
      'aicte_portal_evc_visits',
      'aicte_portal_experts'
    ].sort());
  });

  it('Removes only the 5 application keys and preserves unrelated keys', () => {
    clearApplicationStorage();
    assert.strictEqual(mockStorage['aicte_portal_applications'], undefined);
    assert.strictEqual(mockStorage['aicte_portal_evc_visits'], undefined);
    assert.strictEqual(mockStorage['aicte_portal_compliance'], undefined);
    assert.strictEqual(mockStorage['aicte_portal_audit_logs'], undefined);
    assert.strictEqual(mockStorage['aicte_portal_experts'], undefined);
    assert.strictEqual(mockStorage['unrelated_user_session_token'], 'secret-token-12345');
    assert.strictEqual(mockStorage['theme_preference'], 'dark');
  });

  console.log(`\n------------------------------------------------------------`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`------------------------------------------------------------\n`);
  if (failed > 0) process.exit(1);
}

run();
