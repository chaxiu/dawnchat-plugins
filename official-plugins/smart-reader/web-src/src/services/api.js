const getBasePath = () => {
  if (typeof window === 'undefined') return ''
  const rawPath = window.location?.pathname || '/'
  const cleaned = rawPath.replace(/\/index\.html$/, '')
  if (!cleaned || cleaned === '/') return ''
  return cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned
}

const withBase = (url) => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = getBasePath()
  if (!base) return url
  return `${base}${url}`
}

export const fetchJson = async (url, options = {}) => {
  const res = await fetch(withBase(url), {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return await res.json()
}

export const listLibrary = async () => {
  return await fetchJson('/api/library/list')
}

export const addFile = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(withBase('/api/library/add'), { method: 'POST', body: form })
  return await res.json()
}

export const openSession = async (fileId) => {
  return await fetchJson('/api/session/open', {
    method: 'POST',
    body: JSON.stringify({ file_id: fileId })
  })
}

export const sessionStatus = async () => {
  return await fetchJson('/api/session/status')
}

export const fetchHostConfig = async () => {
  return await fetchJson('/api/host/config')
}

export const chatCompletions = async (question, fileId) => {
  const res = await fetch(withBase('/api/chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, file_id: fileId })
  })
  return await res.json()
}

export const fetchPdf = async (fileId) => {
  const res = await fetch(withBase(`/api/library/file/${fileId}`))
  return await res.arrayBuffer()
}
