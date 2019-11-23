import request from 'supertest'
import express from 'express'
import umbress from '../index'

describe('Inialization errors', () => {
    const app = express()

    it('throws an error on both blacklist and whitelist announced', () => {
        expect(() => {
            app.use(
                umbress({
                    whitelist: ['56.65.128.37/24'],
                    blacklist: ['85.95.105.115/22']
                })
            )
        }).toThrow()
    })

    it('throws an error on wrong whitelist/blacklist message type', () => {
        expect(() => {
            app.use(
                umbress({
                    whitelist: ['12.34.56.78'],
                    messageOnAccessNotAllowed: ['some', 'message']
                })
            )
        }).toThrow()
    })
})

describe('Whitelist and blacklist tests', () => {
    it('should allow ip to pass and restrict other ip`s access', async () => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                whitelist: ['12.34.56.0/24', '8.8.8.8']
            })
        )

        app.get('/', function(req, res) {
            res.status(200).json({ success: true })
        })

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.56.67')
            .expect(200)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '8.8.8.8')
            .expect(200)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.57.58')
            .expect(403)

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '185.195.205.215')
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
