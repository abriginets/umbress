<div align="center">
  <h1>Umbress</h2>
  <div style="display: flex; align-items: center; justify-content: center;">
    <a href="https://github.com/JamesJGoodwin/umbress/actions">
      <img src="https://github.com/JamesJGoodwin/umbress/workflows/build/badge.svg" />
    </a>
    <a href="https://www.npmjs.com/package/umbress" target="_blank">
      <img src="https://img.shields.io/npm/v/umbress.svg" />
    </a>
    <a href="https://packagephobia.now.sh/result?p=umbress" target="_blank">
      <img src="https://packagephobia.now.sh/badge?p=umbress" />
    </a>
  </div>
  </br>
  </br>
</div>

<b>Umbress</b> is a fast and easy-to-use DDoS mitigation Express.js middleware. It has several techniques
of detection and mitigation like smart rate-limiter based on req/s or overall system load and suspicious IP address detection (based on <a href="https://www.abuseipdb.com/" target="_blank">AbuseIPDB</a> data)

## Features
- Adaptive rate-limiter
- Malicious IP checker and blocker
- Whitelists and blacklists for single IPs or subnets (currently IPv4 only)

## Requirements

- Node.js 10+
- <a href="https://github.com/expressjs/express" target="_blank">Express</a> 4+

## Install

```
$ npm install umbress --save
```

## Usage

Using Umbress is as easy as any other Express.js Middleware:

```javascript
import express from 'express'
import umbress from 'umbress'

const app = express()

app.use(
    umbress({
        rateLimiter: {
            requests: 60,
            per: 60,
            banFor: 30
        },
        clearQueueAfterBan: true,
        messageOnTooManyRequests: {
            error: true,
            message:
                'You are making way too much requests at this time so we had no choice but to restrict your access. Check `Retry-After` header for restriction expiry date.'
        },
        logs: true
    })
)

```

## Options

- #### `isProxyTrusted: boolean` (default: false)
If you running your Express.js application behind the proxy (e.g. Nginx) - set this value to `true`. If Express.js is your main webserver and serves responses by itself then you should left it as it is.

If `false` then value of `req.connection.remoteAddress` will be treated as visitor's IP address.

If `true` then umbress will get IP address from `X-Forwarded-For` header. Make sure you pass it properly from your proxy.
- #### `rateLimiter: object`
  - #### `requests: number` (default: 60)
  The number of requests your application can be reached in *X amount of time*
  - #### `per: number` (default: 60)
  *X amount of time* for an option above (in seconds). E.g. if you set `requests` for 60 and `per` for 60 as well then your visitors will be able to make 60 requests per minute. It is recommended ratio.
  - #### `banFor: number` (default: 30)
  Amount of time (in seconds) to ban visitor's IP address for limit excess.
  
- #### `messageOnTooManyRequests: { [key: string]: any } | null` (default: null)
If you trying to defend your REST API endpoints then you might want to notify your clients if they're violating the rules with JSON.
You can pass there an object. For example, next JS-object:
  
```javascript
{
  error: true,
  message: 'You are making too much requests!'
}
```
will be transformed to JSON string:
`{"error":true,"message":"You are making too much requests!"}`

- #### `clearQueueAfterBan: boolean` (default: false)
Let's understand how queue works first. Each request increments queue for `1`. Each `N` amount of time queue decrements.
`N` is calculated by the formula `(per / requests) * 1000` and matches the time in miliseconds. E.g. if `requests = 60` and `per = 30`
then queue will be decrementing every 0,5 seconds. It means the more requests you can do in X amount of time the earlier you'll be
able to make new ones after ban and vice-versa - the less requests you can do in X amount of time the later you'll be able to make new ones.
You might find this algorhitm very weird but that's the right way to do rate-limiting since you need to calculate number of requests for
the last 60 seconds, not *every 60 seconds*. Taking into account all of the above you have to calculate ban time properly.
Imagine you have set `requests` to 60, `per` to 60 and ban to `10`. Some visitor made 60 requests in 60 seconds and was banned for 5 seconds.
It means he has 60 points in queue which is decrementing every second. After 5 seconds he will be unbanned and yet still will have 55 points in queue.
If he make 5 more requests in 1 second he will be banned again. If you want to prevent this then you can set **clearQueueAfterBan** option to `true` and queue for
each user will be cleared before visitor's IP unbanned.

- #### `logs: boolean` (default: false)
Enables simple logging for bans and unbans. E.g. `[umbress] Banned 1.2.3.4 for 30 seconds`

- #### `whitelist: Array<string>` (default: [])
Allows you to give access only to specified IP addresses and/or subnets. E.g. `1.2.3.4` or `12.34.56.78/32`

- #### `blacklist: Array<string>` (default: [])
Allows you to block access to specified IP addresses and/or subnets. **Note:** you can only specify whitelist or blacklist at a time.

- #### `messageOnAccessNotAllowed: { [key: string]: any } | null` (default: null)
Same as <a href="#messageontoomanyrequests--key-string-any---null-default-null">messageOnTooManyRequests</a> but will fire for non-whitelisted or blacklisted visitors.
