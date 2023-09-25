import { Cache } from 'cache-manager';

import { IpBasedMitigationPluginExecutionStyleEnum } from './enums/execution-style.enum';
import { IpBasedMitigationBanMetadata } from './interfaces/ip-based-mitigation.interface';
import { BaseIpBasedMitigationPlugin } from './plugins/base-adapter';
import { BasePluginService } from '../base-plugin/base-plugin.service';

export class IpBasedMitigationService<R, S> implements BasePluginService<R, S> {
  static #cacheKeyPrefix = 'ip-based-mitigation-';

  #buildCacheKey(ipAddress: string): string {
    return `${IpBasedMitigationService.#cacheKeyPrefix}-${ipAddress}`;
  }

  async execute(
    request: R,
    response: S,
    plugins: BaseIpBasedMitigationPlugin<R, S>[],
    executionStyle: IpBasedMitigationPluginExecutionStyleEnum,
    ipAddress: string,
    store: Cache,
  ): Promise<void> {
    const cached = await store.get<string>(this.#buildCacheKey(ipAddress));

    if (cached) {
      const parsed = JSON.parse(cached) as IpBasedMitigationBanMetadata;
      const actionablePlugin = plugins.find((plugin) => plugin.name === parsed.pluginType);

      await actionablePlugin.action(request, response);
    }

    if (plugins.length > 0) {
      if (executionStyle === IpBasedMitigationPluginExecutionStyleEnum.SYNC) {
        await this.#synchronousExecutionFlow(request, response, plugins, ipAddress, store);
      }

      if (executionStyle === IpBasedMitigationPluginExecutionStyleEnum.ASYNC) {
        plugins.forEach((plugin) => plugin.shouldBan(ipAddress));
      }
    }
  }

  async #synchronousExecutionFlow(
    request: R,
    response: S,
    plugins: BaseIpBasedMitigationPlugin<R, S>[],
    ipAddress: string,
    store: Cache,
  ): Promise<void> {
    const results = await Promise.all(plugins.map((plugin) => plugin.shouldBan(ipAddress)));

    this.#decideOnBan(request, response, results, plugins, ipAddress, store);
  }

  #asyncronousExecutionFlow(
    request: R,
    response: S,
    plugins: BaseIpBasedMitigationPlugin<R, S>[],
    ipAddress: string,
    store: Cache,
  ): void {
    plugins.forEach((plugin) => {
      plugin
        .shouldBan(ipAddress)
        .then((result) => this.#decideOnBan(request, response, [result], [plugin], ipAddress, store));
    });
  }

  async #decideOnBan(
    request: R,
    response: S,
    results: boolean[],
    plugins: BaseIpBasedMitigationPlugin<R, S>[],
    ipAddress: string,
    store: Cache,
  ) {
    const hasPositive = results.some((result) => result);

    if (hasPositive) {
      const firstTriggeredIndex = results.findIndex((result) => result);
      const plugin = plugins.at(firstTriggeredIndex);

      await this.#saveMetadataBeforeBan(plugin, ipAddress, store);
      await this.#performAction(request, response, plugin);
    }
  }

  async #performAction(request: R, response: S, plugin: BaseIpBasedMitigationPlugin<R, S>) {
    await plugin.action(request, response);
  }

  async #saveMetadataBeforeBan(plugin: BaseIpBasedMitigationPlugin<R, S>, ipAddress: string, store: Cache) {
    const metadata = JSON.stringify({ pluginType: plugin.name } as IpBasedMitigationBanMetadata);

    await store.set(this.#buildCacheKey(ipAddress), metadata);
  }
}
