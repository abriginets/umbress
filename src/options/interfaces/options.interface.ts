import { IpBasedMitigationPluginExecutionStyleEnum } from '../../ip-based-mitigation/enums/execution-style.enum';
import { BaseIpBasedMitigationPlugin } from '../../ip-based-mitigation/plugins/base-adapter';

export type UmbressOptions = {
  ipAddressExtractor<R extends Request>(request: R): string;
  ipBasedMitigation?: BaseIpBasedMitigationPlugin[];
  ipBasedMitigationExecutionStyle?: IpBasedMitigationPluginExecutionStyleEnum;
};
