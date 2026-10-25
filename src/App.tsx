import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Header } from './components/common/Header';
import { Navbar, NavTab } from './components/common/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { PublicHomePage } from './components/landing/PublicHomePage';
import { Dashboard } from './components/dashboard/Dashboard';
import { ApplicationsList } from './components/applications/ApplicationsList';
import { ApplicationDetailModal } from './components/applications/ApplicationDetailModal';
import { ComplianceView } from './components/compliance/ComplianceView';
import { EVCManagement } from './components/evc/EVCManagement';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { TrackModal } from './components/common/TrackModal';
import { ApplicationFormModal } from './components/applications/ApplicationFormModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './contexts/AuthContext';

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
  enrichComplianceCalculations,
  clearApplicationStorage
} from './data/mockData';

import { Application, ApplicationStage, EVCVisit, ComplianceRecord, AuditLogItem, ExpertProfile } from './types';
import { dataService } from './services/dataService';
import { calculateIsOverdue, calculateUrgency } from './lib/dateCalculations';
import { calculateStageProgress } from './lib/workflow';
import { supabase } from './lib/supabase';

export const App: React.FC = () => {
  const { currentRole, profile, user, isAuthenticated, isLoading: authLoading, authMode, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('login');
  const [showLogin, setShowLogin] = useState(false);

  // Map role to its default landing tab
  const getDefaultTabForRole = (role: string): NavTab => {
    switch (role) {
      case 'Institution': return 'applications';
      case 'EVC Member': return 'evc';
      case 'Scrutiny Officer': return 'dashboard';
      case 'Regional Officer': return 'dashboard';
      case 'Admin': return 'dashboard';
      case 'Admin / Member Secretary': return 'dashboard';
      default: return 'login';
    }
  };

  // Tabs each role is allowed to access
  const allowedTabsForRole = useMemo((): Set<NavTab> => {
    const base: NavTab[] = ['landing'];
    switch (currentRole) {
      case 'Institution':
        return new Set([...base, 'dashboard', 'applications', 'compliance']);
      case 'Scrutiny Officer':
        return new Set([...base, 'dashboard', 'applications', 'compliance', 'reports']);
      case 'Regional Officer':
        return new Set([...base, 'dashboard', 'applications', 'evc', 'compliance', 'reports', 'audit']);
      case 'EVC Member':
        return new Set([...base, 'dashboard', 'evc']);
      case 'Admin':
      case 'Admin / Member Secretary':
        return new Set([...base, 'dashboard', 'applications', 'evc', 'compliance', 'reports', 'audit']);
      default:
        return new Set<NavTab>(['login']);
    }
  }, [currentRole]);

  const [applications, setApplications] = useState<Application[]>(getStoredApplications);
  const [evcVisits, setEvcVisits] = useState<EVCVisit[]>(getStoredEVCVisits);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(getStoredCompliance);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(getStoredAuditLogs);
  const [experts, setExperts] = useState<ExpertProfile[]>(getStoredExperts);

  // Initial load from Supabase backend (with graceful fallback to stored data)
  useEffect(() => {
    if (!isAuthenticated) return; // Don't load data until authenticated
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
  }, [isAuthenticated]);

  // Enforce tab access: redirect to default tab if user is on a tab they can't access
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'login') {
      setActiveTab(getDefaultTabForRole(currentRole));
      return;
    }
    if (!allowedTabsForRole.has(activeTab)) {
      setActiveTab(getDefaultTabForRole(currentRole));
    }
  }, [isAuthenticated, activeTab, currentRole, allowedTabsForRole]);

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

      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('event_timestamp', { ascending: false });

      if (auditData && auditData.length > 0) {
        const mappedAudit: AuditLogItem[] = auditData.map((a: any) => ({
          id: a.id,
          timestamp:
            new Date(a.event_timestamp).toLocaleString('en-IN', {
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
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [evcTargetAppId, setEvcTargetAppId] = useState<string | null>(null);
  const [autoOpenEVCModal, setAutoOpenEVCModal] = useState<boolean>(false);

  // Safe reset of prototype records (removes ONLY the 5 application-owned keys)
  const handleResetData = () => {
    if (window.confirm('Reset all demo applications and EVC records to default values?')) {
      clearApplicationStorage();
      const freshApps = INITIAL_APPLICATIONS.map(enrichApplicationCalculations);
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

  // Schedule EVC entry point handler (passes selected app into EVC modal)
  const handleScheduleEVC = (app: Application) => {
    setSelectedAppForDossier(null);
    setEvcTargetAppId(app.id);
    setAutoOpenEVCModal(true);
    setActiveTab('evc');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // New application creation handler
  const handleApplicationCreated = (newApp: Application) => {
    setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
  };

  // Stage update workflow
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

    // Append to Audit Trail using active authenticated identity
    const actorName = profile?.fullName || user?.email || 'Authorized Officer';
    const actorRole = (profile?.role as any) || 'Regional Officer (RO)';

    const newAuditLog: AuditLogItem = {
      id: `aud-${Date.now()}`,
      timestamp:
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) + ' IST',
      actor: actorName,
      role: actorRole,
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

  // Add EVC Visit workflow
  const handleAddEVCVisit = (newVisit: EVCVisit) => {
    const updatedVisits = [newVisit, ...evcVisits];
    setEvcVisits(updatedVisits);
    saveStoredEVCVisits(updatedVisits);

    // Update corresponding application to EVC Scheduled
    const evcScheduledProgress = calculateStageProgress('EVC Scheduled');
    const updatedApps = applications.map((app) =>
      app.applicationNumber === newVisit.applicationNumber
        ? {
            ...app,
            currentStage: 'EVC Scheduled' as ApplicationStage,
            stageProgress: evcScheduledProgress,
            evcAssigned: true,
            isOverdue: calculateIsOverdue('EVC Scheduled', app.processingDays)
          }
        : app
    );
    setApplications(updatedApps);
    saveStoredApplications(updatedApps);
    dataService.addEVCVisit(newVisit);

    // Add audit log using active authenticated identity
    const actorName = profile?.fullName || user?.email || 'Regional Office Committee Desk';
    const actorRole = (profile?.role as any) || 'Regional Officer (RO)';

    const auditItem: AuditLogItem = {
      id: `aud-${Date.now()}`,
      timestamp:
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) + ' IST',
      actor: actorName,
      role: actorRole,
      action: 'EVC Panel Constituted',
      applicationNumber: newVisit.applicationNumber,
      instituteName: newVisit.instituteName,
      details: `Scheduled ${newVisit.visitMode} on ${newVisit.visitDate} under Chairmanship of ${newVisit.chairman}.`
    };
    const updatedLogs = [auditItem, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveStoredAuditLogs(updatedLogs);
    dataService.appendAuditLog(auditItem);
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
      const actorName = profile?.fullName || user?.email || 'Statutory Vigilance Cell';
      const actorRole = (profile?.role as any) || 'Regional Officer (RO)';

      const auditItem: AuditLogItem = {
        id: `aud-${Date.now()}`,
        timestamp:
          new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) + ' IST',
        actor: actorName,
        role: actorRole,
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

  // Smooth route determination after login
  const handleLoginSuccess = () => {
    setShowLogin(false);
    setActiveTab(getDefaultTabForRole(currentRole));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Role-based data presentation (Least-privilege view)
  const isInstitution = currentRole === 'Institution';
  const instCode = profile?.institutionCode;

  const displayedApplications =
    isInstitution && instCode
      ? applications.filter((a) => a.instituteCode === instCode)
      : applications;

  const displayedCompliance =
    isInstitution && instCode
      ? complianceRecords.filter((c) => c.instituteCode === instCode)
      : complianceRecords;

  // Derived counts for navigation badges
  const navCounts = {
    applications: displayedApplications.length,
    pendingEVC: evcVisits.filter((v) => v.status === 'Scheduled').length,
    complianceAlerts: displayedCompliance.filter(
      (c) => c.urgency === 'Critical Expired' || c.urgency === 'Expiring Soon'
    ).length
  };

  // Show loading spinner during auth initialization
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gov-slate-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-gov-navy border-t-amber-400 rounded-full animate-spin mb-4"></div>
          <p className="text-gov-slate-600 text-sm font-medium">Restoring session…</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show public home or login page
  if (!isAuthenticated) {
    if (showLogin) {
      return (
        <LoginPage
          onSuccess={handleLoginSuccess}
          onCancel={() => setShowLogin(false)}
        />
      );
    }
    return <PublicHomePage onOpenLogin={() => setShowLogin(true)} />;
  }

  // If authenticated but role is invalid/missing, show access error
  const validRoles = ['Institution', 'Scrutiny Officer', 'Regional Officer', 'EVC Member', 'Admin', 'Admin / Member Secretary'];
  if (!validRoles.includes(currentRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gov-slate-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg border border-gov-slate-200 shadow-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-100 text-rose-600 mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-gov-navy mb-2">Role Not Assigned</h2>
          <p className="text-sm text-gov-slate-600 mb-4">
            Your account does not have a valid role assignment. Please contact your administrator to assign a role to your account.
          </p>
          <p className="text-xs text-gov-slate-500 mb-4">Current role: <code className="bg-gov-slate-100 px-1.5 py-0.5 rounded text-xs">{currentRole || 'None'}</code></p>
          <button
            type="button"
            onClick={async () => { await signOut(); setShowLogin(false); }}
            className="inline-flex items-center gap-2 bg-gov-navy hover:bg-gov-navy-light text-white font-semibold text-sm px-5 py-2.5 rounded-md shadow transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // If active tab is login (but user is authenticated), redirect to their dashboard
  if (activeTab === 'login') {
    setActiveTab(getDefaultTabForRole(currentRole));
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gov-slate-50 text-gov-slate-900 font-sans">
      {/* Official Government Header with Top-Bar Profile */}
      <Header
        onResetData={handleResetData}
        currentRole={currentRole}
        userFullName={profile?.fullName}
        userEmail={profile?.email}
        institutionCode={profile?.institutionCode}
        region={profile?.region}
        authMode={authMode}
        isAuthenticated={isAuthenticated}
        onOpenAuth={() => setActiveTab('login')}
        onSignOut={async () => {
          await signOut();
          setActiveTab('login');
          setShowLogin(false);
          // Replace history state to prevent Back button returning to protected content
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />

      {/* Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTrackModal={() => handleOpenTrackModal()}
        counts={navCounts}
        currentRole={currentRole}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'landing' && (
          <LandingPage
            onOpenDashboard={() => {
              setActiveTab(isInstitution ? 'applications' : 'dashboard');
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
            onOpenNewApplication={() => setIsNewAppModalOpen(true)}
            onOpenLogin={() => setActiveTab('login')}
            applications={displayedApplications}
            evcVisits={evcVisits}
            complianceRecords={displayedCompliance}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            applications={displayedApplications}
            evcVisits={evcVisits}
            complianceRecords={displayedCompliance}
            auditLogs={auditLogs}
            currentRole={currentRole}
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
            applications={displayedApplications}
            onSelectApplication={(app) => setSelectedAppForDossier(app)}
            onScheduleEVCModal={handleScheduleEVC}
            onOpenNewApplication={() => setIsNewAppModalOpen(true)}
          />
        )}

        {activeTab === 'evc' && (
          <EVCManagement
            evcVisits={evcVisits}
            experts={experts}
            applications={applications}
            onAddEVCVisit={handleAddEVCVisit}
            onOpenTrackModal={handleOpenTrackModal}
            initialSelectedAppId={evcTargetAppId}
            autoOpenScheduleModal={autoOpenEVCModal}
            onClearInitialSelectedApp={() => {
              setEvcTargetAppId(null);
              setAutoOpenEVCModal(false);
            }}
            currentRole={currentRole}
            userFullName={profile?.fullName || (user?.email === 'evc.member@aicte.gov.in' ? 'Prof. (Dr.) Amitabh Mohanty' : user?.email)}
            userEmail={profile?.email || user?.email}
            auditLogs={auditLogs}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceView
            complianceRecords={displayedCompliance}
            onUpdateCompliance={handleUpdateCompliance}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            applications={displayedApplications}
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
          onScheduleEVCModal={handleScheduleEVC}
          userRole={currentRole}
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

      {/* Institution New Application Form Modal */}
      <ApplicationFormModal
        isOpen={isNewAppModalOpen}
        onClose={() => setIsNewAppModalOpen(false)}
        onApplicationCreated={handleApplicationCreated}
      />

      {/* Official AICTE Authentication & Role Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default App;
