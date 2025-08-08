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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-40 h-40 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl animate-pulse" style={{ animationDelay: '6s' }}></div>
      </div>
      
      {/* Header */}
      <header className="container mx-auto px-6 py-6 relative z-10">
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
      <main className="container mx-auto px-6 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            One Platform,
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> All AI Models</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Chat with OpenAI GPT, Google Gemini, Groq, and more - all in one unified interface. 
            Bring your own API keys for free access, or subscribe for hassle-free unlimited usage.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8 py-3" onClick={onGetStarted}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Multiple AI Providers</h3>
            <p className="text-slate-300">
              Access OpenAI GPT-4, Google Gemini, Groq, and other leading AI models from a single interface.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Bring Your Own Keys</h3>
            <p className="text-slate-300">
              Use your own API keys for free access, or let us handle everything with our subscription plans.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Privacy First</h3>
            <p className="text-slate-300">
              Your API keys are encrypted locally. Your conversations never leave your browser unless you want them to.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-24 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Choose Your Plan</h2>
            <p className="text-xl text-slate-300 mb-8">
              Start free with your own API keys, or let us handle everything
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm ${!isAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>
                Annual
                <span className="ml-1 text-xs text-emerald-400 font-medium">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700/50">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
                <div className="text-3xl font-bold text-white mb-1">$0</div>
                <p className="text-slate-400 text-sm">Bring your own API keys</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Use your own API keys</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">All AI providers supported</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Local encryption</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
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
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-6 backdrop-blur-sm border border-emerald-500/30 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                <div className="text-3xl font-bold text-white mb-1">
                  ${isAnnual ? '16' : '20'}
                  <span className="text-lg font-normal text-slate-300">/month</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {isAnnual ? 'Billed annually' : 'Billed monthly'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">No API keys needed</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">100,000 tokens/month</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Cloud sync</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
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
            <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700/50">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
                <div className="text-3xl font-bold text-white mb-1">
                  ${isAnnual ? '80' : '100'}
                  <span className="text-lg font-normal text-slate-300">/month</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {isAnnual ? 'Billed annually' : 'Billed monthly'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Unlimited tokens</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Team collaboration</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">Custom models</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">SSO & compliance</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
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

        {/* Supported Models Section */}
        <div className="mt-8 text-center">
          <h2 className="text-lg font-semibold text-white mb-4">Supported Models</h2>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="p-3 bg-slate-800/30 rounded-lg backdrop-blur-sm">
              <h3 className="font-medium text-white text-sm mb-1">OpenAI</h3>
              <p className="text-xs text-slate-400">GPT-4o, GPT-4</p>
            </div>
            <div className="p-3 bg-slate-800/30 rounded-lg backdrop-blur-sm">
              <h3 className="font-medium text-white text-sm mb-1">Google</h3>
              <p className="text-xs text-slate-400">Gemini Pro</p>
            </div>
          </div>
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