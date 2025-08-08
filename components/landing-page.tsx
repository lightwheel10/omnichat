"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, MessageSquare, Zap, Shield, DollarSign, Key, Star, Check } from "lucide-react"

interface LandingPageProps {
  onGetStarted: () => void
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isAnnual, setIsAnnual] = useState(false)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        {/* Hide heavy effects on small screens for perf */}
        <div className="hidden sm:block absolute top-20 right-20 w-40 h-40 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="hidden sm:block absolute bottom-40 left-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="hidden sm:block absolute top-1/2 right-1/3 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl animate-pulse" style={{ animationDelay: '6s' }}></div>
      </div>
      
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 relative z-10">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">OmniChat</span>
          </div>
          <Button variant="outline" onClick={onGetStarted} className="bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50">
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">
        <div className="max-w-3xl sm:max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight text-balance">
            Your AI workspace for thinking, building, and shipping
            <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">— across every major model</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl sm:max-w-3xl mx-auto">
            OmniChat unifies OpenAI, Gemini, Groq and more into one fast, beautiful interface.
            Keep full control with your own API keys, or turn on a managed plan and get straight to work.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-6 sm:px-8 py-3 w-full max-w-xs sm:max-w-none sm:w-auto" onClick={onGetStarted}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Trust bar */}
        <div className="mt-10 sm:mt-14 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 opacity-90">
          {["Privacy-first", "No vendor lock-in", "Streaming by default", "One interface"].map((item) => (
            <div key={item} className="flex items-center justify-center gap-2 rounded-lg border border-slate-700/40 bg-slate-800/40 py-2 sm:py-3 text-slate-300">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm">{item}</span>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mt-16 sm:mt-24 grid md:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto">
          <div className="text-center p-4 sm:p-6">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Multiple AI Providers</h3>
            <p className="text-slate-300 text-sm sm:text-base">
              Access OpenAI GPT-4, Google Gemini, Groq, and other leading AI models from a single interface.
            </p>
          </div>

          <div className="text-center p-4 sm:p-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Bring Your Own Keys</h3>
            <p className="text-slate-300 text-sm sm:text-base">
              Use your own API keys for free access, or let us handle everything with our subscription plans.
            </p>
          </div>

          <div className="text-center p-4 sm:p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Privacy First</h3>
            <p className="text-slate-300 text-sm sm:text-base">
              Your API keys are encrypted locally. Your conversations never leave your browser unless you want them to.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
              <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center mb-3">
                <Key className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Connect</h3>
              <p className="text-slate-300 text-sm">Add your keys for OpenAI, Gemini, Groq and more. Or skip this step with a managed plan.</p>
            </div>
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
              <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Ask</h3>
              <p className="text-slate-300 text-sm">Chat naturally, run structured prompts, and switch models without losing context.</p>
            </div>
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
              <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Ship</h3>
              <p className="text-slate-300 text-sm">Export results, copy code with formatting, and move faster with clean, readable outputs.</p>
            </div>
          </div>
        </div>

        

        {/* Pricing Section */}
        <div className="mt-16 sm:mt-24 max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Choose Your Plan</h2>
            <p className="text-base sm:text-xl text-slate-300 mb-6 sm:mb-8">
              Start free with your own API keys, or let us handle everything
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <span className={`text-xs sm:text-sm ${!isAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs sm:text-sm ${isAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>
                Annual
                <span className="ml-1 text-[10px] sm:text-xs text-emerald-400 font-medium">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            {/* Free Plan */}
            <div className="bg-slate-800/50 rounded-xl p-5 sm:p-6 backdrop-blur-sm border border-slate-700/50">
              <div className="text-center mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Free</h3>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">$0</div>
                <p className="text-slate-400 text-xs sm:text-sm">Bring your own API keys</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Use your own API keys</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">All AI providers supported</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Local encryption</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Unlimited conversations</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow-sm transition-all duration-200"
                onClick={onGetStarted}
              >
                Start Free
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-5 sm:p-6 backdrop-blur-sm border border-emerald-500/30 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Pro</h3>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  ${isAnnual ? '16' : '20'}
                  <span className="text-lg font-normal text-slate-300">/month</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {isAnnual ? 'Billed annually' : 'Billed monthly'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">No API keys needed</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">100,000 tokens/month</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Cloud sync</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Advanced features</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm transition-all duration-200" 
                onClick={onGetStarted}
              >
                Start Pro Trial
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-800/50 rounded-xl p-5 sm:p-6 backdrop-blur-sm border border-slate-700/50">
              <div className="text-center mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Enterprise</h3>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  ${isAnnual ? '80' : '100'}
                  <span className="text-lg font-normal text-slate-300">/month</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {isAnnual ? 'Billed annually' : 'Billed monthly'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Unlimited tokens</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Team collaboration</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Custom models</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">SSO & compliance</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Dedicated support</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow-sm transition-all duration-200" 
                onClick={onGetStarted}
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-16 sm:mt-24 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6 sm:mb-10">People who switched, stayed</h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {["The table rendering is superb — exactly like pro chat apps.", "Swapping models mid‑chat saves me hours weekly.", "Clean UI, zero clutter. It just streams fast and looks great."].map((quote, idx) => (
              <div key={idx} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-6">
                <Star className="w-4 h-4 text-emerald-400 mb-3" />
                <p className="text-slate-200 text-sm">“{quote}”</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 sm:mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4 sm:mb-6">Frequently asked</h2>
          <div className="space-y-2 sm:space-y-3">
            {[{ q: "Do you store my API keys?", a: "Keys are encrypted locally in your browser. Nothing leaves your device unless you export it." },
              { q: "Can I use multiple providers?", a: "Yes. Add as many as you like and switch models on the fly." },
              { q: "Is there a free plan?", a: "Yes. Bring your own keys and use OmniChat for free." }].map(({ q, a }) => (
              <details key={q} className="group rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 sm:p-4">
                <summary className="cursor-pointer list-none text-white font-medium flex items-center justify-between text-sm sm:text-base">
                  {q}
                  <span className="ml-4 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-2 text-slate-300 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 sm:mt-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Ready to try OmniChat?</h2>
          <p className="text-slate-300 mb-4 sm:mb-6 text-sm sm:text-base">Sign up in seconds. No credit card required on the free plan.</p>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-6 sm:px-8 py-3 w-full max-w-xs sm:max-w-none sm:w-auto" onClick={onGetStarted}>
            Create your account
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </main>

      {/* Footer */}
      <footer className="px-4 py-4 border-t border-slate-700/30 mt-8 relative z-10">
        <div className="text-center text-xs text-slate-500 max-w-4xl mx-auto">
          <p>© 2024 OmniChat • Privacy First</p>
        </div>
      </footer>
    </div>
  )
}