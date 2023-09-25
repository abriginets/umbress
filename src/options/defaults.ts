import { caching } from 'cache-manager';

import { DEFAULT_IP_ADDRESS_SOURCE_HEADER_NAME } from './constants';
import { UmbressOptions } from './interfaces/options.interface';
import { IpBasedMitigationPluginExecutionStyleEnum } from '../ip-based-mitigation/enums/execution-style.enum';

export const defaultOptions: UmbressOptions = {
  ipAddressExtractor: (request) => request.headers[DEFAULT_IP_ADDRESS_SOURCE_HEADER_NAME],
  ipBasedMitigationExecutionStyle: IpBasedMitigationPluginExecutionStyleEnum.ASYNC,
  caching: caching('memory'),
};
