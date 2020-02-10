<div align="center">
  <h1>Umbress</h2>
  <div style="display: flex; align-items: center; justify-content: center;">
    <a href="https://github.com/JamesJGoodwin/umbress/actions">
      <img src="https://github.com/JamesJGoodwin/umbress/workflows/build/badge.svg" />
    </a>
    <a href="https://coveralls.io/github/JamesJGoodwin/umbress?branch=master" target="_blank">
      <img src="https://coveralls.io/repos/github/JamesJGoodwin/umbress/badge.svg?branch=master" />
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

**Case #1: Simple rate-limiter.** Recommended to use only if you have no choice but to expose ExpressJS application without proxying all the traffic through Nginx, i.e.

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

**Case #2: White- and blacklisting**: You can block access for some IP's (blacklist) or allow it to only specified ones or subnets (whitelist).

**Note:** whitelist and blacklist can't be used at the same time. If you enabled both then only whitelist will be applied.
