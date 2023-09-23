import { AbuseIPDBClient } from './client/abuse-ipdb.client';
import { ABUSE_IPDB_BASE_URL, ABUSE_IPDB_PATHNAME } from './constants';

export class AbuseIPDBService {
  #client: AbuseIPDBClient;

  constructor(client: AbuseIPDBClient) {
    this.#client = client;
  }

  #buildURL(ipAddress: string, maxAgeInDays?: number): URL {
    const url = new URL(ABUSE_IPDB_PATHNAME, ABUSE_IPDB_BASE_URL);

    url.searchParams.append('ipAddress', ipAddress);

    if (maxAgeInDays) {
      url.searchParams.append('maxAgeInDays', maxAgeInDays.toString());
    }

    return url;
  }

  async getAbuseConfidenceScore(ipAddress: string, accessToken: string, maxAgeInDays?: number): Promise<number> {
    const url = this.#buildURL(ipAddress, maxAgeInDays);
    const ipAddressMetadata = await this.#client.getIpAddressMetadata(url, accessToken);

    return ipAddressMetadata.data.abuseConfidenceScore;
  }
}
