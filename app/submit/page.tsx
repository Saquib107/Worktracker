"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/WorkTrackerContext';
import { Department, KraCategory, TaskStatus } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';
import { format } from 'date-fns';
import TopHeader from '@/components/TopHeader';
import { Check, AlertCircle, Sparkles, Send, Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { savePendingReport } from '@/lib/db';
import { registerLocalNotifications } from '@/lib/push';

function SubmitFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get('embedded') === 'true';
  const { state, dispatch } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEntry, setSubmittedEntry] = useState<any>(null);

  const [dbKras, setDbKras] = useState<KraCategory[]>([]);

  // Form State
  const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [department, setDepartment] = useState<Department>('HR');
  const [selectedKras, setSelectedKras] = useState<string[]>([]);
  
  const [tasksText, setTasksText] = useState('');
  const [hoursSpent, setHoursSpent] = useState(8);
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('Completed');
  const [hasIssue, setHasIssue] = useState(false);
  const [issueDesc, setIssueDesc] = useState('');
  
  const [planTomorrow, setPlanTomorrow] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestSuggestions, setSuggestSuggestions] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!state.isLoading && !state.user) {
      router.push('/login');
    } else if (state.user) {
      setDepartment(state.user.department as Department);
      fetch('/api/kras').then(res => res.json()).then(data => {
        if (data.kras) {
          const kraNames = data.kras.map((k: any) => k.name);
          setDbKras(kraNames);
          if (kraNames.length > 0) setSelectedKras([kraNames[0]]);
        }
      });
      // Register local notifications for daily reminder
      registerLocalNotifications();
    }
  }, [state, router]);

  useEffect(() => {
    if (state.user && state.token) {
      setHasSubmitted(null);
      fetch(`/api/entries/me?date=${workDate}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.entries && data.entries.length > 0) {
          setHasSubmitted(true);
        } else {
          setHasSubmitted(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch entry status", err);
        setHasSubmitted(false);
      });
    }
  }, [state.user, state.token, workDate]);

  if (state.isLoading || !state.user) return null;

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handlePolish = async () => {
    if (tasksText.length < 10) return;
    setIsPolishing(true);
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ tasksText }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    setSuggestSuggestions([]);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ 
          tasks: tasksText, 
          kra: selectedKras.join(', '), 
          status: taskStatus, 
          issueContext: hasIssue ? issueDesc : null 
        }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const payload = {
      work_date: workDate,
      department,
      kra_category: selectedKras.join(', '),
      tasks_text: tasksText,
      hours_spent: hoursSpent,
      task_status: taskStatus,
      has_issue: hasIssue,
      issue_description: hasIssue ? issueDesc : null,
      plan_for_tomorrow: planTomorrow
    };

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Offline Mode
        await savePendingReport(payload);
        setSubmittedEntry({ ...payload, isOffline: true });
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSubmittedEntry(data.entry);
      } else {
        alert(data.error || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      console.error(err);
      // Fallback to offline if network fails during request
      await savePendingReport(payload);
      setSubmittedEntry({ ...payload, isOffline: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedEntry(null);
    setStep(1);
    setTasksText('');
    setHoursSpent(8);
    setTaskStatus('Completed');
    setHasIssue(false);
    setIssueDesc('');
    if (dbKras.length > 0) setSelectedKras([dbKras[0]]);
    else setSelectedKras([]);
    setPlanTomorrow('');
  };

  const generatePDF = async () => {
    const element = document.getElementById('success-receipt');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`PGEPL_Report_${submittedEntry.id.substring(0,8)}.pdf`);
  };

  if (submittedEntry) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 flex flex-col items-center justify-center">
        <div id="success-receipt" className="bg-card border border-border p-8 rounded-xl shadow-lg max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{submittedEntry.isOffline ? 'Saved Offline' : 'Report Submitted!'}</h2>
          <p className="text-muted-foreground mb-6 text-sm">{submittedEntry.isOffline ? 'Your report will automatically sync when you reconnect.' : 'Your daily work entry has been recorded.'}</p>
          
          <div className="bg-secondary/50 border border-border rounded-lg p-5 text-left text-sm text-foreground mb-8 space-y-3">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Submission ID</span>
              <span className="font-mono text-xs">{submittedEntry.id.split('-')[0].toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Time</span>
              <span className="font-medium">{submittedEntry.isOffline ? 'Pending Sync' : new Date(submittedEntry.submitted_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Manager Assigned</span>
              <span className="font-medium">System Default (Saquib)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Status</span>
              <span className="font-medium text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-md text-xs">{submittedEntry.isOffline ? 'OFFLINE' : (submittedEntry.approval_status || 'Submitted')}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center" data-html2canvas-ignore>
            <button onClick={generatePDF} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg font-medium hover:bg-border transition-colors">
              <Download size={18} /> Download PDF
            </button>
            <button onClick={handleReset} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-secondary -z-10 rounded-full transform -translate-y-1/2"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-[#1a2e4a] -z-10 rounded-full transform -translate-y-1/2 transition-all duration-300"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-card transition-colors duration-300 ${s <= step ? 'border-[#1a2e4a] text-[#1a2e4a]' : 'border-border text-muted-foreground/70'}`}>
            {s < step ? <Check size={16} /> : s}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs font-medium text-muted-foreground mt-2 px-1">
        <span>Details</span>
        <span>Work Done</span>
        <span>Status</span>
        <span>Tomorrow</span>
      </div>
    </div>
  );

  return (
    <div className={isEmbedded ? "pb-10" : "min-h-screen bg-background pb-20"}>
      {!isEmbedded && <TopHeader title="Daily Log Submission" />}

      <main className={isEmbedded ? "w-full" : "max-w-3xl mx-auto mt-8 px-4 md:px-0"}>
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
          
          {hasSubmitted === false && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Pending Submission</p>
                <p className="text-xs mt-0.5">You have not submitted a report for {format(new Date(workDate), 'MMM do, yyyy')}. Please complete it before 5:00 PM.</p>
              </div>
            </div>
          )}

          {renderStepIndicator()}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-xl font-bold text-foreground">Employee Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Employee Name</label>
                    <input type="text" disabled value={state.user.name} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Work Date</label>
                    <input type="date" value={workDate} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setWorkDate(e.target.value)} className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-[#1a2e4a] focus:ring-1 focus:ring-[#1a2e4a] outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Department</label>
                  <input type="text" disabled value={department} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-muted-foreground" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">KRA Category</label>
                  <div className="flex flex-wrap gap-2">
                    {dbKras.map(k => {
                      const isSelected = selectedKras.includes(k);
                      return (
                        <button 
                          key={k} 
                          onClick={() => {
                            if (isSelected) {
                              setSelectedKras(selectedKras.filter(x => x !== k));
                            } else {
                              setSelectedKras([...selectedKras, k]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-[#1a2e4a] border-[#1a2e4a] text-white shadow-sm' : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-secondary/50'}`}
                        >
                          {k.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-end">
                  <h2 className="text-xl font-bold text-foreground">Work Done Today</h2>
                  <button 
                    onClick={handlePolish}
                    disabled={isPolishing || tasksText.length < 10}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-[#1a2e4a] px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isPolishing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    AI Polish
                  </button>
                </div>
                
                <div>
                  <textarea 
                    value={tasksText}
                    onChange={e => setTasksText(e.target.value)}
                    placeholder="List the tasks you completed today..."
                    className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground focus:border-[#1a2e4a] focus:ring-1 focus:ring-[#1a2e4a] outline-none min-h-[150px] resize-y"
                  />
                  {tasksText.length > 0 && tasksText.length < 10 && (
                    <p className="text-xs text-red-500 mt-1">Please enter at least 10 characters.</p>
                  )}
                  {aiSuggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-[#1a2e4a] flex items-center gap-1"><Sparkles size={14}/> Select a professional variation:</p>
                      {aiSuggestions.map((sug, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setTasksText(sug); setAiSuggestions([]); }}
                          className="p-3 bg-[#1a2e4a]/5 border border-[#1a2e4a]/20 rounded-lg text-sm text-[#1a2e4a] cursor-pointer hover:bg-[#1a2e4a]/10 hover:border-[#1a2e4a]/40 transition-colors shadow-sm"
                        >
                          {sug}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-foreground">Hours Spent</label>
                    <span className="text-lg font-bold text-[#1a2e4a]">{hoursSpent}h</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="12" step="0.5" 
                    value={hoursSpent} 
                    onChange={e => setHoursSpent(parseFloat(e.target.value))}
                    className="w-full accent-[#1a2e4a] h-2 bg-secondary rounded-lg appearance-none cursor-pointer" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground/70 mt-2">
                    <span>0.5h</span>
                    <span>12h</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <h2 className="text-xl font-bold text-foreground">Status & Issues</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Task Status</label>
                  <div className="flex flex-wrap gap-3">
                    {['Completed', 'In Progress', 'Pending', 'Blocked'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setTaskStatus(s as TaskStatus)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${taskStatus === s ? 'bg-[#1a2e4a] border-[#1a2e4a] text-white shadow-md' : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-secondary/50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <label className="block text-sm font-semibold text-foreground mb-3">Did you face any issues today?</label>
                  <div className="flex gap-4 mb-4">
                    <button 
                      onClick={() => setHasIssue(true)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${hasIssue ? 'bg-red-50 border-red-200 text-red-600' : 'bg-card border-border text-muted-foreground hover:bg-secondary/50'}`}
                    >
                      Yes, I faced issues
                    </button>
                    <button 
                      onClick={() => { setHasIssue(false); setIssueDesc(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${!hasIssue ? 'bg-green-50 border-green-200 text-green-700' : 'bg-card border-border text-muted-foreground hover:bg-secondary/50'}`}
                    >
                      No issues
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {hasIssue && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <textarea 
                          value={issueDesc}
                          onChange={e => setIssueDesc(e.target.value)}
                          placeholder="Please describe the issue(s) faced..."
                          className="w-full bg-card border border-red-200 rounded-lg px-4 py-3 text-foreground focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none min-h-[100px] resize-y"
                        />
                        {hasIssue && issueDesc.length === 0 && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Issue description is required.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-end">
                  <h2 className="text-xl font-bold text-foreground">Plan For Tomorrow</h2>
                  <button 
                    onClick={handleSuggest}
                    disabled={isSuggesting}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isSuggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    AI Suggest
                  </button>
                </div>
                
                <div>
                  <textarea 
                    value={planTomorrow}
                    onChange={e => setPlanTomorrow(e.target.value)}
                    placeholder="Briefly describe your plan for tomorrow..."
                    className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground focus:border-[#1a2e4a] focus:ring-1 focus:ring-[#1a2e4a] outline-none min-h-[150px] resize-y"
                  />
                  {suggestSuggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-[#1a2e4a] flex items-center gap-1"><Sparkles size={14}/> Select a suggested plan:</p>
                      {suggestSuggestions.map((sug, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setPlanTomorrow(sug); setSuggestSuggestions([]); }}
                          className="p-3 bg-[#1a2e4a]/5 border border-[#1a2e4a]/20 rounded-lg text-sm text-[#1a2e4a] cursor-pointer hover:bg-[#1a2e4a]/10 hover:border-[#1a2e4a]/40 transition-colors shadow-sm whitespace-pre-wrap"
                        >
                          {sug}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-border/50 flex justify-between">
            {step > 1 ? (
              <button onClick={handlePrev} className="px-5 py-2.5 rounded-lg font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Back
              </button>
            ) : (<div></div>)}

            {step < 4 ? (
              <button 
                onClick={handleNext} 
                disabled={(step === 1 && selectedKras.length === 0) || (step === 2 && tasksText.length < 10) || (step === 3 && hasIssue && issueDesc.length === 0)}
                className="px-6 py-2.5 rounded-lg font-medium bg-[#1a2e4a] text-white hover:bg-[#1a2e4a]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </button>
            ) : (
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Submit Report
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>}>
      <SubmitFormContent />
    </Suspense>
  );
}
