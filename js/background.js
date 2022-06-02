const MAX_RESULTS = 100

function clearResults() {
  window.Results = []
}

function pushResult(resultType, result) {
  const tabId = result.tabId
  const options = { active: true, currentWindow: true }
  chrome.tabs.query(options, tabs => {
    const currentTab = tabs[0]
    if (tabId !== currentTab.id) return

    const before = window.Results
    const after = before
      .concat({ type: resultType, result })
      .slice(-MAX_RESULTS)
    window.Results = after
  })
}

window.Results = []
window.ClearResults = () => clearResults()

// https://developer.chrome.com/docs/extensions/reference/webRequest/
//   onBeforeRequest
//   onBeforeRedirect
//   onCompleted

const defaultFilter = {
  urls: ['*://*/*'],
  types: ['main_frame'],
}

chrome.webRequest.onBeforeRequest.addListener(
  detail => pushResult('request', detail),
  defaultFilter,
  ['requestBody', 'extraHeaders']
)

chrome.webRequest.onBeforeRedirect.addListener(
  detail => pushResult('redirect', detail),
  defaultFilter,
  ['responseHeaders', 'extraHeaders']
)

chrome.webRequest.onCompleted.addListener(
  detail => pushResult('response', detail),
  defaultFilter,
  ['responseHeaders', 'extraHeaders']
)
