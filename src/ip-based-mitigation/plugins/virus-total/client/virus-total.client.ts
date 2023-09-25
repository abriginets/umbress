import { VirusTotalIpAddressResponse } from './interfaces/virus-total-ip-address.interface';
import { HttpClientService } from '../../../../http-client/http-client.service';

export class VirusTotalClient {
  #httpClientService: HttpClientService;

  constructor(httpClientService: HttpClientService) {
    this.#httpClientService = httpClientService;
  }

  getIpAddressMetadata(url: URL, accessToken: string): Promise<VirusTotalIpAddressResponse> {
    return this.#httpClientService.get(url, {
      headers: {
        'Accept': 'application/json',
        'x-apikey': accessToken,
      },
    });
  }
}
