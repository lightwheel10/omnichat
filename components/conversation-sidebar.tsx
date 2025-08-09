"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { storage, type StoredConversation } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Settings, DollarSign, User, MessageSquare, MoreVertical, Trash2, Bot, Loader2, ChevronLeft } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import clsx from "clsx"

interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: string
  tokens?: number
  cost?: number
  createdAt: Date
}

interface ConversationSidebarProps {
  selectedConversation: string | null
  onConversationSelect: (id: string) => void
  onNewConversation: () => void
  onSettingsClick: () => void
  onSignOut: () => void
  className?: string
  onCollapse?: () => void
}

export function ConversationSidebar({
  selectedConversation,
  onConversationSelect,
  onNewConversation,
  onSettingsClick,
  onSignOut,
  className,
  onCollapse,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true)
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null)

  // Load conversations (cloud or local) on mount and on storage notifications
  useEffect(() => {
    let unsub: (() => void) | null = null
    const hasLoadedRef = { current: false }
    const load = async () => {
      try {
        if (!hasLoadedRef.current) {
          setIsLoadingList(true)
        }
        const items = await storage.getConversations()
        const mapped: Conversation[] = items.map((c: StoredConversation) => ({
          id: c.id,
          title: c.title,
          preview: c.preview || "",
          tokens: c.tokens || 0,
          cost: c.cost || 0,
          createdAt: new Date(c.createdAt),
          timestamp: formatTimestamp(new Date(c.createdAt)),
        }))
        setConversations(mapped)
      } catch (e) {
        console.error('Failed to load conversations', e)
      } finally {
        if (!hasLoadedRef.current) {
          setIsLoadingList(false)
          hasLoadedRef.current = true
        }
      }
    }
    void load()
    // For subsequent storage notifications, update without skeleton
    unsub = storage.subscribe(async () => {
      try {
        const items = await storage.getConversations()
        const mapped: Conversation[] = items.map((c: StoredConversation) => ({
          id: c.id,
          title: c.title,
          preview: c.preview || "",
          tokens: c.tokens || 0,
          cost: c.cost || 0,
          createdAt: new Date(c.createdAt),
          timestamp: formatTimestamp(new Date(c.createdAt)),
        }))
        setConversations(mapped)
      } catch (e) {
        console.error('Failed to refresh conversations', e)
      }
    })
    return () => { if (unsub) unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalCost = conversations.reduce((sum, conv) => sum + (conv.cost || 0), 0)
  const userEmail = localStorage.getItem("ai-workbench-user") || "user@example.com"

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 60) {
      return `${diffMinutes}m`
    } else if (diffHours < 24) {
      return `${diffHours}h`
    } else {
      return `${diffDays}d`
    }
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await storage.deleteConversation(id)
      if (selectedConversation === id) {
        onConversationSelect("")
      }
    } catch (err) {
      console.error('Failed to delete conversation', err)
    }
  }

  // Function to add a new conversation (called from parent)
  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => [conversation, ...prev])
  }, [])

  // Function to update conversation (called from parent) 
  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, ...updates } : conv
      )
    )
  }, [])

  // Functions to manage loading state
  const setConversationLoading = useCallback((id: string) => {
    setLoadingConversationId(id)
    // eslint-disable-next-line no-console
    console.log('[Sidebar] setConversationLoading', id)
  }, [])

  const clearConversationLoading = useCallback(() => {
    setLoadingConversationId(null)
    // eslint-disable-next-line no-console
    console.log('[Sidebar] clearConversationLoading')
  }, [])

  const removeConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    // eslint-disable-next-line no-console
    console.log('[Sidebar] removeConversation', id)
  }, [])

  // Expose functions to parent component
  useEffect(() => {
    (window as any).conversationHelpers = {
      addConversation,
      updateConversation,
      setConversationLoading,
      clearConversationLoading,
      removeConversation
    }
    // eslint-disable-next-line no-console
    console.log('[Sidebar] conversationHelpers registered')
  }, [addConversation, updateConversation, setConversationLoading, clearConversationLoading, removeConversation])

  return (
    <aside className={clsx("border-r border-slate-600/50 bg-slate-800/50 relative flex-shrink-0 flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="p-3 border-b border-slate-600/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-white" />
            <span className="font-medium text-white text-sm">OmniChat</span>
          </div>
          {/* Collapse controls: desktop + mobile */}
          {onCollapse && (
            <div className="flex items-center gap-2">
              {/* Mobile close */}
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex md:hidden h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/40"
                onClick={onCollapse}
                aria-label="Close sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {/* Desktop collapse */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/40"
                onClick={onCollapse}
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <Button 
          className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
          onClick={onNewConversation}
        >
          New Chat
        </Button>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search your threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-400 focus:border-slate-500/50 focus:ring-0 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium text-slate-400 mb-2">Today</h3>
          {/* Loading skeleton */}
          {isLoadingList ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-700/20 border border-slate-700/30 animate-pulse">
                  <div className="h-3 w-2/3 bg-slate-600/40 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-2 rounded-lg cursor-pointer group transition-colors text-sm ${
                    selectedConversation === conversation.id 
                      ? "bg-slate-700/50 text-white" 
                      : "text-slate-300 hover:bg-slate-700/30 hover:text-white"
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {loadingConversationId === conversation.id ? (
                        <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin text-emerald-300" />
                      ) : (
                        <MessageSquare className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="truncate text-xs">
                        {conversation.title}
                      </span>
                      {/* Removed text badge; spinner icon on the left is sufficient */}
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-600/50 text-slate-400 hover:text-white p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-2.5 h-2.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-600/50">
                        <DropdownMenuItem 
                          onClick={(e) => deleteConversation(conversation.id, e)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
              {filteredConversations.length === 0 && (
                <div className="text-xs text-slate-500 py-6">No conversations yet</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-600/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">C</span>
            </div>
            <div className="text-xs">
              <div className="text-white font-medium">constant change</div>
              <div className="text-gray-400">Free</div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800 rounded p-0"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700">
              <DropdownMenuItem 
                onClick={onSettingsClick}
                className="text-gray-300 hover:text-white hover:bg-gray-700 text-xs"
              >
                <Settings className="w-3 h-3 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onSignOut}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
              >
                <User className="w-3 h-3 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  )
}