import { VirusTotalIpAddressResponse } from './client/interfaces/virus-total-ip-address.interface';
import { VirusTotalClient } from './client/virus-total.client';
import { VIRUS_TOTAL_BASE_URL } from './constants';

export class VirusTotalService {
  #client: VirusTotalClient;

  static ipAddressEndpoint = '/api/v3/ip_addresses/';

  constructor(client: VirusTotalClient) {
    this.#client = client;
  }

  #getVirusTotalIpAddressPathname(ipAddress: string): string {
    return `${VirusTotalService.ipAddressEndpoint}/${ipAddress}`;
  }

  #buildURL(ipAddress: string): URL {
    return new URL(this.#getVirusTotalIpAddressPathname(ipAddress), VIRUS_TOTAL_BASE_URL);
  }

  async getIpAddressMetadata(ipAddress: string, accessToken: string): Promise<VirusTotalIpAddressResponse> {
    const url = this.#buildURL(ipAddress);

    return this.#client.getIpAddressMetadata(url, accessToken);
  }
}
