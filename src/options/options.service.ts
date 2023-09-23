import combine from 'defaults';

import { UmbressOptions } from './interfaces/options.interface';

export class OptionsService {
  mergeDefaultsAndUserProvidedOptions<T extends Record<string, unknown> = UmbressOptions>(
    defaults: T,
    userOptions: T,
  ): T {
    return combine<T, T>(defaults, userOptions);
  }
}
