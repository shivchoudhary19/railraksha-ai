/**
 * RailRaksha Official TypeScript Client SDK
 * Enables banks, UPI apps, telecom operators, and universities to verify railway entities in <10ms.
 */

export interface RailRakshaClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface VerifyResult {
  identifier: string;
  classification: "OFFICIAL" | "SUSPICIOUS" | "BLOCKED" | "UNKNOWN";
  risk_score: number;
  brand: string;
  recommended_action: "ALLOW" | "WARN_USER" | "BLOCK_TRANSACTION";
  latency_ms: number;
  cached: boolean;
  timestamp: string;
}

export interface UrlScanResult {
  url: string;
  domain: string;
  is_phishing: boolean;
  risk_score: number;
  impersonated_brand: string;
  homoglyph_detected: boolean;
  recommended_action: "ALLOW" | "BLOCK";
}

export interface MessageAnalysisResult {
  is_fraud: boolean;
  fraud_category: "TELEGRAM_APK_SCAM" | "REFUND_PHISHING" | "FAKE_JOB_RECRUITMENT" | "BENIGN";
  risk_score: number;
  extracted_indicators: string[];
  advice_en: string;
  advice_hi: string;
}

export class RailRakshaClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey: string, options: RailRakshaClientOptions = {}) {
    if (!apiKey) {
      throw new Error("RailRakshaClient requires an API key (e.g., 'rr_test_...' or 'rr_live_...')");
    }
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl || "http://127.0.0.1:8000").replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs || 5000;
  }

  private async request<T>(endpoint: string, method: string = "GET", body?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "RailRaksha-Node-SDK/1.0.0",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`RailRaksha API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * High-speed verification of domains, UPI handles, train ticket QR hashes, or app IDs.
   */
  public async verify(identifier: string): Promise<VerifyResult> {
    const encoded = encodeURIComponent(identifier.trim());
    return this.request<VerifyResult>(`/v1/partner/verify?identifier=${encoded}`);
  }

  /**
   * Scans a target URL for phishing, homoglyphs, and unauthorized IRCTC spoofing.
   */
  public async scanUrl(url: string): Promise<UrlScanResult> {
    return this.request<UrlScanResult>("/v1/partner/url/scan", "POST", { url });
  }

  /**
   * Analyzes an incoming SMS or WhatsApp notification for known railway scam vectors.
   */
  public async analyzeMessage(messageText: string, senderId: string = ""): Promise<MessageAnalysisResult> {
    return this.request<MessageAnalysisResult>("/v1/partner/message/analyze", "POST", {
      message_text: messageText,
      sender_id: senderId,
    });
  }

  /**
   * Fetches latest STIX 2.1 Threat Intelligence Bundle for SIEM/SOC ingestion.
   */
  public async getThreatFeed(): Promise<any> {
    return this.request<any>("/v1/partner/feed/stix2");
  }

  /**
   * Dispatches a test webhook payload to verify partner integration receiver.
   */
  public async testWebhook(webhookUrl: string, eventType: string = "THREAT_DETECTED"): Promise<any> {
    return this.request<any>("/v1/partner/webhooks/test", "POST", {
      webhook_url: webhookUrl,
      event_type: eventType,
    });
  }
}
