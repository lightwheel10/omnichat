"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { LandingPage } from "@/components/landing-page"
import { Menu, Settings, SidebarOpen, Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

// Lazy load all components except landing page
const ConversationSidebar = lazy(() => import("@/components/conversation-sidebar").then(module => ({ default: module.ConversationSidebar })))
const ChatInterface = lazy(() => import("@/components/chat-interface").then(module => ({ default: module.ChatInterface })))
const SettingsPage = lazy(() => import("@/components/settings-page").then(module => ({ default: module.SettingsPage })))
const SignIn = lazy(() => import("@/components/sign-in").then(module => ({ default: module.SignIn })))
const SignUp = lazy(() => import("@/components/signup").then(module => ({ default: module.SignUp })))

// Optimized lazy loading without artificial delays for production performance
const OptimizedChatInterface = lazy(() => import("@/components/chat-interface").then(module => ({ default: module.ChatInterface })))
const OptimizedSettingsPage = lazy(() => import("@/components/settings-page").then(module => ({ default: module.SettingsPage })))
const OptimizedSignIn = lazy(() => import("@/components/sign-in").then(module => ({ default: module.SignIn })))
const OptimizedSignUp = lazy(() => import("@/components/signup").then(module => ({ default: module.SignUp })))

// Loading component for Suspense fallback – generic skeleton blocks
const LoadingFallback = ({ className = "" }: { className?: string }) => (
  <div className={`bg-[#0d1117] ${className}`}>
    <div className="p-3 space-y-3">
      <div className="h-4 w-28 bg-slate-700/40 rounded animate-pulse" />
      <div className="h-8 w-full bg-slate-700/20 rounded-md animate-pulse" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-full bg-slate-700/20 rounded-md animate-pulse" />
        ))}
      </div>
    </div>
  </div>
)

export default function AIWorkbench() {
  const [activeView, setActiveView] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [newChatKey, setNewChatKey] = useState<string>("initial")
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Session bootstrap: prefer Supabase auth; fall back to local flag if present
    const init = async () => {
      try {
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsAuthenticated(true)
            setActiveView("chat")
            setIsLoading(false)
            return
          }
          // Listen for changes to keep UI in sync
          supabase.auth.onAuthStateChange((_evt: unknown, sess: unknown) => {
            const hasSession = !!(sess as any)
            setIsAuthenticated(hasSession)
            setActiveView(hasSession ? "chat" : "landing")
          })
        }
      } finally {
        // Legacy fallback: preserve current behavior when Supabase is not configured
        if (!supabase) {
          const savedAuth = localStorage.getItem("ai-workbench-auth")
          if (savedAuth === "true") {
            setIsAuthenticated(true)
            setActiveView("chat")
          } else {
            setActiveView("landing")
          }
        }
        setIsLoading(false)
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Expose conversation management functions to child components
  useEffect(() => {
    (window as any).setSelectedConversation = setSelectedConversation
  }, [setSelectedConversation])

  const handleSignIn = async (email: string, password: string) => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setIsAuthenticated(true)
      setActiveView("chat")
      return
    }
    // Fallback legacy path
    localStorage.setItem("ai-workbench-auth", "true")
    localStorage.setItem("ai-workbench-user", email)
    setIsAuthenticated(true)
    setActiveView("chat")
  }

  const handleSignUp = async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        const message = (error.message || '').toLowerCase()
        // If the user already exists, automatically try to sign them in
        if (message.includes('already registered') || (error as any).status === 422 || (error as any).code === 'user_already_exists') {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) throw signInError
          setIsAuthenticated(true)
          setActiveView("chat")
          return
        }
        throw error
      }
      // If email confirmations are disabled, session will be available immediately
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session) {
        setIsAuthenticated(true)
        setActiveView("chat")
      } else {
        // Otherwise show sign-in view (in case confirmation was required)
        setActiveView("signin")
      }
      return
    }
    // Fallback legacy path
    localStorage.setItem("ai-workbench-auth", "true")
    localStorage.setItem("ai-workbench-user", email)
    setIsAuthenticated(true)
    setActiveView("chat")
  }

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    localStorage.removeItem("ai-workbench-auth")
    localStorage.removeItem("ai-workbench-user")
    setIsAuthenticated(false)
    setActiveView("landing")
  }

  const showSignUp = () => {
    setActiveView("signup")
  }

  const showSignIn = () => {
    setActiveView("signin")
  }

  const backToLanding = () => {
    setActiveView("landing")
  }

  const handleNewConversation = () => {
    setSelectedConversation(null)
    setNewChatKey(Date.now().toString()) // Force new key for React re-render
    setActiveView("chat")
  }

  const handleConversationSelect = (id: string) => {
    setSelectedConversation(id)
    setActiveView("chat")
  }

  // Show loading until we determine the correct view
  if (isLoading || activeView === null) {
    return (
      <div className="h-screen bg-[#0d1117] flex w-full overflow-hidden">
        {/* Sidebar skeleton (desktop) */}
        <div className="hidden md:flex h-full w-64 lg:w-72 border-r border-gray-800 bg-[#0d1117] flex-col">
          <div className="p-3 border-b border-slate-600/50">
            <div className="h-4 w-24 bg-slate-700/40 rounded animate-pulse" />
            <div className="mt-3 h-8 w-full bg-slate-700/20 rounded-md animate-pulse" />
            <div className="mt-3 h-8 w-full bg-slate-700/20 rounded-md animate-pulse" />
          </div>
          <div className="px-3 py-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-700/20 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
        {/* Main skeleton */}
        <main className="flex-1 min-w-0 h-full flex flex-col">
          {/* Header placeholder */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-slate-600/50">
            <div className="h-4 w-48 bg-slate-700/30 rounded animate-pulse" />
            <div className="flex items-center gap-6">
              <div className="h-3 w-24 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-3 w-20 bg-slate-700/30 rounded animate-pulse" />
            </div>
          </div>
          {/* Messages skeleton */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${i % 2 ? '' : ''}`}>
                  <div className={`h-16 bg-slate-700/20 rounded-2xl animate-pulse w-[min(55ch,80vw)]`} />
                </div>
              </div>
            ))}
          </div>
          {/* Input skeleton */}
          <div className="border-t border-slate-600/50 p-4 md:p-6 bg-slate-800/40">
            <div className="max-w-full lg:max-w-3xl mx-auto h-12 bg-slate-700/30 rounded-2xl animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (activeView === "landing") {
    return <LandingPage onGetStarted={showSignUp} />
  }

  if (activeView === "signup") {
    return (
      <Suspense fallback={<LoadingFallback className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />}>
        <OptimizedSignUp 
          onSignUp={handleSignUp} 
          onBackToLanding={backToLanding}
          onSwitchToSignIn={showSignIn}
        />
      </Suspense>
    )
  }

  if (activeView === "signin") {
    return (
      <Suspense fallback={<LoadingFallback className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />}>
        <OptimizedSignIn onSignIn={handleSignIn} />
      </Suspense>
    )
  }

  return (
    <div className="h-screen bg-[#0d1117] flex w-full overflow-hidden">
      {activeView === "settings" ? (
        // Full-page settings view
        <Suspense fallback={<LoadingFallback className="h-full w-full" />}>
          <OptimizedSettingsPage onBack={() => setActiveView("chat")} onSignOut={handleSignOut} />
        </Suspense>
      ) : (
        // Chat view with sidebar
        <>
          {/* Desktop sidebar */}
          {!isDesktopSidebarCollapsed && (
            <div className="hidden md:block h-full">
              <Suspense fallback={<LoadingFallback className="w-64 md:w-64 lg:w-72 border-r border-gray-800 bg-[#0d1117] flex-shrink-0" />}>
                <ConversationSidebar
                  className="h-full w-64 md:w-64 lg:w-72"
                  selectedConversation={selectedConversation}
                  onConversationSelect={handleConversationSelect}
                  onNewConversation={handleNewConversation}
                  onSettingsClick={() => setActiveView("settings")}
                  onSignOut={handleSignOut}
                  onCollapse={() => setIsDesktopSidebarCollapsed(true)}
                />
              </Suspense>
            </div>
          )}

          {/* Collapsed icon rail (desktop) */}
          {isDesktopSidebarCollapsed && (
            <div className="hidden md:flex h-full w-14 flex-col items-center gap-4 border-r border-gray-800 bg-[#0d1117] py-3">
              <button
                aria-label="Open sidebar"
                title="Open sidebar"
                className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md p-1.5"
                onClick={() => setIsDesktopSidebarCollapsed(false)}
              >
                <SidebarOpen className="w-5 h-5" />
              </button>
              <button
                aria-label="New chat"
                title="New chat"
                className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md p-1.5"
                onClick={handleNewConversation}
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                aria-label="Search"
                title="Search"
                className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md p-1.5"
                onClick={() => {/* placeholder for future search action */}}
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                aria-label="Settings"
                title="Settings"
                className="mt-auto mb-1 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md p-1.5"
                onClick={() => setActiveView("settings")}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Mobile drawer sidebar (always mounted for smooth transitions) */}
          <div className={`md:hidden fixed inset-0 z-40 ${isMobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div
              className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div
              className={`absolute left-0 top-0 h-full w-72 bg-[#0d1117] border-r border-gray-800 shadow-xl transform transition-transform duration-200 ease-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
              style={{ willChange: 'transform' }}
            >
              {isMobileSidebarOpen && (
                <Suspense fallback={<LoadingFallback className="w-72 h-full" />}>
                  <ConversationSidebar
                    className="w-72 h-full"
                    selectedConversation={selectedConversation}
                    onConversationSelect={(id) => { setIsMobileSidebarOpen(false); handleConversationSelect(id) }}
                    onNewConversation={() => { setIsMobileSidebarOpen(false); handleNewConversation() }}
                    onSettingsClick={() => { setIsMobileSidebarOpen(false); setActiveView("settings") }}
                    onSignOut={() => { setIsMobileSidebarOpen(false); handleSignOut() }}
                    onCollapse={() => setIsMobileSidebarOpen(false)}
                  />
                </Suspense>
              )}
            </div>
          </div>

          <main className="flex-1 min-w-0 h-full flex flex-col relative">
            {/* Mobile floating menu button (no top bar) */}
            <button
              aria-label="Open menu"
              className="md:hidden fixed left-3 z-30 rounded-md bg-[#0d1117]/90 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 p-2 shadow-sm"
              style={{ top: `calc(env(safe-area-inset-top, 0px) + 8px)` }}
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 min-h-0 relative">
              <Suspense fallback={<LoadingFallback className="h-full" />}>
                <OptimizedChatInterface conversationId={selectedConversation} />
              </Suspense>
            </div>
          </main>
        </>
      )}
    </div>
  )
}
