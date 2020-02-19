import request from 'supertest'
import express from 'express'
import umbress from '../../dist/index'
import delay from 'delay'

const app = express()

app.use(
    umbress({
        isProxyTrusted: true,
        rateLimiter: {
            enabled: true,
            requests: 10,
            per: 60,
            banFor: 3
        },
        clearQueueAfterBan: true,
        logs: true
    })
)

app.get('/', function(req, res) {
    res.status(200).json({ success: true })
})

describe('Rate limiter', function() {
    it('should block access', async done => {
        const promises = []

        /** 11 requests made to not allow queue to be released */
        for (let i = 0; i < 11; i++) {
            promises.push(
                request(app)
                    .get('/')
                    .set({
                        Accept: 'application/json',
                        'X-Forwarded-For': '12.34.56.78'
                    })
                    .expect(200 || 429)
            )
        }

        await Promise.all(promises)

        await request(app)
            .get('/')
            .set({
                Accept: 'application/json',
                'X-Forwarded-For': '12.34.56.78'
            })
            .expect(429)

        // this test is needed to check ban based on data cached by redis
        await request(app)
            .get('/')
            .set({
                Accept: 'application/json',
                'X-Forwarded-For': '12.34.56.78'
            })
            .expect(429)

        await delay(3000)

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
