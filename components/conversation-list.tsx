"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Settings, DollarSign, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabaseClient"

interface ConversationListProps {
  selectedConversation: string
  onConversationSelect: (id: string) => void
  onSettingsClick: () => void
}

export function ConversationList({
  selectedConversation,
  onConversationSelect,
  onSettingsClick,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userEmail, setUserEmail] = useState<string>("")

  const conversations = [
    {
      id: "conv-1",
      title: "API Documentation Review",
      preview: "Can you help me review this API documentation...",
      timestamp: "2h",
      tokens: 2450,
      cost: 0.074,
    },
    {
      id: "conv-2",
      title: "React Performance",
      preview: "I'm having performance issues with my React app...",
      timestamp: "5h",
      tokens: 1820,
      cost: 0.027,
    },
    {
      id: "conv-3",
      title: "Database Schema",
      preview: "Help me design a database schema...",
      timestamp: "1d",
      tokens: 3200,
      cost: 0.096,
    },
  ]

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalCost = conversations.reduce((sum, conv) => sum + conv.cost, 0)
  // Load user email from Supabase
  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email) setUserEmail(user.email)
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  return (
    <aside className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-900">Conversations</h1>
          <Button size="sm" className="bg-black hover:bg-gray-800">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 ${
              selectedConversation === conversation.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
            }`}
            onClick={() => onConversationSelect(conversation.id)}
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-medium text-gray-900 text-sm truncate flex-1">{conversation.title}</h3>
              <span className="text-xs text-gray-500 ml-2">{conversation.timestamp}</span>
            </div>
            <p className="text-gray-600 text-xs truncate mb-2">{conversation.preview}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{conversation.tokens.toLocaleString()} tokens</span>
              <span>${conversation.cost.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">This month:</span>
          <div className="flex items-center gap-1 text-gray-900 font-medium">
            <DollarSign className="w-3 h-3" />
            {totalCost.toFixed(2)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="flex-1 justify-start text-gray-600 hover:text-gray-900"
            onClick={onSettingsClick}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm text-gray-600">
                <div className="font-medium text-gray-900">Signed in as</div>
                <div className="truncate">{userEmail}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettingsClick}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  )
}
