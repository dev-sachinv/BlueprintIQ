import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import SignIn from './components/SignIn';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-xs mt-3 select-none">Checking authentication status...</p>
      </div>
    );
  }

  if (!session) {
    return <SignIn />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
