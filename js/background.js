class Storage {
  key = 'result'
  lock = false

  // fn: async before => after
  async set(fn) {
    await this.locker(async () => {
      const res = await chrome.storage.session.get(this.key)
      const before = res[this.key]
      const value = await fn(before)
      await chrome.storage.session.set({ [this.key]: value })
    })
  }

  async locker(fn) {
    for (let i = 0; i < 100; i++) {
      if (!this.lock) break
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    this.lock = true
    const value = await fn()
    this.lock = false
    return value
  }
}

const MAX_RESULTS = 200
const RESULT_TYPES = {
  request: 'request',
  redirect: 'redirect',
  response: 'response',
}

let currentRequestId
let currentStatusCode
let currentTabId

const storage = new Storage()

async function pushResult(resultType, result) {
  // const tabId = result.tabId
  // if (tabId !== currentTabId) return

  if (currentRequestId !== result.requestId) {
    currentRequestId = result.requestId
    currentStatusCode = 0
    chrome.action.setBadgeText({})
  }

  if (resultType !== RESULT_TYPES.request) {
    const previous = currentStatusCode
    currentStatusCode = Math.max(previous, result.statusCode)
    if (previous !== currentStatusCode) {
      const color = (() => {
        const n = Math.floor(currentStatusCode / 100)
        if (n === 2) return [0, 255, 136, 100]
        if (n === 3) return [0, 234, 255, 100]
        if (n === 4) return [255, 246, 83, 100]
        if (n === 5) return [255, 107, 122, 100]
        return [108, 117, 125, 100]
      })()
      chrome.action.setBadgeText({ text: `${currentStatusCode}` })
      chrome.action.setBadgeBackgroundColor({ color })
    }
  }

  await storage.set(async before =>
    (before || []).concat({ type: resultType, result }).slice(-MAX_RESULTS),
  )
}

// https://developer.chrome.com/docs/extensions/reference/tabs/
//   event-onActivated
chrome.tabs.query(
  { active: true, currentWindow: true },
  tabs => (currentTabId = tabs[0].id),
)
chrome.tabs.onActivated.addListener(info => (currentTabId = info.tabId))

// https://developer.chrome.com/docs/extensions/reference/webRequest/
//   onBeforeRequest
//   onBeforeRedirect
//   onCompleted

const defaultFilter = {
  urls: ['*://*/*'],
  types: ['main_frame'],
}

chrome.webRequest.onBeforeRequest.addListener(
  detail => pushResult(RESULT_TYPES.request, detail),
  defaultFilter,
  ['requestBody', 'extraHeaders'],
)

chrome.webRequest.onBeforeRedirect.addListener(
  detail => pushResult(RESULT_TYPES.redirect, detail),
  defaultFilter,
  ['responseHeaders', 'extraHeaders'],
)

chrome.webRequest.onCompleted.addListener(
  detail => pushResult(RESULT_TYPES.response, detail),
  defaultFilter,
  ['responseHeaders', 'extraHeaders'],
)
