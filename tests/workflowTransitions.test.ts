import assert from 'node:assert';
import {
  isValidTransition,
  getAllowedTransitions,
  calculateStageProgress,
  DEFAULT_WORKFLOW_STAGES,
  STAGE_PROGRESS_MAP
} from '../src/lib/workflow.ts';
import { dataService } from '../src/services/dataService.ts';
import {
  INITIAL_APPLICATIONS,
  getStoredApplications,
  saveStoredApplications
} from '../src/data/mockData.ts';
import { ApplicationStage, Application } from '../src/types/index.ts';

// Test runner helpers
let passedCount = 0;
let failedCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<void>)
        .then(() => {
          console.log(`  ✓ ${name}`);
          passedCount++;
        })
        .catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    ${err.message}`);
          failedCount++;
        });
    } else {
      console.log(`  ✓ ${name}`);
      passedCount++;
    }
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('AICTE Workflow Automation — Stage Transitions & Progress Tests');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // 1. Every valid forward transition
  // -------------------------------------------------------------------------
  console.log('1. Testing Valid Forward Transitions:');
  test('Draft → Submitted is valid', () => {
    assert.strictEqual(isValidTransition('Draft', 'Submitted'), true);
  });
  test('Submitted → Scrutiny is valid', () => {
    assert.strictEqual(isValidTransition('Submitted', 'Scrutiny'), true);
  });
  test('Scrutiny → EVC is valid', () => {
    assert.strictEqual(isValidTransition('Scrutiny', 'EVC'), true);
  });
  test('EVC → SAC Review is valid', () => {
    assert.strictEqual(isValidTransition('EVC', 'SAC Review'), true);
  });
  test('SAC Review → Approved is valid', () => {
    assert.strictEqual(isValidTransition('SAC Review', 'Approved'), true);
  });
  test('Granular forward transitions (Scrutiny Pending → Scrutiny Completed → EVC Scheduled → EVC Completed)', () => {
    assert.strictEqual(isValidTransition('Submitted', 'Scrutiny Pending'), true);
    assert.strictEqual(isValidTransition('Scrutiny Pending', 'Scrutiny Completed'), true);
    assert.strictEqual(isValidTransition('Scrutiny Completed', 'EVC Scheduled'), true);
    assert.strictEqual(isValidTransition('EVC Pending', 'EVC Scheduled'), true);
    assert.strictEqual(isValidTransition('EVC Scheduled', 'EVC Completed'), true);
    assert.strictEqual(isValidTransition('EVC Completed', 'SAC Review'), true);
  });

  // -------------------------------------------------------------------------
  // 2. Draft → Approved is rejected
  // -------------------------------------------------------------------------
  console.log('\n2. Testing Stage Skipping (Draft → Approved):');
  test('Draft → Approved is strictly rejected', () => {
    assert.strictEqual(isValidTransition('Draft', 'Approved'), false);
  });
  test('Draft cannot skip to Scrutiny, EVC, or SAC Review', () => {
    assert.strictEqual(isValidTransition('Draft', 'Scrutiny'), false);
    assert.strictEqual(isValidTransition('Draft', 'EVC'), false);
    assert.strictEqual(isValidTransition('Draft', 'SAC Review'), false);
  });

  // -------------------------------------------------------------------------
  // 3. Submitted → EVC is rejected
  // -------------------------------------------------------------------------
  console.log('\n3. Testing Stage Skipping (Submitted → EVC):');
  test('Submitted → EVC is strictly rejected', () => {
    assert.strictEqual(isValidTransition('Submitted', 'EVC'), false);
  });
  test('Submitted cannot skip to SAC Review or Approved', () => {
    assert.strictEqual(isValidTransition('Submitted', 'SAC Review'), false);
    assert.strictEqual(isValidTransition('Submitted', 'Approved'), false);
  });

  // -------------------------------------------------------------------------
  // 4. Backward transitions are rejected unless an explicit business rule permits them
  // -------------------------------------------------------------------------
  console.log('\n4. Testing Backward Transitions:');
  test('Approved cannot move backward to any stage', () => {
    const allStages: ApplicationStage[] = [
      'Draft', 'Submitted', 'Scrutiny', 'Scrutiny Pending', 'Scrutiny Completed',
      'EVC', 'EVC Pending', 'EVC Scheduled', 'EVC Completed', 'SAC Review',
      'Deficiency Issued', 'Rejected'
    ];
    for (const stage of allStages) {
      assert.strictEqual(
        isValidTransition('Approved', stage),
        false,
        `Approved should not transition backward to ${stage}`
      );
    }
  });

  test('SAC Review cannot move backward to EVC, Scrutiny, Submitted, or Draft', () => {
    assert.strictEqual(isValidTransition('SAC Review', 'EVC'), false);
    assert.strictEqual(isValidTransition('SAC Review', 'Scrutiny'), false);
    assert.strictEqual(isValidTransition('SAC Review', 'Submitted'), false);
    assert.strictEqual(isValidTransition('SAC Review', 'Draft'), false);
  });

  test('EVC cannot move backward to Scrutiny, Submitted, or Draft', () => {
    assert.strictEqual(isValidTransition('EVC', 'Scrutiny'), false);
    assert.strictEqual(isValidTransition('EVC', 'Submitted'), false);
    assert.strictEqual(isValidTransition('EVC', 'Draft'), false);
  });

  test('Scrutiny cannot move backward to Submitted or Draft', () => {
    assert.strictEqual(isValidTransition('Scrutiny', 'Submitted'), false);
    assert.strictEqual(isValidTransition('Scrutiny', 'Draft'), false);
  });

  test('Submitted cannot move backward to Draft', () => {
    assert.strictEqual(isValidTransition('Submitted', 'Draft'), false);
  });

  test('Explicit return-for-correction rule (Deficiency Issued) permits cure return paths', () => {
    assert.strictEqual(isValidTransition('Deficiency Issued', 'Scrutiny Completed'), true);
    assert.strictEqual(isValidTransition('Deficiency Issued', 'Scrutiny Pending'), true);
    assert.strictEqual(isValidTransition('Deficiency Issued', 'EVC Scheduled'), true);
    assert.strictEqual(isValidTransition('Deficiency Issued', 'SAC Review'), true);
    assert.strictEqual(isValidTransition('Deficiency Issued', 'Rejected'), true);
    // But Deficiency Issued cannot jump directly to Approved
    assert.strictEqual(isValidTransition('Deficiency Issued', 'Approved'), false);
  });

  // -------------------------------------------------------------------------
  // 5. Approved has no further forward transition
  // -------------------------------------------------------------------------
  console.log('\n5. Testing Terminal Approved State:');
  test('Approved offers empty allowed transitions list', () => {
    const allowed = getAllowedTransitions('Approved');
    assert.deepStrictEqual(allowed, []);
  });

  test('Rejected offers empty allowed transitions list', () => {
    const allowed = getAllowedTransitions('Rejected');
    assert.deepStrictEqual(allowed, []);
  });

  // -------------------------------------------------------------------------
  // 6. Every stage maps to the correct progress percentage
  // -------------------------------------------------------------------------
  console.log('\n6. Testing Progress Milestone Calculations:');
  test('Default 6-stage workflow milestone positions:', () => {
    assert.strictEqual(calculateStageProgress('Draft'), 0);
    assert.strictEqual(calculateStageProgress('Submitted'), 20);
    assert.strictEqual(calculateStageProgress('Scrutiny'), 40);
    assert.strictEqual(calculateStageProgress('EVC'), 60);
    assert.strictEqual(calculateStageProgress('SAC Review'), 80);
    assert.strictEqual(calculateStageProgress('Approved'), 100);
  });

  test('Sub-stages and exception stages progress mapping:', () => {
    assert.strictEqual(calculateStageProgress('Scrutiny Completed'), 40);
    assert.strictEqual(calculateStageProgress('EVC Scheduled'), 60);
    assert.strictEqual(calculateStageProgress('Deficiency Issued'), 50);
    assert.strictEqual(calculateStageProgress('Rejected'), 0);
  });

  // -------------------------------------------------------------------------
  // 7. Invalid and missing stages are handled safely
  // -------------------------------------------------------------------------
  console.log('\n7. Testing Safe Handling of Missing and Invalid Stages:');
  test('calculateStageProgress returns 0 (never 100%) for null, undefined, empty, or unknown strings', () => {
    assert.strictEqual(calculateStageProgress(null), 0);
    assert.strictEqual(calculateStageProgress(undefined), 0);
    assert.strictEqual(calculateStageProgress(''), 0);
    assert.strictEqual(calculateStageProgress('   '), 0);
    assert.strictEqual(calculateStageProgress('UNKNOWN_STAGE' as any), 0);
    assert.strictEqual(calculateStageProgress('RandomStage' as any), 0);
  });

  test('isValidTransition returns false for missing or null parameters', () => {
    assert.strictEqual(isValidTransition(null, 'Submitted'), false);
    assert.strictEqual(isValidTransition('Draft', null), false);
    assert.strictEqual(isValidTransition(undefined, undefined), false);
    assert.strictEqual(isValidTransition('', ''), false);
    assert.strictEqual(isValidTransition('Draft', 'Draft'), false);
  });

  test('getAllowedTransitions returns empty array for null, empty, or unknown stages', () => {
    assert.deepStrictEqual(getAllowedTransitions(null), []);
    assert.deepStrictEqual(getAllowedTransitions(undefined), []);
    assert.deepStrictEqual(getAllowedTransitions(''), []);
    assert.deepStrictEqual(getAllowedTransitions('UNKNOWN_STAGE'), []);
  });

  // -------------------------------------------------------------------------
  // 8. The backend rejects invalid transitions even when called without the UI
  // -------------------------------------------------------------------------
  console.log('\n8. Testing Backend API Rejection of Invalid Transitions:');
  // Seed local mock store with a draft test app
  const testApp: Application = {
    id: 'test-draft-app-001',
    applicationNumber: 'AICTE/TEST/001',
    instituteName: 'Test National Institute of Engineering',
    instituteCode: 'TNIE-001',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'New Technical Institution',
    academicYear: '2026-27',
    submissionDate: '2026-10-01',
    currentStage: 'Draft',
    stageProgress: 0,
    processingDays: 23,
    isOverdue: false,
    evcAssigned: false,
    feePaid: 100000,
    totalIntakeProposed: 300,
    complianceRating: 'High',
    contactPerson: 'Director Test',
    contactEmail: 'director@tnie.edu.in',
    contactPhone: '+91 99999 88888',
    documents: []
  };

  const stored = getStoredApplications();
  saveStoredApplications([testApp, ...stored.filter(a => a.id !== testApp.id)]);

  await test('Backend rejects Draft → Approved directly at service layer', async () => {
    const res = await dataService.updateApplicationStage('test-draft-app-001', 'Approved', 'Bypass attempt');
    assert.strictEqual(res.success, false);
    assert.ok(res.error && res.error.includes('Invalid stage transition'));

    // Verify stage did not change in store
    const checkApps = getStoredApplications();
    const app = checkApps.find(a => a.id === 'test-draft-app-001');
    assert.strictEqual(app?.currentStage, 'Draft');
    assert.strictEqual(app?.stageProgress, 0);
  });

  await test('Backend rejects Submitted → EVC directly at service layer', async () => {
    // Transition Draft to Submitted (valid)
    const validRes = await dataService.updateApplicationStage('test-draft-app-001', 'Submitted', 'Initial submission');
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(validRes.newStage, 'Submitted');
    assert.strictEqual(validRes.stageProgress, 20);

    // Now try invalid Submitted → EVC
    const invalidRes = await dataService.updateApplicationStage('test-draft-app-001', 'EVC', 'Skip scrutiny attempt');
    assert.strictEqual(invalidRes.success, false);
    assert.ok(invalidRes.error && invalidRes.error.includes('Invalid stage transition'));

    // Verify stage remains Submitted
    const checkApps = getStoredApplications();
    const app = checkApps.find(a => a.id === 'test-draft-app-001');
    assert.strictEqual(app?.currentStage, 'Submitted');
    assert.strictEqual(app?.stageProgress, 20);
  });

  await test('Backend accepts valid forward transition Submitted → Scrutiny', async () => {
    const res = await dataService.updateApplicationStage('test-draft-app-001', 'Scrutiny', 'Passed to RO scrutiny desk');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newStage, 'Scrutiny');
    assert.strictEqual(res.stageProgress, 40);

    const checkApps = getStoredApplications();
    const app = checkApps.find(a => a.id === 'test-draft-app-001');
    assert.strictEqual(app?.currentStage, 'Scrutiny');
    assert.strictEqual(app?.stageProgress, 40);
  });

  // -------------------------------------------------------------------------
  // 9. Failed database updates do not falsely report success
  // -------------------------------------------------------------------------
  console.log('\n9. Testing Safe Error Handling on Non-Existent or Failed Updates:');
  await test('Updating non-existent application returns failure without false positive', async () => {
    const res = await dataService.updateApplicationStage('non-existent-app-99999', 'Submitted', 'Test');
    assert.strictEqual(res.success, false);
    assert.ok(res.error && res.error.includes('not found'));
  });

  await test('Empty or missing stage request returns failure without false positive', async () => {
    const res = await dataService.updateApplicationStage('test-draft-app-001', '' as any, 'Test');
    assert.strictEqual(res.success, false);
    assert.ok(res.error);
  });

  console.log('\n------------------------------------------------------------');
  console.log(`Test Results: ${passedCount} passed, ${failedCount} failed`);
  console.log('------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
