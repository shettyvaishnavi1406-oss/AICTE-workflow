import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { Navbar, NavTab } from './components/common/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { ApplicationsList } from './components/applications/ApplicationsList';
import { ApplicationDetailModal } from './components/applications/ApplicationDetailModal';
import { ComplianceView } from './components/compliance/ComplianceView';
import { EVCManagement } from './components/evc/EVCManagement';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { TrackModal } from './components/common/TrackModal';

import {
  getStoredApplications,
  saveStoredApplications,
  getStoredEVCVisits,
  saveStoredEVCVisits,
  getStoredCompliance,
  saveStoredCompliance,
  getStoredAuditLogs,
  saveStoredAuditLogs,
  getStoredExperts,
  INITIAL_APPLICATIONS,
  INITIAL_EVC_VISITS,
  INITIAL_COMPLIANCE,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXPERTS
} from './data/mockData';
import { Application, ApplicationStage, EVCVisit, ComplianceRecord, AuditLogItem } from './types';
import { supabase } from './lib/supabase';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [applications, setApplications] = useState<Application[]>(getStoredApplications);
  const [evcVisits, setEvcVisits] = useState<EVCVisit[]>(getStoredEVCVisits);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(getStoredCompliance);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(getStoredAuditLogs);
  const [experts] = useState(getStoredExperts);

  // Sync compliance and audit logs from Supabase
  const refreshFromSupabase = React.useCallback(async () => {
    try {
      const { data: compData } = await supabase.from('compliance_records').select('*');
      if (compData && compData.length > 0) {
        const mapped: ComplianceRecord[] = compData.map((r: any) => ({
          id: r.id,
          instituteCode: r.institute_code,
          instituteName: r.institute_name,
          applicationNumber: r.application_number,
          category: r.category,
          title: r.title,
          validUntil: r.valid_until,
          daysRemaining: r.days_remaining,
          urgency: r.urgency,
          status: r.status,
          lastAuditDate: r.last_audit_date,
          actionRequired: r.action_required,
          escalation_level: r.escalation_level,
          escalated_at: r.escalated_at
        }));
        setComplianceRecords(mapped);
      }

      const { data: auditData } = await supabase.from('audit_logs').select('*').order('event_timestamp', { ascending: false });
      if (auditData && auditData.length > 0) {
        const mappedAudit: AuditLogItem[] = auditData.map((a: any) => ({
          id: a.id,
          timestamp: new Date(a.event_timestamp).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) + ' IST',
          actor: a.actor,
          role: a.role as any,
          action: a.action,
          applicationNumber: a.application_number,
          instituteName: a.institute_name,
          details: a.details
        }));
        setAuditLogs(mappedAudit);
      }
    } catch (e) {
      console.warn('Could not sync live records from Supabase, using local fallback:', e);
    }
  }, []);

  React.useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  // Modals state
  const [selectedAppForDossier, setSelectedAppForDossier] = useState<Application | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackInitialAppNum, setTrackInitialAppNum] = useState<string>('');

  // Reset to original mock data
  const handleResetData = () => {
    if (window.confirm('Reset all demo applications and EVC records to default values?')) {
      localStorage.clear();
      setApplications(INITIAL_APPLICATIONS);
      saveStoredApplications(INITIAL_APPLICATIONS);

      setEvcVisits(INITIAL_EVC_VISITS);
      saveStoredEVCVisits(INITIAL_EVC_VISITS);

      setComplianceRecords(INITIAL_COMPLIANCE);
      saveStoredCompliance(INITIAL_COMPLIANCE);

      setAuditLogs(INITIAL_AUDIT_LOGS);
      saveStoredAuditLogs(INITIAL_AUDIT_LOGS);

      alert('Prototype records restored to initial demo state.');
    }
  };


  // Stage update workflow (Member 1)
  const handleUpdateStage = (appId: string, newStage: ApplicationStage, remark: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    let newProgress = targetApp.stageProgress;
    if (newStage === 'Scrutiny Completed') newProgress = 40;
    else if (newStage === 'EVC Scheduled') newProgress = 65;
    else if (newStage === 'SAC Review') newProgress = 85;
    else if (newStage === 'Approved') newProgress = 100;
    else if (newStage === 'Deficiency Issued') newProgress = 50;

    const updated = applications.map((app) =>
      app.id === appId
        ? {
            ...app,
            currentStage: newStage,
            stageProgress: newProgress,
            remarks: remark
          }
        : app
    );

    setApplications(updated);
    saveStoredApplications(updated);

    // Update active modal dossier if open
    if (selectedAppForDossier?.id === appId) {
      setSelectedAppForDossier({
        ...selectedAppForDossier,
        currentStage: newStage,
        stageProgress: newProgress,
        remarks: remark
      });
    }

    // Append to Audit Trail
    const newAuditLog: AuditLogItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST',
      actor: 'Dr. Ramesh Chandra',
      role: 'Regional Officer (RO)',
      action: `Stage Changed to "${newStage}"`,
      applicationNumber: targetApp.applicationNumber,
      instituteName: targetApp.instituteName,
      details: remark
    };

    const updatedLogs = [newAuditLog, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveStoredAuditLogs(updatedLogs);
  };

  // Add EVC Visit workflow (Teammate / Member 2)
  const handleAddEVCVisit = (newVisit: EVCVisit) => {
    const updatedVisits = [newVisit, ...evcVisits];
    setEvcVisits(updatedVisits);
    saveStoredEVCVisits(updatedVisits);

    // Update corresponding application to EVC Scheduled
    const updatedApps = applications.map((app) =>
      app.applicationNumber === newVisit.applicationNumber
        ? { ...app, currentStage: 'EVC Scheduled' as ApplicationStage, stageProgress: 65, evcAssigned: true }
        : app
    );
    setApplications(updatedApps);
    saveStoredApplications(updatedApps);

    // Add audit log
    const auditItem: AuditLogItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST',
      actor: 'Regional Office Committee Desk',
      role: 'Regional Officer (RO)',
      action: 'EVC Panel Constituted',
      applicationNumber: newVisit.applicationNumber,
      instituteName: newVisit.instituteName,
      details: `Scheduled ${newVisit.visitMode} on ${newVisit.visitDate} under Chairmanship of ${newVisit.chairman}.`
    };
    const updatedLogs = [auditItem, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveStoredAuditLogs(updatedLogs);
  };

  // Compliance status update workflow
  const handleUpdateCompliance = (id: string, newStatus: ComplianceRecord['status'], actionRemark: string) => {
    const updatedRecs = complianceRecords.map((c) =>
      c.id === id
        ? {
            ...c,
            status: newStatus,
            urgency: newStatus === 'Compliant' ? ('Normal' as const) : c.urgency,
            actionRequired: actionRemark
          }
        : c
    );
    setComplianceRecords(updatedRecs);
    saveStoredCompliance(updatedRecs);

    const target = complianceRecords.find((c) => c.id === id);
    if (target) {
      const auditItem: AuditLogItem = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) + ' IST',
        actor: 'Statutory Vigilance Cell',
        role: 'Regional Officer (RO)',
        action: `Compliance Action: ${newStatus}`,
        applicationNumber: target.applicationNumber,
        instituteName: target.instituteName,
        details: `${target.category} - ${actionRemark}`
      };
      const updatedLogs = [auditItem, ...auditLogs];
      setAuditLogs(updatedLogs);
      saveStoredAuditLogs(updatedLogs);
    }
  };

  // Open tracking modal shortcut
  const handleOpenTrackModal = (appNum?: string) => {
    setTrackInitialAppNum(appNum || '');
    setIsTrackModalOpen(true);
  };

  // Derived counts for navigation badges
  const navCounts = {
    applications: applications.length,
    pendingEVC: evcVisits.filter((v) => v.status === 'Scheduled').length,
    complianceAlerts: complianceRecords.filter(
      (c) => c.urgency === 'Critical Expired' || c.urgency === 'Expiring Soon'
    ).length
  };

  return (
    <div className="min-h-screen flex flex-col bg-gov-slate-50 text-gov-slate-900 font-sans">
      {/* Official Government Header */}
      <Header onResetData={handleResetData} currentRole="Regional Officer (RO Western)" />

      {/* Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTrackModal={() => handleOpenTrackModal()}
        counts={navCounts}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'landing' && (
          <LandingPage
            onOpenDashboard={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenTrackModal={handleOpenTrackModal}
            onViewCompliance={() => {
              setActiveTab('compliance');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewApplications={() => {
              setActiveTab('applications');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewEVC={() => {
              setActiveTab('evc');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            applications={applications}
            evcVisits={evcVisits}
            complianceRecords={complianceRecords}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            applications={applications}
            evcVisits={evcVisits}
            complianceRecords={complianceRecords}
            auditLogs={auditLogs}
            currentRole="Regional Officer (RO Western)"
            onRefreshData={refreshFromSupabase}
            onSelectApplication={(app) => setSelectedAppForDossier(app)}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsList
            applications={applications}
            onSelectApplication={(app) => setSelectedAppForDossier(app)}
            onScheduleEVCModal={(app) => {
              setActiveTab('evc');
            }}
          />
        )}

        {activeTab === 'evc' && (
          <EVCManagement
            evcVisits={evcVisits}
            experts={experts}
            applications={applications}
            onAddEVCVisit={handleAddEVCVisit}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceView
            complianceRecords={complianceRecords}
            onUpdateCompliance={handleUpdateCompliance}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            applications={applications}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogView
            auditLogs={auditLogs}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}
      </main>

      {/* Application Detail Dossier Modal */}
      {selectedAppForDossier && (
        <ApplicationDetailModal
          application={selectedAppForDossier}
          onClose={() => setSelectedAppForDossier(null)}
          onUpdateStage={handleUpdateStage}
          onScheduleEVCModal={(app) => {
            setSelectedAppForDossier(null);
            setActiveTab('evc');
          }}
        />
      )}

      {/* Track Application Quick Lookup Modal */}
      <TrackModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        applications={applications}
        initialAppNumber={trackInitialAppNum}
        onOpenDossier={(app) => {
          setIsTrackModalOpen(false);
          setSelectedAppForDossier(app);
        }}
      />
    </div>
  );
};

export default App;
