// import 'leaked-handles'

import delay from 'delay';
import express from 'express';
import Redis from 'ioredis';
import ipaddr from 'ipaddr.js';
import request from 'supertest';

import umbress from '../index';

/**
 * Preparations for IPv6 subnet ratelimiting test
 */

const ip = '2600:3c03::f03c:92ff:fe60:6d8d';

const fullIp = ipaddr.parse(ip).toNormalizedString();

const ipList = [];

function getRandomInt(max): number {
  return Math.floor(Math.random() * Math.floor(max));
}

for (let i = 0; i < 11; i++) {
  const allButLast = fullIp.split(':').slice(0, 7);
  allButLast.push(getRandomInt(255).toString(16) + getRandomInt(255).toString(16));
  ipList.push(allButLast.join(':'));
}

/**
 * 
 */

const redis = new Redis({
  keyPrefix: 'umbress_',
});

beforeAll(async (done) => {
  const keys = await redis.keys('umbress_ratelimiter_*');

  for (let i = 0; i < keys.length; i++) {
    await redis.del(keys[i].replace('umbress_', ''));
  }

  done();
});

afterAll(() => redis.disconnect());

describe('Rate limiter', function () {
  const app = express();

  app.use(
    umbress({
      isProxyTrusted: true,
      rateLimiter: {
        enabled: true,
        requests: 10,
        per: 60,
        banFor: 2,
        clearQueueAfterBan: true,
      },
      logs: true,
    }),
  );

  app.get('/', function (req, res) {
    res.status(200).json({ success: true });
  });

  it('exceed threshold, check bans, wait for unban', async (done) => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .get('/')
        .set({
          Accept: 'application/json',
          'X-Forwarded-For': '12.34.56.78',
        })
        .expect(200);

      await delay(300);
    }

    // confirm ban and check cached results
    await request(app)
      .get('/')
      .set({
        Accept: 'application/json',
        'X-Forwarded-For': '12.34.56.78',
      })
      .expect(429);

    await delay(500);

    await request(app)
      .get('/')
      .set({
        Accept: 'application/json',
        'X-Forwarded-For': '12.34.56.78',
      })
      .expect(429);

    await delay(2500);

    await request(app)
      .get('/')
      .set({
        Accept: 'application/json',
        'X-Forwarded-For': '12.34.56.78',
      })
      .expect(200);

    done();
  }, 10_000);
});

describe('IPv6 subnet testing', function() {
  const app = express();

  app.use(
    umbress({
      isProxyTrusted: true,
      rateLimiter: {
        enabled: true,
        requests: 10,
        per: 60,
        banFor: 2,
        clearQueueAfterBan: true,
      },
      logs: true,
    }),
  );

  app.get('/', function (req, res) {
    res.send('OK');
  });

  it('should block /64 IPv6 subnet', async (done) => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .get('/')
        .set({
          'X-Forwarded-For': ipList[i],
        })
        .expect(/OK/)
        .expect(200);

      await delay(300);
    }

    await request(app)
      .get('/')
      .set({
        'X-Forwarded-For': ipList[10],
      })
      .expect(429);

    await delay(500);

    await request(app)
      .get('/')
      .set({
        'X-Forwarded-For': ipList[10],
      })
      .expect(429);

    done();
  });
});
