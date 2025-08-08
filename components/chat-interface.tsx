"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, User, Bot, Zap, DollarSign, AlertCircle, Search, Paperclip, ArrowUp, Copy, RotateCcw, Edit3, ArrowDown, Sparkles, Code, BookOpen, Lightbulb, Globe, Wrench, MoreHorizontal, Check, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { aiService, AVAILABLE_MODELS, type ChatMessage, type ChatResponse } from "@/lib/ai-service"
import { apiKeyStore } from "@/lib/api-key-store"
import { FormattedText } from "@/components/formatted-text"

interface ChatInterfaceProps {
  conversationId: string | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  tokens?: number
  cost?: number
  model?: string
  reasoningTokens?: number
    inputTokens?: number
    outputTokens?: number
    contextTokensAfter?: number
    cumulativeCost?: number
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [message, setMessage] = useState("")
  const [selectedModel, setSelectedModel] = useState(() => {
    // Load persisted model from localStorage on initial render
    const savedModel = localStorage.getItem("ai-chat-selected-model")
    return savedModel || "gpt-4o-mini"
  })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [totalTokens, setTotalTokens] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [pinnedModels, setPinnedModels] = useState<string[]>(["gpt-4o-mini", "gpt-4o"])
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [showMobileHeader, setShowMobileHeader] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTopRef = useRef(0)
  const [activeTools, setActiveTools] = useState<{search: boolean; attach: boolean; mcp: boolean}>({ search: false, attach: false, mcp: false })
  const toggleTool = (key: 'search' | 'attach' | 'mcp') => setActiveTools(prev => ({ ...prev, [key]: !prev[key] }))

  // Sample questions for different categories
  const sampleQuestions = {
    create: [
      "Write a story about a robot who learns to feel emotions",
      "Create a business plan for a sustainable coffee shop",
      "Design a workout routine for beginners",
      "Generate a creative social media campaign for eco-friendly products"
    ],
    explore: [
      "How does AI work?",
      "Are black holes real?",
      "What are the latest developments in quantum computing?",
      "Explain the concept of parallel universes"
    ],
    code: [
      "Write a Python function to sort a list",
      "How do I create a REST API in Node.js?",
      "Explain the difference between React hooks and class components",
      "Help me debug this JavaScript error"
    ],
    learn: [
      "How many Rs are in the word \"strawberry\"?",
      "What is the meaning of life?",
      "Explain quantum physics in simple terms",
      "How do neural networks learn?"
    ]
  }

  const getCurrentQuestions = () => {
    if (!selectedCategory) {
      return [
        "How does AI work?",
        "Are black holes real?",
        "How many Rs are in the word \"strawberry\"?",
        "What is the meaning of life?"
      ]
    }
    return sampleQuestions[selectedCategory as keyof typeof sampleQuestions] || []
  }

  const isReasoningModel = (modelId: string) => modelId.startsWith("o") || modelId.startsWith("gpt-5")

  // Function to handle model selection and persist it
  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel)
    localStorage.setItem("ai-chat-selected-model", newModel)
  }


  useEffect(() => {
    // Track responsive breakpoint for small screens
    const media = window.matchMedia('(max-width: 640px)')
    const handle = () => setIsSmallScreen(media.matches)
    handle()
    media.addEventListener('change', handle)
    
    return () => media.removeEventListener('change', handle)
  }, [])

  useEffect(() => {
    setHasApiKey(
      apiKeyStore.hasApiKey() ||
      apiKeyStore.hasGeminiApiKey() ||
      apiKeyStore.hasGroqApiKey() ||
      (apiKeyStore as any).hasClaudeApiKey?.()
    )
    
    // Load pinned models from settings
    const loadPinnedModels = () => {
      const savedSettings = localStorage.getItem("ai-workbench-settings")
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          if (settings.pinnedModels && settings.pinnedModels.length > 0) {
            setPinnedModels(settings.pinnedModels)
          }
        } catch (error) {
          console.error("Failed to load pinned models:", error)
        }
      }
      
      // Also check window.userSettings for real-time updates
      if ((window as any).userSettings?.pinnedModels) {
        setPinnedModels((window as any).userSettings.pinnedModels)
      }
    }
    
    loadPinnedModels()
    
    // Set up interval to check for updates from settings
    const interval = setInterval(loadPinnedModels, 1000)
    
    // Load conversation messages if conversationId exists
    if (conversationId) {
      const savedConversations = localStorage.getItem("ai-chat-conversations")
      if (savedConversations) {
        try {
          const conversations = JSON.parse(savedConversations)
          const conversation = conversations.find((c: any) => c.id === conversationId)
          if (conversation && conversation.messages) {
            setMessages(conversation.messages)
            // Calculate totals from loaded messages
            const totalTokensUsed = conversation.messages.reduce((sum: number, msg: Message) => sum + (msg.tokens || 0), 0)
            const totalCostUsed = conversation.messages.reduce((sum: number, msg: Message) => sum + (msg.cost || 0), 0)
            setTotalTokens(totalTokensUsed)
            setTotalCost(totalCostUsed)
          }
        } catch (error) {
          console.error("Failed to load conversation:", error)
        }
      }
    } else {
      // New conversation - clear all state
      setMessages([])
      setTotalTokens(0)
      setTotalCost(0)
      setMessage("") // Clear input
      setSelectedCategory(null) // Reset category selection
      setError(null) // Clear any errors
      setEditingMessageId(null) // Clear edit mode
      setEditingContent("") // Clear edit content
    }
    
    return () => clearInterval(interval)
  }, [conversationId])

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Throttled scroll function to prevent violent movement during streaming
  const throttledScrollToBottom = useCallback(() => {
    if (scrollThrottleRef.current) {
      clearTimeout(scrollThrottleRef.current)
    }
    
    scrollThrottleRef.current = setTimeout(() => {
      if (streamingMessageId) {
        // During streaming, use instant scroll to reduce visual jank
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
      } else {
        // Normal smooth scroll for completed messages
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    }, streamingMessageId ? 250 : 50) // Much less frequent updates during streaming
  }, [streamingMessageId])

  // Check if user has scrolled up to show scroll-to-bottom button
  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollToBottom(!isAtBottom && messages.length > 0)

      // Show/hide mobile header based on scroll direction
      const last = lastScrollTopRef.current
      const delta = scrollTop - last
      if (Math.abs(delta) > 4) {
        if (scrollTop < 8) {
          setShowMobileHeader(true)
        } else {
          setShowMobileHeader(delta < 0)
        }
      }
      lastScrollTopRef.current = scrollTop
    }
  }, [messages.length])

  // Improved auto-scroll logic to prevent violent movement
  useEffect(() => {
    if (streamingMessageId) {
      // During streaming, throttle scroll updates more aggressively
      throttledScrollToBottom()
    }
  }, [messages.length, streamingMessageId, throttledScrollToBottom]) // Only on length change, not full messages array

  // Auto-scroll for new messages (non-streaming)
  useEffect(() => {
    if (!streamingMessageId && messages.length > 0) {
      const timer = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timer)
    }
  }, [messages.length, streamingMessageId, scrollToBottom])

  // Add scroll listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollPosition)
      return () => scrollContainer.removeEventListener('scroll', checkScrollPosition)
    }
  }, [checkScrollPosition])

  // Cleanup throttle timer on unmount
  useEffect(() => {
    return () => {
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current)
      }
    }
  }, [])

  // Filter models to only show pinned ones
  const pinnedModelsList = AVAILABLE_MODELS.filter(model => pinnedModels.includes(model.id))

  // Keep user's explicit selection even if it's not pinned.
  // Only change selection if the model no longer exists in AVAILABLE_MODELS.
  useEffect(() => {
    const exists = AVAILABLE_MODELS.some(m => m.id === selectedModel)
    if (!exists) {
      const fallback = pinnedModelsList[0]?.id || 'gpt-4o-mini'
      setSelectedModel(fallback)
      localStorage.setItem("ai-chat-selected-model", fallback)
    }
  }, [selectedModel, pinnedModelsList])

  // Models displayed in the selector: pinned ones plus current selection if it's not pinned
  const selectedModelInfoForList = AVAILABLE_MODELS.find(m => m.id === selectedModel)
  const selectModels = (
    selectedModelInfoForList && !pinnedModels.includes(selectedModel)
      ? [selectedModelInfoForList, ...pinnedModelsList]
      : pinnedModelsList
  ).filter((model, index, arr) => arr.findIndex(m => m.id === model.id) === index)

  // Calculate estimated cost for current message
  const estimatedTokens = Math.ceil(message.length / 4) // Rough estimation
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel)
  const estimatedCost = selectedModelInfo 
    ? (estimatedTokens * selectedModelInfo.costPer1kTokens.input) / 1000
    : 0

  // --- Token & Cost Estimation Helpers ---
  const estimateTokensForText = useCallback((text: string): number => {
    // Heuristic: ~4 chars per token
    return Math.ceil((text || "").length / 4)
  }, [])

  const MESSAGE_OVERHEAD_TOKENS = 6

  const estimateTokensForMessages = useCallback((msgs: Message[]): number => {
    return msgs.reduce((sum, m) => sum + estimateTokensForText(m.content) + MESSAGE_OVERHEAD_TOKENS, 0)
  }, [estimateTokensForText])

  const formatTokens = (value?: number) => typeof value === 'number' ? value.toLocaleString() : ''
  const formatCost = (value?: number) => typeof value === 'number' ? `$${value.toFixed(5)}` : ''

  const handleSend = async () => {
    if (!message.trim()) return
    
    const inputTokensForUser = estimateTokensForText(message.trim())
    const inputCostForUser = selectedModelInfo 
      ? (inputTokensForUser * selectedModelInfo.costPer1kTokens.input) / 1000
      : 0

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tokens: inputTokensForUser,
      inputTokens: inputTokensForUser,
      cost: inputCostForUser,
    }

    // Record context usage immediately after the user message
    const contextAfterUser = estimateTokensForMessages([...messages, userMessage])
    userMessage.contextTokensAfter = contextAfterUser

    setMessages(prev => [...prev, userMessage])
    setMessage("")
    setError(null)

    // Check if we have the appropriate API key for the selected model
    const selectedModelInfoNow = AVAILABLE_MODELS.find(m => m.id === selectedModel)
    const needsOpenAI = selectedModelInfoNow?.provider === 'openai' && !apiKeyStore.hasApiKey()
    const needsGemini = selectedModelInfoNow?.provider === 'gemini' && !apiKeyStore.hasGeminiApiKey()
    const needsGroq = selectedModelInfoNow?.provider === 'groq' && !apiKeyStore.hasGroqApiKey()
    const needsClaude = selectedModelInfoNow?.provider === 'claude' && !(apiKeyStore as any).hasClaudeApiKey?.()
    
    if (!hasApiKey || needsOpenAI || needsGemini || needsGroq || needsClaude) {
      const providerName = selectedModelInfoNow?.provider === 'gemini' ? 'Gemini' : 
                          selectedModelInfoNow?.provider === 'groq' ? 'Groq' :
                          selectedModelInfoNow?.provider === 'claude' ? 'Claude' : 'OpenAI'
      const demoResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `👋 This is a demo response! To get real AI responses, please add your ${providerName} API key in the settings. Your API key will be stored securely in your browser and used only for your conversations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      const updatedMessages = [...messages, userMessage, demoResponse]
      
      setTimeout(() => {
        setMessages(updatedMessages)
        // Save demo conversation to localStorage so it appears in sidebar
        saveConversation(updatedMessages, 0, 0)
      }, 1000)
      return
    }

    setIsGenerating(true)

    // Set loading indicator in sidebar for current conversation
    if (conversationId && (window as any).conversationHelpers?.setConversationLoading) {
      (window as any).conversationHelpers.setConversationLoading(conversationId)
    }

    try {
      const chatMessages: ChatMessage[] = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: message.trim() }
      ]

      // Create placeholder assistant message for streaming
      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel
      }

      // Add user message and placeholder assistant message
      const messagesWithPlaceholder = [...messages, userMessage, assistantMessage]
      setMessages(messagesWithPlaceholder)
      setStreamingMessageId(assistantMessageId)

      // For reasoning models, use non-streaming to capture usage.reasoning tokens reliably
      if (isReasoningModel(selectedModel)) {
        const chatMessages: ChatMessage[] = [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage.content }
        ]

        const resp = await aiService.sendMessage(chatMessages, selectedModel, 0.7)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: resp.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tokens: resp.tokensUsed.total,
          inputTokens: (resp.tokensUsed as any).input || (resp as any).tokensUsed?.input || undefined,
          outputTokens: (resp.tokensUsed as any).output || (resp as any).tokensUsed?.output || undefined,
          cost: resp.cost,
          reasoningTokens: (resp.tokensUsed as any).reasoning || 0,
          model: resp.model
        }

        // Compute context after assistant using server usage for prompt when available
        const promptTokens = (resp.tokensUsed as any).input ?? estimateTokensForMessages([...
          messages,
          userMessage,
        ])
        const completionTokens = (resp.tokensUsed as any).output ?? estimateTokensForText(assistantMessage.content)
        const finalMessages = [...messages, userMessage, assistantMessage]
        assistantMessage.contextTokensAfter = promptTokens + completionTokens + MESSAGE_OVERHEAD_TOKENS
        setMessages(finalMessages)
        setTotalTokens(prev => prev + (assistantMessage.tokens || 0))
        setTotalCost(prev => prev + (assistantMessage.cost || 0))
        saveConversation(finalMessages, assistantMessage.tokens || 0, assistantMessage.cost || 0)
        // If a reasoning summary is available, append a collapsible note under the assistant message
        if ((resp as any).reasoningSummary) {
          // Append a faint summary line to the assistant content
          setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
            ...m,
            content: m.content + "\n\n---\n" + `Reasoning summary: ${(resp as any).reasoningSummary}`
          } : m))
        }
        return
      }

      // Start streaming
      const streamResponse = await aiService.sendMessageStream(
        chatMessages,
        selectedModel,
        0.7
      )

      const reader = streamResponse.stream.getReader()
      let fullContent = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          fullContent += value
          
          // Update the streaming message content
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent }
              : msg
          ))
        }
      } finally {
        reader.releaseLock()
      }

      // Calculate tokens/cost; prefer API usage metrics when available (reasoning models)
      const modelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel)
      const usage: any = await (streamResponse as any).usage?.catch(() => null)
      const finalTokensUsed = usage?.outputTokens ?? Math.ceil(fullContent.length / 4)
      const finalCost = usage && modelInfo
        ? ((usage.inputTokens * modelInfo.costPer1kTokens.input) + (usage.outputTokens * modelInfo.costPer1kTokens.output)) / 1000
        : (modelInfo ? (finalTokensUsed * modelInfo.costPer1kTokens.output) / 1000 : 0)

      // Update final message with metadata
      const finalMessage = {
        ...assistantMessage,
        content: fullContent,
        tokens: (usage?.totalTokens ?? (inputTokensForUser + finalTokensUsed)),
        inputTokens: usage?.inputTokens ?? inputTokensForUser,
        outputTokens: finalTokensUsed,
        cost: finalCost,
        reasoningTokens: usage?.reasoningTokens,
        model: streamResponse.model
      }

      const finalMessages = [...messages, userMessage, finalMessage]
      const promptTokensPrevCall = usage?.inputTokens ?? estimateTokensForMessages([...
        messages,
        userMessage,
      ])
      // Next request will include all previous messages plus this assistant message
      finalMessage.contextTokensAfter = promptTokensPrevCall + finalTokensUsed + MESSAGE_OVERHEAD_TOKENS
      setMessages(finalMessages)
      setTotalTokens(prev => prev + finalTokensUsed)
      setTotalCost(prev => prev + finalCost)

      // Save conversation to localStorage
      saveConversation(finalMessages, finalTokensUsed, finalCost)

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
      setStreamingMessageId(null)
      // Clear loading indicator in sidebar
      if ((window as any).conversationHelpers?.clearConversationLoading) {
        (window as any).conversationHelpers.clearConversationLoading()
      }
    }
  }

  const saveConversation = (updatedMessages: Message[], tokensUsed: number, cost: number) => {
    if (!conversationId && updatedMessages.length > 0) {
      // Create new conversation
      const newConversationId = `conv-${Date.now()}`
      const firstUserMessage = updatedMessages.find(m => m.role === "user")
      const title = firstUserMessage ? 
        firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "") :
        "New Conversation"
      
      const newConversation = {
        id: newConversationId,
        title,
        preview: firstUserMessage?.content || "",
        timestamp: new Date().toLocaleTimeString(),
        tokens: tokensUsed,
        cost,
        createdAt: new Date(),
        messages: updatedMessages
      }

      // Add to conversations list using the helper function
      if ((window as any).conversationHelpers?.addConversation) {
        (window as any).conversationHelpers.addConversation(newConversation)
      }

      // Update the parent component to switch to this conversation
      if ((window as any).setSelectedConversation) {
        (window as any).setSelectedConversation(newConversationId)
      }

      // Set loading indicator for the new conversation if currently generating
      if (isGenerating && (window as any).conversationHelpers?.setConversationLoading) {
        (window as any).conversationHelpers.setConversationLoading(newConversationId)
      }
    } else if (conversationId) {
      // Update existing conversation
      const savedConversations = localStorage.getItem("ai-chat-conversations")
      if (savedConversations) {
        try {
          const conversations = JSON.parse(savedConversations)
          const updatedConversations = conversations.map((conv: any) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: updatedMessages,
                tokens: (conv.tokens || 0) + tokensUsed,
                cost: (conv.cost || 0) + cost,
                preview: updatedMessages.find((m: Message) => m.role === "user")?.content || conv.preview
              }
            }
            return conv
          })
          
          localStorage.setItem("ai-chat-conversations", JSON.stringify(updatedConversations))
          
          // Update using helper function
          if ((window as any).conversationHelpers?.updateConversation) {
            (window as any).conversationHelpers.updateConversation(conversationId, {
              messages: updatedMessages,
              tokens: (totalTokens || 0) + tokensUsed,
              cost: (totalCost || 0) + cost
            })
          }
        } catch (error) {
          console.error("Failed to save conversation:", error)
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleRegenerateMessage = async (messageIndex: number) => {
    const messageToRegenerate = messages[messageIndex]
    if (messageToRegenerate.role !== 'assistant') return

    // Remove the assistant message and any messages after it
    const updatedMessages = messages.slice(0, messageIndex)
    setMessages(updatedMessages)
    
    // Get the user message that prompted this response
    const userMessage = messages[messageIndex - 1]
    if (!userMessage || userMessage.role !== 'user') return

    setIsGenerating(true)
    setError(null)

    // Set loading indicator in sidebar for current conversation
    if (conversationId && (window as any).conversationHelpers?.setConversationLoading) {
      (window as any).conversationHelpers.setConversationLoading(conversationId)
    }

    try {
      const chatMessages: ChatMessage[] = updatedMessages.map(m => ({ role: m.role, content: m.content }))
      chatMessages.push({ role: "user", content: userMessage.content })

      // Create placeholder assistant message for streaming
      const assistantMessageId = Date.now().toString()
      const newAssistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel
      }

      const messagesWithPlaceholder = [...updatedMessages, newAssistantMessage]
      setMessages(messagesWithPlaceholder)
      setStreamingMessageId(assistantMessageId)

      // Start streaming
      const streamResponse = await aiService.sendMessageStream(
        chatMessages,
        selectedModel,
        0.7
      )

      const reader = streamResponse.stream.getReader()
      let fullContent = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          fullContent += value
          
          // Update the streaming message content
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent }
              : msg
          ))
        }
      } finally {
        reader.releaseLock()
      }

      // Calculate tokens/cost; prefer API usage metrics when available (reasoning models)
      const modelInfo2 = AVAILABLE_MODELS.find(m => m.id === selectedModel)
      const usage2: any = await (streamResponse as any).usage?.catch(() => null)
      const finalTokensUsed2 = usage2?.outputTokens ?? Math.ceil(fullContent.length / 4)
      const finalCost2 = usage2 && modelInfo2
        ? ((usage2.inputTokens * modelInfo2.costPer1kTokens.input) + (usage2.outputTokens * modelInfo2.costPer1kTokens.output)) / 1000
        : (modelInfo2 ? (finalTokensUsed2 * modelInfo2.costPer1kTokens.output) / 1000 : 0)

      // Update final message with metadata
      const finalMessage = {
        ...newAssistantMessage,
        content: fullContent,
        tokens: usage2?.totalTokens ?? finalTokensUsed2,
        inputTokens: usage2?.inputTokens,
        outputTokens: finalTokensUsed2,
        cost: finalCost2,
        reasoningTokens: usage2?.reasoningTokens,
        model: streamResponse.model
      }

      const finalMessages = [...updatedMessages, finalMessage]
      finalMessage.contextTokensAfter = estimateTokensForMessages(finalMessages)
      setMessages(finalMessages)
      setTotalTokens(prev => prev + finalTokensUsed2)
      setTotalCost(prev => prev + finalCost2)

      // Save conversation
      saveConversation(finalMessages, finalTokensUsed2, finalCost2)

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
      setStreamingMessageId(null)
      // Clear loading indicator in sidebar
      if ((window as any).conversationHelpers?.clearConversationLoading) {
        (window as any).conversationHelpers.clearConversationLoading()
      }
    }
  }

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
  }

  const handleSaveEdit = (messageId: string) => {
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, content: editingContent } : msg
    )
    setMessages(updatedMessages)
    setEditingMessageId(null)
    setEditingContent("")
    
    // Save to localStorage
    if (conversationId) {
      const savedConversations = localStorage.getItem("ai-chat-conversations")
      if (savedConversations) {
        try {
          const conversations = JSON.parse(savedConversations)
          const updatedConversations = conversations.map((conv: any) => {
            if (conv.id === conversationId) {
              return { ...conv, messages: updatedMessages }
            }
            return conv
          })
          localStorage.setItem("ai-chat-conversations", JSON.stringify(updatedConversations))
        } catch (error) {
          console.error("Failed to save edited message:", error)
        }
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  // Lightweight animated typing indicator used for streaming and thinking states
  const TypingDots: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`inline-flex items-end gap-1 ${className}`} aria-label="Assistant is typing" aria-live="polite">
      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
      <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
      <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
    </div>
  )

  // Circular remaining-context indicator (depletes as conversation grows)
  const CircularUsage: React.FC<{ used: number, max: number, size?: number, className?: string }> = ({ used, max, size = 14, className = "" }) => {
    const pctUsed = Math.min(100, Math.max(0, Math.round((used / Math.max(1, max)) * 100)))
    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title={`${used.toLocaleString()} / ${max.toLocaleString()} tokens`}
        aria-label={`Context used ${pctUsed}%`}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(#ffffff ${pctUsed}%, rgba(100,116,139,0.35) 0)`, transform: 'rotate(-90deg)' }}
        />
        <div className="absolute inset-[2px] bg-slate-900 rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
      {/* Header with conversation name and stats */}
      {hasApiKey && messages.length > 0 && (
        <div className="hidden md:flex items-center justify-between p-4 border-b border-slate-600/50">
          {/* Conversation Name */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-slate-300 truncate">
              {conversationId ? (() => {
                // Get conversation title from localStorage
                const savedConversations = localStorage.getItem("ai-chat-conversations")
                if (savedConversations) {
                  try {
                    const conversations = JSON.parse(savedConversations)
                    const conversation = conversations.find((c: any) => c.id === conversationId)
                    return conversation?.title || "Untitled Conversation"
                  } catch {
                    return "Untitled Conversation"
                  }
                }
                return "Untitled Conversation"
              })() : "New Conversation"}
            </h2>
          </div>
          
          {/* Stats (desktop only) */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>{totalTokens} tokens</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${totalCost.toFixed(5)}</span>
            </div>
          </div>
        </div>
      )}
        
      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Messages Container - extends to bottom */}
      <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto pb-40 chat-scroll-area ${messages.length > 0 ? 'pt-10 md:pt-0' : ''}`}>
        {/* Mobile stats pill near hamburger */}
        {messages.length > 0 && (
          <div
            className={`md:hidden fixed z-30 left-14 transition-opacity duration-150 ease-out ${showMobileHeader ? 'opacity-100' : 'opacity-0'}`}
            style={{ top: `calc(env(safe-area-inset-top, 0px) + 8px)` }}
          >
            <div className="inline-flex h-9 items-center gap-3 text-[11px] leading-none text-slate-300 rounded-full px-2 overflow-hidden">
              {/* Conversation title */}
              <div className="max-w-[42vw] truncate text-slate-200">
                {conversationId ? (() => {
                  const savedConversations = localStorage.getItem("ai-chat-conversations")
                  if (savedConversations) {
                    try {
                      const conversations = JSON.parse(savedConversations)
                      const conversation = conversations.find((c: any) => c.id === conversationId)
                      return conversation?.title || "Untitled"
                    } catch {
                      return "Untitled"
                    }
                  }
                  return "Untitled"
                })() : "Untitled"}
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>{totalTokens}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>${totalCost.toFixed(5)}</span>
              </div>
            </div>
          </div>
        )}
        {/* Modern Welcome Screen */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8">
            <div className="text-center max-w-xl mx-auto">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              
              <h1 className="text-2xl font-semibold text-white mb-2">
                What can I help you with?
              </h1>
              <p className="text-gray-400 text-base mb-8">
                Choose a category below or ask me anything
              </p>
              
              {/* Category Pills - 2x2 on small screens */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-2 mb-6">
                <button 
                  onClick={() => setSelectedCategory(selectedCategory === 'create' ? null : 'create')}
                  className={`inline-flex w-full items-center justify-center sm:justify-start h-10 leading-none gap-2 px-3 rounded-full text-sm transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    selectedCategory === 'create' 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Create</span>
                </button>
                
                <button 
                  onClick={() => setSelectedCategory(selectedCategory === 'explore' ? null : 'explore')}
                  className={`inline-flex w-full items-center justify-center sm:justify-start h-10 leading-none gap-2 px-3 rounded-full text-sm transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    selectedCategory === 'explore' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Explore</span>
                </button>
                
                <button 
                  onClick={() => setSelectedCategory(selectedCategory === 'code' ? null : 'code')}
                  className={`inline-flex w-full items-center justify-center sm:justify-start h-10 leading-none gap-2 px-3 rounded-full text-sm transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    selectedCategory === 'code' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>Code</span>
                </button>
                
                <button 
                  onClick={() => setSelectedCategory(selectedCategory === 'learn' ? null : 'learn')}
                  className={`inline-flex w-full items-center justify-center sm:justify-start h-10 leading-none gap-2 px-3 rounded-full text-sm transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    selectedCategory === 'learn' 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Learn</span>
                </button>
              </div>
              
              {/* Sample Questions (limit to 3 on small screens) */}
              <div className="space-y-2 max-w-md mx-auto">
                {getCurrentQuestions().slice(0, isSmallScreen ? 3 : undefined).map((question, index) => (
                  <button 
                    key={index}
                    onClick={() => setMessage(question)}
                    className="w-full text-left p-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
                  >
                    <span className="text-sm">{question}</span>
                  </button>
                ))}
              </div>

              {!hasApiKey && (
                <div className="mt-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                  <p className="text-yellow-300 font-medium">
                    🔑 Add your API keys in settings to start chatting
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="w-full mx-auto px-4 md:px-6 py-6 space-y-4">
            {messages.map((msg, index) => (
              <div key={msg.id} className={`flex gap-4 group min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="hidden sm:flex w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className={`${msg.role === "user" ? "max-w-[85%] md:max-w-[70%] order-1" : "max-w-[90%] md:flex-1 min-w-0"}`}>
                  {editingMessageId === msg.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full min-h-[80px] bg-gray-800 border border-gray-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(msg.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="text-gray-400 hover:text-white px-4 py-2 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Message bubble
                    <div className="relative">
                      <div className={`px-4 py-3 text-sm ${
                        msg.role === "user" 
                          ? "bg-blue-600 text-white ml-auto rounded-2xl" 
                          : "text-gray-100 rounded-2xl bg-slate-800/60 md:bg-transparent"
                      }`}>
                        <div className="leading-relaxed">
                          {msg.role === "assistant" ? (
                            <FormattedText content={msg.content} document={true} />
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                          {streamingMessageId === msg.id && (
                            <TypingDots className="ml-2 align-middle" />
                          )}
                        </div>
                      </div>
                      
                      {/* Message metadata + remaining context indicator (assistant only) */}
                      {msg.role === 'assistant' && (
                        <>
                          {/* Compact mobile meta */}
                          <div className="flex sm:hidden items-center gap-2 mt-2 text-[11px] text-gray-500">
                            <span>{msg.timestamp}</span>
                          </div>
                          {/* Detailed desktop meta */}
                          <div className={`hidden sm:flex items-center gap-2 mt-2 text-xs text-gray-500 justify-start`}>
                            <span>{msg.timestamp}</span>
                            {typeof msg.inputTokens === 'number' && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">in</span>
                                  <Zap className="w-3 h-3" />
                                  <span>{msg.inputTokens}</span>
                                </div>
                              </>
                            )}
                            {typeof msg.outputTokens === 'number' && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">out</span>
                                  <Zap className="w-3 h-3" />
                                  <span>{msg.outputTokens}</span>
                                </div>
                              </>
                            )}
                            {typeof msg.tokens === 'number' && !msg.outputTokens && !msg.inputTokens && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  <span>{msg.tokens}</span>
                                </div>
                              </>
                            )}
                            {typeof msg.cost === 'number' && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span>${msg.cost.toFixed(5)}</span>
                                </div>
                              </>
                            )}
                            {(() => {
                              const modelMax = (selectedModelInfo?.maxTokens) || 128000
                              const used = msg.contextTokensAfter
                              if (!used) return null
                              return (
                                <>
                                  <span>•</span>
                                  <CircularUsage used={used} max={modelMax} />
                                  <span>{Math.min(100, Math.round((used / modelMax) * 100))}%</span>
                                </>
                              )
                            })()}
                            {typeof msg.reasoningTokens === 'number' && msg.reasoningTokens > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-purple-300">reasoning</span>
                                  <span className="text-purple-300">{msg.reasoningTokens}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}

                      {/* Removed linear progress; circular indicator above conveys status */}
                      
                      {/* Action buttons */}
                      <div className={`absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                        msg.role === "user" ? "right-0" : "left-0"
                      }`}>
                        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1">
                          {msg.role === "assistant" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyMessage(msg.content)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                                title="Copy message"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRegenerateMessage(index)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                                disabled={isGenerating}
                                title="Regenerate response"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {msg.role === "user" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditMessage(msg.id, msg.content)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                              title="Edit message"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="hidden sm:flex w-7 h-7 bg-gray-600 rounded-full items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Generating Indicator - only show when not streaming */}
        {isGenerating && !streamingMessageId && (
          <div className="w-full mx-auto px-4 md:px-6 pb-8">
            <div className="flex gap-4">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1">
                <div className="px-4 py-3 text-sm bg-transparent text-gray-300">
                  <div className="flex items-center gap-3">
                    <TypingDots />
                    <span className="text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible element to mark the end of messages */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button - positioned in center */}
      {showScrollToBottom && (
        <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="bg-gray-800 border border-gray-600 text-gray-300 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-700 transition-all duration-200 hover:scale-105"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Input Area - redesigned to match image */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-md border-t border-slate-600/50 p-4 md:p-6">
        <div className="max-w-full lg:max-w-3xl mx-auto">
          <div className="relative">
            {/* Input container with inline controls */}
            <div className="relative bg-slate-700/50 border border-slate-600/50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow focus-within:shadow-xl focus-within:border-emerald-500/50">
              {/* Active tool chips */}
              {(activeTools.search || activeTools.attach || activeTools.mcp) && (
                <div className="px-3 pt-2 flex flex-wrap gap-2">
                  {activeTools.search && (
                    <span className="inline-flex items-center gap-2 text-emerald-300 bg-emerald-600/15 border border-emerald-500/30 rounded-full px-2 py-1 text-xs transition">
                      <Search className="w-3.5 h-3.5" /> Search
                      <button aria-label="Remove search" onClick={() => toggleTool('search')} className="hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {activeTools.attach && (
                    <span className="inline-flex items-center gap-2 text-emerald-300 bg-emerald-600/15 border border-emerald-500/30 rounded-full px-2 py-1 text-xs transition">
                      <Paperclip className="w-3.5 h-3.5" /> Attach
                      <button aria-label="Remove attach" onClick={() => toggleTool('attach')} className="hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {activeTools.mcp && (
                    <span className="inline-flex items-center gap-2 text-emerald-300 bg-emerald-600/15 border border-emerald-500/30 rounded-full px-2 py-1 text-xs transition">
                      <Wrench className="w-3.5 h-3.5" /> MCP
                      <button aria-label="Remove mcp" onClick={() => toggleTool('mcp')} className="hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2 sm:p-3">
                {/* Model selector (full-width on mobile) */}
                <div className="sm:flex-shrink-0 sm:w-auto w-full">
                  <Select value={selectedModel} onValueChange={handleModelChange} disabled={!hasApiKey}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[140px] h-9 bg-transparent border-0 text-slate-300 hover:text-white text-sm px-2 rounded-lg focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border border-slate-600/50 shadow-lg">
                      {selectModels.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="hover:bg-slate-700/50 text-slate-100 text-sm">
                          {model.name}
                        </SelectItem>
                      ))}
                      {selectModels.length === 0 && (
                        <SelectItem value="no-models" disabled className="text-slate-400 text-sm">
                          No pinned models - Go to Settings → Models to pin models
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Text input (grows) */}
                <div className="flex-1">
                  <input
                    ref={textareaRef as any}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message here..."
                    className="w-full h-10 bg-transparent border-0 text-white placeholder:text-slate-400 focus:ring-0 focus:outline-none text-sm"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>

                {/* Utility buttons (hide most on mobile) */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={activeTools.search}
                    onClick={() => toggleTool('search')}
                    className={`hidden sm:inline-flex h-8 w-8 p-0 rounded-lg ${activeTools.search ? 'text-emerald-300 bg-emerald-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'}`}
                    title="Search the web"
                  >
                    <Search className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={activeTools.attach}
                    onClick={() => toggleTool('attach')}
                    className={`hidden sm:inline-flex h-8 w-8 p-0 rounded-lg ${activeTools.attach ? 'text-emerald-300 bg-emerald-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'}`}
                    title="Attach files"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={activeTools.mcp}
                    onClick={() => toggleTool('mcp')}
                    className={`hidden sm:inline-flex h-8 w-8 p-0 rounded-lg ${activeTools.mcp ? 'text-emerald-300 bg-emerald-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'}`}
                    title="MCP"
                  >
                    <Wrench className="w-4 h-4" />
                  </Button>

                  {/* Mobile overflow menu for extra actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`relative inline-flex sm:hidden h-9 w-9 p-0 rounded-lg ${ (activeTools.search || activeTools.attach || activeTools.mcp) ? 'text-emerald-300 bg-emerald-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'}`}
                        title="More"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                        {(activeTools.search || activeTools.attach || activeTools.mcp) && (
                          <span className="absolute top-1 right-1 block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-slate-800 border border-slate-600/50 text-slate-100">
                      <DropdownMenuItem onClick={() => toggleTool('search')} className={`text-sm ${activeTools.search ? 'bg-slate-700/70 text-emerald-300' : ''}`}>
                        <Search className="w-4 h-4 mr-2" /> Search the web {activeTools.search && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleTool('attach')} className={`text-sm ${activeTools.attach ? 'bg-slate-700/70 text-emerald-300' : ''}`}>
                        <Paperclip className="w-4 h-4 mr-2" /> Attach files {activeTools.attach && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleTool('mcp')} className={`text-sm ${activeTools.mcp ? 'bg-slate-700/70 text-emerald-300' : ''}`}>
                        <Wrench className="w-4 h-4 mr-2" /> MCP {activeTools.mcp && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Send button */}
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || isGenerating}
                    size="sm"
                    className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-600 rounded-lg transition-all ml-1 active:scale-95"
                    title="Send message (Ctrl+Enter)"
                  >
                    <ArrowUp className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Cost estimation - moved below */}
            {message.trim() && hasApiKey && (
              <div className="flex justify-end mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>~{estimatedTokens} tokens</span>
                  <span>•</span>
                  <span>~${estimatedCost.toFixed(5)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}