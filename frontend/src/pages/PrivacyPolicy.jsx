import { Link } from 'react-router-dom'
import { Shield, ChevronRight, Mail, AlertCircle } from 'lucide-react'

const POLICY_VERSION = '1.0'
const EFFECTIVE_DATE = 'June 14, 2026'
const CONTACT_EMAIL  = 'privacy@proctorai.io'

const SECTION = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-xl font-bold text-navy mb-3">{title}</h2>
    <div className="space-y-3 text-slate-600 leading-relaxed text-sm">{children}</div>
  </section>
)

const TOC_ITEMS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'collected',  label: 'Data We Collect' },
  { id: 'audio',      label: 'Audio & Microphone' },
  { id: 'video',      label: 'Video & Webcam' },
  { id: 'gaze',       label: 'Gaze Tracking' },
  { id: 'keystrokes', label: 'Keystroke Monitoring' },
  { id: 'browser',    label: 'Browser Events' },
  { id: 'consent',    label: 'Consent & Audit Trail' },
  { id: 'storage',    label: 'Data Storage & Retention' },
  { id: 'access',     label: 'Who Has Access' },
  { id: 'rights',     label: 'Your Rights' },
  { id: 'contact',    label: 'Contact' },
]

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-navy text-white py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-4">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span>Privacy Policy</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 shrink-0">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-white/70 mt-1 text-sm">
                Version {POLICY_VERSION} · Effective {EFFECTIVE_DATE}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar ToC */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Contents</p>
            <nav className="space-y-1">
              {TOC_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-navy/5 hover:text-navy transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="lg:col-span-3 space-y-10">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> You must read and agree to this policy before beginning any exam
              administered through ProctorAI. By checking the consent checkbox on the exam screen, you acknowledge
              that you have read and understood everything on this page.
            </p>
          </div>

          <SECTION id="overview" title="Overview">
            <p>
              ProctorAI is an automated exam integrity system that monitors student behavior during
              online examinations. This policy describes what personal data we collect during an exam session,
              how it is used, who can access it, how long it is retained, and what rights you have over your data.
            </p>
            <p>
              We collect only the minimum data necessary to assess exam integrity. We do not sell, share, or
              use your data for advertising or any purpose unrelated to exam administration.
            </p>
          </SECTION>

          <SECTION id="collected" title="Data We Collect">
            <p>During an active exam session, ProctorAI may collect the following categories of data:</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Data Type</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Purpose</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Webcam video footage', 'Verify identity; detect absence from seat', 'Yes'],
                    ['Microphone audio', 'Detect unauthorized verbal communication', 'Yes'],
                    ['Gaze direction (simulated)', 'Detect looking away from screen', 'Yes'],
                    ['Keystroke characters', 'Detect copy-paste or unusual typing patterns', 'Yes'],
                    ['Browser tab switches', 'Detect navigation away from exam', 'Yes'],
                    ['Clipboard paste events', 'Detect pasted external content', 'Yes'],
                    ['Face presence detection', 'Verify student remains in frame', 'Yes'],
                    ['Browser metadata (user-agent, screen size)', 'Consent audit trail', 'Yes'],
                    ['IP address (backend logging)', 'Session identification', 'When backend is active'],
                  ].map(([type, purpose, req]) => (
                    <tr key={type} className="text-slate-600">
                      <td className="px-4 py-2 font-medium">{type}</td>
                      <td className="px-4 py-2">{purpose}</td>
                      <td className={`px-4 py-2 font-semibold ${req === 'Yes' ? 'text-red-600' : 'text-amber-600'}`}>{req}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SECTION>

          <SECTION id="audio" title="Audio & Microphone Recording">
            <p>
              <strong className="text-navy">What we collect:</strong> ProctorAI requests access to your device's
              microphone. The microphone audio is included in the combined session recording (`.webm` file) alongside
              your webcam footage. Additionally, the system performs <em>voice activity detection</em> — it measures
              the volume level of your microphone every 250 milliseconds to detect if sustained speech is occurring.
            </p>
            <p>
              <strong className="text-navy">What we do NOT collect:</strong> Voice activity detection does NOT
              transcribe, analyse, or store the content of your speech. Only a binary signal ("speech detected / not detected")
              is logged as an event.
            </p>
            <p>
              <strong className="text-navy">Why it is required:</strong> Unauthorized verbal communication with
              other persons during an examination constitutes academic misconduct. Audio monitoring is therefore
              a mandatory component of exam proctoring. The exam cannot begin without microphone access.
            </p>
            <p>
              <strong className="text-navy">Legal basis:</strong> You provide explicit informed consent to audio
              recording by agreeing to this policy before the exam begins. A timestamped consent record is stored
              as described in the Consent section below.
            </p>
          </SECTION>

          <SECTION id="video" title="Video & Webcam Footage">
            <p>
              Your webcam is activated when the exam begins and remains active for the full duration. Video is
              recorded locally in your browser using the <code className="bg-slate-100 px-1 rounded text-xs">MediaRecorder</code> API.
              The combined audio-video file is available for download at the end of the exam and may be transmitted
              to the exam institution's server depending on backend configuration.
            </p>
            <p>
              A question number label is overlaid on the bottom-right corner of the webcam feed during recording
              to provide an evidence timestamp per question. This overlay does not obscure your face.
            </p>
            <p>
              If the system flags your session as high-risk (RED severity), a still frame from your webcam is
              captured at the moment of escalation and associated with the integrity report.
            </p>
          </SECTION>

          <SECTION id="gaze" title="Gaze Direction Tracking">
            <p>
              ProctorAI estimates your gaze direction (center / left / right) using a simulated model that responds
              to interaction patterns. In future versions, MediaPipe FaceMesh may be used for precise gaze estimation
              via your webcam — this would process video frames locally in-browser and would not transmit facial
              landmark data to any server.
            </p>
            <p>
              Gaze events where your eyes are detected away from the screen for extended periods are flagged and
              contribute to your risk score. The 5-second gaze window before each answer submission is recorded
              and included in the integrity report.
            </p>
          </SECTION>

          <SECTION id="keystrokes" title="Keystroke Content Monitoring">
            <p>
              <strong className="text-navy">What we collect:</strong> ProctorAI captures the printable characters
              you type during the exam session — this includes letters, numbers, and symbols typed anywhere in the
              browser window while the exam is active.
            </p>
            <p>
              <strong className="text-navy">What we do NOT collect:</strong> Passwords, content typed in other
              browser windows or applications, or keystrokes from outside the exam tab.
            </p>
            <p>
              <strong className="text-navy">Purpose:</strong> Keystroke patterns are analysed to detect anomalies
              such as unusually fast answer completion that may indicate copy-pasting or external assistance.
              The keystroke transcript per question is included in the post-exam integrity report available
              to the invigilator.
            </p>
            <p className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-800">
              <strong>Note:</strong> Keystroke monitoring captures the characters you type, not the specific
              keyboard key names. Modifier keys (Ctrl, Alt, Meta, Shift) and function keys are not logged.
            </p>
          </SECTION>

          <SECTION id="browser" title="Browser & System Events">
            <p>
              The following browser-level events are monitored and logged with timestamps:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Tab/window switches</strong> — detected via the Page Visibility API</li>
              <li><strong>Clipboard paste events</strong> — detected via the <code className="bg-slate-100 px-1 rounded text-xs">paste</code> event listener</li>
              <li><strong>Keystroke count</strong> — total number of keystrokes per session and per question</li>
            </ul>
            <p>
              Events are transmitted to the exam server via WebSocket when connected. If the server is temporarily
              unavailable, events are buffered locally and synced when the connection is restored.
            </p>
          </SECTION>

          <SECTION id="consent" title="Consent & Audit Trail">
            <p>
              When you agree to this policy on the pre-exam screen, ProctorAI creates a <strong>consent record</strong>
              containing the following information:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Timestamp of agreement (ISO 8601, UTC)</li>
              <li>Exam ID and exam name</li>
              <li>Browser user-agent string (browser type and OS)</li>
              <li>Browser language setting</li>
              <li>System timezone</li>
              <li>Screen resolution</li>
              <li>Privacy policy version number agreed to</li>
            </ul>
            <p>
              This record is stored in your browser's <code className="bg-slate-100 px-1 rounded text-xs">localStorage</code>
              immediately and transmitted to the backend server when available. It serves as the auditable evidence
              that consent was given before any monitoring began.
            </p>
          </SECTION>

          <SECTION id="storage" title="Data Storage & Retention">
            <p>
              <strong className="text-navy">Session recording:</strong> The combined audio-video recording is
              stored as a browser Blob URL and is only available for download — it is never automatically uploaded.
              Once the browser tab is closed, the Blob is released from memory unless saved.
            </p>
            <p>
              <strong className="text-navy">Server storage:</strong> When a backend server is configured by your
              institution, monitoring events, consent records, and exam configurations are stored in the institution's
              database. Retention periods are set by the institution (typically 90 days after the exam).
            </p>
            <p>
              <strong className="text-navy">Local storage:</strong> Exam configuration and offline event buffers
              are stored in your browser's localStorage. These are cleared on exam submission or can be manually
              cleared via browser settings.
            </p>
          </SECTION>

          <SECTION id="access" title="Who Has Access to Your Data">
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Invigilators / Proctors</strong> — see live monitoring data and flag timeline via the dashboard</li>
              <li><strong>Exam administrators</strong> — access full integrity reports including webcam footage, gaze analysis, and keystroke transcripts</li>
              <li><strong>ProctorAI system</strong> — processes data locally in-browser; no data is shared with third parties</li>
              <li><strong>Third parties</strong> — none; your data is never sold or shared outside your institution</li>
            </ul>
          </SECTION>

          <SECTION id="rights" title="Your Rights">
            <p>Depending on your jurisdiction, you may have the following rights regarding your exam data:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Right to access</strong> — request a copy of the data collected during your exam</li>
              <li><strong>Right to erasure</strong> — request deletion of your exam data after the appeal/dispute period</li>
              <li><strong>Right to object</strong> — if you believe monitoring was conducted improperly</li>
              <li><strong>Right to rectification</strong> — if your data is inaccurate</li>
            </ul>
            <p>
              To exercise these rights, contact your exam institution's data protection officer or reach us using
              the contact details below. Requests will be processed within 30 days.
            </p>
          </SECTION>

          <SECTION id="contact" title="Contact">
            <p>
              For questions about this privacy policy or to exercise your data rights, contact:
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-navy shrink-0" />
              <div>
                <p className="font-semibold text-navy text-sm">ProctorAI Privacy Team</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent text-sm hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Policy version {POLICY_VERSION} · Effective {EFFECTIVE_DATE} ·
              ProctorAI — Agentic Autonomous Exam Integrity System
            </p>
          </SECTION>
        </main>
      </div>
    </div>
  )
}
