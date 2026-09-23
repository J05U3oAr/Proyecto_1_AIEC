import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';

import { CodeBlock } from '@/components/markdown/CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

interface CodeElementProps {
  children?: ReactNode;
  className?: string;
}

function extractText(content: ReactNode): string {
  return Children.toArray(content)
    .map(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }

      if (isValidElement<CodeElementProps>(child)) {
        return extractText(child.props.children);
      }

      return '';
    })
    .join('');
}

const markdownComponents: Components = {
  a: ({ children, node: _node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-agi-primary underline decoration-agi-primary/40 underline-offset-2 hover:decoration-agi-primary"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-agi-accent bg-slate-50 px-4 py-2 text-slate-600">
      {children}
    </blockquote>
  ),
  code: ({ children, className, node: _node, ...props }) => (
    <code
      {...props}
      className={`${className ?? ''} rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800`}
    >
      {children}
    </code>
  ),
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold">{children}</h3>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  pre: ({ children }) => {
    const codeElement = Children.toArray(children)[0];

    if (!isValidElement<CodeElementProps>(codeElement)) {
      return <pre className="overflow-x-auto">{children}</pre>;
    }

    const code = extractText(codeElement.props.children).replace(/\n$/, '');
    const language = codeElement.props.className?.match(/language-([\w-]+)/)?.[1];

    return (
      <CodeBlock code={code} language={language}>
        {codeElement}
      </CodeBlock>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
  th: ({ children }) => (
    <th className="bg-slate-100 px-3 py-2 font-semibold text-slate-800">{children}</th>
  ),
  thead: ({ children }) => <thead className="border-b border-slate-200">{children}</thead>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="break-words text-sm leading-relaxed text-slate-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
