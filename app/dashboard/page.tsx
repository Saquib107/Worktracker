"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/WorkTrackerContext';
import { useRouter } from 'next/navigation';
import TopHeader from '@/components/TopHeader';
import { 
  RefreshCw, LayoutDashboard, FileText, Settings, LogOut, Check, X, ShieldCheck, Download, Users, Plus, Trash2, Calendar, Clock, MapPin, Search, Filter, FileDown, MoreHorizontal, AlertCircle,
  Loader2, Bell, CheckCircle, Activity, Sparkles, ChevronLeft, ChevronRight, TrendingUp, Award, Edit2, Save, Send
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { registerLocalNotifications } from '@/lib/push';

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
import { motion, AnimatePresence, Variants } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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

  // Analytics States
  const [analyticsDate, setAnalyticsDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Admin New Inputs
  const [newDept, setNewDept] = useState('');
  const [newKra, setNewKra] = useState('');
  
  // New Employee Inputs
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [isCreatingEmp, setIsCreatingEmp] = useState(false);
  const [empWizardStep, setEmpWizardStep] = useState(0);

  // Admin Edit States
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editingKraId, setEditingKraId] = useState<string | null>(null);
  const [editKraName, setEditKraName] = useState('');

  useEffect(() => {
    if (!state.isLoading && !state.user) {
      router.push('/login');
    } else if (state.user) {
      if (state.user.role !== 'manager') {
        router.push('/submit');
      } else {
        fetchData();
        // Request permissions for daily 5:00 PM local notification
        registerLocalNotifications();
      }
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

  const handleCreateEmployee = async () => {
    if (!newEmpName || !newEmpEmail || !newEmpPassword || !newEmpDept) return alert("All fields are required");
    setIsCreatingEmp(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
          name: newEmpName,
          email: newEmpEmail,
          password: newEmpPassword,
          department: newEmpDept
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setEmpWizardStep(3);
      fetchData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsCreatingEmp(false);
    }
  };

  // Removed handleApproval function
  // --- Calculations for Widgets ---
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const todaysEntries = entries.filter(e => e.work_date === todayDateStr);
  const issuesToday = todaysEntries.filter(e => e.has_issue);
  const completionRate = Math.round((todaysEntries.length / (employees.length || 1)) * 100);

  // --- Highlights Calculations ---
  let topDeptRate = { name: 'None', rate: 0 };
  let topDeptHours = { name: 'None', avg: 0 };
  const pendingCountHighlights = Math.max(0, employees.length - todaysEntries.length);
  const pendingEmployeesList = employees.filter(emp => !todaysEntries.some(entry => entry.user_id === emp.id));
  
  const deptEmps: Record<string, number> = {};
  employees.forEach(e => {
    deptEmps[e.department] = (deptEmps[e.department] || 0) + 1;
  });
  
  const deptTodaysEntries: Record<string, any[]> = {};
  todaysEntries.forEach(e => {
    if (!deptTodaysEntries[e.department]) deptTodaysEntries[e.department] = [];
    deptTodaysEntries[e.department].push(e);
  });
  
  Object.keys(deptEmps).forEach(dept => {
    const total = deptEmps[dept];
    const submitted = deptTodaysEntries[dept]?.length || 0;
    const rate = Math.round((submitted / total) * 100);
    if (rate > topDeptRate.rate) {
      topDeptRate = { name: dept, rate };
    }
    
    if (submitted > 0) {
      const hours = deptTodaysEntries[dept].reduce((sum, e) => sum + Number(e.hours_spent), 0);
      const avg = hours / submitted;
      if (avg > topDeptHours.avg) {
        topDeptHours = { name: dept, avg };
      }
    }
  });

  // --- Reports Data Prep ---
  let filteredReports = entries.filter(e => {
    // Range Filter
    const entryDate = new Date(e.work_date);
    if (reportRangeFilter === "Today's Reports" && e.work_date !== todayDateStr) return false;
    if (reportRangeFilter === "Today's Reports" && e.work_date !== todayDateStr) return false;
    if (reportRangeFilter === "Weekly Reports" && !isAfter(entryDate, subDays(new Date(), 7))) return false;
    if (reportRangeFilter === "This Month" && !isAfter(entryDate, subDays(new Date(), 30))) return false;

    // Dept Filter
    if (reportDeptFilter !== 'All' && e.department !== reportDeptFilter) return false;
    // Search
    if (reportSearch && !e.pgepl_users?.name?.toLowerCase().includes(reportSearch.toLowerCase())) return false;
    
    return true;
  });

  const totalPages = Math.ceil(filteredReports.length / rowsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // --- Analytics Data Prep ---
  // Total Hours on Selected Date
  const entriesOnSelectedDate = entries.filter(e => e.work_date === analyticsDate);
  const totalHoursOnDate = entriesOnSelectedDate.reduce((sum, e) => sum + Number(e.hours_spent), 0);

  // Top Performing Employees (by hours logged all time)
  const empHours: Record<string, number> = {};
  entries.forEach(e => {
    const name = e.pgepl_users?.name || 'Unknown';
    empHours[name] = (empHours[name] || 0) + Number(e.hours_spent);
  });
  const topEmployees = Object.entries(empHours)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a,b) => b.hours - a.hours);
  const maxEmployeeHours = topEmployees.length > 0 ? topEmployees[0].hours : 1;
  const todaysAuditLogs = auditLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString());

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

  // Submission Status Data
  const totalEmps = employees.length || 1;
  const completedCount = todaysEntries.length;
  // Late = submitted after 5PM local time for the work_date
  const lateCount = todaysEntries.filter(e => new Date(e.submitted_at).getHours() >= 17).length;
  const onTimeCount = completedCount - lateCount;
  const pendingCount = Math.max(0, totalEmps - completedCount);
  
  const submissionData = [
    { name: 'Completed', value: onTimeCount, color: '#10b981' }, // green
    { name: 'Late', value: lateCount, color: '#f59e0b' }, // yellow
    { name: 'Pending', value: pendingCount, color: '#ef4444' } // red
  ].filter(d => d.value > 0);


  // --- Exports ---
          const downloadFile = (dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Fallback for mobile HTTP where a.click() might be silently blocked
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setTimeout(() => {
        window.location.href = dataUrl;
      }, 500);
    }
  };

  const handleExportExcel = async () => {
    try {
      const validEntries = entries.filter(e => e);
      const ws = XLSX.utils.json_to_sheet(validEntries.map(e => ({
        Date: e.work_date || '',
        Employee: e.pgepl_users?.name || 'N/A',
        Department: e.department || '',
        KRA: String(e.kra_category || '').replace(/_/g, ' '),
        'Tasks Done': String(e.tasks_text || ''),
        Hours: Number(e.hours_spent || 0),
        Status: String(e.task_status || ''),
        Issues: e.has_issue ? 'Yes' : 'No',
        'Issue Description': String(e.issue_description || ''),
        'Plan For Tomorrow': String(e.plan_for_tomorrow || '')
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reports");
      
      const fileName = `PGEPL_Export_${String(reportRangeFilter || 'All').replace(/ /g, '_')}.xlsx`;

      if (navigator.share && navigator.canShare) {
        try {
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const file = new File([blob], fileName, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
            return;
          }
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') console.error('Share failed', shareError);
        }
      }

      // Fallback: Base64 Data URL (Works on HTTP mobile connections where Blob/ObjectURL fails)
      const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const dataUrl = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + base64;
      downloadFile(dataUrl, fileName);

    } catch (error: any) {
      console.error('Excel Export Error:', error);
      alert('Failed to export Excel: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportCSV = async () => {
    try {
      const validEntries = entries.filter(e => e);
      const headers = ['Date', 'Employee', 'Department', 'KRA', 'Hours', 'Status'];
      const csvContent = [
        headers.join(','),
        ...validEntries.map(e => `"${e.work_date || ''}","${e.pgepl_users?.name || 'N/A'}","${e.department || ''}","${String(e.kra_category || '').replace(/_/g, ' ')}","${e.hours_spent || 0}","${e.task_status || ''}"`)
      ].join('\n');
      
      const fileName = `PGEPL_Export_${String(reportRangeFilter || 'All').replace(/ /g, '_')}.csv`;

      if (navigator.share && navigator.canShare) {
        try {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const file = new File([blob], fileName, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
            return;
          }
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') console.error('Share failed', shareError);
        }
      }

      const base64 = btoa(unescape(encodeURIComponent(csvContent)));
      const dataUrl = "data:text/csv;base64," + base64;
      downloadFile(dataUrl, fileName);

    } catch (error: any) {
      console.error('CSV Export Error:', error);
      alert('Failed to export CSV: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportPDF = async () => {
    try {
      const validEntries = entries.filter(e => e);
      const doc = new jsPDF();
      doc.text(`PGEPL Report: ${reportRangeFilter || 'All'}`, 14, 15);
      autoTable(doc, {
        startY: 20,
        headStyles: { fillColor: [26, 46, 74] },
        head: [['Date', 'Employee', 'Dept', 'KRA', 'Tasks', 'Hrs', 'Status']],
        body: validEntries.map(e => [
          e.work_date || '', 
          e.pgepl_users?.name || 'N/A', 
          e.department || '', 
          String(e.kra_category || '').replace(/_/g, ' '), 
          String(e.tasks_text || '').substring(0, 100) + (String(e.tasks_text || '').length > 100 ? '...' : ''),
          String(e.hours_spent || 0),
          String(e.task_status || '')
        ]),
      });
      
      const fileName = `PGEPL_Report_${String(reportRangeFilter || 'All').replace(/ /g, '_')}.pdf`;

      if (navigator.share && navigator.canShare) {
        try {
          const blob = doc.output('blob');
          const file = new File([blob], fileName, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
            return;
          }
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') console.error('Share failed', shareError);
        }
      }

      const dataUrl = doc.output('datauristring');
      downloadFile(dataUrl, fileName);

    } catch (error: any) {
      console.error('PDF Export Error:', error);
      alert('Failed to export PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const getAuditIcon = (action: string) => {
    const a = (action || '').toLowerCase();
    if (a.includes('submit') || a.includes('create') || a.includes('add')) return <CheckCircle size={16} className="text-emerald-500" />;
    if (a.includes('delete') || a.includes('remove')) return <Trash2 size={16} className="text-red-500" />;
    if (a.includes('update') || a.includes('edit')) return <Edit2 size={16} className="text-blue-500" />;
    if (a.includes('login') || a.includes('auth')) return <LogOut size={16} className="text-purple-500" />;
    return <Activity size={16} className="text-muted-foreground" />;
  };

  if (loading || !state.user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };
  const pageVariants: Variants = {
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
          {['Overview', 'Reports', 'Analytics', 'Employees', 'Audit Logs', 'Head HR'].map(tab => (
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
        
        {/* HR Dashboard Banner */}
        <div className="mb-6 bg-blue-600 rounded-lg p-4 flex items-center gap-3 shadow-md">
          <Bell className="text-white flex-shrink-0" size={20} />
          <p className="text-white text-sm font-medium">
            <strong>Today's Submission Rate: {completionRate}%</strong> | {Math.max(0, employees.length - todaysEntries.length)} Employees Pending
          </p>
        </div>

        <AnimatePresence mode="wait">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <motion.div key="overview" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
              
              {/* Top Widgets */}
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Employees</p>
                    <Users size={18} className="text-blue-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{employees.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Active headcount</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today's Reports</p>
                    <CheckCircle size={18} className="text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{todaysEntries.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Submitted today</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pending Reports</p>
                    <Clock size={18} className="text-yellow-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{Math.max(0, employees.length - todaysEntries.length)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Require submission</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Average Hours</p>
                    <Activity size={18} className="text-purple-500" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">
                    {todaysEntries.length > 0 ? (todaysEntries.reduce((a,b)=>a+Number(b.hours_spent),0) / todaysEntries.length).toFixed(1) : 0}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Hours per employee today</p>
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
                  <div className="p-6 flex-1 bg-card flex flex-col">
                    <div className="mb-6 bg-secondary/30 p-4 rounded-lg border border-border/50">
                      <h4 className="font-bold text-sm text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} className="text-primary" /> Today's Highlights
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="font-medium text-foreground">{completionRate}%</span> overall submission rate
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                          <span className="font-medium text-foreground">{pendingCountHighlights}</span> {pendingCountHighlights === 1 ? 'employee' : 'employees'} pending
                        </li>
                        {topDeptRate.rate > 0 && (
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span className="font-medium text-foreground">{topDeptRate.name}</span> team reached {topDeptRate.rate}% completion
                          </li>
                        )}
                        {topDeptHours.avg > 0 && (
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                            <span className="font-medium text-foreground">{topDeptHours.name}</span> team averaged {topDeptHours.avg.toFixed(1)} hours
                          </li>
                        )}
                      </ul>
                    </div>
                    {aiSummary ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap leading-relaxed border-t border-border/50 pt-4 mt-auto">
                        {aiSummary}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-6 border-t border-border/50 mt-auto">
                        <Sparkles size={24} className="text-muted-foreground/30" />
                        <p className="text-muted-foreground text-xs max-w-xs">Generate an AI executive summary of your team's performance today.</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Recent & Pending Column */}
                <div className="flex flex-col gap-6">
                  {/* Pending Employees */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 max-h-[300px]">
                    <div className="border-b border-border bg-amber-500/10 px-6 py-4 flex items-center gap-2">
                      <Clock size={18} className="text-amber-500" />
                      <h3 className="font-bold text-foreground">Pending Employees ({pendingEmployeesList.length})</h3>
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                      {pendingEmployeesList.map(emp => (
                        <div key={emp.id} className="flex gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0 items-center">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground flex-shrink-0 text-xs">
                            {emp.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.department}</p>
                          </div>
                        </div>
                      ))}
                      {pendingEmployeesList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Everyone has submitted!</p>}
                    </div>
                  </motion.div>

                  {/* Recent Activity Feed */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 max-h-[400px]">
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

              </div>
            </motion.div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'Reports' && (
            <motion.div key="reports" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[750px]">
              
              {/* Range Filters & Exports */}
              <div className="p-4 md:px-6 md:py-5 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-card">
                {/* VERSION INDICATOR TO CHECK CACHE */}
                <div className="w-full text-center text-xs font-bold text-red-500 pb-2">v3.0 - Mobile Download Fix Active</div>
                <div className="flex bg-secondary rounded-lg p-1 w-full md:w-auto overflow-x-auto custom-scrollbar">
                  {['All Reports', 'Today\'s Reports', 'Weekly Reports', 'This Month'].map(r => (
                    <button 
                      key={r}
                      onClick={() => { setReportRangeFilter(r); setCurrentPage(1); }}
                      className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${reportRangeFilter === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#107c41] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#0c5e31] transition-colors shadow-sm">
                    <FileDown size={14} /> Excel
                  </button>
                  <button onClick={handleExportPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-2 rounded-lg font-bold text-xs hover:bg-border transition-colors">
                    <Download size={14} /> PDF
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

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
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

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-3 p-4">
                  <AnimatePresence>
                    {paginatedReports.map((entry, i) => (
                      <motion.div 
                        key={`mob-${entry.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                            {entry.pgepl_users?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{entry.pgepl_users?.name}</div>
                            <div className="text-xs text-muted-foreground">{entry.department}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-border/50 text-sm">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Date</span>
                            <span className="font-medium text-foreground">{entry.work_date}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Hours</span>
                            <span className="font-mono font-medium text-foreground">{entry.hours_spent}h</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {paginatedReports.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">No reports found matching filters.</div>
                  )}
                </div>
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
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider mb-2">Total Hours</p>
                          <input 
                            type="date" 
                            value={analyticsDate}
                            onChange={(e) => setAnalyticsDate(e.target.value)}
                            className="bg-primary-foreground/20 text-primary-foreground border-none rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-foreground/50 w-fit cursor-pointer"
                          />
                        </div>
                        <Calendar size={20} className="text-primary-foreground/50" />
                      </div>
                      <h3 className="text-4xl font-display font-bold">{totalHoursOnDate}h</h3>
                      <p className="text-xs text-primary-foreground/70 mt-2">Logged on {format(new Date(analyticsDate || new Date()), 'MMM dd, yyyy')}</p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Hours Worked Trend</p>
                        <TrendingUp size={18} className="text-primary" />
                      </div>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{fill: 'var(--muted-foreground)', fontSize: 10}} axisLine={false} tickLine={false} tickMargin={5} minTickGap={15} />
                            <Tooltip cursor={false} contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', padding: '8px 12px', borderRadius: '8px', backdropFilter: 'blur(4px)'}} />
                            <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" activeDot={{r: 6, strokeWidth: 0}} />
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
                        <BarChart data={deptProdData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={1}/>
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="var(--border)" opacity={0.5} />
                          <XAxis type="number" tick={{fill: 'var(--muted-foreground)', fontSize: 10}} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{fill: 'var(--foreground)', fontSize: 11, fontWeight: 500}} axisLine={false} tickLine={false} width={100} />
                          <Tooltip cursor={{fill: 'var(--secondary)'}} contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)'}} />
                          <Bar dataKey="hours" fill="url(#colorBar)" radius={[0, 6, 6, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Submission Status Pie Chart */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm p-6">
                    <h3 className="font-bold text-foreground mb-4">Submission Status (Today)</h3>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                          <Pie
                            data={submissionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {submissionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)'}} itemStyle={{color: '#fff'}} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Top Employees Leaderboard */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[300px] max-h-[400px]">
                    <div className="border-b border-border bg-secondary/30 px-6 py-4 flex items-center gap-2">
                      <Award size={18} className="text-yellow-500" />
                    <h3 className="font-bold text-foreground">Top Performing Employees</h3>
                  </div>
                  <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                    {topEmployees.map((emp, idx) => (
                      <div key={idx} className="flex flex-col gap-2 bg-secondary/10 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-700 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : idx === 1 ? 'bg-slate-200 text-slate-700 shadow-[0_0_10px_rgba(148,163,184,0.3)]' : idx === 2 ? 'bg-orange-100 text-orange-800 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-background text-muted-foreground'}`}>
                            #{idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">{emp.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-primary">{emp.hours}h</p>
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(emp.hours / maxEmployeeHours) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {topEmployees.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data available yet.</p>}
                  </div>
                </motion.div>
              </div>
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
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
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
                      {todaysAuditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">{log.pgepl_users?.name || 'System'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getAuditIcon(log.action)}
                              <span className="font-medium text-foreground">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {log.target_type && <span className="text-[10px] uppercase tracking-wider bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded-md w-fit font-bold">{log.target_type}</span>}
                              <span className="text-muted-foreground">{log.details}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {todaysAuditLogs.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No audit logs available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-3 p-4">
                  {todaysAuditLogs.map(log => (
                    <div key={`mob-${log.id}`} className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground">{log.pgepl_users?.name || 'System'}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                        {getAuditIcon(log.action)}
                        {log.action}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {log.target_type && <span className="text-[10px] uppercase tracking-wider bg-secondary text-muted-foreground px-2 py-0.5 rounded-md w-fit font-bold">{log.target_type}</span>}
                        <span className="text-sm text-muted-foreground">{log.details}</span>
                      </div>
                    </div>
                  ))}
                  {todaysAuditLogs.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">No audit logs available.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* HEAD HR TAB */}
          {activeTab === 'Head HR' && (
            <motion.div key="admin" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
              
              {/* Employee Management Full Width */}
              <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2"><Users size={20} className="text-primary"/> Manage Employees</h2>
                
                {empWizardStep === 0 ? (
                  <button onClick={() => setEmpWizardStep(1)} className="mb-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                    <Plus size={16}/> Add Employee
                  </button>
                ) : (
                  <div className="mb-6 bg-secondary/10 p-6 rounded-xl border border-border/50 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        {empWizardStep === 1 && "Step 1: Employee Details"}
                        {empWizardStep === 2 && "Step 2: Generate Credentials"}
                        {empWizardStep === 3 && "Step 3: Send Login Details"}
                      </h3>
                      <button onClick={() => { setEmpWizardStep(0); setNewEmpName(''); setNewEmpEmail(''); setNewEmpPassword(''); setNewEmpDept(''); }} className="text-muted-foreground hover:text-foreground"><X size={16}/></button>
                    </div>

                    {empWizardStep === 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                          <input type="text" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} placeholder="e.g. Jane Doe" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
                          <input type="email" value={newEmpEmail} onChange={e=>setNewEmpEmail(e.target.value)} placeholder="e.g. jane@pgepl.com" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Department</label>
                          <select value={newEmpDept} onChange={e=>setNewEmpDept(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                            <option value="">Select Dept...</option>
                            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-3 flex justify-end mt-2">
                          <button 
                            disabled={!newEmpName || !newEmpEmail || !newEmpDept}
                            onClick={() => setEmpWizardStep(2)} 
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            Next: Generate Credentials <ChevronRight size={16}/>
                          </button>
                        </div>
                      </div>
                    )}

                    {empWizardStep === 2 && (
                      <div className="flex flex-col gap-4">
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 rounded-lg flex items-start gap-3 text-amber-800 dark:text-amber-500">
                          <ShieldCheck size={20} className="mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-bold mb-1">Secure Password Generation</p>
                            <p>Generate a secure temporary password for this employee. They will be required to change it upon first login (Not implemented yet).</p>
                          </div>
                        </div>
                        <div className="flex gap-4 items-end">
                          <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Temporary Password</label>
                            <div className="flex gap-2">
                              <input type="text" value={newEmpPassword} onChange={e=>setNewEmpPassword(e.target.value)} placeholder="••••••••" className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono" />
                              <button 
                                onClick={() => {
                                  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$*';
                                  let pass = '';
                                  for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                  setNewEmpPassword(pass);
                                }}
                                className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-border transition-colors whitespace-nowrap"
                              >
                                Auto-Generate
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2">
                          <button onClick={() => setEmpWizardStep(1)} className="text-muted-foreground font-bold text-sm hover:text-foreground px-4 py-2">Back</button>
                          <button 
                            disabled={!newEmpPassword || isCreatingEmp}
                            onClick={handleCreateEmployee} 
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {isCreatingEmp ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16}/> Create Account</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {empWizardStep === 3 && (
                      <div className="flex flex-col items-center justify-center py-6 gap-4">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                          <Check size={32} />
                        </div>
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-foreground">Account Created!</h3>
                          <p className="text-sm text-muted-foreground mt-1">{newEmpName} ({newEmpEmail}) has been added to {newEmpDept}.</p>
                        </div>
                        <div className="bg-background border border-border p-4 rounded-lg w-full max-w-sm mt-2 text-sm space-y-2">
                          <div className="flex justify-between border-b border-border/50 pb-2">
                            <span className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Email</span>
                            <span className="font-medium text-foreground">{newEmpEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Password</span>
                            <span className="font-mono text-foreground">{newEmpPassword}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const details = `Login Details for PGEPL Work Tracker\n\nLogin URL: ${window.location.origin}\nEmail: ${newEmpEmail}\nTemporary Password: ${newEmpPassword}\n\nPlease log in and update your password.`;
                            navigator.clipboard.writeText(details);
                            alert("Login details copied to clipboard. You can now securely send them to the employee via email or internal chat.");
                            setEmpWizardStep(0);
                            setNewEmpName('');
                            setNewEmpEmail('');
                            setNewEmpPassword('');
                            setNewEmpDept('');
                          }}
                          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors mt-2"
                        >
                          Copy & Send Details <Send size={16}/>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="px-4 py-3 font-bold">Name</th>
                          <th className="px-4 py-3 font-bold">Email</th>
                          <th className="px-4 py-3 font-bold">Department</th>
                          <th className="px-4 py-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {employees.map(emp => (
                          <tr key={emp.id} className="hover:bg-secondary/10">
                            <td className="px-4 py-3 font-medium text-foreground">{emp.name} {emp.role === 'manager' && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">Head HR</span>}</td>
                            <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
                            <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={async () => {
                                if(confirm('Are you sure you want to completely remove this employee?')) {
                                  alert("Deletion requires API endpoint (not implemented yet)");
                                }
                              }} className="text-red-500 hover:text-red-600 p-1 bg-red-500/10 rounded-md">
                                <Trash2 size={14}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Cards */}
                  <div className="md:hidden flex flex-col gap-3">
                    {employees.map(emp => (
                      <div key={`mob-${emp.id}`} className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="font-bold text-foreground">
                            {emp.name} 
                            {emp.role === 'manager' && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">Head HR</span>}
                          </div>
                          <button onClick={async () => {
                            if(confirm('Are you sure you want to completely remove this employee?')) {
                              alert("Deletion requires API endpoint (not implemented yet)");
                            }
                          }} className="text-red-500 hover:text-red-600 p-2 bg-red-500/10 rounded-md">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                        <div className="text-sm text-muted-foreground">{emp.email}</div>
                        <div className="text-sm bg-secondary px-2 py-1 rounded-md self-start">{emp.department}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        {editingDeptId === d.id ? (
                          <div className="flex gap-2 w-full">
                            <input 
                              type="text" 
                              value={editDeptName}
                              onChange={e => setEditDeptName(e.target.value)}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                            <button onClick={async () => {
                              await fetch('/api/departments', { method: 'PUT', body: JSON.stringify({id: d.id, name: editDeptName})});
                              setEditingDeptId(null); fetchData();
                            }} className="text-green-500 hover:text-green-600 p-1"><Save size={16}/></button>
                            <button onClick={() => setEditingDeptId(null)} className="text-muted-foreground hover:text-foreground p-1"><X size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-foreground">{d.name}</span>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingDeptId(d.id); setEditDeptName(d.name); }} className="text-blue-500 hover:text-blue-600 p-1"><Edit2 size={14}/></button>
                              <button onClick={async () => {
                                if(confirm('Delete this department?')) {
                                  await fetch('/api/departments', { method: 'DELETE', body: JSON.stringify({id: d.id})});
                                  fetchData();
                                }
                              }} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                            </div>
                          </>
                        )}
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
                        {editingKraId === k.id ? (
                          <div className="flex gap-2 w-full">
                            <input 
                              type="text" 
                              value={editKraName}
                              onChange={e => setEditKraName(e.target.value)}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                            <button onClick={async () => {
                              await fetch('/api/kras', { method: 'PUT', body: JSON.stringify({id: k.id, name: editKraName})});
                              setEditingKraId(null); fetchData();
                            }} className="text-green-500 hover:text-green-600 p-1"><Save size={16}/></button>
                            <button onClick={() => setEditingKraId(null)} className="text-muted-foreground hover:text-foreground p-1"><X size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-foreground">{k.name}</span>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingKraId(k.id); setEditKraName(k.name); }} className="text-blue-500 hover:text-blue-600 p-1"><Edit2 size={14}/></button>
                              <button onClick={async () => {
                                if(confirm('Delete this KRA?')) {
                                  await fetch('/api/kras', { method: 'DELETE', body: JSON.stringify({id: k.id})});
                                  fetchData();
                                }
                              }} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                            </div>
                          </>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
