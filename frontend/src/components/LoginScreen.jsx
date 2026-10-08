import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { 
  Shield, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please check and try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please sign up first.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account already exists with this email. Please sign in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign in popup was closed. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] bg-gradient-to-b from-[#07090e] via-[#0b0f19] to-[#07090e] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-dark-800/90 border border-dark-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        {/* App Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/20 mb-3">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
            <span>AlgoHub Terminal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Delta Exchange India 24/7 Automated Algorithmic Engine
          </p>

          <div className="inline-flex items-center space-x-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <Shield className="w-3 h-3" />
            <span>Secured with Firebase Authentication</span>
          </div>
        </div>

        {/* Tab Toggle (Sign In vs Sign Up) */}
        <div className="grid grid-cols-2 p-1 bg-dark-900 border border-dark-700 rounded-xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              !isSignUp 
                ? 'bg-emerald-500 text-black shadow-sm font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              isSignUp 
                ? 'bg-emerald-500 text-black shadow-sm font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google One-Click Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-dark-900 hover:bg-dark-700/80 border border-dark-700 rounded-xl text-white text-xs font-semibold flex items-center justify-center space-x-2.5 transition-colors disabled:opacity-50 mb-4 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-dark-700 w-full" />
          <span className="bg-dark-800 px-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            OR
          </span>
          <div className="border-t border-dark-700 w-full" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter your password'}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create AlgoHub Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Enter Trading Terminal</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice Footer */}
        <div className="mt-6 pt-4 border-t border-dark-700/60 text-center text-[10px] text-slate-500">
          <p>Protected by end-to-end tokenized authentication.</p>
          <p className="mt-0.5">Only authorized traders can monitor and execute strategies.</p>
        </div>
      </div>
    </div>
  );
}
