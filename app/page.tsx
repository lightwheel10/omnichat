"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { LandingPage } from "@/components/landing-page"
import { Menu, Settings, SidebarOpen, Plus, Search } from "lucide-react"

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

// Loading component for Suspense fallback
const LoadingFallback = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="text-white/60 animate-pulse">Loading component...</div>
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
    // Check if user is already signed in
    const savedAuth = localStorage.getItem("ai-workbench-auth")
    if (savedAuth === "true") {
      setIsAuthenticated(true)
      setActiveView("chat")
    } else {
      setActiveView("landing")
    }
    setIsLoading(false)
  }, [])

  // Expose conversation management functions to child components
  useEffect(() => {
    (window as any).setSelectedConversation = setSelectedConversation
  }, [setSelectedConversation])

  const handleSignIn = (email: string, _password: string) => {
    // Dummy authentication - accept any email/password
    localStorage.setItem("ai-workbench-auth", "true")
    localStorage.setItem("ai-workbench-user", email)
    setIsAuthenticated(true)
    setActiveView("chat")
  }

  const handleSignUp = (email: string, _password: string) => {
    // Dummy signup - same as sign in for now
    localStorage.setItem("ai-workbench-auth", "true")
    localStorage.setItem("ai-workbench-user", email)
    setIsAuthenticated(true)
    setActiveView("chat")
  }

  const handleSignOut = () => {
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
      <div className="h-screen bg-[#0d1117]">
        {/* Empty loading state that matches app background */}
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
            </div>
          </div>

          <main className="flex-1 min-w-0 h-full flex flex-col">
            {/* Mobile top bar */}
            <div className="md:hidden sticky top-0 z-30 bg-[#0d1117] border-b border-gray-800 px-3 py-2 flex items-center justify-between">
              <button aria-label="Open menu" className="text-gray-300 hover:text-white" onClick={() => setIsMobileSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-white text-sm font-medium">OmniChat</div>
              <button aria-label="Open settings" className="text-gray-300 hover:text-white" onClick={() => setActiveView("settings") }>
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Suspense fallback={<LoadingFallback className="h-full" />}>
                <OptimizedChatInterface key={selectedConversation || `new-${newChatKey}`} conversationId={selectedConversation} />
              </Suspense>
            </div>
          </main>
        </>
      )}
    </div>
  )
}
