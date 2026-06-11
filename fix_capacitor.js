const fs = require('fs');

const codeToInsert = `  const downloadFile = async (dataUrl: string, fileName: string, base64Data: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = require('@capacitor/filesystem');
        
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents
        });
        
        alert("File securely saved to your phone's Documents folder!");
        return;
      }
    } catch (e: any) {
      console.error("Capacitor save failed:", e);
      alert("Capacitor save failed: " + e.message);
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
      
      const fileName = \`PGEPL_Export_\${String(reportRangeFilter || 'All').replace(/ /g, '_')}.xlsx\`;

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
        ...validEntries.map(e => \`"\${e.work_date || ''}","\${e.pgepl_users?.name || 'N/A'}","\${e.department || ''}","\${String(e.kra_category || '').replace(/_/g, ' ')}","\${e.hours_spent || 0}","\${e.task_status || ''}"\`)
      ].join('\\n');
      
      const fileName = \`PGEPL_Export_\${String(reportRangeFilter || 'All').replace(/ /g, '_')}.csv\`;

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
      doc.text(\`PGEPL Report: \${reportRangeFilter || 'All'}\`, 14, 15);
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
      
      const fileName = \`PGEPL_Report_\${String(reportRangeFilter || 'All').replace(/ /g, '_')}.pdf\`;

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
  };`;

const file = 'app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('const downloadFile = (dataUrl: string, fileName: string) => {');
const endIndexStr = 'alert(\'Failed to export PDF: \' + (error.message || \'Unknown error\'));\n    }\n  };';
const endIndex = content.indexOf(endIndexStr) + endIndexStr.length;

if (startIndex === -1 || content.indexOf(endIndexStr) === -1) {
    console.log("Could not find blocks to replace.");
} else {
    content = content.substring(0, startIndex) + codeToInsert + content.substring(endIndex);
    
    // Also update the version tag
    content = content.replace("v3.0 - Mobile Download Fix Active", "v4.0 - Native Capacitor Filesystem Active");
    
    fs.writeFileSync(file, content, 'utf8');
    console.log("Success");
}
