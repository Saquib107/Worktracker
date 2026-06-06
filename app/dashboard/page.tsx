"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/WorkTrackerContext';
import { useRouter } from 'next/navigation';
import TopHeader from '@/components/TopHeader';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Users, CheckCircle, Clock, Search, Filter, AlertTriangle, FileText, 
  Sparkles, ShieldCheck, Activity, Plus, Check, X, Download, Loader2,
  ChevronLeft, ChevronRight, FileDown, Calendar, TrendingUp, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays, isAfter, startOfDay } from 'date-fns';

export default function DashboardPage() {
  const { state } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [entries, setEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [kras, setKras] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // AI Summary
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Employee Search
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('All');

  // Reports Table States
  const [reportSearch, setReportSearch] = useState('');
  const [reportDeptFilter, setReportDeptFilter] = useState('All');
  const [reportStatusFilter, setReportStatusFilter] = useState('All');
  const [reportRangeFilter, setReportRangeFilter] = useState('All Reports');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Admin New Inputs
  const [newDept, setNewDept] = useState('');
  const [newKra, setNewKra] = useState('');

  useEffect(() => {
    if (!state.isLoading && (!state.user || state.user.role !== 'manager')) {
      router.push('/login');
    } else if (state.user?.role === 'manager') {
      fetchData();
    }
  }, [state, router]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${state.token}` };
      const [entriesRes, dbRes, krasRes, deptsRes, auditRes] = await Promise.all([
        fetch('/api/entries', { headers }),
        fetch('/api/dashboard', { headers }),
        fetch('/api/kras', { headers }),
        fetch('/api/departments', { headers }),
        fetch('/api/audit', { headers })
      ]);
      
      if (entriesRes.ok) setEntries((await entriesRes.json()).entries || []);
      if (dbRes.ok) setEmployees((await dbRes.json()).users || []);
      if (krasRes.ok) setKras((await krasRes.json()).kras || []);
      if (deptsRes.ok) setDepartments((await deptsRes.json()).departments || []);
      if (auditRes.ok) setAuditLogs((await auditRes.json()).logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ entriesData: entries.filter(e => e.work_date === format(new Date(), 'yyyy-MM-dd')) })
      });
      const data = await res.json();
      setAiSummary(data.summary || 'Failed to generate summary.');
    } catch (e) {
      setAiSummary('Error connecting to AI service.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApproval = async (id: string, status: string) => {
    try {
      await fetch(`/api/entries/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ status })
      });
      fetchData(); 
    } catch (e) {
      console.error(e);
    }
  };

  // --- Calculations for Widgets ---
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const todaysEntries = entries.filter(e => e.work_date === todayDateStr);
  const pendingApprovals = entries.filter(e => e.approval_status === 'Submitted' || e.approval_status === 'Under Review');
  const issuesToday = todaysEntries.filter(e => e.has_issue);
  const completionRate = Math.round((todaysEntries.length / (employees.length || 1)) * 100);

  // --- Reports Data Prep ---
  let filteredReports = entries.filter(e => {
    // Range Filter
    const entryDate = new Date(e.work_date);
    if (reportRangeFilter === "Today's Reports" && e.work_date !== todayDateStr) return false;
    if (reportRangeFilter === "Weekly Reports" && !isAfter(entryDate, subDays(new Date(), 7))) return false;
    if (reportRangeFilter === "Monthly Reports" && !isAfter(entryDate, subDays(new Date(), 30))) return false;

    // Dept Filter
    if (reportDeptFilter !== 'All' && e.department !== reportDeptFilter) return false;
    // Search
    if (reportSearch && !e.pgepl_users?.name?.toLowerCase().includes(reportSearch.toLowerCase())) return false;
    
    return true;
  });

  const totalPages = Math.ceil(filteredReports.length / rowsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // --- Analytics Data Prep ---
  // Total Hours This Week
  const weekAgo = subDays(new Date(), 7);
  const entriesThisWeek = entries.filter(e => isAfter(new Date(e.work_date), weekAgo));
  const totalHoursThisWeek = entriesThisWeek.reduce((sum, e) => sum + Number(e.hours_spent), 0);

  // Top Performing Employees (by hours logged all time)
  const empHours: Record<string, number> = {};
  entries.forEach(e => {
    const name = e.pgepl_users?.name || 'Unknown';
    empHours[name] = (empHours[name] || 0) + Number(e.hours_spent);
  });
  const topEmployees = Object.entries(empHours)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a,b) => b.hours - a.hours)
    .slice(0, 5);

  // Dept Productivity
  const deptProd: Record<string, number> = {};
  entries.forEach(e => {
    deptProd[e.department] = (deptProd[e.department] || 0) + Number(e.hours_spent);
  });
  const deptProdData = Object.entries(deptProd).map(([name, hours]) => ({ name, hours })).sort((a,b)=>b.hours - a.hours);

  // Work Trends (Last 14 days)
  const trendsData = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dStr = format(d, 'yyyy-MM-dd');
    const dayEntries = entries.filter(e => e.work_date === dStr);
    const dayHours = dayEntries.reduce((sum, e) => sum + Number(e.hours_spent), 0);
    trendsData.push({ date: format(d, 'MMM dd'), hours: dayHours });
  }

  // --- Exports ---
  const handleExportCSV = () => {
    const headers = ['Date', 'Employee', 'Department', 'KRA', 'Hours', 'Status', 'Approval'];
    const csvContent = [
      headers.join(','),
      ...filteredReports.map(e => `"${e.work_date}","${e.pgepl_users?.name}","${e.department}","${e.kra_category}","${e.hours_spent}","${e.task_status}","${e.approval_status}"`)
    ].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
    link.download = `PGEPL_Export_${reportRangeFilter.replace(' ', '_')}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`PGEPL Report: ${reportRangeFilter}`, 14, 15);
    autoTable(doc, {
      startY: 20,
      headStyles: { fillColor: [26, 46, 74] }, // Navy blue
      head: [['Date', 'Employee', 'Dept', 'KRA', 'Hrs', 'Appvl']],
      body: filteredReports.map(e => [
        e.work_date, 
        e.pgepl_users?.name || 'N/A', 
        e.department, 
        e.kra_category.replace(/_/g, ' '), 
        e.hours_spent, 
        e.approval_status
      ]),
    });
    doc.save(`PGEPL_Report_${reportRangeFilter.replace(' ', '_')}.pdf`);
  };

  if (loading || !state.user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopHeader title="Enterprise Terminal" />

      {/* TABS */}
      <div className="bg-card border-b border-border sticky top-[73px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex overflow-x-auto custom-scrollbar">
          {['Overview', 'Reports', 'Analytics', 'Employees', 'Audit Logs', 'Admin'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              className={`whitespace-nowrap px-6 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto mt-8 px-4 md:px-6">
        <AnimatePresence mode="wait">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <motion.div key="overview" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
              
              {/* Top Widgets */}
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Completion Rate</p>
                    <Activity size={18} className="text-blue-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{completionRate}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">{todaysEntries.length}/{employees.length} employees submitted today</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
                    <Clock size={18} className="text-yellow-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{pendingApprovals.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Require manager review</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Issues Flagged</p>
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{issuesToday.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Blockers reported today</p>
                </motion.div>
              </motion.div>

              {/* AI Panel & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* AI Manager Summary */}
                <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="border-b border-border bg-secondary/30 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-foreground flex items-center gap-2"><Sparkles className="text-purple-500" size={18} /> Team AI Summary</h3>
                    <button 
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingAi}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingAi ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
                    </button>
                  </div>
                  <div className="p-6 flex-1 bg-card">
                    {aiSummary ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                        {aiSummary}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                        <Sparkles size={32} className="text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm max-w-xs">Generate an AI executive summary of your team's performance today.</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Recent Activity Feed */}
                <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="border-b border-border bg-secondary/30 px-6 py-4">
                    <h3 className="font-bold text-foreground">Recent Submissions</h3>
                  </div>
                  <div className="p-4 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                    <AnimatePresence>
                      {entries.slice(0, 15).map((e, idx) => (
                        <motion.div key={e.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="flex gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary flex-shrink-0">
                            {e.pgepl_users?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{e.pgepl_users?.name}</p>
                            <p className="text-xs text-muted-foreground">Submitted {e.kra_category.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-medium text-primary mt-1">{new Date(e.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>}
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'Reports' && (
            <motion.div key="reports" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[750px]">
              
              {/* Range Filters & Exports */}
              <div className="p-4 md:px-6 md:py-5 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-card">
                <div className="flex bg-secondary rounded-lg p-1 w-full md:w-auto">
                  {['All Reports', 'Today\'s Reports', 'Weekly Reports', 'Monthly Reports'].map(r => (
                    <button 
                      key={r}
                      onClick={() => { setReportRangeFilter(r); setCurrentPage(1); }}
                      className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${reportRangeFilter === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {r.split(' ')[0]}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={handleExportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-2 rounded-lg font-medium text-xs hover:bg-border transition-colors">
                    <Download size={14} /> CSV
                  </button>
                  <button onClick={handleExportPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-xs hover:bg-primary/90 transition-colors">
                    <FileDown size={14} /> PDF
                  </button>
                </div>
              </div>

              <div className="p-4 md:px-6 md:py-4 border-b border-border flex flex-col md:flex-row justify-between gap-4 bg-secondary/20">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by employee..." 
                    value={reportSearch}
                    onChange={e => { setReportSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative w-40">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <select 
                      value={reportDeptFilter}
                      onChange={e => { setReportDeptFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                    >
                      <option value="All">All Depts</option>
                      {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                      <th className="px-6 py-4 font-bold">Employee</th>
                      <th className="px-6 py-4 font-bold">Date</th>
                      <th className="px-6 py-4 font-bold">Department</th>
                      <th className="px-6 py-4 font-bold">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-sm">
                    <AnimatePresence>
                      {paginatedReports.map((entry, i) => (
                        <motion.tr 
                          key={entry.id} 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-foreground flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">
                              {entry.pgepl_users?.name?.charAt(0) || '?'}
                            </div>
                            {entry.pgepl_users?.name}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{entry.work_date}</td>
                          <td className="px-6 py-4 text-muted-foreground">{entry.department}</td>
                          <td className="px-6 py-4 font-mono">{entry.hours_spent}h</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {paginatedReports.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No reports found matching filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border bg-secondary/10 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredReports.length)} of {filteredReports.length}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md border border-border text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md border border-border text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'Analytics' && (
            <motion.div key="analytics" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Analytics Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Top KPI & Trends */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-primary to-[#1a2e4a] text-primary-foreground border border-border p-6 rounded-xl shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider">Total Hours This Week</p>
                        <Calendar size={20} className="text-primary-foreground/50" />
                      </div>
                      <h3 className="text-4xl font-display font-bold">{totalHoursThisWeek}h</h3>
                      <p className="text-xs text-primary-foreground/70 mt-2">Logged in the last 7 days</p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Work Trends (14 Days)</p>
                        <TrendingUp size={18} className="text-primary" />
                      </div>
                      <div className="h-[100px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendsData}>
                            <defs>
                              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Tooltip cursor={false} contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', fontSize: '12px', padding: '4px 8px'}} />
                            <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  </div>

                  {/* Dept Productivity Chart */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm p-6">
                    <h3 className="font-bold text-foreground mb-6">Department Productivity (All Time Hours)</h3>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptProdData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{fill: 'var(--muted-foreground)', fontSize: 12}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill: 'var(--muted-foreground)', fontSize: 12}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'var(--secondary)'}} contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: '8px'}} />
                          <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

                {/* Top Employees Leaderboard */}
                <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                  <div className="border-b border-border bg-secondary/30 px-6 py-4 flex items-center gap-2">
                    <Award size={18} className="text-yellow-500" />
                    <h3 className="font-bold text-foreground">Top Performing Employees</h3>
                  </div>
                  <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                    {topEmployees.map((emp, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-secondary/20 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : idx === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-background text-muted-foreground'}`}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{emp.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-primary">{emp.hours}h</p>
                        </div>
                      </div>
                    ))}
                    {topEmployees.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data available yet.</p>}
                  </div>
                </motion.div>
                
              </div>
            </motion.div>
          )}

          {/* EMPLOYEES TAB */}
          {activeTab === 'Employees' && (
            <motion.div key="employees" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search employees..." 
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="relative w-full md:w-64">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <select 
                    value={empDeptFilter}
                    onChange={e => setEmpDeptFilter(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees
                  .filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()))
                  .filter(e => empDeptFilter === 'All' || e.department === empDeptFilter)
                  .map(emp => (
                  <motion.div variants={itemVariants} key={emp.id} className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-primary text-xl">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{emp.department}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'Audit Logs' && (
            <motion.div key="audit" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-[750px] flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                      <th className="px-6 py-4 font-bold">Time</th>
                      <th className="px-6 py-4 font-bold">User</th>
                      <th className="px-6 py-4 font-bold">Action</th>
                      <th className="px-6 py-4 font-bold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-sm">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">{log.pgepl_users?.name || 'System'}</td>
                        <td className="px-6 py-4 text-primary font-medium">{log.action}</td>
                        <td className="px-6 py-4 text-muted-foreground">{log.details}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No audit logs available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ADMIN TAB */}
          {activeTab === 'Admin' && (
            <motion.div key="admin" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2"><ShieldCheck size={20} className="text-primary"/> Manage Departments</h2>
                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    placeholder="New Department Name" 
                    className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                  />
                  <button 
                    onClick={async () => {
                      if(!newDept) return;
                      await fetch('/api/departments', { method: 'POST', body: JSON.stringify({name: newDept})});
                      setNewDept(''); fetchData();
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={16}/> Add
                  </button>
                </div>
                <ul className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <AnimatePresence>
                    {departments.map(d => (
                      <motion.li key={d.id} initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="flex justify-between items-center bg-secondary/50 px-4 py-3 rounded-lg border border-border/50">
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2"><ShieldCheck size={20} className="text-primary"/> Manage KRAs</h2>
                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    value={newKra}
                    onChange={e => setNewKra(e.target.value)}
                    placeholder="New KRA Name" 
                    className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                  />
                  <button 
                    onClick={async () => {
                      if(!newKra) return;
                      await fetch('/api/kras', { method: 'POST', body: JSON.stringify({name: newKra})});
                      setNewKra(''); fetchData();
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={16}/> Add
                  </button>
                </div>
                <ul className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence>
                    {kras.map(k => (
                      <motion.li key={k.id} initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="flex justify-between items-center bg-secondary/50 px-4 py-3 rounded-lg border border-border/50">
                        <span className="text-sm font-medium text-foreground">{k.name}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
