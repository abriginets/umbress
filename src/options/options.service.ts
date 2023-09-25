import { caching } from 'cache-manager';
import combine from 'defaults';

import { UmbressOptions } from './interfaces/options.interface';
import { IpBasedMitigationPluginExecutionStyleEnum } from '../ip-based-mitigation/enums/execution-style.enum';

export class OptionsService<R, S> {
  #defaultOptions: UmbressOptions<R, S> = {
    ipAddressExtractor: () => {
      throw new Error('`ipAddressExtractor` must be provided to ensure correct IP address resolution');
    },
    ipBasedMitigationExecutionStyle: IpBasedMitigationPluginExecutionStyleEnum.ASYNC,
    caching: caching('memory'),
  };

  mergeDefaultsAndUserProvidedOptions<T extends Record<string, unknown> = UmbressOptions<R, S>>(userOptions: T): T {
    // TODO: fix generic types
    return combine<T, T>(this.#defaultOptions as unknown as T, userOptions);
  }
}
