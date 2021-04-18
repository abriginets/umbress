import IPCIDR from 'ip-cidr';

import { getWhitelistBlacklistIps, getWhitelistBlacklistKeyType, getWhitelistBlacklistSubnets, performWhitelistBlacklistCheck } from '..';
import { WhitelistBlacklistKeyEnum } from '../enums/whitelist-blacklist.enums';

describe('Whitelist and Blacklist', () => {
  describe('getWhitelistBlacklistKeyType', () => {
    it('should return whitelist key if options have both whitelist and blacklist keys', () => {
      const result = getWhitelistBlacklistKeyType(['foo', 'bar'], ['foo', 'bar']);

      expect(result).toEqual(WhitelistBlacklistKeyEnum.WHITELIST);
    });

    it('should return whitelist key if only whitelist option specified', () => {
      const result = getWhitelistBlacklistKeyType(['foo', 'bar'], []);

      expect(result).toEqual(WhitelistBlacklistKeyEnum.WHITELIST);
    });

    it('should return blacklist key if only blacklist option specified', () => {
      const result = getWhitelistBlacklistKeyType([], ['foo', 'bar']);

      expect(result).toEqual(WhitelistBlacklistKeyEnum.BLACKLIST);
    });

    it('should not have default value', () => {
      const result = getWhitelistBlacklistKeyType([], []);

      expect(result).toBeUndefined();
    });
  });

  describe('getWhitelistBlacklistSubnets', () => {
    it('should return list of valid IPCIDRs', () => {
      const result = getWhitelistBlacklistSubnets(WhitelistBlacklistKeyEnum.WHITELIST, ['8.8.8.0/22', '2002::1234:abcd:ffff:c0a8:101/64'], []);

      expect(result.every((cidr) => cidr instanceof IPCIDR)).toBeTruthy();
    });

    it('should filter out invalid cidr notations', () => {
      const result = getWhitelistBlacklistSubnets(WhitelistBlacklistKeyEnum.WHITELIST, ['8.8.8.0/22', '2002::1234:abcd:ffff:c0a8:101/64', '123', '8.8.8.8/256'], []);

      expect(result.every((cidr) => cidr instanceof IPCIDR)).toBeTruthy();
      expect(result.length).toEqual(2);
    });

    it('should apply blacklist rules if it\'s specified', () => {
      const result = getWhitelistBlacklistSubnets(WhitelistBlacklistKeyEnum.BLACKLIST, [], ['8.8.8.0/22', '2002::1234:abcd:ffff:c0a8:101/64']);

      expect(result.every((cidr) => cidr instanceof IPCIDR)).toBeTruthy();
    });
  });

  describe('getWhitelistBlacklistIps', () => {
    it('should return list of ip addressed and not include cidrs for whitelist', () => {
      const result = getWhitelistBlacklistIps(WhitelistBlacklistKeyEnum.WHITELIST, ['8.8.8.0/22', '1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'], []);

      expect(result).toEqual(['1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334']);
    });

    it('should return list of ip addressed and not include cidrs for blacklist', () => {
      const result = getWhitelistBlacklistIps(WhitelistBlacklistKeyEnum.BLACKLIST, [], ['8.8.8.0/22', '1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334']);

      expect(result).toEqual(['1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334']);
    });
  });

  describe('performWhitelistBlacklistCheck', () => {
    it('should prefer truthy value from cache instead of validating ip address', () => {
      const result = performWhitelistBlacklistCheck('1.2.3.4', WhitelistBlacklistKeyEnum.BLACKLIST, { '1.2.3.4': true }, [], []);

      expect(result).toBeTruthy();
    });

    it('should prefer falsy value from cache instead of validating ip address', () => {
      const result = performWhitelistBlacklistCheck('1.2.3.4', WhitelistBlacklistKeyEnum.BLACKLIST, { '1.2.3.4': false }, [], []);

      expect(result).toBeFalsy();
    });

    it('should not have default value', () => {
      const result = performWhitelistBlacklistCheck('8.8.8.8', '' as WhitelistBlacklistKeyEnum, {}, [], []);

      expect(result).toBeUndefined();
    });

    /**
     * Blacklist tests
     */
    it('should block ip address if blacklist key type provided and ip is in one of IPv4 cidrs', () => {
      const cidrs = [new IPCIDR('8.8.0.0/16')];
      const result = performWhitelistBlacklistCheck('8.8.8.8', WhitelistBlacklistKeyEnum.BLACKLIST, {}, cidrs, []);

      expect(result).toBeFalsy();
    });

    it('should pass ip address if blacklist key type provided and ip is not in any of IPv4 cidrs', () => {
      const cidrs = [new IPCIDR('8.8.0.0/16')];
      const result = performWhitelistBlacklistCheck('9.8.8.8', WhitelistBlacklistKeyEnum.BLACKLIST, {}, cidrs, []);

      expect(result).toBeTruthy();
    });

    it('should block ip address if blacklist key type provided and ip is blacklisted', () => {
      const result = performWhitelistBlacklistCheck('8.8.8.8', WhitelistBlacklistKeyEnum.BLACKLIST, {}, [], ['8.8.8.8']);

      expect(result).toBeFalsy();
    });

    it('should pass ip address if blacklist key type provided and ip is blacklisted', () => {
      const result = performWhitelistBlacklistCheck('8.8.8.9', WhitelistBlacklistKeyEnum.BLACKLIST, {}, [], ['8.8.8.8']);

      expect(result).toBeTruthy();
    });

    /**
     * Whitelist checks
     */
    it('should block ip address if whitelist key type provided and ip is not in any of IPv4 cidrs', () => {
      const cidrs = [new IPCIDR('8.8.0.0/16')];
      const result = performWhitelistBlacklistCheck('9.8.8.8', WhitelistBlacklistKeyEnum.WHITELIST, {}, cidrs, []);

      expect(result).toBeFalsy();
    });

    it('should pass ip address if whitelist key type provided and ip is in one of IPv4 cidrs', () => {
      const cidrs = [new IPCIDR('8.8.0.0/16')];
      const result = performWhitelistBlacklistCheck('8.8.8.8', WhitelistBlacklistKeyEnum.WHITELIST, {}, cidrs, []);

      expect(result).toBeTruthy();
    });

    it('should pass ip address if whitelist key type provided and ip is whitelisted', () => {
      const result = performWhitelistBlacklistCheck('8.8.8.8', WhitelistBlacklistKeyEnum.WHITELIST, {}, [], ['8.8.8.8']);

      expect(result).toBeTruthy();
    });

    it('should block ip address if whitelist key type provided and ip is not whitelisted', () => {
      const result = performWhitelistBlacklistCheck('8.8.8.9', WhitelistBlacklistKeyEnum.WHITELIST, {}, [], ['8.8.8.8']);

      expect(result).toBeFalsy();
    });
  });
});
