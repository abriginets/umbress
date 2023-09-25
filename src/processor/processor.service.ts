import { IpBasedMitigationService } from '../ip-based-mitigation/ip-based-mitigation.service';
import { UmbressOptions } from '../options/interfaces/options.interface';
import { OptionsService } from '../options/options.service';

export class ProcessorService<R, S> {
  #options: UmbressOptions<R, S>;

  #optionsService: OptionsService<R, S>;

  #ipBasedMitigationService: IpBasedMitigationService<R, S>;

  constructor(
    userOptions: UmbressOptions<R, S>,
    optionsService: OptionsService<R, S>,
    ipBasedMitigationService: IpBasedMitigationService<R, S>,
  ) {
    this.#optionsService = optionsService;
    this.#options = this.#optionsService.mergeDefaultsAndUserProvidedOptions(userOptions);
    this.#ipBasedMitigationService = ipBasedMitigationService;
  }

  async process(request: R, response: S): Promise<S | void> {
    const ipAddress = this.#options.ipAddressExtractor(request);
    const store = await this.#options.caching;

    if (this.#options.ipBasedMitigation) {
      this.#ipBasedMitigationService.execute(
        request,
        response,
        this.#options.ipBasedMitigation,
        this.#options.ipBasedMitigationExecutionStyle,
        ipAddress,
        store,
      );
    }
  }
}
