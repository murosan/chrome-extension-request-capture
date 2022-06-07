const MAX_RESULTS = 100
const RESULT_TYPES = {
  request: 'request',
  redirect: 'redirect',
  response: 'response',
}

let currentRequestId
let currentStatusCode
let currentTabId

function clearResults() {
  window.Results = []
}

function pushResult(resultType, result) {
  const tabId = result.tabId
  if (tabId !== currentTabId) return

  if (currentRequestId !== result.requestId) {
    currentRequestId = result.requestId
    currentStatusCode = 0
    chrome.browserAction.setBadgeText({})
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
      chrome.browserAction.setBadgeText({ text: `${currentStatusCode}` })
      chrome.browserAction.setBadgeBackgroundColor({ color })
    }
  }

  const before = window.Results
  const after = before.concat({ type: resultType, result }).slice(-MAX_RESULTS)
  window.Results = after
}

window.Results = []
window.ClearResults = () => clearResults()

// https://developer.chrome.com/docs/extensions/reference/tabs/
//   event-onActivated
chrome.tabs.query(
  { active: true, currentWindow: true },
  tabs => (currentTabId = tabs[0].id)
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
  ['requestBody', 'extraHeaders']
)

chrome.webRequest.onBeforeRedirect.addListener(
  detail => pushResult(RESULT_TYPES.redirect, detail),
  defaultFilter,
  ['responseHeaders', 'extraHeaders']
)

chrome.webRequest.onCompleted.addListener(
  detail => pushResult(RESULT_TYPES.response, detail),
  defaultFilter,
  ['responseHeaders', 'extraHeaders']
)
