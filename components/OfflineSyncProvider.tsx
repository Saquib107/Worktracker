"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getPendingReports, deletePendingReport } from '@/lib/db';
import { useAuth } from '@/context/WorkTrackerContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineContext = createContext({ isOnline: true });

export const useOffline = () => useContext(OfflineContext);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { state } = useAuth();

  useEffect(() => {
    // Initial check
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingReports();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.token]);

  const syncPendingReports = async () => {
    if (!state.token) return;
    
    try {
      const pending = await getPendingReports();
      if (!pending || pending.length === 0) return;

      setIsSyncing(true);

      for (const report of pending) {
        try {
          const res = await fetch('/api/entries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
              work_date: report.date,
              department: report.department,
              kra_category: report.kra,
              tasks_text: report.tasks,
              hours_spent: report.hours,
              task_status: report.task_status,
              has_issue: report.has_issue,
              issue_description: report.issue_desc,
              plan_for_tomorrow: report.plan_tomorrow
            })
          });

          if (res.ok) {
            await deletePendingReport(report.id);
          }
        } catch (err) {
          console.error("Failed to sync report", report.id, err);
        }
      }
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline }}>
      {children}
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-medium"
          >
            <WifiOff size={18} className="text-red-400" />
            <span>Offline Mode - Changes will sync when reconnected</span>
          </motion.div>
        )}
        {isSyncing && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-medium"
          >
            <RefreshCw size={18} className="animate-spin" />
            <span>Syncing pending reports...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </OfflineContext.Provider>
  );
}
