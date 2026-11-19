import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  UserPlus,
  PlusCircle,
  Trash2,
  Edit3,
  Bell,
  Send,
  Users,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Sparkles,
  Lock,
  Radio,
  FileCheck,
  ShieldCheck,
  Flame,
  Zap,
  X,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  Database,
  Server,
  HardDrive,
  RefreshCw,
  FileText,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cpu,
  HelpCircle,
  Code2,
  Mic,
  FileCode,
  Printer,
  AlertTriangle,
  Award
} from 'lucide-react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export default function AdminDashboard({
  departments = [],
  tests = [],
  onRefreshTests,
  onViewReport
}) {
  const [activeTab, setActiveTab] = useState('admission');

  // Student Admission State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentDept, setStudentDept] = useState(departments[0] || 'Computer Science & Engineering (CSE)');
  const [admissionMessage, setAdmissionMessage] = useState({ text: '', type: '' });
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showPasswordPreview, setShowPasswordPreview] = useState(false);

  // Notification Management State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifDept, setNotifDept] = useState('ALL');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifPriority, setNotifPriority] = useState('HIGH');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notificationsList, setNotificationsList] = useState([]);
  const [editingNotifId, setEditingNotifId] = useState(null);

  // Department Management State
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptName, setEditingDeptName] = useState(null);
  const [deptEditValue, setDeptEditValue] = useState('');
  const [deptMessage, setDeptMessage] = useState({ text: '', type: '' });

  // Test Creation/Editing State
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testTitle, setTestTitle] = useState('');
  const [testDept, setTestDept] = useState(departments[0] || 'Computer Science & Engineering (CSE)');
  const [testType, setTestType] = useState('mcq');
  const [testDuration, setTestDuration] = useState(45);
  const [testDescription, setTestDescription] = useState('');

  // Live Proctor Status
  const [liveStatus, setLiveStatus] = useState({
    trust_score: 100,
    warnings_count: {},
    incidents: []
  });

  // Database & Backend Inspector State
  const [dbOverview, setDbOverview] = useState(null);
  const [dbReports, setDbReports] = useState([]);
  const [dbSelectedDept, setDbSelectedDept] = useState('ALL');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbInspectingTest, setDbInspectingTest] = useState(null);
  const [dbActiveSubTab, setDbActiveSubTab] = useState('tests');
  const [dbSyncing, setDbSyncing] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState(null);
  const [selectedAuditReport, setSelectedAuditReport] = useState(null);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState('ALL');

  const fetchLiveStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/session/status`);
      setLiveStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/students`);
      setStudentsList(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchDatabaseOverview = async () => {
    setDbSyncing(true);
    try {
      const [overviewRes, reportsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/database/overview`),
        axios.get(`${API_BASE_URL}/api/reports`).catch(() => ({ data: { reports: [] } }))
      ]);
      setDbOverview(overviewRes.data);
      setDbReports(reportsRes.data.reports || []);
      await fetchStudents();
      if (onRefreshTests) onRefreshTests();
    } catch (err) {
      console.error('Failed to fetch database overview:', err);
    } finally {
      setTimeout(() => setDbSyncing(false), 600);
    }
  };

  const fetchNotificationsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`);
      setNotificationsList(res.data.notifications || []);
    } catch (err) {
      console.warn('Failed to load notifications list:', err);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    fetchStudents();
    fetchDatabaseOverview();
    fetchNotificationsList();
    const interval = setInterval(fetchLiveStatus, 3500);
    return () => clearInterval(interval);
  }, []);

  // Set default studentDept if empty
  useEffect(() => {
    if (departments.length > 0 && !departments.includes(studentDept)) {
      setStudentDept(departments[0]);
    }
  }, [departments, studentDept]);

  // Spaceless Password Auto-Generator
  // e.g. "Rakshita D" -> "rakshitad@123"
  const handleNameChange = (val) => {
    setStudentName(val);
    const spaceless = val.replace(/\s+/g, '').toLowerCase();
    if (spaceless) {
      setStudentPassword(`${spaceless}@123`);
    } else {
      setStudentPassword('');
    }
  };

  const handleAdmitStudent = async (e) => {
    e.preventDefault();
    setAdmissionMessage({ text: '', type: '' });

    if (!studentEmail.toLowerCase().endsWith('@skit.org.in')) {
      setAdmissionMessage({
        text: 'Invalid Email: Candidate email must strictly be a valid @skit.org.in address.',
        type: 'error'
      });
      return;
    }

    const spacelessName = studentName.replace(/\s+/g, '').toLowerCase();
    const firstName = studentName.trim().split(/\s+/)[0].toLowerCase();
    const trimmedFull = studentName.trim().toLowerCase();

    // Accepted password variants:
    // 1) Spaceless full name: rakshitad@123
    // 2) First name: rakshita@123
    // 3) Full with space: rakshita d@123
    // 4) Any valid pattern: <name>@123
    const validFormulas = [
      `${spacelessName}@123`,
      `${firstName}@123`,
      `${trimmedFull}@123`
    ];

    const enteredPass = studentPassword.trim().toLowerCase();

    if (!validFormulas.includes(enteredPass) && !/^[a-zA-Z0-9_.-]+@123$/.test(enteredPass)) {
      setAdmissionMessage({
        text: `Invalid Password Format: Candidate password must follow the '<name>@123' format (e.g. '${spacelessName}@123' or '${firstName}@123').`,
        type: 'error'
      });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/auth/admit-student`, {
        name: studentName.trim(),
        email: studentEmail.trim().toLowerCase(),
        password: studentPassword.trim(),
        department: studentDept
      });

      setAdmissionMessage({
        text: `Official Authority Granted: Candidate "${studentName.trim()}" (${studentEmail.trim()}) admitted to ${studentDept} with password "${studentPassword.trim()}".`,
        type: 'success'
      });
      setStudentName('');
      setStudentEmail('');
      setStudentPassword('');
      fetchStudents();
    } catch (err) {
      setAdmissionMessage({
        text: err.response?.data?.detail || 'Failed to admit candidate credentials.',
        type: 'error'
      });
    }
  };

  const handleDeleteStudent = async (studentEmail) => {
    if (!window.confirm(`Are you sure you want to revoke credentials and delete student "${studentEmail}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/auth/students/${encodeURIComponent(studentEmail)}`);
      setAdmissionMessage({
        text: `Student "${studentEmail}" credentials successfully revoked and removed.`,
        type: 'success'
      });
      fetchStudents();
      setTimeout(() => setAdmissionMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      alert('Failed to delete student credentials.');
    }
  };

  // Department CRUD Handlers
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setDeptMessage({ text: '', type: '' });
    const cleanName = newDeptName.trim();
    if (!cleanName) return;

    try {
      await axios.post(`${API_BASE_URL}/api/departments`, { name: cleanName });
      setDeptMessage({ text: `Department "${cleanName}" created successfully!`, type: 'success' });
      setNewDeptName('');
      if (onRefreshTests) onRefreshTests();
      setTimeout(() => setDeptMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setDeptMessage({ text: err.response?.data?.detail || 'Failed to add department.', type: 'error' });
    }
  };

  const handleUpdateDepartment = async (oldName) => {
    const cleanNew = deptEditValue.trim();
    if (!cleanNew || cleanNew === oldName) {
      setEditingDeptName(null);
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/departments/${encodeURIComponent(oldName)}`, { new_name: cleanNew });
      setDeptMessage({ text: `Department renamed to "${cleanNew}" successfully!`, type: 'success' });
      setEditingDeptName(null);
      if (onRefreshTests) onRefreshTests();
      setTimeout(() => setDeptMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setDeptMessage({ text: err.response?.data?.detail || 'Failed to update department.', type: 'error' });
    }
  };

  const handleDeleteDepartment = async (deptName) => {
    if (!window.confirm(`Are you sure you want to delete the department "${deptName}"? This will unassign tests and students in this department.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/departments/${encodeURIComponent(deptName)}`);
      setDeptMessage({ text: `Department "${deptName}" deleted successfully.`, type: 'success' });
      if (onRefreshTests) onRefreshTests();
      setTimeout(() => setDeptMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setDeptMessage({ text: err.response?.data?.detail || 'Failed to delete department.', type: 'error' });
    }
  };

  // Notification CRUD Handlers
  const handlePushNotification = async (e) => {
    e.preventDefault();
    setNotifSuccess('');

    try {
      if (editingNotifId) {
        await axios.put(`${API_BASE_URL}/api/notifications/${editingNotifId}`, {
          department: notifDept,
          title: notifTitle,
          message: notifMessage,
          priority: notifPriority
        });
        setNotifSuccess('Directive updated successfully!');
        setEditingNotifId(null);
      } else {
        await axios.post(`${API_BASE_URL}/api/notifications`, {
          department: notifDept,
          title: notifTitle,
          message: notifMessage,
          priority: notifPriority
        });
        setNotifSuccess(`Notification dispatched to ${notifDept} department successfully!`);
      }

      setNotifTitle('');
      setNotifMessage('');
      fetchNotificationsList();
      setTimeout(() => setNotifSuccess(''), 4000);
    } catch (err) {
      alert('Failed to dispatch notification broadcast.');
    }
  };

  const handleEditNotification = (notif) => {
    setEditingNotifId(notif.id);
    setNotifTitle(notif.title);
    setNotifDept(notif.department || 'ALL');
    setNotifPriority(notif.priority || 'HIGH');
    setNotifMessage(notif.message);
  };

  const handleDeleteNotification = async (notifId) => {
    if (!window.confirm('Are you sure you want to delete this broadcast directive?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/notifications/${notifId}`);
      fetchNotificationsList();
    } catch (err) {
      alert('Failed to delete broadcast directive.');
    }
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      if (editingTestId) {
        await axios.put(`${API_BASE_URL}/api/tests/${editingTestId}`, {
          title: testTitle,
          department: testDept,
          type: testType,
          duration_minutes: parseInt(testDuration, 10),
          description: testDescription
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/tests`, {
          title: testTitle,
          department: testDept,
          type: testType,
          duration_minutes: parseInt(testDuration, 10),
          description: testDescription
        });
      }
      setShowTestModal(false);
      setEditingTestId(null);
      if (onRefreshTests) onRefreshTests();
    } catch (err) {
      alert('Failed to save test curriculum.');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test curriculum?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tests/${testId}`);
      if (onRefreshTests) onRefreshTests();
    } catch (err) {
      alert('Failed to delete test.');
    }
  };

  const filteredStudents = studentsList.filter((st) => {
    const q = studentSearch.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      st.email.toLowerCase().includes(q) ||
      st.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ------------------------------------------------------------- */}
      {/* COMMAND CONTROL HERO BAR WITH VIBRANT LIGHTING                */}
      {/* ------------------------------------------------------------- */}
      <div className="relative rounded-[2.5rem] p-7 sm:p-9 liquid-glass border border-white/20 shadow-glass-specular overflow-hidden backdrop-blur-3xl">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-tr from-neon-cyan/25 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-gradient-to-bl from-neon-fuchsia/25 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-cyan via-white/50 to-neon-fuchsia" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-white/30 flex items-center justify-center shadow-neon-fuchsia overflow-hidden flex-shrink-0">
                <img src="/skit-logo.png" alt="SKIT Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  SKIT Mission Control
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-neon-emerald/20 text-neon-mint border border-neon-emerald/40 uppercase shadow-neon-emerald">
                    Sri Krishna Institute of Technology
                  </span>
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  Autonomous Proctoring & Department Examination Authority • Bangalore
                </p>
              </div>
            </div>
          </div>

          {/* Quick Authority Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('results');
                fetchDatabaseOverview();
              }}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 font-mono shadow-md ${
                activeTab === 'results'
                  ? 'bg-gradient-to-r from-neon-emerald via-neon-teal to-neon-mint text-void shadow-neon-emerald active:scale-95'
                  : 'liquid-pill text-neon-mint border border-neon-mint/40 hover:bg-neon-mint/15'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Exam Results & Trust Scores ({dbReports.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('admission')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 font-mono shadow-md ${
                activeTab === 'admission'
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-teal text-void shadow-neon-cyan active:scale-95'
                  : 'liquid-pill text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/15'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Admit Student Authority</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('database');
                fetchDatabaseOverview();
              }}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 font-mono shadow-md ${
                activeTab === 'database'
                  ? 'bg-gradient-to-r from-neon-cyan via-neon-fuchsia to-neon-violet text-white shadow-liquid-glow-fuchsia active:scale-95'
                  : 'liquid-pill text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/15'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Database Inspector</span>
            </button>

            <button
              onClick={() => {
                setEditingTestId(null);
                setTestTitle('');
                setTestDescription('');
                setShowTestModal(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-white font-black text-xs transition flex items-center gap-2 font-mono shadow-neon-fuchsia"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Test</span>
            </button>
          </div>
        </div>

        {/* Prominent Tab Switcher */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-7 pt-6 border-t border-white/15">
          {[
            {
              id: 'results',
              label: 'Exam Results & Trust Scores',
              sub: `${dbReports.length} Candidate Submissions`,
              icon: Award,
              color: 'text-neon-mint',
              activeGlow: 'bg-gradient-to-r from-neon-emerald/20 to-neon-mint/20 border-neon-mint text-white shadow-neon-emerald'
            },
            {
              id: 'admission',
              label: 'Student Admission & Authority',
              sub: `${studentsList.length} Candidates Enrolled`,
              icon: UserPlus,
              color: 'text-neon-cyan',
              activeGlow: 'bg-gradient-to-r from-neon-cyan/20 to-neon-teal/20 border-neon-cyan text-white shadow-neon-cyan'
            },
            {
              id: 'departments',
              label: 'Academic Departments Studio',
              sub: `${departments.length} SKIT Departments`,
              icon: Building2,
              color: 'text-neon-cyan',
              activeGlow: 'bg-gradient-to-r from-neon-cyan/20 to-blue-600/20 border-neon-cyan text-white shadow-neon-cyan'
            },
            {
              id: 'tests',
              label: 'Curriculum Tests Studio',
              sub: `${tests.length} Department Curricula`,
              icon: Layers,
              color: 'text-neon-fuchsia',
              activeGlow: 'bg-gradient-to-r from-neon-fuchsia/20 to-neon-pink/20 border-neon-fuchsia text-white shadow-neon-fuchsia'
            },
            {
              id: 'broadcast',
              label: 'Department Broadcast Alerts',
              sub: `${notificationsList.length} Active Directives`,
              icon: Bell,
              color: 'text-neon-gold',
              activeGlow: 'bg-gradient-to-r from-neon-amber/20 to-neon-orange/20 border-neon-amber text-white shadow-neon-amber'
            },
            {
              id: 'database',
              label: 'Backend & Database Inspector',
              sub: `${tests.length} Tests • 500 MCQs • Live DB`,
              icon: Database,
              color: 'text-neon-fuchsia',
              activeGlow: 'bg-gradient-to-r from-neon-cyan/20 via-neon-fuchsia/20 to-neon-violet/20 border-white text-white shadow-liquid-glow-fuchsia'
            },
            {
              id: 'monitor',
              label: 'Live Proctor Telemetry',
              sub: 'Acoustic & Vision Stream',
              icon: Activity,
              color: 'text-neon-mint',
              activeGlow: 'bg-gradient-to-r from-neon-emerald/20 to-neon-mint/20 border-neon-mint text-white shadow-neon-emerald'
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? `${tab.activeGlow} font-bold`
                    : 'liquid-glass-subtle border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${tab.color}`} />
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white shadow-[0_0_8px_#fff]' : 'bg-white/20'}`} />
                </div>
                <div>
                  <div className="text-xs font-black tracking-tight">{tab.label}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: EXAM RESULTS & PROCTOR TRUST SCORE AUDIT             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'results' && (() => {
        const filteredReports = dbReports.filter((rep) => {
          const q = submissionSearch.toLowerCase().trim();
          const candidateName = (rep.candidate?.name || '').toLowerCase();
          const candidateEmail = (rep.candidate?.email || '').toLowerCase();
          const candidateId = (rep.candidate?.id || rep.session_id || '').toLowerCase();
          const testTitle = (rep.test_title || '').toLowerCase();

          const matchesSearch = !q || candidateName.includes(q) || candidateEmail.includes(q) || candidateId.includes(q) || testTitle.includes(q);

          const rawWarns = rep.integrity_metrics?.warnings_breakdown || {};
          const totalWarns = rep.integrity_metrics?.total_warnings !== undefined
            ? rep.integrity_metrics.total_warnings
            : (rawWarns.total !== undefined ? rawWarns.total : Object.values(rawWarns).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0));

          let matchesStatus = true;
          if (submissionFilterStatus === 'TERMINATED') {
            matchesStatus = totalWarns >= 5;
          } else if (submissionFilterStatus === 'FLAGGED') {
            matchesStatus = totalWarns >= 3 && totalWarns < 5;
          } else if (submissionFilterStatus === 'PASSED') {
            matchesStatus = totalWarns < 3;
          }

          return matchesSearch && matchesStatus;
        });

        const totalSubmissions = dbReports.length;
        const passedCount = dbReports.filter((r) => (r.integrity_metrics?.total_warnings || 0) < 3).length;
        const flaggedCount = dbReports.filter((r) => (r.integrity_metrics?.total_warnings || 0) >= 3 && (r.integrity_metrics?.total_warnings || 0) < 5).length;
        const termCount = dbReports.filter((r) => (r.integrity_metrics?.total_warnings || 0) >= 5).length;

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Total Submissions</span>
                <div className="text-3xl font-black text-white font-mono mt-1">{totalSubmissions}</div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">Completed sessions</span>
              </div>
              <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Passed & Verified</span>
                <div className="text-3xl font-black text-neon-mint font-mono mt-1">{passedCount}</div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">&lt; 3 warning strikes</span>
              </div>
              <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Flagged for Review</span>
                <div className="text-3xl font-black text-neon-gold font-mono mt-1">{flaggedCount}</div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">3-4 warning strikes</span>
              </div>
              <div className="liquid-glass rounded-2xl p-5 border border-white/15 backdrop-blur-xl">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Terminated / Breach</span>
                <div className="text-3xl font-black text-neon-rose font-mono mt-1">{termCount}</div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">5+ security strikes</span>
              </div>
            </div>

            {/* Submissions & Proctor Integrity Audit Table */}
            <div className="rounded-2xl liquid-glass border border-white/15 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-neon-mint" />
                    Candidate Examination Results & Proctor Trust Score Audit
                  </h3>
                  <p className="text-xs text-slate-300">
                    Live candidate examination records: Academic scores across MCQ (20), Coding (30), and Viva (50), plus Proctor Trust Score (0-100%).
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      placeholder="Search candidate name, email, ID..."
                      className="pl-8 pr-3 py-1.5 rounded-xl liquid-glass-subtle border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan w-64"
                    />
                  </div>

                  <select
                    value={submissionFilterStatus}
                    onChange={(e) => setSubmissionFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono cursor-pointer"
                  >
                    <option value="ALL">All Verdicts</option>
                    <option value="TERMINATED">5 Strikes (Terminated)</option>
                    <option value="FLAGGED">Flagged for Review</option>
                    <option value="PASSED">Verified & Passed</option>
                  </select>

                  <button
                    onClick={fetchDatabaseOverview}
                    disabled={dbSyncing}
                    className="p-2 rounded-xl liquid-pill text-neon-cyan hover:text-white transition"
                    title="Refresh Submissions"
                  >
                    <RefreshCw className={`w-4 h-4 ${dbSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="font-bold text-slate-300">No exam submissions found matching current search criteria.</p>
                  <p className="mt-1">Candidate completed examinations will populate here automatically with composite scores and proctor logs.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-3 px-3">Candidate & ID</th>
                        <th className="py-3 px-3">Examination</th>
                        <th className="py-3 px-3">MCQ (20)</th>
                        <th className="py-3 px-3">Coding (30)</th>
                        <th className="py-3 px-3">Viva (50)</th>
                        <th className="py-3 px-3">Total Score</th>
                        <th className="py-3 px-3">Strikes & Breakdown</th>
                        <th className="py-3 px-3">Trust Score</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredReports.map((rep) => {
                        const rawWarns = rep.integrity_metrics?.warnings_breakdown || {};
                        const totalWarns = rep.integrity_metrics?.total_warnings !== undefined
                          ? rep.integrity_metrics.total_warnings
                          : (rawWarns.total !== undefined ? rawWarns.total : Object.values(rawWarns).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0));
                        const isTerminated = totalWarns >= 5;
                        const finalTrust = rep.integrity_metrics?.final_trust_score !== undefined
                          ? rep.integrity_metrics.final_trust_score
                          : (isTerminated ? 25 : 100);

                        return (
                          <tr key={rep.session_id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-white text-xs">{rep.candidate?.name || 'Candidate'}</div>
                              <div className="text-[11px] text-neon-cyan">{rep.candidate?.email}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {rep.candidate?.id || rep.session_id}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-200">{rep.test_title || 'Curriculum Evaluation'}</div>
                              <div className="text-[10px] text-slate-400">{rep.date_display || 'Recent'}</div>
                            </td>
                            <td className="py-3.5 px-3 font-bold text-neon-cyan">
                              {rep.evaluation?.mcq_score ?? (rep.mcq_score || '0/20')}
                            </td>
                            <td className="py-3.5 px-3 font-bold text-neon-fuchsia">
                              {rep.evaluation?.coding_score ?? (rep.coding_score || '0/30')}
                            </td>
                            <td className="py-3.5 px-3 font-bold text-neon-mint">
                              {rep.evaluation?.interview_score ?? (rep.interview_score || '0/50')}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-black text-sm text-neon-mint bg-neon-emerald/20 px-2.5 py-1 rounded-md border border-neon-emerald/30 shadow-neon-emerald">
                                {rep.overall_score || 0} / 100
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                isTerminated
                                  ? 'bg-neon-rose/25 border-neon-rose text-rose-200 shadow-neon-rose animate-pulse'
                                  : totalWarns >= 3
                                  ? 'bg-neon-amber/25 border-neon-amber text-amber-200'
                                  : 'bg-neon-emerald/20 border-neon-emerald/40 text-neon-mint'
                              }`}>
                                {isTerminated ? `⚠️ ${totalWarns}/5 STRIKES (TERMINATED)` : `${totalWarns} Warnings Logged`}
                              </span>
                              <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-2">
                                <span title="Tab switches">🖥️ {rawWarns.tab_switch || 0}</span>
                                <span title="Head turns">👤 {rawWarns.looking_away || 0}</span>
                                <span title="Mobile phone">📱 {rawWarns.mobile_phone || 0}</span>
                                <span title="Voice flags">🎙️ {rawWarns.voice || 0}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border block text-center ${
                                isTerminated || finalTrust < 60
                                  ? 'bg-neon-rose/20 border-neon-rose/40 text-rose-200'
                                  : 'bg-neon-emerald/20 border-neon-emerald/40 text-neon-mint'
                              }`}>
                                {finalTrust}% Trust
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedAuditReport(rep)}
                                  className="px-3 py-1.5 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/35 border border-neon-cyan/40 text-neon-cyan font-bold text-xs flex items-center gap-1.5 transition shadow-neon-cyan cursor-pointer"
                                  title="Inspect Full Proctor Log"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Review</span>
                                </button>
                                {onViewReport && (
                                  <button
                                    onClick={() => onViewReport(rep)}
                                    className="px-3 py-1.5 rounded-xl bg-neon-fuchsia/20 hover:bg-neon-fuchsia/35 border border-neon-fuchsia/40 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-neon-fuchsia cursor-pointer"
                                    title="View Printable Certificate"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Certificate</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: CANDIDATE ADMISSION AUTHORITY CONSOLE (DEFAULT)    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'admission' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            
            {/* Left Card: Enrollment Authority Form */}
            <div className="lg:col-span-5 p-7 sm:p-8 rounded-[2rem] liquid-glass border border-neon-cyan/40 shadow-neon-cyan flex flex-col justify-between relative overflow-hidden backdrop-blur-3xl">
              <div className="absolute top-0 right-0 w-44 h-44 bg-neon-cyan/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="p-2.5 rounded-2xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-neon-cyan">
                    <UserPlus className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">Enroll Candidate Authority</h3>
                    <p className="text-[11px] font-mono text-neon-cyan font-bold">Strict Credential Enforcement</p>
                  </div>
                </div>

                <div className="my-4 p-4 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 text-xs text-slate-200 space-y-1.5 font-mono">
                  <div className="flex items-center gap-2 font-bold text-neon-cyan">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Mandatory Credentials Format:</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    • Email must end with <span className="text-neon-cyan font-bold">@skit.org.in</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    • Password formula: <span className="text-neon-mint font-bold">spaceless full name + @123</span> (e.g. <span className="text-neon-mint font-bold">rakshitad@123</span>)
                  </div>
                </div>

                {admissionMessage.text && (
                  <div className={`p-4 rounded-2xl mb-4 text-xs flex items-start gap-3 leading-relaxed font-mono ${
                    admissionMessage.type === 'success'
                      ? 'bg-neon-emerald/20 border border-neon-emerald/50 text-neon-mint shadow-neon-emerald'
                      : 'bg-neon-rose/20 border border-neon-rose/50 text-rose-100 shadow-neon-rose'
                  }`}>
                    {admissionMessage.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-neon-mint" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-neon-rose" />
                    )}
                    <span className="font-medium">{admissionMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleAdmitStudent} className="space-y-4 text-xs font-medium">
                  <div>
                    <label className="block text-slate-200 font-bold mb-1.5">Candidate Full Name</label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Rakshita D"
                      className="w-full px-4 py-3 rounded-2xl liquid-glass-subtle border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1.5 flex items-center justify-between">
                      <span>SKIT College Email</span>
                      <span className="text-[10px] font-mono text-neon-cyan font-bold">*@skit.org.in</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="rakshitad@skit.org.in"
                      className="w-full px-4 py-3 rounded-2xl liquid-glass-subtle border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1.5 flex items-center justify-between">
                      <span>Auto-Enforced Password (Spaceless)</span>
                      <span className="text-[10px] font-mono text-neon-mint font-bold">name@123</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordPreview ? 'text' : 'password'}
                        required
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="e.g. rakshitad@123"
                        className="w-full pl-4 pr-11 py-3 rounded-2xl liquid-glass-subtle border border-neon-mint/40 text-neon-mint font-mono font-bold focus:outline-none focus:border-neon-mint transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordPreview(!showPasswordPreview)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                      >
                        {showPasswordPreview ? <EyeOff className="w-4 h-4 text-neon-mint" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* High-Contrast 100% Visible Department Selection */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1.5 flex items-center justify-between">
                      <span>Assign Department Curriculum</span>
                      <span className="text-[10px] font-mono text-neon-cyan font-bold">Select or Click Pill Below</span>
                    </label>

                    {/* High-Contrast Native Dropdown with Inverted Deep-Slate Background & White Text */}
                    <select
                      value={studentDept}
                      onChange={(e) => setStudentDept(e.target.value)}
                      style={{
                        backgroundColor: '#0a0f1d',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.25)'
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/25 text-white font-bold focus:outline-none focus:border-neon-cyan transition cursor-pointer text-xs shadow-inner"
                    >
                      {departments.map((d) => (
                        <option
                          key={d}
                          value={d}
                          style={{
                            backgroundColor: '#0a0f1d',
                            color: '#ffffff',
                            padding: '12px',
                            fontSize: '13px',
                            fontWeight: 'bold'
                          }}
                          className="bg-slate-900 text-white font-bold py-2.5"
                        >
                          {d}
                        </option>
                      ))}
                    </select>

                    {/* Interactive Clickable Department Selection Pills for Instant Visibility */}
                    <div className="grid grid-cols-1 gap-1.5 mt-2.5">
                      {departments.map((d) => {
                        const isSelected = studentDept === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setStudentDept(d)}
                            className={`px-3 py-2 rounded-xl text-left text-xs font-mono font-bold transition-all flex items-center justify-between border ${
                              isSelected
                                ? 'bg-neon-cyan/25 border-neon-cyan text-white shadow-neon-cyan'
                                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                            }`}
                          >
                            <span className="truncate">{d}</span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#06b6d4] flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-teal to-neon-mint hover:opacity-95 active:scale-95 text-void font-black text-xs transition flex items-center justify-center gap-2 shadow-neon-cyan uppercase tracking-wider font-mono mt-6"
                  >
                    <UserPlus className="w-4 h-4" /> Issue Credentials & Enroll Candidate
                  </button>
                </form>
              </div>
            </div>

            {/* Right Card: Enrolled Candidates Live Directory */}
            <div className="lg:col-span-7 p-7 sm:p-8 rounded-[2rem] liquid-glass border border-white/20 shadow-glass-specular flex flex-col justify-between backdrop-blur-3xl">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-white/15">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-neon-mint/20 text-neon-mint border border-neon-mint/40 shadow-neon-emerald">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-white">Authorized Candidate Registry</h3>
                      <p className="text-[11px] font-mono text-slate-400">Total {studentsList.length} Admitted Candidates</p>
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name, email, dept..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl liquid-glass-subtle border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                </div>

                {/* Candidate Records List */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-mono text-xs">
                      No matching candidate credentials found.
                    </div>
                  ) : (
                    filteredStudents.map((st) => (
                      <div
                        key={st.id}
                        className="p-4 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-neon-cyan/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-mint shadow-[0_0_8px_#00f59b]" />
                            <span className="font-bold text-white text-sm group-hover:text-neon-cyan transition-colors">{st.name}</span>
                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-neon-emerald/20 text-neon-mint border border-neon-emerald/30 font-bold">
                              AUTHORIZED
                            </span>
                          </div>
                          <div className="text-xs font-mono text-neon-cyan">{st.email}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>{st.department}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 pt-1 flex items-center gap-1.5">
                            <span className="bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10 text-slate-300">
                              Candidate ID: <b className="text-white">{st.id || st.email}</b>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(st.id || st.email);
                                setCopiedStudentId(st.id || st.email);
                                setTimeout(() => setCopiedStudentId(null), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Copy Candidate ID"
                            >
                              {copiedStudentId === (st.id || st.email) ? <Check className="w-3 h-3 text-neon-mint" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10 gap-2">
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400">Password Formula:</span>
                            <span className="text-xs font-mono font-bold text-neon-mint bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/10 mt-0.5 block">
                              {st.password || `${st.name.replace(/\s+/g, '').toLowerCase()}@123`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('database');
                                setDbActiveSubTab('submissions');
                                setSubmissionSearch(st.email);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neon-cyan/15 hover:bg-neon-cyan/25 border border-neon-cyan/30 text-neon-cyan text-[10px] font-mono font-bold flex items-center gap-1 transition"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Submissions</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(st.email)}
                              className="px-2.5 py-1 rounded-lg bg-neon-rose/15 hover:bg-neon-rose/25 border border-neon-rose/30 text-neon-rose text-[10px] font-mono font-bold flex items-center gap-1 transition"
                              title="Revoke credentials and remove candidate"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/15 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Database Sync: Live In-Memory Cache</span>
                <span className="text-neon-mint font-bold">● Ready for Exam Access</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: PROCTOR TELEMETRY HUD AUDIT                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'monitor' && (
        <div className="space-y-6">
          {/* 4 Multi-Color Liquid Glass KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Card 1: Trust Score */}
            <div className="p-6 rounded-3xl liquid-glass border border-neon-emerald/40 shadow-neon-emerald relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-neon-mint uppercase tracking-wider">Exam Trust Index</span>
                <Activity className="w-4 h-4 text-neon-mint animate-pulse" />
              </div>
              <div className="text-4xl font-black font-mono text-neon-mint mt-1 drop-shadow-[0_0_12px_#00f59b]">
                {liveStatus.trust_score}%
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neon-mint animate-ping" />
                <span>Integrity Verified Session</span>
              </div>
            </div>

            {/* Card 2: Mobile Phone Flags */}
            <div className="p-6 rounded-3xl liquid-glass border border-neon-rose/40 shadow-neon-rose relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-neon-rose uppercase tracking-wider">Mobile Phone Flags</span>
                <Radio className="w-4 h-4 text-neon-rose animate-pulse" />
              </div>
              <div className="text-4xl font-black font-mono text-neon-rose mt-1 drop-shadow-[0_0_12px_#f43f5e]">
                {liveStatus.warnings_count?.mobile_phone || 0}
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-2">
                Visual Contour Radar Active
              </div>
            </div>

            {/* Card 3: Acoustic Voice Flags */}
            <div className="p-6 rounded-3xl liquid-glass border border-neon-amber/40 shadow-neon-amber relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-neon-gold uppercase tracking-wider">Acoustic Flags</span>
                <Zap className="w-4 h-4 text-neon-gold animate-bounce" />
              </div>
              <div className="text-4xl font-black font-mono text-neon-gold mt-1 drop-shadow-[0_0_12px_#f59e0b]">
                {liveStatus.warnings_count?.voice || 0}
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-2">
                Room Audio Activity Detection
              </div>
            </div>

            {/* Card 4: Focus Blur Flags */}
            <div className="p-6 rounded-3xl liquid-glass border border-neon-fuchsia/40 shadow-neon-fuchsia relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-neon-fuchsia uppercase tracking-wider">Focus Blur Flags</span>
                <Flame className="w-4 h-4 text-neon-fuchsia animate-pulse" />
              </div>
              <div className="text-4xl font-black font-mono text-neon-fuchsia mt-1 drop-shadow-[0_0_12px_#ec4899]">
                {liveStatus.warnings_count?.tab_switch || 0}
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-2">
                Alt+Tab & Window Blur Locked
              </div>
            </div>
          </div>

          {/* Incidents Stream Table */}
          <div className="rounded-[2rem] liquid-glass border border-white/20 overflow-hidden shadow-glass-specular">
            <div className="p-5 sm:p-6 bg-white/[0.04] border-b border-white/15 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <Radio className="w-4 h-4 text-neon-rose animate-pulse" />
                Live Incident Audit Telemetry ({liveStatus.incidents?.length || 0})
              </h3>
              <span className="text-[10px] font-mono text-neon-mint bg-neon-emerald/20 px-3 py-1 rounded-full border border-neon-emerald/40 font-bold shadow-neon-emerald">
                Active 24/7 Polling
              </span>
            </div>

            <div className="divide-y divide-white/[0.08] max-h-96 overflow-y-auto custom-scrollbar">
              {liveStatus.incidents?.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-mono">
                  Zero active infractions detected in this examination session.
                </div>
              ) : (
                liveStatus.incidents.map((inc) => (
                  <div key={inc.id} className="p-4 hover:bg-white/[0.04] transition flex items-center justify-between gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-neon-rose/20 text-neon-rose border border-neon-rose/40'
                            : 'bg-neon-amber/20 text-neon-gold border border-neon-amber/40'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-slate-400 text-[10px]">{inc.time_display}</span>
                        <span className="text-white font-bold">{inc.code}</span>
                      </div>
                      <p className="text-slate-200 font-sans text-xs">{inc.message}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-slate-300 text-[11px]">
                        Trust: <span className="font-bold text-neon-mint text-xs">{inc.trust_score}%</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: CURRICULUM TESTS STUDIO                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Department Curricula & Test Catalog</h3>
              <p className="text-xs text-slate-300">Create, customize, and configure examination tests across departments.</p>
            </div>
            <button
              onClick={() => {
                setEditingTestId(null);
                setTestTitle('');
                setTestDescription('');
                setShowTestModal(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-neon-fuchsia font-mono"
            >
              <PlusCircle className="w-4 h-4" /> Add New Test
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tests.map((t) => (
              <div key={t.id} className="p-6 rounded-[2rem] liquid-glass border border-white/20 flex flex-col justify-between shadow-glass-specular group hover:border-neon-fuchsia/50 transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] uppercase font-bold font-mono px-3 py-1 rounded-full liquid-pill text-neon-cyan border border-neon-cyan/40">
                      {t.type}
                    </span>
                    <span className="text-xs font-mono text-neon-gold font-bold">{t.duration_minutes} mins</span>
                  </div>
                  <h4 className="font-bold text-white text-base mb-1 group-hover:text-neon-fuchsia transition-colors">{t.title}</h4>
                  <p className="text-xs text-neon-cyan font-mono mb-2">{t.department}</p>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{t.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/15 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingTestId(t.id);
                      setTestTitle(t.title);
                      setTestDept(t.department);
                      setTestType(t.type);
                      setTestDuration(t.duration_minutes);
                      setTestDescription(t.description);
                      setShowTestModal(true);
                    }}
                    className="p-2 rounded-xl liquid-pill text-slate-200 text-xs flex items-center gap-1.5 transition font-bold hover:text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTest(t.id)}
                    className="p-2 rounded-xl bg-neon-rose/15 hover:bg-neon-rose/30 text-neon-rose border border-neon-rose/40 text-xs flex items-center gap-1.5 transition font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: DEPARTMENT DIRECTIVES BROADCAST & MANAGEMENT       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            {/* Left: Dispatch / Edit Directive Form */}
            <div className="lg:col-span-5 p-7 rounded-[2.5rem] liquid-glass border border-neon-amber/40 shadow-neon-amber backdrop-blur-3xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-neon-amber/15 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="p-2.5 rounded-2xl bg-neon-amber/20 text-neon-gold border border-neon-amber/40 shadow-neon-amber">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {editingNotifId ? 'Modify Directive' : 'Broadcast Directive'}
                    </h3>
                    <p className="text-[11px] font-mono text-neon-gold">Targeted Real-Time Announcements</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 mb-6">
                  {editingNotifId
                    ? 'Editing active directive broadcast. Update priority, target department, or body.'
                    : 'Push real-time test announcements, mandatory attendance directives, and proctor instructions directly into candidate notification feeds.'}
                </p>

                {notifSuccess && (
                  <div className="p-4 rounded-2xl mb-5 bg-neon-emerald/20 border border-neon-emerald/50 text-neon-mint text-xs flex items-center gap-2 font-mono shadow-neon-emerald">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{notifSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePushNotification} className="space-y-4 text-xs font-medium">
                  <div>
                    <label className="block text-slate-200 font-bold mb-1">Target Department</label>
                    <select
                      value={notifDept}
                      onChange={(e) => setNotifDept(e.target.value)}
                      style={{
                        backgroundColor: '#0a0f1d',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.25)'
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/20 text-white font-bold focus:outline-none focus:border-neon-gold cursor-pointer"
                    >
                      <option value="ALL" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>ALL DEPARTMENTS (Global Broadcast)</option>
                      {departments.map((d) => (
                        <option key={d} value={d} style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1">Directive Title</label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. Mandatory CSE AI Examination Scheduled Today"
                      className="w-full px-4 py-3 rounded-2xl liquid-glass-subtle border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-gold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1">Priority Level</label>
                    <select
                      value={notifPriority}
                      onChange={(e) => setNotifPriority(e.target.value)}
                      style={{
                        backgroundColor: '#0a0f1d',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.25)'
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:border-neon-gold cursor-pointer font-mono font-bold"
                    >
                      <option value="HIGH" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>HIGH PRIORITY</option>
                      <option value="URGENT" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>URGENT MANDATORY</option>
                      <option value="NORMAL" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>NORMAL INFORMATION</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1">Announcement Body</label>
                    <textarea
                      rows={3}
                      required
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="Provide instructions, mandatory attendance times, or proctor guidelines..."
                      className="w-full p-4 rounded-2xl liquid-glass-subtle border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-gold custom-scrollbar"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-neon-amber via-neon-orange to-neon-rose hover:opacity-95 active:scale-95 text-void font-black text-xs transition flex items-center justify-center gap-2 shadow-neon-amber uppercase tracking-wider font-mono"
                    >
                      <Send className="w-4 h-4" />
                      <span>{editingNotifId ? 'Save Directive Changes' : 'Dispatch Directive Now'}</span>
                    </button>
                    {editingNotifId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotifId(null);
                          setNotifTitle('');
                          setNotifMessage('');
                        }}
                        className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-mono font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Active Broadcast Directives Roster (Full CRUD) */}
            <div className="lg:col-span-7 p-7 rounded-[2.5rem] liquid-glass border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-neon-amber" />
                      <span>Active Broadcast Directives</span>
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Directives live in student notification center feeds
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/[0.05] border border-white/10 text-neon-gold">
                    {notificationsList.length} Directives Active
                  </span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                  {notificationsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-mono text-xs">
                      No broadcast directives dispatched yet. Use the form on the left to push announcements.
                    </div>
                  ) : (
                    notificationsList.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-neon-amber/40 transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs sm:text-sm font-mono group-hover:text-neon-gold transition-colors">
                                {notif.title}
                              </span>
                              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                                notif.priority === 'URGENT'
                                  ? 'bg-neon-rose/25 text-neon-rose border-neon-rose/40'
                                  : notif.priority === 'HIGH'
                                  ? 'bg-neon-amber/25 text-neon-gold border-neon-amber/40'
                                  : 'bg-white/10 text-slate-300 border-white/20'
                              }`}>
                                {notif.priority || 'NORMAL'}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                              <span className="text-neon-cyan font-bold">{notif.department === 'ALL' ? 'Global Broadcast' : notif.department}</span>
                              <span>•</span>
                              <span>{notif.time_display || new Date(notif.timestamp || Date.now()).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditNotification(notif)}
                              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neon-cyan text-xs font-mono transition"
                              title="Edit directive"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(notif.id)}
                              className="p-2 rounded-xl bg-neon-rose/15 hover:bg-neon-rose/30 text-neon-rose text-xs font-mono transition"
                              title="Delete directive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-black/30 p-2.5 rounded-xl border border-white/5">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Directives are view-only for student accounts</span>
                <span className="text-neon-mint font-bold">● Active Dispatch</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4B: ACADEMIC DEPARTMENTS STUDIO (CREATE, EDIT, DELETE)*/}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'departments' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl liquid-glass border border-white/10">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-neon-cyan" />
                <span>SKIT Academic Departments Management</span>
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Create, customize, and maintain academic engineering departments and curriculum assignments.
              </p>
            </div>
            <div className="px-4 py-2 rounded-2xl liquid-glass border border-neon-cyan/40 text-xs font-mono text-neon-cyan font-bold">
              {departments.length} Active Departments
            </div>
          </div>

          {deptMessage.text && (
            <div className={`p-4 rounded-2xl text-xs font-mono flex items-center gap-2 border ${
              deptMessage.type === 'error'
                ? 'bg-neon-rose/20 text-neon-rose border-neon-rose/40'
                : 'bg-neon-emerald/20 text-neon-mint border-neon-emerald/40'
            }`}>
              {deptMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{deptMessage.text}</span>
            </div>
          )}

          {/* Add New Department Card */}
          <div className="p-6 rounded-3xl liquid-glass border border-white/10">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-neon-cyan" />
              <span>Add New Academic Department</span>
            </h4>
            <form onSubmit={handleAddDepartment} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Mechanical Engineering (ME) or Robotics & AI (RAI)"
                className="flex-1 px-4 py-3 rounded-2xl liquid-glass-subtle border border-white/20 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-neon-cyan font-mono"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-neon-cyan to-blue-600 hover:opacity-95 text-white font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-neon-cyan"
              >
                <PlusCircle className="w-4 h-4" /> Add Department
              </button>
            </form>
          </div>

          {/* Existing Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept) => {
              const count = tests.filter((t) => t.department === dept).length;
              const isEditing = editingDeptName === dept;

              return (
                <div
                  key={dept}
                  className="p-5 rounded-3xl liquid-glass border border-white/10 hover:border-white/25 transition flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-3 rounded-2xl bg-white/[0.04] text-neon-cyan border border-white/10">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/[0.06] text-slate-300 border border-white/10">
                      {count} Tests Assigned
                    </span>
                  </div>

                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={deptEditValue}
                          onChange={(e) => setDeptEditValue(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl liquid-glass-subtle border border-neon-cyan text-white text-xs font-mono"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateDepartment(dept)}
                            className="px-3 py-1 rounded-lg bg-neon-cyan text-void text-[11px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeptName(null)}
                            className="px-3 py-1 rounded-lg bg-white/10 text-slate-300 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h4 className="text-sm font-black text-white font-mono leading-snug">
                        {dept}
                      </h4>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDeptName(dept);
                        setDeptEditValue(dept);
                      }}
                      className="text-neon-cyan hover:underline flex items-center gap-1 font-bold"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDepartment(dept)}
                      className="text-neon-rose hover:underline flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 5: LIVE DATABASE & BACKEND INSPECTOR                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'database' && (
        <div className="space-y-7 animate-in fade-in duration-300">
          
          {/* Header System & Health Status Card */}
          <div className="p-7 sm:p-9 rounded-[2.5rem] liquid-glass border border-white/20 shadow-glass-specular relative overflow-hidden backdrop-blur-3xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-fuchsia/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-neon-cyan via-white/50 to-neon-fuchsia" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl liquid-pill bg-gradient-to-br from-neon-cyan/25 to-neon-fuchsia/25 border border-white/30 flex items-center justify-center shadow-liquid-glow-cyan">
                    <Database className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Backend & Database Inspector
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-neon-emerald/20 text-neon-mint border border-neon-emerald/40 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-neon-emerald">
                        <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
                        127.0.0.1:8000 ONLINE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Inspect live persistent storage, 25 curriculum tests, 500 verified MCQs, 50 coding problems, registered candidates, and exam audit reports.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchDatabaseOverview}
                  disabled={dbSyncing}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-neon-cyan to-neon-teal hover:opacity-95 text-void font-black text-xs transition flex items-center gap-2 font-mono shadow-neon-cyan active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${dbSyncing ? 'animate-spin' : ''}`} />
                  <span>{dbSyncing ? 'Synchronizing...' : 'Re-Sync Live DB'}</span>
                </button>
              </div>
            </div>

            {/* Architecture Metrics Grid */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-7 pt-6 border-t border-white/15">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Total Tests</div>
                <div className="text-2xl font-black text-white">{dbOverview?.total_tests || tests.length || 25}</div>
                <div className="text-[10px] font-mono text-neon-cyan font-bold mt-0.5">5 Per Dept (5 Depts)</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">MCQ Question Pool</div>
                <div className="text-2xl font-black text-neon-cyan">{dbOverview?.total_mcqs || (tests.length * 20) || 500}</div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">20 MCQs Per Test</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Coding Challenges</div>
                <div className="text-2xl font-black text-neon-fuchsia">{dbOverview?.total_coding_challenges || (tests.length * 2) || 50}</div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">2 Challenges Per Test</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Zam AI Viva Topics</div>
                <div className="text-2xl font-black text-neon-mint">{dbOverview?.total_viva_topics || (tests.length * 3) || 75}</div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">3 Topics Per Test</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Candidates Enrolled</div>
                <div className="text-2xl font-black text-neon-gold">{studentsList.length}</div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">name@123 Verified</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Audit Reports</div>
                <div className="text-2xl font-black text-neon-emerald">{dbReports.length}</div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">Session Records</div>
              </div>
            </div>

            {/* Backend File Persistence Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-neon-cyan" />
                <span>Storage: <b className="text-white">JSON-Persistent + In-Memory Fast Cache</b></span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300">📁 backend/tests_data.json</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300">📁 backend/students_data.json</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300">🔑 backend/.env (Gemini Key)</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Control Strip */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl liquid-glass border border-white/15 overflow-x-auto scrollbar-none">
            {[
              { id: 'tests', label: `25 Curriculum Tests & 500 MCQs (${tests.length})`, icon: Layers },
              { id: 'students', label: `Enrolled Candidate Roster & Passwords (${studentsList.length})`, icon: Users },
              { id: 'submissions', label: `Exam Submissions & Scores (${dbReports.length})`, icon: FileCheck },
              { id: 'files', label: 'Persistent Database JSON Files', icon: FileCode }
            ].map((st) => {
              const Icon = st.icon;
              const isActive = dbActiveSubTab === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setDbActiveSubTab(st.id)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-neon-cyan to-neon-fuchsia text-white shadow-liquid-glow-fuchsia font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUB-VIEW 1: CURRICULUM TESTS & QUESTION BLUEPRINTS */}
          {dbActiveSubTab === 'tests' && (
            <div className="space-y-5">
              
              {/* Department Selector & Search */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl liquid-glass border border-white/15">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
                  <button
                    onClick={() => setDbSelectedDept('ALL')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                      dbSelectedDept === 'ALL'
                        ? 'bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white shadow-liquid-glow-fuchsia'
                        : 'liquid-pill text-slate-300 hover:text-white'
                    }`}
                  >
                    All Departments ({tests.length})
                  </button>
                  {departments.map((dept) => {
                    const count = tests.filter((t) => t.department === dept).length;
                    return (
                      <button
                        key={dept}
                        onClick={() => setDbSelectedDept(dept)}
                        className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition ${
                          dbSelectedDept === dept
                            ? 'bg-gradient-to-r from-neon-cyan to-neon-teal text-void shadow-neon-cyan'
                            : 'liquid-pill text-slate-300 hover:text-white'
                        }`}
                      >
                        {dept.split('(')[0].trim()} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-neon-cyan absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={dbSearchQuery}
                    onChange={(e) => setDbSearchQuery(e.target.value)}
                    placeholder="Search test or question..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-neon-cyan font-mono"
                  />
                </div>
              </div>

              {/* Tests Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tests
                  .filter((t) => {
                    const matchesDept = dbSelectedDept === 'ALL' || t.department === dbSelectedDept;
                    const matchesSearch =
                      !dbSearchQuery.trim() ||
                      t.title.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                      t.description.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                      t.id.toLowerCase().includes(dbSearchQuery.toLowerCase());
                    return matchesDept && matchesSearch;
                  })
                  .map((test) => {
                    const mcqCount = test.questions?.length || 20;
                    const codingCount = test.coding_questions?.length || 2;
                    const vivaCount = test.interview_topics?.length || 3;

                    return (
                      <div
                        key={test.id}
                        className="rounded-2xl liquid-glass border border-white/15 p-5 flex flex-col justify-between hover:border-neon-cyan/50 transition-all duration-200 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-neon-cyan border border-neon-cyan/30">
                              {test.id}
                            </span>
                            <span className="text-[10px] font-mono text-neon-gold font-bold">
                              ⏱ {test.duration_minutes} mins
                            </span>
                          </div>

                          <h3 className="text-base font-black text-white group-hover:text-neon-cyan transition-colors line-clamp-1 mb-1">
                            {test.title}
                          </h3>
                          <div className="text-[11px] font-bold text-neon-mint font-mono mb-2">
                            {test.department}
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                            {test.description}
                          </p>

                          {/* Stage Metric Chips */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/10 text-center mb-4 text-[10px]">
                            <div className="p-1 rounded-lg bg-neon-cyan/10 text-neon-cyan font-bold">
                              {mcqCount} MCQs
                            </div>
                            <div className="p-1 rounded-lg bg-neon-fuchsia/10 text-neon-fuchsia font-bold">
                              {codingCount} Coding
                            </div>
                            <div className="p-1 rounded-lg bg-neon-emerald/10 text-neon-mint font-bold">
                              {vivaCount} Viva
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setDbInspectingTest(test)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan/20 to-neon-fuchsia/20 hover:from-neon-cyan/30 hover:to-neon-fuchsia/30 border border-white/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5 text-neon-cyan" />
                          <span>Inspect Full 20 MCQs & Coding</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: CANDIDATE REGISTRY & PASSWORDS */}
          {dbActiveSubTab === 'students' && (
            <div className="rounded-2xl liquid-glass border border-white/15 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-neon-cyan" />
                    Enrolled Candidate Roster & Auto-Enforced Passwords
                  </h3>
                  <p className="text-xs text-slate-300">
                    Stored in <code className="text-neon-cyan">backend/students_data.json</code>. Passwords strictly follow the formula <code className="text-neon-mint">spaceless full name + @123</code>.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('admission')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-teal text-void font-bold text-xs font-mono shadow-neon-cyan"
                >
                  + Enroll New Candidate
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-3 px-4">Candidate Name</th>
                      <th className="py-3 px-4">SKIT College Email</th>
                      <th className="py-3 px-4">Auto-Generated Password</th>
                      <th className="py-3 px-4">Assigned Department</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studentsList.map((st) => {
                      const spaceless = st.name.replace(/\s+/g, '').toLowerCase();
                      const passwordDisplay = st.password || `${spaceless}@123`;
                      const isCopied = copiedStudentId === st.email;

                      return (
                        <tr key={st.id || st.email} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-mint" />
                            {st.name}
                          </td>
                          <td className="py-3.5 px-4 text-neon-cyan">{st.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-neon-mint/10 border border-neon-mint/30 text-neon-mint font-bold">
                              {passwordDisplay}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{st.department}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${st.email} | ${passwordDisplay}`);
                                setCopiedStudentId(st.email);
                                setTimeout(() => setCopiedStudentId(null), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/15 transition inline-flex items-center gap-1.5 text-[11px]"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-neon-mint" />
                                  <span className="text-neon-mint">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Copy Credentials</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: EXAM SUBMISSIONS & SCORES */}
          {dbActiveSubTab === 'submissions' && (() => {
            const filteredReports = dbReports.filter((rep) => {
              const q = submissionSearch.toLowerCase().trim();
              const candidateName = (rep.candidate?.name || '').toLowerCase();
              const candidateEmail = (rep.candidate?.email || '').toLowerCase();
              const candidateId = (rep.candidate?.id || rep.session_id || '').toLowerCase();
              const testTitle = (rep.test_title || '').toLowerCase();

              const matchesSearch = !q || candidateName.includes(q) || candidateEmail.includes(q) || candidateId.includes(q) || testTitle.includes(q);

              const rawWarns = rep.integrity_metrics?.warnings_breakdown || {};
              const totalWarns = rep.integrity_metrics?.total_warnings !== undefined
                ? rep.integrity_metrics.total_warnings
                : (rawWarns.total !== undefined ? rawWarns.total : Object.values(rawWarns).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0));

              let matchesStatus = true;
              if (submissionFilterStatus === 'TERMINATED') {
                matchesStatus = totalWarns >= 5;
              } else if (submissionFilterStatus === 'FLAGGED') {
                matchesStatus = totalWarns >= 3 && totalWarns < 5;
              } else if (submissionFilterStatus === 'PASSED') {
                matchesStatus = totalWarns < 3;
              }

              return matchesSearch && matchesStatus;
            });

            return (
              <div className="rounded-2xl liquid-glass border border-white/15 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-neon-mint" />
                      Candidate Examination Submissions & Proctor Integrity Audit
                    </h3>
                    <p className="text-xs text-slate-300">
                      Real-time candidate records with honest scores across MCQ (20 pts), Coding Sandbox (30 pts), and Zam AI Viva (50 pts), plus proctor warning strikes.
                    </p>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={submissionSearch}
                        onChange={(e) => setSubmissionSearch(e.target.value)}
                        placeholder="Search candidate ID, email, name..."
                        className="pl-8 pr-3 py-1.5 rounded-xl liquid-glass-subtle border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan w-64"
                      />
                    </div>

                    <select
                      value={submissionFilterStatus}
                      onChange={(e) => setSubmissionFilterStatus(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono cursor-pointer"
                    >
                      <option value="ALL">All Verdicts</option>
                      <option value="TERMINATED">5 Strikes (Terminated)</option>
                      <option value="FLAGGED">Flagged for Review</option>
                      <option value="PASSED">Verified & Passed</option>
                    </select>

                    <button
                      onClick={fetchDatabaseOverview}
                      disabled={dbSyncing}
                      className="p-2 rounded-xl liquid-pill text-neon-cyan hover:text-white transition"
                      title="Refresh Submissions"
                    >
                      <RefreshCw className={`w-4 h-4 ${dbSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-60" />
                    <p className="font-bold text-slate-300">No exam submissions found matching current search criteria.</p>
                    <p className="mt-1">Candidate completed examinations will populate here automatically with composite scores and proctor logs.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="py-3 px-3">Candidate & ID</th>
                          <th className="py-3 px-3">Examination</th>
                          <th className="py-3 px-3">MCQ (20)</th>
                          <th className="py-3 px-3">Coding (30)</th>
                          <th className="py-3 px-3">Viva (50)</th>
                          <th className="py-3 px-3">Total Score</th>
                          <th className="py-3 px-3">Warnings & Strikes</th>
                          <th className="py-3 px-3">Trust Verdict</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredReports.map((rep, idx) => {
                          const rawWarns = rep.integrity_metrics?.warnings_breakdown || {};
                          const totalWarns = rep.integrity_metrics?.total_warnings !== undefined
                            ? rep.integrity_metrics.total_warnings
                            : (rawWarns.total !== undefined ? rawWarns.total : Object.values(rawWarns).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0));
                          const isTerminated = totalWarns >= 5;

                          const mcq = rep.evaluation?.mcq_score ?? (typeof rep.mcq_score === 'number' ? rep.mcq_score : 0);
                          const coding = rep.evaluation?.coding_score ?? (typeof rep.coding_score === 'number' ? rep.coding_score : 0);
                          const viva = rep.evaluation?.interview_score ?? (typeof rep.interview_score === 'number' ? rep.interview_score : 0);
                          const total = rep.evaluation?.total_score ?? (typeof rep.overall_score === 'number' ? rep.overall_score : (mcq + coding + viva));
                          const cId = rep.candidate?.id || rep.session_id;

                          return (
                            <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{rep.candidate?.name || 'Candidate'}</span>
                                </div>
                                <div className="text-[10px] text-neon-cyan truncate">{rep.candidate?.email}</div>
                                <div className="text-[9px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                  <span className="bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10 text-slate-300">
                                    ID: <b className="text-white">{cId}</b>
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-slate-300">
                                <div className="line-clamp-1 font-bold text-white">{rep.test_title}</div>
                                <div className="text-[10px] text-slate-400">{rep.date_display || 'Recent Session'}</div>
                              </td>
                              <td className="py-3.5 px-3 text-neon-cyan font-bold">
                                {Number(mcq).toFixed(1)} / 20
                              </td>
                              <td className="py-3.5 px-3 text-neon-fuchsia font-bold">
                                {Number(coding).toFixed(1)} / 30
                              </td>
                              <td className="py-3.5 px-3 text-neon-mint font-bold">
                                {Number(viva).toFixed(1)} / 50
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="px-2.5 py-1 rounded-md bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan font-black text-sm">
                                  {Number(total).toFixed(1)} / 100
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                  isTerminated
                                    ? 'bg-neon-rose/25 border-neon-rose text-rose-200 shadow-neon-rose animate-pulse'
                                    : totalWarns >= 3
                                    ? 'bg-neon-amber/25 border-neon-amber text-amber-200'
                                    : 'bg-neon-emerald/20 border-neon-emerald/40 text-neon-mint'
                                }`}>
                                  {isTerminated ? `⚠️ ${totalWarns}/5 STRIKES (TERMINATED)` : `${totalWarns} Warnings Logged`}
                                </span>
                                <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-2">
                                  <span title="Tab switches">🖥️ {rawWarns.tab_switch || 0}</span>
                                  <span title="Head turns">👤 {rawWarns.looking_away || 0}</span>
                                  <span title="Mobile phone">📱 {rawWarns.mobile_phone || 0}</span>
                                  <span title="Voice flags">🎙️ {rawWarns.voice || 0}</span>
                                  <span title="Fullscreen exit">⛶ {rawWarns.fullscreen_exit || 0}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border block text-center ${
                                  isTerminated || (rep.integrity_metrics?.final_trust_score || 100) < 60
                                    ? 'bg-neon-rose/20 border-neon-rose/40 text-rose-200'
                                    : 'bg-neon-emerald/20 border-neon-emerald/40 text-neon-mint'
                                }`}>
                                  {rep.integrity_metrics?.final_trust_score || 100}% Trust
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => setSelectedAuditReport(rep)}
                                  className="px-3 py-1.5 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/35 border border-neon-cyan/40 text-neon-cyan font-bold text-xs flex items-center gap-1.5 ml-auto transition shadow-neon-cyan cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Review Result</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUB-VIEW 4: RAW JSON DATABASE STORAGE */}
          {dbActiveSubTab === 'files' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* File 1: tests_data.json */}
                <div className="p-5 rounded-2xl liquid-glass border border-white/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-neon-cyan" />
                      <span className="font-bold text-white text-xs font-mono">backend/tests_data.json</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-neon-cyan">
                      {tests.length} Comprehensive Tests
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 text-[11px] font-mono max-h-96 overflow-y-auto custom-scrollbar">
                    {JSON.stringify(tests.slice(0, 2), null, 2)}
                  </pre>
                  <p className="text-[10px] font-mono text-slate-400">
                    Showing preview of 2 tests with full 20 MCQs, coding challenges, and viva topics.
                  </p>
                </div>

                {/* File 2: students_data.json */}
                <div className="p-5 rounded-2xl liquid-glass border border-white/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-neon-mint" />
                      <span className="font-bold text-white text-xs font-mono">backend/students_data.json</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-neon-mint">
                      {studentsList.length} Registered Candidates
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 text-[11px] font-mono max-h-96 overflow-y-auto custom-scrollbar">
                    {JSON.stringify(studentsList, null, 2)}
                  </pre>
                  <p className="text-[10px] font-mono text-slate-400">
                    Complete candidate roster with enforced credentials format.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: Full 20 MCQs & Coding Challenges Inspector */}
      {dbInspectingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl liquid-glass border border-white/20 p-7 shadow-glass-specular flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan font-bold border border-neon-cyan/30">
                    {dbInspectingTest.department}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">ID: {dbInspectingTest.id}</span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">{dbInspectingTest.title}</h3>
              </div>
              <button
                onClick={() => setDbInspectingTest(null)}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto space-y-6 pr-2 custom-scrollbar text-xs">
              
              {/* STAGE 1: 20 MCQS POOL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-sm font-black text-neon-cyan flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Stage 1: Complete 20 MCQs Pool ({dbInspectingTest.questions?.length || 20} Questions)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Weight: 20 Marks</span>
                </div>

                <div className="space-y-3">
                  {(dbInspectingTest.questions || []).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-white leading-relaxed">
                          <span className="text-neon-cyan font-mono mr-1.5">Q{idx + 1}.</span>
                          {q.question}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 whitespace-nowrap">
                          {q.marks || 1} mark
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {q.options?.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.answerIndex;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-neon-emerald/20 border-neon-emerald/50 text-neon-mint font-bold shadow-neon-emerald'
                                  : 'bg-white/[0.02] border-white/10 text-slate-300'
                              }`}
                            >
                              <span>
                                <b className="mr-1.5 opacity-60">[{String.fromCharCode(65 + oIdx)}]</b> {opt}
                              </span>
                              {isCorrect && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-emerald text-void font-black">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 2: 2 CODING CHALLENGES */}
              <div className="space-y-3 pt-4 border-t border-white/15">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-sm font-black text-neon-fuchsia flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Stage 2: Department Coding Challenges ({dbInspectingTest.coding_questions?.length || 2} Problems)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Weight: 30 Marks</span>
                </div>

                <div className="space-y-4">
                  {(dbInspectingTest.coding_questions || []).map((cp, idx) => (
                    <div key={cp.id || idx} className="p-4 rounded-2xl bg-neon-fuchsia/5 border border-neon-fuchsia/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-white text-sm">
                          <span className="text-neon-fuchsia font-mono mr-1.5">Problem {idx + 1}:</span>
                          {cp.title}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neon-fuchsia/20 text-neon-fuchsia font-bold">
                          {cp.difficulty || 'Medium'}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{cp.description}</p>
                      
                      {/* Starter Code snippet */}
                      {cp.starter_templates && (
                        <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3">
                          <div className="text-[10px] font-mono text-slate-400 mb-1">Starter Template (Python):</div>
                          <pre className="text-neon-cyan font-mono text-[11px] overflow-x-auto">
                            {cp.starter_templates.python}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 3: ZAM AI VIVA TOPICS */}
              <div className="space-y-3 pt-4 border-t border-white/15">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-sm font-black text-neon-mint flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Stage 3: Zam AI Voice Viva Topics ({dbInspectingTest.interview_topics?.length || 3} Topics)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Weight: 50 Marks</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(dbInspectingTest.interview_topics || []).map((vt, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-neon-emerald/5 border border-neon-emerald/20">
                      <div className="text-[10px] font-mono text-neon-mint font-bold mb-1">Topic {idx + 1}</div>
                      <div className="text-slate-200 font-medium">{vt}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/15 flex items-center justify-end mt-4">
              <button
                onClick={() => setDbInspectingTest(null)}
                className="px-6 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl liquid-glass border border-white/20 p-7 shadow-glass-specular">
            <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-neon-fuchsia" />
                {editingTestId ? 'Edit Curriculum Examination' : 'Create New Department Examination'}
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTest} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Curriculum Title</label>
                <input
                  type="text"
                  required
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="e.g. Distributed Database Architecture Assessment"
                  className="w-full px-4 py-2.5 rounded-2xl liquid-glass-subtle border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-fuchsia"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target Department</label>
                  <select
                    value={testDept}
                    onChange={(e) => setTestDept(e.target.value)}
                    style={{
                      backgroundColor: '#0a0f1d',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)'
                    }}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-white/15 text-white font-bold focus:outline-none focus:border-neon-fuchsia cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d} style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Exam Format</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    style={{
                      backgroundColor: '#0a0f1d',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)'
                    }}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-white/15 text-white font-bold focus:outline-none focus:border-neon-fuchsia cursor-pointer font-mono"
                  >
                    <option value="mcq" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>MCQ Assessment</option>
                    <option value="coding" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>Coding Studio Test</option>
                    <option value="interview" style={{ backgroundColor: '#0a0f1d', color: '#ffffff' }}>AI Viva / Interview</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={testDuration}
                  onChange={(e) => setTestDuration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl liquid-glass-subtle border border-white/15 text-white font-mono focus:outline-none focus:border-neon-fuchsia"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Curriculum Description</label>
                <textarea
                  rows={3}
                  required
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Summarize the core topics and expectations..."
                  className="w-full p-4 rounded-2xl liquid-glass-subtle border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-fuchsia custom-scrollbar"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2.5 rounded-2xl liquid-pill text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-white font-bold text-xs shadow-neon-fuchsia"
                >
                  Save Curriculum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CANDIDATE AUDIT REPORT & FULL WARNINGS INSPECTOR        */}
      {/* ------------------------------------------------------------- */}
      {selectedAuditReport && (() => {
        const rep = selectedAuditReport;
        const rawWarns = rep.integrity_metrics?.warnings_breakdown || {};
        const totalWarns = rep.integrity_metrics?.total_warnings !== undefined
          ? rep.integrity_metrics.total_warnings
          : (rawWarns.total !== undefined ? rawWarns.total : Object.values(rawWarns).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0));
        const isTerminated = totalWarns >= 5;
        const trustScore = rep.integrity_metrics?.final_trust_score !== undefined
          ? rep.integrity_metrics.final_trust_score
          : (isTerminated ? 25 : 100);

        const mcqScore = rep.evaluation?.mcq_score ?? (typeof rep.mcq_score === 'number' ? rep.mcq_score : 0);
        const codingScore = rep.evaluation?.coding_score ?? (typeof rep.coding_score === 'number' ? rep.coding_score : 0);
        const vivaScore = rep.evaluation?.interview_score ?? (typeof rep.interview_score === 'number' ? rep.interview_score : 0);
        const totalScore = rep.evaluation?.total_score ?? (typeof rep.overall_score === 'number' ? rep.overall_score : (mcqScore + codingScore + vivaScore));

        const codingAnswers = rep.technical_answers?.coding || {};
        const vivaTranscript = rep.interview_transcript || [];
        const incidents = rep.integrity_metrics?.logged_incidents || [];
        const candidateId = rep.candidate?.id || rep.session_id;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-void/85 backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl liquid-glass border border-white/20 shadow-glass-specular p-6 sm:p-8 flex flex-col overflow-hidden text-slate-100">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan shadow-neon-cyan">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>Proctor Integrity & Candidate Exam Audit</span>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                        isTerminated
                          ? 'bg-neon-rose/25 text-rose-200 border-neon-rose'
                          : 'bg-neon-emerald/20 text-neon-mint border-neon-emerald/40'
                      }`}>
                        {isTerminated ? 'TERMINATED AT 5 STRIKES' : 'COMPLETED SESSION'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Session Ref: <span className="text-neon-cyan">{rep.session_id}</span> • {rep.date_display || 'Recent Exam'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-mono font-bold flex items-center gap-1.5 border border-white/10 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-neon-cyan" />
                    <span className="hidden sm:inline">Print Certificate</span>
                  </button>
                  <button
                    onClick={() => setSelectedAuditReport(null)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Audit Body */}
              <div className="overflow-y-auto space-y-6 py-5 pr-2 custom-scrollbar text-xs">
                
                {/* Candidate Credentials Card */}
                <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Candidate Name</span>
                    <div className="font-bold text-white text-sm mt-0.5">{rep.candidate?.name || 'Candidate'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Candidate ID</span>
                    <div className="font-bold text-neon-cyan text-xs mt-0.5 flex items-center gap-1">
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded border border-white/10">{candidateId}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(candidateId);
                          setCopiedStudentId(candidateId);
                          setTimeout(() => setCopiedStudentId(null), 2000);
                        }}
                        className="p-1 hover:text-white"
                        title="Copy Candidate ID"
                      >
                        {copiedStudentId === candidateId ? <Check className="w-3 h-3 text-neon-mint" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">SKIT College Email</span>
                    <div className="font-bold text-slate-200 text-xs mt-0.5 truncate">{rep.candidate?.email}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Department</span>
                    <div className="font-bold text-neon-gold text-xs mt-0.5 truncate">{rep.candidate?.department || rep.department}</div>
                  </div>
                </div>

                {/* 4 KPI Honest Academic Score Cards */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Honest Academic Evaluation Scores (100 Marks Total)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-cyan/30 text-center">
                      <span className="text-[10px] font-mono font-bold text-neon-cyan uppercase">Stage 1: MCQ</span>
                      <div className="text-xl font-black font-mono text-white mt-1">
                        {Number(mcqScore).toFixed(1)} / 20
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{rep.mcq_score || 'Score recorded'}</span>
                    </div>

                    <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-fuchsia/30 text-center">
                      <span className="text-[10px] font-mono font-bold text-neon-fuchsia uppercase">Stage 2: Coding</span>
                      <div className="text-xl font-black font-mono text-white mt-1">
                        {Number(codingScore).toFixed(1)} / 30
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{rep.coding_score || 'Score recorded'}</span>
                    </div>

                    <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-mint/30 text-center">
                      <span className="text-[10px] font-mono font-bold text-neon-mint uppercase">Stage 3: Zam AI Viva</span>
                      <div className="text-xl font-black font-mono text-white mt-1">
                        {Number(vivaScore).toFixed(1)} / 50
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{rep.interview_score || 'Score recorded'}</span>
                    </div>

                    <div className="p-4 rounded-2xl liquid-glass-subtle border border-neon-emerald/40 text-center bg-neon-emerald/10 shadow-neon-emerald">
                      <span className="text-[10px] font-mono font-bold text-neon-mint uppercase">Composite Score</span>
                      <div className="text-2xl font-black font-mono text-neon-mint mt-1">
                        {Number(totalScore).toFixed(1)} / 100
                      </div>
                      <span className="text-[10px] text-slate-300 font-mono mt-0.5 block">{rep.grade || 'Official Academic Mark'}</span>
                    </div>
                  </div>
                </div>

                {/* AI Score Justification & Marks Rationale */}
                {(rep.score_justification || rep.ai_evaluation?.overall_score_justification) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-neon-cyan/15 via-blue-900/20 to-neon-fuchsia/15 border border-neon-cyan/40">
                    <span className="text-[10px] font-mono font-bold text-neon-cyan uppercase tracking-wider block mb-1">
                      🎯 AI Academic Marks Justification & Rationale
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-mono">
                      {rep.score_justification || rep.ai_evaluation?.overall_score_justification}
                    </p>
                  </div>
                )}

                {/* Section-by-Section Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neon-emerald/10 border border-neon-emerald/30">
                    <div className="flex items-center gap-2 mb-2 text-neon-mint font-bold uppercase text-[11px]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Candidate Strengths & Key Competencies</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200 text-[11px] leading-relaxed">
                      {(rep.strengths || ['Demonstrated foundational concept comprehension.']).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-neon-amber/10 border border-neon-amber/30">
                    <div className="flex items-center gap-2 mb-2 text-neon-gold font-bold uppercase text-[11px]">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Identified Conceptual & Coding Weaknesses</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200 text-[11px] leading-relaxed">
                      {(rep.areas_of_improvement || ['Address edge-case handling in asynchronous code.']).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Proctor Security Warnings & Infractions Detailed Breakdown */}
                <div className={`p-5 rounded-2xl border font-mono ${
                  isTerminated
                    ? 'bg-neon-rose/15 border-neon-rose/50 text-rose-100 shadow-neon-rose'
                    : totalWarns >= 3
                    ? 'bg-neon-amber/15 border-neon-amber/50 text-amber-100'
                    : 'bg-white/[0.03] border-white/15 text-slate-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className={`w-6 h-6 ${isTerminated ? 'text-neon-rose' : 'text-neon-cyan'}`} />
                      <div>
                        <div className="font-bold text-sm uppercase text-white tracking-wider">
                          Proctor Integrity Index: <span className="font-black text-neon-cyan">{trustScore}%</span>
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          Verdict: <b className={isTerminated ? 'text-neon-rose' : 'text-neon-mint'}>{rep.integrity_metrics?.integrity_verdict || 'VERIFIED'}</b>
                        </div>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-black border self-start sm:self-auto ${
                      isTerminated
                        ? 'bg-neon-rose text-white border-neon-rose animate-pulse'
                        : 'bg-white/[0.08] text-slate-200 border-white/20'
                    }`}>
                      {totalWarns} of 5 Security Strikes Logged
                    </span>
                  </div>

                  {isTerminated && (
                    <div className="mt-3 p-3 rounded-xl bg-neon-rose/30 border border-neon-rose text-white text-xs font-bold leading-relaxed">
                      ⚠️ EXAMINATION TERMINATED: Candidate reached the maximum security threshold of 5 strikes. The exam session was locked and auto-submitted with penalized trust index.
                    </div>
                  )}

                  {/* Categorized Warnings Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-4">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">🖥️ Tab Switch</div>
                      <div className="text-lg font-black text-neon-cyan mt-1">{rawWarns.tab_switch || 0}</div>
                      <span className="text-[9px] text-slate-500">Alt+Tab</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">👤 Turn Away</div>
                      <div className="text-lg font-black text-neon-amber mt-1">{rawWarns.looking_away || 0}</div>
                      <span className="text-[9px] text-slate-500">Yaw/Pitch</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">📱 Mobile Phone</div>
                      <div className="text-lg font-black text-neon-rose mt-1">{rawWarns.mobile_phone || 0}</div>
                      <span className="text-[9px] text-slate-500">Device flags</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">🎙️ Voice Flags</div>
                      <div className="text-lg font-black text-neon-fuchsia mt-1">{rawWarns.voice || 0}</div>
                      <span className="text-[9px] text-slate-500">Acoustic</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">⛶ Fullscreen</div>
                      <div className="text-lg font-black text-neon-gold mt-1">{rawWarns.fullscreen_exit || 0}</div>
                      <span className="text-[9px] text-slate-500">Exit strikes</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">🪟 Backlight</div>
                      <div className="text-lg font-black text-neon-amber mt-1">{rawWarns.window_backlight || 0}</div>
                      <span className="text-[9px] text-slate-500">Window shadow</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">↕️ Nodding</div>
                      <div className="text-lg font-black text-neon-mint mt-1">{rawWarns.head_nodding || 0}</div>
                      <span className="text-[9px] text-slate-500">Pitch tilt</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">👤 Half Face</div>
                      <div className="text-lg font-black text-neon-cyan mt-1">{rawWarns.partial_face || 0}</div>
                      <span className="text-[9px] text-slate-500">Clipped/Edge</span>
                    </div>
                  </div>
                </div>

                {/* Timestamped Proctor Security Incidents Log */}
                {incidents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-neon-cyan" />
                      Detailed Incident Audit Feed ({incidents.length} Events Logged)
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {incidents.map((inc, iIdx) => (
                        <div key={iIdx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-[11px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">[{new Date((inc.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString()}]</span>
                            <span className="text-white font-bold">{inc.type || 'INFRACTION'}</span>
                            <span className="text-slate-300">- {inc.message || inc.detail}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            inc.severity === 'CRITICAL' ? 'bg-neon-rose/20 text-neon-rose border border-neon-rose/30' : 'bg-neon-amber/20 text-neon-gold border border-neon-amber/30'
                          }`}>
                            {inc.severity || 'WARNING'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Candidate Submitted Coding Solutions */}
                {Object.keys(codingAnswers).length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <h4 className="text-xs font-mono font-black text-neon-fuchsia uppercase tracking-wider flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      Candidate Submitted Code (Stage 2)
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(codingAnswers).map(([probIdx, sol], sIdx) => {
                        const codeText = typeof sol === 'object' && sol.code ? sol.code : (typeof sol === 'string' ? sol : JSON.stringify(sol));
                        const lang = typeof sol === 'object' && sol.language ? sol.language : 'python';
                        return (
                          <div key={sIdx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-white">Problem #{Number(probIdx) + 1} Solution</span>
                              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-neon-cyan uppercase">{lang}</span>
                            </div>
                            <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-slate-200 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar">
                              {codeText}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Zam AI Live Viva Transcript */}
                {vivaTranscript.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <h4 className="text-xs font-mono font-black text-neon-mint uppercase tracking-wider flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Zam AI Viva Voice Transcript & Evaluation (Stage 3)
                    </h4>
                    <div className="space-y-3">
                      {vivaTranscript.map((turn, tIdx) => (
                        <div key={tIdx} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono">
                          <div className="text-neon-cyan font-bold">
                            Question #{turn.turn || tIdx + 1}: <span className="text-white">{turn.question}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-slate-200">
                            <span className="text-slate-400 font-bold block mb-1">Candidate Answer:</span>
                            {turn.answer || 'No verbal response recorded.'}
                          </div>
                          {turn.evaluation && (
                            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-300">
                              <span>Rating: <b className="text-neon-mint">{turn.evaluation.score || 85} / 100</b></span>
                              <span className="text-slate-400 truncate max-w-md">{turn.evaluation.feedback}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Candidate ID: <b className="text-white">{candidateId}</b>
                </span>
                <button
                  onClick={() => setSelectedAuditReport(null)}
                  className="px-6 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs font-mono transition"
                >
                  Close Inspection
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
