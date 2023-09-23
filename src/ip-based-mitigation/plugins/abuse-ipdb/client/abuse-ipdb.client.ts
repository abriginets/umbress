import { AbuseIPDBResponse } from './interfaces/abuse-ipdb.interface';
import { HttpClientService } from '../../../../http-client/http-client.service';

export class AbuseIPDBClient {
  #httpClientService: HttpClientService;

  constructor(httpClientService: HttpClientService) {
    this.#httpClientService = httpClientService;
  }

  getIpAddressMetadata(url: URL, accessToken: string): Promise<AbuseIPDBResponse> {
    return this.#httpClientService.get(url, {
      headers: {
        Accept: 'application/json',
        Key: accessToken,
      },
    });
  }
}
