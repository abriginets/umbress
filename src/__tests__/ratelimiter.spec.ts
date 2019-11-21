import request from 'supertest'
import express from 'express'
import umbress from '../index'

const app = express()

app.use(
    umbress({
        rateLimiter: {
            requests: 10,
            per: 60,
            banFor: 5
        },
        clearQueueAfterBan: true,
        messageOnTooManyRequests: {
            error: true,
            message:
                'You are making way too much requests at this time so we had no choice but to restrict your access. Check `Retry-After` header for restriction expiry date.'
        },
        logs: true
    })
)

app.get('/', function(req, res) {
    res.status(200).json({ success: true })
})

describe('Rate limiter', () => {
    it('should block access', async done => {
        let promises = []

        /** 11 requests made to not allow queue to be released */
        for (let i = 0; i < 11; i++) {
            promises.push(
                request(app)
                    .get('/')
                    .set('Accept', 'application/json')
                    .expect(200)
            )
        }

        await Promise.all(promises)

        request(app)
            .get('/')
            .set('Accept', 'application/json')
            .expect(429, done)

        setTimeout(() => {
            request(app)
                .get('/')
                .set('Accept', 'application/json')
                .expect(200, done)
        }, 6000)
    }, 10000)
})
