/**
 * Core Modules
 */

import express from 'express'
import umbress from './index'

/**
 * Engine Modules
 */

/**
 * Logic
 */

const app = express()

app.use(express.urlencoded({ extended: true }))

app.use(
    umbress({
        recaptcha: {
            enabled: true,
            siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
            secretKey: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
            cookieTtl: 0.000231481
        }
    })
)

app.get('/', function (req: express.Request, res: express.Response): void {
    res.send('Hello')
})

app.listen(80, 'localhost', function () {
    console.log('\x1b[32m%s\x1b[0m', `Server started`)
})
