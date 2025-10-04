import type { Actions } from './content'
import type { PlatformHandler } from './platforms'

import { githubHandler, azureHandler, handleAzureMessage } from './platforms'

const platforms: PlatformHandler[] = [githubHandler, azureHandler]

function dispatch(
    action: Actions,
    details:
        | chrome.webRequest.OnBeforeRequestDetails
        | chrome.webRequest.OnCompletedDetails
) {
    const tabId = details.tabId
    if (typeof tabId !== 'number' || !tabId) return

    chrome.tabs.sendMessage(tabId, {
        action
    })
}

chrome.webRequest.onBeforeRequest.addListener(
    (detail) => {
        (async () => {
            for (const platform of platforms) {
                if (!platform.handleBeforeRequest) continue

                const action = await platform.handleBeforeRequest(detail)
                if (action) {
                    dispatch(action, detail)
                    return
                }
            }
        })()

        return undefined
    },
    { urls: platforms.map((p) => p.urlPattern) },
    ['requestBody']
)

chrome.webRequest.onCompleted.addListener(
    (detail) => {
        (async () => {
            for (const platform of platforms) {
                if (!platform.handleCompleted) continue

                const action = await platform.handleCompleted(detail)
                if (action) {
                    dispatch(action, detail)
                    return
                }
            }
        })()

        return undefined
    },
    { urls: platforms.map((p) => p.urlPattern) }
)

chrome.runtime.onMessage.addListener((message: any, sender: any) => {
    if (!message || message.type !== 'elden:azure:request') return
    if (!sender?.tab?.id) return

    const action = handleAzureMessage(message.payload || {})
    if (action) {
        dispatch(action, { tabId: sender.tab.id } as any)
    }
})
