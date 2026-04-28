'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

/**
 * Editorial error boundary. Catches render-time crashes anywhere inside
 * the wallet so a single broken component doesn't blank the page.
 * Doesn't catch async errors (those go through the normal toast path).
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Solux ErrorBoundary caught:', error);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--red-bg)] border border-[var(--red)]/30">
            <AlertTriangle className="w-6 h-6 text-[var(--red)]" />
          </div>
          <div className="text-[12px] font-medium text-[var(--tx-m)] mb-2">Something broke</div>
          <h1 className="font-serif text-3xl text-[var(--tx)] mb-3">
            Wallet hit an error
          </h1>
          <p className="text-sm text-[var(--tx-m)] leading-relaxed mb-6">
            Your keys are still safe — they live in browser memory, not in the broken component. Try reloading or returning to the dashboard.
          </p>

          <details className="text-left mb-6 rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] p-3">
            <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)] hover:text-[var(--tx-m)]">
              Technical detail
            </summary>
            <pre className="mt-2 text-[10px] font-mono break-all whitespace-pre-wrap text-[var(--tx-m)] max-h-32 overflow-y-auto">
              {this.state.error.message}
              {this.state.error.stack ? '\n\n' + this.state.error.stack.split('\n').slice(0, 4).join('\n') : ''}
            </pre>
          </details>

          <div className="flex flex-col gap-2">
            <button
              onClick={this.reload}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload wallet
            </button>
            <button
              onClick={this.reset}
              className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
