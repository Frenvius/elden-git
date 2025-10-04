import type { Actions } from '../content'

export type PlatformRequestDetails =
    | chrome.webRequest.OnBeforeRequestDetails
    | chrome.webRequest.OnCompletedDetails

export interface PlatformHandler {
    name: string
    urlPattern: string
    handleCompleted?: (detail: chrome.webRequest.OnCompletedDetails) => Promise<Actions | undefined>
    handleBeforeRequest?: (detail: chrome.webRequest.OnBeforeRequestDetails) => Promise<Actions | undefined>
}
