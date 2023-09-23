import { IpBasedMitigationService } from '../ip-based-mitigation/ip-based-mitigation.service';
import { defaultOptions } from '../options/defaultOptions';
import { UmbressOptions } from '../options/interfaces/options.interface';
import { OptionsService } from '../options/options.service';

export class ProcessorService {
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

  async process<R extends Request, S extends Response, N extends (...args: unknown[]) => unknown>(
    request: R,
    response: S,
    next: N,
  ): Promise<S | N | void> {
    const ipAddress = this.#options.ipAddressExtractor(request);

    if (this.#options.ipBasedMitigation) {
      this.#ipBasedMitigationService.execute(
        request,
        response,
        next,
        this.#options.ipBasedMitigation,
        this.#options.ipBasedMitigationExecutionStyle,
        ipAddress,
      );
    }
  }
}
