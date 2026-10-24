import assert from 'node:assert';
import {
  calculateMilestoneProgress,
  deriveApplicationProgress,
  findMatchingEVCVisit,
  isEVCVisitVerified
} from '../src/lib/workflow';
import { dataService } from '../src/services/dataService';
import { Application, EVCVisit, ApplicationStage } from '../src/types';
import { getStoredApplications, saveStoredApplications, getStoredEVCVisits, saveStoredEVCVisits } from '../src/data/mockData';

let testCount = 0;
let passedCount = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  testCount++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.message || err}`);
    throw err;
  }
}

async function runMilestoneSyncTests() {
  console.log('\n============================================================');
  console.log('AICTE Workflow — Statutory Milestone & EVC Sync Tests');
  console.log('============================================================\n');

  // Baseline Vidyalankar test application record
  const vidyalankarApp: Application = {
    id: 'app-001',
    applicationNumber: 'AICTE/2026/WR/1-938201',
    instituteName: 'Vidyalankar Institute of Technology',
    instituteCode: 'VIT-MUM-142',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Extension of Approval (EoA)',
    academicYear: '2026-27',
    submissionDate: '2026-09-14',
    currentStage: 'EVC Scheduled',
    stageProgress: 40,
    processingDays: 41,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-201',
    feePaid: 250000,
    totalIntakeProposed: 720,
    complianceRating: 'High',
    contactPerson: 'Dr. Suresh R. Patil',
    contactEmail: 'principal@vit.edu.in',
    contactPhone: '+91 98201 34521',
    documents: [
      { name: 'Fire NOC Certificate 2026', verified: true, dateUploaded: '2026-09-15' },
      { name: 'Land Registry Deed', verified: true, dateUploaded: '2026-09-15' },
      { name: 'AICTE Cadre Ratio Affidavit', verified: true, dateUploaded: '2026-09-16' },
      { name: 'NBA Accreditation Certificate', verified: true, dateUploaded: '2026-09-18' }
    ]
  };

  const vidyalankarVisit: EVCVisit = {
    id: 'evc-201',
    visitCode: 'EVC/WR/2026/089',
    applicationNumber: 'AICTE/2026/WR/1-938201',
    instituteName: 'Vidyalankar Institute of Technology',
    instituteCode: 'VIT-MUM-142',
    city: 'Mumbai',
    state: 'Maharashtra',
    visitDate: '2026-10-28',
    visitTime: '10:30 AM IST',
    visitMode: 'Virtual Video EVC',
    status: 'Scheduled',
    chairman: 'Prof. (Dr.) Amitabh Mohanty',
    experts: ['Dr. Savita Deshpande', 'Prof. K. N. Sridhar'],
    convenor: 'Shri Manoj Sharma'
  };

  // 1. Vidyalankar Specific Fix Verification
  console.log('1. Testing Vidyalankar Institute Statutory Progress:');
  await test('Vidyalankar with Scheduled EVC visit calculates to 40% (never 100%)', () => {
    const result = calculateMilestoneProgress(vidyalankarApp, vidyalankarVisit);
    assert.strictEqual(result.percentage, 40, 'Vidyalankar progress must be 40%');
    assert.notStrictEqual(result.percentage, 100, 'Vidyalankar must never show 100% when EVC is only scheduled');
    assert.strictEqual(result.completedCount, 2);
    assert.strictEqual(result.totalApplicable, 5);

    const evcMilestone = result.milestones.find(m => m.id === 'evc');
    assert.strictEqual(evcMilestone?.isCompleted, false, 'EVC milestone must be incomplete');
    assert.strictEqual(evcMilestone?.status, 'in_progress', 'EVC milestone status must be in_progress');
  });

  // 2. Scheduled Visit
  console.log('\n2. Testing Scheduled Visit Milestone Rules:');
  await test('Scheduled visit leaves EVC verification milestone incomplete', () => {
    const visit: EVCVisit = { ...vidyalankarVisit, status: 'Scheduled' };
    assert.strictEqual(isEVCVisitVerified(visit), false);

    const result = calculateMilestoneProgress(vidyalankarApp, visit);
    const evcMilestone = result.milestones.find(m => m.id === 'evc');
    assert.strictEqual(evcMilestone?.isCompleted, false);
    assert.strictEqual(result.percentage, 40);
  });

  // 3. In Progress or Report Submitted
  console.log('\n3. Testing In Progress and Report Submitted Milestones:');
  await test('Visit In Progress leaves milestone requiring verification incomplete', () => {
    const visitInProgress: EVCVisit = { ...vidyalankarVisit, status: 'In Progress' };
    assert.strictEqual(isEVCVisitVerified(visitInProgress), false);

    const result = calculateMilestoneProgress(vidyalankarApp, visitInProgress);
    const evcMilestone = result.milestones.find(m => m.id === 'evc');
    assert.strictEqual(evcMilestone?.isCompleted, false);
    assert.strictEqual(result.percentage, 40);
  });

  await test('Visit Report Submitted leaves milestone requiring verification incomplete', () => {
    const visitSubmitted: EVCVisit = { ...vidyalankarVisit, status: 'Report Submitted' };
    assert.strictEqual(isEVCVisitVerified(visitSubmitted), false);

    const result = calculateMilestoneProgress(vidyalankarApp, visitSubmitted);
    const evcMilestone = result.milestones.find(m => m.id === 'evc');
    assert.strictEqual(evcMilestone?.isCompleted, false);
    assert.strictEqual(result.percentage, 40);
  });

  // 4. Verified Visit
  console.log('\n4. Testing Verified Visit Milestones:');
  await test('Verified visit marks EVC milestone completed and advances progress to 60%', () => {
    const verifiedVisit: EVCVisit = { ...vidyalankarVisit, status: 'Verified' };
    assert.strictEqual(isEVCVisitVerified(verifiedVisit), true);

    const result = calculateMilestoneProgress(vidyalankarApp, verifiedVisit);
    const evcMilestone = result.milestones.find(m => m.id === 'evc');
    assert.strictEqual(evcMilestone?.isCompleted, true);
    assert.strictEqual(evcMilestone?.status, 'completed');
    assert.strictEqual(result.completedCount, 3);
    assert.strictEqual(result.percentage, 60);
  });

  await test('Full lifecycle downstream milestones complete only when criteria satisfied', () => {
    const verifiedVisit: EVCVisit = { ...vidyalankarVisit, status: 'Verified' };
    const approvedApp: Application = { ...vidyalankarApp, currentStage: 'Approved' };

    const result = calculateMilestoneProgress(approvedApp, verifiedVisit);
    assert.strictEqual(result.completedCount, 5);
    assert.strictEqual(result.percentage, 100);
    assert.ok(result.milestones.every(m => m.isCompleted));
  });

  // 5. Progress Derived from Completed / Applicable
  console.log('\n5. Testing Progress Ratio Derivation:');
  await test('Progress matches completed divided by applicable * 100', () => {
    const draftApp: Application = { ...vidyalankarApp, currentStage: 'Draft', submissionDate: '' };
    assert.strictEqual(deriveApplicationProgress(draftApp, null), 0);

    const submittedApp: Application = { ...vidyalankarApp, currentStage: 'Submitted' };
    assert.strictEqual(deriveApplicationProgress(submittedApp, null), 20);

    const scrutinyApp: Application = { ...vidyalankarApp, currentStage: 'Scrutiny Completed' };
    assert.strictEqual(deriveApplicationProgress(scrutinyApp, null), 40);

    const evcVerifiedApp: Application = { ...vidyalankarApp, currentStage: 'EVC Completed' };
    const verifiedVisit: EVCVisit = { ...vidyalankarVisit, status: 'Verified' };
    assert.strictEqual(deriveApplicationProgress(evcVerifiedApp, verifiedVisit), 60);

    const approvedApp: Application = { ...vidyalankarApp, currentStage: 'Approved' };
    assert.strictEqual(deriveApplicationProgress(approvedApp, verifiedVisit), 100);
  });

  // 6. Missing Data & Zero Milestones
  console.log('\n6. Testing Missing Data & Zero Applicable Milestones:');
  await test('Null, undefined, or empty application never defaults to 100%', () => {
    assert.strictEqual(deriveApplicationProgress(null, null), 0);
    assert.strictEqual(deriveApplicationProgress(undefined, null), 0);
    assert.strictEqual(deriveApplicationProgress({} as Application, null), 0);

    const nullResult = calculateMilestoneProgress(null);
    assert.strictEqual(nullResult.percentage, 0);
    assert.strictEqual(nullResult.completedCount, 0);

    const emptyResult = calculateMilestoneProgress({} as Application);
    assert.strictEqual(emptyResult.percentage, 0);
  });

  // 7. Non-EVC Milestones Continue Working
  console.log('\n7. Testing Non-EVC Milestones Integrity:');
  await test('Scrutiny milestone marks deficient on Deficiency Issued stage', () => {
    const defApp: Application = { ...vidyalankarApp, currentStage: 'Deficiency Issued' };
    const res = calculateMilestoneProgress(defApp, null);
    const scrutiny = res.milestones.find(m => m.id === 'scrutiny');
    assert.strictEqual(scrutiny?.status, 'deficient');
    assert.strictEqual(scrutiny?.isCompleted, false);
  });

  await test('SAC milestone marks in_progress when stage is SAC Review', () => {
    const sacApp: Application = { ...vidyalankarApp, currentStage: 'SAC Review' };
    const res = calculateMilestoneProgress(sacApp, null);
    const sac = res.milestones.find(m => m.id === 'sac');
    assert.strictEqual(sac?.status, 'in_progress');
    assert.strictEqual(sac?.isCompleted, false);
  });

  // 8. Multi-Institution Independence
  console.log('\n8. Testing Multi-Institution Independence:');
  await test('Updating one institution EVC does not mutate another institution', async () => {
    const appA: Application = {
      ...vidyalankarApp,
      id: 'app-inst-A',
      applicationNumber: 'AICTE/INST/A',
      currentStage: 'EVC Scheduled',
      stageProgress: 40,
      evcId: 'evc-A'
    };
    const appB: Application = {
      ...vidyalankarApp,
      id: 'app-inst-B',
      applicationNumber: 'AICTE/INST/B',
      currentStage: 'EVC Scheduled',
      stageProgress: 40,
      evcId: 'evc-B'
    };
    const visitA: EVCVisit = {
      ...vidyalankarVisit,
      id: 'evc-A',
      applicationNumber: 'AICTE/INST/A',
      status: 'Scheduled'
    };
    const visitB: EVCVisit = {
      ...vidyalankarVisit,
      id: 'evc-B',
      applicationNumber: 'AICTE/INST/B',
      status: 'Scheduled'
    };

    const initialApps = getStoredApplications();
    const initialVisits = getStoredEVCVisits();
    saveStoredApplications([appA, appB, ...initialApps.filter(a => a.id !== 'app-inst-A' && a.id !== 'app-inst-B')]);
    saveStoredEVCVisits([visitA, visitB, ...initialVisits.filter(v => v.id !== 'evc-A' && v.id !== 'evc-B')]);

    // Advance visit A to In Progress -> Report Submitted -> Verified
    await dataService.updateEVCVisitStatus('evc-A', 'In Progress');
    await dataService.updateEVCVisitStatus('evc-A', 'Report Submitted');
    const updateRes = await dataService.updateEVCVisitStatus('evc-A', 'Verified', 'Lab inspection cleared');
    assert.strictEqual(updateRes.success, true);

    const reloadedApps = await dataService.getApplications();
    const loadedA = reloadedApps.find(a => a.id === 'app-inst-A');
    const loadedB = reloadedApps.find(a => a.id === 'app-inst-B');

    // Institution A progressed to 60%
    assert.strictEqual(loadedA?.stageProgress, 60, 'Inst A must reach 60% after verification');

    // Institution B must remain strictly at 40%
    assert.strictEqual(loadedB?.stageProgress, 40, 'Inst B must remain unaffected at 40%');
  });

  // 9. Page Refresh Persistence
  console.log('\n9. Testing Persistence Across Page Refresh:');
  await test('Refreshing application queries preserves accurate milestone progress', async () => {
    // Re-fetch using getApplications
    const apps = await dataService.getApplications();
    const vit = apps.find(a => a.applicationNumber === 'AICTE/2026/WR/1-938201');
    assert.ok(vit, 'Vidyalankar must exist in applications');
    assert.strictEqual(vit.stageProgress, 40, 'Vidyalankar must retain 40% progress on re-fetch');
    assert.notStrictEqual(vit.stageProgress, 100, 'Vidyalankar must never revert to 100%');
  });

  // 10. Database Failure Safe Handling
  console.log('\n10. Testing Failure Safety:');
  await test('Non-existent application or empty inputs never produce false success', async () => {
    const badRes = await dataService.updateApplicationStage('', 'Approved');
    assert.strictEqual(badRes.success, false);

    const missingRes = await dataService.updateApplicationStage('non-existent-id', 'Approved');
    assert.strictEqual(missingRes.success, false);
  });

  console.log('\n------------------------------------------------------------');
  console.log(`Milestone Sync Test Results: ${passedCount} passed, 0 failed`);
  console.log('------------------------------------------------------------\n');
}

runMilestoneSyncTests();
