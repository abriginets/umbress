import request from 'supertest'
import express from 'express'
import umbress from '../index'

describe('Whitelist and blacklist tests', () => {
    it('should allow ip to pass and restrict other ip`s access', async () => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                whitelist: ['12.34.65.0/24', '8.8.8.8']
            })
        )

        app.get('/', function(req, res) {
            res.status(200).json({ success: true })
        })

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.65.67')
            .expect(200)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '8.8.8.8')
            .expect(200)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.66.58')
            .expect(403)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '8.8.8.9')
            .expect(403)
    })

    it('should block all ip`s that are in blacklist', async () => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                blacklist: ['12.34.56.0/24', '4.4.4.4']
            })
        )

        app.get('/', function(req, res) {
            res.status(200).json({ success: true })
        })

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.56.67')
            .expect(403)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '4.4.4.4')
            .expect(403)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '4.4.4.5')
            .expect(200)
    })
})
