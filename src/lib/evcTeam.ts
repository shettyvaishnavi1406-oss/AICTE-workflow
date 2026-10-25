import { Application, ExpertProfile, EVCVisit } from '../types';

export const EVC_TEAM_CONFIG = {
  CHAIRMAN_COUNT: 1,
  MEMBERS_COUNT: 2
};

export interface TeamSuggestion {
  chairman: ExpertProfile | null;
  members: ExpertProfile[];
  reasons: string[];
}

export interface ValidationWarning {
  field?: 'chairman' | 'expert1' | 'expert2' | 'team';
  type: 'conflict' | 'unavailable' | 'double_booked' | 'duplicate' | 'wrong_size';
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Checks whether an expert has a conflict of interest with the applicant institution.
 * Excludes experts whose state equals the application state or whose institution equals applicant institute.
 */
export function hasConflictOfInterest(expert: ExpertProfile, application: Application): { hasConflict: boolean; reason?: string } {
  if (!expert || !application) return { hasConflict: false };

  const expState = (expert.state || '').trim().toLowerCase();
  const appState = (application.state || '').trim().toLowerCase();
  if (expState && appState && expState === appState) {
    return {
      hasConflict: true,
      reason: `Same state conflict: ${expert.name} is based in ${expert.state}, matching the applicant institution's state.`
    };
  }

  const expInst = (expert.institution || '').trim().toLowerCase();
  const appInst = (application.instituteName || '').trim().toLowerCase();
  const appCode = (application.instituteCode || '').trim().toLowerCase();
  if (expInst && (expInst === appInst || appInst.includes(expInst) || expInst.includes(appCode))) {
    return {
      hasConflict: true,
      reason: `Institutional affiliation conflict: ${expert.name} is affiliated with ${expert.institution}.`
    };
  }

  return { hasConflict: false };
}

/**
 * Checks whether an expert is already booked on the specified visitDate in existing visits.
 */
export function isExpertDoubleBooked(expertName: string, visitDate: string, visits: EVCVisit[]): boolean {
  if (!expertName || !visitDate || !visits) return false;
  const nameNorm = expertName.trim().toLowerCase();

  return visits.some(v => {
    if (v.visitDate !== visitDate) return false;
    const chairNorm = (v.chairman || '').trim().toLowerCase();
    if (chairNorm.includes(nameNorm) || nameNorm.includes(chairNorm)) return true;
    return (v.experts || []).some(exp => {
      const eNorm = exp.trim().toLowerCase();
      return eNorm.includes(nameNorm) || nameNorm.includes(eNorm);
    });
  });
}

/**
 * Checks whether an expert's discipline matches the application requirements.
 */
export function isDisciplineMatch(expert: ExpertProfile, application: Application): boolean {
  if (!expert.discipline) return false;
  const appText = `${application.applicationType} ${application.remarks || ''} ${application.instituteName}`.toLowerCase();
  const expDisc = expert.discipline.toLowerCase();

  const keywords: Record<string, string[]> = {
    computer: ['computer', 'data', 'artificial intelligence', 'ai', 'cse', 'it', 'software', 'cloud'],
    mechanical: ['mechanical', 'automation', 'robotics', 'automobile', 'manufacturing'],
    civil: ['civil', 'environmental', 'infrastructure', 'building', 'safety', 'fire'],
    electrical: ['electrical', 'electronics', 'power', 'telecom', 'vlsi'],
    pharmacy: ['pharmaceutical', 'pharmacy', 'chemistry', 'drug']
  };

  for (const group of Object.values(keywords)) {
    const appMatches = group.some(kw => appText.includes(kw));
    const expMatches = group.some(kw => expDisc.includes(kw));
    if (appMatches && expMatches) return true;
  }

  return false;
}

/**
 * Suggests an optimal EVC committee (1 Chairman + 2 Subject Experts) for an application.
 */
export function suggestEvcTeam(
  application: Application,
  experts: ExpertProfile[],
  existingVisits: EVCVisit[],
  visitDate?: string
): TeamSuggestion {
  const reasons: string[] = [];

  // Filter: only status === 'Available'
  const availableExperts = experts.filter(e => e.status === 'Available');

  // Filter: no conflict of interest (different state & institution)
  const nonConflicted = availableExperts.filter(e => !hasConflictOfInterest(e, application).hasConflict);

  // Filter: no double-booking on visitDate
  const eligible = nonConflicted.filter(e => !visitDate || !isExpertDoubleBooked(e.name, visitDate, existingVisits));

  if (eligible.length === 0) {
    return {
      chairman: null,
      members: [],
      reasons: ['No eligible experts found without conflict of interest and with Available status.']
    };
  }

  // Chairman: Highest-rated available expert (tie-breaker: lower completed visits)
  const chairmanCandidates = [...eligible].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.completedVisits - b.completedVisits;
  });

  const chairman = chairmanCandidates[0];
  reasons.push(
    `Chairman: ${chairman.name} (${chairman.institution}, ${chairman.state}) chosen as highest-rated available expert (★ ${chairman.rating}, ${chairman.completedVisits} visits completed).`
  );

  // Remaining pool for subject experts
  const memberPool = eligible.filter(e => e.id !== chairman.id);

  // Sort member pool: discipline match first, then higher rating, then fewer completedVisits
  const sortedMembers = [...memberPool].sort((a, b) => {
    const aMatch = isDisciplineMatch(a, application) ? 1 : 0;
    const bMatch = isDisciplineMatch(b, application) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.completedVisits - b.completedVisits;
  });

  const members = sortedMembers.slice(0, EVC_TEAM_CONFIG.MEMBERS_COUNT);

  members.forEach((m, idx) => {
    const matched = isDisciplineMatch(m, application);
    reasons.push(
      `Subject Expert #${idx + 1}: ${m.name} (${m.discipline}, ${m.state}) ${
        matched ? '[Discipline match]' : '[Empanelled panelist]'
      } — ★ ${m.rating}, ${m.completedVisits} visits.`
    );
  });

  reasons.push(
    `Conflict-of-Interest verified: Zero members affiliated with ${application.instituteCode} or based in ${application.state}.`
  );

  if (visitDate) {
    reasons.push(`Double-booking check passed: No panelist committed to another inspection on ${visitDate}.`);
  }

  return {
    chairman,
    members,
    reasons
  };
}

/**
 * Validates a team selection returning warnings and blocking errors.
 */
export function validateTeam(
  team: { chairman: string; members: string[] },
  application: Application,
  experts: ExpertProfile[],
  visits: EVCVisit[],
  visitDate?: string
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const selectedNames = [team.chairman, ...team.members].filter(Boolean);

  // 1. Wrong size check
  if (!team.chairman) {
    warnings.push({
      field: 'chairman',
      type: 'wrong_size',
      severity: 'error',
      message: 'Committee Chairman must be selected.'
    });
  }

  const activeMembers = team.members.filter(Boolean);
  if (activeMembers.length < EVC_TEAM_CONFIG.MEMBERS_COUNT) {
    warnings.push({
      field: 'team',
      type: 'wrong_size',
      severity: 'warning',
      message: `Panel requires ${EVC_TEAM_CONFIG.MEMBERS_COUNT} subject experts (currently ${activeMembers.length} selected).`
    });
  }

  // 2. Duplicate member check
  const seen = new Set<string>();
  for (const name of selectedNames) {
    const clean = name.trim().toLowerCase();
    if (seen.has(clean)) {
      warnings.push({
        field: 'team',
        type: 'duplicate',
        severity: 'error',
        message: `Duplicate panelist: "${name}" cannot be assigned multiple roles on the same EVC panel.`
      });
    }
    seen.add(clean);
  }

  // 3. Expert-specific checks
  const checkExpert = (name: string, field: 'chairman' | 'expert1' | 'expert2') => {
    if (!name) return;
    const cleanName = name.trim().toLowerCase();
    const expert = experts.find(
      e => e.name.toLowerCase() === cleanName || cleanName.includes(e.name.toLowerCase()) || e.id === name
    );

    if (!expert) return;

    // Availability check
    if (expert.status !== 'Available') {
      warnings.push({
        field,
        type: 'unavailable',
        severity: 'error',
        message: `Unavailable expert: ${expert.name} is currently marked as "${expert.status}" (must be "Available").`
      });
    }

    // Conflict of interest check
    const conflict = hasConflictOfInterest(expert, application);
    if (conflict.hasConflict && conflict.reason) {
      warnings.push({
        field,
        type: 'conflict',
        severity: 'error',
        message: conflict.reason
      });
    }

    // Double-booking check
    if (visitDate && isExpertDoubleBooked(expert.name, visitDate, visits)) {
      warnings.push({
        field,
        type: 'double_booked',
        severity: 'error',
        message: `Double-booking: ${expert.name} is already assigned to an inspection on ${visitDate}.`
      });
    }
  };

  if (team.chairman) checkExpert(team.chairman, 'chairman');
  if (team.members[0]) checkExpert(team.members[0], 'expert1');
  if (team.members[1]) checkExpert(team.members[1], 'expert2');

  return warnings;
}
