import { VirusTotalClient } from './virus-total.client';
import { httpClientInstance } from '../../../../http-client/http-client.instance';

export const virusTotalClientInstance = new VirusTotalClient(httpClientInstance);
