import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  FolderOpen,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Search,
  X,
  Filter,
  ArrowLeft,
  Download,
  Eye,
  Plus,
  Tag,
  MapPin,
  Calendar,
  AlertCircle,
  HardHat,
  FileSpreadsheet,
} from 'lucide-react';

export interface SiteDocument {
  id: string;
  name: string;
  filename: string;
  category: 'drawing' | 'dpr' | 'photo' | 'quality_hse' | 'specification';
  discipline: string;
  location: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

const INITIAL_DOCUMENTS: SiteDocument[] = [
  {
    id: 'doc-1',
    name: 'Line 24 Piping Isometric Spool Detail (Rev 3)',
    filename: 'DWG-U3-PIP-24-ISO-REV3.pdf',
    category: 'drawing',
    discipline: 'Piping',
    location: 'Unit 3',
    fileSize: '4.2 MB',
    uploadedAt: '2026-09-02',
    uploadedBy: 'Lead Piping Planner',
    description: 'Approved fabrication & erection drawing for 12in CS pipeline spool with joint welding WPS-04.',
  },
  {
    id: 'doc-2',
    name: 'Footing F-12 Bar Bending Schedule & Pour Matrix',
    filename: 'BBS-CIV-F12-FOOTING-REBAR.xlsx',
    category: 'dpr',
    discipline: 'Civil',
    location: 'Unit 3',
    fileSize: '850 KB',
    uploadedAt: '2026-09-03',
    uploadedBy: 'Civil Site Engineer',
    description: 'Detailed bar bending schedule, rebar tonnage, and pour volume calculations for footing F-12.',
  },
  {
    id: 'doc-3',
    name: '11kV Substation Single Line Diagram & Feeder Run',
    filename: 'ELE-SUBSTATION-11KV-SCHEMATIC.pdf',
    category: 'drawing',
    discipline: 'Electrical',
    location: 'Substation',
    fileSize: '2.8 MB',
    uploadedAt: '2026-09-04',
    uploadedBy: 'Electrical Supervisor',
    description: 'Feeder interconnection diagram for 11kV switchgear panels and transformer terminations.',
  },
  {
    id: 'doc-4',
    name: 'Line 24 Spool Fit-Up & Alignment Inspection Photo',
    filename: 'PHOTO-U3-SPOOL-ERECTION-01.jpg',
    category: 'photo',
    discipline: 'Piping',
    location: 'Unit 3',
    fileSize: '3.6 MB',
    uploadedAt: '2026-09-05',
    uploadedBy: 'Field Supervisor',
    description: 'On-site photographic record verifying bevel alignment and root gap before TIG root pass.',
  },
  {
    id: 'doc-5',
    name: 'Unit 3 Expansion Hot Work & Safety PTW Permit',
    filename: 'HSE-PTW-HOT-WORK-CLEARANCE.pdf',
    category: 'quality_hse',
    discipline: 'HSE',
    location: 'Unit 3',
    fileSize: '920 KB',
    uploadedAt: '2026-09-06',
    uploadedBy: 'HSE Officer',
    description: 'Gas testing clearance, fire blanket deployment, and spark containment sign-off for welding.',
  },
  {
    id: 'doc-6',
    name: 'Weekly Contractor Cumulative Progress & Joint Log',
    filename: 'DPR-WEEK2-CONTRACTOR-LOG.csv',
    category: 'dpr',
    discipline: 'General Site',
    location: 'Unit 3',
    fileSize: '340 KB',
    uploadedAt: '2026-09-06',
    uploadedBy: 'Planning Controls',
    description: 'Aggregated progress log with welding inches, excavation cubic meters, and cable meters pulled.',
  },
  {
    id: 'doc-7',
    name: 'Pressure Transmitter PT-101 Loop Connection Diagram',
    filename: 'INS-LOOP-DIAG-PT101.pdf',
    category: 'drawing',
    discipline: 'Instrumentation',
    location: 'Unit 3',
    fileSize: '1.4 MB',
    uploadedAt: '2026-09-01',
    uploadedBy: 'Lead Instrumentation Planner',
    description: '4-20mA HART transmitter wiring schedule and junction box termination layout.',
  },
];

const STORAGE_KEY = 'schedulesync_supervisor_site_files_v1';

export const SiteFiles: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<SiteDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return INITIAL_DOCUMENTS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<SiteDocument | null>(null);

  // New file upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<'drawing' | 'dpr' | 'photo' | 'quality_hse' | 'specification'>('drawing');
  const [docDiscipline, setDocDiscipline] = useState(user?.discipline || 'Piping');
  const [docLocation, setDocLocation] = useState('Unit 3');
  const [docDescription, setDocDescription] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {}
  }, [documents]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadFile(f);
      if (!docName) {
        const cleanName = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setDocName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !docName) return;

    const newDoc: SiteDocument = {
      id: `doc-${Date.now()}`,
      name: docName || uploadFile?.name || 'Uploaded Site Document',
      filename: uploadFile?.name || `${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      category: docCategory,
      discipline: docDiscipline,
      location: docLocation,
      fileSize: uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: user?.name || 'Site Supervisor',
      description: docDescription || 'Uploaded via Field Supervisor Workspace.',
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setShowUploadModal(false);
      setUploadFile(null);
      setDocName('');
      setDocDescription('');
    }, 1200);
  };

  const handleDownload = (doc: SiteDocument) => {
    // Simulated clean browser file download
    const blob = new Blob(
      [
        `ScheduleSync Site Document: ${doc.name}\n` +
          `Filename: ${doc.filename}\n` +
          `Discipline: ${doc.discipline}\n` +
          `Location: ${doc.location}\n` +
          `Uploaded By: ${doc.uploadedBy} on ${doc.uploadedAt}\n\n` +
          `Notes: ${doc.description || 'N/A'}\n`,
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesDisc = disciplineFilter === 'all' || doc.discipline.toLowerCase() === disciplineFilter.toLowerCase();

    return matchesSearch && matchesCat && matchesDisc;
  });

  const drawingCount = documents.filter((d) => d.category === 'drawing').length;
  const dprCount = documents.filter((d) => d.category === 'dpr').length;
  const photoCount = documents.filter((d) => d.category === 'photo').length;
  const hseCount = documents.filter((d) => d.category === 'quality_hse').length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'drawing':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      case 'dpr':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'photo':
        return <ImageIcon className="w-5 h-5 text-blue-600" />;
      case 'quality_hse':
        return <HardHat className="w-5 h-5 text-amber-600" />;
      default:
        return <FolderOpen className="w-5 h-5 text-slate-600" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'drawing':
        return 'Drawing';
      case 'dpr':
        return 'DPR / Data';
      case 'photo':
        return 'Site Photo';
      case 'quality_hse':
        return 'HSE & QA';
      default:
        return 'Spec';
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header with Back Button & Upload Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/supervisor')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              Site Files &amp; Field Documents
            </h2>
            <p className="text-[11px] text-slate-500">Engineering drawings, DPR sheets, and field photos</p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setShowUploadModal(true)}
          className="text-xs py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1 shadow-sm rounded-xl transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add File
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center shadow-xs">
          <div className="text-base font-black text-slate-900">{documents.length}</div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">All Files</div>
        </div>
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 text-center shadow-xs">
          <div className="text-base font-black text-indigo-900">{drawingCount}</div>
          <div className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Drawings</div>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 text-center shadow-xs">
          <div className="text-base font-black text-emerald-900">{dprCount}</div>
          <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">DPRs</div>
        </div>
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 text-center shadow-xs">
          <div className="text-base font-black text-blue-900">{photoCount}</div>
          <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Photos</div>
        </div>
      </div>

      {/* Search & Category Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search files by drawing name, filename, discipline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oil-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'drawing', label: `Drawings (${drawingCount})` },
            { id: 'dpr', label: `DPR / Logs (${dprCount})` },
            { id: 'photo', label: `Photos (${photoCount})` },
            { id: 'quality_hse', label: `HSE & QA (${hseCount})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat.id
                  ? 'bg-oil-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        {filteredDocs.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-400">
            No site documents found matching your search or filter.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="border border-slate-200 hover:border-oil-500 bg-white shadow-xs transition-all"
            >
              <CardContent className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getCategoryIcon(doc.category)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 leading-snug">{doc.name}</div>
                      <div className="font-mono text-[11px] text-slate-500 break-all">{doc.filename}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {getCategoryLabel(doc.category)}
                        </span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">{doc.discipline}</span>
                        <span>·</span>
                        <span>{doc.location}</span>
                        <span>·</span>
                        <span>{doc.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      title="Preview Document Details"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      title="Download Document"
                      className="p-1.5 rounded-lg border border-slate-200 text-oil-800 hover:bg-oil-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Uploaded by {doc.uploadedBy}</span>
                  <span>{doc.uploadedAt}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-oil-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Add Site File / Drawing</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">File Added to Site Repository!</h4>
                <p className="text-xs text-slate-500">Document is now available for your site team and planners.</p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="p-4 space-y-3">
                {/* File Drop Area */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select File</label>
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:border-oil-600 cursor-pointer transition-colors text-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-800">
                      {uploadFile ? uploadFile.name : 'Tap to choose File or Photo'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Supports .pdf, .dwg, .xlsx, .csv, .jpg, .png (up to 50MB)
                    </span>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.dwg,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.docx"
                    />
                  </label>
                </div>

                {/* Document Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Unit 3 Line 24 Isometric Drawing"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-oil-600 focus:outline-none"
                  />
                </div>

                {/* Category & Discipline */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value as any)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
                    >
                      <option value="drawing">📐 Engineering Drawing</option>
                      <option value="dpr">📋 Daily Progress Report (DPR)</option>
                      <option value="photo">📷 Site Photo / Survey</option>
                      <option value="quality_hse">🦺 HSE &amp; QA Checklist</option>
                      <option value="specification">📄 Spec / Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Discipline</label>
                    <select
                      value={docDiscipline}
                      onChange={(e) => setDocDiscipline(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
                    >
                      <option value="Piping">Piping</option>
                      <option value="Civil">Civil</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Instrumentation">Instrumentation</option>
                      <option value="HSE">HSE / Safety</option>
                      <option value="General Site">General Site</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site Location</label>
                  <select
                    value={docLocation}
                    onChange={(e) => setDocLocation(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
                  >
                    <option value="Unit 3">Unit 3</option>
                    <option value="Substation">Substation</option>
                    <option value="Tank Farm">Tank Farm</option>
                    <option value="Pipeline Corridor">Pipeline Corridor</option>
                    <option value="Boundary Wall">Boundary Wall</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Description / Field Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    placeholder="Provide revision notes, drawing sheet numbers, or site remarks..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-oil-600 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    Upload Document
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-4 bg-oil-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Document Details</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-900 block text-sm">{previewDoc.name}</span>
                <span className="font-mono text-slate-500 text-[11px]">{previewDoc.filename}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">CATEGORY</span>
                  <span className="font-semibold text-slate-800">{getCategoryLabel(previewDoc.category)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DISCIPLINE</span>
                  <span className="font-semibold text-slate-800">{previewDoc.discipline}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">LOCATION</span>
                  <span className="font-semibold text-slate-800">{previewDoc.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">FILE SIZE</span>
                  <span className="font-semibold text-slate-800">{previewDoc.fileSize}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">UPLOADED BY</span>
                  <span className="font-semibold text-slate-800">{previewDoc.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DATE</span>
                  <span className="font-semibold text-slate-800">{previewDoc.uploadedAt}</span>
                </div>
              </div>

              {previewDoc.description && (
                <div>
                  <span className="text-slate-500 text-[11px] font-semibold block mb-1">Notes &amp; Details:</span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    {previewDoc.description}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleDownload(previewDoc);
                    setPreviewDoc(null);
                  }}
                  className="bg-oil-800 hover:bg-oil-900 text-white flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
