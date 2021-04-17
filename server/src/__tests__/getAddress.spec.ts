import { Request } from 'express';

import { getAddress } from '../helpers';


describe('getAddress IPv6 testing', function() {
  it('should return ipv6 address', function() {
    const addr = '2001:db8:85a3::8a2e:370:7334';
    const options = {
      connection: {
        remoteAddress: addr,
      },
    };
    expect(getAddress(options as Request, false)).toEqual(addr);
  });
});