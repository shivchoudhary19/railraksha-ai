/**
 * RailRaksha Mobile Offline Threat Cache & Local Registry
 * Provides offline scam checks, official domain lookups, and signed feed sync.
 */

export interface CachedDomain {
  domain: string;
  category: "OFFICIAL" | "SUSPICIOUS" | "BLOCKED";
  title: string;
  lastUpdated: string;
}

export interface OfflineCacheState {
  version: number;
  lastSyncTimestamp: string;
  domains: Record<string, CachedDomain>;
  threatSignatures: string[];
}

const DEFAULT_OFFLINE_CACHE: OfflineCacheState = {
  version: 1,
  lastSyncTimestamp: new Date().toISOString(),
  domains: {
    "irctc.co.in": {
      domain: "irctc.co.in",
      category: "OFFICIAL",
      title: "IRCTC Official Portal",
      lastUpdated: "2026-10-12T00:00:00Z"
    },
    "indianrail.gov.in": {
      domain: "indianrail.gov.in",
      category: "OFFICIAL",
      title: "Indian Railways National Train Enquiry",
      lastUpdated: "2026-10-12T00:00:00Z"
    },
    "rrbapply.gov.in": {
      domain: "rrbapply.gov.in",
      category: "OFFICIAL",
      title: "Railway Recruitment Boards Official Portal",
      lastUpdated: "2026-10-12T00:00:00Z"
    },
    "irctc-refund-help.shop": {
      domain: "irctc-refund-help.shop",
      category: "BLOCKED",
      title: "Known Phishing Refund Scam",
      lastUpdated: "2026-10-12T00:00:00Z"
    }
  },
  threatSignatures: [
    "download apk from telegram to claim refund",
    "pay 1500 medical fee for railway joining",
    "call rpf customer care 9876543210"
  ]
};

export class OfflineThreatCacheManager {
  private state: OfflineCacheState;

  constructor(initialState?: OfflineCacheState) {
    this.state = initialState || { ...DEFAULT_OFFLINE_CACHE };
  }

  public getDomainStatus(domainOrUrl: string): CachedDomain | null {
    const cleaned = domainOrUrl.toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    return this.state.domains[cleaned] || null;
  }

  public scanOfflineMessage(text: string): { isSuspicious: boolean; matchedIndicators: string[] } {
    const lower = text.toLowerCase();
    const matches: string[] = [];
    for (const sig of this.state.threatSignatures) {
      if (lower.includes(sig)) {
        matches.push(sig);
      }
    }
    return {
      isSuspicious: matches.length > 0,
      matchedIndicators: matches
    };
  }

  public syncSignedThreatFeed(feedDomains: CachedDomain[], signatures: string[]): void {
    for (const d of feedDomains) {
      this.state.domains[d.domain.toLowerCase()] = d;
    }
    this.state.threatSignatures = Array.from(new Set([...this.state.threatSignatures, ...signatures]));
    this.state.lastSyncTimestamp = new Date().toISOString();
  }

  public getCacheState(): OfflineCacheState {
    return { ...this.state };
  }
}
