<div align="center">
  <h1>Umbress</h2>
  <div style="display: flex; align-items: center; justify-content: center;">
    <a href="https://github.com/JamesJGoodwin/umbress/actions">
      <img src="https://github.com/JamesJGoodwin/umbress/workflows/build/badge.svg" />
    </a>
    <a href="https://coveralls.io/github/JamesJGoodwin/umbress?branch=master" target="_blank">
      <img src="https://coveralls.io/repos/github/JamesJGoodwin/umbress/badge.svg?branch=master" />
    </a>
    <a href="https://david-dm.org/JamesJGoodwin/umbress" target="_blank">
      <img src="https://david-dm.org/JamesJGoodwin/umbress.svg" />
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
of detection and mitigation like crawlers authenticity checks, malicious IP addresses access mitigation (based on <a href="https://www.abuseipdb.com/" target="_blank">AbuseIPDB</a> data) and advanced client-side JavaScript challending.

## Features
- Adaptive rate-limiter
- Malicious IP checker
- Whitelists and blacklists for single IPs or subnets (currently IPv4 only)
- Advanced JavaScript challenger (like CloudFlare's "Checking your browser")
- Crawlers authenticity checker

## Requirements

- Node.js 10+
- <a href="https://github.com/expressjs/express" target="_blank">Express</a> 4+
- Redis 4+

## Install

```
$ npm install umbress --save
```

## Usage

#### Case #1: Simple rate-limiter
Recommended to use only if you have no choice but to expose ExpressJS application without proxying all the traffic through Nginx, i.e.

```typescript
import express from 'express'
import umbress from 'umbress'

const app = express()

app.use(
  umbress({
    rateLimiter: {
      enabled: true
    }
  })
)
```

Default policy is *no more than 60 requests per minute; 30 seconds ban otherwise*, but can be configured in any other way. Ratelimiter is semantic-friendly - it will throw 429 Too Many Requests and provide visitor with `Retry-After` header.

#### Case #2: White and black lists
You can block access for some IP's (blacklist) or allow it to only specified ones (whitelist).

**Note:** whitelist and blacklist can't be used at the same time. If you enabled both then only whitelist will be applied and blacklist will be ignored.

```typescript
import express from 'express'
import umbress from 'umbress'

const app = express()

app.use(
  umbress({
    whitelist: ['12.34.65.0/24', '8.8.8.8']
  })
)
```

#### Case #3 Automated browser checking
Every user (except search engine's bots and crawlers) will be promted with automated client-side browser checks. This process is fully automatic and works just like CloudFlare's UAM. Visitors will be seeing pre-defined message, but you can easilly modify it by yourself.

**Attention Nginx users!** If your ExpressJS app is behind Nginx then additional configuration is mandatory in order for this part of the module to work. Add next lines to your `location` directive:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Hostname $host;
```

Now the code example:

```typescript
import express from 'express'
import umbress from 'umbress'

const app = express()

// ExpressJS above 4.16.0
app.use(express.urlencoded({ extended: true }))

// ExpressJS below 4.16.0
import bodyParser from 'body-parser'
app.use(bodyParser.urlencoded({ extended: false }))

app.use(
  umbress({
    advancedClientChallenging: {
      enabled: true
    }
  })
)
```

When users visiting your website for the first time, they will receive a unique cookie and will be seeing <a href="https://i.imgur.com/puUoVck.png" target="_blank">this page</a>. 5 seconds is needed to perform some computational tasks that only JavaScript-enabled visitors can solve. After 4-5 seconds the visitor will be redirected to the page by POSTing to it and receive the second cookie. Then the visitor be redirected to the requested URL immediatelly. Cookies TTL is 30 days, after it visitor will have to complete this challenge again.

#### Case #4: Most complex and secure way

*To proceed with this configuration you need to sign up for AbuseIPDB*

Umbress is tied up with AbuseIPDB database of IP addresses. When someone is hitting your website for the first time, Umbress will send a request to AbuseIPDB to check if IP address is malicious and being an origin of bad traffic. If so, the bad IP will be banned for a user-specified time. By default it is 3600 seconds or 1 hour. But if you enabled automated checking before then it's possible not to block user undoubtedly but ask him to pass an automated check to ensure he is using a real browser (this is the recommended way since <a href="https://en.wikipedia.org/wiki/IPv4_address_exhaustion" target="_blank">IPv4 addresses are exhausting</a> and many users are getting their access to the web through the NAT and bad neighbour activity can result in getting everyone in certain NAT blocked which is not what you probably want)

```typescript
import express from 'express'
import umbress from 'umbress'

const app = express()

app.use(express.urlencoded({ extended: true }))

app.use(
  umbress({
    checkSuspiciousAddresses: {
      enabled: true,
      token: process.env.ABUSEIPDB_TOKEN,
      action: 'check'
    }
  })
)
```

## License

Copyright 2020 JamesJGoodwin. Licensed <a href="https://github.com/JamesJGoodwin/umbress/blob/master/LICENSE">MIT</a>.
