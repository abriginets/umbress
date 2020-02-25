import request from 'supertest'
import express, { Request, Response } from 'express'
import umbress from '../index'

const cookieRegex = /^__umbuuid=([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12});\sDomain=(.+?);\sPath=\/; Expires=(.+?);\sHttpOnly;\sSameSite=Lax$/
const skRegex = /name="sk"\svalue="([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})"/

describe('validate automated browser checking options', function() {
    const app = express()

    it('should throw on "enabled" not boolean', function() {
        expect(() => {
            app.use(
                umbress({
                    advancedClientChallenging: {
                        //@ts-ignore
                        enabled: '1'
                    }
                })
            )
        }).toThrow()
    })

    it('should throw on "content" not string', function() {
        expect(() => {
            app.use(
                umbress({
                    advancedClientChallenging: {
                        enabled: true,
                        //@ts-ignore
                        content: []
                    }
                })
            )
        }).toThrow()
    })
})

describe('test automated throw 503 on missing body on POST', function() {
    const app = express()

    app.use(
        umbress({
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    app.get('/', function(req, res) {
        res.send('Passed!')
    })

    it('should throw 503 on body missing', async done => {
        const resOne = await request(app)
            .get('/')
            .expect('Content-type', /html/)
            .expect(503)
            .expect('Set-Cookie', cookieRegex)
            .expect(/Checking your browser before accessing the website/)

        const [umbuuid] = resOne.header['set-cookie']
        const action = resOne.text.match(/action="\?__umbuid=(.+?)"/)[1]

        const uuid = resOne.text.match(skRegex)[1]

        await request(app)
            .post('/?__umbuid=' + action)
            .send(`sk=${uuid}&jschallenge=123`)
            .set('Cookie', umbuuid)
            .expect(503)

        done()
    })
})

describe('test automated browser checking', function() {
    const app = express()

    app.use(express.urlencoded({ extended: true }))

    app.use(
        umbress({
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    app.get('/', function(req, res) {
        res.send('Challenge passed!')
    })

    it('should resend 301 on wrong answer', async done => {
        const resOne = await request(app)
            .get('/')
            .expect('Content-type', /html/)
            .expect(503)
            .expect('Set-Cookie', cookieRegex)
            .expect(/Checking your browser before accessing the website/)

        const [umbuuid] = resOne.header['set-cookie']
        const action = resOne.text.match(/action="\?__umbuid=(.+?)"/)[1]

        const uuid = resOne.text.match(skRegex)[1]

        await request(app)
            .post('/?__umbuid=' + action)
            .send(`sk=${uuid}&jschallenge=123`)
            .set('Cookie', umbuuid)
            .expect(503)

        done()
    })

    it('should have cookie set', async done => {
        const resOne = await request(app)
            .get('/')
            .expect('Content-type', /html/)
            .expect(503)
            .expect('Set-Cookie', cookieRegex)
            .expect(/Checking your browser before accessing the website/)

        const [umbuuid] = resOne.header['set-cookie']
        const action = resOne.text.match(/action="\?__umbuid=(.+?)"/)[1]

        const uuid = resOne.text.match(skRegex)[1]

        /**
         * Test coverage for cached uuid value
         */

        const resCached = await request(app)
            .get('/')
            .expect('Content-type', /html/)
            .expect(503)
            .expect('Set-Cookie', cookieRegex)
            .expect(/Checking your browser before accessing the website/)

        const uuidCached = resCached.text.match(skRegex)[1]

        expect(uuidCached).toEqual(uuid)

        /**
         * Test coverage end
         */

        const nums: number[] = [],
            symb: string[] = []

        uuid.split('').forEach(s => {
            if (s in '0123456789'.split('')) nums.push(parseInt(s))
            else symb.push(s)
        })

        const answer = nums.reduce((a, b) => Math.pow(a, a > 0 ? 1 : a) * Math.pow(b, b > 0 ? 1 : b)) * symb.length

        // send incomplete body
        await request(app)
            .post('/?__umbuid=' + action)
            .send(`sk=${uuid}`)
            .set('Cookie', umbuuid)
            .expect(503)

        const resTwo = await request(app)
            .post('/?__umbuid=' + action)
            .send(`sk=${uuid}&jschallenge=${answer.toString()}`)
            .set('Cookie', umbuuid)
            .expect(301)

        const [clearance] = resTwo.header['set-cookie']

        await request(app)
            .get('/')
            .set('Cookie', [umbuuid, clearance])
            .expect('Challenge passed!')
            .expect(200)

        done()
    })
})

describe('allow users with admin-allowed user-agent to bypass automated check', function() {
    const app = express()

    app.use(
        umbress({
            advancedClientChallenging: {
                enabled: true,
                userAgentsWhitelist: /myTestBot/
            }
        })
    )

    app.get('/', function(req: Request, res: Response) {
        res.send('Challenge passed!')
    })

    it('should allow access', async done => {
        await request(app)
            .get('/')
            .set('User-Agent', 'myTestBot 2.0 (+https://www.example.com/mytestbot)')
            .expect(200)
            .expect('Challenge passed!')

        done()
    })
})
