import { compileTemplate } from 'pug'

export interface UmbressOptions {
    isProxyTrusted?: boolean
    rateLimiter?: {
        enabled?: boolean
        requests?: number
        per?: number
        banFor?: number
    }
    clearQueueAfterBan?: boolean
    logs?: boolean
    whitelist?: Array<string>
    blacklist?: Array<string>
    checkSuspiciousAddresses?: {
        enabled?: boolean
        token?: string
        action?: 'block' | 'check'
        banFor?: number
    }
    advancedClientChallenging?: {
        enabled: boolean
        cookieTtl?: number
        content?: string
        cache?: 'redis'
        cacheHost?: string
        cachePort?: number
    }
}

type messageObj = { [key: string]: any } | string

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

export interface PugTemplates {
    [key: string]: compileTemplate
}

type RequestIdleCallbackHandle = any

type RequestIdleCallbackOptions = {
    timeout: number
}

type RequestIdleCallbackDeadline = {
    readonly didTimeout: boolean
    timeRemaining: () => number
}

declare global {
    interface Window {
        requestIdleCallback: (
            callback: (deadline: RequestIdleCallbackDeadline) => void,
            opts?: RequestIdleCallbackOptions
        ) => RequestIdleCallbackHandle
        cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void
    }
}
