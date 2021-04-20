import IPCIDR from 'ip-cidr';
import ipaddr from 'ipaddr.js';

import { WhitelistBlacklistKeyEnum } from './enums/whitelist-blacklist.enums';
export class WhitelistBlacklistService {
  private blacklist: string[];
  private whitelist: string[];
  private keyType: WhitelistBlacklistKeyEnum;
  private subnets: IPCIDR[];
  private ips: string[];
  private cachedList: { [key: string]: boolean } = {};

  constructor(whitelist: string[], blacklist: string[]) {
    this.blacklist = blacklist;
    this.whitelist = whitelist;
    this.keyType = this.getWhitelistBlacklistKeyType();
    this.subnets = this.getWhitelistBlacklistSubnets();
    this.ips = this.getWhitelistBlacklistIps();
  }

  set cacheListProperty(cacheContent: { [key: string]: boolean }) {
    this.cachedList = cacheContent;
  }

  get keyTypeProperty(): WhitelistBlacklistKeyEnum {
    return this.keyType;
  }

  getWhitelistBlacklistKeyType(): WhitelistBlacklistKeyEnum {
    if (this.whitelist.length > 0 && this.blacklist.length > 0) {
      return WhitelistBlacklistKeyEnum.WHITELIST;
    }
  
    if (this.whitelist.length > 0) {
      return WhitelistBlacklistKeyEnum.WHITELIST;
    }
  
    if (this.blacklist.length > 0) {
      return WhitelistBlacklistKeyEnum.BLACKLIST;
    }
  }

  get subnetsProperty(): IPCIDR[] {
    return this.subnets;
  }

  getWhitelistBlacklistSubnets(): IPCIDR[] {
    return (this.keyType === WhitelistBlacklistKeyEnum.WHITELIST ? this.whitelist : this.blacklist)
      .map((cidr) => new IPCIDR(cidr))
      .filter((cidr) => cidr.isValid());
  }

  get ipsProperty(): string[] {
    return this.ips;
  }
  
  getWhitelistBlacklistIps(): string[] {
    return (this.keyType === WhitelistBlacklistKeyEnum.WHITELIST ? this.whitelist : this.blacklist)
      .filter((addr) => ipaddr.isValid(addr));
  }

  performWhitelistBlacklistCheck(userIp: string): boolean {
    if (userIp in this.cachedList) {
      return this.cachedList[userIp];
    }
  
    let isAccessAllowed;
    const ipMatched = this.subnets.some((subnet) => subnet.contains(userIp)) || this.ips.includes(userIp);
  
    if (ipMatched && this.keyType === WhitelistBlacklistKeyEnum.WHITELIST) {
      isAccessAllowed = true;
    }
  
    if (!ipMatched && this.keyType === WhitelistBlacklistKeyEnum.WHITELIST) {
      isAccessAllowed = false;
    }
  
    if (ipMatched && this.keyType === WhitelistBlacklistKeyEnum.BLACKLIST) {
      isAccessAllowed = false;
    }
  
    if (!ipMatched && this.keyType === WhitelistBlacklistKeyEnum.BLACKLIST) {
      isAccessAllowed = true;
    }

    this.cachedList[userIp] = isAccessAllowed;

    return isAccessAllowed;
  }
}
