import { Redis } from 'ioredis'
import express from 'express'

export interface UmbressOptions {
    isProxyTrusted?: boolean
    rateLimiter?: {
        enabled: boolean
        requests?: number
        per?: number
        banFor?: number
        clearQueueAfterBan?: boolean
    }
    logs?: boolean
    whitelist?: Array<string>
    blacklist?: Array<string>
    checkSuspiciousAddresses?: {
        enabled: boolean
        token: string
        action?: 'block' | 'check' | 'recaptcha'
        banFor?: number
        cookieTtl?: 1
    }
    advancedClientChallenging?: {
        enabled: boolean
        cookieTtl?: number
        content?: string
        userAgentsWhitelist?: RegExp
        cache?: 'redis'
        cacheHost?: string
        cachePort?: number
    }
    geoipRule?: {
        type: 'whitelist' | 'blacklist'
        codes: Array<string>
        action: geoipAction
        otherwise: geoipAction
    }
    recaptcha?: {
        enabled: boolean
        siteKey: string
        secretKey: string
        cookieTtl?: number
        header?: string
        description?: string
    }
}

type geoipAction = 'block' | 'check' | 'pass' | 'recaptcha'

export interface AbuseIPDBResponse {
    data: {
        ipAddress: string
        isPublic: boolean
        ipVersion: number
        isWhitelisted: boolean
        abuseConfidenceScore: number
        countryCode: string
        countryName: string
        usageType: string
        isp: string
        domain: string
        totalReports: number
        numDistinctUsers: number
        lastReportedAt: string
        reports: Array<{
            reportedAt: string
            comment: string
            categories: Array<number>
            reporterId: number
            reporterCountryCode: string
            reporterCountryName: string
        }>
    }
}

export interface AutomatedNCaptchaOpts {
    ip: string
    req: express.Request
    res: express.Response
    proxyTrusted: boolean
    automatedCookieName: string
    recaptchaCookieName: string
    proxyHostname: string
    proxyProto: string
    automatedTemplate: string
    recaptchaTemplate: string
    cache: Redis
    automatedCookieTtl: number
    recaptchaCookieTtl: number
}

type AutomatedFiles = 'frame' | 'face' | 'image'

export interface HtmlTemplates {
    automated?: {
        [key in AutomatedFiles]: string
    }
    recaptcha?: {
        index: string
    }
}
