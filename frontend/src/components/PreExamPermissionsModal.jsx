import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Mic,
  Maximize2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Radio,
  ArrowRight,
  X,
  Volume2,
  RefreshCw,
  Lock
} from 'lucide-react';

export default function PreExamPermissionsModal({
  isOpen,
  test,
  onProceed,
  onCancel
}) {
  const [cameraStatus, setCameraStatus] = useState('pending'); // 'pending' | 'checking' | 'granted' | 'denied'
  const [micStatus, setMicStatus] = useState('pending');
  const [fullscreenStatus, setFullscreenStatus] = useState('pending');
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // 1. Request Camera Permission & Start Live Video Preview
  const requestCamera = async () => {
    try {
      setCameraStatus('checking');
      setErrorMessage('');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (constraintErr) {
        console.warn('Camera ideal constraints failed, falling back to video: true', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      cameraStreamRef.current = stream;
      setCameraStatus('granted');

      // Bind immediately if element is already available
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video auto-play deferred:', playErr);
        });
      }
    } catch (err) {
      console.error('Camera permission denied:', err);
      setCameraStatus('denied');
      setErrorMessage('Camera access was blocked. Please click the camera icon in your browser address bar to allow camera access.');
    }
  };

  // 2. Request Microphone Permission & Hook Audio Meter
  const requestMicrophone = async () => {
    try {
      setMicStatus('checking');
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setMicAudioLevel(Math.min(100, Math.round(avg * 1.5)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      setMicStatus('granted');
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setMicStatus('denied');
      setErrorMessage('Microphone access was blocked. Please authorize microphone in browser settings.');
    }
  };

  // 3. Request Fullscreen Lockdown
  const requestFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
      setFullscreenStatus('granted');
    } catch (err) {
      console.warn('Fullscreen request dismissed or blocked:', err);
      // Fallback check
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        setFullscreenStatus('granted');
      }
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => {
      const isFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setFullscreenStatus(isFull ? 'granted' : 'pending');
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
    };
  }, []);

  // Request camera and microphone automatically on mount
  useEffect(() => {
    if (isOpen) {
      requestCamera();
      requestMicrophone();
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        setFullscreenStatus('granted');
      }
    }
    return () => {
      cleanupStreams();
    };
  }, [isOpen]);

  // Ensure camera stream is assigned to video element as soon as status becomes granted
  useEffect(() => {
    if (cameraStatus === 'granted' && cameraStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-playback deferred:', err);
      });
    }
  }, [cameraStatus]);

  const cleanupStreams = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleStartExam = async () => {
    // Explicitly enter and enforce fullscreen mode upon exam entry
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen entry error on exam start:', err);
    }
    cleanupStreams();
    onProceed();
  };

  const handleCancel = () => {
    cleanupStreams();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    onCancel();
  };

  if (!isOpen || !test) return null;

  const allGranted = cameraStatus === 'granted' && micStatus === 'granted' && fullscreenStatus === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-void/85 backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl liquid-glass border border-white/20 shadow-glass-specular p-6 sm:p-8 flex flex-col text-slate-100 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-white/30 flex items-center justify-center flex-shrink-0 shadow-neon-cyan overflow-hidden">
              <img src="/skit-logo.png" alt="SKIT Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                SKIT Device & Security Authorization
              </h2>
              <p className="text-xs text-neon-mint font-mono font-bold">
                Sri Krishna Institute of Technology • Pre-Exam Integrity Verification
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Test Information Pill */}
        <div className="my-4 p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-neon-cyan uppercase font-bold tracking-wider">
              {test.department}
            </div>
            <div className="text-sm font-black text-white mt-0.5">{test.title}</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-slate-300">
              ⏱️ {test.duration_minutes || 45} Mins
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-neon-fuchsia/20 border border-neon-fuchsia/30 text-neon-fuchsia font-bold">
              3 Stages (MCQ + Code + Viva)
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-neon-rose/20 border border-neon-rose/40 text-rose-200 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 3 Permission Authorization Cards */}
        <div className="space-y-3.5 my-2">
          
          {/* Card 1: Camera Access & Optical Alignment */}
          <div className={`p-4 rounded-2xl border transition-all ${
            cameraStatus === 'granted'
              ? 'bg-neon-emerald/10 border-neon-emerald/40 text-white shadow-neon-emerald'
              : cameraStatus === 'denied'
              ? 'bg-neon-rose/10 border-neon-rose/40 text-white shadow-neon-rose'
              : 'bg-white/[0.03] border-white/10 text-slate-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  cameraStatus === 'granted' ? 'bg-neon-emerald/20 text-neon-mint' : 'bg-white/[0.08] text-slate-300'
                }`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <span>1. Webcam & Optical Proctor Sensor</span>
                    {cameraStatus === 'granted' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neon-emerald text-void font-black">
                        ✓ ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live optical verification of candidate presence, head yaw/pitch, and mobile phone avoidance.
                  </p>
                </div>
              </div>

              {cameraStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestCamera}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-teal text-void font-black text-xs font-mono uppercase tracking-wider hover:opacity-90 active:scale-95 transition"
                >
                  {cameraStatus === 'checking' ? 'Connecting...' : 'Authorize Camera'}
                </button>
              )}
            </div>

            {/* Live Video Preview Box */}
            {cameraStatus === 'granted' && (
              <div className="mt-3 relative rounded-xl overflow-hidden aspect-video max-h-48 bg-slate-950 border border-white/10 flex items-center justify-center">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                      el.srcObject = cameraStreamRef.current;
                      el.play().catch((e) => console.warn('Video play deferred:', e));
                    }
                  }}
                  playsInline
                  autoPlay
                  muted
                  onLoadedMetadata={(e) => {
                    e.target.play().catch(() => {});
                  }}
                  className="w-full h-full object-cover -scale-x-100"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-void/80 border border-white/15 text-[9px] font-mono text-neon-mint flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse" />
                  <span>Optical Stream Calibrated</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Microphone Access & Acoustic VAD */}
          <div className={`p-4 rounded-2xl border transition-all ${
            micStatus === 'granted'
              ? 'bg-neon-emerald/10 border-neon-emerald/40 text-white shadow-neon-emerald'
              : micStatus === 'denied'
              ? 'bg-neon-rose/10 border-neon-rose/40 text-white shadow-neon-rose'
              : 'bg-white/[0.03] border-white/10 text-slate-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  micStatus === 'granted' ? 'bg-neon-emerald/20 text-neon-mint' : 'bg-white/[0.08] text-slate-300'
                }`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <span>2. Microphone & Audio Stream</span>
                    {micStatus === 'granted' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neon-emerald text-void font-black">
                        ✓ ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Acoustic Voice Activity Detection (VAD) and Zam AI conversational voice viva.
                  </p>
                </div>
              </div>

              {micStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestMicrophone}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-teal text-void font-black text-xs font-mono uppercase tracking-wider hover:opacity-90 active:scale-95 transition"
                >
                  {micStatus === 'checking' ? 'Connecting...' : 'Authorize Mic'}
                </button>
              )}
            </div>

            {/* Live Audio Level Meter */}
            {micStatus === 'granted' && (
              <div className="mt-3 flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-white/10">
                <Volume2 className="w-4 h-4 text-neon-cyan flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Speak to test microphone sensitivity</span>
                    <span className="text-neon-cyan font-bold">{micAudioLevel}% Input</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-cyan via-neon-mint to-neon-fuchsia transition-all duration-75 rounded-full"
                      style={{ width: `${Math.max(5, micAudioLevel)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Fullscreen Proctor Lockdown */}
          <div className={`p-4 rounded-2xl border transition-all ${
            fullscreenStatus === 'granted'
              ? 'bg-neon-emerald/10 border-neon-emerald/40 text-white shadow-neon-emerald'
              : 'bg-white/[0.03] border-white/10 text-slate-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  fullscreenStatus === 'granted' ? 'bg-neon-emerald/20 text-neon-mint' : 'bg-white/[0.08] text-slate-300'
                }`}>
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <span>3. Fullscreen Security Lockdown</span>
                    {fullscreenStatus === 'granted' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neon-emerald text-void font-black">
                        ✓ LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Strict lockdown container. Tab switching or exiting fullscreen logs security strikes (Max 5 strikes).
                  </p>
                </div>
              </div>

              {fullscreenStatus !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestFullscreen}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white font-black text-xs font-mono uppercase tracking-wider hover:opacity-90 active:scale-95 transition shadow-neon-fuchsia"
                >
                  Enter Fullscreen
                </button>
              ) : (
                <span className="text-xs font-mono text-neon-mint font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Ready
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Security Rules Briefing */}
        <div className="my-4 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-[11px] font-mono text-slate-300 space-y-1">
          <div className="text-neon-gold font-bold flex items-center gap-1.5 uppercase text-[10px]">
            <Lock className="w-3.5 h-3.5" /> Exam Proctoring Rules Notice:
          </div>
          <div className="text-slate-400 leading-relaxed">
            • Maintain eye contact with camera; head deflections or turning away are monitored.
            <br />
            • Mobile phones and electronic devices in webcam view are strictly prohibited.
            <br />
            • Reaching <b className="text-neon-rose font-bold">5 warning strikes</b> will terminate the examination automatically.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/15 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-2xl liquid-pill text-slate-300 hover:text-white text-xs font-mono font-bold transition"
          >
            Cancel & Choose Other Test
          </button>

          <button
            type="button"
            onClick={handleStartExam}
            disabled={!allGranted}
            className={`px-6 py-2.5 rounded-2xl text-xs font-black font-mono uppercase tracking-wider flex items-center gap-2 transition-all ${
              allGranted
                ? 'bg-gradient-to-r from-neon-cyan via-neon-mint to-neon-teal text-void shadow-neon-cyan hover:scale-[1.02] active:scale-95 cursor-pointer'
                : 'bg-white/10 text-slate-500 border border-white/10 cursor-not-allowed'
            }`}
          >
            <span>Proceed to Proctored Examination</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

