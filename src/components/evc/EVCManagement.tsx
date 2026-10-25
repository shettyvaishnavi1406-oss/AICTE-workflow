import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Video,
  MapPin,
  UserCheck,
  Plus,
  Search,
  ExternalLink,
  Clock,
  FileCheck2,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { EVCVisit, ExpertProfile, Application } from '../../types';
import { suggestEvcTeam, validateTeam, ValidationWarning } from '../../lib/evcTeam';
import { saveStoredExperts } from '../../data/mockData';

interface EVCManagementProps {
  evcVisits: EVCVisit[];
  experts: ExpertProfile[];
  applications: Application[];
  onAddEVCVisit: (visit: EVCVisit) => void;
  onOpenTrackModal: (appNum?: string) => void;
  initialSelectedAppId?: string | null;
  autoOpenScheduleModal?: boolean;
  onClearInitialSelectedApp?: () => void;
}

export function deriveCityFromApplication(app?: Application): string {
  if (!app) return '';
  if ((app as any).city && typeof (app as any).city === 'string' && (app as any).city.trim()) {
    return (app as any).city.trim();
  }

  const combined = `${app.instituteName} ${app.instituteCode}`.toUpperCase();
  if (combined.includes('MUM') || combined.includes('MUMBAI')) return 'Mumbai';
  if (combined.includes('DEL') || combined.includes('DELHI')) return 'New Delhi';
  if (combined.includes('BLR') || combined.includes('BANGALORE') || combined.includes('BENGALURU')) return 'Bangalore';
  if (combined.includes('PUN') || combined.includes('PUNE')) return 'Pune';
  if (combined.includes('CHE') || combined.includes('CHENNAI') || combined.includes('MADRAS')) return 'Chennai';
  if (combined.includes('KOL') || combined.includes('KOLKATA') || combined.includes('CALCUTTA')) return 'Kolkata';
  if (combined.includes('HYD') || combined.includes('HYDERABAD')) return 'Hyderabad';
  if (combined.includes('BHO') || combined.includes('BHOPAL')) return 'Bhopal';
  if (combined.includes('KAN') || combined.includes('KANPUR')) return 'Kanpur';
  if (combined.includes('AHM') || combined.includes('AHMEDABAD')) return 'Ahmedabad';
  if (combined.includes('JAIPUR') || combined.includes('JAI')) return 'Jaipur';
  if (combined.includes('LUCKNOW') || combined.includes('LKO')) return 'Lucknow';
  if (combined.includes('NAGPUR') || combined.includes('NAG')) return 'Nagpur';

  const stateToCityMap: Record<string, string> = {
    'Maharashtra': 'Mumbai',
    'Delhi': 'New Delhi',
    'Karnataka': 'Bangalore',
    'Tamil Nadu': 'Chennai',
    'West Bengal': 'Kolkata',
    'Uttar Pradesh': 'Kanpur',
    'Madhya Pradesh': 'Bhopal',
    'Telangana': 'Hyderabad',
    'Gujarat': 'Ahmedabad',
    'Rajasthan': 'Jaipur'
  };

  if (app.state && stateToCityMap[app.state]) {
    return stateToCityMap[app.state];
  }

  const regionToCityMap: Record<string, string> = {
    'Western': 'Mumbai',
    'Northern': 'Kanpur',
    'Southern': 'Chennai',
    'Eastern': 'Kolkata',
    'South-Western': 'Bangalore',
    'Central': 'Bhopal'
  };

  if (app.region && regionToCityMap[app.region]) {
    return regionToCityMap[app.region];
  }

  return app.state || 'Headquarters';
}

export const EVCManagement: React.FC<EVCManagementProps> = ({
  evcVisits,
  experts,
  applications,
  onAddEVCVisit,
  onOpenTrackModal,
  initialSelectedAppId,
  autoOpenScheduleModal,
  onClearInitialSelectedApp
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(initialSelectedAppId || applications[0]?.id || '');
  const [city, setCity] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:00 AM IST');
  const [visitMode, setVisitMode] = useState<'Physical On-Site' | 'Virtual Video EVC'>('Virtual Video EVC');
  const [selectedChairman, setSelectedChairman] = useState(experts[0]?.name || '');
  const [selectedExpert1, setSelectedExpert1] = useState(experts[1]?.name || '');
  const [selectedExpert2, setSelectedExpert2] = useState(experts[2]?.name || '');
  const [suggestReasons, setSuggestReasons] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('Mandatory live verification of server room, labs, and faculty attendance.');

  const currentApp = applications.find(a => a.id === selectedAppId);

  const teamWarnings = useMemo(() => {
    if (!currentApp) return [];
    return validateTeam(
      { chairman: selectedChairman, members: [selectedExpert1, selectedExpert2].filter(Boolean) },
      currentApp,
      experts,
      evcVisits,
      visitDate
    );
  }, [selectedChairman, selectedExpert1, selectedExpert2, currentApp, experts, evcVisits, visitDate]);

  const handleAutoSuggest = () => {
    if (!currentApp) return;
    const suggestion = suggestEvcTeam(currentApp, experts, evcVisits, visitDate);
    if (suggestion.chairman) {
      setSelectedChairman(suggestion.chairman.name);
    }
    if (suggestion.members[0]) {
      setSelectedExpert1(suggestion.members[0].name);
    }
    if (suggestion.members[1]) {
      setSelectedExpert2(suggestion.members[1].name);
    }
    setSuggestReasons(suggestion.reasons);
  };

  // Preselect application and auto-open modal if triggered from an entry point
  React.useEffect(() => {
    if (initialSelectedAppId) {
      setSelectedAppId(initialSelectedAppId);
      const app = applications.find(a => a.id === initialSelectedAppId);
      if (app) {
        setCity(deriveCityFromApplication(app));
      }
      if (autoOpenScheduleModal) {
        setShowScheduleModal(true);
      }
    }
  }, [initialSelectedAppId, autoOpenScheduleModal, applications]);

  // Update derived city when institution changes
  React.useEffect(() => {
    const app = applications.find(a => a.id === selectedAppId);
    if (app) {
      setCity(deriveCityFromApplication(app));
    }
  }, [selectedAppId, applications]);

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const app = applications.find(a => a.id === selectedAppId);
    if (!app) {
      alert('Please select a valid institution.');
      return;
    }
    if (!visitDate) {
      alert('Please select a valid inspection date.');
      return;
    }

    const blockingErrors = teamWarnings.filter(w => w.severity === 'error');
    if (blockingErrors.length > 0) {
      alert('Cannot schedule EVC Panel due to errors:\n' + blockingErrors.map(w => '• ' + w.message).join('\n'));
      return;
    }

    const softWarnings = teamWarnings.filter(w => w.severity === 'warning');
    if (softWarnings.length > 0) {
      const confirmed = window.confirm(
        'Warning:\n' + softWarnings.map(w => '• ' + w.message).join('\n') + '\n\nDo you want to proceed with this team configuration?'
      );
      if (!confirmed) return;
    }

    const determinedCity = city.trim() || deriveCityFromApplication(app);
    const chosenExperts = [selectedExpert1, selectedExpert2].filter(Boolean);

    const newVisit: EVCVisit = {
      id: `evc-${Date.now()}`,
      visitCode: `EVC/${app.region.slice(0, 2).toUpperCase()}/2026/${Math.floor(100 + Math.random() * 900)}`,
      applicationNumber: app.applicationNumber,
      instituteName: app.instituteName,
      instituteCode: app.instituteCode,
      city: determinedCity,
      state: app.state,
      visitDate,
      visitTime,
      visitMode,
      status: 'Scheduled',
      chairman: selectedChairman,
      experts: chosenExperts,
      convenor: 'Shri R. K. Verma (Assistant Director AICTE)',
      meetingLink: visitMode === 'Virtual Video EVC' ? `https://evc-meet.aicte-india.org/room/${app.instituteCode.toLowerCase()}` : undefined,
      instructions,
      criticalFindings: 'Committee officially constituted.'
    };

    // Rule 3: Set chosen experts' status to 'Assigned' in local storage
    const allAssigned = [selectedChairman, ...chosenExperts];
    const updatedExperts = experts.map(exp => {
      if (allAssigned.some(name => exp.name === name || name.includes(exp.name))) {
        return { ...exp, status: 'Assigned' as const };
      }
      return exp;
    });
    saveStoredExperts(updatedExperts);

    onAddEVCVisit(newVisit);
    setShowScheduleModal(false);
    setSuggestReasons([]);
    onClearInitialSelectedApp?.();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">


            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              Expert Visit Committee (EVC) Management
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Coordinate on-site physical inspection panels, virtual video EVC sessions, expert roster assignments, and committee findings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-1.5 bg-gov-saffron hover:bg-gov-saffron-dark text-slate-950 font-bold text-xs px-3.5 py-2 rounded shadow-sm border border-amber-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule New EVC Panel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verified Expert Roster Preview */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gov-navy" />
            <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
              Empanelled Academic &amp; Industrial Experts ({experts.length})
            </h3>
          </div>
          <span className="text-[11px] text-gov-slate-500">AICTE National Expert Database</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {experts.map((exp) => (
            <div key={exp.id} className="border border-gov-slate-200 rounded p-3 bg-gov-slate-50 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gov-navy truncate">{exp.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${exp.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                  {exp.status}
                </span>
              </div>
              <div className="text-gov-slate-600 mt-0.5 truncate">{exp.designation}</div>
              <div className="text-gov-slate-500 text-[11px] truncate">{exp.institution}</div>
              <div className="mt-2 pt-2 border-t border-gov-slate-200 flex items-center justify-between text-[11px] text-gov-slate-500">
                <span>{exp.discipline}</span>
                <span className="font-semibold text-amber-700">★ {exp.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EVC Visits List */}
      <div className="bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gov-slate-200 bg-gov-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gov-navy">Constituted EVC Panels ({evcVisits.length})</h3>
          <span className="text-xs text-gov-slate-500">Live Video EVC protocol compliant</span>
        </div>

        <div className="divide-y divide-gov-slate-200">
          {evcVisits.map((visit) => (
            <div key={visit.id} className="p-5 hover:bg-gov-slate-50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {visit.visitCode}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${visit.visitMode === 'Virtual Video EVC'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                      {visit.visitMode}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                      {visit.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gov-slate-900">
                    {visit.instituteName}
                  </h3>

                  <div className="text-xs text-gov-slate-600 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gov-slate-400" />
                      {visit.visitDate} ({visit.visitTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gov-slate-400" />
                      {visit.city}, {visit.state}
                    </span>
                    <span>
                      Application: <strong className="font-mono">{visit.applicationNumber}</strong>
                    </span>
                  </div>

                  <div className="text-xs bg-gov-slate-100 p-2.5 rounded border border-gov-slate-200 mt-2 space-y-1">
                    <div><strong>Committee Chairman:</strong> {visit.chairman}</div>
                    <div><strong>Subject Experts:</strong> {visit.experts.join(', ')}</div>
                    <div><strong>Regional Convenor:</strong> {visit.convenor}</div>
                    {visit.criticalFindings && (
                      <div className="text-emerald-800 font-medium">
                        <strong>Findings:</strong> {visit.criticalFindings}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                  {visit.meetingLink && (
                    <a
                      href={visit.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 bg-gov-navy hover:bg-gov-navy-light text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm"
                    >
                      <Video className="w-3.5 h-3.5 text-amber-300" />
                      <span>Launch Video EVC Room</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenTrackModal(visit.applicationNumber)}
                    className="text-xs text-gov-navy hover:underline font-semibold"
                  >
                    View Application Dossier
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule EVC Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-saffron">
              <h3 className="font-bold text-sm">Schedule Expert Visit Committee (EVC) Panel</h3>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  onClearInitialSelectedApp?.();
                }}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Select Technical Institution:
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                >
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.instituteName} ({app.applicationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                    Inspection Date <span className="text-rose-600">*</span>:
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                    Inspection City:
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Derived from institute data"
                    className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                    Mode of Inspection:
                  </label>
                  <select
                    value={visitMode}
                    onChange={(e) => setVisitMode(e.target.value as any)}
                    className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  >
                    <option value="Virtual Video EVC">Virtual Video EVC (Live Streaming)</option>
                    <option value="Physical On-Site">Physical On-Site Inspection</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gov-navy">EVC Committee Panel:</span>
                  <button
                    type="button"
                    onClick={handleAutoSuggest}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gov-navy bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded border border-amber-300 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Auto-suggest team</span>
                  </button>
                </div>

                {suggestReasons.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded text-[11px] text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-amber-900">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Auto-suggested Panel Rationale:</span>
                    </div>
                    {suggestReasons.map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Committee Chairman <span className="text-rose-600">*</span>:
                    </label>
                    <select
                      value={selectedChairman}
                      onChange={(e) => setSelectedChairman(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    >
                      <option value="">-- Select Chairman --</option>
                      {experts.map(e => (
                        <option key={e.id} value={e.name}>
                          {e.name} ({e.state} • ★ {e.rating})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Subject Expert 1 <span className="text-rose-600">*</span>:
                    </label>
                    <select
                      value={selectedExpert1}
                      onChange={(e) => setSelectedExpert1(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    >
                      <option value="">-- Select Expert 1 --</option>
                      {experts.map(e => (
                        <option key={e.id} value={e.name}>
                          {e.name} ({e.discipline} • {e.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Subject Expert 2 <span className="text-rose-600">*</span>:
                    </label>
                    <select
                      value={selectedExpert2}
                      onChange={(e) => setSelectedExpert2(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    >
                      <option value="">-- Select Expert 2 --</option>
                      {experts.map(e => (
                        <option key={e.id} value={e.name}>
                          {e.name} ({e.discipline} • {e.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live validation warnings */}
                {teamWarnings.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {teamWarnings.map((w, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-1.5 p-2 rounded text-[11px] ${
                          w.severity === 'error'
                            ? 'bg-rose-50 border border-rose-200 text-rose-800'
                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Specific Inspection Instructions:
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gov-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    onClearInitialSelectedApp?.();
                  }}
                  className="px-3 py-1.5 border border-gov-slate-300 rounded text-xs font-semibold text-gov-slate-700 hover:bg-gov-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-sm"
                >
                  Issue EVC Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
