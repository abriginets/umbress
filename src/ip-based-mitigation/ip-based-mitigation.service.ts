import { IpBasedMitigationPluginExecutionStyleEnum } from './enums/execution-style.enum';
import { BaseIpBasedMitigationPlugin } from './plugins/base-adapter';
import { BasePluginService } from '../base-plugin/base-plugin.service';

export class IpBasedMitigationService implements BasePluginService {
  async execute(
    request: Request,
    response: Response,
    next: (...args: unknown[]) => unknown,
    plugins: BaseIpBasedMitigationPlugin[],
    executionStyle: IpBasedMitigationPluginExecutionStyleEnum,
    ipAddress: string,
  ): Promise<void> {
    if (plugins.length > 0) {
      if (executionStyle === IpBasedMitigationPluginExecutionStyleEnum.SYNC) {
        await Promise.all(plugins.map((plugin) => plugin.shouldBan(ipAddress)));
      }

      if (executionStyle === IpBasedMitigationPluginExecutionStyleEnum.ASYNC) {
        plugins.forEach((plugin) => plugin.shouldBan(ipAddress));
      }
    }
  }
}
