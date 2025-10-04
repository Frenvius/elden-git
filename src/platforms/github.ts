import type { Actions } from '../content'
import type { PlatformHandler } from './types'

type MaybeArray<T> = T | T[]

function partialShapeMatch(
    a: Record<string, unknown>,
    b: Record<string, unknown>
) {
    if (!a || !b) return false

    for (const k of Object.keys(a)) {
        if (!(k in b)) return false

        if (a[k] && typeof a[k] === 'string' && typeof b[k] === 'string') {
            if (a[k] !== b[k]) return false
        }

        if (typeof a[k] === 'object' && typeof b[k] === 'object')
            if (!partialShapeMatch(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>))
                return false
    }

    return true
}

function readBody(detail: chrome.webRequest.OnBeforeRequestDetails) {
    if (detail.method !== 'POST') return

    const bytes = detail.requestBody?.raw?.[0]?.bytes
    if (!bytes) return

    const decoder = new TextDecoder('utf-8')
    const jsonStr = decoder.decode(bytes)

    try {
        return JSON.parse(jsonStr)
    } catch {
        return jsonStr
    }
}

function formDataPropertyArrayToLiteral(
    formDataObject: Record<string, chrome.webRequest.FormDataItem[]> | undefined
) {
    if (!formDataObject) return undefined

    const formData = {} as Record<
        string,
        MaybeArray<chrome.webRequest.FormDataItem>
    >

    for (const key of Object.keys(formDataObject)) {
        const body = formDataObject[key]

        if (body.length === 1) formData[key] = body[0]
        else formData[key] = body
    }

    return formData
}

const pending = {
    prMade: false,
    repoDeleted: false
}

async function handleGraphQL(
    detail: chrome.webRequest.OnBeforeRequestDetails
): Promise<Actions | undefined> {
    const body = await readBody(detail)

    function partOfGraphQL(expected: Record<string, unknown>) {
        return partialShapeMatch({ variables: expected }, body)
    }

    if (partOfGraphQL({ input: { title: '', body: '', repositoryId: '' } }))
        return 'issueCreated'
    else if (partOfGraphQL({ input: { body: '', subjectId: '' } }))
        return 'issueCommented'
    else if (partOfGraphQL({ newStateReason: 'COMPLETED' }))
        return 'issueClosed'
    else if (partOfGraphQL({ newStateReason: 'NOT_PLANNED' }))
        return 'issueNotPlanned'
    else if (partOfGraphQL({ newStateReason: 'DUPLICATE' }))
        return 'issueDuplicated'
    else if (partOfGraphQL({ input: { body: '', bodyVersion: '', id: '' } }))
        return 'commentEdited'
    else if (partOfGraphQL({ input: { assignableId: '' } }))
        return 'assignmentUpdated'
    else if (partOfGraphQL({ id: '' }))
        return 'issueReopened'

    return undefined
}

async function handleModifyPullRequest(
    detail: chrome.webRequest.OnBeforeRequestDetails
): Promise<Actions | undefined> {
    const body = formDataPropertyArrayToLiteral(detail.requestBody?.formData)

    if (!body) return undefined

    if (partialShapeMatch({ comment_and_close: '1' }, body))
        return 'prClosed'

    if (partialShapeMatch({ comment_and_open: '1' }, body))
        return 'prReopened'

    if (partialShapeMatch({ 'comment[body]': '' }, body))
        return 'prCommented'

    return undefined
}

async function handleMergePullRequest(
    detail: chrome.webRequest.OnBeforeRequestDetails
): Promise<Actions | undefined> {
    const body: Record<string, unknown> = await readBody(detail)

    if (!body && typeof body !== 'object') return undefined

    if (partialShapeMatch({ mergeMethod: 'MERGE' }, body))
        return 'prMerged'

    return undefined
}

export const githubHandler: PlatformHandler = {
    name: 'GitHub',
    urlPattern: 'https://github.com/*',

    async handleBeforeRequest(detail) {
        const match = (url: string | RegExp, method = 'POST') =>
            detail.method === method &&
            (typeof url === 'string'
                ? detail.url === url
                : detail.url.match(url))

        if (match('https://github.com/_graphql'))
            return await handleGraphQL(detail)

        if (match(/https:\/\/github.com\/.*?\/.*?\/pull\/\d+\/comment\?sticky=true/g))
            return await handleModifyPullRequest(detail)

        if (match(/https:\/\/github.com\/.*?\/.*?\/pull\/\d+\/page_data\/merge/g))
            return await handleMergePullRequest(detail)

        if (match(/https:\/\/github.com\/.*?\/.*?\/pull\/create/g) || match(/https:\/\/github.com\/.*?\/.*?\/pull\/new/g)) {
            pending.prMade = true
            return undefined
        }

        if (match(/https:\/\/github.com\/.*?\/.*?\/settings\/delete/g)) {
            pending.repoDeleted = true
            return undefined
        }

        if (match(/https:\/\/github.com\/.*?\/.*?\/star/g)) {
            return 'repoStarred'
        }

        if (match(/https:\/\/github.com\/.*?\/.*?\/unstar/g)) {
            return 'repoUnstarred'
        }

        return undefined
    },

    async handleCompleted(detail) {
        const match = (url: string | RegExp, method = 'POST') =>
            detail.method === method &&
            (typeof url === 'string'
                ? detail.url === url
                : detail.url.match(url))

        if (match('https://github.com/repositories'))
            return 'repoCreated'

        if (pending.prMade && match(/https:\/\/github.com\/.*?\/.*?\/pull\/\d+\/suggested\-reviewers/g, 'GET')) {
            pending.prMade = false
            return 'prMade'
        }

        if (pending.repoDeleted && match(/https:\/\/github.com\/.*?\/.*?\/graphs\/participation/g, 'GET')) {
            pending.repoDeleted = false
            return 'repoDeleted'
        }

        return undefined
    }
}
