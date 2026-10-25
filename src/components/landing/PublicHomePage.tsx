import React from 'react';
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  CalendarClock,
  Scale,
  Users,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Award,
  Info
} from 'lucide-react';

interface PublicHomePageProps {
  onOpenLogin: () => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({ onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-gov-slate-50 text-gov-slate-900 font-sans flex flex-col">
      {/* Top National Tricolor Accent */}
      <div className="gov-top-accent" />

      {/* Header */}
      <header className="bg-white border-b border-gov-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-gov-navy to-gov-navy-light shadow border-2 border-amber-500/30 text-amber-300">
              <div className="text-center">
                <div className="text-[8px] font-bold tracking-widest text-amber-400">AICTE</div>
                <ShieldCheck className="w-5 h-5 mx-auto text-amber-300" />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gov-slate-500">
                Government of India • Ministry of Education
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-gov-navy tracking-tight">
                All India Council for Technical Education
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 bg-gov-navy hover:bg-gov-navy-light text-white font-semibold text-sm px-5 py-2.5 rounded-md shadow transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gov-slate-100 border-b border-gov-slate-200 pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gov-navy tracking-tight leading-tight">
            AICTE Approval &amp; Compliance Portal
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gov-slate-600 leading-relaxed max-w-3xl mx-auto">
            Welcome to the official digital portal for AICTE's institutional approval process. This platform supports the SARAL (System for Automated Regulation and AICTE Licensing) workflow for technical education institutions across India.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 bg-gov-saffron hover:bg-gov-saffron-dark text-slate-950 font-bold text-sm px-6 py-3 rounded-md border border-amber-400 shadow-md transition-colors cursor-pointer"
            >
              <span>Sign In to Access Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* About AICTE */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gov-navy" />
            <h3 className="text-xl font-bold text-gov-navy">About AICTE</h3>
          </div>
          <div className="bg-white border border-gov-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gov-slate-700 leading-relaxed">
              The All India Council for Technical Education (AICTE) is a statutory body established under the AICTE Act, 1987, under the Ministry of Education, Government of India. AICTE is responsible for the proper planning and coordinated development of the technical education and management education system in India. It accredits postgraduate and graduate programs under specific categories at Indian institutions.
            </p>
            <p className="mt-3 text-sm text-gov-slate-700 leading-relaxed">
              AICTE grants approval for starting new technical institutions, introducing new courses or programs, and increasing the intake capacity of existing institutions. It also ensures quality standards through periodic reviews and compliance monitoring.
            </p>
          </div>
        </section>

        {/* Approval Process Overview */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck2 className="w-5 h-5 text-gov-navy" />
            <h3 className="text-xl font-bold text-gov-navy">Approval Process Overview</h3>
          </div>
          <div className="bg-white border border-gov-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gov-slate-700 leading-relaxed mb-4">
              The AICTE approval process involves several stages to ensure that technical institutions meet the required standards of quality, infrastructure, and academic readiness. The general stages include:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { step: '1', title: 'Application Submission', desc: 'Institutions submit their Extension of Approval (EoA) or new approval applications through the SARAL portal with required documentation.' },
                { step: '2', title: 'Document Scrutiny', desc: 'Scrutiny Officers review the submitted documents for completeness, accuracy, and compliance with AICTE norms.' },
                { step: '3', title: 'Deficiency Reporting', desc: 'If deficiencies are found during scrutiny, institutions are notified and given an opportunity to rectify and resubmit.' },
                { step: '4', title: 'SAC Review', desc: 'The Scrutiny and Approval Committee (SAC) reviews the application based on the scrutiny report and makes recommendations.' },
                { step: '5', title: 'EVC Inspection', desc: 'The Expert Visiting Committee (EVC) conducts physical or virtual inspections of the institution to verify infrastructure and facilities.' },
                { step: '6', title: 'Final Decision', desc: 'Based on SAC recommendations and EVC reports, AICTE grants or denies approval for the institution or program.' },
              ].map((item) => (
                <div key={item.step} className="border border-gov-slate-200 rounded-md p-4 bg-gov-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gov-navy text-white text-xs font-bold">{item.step}</span>
                    <h4 className="text-sm font-bold text-gov-navy">{item.title}</h4>
                  </div>
                  <p className="text-xs text-gov-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SARAL Portal */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-gov-navy" />
            <h3 className="text-xl font-bold text-gov-navy">SARAL Portal</h3>
          </div>
          <div className="bg-white border border-gov-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gov-slate-700 leading-relaxed">
              SARAL (System for Automated Regulation and AICTE Licensing) is the digital platform through which all AICTE approval-related workflows are managed. Institutions use SARAL to submit applications, upload required documents, track application status, and respond to scrutiny observations.
            </p>
            <p className="mt-3 text-sm text-gov-slate-700 leading-relaxed">
              AICTE officers use SARAL for document verification, workflow management, compliance monitoring, and generating audit trails. The platform provides role-based access ensuring that each stakeholder sees only the information and actions relevant to their responsibilities.
            </p>
          </div>
        </section>

        {/* SAC and EVC */}
        <section className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SAC */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5 text-gov-navy" />
                <h3 className="text-xl font-bold text-gov-navy">Scrutiny &amp; Approval Committee (SAC)</h3>
              </div>
              <div className="bg-white border border-gov-slate-200 rounded-lg p-6 shadow-sm h-full">
                <p className="text-sm text-gov-slate-700 leading-relaxed">
                  The Scrutiny and Approval Committee (SAC) is a standing committee that reviews institutional applications after the document scrutiny stage. SAC examines the scrutiny reports, verifies compliance with AICTE norms, and makes recommendations regarding the approval or rejection of applications.
                </p>
                <p className="mt-3 text-sm text-gov-slate-700 leading-relaxed">
                  SAC is a document-review and recommendation stage that occurs before any physical inspection. Its role is to filter applications that meet the basic eligibility criteria for further evaluation.
                </p>
              </div>
            </div>

            {/* EVC */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gov-navy" />
                <h3 className="text-xl font-bold text-gov-navy">Expert Visiting Committee (EVC)</h3>
              </div>
              <div className="bg-white border border-gov-slate-200 rounded-lg p-6 shadow-sm h-full">
                <p className="text-sm text-gov-slate-700 leading-relaxed">
                  The Expert Visiting Committee (EVC) is constituted for physical or virtual inspection of institutions. EVC members are domain experts appointed to verify that the institution's infrastructure, faculty, laboratories, and overall readiness meet AICTE's prescribed standards.
                </p>
                <p className="mt-3 text-sm text-gov-slate-700 leading-relaxed">
                  EVC inspections are a separate stage from SAC review. EVC conducts on-ground verification and submits an inspection report that forms a critical input for the final approval decision. EVC scheduling and completion are tracked independently.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* General Guidance */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-gov-navy" />
            <h3 className="text-xl font-bold text-gov-navy">General Guidance</h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
            <ul className="space-y-3 text-sm text-gov-slate-700">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
                <span>Institutions should ensure all required documents are complete and accurate before submitting applications to avoid delays during scrutiny.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
                <span>Application status can be tracked through the portal after logging in with authorized credentials.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
                <span>SAC review and EVC inspection are distinct stages with separate timelines and outcomes. Completion of one stage does not automatically complete the other.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
                <span>Compliance undertakings and statutory requirements must be maintained throughout the approval period. Non-compliance may lead to show-cause notices or withdrawal of approval.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
                <span>For any queries regarding the approval process, institutions may contact their respective AICTE Regional Office.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Login CTA */}
        <section className="text-center py-6">
          <div className="bg-white border border-gov-slate-200 rounded-lg p-8 shadow-sm max-w-xl mx-auto">
            <Award className="w-10 h-10 text-gov-saffron mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gov-navy mb-2">Access the Portal</h3>
            <p className="text-sm text-gov-slate-600 mb-4">
              Authorized users can sign in to access their role-specific dashboards, submit applications, perform scrutiny, manage inspections, and monitor compliance.
            </p>
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 bg-gov-navy hover:bg-gov-navy-light text-white font-semibold text-sm px-6 py-3 rounded-md shadow transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Login to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gov-slate-200 py-4 text-center text-xs text-gov-slate-500">
        All India Council for Technical Education • Statutory Body, Ministry of Education, Govt. of India
      </footer>
    </div>
  );
};
