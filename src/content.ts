const bannerTexts = {
    assignmentUpdated: 'ASSIGNMENT UPDATED',
    codeReviewed: 'CODE REVIEWED',
    commentEdited: 'COMMENT EDITED',
    issueClosed: 'ISSUE CLOSED',
    issueCommented: 'ISSUE COMMENTED',
    issueCreated: 'ISSUE CREATED',
    issueDuplicated: 'ISSUE DUPLICATED',
    issueNotPlanned: 'ISSUE NOT PLANNED',
    issueReopened: 'ISSUE REOPENED',
    prCommented: 'PULL REQUEST COMMENTED',
    prClosed: 'PULL REQUEST CLOSED',
    prMade: 'PULL REQUEST MADE',
    prMerged: 'PULL REQUEST MERGED',
    prReopened: 'PULL REQUEST REOPENED',
    repoCreated: 'REPOSITORY CREATED',
    repoDeleted: 'REPOSITORY DELETED',
    repoStarred: 'REPOSITORY STARRED',
    repoUnstarred: 'REPOSITORY UNSTARRED',
    requestedChange: 'REQUESTED CHANGE'
} as const

export type Actions = keyof typeof bannerTexts

const sounds = {
    newItem: 'assets/sounds/new-item.mp3',
    enemyFailed: 'assets/sounds/enemy-failed.mp3'
} as const

const bannerSounds = {
    assignmentUpdated: 'newItem',
    codeReviewed: 'newItem',
    commentEdited: 'newItem',
    issueClosed: 'enemyFailed',
    issueCommented: 'newItem',
    issueCreated: 'enemyFailed',
    issueDuplicated: 'enemyFailed',
    issueNotPlanned: 'enemyFailed',
    issueReopened: 'newItem',
    prCommented: 'newItem',
    prClosed: 'enemyFailed',
    prMade: 'newItem',
    prMerged: 'newItem',
    prReopened: 'newItem',
    repoCreated: 'newItem',
    repoDeleted: 'enemyFailed',
    repoStarred: 'newItem',
    repoUnstarred: 'enemyFailed',
    requestedChange: 'enemyFailed'
} as const satisfies { [image in Actions]: keyof typeof sounds }

type MessageType = 'victory' | 'lostGrace' | 'death'

const messageColors = {
    victory: '#DCAF2D',
    lostGrace: '#DC8738',
    death: '#7B1414'
} as const

const bannerTypes = {
    assignmentUpdated: 'victory',
    codeReviewed: 'victory',
    commentEdited: 'victory',
    issueClosed: 'death',
    issueCommented: 'victory',
    issueCreated: 'lostGrace',
    issueDuplicated: 'lostGrace',
    issueNotPlanned: 'lostGrace',
    issueReopened: 'victory',
    prCommented: 'victory',
    prClosed: 'death',
    prMade: 'victory',
    prMerged: 'victory',
    prReopened: 'victory',
    repoCreated: 'victory',
    repoDeleted: 'death',
    repoStarred: 'victory',
    repoUnstarred: 'death',
    requestedChange: 'lostGrace'
} as const satisfies { [action in Actions]: MessageType }

const animations = {
    duration: 1000,
    span: 3500,
    easings: {
        easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }
} as const

const delays = {
    prMerged: 3000,
    repoCreated: 3000,
    prMade: 0,
    repoDeleted: 0
} as const satisfies Partial<{ [delay in Actions]: number }>

// Azure DevOps inject script bridge
if (/(dev\.azure\.com|\.visualstudio\.com)$/.test(location.hostname)) {
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('inject-azure.js')
    script.async = false
        ; (document.head || document.documentElement).appendChild(script)
    script.addEventListener('load', () => script.remove())

    window.addEventListener('message', (event: MessageEvent) => {
        if (event.source !== window) return
        const data = event.data
        if (!data || data.type !== 'elden:azure:request') return

        chrome.runtime.sendMessage({
            type: 'elden:azure:request',
            payload: data.payload
        })
    })
}

// Listen for background messages
chrome.runtime.onMessage.addListener((message?: { action?: Actions }) => {
    if (!message?.action) return

    show(message.action)
})

function loadLocalFont() {
    if (document.querySelector('[data-elden-font]')) return;

    const style = document.createElement('style');
    style.setAttribute('data-elden-font', 'true');
    style.textContent = `
        @font-face {
            font-family: 'Cormorant Garamond';
            font-style: normal;
            font-weight: 600;
            font-display: swap;
            src: url('${chrome.runtime.getURL('assets/fonts/cormorant-garamond-600.ttf')}') format('truetype');
        }
    `;
    document.head.appendChild(style);
}

function show(
    action: Actions,
    delay = delays[action as keyof typeof delays] ?? 1000
) {
    if (action in bannerTexts === false) return

    loadLocalFont();

    const messageType = bannerTypes[action]
    const color = messageColors[messageType]

    const banner = document.createElement('div')
    const backgroundText = document.createElement('div')
    const foregroundText = document.createElement('div')

    backgroundText.textContent = bannerTexts[action]
    foregroundText.textContent = bannerTexts[action]

    banner.style.top = '0'
    banner.style.left = '0'
    banner.style.right = '0'
    banner.style.opacity = '1'
    banner.style.width = '100%'
    banner.style.height = '100vh'
    banner.style.zIndex = '9999'
    banner.style.position = 'fixed'
    banner.style.pointerEvents = 'none'
    banner.style.backgroundSize = 'cover'
    banner.style.backgroundPosition = 'center'
    banner.style.backgroundRepeat = 'no-repeat'
    banner.style.backgroundImage = `url('${chrome.runtime.getURL('assets/images/message-background.webp')}')`

    const textShadow = '0 0 20px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.8), 2px 2px 8px rgba(0, 0, 0, 0.6)'

    const applyCommonTextStyles = (element: HTMLDivElement) => {
        element.style.top = '50%'
        element.style.left = '50%'
        element.style.color = color
        element.style.width = '100%'
        element.style.fontSize = '92px'
        element.style.fontWeight = '600'
        element.style.marginTop = '-10px'
        element.style.textAlign = 'center'
        element.style.position = 'absolute'
        element.style.transform = 'translate(-50%, -50%)'
        element.style.fontFamily = "'Cormorant Garamond', serif"
    }

    applyCommonTextStyles(backgroundText)
    backgroundText.style.opacity = '0.18'
    backgroundText.style.letterSpacing = '5px'
    backgroundText.style.textShadow = textShadow

    applyCommonTextStyles(foregroundText)
    foregroundText.style.letterSpacing = '-1px'

    if (messageType !== 'death') {
        foregroundText.style.mixBlendMode = 'plus-lighter'
        foregroundText.style.textShadow = textShadow
    }

    if (messageType === 'death') {
        banner.appendChild(foregroundText)
    } else {
        banner.appendChild(backgroundText)
        banner.appendChild(foregroundText)
    }

    const audio = new Audio(chrome.runtime.getURL(sounds[bannerSounds[action]]))
    audio.volume = 0.15

    setTimeout(() => {
        requestIdleCallback(() => {
            document.body.appendChild(banner)

            banner.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: animations.duration,
                easing: animations.easings.easeOutQuart,
                fill: 'forwards'
            })

            audio.play().catch(() => {})
        })
    }, delay)

    setTimeout(() => {
        banner.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: animations.duration,
            easing: animations.easings.easeOutQuart,
            fill: 'forwards'
        })

        setTimeout(() => {
            banner.remove()
        }, animations.duration + delay)
    }, animations.span + delay)
}
