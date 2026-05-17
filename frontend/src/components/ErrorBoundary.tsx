import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isPermissionError = this.state.error?.message.includes('insufficient permissions') || 
                               this.state.error?.message.includes('permission-denied');

      return (
        <div className="min-h-screen bg-brand-beige flex items-center justify-center p-6 text-center" dir="rtl">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-brand-gold/20 space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl serif font-semibold">אופס, משהו השתבש</h2>
            <p className="text-brand-dark/60">
              {isPermissionError 
                ? 'נראה שאין לך הרשאות מתאימות לביצוע פעולה זו. אנא ודאי שאת מחוברת לחשבון הנכון.'
                : 'חלה שגיאה לא צפויה במערכת. אנחנו כבר מטפלים בזה.'}
            </p>
            <button 
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-brand-gold text-white px-8 py-3 rounded-full font-bold mx-auto hover:bg-brand-gold/90 transition-all"
            >
              <RefreshCw size={18} />
              טען מחדש
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
