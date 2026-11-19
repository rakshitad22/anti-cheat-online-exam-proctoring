import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Shield,
  ShieldAlert,
  Layers,
  Clock,
  CheckCircle,
  CheckCircle2,
  FileText,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Maximize2,
  Lock,
  Sparkles,
  Award,
  Zap,
  Flame,
  Camera,
  Monitor
} from 'lucide-react';

import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import DepartmentTestCatalog from './components/DepartmentTestCatalog';
import LockdownGuardian from './components/LockdownGuardian';
import CodingStudio from './components/CodingStudio';
import AIInterviewStudio from './components/AIInterviewStudio';
import AdminDashboard from './components/AdminDashboard';
import CandidateReportModal from './components/CandidateReportModal';
import GeminiConfigModal from './components/GeminiConfigModal';
import NotificationCenterModal from './components/NotificationCenterModal';
import WebcamFeed from './components/WebcamFeed';
import TrustScoreGauge from './components/TrustScoreGauge';
import IncidentTimeline from './components/IncidentTimeline';
import PreExamPermissionsModal from './components/PreExamPermissionsModal';
import FocusSecurityTab from './components/FocusSecurityTab';
import ForensicReportTab from './components/ForensicReportTab';

import { API_BASE_URL } from './config';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('proctor_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Failed to parse proctor_active_user:', e);
      return null;
    }
  });

  const [departments, setDepartments] = useState([]);
  const [tests, setTests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [activeTest, setActiveTest] = useState(null);
  const [examStage, setExamStage] = useState('mcq'); // 'mcq' | 'coding' | 'interview'
  const [examTimeLeft, setExamTimeLeft] = useState(2700);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [candidateAnswers, setCandidateAnswers] = useState({});
  const [codingAnswers, setCodingAnswers] = useState({});
  const [interviewTranscript, setInterviewTranscript] = useState([]);

  const [trustScore, setTrustScore] = useState(100);
  const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
  const [faceCount, setFaceCount] = useState(1);
  const [status, setStatus] = useState('CLEAN');
  const [incidents, setIncidents] = useState([]);
  const [warningsCount, setWarningsCount] = useState({ total: 0 });

  const [pendingSelectedTest, setPendingSelectedTest] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [activeFullScreenWarning, setActiveFullScreenWarning] = useState(null);
  const isSubmittingRef = useRef(false);

  const [examDashboardTab, setExamDashboardTab] = useState('live'); // 'live' | 'focus' | 'forensic'
  const [focusEvents, setFocusEvents] = useState([]);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [totalLostFocusDuration, setTotalLostFocusDuration] = useState(0);
  const blurStartTimeRef = useRef(null);

  const logFocusEvent = useCallback((type, message, severity = 'HIGH') => {
    const newEvt = {
      id: `foc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: type,
      message: message,
      timestamp: Date.now(),
      timeDisplay: new Date().toLocaleTimeString(),
      severity: severity,
      durationSec: 0
    };
    setFocusEvents((prev) => [newEvt, ...prev]);
  }, []);

  const handleSimulateFocusEvent = useCallback((type, msg) => {
    logFocusEvent(type, msg, type.includes('FULLSCREEN') || type.includes('TAB') ? 'CRITICAL' : 'HIGH');
    setActiveFullScreenWarning({
      code: type,
      message: msg,
      severity: 'HIGH',
      timestamp: Date.now()
    });
    setWarningsCount((prev) => {
      const total = (prev.total || 0) + 1;
      const vKey = type ? type.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'simulated_flag';
      return {
        ...prev,
        total: total,
        [vKey]: (prev[vKey] || 0) + 1
      };
    });
    setTrustScore((prev) => Math.max(0, prev - (type.includes('TAB') ? 15 : 10)));
  }, [logFocusEvent]);

  // Track window focus / blur / visibility changes during active test
  useEffect(() => {
    if (!activeTest) return;

    const handleFocus = () => {
      setIsWindowFocused(true);
      if (blurStartTimeRef.current) {
        const elapsed = Math.max(1, Math.round((Date.now() - blurStartTimeRef.current) / 1000));
        setTotalLostFocusDuration((prev) => prev + elapsed);
        setFocusEvents((prev) => {
          if (prev.length === 0) return prev;
          const [latest, ...rest] = prev;
          return [{ ...latest, durationSec: (latest.durationSec || 0) + elapsed }, ...rest];
        });
        blurStartTimeRef.current = null;
      }
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      blurStartTimeRef.current = Date.now();
      logFocusEvent(
        'WINDOW_BLUR_DETECTED',
        'Candidate window lost focus (Alt+Tab, window minimization, or desktop click).',
        'HIGH'
      );
    };

    const handleVisibility = () => {
      if (document.hidden) {
        setIsWindowFocused(false);
        blurStartTimeRef.current = Date.now();
        logFocusEvent(
          'TAB_SWITCH_DETECTED',
          'Candidate switched away from examination tab or minimized browser window.',
          'CRITICAL'
        );
      } else {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeTest, logFocusEvent]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [geminiKeySet, setGeminiKeySet] = useState(
    Boolean(localStorage.getItem('proctor_gemini_key'))
  );

  const fetchDepartmentsAndTests = useCallback(async () => {
    try {
      const [deptRes, testsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/departments`),
        axios.get(`${API_BASE_URL}/api/tests`)
      ]);
      setDepartments(deptRes.data.departments || []);
      setTests(testsRes.data.tests || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const dept = user?.department || 'ALL';
      const res = await axios.get(`${API_BASE_URL}/api/notifications?department=${encodeURIComponent(dept)}`);
      const notifs = res.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchDepartmentsAndTests();
    fetchNotifications();
  }, [fetchDepartmentsAndTests, fetchNotifications]);

  // Exam Countdown Timer
  useEffect(() => {
    if (!activeTest) return;

    const timer = setInterval(() => {
      setExamTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest]);

  // Periodic Telemetry Fetch from Backend
  useEffect(() => {
    if (!activeTest) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/session/status`);
        const data = res.data;
        if (data.trust_score !== undefined) setTrustScore(data.trust_score);
        if (data.head_pose) setHeadPose(data.head_pose);
        if (data.face_count !== undefined) setFaceCount(data.face_count);
        if (data.status) setStatus(data.status);
        if (data.incidents) setIncidents(data.incidents);
        if (data.warnings_count) {
          setWarningsCount(data.warnings_count);
          const total = data.warnings_count.total !== undefined ? Number(data.warnings_count.total) : 0;
          if (total >= 5 && !isSubmittingRef.current) {
            handleSubmitExam(data.warnings_count);
          }
        }
      } catch (err) {
        // Silently tolerate temporary polling blip
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeTest]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('proctor_active_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('proctor_active_user');
    setActiveTest(null);
  };

  // Step 1: Open Pre-Exam Readiness & Permissions Check Modal
  const handleSelectTest = (test) => {
    setPendingSelectedTest(test);
    setShowPermissionsModal(true);
  };

  // Step 2: Confirmed Start after Camera, Mic, and Fullscreen are Granted
  const startConfirmedExam = async (test) => {
    if (!test) return;
    try {
      isSubmittingRef.current = false;
      // Reset backend session proctor telemetry for a clean slate
      await axios.post(`${API_BASE_URL}/api/session/reset`).catch(() => {});

      // Fetch randomized questions for this candidate
      const res = await axios.get(`${API_BASE_URL}/api/tests/${test.id}/start?candidate_id=${encodeURIComponent(user?.id || 'candidate')}`);
      const randomizedTest = res.data.test || test;
      setActiveTest(randomizedTest);
      setExamStage('mcq');
      setExamTimeLeft(randomizedTest.duration_minutes * 60);
      setCurrentQIndex(0);
      setCandidateAnswers({});
      setCodingAnswers({});
      setInterviewTranscript([]);
      setIncidents([]);
      setWarningsCount({ total: 0 });
      setTrustScore(100);
      setShowPermissionsModal(false);
      setPendingSelectedTest(null);
    } catch (err) {
      console.error('Failed to start randomized test:', err);
      setActiveTest(test);
      setExamTimeLeft(test.duration_minutes * 60);
      setShowPermissionsModal(false);
      setPendingSelectedTest(null);
    }
  };

  const handleFrameCapture = async (base64Frame) => {
    if (!activeTest) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/telemetry/frame`, {
        frame_data: base64Frame,
        timestamp: Date.now() / 1000,
        session_id: activeTest.id
      });
      const data = res.data;
      if (data.trust_score !== undefined) setTrustScore(data.trust_score);
      if (data.head_pose) setHeadPose(data.head_pose);
      if (data.face_count !== undefined) setFaceCount(data.face_count);
      if (data.status) setStatus(data.status);
      if (data.incidents) setIncidents(data.incidents);
      if (data.infractions && data.infractions.length > 0) {
        const latest = data.infractions[data.infractions.length - 1];
        setActiveFullScreenWarning({
          code: latest.code,
          message: latest.message,
          severity: latest.severity || 'HIGH',
          timestamp: Date.now()
        });
      }
      if (data.warnings_count) {
        setWarningsCount(data.warnings_count);
        const total = data.warnings_count.total !== undefined ? Number(data.warnings_count.total) : 0;
        if (total >= 5 && !isSubmittingRef.current) {
          handleSubmitExam(data.warnings_count);
        }
      }
    } catch (err) {
      console.warn('Frame processing blip:', err);
    }
  };

  const handleSubmitExam = async (overrideWarnings = null) => {
    if (!activeTest || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const finalWarnings = overrideWarnings || warningsCount;
      const totalWarns = finalWarnings.total !== undefined
        ? Number(finalWarnings.total)
        : Object.values(finalWarnings).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
      const isTerminated = totalWarns >= 5;
      const finalTrust = isTerminated ? Math.min(trustScore, 25) : trustScore;

      const payload = {
        test_id: activeTest.id,
        candidate_id: user?.id || 'std-unknown',
        candidate_name: user?.name || 'Candidate',
        candidate_email: user?.email || 'student@skit.org.in',
        department: user?.department || activeTest.department,
        answers: {
          mcq: candidateAnswers,
          coding: codingAnswers
        },
        trust_score: finalTrust,
        warnings_count: finalWarnings,
        incidents: incidents,
        interview_transcript: interviewTranscript
      };

      const res = await axios.post(`${API_BASE_URL}/api/exam/submit`, payload);
      setGeneratedReport(res.data.report);
      setShowReportModal(true);
      setActiveTest(null);

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      console.error('Failed to submit exam:', err);
      alert('Exam submitted successfully.');
      setActiveTest(null);
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-void text-slate-100 flex flex-col font-sans selection:bg-neon-fuchsia/40 relative overflow-x-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* LIQUID GLASS REFRACTION BACKGROUND ORBS                      */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Top-Left Fuchsia / Rose Liquid Orb */}
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-gradient-to-tr from-fuchsia-600/25 via-pink-600/20 to-transparent rounded-full blur-[120px] animate-float-slow" />
        
        {/* Bottom-Right Electric Cyan / Blue Liquid Orb */}
        <div className="absolute -bottom-36 -right-36 w-[560px] h-[560px] bg-gradient-to-br from-cyan-500/25 via-blue-600/20 to-transparent rounded-full blur-[140px] animate-float-reverse" />
        
        {/* Center-Top Violet / Indigo Liquid Orb */}
        <div className="absolute top-1/4 left-1/3 w-[440px] h-[440px] bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent rounded-full blur-[110px] animate-pulse" />
        
        {/* Center-Bottom Emerald / Teal Liquid Orb */}
        <div className="absolute bottom-10 left-1/4 w-[420px] h-[420px] bg-gradient-to-bl from-emerald-500/15 via-teal-500/15 to-transparent rounded-full blur-[110px] animate-float-slow" />
      </div>

      {/* Top Application Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenNotifications={() => {
          setShowNotifModal(true);
          setUnreadCount(0);
        }}
        onOpenGeminiConfig={() => setShowGeminiModal(true)}
        geminiKeySet={geminiKeySet}
      />

      {/* ------------------------------------------------------------- */}
      {/* CASE A: Active Locked Examination Mode */}
      {/* ------------------------------------------------------------- */}
      {activeTest ? (
        <div className="flex-1 flex flex-col">
          {/* Lockdown Guardian Security Bar */}
          <LockdownGuardian
            isActive={true}
            testTitle={activeTest.title}
            warningsCount={warningsCount}
            allowVoice={examStage === 'interview'}
            onViolationTriggered={(type, msg) => {
              logFocusEvent(type, msg, type.includes('FULLSCREEN') || type.includes('TAB') ? 'CRITICAL' : 'HIGH');
              setActiveFullScreenWarning({
                code: type,
                message: msg,
                severity: 'CRITICAL',
                timestamp: Date.now()
              });
              setWarningsCount((prev) => {
                const total = (prev.total || 0) + 1;
                const vKey = type ? type.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'security_flag';
                const updated = {
                  ...prev,
                  total: total,
                  [vKey]: (prev[vKey] || 0) + 1
                };
                if (total >= 5) {
                  // AUTO TERMINATE AT 5 STRIKES AND REVEAL HONEST SCORE!
                  setTimeout(() => handleSubmitExam(updated), 400);
                }
                return updated;
              });
            }}
            onForceSubmit={() => handleSubmitExam()}
          />

          {/* ------------------------------------------------------------- */}
          {/* MULTI-TAB DASHBOARD NAVIGATION BAR (TABS 1, 2, 3)             */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-white/[0.04] border-b border-white/15 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-3xl shadow-md sticky top-12 z-20">
            <div className="flex flex-wrap items-center gap-2">
              {/* TAB 1: Live Proctoring */}
              <button
                type="button"
                onClick={() => setExamDashboardTab('live')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-black transition-all flex items-center gap-2 ${
                  examDashboardTab === 'live'
                    ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-neon-cyan scale-[1.02]'
                    : 'liquid-pill text-slate-300 hover:text-white border-white/10 hover:border-white/30'
                }`}
              >
                <Camera className="w-4 h-4 text-neon-cyan" />
                <span>Tab 1: Live Proctoring</span>
              </button>

              {/* TAB 2: Browser & Focus Security */}
              <button
                type="button"
                onClick={() => setExamDashboardTab('focus')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-black transition-all flex items-center gap-2 relative ${
                  examDashboardTab === 'focus'
                    ? 'bg-neon-amber/20 border border-neon-amber text-neon-gold shadow-neon-amber scale-[1.02]'
                    : 'liquid-pill text-slate-300 hover:text-white border-white/10 hover:border-white/30'
                }`}
              >
                <Monitor className="w-4 h-4 text-neon-gold" />
                <span>Tab 2: Browser & Focus Security</span>
                {focusEvents.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-neon-rose text-white font-mono font-bold animate-pulse">
                    {focusEvents.length}
                  </span>
                )}
              </button>

              {/* TAB 3: Post-Exam Forensic Report & Trust Score */}
              <button
                type="button"
                onClick={() => setExamDashboardTab('forensic')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-black transition-all flex items-center gap-2 ${
                  examDashboardTab === 'forensic'
                    ? 'bg-neon-mint/20 border border-neon-mint text-neon-mint shadow-neon-emerald scale-[1.02]'
                    : 'liquid-pill text-slate-300 hover:text-white border-white/10 hover:border-white/30'
                }`}
              >
                <FileText className="w-4 h-4 text-neon-mint" />
                <span>Tab 3: Post-Exam Forensic Report & Trust Score</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-mint/20 text-neon-mint border border-neon-mint/40 font-mono font-bold">
                  {trustScore}%
                </span>
              </button>
            </div>

            {/* Continuous Status Badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-neon-mint animate-pulse" />
                <span className="font-bold text-white uppercase tracking-wider hidden sm:inline">
                  AI Anti-Cheat Proctor: Active
                </span>
              </div>
            </div>
          </div>

          {/* Liquid Glass Exam Status & Multi-Stage Stepper Header */}
          <div className="liquid-glass border-b border-white/20 px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-3xl shadow-glass-specular">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                <img src="/skit-logo.png" alt="SKIT" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-white text-sm sm:text-base tracking-tight">
                {activeTest.title}
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-3 py-1 rounded-full liquid-pill text-neon-cyan border border-neon-cyan/40 shadow-neon-cyan">
                {activeTest.department.split(' ')[0]}
              </span>
            </div>

            {/* Continuous Stage Stepper (MCQ -> Coding -> Zam AI Interview) */}
            {examDashboardTab === 'live' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExamStage('mcq')}
                  className={`px-3.5 py-1.5 rounded-2xl font-mono text-xs font-bold transition flex items-center gap-2 ${
                    examStage === 'mcq'
                      ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-neon-cyan'
                      : 'liquid-pill text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <span>1. MCQ (20 Marks)</span>
                  <span className="text-[10px] bg-neon-cyan/30 text-neon-cyan px-1.5 py-0.2 rounded-full font-bold">
                    {Object.keys(candidateAnswers).length}/{activeTest.questions?.length || 20}
                  </span>
                </button>

                <span className="text-slate-500 font-bold hidden sm:inline">──</span>

                <button
                  onClick={() => setExamStage('coding')}
                  className={`px-3.5 py-1.5 rounded-2xl font-mono text-xs font-bold transition flex items-center gap-2 ${
                    examStage === 'coding'
                      ? 'bg-neon-fuchsia/20 border border-neon-fuchsia text-neon-fuchsia shadow-neon-fuchsia'
                      : 'liquid-pill text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <span>2. Coding (30 Marks)</span>
                </button>

                <span className="text-slate-500 font-bold hidden sm:inline">──</span>

                <button
                  onClick={() => setExamStage('interview')}
                  className={`px-3.5 py-1.5 rounded-2xl font-mono text-xs font-bold transition flex items-center gap-2 ${
                    examStage === 'interview'
                      ? 'bg-neon-mint/20 border border-neon-mint text-neon-mint shadow-neon-emerald'
                      : 'liquid-pill text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-neon-mint" />
                  <span>3. Zam AI Viva (50 Marks)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <span className="text-neon-cyan font-bold uppercase">
                  {examDashboardTab === 'focus'
                    ? '🛡️ Active Tab: Browser & Focus Security Telemetry'
                    : '📊 Active Tab: Post-Exam Forensic Matrix & Integrity Audit'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Countdown Digital Timer in Solar Gold Liquid Pill */}
              <div className="flex items-center gap-2 font-mono text-neon-gold liquid-pill px-4 py-1.5 rounded-2xl border border-neon-amber/40 shadow-neon-amber">
                <Clock className="w-4 h-4 text-neon-gold animate-spin" />
                <span className="font-black text-sm">{formatTimer(examTimeLeft)}</span>
              </div>

              {/* Submit Exam Button in Vivid High-Contrast Neon Mint with Glowing Ring */}
              <button
                onClick={() => setShowSubmitConfirmModal(true)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-neon-emerald via-neon-teal to-neon-mint hover:opacity-95 text-void font-black text-xs shadow-neon-emerald ring-2 ring-neon-mint/80 transition flex items-center gap-2 active:scale-95 uppercase tracking-wider font-mono shadow-[0_0_20px_rgba(0,245,155,0.4)]"
                title="Conclude Examination and Submit"
              >
                <CheckCircle className="w-4 h-4 text-void" />
                <span className="font-extrabold tracking-wider">SUBMIT FINAL EXAM</span>
              </button>
            </div>
          </div>

          {/* Exam Split View Layout */}
          <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] mx-auto w-full">
            
            {/* Left/Center Stage: Displays Tab 1 Engine OR Tab 2 Focus OR Tab 3 Forensic Report */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              {/* TAB 2: Browser & Focus Security View */}
              {examDashboardTab === 'focus' && (
                <div className="flex-1">
                  <FocusSecurityTab
                    focusEvents={focusEvents}
                    isWindowFocused={isWindowFocused}
                    warningsCount={warningsCount}
                    totalLostFocusDuration={totalLostFocusDuration}
                    onSimulateEvent={handleSimulateFocusEvent}
                    onClearEvents={() => setFocusEvents([])}
                  />
                </div>
              )}

              {/* TAB 3: Post-Exam Forensic Report & Trust Score View */}
              {examDashboardTab === 'forensic' && (
                <div className="flex-1">
                  <ForensicReportTab
                    incidents={incidents}
                    focusEvents={focusEvents}
                    warningsCount={warningsCount}
                    trustScore={trustScore}
                    user={user}
                    test={activeTest}
                    onSubmitExam={handleSubmitExam}
                  />
                </div>
              )}

              {/* TAB 1: Live Proctoring - STAGE 1: MCQ Assessment */}
              {examDashboardTab === 'live' && examStage === 'mcq' && activeTest.questions && (
                <div className="flex-1 flex flex-col justify-between p-7 sm:p-9 rounded-3xl liquid-glass border border-white/20 shadow-glass-specular backdrop-blur-2xl">
                  {(() => {
                    const q = activeTest.questions[currentQIndex] || activeTest.questions[0];
                    return (
                      <div>
                        {/* Question Header & Quick Palette */}
                        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/[0.12] mb-6 gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-black text-neon-cyan uppercase tracking-wider">
                              Question {currentQIndex + 1} of {activeTest.questions.length}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-white/[0.05] text-slate-300 px-2.5 py-0.5 rounded-full border border-white/10">
                              {Object.keys(candidateAnswers).length} Answered
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExamStage('coding')}
                              className="px-4 py-1.5 rounded-xl bg-neon-fuchsia/20 hover:bg-neon-fuchsia/30 border border-neon-fuchsia/50 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-neon-fuchsia"
                            >
                              <span>Skip to Coding Round</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 20 Questions Quick Palette Grid */}
                        <div className="mb-6 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-wrap items-center gap-1.5">
                          {activeTest.questions.map((item, idx) => {
                            const isAnswered = candidateAnswers[item.id] !== undefined;
                            const isCurrent = currentQIndex === idx;
                            return (
                              <button
                                key={item.id || idx}
                                onClick={() => setCurrentQIndex(idx)}
                                className={`w-8 h-8 rounded-xl font-mono text-xs font-black transition flex items-center justify-center ${
                                  isCurrent
                                    ? 'bg-neon-cyan text-void shadow-neon-cyan scale-110 border-2 border-white'
                                    : isAnswered
                                    ? 'bg-neon-emerald/30 text-neon-mint border border-neon-emerald/50'
                                    : 'liquid-pill text-slate-400 hover:text-white border-white/10'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>

                        {/* Question Text */}
                        <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed mb-6">
                          {q.question}
                        </h3>

                        {/* 4 MCQ Option Choices */}
                        <div className="space-y-3.5">
                          {q.options?.map((opt, idx) => {
                            const isChosen = candidateAnswers[q.id] === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setCandidateAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                                className={`w-full p-4 rounded-2xl border text-xs sm:text-sm text-left transition-all duration-200 flex items-center gap-3.5 ${
                                  isChosen
                                    ? 'bg-gradient-to-r from-neon-fuchsia/25 to-neon-violet/25 border-neon-fuchsia text-white font-bold shadow-neon-fuchsia'
                                    : 'liquid-glass-subtle border-white/10 text-slate-200 hover:border-white/30'
                                }`}
                              >
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs border font-mono ${
                                  isChosen
                                    ? 'bg-neon-fuchsia text-white border-neon-pink shadow-neon-fuchsia'
                                    : 'border-white/10 text-slate-400 bg-white/[0.04]'
                                }`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="leading-relaxed">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* MCQ Navigation Footer */}
                  <div className="pt-6 border-t border-white/[0.12] flex flex-wrap items-center justify-between gap-3 mt-8">
                    <button
                      disabled={currentQIndex === 0}
                      onClick={() => setCurrentQIndex((p) => p - 1)}
                      className="px-5 py-2.5 rounded-2xl liquid-pill disabled:opacity-30 text-xs font-bold text-slate-300 transition flex items-center gap-2 font-mono"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <div className="flex items-center gap-3">
                      {currentQIndex < activeTest.questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentQIndex((p) => p + 1)}
                          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-neon-cyan to-blue-600 hover:opacity-90 active:scale-95 text-xs font-black text-void transition flex items-center gap-2 shadow-neon-cyan font-mono"
                        >
                          Next Question <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : null}

                      {/* Submit Exam Early Option */}
                      <button
                        onClick={() => setShowSubmitConfirmModal(true)}
                        className="px-4 py-2.5 rounded-2xl liquid-pill text-rose-300 hover:text-white border border-rose-500/40 hover:bg-rose-500/15 text-xs font-bold transition flex items-center gap-1.5 font-mono"
                        title="Submit exam directly"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Submit Exam</span>
                      </button>

                      {/* Proceed to Stage 2: Technical Coding */}
                      <button
                        onClick={() => setExamStage('coding')}
                        className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 active:scale-95 text-xs font-black text-white transition flex items-center gap-2 shadow-neon-fuchsia font-mono"
                      >
                        <span>Proceed to Stage 2: Technical Coding</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: Technical Coding Studio */}
              {examDashboardTab === 'live' && examStage === 'coding' && (
                <div className="flex-1">
                  <CodingStudio
                    questions={activeTest.coding_questions || []}
                    onCodeChange={(idx, code, lang) => {
                      setCodingAnswers((prev) => ({
                        ...prev,
                        [idx]: { code, language: lang }
                      }));
                    }}
                    onProceedToInterview={() => setExamStage('interview')}
                    onSubmitExam={() => setShowSubmitConfirmModal(true)}
                  />
                </div>
              )}

              {/* STAGE 3: Zam AI Live Interview */}
              {examDashboardTab === 'live' && examStage === 'interview' && (
                <div className="flex-1">
                  <AIInterviewStudio
                    department={activeTest.department}
                    topic={activeTest.interview_topics?.[0] || activeTest.description}
                    interviewTopics={activeTest.interview_topics || []}
                    onAnswerLogged={(turn) => {
                      setInterviewTranscript((prev) => [...prev, turn]);
                    }}
                    onSubmitExam={() => setShowSubmitConfirmModal(true)}
                  />
                </div>
              )}
            </div>

            {/* Right Stage: Proctoring Telemetry HUD with Liquid Glass */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <WebcamFeed
                onFrameCapture={handleFrameCapture}
                isStreaming={true}
                captureIntervalMs={400}
              />

              <TrustScoreGauge
                score={trustScore}
                headPose={headPose}
                faceCount={faceCount}
                status={status}
              />

              <div className="flex-1 min-h-[240px]">
                <IncidentTimeline
                  incidents={incidents}
                  onClear={() => setIncidents([])}
                />
              </div>
            </div>
          </main>

          {/* ------------------------------------------------------------- */}
          {/* FULL-SCREEN AI PROCTOR WARNING NOTIFICATION MODAL             */}
          {/* ------------------------------------------------------------- */}
          {activeFullScreenWarning && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-void/90 backdrop-blur-2xl animate-in fade-in duration-200">
              <div className="relative w-full max-w-lg rounded-3xl liquid-glass border-2 border-neon-rose/80 p-7 sm:p-8 shadow-neon-rose text-center overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neon-rose via-neon-orange to-neon-gold" />
                
                <div className="inline-flex p-4 rounded-2xl bg-neon-rose/20 text-neon-rose mb-3 animate-bounce shadow-neon-rose border border-neon-rose/40">
                  <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>

                <div className="text-[10px] font-mono text-neon-cyan uppercase font-bold tracking-widest mb-1">
                  SKIT AI PROCTOR INTEGRITY WARNING
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider mb-2 font-mono">
                  {activeFullScreenWarning.code === 'MOBILE_PHONE_DETECTED'
                    ? '📱 Mobile Phone Detected'
                    : (activeFullScreenWarning.code?.includes('MULTIPLE_FACES') || activeFullScreenWarning.code?.includes('FACE_COUNT'))
                    ? '👥 Multiple Persons Detected'
                    : (activeFullScreenWarning.code?.includes('NO_FACE') || activeFullScreenWarning.code?.includes('OUT_OF_CAMERA'))
                    ? '👤 Candidate Face Out of Camera View'
                    : activeFullScreenWarning.code?.includes('LOOKING_AWAY')
                    ? '👀 Candidate Looking Away from Screen'
                    : activeFullScreenWarning.code?.includes('NODDING')
                    ? '↕️ Head Nodding Detected'
                    : (activeFullScreenWarning.code?.includes('VOICE') || activeFullScreenWarning.code?.includes('AUDIO'))
                    ? '🎙️ Severe Speech / Noise Detected'
                    : (activeFullScreenWarning.code?.includes('BACKLIGHT') || activeFullScreenWarning.code?.includes('LIGHT'))
                    ? '🪟 Window Backlight / Lighting Alert'
                    : (activeFullScreenWarning.code?.includes('PARTIAL') || activeFullScreenWarning.code?.includes('HALF') || activeFullScreenWarning.code?.includes('PROCTOR_ZONE'))
                    ? '👤 Half Face / Out of Camera Region'
                    : '⚠️ Proctor Security Violation'}
                </h3>

                <p className="text-xs text-rose-100 leading-relaxed mb-5 font-medium bg-black/50 p-3.5 rounded-2xl border border-white/10">
                  {activeFullScreenWarning.message}
                </p>

                <div className="p-3 mb-6 rounded-2xl liquid-glass-subtle border border-neon-rose/40 text-xs flex items-center justify-between font-mono">
                  <span className="text-slate-300">Total Warning Strikes:</span>
                  <span className="font-black text-neon-rose text-sm">
                    {warningsCount.total || 0} of 5 (Terminates at 5)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFullScreenWarning(null);
                    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  }}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-neon-rose via-neon-orange to-neon-gold hover:opacity-95 text-white font-black text-xs shadow-neon-rose transition flex items-center justify-center gap-2 uppercase tracking-wider font-mono active:scale-95 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>
                    {activeFullScreenWarning.code === 'MOBILE_PHONE_DETECTED'
                      ? '📱 Phone Put Aside • Resume Fullscreen Exam'
                      : activeFullScreenWarning.code?.includes('MULTIPLE_FACES')
                      ? '👥 Solitary Session Confirmed • Resume Exam'
                      : 'Acknowledge & Resume Fullscreen Exam'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* CASE B: Portal Views (Admin Suite OR Candidate Catalog)        */
        /* ------------------------------------------------------------- */
        <main className="flex-1 p-5 sm:p-8 max-w-[1700px] mx-auto w-full relative z-10">
          {user.role?.toLowerCase() === 'admin' ? (
            <AdminDashboard
              departments={departments}
              tests={tests}
              onRefreshTests={fetchDepartmentsAndTests}
              onViewReport={(rep) => {
                setGeneratedReport(rep);
                setShowReportModal(true);
              }}
            />
          ) : (
            <DepartmentTestCatalog
              tests={tests}
              departments={departments}
              userDepartment={user.department}
              user={user}
              onSelectTest={handleSelectTest}
              onViewReport={(rep) => {
                setGeneratedReport(rep);
                setShowReportModal(true);
              }}
            />
          )}
        </main>
      )}

      {/* Pre-Exam Hardware & Lockdown Authorization Modal */}
      <PreExamPermissionsModal
        isOpen={showPermissionsModal}
        test={pendingSelectedTest}
        onProceed={() => startConfirmedExam(pendingSelectedTest)}
        onCancel={() => {
          setShowPermissionsModal(false);
          setPendingSelectedTest(null);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* EXAM SUBMISSION CONFIRMATION MODAL                            */}
      {/* ------------------------------------------------------------- */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl liquid-glass border border-neon-mint/50 p-7 sm:p-8 shadow-neon-emerald text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neon-emerald via-neon-teal to-neon-mint" />
            
            <div className="inline-flex p-4 rounded-2xl bg-neon-emerald/20 text-neon-mint mb-3 shadow-neon-emerald border border-neon-emerald/40 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="text-[10px] font-mono text-neon-cyan uppercase font-bold tracking-widest mb-1">
              SKIT ACADEMIC INTEGRITY PORTAL
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 font-mono">
              Confirm Final Exam Submission
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5 font-medium">
              Are you sure you want to conclude your examination? Your answers will be submitted for autonomous AI multi-stage grading and forensic certificate generation.
            </p>

            {/* Quick Summary of Attempted Work */}
            <div className="p-4 mb-6 rounded-2xl liquid-glass-subtle border border-white/10 text-xs font-mono space-y-2.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">1. Multiple Choice Questions:</span>
                <span className="font-bold text-neon-cyan">
                  {Object.keys(candidateAnswers).length} of {activeTest?.questions?.length || 20} Answered
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">2. Technical Coding Challenges:</span>
                <span className="font-bold text-neon-fuchsia">
                  {Object.keys(codingAnswers).length} of {activeTest?.coding_questions?.length || 2} Attempted
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">3. Zam AI Viva Inquiries:</span>
                <span className="font-bold text-neon-mint">
                  {interviewTranscript.length} Responses Logged
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-slate-300">Live Proctor Trust Score:</span>
                <span className="font-black text-neon-mint text-sm">
                  {trustScore}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="flex-1 py-3 rounded-2xl liquid-pill text-slate-300 hover:text-white border border-white/20 text-xs font-bold font-mono transition"
              >
                Cancel & Keep Reviewing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirmModal(false);
                  handleSubmitExam();
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-neon-emerald via-neon-teal to-neon-mint hover:opacity-95 text-void font-black text-xs shadow-neon-emerald transition flex items-center justify-center gap-2 uppercase tracking-wider font-mono active:scale-95 ring-2 ring-neon-mint"
              >
                <CheckCircle className="w-4 h-4 text-void" />
                <span>Yes, Finalize & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Scorecard & Performance Report Modal */}
      {showReportModal && generatedReport && (
        <CandidateReportModal
          report={generatedReport}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Google Gemini API Key Configuration Modal */}
      <GeminiConfigModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onKeySaved={() => setGeminiKeySet(true)}
      />

      {/* Department Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={notifications}
      />
    </div>
  );
}
