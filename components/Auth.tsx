'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthProps {
  onLogin: (user: { name: string; email: string }) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: formData.name || 'Julian Vance',
        email: formData.email || 'julian@vance.corp'
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Architectural Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute -top-24 -left-24 w-96 h-96 border border-on-surface rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] border-l border-t border-on-surface"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface-container-lowest p-10 rounded-2xl shadow-[0px_40px_80px_rgba(0,0,0,0.05)] relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-on-primary mb-6 shadow-lg shadow-primary/20">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-on-surface uppercase">Precision Editorial</h1>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] mt-2">Secure Access Protocol</p>
        </div>

        <div className="flex bg-surface-container-low p-1 rounded-lg mb-8">
          <button 
            onClick={() => setIsLogin(true)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
              isLogin ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
              !isLogin ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  type="text"
                  required={!isLogin}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 precise-transition"
                  placeholder="Julian Vance"
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input 
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 precise-transition"
                placeholder="julian@vance.corp"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input 
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 precise-transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:brightness-110 precise-transition flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {isLogin ? 'Authorize Access' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-surface-container-low text-center">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-primary font-black hover:underline"
            >
              {isLogin ? 'Register Now' : 'Login Now'}
            </button>
          </p>
        </div>
      </motion.div>

      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 w-full text-center">
        <p className="text-[9px] text-on-surface-variant uppercase tracking-[0.4em] font-medium">
          Encrypted Node: US-EAST-1 • Precision Protocol v2.1
        </p>
      </div>
    </div>
  );
}
