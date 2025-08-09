import { supabase } from '@/lib/supabaseClient'

// Shared shapes between UI and storage
export type StoredMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  tokens?: number
  cost?: number
  model?: string
  reasoningTokens?: number
  inputTokens?: number
  outputTokens?: number
  contextTokensAfter?: number
}

export type StoredConversation = {
  id: string
  title: string
  preview?: string
  tokens?: number
  cost?: number
  createdAt: string
  messages?: StoredMessage[]
}

export interface StorageAPI {
  getConversations(): Promise<StoredConversation[]>
  getConversation(id: string): Promise<StoredConversation | null>
  createConversation(data: Omit<StoredConversation, 'id' | 'createdAt'> & { messages: StoredMessage[] }): Promise<string>
  updateConversation(id: string, updates: Partial<Omit<StoredConversation, 'id' | 'createdAt'>> & { messages?: StoredMessage[] }): Promise<void>
  deleteConversation(id: string): Promise<void>
  subscribe(callback: () => void): () => void
}

// Simple pub/sub to notify components on changes
const listeners = new Set<() => void>()
function notify() {
  listeners.forEach(fn => fn())
}

function getLocalConversations(): StoredConversation[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem('ai-chat-conversations')
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function setLocalConversations(convs: StoredConversation[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('ai-chat-conversations', JSON.stringify(convs))
}

async function isSignedIn(): Promise<boolean> {
  if (!supabase) return false
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function getDbConversations(): Promise<StoredConversation[]> {
  const userId = await getUserId()
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('conversations')
    .select('id,title,preview,tokens,cost,created_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    preview: row.preview ?? undefined,
    tokens: row.tokens ?? 0,
    cost: row.cost ?? 0,
    createdAt: row.created_at,
  }))
}

async function getDbConversation(id: string): Promise<StoredConversation | null> {
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('id,title,preview,tokens,cost,created_at')
    .eq('id', id)
    .single()
  if (error) return null
  const { data: msgs, error: mErr } = await supabase
    .from('messages')
    .select('id,role,content,timestamp,tokens,cost,model,reasoning_tokens,input_tokens,output_tokens,context_tokens_after')
    .eq('conversation_id', id)
    .order('timestamp', { ascending: true })
  if (mErr) throw mErr
  return {
    id: conv.id,
    title: conv.title,
    preview: conv.preview ?? undefined,
    tokens: conv.tokens ?? 0,
    cost: conv.cost ?? 0,
    createdAt: conv.created_at,
    messages: (msgs || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      tokens: m.tokens ?? undefined,
      cost: m.cost ?? undefined,
      model: m.model ?? undefined,
      reasoningTokens: m.reasoning_tokens ?? undefined,
      inputTokens: m.input_tokens ?? undefined,
      outputTokens: m.output_tokens ?? undefined,
      contextTokensAfter: m.context_tokens_after ?? undefined,
    }))
  }
}

async function createDbConversation(data: Omit<StoredConversation, 'id' | 'createdAt'> & { messages: StoredMessage[] }): Promise<string> {
  const userId = await getUserId()
  if (!supabase || !userId) throw new Error('Not authenticated')
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: data.title,
      preview: data.preview ?? null,
      tokens: data.tokens ?? 0,
      cost: data.cost ?? 0,
    })
    .select('id')
    .single()
  if (error) throw error
  if (data.messages?.length) {
    const rows = data.messages.map(m => ({
      conversation_id: conv.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp).toISOString(),
      tokens: m.tokens ?? null,
      cost: m.cost ?? null,
      model: m.model ?? null,
      reasoning_tokens: m.reasoningTokens ?? null,
      input_tokens: m.inputTokens ?? null,
      output_tokens: m.outputTokens ?? null,
      context_tokens_after: m.contextTokensAfter ?? null,
    }))
    const { error: mErr } = await supabase.from('messages').insert(rows)
    if (mErr) throw mErr
  }
  notify()
  return conv.id as string
}

async function updateDbConversation(id: string, updates: Partial<Omit<StoredConversation, 'id' | 'createdAt'>> & { messages?: StoredMessage[] }) {
  const payload: any = {}
  if (typeof updates.title === 'string') payload.title = updates.title
  if (typeof updates.preview === 'string') payload.preview = updates.preview
  if (typeof updates.tokens === 'number') payload.tokens = updates.tokens
  if (typeof updates.cost === 'number') payload.cost = updates.cost
  payload.updated_at = new Date().toISOString()
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('conversations').update(payload).eq('id', id)
    if (error) throw error
  }
  if (updates.messages) {
    // Replace message set
    const { error: delErr } = await supabase.from('messages').delete().eq('conversation_id', id)
    if (delErr) throw delErr
    if (updates.messages.length) {
      const rows = updates.messages.map(m => ({
        conversation_id: id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
        tokens: m.tokens ?? null,
        cost: m.cost ?? null,
        model: m.model ?? null,
        reasoning_tokens: m.reasoningTokens ?? null,
        input_tokens: m.inputTokens ?? null,
        output_tokens: m.outputTokens ?? null,
        context_tokens_after: m.contextTokensAfter ?? null,
      }))
      const { error: insErr } = await supabase.from('messages').insert(rows)
      if (insErr) throw insErr
    }
  }
  notify()
}

async function deleteDbConversation(id: string) {
  const { error } = await supabase.from('conversations').delete().eq('id', id)
  if (error) throw error
  notify()
}

// Local fallback implementation
const localStorageAPI: StorageAPI = {
  async getConversations() {
    return getLocalConversations()
  },
  async getConversation(id: string) {
    const conv = getLocalConversations().find(c => c.id === id)
    return conv || null
  },
  async createConversation(data) {
    const id = `conv-${Date.now()}`
    const conv: StoredConversation = {
      id,
      title: data.title,
      preview: data.preview,
      tokens: data.tokens ?? 0,
      cost: data.cost ?? 0,
      createdAt: new Date().toISOString(),
      messages: data.messages
    }
    const convs = [conv, ...getLocalConversations()]
    setLocalConversations(convs)
    notify()
    return id
  },
  async updateConversation(id, updates) {
    const convs = getLocalConversations()
    const next = convs.map(c => c.id === id ? {
      ...c,
      ...('title' in updates ? { title: updates.title! } : {}),
      ...('preview' in updates ? { preview: updates.preview } : {}),
      ...('tokens' in updates ? { tokens: updates.tokens } : {}),
      ...('cost' in updates ? { cost: updates.cost } : {}),
      ...(updates.messages ? { messages: updates.messages } : {}),
    } : c)
    setLocalConversations(next)
    notify()
  },
  async deleteConversation(id) {
    const next = getLocalConversations().filter(c => c.id !== id)
    setLocalConversations(next)
    notify()
  },
  subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  }
}

export const storage: StorageAPI = {
  async getConversations() {
    if (await isSignedIn()) return getDbConversations()
    return localStorageAPI.getConversations()
  },
  async getConversation(id: string) {
    if (await isSignedIn()) return getDbConversation(id)
    return localStorageAPI.getConversation(id)
  },
  async createConversation(data) {
    if (await isSignedIn()) return createDbConversation(data)
    return localStorageAPI.createConversation(data)
  },
  async updateConversation(id, updates) {
    if (await isSignedIn()) return updateDbConversation(id, updates)
    return localStorageAPI.updateConversation(id, updates)
  },
  async deleteConversation(id) {
    if (await isSignedIn()) return deleteDbConversation(id)
    return localStorageAPI.deleteConversation(id)
  },
  subscribe(callback) {
    return localStorageAPI.subscribe(callback)
  }
}


