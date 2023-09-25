import { IpBasedMitigationService } from '../ip-based-mitigation/ip-based-mitigation.service';
import { defaultOptions } from '../options/defaults';
import { UmbressOptions } from '../options/interfaces/options.interface';
import { OptionsService } from '../options/options.service';

export class ProcessorService<R, S> {
  #options: UmbressOptions;

  #optionsService: OptionsService;

  #ipBasedMitigationService: IpBasedMitigationService;

  constructor(
    userOptions: UmbressOptions,
    optionsService: OptionsService,
    ipBasedMitigationService: IpBasedMitigationService,
  ) {
    this.#optionsService = optionsService;
    this.#options = this.#optionsService.mergeDefaultsAndUserProvidedOptions(defaultOptions, userOptions);
    this.#ipBasedMitigationService = ipBasedMitigationService;
  }

  async process(request: R, response: S): Promise<S | void> {
    const ipAddress = this.#options.ipAddressExtractor<R>(request);
    const store = await this.#options.caching;

    if (this.#options.ipBasedMitigation) {
      this.#ipBasedMitigationService.execute<R, S>(
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
