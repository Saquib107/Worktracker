const fs = require('fs');
const file = 'app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the Overview tab and Reports tab headers
const replaceText = `<div className="p-4 md:px-6 md:py-5 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-card">`;
const newText = `<div className="p-4 md:px-6 md:py-5 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-card">
                {/* VERSION INDICATOR TO CHECK CACHE */}
                <div className="w-full text-center text-xs font-bold text-red-500 pb-2">v3.0 - Mobile Download Fix Active</div>`;

content = content.replace(replaceText, newText);

fs.writeFileSync(file, content, 'utf8');
console.log("Success");
