'use client';

import {useState, type FormEvent} from 'react';
import type {
  AuditReport,
  VerifyAsset,
  TrainSearchResult,
  BookingTicketInfo,
  VerifyTicketResult,
  CancelTicketResult,
  GrievanceResult,
} from '@railraksha/schemas';

interface WebAuditBookingProps {
  csrfToken: string;
  initialLocale: 'en' | 'hi';
  initialTab?: 'webaudit' | 'booking' | 'verifier';
}

const labels = {
  en: {
    title: 'WebAudit & Secure Booking Blueprint',
    webaudit_tab: 'WebAudit (Asset Security)',
    booking_tab: 'Secure Booking (Demo)',
    verifier_tab: 'QR Verifier & RailMadad',

    // WebAudit
    audit_title: 'Railway Web Asset Security Audit',
    audit_subtitle: 'Evaluate TLS, security headers, DNS hygiene and file exposures with zero intrusive attacks.',
    verify_domain_label: 'Asset Ownership & Authorization',
    verify_domain_desc: 'Active deep audits require verified ownership via DNS TXT or well-known challenge.',
    domain_input: 'Target Domain / Hostname',
    domain_placeholder: 'e.g. localhost, demo-vuln.local, or yourdomain.gov.in',
    method_label: 'Verification Method',
    method_dns: 'DNS TXT Record (railraksha-verify=...)',
    method_wellknown: 'Well-Known File (/.well-known/railraksha-verify.txt)',
    register_btn: 'Generate Ownership Challenge',
    verifying_asset: 'Checking DNS / challenge file…',
    verify_asset_btn: 'Verify Ownership Now',
    asset_verified: 'Domain Ownership Verified',
    asset_unverified: 'Pending Verification',
    scan_btn: 'Run Security Audit',
    scanning: 'Auditing TLS, HTTP headers, DNS hygiene and file exposures…',
    preset_pass: 'Load Benchmark Clean (localhost - A+)',
    preset_vuln: 'Load Vulnerable Target (demo-vuln.local - D/F)',
    score_overall: 'Overall Score',
    grade: 'Security Grade',
    tls_score: 'TLS & Cipher',
    headers_score: 'Security Headers',
    dns_score: 'DNS Hygiene',
    files_score: 'File Exposure',
    findings_title: 'Security Header Findings',
    header_name: 'Header',
    header_status: 'Status',
    header_value: 'Detected Value',
    header_rec: 'Remediation',
    snippets_title: 'Copy-Paste Remediation Snippets',
    responsible_disclosure: 'Responsible Disclosure Notice: In accordance with CERT-In directions and the DPDP Act 2023, security findings on public railway infrastructure must be routed through official reporting channels, never weaponized.',

    // Booking
    booking_title: 'Secure Railway Booking Reference Architecture',
    booking_subtitle: 'Server-authoritative fares, Ed25519 digitally signed e-tickets, and tamper-proof QR validation.',
    search_trains: 'Search Available Trains',
    from_st: 'From Station',
    to_st: 'To Station',
    travel_date: 'Travel Date (YYYY-MM-DD)',
    search_btn: 'Find Trains',
    searching: 'Searching IRCTC DEMO timetable…',
    no_trains: 'No trains found for selected route.',
    trains_found: 'Available Trains on Route',
    available_seats: 'Seats Available',
    fare: 'Fare',
    passenger_name: 'Passenger Full Name',
    passenger_age: 'Age',
    book_btn: 'Confirm & Issue E-Ticket (Sandbox)',
    booking_in_progress: 'Securing seat and generating Ed25519 signature…',
    ticket_issued: 'Official E-Ticket Confirmed',
    pnr: 'PNR Number',
    cancel_btn: 'Step-Up Cancel Ticket',
    cancelling: 'Processing cancellation and refund…',
    ticket_cancelled: 'Ticket Cancelled & Refunded',
    refund_amount: 'Refund Credited',
    clerkage_fee: 'Clerkage Deducted',

    // Verifier & Grievance
    verifier_title: 'Offline E-Ticket QR Verifier',
    verifier_subtitle: 'Validate Ed25519 digital signature against RailRaksha root key to detect forged or modified tickets.',
    paste_qr: 'Scan or Paste Signed QR Payload',
    verify_qr_btn: 'Verify Cryptographic Signature',
    verifying_qr: 'Validating Ed25519 signature against PRS public key…',
    qr_authentic: 'AUTHENTIC · Official Indian Railways E-Ticket',
    qr_counterfeit: 'COUNTERFEIT / TAMPERED · Signature Verification Failed',
    load_sample_qr: 'Load Sample Ticket QR',

    grievance_title: 'RailMadad Digital Grievance',
    grievance_subtitle: 'File complaints linked to verified PNR with immutable tracking ID.',
    category_label: 'Complaint Category',
    cat_cleanliness: 'Cleanliness & Sanitation',
    cat_catering: 'Food & Catering Quality',
    cat_staff: 'Staff Behavior & TTE Conduct',
    cat_security: 'Passenger Security & RPF Support',
    cat_punctuality: 'Train Delay & Punctuality',
    description_label: 'Incident Description',
    file_grievance_btn: 'Register RailMadad Grievance',
    filing_grievance: 'Registering grievance with tracking ID…',
    grievance_filed: 'Grievance Registered',
    tracking_id: 'Tracking ID',
  },
  hi: {
    title: 'वेबऑडिट और सुरक्षित रेलवे बुकिंग ब्लूप्रिंट',
    webaudit_tab: 'वेबऑडिट (वेब सुरक्षा जाँच)',
    booking_tab: 'सुरक्षित बुकिंग (डेमो)',
    verifier_tab: 'QR सत्यापन व रेलमदद',

    // WebAudit
    audit_title: 'रेलवे वेब सुरक्षा ऑडिट',
    audit_subtitle: 'TLS, सुरक्षा हेडर, DNS स्वच्छता और फ़ाइल प्रकटीकरण का सुरक्षित व गैर-आक्रामक परीक्षण।',
    verify_domain_label: 'डोमेन स्वामित्व व प्रमाणीकरण',
    verify_domain_desc: 'विस्तृत ऑडिट के लिए DNS TXT या वेल-नोन फ़ाइल द्वारा स्वामित्व सत्यापन अनिवार्य है।',
    domain_input: 'लक्षित डोमेन / होस्टनाम',
    domain_placeholder: 'उदा. localhost, demo-vuln.local, या yourdomain.gov.in',
    method_label: 'सत्यापन विधि',
    method_dns: 'DNS TXT रिकॉर्ड (railraksha-verify=...)',
    method_wellknown: 'वेल-नोन फ़ाइल (/.well-known/railraksha-verify.txt)',
    register_btn: 'स्वामित्व चुनौती कोड प्राप्त करें',
    verifying_asset: 'DNS / फ़ाइल चुनौती की जाँच हो रही है…',
    verify_asset_btn: 'स्वामित्व सत्यापित करें',
    asset_verified: 'डोमेन स्वामित्व सत्यापित',
    asset_unverified: 'सत्यापन लंबित',
    scan_btn: 'सुरक्षा ऑडिट प्रारंभ करें',
    scanning: 'TLS, HTTP हेडर, DNS और फ़ाइलों की जाँच जारी है…',
    preset_pass: 'सुरक्षित मानक लोड करें (localhost - A+)',
    preset_vuln: 'असुरक्षित लक्ष्य लोड करें (demo-vuln.local - D/F)',
    score_overall: 'कुल सुरक्षा स्कोर',
    grade: 'सुरक्षा ग्रेड',
    tls_score: 'TLS व सिफ़र',
    headers_score: 'सुरक्षा हेडर',
    dns_score: 'DNS स्वच्छता',
    files_score: 'फ़ाइल सुरक्षा',
    findings_title: 'सुरक्षा हेडर निष्कर्ष',
    header_name: 'हेडर',
    header_status: 'स्थिति',
    header_value: 'वर्तमान मान',
    header_rec: 'सुधार का तरीका',
    snippets_title: 'सुधार कोड स्निपेट (NGINX / Apache / Cloudflare)',
    responsible_disclosure: 'ज़िम्मेदार प्रकटीकरण सूचना: CERT-In दिशानिर्देशों और DPDP अधिनियम 2023 के तहत, रेलवे बुनियादी ढाँचे पर सुरक्षा निष्कर्षों को केवल आधिकारिक माध्यमों से साझा करें।',

    // Booking
    booking_title: 'सुरक्षित रेलवे बुकिंग संदर्भ आर्किटेक्चर',
    booking_subtitle: 'सर्वर-प्राधिकृत किराया, Ed25519 डिजिटल रूप से हस्ताक्षरित ई-टिकट, और छेड़छाड़-रोधी QR सत्यापन।',
    search_trains: 'उपलब्ध ट्रेनें खोजें',
    from_st: 'कहाँ से (स्टेशन कोड)',
    to_st: 'कहाँ तक (स्टेशन कोड)',
    travel_date: 'यात्रा तिथि (YYYY-MM-DD)',
    search_btn: 'ट्रेनें खोजें',
    searching: 'IRCTC डेमो समय सारणी में खोज जारी है…',
    no_trains: 'इस मार्ग पर कोई ट्रेन उपलब्ध नहीं है।',
    trains_found: 'उपलब्ध ट्रेनें',
    available_seats: 'उपलब्ध सीटें',
    fare: 'किराया',
    passenger_name: 'यात्री का पूरा नाम',
    passenger_age: 'आयु',
    book_btn: 'ई-टिकट बुक करें (सैंडबॉक्स)',
    booking_in_progress: 'सीट आवंटित और डिजिटल हस्ताक्षर जारी हो रहा है…',
    ticket_issued: 'आधिकारिक ई-टिकट जारी',
    pnr: 'PNR नंबर',
    cancel_btn: 'टिकट रद्द करें',
    cancelling: 'टिकट रद्दीकरण और रिफ़ंड प्रक्रिया जारी…',
    ticket_cancelled: 'टिकट रद्द एवं रिफ़ंड स्वीकृत',
    refund_amount: 'रिफ़ंड राशि जमा',
    clerkage_fee: 'क्लर्केज शुल्क कटौती',

    // Verifier & Grievance
    verifier_title: 'ऑफ़लाइन ई-टिकट QR सत्यापनकर्ता',
    verifier_subtitle: 'जाली या परिवर्तित टिकटों की पहचान के लिए RailRaksha रूट कुंजी के विरुद्ध Ed25519 हस्ताक्षर की पुष्टि करें।',
    paste_qr: 'हस्ताक्षरित QR पेलोड पेस्ट या स्कैन करें',
    verify_qr_btn: 'क्रिप्टोग्राफ़िक हस्ताक्षर सत्यापित करें',
    verifying_qr: 'PRS सार्वजनिक कुंजी के विरुद्ध डिजिटल हस्ताक्षर की पुष्टि…',
    qr_authentic: 'प्रामाणिक · वैध भारतीय रेल ई-टिकट',
    qr_counterfeit: 'जाली / छेड़छाड़ किया गया · हस्ताक्षर अमान्य',
    load_sample_qr: 'नमूना टिकट QR लोड करें',

    grievance_title: 'रेलमदद डिजिटल शिकायत प्रणाली',
    grievance_subtitle: 'सत्यापित PNR से जुड़ी शिकायत दर्ज करें और ट्रैकिंग आईडी प्राप्त करें।',
    category_label: 'शिकायत श्रेणी',
    cat_cleanliness: 'सफ़ाई और स्वच्छता',
    cat_catering: 'खानपान और भोजन गुणवत्ता',
    cat_staff: 'कर्मचारी / TTE व्यवहार',
    cat_security: 'यात्री सुरक्षा व RPF सहायता',
    cat_punctuality: 'ट्रेन विलंब व समयपालन',
    description_label: 'शिकायत का विवरण',
    file_grievance_btn: 'रेलमदद शिकायत दर्ज करें',
    filing_grievance: 'शिकायत ट्रैकिंग आईडी बनाई जा रही है…',
    grievance_filed: 'शिकायत सफलतापूर्वक दर्ज',
    tracking_id: 'ट्रैकिंग आईडी',
  },
};

export function WebAuditBookingTools({
  csrfToken,
  initialLocale,
  initialTab = 'webaudit',
}: WebAuditBookingProps) {
  const [locale] = useState<'en' | 'hi'>(initialLocale);
  const t = labels[locale];
  const [activeTab, setActiveTab] = useState<'webaudit' | 'booking' | 'verifier'>(initialTab);

  // WebAudit state
  const [auditDomain, setAuditDomain] = useState('localhost');
  const [verificationMethod, setVerificationMethod] = useState<'dns_txt' | 'well_known'>('dns_txt');
  const [assetToken, setAssetToken] = useState<VerifyAsset | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'nginx' | 'apache' | 'cloudflare'>('nginx');

  // Booking state
  const [fromStation, setFromStation] = useState('NDLS');
  const [toStation, setToStation] = useState('MMCT');
  const [travelDate, setTravelDate] = useState('2026-10-15');
  const [trains, setTrains] = useState<TrainSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<TrainSearchResult | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('3A');
  const [passengerName, setPassengerName] = useState('Ramesh Sharma');
  const [passengerAge, setPassengerAge] = useState(38);
  const [passengerGender, setPassengerGender] = useState<'M' | 'F' | 'O'>('M');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<BookingTicketInfo | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelTicketResult | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Verifier & Grievance state
  const [qrInput, setQrInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyTicketResult | null>(null);
  const [grievancePnr, setGrievancePnr] = useState('');
  const [grievanceCategory, setGrievanceCategory] = useState('cleanliness');
  const [grievanceDesc, setGrievanceDesc] = useState('');
  const [grievanceLoading, setGrievanceLoading] = useState(false);
  const [grievanceResult, setGrievanceResult] = useState<GrievanceResult | null>(null);

  // --- Handlers: WebAudit ---

  const handleRegisterAsset = async (e: FormEvent) => {
    e.preventDefault();
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/tools/webaudit/assets', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({domain: auditDomain, verification_method: verificationMethod}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register asset');
      setAssetToken(data);
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleVerifyAsset = async () => {
    if (!assetToken) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch(`/api/tools/webaudit/assets/${assetToken.id}/verify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setAssetToken(data);
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/tools/webaudit/scan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({domain: auditDomain}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setAuditReport(data);
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAuditLoading(false);
    }
  };

  // --- Handlers: Booking ---

  const handleSearchTrains = async (e: FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setBookingError(null);
    try {
      const res = await fetch('/api/tools/booking/trains/search', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({from_station: fromStation, to_station: toStation, travel_date: travelDate}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Train search failed');
      setTrains(data);
      if (data.length > 0) {
        setSelectedTrain(data[0]);
        const firstClass = Object.keys(data[0].classes)[0] || '3A';
        setSelectedClass(firstClass);
      }
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTrain) return;
    setBookingLoading(true);
    setBookingError(null);
    setCancelResult(null);
    try {
      const res = await fetch('/api/tools/booking/book', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({
          train_number: selectedTrain.train_number,
          from_station: selectedTrain.from_station,
          to_station: selectedTrain.to_station,
          journey_class: selectedClass,
          travel_date: travelDate,
          passenger_name: passengerName,
          passenger_age: passengerAge,
          passenger_gender: passengerGender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setTicket(data);
      setGrievancePnr(data.pnr);
      setQrInput(data.qr_payload);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!ticket) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/tools/booking/pnr/${ticket.pnr}/cancel`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation failed');
      setCancelResult(data);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCancelLoading(false);
    }
  };

  // --- Handlers: Verifier & Grievance ---

  const handleVerifyTicketQr = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/tools/booking/verify-ticket', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({qr_payload: qrInput}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification request failed');
      setVerifyResult(data);
    } catch (err: unknown) {
      setVerifyResult({
        valid: false,
        verdict: 'counterfeit_or_tampered',
        message_en: err instanceof Error ? err.message : 'Failed to verify QR payload.',
        message_hi: 'QR पेलोड सत्यापित करने में त्रुटि।',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFileGrievance = async (e: FormEvent) => {
    e.preventDefault();
    setGrievanceLoading(true);
    setGrievanceResult(null);
    try {
      const res = await fetch('/api/tools/booking/grievances', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({
          pnr: grievancePnr,
          category: grievanceCategory,
          description: grievanceDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grievance submission failed');
      setGrievanceResult(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit grievance');
    } finally {
      setGrievanceLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="tab-group" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'webaudit'}
          className={`tab-btn ${activeTab === 'webaudit' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('webaudit')}
        >
          {t.webaudit_tab}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'booking'}
          className={`tab-btn ${activeTab === 'booking' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('booking')}
        >
          {t.booking_tab}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'verifier'}
          className={`tab-btn ${activeTab === 'verifier' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('verifier')}
        >
          {t.verifier_tab}
        </button>
      </div>

      {/* ================= TAB 1: WEBAUDIT ================= */}
      {activeTab === 'webaudit' && (
        <div>
          <div className="tool-panel">
            <h2>{t.audit_title}</h2>
            <p>{t.audit_subtitle}</p>

            <div className="tool-actions">
              <button
                type="button"
                className="button button-small button-outline"
                onClick={() => {
                  setAuditDomain('localhost');
                  setAssetToken(null);
                  setAuditReport(null);
                }}
              >
                {t.preset_pass}
              </button>
              <button
                type="button"
                className="button button-small button-outline"
                onClick={() => {
                  setAuditDomain('demo-vuln.local');
                  setAssetToken(null);
                  setAuditReport(null);
                }}
              >
                {t.preset_vuln}
              </button>
            </div>

            <form onSubmit={handleRegisterAsset}>
              <label htmlFor="audit-domain">{t.domain_input}</label>
              <input
                id="audit-domain"
                type="text"
                value={auditDomain}
                onChange={(e) => setAuditDomain(e.target.value)}
                placeholder={t.domain_placeholder}
                required
              />

              <label htmlFor="verify-method">{t.method_label}</label>
              <select
                id="verify-method"
                value={verificationMethod}
                onChange={(e) => setVerificationMethod(e.target.value as 'dns_txt' | 'well_known')}
              >
                <option value="dns_txt">{t.method_dns}</option>
                <option value="well_known">{t.method_wellknown}</option>
              </select>

              <div className="tool-actions">
                <button type="submit" className="button" disabled={auditLoading}>
                  {auditLoading ? t.scanning : t.register_btn}
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={auditLoading}
                  onClick={handleRunAudit}
                >
                  {auditLoading ? t.scanning : t.scan_btn}
                </button>
              </div>
            </form>

            {assetToken && (
              <div className="tool-feedback">
                <p>
                  <strong>{assetToken.verified ? t.asset_verified : t.asset_unverified}:</strong>{' '}
                  <span className="badge badge-pass">{assetToken.domain}</span>
                </p>
                <p>
                  <code>{locale === 'hi' ? assetToken.instructions_hi : assetToken.instructions_en}</code>
                </p>
                {!assetToken.verified && (
                  <button
                    type="button"
                    className="button button-small"
                    onClick={handleVerifyAsset}
                    disabled={auditLoading}
                  >
                    {t.verify_asset_btn}
                  </button>
                )}
              </div>
            )}

            {auditError && (
              <div className="alert alert-danger" role="alert">
                {auditError}
              </div>
            )}
          </div>

          {auditReport && (
            <div className="tool-panel">
              <h2>
                {auditReport.domain} ·{' '}
                <span className="badge badge-pass">
                  {t.grade}: {auditReport.grade}
                </span>
              </h2>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-num">{auditReport.overall_score}/100</div>
                  <div className="stat-label">{t.score_overall}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{auditReport.tls_score}/100</div>
                  <div className="stat-label">{t.tls_score}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{auditReport.headers_score}/100</div>
                  <div className="stat-label">{t.headers_score}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{auditReport.dns_score}/100</div>
                  <div className="stat-label">{t.dns_score}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{auditReport.files_score}/100</div>
                  <div className="stat-label">{t.files_score}</div>
                </div>
              </div>

              <h3>{t.findings_title}</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.header_name}</th>
                    <th>{t.header_status}</th>
                    <th>{t.header_value}</th>
                    <th>{t.header_rec}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditReport.header_findings.map((f, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{f.header}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            f.status === 'pass'
                              ? 'badge-pass'
                              : f.status === 'warning'
                              ? 'badge-warning'
                              : 'badge-fail'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <code>{f.value || 'Not configured'}</code>
                      </td>
                      <td>{locale === 'hi' ? f.recommendation_hi : f.recommendation_en}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>{t.snippets_title}</h3>
              <div className="tab-group">
                <button
                  type="button"
                  className={`tab-btn ${activeSnippetTab === 'nginx' ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveSnippetTab('nginx')}
                >
                  NGINX
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeSnippetTab === 'apache' ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveSnippetTab('apache')}
                >
                  Apache HTTPD
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeSnippetTab === 'cloudflare' ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveSnippetTab('cloudflare')}
                >
                  Cloudflare Transform Rules
                </button>
              </div>

              {auditReport.remediation_snippets
                .filter((s) => s.target === activeSnippetTab)
                .map((snip, idx) => (
                  <pre key={idx} className="code-box">
                    <code>{snip.code}</code>
                  </pre>
                ))}

              <div className="security-note">
                <p>{t.responsible_disclosure}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: SECURE BOOKING BLUEPRINT ================= */}
      {activeTab === 'booking' && (
        <div>
          <div className="tool-panel">
            <h2>{t.booking_title}</h2>
            <p>{t.booking_subtitle}</p>

            <form onSubmit={handleSearchTrains}>
              <div className="tool-grid">
                <div>
                  <label htmlFor="from-station">{t.from_st}</label>
                  <select
                    id="from-station"
                    value={fromStation}
                    onChange={(e) => setFromStation(e.target.value)}
                  >
                    <option value="NDLS">NDLS · New Delhi</option>
                    <option value="MMCT">MMCT · Mumbai Central</option>
                    <option value="HWH">HWH · Howrah Junction</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="to-station">{t.to_st}</label>
                  <select
                    id="to-station"
                    value={toStation}
                    onChange={(e) => setToStation(e.target.value)}
                  >
                    <option value="MMCT">MMCT · Mumbai Central</option>
                    <option value="LKO">LKO · Lucknow Charbagh</option>
                    <option value="BSB">BSB · Varanasi Junction</option>
                    <option value="NDLS">NDLS · New Delhi</option>
                  </select>
                </div>
              </div>

              <label htmlFor="travel-date">{t.travel_date}</label>
              <input
                id="travel-date"
                type="text"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                required
              />

              <button type="submit" className="button" disabled={searchLoading}>
                {searchLoading ? t.searching : t.search_btn}
              </button>
            </form>

            {bookingError && (
              <div className="alert alert-danger" role="alert">
                {bookingError}
              </div>
            )}
          </div>

          {trains.length > 0 && (
            <div className="tool-panel">
              <h2>{t.trains_found}</h2>
              <div className="tool-grid">
                {trains.map((tr) => (
                  <div
                    key={tr.train_number}
                    className={`card ${
                      selectedTrain?.train_number === tr.train_number ? 'verdict-official' : ''
                    }`}
                  >
                    <h3>
                      {tr.train_name} ({tr.train_number})
                    </h3>
                    <p>
                      <strong>{tr.from_station}</strong> ({tr.departure_time}) →{' '}
                      <strong>{tr.to_station}</strong> ({tr.arrival_time}) · {tr.duration}
                    </p>
                    <div className="tool-actions">
                      {Object.entries(tr.classes).map(([cls, info]) => (
                        <button
                          key={cls}
                          type="button"
                          className={`button button-small ${
                            selectedTrain?.train_number === tr.train_number &&
                            selectedClass === cls
                              ? ''
                              : 'button-outline'
                          }`}
                          onClick={() => {
                            setSelectedTrain(tr);
                            setSelectedClass(cls);
                          }}
                        >
                          {cls}: {info.available_seats} {t.available_seats} · ₹{info.fare}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTrain && (
                <div className="record-list">
                  <h3>
                    Book Seat on {selectedTrain.train_name} ({selectedClass})
                  </h3>
                  <form onSubmit={handleBookTicket}>
                    <label htmlFor="passenger-name">{t.passenger_name}</label>
                    <input
                      id="passenger-name"
                      type="text"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      required
                    />

                    <label htmlFor="passenger-age">{t.passenger_age}</label>
                    <input
                      id="passenger-age"
                      type="number"
                      min="5"
                      max="110"
                      value={passengerAge}
                      onChange={(e) => setPassengerAge(Number(e.target.value))}
                      required
                    />

                    <label htmlFor="passenger-gender">Gender</label>
                    <select
                      id="passenger-gender"
                      value={passengerGender}
                      onChange={(e) => setPassengerGender(e.target.value as 'M' | 'F' | 'O')}
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="O">Other (O)</option>
                    </select>

                    <p>
                      <strong>Server-Authoritative Fare:</strong> ₹
                      {selectedTrain.classes[selectedClass]?.fare || 0}{' '}
                      <span className="badge badge-pass">[DEMO SECURE PAYMENT GATEWAY]</span>
                    </p>

                    <button type="submit" className="button" disabled={bookingLoading}>
                      {bookingLoading ? t.booking_in_progress : t.book_btn}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {ticket && (
            <div className="tool-panel">
              <h2>{t.ticket_issued}</h2>
              <div className="ticket-view">
                <div className="pnr-display">PNR: {ticket.pnr}</div>
                <p>
                  <strong>Train:</strong> {ticket.train_name} ({ticket.train_number})
                </p>
                <p>
                  <strong>Route:</strong> {ticket.from_station} → {ticket.to_station} | Date:{' '}
                  {ticket.travel_date}
                </p>
                <p>
                  <strong>Passenger:</strong> {ticket.passenger_name} ({ticket.passenger_age} yrs, {ticket.passenger_gender}) |
                  Class: {ticket.journey_class} | Quota: {ticket.quota}
                </p>
                <p>
                  <strong>Fare:</strong> ₹{ticket.fare_inr} | Status:{' '}
                  <span className="badge badge-pass">{ticket.status}</span>
                </p>
                <p>
                  <strong>Digital Signature (Ed25519 SHA256):</strong>
                </p>
                <pre className="code-box">
                  <code>{ticket.signature}</code>
                </pre>
                <p>
                  <strong>Ticket QR Payload:</strong>
                </p>
                <pre className="code-box">
                  <code>{ticket.qr_payload}</code>
                </pre>

                <div className="tool-actions">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={handleCancelTicket}
                    disabled={cancelLoading || ticket.status === 'cancelled' || !!cancelResult}
                  >
                    {cancelLoading ? t.cancelling : t.cancel_btn}
                  </button>
                </div>
              </div>

              {cancelResult && (
                <div className="alert alert-success">
                  <strong>{t.ticket_cancelled}</strong>
                  <p>
                    {t.refund_amount}: ₹{cancelResult.refund_amount} ({t.clerkage_fee}: ₹
                    {cancelResult.cancellation_fee})
                  </p>
                  <p>{locale === 'hi' ? cancelResult.message_hi : cancelResult.message_en}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: VERIFIER & GRIEVANCE ================= */}
      {activeTab === 'verifier' && (
        <div>
          <div className="tool-panel">
            <h2>{t.verifier_title}</h2>
            <p>{t.verifier_subtitle}</p>

            <form onSubmit={handleVerifyTicketQr}>
              <label htmlFor="qr-payload">{t.paste_qr}</label>
              <textarea
                id="qr-payload"
                rows={4}
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="PNR=1234567890&TRAIN=12951&DATE=2026-10-15&PASSENGER=...&SIG=..."
                required
              />

              <div className="tool-actions">
                <button type="submit" className="button" disabled={verifyLoading}>
                  {verifyLoading ? t.verifying_qr : t.verify_qr_btn}
                </button>
              </div>
            </form>

            {verifyResult && (
              <div
                className={`tool-feedback verdict ${
                  verifyResult.valid ? 'verdict-official' : 'verdict-known_scam'
                }`}
              >
                <p>
                  <strong>
                    {verifyResult.valid ? t.qr_authentic : t.qr_counterfeit}
                  </strong>
                </p>
                <p>{locale === 'hi' ? verifyResult.message_hi : verifyResult.message_en}</p>
                {verifyResult.pnr && (
                  <p>
                    Verified PNR: <strong>{verifyResult.pnr}</strong> | Passenger:{' '}
                    {verifyResult.passenger_name}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="tool-panel">
            <h2>{t.grievance_title}</h2>
            <p>{t.grievance_subtitle}</p>

            <form onSubmit={handleFileGrievance}>
              <label htmlFor="grievance-pnr">{t.pnr}</label>
              <input
                id="grievance-pnr"
                type="text"
                pattern="[0-9]{10}"
                maxLength={10}
                value={grievancePnr}
                onChange={(e) => setGrievancePnr(e.target.value)}
                placeholder="10-digit PNR"
                required
              />

              <label htmlFor="grievance-cat">{t.category_label}</label>
              <select
                id="grievance-cat"
                value={grievanceCategory}
                onChange={(e) => setGrievanceCategory(e.target.value)}
              >
                <option value="cleanliness">{t.cat_cleanliness}</option>
                <option value="catering">{t.cat_catering}</option>
                <option value="staff_behavior">{t.cat_staff}</option>
                <option value="security">{t.cat_security}</option>
                <option value="punctuality">{t.cat_punctuality}</option>
              </select>

              <label htmlFor="grievance-desc">{t.description_label}</label>
              <textarea
                id="grievance-desc"
                rows={3}
                value={grievanceDesc}
                onChange={(e) => setGrievanceDesc(e.target.value)}
                placeholder="Details of complaint or issue..."
                required
              />

              <button type="submit" className="button" disabled={grievanceLoading}>
                {grievanceLoading ? t.filing_grievance : t.file_grievance_btn}
              </button>
            </form>

            {grievanceResult && (
              <div className="alert alert-success">
                <strong>{t.grievance_filed}</strong>
                <p>
                  {t.tracking_id}: <strong>{grievanceResult.tracking_id}</strong> | PNR:{' '}
                  {grievanceResult.pnr} | Status: {grievanceResult.status}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
