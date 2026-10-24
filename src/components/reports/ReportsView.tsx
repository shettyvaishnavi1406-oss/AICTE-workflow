import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  ShieldCheck, 
  Building2,
  Calendar,
  Search
} from 'lucide-react';
import { Application } from '../../types';

interface ReportsViewProps {
  applications: Application[];
  onOpenTrackModal: (appNum?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  applications,
  onOpenTrackModal,
}) => {
  const [selectedApp, setSelectedApp] = useState<Application>(applications[0] || null);
  const [reportType, setReportType] = useState<'Scrutiny Summary' | 'EVC Inspection Report' | 'Extension of Approval (EoA)'>('Extension of Approval (EoA)');
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Statutory Documentation
              </span>
              <span className="text-xs text-gov-slate-500">Official AICTE Orders</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              Inspection Reports &amp; Sanction Orders
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Generate, preview and download digital Extension of Approval (EoA) orders and Expert Committee Evaluation sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-gov-slate-100 text-gov-slate-700 text-xs font-semibold px-3.5 py-2 rounded border border-gov-slate-300 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Letter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
              Report Generator Parameters
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                Select Technical Institution:
              </label>
              <select
                value={selectedApp?.id || ''}
                onChange={(e) => {
                  const found = applications.find(a => a.id === e.target.value);
                  if (found) setSelectedApp(found);
                }}
                className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.instituteName.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                Select Order / Document Type:
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
              >
                <option value="Extension of Approval (EoA)">Extension of Approval (EoA) Letter</option>
                <option value="EVC Inspection Report">EVC Committee Inspection Report</option>
                <option value="Scrutiny Summary">Regional Scrutiny Committee Sheet</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsGenerating(true);
                  setTimeout(() => setIsGenerating(false), 600);
                }}
                className="w-full bg-gov-navy hover:bg-gov-navy-light text-white font-semibold text-xs py-2 rounded shadow-sm transition-colors"
              >
                {isGenerating ? 'Rendering Official PDF...' : 'Regenerate Digital Seal'}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <strong>Security Notice:</strong> All generated Extension of Approval letters feature SHA-256 digital signature hashes and QR verification codes recognized by State Technical Examination Boards.
          </div>
        </div>

        {/* Live Document Preview (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border-2 border-gov-slate-300 shadow-md p-8 font-serif text-slate-800 text-xs sm:text-sm relative">
          {/* Government Watermark / Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
            <div className="font-sans text-[11px] font-bold text-slate-700 tracking-wider">
              भारत सरकार | GOVERNMENT OF INDIA
            </div>
            <div className="font-sans text-sm font-bold text-gov-navy uppercase tracking-wide mt-0.5">
              All India Council for Technical Education
            </div>
            <div className="font-sans text-[11px] text-slate-500">
              (A Statutory Body under Ministry of Education, Govt. of India)
            </div>
            <div className="font-sans text-[10px] text-slate-500">
              Nelson Mandela Marg, Vasant Kunj, New Delhi-110070 | www.aicte-india.org
            </div>
          </div>

          {/* Letter Metadata */}
          <div className="flex justify-between font-sans text-xs mb-6 text-slate-700">
            <div>
              <div><strong>F.No. AICTE/{selectedApp?.region.slice(0, 2).toUpperCase()}/1-{selectedApp?.id.slice(4)}/2026-27</strong></div>
              <div>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-100 border border-slate-300 px-2 py-1 text-[10px] font-mono font-bold">
                DIGITALLY VERIFIED
              </span>
            </div>
          </div>

          {/* Recipient */}
          <div className="mb-6 space-y-1">
            <div className="font-sans font-bold">To,</div>
            <div>The Principal Secretary / Director of Technical Education,</div>
            <div>Government of {selectedApp?.state},</div>
            <div className="font-sans font-semibold mt-2">
              Sub: {reportType} for Academic Year 2026-27.
            </div>
          </div>

          {/* Body Paragraph */}
          <div className="space-y-3 leading-relaxed text-justify">
            <p>
              Sir / Madam, in terms of the provisions under the All India Council for Technical Education (Grant of Approvals for Technical Institutions) Regulations 2026 notified by the Council, and standard norms and standards formulated by AICTE from time to time, I am directed to convey the approval of the Council to:
            </p>

            <div className="font-sans bg-slate-50 p-4 border border-slate-200 rounded my-3 text-xs space-y-1">
              <div><strong>Name of the Institution:</strong> {selectedApp?.instituteName}</div>
              <div><strong>Permanent Institute Code:</strong> {selectedApp?.instituteCode}</div>
              <div><strong>Application Reference No.:</strong> {selectedApp?.applicationNumber}</div>
              <div><strong>Regional Office:</strong> {selectedApp?.region} Regional Office</div>
              <div><strong>Sanctioned Total Intake:</strong> {selectedApp?.totalIntakeProposed} Seats</div>
              <div><strong>Approval Cycle:</strong> Academic Year 2026-27</div>
            </div>

            <p>
              The institution shall adhere to all conditions of land occupancy, fire NOC certificates, faculty cadre ratios of 1:2:6, and mandatory bio-metric attendance protocols as per the Approval Process Handbook (APH) 2026-27. Any deficiency found during subsequent surprise EVC inspections shall invite appropriate penal action.
            </p>
          </div>

          {/* Signature Block */}
          <div className="mt-10 pt-6 border-t border-slate-300 flex justify-between items-end font-sans">
            <div className="text-[11px] text-slate-500">
              Generated via AICTE SARAL-Workflow Engine<br />
              Cryptographic Hash: 8b29c9a0...3f81
            </div>
            <div className="text-right">
              <div className="font-bold text-xs text-gov-navy">Member Secretary / Advisor (Approval)</div>
              <div className="text-[11px] text-slate-600">All India Council for Technical Education</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
