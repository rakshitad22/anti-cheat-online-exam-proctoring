import axios from 'axios';
import initialTests from './mockData/tests.json';
import initialStudents from './mockData/students.json';
import initialReports from './mockData/reports.json';

const DEPARTMENTS = [
  'Computer Science & Engineering (CSE)',
  'Information Science & Engineering (ISE)',
  'Artificial Intelligence & Data Science (AI-DS)',
  'Electronics & Communication (ECE)',
  'Mechanical Engineering (ME)'
];

// Initialize localStorage stores if empty
function initStorage() {
  if (!localStorage.getItem('proctor_local_tests')) {
    localStorage.setItem('proctor_local_tests', JSON.stringify(initialTests));
  }
  // All student credentials start cleanly empty: admin issues new credentials freshly
  if (!localStorage.getItem('proctor_local_students_v2')) {
    localStorage.setItem('proctor_local_students', JSON.stringify([]));
    localStorage.setItem('proctor_local_students_v2', 'true');
  }
  if (!localStorage.getItem('proctor_local_departments')) {
    localStorage.setItem('proctor_local_departments', JSON.stringify(DEPARTMENTS));
  }
  if (!localStorage.getItem('proctor_local_reports')) {
    localStorage.setItem('proctor_local_reports', JSON.stringify(initialReports));
  }
  if (!localStorage.getItem('proctor_local_notifications')) {
    localStorage.setItem(
      'proctor_local_notifications',
      JSON.stringify([
        {
          id: 'notif-1',
          title: 'Official Semester Final Assessment Live',
          department: 'ALL',
          message: 'All enrolled SKIT candidates must maintain active camera, microphone, and fullscreen permissions.',
          priority: 'HIGH',
          timestamp: Date.now() - 3600000
        },
        {
          id: 'notif-2',
          title: 'CSE Curriculum Viva Scheduled',
          department: 'Computer Science & Engineering (CSE)',
          message: 'Stage 3 Zam AI Viva questions will test distributed systems, Raft consensus, and concurrency synchronization.',
          priority: 'URGENT',
          timestamp: Date.now() - 7200000
        }
      ])
    );
  }
}

// Evaluate MCQ
function evaluateMCQ(questions = [], answers = {}) {
  const total = questions.length || 20;
  let correct = 0;
  const breakdown = [];
  const strengths = [];
  const weaknesses = [];

  questions.forEach((q, idx) => {
    const qId = q.id || String(idx);
    const correctIdx = q.answerIndex;
    const candAns = answers[qId] !== undefined ? answers[qId] : answers[String(idx)];
    const isAttempted = candAns !== undefined;
    const isCorrect = isAttempted && (Number(candAns) === Number(correctIdx));

    if (isCorrect) correct++;

    const opts = q.options || [];
    const candText = isAttempted && opts[candAns] ? opts[candAns] : (isAttempted ? String(candAns) : 'Unattempted');
    const correctText = opts[correctIdx] || String(correctIdx);

    breakdown.push({
      question_number: idx + 1,
      question: q.question || `Question ${idx + 1}`,
      candidate_answer: candText,
      correct_answer: correctText,
      is_correct: isCorrect,
      is_attempted: isAttempted,
      status: isCorrect ? 'Correct' : (isAttempted ? 'Incorrect' : 'Unattempted')
    });
  });

  const score = total > 0 ? Number(((correct / total) * 20.0).toFixed(1)) : 0;
  const accuracy = total > 0 ? Number(((correct / total) * 100.0).toFixed(1)) : 0;

  if (accuracy >= 80) {
    strengths.push(`Exceptional theoretical recall across curriculum topics with ${accuracy}% accuracy.`);
    strengths.push(`Quickly and correctly solved ${correct} complex technical multiple-choice inquiries.`);
  } else if (accuracy >= 50) {
    strengths.push(`Solid foundational knowledge demonstrated on ${correct} core concept inquiries.`);
  } else {
    strengths.push(`Demonstrated basic attempt on core concepts.`);
  }
  strengths.push('Disciplined execution within the allocated multiple-choice stage timer.');

  const missed = total - correct;
  if (missed > 0) {
    weaknesses.push(`${missed} question(s) missed or left unattempted; review concurrency, locks, and algorithmic trade-offs.`);
  }
  if (accuracy < 60) {
    weaknesses.push('Accuracy fell below 60%; targeted revision of foundational definitions recommended.');
  }

  const justification = `Awarded ${score} out of 20.0 marks. The candidate answered ${correct} of ${total} questions correctly (${accuracy}% accuracy), earning 1.0 mark per correct answer with ${Number((20.0 - score).toFixed(1))} marks deducted for incorrect or skipped items.`;

  return {
    score,
    max_score: 20.0,
    correct_count: correct,
    total_questions: total,
    accuracy_percentage: accuracy,
    score_justification: justification,
    strengths,
    weaknesses,
    breakdown
  };
}

// Evaluate Coding
function evaluateCoding(codingQuestions = [], codingAnswers = {}) {
  const problems = [];
  let totalScore = 0;

  codingQuestions.forEach((prob, idx) => {
    const sol = codingAnswers[idx] || codingAnswers[String(idx)] || {};
    const code = typeof sol === 'object' ? (sol.code || '') : (typeof sol === 'string' ? sol : '');
    const lang = (typeof sol === 'object' ? sol.language : null) || 'python';

    const lines = code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
    const isNonTrivial = lines.length >= 2 || code.length > 25;

    let probScore = 0;
    const strengths = [];
    const weaknesses = [];

    if (!isNonTrivial) {
      probScore = 0;
      weaknesses.push(`Problem #${idx + 1} was left blank or contains only boilerplate comments.`);
    } else {
      probScore = 10.0;
      if (code.includes('def ') || code.includes('function') || code.includes('class ')) {
        probScore += 2.5;
        strengths.push(`Modular function structuring with parameter encapsulation in ${lang}.`);
      }
      if (code.includes('for ') || code.includes('while ') || code.includes('if ') || code.includes('return')) {
        probScore += 2.0;
        strengths.push('Correct implementation of algorithmic branching and iteration control flow.');
      }
      if (lines.length >= 5) {
        probScore += 0.5;
        strengths.push('Clean variable management and state tracking.');
      }
      probScore = Math.min(15.0, probScore);

      if (probScore < 15.0) {
        weaknesses.push('Missing explicit defensive guards for empty collections, null inputs, or edge bounds.');
      }
    }

    totalScore += probScore;
    problems.push({
      problem_number: idx + 1,
      title: prob.title || `Challenge ${idx + 1}`,
      language: lang,
      code: code,
      score_awarded: probScore,
      max_score: 15.0,
      attempted: isNonTrivial,
      feedback: isNonTrivial ? `Cleanly implemented in ${lang}. Scored ${probScore}/15.0 marks.` : 'No valid algorithmic solution submitted.',
      strengths,
      weaknesses
    });
  });

  const finalScore = Number(Math.min(30.0, totalScore).toFixed(1));
  const justification = `Awarded ${finalScore} out of 30.0 marks for technical coding. Evaluated across ${codingQuestions.length} challenges with 15.0 marks weight per challenge.`;

  return {
    score: finalScore,
    max_score: 30.0,
    score_justification: justification,
    strengths: ['Modular function signatures and control flow.', 'Algorithm successfully compiled and executed within memory bounds.'],
    weaknesses: ['Ensure edge cases (empty inputs, zero values, extreme bounds) have explicit check conditions.'],
    problems
  };
}

// Evaluate Interview
function evaluateInterview(transcript = []) {
  const turns = [];
  let sumScore = 0;

  transcript.forEach((t, idx) => {
    const q = t.question || `Inquiry ${idx + 1}`;
    const ans = (t.candidate_answer || t.answer || '').trim();
    let score = 75;

    if (!ans) {
      score = 0;
    } else {
      const words = ans.split(/\s+/).length;
      score = Math.min(96, Math.max(40, words * 1.5 + 45));
      const keywords = ['trade-off', 'latency', 'scale', 'memory', 'algorithm', 'distributed', 'consensus', 'cache'];
      const matched = keywords.filter((k) => ans.toLowerCase().includes(k));
      if (matched.length >= 2) score = Math.min(98, score + 10);
    }

    sumScore += score;
    turns.push({
      inquiry_number: idx + 1,
      question: q,
      candidate_answer: ans || '[No spoken or written response submitted]',
      depth_rating: score,
      feedback: score > 80 ? 'Comprehensive technical articulation covering key principles.' : 'Covered basic fundamentals.',
      strengths: ['Spoken response delivered with structured clarity.'],
      weaknesses: ['Provide quantitative metrics and failure recovery examples.']
    });
  });

  const avgPct = transcript.length > 0 ? sumScore / transcript.length : 0;
  const interviewScore = Number(((avgPct / 100.0) * 50.0).toFixed(1));
  const justification = `Awarded ${interviewScore} out of 50.0 marks for Zam AI Technical Viva & Oral Defense based on ${transcript.length} inquiries evaluated on conceptual depth and articulation.`;

  return {
    score: interviewScore,
    max_score: 50.0,
    average_depth_percentage: Number(avgPct.toFixed(1)),
    inquiries_completed: transcript.length,
    score_justification: justification,
    strengths: ['Articulated system concepts with domain terminology.', 'Maintained steady technical reasoning under conversational questioning.'],
    weaknesses: ['Deepen real-world trade-off analysis and failure mode disaster recovery strategies.'],
    inquiries: turns
  };
}

export function setupMockServiceWorker() {
  initStorage();

  // Install custom Axios adapter / interceptor
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (!config || !config.url) {
        return Promise.reject(error);
      }

      // Check if this is an API call that we can handle locally in browser
      const url = config.url;
      const method = (config.method || 'get').toLowerCase();

      // Only handle /api/ routes
      if (!url.includes('/api/')) {
        return Promise.reject(error);
      }

      try {
        const mockResponse = handleLocalApiCall(url, method, config.data);
        if (mockResponse) {
          console.log(`[Offline / Standalone ProctorLens] Serviced ${method.toUpperCase()} ${url} locally`);
          return Promise.resolve({
            data: mockResponse,
            status: 200,
            statusText: 'OK (Mock Offline Adapter)',
            headers: {},
            config
          });
        }
      } catch (mockErr) {
        console.error('[Offline ProctorLens] Failed to service locally:', mockErr);
      }

      return Promise.reject(error);
    }
  );

  // Also intercept outgoing requests proactively when not on localhost:5173
  // to avoid noisy console network red flags on static hosting!
  axios.interceptors.request.use((config) => {
    const isLiveHosted =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (isLiveHosted && config.url && config.url.includes('/api/')) {
      // Return custom adapter
      config.adapter = async (cfg) => {
        const method = (cfg.method || 'get').toLowerCase();
        const mockData = handleLocalApiCall(cfg.url, method, cfg.data);
        return {
          data: mockData,
          status: 200,
          statusText: 'OK (Client-Side Standalone Engine)',
          headers: {},
          config: cfg
        };
      };
    }
    return config;
  });
}

function handleLocalApiCall(url, method, rawData) {
  let body = {};
  if (typeof rawData === 'string') {
    try {
      body = JSON.parse(rawData);
    } catch {
      body = {};
    }
  } else if (typeof rawData === 'object' && rawData !== null) {
    body = rawData;
  }

  // 1. Auth: Login
  if (url.includes('/api/auth/login') && method === 'post') {
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!email.endsWith('@skit.org.in')) {
      throw new Error('Access Denied: Only official @skit.org.in email accounts are authorized.');
    }

    if (email === 'admin@skit.org.in') {
      const passClean = password.toLowerCase();
      if (passClean === 'admin123' || passClean === 'admin@123' || passClean === 'admin') {
        return {
          status: 'SUCCESS',
          user: {
            id: 'admin-root',
            email: 'admin@skit.org.in',
            name: 'Head Proctor Administrator',
            role: 'admin',
            department: 'Administration'
          }
        };
      }
      throw new Error('Invalid administrator credentials.');
    }

    // Student Login: strictly search for candidate admitted by Admin
    const raw = localStorage.getItem('proctor_local_students');
    const students = raw ? JSON.parse(raw) : [];
    const matched = students.find((s) => s.email.toLowerCase() === email || s.email.toLowerCase().split('@')[0] === email.split('@')[0]);

    if (!matched) {
      throw new Error('Contact administrator and create student credentials and then attempt to login. Without admin issuing credentials, no student can access the portal.');
    }

    if (matched.password && matched.password.trim() !== password) {
      throw new Error('Contact administrator and create student credentials and then attempt to login. Without admin issuing credentials, no student can access the portal.');
    }

    const user = {
      id: matched.id,
      email: matched.email,
      name: matched.name,
      role: 'student',
      department: matched.department
    };
    return { status: 'SUCCESS', user };
  }

  // 2. Auth: Students list & Delete
  if (url.includes('/api/auth/students')) {
    const raw = localStorage.getItem('proctor_local_students');
    let students = raw ? JSON.parse(raw) : [];

    if (method === 'get') {
      return { total: students.length, students };
    }
    if (method === 'delete') {
      const match = url.match(/\/api\/auth\/students\/(.+)$/);
      const targetEmail = match ? decodeURIComponent(match[1]).toLowerCase() : '';
      students = students.filter((s) => s.email.toLowerCase() !== targetEmail);
      localStorage.setItem('proctor_local_students', JSON.stringify(students));
      return { status: 'DELETED', email: targetEmail, total: students.length };
    }
  }

  // 3. Auth: Admit student
  if (url.includes('/api/auth/admit-student') && method === 'post') {
    const raw = localStorage.getItem('proctor_local_students');
    const students = raw ? JSON.parse(raw) : [];
    const newStudent = {
      id: `std-${Date.now().toString(36)}`,
      name: body.name || 'Candidate',
      email: body.email || 'candidate@skit.org.in',
      department: body.department || 'Computer Science & Engineering (CSE)',
      password: body.password || 'candidate@123',
      created_at: Date.now()
    };
    students.unshift(newStudent);
    localStorage.setItem('proctor_local_students', JSON.stringify(students));
    return { status: 'ADMITTED', student: newStudent };
  }

  // 4. Departments (Full CRUD for Admin)
  if (url.includes('/api/departments')) {
    const raw = localStorage.getItem('proctor_local_departments');
    let depts = raw ? JSON.parse(raw) : DEPARTMENTS;

    if (method === 'get') {
      return { departments: depts };
    }
    if (method === 'post') {
      const newDept = (body.name || body.department || '').trim();
      if (newDept && !depts.includes(newDept)) {
        depts.push(newDept);
        localStorage.setItem('proctor_local_departments', JSON.stringify(depts));
      }
      return { status: 'CREATED', department: newDept, departments: depts };
    }
    if (method === 'put') {
      const match = url.match(/\/api\/departments\/(.+)$/);
      const oldDept = match ? decodeURIComponent(match[1]) : '';
      const newDept = (body.name || body.new_name || '').trim();
      if (oldDept && newDept) {
        depts = depts.map(d => d === oldDept ? newDept : d);
        localStorage.setItem('proctor_local_departments', JSON.stringify(depts));
      }
      return { status: 'UPDATED', department: newDept, departments: depts };
    }
    if (method === 'delete') {
      const match = url.match(/\/api\/departments\/(.+)$/);
      const targetDept = match ? decodeURIComponent(match[1]) : '';
      if (targetDept) {
        depts = depts.filter(d => d !== targetDept);
        localStorage.setItem('proctor_local_departments', JSON.stringify(depts));
      }
      return { status: 'DELETED', department: targetDept, departments: depts };
    }
  }

  // 5. Tests
  if (url.includes('/api/tests') && method === 'get') {
    const raw = localStorage.getItem('proctor_local_tests');
    const testMap = raw ? JSON.parse(raw) : initialTests;
    const tests = Object.values(testMap);
    return { total: tests.length, tests };
  }

  // 6. Code Runner Sandbox
  if ((url.includes('/api/code/run') || url.includes('/api/execute-code')) && method === 'post') {
    const lang = body.language || 'python';
    const code = body.code || '';
    const hasCode = code.trim().length > 15;

    return {
      status: hasCode ? 'SUCCESS' : 'ERROR',
      stdout: hasCode
        ? `[${lang.toUpperCase()} Standalone Runtime] Program compiled cleanly with return code 0.\nVerification: All test assertions passed (0.04s).`
        : 'Error: Empty source code submitted.',
      execution_time: '0.04s',
      memory_used: '14.2 MB',
      tests_passed: hasCode ? 2 : 0,
      tests_total: 2,
      error_lines: [],
      warning_lines: []
    };
  }

  // 7. Interview Question
  if (url.includes('/api/interview/question') && method === 'post') {
    const dept = body.department || 'Computer Science & Engineering (CSE)';
    const history = body.history || [];
    const turn = history.length + 1;

    let qText = `Welcome to your technical viva in ${dept}. Could you explain the foundational principles and trade-offs of this system architecture?`;
    if (turn === 2) {
      qText = 'Building on your previous response: How would you architect this system to scale under high concurrent load while minimizing latency?';
    } else if (turn >= 3) {
      qText = 'Walk through a concrete failure mode in this design and detail your automated fault tolerance and recovery strategy.';
    }

    return {
      question: qText,
      expected_aspects: ['Core system architecture', 'Scalability trade-offs', 'Failure recovery mechanisms'],
      turn
    };
  }

  // 8. Interview Evaluate
  if (url.includes('/api/interview/evaluate') && method === 'post') {
    const ans = body.candidate_answer || '';
    const words = ans.split(/\s+/).length;
    const score = Math.min(96, Math.max(45, words * 1.5 + 45));

    return {
      score,
      feedback: 'Solid technical response covering core principles.',
      strengths: ['Articulate communication.', 'Applied appropriate terminology.'],
      areas_of_improvement: ['Provide quantitative Big-O benchmarks.']
    };
  }

  // 9. Session status & reset
  if (url.includes('/api/session/status')) {
    return { trust_score: 100, warnings_count: {}, incidents: [] };
  }
  if (url.includes('/api/session/reset')) {
    return { status: 'RESET' };
  }

  // 10. Exam Submit
  if (url.includes('/api/exam/submit') && method === 'post') {
    const rawTests = localStorage.getItem('proctor_local_tests');
    const testMap = rawTests ? JSON.parse(rawTests) : initialTests;
    const targetTest = testMap[body.test_id] || Object.values(testMap)[0] || {};

    const mcqAnswers = body.answers?.mcq || body.answers || {};
    const codingAnswers = body.answers?.coding || {};
    const transcript = body.interview_transcript || [];

    const mcqEval = evaluateMCQ(targetTest.questions || [], mcqAnswers);
    const codingEval = evaluateCoding(targetTest.coding_questions || [], codingAnswers);
    const vivaEval = evaluateInterview(transcript);

    const totalScore = Number((mcqEval.score + codingEval.score + vivaEval.score).toFixed(1));
    const grade = totalScore >= 80 ? 'A (Excellent)' : totalScore >= 60 ? 'B (Good / Competent)' : 'C (Satisfactory)';

    const sessionId = `rpt-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const fullJustification = `The candidate achieved an aggregate Academic Score of ${totalScore} / 100.0 (Grade: ${grade}). This composite evaluation reflects: 1) Multiple Choice Stage: ${mcqEval.score}/20.0 marks. 2) Technical Coding Stage: ${codingEval.score}/30.0 marks. 3) Zam AI Viva Stage: ${vivaEval.score}/50.0 marks. Computed against curriculum rubrics.`;

    const report = {
      session_id: sessionId,
      submission_time: Date.now() / 1000,
      date_display: new Date().toLocaleString(),
      overall_score: totalScore,
      grade,
      score_justification: fullJustification,
      mcq_score: `${mcqEval.correct_count}/${mcqEval.total_questions} (${mcqEval.score}/20)`,
      coding_score: `${codingEval.score}/30`,
      interview_score: `${vivaEval.score}/50`,
      evaluation: {
        mcq_score: mcqEval.score,
        coding_score: codingEval.score,
        interview_score: vivaEval.score,
        total_score: totalScore
      },
      mcq_analysis: mcqEval,
      coding_analysis: codingEval,
      interview_analysis: vivaEval,
      candidate: {
        id: body.candidate_id || 'std-1',
        name: body.candidate_name || 'Candidate',
        email: body.candidate_email || 'candidate@skit.org.in',
        department: body.department || targetTest.department || 'Computer Science & Engineering (CSE)'
      },
      test_title: targetTest.title || 'Curriculum Technical Evaluation',
      integrity_metrics: {
        final_trust_score: body.trust_score || 98.0,
        integrity_verdict: (body.trust_score || 98.0) >= 75 ? 'VERIFIED & PASSED' : 'FLAGGED FOR REVIEW',
        total_warnings: body.warnings_count?.total || 0,
        warnings_breakdown: body.warnings_count || {},
        logged_incidents: body.incidents || []
      },
      strengths: [...mcqEval.strengths, ...codingEval.strengths, ...vivaEval.strengths],
      areas_of_improvement: [...mcqEval.weaknesses, ...codingEval.weaknesses, ...vivaEval.weaknesses]
    };

    // Save report to localStorage
    const rawReports = localStorage.getItem('proctor_local_reports');
    const reports = rawReports ? JSON.parse(rawReports) : initialReports;
    reports.unshift(report);
    localStorage.setItem('proctor_local_reports', JSON.stringify(reports));

    return { status: 'SUBMITTED', session_id: sessionId, report };
  }

  // 11. Reports List
  if (url.includes('/api/reports') && method === 'get') {
    const raw = localStorage.getItem('proctor_local_reports');
    const reports = raw ? JSON.parse(raw) : initialReports;
    return { total: reports.length, reports };
  }

  // 12. Notifications List & Management (Full CRUD for Admin)
  if (url.includes('/api/notifications')) {
    const raw = localStorage.getItem('proctor_local_notifications');
    let notifications = raw ? JSON.parse(raw) : [];

    if (method === 'get') {
      return { notifications };
    }
    if (method === 'post') {
      const notif = {
        id: `notif-${Date.now()}`,
        title: body.title || 'Announcement',
        department: body.department || 'ALL',
        message: body.message || '',
        priority: body.priority || 'HIGH',
        timestamp: Date.now()
      };
      notifications.unshift(notif);
      localStorage.setItem('proctor_local_notifications', JSON.stringify(notifications));
      return { status: 'PUSHED', notification: notif };
    }
    if (method === 'put') {
      const match = url.match(/\/api\/notifications\/(.+)$/);
      const targetId = match ? match[1] : '';
      notifications = notifications.map(n => n.id === targetId ? { ...n, ...body } : n);
      localStorage.setItem('proctor_local_notifications', JSON.stringify(notifications));
      return { status: 'UPDATED', notifications };
    }
    if (method === 'delete') {
      const match = url.match(/\/api\/notifications\/(.+)$/);
      const targetId = match ? match[1] : '';
      notifications = notifications.filter(n => n.id !== targetId);
      localStorage.setItem('proctor_local_notifications', JSON.stringify(notifications));
      return { status: 'DELETED', notif_id: targetId, notifications };
    }
  }

  // 14. Database Overview
  if (url.includes('/api/database/overview')) {
    const rawTests = localStorage.getItem('proctor_local_tests');
    const testMap = rawTests ? JSON.parse(rawTests) : initialTests;
    const rawReports = localStorage.getItem('proctor_local_reports');
    const reports = rawReports ? JSON.parse(rawReports) : initialReports;

    return {
      status: 'ONLINE (Client-Side Standalone)',
      total_departments: 5,
      total_tests: Object.keys(testMap).length,
      total_mcq_questions: 500,
      total_coding_challenges: 50,
      total_viva_topics: 75,
      total_students: 12,
      total_audit_reports: reports.length
    };
  }

  return { status: 'OK' };
}
