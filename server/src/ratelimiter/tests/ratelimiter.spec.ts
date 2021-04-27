import delay from 'delay';

import { Ratelimiter } from '..';

jest.mock('delay', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => Promise.resolve()),
}));

describe('Ratelimiter', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  // this test must always run first and before anything else
  describe('setupInterval', () => {
    it('should setup interval timer', () => {
      const ratelimiter = new Ratelimiter('123abc', undefined, undefined);
      ratelimiter.singleRequestTickValue = 0.01;

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), Number.POSITIVE_INFINITY);
    });
  });

  describe('parseRateString', () => {
    it('should return valid result with type of number', () => {
      const ratelimiter = new Ratelimiter('20r/s', undefined, undefined);
      const result = ratelimiter.parseRateString('20r/s');

      expect(result).toEqual(20);
    });

    it('should return infinity if rate couldnt be parsed', () => {
      const ratelimiter = new Ratelimiter('20r/s', undefined, undefined);
      const result = ratelimiter.parseRateString('123');

      expect(result).toEqual(Number.POSITIVE_INFINITY);
    });
  });

  describe('decrement', () => {
    it('should decrement the value', () => {
      const ip = '1.2.3.4';
      const initialValue = 12;
      const singleTickValue = 1;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', undefined, undefined);
      ratelimiter.ipStatsObject = { [ip]: initialValue };
      ratelimiter.singleRequestTickValue = singleTickValue;

      ratelimiter.decrement();

      expect(ratelimiter.ipStatsObject[ip]).toEqual(initialValue - singleTickValue);
    });

    it('should delete IP address from object if it\'s treshold went below zero', () => {
      const ip = '1.2.3.4';
      const initialValue = 4;
      const singleTickValue = 4.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', undefined, undefined);
      ratelimiter.ipStatsObject = { [ip]: initialValue };
      ratelimiter.singleRequestTickValue = singleTickValue;

      ratelimiter.decrement();

      expect(ratelimiter.ipStatsObject[ip]).toBeUndefined();
    });
  });

  describe('process', () => {
    it('should increment ip address value on request recieved', async () => {
      const ip = '1.2.3.4';
      const initialValue = 0.01;
      const singleTickValue = 0.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value 
      const ratelimiter = new Ratelimiter('123abc', undefined, undefined);
      ratelimiter.ipStatsObject = { [ip]: initialValue };
      ratelimiter.singleRequestTickValue = singleTickValue;

      const result = await ratelimiter.process(ip);

      expect(ratelimiter.ipStatsObject[ip]).toEqual(0.02);
      expect(result).toBeTruthy();
    });

    it('should create ip address entry in object if it is not present', async () => {
      const ip = '1.2.3.4';
      const singleTickValue = 0.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', undefined, undefined);
      ratelimiter.singleRequestTickValue = singleTickValue;

      const result = await ratelimiter.process(ip);

      expect(ratelimiter.ipStatsObject[ip]).toEqual(singleTickValue);
      expect(result).toBeTruthy();
    });

    it('should return falsy value if IP went above the threshold', async () => {
      const ip = '1.2.3.4';
      const singleTickValue = 0.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', undefined, undefined);
      ratelimiter.ipStatsObject = { [ip]: 1 };
      ratelimiter.singleRequestTickValue = singleTickValue;

      const result = await ratelimiter.process(ip);

      expect(result).toBeFalsy();
    });

    it('should return truthy value if current value is between 1 and burst threshold', async () => {
      const ip = '1.2.3.4';
      const singleTickValue = 0.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', 5, undefined);
      ratelimiter.ipStatsObject = { [ip]: 1.03 };
      ratelimiter.singleRequestTickValue = singleTickValue;

      const result = await ratelimiter.process(ip);

      expect(ratelimiter.ipStatsObject[ip]).toEqual(1.04);
      expect(result).toBeTruthy();
    });

    it('should return falsy value if ip value went above 1 + burst threshold', async () => {
      const ip = '1.2.3.4';
      const singleTickValue = 0.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', 5, undefined);
      ratelimiter.ipStatsObject = { [ip]: 1.05 };
      ratelimiter.singleRequestTickValue = singleTickValue;

      const result = await ratelimiter.process(ip);

      expect(result).toBeFalsy();
    });

    it('should delay the request from IP address if it is beyond the default and burst thresholds', async () => {
      const ip = '1.2.3.4';
      const singleTickValue = 0.01;
      // prevent setInterval to interrupt test results by passing down invalid rate value for it to fallback to positive infinity value
      const ratelimiter = new Ratelimiter('123abc', 5, false);
      ratelimiter.ipStatsObject = { [ip]: 1.02 };
      ratelimiter.singleRequestTickValue = singleTickValue;

      const result = await ratelimiter.process(ip);

      expect(delay as unknown as jest.Mock).toHaveBeenCalledWith(1500);
      expect(result).toBeTruthy();
    });
  });
});
