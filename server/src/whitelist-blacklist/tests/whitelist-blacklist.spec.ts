import IPCIDR from 'ip-cidr';

import { WhitelistBlacklistService } from '..';
import { WhitelistBlacklistKeyEnum } from '../enums/whitelist-blacklist.enums';

describe('WhitelistBlacklist Class', () => {
  describe('getWhitelistBlacklistKeyType', () => {
    it('should return whitelist key if options have both whitelist and blacklist keys', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['foo', 'bar'], ['foo', 'bar']);
      WhitelistBlacklistClass.getWhitelistBlacklistKeyType();

      const keyType = WhitelistBlacklistClass.keyTypeProperty;

      expect(keyType).toEqual(WhitelistBlacklistKeyEnum.WHITELIST);
    });

    it('should return whitelist key if only whitelist option specified', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['foo', 'bar'], []);
      WhitelistBlacklistClass.getWhitelistBlacklistKeyType();

      const keyType = WhitelistBlacklistClass.keyTypeProperty;

      expect(keyType).toEqual(WhitelistBlacklistKeyEnum.WHITELIST);
    });

    it('should return blacklist key if only blacklist option specified', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['foo', 'bar']);
      WhitelistBlacklistClass.getWhitelistBlacklistKeyType();

      const keyType = WhitelistBlacklistClass.keyTypeProperty;

      expect(keyType).toEqual(WhitelistBlacklistKeyEnum.BLACKLIST);
    });

    it('should not have default value', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], []);
      WhitelistBlacklistClass.getWhitelistBlacklistKeyType();

      const keyType = WhitelistBlacklistClass.keyTypeProperty;

      expect(keyType).toBeUndefined();
    });
  });

  describe('getWhitelistBlacklistSubnets', () => {
    it('should return list of valid IPCIDRs', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.8.0/22', '2002::1234:abcd:ffff:c0a8:101/64'], []);
      WhitelistBlacklistClass.getWhitelistBlacklistSubnets();
      
      const cidrs = WhitelistBlacklistClass.subnetsProperty;

      expect(cidrs.every((cidr) => cidr instanceof IPCIDR)).toBeTruthy();
      expect(cidrs.length).toBe(2);
    });

    it('should filter out invalid cidr notations', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.8.0/22', '2002::1234:abcd:ffff:c0a8:101/64', '123', '8.8.8.8/256'], []);
      WhitelistBlacklistClass.getWhitelistBlacklistSubnets();
      
      const cidrs = WhitelistBlacklistClass.subnetsProperty;

      expect(cidrs.every((cidr) => cidr instanceof IPCIDR)).toBeTruthy();
      expect(cidrs.length).toBe(2);
    });

    it('should apply blacklist rules if it\'s specified', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.8.0/22', '2002::1234:abcd:ffff:c0a8:101/64']);
      WhitelistBlacklistClass.getWhitelistBlacklistSubnets();
      
      const cidrs = WhitelistBlacklistClass.subnetsProperty;

      expect(cidrs.every((cidr) => cidr instanceof IPCIDR)).toBeTruthy();
    });
  });

  describe('getWhitelistBlacklistIps', () => {
    it('should return list of ip addressed and not include cidrs for whitelist', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.8.0/22', '1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'], []);
      WhitelistBlacklistClass.getWhitelistBlacklistIps();
      
      const ips = WhitelistBlacklistClass.ipsProperty;

      expect(ips).toEqual(['1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334']);
    });

    it('should return list of ip addressed and not include cidrs for blacklist', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.8.0/22', '1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334']);
      WhitelistBlacklistClass.getWhitelistBlacklistIps();
      
      const ips = WhitelistBlacklistClass.ipsProperty;

      expect(ips).toEqual(['1.2.3.4', '2001:0db8:85a3:0000:0000:8a2e:0370:7334']);
    });
  });

  describe('performWhitelistBlacklistCheck', () => {
    it('should prefer truthy value from cache instead of validating ip address', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.8.0/22']);
      WhitelistBlacklistClass.cacheListProperty = { '1.2.3.4': true };

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('1.2.3.4');

      expect(result).toBeTruthy();
    });

    it('should prefer falsy value from cache instead of validating ip address', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.8.0/22']);
      WhitelistBlacklistClass.cacheListProperty = { '8.8.8.8': false };

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('8.8.8.8');

      expect(result).toBeFalsy();
    });

    it('should not have default value', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], []);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('8.8.8.8');

      expect(result).toBeUndefined();
    });

    /**
     * Blacklist tests
     */
    it('should block ip address if blacklist key type provided and ip is in one of IPv4 cidrs', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.0.0/16']);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('8.8.8.8');

      expect(result).toBeFalsy();
    });

    it('should pass ip address if blacklist key type provided and ip is not in any of IPv4 cidrs', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.0.0/16']);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('9.8.8.8');

      expect(result).toBeTruthy();
    });

    it('should block ip address if blacklist key type provided and ip is blacklisted', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.8.8']);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('8.8.8.8');

      expect(result).toBeFalsy();
    });

    it('should pass ip address if blacklist key type provided and ip is blacklisted', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService([], ['8.8.8.8']);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('9.8.8.8');

      expect(result).toBeTruthy();
    });

    /**
     * Whitelist checks
     */
    it('should block ip address if whitelist key type provided and ip is not in any of IPv4 cidrs', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.0.0/16'], []);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('9.8.8.8');

      expect(result).toBeFalsy();
    });

    it('should pass ip address if whitelist key type provided and ip is in one of IPv4 cidrs', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.0.0/16'], []);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('8.8.8.8');

      expect(result).toBeTruthy();
    });

    it('should pass ip address if whitelist key type provided and ip is whitelisted', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.8.8'], []);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('8.8.8.8');

      expect(result).toBeTruthy();
    });

    it('should block ip address if whitelist key type provided and ip is not whitelisted', () => {
      const WhitelistBlacklistClass = new WhitelistBlacklistService(['8.8.8.8'], []);

      const result = WhitelistBlacklistClass.performWhitelistBlacklistCheck('9.8.8.8');

      expect(result).toBeFalsy();
    });
  });
});
