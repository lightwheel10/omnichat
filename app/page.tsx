"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { LandingPage } from "@/components/landing-page"

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
          <Suspense fallback={<LoadingFallback className="w-64 md:w-64 lg:w-72 border-r border-gray-800 bg-[#0d1117] flex-shrink-0" />}>
            <ConversationSidebar
              selectedConversation={selectedConversation}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              onSettingsClick={() => setActiveView("settings")}
              onSignOut={handleSignOut}
            />
          </Suspense>

          <main className="flex-1 min-w-0">
            <Suspense fallback={<LoadingFallback className="h-full" />}>
              <OptimizedChatInterface key={selectedConversation || `new-${newChatKey}`} conversationId={selectedConversation} />
            </Suspense>
          </main>
        </>
      )}
    </div>
  )
}
