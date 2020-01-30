import request from 'supertest'
import express from 'express'
import umbress from '../index'

describe('Initialization errors', () => {
    it('should throw if message has wrong type', () => {
        expect(() => {
            const app = express()

            app.use(
                umbress({
                    banSuspiciousIP: {
                        enabled: true,
                        token: '59b410d34af56795ceafe844bbe1a90222f09260d3671533cf874cce28eb5e175927e4b23830a3fe',
                        // @ts-ignore
                        messageOnSuspicious: 'test'
                    }
                })
            )
        }).toThrow()
    })

    it('should throw if token unspecified', () => {
        expect(() => {
            const app = express()

            app.use(
                umbress({
                    banSuspiciousIP: {
                        enabled: true,
                        token: ''
                    }
                })
            )
        }).toThrow()
    })
})

describe('test system loads and abuseipdb blocks', () => {
    it('should ban bad IP address', async () => {
        const app = express()

        app.use(
            umbress({
                isProxyTrusted: true,
                banSuspiciousIP: {
                    enabled: true,
                    token: '59b410d34af56795ceafe844bbe1a90222f09260d3671533cf874cce28eb5e175927e4b23830a3fe',
                    on: {
                        cpuAvg: 0.1
                    },
                    banFor: 3,
                    messageOnSuspicious: {
                        success: false,
                        message:
                            'Sorry, your IP address was flagged as origin of malicious activity so we had no choice but to restrict your access. For more info please refer to https://www.abuseipdb.com'
                    }
                }
            })
        )

        app.get('/', function(req, res) {
            res.status(200).json({ success: true })
        })

        await new Promise(resolve => setTimeout(() => resolve(), 5000))

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '195.166.180.226') // onlime.ru IP address, for example
            .expect(200)

        /** Give time for system to gather CPU avarage usage */

        console.log('Good IP request: OK')

        await request(app)
            .get('/')
            .set('Accept', 'application/json')
            .set('X-Forwarded-For', '49.229.29.50') // some random IP address flagged as the one implicated in DDoS attacks
            .expect(200)

        console.log('Bad IP request: OK')

        await new Promise(resolve => {
            setTimeout(async () => {
                await request(app)
                    .get('/')
                    .set('Accept', 'application/json')
                    .set('X-Forwarded-For', '49.229.29.50')
                    .expect(403, {
                        success: false,
                        message:
                            'Sorry, your IP address was flagged as origin of malicious activity so we had no choice but to restrict your access. For more info please refer to https://www.abuseipdb.com'
                    })

                resolve()
            }, 2000)
        })

        console.log('Bad IP request banned: OK')

        await new Promise(resolve => {
            setTimeout(async () => {
                await request(app)
                    .get('/')
                    .set('Accept', 'application/json')
                    .set('X-Forwarded-For', '49.229.29.50') // some random IP address flagged as the one implicated in DDoS attacks
                    .expect(200)

                resolve()
            }, 3000)
        })

        console.log('Bad IP request unbanned: OK')
    }, 12_000)
})
