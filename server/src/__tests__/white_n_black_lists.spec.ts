import request from 'supertest'
import express from 'express'
import umbress from '../../dist/index'

describe('Whitelist and blacklist tests', function() {
    it('should allow ip to pass and restrict other ip`s access', async done => {
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

        done()
    })

    it('should block all ip`s that are in blacklist', async done => {
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

        done()
    })
})

describe('perform test coverage', function() {
    it('should block with only one subnet in blacklist', async done => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                blacklist: ['12.34.56.0/24']
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

        done()
    })

    it('should allow with only one ip in whitelist', async done => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                whitelist: ['1.11.111.111']
            })
        )

        app.get('/', function(req, res) {
            res.status(200).json({ success: true })
        })

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '1.11.111.111')
            .expect(200)

        done()
    })

    it('should allow with only one subnet in whitelist', async done => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                whitelist: ['1.11.111.0/24']
            })
        )

        app.get('/', function(req, res) {
            res.status(200).json({ success: true })
        })

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '1.11.111.111')
            .expect(200)

        done()
    })
})
