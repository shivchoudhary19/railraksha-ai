# RailRaksha threat landscape

Reviewed 2026-10-12. This checks every threat item in §1 of the supplied master prompt. “Confirmed” means a cited operator, regulator or original technical investigation supports the stated event. “Reported” retains attribution and uncertainty. “General risk” is a documented threat pattern, not a finding against Indian Railways. No prevalence ranking, claimed detection accuracy or inferred railway vulnerability is used in the UI.

## Global incidents (§1.1)

| Original item | Verification/update | Source |
|---|---|---|
| SF Muni ticketing ransomware, 2016 | Confirmed. The operator described malware affecting internal IT and fare systems; train safety/operation was not compromised. Do not describe this as a signalling takeover. | [SFMTA update, 28 Nov 2016](https://www.sfmta.com/ru/node/13708) |
| Trenitalia ticketing ransomware, 2022 | Confirmed at FS Group level. Its annual report records the 23 March ransomware incident and corporate-network unavailability. “Ticketing is a top target” is an inference, not a measured ranking. | [FS Italiane 2022 annual report](https://www.fsitaliane.it/content/dam/fsitaliane/Documents/investor-relations/2022_Relazione_finanziaria_annuale_FS.pdf) |
| Danish supplier attack halted rail, 2022 | Reported with DSB attribution. Supplier Supeo shut servers after an attack on its test environment; drivers lost an operational information service. This does not establish direct signalling compromise. | [Reuters interview/report, 3 Nov 2022](https://tech.yahoo.com/general/articles/danish-train-standstill-saturday-caused-140225831.html), [European Commission ERTMS newsletter](https://transport.ec.europa.eu/document/download/a45a2829-69b9-43fc-a80d-31e9f439336b_en?filename=ertms_newsletter_2022-12.pdf&prefLang=lt) |
| Iran railway attack, 2021 | Confirmed technical investigation documents a wiper and Active Directory distribution. Avoid speculative attribution or claiming direct safety-system control. | [Original Check Point investigation](https://research.checkpoint.com/2021/indra-hackers-behind-recent-attacks-on-iran/) |
| Belarus railway hacktivism, 2022 | Reported/partly corroborated; attackers claimed encryption. Scope and claimed military disruption remain uncertain. Correct the grouping: ransomware-style encryption is not necessarily a wiper. | [RFE/RL interviews, 29 Jan 2022](https://www.rferl.org/a/belarus-railways-cyberattack-consequences/31677443.html) |
| Polish radio-stop abuse, 2023 | Confirmed by the national audit authority. Unauthorized alarm signals and ensuing mitigation are documented. This is a radio-system issue, not evidence of internet compromise. | [Poland NIK audit](https://www.nik.gov.pl/aktualnosci/spojnosc-i-infrastruktura/system-bezpieczenstwo-kolei.html) |
| UK station Wi-Fi defacement, 2024 | Confirmed public Wi-Fi incident; board minutes say wider systems were unaffected. Supplier-account causation is separately reported, not independently established by those minutes. | [Network Rail September 2024 board minutes](https://www.networkrail.co.uk/wp-content/uploads/2024/12/Board-Minutes-September-2024.pdf) |
| Recurring insider/credential abuse | General risk. No railway-specific frequency established in this review. MFA and least privilege are recommended controls, not proof of an insider incident. | [CERT-In security guidance](https://www.cert-in.org.in/s2cMainServlet?VLCODE=CIAD-2026-0020&pageid=PUBVLNOTES02) |

## Passenger threats in India (§1.2)

| Item | Evidence and bounded conclusion |
|---|---|
| 1. Fake booking/look-alike/refund websites | General impersonation risk; IRCTC warns about fraudulent communication and directs users to its own sources. No measured railway-domain prevalence established. [IRCTC email advisory](https://contents.irctc.co.in/en/Alert_Fraudulent_Emails.pdf). |
| 2. Malicious railway APKs | Confirmed warning about fake IRCTC Rail Connect APKs distributed through messaging. It does not prove every APK steals every listed credential. [IRCTC app advisory](https://lt.ncmailer.irctc.co.in/irctc_p3/vm.php?m=991&u=36f4c146494fc16b152676955b7668a0). |
| 3. Fake customer care, remote access, collect requests | Documented general financial fraud patterns. Railway-specific scale remains unverified. [RBI BE(A)WARE handbook](https://systemhealth.rbi.org.in/cms.rbi.org.in/cms/assets/Documents/BEAWARE07032022.pdf). |
| 4. SMS/email/WhatsApp phishing lures | Confirmed general/IRCTC warning. The sample cancelled-ticket, ₹5 and KYC phrases in the prompt are illustrative, not verified campaign quotations. [IRCTC email advisory](https://contents.irctc.co.in/en/Alert_Fraudulent_Emails.pdf). |
| 5. Tatkal bots/touts | Confirmed enforcement and automated booking abuse. Update the context: Railways has already implemented bot mitigation and identity controls; the product must not imply there are none. [Railways anti-bot update, June 2025](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2133796&lang=1&reg=3), [2026 parliamentary reply](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2288002&lang=2&reg=48). |
| 6. Alleged passenger-data leaks | Allegations must remain attributed. An official 2016 preliminary inquiry found no indication of IRCTC database breach. This is neither confirmation of later claims nor a guarantee against future breaches. [Railways clarification](https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=144930). No unverified leak claim is used in the UI. |
| 7. Railway recruitment scams | Confirmed government warnings about unauthorized recruitment advertisements. Verify notices with the recruitment board; no assumed universal “joining fee” rule. [Ministry of Railways warning](https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=214486). |
| 8. Lost-and-found/RPF/TTE impersonation | Plausible application of general impersonation fraud. A specific authenticated railway campaign was not established in this review; do not present it as a confirmed incident. [RBI handbook](https://systemhealth.rbi.org.in/cms.rbi.org.in/cms/assets/Documents/BEAWARE07032022.pdf). |
| 9. QR swapping at stalls/stations | QR payment scams are documented generally. Station-specific swapping prevalence is unverified. Scanning a QR to authorize payment is not a way to receive a refund. [RBI handbook](https://systemhealth.rbi.org.in/cms.rbi.org.in/cms/assets/Documents/BEAWARE07032022.pdf). |
| 10. Rogue station Wi-Fi/evil twins | General public-network risk; no assertion that an identified Indian railway network is compromised. [CERT-In individual guidance](https://www.cert-in.org.in/s2cMainServlet?VLCODE=CIAD-2026-0020&pageid=PUBVLNOTES02). |

## AI-enabled patterns (§1.3)

| Item | Verification/update |
|---|---|
| Multilingual personalized phishing | General risk supported by CERT-In. Grammar alone cannot distinguish AI-generated or fraudulent text. |
| Voice-clone/deepfake calls | General risk; no railway-specific incidence rate verified. Independently verify the caller. |
| Fake official-scheme/job videos | General deepfake impersonation risk; prompt's railway scenario is a hypothesis. |
| Crime-marketed LLMs | AI can lower attack costs; specific “WormGPT/FraudGPT” branding and vendor claims are not validated here. Do not repeat marketing as evidence. |
| AI-generated fake sites “in minutes” | General capability/risk; the exact speed/scale claim is unverified and omitted. |
| Chatbot prompt injection/data leakage | Documented application security class. No finding against a railway chatbot has been established. |
| AI CAPTCHA bypass for Tatkal | General automation risk; railway deployment and bypass effectiveness are unverified. Do not promise universal bot detection. |

Sources for these bounded classifications: [CERT-In frontier AI advisory, April 2026](https://www.cert-in.org.in/s2cMainServlet?VLCODE=CIAD-2026-0020&pageid=PUBVLNOTES02), [OWASP LLM application risks](https://owasp.org/projects/top-10-for-large-language-model-applications). None is a justification for building future AI functionality in Phase 1.

## Student risks (§1.4)

| Item | Verification/update |
|---|---|
| Fake scholarship/exam/internship/job sources | General offer/impersonation fraud; railway recruitment warning confirms one subset. Exact scholarship/exam examples remain illustrative. |
| Password reuse, absent MFA, oversharing and blackmail | General account/social engineering risks. No assertion that all students exhibit these behaviors; no population estimate verified. |
| Cracked software/mod APKs with infostealers | Untrusted software is a general malware risk; not every cracked application is proven malicious. |
| Unsafe Wi-Fi, absent backups, lost phones | General device/network/recovery risks; no student-specific prevalence verified. |
| Low awareness of DPDP rights | An unverified population assertion. Replace with a need to explain applicable rights, purposes and available grievance channels. |

References: [CERT-In awareness materials](https://www.cert-in.org.in/PDF/ISA_Booklet.pdf), [RBI fraud handbook](https://systemhealth.rbi.org.in/cms.rbi.org.in/cms/assets/Documents/BEAWARE07032022.pdf), [DPDP Act](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf). These support education, not a student-risk census.

## Operator hypotheses (§1.5)

| Item | Verification/update |
|---|---|
| Headers/TLS/admin exposure/mixed content | General web hygiene checks from [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/); no railway-system vulnerability established or probed. |
| Peak performance/accessibility and confusing errors | Design/testing concerns, not a measured defect or proven cause of fraud. Existing ticketing upgrades are described by [Railways](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2133796&lang=1&reg=3); [WCAG 2.2](https://www.w3.org/TR/WCAG22/) provides accessibility requirements. |
| No unified official verification source | Product hypothesis; individual official sources already exist. A complete national absence was not demonstrated. |
| Fragmented reporting | Product hypothesis. Established channels include the national cybercrime portal/1930 and railway grievance channels; avoid claiming there is no coordinated response. [MHA channel confirmation](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2200567&lang=1&reg=3), [139/RailMadad guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2092223&lang=2&reg=48). |
| Legacy signalling/SCADA monitoring gaps | General OT risk, not an inventory of Indian railway equipment or deficiencies. [NIST SP 800-82r3](https://csrc.nist.gov/pubs/sp/800/82/r3/final). Any eventual demonstration must remain isolated/local. |

## Proposed prioritization (§1.6)

P1 official verification, P2 look-alike sites, P3 phishing, P4 app/device safety, P5 browser warnings, P6 authorized hygiene/booking demo, P7 fairness, P8 AI defenses, P9 operator view/OT, P10 student education, P11 privacy, P12 scale and P13 ecosystem are **product roadmap hypotheses**, not validated outcomes. Their impact/feasibility ranking needs user research, data and deployment constraints. They remain future phases and are not represented as working capabilities.

## Current legal and content boundaries

MeitY published the notified [DPDP Rules, enforcement timeline and later corrigendum](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit). Commencement is phased; use the applicable notified provisions, not the January draft explanatory note. A local prototype is not a compliance certification.

[CERT-In directions](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf) and [FAQs](https://www.cert-in.org.in/PDF/FAQs_on_CyberSecurityDirections_May2022.pdf) specify incident/log obligations for covered entities. Operational reporting, retention and Indian hosting must be planned before deployment.

UI copy is limited to safe habits, independent-project identity and factual account behavior. Emergency guidance links to established national channels. No external systems were scanned, logged into, exploited or modified during this research.
