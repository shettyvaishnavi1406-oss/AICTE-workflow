import assert from 'node:assert';
import {
  isValidEVCTransition,
  getNextEVCStatus,
  validateEVCTeam,
  checkExpertAvailability,
  computeExpertStatus,
  normalizePersonIdentifier,
  isSamePerson
} from '../src/lib/evcWorkflow.ts';
import { dataService } from '../src/services/dataService.ts';
import {
  getStoredEVCVisits,
  saveStoredEVCVisits,
  INITIAL_EXPERTS
} from '../src/data/mockData.ts';
import { EVCVisit, ExpertProfile } from '../src/types/index.ts';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      await res;
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runEVCTests() {
  console.log('\n============================================================');
  console.log('AICTE Workflow Automation — EVC Visit Workflow & Validation Tests');
  console.log('============================================================\n');

  // Test Fixture Data
  const sampleExperts: ExpertProfile[] = [
    {
      id: 'exp-1',
      name: 'Prof. (Dr.) Amitabh Mohanty',
      designation: 'Senior Professor & Former HOD',
      institution: 'Indian Institute of Technology Bombay',
      discipline: 'Mechanical & Automation Engineering',
      city: 'Mumbai',
      state: 'Maharashtra',
      completedVisits: 38,
      status: 'Available',
      rating: 4.9
    },
    {
      id: 'exp-2',
      name: 'Prof. Manisha Verma',
      designation: 'Professor of Computer Science',
      institution: 'Indian Institute of Technology Delhi',
      discipline: 'Computer Science & AI',
      city: 'New Delhi',
      state: 'Delhi',
      completedVisits: 24,
      status: 'Available',
      rating: 4.8
    },
    {
      id: 'exp-3',
      name: 'Dr. Savita Deshpande',
      designation: 'Associate Dean of Infrastructure',
      institution: 'VJTI Mumbai',
      discipline: 'Civil & Environmental Engineering',
      city: 'Mumbai',
      state: 'Maharashtra',
      completedVisits: 19,
      status: 'Available',
      rating: 4.7
    }
  ];

  const testVisit: EVCVisit = {
    id: 'test-evc-lifecycle-001',
    visitCode: 'EVC/TEST/2026/001',
    applicationNumber: 'AICTE/TEST/APP/101',
    instituteName: 'Test Engineering Academy',
    instituteCode: 'TEA-MUM-999',
    city: 'Mumbai',
    state: 'Maharashtra',
    visitDate: '2026-11-15',
    visitTime: '10:00 AM IST',
    visitMode: 'Virtual Video EVC',
    status: 'Scheduled',
    chairman: 'Prof. (Dr.) Amitabh Mohanty',
    experts: ['Prof. Manisha Verma'],
    convenor: 'Shri Assistant Director',
    instructions: 'Live streaming audit.'
  };

  // Seed storage
  saveStoredEVCVisits([testVisit]);

  // -------------------------------------------------------------------------
  // Scenario 1: A Scheduled visit can be started (Scheduled -> In Progress)
  // -------------------------------------------------------------------------
  console.log('1. Scheduled visit can be started:');
  await test('Scheduled -> In Progress transition is valid in workflow logic', () => {
    assert.strictEqual(isValidEVCTransition('Scheduled', 'In Progress'), true);
    assert.strictEqual(getNextEVCStatus('Scheduled'), 'In Progress');
  });

  await test('Starting a Scheduled visit updates status and sets startedAt timestamp', async () => {
    const res = await dataService.updateEVCVisitStatus('test-evc-lifecycle-001', 'In Progress', 'Inspection started by committee');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.visit?.status, 'In Progress');
    assert.ok(res.visit?.startedAt);

    // Verify in stored data
    const stored = getStoredEVCVisits().find(v => v.id === 'test-evc-lifecycle-001');
    assert.strictEqual(stored?.status, 'In Progress');
  });

  // -------------------------------------------------------------------------
  // Scenario 2: An In Progress visit can have its report submitted
  // -------------------------------------------------------------------------
  console.log('\n2. In Progress visit can submit report:');
  await test('In Progress -> Report Submitted transition is valid in workflow logic', () => {
    assert.strictEqual(isValidEVCTransition('In Progress', 'Report Submitted'), true);
    assert.strictEqual(getNextEVCStatus('In Progress'), 'Report Submitted');
  });

  await test('Submitting report updates status to Report Submitted with reportSubmittedAt', async () => {
    const res = await dataService.updateEVCVisitStatus('test-evc-lifecycle-001', 'Report Submitted', 'Inspection report uploaded');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.visit?.status, 'Report Submitted');
    assert.ok(res.visit?.reportSubmittedAt);

    const stored = getStoredEVCVisits().find(v => v.id === 'test-evc-lifecycle-001');
    assert.strictEqual(stored?.status, 'Report Submitted');
  });

  // -------------------------------------------------------------------------
  // Scenario 3: A Report Submitted visit can be verified
  // -------------------------------------------------------------------------
  console.log('\n3. Report Submitted visit can be verified:');
  await test('Report Submitted -> Verified transition is valid in workflow logic', () => {
    assert.strictEqual(isValidEVCTransition('Report Submitted', 'Verified'), true);
    assert.strictEqual(getNextEVCStatus('Report Submitted'), 'Verified');
  });

  await test('Verifying report updates status to Verified with verifiedAt', async () => {
    const res = await dataService.updateEVCVisitStatus('test-evc-lifecycle-001', 'Verified', 'Findings verified and cleared');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.visit?.status, 'Verified');
    assert.ok(res.visit?.verifiedAt);

    const stored = getStoredEVCVisits().find(v => v.id === 'test-evc-lifecycle-001');
    assert.strictEqual(stored?.status, 'Verified');
  });

  // -------------------------------------------------------------------------
  // Scenario 4: A Verified visit cannot progress again
  // -------------------------------------------------------------------------
  console.log('\n4. Verified visit cannot progress again:');
  await test('Verified visit returns null for next status', () => {
    assert.strictEqual(getNextEVCStatus('Verified'), null);
  });

  await test('Verified visit rejects any further transition attempt', async () => {
    assert.strictEqual(isValidEVCTransition('Verified', 'Scheduled'), false);
    assert.strictEqual(isValidEVCTransition('Verified', 'In Progress'), false);
    assert.strictEqual(isValidEVCTransition('Verified', 'Report Submitted'), false);
    assert.strictEqual(isValidEVCTransition('Verified', 'Verified'), false);

    const res = await dataService.updateEVCVisitStatus('test-evc-lifecycle-001', 'In Progress');
    assert.strictEqual(res.success, false);
    assert.ok(res.error && res.error.includes('Invalid status transition'));
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Invalid status transitions are rejected
  // -------------------------------------------------------------------------
  console.log('\n5. Invalid status transitions are rejected:');
  await test('Skipping statuses (Scheduled -> Verified) is rejected', () => {
    assert.strictEqual(isValidEVCTransition('Scheduled', 'Verified'), false);
    assert.strictEqual(isValidEVCTransition('Scheduled', 'Report Submitted'), false);
  });

  await test('Backward transitions (Report Submitted -> Scheduled) are rejected', () => {
    assert.strictEqual(isValidEVCTransition('Report Submitted', 'Scheduled'), false);
    assert.strictEqual(isValidEVCTransition('Report Submitted', 'In Progress'), false);
    assert.strictEqual(isValidEVCTransition('In Progress', 'Scheduled'), false);
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Assigning the same person twice is blocked
  // -------------------------------------------------------------------------
  console.log('\n6. Duplicate experts in same panel are blocked:');
  await test('Assigning the same expert multiple times is blocked', () => {
    const val = validateEVCTeam(
      'Prof. (Dr.) Amitabh Mohanty',
      ['Prof. Manisha Verma', 'Prof. Manisha Verma'],
      sampleExperts
    );
    assert.strictEqual(val.valid, false);
    assert.ok(val.error && val.error.includes('assigned more than once'));
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Assigning the Chairman as an Expert is blocked
  // -------------------------------------------------------------------------
  console.log('\n7. Chairman serving as Expert is blocked:');
  await test('A person cannot serve as both Chairman and Expert on the same visit', () => {
    const val = validateEVCTeam(
      'Prof. (Dr.) Amitabh Mohanty',
      ['Prof. (Dr.) Amitabh Mohanty'],
      sampleExperts
    );
    assert.strictEqual(val.valid, false);
    assert.ok(val.error && val.error.includes('cannot serve as both Chairman and Subject Expert'));
  });

  await test('Title variation matching still detects Chairman as Expert (e.g. "Dr. Amitabh Mohanty")', () => {
    const val = validateEVCTeam(
      'Prof. (Dr.) Amitabh Mohanty',
      ['Amitabh Mohanty'],
      sampleExperts
    );
    assert.strictEqual(val.valid, false);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: An expert with an overlapping confirmed visit cannot be assigned
  // -------------------------------------------------------------------------
  console.log('\n8. Overlapping active visit conflict check:');
  const activeVisits: EVCVisit[] = [
    {
      id: 'active-visit-1',
      visitCode: 'EVC/ACTIVE/001',
      applicationNumber: 'AICTE/APP/1',
      instituteName: 'College A',
      instituteCode: 'COL-A',
      city: 'Delhi',
      state: 'Delhi',
      visitDate: '2026-11-20',
      visitTime: '10:00 AM IST',
      visitMode: 'Physical On-Site',
      status: 'Scheduled',
      chairman: 'Prof. (Dr.) Amitabh Mohanty',
      experts: ['Dr. Savita Deshpande'],
      convenor: 'Officer'
    }
  ];

  await test('Reject scheduling when Chairman already has an active visit on same date', () => {
    const avail = checkExpertAvailability(
      'Prof. (Dr.) Amitabh Mohanty',
      '2026-11-20',
      '10:00 AM IST',
      activeVisits,
      sampleExperts
    );
    assert.strictEqual(avail.isAvailable, false);
    assert.ok(avail.error && avail.error.includes('already assigned'));
  });

  await test('Reject scheduling when Subject Expert already has an active visit on same date', () => {
    const avail = checkExpertAvailability(
      'Dr. Savita Deshpande',
      '2026-11-20',
      '10:00 AM IST',
      activeVisits,
      sampleExperts
    );
    assert.strictEqual(avail.isAvailable, false);
    assert.ok(avail.error && avail.error.includes('already assigned'));
  });

  await test('Permit scheduling on a different non-overlapping date', () => {
    const avail = checkExpertAvailability(
      'Prof. (Dr.) Amitabh Mohanty',
      '2026-11-25',
      '10:00 AM IST',
      activeVisits,
      sampleExperts
    );
    assert.strictEqual(avail.isAvailable, true);
  });

  await test('Missing inspection date or time rejects availability validation', () => {
    const noDate = checkExpertAvailability('Prof. (Dr.) Amitabh Mohanty', '', '10:00 AM IST', activeVisits);
    assert.strictEqual(noDate.isAvailable, false);
    assert.ok(noDate.error && noDate.error.includes('date is missing'));

    const noTime = checkExpertAvailability('Prof. (Dr.) Amitabh Mohanty', '2026-11-20', '', activeVisits);
    assert.strictEqual(noTime.isAvailable, false);
    assert.ok(noTime.error && noTime.error.includes('time is missing'));
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Expert availability updates correctly when a visit is completed/verified
  // -------------------------------------------------------------------------
  console.log('\n9. Expert availability updates when visit is completed/verified:');
  await test('Expert is marked Assigned while participating in active Scheduled visit', () => {
    const exp = sampleExperts[0]; // Amitabh Mohanty
    const statusBefore = computeExpertStatus(exp, activeVisits);
    assert.strictEqual(statusBefore, 'Assigned');
  });

  await test('Expert becomes Available once the visit reaches Verified status', () => {
    const completedVisits: EVCVisit[] = activeVisits.map(v => ({ ...v, status: 'Verified' as const }));
    const exp = sampleExperts[0];
    const statusAfter = computeExpertStatus(exp, completedVisits);
    assert.strictEqual(statusAfter, 'Available');
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Database updates persist and are retrievable
  // -------------------------------------------------------------------------
  console.log('\n10. Persistence after update:');
  await test('Updated visit status persists in stored data', async () => {
    const freshVisits = getStoredEVCVisits();
    const target = freshVisits.find(v => v.id === 'test-evc-lifecycle-001');
    assert.strictEqual(target?.status, 'Verified');
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Failed database updates do not produce false success messages
  // -------------------------------------------------------------------------
  console.log('\n11. Error handling without false positives:');
  await test('Updating non-existent visit ID returns failure without false positive', async () => {
    const res = await dataService.updateEVCVisitStatus('non-existent-evc-999', 'In Progress');
    assert.strictEqual(res.success, false);
    assert.ok(res.error && res.error.includes('not found'));
  });

  await test('Adding visit with duplicate members returns failure without saving', async () => {
    const duplicateVisit: EVCVisit = {
      id: 'invalid-dup-visit',
      visitCode: 'EVC/INVALID/001',
      applicationNumber: 'AICTE/INVALID/01',
      instituteName: 'Invalid Academy',
      instituteCode: 'INV-01',
      city: 'Delhi',
      state: 'Delhi',
      visitDate: '2026-11-20',
      visitTime: '10:00 AM IST',
      visitMode: 'Physical On-Site',
      status: 'Scheduled',
      chairman: 'Prof. Manisha Verma',
      experts: ['Prof. Manisha Verma'], // Duplicate!
      convenor: 'Officer'
    };

    const res = await dataService.addEVCVisit(duplicateVisit);
    assert.strictEqual(res.success, false);
    assert.ok(res.error && res.error.includes('cannot serve as both Chairman and Subject Expert'));
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Existing dashboard pages and unrelated features continue working
  // -------------------------------------------------------------------------
  console.log('\n12. Backward compatibility & system integrity:');
  await test('All initial EVC visits load and compute status accurately', async () => {
    const all = await dataService.getEVCVisits();
    assert.ok(Array.isArray(all) && all.length > 0);
  });

  console.log('\n------------------------------------------------------------');
  console.log(`Test Suite Summary: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEVCTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
