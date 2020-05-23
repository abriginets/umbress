/**
 * Core Modules
 */

import express from 'express'
import fetch from 'node-fetch'
import umbress from '../server/dist/index'

/**
 * Engine Modules
 */

/**
 * Logic
 */

;(async (): Promise<void> => {
    // fetch html content of example.com
    const content = await fetch('http://example.com/')
        .then(res => res.text())
        .catch(e => {
            console.error(e)
            process.exit(0)
        })

    const app = express()
    
    const ratelimiter = express.Router()
    const automated = express.Router()
    const recaptcha = express.Router()

    /**
     * ratelimiter performance
     */

    ratelimiter.use(
        umbress({
            rateLimiter: {
                enabled: true,
                banFor: 10
            }
        })
    )

    ratelimiter.get('/', function(req: express.Request, res: express.Response) {
        res.send(content)
    })

    /**
     * automated performance
     */

    automated.use(
        umbress({
            advancedClientChallenging: {
                enabled: true
            }
        })
    )

    automated.get('/', function(req: express.Request, res: express.Response) {
        res.send(content)
    })

    /**
     * recaptcha performance
     */

    recaptcha.use(
        umbress({
            recaptcha: {
                enabled: true,
                siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
                secretKey: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
            }
        })
    )

    recaptcha.get('/', function(req: express.Request, res: express.Response) {
        res.send(content)
    })

    /** */

    app.get('/', function(req: express.Request, res: express.Response) {
        res.send(content)
    })

    app.use('/ratelimiter', ratelimiter)
    app.use('/recaptcha', recaptcha)
    app.use('/automated', automated)

    app.listen(3000, () => console.log('\x1b[32m%s\x1b[0m', `Server started`))

})();