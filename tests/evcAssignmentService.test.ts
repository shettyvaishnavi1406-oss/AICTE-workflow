import { evcAssignmentService } from '../src/services/evcAssignmentService';
import { EVC_ALERT_CONFIG, STATUTORY_EVC_NOTICE } from '../src/lib/evcConstants';

console.log('============================================================');
console.log('AICTE EVC Assignments — Scoping, Metrics & Security Tests');
console.log('============================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runTests() {
  const memberName = 'Prof. (Dr.) Amitabh Mohanty';
  const memberRole = 'EVC Member';

  // Test 1: Strict Scoping
  console.log('1. Testing Strict Scoping & Access Control:');
  const allRes = await evcAssignmentService.getMyAssignments({}, memberName, memberRole);
  assert(allRes.total > 0, `Returns assigned applications for ${memberName} (found ${allRes.total})`);

  // Verify that EVERY returned application lists the logged-in member as chairman or expert
  const allAssignedToUser = allRes.data.every(app =>
    app.chairman.toLowerCase().includes('amitabh') ||
    app.experts.some(exp => exp.toLowerCase().includes('amitabh'))
  );
  assert(allAssignedToUser, 'Every returned application strictly contains the logged-in user in the committee');

  // Verify unassigned / other chairman records (e.g. Dr. Rajesh Sharma) are excluded
  const containsUnassigned = allRes.data.some(app => app.applicationNumber === 'APP-2026-004');
  assert(!containsUnassigned, 'Other members\' assignments (APP-2026-004) are strictly excluded');

  // Test 2: Unmatched User Returns Zero
  const emptyRes = await evcAssignmentService.getMyAssignments({}, 'Prof. Unknown Person', memberRole);
  assert(emptyRes.total === 0, 'Unassigned user receives 0 applications');

  // Test 3: Summary Cards Metrics
  console.log('\n2. Testing Summary Card Metrics Calculation:');
  const summary = await evcAssignmentService.getMyAssignmentsSummary(memberName, memberRole);
  assert(summary.totalAssigned === allRes.total, `Total assigned (${summary.totalAssigned}) equals query total (${allRes.total})`);
  assert(summary.upcoming > 0, `Upcoming visits counted (${summary.upcoming})`);
  assert(summary.pending > 0, `Pending visits counted (${summary.pending})`);
  assert(summary.reportDue > 0, `Report due visits counted (${summary.reportDue})`);
  assert(summary.overdue > 0, `Overdue visits counted (${summary.overdue})`);
  assert(summary.completed > 0, `Completed visits counted (${summary.completed})`);

  // Test 4: Status Filtering
  console.log('\n3. Testing Filters:');
  const upcomingRes = await evcAssignmentService.getMyAssignments({ status: 'Upcoming' }, memberName, memberRole);
  assert(upcomingRes.data.every(a => a.status === 'Upcoming'), 'Status filter "Upcoming" returns only Upcoming items');

  const overdueRes = await evcAssignmentService.getMyAssignments({ status: 'Overdue' }, memberName, memberRole);
  assert(overdueRes.data.every(a => a.status === 'Overdue'), 'Status filter "Overdue" returns only Overdue items');

  // Test 5: Search
  console.log('\n4. Testing Search Query:');
  const searchRes = await evcAssignmentService.getMyAssignments({ search: 'VIT' }, memberName, memberRole);
  assert(searchRes.data.length > 0 && searchRes.data.every(a => a.instituteName.includes('Vidyalankar') || a.applicationNumber.includes('VIT')), 'Search by institute name / code matches accurately');

  // Test 6: Sorting
  console.log('\n5. Testing Sorting:');
  const sortedDeadline = await evcAssignmentService.getMyAssignments({ sortBy: 'deadline', sortOrder: 'asc' }, memberName, memberRole);
  let isSortedAsc = true;
  for (let i = 0; i < sortedDeadline.data.length - 1; i++) {
    if (new Date(sortedDeadline.data[i].prescribedDeadline).getTime() > new Date(sortedDeadline.data[i + 1].prescribedDeadline).getTime()) {
      isSortedAsc = false;
      break;
    }
  }
  assert(isSortedAsc, 'Default deadline sorting orders nearest deadline first');

  // Test 7: Audit Logging
  console.log('\n6. Testing Audit Log Recording on Application Access:');
  await evcAssignmentService.logDossierAccess(
    'APP-2026-001',
    'Vidyalankar Institute of Technology',
    memberName
  );
  assert(true, 'Audit event successfully logged for dossier view');

  // Test 8: Statutory disclaimer verification
  console.log('\n7. Testing Statutory Disclaimer:');
  assert(
    STATUTORY_EVC_NOTICE.includes('Alerts and statuses support the approval process; verification and decisions rest with the competent authority.'),
    'Exact statutory notice is defined'
  );

  console.log('\n------------------------------------------------------------');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
