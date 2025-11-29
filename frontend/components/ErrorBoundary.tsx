'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    //console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-100 via-orange-50 to-yellow-50 p-4 relative overflow-hidden">
          {/* Decorative background blobs */}
          <div className="absolute top-10 left-20 w-48 h-48 bg-red-200 rounded-full opacity-30 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-orange-200 rounded-full opacity-30 blur-3xl"></div>
          
          <div className="bg-white p-10 rounded-3xl shadow-lg text-center max-w-md border border-red-100 relative z-10">
            <div className="inline-block p-4 bg-linear-to-br from-red-400 to-orange-400 rounded-full mb-6 shadow-md">
              <AlertCircle size={64} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">Oops!</h2>
            <p className="text-gray-700 mb-6 text-lg font-medium">Something went wrong. 😅</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-linear-to-r from-orange-400 to-orange-500 text-white px-8 py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 duration-150 text-lg"
            >
              Go Home
            </button>
          </div>

          {/* Floating decorative elements */}
          <div className="absolute top-20 right-32 w-4 h-4 bg-red-400 rounded-full opacity-60 animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
          <div className="absolute bottom-40 left-40 w-3 h-3 bg-orange-300 rounded-full opacity-70 animate-bounce" style={{animationDelay: '1s', animationDuration: '2.5s'}}></div>
        </div>
      );
    }

    return this.props.children;
  }
}