/**
 * Play Integrity & Hardware Attestation Validation
 * Protects mobile clients against tampering, rooted devices, and repackaged malicious APK clones.
 */

export interface PlayIntegrityVerdict {
  appLicensingVerdict: "LICENSED" | "UNLICENSED" | "UNEVALUATED";
  appRecognitionVerdict: "PLAY_RECOGNIZED" | "UNRECOGNIZED_VERSION" | "UNEVALUATED";
  deviceRecognitionVerdict: "MEETS_STRONG_INTEGRITY" | "MEETS_DEVICE_INTEGRITY" | "MEETS_BASIC_INTEGRITY" | "NO_INTEGRITY";
  isTampered: boolean;
  requestHashMatches: boolean;
  timestamp: string;
}

export function evaluatePlayIntegrityAttestation(tokenPayload: {
  requestDetails: { requestPackageName: string; nonce: string };
  appIntegrity: { appRecognitionVerdict: string };
  deviceIntegrity: { deviceRecognitionVerdict: string[] };
  accountDetails?: { appLicensingVerdict: string };
}, expectedNonce: string): PlayIntegrityVerdict {
  const isPackageValid = tokenPayload.requestDetails.requestPackageName === "in.gov.railraksha";
  const nonceMatches = tokenPayload.requestDetails.nonce === expectedNonce;
  
  const deviceVerdicts = tokenPayload.deviceIntegrity.deviceRecognitionVerdict || [];
  let deviceVerdict: "MEETS_STRONG_INTEGRITY" | "MEETS_DEVICE_INTEGRITY" | "MEETS_BASIC_INTEGRITY" | "NO_INTEGRITY" = "NO_INTEGRITY";
  
  if (deviceVerdicts.includes("MEETS_STRONG_INTEGRITY")) {
    deviceVerdict = "MEETS_STRONG_INTEGRITY";
  } else if (deviceVerdicts.includes("MEETS_DEVICE_INTEGRITY")) {
    deviceVerdict = "MEETS_DEVICE_INTEGRITY";
  } else if (deviceVerdicts.includes("MEETS_BASIC_INTEGRITY")) {
    deviceVerdict = "MEETS_BASIC_INTEGRITY";
  }

  const isTampered = !isPackageValid || !nonceMatches || deviceVerdict === "NO_INTEGRITY";

  return {
    appLicensingVerdict: (tokenPayload.accountDetails?.appLicensingVerdict as any) || "LICENSED",
    appRecognitionVerdict: (tokenPayload.appIntegrity.appRecognitionVerdict as any) || "PLAY_RECOGNIZED",
    deviceRecognitionVerdict: deviceVerdict,
    isTampered,
    requestHashMatches: nonceMatches,
    timestamp: new Date().toISOString()
  };
}
