import { compileTemplate } from 'pug'

export interface UmbressOptions {
    isProxyTrusted?: boolean
    rateLimiter?: {
        requests?: number
        per?: number
        banFor?: number
    }
    messageOnTooManyRequests?: messageObj
    clearQueueAfterBan?: boolean
    logs?: boolean
    whitelist?: Array<string>
    blacklist?: Array<string>
    messageOnAccessNotAllowed?: messageObj
    banSuspiciousIP?: {
        enabled?: boolean
        token?: string
        on?: {
            freemem?: number
            cpuAvg?: number
        }
        banFor?: number
        messageOnSuspicious?: messageObj
    }
    advancedClientChallenging?: {
        enabled?: boolean
        content?: string
    }
}

type messageObj = { [key: string]: any } | null

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
