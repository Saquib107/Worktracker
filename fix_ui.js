const fs = require('fs');
const file = 'app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rename tab back to 'Audit Logs'
content = content.replace(
  "['Overview', 'Reports', 'Analytics', 'Employees', 'Audit Logs (Today)', 'Head HR'].map(tab => (",
  "['Overview', 'Reports', 'Analytics', 'Employees', 'Audit Logs', 'Head HR'].map(tab => ("
);
content = content.replace(
  "activeTab === 'Audit Logs (Today)'",
  "activeTab === 'Audit Logs'"
);

// 2. Add XAxis to AreaChart
content = content.replace(
  /<AreaChart data=\{trendsData\}>\s*<defs>/,
  `<AreaChart data={trendsData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>`
);
content = content.replace(
  /<Tooltip cursor=\{false\}/,
  `<XAxis dataKey="date" tick={{fill: 'var(--muted-foreground)', fontSize: 10}} axisLine={false} tickLine={false} tickMargin={10} />
                            <Tooltip cursor={false}`
);

// 3. Fix BarChart to vertical layout for readability
content = content.replace(
  /<BarChart data=\{deptProdData\} margin=\{\{ top: 0, right: 0, left: 0, bottom: 0 \}\}>/,
  `<BarChart data={deptProdData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>`
);
content = content.replace(
  /<linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">/,
  `<linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">`
);
content = content.replace(
  /<XAxis dataKey="name" tick=\{\{fill: 'var\\(--muted-foreground\\)', fontSize: 12\}\} axisLine=\{false\} tickLine=\{false\} \/>/,
  `<XAxis type="number" tick={{fill: 'var(--muted-foreground)', fontSize: 10}} axisLine={false} tickLine={false} />`
);
content = content.replace(
  /<YAxis tick=\{\{fill: 'var\\(--muted-foreground\\)', fontSize: 12\}\} axisLine=\{false\} tickLine=\{false\} \/>/,
  `<YAxis type="category" dataKey="name" tick={{fill: 'var(--foreground)', fontSize: 11, fontWeight: 500}} axisLine={false} tickLine={false} width={100} />`
);
content = content.replace(
  /<Bar dataKey="hours" fill="url\\(#colorBar\\)" radius=\{\[6, 6, 0, 0\]\} barSize=\{40\} \/>/,
  `<Bar dataKey="hours" fill="url(#colorBar)" radius={[0, 6, 6, 0]} barSize={20} />`
);

// 4. Fix PieChart height and spacing to prevent legend overlap
content = content.replace(
  /<div className="h-\[200px\]">\s*<ResponsiveContainer width="100%" height="100%">\s*<PieChart>/,
  `<div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>`
);
content = content.replace(
  /innerRadius=\{65\}\s*outerRadius=\{85\}/,
  `innerRadius={55}
                            outerRadius={75}`
);

fs.writeFileSync(file, content);
console.log("Done");
