import React, { useState, useEffect } from 'react';
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
  enrichApplicationCalculations,
  enrichComplianceCalculations
} from './data/mockData';
import {
  Application,
  ApplicationStage,
  EVCVisit,
  EVCVisitStatus,
  ComplianceRecord,
  AuditLogItem,
  ExpertProfile
} from './types';
import { dataService } from './services/dataService';
import { calculateIsOverdue, calculateUrgency } from './lib/dateCalculations';
import {
  calculateStageProgress,
  deriveApplicationProgress,
  findMatchingEVCVisit
} from './lib/workflow';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [applications, setApplications] = useState<Application[]>(getStoredApplications);
  const [evcVisits, setEvcVisits] = useState<EVCVisit[]>(getStoredEVCVisits);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(getStoredCompliance);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(getStoredAuditLogs);
  const [experts, setExperts] = useState<ExpertProfile[]>(getStoredExperts);

  // Initial load from Supabase backend (with graceful fallback to stored data)
  useEffect(() => {
    let isMounted = true;
    async function loadDataFromSource() {
      try {
        const [loadedApps, loadedComps, loadedVisits, loadedLogs, loadedExperts] = await Promise.all([
          dataService.getApplications(),
          dataService.getComplianceRecords(),
          dataService.getEVCVisits(),
          dataService.getAuditLogs(),
          dataService.getExperts()
        ]);
        if (isMounted) {
          if (loadedApps.length > 0) setApplications(loadedApps);
          if (loadedComps.length > 0) setComplianceRecords(loadedComps);
          if (loadedVisits.length > 0) setEvcVisits(loadedVisits);
          if (loadedLogs.length > 0) setAuditLogs(loadedLogs);
          if (loadedExperts.length > 0) setExperts(loadedExperts);
        }
      } catch (err) {
        console.warn('Initial data load error:', err);
      }
    }
    loadDataFromSource();
    return () => {
      isMounted = false;
    };
  }, []);

  // Modals state
  const [selectedAppForDossier, setSelectedAppForDossier] = useState<Application | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackInitialAppNum, setTrackInitialAppNum] = useState<string>('');

  // Reset to original mock data
  const handleResetData = () => {
    if (window.confirm('Reset all demo applications and EVC records to default values?')) {
      localStorage.clear();
      const freshApps = INITIAL_APPLICATIONS.map((app) => enrichApplicationCalculations(app));
      const freshComps = INITIAL_COMPLIANCE.map(enrichComplianceCalculations);

      setApplications(freshApps);
      saveStoredApplications(freshApps);

      setEvcVisits(INITIAL_EVC_VISITS);
      saveStoredEVCVisits(INITIAL_EVC_VISITS);

      setComplianceRecords(freshComps);
      saveStoredCompliance(freshComps);

      setAuditLogs(INITIAL_AUDIT_LOGS);
      saveStoredAuditLogs(INITIAL_AUDIT_LOGS);

      alert('Prototype records restored to initial demo state.');
    }
  };

  // Stage update workflow (Member 1)
  const handleUpdateStage = async (appId: string, newStage: ApplicationStage, remark: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) {
      return { success: false, error: 'Application not found' };
    }

    // Backend stage transition validation & persistence
    const result = await dataService.updateApplicationStage(appId, newStage, remark);
    if (!result.success) {
      return result;
    }

    const newProgress = result.stageProgress ?? calculateStageProgress(newStage);

    const updated = applications.map((app) =>
      app.id === appId
        ? {
            ...app,
            currentStage: newStage,
            stageProgress: newProgress,
            remarks: remark,
            isOverdue: calculateIsOverdue(newStage, app.processingDays)
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
        remarks: remark,
        isOverdue: calculateIsOverdue(newStage, selectedAppForDossier.processingDays)
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
    dataService.appendAuditLog(newAuditLog);

    return result;
  };

  // Add EVC Visit workflow (Teammate / Member 2)
  const handleAddEVCVisit = async (newVisit: EVCVisit) => {
    const res = await dataService.addEVCVisit(newVisit);
    if (!res.success) {
      return res;
    }

    const updatedVisits = [newVisit, ...evcVisits.filter((v) => v.id !== newVisit.id)];
    setEvcVisits(updatedVisits);
    saveStoredEVCVisits(updatedVisits);

    // Update corresponding application to EVC Scheduled
    const updatedApps = applications.map((app) =>
      app.applicationNumber === newVisit.applicationNumber
        ? (res.updatedApplication || {
            ...app,
            currentStage: 'EVC Scheduled' as ApplicationStage,
            stageProgress: deriveApplicationProgress(app, newVisit),
            evcAssigned: true,
            evcId: newVisit.id,
            isOverdue: calculateIsOverdue('EVC Scheduled', app.processingDays)
          })
        : app
    );
    setApplications(updatedApps);
    saveStoredApplications(updatedApps);

    if (selectedAppForDossier && selectedAppForDossier.applicationNumber === newVisit.applicationNumber) {
      const updatedDossier = updatedApps.find((a) => a.id === selectedAppForDossier.id);
      if (updatedDossier) setSelectedAppForDossier(updatedDossier);
    }

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
    dataService.appendAuditLog(auditItem);

    return res;
  };

  // EVC Visit status update workflow
  const handleUpdateEVCStatus = async (
    visitId: string,
    nextStatus: EVCVisitStatus,
    remarks?: string
  ) => {
    const result = await dataService.updateEVCVisitStatus(visitId, nextStatus, remarks);
    if (!result.success) {
      return result;
    }

    const updated = evcVisits.map((v) =>
      v.id === visitId ? (result.visit || { ...v, status: nextStatus }) : v
    );
    setEvcVisits(updated);
    saveStoredEVCVisits(updated);

    // Synchronize application milestone progress with updated EVC visit status
    let updatedApps: Application[];
    if (result.updatedApplication) {
      updatedApps = applications.map((a) =>
        a.id === result.updatedApplication!.id ? result.updatedApplication! : a
      );
    } else {
      updatedApps = applications.map((a) => {
        const matchingVisit = findMatchingEVCVisit(a, updated);
        return {
          ...a,
          stageProgress: deriveApplicationProgress(a, matchingVisit)
        };
      });
    }
    setApplications(updatedApps);
    saveStoredApplications(updatedApps);

    if (selectedAppForDossier) {
      const updatedDossier = updatedApps.find((a) => a.id === selectedAppForDossier.id);
      if (updatedDossier) setSelectedAppForDossier(updatedDossier);
    }

    const targetVisit = evcVisits.find((v) => v.id === visitId);
    if (targetVisit) {
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
        role: 'EVC Chairman',
        action: `EVC Visit Status: ${nextStatus}`,
        applicationNumber: targetVisit.applicationNumber,
        instituteName: targetVisit.instituteName,
        details: `Visit ${targetVisit.visitCode} progressed to ${nextStatus}. ${remarks || ''}`
      };
      const updatedLogs = [auditItem, ...auditLogs];
      setAuditLogs(updatedLogs);
      saveStoredAuditLogs(updatedLogs);
      dataService.appendAuditLog(auditItem);
    }

    return result;
  };

  // Compliance status update workflow
  const handleUpdateCompliance = (id: string, newStatus: ComplianceRecord['status'], actionRemark: string) => {
    const updatedRecs = complianceRecords.map((c) =>
      c.id === id
        ? {
            ...c,
            status: newStatus,
            urgency: calculateUrgency(c.daysRemaining, newStatus),
            actionRequired: actionRemark
          }
        : c
    );
    setComplianceRecords(updatedRecs);
    saveStoredCompliance(updatedRecs);
    dataService.updateComplianceStatus(id, newStatus, actionRemark);

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
      dataService.appendAuditLog(auditItem);
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
            onUpdateEVCStatus={handleUpdateEVCStatus}
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
        evcVisits={evcVisits}
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
