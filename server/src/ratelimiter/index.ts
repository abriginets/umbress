import { UmbressOptions } from '../options/interfaces/options.interface';
import { ONE_SECOND_IN_MILLISECONDS, rateRegexp } from './constants';


export class Ratelimiter {
  private rate: number;
  private burst: number;
  private delay: boolean;
  private singleRequestTick: number;
  private ipStats: { [key: string]: number };

  constructor(
    rate: UmbressOptions['ratelimiter']['rate'],
    burst: UmbressOptions['ratelimiter']['burst'],
    delay: UmbressOptions['ratelimiter']['nodelay'],
  ) {
    this.rate = this.parseRateString(rate);
    this.burst = burst;
    this.delay = delay;
    this.singleRequestTick = this.rate / ONE_SECOND_IN_MILLISECONDS;

    this.setupInterval();
  }

  parseRateString(rate: string): number {
    const [match, rateStr] = rate.match(rateRegexp);

    if (!match) {
      return Number.POSITIVE_INFINITY;
    }

    return parseInt(rateStr, 10);
  }

  setupInterval(): void {
    setInterval(() => {
      this.decrement();
    }, this.singleRequestTick);
  }

  decrement(): void {
    for (const key in this.ipStats) {
      this.ipStats[key] -= this.singleRequestTick;

      if (this.ipStats[key] < 0) {
        delete this.ipStats[key];
      }
    }
  }

  async process(ip: string): Promise<boolean> {
    if (!this.ipStats[ip]) {
      this.ipStats[ip] = 0;
    }

    this.ipStats[ip] += this.singleRequestTick;

    if (this.ipStats[ip] > 1) {
      if (this.burst) {
        if (this.ipStats[ip] < 1 + this.singleRequestTick * this.burst) {
          return true;
        }
      }

      return false;
    }

    return true;
  }
}
