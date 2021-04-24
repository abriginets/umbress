import express from 'express';

type geoipAction = 'block' | 'check' | 'pass' | 'recaptcha'

export interface AbuseIPDBResponse {
  data: {
    ipAddress: string;
    isPublic: boolean;
    ipVersion: number;
    isWhitelisted: boolean;
    abuseConfidenceScore: number;
    countryCode: string;
    countryName: string;
    usageType: string;
    isp: string;
    domain: string;
    totalReports: number;
    numDistinctUsers: number;
    lastReportedAt: string;
    reports: Array<{
      reportedAt: string;
      comment: string;
      categories: Array<number>;
      reporterId: number;
      reporterCountryCode: string;
      reporterCountryName: string;
    }>;
  };
}

export interface AutomatedNCaptchaOpts {
  ip: string;
  req: express.Request;
  res: express.Response;
  proxyTrusted: boolean;
  automatedCookieName: string;
  recaptchaCookieName: string;
  proxyHostname: string;
  proxyProto: string;
  automatedTemplate: string;
  recaptchaTemplate: string;
  automatedCookieTtl: number;
  recaptchaCookieTtl: number;
}

type AutomatedFiles = 'frame' | 'face' | 'image'

export interface HtmlTemplates {
  automated?: {
    [key in AutomatedFiles]: string
  };
  recaptcha?: {
    index: string;
  };
}
