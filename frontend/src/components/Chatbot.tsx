import { useState, useRef, useEffect } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiUrl } from '@/config'

interface Source {
  id: string
  title: string
  similarity: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
}

// Shape of a source as returned by POST /api/chat
interface ApiSource {
  id: string
  similarity: number
  metadata?: {
    topic?: string
    filename?: string
  }
}

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your RAG chatbot assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // gpt-4.1-mini (the default OPENAI_CHAT_MODEL) has a ~1M token context window.
  // Update this if you switch to a model with a different limit.
  const CONTEXT_LIMIT = 1047576
  const MAX_MESSAGE_LENGTH = 4000

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Call backend API
    try {
      const response = await fetch(getApiUrl('api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const serverMessage: string | undefined = result?.error?.message

        if (response.status === 404) {
          // Conversation no longer exists on the server (e.g. database was reset)
          setConversationId(undefined)
          throw new Error('That conversation could not be found, so a new one has been started. Please send your message again.')
        }

        // 4xx errors (rate limit, message too long, ...) carry a message the user can act on
        if (response.status >= 400 && response.status < 500 && serverMessage) {
          throw new Error(serverMessage)
        }

        throw new Error('Sorry, I encountered an error processing your message. Please try again.')
      }

      // Save conversation ID for future messages
      if (result.data.conversationId) {
        setConversationId(result.data.conversationId)
      }

      // Update token usage
      if (result.data.usage) {
        setTokenUsage(result.data.usage)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.data.message,
        timestamp: new Date(),
        sources: (result.data.sources ?? []).map((source: ApiSource) => ({
          id: source.id,
          title: source.metadata?.topic || source.metadata?.filename || 'Untitled document',
          similarity: source.similarity,
        })),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      // Network failures (TypeError from fetch) get the generic message
      const content = error instanceof Error && !(error instanceof TypeError)
        ? error.message
        : 'Sorry, I encountered an error processing your message. Please try again.'
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const usagePercentage = tokenUsage ? (tokenUsage.totalTokens / CONTEXT_LIMIT) * 100 : 0
  const getUsageColor = () => {
    if (usagePercentage >= 90) return 'bg-red-500'
    if (usagePercentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">RAG Chatbot</h2>
              <p className="text-sm text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          
          {/* Context Usage Gauge */}
          {tokenUsage && (
            <div className="flex flex-col items-end gap-1 min-w-[200px]">
              <div className="text-xs text-muted-foreground">
                Context: {tokenUsage.totalTokens.toLocaleString()} / {CONTEXT_LIMIT.toLocaleString()} tokens
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-300", getUsageColor())}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {usagePercentage.toFixed(1)}% used
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea.Root className="flex-1 overflow-hidden" ref={scrollAreaRef}>
        <ScrollArea.Viewport className="h-full w-full">
          <div className="space-y-4 p-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 border-t border-border pt-2">
                      <p className="text-xs font-medium opacity-70">Sources</p>
                      <ul className="mt-1 space-y-0.5">
                        {message.sources.map((source, index) => (
                          <li key={source.id} className="text-xs opacity-70">
                            📚 [{index + 1}] {source.title} ({(source.similarity * 100).toFixed(0)}% match)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex touch-none select-none bg-transparent p-0.5 transition-colors duration-150 ease-out hover:bg-muted data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border before:absolute before:left-1/2 before:top-1/2 before:h-full before:min-h-[44px] before:w-full before:min-w-[44px] before:-translate-x-1/2 before:-translate-y-1/2" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isLoading}
            className={cn(
              "flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex items-center justify-center rounded-lg bg-primary px-4 py-3",
              "text-primary-foreground transition-colors",
              "hover:bg-primary/90",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
