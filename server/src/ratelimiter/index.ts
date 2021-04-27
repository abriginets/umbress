import delay from 'delay';

import { UmbressOptions } from '../options/interfaces/options.interface';
import { ONE_SECOND_IN_MILLISECONDS, rateRegexp } from './constants';

export class Ratelimiter {
  private rate: number;
  private burst: number;
  private nodelay: boolean;
  private singleRequestTick: number;
  private ipStats: { [key: string]: number } = {};

  constructor(
    rate: UmbressOptions['ratelimiter']['rate'],
    burst: UmbressOptions['ratelimiter']['burst'],
    nodelay: UmbressOptions['ratelimiter']['nodelay'],
  ) {
    this.rate = this.parseRateString(rate);
    this.burst = burst;
    this.nodelay = nodelay;
    this.singleRequestTick = this.rate / ONE_SECOND_IN_MILLISECONDS;

    this.setupInterval();
  }

  set singleRequestTickValue(value: number) {
    this.singleRequestTick = value;
  }

  set ipStatsObject(value: { [key: string]: number }) {
    this.ipStats = value;
  }

  get ipStatsObject(): { [key: string]: number } {
    return this.ipStats;
  }

  parseRateString(rate: string): number {
    const matchResult = rate.match(rateRegexp);

    if (!matchResult) {
      return Number.POSITIVE_INFINITY;
    }

    return parseInt(matchResult[1], 10);
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

    if (!this.burst && this.ipStats[ip] > 1) {
      return false;
    }

    const thresholdWithBurst = 1 + this.singleRequestTick * this.burst;

    if (this.burst && this.ipStats[ip] > thresholdWithBurst) {
      return false;
    }

    if (this.burst && this.nodelay === false && this.ipStats[ip] > 1 && this.ipStats[ip] < thresholdWithBurst) {
      await delay(500 * (this.ipStats[ip] * 100 - 100));
    }

    return true;
  }
}
