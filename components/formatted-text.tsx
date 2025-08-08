"use client"

import React, { useState, memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FormattedTextProps {
  content: string
  document?: boolean
  className?: string
}

interface CodeBlockProps {
  language: string
  code: string
}

const CodeBlock: React.FC<CodeBlockProps> = memo(({ language, code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Memoize syntax highlighter props to prevent re-renders
  const syntaxHighlighterProps = useMemo(() => ({
    language: language || 'text',
    style: tomorrow,
    customStyle: {
      margin: 0,
      padding: '1rem',
      background: '#0d1117',
      fontSize: '14px',
      lineHeight: '1.5'
    },
    showLineNumbers: false,
    wrapLines: false,
    wrapLongLines: false
  }), [language])

  return (
    <div className="my-4 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden max-w-full">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase">
          {language || 'code'}
        </span>
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter {...syntaxHighlighterProps}>
        {code}
      </SyntaxHighlighter>
    </div>
  )
})

const parseMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  let currentIndex = 0

  // Process code blocks first
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index)
      parts.push(...parseInlineElements(beforeText))
    }

    // Add code block
    const language = match[1] || 'text'
    const code = match[2].trim()

    // Heuristic: if a fenced block contains a GitHub-style markdown table,
    // render it as a table instead of a code block for better UX.
    const isLikelyTable = (() => {
      const lines = code.split(/\r?\n/)
      if (lines.length < 2) return false
      const hasPipes = lines.some(l => l.trim().startsWith('|') && l.includes('|'))
      const hasSeparator = lines.some(l => /^(\s*\|)?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+(\|\s*)?$/.test(l))
      return hasPipes && hasSeparator
    })()

    if (language === 'text' && isLikelyTable) {
      parts.push(...parseInlineElements(code))
    } else {
    parts.push(
      <CodeBlock 
        key={`code-${match.index}`} 
        language={language} 
        code={code} 
      />
    )
    }

    currentIndex = match.index + match[0].length
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex)
    parts.push(...parseInlineElements(remainingText))
  }

  return parts
}

const parseInlineElements = (text: string): React.ReactNode[] => {
  // Let ReactMarkdown + GFM handle tables robustly (including last row w/o trailing newline)
  return parseSimpleInlineElements(text)
}

const parseSimpleInlineElements = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  parts.push(
    <ReactMarkdown
      key="md"
      remarkPlugins={[remarkGfm]}
      components={{
        // Render fenced code blocks via <pre> so we don't place block elements inside <p>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pre({children}: any) {
          const codeEl = Array.isArray(children) ? children[0] : children
          const className: string = codeEl?.props?.className || ''
          const match = /language-(\w+)/.exec(className)
          const language = match ? match[1] : ''
          const raw = codeEl?.props?.children
          const code = Array.isArray(raw) ? raw.join('') : String(raw ?? '')
          return <CodeBlock language={language} code={code.replace(/\n$/, '')} />
        },
        // Inline code only
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code({inline, className, children, ...props}: any) {
          return (
            <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded font-mono border border-gray-700" {...props}>
              {children}
            </code>
          )
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        table({children}: any) {
          return (
            <div className="my-4 rounded-xl border border-gray-700 shadow-sm">
              <div className="overflow-x-auto max-w-full">
                <table className="table-auto w-max border-separate border-spacing-0 text-sm bg-slate-900">{children}</table>
              </div>
            </div>
          )
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thead({children}: any) { return <thead className="bg-slate-800/80">{children}</thead> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tbody({children}: any) { return <tbody className="divide-y divide-gray-700">{children}</tbody> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tr({children}: any) { return <tr className="odd:bg-slate-900 even:bg-slate-950 hover:bg-slate-800/60">{children}</tr> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        th({children}: any) { return <th className="px-4 py-2 text-center font-semibold text-white border-b border-gray-700 whitespace-nowrap">{children}</th> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        td({children}: any) { return <td className="px-4 py-2 text-gray-200 align-middle text-center whitespace-nowrap">{children}</td> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h1({children}: any) { return <h1 className="text-2xl font-bold text-white mt-4 mb-2 pb-2 border-b border-gray-600">{children}</h1> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h2({children}: any) { return <h2 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h2> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h3({children}: any) { return <h3 className="text-lg font-semibold text-white mt-3 mb-1">{children}</h3> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p({children}: any) { return <p className="text-gray-100 leading-relaxed break-words">{children}</p> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ul({children}: any) { return <ul className="list-disc pl-6 space-y-1 text-gray-100">{children}</ul> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ol({children}: any) { return <ol className="list-decimal pl-6 space-y-1 text-gray-100">{children}</ol> },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        a({href, children}: any) { return <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 underline break-words">{children}</a> },
      }}
    >
      {text}
    </ReactMarkdown>
  )
  return parts
}

export const FormattedText: React.FC<FormattedTextProps> = memo(({ content, document = false, className = '' }) => {
  if (!content) return null

  // Memoize expensive parsing operations
  const elements = useMemo(() => parseMarkdown(content), [content])
  
  return (
    <div
      className={[
        "formatted-text",
        // Typography polish similar to OpenAI
        "prose prose-invert max-w-none",
        // Match input sizing with chat input (14px)
        "prose-sm",
        // Fine-tune code and pre blocks
        "prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg",
        "prose-code:bg-gray-800 prose-code:text-blue-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-gray-700",
        // Links and text spacing
        "prose-a:text-blue-400 hover:prose-a:text-blue-300",
        // Headings spacing and weight
        "prose-headings:text-white prose-headings:font-semibold",
        // Lists tighter spacing
        "prose-li:my-1",
        // Blockquote and hr
        "prose-hr:border-gray-700",
        className
      ].join(' ')}
    >
      {elements.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </div>
  )
})