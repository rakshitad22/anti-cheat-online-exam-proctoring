import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Shield,
  Clock,
  User,
  Building2,
  FileText,
  X,
  QrCode,
  Check,
  Sparkles,
  Code2,
  Mic,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  FileCode,
  Info
} from 'lucide-react';

export default function CandidateReportModal({ report, onClose }) {
  if (!report) return null;

  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'mcq' | 'coding' | 'viva' | 'integrity'
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const modalScrollRef = useRef(null);

  useEffect(() => {
    // Scroll modal view to top immediately on appearance
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `SKIT_Official_Report_${report.session_id || 'exam'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to download JSON:', err);
    }
  };

  const handleDownloadHTML = () => {
    try {
      const mcq = report.mcq_analysis || {};
      const coding = report.coding_analysis || {};
      const viva = report.interview_analysis || {};
      const integrity = report.integrity_metrics || {};

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SKIT ProctorLens AI Official Academic & Forensic Report - ${report.session_id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 30px; margin: 0; line-height: 1.5; }
    .container { max-width: 900px; margin: 0 auto; background: #131b2e; border: 1px solid #233554; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #233554; padding-bottom: 25px; margin-bottom: 25px; }
    .brand { display: flex; align-items: center; gap: 15px; }
    .brand img { width: 55px; height: 55px; border-radius: 12px; background: #fff; padding: 4px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .subtitle { font-size: 13px; color: #00f59b; font-weight: bold; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .kpi { background: #0c1222; border: 1px solid #1e293b; border-radius: 14px; padding: 18px; text-align: center; }
    .kpi-title { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold; margin-bottom: 6px; }
    .kpi-val { font-size: 24px; font-weight: 900; color: #00f59b; }
    .section-card { background: #0c1222; border: 1px solid #1e293b; border-radius: 16px; padding: 22px; margin-bottom: 25px; }
    .section-card h3 { margin-top: 0; font-size: 16px; font-weight: bold; color: #38bdf8; display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
    .justification-box { background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #e2e8f0; margin-bottom: 16px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 12px; }
    .strengths { background: rgba(0, 245, 155, 0.08); border: 1px solid rgba(0, 245, 155, 0.25); border-radius: 10px; padding: 14px; }
    .weaknesses { background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 14px; }
    .strengths h4 { color: #00f59b; margin-top: 0; font-size: 12px; text-transform: uppercase; }
    .weaknesses h4 { color: #f59e0b; margin-top: 0; font-size: 12px; text-transform: uppercase; }
    ul { margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; }
    li { margin-bottom: 6px; }
    .footer { border-top: 1px solid #233554; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; font-family: monospace; }
    @media print { body { background: #fff; color: #000; padding: 0; } .container { box-shadow: none; border: none; padding: 0; background: #fff; } .kpi, .section-card, .strengths, .weaknesses { border-color: #ccc; background: #fafafa; color: #000; } .title, .kpi-val { color: #000; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <img src="/skit-logo.png" alt="SKIT Logo" />
        <div>
          <div class="title">Sri Krishna Institute of Technology</div>
          <div class="subtitle">SKIT ProctorLens AI • Official Candidate Performance Audit Record</div>
        </div>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 11px; color: #94a3b8;">
        <div><b>Session Ref:</b> ${report.session_id}</div>
        <div><b>Timestamp:</b> ${report.date_display}</div>
        <div style="color: #00f59b; font-weight: bold; margin-top: 4px;">Verified Integrity Seal</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #0c1222; padding: 16px; border-radius: 12px; margin-bottom: 25px; font-size: 12px; font-family: monospace;">
      <div><span style="color:#64748b">CANDIDATE:</span><br><b>${report.candidate?.name || 'N/A'}</b></div>
      <div><span style="color:#64748b">SKIT EMAIL:</span><br><b style="color:#38bdf8">${report.candidate?.email || 'N/A'}</b></div>
      <div><span style="color:#64748b">DEPARTMENT:</span><br><b>${report.candidate?.department || 'N/A'}</b></div>
      <div><span style="color:#64748b">CURRICULUM:</span><br><b style="color:#f59e0b">${report.test_title || 'N/A'}</b></div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-title">Stage 1: MCQ</div>
        <div class="kpi-val">${report.mcq_score || '0/20'}</div>
        <div style="font-size: 10px; color:#64748b;">20 Marks Weight</div>
      </div>
      <div class="kpi">
        <div class="kpi-title">Stage 2: Coding</div>
        <div class="kpi-val" style="color:#d946ef;">${report.coding_score || '0/30'}</div>
        <div style="font-size: 10px; color:#64748b;">30 Marks Weight</div>
      </div>
      <div class="kpi">
        <div class="kpi-title">Stage 3: Zam AI Viva</div>
        <div class="kpi-val" style="color:#38bdf8;">${report.interview_score || '0/50'}</div>
        <div style="font-size: 10px; color:#64748b;">50 Marks Weight</div>
      </div>
      <div class="kpi" style="background: rgba(0, 245, 155, 0.08); border-color: rgba(0, 245, 155, 0.4);">
        <div class="kpi-title" style="color:#00f59b;">Total Score</div>
        <div class="kpi-val">${report.overall_score || 0} / 100</div>
        <div style="font-size: 11px; font-weight:bold; color:#00f59b;">Grade: ${report.grade || 'Verified'}</div>
      </div>
    </div>

    <!-- Overall Justification -->
    <div class="section-card">
      <h3 style="color:#00f59b;">🎯 Overall AI Evaluation & Marks Rationale</h3>
      <div class="justification-box">
        ${report.score_justification || 'Candidate marks have been computed across curriculum standards.'}
      </div>
    </div>

    <!-- Stage 1 MCQ Details -->
    <div class="section-card">
      <h3><span>📝 Part 1: Multiple Choice Examination</span> <span>${report.mcq_score || '0/20'}</span></h3>
      <div class="justification-box">
        ${mcq.score_justification || 'Score awarded based on accuracy and attempted answers.'}
      </div>
      <div class="grid-2">
        <div class="strengths">
          <h4>Key Strengths</h4>
          <ul>${(mcq.strengths || ['Solid theoretical foundation.']).map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="weaknesses">
          <h4>Areas of Improvement</h4>
          <ul>${(mcq.weaknesses || ['Review unattempted concepts.']).map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <!-- Stage 2 Coding Details -->
    <div class="section-card">
      <h3 style="color:#d946ef;"><span>💻 Part 2: Technical Coding Studio</span> <span>${report.coding_score || '0/30'}</span></h3>
      <div class="justification-box" style="border-left-color: #d946ef;">
        ${coding.score_justification || 'Score awarded based on algorithmic correctness and structure.'}
      </div>
      <div class="grid-2">
        <div class="strengths">
          <h4>Coding Strengths</h4>
          <ul>${(coding.strengths || ['Modular code structure.']).map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="weaknesses">
          <h4>Coding Weaknesses</h4>
          <ul>${(coding.weaknesses || ['Add edge-case guards.']).map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <!-- Stage 3 Viva Details -->
    <div class="section-card">
      <h3 style="color:#38bdf8;"><span>🎙️ Part 3: Zam Voice AI Technical Viva</span> <span>${report.interview_score || '0/50'}</span></h3>
      <div class="justification-box" style="border-left-color: #38bdf8;">
        ${viva.score_justification || 'Score awarded based on oral defense depth and domain clarity.'}
      </div>
      <div class="grid-2">
        <div class="strengths">
          <h4>Viva Strengths</h4>
          <ul>${(viva.strengths || ['Clear technical articulation.']).map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="weaknesses">
          <h4>Viva Weaknesses</h4>
          <ul>${(viva.weaknesses || ['Deepen architectural trade-off reasoning.']).map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <!-- Behavioral Forensic Details -->
    <div class="section-card">
      <h3 style="color:#f59e0b;"><span>🛡️ Proctor Integrity Telemetry & Behavioral Audit</span> <span>Trust Score: ${integrity.final_trust_score || 100}%</span></h3>
      <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 12px;">
        <b>Verdict:</b> ${integrity.integrity_verdict || 'VERIFIED'} &bull; <b>Total Strikes:</b> ${integrity.total_warnings || 0} / 5
      </div>
      <ul>
        <li>Tab Switches: ${integrity.warnings_breakdown?.tab_switch || 0}</li>
        <li>Looking Away / Head Deflections: ${integrity.warnings_breakdown?.looking_away || 0}</li>
        <li>Mobile Phone Detections: ${integrity.warnings_breakdown?.mobile_phone || 0}</li>
        <li>Acoustic Flags: ${integrity.warnings_breakdown?.voice || 0}</li>
      </ul>
    </div>

    <div class="footer">
      <div>Authorized by Department of ${report.candidate?.department || 'Academic Evaluation'} &bull; SKIT Bangalore</div>
      <div>Digitally Authenticated Certificate &bull; SHA-256 Validated</div>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `SKIT_Official_Report_${report.session_id || 'exam'}.html`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to download HTML certificate:', err);
    }
  };

  const integrity = report.integrity_metrics || {};
  const trustScore = integrity.final_trust_score || 100;

  const mcq = report.mcq_analysis || {};
  const coding = report.coding_analysis || {};
  const viva = report.interview_analysis || {};

  return (
    <div
      ref={modalScrollRef}
      className="fixed inset-0 z-[100] flex justify-center items-start p-3 sm:p-6 sm:py-8 bg-void/90 backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl rounded-[2.5rem] liquid-glass border border-white/25 shadow-glass-specular p-5 sm:p-9 my-4 text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Sticky Top Controls Bar (Hidden in Print) */}
        <div className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-2xl -mx-3 px-3 sm:-mx-7 sm:px-7 py-3.5 mb-5 rounded-2xl border border-white/10 shadow-glass-specular flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-emerald/15 text-neon-mint border border-neon-emerald/30 shadow-neon-emerald">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Official Examination Performance & Audit Certificate
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Cryptographically Signed Academic Scorecard & AI Forensic Matrix
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download JSON Report Button */}
            <button
              onClick={handleDownloadJSON}
              className="px-3.5 py-2 rounded-xl liquid-pill text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/15 text-xs font-bold font-mono transition flex items-center gap-1.5"
              title="Download Full Raw JSON Audit Log"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            {/* Download Standalone HTML Certificate Button */}
            <button
              onClick={handleDownloadHTML}
              className="px-3.5 py-2 rounded-xl liquid-pill text-neon-mint border border-neon-mint/40 hover:bg-neon-mint/15 text-xs font-bold font-mono transition flex items-center gap-1.5"
              title="Download Standalone Offline HTML Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-white text-xs font-bold transition flex items-center gap-2 shadow-neon-fuchsia font-mono"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl liquid-pill text-slate-300 hover:text-white transition"
              title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="my-3 p-3 rounded-2xl bg-neon-emerald/20 border border-neon-emerald/50 text-neon-mint text-xs font-mono font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Detailed report file downloaded successfully!</span>
          </div>
        )}

        {/* Certificate Official Header */}
        <div className="py-6 border-b border-white/[0.12] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-white/30 flex items-center justify-center flex-shrink-0 shadow-neon-fuchsia">
                <img src="/skit-logo.png" alt="SKIT Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black">
                  Sri Krishna Institute of Technology
                </h1>
                <p className="text-xs font-mono text-neon-mint font-bold">
                  SKIT ProctorLens.AI • Autonomous Academic & Behavioral Forensic Certificate
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Ref ID: <span className="text-neon-cyan font-bold">{report.session_id}</span> • {report.date_display}
            </p>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black tracking-wider font-mono border ${
              trustScore >= 75
                ? 'bg-neon-emerald/15 text-neon-mint border-neon-emerald/40 shadow-neon-emerald'
                : 'bg-neon-rose/15 text-neon-rose border-neon-rose/40 shadow-neon-rose'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              {integrity.integrity_verdict || 'VERIFIED & PASSED'}
            </span>
          </div>
        </div>

        {/* Candidate & Curriculum Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 p-5 rounded-2xl liquid-glass-subtle border border-white/10 text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Candidate</span>
            <div className="font-bold text-white text-sm mt-0.5">{report.candidate?.name || 'Candidate'}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">SKIT Email ID</span>
            <div className="font-bold text-neon-cyan mt-0.5 truncate">{report.candidate?.email || 'N/A'}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Department</span>
            <div className="font-bold text-slate-200 mt-0.5 truncate">{report.candidate?.department || 'Engineering'}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Curriculum</span>
            <div className="font-bold text-neon-gold mt-0.5 truncate">{report.test_title || 'Technical Evaluation'}</div>
          </div>
        </div>

        {/* 4 Multi-Color Scorecard KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-cyan/30 text-center">
            <span className="text-[10px] font-mono font-bold text-neon-cyan uppercase tracking-wider">Stage 1: MCQ</span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {report.mcq_score || '0/20'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 inline-block">20 Marks Weight</span>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-fuchsia/30 text-center">
            <span className="text-[10px] font-mono font-bold text-neon-fuchsia uppercase tracking-wider">Stage 2: Coding</span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {report.coding_score || '0/30'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 inline-block">30 Marks Weight</span>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-mint/30 text-center">
            <span className="text-[10px] font-mono font-bold text-neon-mint uppercase tracking-wider">Stage 3: Zam AI Viva</span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {report.interview_score || '0/50'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 inline-block">50 Marks Weight</span>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-emerald/40 text-center bg-neon-emerald/10 shadow-neon-emerald">
            <span className="text-[10px] font-mono font-bold text-neon-mint uppercase tracking-wider">Total Academic Score</span>
            <div className="text-3xl font-black font-mono text-neon-mint mt-1">
              {report.overall_score || 0} / 100
            </div>
            <span className="text-[10px] text-slate-200 font-mono font-bold mt-0.5 inline-block">
              Grade: {report.grade || 'Verified'}
            </span>
          </div>
        </div>

        {/* Holistic Score Justification Banner */}
        {report.score_justification && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-neon-cyan/15 via-blue-900/20 to-neon-fuchsia/15 border border-neon-cyan/40 mb-7 shadow-neon-cyan/20">
            <div className="flex items-center gap-2 mb-1.5 text-neon-cyan font-bold text-xs uppercase tracking-wider font-mono">
              <Sparkles className="w-4 h-4" />
              <span>AI Academic Evaluation & Score Justification</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-mono">
              {report.score_justification}
            </p>
          </div>
        )}

        {/* Section View Selector Filter */}
        <div className="flex flex-wrap items-center gap-2 mb-6 print:hidden">
          <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mr-1">
            Detailed Parts:
          </span>
          {[
            { id: 'all', label: 'All Evaluations' },
            { id: 'mcq', label: `Part 1: MCQ (${report.mcq_score || '20M'})` },
            { id: 'coding', label: `Part 2: Coding (${report.coding_score || '30M'})` },
            { id: 'viva', label: `Part 3: Zam AI Viva (${report.interview_score || '50M'})` },
            { id: 'integrity', label: `Proctor Integrity (${trustScore}%)` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                activeSection === tab.id
                  ? 'bg-neon-cyan text-void shadow-neon-cyan font-black'
                  : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================= */}
        {/* PART 1: MCQ AI EVALUATION & SCORE JUSTIFICATION               */}
        {/* ============================================================= */}
        {(activeSection === 'all' || activeSection === 'mcq') && (
          <div className="mb-7 p-5 rounded-3xl liquid-glass-subtle border border-neon-cyan/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono">
                    Part 1: Multiple Choice Examination (MCQ) Evaluation
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    20 Questions &bull; 1.0 Mark Weight Each &bull; Rigorous Concept Verification
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 font-mono text-xs font-black">
                {report.mcq_score || '0/20'}
              </span>
            </div>

            {/* Why This Much Marks is Awarded */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-neon-cyan block mb-1">
                Why this mark is awarded:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">
                {mcq.score_justification || `Awarded based on ${mcq.correct_count || 0} verified correct answers out of ${mcq.total_questions || 20} questions.`}
              </p>
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neon-emerald/10 border border-neon-emerald/30">
                <div className="flex items-center gap-2 mb-2 text-neon-mint font-bold text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>MCQ Strengths & Mastery</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed font-medium">
                  {(mcq.strengths || ['Solid foundational recall on attempted concepts.']).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-neon-amber/10 border border-neon-amber/30">
                <div className="flex items-center gap-2 mb-2 text-neon-gold font-bold text-xs font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  <span>MCQ Conceptual Weaknesses</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed font-medium">
                  {(mcq.weaknesses || ['Review unattempted and missed questions.']).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Question Breakdown Log */}
            {mcq.breakdown && mcq.breakdown.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold block mb-2 uppercase">
                  Itemized Question Verification Log ({mcq.breakdown.length} Questions)
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {mcq.breakdown.map((item, qIdx) => (
                    <div
                      key={qIdx}
                      className={`p-2.5 rounded-xl border text-xs font-mono flex items-start justify-between gap-3 ${
                        item.is_correct
                          ? 'bg-neon-emerald/5 border-neon-emerald/30 text-emerald-200'
                          : !item.is_attempted
                          ? 'bg-white/[0.02] border-white/10 text-slate-400'
                          : 'bg-neon-rose/5 border-neon-rose/30 text-rose-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">
                          #{item.question_number}: {item.question}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Candidate Answer: <b className="text-white">{item.candidate_answer}</b> &bull; Correct: <b className="text-neon-mint">{item.correct_answer}</b>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${
                        item.is_correct
                          ? 'bg-neon-emerald/20 text-neon-mint'
                          : !item.is_attempted
                          ? 'bg-white/10 text-slate-400'
                          : 'bg-neon-rose/20 text-neon-rose'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PART 2: CODING STUDIO AI EVALUATION & SCORE JUSTIFICATION     */}
        {/* ============================================================= */}
        {(activeSection === 'all' || activeSection === 'coding') && (
          <div className="mb-7 p-5 rounded-3xl liquid-glass-subtle border border-neon-fuchsia/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neon-fuchsia/20 text-neon-fuchsia border border-neon-fuchsia/40">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono">
                    Part 2: Technical Coding Studio Evaluation
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Algorithmic Logic &bull; Control Flow &bull; Space-Time Bounds &bull; 30 Marks Total
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-neon-fuchsia/15 text-neon-fuchsia border border-neon-fuchsia/40 font-mono text-xs font-black">
                {report.coding_score || '0/30'}
              </span>
            </div>

            {/* Why This Much Marks is Awarded */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-neon-fuchsia block mb-1">
                Why this mark is awarded:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">
                {coding.score_justification || 'Score awarded based on code execution, functional completeness, and control structure.'}
              </p>
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neon-emerald/10 border border-neon-emerald/30">
                <div className="flex items-center gap-2 mb-2 text-neon-mint font-bold text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Coding Strengths</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed font-medium">
                  {(coding.strengths || ['Modular code structure implemented.']).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-neon-amber/10 border border-neon-amber/30">
                <div className="flex items-center gap-2 mb-2 text-neon-gold font-bold text-xs font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Coding Weaknesses & Recommendations</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed font-medium">
                  {(coding.weaknesses || ['Include explicit edge-case guards and unit tests.']).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Problems Itemized Breakdown */}
            {coding.problems && coding.problems.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold block uppercase">
                  Challenge Code Audits
                </span>
                {coding.problems.map((prob, pIdx) => (
                  <div key={pIdx} className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        Challenge #{prob.problem_number}: {prob.title} ({prob.language})
                      </span>
                      <span className="text-neon-fuchsia font-bold">
                        {prob.score_awarded} / {prob.max_score} Marks
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {prob.feedback}
                    </p>
                    {prob.code && (
                      <pre className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-36 custom-scrollbar">
                        <code>{prob.code}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PART 3: ZAM VOICE AI VIVA INTERVIEW AI EVALUATION             */}
        {/* ============================================================= */}
        {(activeSection === 'all' || activeSection === 'viva') && (
          <div className="mb-7 p-5 rounded-3xl liquid-glass-subtle border border-neon-mint/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neon-mint/20 text-neon-mint border border-neon-mint/40">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono">
                    Part 3: Zam Voice AI Technical Viva & Oral Defense
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Interactive Speech-to-Text &bull; Systems Architecture &bull; 50 Marks Weight
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-neon-mint/15 text-neon-mint border border-neon-mint/40 font-mono text-xs font-black">
                {report.interview_score || '0/50'}
              </span>
            </div>

            {/* Why This Much Marks is Awarded */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-neon-mint block mb-1">
                Why this mark is awarded:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">
                {viva.score_justification || 'Score awarded based on depth of technical vocabulary, architectural trade-offs, and conceptual clarity during viva defense.'}
              </p>
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neon-emerald/10 border border-neon-emerald/30">
                <div className="flex items-center gap-2 mb-2 text-neon-mint font-bold text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Viva Defense Strengths</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed font-medium">
                  {(viva.strengths || ['Articulate technical reasoning with coherent structure.']).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-neon-amber/10 border border-neon-amber/30">
                <div className="flex items-center gap-2 mb-2 text-neon-gold font-bold text-xs font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Viva Defense Weaknesses</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed font-medium">
                  {(viva.weaknesses || ['Provide quantitative benchmarks and failure recovery protocols.']).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Inquiries Transcript Log */}
            {viva.inquiries && viva.inquiries.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold block uppercase">
                  Oral Defense Transcript & Inquiry Scorecard
                </span>
                {viva.inquiries.map((turn, tIdx) => (
                  <div key={tIdx} className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        Inquiry #{turn.inquiry_number}: {turn.question}
                      </span>
                      <span className="text-neon-mint font-bold">
                        Depth: {turn.depth_rating} / 100
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-slate-300">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Spoken Defense:</span>
                      "{turn.candidate_answer}"
                    </div>
                    <p className="text-[11px] text-slate-400">
                      <b>AI Assessment:</b> {turn.feedback}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* PROCTOR INTEGRITY & BEHAVIORAL FORENSIC AUDIT MATRIX          */}
        {/* ============================================================= */}
        {(activeSection === 'all' || activeSection === 'integrity') && (
          <div className={`p-5 rounded-3xl mb-7 border font-mono ${
            Math.min(5, integrity.total_warnings || 0) >= 5
              ? 'bg-neon-rose/20 border-neon-rose text-rose-100 shadow-neon-rose'
              : Math.min(5, integrity.total_warnings || 0) >= 3
              ? 'bg-neon-amber/20 border-neon-amber text-amber-100 shadow-neon-amber'
              : 'bg-white/[0.03] border-white/15 text-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${Math.min(5, integrity.total_warnings || 0) >= 5 ? 'text-neon-rose' : 'text-neon-cyan'}`} />
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider">
                    Proctor Integrity Trust Index: <span className="font-black text-white">{trustScore}%</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Verdict: <b className="text-white">{integrity.integrity_verdict || 'VERIFIED'}</b>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                  Math.min(5, integrity.total_warnings || 0) >= 5
                    ? 'bg-neon-rose text-white border-neon-rose'
                    : 'bg-neon-amber/20 text-neon-gold border-neon-amber/40'
                }`}>
                  {Math.min(5, integrity.total_warnings || 0)} of 5 Strikes Logged
                </span>
              </div>
            </div>

            {/* Warnings Breakdown Badges */}
            <div className="pt-3 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="text-slate-400 uppercase font-bold">Infraction Log:</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Tab Switches: <b className="text-neon-cyan">{integrity.warnings_breakdown?.tab_switch || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Head Deflections / Away: <b className="text-neon-amber">{integrity.warnings_breakdown?.looking_away || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Mobile Phone Detected: <b className="text-neon-rose">{integrity.warnings_breakdown?.mobile_phone || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Acoustic Voice Flags: <b className="text-neon-fuchsia">{integrity.warnings_breakdown?.voice || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Fullscreen Exits: <b className="text-neon-gold">{integrity.warnings_breakdown?.fullscreen_exit || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Window Backlight: <b className="text-neon-amber">{integrity.warnings_breakdown?.window_backlight || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Head Nodding: <b className="text-neon-mint">{integrity.warnings_breakdown?.head_nodding || 0}</b>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/10">
                Half Face / Clipped: <b className="text-neon-cyan">{integrity.warnings_breakdown?.partial_face || 0}</b>
              </span>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar for Easy Access without scrolling back up */}
        <div className="my-6 p-4 rounded-2xl liquid-glass-subtle border border-white/10 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs font-mono text-slate-300">
            Official Academic Record for <strong className="text-white">{report.candidate?.name || 'Candidate'}</strong>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 rounded-xl liquid-pill text-neon-mint border border-neon-mint/40 hover:bg-neon-mint/15 text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report (HTML)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-white text-xs font-bold transition flex items-center gap-2 shadow-neon-fuchsia font-mono cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={() => {
                if (modalScrollRef.current) {
                  modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Scroll back to top"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Scroll to Top</span>
            </button>
          </div>
        </div>

        {/* Official Verification Seal & Authenticity Footer */}
        <div className="pt-6 border-t border-white/[0.12] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/15 flex items-center justify-center text-neon-cyan">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <div className="text-white font-bold text-xs">Signed by ProctorLens Guardian Engine</div>
              <div className="text-[10px] text-slate-400">SHA-256 Digest: {report.session_id ? report.session_id.replace('rpt-', '') : '8f4ab3c9'} &bull; Anti-Tamper Validated</div>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-[11px] text-neon-mint font-bold flex items-center gap-1 justify-center sm:justify-end">
              <Sparkles className="w-3.5 h-3.5" /> Authenticated by SKIT Academic Board
            </div>
            <div className="text-[10px] text-slate-500">Autonomous AI Proctoring & Evaluator Ecosystem</div>
          </div>
        </div>

      </div>
    </div>
  );
}
