import { virusTotalClientInstance } from './client/virus-total.client.instance';
import { VirusTotalPluginOptions } from './interfaces/virus-total-plugin-options.interface';
import { VirusTotalService } from './virus-total.service';
import { BaseIpBasedMitigationPlugin } from '../base-adapter';

export class VirusTotalPlugin<R, S> implements BaseIpBasedMitigationPlugin<R, S> {
  static maliciousItemsToBan = 3;

  #accessToken: string;

  #virusTotalService = new VirusTotalService(virusTotalClientInstance);

  #action: typeof this.action;

  #decisionMaker: VirusTotalPluginOptions<R, S>['decisionMaker'];

  constructor(options: VirusTotalPluginOptions<R, S>) {
    this.#accessToken = options.accessToken;
    this.#action = options.action;
    this.#decisionMaker = options.decisionMaker;
  }

  get name(): string {
    return this.constructor.name;
  }

  action(request: R, response: S): S | void {
    this.#action(request, response);
  }

  async shouldBan(ipAddress: string): Promise<boolean> {
    const metadata = await this.#virusTotalService.getIpAddressMetadata(ipAddress, this.#accessToken);

    if (this.#decisionMaker) {
      return this.#decisionMaker(
        metadata.data.attributes.last_analysis_stats,
        metadata.data.attributes.last_analysis_results,
      );
    }

    return metadata.data.attributes.last_analysis_stats.malicious >= VirusTotalPlugin.maliciousItemsToBan;
  }
}
