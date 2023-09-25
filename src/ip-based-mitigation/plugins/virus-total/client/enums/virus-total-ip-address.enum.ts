export enum VirusTotalIpAddressResponseDataAttributesResultEntryCategory {
  /**
   * site is not malicious
   */
  HARMLESS = 'harmless',
  /**
   * scanner has no opinion about this site
   */
  UNDETECTED = 'undetected',
  /**
   * scanner thinks the site is suspicious
   */
  SUSPICIOUS = 'suspicious',
  /**
   * scanner thinks the site is malicious
   */
  MALICIOUS = 'malicious',
}

export enum VirusTotalIpAddressResponseDataAttributesResultEntryResult {
  CLEAN = 'clean',
  MALICIOUS = 'malicious',
  SUSPICIOUS = 'suspicious',
  PHISHING = 'phishing',
}
