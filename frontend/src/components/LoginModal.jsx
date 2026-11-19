import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  KeyRound,
  AlertCircle,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Quote,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

const INSPIRING_STORIES = [
  {
    id: 1,
    tag: 'FUTURE OF AI INTEGRITY',
    title: 'Pioneering Academic Truth with Artificial Intelligence',
    quote: 'The best way to predict the future is to invent it with uncompromising integrity.',
    author: 'Alan Kay • Computer Science Pioneer',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 2,
    tag: 'HUMAN POTENTIAL & MASTERY',
    title: 'Transforming Raw Ambition into World-Class Excellence',
    quote: 'Education is not the learning of facts, but the training of the mind to think and create.',
    author: 'Albert Einstein • Theoretical Physicist',
    image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 3,
    tag: 'AGENTIC DIALOGUE',
    title: 'Conversational Intelligence That Listens & Elevates',
    quote: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.',
    author: 'Alan Turing • Father of Modern Computing',
    image: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 4,
    tag: 'VISIONARY ARCHITECTURE',
    title: 'Where Equal Opportunity Meets Meritocratic Verification',
    quote: 'Integrity without knowledge is weak; knowledge without integrity is dangerous.',
    author: 'Samuel Johnson • Essayist & Scholar',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80'
  }
];

export default function LoginModal({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleMode, setRoleMode] = useState('student');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance inspiring slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % INSPIRING_STORIES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both your email address and security password.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@skit.org.in')) {
      setErrorMessage('Access Denied: Only official @skit.org.in college email addresses are authorized.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: cleanEmail,
        password: password.trim()
      });

      if (res.data.status === 'SUCCESS') {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      if (roleMode === 'student' || cleanEmail !== 'admin@skit.org.in') {
        setErrorMessage(
          msg || 'Contact administrator and create student credentials and then attempt to login. Without admin issuing credentials, no student can access the portal.'
        );
      } else {
        setErrorMessage(msg || 'Invalid administrator credentials. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeStory = INSPIRING_STORIES[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto selection:bg-neon-fuchsia/40">
      
      {/* Background Liquid Light Orbs */}
      <div className="fixed inset-0 bg-void/85 backdrop-blur-3xl -z-20" />
      <div className="fixed -top-32 -left-32 w-[550px] h-[550px] bg-gradient-to-tr from-neon-fuchsia/25 to-neon-violet/20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed -bottom-32 -right-32 w-[550px] h-[550px] bg-gradient-to-br from-neon-cyan/25 to-blue-600/20 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Main Container - Stable, Crisp, Zero Disappearing Bugs */}
      <div className="relative w-full max-w-5xl rounded-[2.5rem] liquid-glass border border-white/20 shadow-glass-specular overflow-hidden my-auto grid grid-cols-1 lg:grid-cols-12 backdrop-blur-3xl">
        
        {/* Iridescent Top Bevel */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent z-30" />

        {/* ------------------------------------------------------------- */}
        {/* LEFT SECTION: Inspiring Visual Gallery Showcase               */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:col-span-6 relative p-7 sm:p-10 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-white/15 min-h-[440px] lg:min-h-[600px]">
          
          {/* Background Inspiring Image with Smooth Crossfade */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <img
              key={activeStory.id}
              src={activeStory.image}
              alt={activeStory.title}
              className="w-full h-full object-cover object-center transition-all duration-1000 ease-in-out filter brightness-[0.4] contrast-125"
            />
            {/* Gradients Over Image */}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-tr from-neon-fuchsia/20 via-transparent to-neon-cyan/20 mix-blend-overlay" />
          </div>

          {/* Top Brand Emblem */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-white/30 flex items-center justify-center shadow-neon-fuchsia overflow-hidden">
              <img src="/skit-logo.png" alt="SKIT Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                SKIT ProctorLens<span className="text-neon-fuchsia font-mono">.AI</span>
              </span>
              <span className="text-[11px] text-neon-mint font-mono font-bold block">
                Sri Krishna Institute of Technology, Bangalore
              </span>
            </div>
          </div>

          {/* Center Inspiring Story & Quote */}
          <div className="my-auto py-6 relative z-10 space-y-4">
            <span className="inline-block text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full bg-neon-fuchsia/20 text-neon-fuchsia border border-neon-fuchsia/40 shadow-neon-fuchsia">
              {activeStory.tag}
            </span>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {activeStory.title}
            </h1>

            {/* Inspiring Quote Card */}
            <div className="p-4 sm:p-5 rounded-2xl liquid-glass-subtle border border-white/20 backdrop-blur-md relative overflow-hidden">
              <Quote className="w-6 h-6 text-neon-cyan/40 absolute top-3 right-3 pointer-events-none" />
              <p className="text-xs sm:text-sm text-slate-200 italic font-medium leading-relaxed relative z-10">
                "{activeStory.quote}"
              </p>
              <div className="text-[11px] font-mono font-bold text-neon-mint mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-mint shadow-[0_0_6px_#00f59b]" />
                {activeStory.author}
              </div>
            </div>
          </div>

          {/* Bottom Carousel Navigation Dots & Controls */}
          <div className="pt-4 border-t border-white/15 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              {INSPIRING_STORIES.map((story, idx) => (
                <button
                  key={story.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx
                      ? 'w-7 bg-gradient-to-r from-neon-fuchsia to-neon-cyan shadow-neon-fuchsia'
                      : 'w-2 bg-white/25 hover:bg-white/50'
                  }`}
                  title={story.title}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setCurrentSlide((prev) => (prev === 0 ? INSPIRING_STORIES.length - 1 : prev - 1))
                }
                className="p-1.5 rounded-xl liquid-pill text-slate-300 hover:text-white transition"
                title="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => (prev + 1) % INSPIRING_STORIES.length)}
                className="p-1.5 rounded-xl liquid-pill text-slate-300 hover:text-white transition"
                title="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT SECTION: Secure Authentication Portal                   */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative z-20">
          <div className="w-full max-w-md mx-auto my-auto">
            <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 font-bold mb-3 inline-block">
              Exclusively Created for SKIT Bangalore
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 font-medium leading-relaxed">
              Authenticate your identity to enter the SKIT proctored examination environment.
            </p>

            {/* Segmented Role Switcher */}
            <div className="grid grid-cols-2 p-1.5 mb-6 rounded-2xl liquid-glass-subtle border border-white/15 text-xs backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setRoleMode('student');
                  setErrorMessage('');
                }}
                className={`py-2.5 rounded-xl font-black transition-all duration-200 flex items-center justify-center gap-2 ${
                  roleMode === 'student'
                    ? 'bg-gradient-to-r from-neon-fuchsia via-neon-pink to-neon-violet text-white shadow-neon-fuchsia border border-white/30'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Candidate
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoleMode('admin');
                  setErrorMessage('');
                }}
                className={`py-2.5 rounded-xl font-black transition-all duration-200 flex items-center justify-center gap-2 ${
                  roleMode === 'admin'
                    ? 'bg-gradient-to-r from-neon-rose via-neon-orange to-neon-gold text-white shadow-neon-rose border border-white/30'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" /> Administrator
              </button>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-neon-rose/20 border border-neon-rose/50 flex items-start gap-2.5 text-rose-100 text-xs shadow-neon-rose backdrop-blur-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-neon-rose" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Credentials Input Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>SKIT College Email</span>
                  {roleMode === 'student' ? (
                    <span className="text-[10px] font-mono text-neon-cyan font-bold">
                      *@skit.org.in required
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-neon-gold font-bold">
                      admin@skit.org.in
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neon-cyan absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={roleMode === 'admin' ? 'admin@skit.org.in' : 'candidate@skit.org.in'}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass-subtle border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-neon-fuchsia focus:ring-2 focus:ring-neon-fuchsia/40 transition-all font-mono backdrop-blur-xl shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Security Password</span>
                  {roleMode === 'student' && (
                    <span className="text-[10px] font-mono text-neon-mint font-bold">
                      Format: name@123
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neon-amber absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl liquid-glass-subtle border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-neon-fuchsia focus:ring-2 focus:ring-neon-fuchsia/40 transition-all font-mono backdrop-blur-xl shadow-inner"
                  />
                  {/* View Password Eye Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white p-0.5 rounded-lg transition"
                    title={showPassword ? 'Hide password' : 'View password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-neon-fuchsia" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all duration-300 flex items-center justify-center gap-2 border border-white/30 active:scale-95 shadow-md ${
                  roleMode === 'admin'
                    ? 'bg-gradient-to-r from-neon-rose via-neon-orange to-neon-gold hover:opacity-95 shadow-neon-rose'
                    : 'bg-gradient-to-r from-neon-fuchsia via-neon-violet to-neon-cyan hover:opacity-95 shadow-neon-fuchsia'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin" /> Verifying Credentials...
                  </span>
                ) : (
                  <>
                    <span>Authorize & Enter Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
