import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Code2,
  HelpCircle,
  Mic,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  Search,
  Zap,
  Flame,
  Award,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Printer,
  Calendar,
  User,
  RefreshCw,
  Building2,
  CheckCircle
} from 'lucide-react';

import { API_BASE_URL } from '../config';

export default function DepartmentTestCatalog({
  tests = [],
  departments = [],
  userDepartment = '',
  user = {},
  onSelectTest,
  onViewReport
}) {
  const [portalTab, setPortalTab] = useState('tests'); // 'tests' | 'results'
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingTest, setInspectingTest] = useState(null);

  // Student's completed exam reports state
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchMyReports = useCallback(async () => {
    if (!user?.email) return;
    setLoadingReports(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/reports?candidate_email=${encodeURIComponent(user.email)}`
      );
      setMyReports(res.data.reports || []);
    } catch (err) {
      console.warn('Failed to load candidate reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  const filteredTests = tests.filter((test) => {
    const matchesDept = selectedDept === 'ALL' || test.department === selectedDept;
    const matchesType =
      selectedType === 'ALL' ||
      test.type === selectedType ||
      (selectedType === 'comprehensive' && (test.type === 'comprehensive' || test.questions?.length > 0)) ||
      (selectedType === 'mcq' && (test.questions?.length > 0 || test.type === 'mcq')) ||
      (selectedType === 'coding' && (test.coding_questions?.length > 0 || test.type === 'coding')) ||
      (selectedType === 'interview' && (test.interview_topics?.length > 0 || test.type === 'interview'));
    const matchesSearch =
      !searchQuery.trim() ||
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesType && matchesSearch;
  });

  const getTypeTheme = (type) => {
    switch (type) {
      case 'coding':
        return {
          icon: Code2,
          badge: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-liquid-glow-cyan',
          accent: 'from-neon-cyan via-neon-teal to-neon-emerald',
          btn: 'bg-gradient-to-r from-neon-cyan to-neon-teal hover:from-cyan-400 hover:to-teal-400 text-void shadow-liquid-glow-cyan',
          glow: 'hover:border-neon-cyan/50 hover:shadow-liquid-glow-cyan',
          titleColor: 'group-hover:text-neon-cyan'
        };
      case 'interview':
        return {
          icon: Mic,
          badge: 'bg-neon-fuchsia/20 text-neon-fuchsia border-neon-fuchsia/50 shadow-liquid-glow-fuchsia',
          accent: 'from-neon-fuchsia via-neon-pink to-neon-violet',
          btn: 'bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:from-pink-400 hover:to-violet-400 text-white shadow-liquid-glow-fuchsia',
          glow: 'hover:border-neon-fuchsia/50 hover:shadow-liquid-glow-fuchsia',
          titleColor: 'group-hover:text-neon-fuchsia'
        };
      case 'comprehensive':
        return {
          icon: Layers,
          badge: 'bg-gradient-to-r from-neon-cyan/20 via-neon-fuchsia/20 to-neon-violet/20 text-white border-white/30 shadow-liquid-glow-fuchsia',
          accent: 'from-neon-cyan via-neon-fuchsia to-neon-violet',
          btn: 'bg-gradient-to-r from-neon-cyan via-neon-fuchsia to-neon-violet hover:opacity-95 text-white shadow-liquid-glow-fuchsia',
          glow: 'hover:border-neon-fuchsia/50 hover:shadow-liquid-glow-fuchsia',
          titleColor: 'group-hover:text-neon-cyan'
        };
      default:
        return {
          icon: HelpCircle,
          badge: 'bg-neon-amber/20 text-neon-gold border-neon-amber/50 shadow-liquid-glow-amber',
          accent: 'from-neon-amber via-neon-orange to-neon-rose',
          btn: 'bg-gradient-to-r from-neon-amber to-neon-orange hover:from-amber-400 hover:to-orange-400 text-white shadow-liquid-glow-amber',
          glow: 'hover:border-neon-amber/50 hover:shadow-liquid-glow-amber',
          titleColor: 'group-hover:text-neon-gold'
        };
    }
  };

  const getDeptTagColor = (deptName = '') => {
    if (deptName.includes('Computer Science')) return 'text-neon-cyan';
    if (deptName.includes('Artificial Intelligence')) return 'text-neon-fuchsia';
    if (deptName.includes('Electronics')) return 'text-neon-amber';
    if (deptName.includes('Information Tech')) return 'text-neon-mint';
    return 'text-neon-orange';
  };

  // Compute student summary statistics
  const avgAcademicScore = myReports.length > 0
    ? Math.round(myReports.reduce((acc, r) => acc + (Number(r.overall_score) || 0), 0) / myReports.length)
    : 0;

  const avgTrustScore = myReports.length > 0
    ? Math.round(myReports.reduce((acc, r) => acc + (Number(r.integrity_metrics?.final_trust_score) || 100), 0) / myReports.length)
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ------------------------------------------------------------- */}
      {/* Student Portal Navigation Bar: Tests vs Results & Trust       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-3xl liquid-glass border border-white/20 shadow-glass-specular backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          {/* Tab 1: Available Tests */}
          <button
            type="button"
            onClick={() => setPortalTab('tests')}
            className={`px-5 py-3 rounded-2xl font-mono text-xs font-black transition-all flex items-center gap-2.5 ${
              portalTab === 'tests'
                ? 'bg-gradient-to-r from-neon-cyan to-blue-600 text-void shadow-neon-cyan scale-[1.02]'
                : 'liquid-pill text-slate-300 hover:text-white border-white/10 hover:border-white/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Available Department Examinations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-bold">
              {tests.length}
            </span>
          </button>

          {/* Tab 2: My Exam Results & Trust Scores */}
          <button
            type="button"
            onClick={() => {
              setPortalTab('results');
              fetchMyReports();
            }}
            className={`px-5 py-3 rounded-2xl font-mono text-xs font-black transition-all flex items-center gap-2.5 relative ${
              portalTab === 'results'
                ? 'bg-gradient-to-r from-neon-emerald via-neon-teal to-neon-mint text-void shadow-neon-emerald scale-[1.02]'
                : 'liquid-pill text-slate-300 hover:text-white border-white/10 hover:border-white/30'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>My Exam Results & Trust Scores</span>
            {myReports.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-void/80 text-neon-mint font-bold font-mono">
                {myReports.length}
              </span>
            )}
          </button>
        </div>

        {/* Refresh / Student Info Badge */}
        <div className="flex items-center gap-3 px-3">
          <div className="text-right hidden md:block">
            <span className="text-[10px] font-mono text-slate-400 block">Candidate Identity</span>
            <span className="text-xs font-bold text-white font-mono">{user.name || 'Candidate'} ({user.email || 'student@skit.org.in'})</span>
          </div>
          <button
            onClick={fetchMyReports}
            className="p-2.5 rounded-xl liquid-pill text-neon-cyan hover:text-white transition"
            title="Refresh Results"
          >
            <RefreshCw className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW A: MY EXAM RESULTS & TRUST SCORES                         */}
      {/* ------------------------------------------------------------- */}
      {portalTab === 'results' && (
        <div className="space-y-6">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold">Total Exams Completed</span>
              <div className="text-3xl font-black text-white font-mono mt-1">{myReports.length}</div>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">Official session records</span>
            </div>

            <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold">Average Academic Score</span>
              <div className="text-3xl font-black text-neon-cyan font-mono mt-1">{avgAcademicScore} / 100</div>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">MCQ + Coding + Viva</span>
            </div>

            <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold">Average Trust Score</span>
              <div className="text-3xl font-black text-neon-mint font-mono mt-1">{avgTrustScore}%</div>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">AI Proctor Integrity Index</span>
            </div>

            <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold">Integrity Standing</span>
              <div className="text-lg font-black text-white font-mono mt-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-neon-mint" />
                <span>{avgTrustScore >= 75 ? 'Certified Clean' : 'Under Review'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">SKIT Academic Regulation</span>
            </div>
          </div>

          {/* List of Completed Exams */}
          {myReports.length === 0 ? (
            <div className="liquid-glass rounded-3xl p-12 text-center border border-white/20 backdrop-blur-2xl">
              <div className="w-16 h-16 rounded-3xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan flex items-center justify-center mx-auto mb-4 shadow-neon-cyan">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white font-mono">No Completed Examinations Yet</h3>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-md mx-auto">
                You have not submitted any exams under this account yet. Launch any assessment from the &quot;Available Department Examinations&quot; tab to take your test and view your results and trust score.
              </p>
              <button
                onClick={() => setPortalTab('tests')}
                className="mt-6 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-neon-cyan to-blue-600 text-void font-black text-xs font-mono shadow-neon-cyan transition active:scale-95"
              >
                Browse Available Examinations
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myReports.map((rep) => {
                const integrity = rep.integrity_metrics || {};
                const trust = integrity.final_trust_score !== undefined ? integrity.final_trust_score : 100;
                const totalWarns = integrity.total_warnings || 0;
                const isTerminated = totalWarns >= 5;

                return (
                  <div
                    key={rep.session_id}
                    className="liquid-glass rounded-3xl p-6 border border-white/20 shadow-glass-specular backdrop-blur-2xl hover:border-white/40 transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 pb-5 border-b border-white/10">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-neon-mint/15 text-neon-mint border border-neon-mint/30">
                            <Award className="w-5 h-5" />
                          </span>
                          <div>
                            <h3 className="text-base sm:text-lg font-black text-white">
                              {rep.test_title || rep.test?.title || 'Department Curriculum Assessment'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                              <span className="text-neon-cyan font-bold">{rep.candidate?.department || userDepartment}</span>
                              <span>•</span>
                              <span>Session Ref: <strong className="text-white">{rep.session_id}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-neon-gold" />
                                {rep.date_display || 'Recent'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trust Score & Integrity Badge */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`px-4 py-2 rounded-2xl border font-mono text-xs font-black flex items-center gap-2 shadow-lg ${
                          trust >= 75
                            ? 'bg-neon-emerald/20 border-neon-emerald text-neon-mint shadow-neon-emerald'
                            : trust >= 50
                            ? 'bg-neon-amber/20 border-neon-amber text-neon-gold shadow-neon-amber'
                            : 'bg-neon-rose/25 border-neon-rose text-neon-rose shadow-neon-rose'
                        }`}>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Trust Score: {trust}%</span>
                        </div>

                        <span className={`px-3 py-1.5 rounded-2xl text-[10px] font-mono font-bold border ${
                          isTerminated
                            ? 'bg-neon-rose/20 text-neon-rose border-neon-rose/50'
                            : 'bg-white/[0.05] text-slate-300 border-white/10'
                        }`}>
                          {totalWarns} of 5 Strikes Logged
                        </span>

                        <button
                          onClick={() => onViewReport && onViewReport(rep)}
                          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-white font-bold text-xs font-mono shadow-neon-fuchsia transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Official Scorecard & Certificate</span>
                        </button>
                      </div>
                    </div>

                    {/* Scores Grid & Infraction breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                      <div className="p-3 rounded-2xl liquid-glass-subtle border border-neon-cyan/30 text-center">
                        <span className="text-[10px] font-mono text-neon-cyan font-bold uppercase">Stage 1: MCQ</span>
                        <div className="text-lg font-black font-mono text-white mt-0.5">{rep.mcq_score || '0/20'}</div>
                      </div>

                      <div className="p-3 rounded-2xl liquid-glass-subtle border border-neon-fuchsia/30 text-center">
                        <span className="text-[10px] font-mono text-neon-fuchsia font-bold uppercase">Stage 2: Coding</span>
                        <div className="text-lg font-black font-mono text-white mt-0.5">{rep.coding_score || '0/30'}</div>
                      </div>

                      <div className="p-3 rounded-2xl liquid-glass-subtle border border-neon-mint/30 text-center">
                        <span className="text-[10px] font-mono text-neon-mint font-bold uppercase">Stage 3: Zam AI Viva</span>
                        <div className="text-lg font-black font-mono text-white mt-0.5">{rep.interview_score || '0/50'}</div>
                      </div>

                      <div className="p-3 rounded-2xl liquid-glass-subtle border border-neon-emerald/40 text-center bg-neon-emerald/10 shadow-neon-emerald">
                        <span className="text-[10px] font-mono text-neon-mint font-bold uppercase">Total Academic Score</span>
                        <div className="text-xl font-black font-mono text-neon-mint mt-0.5">{rep.overall_score || 0} / 100</div>
                      </div>
                    </div>

                    {/* Infraction Breakdown Pills */}
                    {integrity.warnings_breakdown && (
                      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase">Proctor Audit Log:</span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Mobile Phone: <b className="text-neon-rose">{integrity.warnings_breakdown.mobile_phone || 0}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Gaze Away: <b className="text-neon-amber">{integrity.warnings_breakdown.looking_away || 0}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Tab Switches: <b className="text-neon-cyan">{integrity.warnings_breakdown.tab_switch || 0}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Voice Flags: <b className="text-neon-fuchsia">{integrity.warnings_breakdown.voice || 0}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Window Backlight: <b className="text-neon-amber">{integrity.warnings_breakdown.window_backlight || 0}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Head Nodding: <b className="text-neon-mint">{integrity.warnings_breakdown.head_nodding || 0}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                          Partial Face: <b className="text-neon-cyan">{integrity.warnings_breakdown.partial_face || 0}</b>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW B: AVAILABLE DEPARTMENT EXAMINATIONS                      */}
      {/* ------------------------------------------------------------- */}
      {portalTab === 'tests' && (
        <div className="space-y-8">
          {/* Header Strip with Frosted Glass Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl liquid-glass shadow-liquid">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-white/20 flex items-center justify-center shadow-neon-fuchsia overflow-hidden flex-shrink-0">
                  <img src="/skit-logo.png" alt="SKIT Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    SKIT Curriculum Examination Roster
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">
                    Sri Krishna Institute of Technology • Certified Proctored Examination Environments
                  </p>
                </div>
              </div>
            </div>

            {/* Search & Type Controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Glass Search Box */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-neon-cyan absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search curriculum..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-full bg-white/[0.08] border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/30 transition font-mono backdrop-blur-xl"
                />
              </div>

              {/* Type Segment Control */}
              <div className="flex items-center p-1.5 rounded-full bg-white/[0.06] border border-white/15 text-xs backdrop-blur-xl">
                {['ALL', 'comprehensive', 'mcq', 'coding', 'interview'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-full font-black capitalize transition-all duration-200 text-[11px] ${
                      selectedType === type
                        ? 'bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white shadow-liquid-glow-fuchsia border border-white/30'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {type === 'ALL' ? 'All Formats' : type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vibrant Department Filter Chips */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedDept('ALL')}
              className={`px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 border flex items-center gap-2 ${
                selectedDept === 'ALL'
                  ? 'bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white border-white/40 shadow-liquid-glow-fuchsia scale-105'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-white/20 hover:border-white/40 shadow-sm'
              }`}
            >
              <span>All Departments</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                selectedDept === 'ALL' ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-300'
              }`}>
                {tests.length}
              </span>
            </button>
            {departments.map((dept) => {
              const deptName = typeof dept === 'string' ? dept : (dept?.name || dept?.title || String(dept));
              const count = tests.filter((t) => t.department === deptName).length;
              const isSelected = selectedDept === deptName;
              const isUserDept = userDepartment && userDepartment === deptName;

              return (
                <button
                  key={deptName}
                  onClick={() => setSelectedDept(deptName)}
                  className={`px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-neon-cyan to-blue-600 text-white border-white/40 shadow-liquid-glow-cyan scale-105'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-white/20 hover:border-white/40 shadow-sm'
                  }`}
                >
                  <span>{deptName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-300'
                  }`}>
                    {count}
                  </span>
                  {isUserDept && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold">
                      My Dept
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Curriculum Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => {
              const theme = getTypeTheme(test.type);
              const Icon = theme.icon;

              return (
                <div
                  key={test.id}
                  className={`group relative rounded-3xl p-6 liquid-glass border border-white/20 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-liquid ${theme.glow}`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.accent}`} />

                  <div>
                    {/* Header Pill & Dept */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border font-mono ${theme.badge}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="capitalize">{test.type || 'Comprehensive'}</span>
                      </span>

                      <span className={`text-[11px] font-mono font-bold truncate max-w-[170px] ${getDeptTagColor(test.department)}`}>
                        {test.department}
                      </span>
                    </div>

                    <h3 className={`text-lg font-black text-white transition-colors duration-200 mb-2 line-clamp-2 ${theme.titleColor}`}>
                      {test.title}
                    </h3>

                    <p className="text-xs text-slate-300 line-clamp-3 mb-6 font-medium leading-relaxed">
                      {test.description}
                    </p>
                  </div>

                  {/* Footer Meta & Launch Action */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-neon-gold" />
                        <span>{test.duration_minutes || 45} mins</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-neon-mint" />
                        <span>
                          {test.questions?.length || 20} MCQs • 2 Codes • 3 Viva
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setInspectingTest(test)}
                        className="flex-1 py-3 rounded-2xl liquid-pill text-xs font-mono font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
                        <span>Curriculum Blueprint</span>
                      </button>

                      <button
                        onClick={() => onSelectTest(test)}
                        className={`flex-1 py-3 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider font-mono ${theme.btn}`}
                      >
                        <span>Start Test</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Curriculum Blueprint Inspection Modal */}
      {inspectingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-2xl">
          <div className="relative w-full max-w-xl rounded-3xl liquid-glass border border-white/20 p-7 shadow-glass-specular">
            <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-neon-fuchsia/20 text-neon-fuchsia border border-neon-fuchsia/40">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{inspectingTest.title}</h3>
                  <span className="text-xs font-mono text-neon-cyan">{inspectingTest.department}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectingTest(null)}
                className="p-2 rounded-xl liquid-pill text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neon-cyan flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> Stage 1: MCQ Assessment
                  </span>
                  <span className="font-mono text-neon-cyan font-bold">{inspectingTest.questions?.length || 20} MCQs</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Personalized 20 randomized questions generated per candidate with instant verification and anti-guess weighting.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neon-fuchsia/5 border border-neon-fuchsia/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neon-fuchsia flex items-center gap-2">
                    <Code2 className="w-4 h-4" /> Stage 2: Technical Coding Challenges
                  </span>
                  <span className="font-mono text-neon-fuchsia font-bold">{inspectingTest.coding_questions?.length || 2} Problems</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Department-specific live algorithmic coding compiled inside sandboxed terminal with real stdout and automated test assertions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neon-emerald/5 border border-neon-emerald/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neon-mint flex items-center gap-2">
                    <Mic className="w-4 h-4" /> Stage 3: Zam AI Viva & Technical Defense
                  </span>
                  <span className="font-mono text-neon-mint font-bold">{inspectingTest.interview_topics?.length || 3} Topics</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Conversational AI agent &quot;Zam AI&quot; dynamically interrogates concept depth using neural speech synthesis, listens via microphone, and grades technical reasoning.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/15 flex items-center justify-between mt-4">
              <span className="text-[11px] font-mono text-slate-400">Total Weight: 100 Academic Points</span>
              <button
                onClick={() => {
                  const target = inspectingTest;
                  setInspectingTest(null);
                  onSelectTest(target);
                }}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-neon-cyan via-neon-fuchsia to-neon-violet text-white font-black text-xs uppercase tracking-wider shadow-liquid-glow-fuchsia"
              >
                Launch Examination Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
