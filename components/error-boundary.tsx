'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full p-6 bg-red-50 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <pre className="whitespace-pre-wrap text-sm text-red-700 bg-red-100 p-4 rounded mb-6 overflow-auto">
              {this.state.error?.message || 'An unknown error occurred'}
            </pre>
            <div className="flex justify-end">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="bg-white hover:bg-red-100 text-red-800 border-red-300"
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
