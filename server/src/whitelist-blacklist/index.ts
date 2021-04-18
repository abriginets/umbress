import IPCIDR from 'ip-cidr';
import ipaddr from 'ipaddr.js';

import { WhitelistBlacklistKeyEnum } from './enums/whitelist-blacklist.enums';

export function getWhitelistBlacklistKeyType(whiteList: string[], blackList: string[]): WhitelistBlacklistKeyEnum {
  if (whiteList.length > 0 && blackList.length > 0) {
    return WhitelistBlacklistKeyEnum.WHITELIST;
  }

  if (whiteList.length > 0) {
    return WhitelistBlacklistKeyEnum.WHITELIST;
  }

  if (blackList.length > 0) {
    return WhitelistBlacklistKeyEnum.BLACKLIST;
  }
}

export function getWhitelistBlacklistSubnets(keyType: WhitelistBlacklistKeyEnum, whiteList: string[], blackList: string[]): IPCIDR[] {
  return (keyType === WhitelistBlacklistKeyEnum.WHITELIST ? whiteList : blackList)
    .map((cidr) => new IPCIDR(cidr))
    .filter((cidr) => cidr.isValid());
}

export function getWhitelistBlacklistIps(keyType: WhitelistBlacklistKeyEnum, whiteList: string[], blackList: string[]): string[] {
  return (keyType === WhitelistBlacklistKeyEnum.WHITELIST ? whiteList : blackList)
    .filter((addr) => ipaddr.isValid(addr));
}

export function performWhitelistBlacklistCheck(
  userIp: string,
  key: WhitelistBlacklistKeyEnum,
  whitelistBlacklistCheckedIps: { [key: string]: boolean },
  subnets: IPCIDR[],
  ips: string[],
): boolean {
  if (userIp in whitelistBlacklistCheckedIps) {
    return whitelistBlacklistCheckedIps[userIp];
  }

  const ipMatched = subnets.some((subnet) => subnet.contains(userIp)) || ips.includes(userIp);

  if (ipMatched && key === WhitelistBlacklistKeyEnum.WHITELIST) {
    return true;
  }

  if (!ipMatched && key === WhitelistBlacklistKeyEnum.WHITELIST) {
    return false;
  }

  if (ipMatched && key === WhitelistBlacklistKeyEnum.BLACKLIST) {
    return false;
  }

  if (!ipMatched && key === WhitelistBlacklistKeyEnum.BLACKLIST) {
    return true;
  }
}
