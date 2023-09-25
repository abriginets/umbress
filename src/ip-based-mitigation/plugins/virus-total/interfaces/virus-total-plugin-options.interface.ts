import {
  VirusTotalIpAddressResponseDataAttributesLastAnalysisStats,
  VirusTotalIpAddressResponseDataAttributesResultEntry,
} from '../client/interfaces/virus-total-ip-address.interface';

export interface VirusTotalPluginOptions<R, S> {
  decisionMaker?: (
    stats: VirusTotalIpAddressResponseDataAttributesLastAnalysisStats,
    vendorsData: Record<string, VirusTotalIpAddressResponseDataAttributesResultEntry>,
  ) => boolean;
  accessToken: string;
  action(request: R, response: S): S | void;
}
