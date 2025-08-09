"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  ArrowLeft, Key, CreditCard, Zap, User,
  Eye, EyeOff, LogOut, CheckCircle, XCircle, Bot, BarChart3, Wrench, Pin, Save, Trash2
} from "lucide-react"
import { apiKeyStore } from "@/lib/api-key-store"
import { supabase } from "@/lib/supabaseClient"
import { aiService, AVAILABLE_MODELS } from "@/lib/ai-service"
import { storage } from "@/lib/storage"
import { AVAILABLE_MODELS as OPENAI_MODELS } from "@/lib/openai-service"
import { AVAILABLE_GEMINI_MODELS } from "@/lib/gemini-service"
import { AVAILABLE_GROQ_MODELS } from "@/lib/groq-service"
import { AVAILABLE_CLAUDE_MODELS } from "@/lib/claude-service"

interface SettingsPageProps {
  onBack: () => void
  onSignOut: () => void
}

export function SettingsPage({ onBack, onSignOut }: SettingsPageProps) {
  const serverProxy = process.env.NEXT_PUBLIC_SERVER_PROXY === '1'
  const [activeSection, setActiveSection] = useState("api-keys")
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  
  // API Keys state
  const [openaiKey, setOpenaiKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [groqKey, setGroqKey] = useState("")
  const [claudeKey, setClaudeKey] = useState("")
  
  // Connection test states
  const [openaiStatus, setOpenaiStatus] = useState<'unknown' | 'testing' | 'success' | 'error'>('unknown')
  const [geminiStatus, setGeminiStatus] = useState<'unknown' | 'testing' | 'success' | 'error'>('unknown')
  const [groqStatus, setGroqStatus] = useState<'unknown' | 'testing' | 'success' | 'error'>('unknown')
  const [claudeStatus, setClaudeStatus] = useState<'unknown' | 'testing' | 'success' | 'error'>('unknown')

  // Settings state
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini")
  const [streamingEnabled, setStreamingEnabled] = useState(true)
  const [showTokenCount, setShowTokenCount] = useState(true)
  const [monthlyBudget, setMonthlyBudget] = useState<number>(200)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [pinnedModels, setPinnedModels] = useState<string[]>(["gpt-4o-mini", "gpt-4o"])

  // User and billing data
  const [conversations, setConversations] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState("")
  // Keystore security state
  const [hasKeystore, setHasKeystore] = useState<boolean>(() => (apiKeyStore as any).isPassphraseConfigured?.() || false)
  const [isLocked, setIsLocked] = useState<boolean>(() => (apiKeyStore as any).isLocked?.() || false)
  const [passphrase, setPassphrase] = useState<string>("")

  const loadApiKeysFromStore = () => {
    const storedOpenaiKey = apiKeyStore.getApiKey()
    const storedGeminiKey = apiKeyStore.getGeminiApiKey()
    const storedGroqKey = apiKeyStore.getGroqApiKey()
    const storedClaudeKey = apiKeyStore.getClaudeApiKey?.()

    if (storedOpenaiKey) {
      setOpenaiKey(storedOpenaiKey)
      setOpenaiStatus(aiService.hasValidApiKey('openai') ? 'success' : 'unknown')
    }
    if (storedGeminiKey) {
      setGeminiKey(storedGeminiKey)
      setGeminiStatus(aiService.hasValidApiKey('gemini') ? 'success' : 'unknown')
    }
    if (storedGroqKey) {
      setGroqKey(storedGroqKey)
      setGroqStatus(aiService.hasValidApiKey('groq') ? 'success' : 'unknown')
    }
    if (storedClaudeKey) {
      setClaudeKey(storedClaudeKey)
      setClaudeStatus(aiService.hasValidApiKey('claude') ? 'success' : 'unknown')
    }
  }

  // Load existing API keys on mount
  useEffect(() => {
    const serverProxy = process.env.NEXT_PUBLIC_SERVER_PROXY === '1'
    if (serverProxy) {
      ;(async () => {
        try {
          const [o, g, r, c] = await Promise.all([
            fetch('/api/keys/openai').then(res => res.json()).catch(() => null),
            fetch('/api/keys/gemini').then(res => res.json()).catch(() => null),
            fetch('/api/keys/groq').then(res => res.json()).catch(() => null),
            fetch('/api/keys/claude').then(res => res.json()).catch(() => null),
          ])
          if (o?.hasKey) setOpenaiStatus('success')
          if (g?.hasKey) setGeminiStatus('success')
          if (r?.hasKey) setGroqStatus('success')
          if (c?.hasKey) setClaudeStatus('success')
        } catch {}
      })()
    } else {
      loadApiKeysFromStore()
    }

    // Load user data and settings
    const loadEmail = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
          return
        }
      }
      setUserEmail("")
    }
    void loadEmail()

    // Load conversations for billing calculations via storage API
    ;(async () => {
      try {
        const list = await storage.getConversations()
        setConversations(list as any)
      } catch (error) {
        console.error("Failed to load conversations:", error)
      }
    })()

    // Load user settings
    const savedSettings = localStorage.getItem("ai-workbench-settings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setDefaultModel(settings.defaultModel || "gpt-4o-mini")
        setStreamingEnabled(settings.streamingEnabled !== false)
        setShowTokenCount(settings.showTokenCount !== false)
        setMonthlyBudget(settings.monthlyBudget || 200)
        setBudgetAlerts(settings.budgetAlerts !== false)
        setPinnedModels(settings.pinnedModels || ["gpt-4o-mini", "gpt-4o"])
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
  }, [])

  // Keep lock state in sync
  useEffect(() => {
    if (serverProxy) return
    const interval = setInterval(() => {
      setHasKeystore((apiKeyStore as any).isPassphraseConfigured?.() || false)
      setIsLocked((apiKeyStore as any).isLocked?.() || false)
    }, 500)
    return () => clearInterval(interval)
  }, [serverProxy])

  // Expose settings to window object for chat interface
  useEffect(() => {
    (window as any).userSettings = {
      defaultModel,
      streamingEnabled,
      showTokenCount,
      monthlyBudget,
      budgetAlerts,
      pinnedModels
    }
  }, [defaultModel, streamingEnabled, showTokenCount, monthlyBudget, budgetAlerts, pinnedModels])

  // API Key handlers
  const handleOpenaiKeyChange = (value: string) => {
    setOpenaiKey(value)
    setOpenaiStatus('unknown')
  }

  const saveOpenaiKey = async () => {
    const value = openaiKey.trim()
    if (!value) return
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      const test = await fetch('/api/keys/openai/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) }).then(r => r.json()).catch(() => ({ ok: false }))
      if (!test?.ok) { setOpenaiStatus('error'); return }
      await fetch('/api/keys/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) })
      setOpenaiStatus('success')
    } else {
      if ((apiKeyStore as any).isLocked?.()) return
      apiKeyStore.setApiKey(value)
      aiService.refreshClient('openai')
      setOpenaiStatus('success')
    }
  }

  const deleteOpenaiKey = async () => {
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      await fetch('/api/keys/openai', { method: 'DELETE' })
    } else {
      apiKeyStore.clearApiKey()
    }
    setOpenaiKey("")
    setOpenaiStatus('unknown')
  }

  const handleGeminiKeyChange = (value: string) => {
    setGeminiKey(value)
    setGeminiStatus('unknown')
  }

  const saveGeminiKey = async () => {
    const value = geminiKey.trim()
    if (!value) return
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      const test = await fetch('/api/keys/gemini/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) }).then(r => r.json()).catch(() => ({ ok: false }))
      if (!test?.ok) { setGeminiStatus('error'); return }
      await fetch('/api/keys/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) })
      setGeminiStatus('success')
    } else {
      if ((apiKeyStore as any).isLocked?.()) return
      apiKeyStore.setGeminiApiKey(value)
      aiService.refreshClient('gemini')
      setGeminiStatus('success')
    }
  }

  const deleteGeminiKey = async () => {
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      await fetch('/api/keys/gemini', { method: 'DELETE' })
    } else {
      apiKeyStore.clearGeminiApiKey()
    }
    setGeminiKey("")
    setGeminiStatus('unknown')
  }

  const handleGroqKeyChange = (value: string) => {
    setGroqKey(value)
    setGroqStatus('unknown')
  }

  const saveGroqKey = async () => {
    const value = groqKey.trim()
    if (!value) return
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      const test = await fetch('/api/keys/groq/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) }).then(r => r.json()).catch(() => ({ ok: false }))
      if (!test?.ok) { setGroqStatus('error'); return }
      await fetch('/api/keys/groq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) })
      setGroqStatus('success')
    } else {
      if ((apiKeyStore as any).isLocked?.()) return
      apiKeyStore.setGroqApiKey(value)
      aiService.refreshClient('groq')
      setGroqStatus('success')
    }
  }

  const deleteGroqKey = async () => {
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      await fetch('/api/keys/groq', { method: 'DELETE' })
    } else {
      apiKeyStore.clearGroqApiKey()
    }
    setGroqKey("")
    setGroqStatus('unknown')
  }

  const handleClaudeKeyChange = (value: string) => {
    setClaudeKey(value)
    setClaudeStatus('unknown')
  }

  const saveClaudeKey = async () => {
    const value = claudeKey.trim()
    if (!value) return
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      const test = await fetch('/api/keys/claude/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) }).then(r => r.json()).catch(() => ({ ok: false }))
      if (!test?.ok) { setClaudeStatus('error'); return }
      await fetch('/api/keys/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: value }) })
      setClaudeStatus('success')
    } else {
      if ((apiKeyStore as any).isLocked?.()) return
      apiKeyStore.setClaudeApiKey(value)
      aiService.refreshClient('claude')
      setClaudeStatus('success')
    }
  }

  const deleteClaudeKey = async () => {
    if (process.env.NEXT_PUBLIC_SERVER_PROXY === '1') {
      await fetch('/api/keys/claude', { method: 'DELETE' })
    } else {
      apiKeyStore.clearClaudeApiKey?.()
    }
    setClaudeKey("")
    setClaudeStatus('unknown')
  }

  // Connection test handlers
  const testOpenaiConnection = async () => {
    if (!openaiKey.trim()) return
    setOpenaiStatus('testing')
    try {
      const isValid = await aiService.testConnection('openai')
      setOpenaiStatus(isValid ? 'success' : 'error')
    } catch {
      setOpenaiStatus('error')
    }
  }

  const testGeminiConnection = async () => {
    if (!geminiKey.trim()) return
    setGeminiStatus('testing')
    try {
      const isValid = await aiService.testConnection('gemini')
      setGeminiStatus(isValid ? 'success' : 'error')
    } catch {
      setGeminiStatus('error')
    }
  }

  const testGroqConnection = async () => {
    if (!groqKey.trim()) return
    setGroqStatus('testing')
    try {
      const isValid = await aiService.testConnection('groq')
      setGroqStatus(isValid ? 'success' : 'error')
    } catch {
      setGroqStatus('error')
    }
  }

  const testClaudeConnection = async () => {
    if (!claudeKey.trim()) return
    setClaudeStatus('testing')
    try {
      const isValid = await aiService.testConnection('claude')
      setClaudeStatus(isValid ? 'success' : 'error')
    } catch {
      setClaudeStatus('error')
    }
  }

  // Settings handlers
  const saveSettings = (newSettings: any) => {
    const currentSettings = {
      defaultModel,
      streamingEnabled,
      showTokenCount,
      monthlyBudget,
      budgetAlerts,
      pinnedModels,
      ...newSettings
    }
    localStorage.setItem("ai-workbench-settings", JSON.stringify(currentSettings))
  }

  const handleDefaultModelChange = (model: string) => {
    setDefaultModel(model)
    saveSettings({ defaultModel: model })
  }

  const handleStreamingToggle = (enabled: boolean) => {
    setStreamingEnabled(enabled)
    saveSettings({ streamingEnabled: enabled })
  }

  const handleTokenCountToggle = (show: boolean) => {
    setShowTokenCount(show)
    saveSettings({ showTokenCount: show })
  }

  const handleBudgetChange = (budget: number) => {
    setMonthlyBudget(budget)
    saveSettings({ monthlyBudget: budget })
  }

  const handleBudgetAlertsToggle = (enabled: boolean) => {
    setBudgetAlerts(enabled)
    saveSettings({ budgetAlerts: enabled })
  }

  const handleTogglePinModel = (modelId: string) => {
    const isCurrentlyPinned = pinnedModels.includes(modelId)
    
    // Prevent unpinning the last model
    if (isCurrentlyPinned && pinnedModels.length === 1) {
      return // Don't allow unpinning the last model
    }
    
    const newPinnedModels = isCurrentlyPinned
      ? pinnedModels.filter(id => id !== modelId)
      : [...pinnedModels, modelId]
    
    setPinnedModels(newPinnedModels)
    saveSettings({ pinnedModels: newPinnedModels })
    
    // If unpinning the current default model, set default to first pinned model
    if (isCurrentlyPinned && defaultModel === modelId && newPinnedModels.length > 0) {
      const newDefaultModel = newPinnedModels[0]
      setDefaultModel(newDefaultModel)
      saveSettings({ pinnedModels: newPinnedModels, defaultModel: newDefaultModel })
    }
  }

  // Billing calculations
  const calculateBillingData = () => {
    const totalCost = conversations.reduce((sum, conv) => sum + (conv.cost || 0), 0)
    const totalTokens = conversations.reduce((sum, conv) => sum + (conv.tokens || 0), 0)
    
    // Calculate this month's usage
    const now = new Date()
    const thisMonth = conversations.filter(conv => {
      const convDate = new Date(conv.createdAt)
      return convDate.getMonth() === now.getMonth() && convDate.getFullYear() === now.getFullYear()
    })
    
    const monthlyTokens = thisMonth.reduce((sum, conv) => sum + (conv.tokens || 0), 0)
    const monthlyCost = thisMonth.reduce((sum, conv) => sum + (conv.cost || 0), 0)
    
    // Calculate by provider
    const providerStats = conversations.reduce((stats, conv) => {
      if (!conv.messages) return stats
      
      // Find the model used (from assistant messages)
      const assistantMessages = conv.messages.filter((msg: any) => msg.role === 'assistant' && msg.model)
      if (assistantMessages.length === 0) return stats
      
      const model = assistantMessages[0].model
      const modelInfo = AVAILABLE_MODELS.find(m => m.id === model)
      const provider = modelInfo?.provider || 'unknown'
      
      if (!stats[provider]) {
        stats[provider] = { cost: 0, tokens: 0, conversations: 0 }
      }
      
      stats[provider].cost += conv.cost || 0
      stats[provider].tokens += conv.tokens || 0
      stats[provider].conversations += 1
      
      return stats
    }, {} as any)

    return {
      totalCost,
      totalTokens,
      monthlyCost,
      monthlyTokens,
      conversationsCount: conversations.length,
      providerStats
    }
  }

  const billingData = calculateBillingData()

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'success':
        return { text: 'Connected', color: 'text-green-400 bg-green-400/10' }
      case 'error':
        return { text: 'Invalid key', color: 'text-red-400 bg-red-400/10' }
      case 'testing':
        return { text: 'Testing...', color: 'text-yellow-400 bg-yellow-400/10' }
      default:
        return { text: 'Not configured', color: 'text-gray-500 bg-gray-800' }
    }
  }

  const settingsSections = [
    { id: "api-keys", title: "API Keys", icon: Key },
    { id: "providers", title: "AI Providers", icon: Bot },
    { id: "mcp", title: "MCP", icon: Wrench },
    { id: "billing", title: "Billing", icon: CreditCard },
    { id: "usage", title: "Usage", icon: BarChart3 },
    { id: "models", title: "Models", icon: Zap },
    { id: "profile", title: "Profile", icon: User },
  ]

  const renderAPIKeysSection = () => (
    <div className="space-y-8">
      {/* Keystore Security (hidden when server proxy is enabled) */}
      {!serverProxy && (
      <div className="space-y-3 p-4 border border-slate-600/50 rounded-lg bg-slate-800/40">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Keystore Security</h4>
            <p className="text-gray-400 text-sm">Client-side encryption with passphrase (AES‑GCM)</p>
          </div>
          <div className={`text-xs px-2 py-1 rounded ${hasKeystore ? (isLocked ? 'text-yellow-300 bg-yellow-500/10' : 'text-green-400 bg-green-400/10') : 'text-gray-400 bg-gray-700'}`}>
            {hasKeystore ? (isLocked ? 'Locked' : 'Unlocked') : 'Not configured'}
          </div>
        </div>
        {!hasKeystore && (
          <div className="flex gap-2 items-center">
            <Input
              type="password"
              placeholder="Create a passphrase (min 8 chars)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="bg-transparent border-gray-700 text-white h-9"
            />
            <Button
              onClick={async () => {
                try {
                  await (apiKeyStore as any).setPassphrase?.(passphrase)
                  setPassphrase("")
                  setHasKeystore(true)
                  setIsLocked(false)
                  loadApiKeysFromStore()
                } catch (e) {
                  console.error(e)
                  alert((e as Error).message)
                }
              }}
              className="h-9"
              disabled={passphrase.length < 8}
            >
              Set Passphrase
            </Button>
          </div>
        )}
        {hasKeystore && isLocked && (
          <div className="flex gap-2 items-center">
            <Input
              type="password"
              placeholder="Enter passphrase to unlock"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="bg-transparent border-gray-700 text-white h-9"
            />
            <Button
              onClick={async () => {
                const ok = await (apiKeyStore as any).unlock?.(passphrase)
                if (!ok) {
                  alert('Incorrect passphrase')
                }
                setPassphrase("")
                setIsLocked(!ok)
                if (ok) loadApiKeysFromStore()
              }}
              className="h-9"
              disabled={passphrase.length < 1}
            >
              Unlock
            </Button>
          </div>
        )}
        {hasKeystore && !isLocked && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={() => (apiKeyStore as any).lock?.()}
            >
              Lock Keystore
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={async () => {
                try {
                  const blob = await (apiKeyStore as any).exportKeystore?.()
                  const file = new Blob([blob || '{}'], { type: 'application/json' })
                  const url = URL.createObjectURL(file)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'keystore.json'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  alert('Export failed')
                }
              }}
            >
              Export Keystore
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={async () => {
                try {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'application/json'
                  input.onchange = async () => {
                    const file = input.files?.[0]
                    if (!file) return
                    const json = await file.text()
                    await (apiKeyStore as any).importKeystore?.(json)
                    alert('Keystore imported. Unlock with your passphrase.')
                  }
                  input.click()
                } catch (e) {
                  alert('Import failed')
                }
              }}
            >
              Import Keystore
            </Button>
          </div>
        )}
      </div>
      )}
      {/* OpenAI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">OpenAI</h4>
            <p className="text-gray-400 text-sm">GPT models access</p>
          </div>
          <div className={`text-xs px-2 py-1 rounded ${getStatusDisplay(openaiStatus).color}`}>
            {getStatusDisplay(openaiStatus).text}
          </div>
        </div>
        <div className="relative">
          <Input
            type={showOpenaiKey ? "text" : "password"}
            placeholder="sk-..."
            value={showOpenaiKey ? openaiKey : openaiKey.replace(/./g, '•')}
            onChange={(e) => handleOpenaiKeyChange(e.target.value)}
            className="bg-transparent border-gray-700 text-white h-9 pr-16"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
            >
              {showOpenaiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-300"
              onClick={deleteOpenaiKey}
              title="Delete key"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {openaiStatus === 'success' && (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            )}
            {openaiStatus === 'error' && (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={saveOpenaiKey}
              disabled={!openaiKey.trim()}
              title="Save key"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>

      {/* Gemini */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Google Gemini</h4>
            <p className="text-gray-400 text-sm">Gemini models access</p>
          </div>
          <div className={`text-xs px-2 py-1 rounded ${getStatusDisplay(geminiStatus).color}`}>
            {getStatusDisplay(geminiStatus).text}
          </div>
        </div>
        <div className="relative">
          <Input
            type={showGeminiKey ? "text" : "password"}
            placeholder="AI..."
            value={showGeminiKey ? geminiKey : geminiKey.replace(/./g, '•')}
            onChange={(e) => handleGeminiKeyChange(e.target.value)}
            className="bg-transparent border-gray-700 text-white h-9 pr-16"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
            >
              {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-300"
              onClick={deleteGeminiKey}
              title="Delete key"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {geminiStatus === 'success' && (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            )}
            {geminiStatus === 'error' && (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={saveGeminiKey}
              disabled={!geminiKey.trim()}
              title="Save key"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>

      {/* Groq */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Groq</h4>
            <p className="text-gray-400 text-sm">Ultra-fast inference models</p>
          </div>
          <div className={`text-xs px-2 py-1 rounded ${getStatusDisplay(groqStatus).color}`}>
            {getStatusDisplay(groqStatus).text}
          </div>
        </div>
        <div className="relative">
          <Input
            type={showGroqKey ? "text" : "password"}
            placeholder="gsk_..."
            value={showGroqKey ? groqKey : groqKey.replace(/./g, '•')}
            onChange={(e) => handleGroqKeyChange(e.target.value)}
            className="bg-transparent border-gray-700 text-white h-9 pr-16"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={() => setShowGroqKey(!showGroqKey)}
            >
              {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-300"
              onClick={deleteGroqKey}
              title="Delete key"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {groqStatus === 'success' && (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            )}
            {groqStatus === 'error' && (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={saveGroqKey}
              disabled={!groqKey.trim()}
              title="Save key"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>

      {/* Claude */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Anthropic Claude</h4>
            <p className="text-gray-400 text-sm">Claude 4.x series models</p>
          </div>
          <div className={`text-xs px-2 py-1 rounded ${getStatusDisplay(claudeStatus).color}`}>
            {getStatusDisplay(claudeStatus).text}
          </div>
        </div>
        <div className="relative">
          <Input
            type={showClaudeKey ? "text" : "password"}
            placeholder="sk-ant-..."
            value={showClaudeKey ? claudeKey : claudeKey.replace(/./g, '•')}
            onChange={(e) => handleClaudeKeyChange(e.target.value)}
            className="bg-transparent border-gray-700 text-white h-9 pr-16"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={() => setShowClaudeKey(!showClaudeKey)}
            >
              {showClaudeKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-300"
              onClick={deleteClaudeKey}
              title="Delete key"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {claudeStatus === 'success' && (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            )}
            {claudeStatus === 'error' && (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={saveClaudeKey}
              disabled={!claudeKey.trim()}
              title="Save key"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProvidersSection = () => (
    <div className="space-y-8">
      {/* Pinning Info */}
      <div className="bg-slate-800/30 border border-slate-600/30 rounded-lg p-4">
        <h4 className="text-lg font-medium text-white mb-2">📌 Model Pinning</h4>
        <div className="text-sm text-slate-400 space-y-1">
          <div>• Click the <Pin className="w-3 h-3 inline mx-1" /> icon to pin/unpin models for the chat interface</div>
          <div>• Only pinned models will appear in the chat dropdown selector</div>
          <div>• You must have at least one model pinned at all times</div>
          <div>• Pinned models are highlighted with emerald colors</div>
        </div>
      </div>

      {/* OpenAI Provider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">OpenAI</h3>
            <p className="text-gray-400 text-sm">GPT models for advanced reasoning and conversation</p>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full ${getStatusDisplay(openaiStatus).color}`}>
            {getStatusDisplay(openaiStatus).text}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {OPENAI_MODELS.map((model) => {
            const isPinned = pinnedModels.includes(model.id)
            const isLastPinned = pinnedModels.length === 1 && isPinned
            const isReasoning = model.id.startsWith("o") || model.id.startsWith("gpt-5")
            
            return (
              <div 
                key={model.id} 
                className={`border rounded-lg p-4 transition-all ${
                  isPinned
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white text-sm">{model.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{model.maxTokens.toLocaleString()} tokens</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePinModel(model.id)}
                        disabled={isLastPinned}
                        className={`h-6 w-6 p-0 ${
                          isPinned 
                            ? 'text-emerald-400 hover:text-emerald-300' 
                            : 'text-slate-400 hover:text-slate-300'
                        } ${isLastPinned ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPinned ? (isLastPinned ? 'Cannot unpin last model' : 'Unpin model') : 'Pin model'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{model.description}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${isReasoning ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {isReasoning ? 'Reasoning' : 'General'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Input: ${model.costPer1kTokens.input * 1000}/1M</span>
                    <span className="text-slate-500">Output: ${model.costPer1kTokens.output * 1000}/1M</span>
                  </div>
                  {isPinned && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <Pin className="w-3 h-3 fill-current" />
                      <span>Available in chat</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Google Gemini Provider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Google Gemini</h3>
            <p className="text-gray-400 text-sm">Google's advanced AI models with large context windows</p>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full ${getStatusDisplay(geminiStatus).color}`}>
            {getStatusDisplay(geminiStatus).text}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {AVAILABLE_GEMINI_MODELS.map((model) => {
            const isPinned = pinnedModels.includes(model.id)
            const isLastPinned = pinnedModels.length === 1 && isPinned
            const isReasoning = model.id.startsWith('gemini-2.5')
            
            return (
              <div 
                key={model.id} 
                className={`border rounded-lg p-4 transition-all ${
                  isPinned
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white text-sm">{model.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{model.maxTokens.toLocaleString()} tokens</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isReasoning ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {isReasoning ? 'Reasoning' : 'General'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePinModel(model.id)}
                        disabled={isLastPinned}
                        className={`h-6 w-6 p-0 ${
                          isPinned 
                            ? 'text-emerald-400 hover:text-emerald-300' 
                            : 'text-slate-400 hover:text-slate-300'
                        } ${isLastPinned ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPinned ? (isLastPinned ? 'Cannot unpin last model' : 'Unpin model') : 'Pin model'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Input: ${model.costPer1kTokens.input === 0 ? 'Free' : `$${model.costPer1kTokens.input * 1000}/1M`}
                    </span>
                    <span className="text-slate-500">
                      Output: ${model.costPer1kTokens.output === 0 ? 'Free' : `$${model.costPer1kTokens.output * 1000}/1M`}
                    </span>
                  </div>
                  {isPinned && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <Pin className="w-3 h-3 fill-current" />
                      <span>Available in chat</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Groq Provider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Groq</h3>
            <p className="text-gray-400 text-sm">Ultra-fast inference with lightning speed responses</p>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full ${getStatusDisplay(groqStatus).color}`}>
            {getStatusDisplay(groqStatus).text}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {AVAILABLE_GROQ_MODELS.map((model) => {
            const isPinned = pinnedModels.includes(model.id)
            const isLastPinned = pinnedModels.length === 1 && isPinned
            
            return (
              <div 
                key={model.id} 
                className={`border rounded-lg p-4 transition-all ${
                  isPinned
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white text-sm">{model.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{model.maxTokens.toLocaleString()} tokens</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePinModel(model.id)}
                        disabled={isLastPinned}
                        className={`h-6 w-6 p-0 ${
                          isPinned 
                            ? 'text-emerald-400 hover:text-emerald-300' 
                            : 'text-slate-400 hover:text-slate-300'
                        } ${isLastPinned ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPinned ? (isLastPinned ? 'Cannot unpin last model' : 'Unpin model') : 'Pin model'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Input: ${model.costPer1kTokens.input * 1000}/1M</span>
                    <span className="text-slate-500">Output: ${model.costPer1kTokens.output * 1000}/1M</span>
                  </div>
                  {isPinned && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <Pin className="w-3 h-3 fill-current" />
                      <span>Available in chat</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Anthropic Claude Provider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Anthropic Claude</h3>
            <p className="text-gray-400 text-sm">Claude 4.x models for high-quality reasoning</p>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full ${getStatusDisplay(claudeStatus).color}`}>
            {getStatusDisplay(claudeStatus).text}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {AVAILABLE_CLAUDE_MODELS.map((model) => {
            const isPinned = pinnedModels.includes(model.id)
            const isLastPinned = pinnedModels.length === 1 && isPinned
            return (
              <div 
                key={model.id} 
                className={`border rounded-lg p-4 transition-all ${
                  isPinned
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white text-sm">{model.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{model.maxTokens.toLocaleString()} tokens</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePinModel(model.id)}
                        disabled={isLastPinned}
                        className={`h-6 w-6 p-0 ${
                          isPinned 
                            ? 'text-emerald-400 hover:text-emerald-300' 
                            : 'text-slate-400 hover:text-slate-300'
                        } ${isLastPinned ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPinned ? (isLastPinned ? 'Cannot unpin last model' : 'Unpin model') : 'Pin model'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Input: ${model.costPer1kTokens.input * 1000}/1M</span>
                    <span className="text-slate-500">Output: ${model.costPer1kTokens.output * 1000}/1M</span>
                  </div>
                  {isPinned && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <Pin className="w-3 h-3 fill-current" />
                      <span>Available in chat</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderProfileSection = () => (
    <div className="space-y-8">
      {/* User Info */}
      <div className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{userEmail || "User"}</h3>
            <p className="text-gray-400">OmniChat Member</p>
          </div>
        </div>

        <div className="text-center">
          <div className="text-gray-400 text-sm">
            Welcome to your OmniChat profile. Manage your account settings and view your membership details.
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Account Details</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Email Address</div>
              <div className="text-gray-400 text-sm">Your account email</div>
            </div>
            <div className="text-gray-300">{userEmail}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Account Type</div>
              <div className="text-gray-400 text-sm">Current plan</div>
            </div>
            <div className="text-green-400">Free Tier</div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Member Since</div>
              <div className="text-gray-400 text-sm">Account creation date</div>
            </div>
            <div className="text-gray-300">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUsageSection = () => (
    <div className="space-y-8">
      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white">{billingData.conversationsCount}</div>
          <div className="text-sm text-gray-400">Total Conversations</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white">{billingData.totalTokens.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Total Tokens</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white">${billingData.totalCost.toFixed(5)}</div>
          <div className="text-sm text-gray-400">Total Cost</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white">
            {billingData.conversationsCount > 0 ? (billingData.totalCost / billingData.conversationsCount).toFixed(3) : '0.000'}
          </div>
          <div className="text-sm text-gray-400">Avg Cost/Chat</div>
        </div>
      </div>

      {/* Monthly Usage */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">This Month</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xl font-semibold text-white">${billingData.monthlyCost.toFixed(2)}</div>
            <div className="text-sm text-gray-400">Monthly Spending</div>
            <div className="mt-2 text-xs text-gray-500">
              {((billingData.monthlyCost / billingData.totalCost) * 100).toFixed(1)}% of total
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xl font-semibold text-white">{billingData.monthlyTokens.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Monthly Tokens</div>
            <div className="mt-2 text-xs text-gray-500">
              {((billingData.monthlyTokens / billingData.totalTokens) * 100).toFixed(1)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Provider Analytics */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Provider Usage</h4>
        <div className="space-y-4">
          {Object.entries(billingData.providerStats).map(([provider, stats]: [string, any]) => {
            const costPercentage = billingData.totalCost > 0 ? (stats.cost / billingData.totalCost) * 100 : 0
            const tokenPercentage = billingData.totalTokens > 0 ? (stats.tokens / billingData.totalTokens) * 100 : 0
            const conversationPercentage = billingData.conversationsCount > 0 ? (stats.conversations / billingData.conversationsCount) * 100 : 0
            
            return (
              <div key={provider} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-medium text-white capitalize">{provider}</h5>
                    <span className={`text-xs px-2 py-1 rounded ${
                      provider === 'openai' ? 'bg-green-500/20 text-green-300' :
                      provider === 'gemini' ? 'bg-blue-500/20 text-blue-300' :
                      provider === 'groq' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {conversationPercentage.toFixed(1)}% of conversations
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Conversations</div>
                      <div className="text-white font-medium">{stats.conversations}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Tokens Used</div>
                      <div className="text-white font-medium">{stats.tokens.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{tokenPercentage.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total Cost</div>
                      <div className="text-white font-medium">${stats.cost.toFixed(5)}</div>
                      <div className="text-xs text-gray-500">{costPercentage.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Visual progress bars */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Cost Share</span>
                        <span className="text-gray-400">{costPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            provider === 'openai' ? 'bg-green-500' :
                            provider === 'gemini' ? 'bg-blue-500' :
                            provider === 'groq' ? 'bg-purple-500' : 'bg-gray-500'
                          }`}
                          style={{ width: `${costPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Average costs */}
                  <div className="pt-2 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-gray-400">Avg Cost/Conversation</div>
                        <div className="text-gray-300 font-medium">
                          ${stats.conversations > 0 ? (stats.cost / stats.conversations).toFixed(5) : '0.00000'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Avg Tokens/Conversation</div>
                        <div className="text-gray-300 font-medium">
                          {stats.conversations > 0 ? Math.round(stats.tokens / stats.conversations).toLocaleString() : '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Model Usage Breakdown */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Model Popularity</h4>
        <div className="space-y-2">
          {(() => {
            // Calculate model usage from conversations
            const modelUsage = conversations.reduce((usage, conv) => {
              if (!conv.messages) return usage
              const assistantMessages = conv.messages.filter((msg: any) => msg.role === 'assistant' && msg.model)
              if (assistantMessages.length === 0) return usage
              
              const model = assistantMessages[0].model
              const modelInfo = AVAILABLE_MODELS.find(m => m.id === model)
              const modelName = modelInfo?.name || model
              
              if (!usage[modelName]) {
                usage[modelName] = { count: 0, tokens: 0, cost: 0 }
              }
              
              usage[modelName].count += 1
              usage[modelName].tokens += conv.tokens || 0
              usage[modelName].cost += conv.cost || 0
              
              return usage
            }, {} as any)

            const sortedModels = Object.entries(modelUsage).sort(([,a]: any, [,b]: any) => b.count - a.count)

            return sortedModels.map(([modelName, stats]: [string, any]) => {
              const percentage = billingData.conversationsCount > 0 ? (stats.count / billingData.conversationsCount) * 100 : 0
              
              return (
                <div key={modelName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">{modelName}</span>
                    <span className="text-gray-400">{stats.count} chats ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-lg font-medium text-blue-300 mb-2">💡 Usage Tips</h4>
        <div className="space-y-2 text-sm text-blue-200">
          <div>• Use Groq models for faster responses and lower costs</div>
          <div>• GPT-4o Mini offers the best balance of quality and cost</div>
          <div>• Gemini models are great for large context conversations</div>
          <div>• Monitor your usage to stay within budget limits</div>
        </div>
      </div>
    </div>
  )

  const renderBillingSection = () => (
    <div className="space-y-8">
      {/* Current Usage */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-2xl font-semibold text-white">${billingData.monthlyCost.toFixed(2)}</div>
          <div className="text-sm text-gray-400">This month</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-white">{billingData.monthlyTokens.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Tokens used this month</div>
        </div>
      </div>

      {/* Budget Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Budget Settings</h4>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Monthly budget</div>
            <div className="text-gray-400 text-sm">Set spending limit</div>
          </div>
          <Input
            type="number"
            value={monthlyBudget}
            onChange={(e) => handleBudgetChange(Number(e.target.value))}
            className="w-24 h-9 bg-transparent border-gray-700 text-white text-right"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Budget alerts</div>
            <div className="text-gray-400 text-sm">Notify when approaching limit</div>
          </div>
          <Switch 
            checked={budgetAlerts} 
            onCheckedChange={handleBudgetAlertsToggle}
          />
        </div>

        {/* Budget Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Monthly Progress</span>
            <span className="text-gray-300">
              ${billingData.monthlyCost.toFixed(2)} / ${monthlyBudget.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                billingData.monthlyCost / monthlyBudget > 0.8 ? 'bg-red-500' : 
                billingData.monthlyCost / monthlyBudget > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((billingData.monthlyCost / monthlyBudget) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Budget Information */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Budget Information</h4>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Plan</span>
              <span className="text-green-400 font-medium">Free Tier</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Monthly Limit</span>
              <span className="text-gray-300">${monthlyBudget.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Remaining Budget</span>
              <span className="text-gray-300">${Math.max(0, monthlyBudget - billingData.monthlyCost).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-400">
          💡 Visit the <span className="text-blue-300">Usage</span> tab for detailed analytics and provider breakdowns.
        </div>
      </div>
    </div>
  )

  const renderMCPSection = () => (
    <div className="space-y-8">
      {/* MCP Overview */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Model Context Protocol (MCP)</h4>
        <div className="text-sm text-gray-400 space-y-2">
          <div>Connect to external tools and services through MCP servers.</div>
          <div>MCP enables secure access to databases, APIs, file systems, and more.</div>
        </div>
      </div>

      {/* Available MCP Servers */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Available Servers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Notion */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-white">Notion</h5>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm">Access and manage your Notion workspace pages and databases.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* Supabase */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-white">Supabase</h5>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm">Query and manage your Supabase database tables and data.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* GitHub */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-white">GitHub</h5>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm">Access repositories, issues, and pull requests from GitHub.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* Google Drive */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-white">Google Drive</h5>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm">Browse and search files in your Google Drive storage.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* PostgreSQL */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-white">PostgreSQL</h5>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm">Connect to PostgreSQL databases for data queries and analysis.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* Slack */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-white">Slack</h5>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">Not Connected</span>
              </div>
              <p className="text-gray-400 text-sm">Send messages and access Slack workspace information.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Connect
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* MCP Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">MCP Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Auto-connect on startup</div>
              <div className="text-gray-400 text-sm">Automatically connect to configured MCP servers</div>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Show MCP status</div>
              <div className="text-gray-400 text-sm">Display connection status in chat interface</div>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* About MCP */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-lg font-medium text-blue-300 mb-2">📘 About MCP</h4>
        <div className="space-y-2 text-sm text-blue-200">
          <div>• MCP (Model Context Protocol) enables secure connections to external data sources</div>
          <div>• Each server provides specific capabilities like database access or file operations</div>
          <div>• Connections are authenticated and sandboxed for security</div>
          <div>• Use the MCP tool in chat to access connected services</div>
        </div>
      </div>
    </div>
  )

  const renderModelsSection = () => (
    <div className="space-y-8">
      {/* Model Preferences */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Model Preferences</h4>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Default model</div>
            <div className="text-gray-400 text-sm">Your preferred AI model</div>
          </div>
          <Select value={defaultModel} onValueChange={handleDefaultModelChange}>
            <SelectTrigger className="w-48 h-9 bg-transparent border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {AVAILABLE_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-gray-100">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Streaming responses</div>
            <div className="text-gray-400 text-sm">Show text as it's generated</div>
          </div>
          <Switch 
            checked={streamingEnabled}
            onCheckedChange={handleStreamingToggle}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Show token count</div>
            <div className="text-gray-400 text-sm">Display usage in messages</div>
          </div>
          <Switch 
            checked={showTokenCount}
            onCheckedChange={handleTokenCountToggle}
          />
        </div>
      </div>

      {/* Current Model Info */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Current Model</h4>
        {(() => {
          const currentModel = AVAILABLE_MODELS.find(m => m.id === defaultModel)
          if (!currentModel) return null
          
          return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-lg font-medium text-white">{currentModel.name}</h5>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded capitalize">
                    {currentModel.provider}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Max Tokens</div>
                    <div className="text-white font-medium">{currentModel.maxTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Input Cost</div>
                    <div className="text-white font-medium">${currentModel.costPer1kTokens.input * 1000}/1M</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Output Cost</div>
                    <div className="text-white font-medium">${currentModel.costPer1kTokens.output * 1000}/1M</div>
                  </div>
                </div>

                {/* Model specific info */}
                <div className="text-sm text-gray-400">
                  {currentModel.provider === 'openai' && "Advanced reasoning and natural language understanding"}
                  {currentModel.provider === 'gemini' && "Large context window and multimodal capabilities"}
                  {currentModel.provider === 'groq' && "Ultra-fast inference with optimized hardware"}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Model Information */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">About Model Settings</h4>
        <div className="text-sm text-gray-400 space-y-2">
          <div>Configure your AI model preferences and behavior settings here.</div>
          <div>• Default model affects new conversations</div>
          <div>• Streaming shows responses as they're generated</div>
          <div>• Token counts help track usage</div>
          <div className="mt-3 text-blue-300">
            💡 Check the Usage tab for detailed analytics and statistics
          </div>
        </div>
      </div>
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {
      case "api-keys":
        return renderAPIKeysSection()
      case "providers":
        return renderProvidersSection()
      case "mcp":
        return renderMCPSection()
      case "billing":
        return renderBillingSection()
      case "usage":
        return renderUsageSection()
      case "models":
        return renderModelsSection()
      case "profile":
        return renderProfileSection()
      default:
        return renderAPIKeysSection()
    }
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex w-full">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r border-slate-600/50 flex flex-col bg-slate-800/50 relative flex-shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-slate-600/50">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-400 hover:text-white h-8 w-8 p-0 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-sm font-medium text-white">Settings</h1>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                      activeSection === section.id
                        ? "bg-slate-700/50 text-white"
                        : "text-slate-300 hover:bg-slate-700/30 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs">{section.title}</span>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-600/50">
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start text-slate-400 hover:text-red-300 h-8 px-2 rounded-lg text-xs"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="h-full px-8 py-6 overflow-y-auto">
          <div className="max-w-full">
            <h2 className="text-2xl font-semibold text-white mb-8">
              {settingsSections.find(s => s.id === activeSection)?.title}
            </h2>
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}