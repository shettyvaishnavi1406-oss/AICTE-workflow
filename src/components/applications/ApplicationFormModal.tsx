import React, { useState } from 'react';
import {
  X,
  FilePlus,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  FileCheck2,
  Trash2,
  Loader2
} from 'lucide-react';
import { Application, ApplicationType } from '../../types';
import { calculateStageProgress } from '../../lib/workflow';
import { dataService } from '../../services/dataService';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplicationCreated: (app: Application) => void;
}

const INDIAN_STATES = [
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Uttar Pradesh',
  'West Bengal',
  'Gujarat',
  'Rajasthan',
  'Telangana',
  'Madhya Pradesh',
  'Kerala',
  'Andhra Pradesh',
  'Punjab',
  'Haryana',
  'Odisha',
  'Bihar',
  'Assam'
];

const STATE_TO_REGION: Record<string, Application['region']> = {
  'Maharashtra': 'Western',
  'Gujarat': 'Western',
  'Delhi': 'Northern',
  'Uttar Pradesh': 'Northern',
  'Punjab': 'Northern',
  'Haryana': 'Northern',
  'Karnataka': 'South-Western',
  'Kerala': 'South-Western',
  'Tamil Nadu': 'Southern',
  'Andhra Pradesh': 'Southern',
  'Telangana': 'Southern',
  'West Bengal': 'Eastern',
  'Odisha': 'Eastern',
  'Bihar': 'Eastern',
  'Assam': 'Eastern',
  'Madhya Pradesh': 'Central',
  'Rajasthan': 'Northern'
};

const APPLICATION_TYPES: ApplicationType[] = [
  'Extension of Approval (EoA)',
  'New Technical Institution',
  'Increase in Intake',
  'Introduction of New Course / Division',
  'Change of Site / Location'
];

interface UploadedDocState {
  name: string;
  size: number;
  dateUploaded: string;
  verified: boolean;
  url?: string;
  storageError?: string;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  onApplicationCreated
}) => {
  // Form State
  const [instituteName, setInstituteName] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [region, setRegion] = useState<Application['region']>('Western');
  const [applicationType, setApplicationType] = useState<ApplicationType>('Extension of Approval (EoA)');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [totalIntakeProposed, setTotalIntakeProposed] = useState('420');
  const [feePaid, setFeePaid] = useState('250000');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [remarks, setRemarks] = useState('');

  // Documents State
  const [documents, setDocuments] = useState<UploadedDocState[]>([
    {
      name: 'Mandatory Institutional Land Affidavit.pdf',
      size: 450 * 1024,
      dateUploaded: new Date().toISOString().slice(0, 10),
      verified: false
    }
  ]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('Municipal Fire NOC Certificate');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdAppNumber, setCreatedAppNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    if (STATE_TO_REGION[selectedState]) {
      setRegion(STATE_TO_REGION[selectedState]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setFormError(null);

    // Call dataService uploadDocument with file type and size validation
    const tempAppId = `draft-${Date.now()}`;
    const result = await dataService.uploadDocument(file, tempAppId);

    if (!result.success && !result.url) {
      setFormError(result.error || 'Document validation or upload failed.');
      setUploadingDoc(false);
      e.target.value = '';
      return;
    }

    const docName = uploadDocType.trim() ? `${uploadDocType} - ${file.name}` : file.name;
    const newDoc: UploadedDocState = {
      name: docName,
      size: file.size,
      dateUploaded: new Date().toISOString().slice(0, 10),
      verified: false,
      url: result.url,
      storageError: result.error
    };

    setDocuments(prev => [...prev, newDoc]);
    setUploadingDoc(false);
    e.target.value = '';
  };

  const handleRemoveDoc = (index: number) => {
    setDocuments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Required Field Validations
    if (!instituteName.trim()) {
      setFormError('Institution Name is required.');
      return;
    }
    if (!instituteCode.trim()) {
      setFormError('Institution Code is required (e.g. VIT-MUM-142).');
      return;
    }
    if (!contactPerson.trim()) {
      setFormError('Authorized Contact Person name and designation are required.');
      return;
    }
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setFormError('A valid official Contact Email address is required.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 8) {
      setFormError('A valid official Contact Phone number is required.');
      return;
    }
    const intakeNum = parseInt(totalIntakeProposed, 10);
    if (isNaN(intakeNum) || intakeNum <= 0) {
      setFormError('Proposed intake must be a positive integer.');
      return;
    }
    const feeNum = parseInt(feePaid, 10);
    if (isNaN(feeNum) || feeNum < 0) {
      setFormError('Statutory processing fee must be a valid amount.');
      return;
    }
    if (documents.length === 0) {
      setFormError('Please attach at least one mandatory document or affidavit.');
      return;
    }

    setIsSubmitting(true);

    try {
      const regionPrefix =
        region === 'Western' ? 'WR' :
        region === 'Northern' ? 'NR' :
        region === 'Southern' ? 'SR' :
        region === 'Eastern' ? 'ER' :
        region === 'South-Western' ? 'SWR' : 'CR';

      const generatedAppNumber = `AICTE/2026/${regionPrefix}/1-${Math.floor(100000 + Math.random() * 900000)}`;
      const submissionDate = new Date().toISOString().slice(0, 10);
      const stageProgress = calculateStageProgress('Submitted');

      const newApplication: Application = {
        id: `app-${Date.now()}`,
        applicationNumber: generatedAppNumber,
        instituteName: instituteName.trim(),
        instituteCode: instituteCode.trim().toUpperCase(),
        state,
        region,
        applicationType,
        academicYear,
        submissionDate,
        currentStage: 'Submitted',
        stageProgress,
        processingDays: 0,
        isOverdue: false,
        evcAssigned: false,
        feePaid: feeNum,
        totalIntakeProposed: intakeNum,
        complianceRating: 'Moderate',
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        remarks: remarks.trim() || 'Application submitted via Institutional Approval Portal.',
        documents: documents.map(d => ({
          name: d.name,
          verified: d.verified,
          dateUploaded: d.dateUploaded
        }))
      };

      // Real backend persistence (Supabase with local fallback)
      const saveResult = await dataService.createApplication(newApplication);

      if (!saveResult.success) {
        setFormError(saveResult.error || 'Failed to persist application.');
        setIsSubmitting(false);
        return;
      }

      const finalizedApp = saveResult.data || newApplication;

      // Add to immutable audit trail
      await dataService.appendAuditLog({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) + ' IST',
        actor: finalizedApp.contactPerson,
        role: 'System Automated',
        action: 'Application Submitted',
        applicationNumber: finalizedApp.applicationNumber,
        instituteName: finalizedApp.instituteName,
        details: `Initial application submitted for ${finalizedApp.applicationType} (${finalizedApp.academicYear}).`
      });

      onApplicationCreated(finalizedApp);
      setCreatedAppNumber(finalizedApp.applicationNumber);
    } catch (err: any) {
      setFormError(err?.message || 'Error occurred during application submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setInstituteName('');
    setInstituteCode('');
    setContactPerson('');
    setContactEmail('');
    setContactPhone('');
    setRemarks('');
    setCreatedAppNumber(null);
    setFormError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-saffron">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <FilePlus className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                AICTE Institutional Portal (Cycle 2026-27)
              </div>
              <div className="text-base font-bold">
                Application for Approval &amp; Accreditation
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {createdAppNumber ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gov-navy">Application Submitted Successfully</h3>
              <p className="text-xs text-gov-slate-600 max-w-md mx-auto">
                Your statutory application has been recorded in the AICTE Approval System and forwarded to the Regional Office for scrutiny verification.
              </p>
              <div className="bg-gov-slate-50 border border-gov-slate-200 rounded p-4 max-w-sm mx-auto text-left">
                <div className="text-xs text-gov-slate-500">Statutory Application Number</div>
                <div className="font-mono text-base font-bold text-gov-navy mt-0.5">{createdAppNumber}</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1">Status: Submitted (Initial Scrutiny Pending)</div>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="mt-4 px-6 py-2 bg-gov-navy hover:bg-gov-navy-light text-white font-semibold rounded text-xs shadow-sm"
              >
                Done &amp; View Applications
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Institution Details */}
              <div className="bg-gov-slate-50 border border-gov-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-gov-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gov-navy" />
                  1. Institution Identification Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Full Institution Name <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="text"
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      placeholder="e.g. Pune Institute of Advanced Technology"
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      AICTE Permanent Institute Code <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="text"
                      value={instituteCode}
                      onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
                      placeholder="e.g. PIAT-PUN-091"
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs font-mono text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      State / UT <span className="text-rose-600">*</span>:
                    </label>
                    <select
                      value={state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      AICTE Regional Jurisdiction <span className="text-rose-600">*</span>:
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value as Application['region'])}
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                    >
                      <option value="Western">Western Region</option>
                      <option value="Northern">Northern Region</option>
                      <option value="Southern">Southern Region</option>
                      <option value="Eastern">Eastern Region</option>
                      <option value="South-Western">South-Western Region</option>
                      <option value="Central">Central Region</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Academic Year <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Application Category <span className="text-rose-600">*</span>:
                    </label>
                    <select
                      value={applicationType}
                      onChange={(e) => setApplicationType(e.target.value as ApplicationType)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                    >
                      {APPLICATION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Proposed Intake (Seats) <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={totalIntakeProposed}
                      onChange={(e) => setTotalIntakeProposed(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Statutory Fee Paid (₹) <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feePaid}
                      onChange={(e) => setFeePaid(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact Person Details */}
              <div className="bg-gov-slate-50 border border-gov-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-gov-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gov-navy" />
                  2. Authorized Institutional Signatory / Contact Person
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Name &amp; Designation <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Dr. A. K. Sharma (Principal)"
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Official Email <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="principal@college.edu.in"
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                      Phone Number <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                    Application Remarks / Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Applying for EoA with additional AICTE approved division in Computer Engineering."
                    className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  />
                </div>
              </div>

              {/* Document Upload Section */}
              <div className="bg-white border border-gov-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gov-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-gov-navy" />
                    3. Statutory Document Uploads ({documents.length} attached)
                  </h4>
                  <span className="text-[11px] text-gov-slate-500">PDF, JPG, PNG (Max 5MB)</span>
                </div>

                {/* Upload Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-gov-slate-50 p-3 rounded border border-gov-slate-200">
                  <div className="sm:col-span-5">
                    <select
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value)}
                      className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-800"
                    >
                      <option value="Municipal Fire NOC Certificate">Municipal Fire NOC Certificate</option>
                      <option value="Land Registry Deed & Lease Extract">Land Registry Deed &amp; Lease Extract</option>
                      <option value="AICTE Cadre Ratio Affidavit">AICTE Cadre Ratio Affidavit</option>
                      <option value="Building Occupancy Certificate">Building Occupancy Certificate</option>
                      <option value="NBA / NAAC Accreditation Letter">NBA / NAAC Accreditation Letter</option>
                      <option value="Audited Balance Sheets (3 Yrs)">Audited Balance Sheets (3 Yrs)</option>
                      <option value="Other Statutory Document">Other Statutory Document</option>
                    </select>
                  </div>

                  <div className="sm:col-span-7 flex items-center gap-2">
                    <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 bg-white border border-dashed border-gov-slate-400 hover:border-gov-navy text-gov-slate-700 text-xs px-3 py-1.5 rounded transition-colors truncate">
                      <Upload className="w-3.5 h-3.5 text-gov-navy flex-shrink-0" />
                      <span className="truncate">
                        {uploadingDoc ? 'Verifying & Uploading...' : 'Select File to Upload'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={handleFileUpload}
                        disabled={uploadingDoc}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Attached Documents List */}
                <div className="divide-y divide-gov-slate-100 border border-gov-slate-200 rounded max-h-36 overflow-y-auto">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-gov-slate-50">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-medium text-gov-slate-800 truncate">{doc.name}</span>
                        <span className="text-[10px] text-gov-slate-400">
                          ({(doc.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                          Attached
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="text-gov-slate-400 hover:text-rose-600 p-1"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gov-slate-200">
                <span className="text-[11px] text-gov-slate-500">
                  Data will be validated and registered in the statutory AICTE database.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 border border-gov-slate-300 rounded text-xs font-semibold text-gov-slate-700 hover:bg-gov-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <span>Submit Application</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
