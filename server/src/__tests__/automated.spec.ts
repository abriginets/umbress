import request from 'supertest'
import express, { Request, Response } from 'express'
import umbress from '../index'

describe('validate automated browser checking options', () => {
    const app = express()

    it('should throw on "enabled" not boolean', () => {
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

    it('should throw on "content" not string', () => {
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

describe('test automated browser checking', () => {
    const app = express()

    app.use(express.urlencoded({ extended: true }))

    app.use(
        umbress({
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    app.get('/', function(req: Request, res: Response) {
        res.send('Challenge passed!')
    })

    const cookieRegex = /^__umbuuid=([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12});\sDomain=(.+?);\sPath=\/; Expires=(.+?);\sHttpOnly;\sSameSite=Lax$/

    it('should resend 301 on wrong answer', async () => {
        const resOne = await request(app)
            .get('/')
            .expect('Content-type', /html/)
            .expect(503)
            .expect('Set-Cookie', cookieRegex)
            .expect(/Checking your browser before accessing the website/)

        const [umbuuid] = resOne.header['set-cookie']
        const action = resOne.text.match(/action="\?__umbuid=(.+?)"/)[1]

        const uuid = resOne.text.match(
            /name="sk"\svalue="([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})"/
        )[1]

        await request(app)
            .post('/?__umbuid=' + action)
            .send(`sk=${uuid}&jschallenge=123`)
            .set('Cookie', umbuuid)
            .expect(503)
    })

    it('should have cookie set', async () => {
        const resOne = await request(app)
            .get('/')
            .expect('Content-type', /html/)
            .expect(503)
            .expect('Set-Cookie', cookieRegex)
            .expect(/Checking your browser before accessing the website/)

        const [umbuuid] = resOne.header['set-cookie']
        const action = resOne.text.match(/action="\?__umbuid=(.+?)"/)[1]

        const uuid = resOne.text.match(
            /name="sk"\svalue="([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})"/
        )[1]

        const nums: number[] = [],
            symb: string[] = []

        uuid.split('').forEach(s => {
            if (s in '0123456789'.split('')) nums.push(parseInt(s))
            else symb.push(s)
        })

        const answer = nums.reduce((a, b) => Math.pow(a, a > 0 ? 1 : a) * Math.pow(b, b > 0 ? 1 : b)) * symb.length

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
    })
})
