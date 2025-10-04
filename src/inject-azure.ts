(function () {
    const ADO_HOST_MATCHERS = [
        /(^|\.)dev\.azure\.com$/,
        /(^|\.).*\.visualstudio\.com$/
    ]

    function isAzureHost(url: string): boolean {
        try {
            const u = new URL(url, location.href)
            return ADO_HOST_MATCHERS.some((re) => re.test(u.hostname))
        } catch {
            return false
        }
    }

    function shouldCapture(url: string, method: string): boolean {
        if (!isAzureHost(url)) return false
        const m = method.toUpperCase()
        if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH') return false

        const patterns = [
            /\/_apis\/git\/repositories\/[^\/]+\/pullRequests(\/\d+)?/i,
            /\/_apis\/git\/.*\/pullRequests/i,
            /\/_apis\/pullrequest/i,
            /\/_apis\/wit\/workitems/i,
            /\/_apis\/discussion/i,
            /\/_apis\/IdentityPicker\//i
        ]

        return patterns.some(pattern => pattern.test(url))
    }

    function safeText(body: any): Promise<string | undefined> {
        if (typeof body?.text !== 'function') return Promise.resolve(undefined)
        return body.text().catch(() => undefined)
    }

    function safeToString(body: any): string | undefined {
        if (typeof body?.toString !== 'function') return undefined
        try {
            return String(body)
        } catch {
            return undefined
        }
    }

    async function bodyToString(body: BodyInit | null | undefined): Promise<string | undefined> {
        if (!body) return undefined
        if (typeof body === 'string') return body
        if (body instanceof Blob) return body.text().catch(() => undefined)
        if (body instanceof FormData) {
            const obj: Record<string, any> = {}
            for (const [k, v] of body.entries()) obj[k] = v
            return JSON.stringify(obj)
        }

        return (await safeText(body)) || safeToString(body)
    }

    interface RequestPayload {
        url: string
        method: string
        body?: string
    }

    function emit(payload: RequestPayload): void {
        window.postMessage(
            { type: 'elden:azure:request', payload },
            window.origin
        )
    }

    const originalFetch = window.fetch
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        let url = ''
        let method = 'GET'
        let bodyStr: string | undefined
        const isRequest = typeof Request !== 'undefined' && input instanceof Request

        if (typeof input === 'string') {
            url = input
        } else if (isRequest) {
            url = input.url
        } else {
            url = String(input)
        }

        if (init?.method) method = init.method
        else if (isRequest) method = input.method || 'GET'
        method = method.toUpperCase()

        if (shouldCapture(url, method)) {
            if (init?.body !== undefined) {
                bodyStr = await bodyToString(init.body)
            } else if (isRequest) {
                bodyStr = await input.clone().text().catch(() => undefined)
            }
            emit({ url, method, body: bodyStr })
        }

        return originalFetch.apply(this, arguments as any)
    }

    const OriginalXHR = window.XMLHttpRequest
    const proto = OriginalXHR.prototype
    const originalOpen = proto.open
    const originalSend = proto.send

    let _method = 'GET'
    let _url = ''

    proto.open = function (method: string, url: string) {
        _method = method
        _url = url
        return originalOpen.apply(this, arguments as any)
    }

    proto.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        if (shouldCapture(_url, _method)) {
            ; (async () => {
                const bodyStr = await bodyToString(body as BodyInit)
                emit({ url: _url, method: _method, body: bodyStr })
            })()
        }
        return originalSend.apply(this, arguments as any)
    }
})()
