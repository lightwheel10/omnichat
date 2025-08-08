"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Bot, Eye, EyeOff, Check } from "lucide-react"

interface SignUpProps {
  onSignUp: (email: string, password: string) => void
  onBackToLanding: () => void
  onSwitchToSignIn: () => void
}

export function SignUp({ onSignUp, onBackToLanding, onSwitchToSignIn }: SignUpProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      alert("Passwords don't match!")
      return
    }
    if (!agreedToTerms) {
      alert("Please agree to the terms and conditions")
      return
    }
    onSignUp(email, password)
  }

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[a-z]/.test(password), text: "One lowercase letter" },
    { met: /\d/.test(password), text: "One number" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-40 h-40 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl animate-pulse" style={{ animationDelay: '6s' }}></div>
      </div>

      {/* Header */}
      <header className="px-4 py-4 relative z-10">
        <nav className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">OmniChat</span>
          </div>
          <Button variant="outline" size="sm" onClick={onBackToLanding} className="h-8 px-3 bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50 rounded-lg text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>
        </nav>
      </header>

      {/* Sign Up Form */}
      <main className="px-4 py-4 relative z-10">
        <div className="max-w-sm mx-auto">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg font-semibold text-white">Create Account</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Start chatting with AI models
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="h-9 bg-slate-800/40 border-slate-600/40 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-emerald-400/20 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="h-9 pr-9 bg-slate-800/40 border-slate-600/40 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-emerald-400/20 rounded-lg text-sm"
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
                  
                  {/* Password Requirements */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center gap-1.5 text-xs">
                          <Check 
                            className={`w-2.5 h-2.5 ${req.met ? 'text-emerald-400' : 'text-slate-500'}`} 
                          />
                          <span className={req.met ? 'text-emerald-400' : 'text-slate-500'}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      className="h-9 pr-9 bg-slate-800/40 border-slate-600/40 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-emerald-400/20 rounded-lg text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-9 w-9 text-slate-400 hover:text-white hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 scale-75"
                  />
                  <Label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed">
                    I agree to the{" "}
                    <a href="#" className="text-emerald-400 hover:underline">Terms</a>
                    {" "}and{" "}
                    <a href="#" className="text-emerald-400 hover:underline">Privacy Policy</a>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm transition-all duration-200 text-sm"
                  disabled={!email || !password || !confirmPassword || password !== confirmPassword || !agreedToTerms}
                >
                  Create Account
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-400">
                  Already have an account?{" "}
                  <button
                    onClick={onSwitchToSignIn}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="mt-4 text-center">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1 justify-center text-slate-400">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Free</span>
              </div>
              <div className="flex items-center gap-1 justify-center text-slate-400">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Multiple AI</span>
              </div>
              <div className="flex items-center gap-1 justify-center text-slate-400">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Secure</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}