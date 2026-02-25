// CommonJS — matches existing AXO API route format
const MAX_LENGTH = 30_000

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, prompt } = req.body || {}

  if (!url || !prompt) {
    return res.status(400).json({ error: 'url and prompt are required' })
  }

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' })
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

  try {
    // Fetch raw HTML and Jina markdown in parallel
    const [htmlResult, mdResult] = await Promise.allSettled([
      fetch(parsedUrl.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AXOBot/1.0)' },
        signal: AbortSignal.timeout(10_000),
      }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      }),
      fetch(`https://r.jina.ai/${parsedUrl.toString()}`, {
        headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
        signal: AbortSignal.timeout(20_000),
      }).then(r => {
        if (!r.ok) throw new Error(`Jina HTTP ${r.status}`)
        return r.text()
      }),
    ])

    if (htmlResult.status === 'rejected') {
      return res.status(400).json({
        error: `Could not fetch URL: ${htmlResult.reason?.message ?? 'Unknown error'}`,
      })
    }
    if (mdResult.status === 'rejected') {
      return res.status(400).json({
        error: `Could not fetch markdown: ${mdResult.reason?.message ?? 'Unknown error'}`,
      })
    }

    const rawHtml = htmlResult.value
    const rawMd = mdResult.value

    const htmlTruncated = rawHtml.length > MAX_LENGTH
    const mdTruncated = rawMd.length > MAX_LENGTH

    const htmlContent = htmlTruncated
      ? rawHtml.slice(0, MAX_LENGTH) + '\n\n[truncated at 30,000 characters]'
      : rawHtml
    const mdContent = mdTruncated
      ? rawMd.slice(0, MAX_LENGTH) + '\n\n[truncated at 30,000 characters]'
      : rawMd

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`
    const SYSTEM = "You are a helpful web research assistant. Analyze the provided webpage content and answer the user's question clearly and concisely."

    const makeBody = (content, label) =>
      JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            parts: [
              {
                text: `The following is the ${label} of a webpage.\n\nUser question: ${prompt}\n\nContent:\n${content}`,
              },
            ],
          },
        ],
      })

    // Call Gemini for both formats in parallel
    const [htmlGemini, mdGemini] = await Promise.all([
      fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: makeBody(htmlContent, 'raw HTML source'),
      }).then(r => r.json()),
      fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: makeBody(mdContent, 'markdown version (converted via r.jina.ai)'),
      }).then(r => r.json()),
    ])

    const getAnswer = g => g.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no response)'
    const getTokens = g => ({
      prompt: g.usageMetadata?.promptTokenCount ?? 0,
      response: g.usageMetadata?.candidatesTokenCount ?? 0,
      total: g.usageMetadata?.totalTokenCount ?? 0,
    })

    return res.status(200).json({
      url,
      prompt,
      html: {
        answer: getAnswer(htmlGemini),
        truncated: htmlTruncated,
        contentLength: rawHtml.length,
        tokens: getTokens(htmlGemini),
      },
      markdown: {
        answer: getAnswer(mdGemini),
        truncated: mdTruncated,
        contentLength: rawMd.length,
        tokens: getTokens(mdGemini),
      },
    })
  } catch (err) {
    console.error('web-fetch-compare error:', err)
    return res.status(500).json({ error: 'An unexpected error occurred.' })
  }
}
