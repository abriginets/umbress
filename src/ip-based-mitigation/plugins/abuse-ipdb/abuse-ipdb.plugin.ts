import { AbuseIPDBService } from './abuse-ipdb.service';
import { AbuseIPDBClientInstance } from './client/abuse-ipdb.client.instance';
import { AbuseIPDBPluginOptions } from './interfaces/abuse-ipdb-plugin.interface';
import { BaseIpBasedMitigationPlugin } from '../base-adapter';

export class AbuseIPDBPlugin implements BaseIpBasedMitigationPlugin {
  #maxAgeInDays?: number;

  #confidenceScoreToBan = 80;

  #accessToken: string;

  #abuseIPDBService = new AbuseIPDBService(AbuseIPDBClientInstance);

  #action: typeof this.action;

  constructor(options: AbuseIPDBPluginOptions) {
    this.#accessToken = options.accessToken;

    if (options?.maxAgeInDays) {
      this.#maxAgeInDays = options.maxAgeInDays;
    }

    if (options?.confidenceScoreToBan) {
      this.#confidenceScoreToBan = options.confidenceScoreToBan;
    }
  }

  get name(): string {
    return this.constructor.name;
  }

  async shouldBan(ipAddress: string): Promise<boolean> {
    const abuseConfidenceScore = await this.#abuseIPDBService.getAbuseConfidenceScore(
      ipAddress,
      this.#accessToken,
      this.#maxAgeInDays,
    );

    return abuseConfidenceScore >= this.#confidenceScoreToBan;
  }

  async action<R, S>(request: R, response: S): Promise<void> {
    this.#action(request, response);
  }
}
