export abstract class BaseIpBasedMitigationPlugin<R, S> {
  abstract get name(): string;

  abstract shouldBan(ipAddress: string): Promise<boolean>;

  abstract action(request: R, response: S): S | void;
}
