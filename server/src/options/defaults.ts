import { UmbressOptions } from './interfaces/options.interface';

export function defaults(): UmbressOptions {
  return {
    isProxyTrusted: false,
    whitelist: [],
    blacklist: [],
  } as UmbressOptions;
}
