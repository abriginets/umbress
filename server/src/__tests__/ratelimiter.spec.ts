//import 'leaked-handles'

import request from 'supertest'
import express from 'express'
import umbress from '../index'
import delay from 'delay'
import Redis from 'ioredis'

const redis = new Redis({
    keyPrefix: 'umbress_'
})

const app = express()

app.use(
    umbress({
        isProxyTrusted: true,
        rateLimiter: {
            enabled: true,
            requests: 10,
            per: 60,
            banFor: 2,
            clearQueueAfterBan: true
        },
        logs: true
    })
)

app.get('/', function (req, res) {
    res.status(200).json({ success: true })
})

beforeAll(async done => {
    const keys = await redis.keys('umbress_ratelimiter_*')

    for (let i = 0; i < keys.length; i++) {
        await redis.del(keys[i].replace('umbress_', ''))
    }

    done()
})

afterAll(() => redis.disconnect())

describe('Rate limiter', function () {
    it('exceed threshold, check bans, wait for unban', async done => {
        for (let i = 0; i < 10; i++) {
            await request(app)
                .get('/')
                .set({
                    Accept: 'application/json',
                    'X-Forwarded-For': '12.34.56.78'
                })
                .expect(200)

            await delay(300)
        }

        // confirm ban and check cached results
        await request(app)
            .get('/')
            .set({
                Accept: 'application/json',
                'X-Forwarded-For': '12.34.56.78'
            })
            .expect(429)

        await delay(500)

        await request(app)
            .get('/')
            .set({
                Accept: 'application/json',
                'X-Forwarded-For': '12.34.56.78'
            })
            .expect(429)

        await delay(2500)

        await request(app)
            .get('/')
            .set({
                Accept: 'application/json',
                'X-Forwarded-For': '12.34.56.78'
            })
            .expect(200)

        done()
    }, 10_000)
})
