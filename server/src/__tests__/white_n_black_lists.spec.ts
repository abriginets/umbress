import request from 'supertest'
import express from 'express'
import umbress from '../../dist/index'

describe('whitelist subnet testing', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            whitelist: ['12.34.65.0/24', '2a03:2880::/32']
        })
    )

    app.get('/', function(req, res) {
        res.status(200).json({ success: true })
    })

    it('should allow ip from subnet to pass', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.65.67')
            .expect(200)

        done()
    })

    it('should not pass IP that is not in subnet range', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.66.58')
            .expect(403)

        done()
    })

    it('should pass IPv6 that is in range of subnet', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '2a03:2880:31ff:10::face:b00c')
            .expect(200)

        done()
    })
})

describe('whitelist ip testing', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            whitelist: ['8.8.8.8']
        })
    )

    app.get('/', function(req, res) {
        res.status(200).json({ success: true })
    })

    it('should pass ip that is in list', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '8.8.8.8')
            .expect(200)

        done()
    })

    it('should not pass ip that is in list', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '8.8.8.9')
            .expect(403)

        done()
    })
})

describe('blacklist subnet testing', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            blacklist: ['12.34.56.0/24', '2a03:2880:2130:cf05::/64']
        })
    )

    app.get('/', function(req, res) {
        res.status(200).json({ success: true })
    })

    it('should block ip that is in subnet', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.34.56.67')
            .expect(403)

        done()
    })

    it('should block IPv6 that is in subnet', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '2a03:2880:2130:cf05::face:b00c')
            .expect(403)

        done()
    })

    it('should allow ip that is not in subnet', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '12.43.56.67')
            .expect(200)

        done()
    })
})

describe('blacklist ip testing', function() {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            blacklist: ['4.4.4.4']
        })
    )

    app.get('/', function(req, res) {
        res.status(200).json({ success: true })
    })

    it('should not pass ip that is in list', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '4.4.4.4')
            .expect(403)

        done()
    })

    it('should pass ip that is in list', async done => {
        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '4.4.4.5')
            .expect(200)

        done()
    })
})
