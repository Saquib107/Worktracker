"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/WorkTrackerContext';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = [
  'HR', 'HR & IR', 'Accounts', 'Accounts Audit', 'Accounts Compliance',
  'Purchase', 'Purchase & Commercial', 'PRM', 'Intern - S/w'
];

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [dbDepts, setDbDepts] = useState<string[]>([]);
  // Register fields
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { state, dispatch } = useAuth();

  useEffect(() => {
    fetch('/api/departments').then(res => res.json()).then(data => {
      if (data.departments) {
        const names = data.departments.map((d: any) => d.name);
        setDbDepts(names);
        if (names.length > 0) setDepartment(names[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!state.isLoading && state.user) {
      router.push(state.user.role === 'manager' ? '/dashboard' : '/submit');
    }
  }, [state, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password }
        : { name, email, password, department };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save to localStorage
      localStorage.setItem('pgepl_token', data.token);
      localStorage.setItem('pgepl_user', JSON.stringify(data.user));

      dispatch({ type: 'LOGIN', payload: { user: data.user, token: data.token } });
      
      router.push(data.user.role === 'manager' ? '/dashboard' : '/submit');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (state.isLoading) return null; // Avoid flicker

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-xl p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#1a2e4a] rounded-lg flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-2xl font-black tracking-tighter">PG</span>
          </div>
          <div className="flex flex-col items-center gap-1 mb-2">
            <h1 className="text-3xl font-black tracking-tight text-[#1a2e4a] font-display uppercase">PGEPL</h1>
            <h2 className="text-lg font-semibold tracking-wide text-slate-700">Work Tracker</h2>
          </div>
          <div className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest border border-slate-200 mt-2">
            Version 1.0
          </div>
          <div className="w-12 h-1 bg-[#1a2e4a] mt-6 rounded-full"></div>
        </div>

        {/* Toggle Login/Register */}
        <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isLogin ? 'bg-white text-[#1a2e4a] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isLogin ? 'bg-white text-[#1a2e4a] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center mb-4">
                  {error}
                </div>
              </motion.div>
            )}

            {!isLogin && (
              <motion.div key="name-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                <label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">
                  Full Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-[#1a2e4a] focus:outline-none transition-colors focus:ring-1 focus:ring-[#1a2e4a]"
                  placeholder="e.g. John Doe"
                  required={!isLogin}
                />
              </motion.div>
            )}

            {!isLogin && (
              <motion.div key="dept-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                <label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">
                  Department
                </label>
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-[#1a2e4a] focus:outline-none transition-colors focus:ring-1 focus:ring-[#1a2e4a]"
                  required={!isLogin}
                >
                  {dbDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </motion.div>
            )}

            <motion.div key="email-field" layout className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">
                Email Address
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-[#1a2e4a] focus:outline-none transition-colors focus:ring-1 focus:ring-[#1a2e4a]"
                placeholder="e.g. aditi@pgepl.com"
                required
              />
            </motion.div>

            <motion.div key="password-field" layout className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-500 font-bold ml-1">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-[#1a2e4a] focus:outline-none transition-colors focus:ring-1 focus:ring-[#1a2e4a]"
                placeholder="••••••••"
                required
              />
            </motion.div>
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a2e4a] hover:bg-[#1a2e4a]/90 text-white font-bold py-3.5 rounded-lg transition-colors mt-6 text-sm disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
