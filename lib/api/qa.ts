import { apiFetchResponse } from "./client"

const KNOWPOST_PREFIX = "/api/knowposts"

export type QaStreamRequest = {
  question: string
  topK?: number
  maxTokens?: number
  accessToken?: string | null
  signal?: AbortSignal
  onMessage: (message: string) => void
}

function buildQaQuery({
  question,
  topK = 5,
  maxTokens = 1024,
}: Pick<QaStreamRequest, "question" | "topK" | "maxTokens">) {
  const normalizedQuestion = question.trim()
  if (!normalizedQuestion) {
    throw new Error("请输入问题")
  }

  return new URLSearchParams({
    question: normalizedQuestion,
    topK: String(topK),
    maxTokens: String(maxTokens),
  }).toString()
}

function emitSseEvent(rawEvent: string, onMessage: (message: string) => void) {
  const dataLines = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => {
      const value = line.slice("data:".length)
      return value.startsWith(" ") ? value.slice(1) : value
    })

  if (dataLines.length === 0) return

  const message = dataLines.join("\n")
  if (message && message !== "[DONE]") {
    onMessage(message)
  }
}

function consumeSseBuffer(
  buffer: string,
  onMessage: (message: string) => void,
) {
  let remaining = buffer
  while (remaining.length > 0) {
    const match = remaining.match(/\r?\n\r?\n/)
    if (!match || match.index === undefined) break

    const rawEvent = remaining.slice(0, match.index)
    emitSseEvent(rawEvent, onMessage)
    remaining = remaining.slice(match.index + match[0].length)
  }
  return remaining
}

async function readSseResponse(
  response: Response,
  onMessage: (message: string) => void,
) {
  if (!response.body) {
    emitSseEvent(await response.text(), onMessage)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = consumeSseBuffer(buffer, onMessage)
    }
  } finally {
    reader.releaseLock()
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    emitSseEvent(buffer, onMessage)
  }
}

async function streamQa(path: string, request: QaStreamRequest) {
  const response = await apiFetchResponse(
    `${path}?${buildQaQuery(request)}`,
    {
      accessToken: request.accessToken,
      headers: {
        Accept: "text/event-stream",
      },
      signal: request.signal,
    },
  )

  await readSseResponse(response, request.onMessage)
}

export const qaService = {
  streamKnowledgeBase: (request: QaStreamRequest) =>
    streamQa(`${KNOWPOST_PREFIX}/qa/stream`, request),

  streamKnowpost: (postId: string, request: QaStreamRequest) =>
    streamQa(`${KNOWPOST_PREFIX}/${postId}/qa/stream`, request),
}
