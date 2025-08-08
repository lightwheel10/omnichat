"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, Eye, EyeOff } from "lucide-react"

interface SignInProps {
  onSignIn: (email: string, password: string) => void
}

export function SignIn({ onSignIn }: SignInProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSignIn(email, password)
    setIsLoading(false)
  }

  const handleDemoLogin = () => {
    setEmail("demo@example.com")
    setPassword("demo123")
    setTimeout(() => {
      onSignIn("demo@example.com", "demo123")
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-40 h-40 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl animate-pulse" style={{ animationDelay: '6s' }}></div>
      </div>
      
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Command className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">OmniChat</span>
          </div>
          <p className="text-slate-400 text-sm">Sign in to continue</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-center text-white">Welcome back</CardTitle>
            <CardDescription className="text-center text-slate-400 text-sm">Enter your credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 bg-slate-800/40 border-slate-600/40 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-emerald-400/20 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 pr-9 bg-slate-800/40 border-slate-600/40 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-emerald-400/20 rounded-lg text-sm"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 text-slate-400 hover:text-white hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <Button type="submit" className="w-full h-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm transition-all duration-200 text-sm" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600/40" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-slate-800/50 text-slate-400">Or</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full mt-3 h-8 bg-slate-800/30 border-slate-600/40 text-slate-300 hover:bg-slate-700/40 hover:border-slate-500/50 rounded-lg text-xs" onClick={handleDemoLogin}>
                Try Demo
              </Button>
            </div>

            <div className="mt-4 text-center text-xs text-slate-400">
              <p>Any email/password works</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
