export abstract class BaseIpBasedMitigationPlugin {
  abstract get name(): string;

  abstract shouldBan(ipAddress: string): Promise<boolean>;

  abstract action<R, S>(request: R, response: S): Promise<unknown | void>;
}
