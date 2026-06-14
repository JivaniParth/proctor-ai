import { Link } from 'react-router-dom'
import {
  ArrowRight, Bot, Brain, Eye, Monitor, Shield, Zap,
  GraduationCap, Building2, Globe, BarChart3,
} from 'lucide-react'

const FEATURES = [
  { icon: Eye, title: 'Computer Vision', desc: 'MediaPipe FaceMesh gaze tracking & face presence detection via standard webcam' },
  { icon: Brain, title: 'XAI Reasoning Engine', desc: 'Autonomous agent evaluates signal patterns and produces explainable risk scores' },
  { icon: Monitor, title: 'Screen Monitoring', desc: 'Tab switching, clipboard events, and keyboard activity detection in real-time' },
  { icon: Shield, title: 'Privacy-First', desc: 'On-device inference with batched WebSocket streaming and local event buffering' },
  { icon: Zap, title: 'Real-Time Pipeline', desc: 'FastAPI WebSockets with auto-reconnect, 5-min rolling window aggregation' },
  { icon: Bot, title: 'Agentic Architecture', desc: 'Observes, reasons, prioritizes, explains, and escalates without human intervention' },
]

const STATS = [
  { value: '76%', label: 'Students admit cheating in surveys' },
  { value: '30%', label: 'Online exams face integrity violations' },
  { value: '$3B+', label: 'Global cheating industry annually' },
]

const USERS = [
  { icon: GraduationCap, title: 'Universities', desc: 'Remote exams with fair, consistent integrity monitoring' },
  { icon: Building2, title: 'Government Recruitment', desc: 'UPSC, SSC, civil service exams at massive scale' },
  { icon: Globe, title: 'Certification Bodies', desc: 'Online certification with auditable evidence trails' },
  { icon: BarChart3, title: 'Corporate Hiring', desc: 'Automated skills assessments for 10,000+ applicants' },
]

const AGENT_LOOP = ['Observe', 'Reason', 'Prioritize', 'Explain', 'Escalate']

export function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-navy-light/40" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-accent/10" />
        <div className="absolute right-1/4 top-1/3 h-2 w-2 rounded-full bg-accent/60 animate-pulse-ring" />
        <div className="absolute left-1/3 top-1/4 h-1.5 w-1.5 rounded-full bg-white/30" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="rounded-full bg-accent/20 border border-accent/40 px-3 py-1 text-xs font-semibold text-accent-light">
              Far Away Hackathon 2026
            </span>
            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/80">
              Theme: Agentic & Autonomous Systems
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight max-w-4xl">
            Proctor<span className="text-accent">AI</span>
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-white/80 max-w-2xl font-light">
            An Agentic Autonomous Exam Integrity System
          </p>
          <p className="mt-6 text-base text-white/60 max-w-xl leading-relaxed">
            Continuously observes candidate behavior, reasons over events, generates explainable decisions,
            and assists human proctors — without rigid rules or high false positives.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-light transition-colors shadow-lg shadow-accent/25"
            >
              Open Invigilator Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Configure Exam
            </Link>
            <Link
              to="/exam"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/15 transition-colors backdrop-blur-sm"
            >
              Launch Exam Client
            </Link>
          </div>

          {/* Agent loop */}
          <div className="mt-14 flex flex-wrap items-center gap-2">
            {AGENT_LOOP.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-semibold">
                  {step}
                </span>
                {i < AGENT_LOOP.length - 1 && <ArrowRight className="h-3 w-3 text-white/40" />}
              </div>
            ))}
            <span className="text-xs text-white/50 ml-2">— autonomously</span>
          </div>
        </div>
      </section>

      {/* Problem stats */}
      <section className="bg-white py-16 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-2">The Problem</h2>
          <p className="text-center text-slate-500 mb-10 max-w-xl mx-auto">
            Academic dishonesty is rising faster than traditional proctoring can handle
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface border border-slate-100 p-8 text-center">
                <p className="text-4xl font-bold text-accent">{s.value}</p>
                <p className="mt-2 text-sm text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-2">Our Solution</h2>
          <p className="text-center text-slate-500 mb-10">
            An intelligent autonomous agent that thinks like a human proctor
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white border border-slate-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/5 text-navy mb-4">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-navy mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Capture', desc: 'Webcam, screen & browser events collected via WebRTC — no install needed' },
              { step: '02', title: 'Extract', desc: 'MediaPipe tracks gaze, face presence; browser monitors tabs & clipboard' },
              { step: '03', title: 'Reason', desc: 'XAI engine evaluates 5-min signal windows with weighted rule scoring' },
              { step: '04', title: 'Alert', desc: 'Risk score updated, human-readable explanation sent to proctor dashboard' },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="rounded-2xl bg-navy p-6 text-white h-full">
                  <span className="text-3xl font-bold text-white/20">{item.step}</span>
                  <h3 className="mt-2 font-semibold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">{item.desc}</p>
                </div>
                {i < 3 && (
                  <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-navy z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target users */}
      <section className="py-16 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-10">Target Users</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USERS.map((u) => (
              <div key={u.title} className="rounded-2xl bg-white border border-slate-100 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
                  <u.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-navy">{u.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-16 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to See It in Action?
          </h2>
          <p className="text-white/70 mb-8">
            ProctorAI makes online exams fair, accessible, and fraud-proof — for every student, everywhere.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold hover:bg-accent-light transition-colors"
          >
            Launch Live Dashboard Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-6 text-xs text-white/40">
            Far Away Hackathon 2026 · ProctorAI · Agentic & Autonomous Systems
          </p>
        </div>
      </section>
    </div>
  )
}
