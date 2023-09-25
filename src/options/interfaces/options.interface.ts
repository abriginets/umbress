import type { Cache } from 'cache-manager';

import { IpBasedMitigationPluginExecutionStyleEnum } from '../../ip-based-mitigation/enums/execution-style.enum';
import { BaseIpBasedMitigationPlugin } from '../../ip-based-mitigation/plugins/base-adapter';

type CachingOptions = {
  caching?: Promise<Cache>;
};

export type UmbressOptions<R, S> = CachingOptions & {
  ipAddressExtractor(request: R): string;
  ipBasedMitigation?: BaseIpBasedMitigationPlugin<R, S>[];
  ipBasedMitigationExecutionStyle?: IpBasedMitigationPluginExecutionStyleEnum;
};
