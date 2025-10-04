import type { Actions } from '../content'
import type { PlatformHandler } from './types'

export const azureHandler: PlatformHandler = {
    name: 'Azure DevOps',
    urlPattern: '*://*.dev.azure.com/*',

    async handleBeforeRequest() {
        return undefined
    },

    async handleCompleted() {
        return undefined
    }
}

function safeParseJSON(body: string | undefined): any {
    if (!body) return null
    try {
        return JSON.parse(body)
    } catch {
        return null
    }
}

export function handleAzureMessage(payload: {
    url: string
    method: string
    body?: string
}): Actions | undefined {
    const method = String(payload.method || '').toUpperCase()
    const url = String(payload.url || '')
    const body = typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body)

    if (method === 'PATCH' && /\/_apis\/git\/.*\/pullRequests\/\d+$/i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!parsed) return undefined

        const status = Number(parsed.status)
        if (status === 1) return 'prReopened'
        if (status === 2) return 'prClosed'
        if (status === 3) return 'prMerged'
    }

    if (method === 'PUT' && /\/_apis\/git\/.*\/pullRequests\/\d+\/reviewers\//i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!parsed) return undefined

        const vote = Number(parsed.vote)
        if (vote === 10) return 'codeReviewed'
        if (vote === -5 || vote === -10) return 'requestedChange'
    }

    if (method === 'PATCH' && /\/_apis\/IdentityPicker\/Identities\/.*\/mru\//i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!Array.isArray(parsed) || parsed.length === 0) return undefined

        const hasAddOp = parsed.some((item: any) => item?.op === 'add' && Array.isArray(item?.value))
        if (hasAddOp) return 'assignmentUpdated'
    }

    if (method === 'POST' && /\/_apis\/git\/repositories\/.*\/pullRequests\?/i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!parsed) return undefined

        if (parsed.sourceRefName && parsed.targetRefName && parsed.title) {
            return 'prMade'
        }
    }

    if (method === 'POST' && /\/_apis\/git\/.*\/pullRequests\/\d+\/threads$/i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!parsed) return undefined

        if (parsed.comments && Array.isArray(parsed.comments) && parsed.comments.length > 0) {
            return 'prCommented'
        }
    }

    if (method === 'POST' && /\/_apis\/git\/.*\/pullRequests\/\d+\/threads\/\d+\/comments$/i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!parsed) return undefined

        if (parsed.content) {
            return 'prCommented'
        }
    }

    if (method === 'PATCH' && /\/_apis\/git\/.*\/pullRequests\/\d+\/threads\/\d+\/comments\/\d+$/i.test(url)) {
        const parsed = safeParseJSON(body)
        if (!parsed) return undefined

        if (parsed.content !== undefined) {
            return 'commentEdited'
        }
    }

    return undefined
}
