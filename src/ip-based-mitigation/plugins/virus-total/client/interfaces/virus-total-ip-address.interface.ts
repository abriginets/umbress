import {
  VirusTotalIpAddressResponseDataAttributesResultEntryCategory,
  VirusTotalIpAddressResponseDataAttributesResultEntryResult,
} from '../enums/virus-total-ip-address.enum';

export interface VirusTotalIpAddressResponseDataAttributesResultEntry {
  category: VirusTotalIpAddressResponseDataAttributesResultEntryCategory;
  result: VirusTotalIpAddressResponseDataAttributesResultEntryResult;
  method: string;
  engine_name: string;
}

export interface VirusTotalIpAddressResponseDataAttributesLastAnalysisStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
}

export interface VirusTotalIpAddressResponseDataAttributes {
  network: string;
  tags: unknown[];
  whois: string;
  last_analysis_date: number;
  as_owner: string;
  last_analysis_stats: VirusTotalIpAddressResponseDataAttributesLastAnalysisStats;
  asn: number;
  whois_date: number;
  reputation: number;
  last_analysis_results: Record<string, VirusTotalIpAddressResponseDataAttributesResultEntry>;
  country: 'CN';
  last_modification_date: number;
  regional_internet_registry: string;
  continent: string;
}

export interface VirusTotalIpAddressResponseDataLinks {
  self: string;
}

export interface VirusTotalIpAddressResponseData {
  attributes: VirusTotalIpAddressResponseDataAttributes;
  type: string;
  id: string;
  links: VirusTotalIpAddressResponseDataLinks;
}

export interface VirusTotalIpAddressResponse {
  data: VirusTotalIpAddressResponseData;
}
