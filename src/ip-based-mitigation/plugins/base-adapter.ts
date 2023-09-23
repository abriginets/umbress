export abstract class BaseIpBasedMitigationPlugin {
  abstract shouldBan(ipAddress: string): Promise<boolean>;
}
