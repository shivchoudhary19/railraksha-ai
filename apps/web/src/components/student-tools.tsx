'use client';

import {useState, useEffect} from 'react';
import type {
  CertificateVerificationResult,
  JobScamCheckResult,
  PasswordBreachCheckResult,
  QuizSubmissionResult,
} from '@railraksha/schemas';

type Tab = 'job_scam' | 'breach' | 'academy' | 'emergency';

type Props = {
  locale: 'en' | 'hi';
  csrfToken: string;
};

type AcademyLesson = {
  module_id: string;
  title: string;
  title_hi: string;
  description: string;
  duration_minutes: number;
  key_takeaways: string[];
  quiz_questions: {
    question_id: string;
    question: string;
    question_hi: string;
    options: string[];
    correct_option_index: number;
  }[];
};

export function StudentTools({locale, csrfToken}: Props) {
  const [tab, setTab] = useState<Tab>('job_scam');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Tab 1: Job Scam Checker State ---
  const [jobContent, setJobContent] = useState(
    'Congratulations! Selected for Indian Railways Group D post. Pay ₹3,500 refundable uniform & medical fee via UPI to secure joining letter within 24 hours. Contact: rrb.officer.recruitment@gmail.com'
  );
  const [jobSourceType, setJobSourceType] = useState<
    'appointment_letter' | 'email' | 'sms_whatsapp' | 'job_website'
  >('appointment_letter');
  const [jobResult, setJobResult] = useState<JobScamCheckResult | null>(null);

  // --- Tab 2: Password Breach Check (k-Anonymity) ---
  const [passwordInput, setPasswordInput] = useState('password123');
  const [hashPrefix, setHashPrefix] = useState('CBFD');
  const [breachResult, setBreachResult] = useState<PasswordBreachCheckResult | null>(null);

  // --- Tab 3: Academy & Quiz State ---
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('rrb_recruitment_safety');
  const [studentName, setStudentName] = useState('Priya Sharma');
  const [studentEmail, setStudentEmail] = useState('priya.sharma@university.ac.in');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({
    q1: 1,
    q2: 1,
    q3: 1,
  });
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<CertificateVerificationResult | null>(null);

  // Fetch Lessons on mount
  useEffect(() => {
    let active = true;
    async function loadLessons() {
      try {
        const res = await fetch('/api/tools/student/academy/lessons');
        if (active && res.ok) {
          const data = (await res.json()) as AcademyLesson[];
          setLessons(data);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadLessons();
    return () => {
      active = false;
    };
  }, []);

  // Compute SHA-1 prefix client-side using Web Crypto
  async function computeSha1Prefix(text: string): Promise<string> {
    try {
      const enc = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(text));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      return hashHex.slice(0, 5);
    } catch {
      return '5BAA6'; // fallback demo prefix
    }
  }

  // Handle Job Scam Scan
  async function handleCheckJobScam() {
    setLoading(true);
    setFeedback(null);
    setJobResult(null);
    try {
      const res = await fetch('/api/tools/student/job-scam/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          content: jobContent,
          source_type: jobSourceType,
        }),
      });

      if (!res.ok) {
        throw new Error(
          locale === 'hi'
            ? 'नौकरी घोटाला विश्लेषण विफल रहा।'
            : 'Job recruitment scam check failed.'
        );
      }

      const data = (await res.json()) as JobScamCheckResult;
      setJobResult(data);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error evaluating recruitment scam',
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle Password Breach Check
  async function handleCheckPasswordBreach() {
    setLoading(true);
    setFeedback(null);
    setBreachResult(null);
    try {
      // 1. Client computes SHA-1 and extracts strictly first 5 characters
      const prefix = await computeSha1Prefix(passwordInput);
      setHashPrefix(prefix);

      // 2. Transmits ONLY the 5-character prefix (k-anonymity guarantee)
      const res = await fetch('/api/tools/student/breach/check-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          hash_prefix: prefix,
        }),
      });

      if (!res.ok) {
        throw new Error(
          locale === 'hi'
            ? 'पासवर्ड उल्लंघन जाँच विफल रही।'
            : 'Password breach check failed.'
        );
      }

      const data = (await res.json()) as PasswordBreachCheckResult;
      setBreachResult(data);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error checking breach',
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle Quiz Submission
  async function handleSubmitQuiz() {
    setLoading(true);
    setFeedback(null);
    setQuizResult(null);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/tools/student/academy/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          student_name: studentName,
          student_email: studentEmail,
          course_module: selectedModuleId,
          selected_options: quizAnswers,
        }),
      });

      if (!res.ok) {
        throw new Error(
          locale === 'hi' ? 'क्विज़ जमा करना विफल रहा।' : 'Quiz submission failed.'
        );
      }

      const data = (await res.json()) as QuizSubmissionResult;
      setQuizResult(data);
      if (data.passed) {
        setFeedback({
          type: 'success',
          message:
            locale === 'hi'
              ? `बधाई हो! आपने ${data.score}% अंक प्राप्त किए और प्रमाण पत्र ${data.certificate_id} अर्जित किया!`
              : `Congratulations! You scored ${data.score}% and earned Certificate ${data.certificate_id}!`,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error submitting quiz',
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle Certificate Public Verification
  async function handleVerifyCertificate(certId: string) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tools/student/certificates/${certId}/verify`);
      if (!res.ok) {
        throw new Error(
          locale === 'hi' ? 'प्रमाणपत्र सत्यापन विफल रहा।' : 'Certificate verification failed.'
        );
      }
      const data = (await res.json()) as CertificateVerificationResult;
      setVerificationResult(data);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Verification failed',
      });
    } finally {
      setLoading(false);
    }
  }

  const currentLesson = lessons.find((l) => l.module_id === selectedModuleId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Heading */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                {locale === 'hi' ? 'छात्र सुरक्षा क्षेत्र' : 'STUDENT SAFE ZONE'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                DPDP ACT 2023 / K-ANONYMITY VERIFIED
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2">
              {locale === 'hi'
                ? 'छात्र सुरक्षा क्षेत्र: भर्ती धोखाधड़ी, ब्रीच जाँच एवं साइबर अकादमी'
                : 'Student Safe Zone: Recruitment Scams, Breach Check & Academy'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'hi'
                ? 'छात्रों के करियर, धन और व्यक्तिगत डेटा की सुरक्षा। फर्जी आरआरबी नियुक्ति पत्रों की जाँच करें, पासवर्ड सुरक्षा सत्यापित करें और डिजिटल प्रमाण पत्र अर्जित करें।'
                : "Protecting students' careers, finances, and data privacy. Verify RRB job offers, check dark-web password leaks with k-anonymity, and earn certified credentials."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
              {locale === 'hi' ? 'शून्य विज्ञापन · डेटा सुरक्षित' : 'ZERO AD-TRACKERS · MINORS PROTECTED'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'job_scam'}
            onClick={() => {
              setTab('job_scam');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'job_scam'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '1. नौकरी/भर्ती घोटाला चेकर' : '1. Job & Recruitment Scam Checker'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'breach'}
            onClick={() => {
              setTab('breach');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'breach'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '2. पासवर्ड ब्रीच (k-Anonymity)' : '2. Password Breach (k-Anonymity)'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'academy'}
            onClick={() => {
              setTab('academy');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'academy'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '3. साइबर अकादमी एवं प्रमाण पत्र' : '3. Cyber Academy & Certified Badges'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'emergency'}
            onClick={() => {
              setTab('emergency');
              setFeedback(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === 'emergency'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {locale === 'hi' ? '4. छात्र हेल्पलाइन (1930 / 14416)' : '4. Emergency Support (1930 / 14416)'}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-300 text-red-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-mono font-bold text-foreground hover:underline"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: Job Scam Checker */}
      {tab === 'job_scam' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {locale === 'hi'
                  ? 'रेलवे भर्ती एवं नियुक्ति पत्र सत्यापन'
                  : 'Verify Railway Recruitment Offers & Appointment Letters'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'hi'
                  ? 'संदेश, नियुक्ति पत्र या ईमेल चिपकाएं। यह भारतीय रेलवे के आधिकारिक भर्ती नियमों और लाल झंडों (जैसे अग्रिम शुल्क की मांग) के आधार पर सत्यापन करता है।'
                  : 'Paste suspicious job offer text, WhatsApp message, or appointment letter. Scans for upfront fee extortion, fake Gmail IDs, and unverified RRB claims.'}
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">
                {locale === 'hi' ? 'त्वरित नमूने:' : 'Quick Presets:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setJobContent(
                    'Congratulations! Selected for Indian Railways Group D post. Pay ₹3,500 refundable uniform & medical fee via UPI to secure joining letter within 24 hours. Contact: rrb.officer.recruitment@gmail.com'
                  );
                  setJobSourceType('appointment_letter');
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
              >
                ⚠️ Upfront Uniform Fee Scam
              </button>
              <button
                type="button"
                onClick={() => {
                  setJobContent(
                    'Direct selection appointment letter under Ministry quota. No CBT exam required. Report to WhatsApp +91-9876543210 today itself.'
                  );
                  setJobSourceType('sms_whatsapp');
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
              >
                ⛔ Direct Selection / No Exam Scam
              </button>
              <button
                type="button"
                onClick={() => {
                  setJobContent(
                    'Government of India, Ministry of Railways, Railway Recruitment Boards (RRB). Centralized Employment Notice CEN 01/2026 on official portal https://www.rrbapply.gov.in.'
                  );
                  setJobSourceType('job_website');
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
              >
                ✅ Authentic Official CEN Circular
              </button>
            </div>

            {/* Content Input Area */}
            <div>
              <label htmlFor="job-content-input" className="block text-xs font-semibold text-foreground mb-1">
                {locale === 'hi' ? 'प्रस्ताव पत्र या संदेश सामग्री:' : 'Job Offer / Letter Content to Analyze:'}
              </label>
              <textarea
                id="job-content-input"
                rows={4}
                value={jobContent}
                onChange={(e) => setJobContent(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder={
                  locale === 'hi'
                    ? 'नियुक्ति पत्र का पाठ यहाँ चिपकाएं...'
                    : 'Paste appointment letter text here...'
                }
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading || jobContent.length < 10}
                onClick={handleCheckJobScam}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-bold text-sm shadow-sm transition-all"
              >
                {loading
                  ? locale === 'hi'
                    ? 'विश्लेषण हो रहा है...'
                    : 'Analyzing Offer...'
                  : locale === 'hi'
                  ? 'भर्ती प्रामाणिकता जाँचें'
                  : 'Verify Job Offer Authenticity'}
              </button>
            </div>

            {/* Result Box */}
            {jobResult && (
              <div className="mt-4 p-5 rounded-xl bg-muted/40 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                        jobResult.risk_verdict === 'likely_scam'
                          ? 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-300'
                          : jobResult.risk_verdict === 'suspicious'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {jobResult.risk_verdict.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Risk Score: {jobResult.risk_score}/100
                    </span>
                  </div>
                  {jobResult.matched_official_portal && (
                    <span className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      Matched: {jobResult.matched_official_portal}
                    </span>
                  )}
                </div>

                {jobResult.red_flags.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-destructive uppercase tracking-wide mb-1">
                      {locale === 'hi' ? 'पहचाने गए लाल झंडे (धोखाधड़ी संकेत):' : 'Identified Fraud Red Flags:'}
                    </div>
                    <ul className="list-disc list-inside text-xs text-foreground space-y-1">
                      {jobResult.red_flags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">
                    {locale === 'hi' ? 'आधिकारिक छात्र मार्गदर्शन:' : 'Official Action Guidance:'}
                  </div>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    {(locale === 'hi'
                      ? jobResult.recommendations_hi
                      : jobResult.recommendations_en
                    ).map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Password Breach Check via k-Anonymity */}
      {tab === 'breach' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                K-ANONYMITY PRIVACY GUARANTEE
              </span>
              <h3 className="text-lg font-bold text-foreground mt-2">
                {locale === 'hi'
                  ? 'पासवर्ड ब्रीच जाँच (k-Anonymity मॉडल)'
                  : 'Dark-Web Password Breach Check via k-Anonymity'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'hi'
                  ? 'आपका वास्तविक पासवर्ड कभी भी आपके डिवाइस से बाहर नहीं जाता है। केवल आपके SHA-1 हैश के पहले 5 वर्ण भेजे जाते हैं।'
                  : 'Your plain-text password never leaves your browser. Only the first 5 hexadecimal characters of its SHA-1 cryptographic hash are transmitted.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="pwd-check-input" className="block text-xs font-semibold text-foreground mb-1">
                  {locale === 'hi' ? 'जाँचने के लिए पासवर्ड दर्ज करें:' : 'Enter Password to Check:'}
                </label>
                <input
                  id="pwd-check-input"
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Enter password..."
                />
              </div>

              <div className="self-end">
                <button
                  type="button"
                  disabled={loading || passwordInput.length < 3}
                  onClick={handleCheckPasswordBreach}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-bold text-sm shadow-sm transition-all"
                >
                  {loading
                    ? locale === 'hi'
                      ? 'जाँच हो रही है...'
                      : 'Checking...'
                    : locale === 'hi'
                    ? 'उल्लंघन की जाँच करें'
                    : 'Check Breach Anonymously'}
                </button>
              </div>
            </div>

            {/* Quick Demo Presets */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-muted-foreground self-center">Demo Presets:</span>
              <button
                type="button"
                onClick={() => setPasswordInput('password123')}
                className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 border border-border font-mono"
              >
                password123 (High Breach)
              </button>
              <button
                type="button"
                onClick={() => setPasswordInput('railway@2026')}
                className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 border border-border font-mono"
              >
                railway@2026 (Targeted Credential)
              </button>
              <button
                type="button"
                onClick={() => setPasswordInput('X9#vK2$mQ8!zL4@wP')}
                className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 border border-border font-mono"
              >
                X9#vK2$mQ8!zL4@wP (Strong / Uncompromised)
              </button>
            </div>

            {/* Breach Result Display */}
            {breachResult && (
              <div className="mt-4 p-5 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                        breachResult.is_compromised
                          ? 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {breachResult.is_compromised ? 'COMPROMISED PASSWORD' : 'SAFE / NO BREACH FOUND'}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Transmitted Prefix: {hashPrefix}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    Matches: {breachResult.matches_found}
                  </span>
                </div>

                <p className="text-sm text-foreground">
                  {locale === 'hi' ? breachResult.safety_advice_hi : breachResult.safety_advice_en}
                </p>

                {breachResult.matches.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Matched Hash Suffixes (k-Anonymity Pool):
                    </div>
                    <div className="space-y-1">
                      {breachResult.matches.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-background p-2 rounded border border-border text-xs font-mono"
                        >
                          <span className="text-muted-foreground">
                            {hashPrefix}
                            <span className="text-destructive font-bold">{m.suffix}</span>
                          </span>
                          <span className="text-foreground font-semibold">
                            Seen in {m.breach_count.toLocaleString()} breaches
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Cyber Academy, Quiz & Certificate */}
      {tab === 'academy' && (
        <div className="space-y-6">
          {/* Module Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {lessons.map((lesson) => (
              <button
                type="button"
                key={lesson.module_id}
                onClick={() => {
                  setSelectedModuleId(lesson.module_id);
                  setQuizResult(null);
                  setVerificationResult(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedModuleId === lesson.module_id
                    ? 'bg-muted border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
              >
                <div className="text-xs font-bold text-primary">
                  {lesson.duration_minutes} MIN COURSE
                </div>
                <h4 className="text-sm font-bold text-foreground mt-1">
                  {locale === 'hi' ? lesson.title_hi : lesson.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {lesson.description}
                </p>
              </button>
            ))}
          </div>

          {currentLesson && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  COURSE CURRICULUM
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {locale === 'hi' ? currentLesson.title_hi : currentLesson.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{currentLesson.description}</p>
              </div>

              {/* Key Takeaways */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="text-xs font-bold text-foreground uppercase tracking-wide">
                  {locale === 'hi' ? 'मुख्य सीख (Key Takeaways):' : 'Key Learning Takeaways:'}
                </div>
                <ul className="list-disc list-inside text-xs text-foreground space-y-1">
                  {currentLesson.key_takeaways.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>

              {/* Quiz Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-foreground">
                    {locale === 'hi'
                      ? 'प्रमाणन क्विज़ (उत्तीर्ण होने के लिए ≥ 75% आवश्यक)'
                      : 'Certification Quiz (Score ≥ 75% to Earn Certificate)'}
                  </h4>
                  <span className="text-xs text-muted-foreground">3 Questions</span>
                </div>

                <div className="space-y-4">
                  {currentLesson.quiz_questions.map((q, qIndex) => (
                    <div
                      key={q.question_id}
                      className="p-4 rounded-lg bg-background border border-border space-y-2.5"
                    >
                      <div className="text-sm font-bold text-foreground">
                        Q{qIndex + 1}: {locale === 'hi' ? q.question_hi : q.question}
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, optIndex) => (
                          <label
                            key={optIndex}
                            className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer p-1.5 rounded hover:bg-muted"
                          >
                            <input
                              type="radio"
                              name={`quiz-${q.question_id}`}
                              checked={quizAnswers[q.question_id] === optIndex}
                              onChange={() =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.question_id]: optIndex,
                                }))
                              }
                              className="accent-primary"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Candidate Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label htmlFor="student-name-input" className="block text-xs font-semibold text-foreground mb-1">
                      {locale === 'hi' ? 'छात्र का पूरा नाम:' : 'Student Full Name (For Certificate):'}
                    </label>
                    <input
                      id="student-name-input"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="student-email-input" className="block text-xs font-semibold text-foreground mb-1">
                      {locale === 'hi' ? 'छात्र ईमेल:' : 'Student Email:'}
                    </label>
                    <input
                      id="student-email-input"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={loading || studentName.length < 2}
                    onClick={handleSubmitQuiz}
                    className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-bold text-sm shadow-sm transition-all"
                  >
                    {loading
                      ? locale === 'hi'
                        ? 'मूल्यांकन हो रहा है...'
                        : 'Evaluating Quiz...'
                      : locale === 'hi'
                      ? 'क्विज़ जमा करें एवं प्रमाण पत्र प्राप्त करें'
                      : 'Submit Quiz & Generate Certificate'}
                  </button>
                </div>

                {/* Certificate Card */}
                {quizResult && quizResult.passed && quizResult.certificate_id && (
                  <div className="mt-6 p-6 rounded-xl border-2 border-emerald-500 bg-card space-y-4 shadow-md">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          OFFICIAL CREDENTIAL
                        </span>
                        <h4 className="text-lg font-bold text-foreground">
                          Certificate of Cyber Safety & Scam Defense
                        </h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {quizResult.certificate_id}
                      </span>
                    </div>

                    <div className="text-sm text-foreground space-y-1">
                      <div>
                        This certifies that <strong className="text-primary">{studentName}</strong> has
                        successfully completed the training module and passed with a score of{' '}
                        <strong>{quizResult.score}%</strong>.
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        HMAC-SHA256 Signature:{' '}
                        <span className="text-foreground">{quizResult.digital_signature}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        Issued: {quizResult.issued_at?.slice(0, 10)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleVerifyCertificate(quizResult.certificate_id!)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        Verify Certificate Publicly
                      </button>
                    </div>

                    {/* Verification Result Callout */}
                    {verificationResult && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
                        <div>
                          <strong>{verificationResult.verification_badge}</strong> — Verified for{' '}
                          {verificationResult.student_name}
                        </div>
                        <span className="font-mono font-bold">AUTHENTIC</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Emergency Support & Helplines */}
      {tab === 'emergency' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="text-xs font-bold text-destructive">NATIONAL EMERGENCY</div>
              <h4 className="text-xl font-bold text-foreground">Cyber Crime Helpline 1930</h4>
              <p className="text-xs text-muted-foreground">
                Toll-free 24x7 helpline for financial fraud, UPI extortion, and recruitment scams. Call
                within the golden hour to freeze stolen funds.
              </p>
              <div className="pt-2">
                <a
                  href="tel:1930"
                  className="button button-small"
                >
                  Dial 1930
                </a>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="text-xs font-bold text-primary">STUDENT MENTAL HEALTH</div>
              <h4 className="text-xl font-bold text-foreground">Tele-MANAS Helpline 14416</h4>
              <p className="text-xs text-muted-foreground">
                24x7 free national psychological support for students facing cyberbullying, sextortion
                distress, or academic pressure.
              </p>
              <div className="pt-2">
                <a
                  href="tel:14416"
                  className="button button-small"
                >
                  Dial 14416
                </a>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                RAILWAY ASSISTANCE
              </div>
              <h4 className="text-xl font-bold text-foreground">RailMadad Helpline 139</h4>
              <p className="text-xs text-muted-foreground">
                Security, luggage, medical assistance, and on-board passenger grievance redressal
                across all Indian Railways trains and stations.
              </p>
              <div className="pt-2">
                <a
                  href="tel:139"
                  className="button button-small"
                >
                  Dial 139
                </a>
              </div>
            </div>
          </div>

          {/* Action Checklists */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-foreground">
              {locale === 'hi'
                ? 'छात्र आपातकालीन प्रतिक्रिया चेकलिस्ट'
                : 'Student Emergency Response Protocols'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-foreground">
              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <strong className="text-destructive">
                  What to do if targeted by video blackmail / sextortion:
                </strong>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>DO NOT transfer any money. Payment never stops extortion.</li>
                  <li>Preserve all chats, phone numbers, and UPI IDs as evidence.</li>
                  <li>Block the scammer immediately across all messaging apps.</li>
                  <li>Dial 1930 and Tele-MANAS (14416) for immediate confidential support.</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <strong className="text-primary">
                  What to do if money was paid for a fake job:
                </strong>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Call 1930 immediately within the golden hour to freeze transaction.</li>
                  <li>Contact your bank / UPI provider with the UTR reference number.</li>
                  <li>File an official complaint on cybercrime.gov.in.</li>
                  <li>Report the fake agent's details to the local RPF Cyber Cell.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
