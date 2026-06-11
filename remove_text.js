const fs = require('fs');
const file = 'app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replaceText = `<div className="w-full text-center text-xs font-bold text-red-500 pb-2">v4.0 - Native Capacitor Filesystem Active</div>`;

content = content.replace(replaceText, "");

fs.writeFileSync(file, content, 'utf8');
console.log("Success");
