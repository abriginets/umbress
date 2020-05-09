//import 'leaked-handles'

import express from 'express'
import request from 'supertest'
import umbress from '../index'
import Redis from 'ioredis'

const redis = new Redis({
    keyPrefix: 'umbress_'
})

const BOTS = {
    google: '66.249.66.1',
    yandex: '178.154.171.136',
    bing: '157.55.39.199',
    baidu: '180.76.5.59',
    mailru: '95.163.255.29',
    twitter: '199.16.157.182'
}

export const getBotsIps = (): { [key: string]: string } => BOTS

const USERAGENTS = {
    google: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    yandex: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    bing: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    baidu: 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
    mailru: 'Mozilla/5.0 (compatible; Mail.RU_Bot/2.0; +http://go.mail.ru/help/robots);',
    twitter: 'Twitterbot/1.0'
}

export const getBotsUseragents = (): { [key: string]: string } => USERAGENTS

beforeAll(async done => {
    await redis.del('bot_66.249.79.201')

    for (const key in BOTS) {
        await redis.del('bot_' + BOTS[key])
    }

    done()
})

afterAll(() => redis.disconnect())

describe('block users trying to look like a crawler', function () {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true
        })
    )

    app.get('/', function (req, res) {
        res.send('Request passed')
    })

    it('should block access for IP with googlebot`s useragent', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.google,
                'X-Forwarded-For': '12.34.56.78'
            })
            .expect(403)

        done()
    })

    it('should allow access to googlebot', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.google,
                'X-Forwarded-For': '66.249.79.201'
            })
            .expect(200)

        done()
    })
})

describe('hitting cached results and throwing 503 to malicious visitors', function () {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    app.get('/', function (req, res) {
        res.send('Passed!')
    })

    it('should respond with 200', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.google,
                'X-Forwarded-For': '66.249.79.201'
            })
            .expect(200)

        done()
    })

    it('should respond with 403', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.google,
                'X-Forwarded-For': '95.213.255.1'
            })
            .expect(403)

        done()
    })

    it('should pass without automated checking', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.yandex,
                'X-Forwarded-For': BOTS.yandex
            })
            .expect(200)

        done()
    })
})

describe('test crawlers access', function () {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    app.get('/', function (req, res) {
        res.send('Hello, bot')
    })

    it('should give access to googlebot', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.google,
                'X-Forwarded-For': BOTS.google
            })
            .expect(200)

        done()
    })

    it('should give access to yandexbot', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.yandex,
                'X-Forwarded-For': BOTS.yandex
            })
            .expect(200)

        done()
    })

    it('should give access to bingbot', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.bing,
                'X-Forwarded-For': BOTS.bing
            })
            .expect(200)

        done()
    })

    it('should give access to mailrubot', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.mailru,
                'X-Forwarded-For': BOTS.mailru
            })
            .expect(200)

        done()
    })
})

describe('it should allow access for twitterbot', function () {
    const app = express()

    app.use(
        umbress({
            isProxyTrusted: true,
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    app.get('/', function (req, res) {
        res.send('Hello, bot')
    })

    it('should return 200', async done => {
        await request(app)
            .get('/')
            .set({
                'User-Agent': USERAGENTS.twitter,
                'X-Forwarded-For': BOTS.twitter
            })
            .expect(200)

        done()
    })
})
