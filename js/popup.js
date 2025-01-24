class Storage {
  key = 'result'

  async get() {
    const res = await chrome.storage.session.get(this.key)
    return res[this.key]
  }

  async clear() {
    await chrome.storage.session.clear()
  }
}

const storage = new Storage()

const main = document.getElementById('main')

const Elm = {
  div: (className, text) => element('div', className, text),
  details: className => element('details', className),
  summary: (className, text) => element('summary', className, text),
}

document
  .getElementById('button-clear')
  .addEventListener('click', () => storage.clear().then(() => render()))

render()

async function render() {
  while (main.firstElementChild) {
    main.removeChild(main.firstElementChild)
  }

  const r = ((await storage.get()) || [])
    .slice()
    .toSorted((a, b) => b.result.timeStamp - a.result.timeStamp)

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
  detail.appendChild(horizontalDetail('Tab ID', result.tabId))
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
  const summary = Elm.summary(
    'redirect-summary redirect',
    getStatusLine(result),
  )
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
  const summary = Elm.summary(`response-summary ${col}`, getStatusLine(result))
  const detail = detailForResponse(result)
  renderResultContainer(summary, detail)
}

function getStatusLine(result) {
  return result.statusLine
    .split(' ')
    .slice(0, 2)
    .concat(getStatusMessage(result.statusCode))
    .join(' ')
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
  detail.appendChild(horizontalDetail('Tab ID', result.tabId))
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
    typeof valueContent === 'string' ? valueContent : null,
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

function getStatusMessage(status) {
  const list = {
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',
    103: 'Early Hints',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    419: 'Insufficient Space on Resource',
    420: 'Method Failure',
    422: 'Unprocessable Entity',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required',
  }
  return list[status] || ''
}
