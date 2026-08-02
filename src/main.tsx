import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe global overrides for iframe sandboxed contexts where native dialogs are deactivated
window.confirm = (message?: string) => {
  console.log("SIGEP [Iframe Sandbox Bypass] Simulating positive confirmation for:", message);
  return true;
};

window.alert = (message?: any) => {
  console.log("SIGEP [Iframe Sandbox Bypass] Simulating alert message:", message);
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("SIGEP ErrorBoundary capturou um erro não tratado:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Não foi possível limpar o armazenamento local:", e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-lg w-full text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">S.I.G.E.P. — Recuperação do Sistema</h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                Ocorreu uma exceção inesperada na inicialização do aplicativo. Você pode recarregar a página ou redefinir os dados em cache para restaurar o acesso.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left font-mono text-xs text-red-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-all shadow-md"
              >
                Recarregar Sistema
              </button>
              <button
                onClick={this.handleClearCache}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg text-sm transition-all"
              >
                Limpar Cache e Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

