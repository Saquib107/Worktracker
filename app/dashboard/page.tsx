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
  const [trendTab, setTrendTab] = useState('Hours');

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
      if (state.user.role !== 'manager' && state.user.role !== 'dept_head') {
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
    const daySubmits = new Set(dayEntries.map(e => e.user_id)).size;
    const activeEmps = employees.length || 1;
    trendsData.push({ 
      date: format(d, 'MMM dd'), 
      hours: dayHours,
      productivity: daySubmits > 0 ? parseFloat((dayHours / daySubmits).toFixed(1)) : 0,
      submissions: daySubmits,
      consistency: Math.round((daySubmits / activeEmps) * 100)
    });
  }

  // Submission Status Data (Today)
  const totalEmps = employees.length || 1;
  const completedCount = todaysEntries.length;
  const pendingCount = Math.max(0, totalEmps - completedCount);
  const submitPercent = Math.round((completedCount / totalEmps) * 100);

  // Trend Comparisons (Last 7 days vs Previous 7 Days)
  const getPeriodStats = (startDaysAgo: number, endDaysAgo: number) => {
    let hrs = 0;
    let subs = 0;
    for(let i=startDaysAgo; i>=endDaysAgo; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayEnts = entries.filter(e => e.work_date === d);
      hrs += dayEnts.reduce((sum, e) => sum + Number(e.hours_spent), 0);
      subs += new Set(dayEnts.map(e => e.user_id)).size;
    }
    return { hrs, subs };
  };
  const last7 = getPeriodStats(6, 0);
  const prev7 = getPeriodStats(13, 7);
  const trendHours = prev7.hrs ? Math.round(((last7.hrs - prev7.hrs)/prev7.hrs)*100) : 0;
  const trendSubs = prev7.subs ? Math.round(((last7.subs - prev7.subs)/prev7.subs)*100) : 0;

  // --- Compliance & Discipline Calculation ---
  const getBusinessDays = (startDate: Date, endDate: Date) => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if(dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  const complianceData = employees.map(emp => {
    const empEntries = entries.filter(e => e.user_id === emp.id || e.pgepl_users?.name === emp.name);
    const uniqueDays = new Set(empEntries.map(e => e.work_date));
    const daysSubmitted = uniqueDays.size;
    const totalHours = empEntries.reduce((sum, e) => sum + Number(e.hours_spent), 0);

    const firstEntryDate = empEntries.length > 0 
      ? new Date(Math.min(...empEntries.map(e => new Date(e.work_date).getTime())))
      : new Date(emp.created_at || Date.now());
    
    const totalBusinessDays = Math.max(1, getBusinessDays(firstEntryDate, new Date()));
    let coverage = Math.round((daysSubmitted / totalBusinessDays) * 100);
    if (coverage > 100) coverage = 100;

    let status = 'High Risk';
    let color = '#ef4444'; 
    let bgClass = 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30';
    let textClass = 'text-red-700 dark:text-red-400';
    let iconClass = 'text-red-500';
    if (coverage >= 60) { 
      status = 'Star Player'; color = '#10b981'; bgClass = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'; textClass = 'text-emerald-700 dark:text-emerald-400'; iconClass = 'text-emerald-500';
    } else if (coverage >= 20) { 
      status = 'Needs Attention'; color = '#f59e0b'; bgClass = 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'; textClass = 'text-amber-700 dark:text-amber-400'; iconClass = 'text-amber-500';
    }

    // Streak logic (working backwards from today)
    let streak = 0;
    for(let i=0; i<30; i++) {
      const d = subDays(new Date(), i);
      if(d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
      if(uniqueDays.has(format(d, 'yyyy-MM-dd'))) streak++;
      else break;
    }

    const sparkline = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      sparkline.push({ date: format(d, 'MMM dd'), submitted: uniqueDays.has(format(d, 'yyyy-MM-dd')) ? 1 : 0, isWeekend, dayName: format(d, 'E') });
    }

    return { ...emp, daysSubmitted, totalBusinessDays, totalHours, coverage, status, color, bgClass, textClass, iconClass, sparkline, streak };
  }).sort((a, b) => b.coverage - a.coverage);

  const starPlayers = complianceData.filter(c => c.status === 'Star Player');
  const moderatePlayers = complianceData.filter(c => c.status === 'Needs Attention');
  const concernPlayers = complianceData.filter(c => c.status === 'High Risk');

  const avgConsistency = Math.round(complianceData.reduce((sum, e) => sum + e.coverage, 0) / (complianceData.length || 1));
  const workforceHealth = Math.round((submitPercent + avgConsistency) / 2);

  // Advanced Dept Leaderboard
  const deptLeaderboard = Object.entries(deptProd).map(([name, hours]) => {
    const deptEmps = complianceData.filter(e => e.department === name);
    const avgCov = deptEmps.length ? Math.round(deptEmps.reduce((s, e) => s + e.coverage, 0) / deptEmps.length) : 0;
    return { name, hours, productivity: avgCov };
  }).sort((a,b) => b.hours - a.hours);

  // --- Exports ---
              const downloadFile = async (dataUrl: string, fileName: string, base64Data: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDownloader) {
        (window as any).AndroidDownloader.saveFile(base64Data, fileName);
        return;
      }
    } catch (e: any) {
      console.error("Android native save failed:", e);
      alert("Native save failed: " + e.message);
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
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

      const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const dataUrl = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + base64;
      await downloadFile(dataUrl, fileName, base64);

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
      await downloadFile(dataUrl, fileName, base64);

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
      const base64 = dataUrl.split(',')[1];
      await downloadFile(dataUrl, fileName, base64);

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
          {['Overview', 'Reports', 'Analytics', 'Employees', 'Fill Form', 'Audit Logs', 'Head HR']
            .filter(tab => {
              if (state.user?.role === 'dept_head') {
                return !['Audit Logs', 'Head HR'].includes(tab);
              } else {
                return tab !== 'Fill Form'; // Only dept_head gets the tab
              }
            })
            .map(tab => (
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
            <motion.div key="analytics" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
              
              {/* SECTION 1: Executive KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Submit %</p>
                    <CheckCircle size={18} className="text-primary" />
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-display font-bold text-foreground">{submitPercent}%</h3>
                    {trendSubs !== 0 && (
                      <span className={`text-xs font-bold mb-1 flex items-center ${trendSubs > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trendSubs > 0 ? '↑' : '↓'} {Math.abs(trendSubs)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">vs previous 7 days</p>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-display font-bold text-foreground">{pendingCount}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Employees missing today</p>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Hours</p>
                    <Activity size={18} className="text-blue-500" />
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-display font-bold text-foreground">{last7.hrs}h</h3>
                    {trendHours !== 0 && (
                      <span className={`text-xs font-bold mb-1 flex items-center ${trendHours > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trendHours > 0 ? '↑' : '↓'} {Math.abs(trendHours)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Logged last 7 days</p>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">At Risk</p>
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-display font-bold text-foreground">{concernPlayers.length}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Critically low consistency</p>
                </div>
              </div>

              {/* SECTION 2: Workforce Health Score */}
              <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] border border-border p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                  <Activity className="text-primary" /> Workforce Health Score
                </h2>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0 text-center md:text-left w-full md:w-auto">
                    <span className="text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-blue-400">
                      {workforceHealth}%
                    </span>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Overall Rating</p>
                  </div>
                  
                  <div className="flex-1 w-full space-y-6 z-10">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                        <span>Consistency</span>
                        <span>{avgConsistency}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{width:0}} animate={{width:`${avgConsistency}%`}} transition={{duration:1}} className="h-full bg-emerald-500"></motion.div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                        <span>Today's Attendance</span>
                        <span>{submitPercent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{width:0}} animate={{width:`${submitPercent}%`}} transition={{duration:1}} className="h-full bg-blue-500"></motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3 & 9: Dept Leaderboard & AI Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
                  <h3 className="font-bold text-foreground mb-4 uppercase tracking-wider text-xs">Department Leaderboard</h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/50">
                          <th className="pb-2 font-medium">Rank</th>
                          <th className="pb-2 font-medium">Department</th>
                          <th className="pb-2 font-medium text-right">Hours</th>
                          <th className="pb-2 font-medium text-right">Avg Productivity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptLeaderboard.slice(0,5).map((dept, idx) => (
                          <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-secondary/10">
                            <td className="py-3 font-bold text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx+1}</td>
                            <td className="py-3 font-medium text-foreground">{dept.name}</td>
                            <td className="py-3 text-right font-mono text-muted-foreground">{dept.hours}h</td>
                            <td className="py-3 text-right font-bold text-primary">{dept.productivity}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-500" /> AI Insights
                    </h3>
                    <button 
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingAi}
                      className="text-xs bg-secondary hover:bg-border text-foreground px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isGeneratingAi ? 'Analyzing...' : 'Refresh AI'}
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    {aiSummary ? (
                      <div className="prose prose-sm dark:prose-invert text-muted-foreground whitespace-pre-wrap">{aiSummary}</div>
                    ) : (
                      <ul className="space-y-4 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                          <span>{deptLeaderboard[0]?.name || 'One'} department leads productivity at {deptLeaderboard[0]?.productivity || 0}%.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></div>
                          <span>Submission rate {trendSubs > 0 ? 'increased' : 'dropped'} {Math.abs(trendSubs)}% compared to the previous 7 days.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                          <span>{concernPlayers.length} employees may require follow-up regarding low consistency.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                          <span>{starPlayers[0]?.name || 'Top performer'} has maintained a {starPlayers[0]?.streak || 0}-day submission streak.</span>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: Analytics Trends */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                  <div>
                    <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">Analytics Trends (14 Days)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {trendTab === 'Hours' && 'Total hours logged across all departments per day.'}
                      {trendTab === 'Productivity' && 'Average hours logged per submitting employee per day.'}
                      {trendTab === 'Consistency' && 'Percentage of the total workforce that submitted a tracker per day.'}
                      {trendTab === 'Submissions' && 'Total count of employees who submitted a tracker per day.'}
                    </p>
                  </div>
                  <div className="flex bg-secondary p-1 rounded-lg w-full overflow-x-auto custom-scrollbar lg:w-auto flex-shrink-0">
                    {['Hours', 'Productivity', 'Consistency', 'Submissions'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setTrendTab(tab)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${trendTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{fill: 'var(--muted-foreground)', fontSize: 10}} axisLine={false} tickLine={false} tickMargin={10} minTickGap={15} />
                      <YAxis tick={{fill: 'var(--muted-foreground)', fontSize: 10}} axisLine={false} tickLine={false} width={60} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                      <Tooltip 
                        cursor={{stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3'}} 
                        contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', padding: '8px 12px', borderRadius: '8px', backdropFilter: 'blur(4px)'}} 
                        formatter={(value: any) => {
                          if (trendTab === 'Hours' || trendTab === 'Productivity') return [`${value} hrs`, trendTab];
                          if (trendTab === 'Consistency') return [`${value}%`, trendTab];
                          return [value, trendTab];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={trendTab.toLowerCase()} 
                        stroke="var(--primary)" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorTrend)" 
                        activeDot={{r: 6, fill: 'var(--primary)', stroke: '#fff', strokeWidth: 2}} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Trend Records Breakdown */}
                <div className="mt-6 pt-4 border-t border-border">
                  <details className="group">
                    <summary className="text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors flex items-center gap-2 select-none">
                      <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span>
                      View Daily Records Breakdown
                    </summary>
                    <div className="mt-4 overflow-x-auto custom-scrollbar">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/50">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium text-right">Total Hours</th>
                            <th className="pb-2 font-medium text-right">Avg Productivity</th>
                            <th className="pb-2 font-medium text-right">Submissions</th>
                            <th className="pb-2 font-medium text-right">Consistency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {[...trendsData].reverse().map((d, i) => (
                            <tr key={i} className="hover:bg-secondary/20 transition-colors">
                              <td className="py-2 font-medium text-foreground">{d.date}</td>
                              <td className="py-2 text-right font-mono">{d.hours}h</td>
                              <td className="py-2 text-right font-mono">{d.productivity}h/emp</td>
                              <td className="py-2 text-right font-mono">{d.submissions}</td>
                              <td className="py-2 text-right font-mono text-primary">{d.consistency}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>

              {/* SECTION 5: Employee Heatmap */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6 overflow-hidden">
                <h3 className="font-bold text-foreground mb-4 uppercase tracking-wider text-xs">14-Day Consistency Heatmap</h3>
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr>
                        <th className="pb-2 text-muted-foreground font-medium min-w-[120px]">Employee</th>
                        {trendsData.map((d, i) => (
                          <th key={i} className="pb-2 text-muted-foreground font-medium text-center text-[10px] w-8">
                            {d.date.split(' ')[1]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {complianceData.slice(0, 15).map(emp => (
                        <tr key={emp.id} className="group">
                          <td className="py-1 font-medium text-foreground text-xs whitespace-nowrap">{emp.name}</td>
                          {emp.sparkline.map((day: any, i: number) => (
                            <td key={i} className="py-1 px-0.5 text-center">
                              <div 
                                title={`${day.date} - ${day.isWeekend ? 'Weekend' : day.submitted ? 'Submitted' : 'Missed'}`}
                                className={`w-5 h-5 mx-auto rounded-sm transition-all ${day.isWeekend ? 'bg-secondary/50' : day.submitted ? 'bg-emerald-500 group-hover:scale-110 shadow-sm' : 'bg-red-500/20'}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {complianceData.length > 15 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing top 15 employees by consistency.</p>}
                </div>
              </div>

              {/* SECTION 6 & 7: Risk Table & Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Risk Table */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
                  <h3 className="font-bold text-foreground mb-4 uppercase tracking-wider text-xs">Employee Risk Matrix</h3>
                  <div className="flex gap-4 mb-4">
                    <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/20">STAR PLAYERS: {starPlayers.length}</div>
                    <div className="bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/20">NEEDS ATTENTION: {moderatePlayers.length}</div>
                    <div className="bg-red-500/10 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/20">HIGH RISK: {concernPlayers.length}</div>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/50 text-xs">
                          <th className="pb-2 font-medium">Employee</th>
                          <th className="pb-2 font-medium">Dept</th>
                          <th className="pb-2 font-medium text-right">Score</th>
                          <th className="pb-2 font-medium text-right">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {complianceData.map((emp) => (
                          <tr key={emp.id} className="hover:bg-secondary/20 cursor-pointer transition-colors" title={`Total business days: ${emp.totalBusinessDays}`}>
                            <td className="py-2.5 font-medium text-foreground text-xs">{emp.name}</td>
                            <td className="py-2.5 text-muted-foreground text-xs">{emp.department}</td>
                            <td className={`py-2.5 font-mono text-right font-bold ${emp.textClass}`}>{emp.coverage}%</td>
                            <td className="py-2.5 text-right flex justify-end items-center">
                              {emp.status === 'Star Player' ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Star Player" /> : emp.status === 'Needs Attention' ? <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Needs Attention" /> : <div className="w-2.5 h-2.5 rounded-full bg-red-500" title="High Risk" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="space-y-4">
                  <h3 className="font-bold text-foreground mb-4 uppercase tracking-wider text-xs">Top Performers</h3>
                  {starPlayers.slice(0,3).map((emp, idx) => (
                    <div key={emp.id} className="bg-gradient-to-br from-card to-secondary/30 border border-emerald-500/30 rounded-xl p-4 flex gap-4 items-center shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 text-4xl opacity-10">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-500 text-lg border border-emerald-500/20 shadow-inner z-10">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="z-10 flex-1">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                          {emp.name} {idx === 0 && <Award size={14} className="text-yellow-500"/>}
                        </h4>
                        <div className="flex gap-3 text-xs mt-1">
                          <span className="text-muted-foreground"><strong className="text-foreground font-mono">{emp.totalHours}</strong> Hrs</span>
                          <span className="text-muted-foreground"><strong className="text-emerald-500 font-mono">{emp.coverage}%</strong> Score</span>
                          <span className="text-muted-foreground"><strong className="text-primary font-mono">{emp.streak}</strong> Streak</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {starPlayers.length === 0 && (
                    <div className="text-center p-8 bg-secondary/10 rounded-xl border border-border border-dashed text-muted-foreground text-sm">
                      No star players yet.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 8: HR Action Center */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
                <h3 className="font-bold text-amber-700 dark:text-amber-500 mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                  <AlertCircle size={16} /> HR Action Center
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="bg-card border border-amber-500/20 p-4 rounded-lg text-left hover:border-amber-500/50 transition-colors shadow-sm group">
                    <p className="text-2xl font-bold text-foreground group-hover:text-amber-600 transition-colors">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Employees missed today</p>
                  </button>
                  <button className="bg-card border border-red-500/20 p-4 rounded-lg text-left hover:border-red-500/50 transition-colors shadow-sm group">
                    <p className="text-2xl font-bold text-foreground group-hover:text-red-600 transition-colors">{concernPlayers.length}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Below 20% consistency</p>
                  </button>
                  <button className="bg-card border border-border p-4 rounded-lg text-left hover:border-primary/50 transition-colors shadow-sm group">
                    <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{deptLeaderboard.filter(d => d.productivity < 50).length}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Depts below 50% target</p>
                  </button>
                  <button className="bg-card border border-border p-4 rounded-lg text-left hover:border-primary/50 transition-colors shadow-sm group">
                    <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{complianceData.filter(e => e.streak === 0 && e.coverage > 0).length}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Lost streaks today</p>
                  </button>
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

          {/* FILL FORM TAB */}
          {activeTab === 'Fill Form' && (
            <motion.div key="fill-form" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <iframe src="/submit?embedded=true" className="w-full min-h-[850px] border-none rounded-xl" title="Submit Form" />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
