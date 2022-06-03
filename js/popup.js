const background = chrome.extension.getBackgroundPage()

const main = document.getElementById('main')

const Elm = {
  div: (className, text) => element('div', className, text),
  details: className => element('details', className),
  summary: (className, text) => element('summary', className, text),
}

document.getElementById('button-clear').addEventListener('click', () => {
  background.ClearResults()
  render()
})

render()

function render() {
  while (main.firstElementChild) {
    main.removeChild(main.firstElementChild)
  }

  const r = (background.Results || []).slice().reverse()
  if (r.length === 0) renderEmptyResult()
  else
    r.forEach(({ type, result }) => {
      if (type === 'request') return renderRequest(result)
      if (type === 'redirect') return renderRedirect(result)
      if (type === 'response') return renderResponse(result)
      console.error(`unknown result type: ${type}`)
    })
}

function renderEmptyResult() {
  const summary = Elm.summary('redirect-summary secondary', 'No results')
  renderResultContainer(summary)
}

function renderRequest(result) {
  const summary = Elm.summary('request-summary')
  summary.appendChild(Elm.div('method secondary', result.method))
  summary.appendChild(Elm.div('url', result.url))

  const detail = Elm.div('result-detail')
  detail.appendChild(horizontalDetail('Method', result.method))
  detail.appendChild(verticalDetail('URL', result.url))
  const ts = convertTimeStamp(result.timeStamp)
  detail.appendChild(horizontalDetail('TimeStamp', ts))
  detail.appendChild(horizontalDetail('Request ID', result.requestId))
  if (result.requestBody) {
    const rb = result.requestBody
    if (rb.error)
      detail.appendChild(verticalDetail('Request Body (error)', rb.error))
    if (rb.raw) detail.appendChild(verticalDetail('Request Body (raw)', rb.raw))
    if (rb.formData)
      detail.appendChild(verticalDetail('Request Body (formData)', rb.formData))
  }

  renderResultContainer(summary, detail)
}

function renderRedirect(result) {
  const summary = Elm.summary('redirect-summary redirect', result.statusLine)
  const detail = detailForResponse(result)
  detail.appendChild(verticalDetail('Redirect URL', result.redirectUrl))
  renderResultContainer(summary, detail)
}

function renderResponse(result) {
  const col = (() => {
    const s = Math.floor(result.statusCode / 100)
    if (s === 2) return 'success'
    if (s === 3) return 'redirect'
    if (s === 4) return 'warn'
    if (s === 5) return 'danger'
    return 'secondary'
  })()
  const summary = Elm.summary(`response-summary ${col}`, result.statusLine)
  const detail = detailForResponse(result)
  renderResultContainer(summary, detail)
}

function renderResultContainer(summary, detail) {
  const container = Elm.details('result-container')
  container.appendChild(summary)
  if (detail) container.appendChild(detail)
  main.appendChild(container)
}

function detailForResponse(result) {
  const detail = Elm.div('result-detail')
  detail.appendChild(horizontalDetail('Status', result.statusCode))
  detail.appendChild(horizontalDetail('IP', result.ip))
  detail.appendChild(horizontalDetail('FromCache', result.fromCache))
  const ts = convertTimeStamp(result.timeStamp)
  detail.appendChild(horizontalDetail('TimeStamp', ts))
  detail.appendChild(horizontalDetail('Request ID', result.requestId))
  if (result.responseHeaders) {
    const kv = result.responseHeaders.map(({ name, value }) => [name, value])
    detail.appendChild(verticalDetail('Response Headers', new Map(kv)))
  }
  return detail
}

function horizontalDetail(labelText, valueText) {
  const container = Elm.div('horizontal-detail')
  container.appendChild(Elm.div('label', labelText))
  container.appendChild(Elm.div('value', valueText))
  return container
}

function verticalDetail(labelText, valueContent) {
  const container = Elm.div('vertical-detail')
  const label = Elm.div('label', labelText)
  const value = Elm.div(
    'value',
    typeof valueContent === 'string' ? valueContent : null
  )
  const append = (k, v) => value.appendChild(horizontalDetail(k, v))
  if (!valueContent) console.warn('valueContent is not defined')
  else if (Array.isArray(valueContent))
    valueContent.forEach((v, idx) => append(idx, v))
  else if (valueContent instanceof Map)
    valueContent.forEach((v, k) => append(k, v))
  else if (typeof valueContent === 'object')
    Object.entries(valueContent).forEach(([k, v]) => append(k, v))

  container.appendChild(label)
  container.appendChild(value)
  return container
}

function element(tagName, className, text) {
  const e = document.createElement(tagName)
  e.className = className
  if (text !== undefined) e.textContent = text
  return e
}

function convertTimeStamp(ts) {
  const d = new Date(ts)
  return d
    .toLocaleDateString('ja', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    .replaceAll('/', '-')
    .concat('.')
    .concat(`00${d.getMilliseconds()}`.slice(-3))
}
