const fs = require('fs');

const codeToInsert = `  const handleExportExcel = () => {
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
      XLSX.writeFile(wb, \`PGEPL_Export_\${String(reportRangeFilter || 'All').replace(/ /g, '_')}.xlsx\`);
    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Failed to export Excel: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportCSV = () => {
    try {
      const validEntries = entries.filter(e => e);
      const headers = ['Date', 'Employee', 'Department', 'KRA', 'Hours', 'Status'];
      const csvContent = [
        headers.join(','),
        ...validEntries.map(e => \`"\${e.work_date || ''}","\${e.pgepl_users?.name || 'N/A'}","\${e.department || ''}","\${String(e.kra_category || '').replace(/_/g, ' ')}","\${e.hours_spent || 0}","\${e.task_status || ''}"\`)
      ].join('\\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
      link.download = \`PGEPL_Export_\${String(reportRangeFilter || 'All').replace(/ /g, '_')}.csv\`;
      link.click();
    } catch (error) {
      console.error('CSV Export Error:', error);
      alert('Failed to export CSV: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportPDF = () => {
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
      doc.save(\`PGEPL_Report_\${String(reportRangeFilter || 'All').replace(/ /g, '_')}.pdf\`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to export PDF: ' + (error.message || 'Unknown error'));
    }
  };`;

const file = 'app/dashboard/page.tsx';
const content = fs.readFileSync(file, 'utf8');

// Replace lines from handleExportExcel to the end of handleExportPDF
const startIndex = content.indexOf('const handleExportExcel = () => {');
const endIndexStr = 'doc.save(`PGEPL_Report_${reportRangeFilter.replace(/ /g, \'_\')}.pdf`);\n  };';
const endIndex = content.indexOf(endIndexStr) + endIndexStr.length;

if (startIndex === -1 || endIndex === -1 + endIndexStr.length) {
    console.log("Could not find blocks to replace.");
} else {
    const newContent = content.substring(0, startIndex) + codeToInsert + content.substring(endIndex);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log("Success");
}
