"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/WorkTrackerContext';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bell, Moon, Sun, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { Notification } from '@/types';

export default function TopHeader({ title }: { title: string }) {
  const { state, dispatch } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setMounted(true);
    if (state.user) {
      fetchNotifications();
    }
  }, [state.user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}` 
        },
        body: JSON.stringify({ id })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!mounted || !state.user) return null;

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center justify-center">
          <img src="/pgepl-logo.png" alt="PGEPL Logo" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-primary font-display uppercase hidden md:block">PGEPL</h1>
            <span className="text-muted-foreground hidden md:block">|</span>
            <span className="text-foreground font-semibold text-md">{title === 'Enterprise Terminal' ? 'Work Tracker' : title}</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest hidden md:block">Version 1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card"></span>
            )}
          </button>
          
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col z-50">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-secondary/50">
                <h3 className="font-bold text-foreground">Notifications</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{unreadCount} new</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`p-4 border-b border-border/50 text-sm cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/50'}`}
                    >
                      <p className={`text-foreground ${!n.is_read ? 'font-medium' : ''}`}>{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button 
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
            className="flex items-center gap-2 hover:bg-secondary p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-border"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {state.user.name.charAt(0)}
            </div>
            <span className="text-sm font-bold text-foreground hidden md:block">{state.user.name}</span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-4 border-b border-border bg-secondary/30">
                <p className="font-bold text-foreground">{state.user.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{state.user.department}</p>
              </div>
              <div className="p-2 space-y-1">
                <button onClick={() => { dispatch({type:'LOGOUT'}); router.push('/login'); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
