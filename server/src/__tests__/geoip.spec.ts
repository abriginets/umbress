import delay from 'delay'
import express from 'express'
import umbress from '../../dist/index'
import request from 'supertest'

describe('test geoip whitelist', function() {
    it('should pass whitelisted without automated checking enabled and block otherwise', async done => {
        const app = express()

        app.use(express.urlencoded({ extended: true }))

        app.use(
            umbress({
                isProxyTrusted: true,
                advancedClientChallenging: {
                    enabled: true
                },
                geoipRule: {
                    type: 'whitelist',
                    codes: ['RU', 'UA', 'BY'],
                    action: 'pass',
                    otherwise: 'block'
                }
            })
        )

        app.get('/', function(req, res) {
            res.send('Passed!')
        })

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.78',
                'X-Umbress-Country': 'RU'
            })
            .expect(200)

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.79',
                'X-Umbress-Country': 'CN'
            })
            .expect(403)

        done()
    })

    it('should pass whitelisted and check otherwise', async done => {
        const app = express()

        app.use(express.urlencoded({ extended: true }))

        app.use(
            umbress({
                isProxyTrusted: true,
                geoipRule: {
                    type: 'whitelist',
                    codes: ['RU', 'UA', 'BY'],
                    action: 'pass',
                    otherwise: 'check'
                }
            })
        )

        app.get('/', function(req, res) {
            res.send('Passed')
        })

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.78',
                'X-Umbress-Country': 'RU'
            })
            .expect(200)

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.79',
                'X-Umbress-Country': 'CN'
            })
            .expect(503)
            .expect(/Checking your browser before accessing the website/)

        done()
    })

    it('should check whitelisted with automated checking disabled and block otherwise', async done => {
        const app = express()

        app.use(express.urlencoded({ extended: true }))

        app.use(
            umbress({
                isProxyTrusted: true,
                geoipRule: {
                    type: 'whitelist',
                    codes: ['RU', 'UA', 'BY'],
                    action: 'check',
                    otherwise: 'block'
                }
            })
        )

        app.get('/', function(req, res) {
            res.send('Passed')
        })

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.78',
                'X-Umbress-Country': 'RU'
            })
            .expect(503)
            .expect(/Checking your browser before accessing/)

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.79',
                'X-Umbress-Country': 'CN'
            })
            .expect(403)

        done()
    })
})

describe('test geoip blacklist', function() {
    it('should block blacklisted and pass otherwise with automated checking enabled', async done => {
        const app = express()

        app.use(express.urlencoded({ extended: true }))

        app.use(
            umbress({
                isProxyTrusted: true,
                advancedClientChallenging: {
                    enabled: true
                },
                geoipRule: {
                    type: 'blacklist',
                    codes: ['JP', 'CN', 'KR'],
                    action: 'block',
                    otherwise: 'pass'
                }
            })
        )

        app.get('/', function(req, res) {
            res.send('Passed')
        })

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.78',
                'X-Umbress-Country': 'JP'
            })
            .expect(403)

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.79',
                'X-Umbress-Country': 'RU'
            })
            .expect(200)

        done()
    })

    it('should check blacklisted with automated checking disabled and pass otherwise', async done => {
        const app = express()

        app.use(express.urlencoded({ extended: true }))

        app.use(
            umbress({
                isProxyTrusted: true,
                geoipRule: {
                    type: 'blacklist',
                    codes: ['JP', 'CN', 'KR'],
                    action: 'check',
                    otherwise: 'pass'
                }
            })
        )

        app.get('/', function(req, res) {
            res.send('Passed')
        })

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.78',
                'X-Umbress-Country': 'JP'
            })
            .expect(503)
            .expect(/Checking your browser before accessing/)

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.79',
                'X-Umbress-Country': 'RU'
            })
            .expect(200)

        done()
    })

    it('should block blacklisted and check otherwise', async done => {
        const app = express()

        app.use(express.urlencoded({ extended: true }))

        app.use(
            umbress({
                isProxyTrusted: true,
                geoipRule: {
                    type: 'blacklist',
                    codes: ['JP', 'CN', 'KR'],
                    action: 'block',
                    otherwise: 'check'
                }
            })
        )

        app.get('/', function(req, res) {
            res.send('Passed')
        })

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.78',
                'X-Umbress-Country': 'JP'
            })
            .expect(403)

        await request(app)
            .get('/')
            .set({
                'X-Forwarded-For': '12.34.56.79',
                'X-Umbress-Country': 'RU'
            })
            .expect(503)
            .expect(/Checking your browser before accessing/)

        done()
    })
})
