const fs = require('fs');
const file = 'app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add AreaChart and Area imports
content = content.replace(
  "const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });",
  "const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });\nconst AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });\nconst Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });"
);

// 2. Add maxEmployeeHours and todaysAuditLogs
content = content.replace(
  "    .sort((a,b) => b.hours - a.hours);",
  "    .sort((a,b) => b.hours - a.hours);\n  const maxEmployeeHours = topEmployees.length > 0 ? topEmployees[0].hours : 1;\n  const todaysAuditLogs = auditLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString());"
);

// 3. Trends AreaChart
content = content.replace(
  /<LineChart data=\{trendsData\}>[\s\S]*?<\/LineChart>/,
  `<AreaChart data={trendsData}>
                            <defs>
                              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Tooltip cursor={false} contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', padding: '8px 12px', borderRadius: '8px', backdropFilter: 'blur(4px)'}} />
                            <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" activeDot={{r: 6, strokeWidth: 0}} />
                          </AreaChart>`
);

// 4. Dept Productivity BarChart
content = content.replace(
  /<BarChart data=\{deptProdData\} margin=\{\{ top: 0, right: 0, left: 0, bottom: 0 \}\}>[\s\S]*?<\/BarChart>/,
  `<BarChart data={deptProdData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={1}/>
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                          <XAxis dataKey="name" tick={{fill: 'var(--muted-foreground)', fontSize: 12}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill: 'var(--muted-foreground)', fontSize: 12}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'var(--secondary)'}} contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)'}} />
                          <Bar dataKey="hours" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>`
);

// 5. Submission Status PieChart
content = content.replace(
  /<PieChart>[\s\S]*?<\/PieChart>/,
  `<PieChart>
                          <Pie
                            data={submissionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {submissionData.map((entry, index) => (
                              <Cell key={\`cell-\${index}\`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)'}} itemStyle={{color: '#fff'}} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>`
);

// 6. Top Employees
content = content.replace(
  /\{topEmployees\.map\(\(emp, idx\) => \([\s\S]*?<\/div>\s*\)\)\}/,
  `{topEmployees.map((emp, idx) => (
                      <div key={idx} className="flex flex-col gap-2 bg-secondary/10 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 \${idx === 0 ? 'bg-yellow-100 text-yellow-700 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : idx === 1 ? 'bg-slate-200 text-slate-700 shadow-[0_0_10px_rgba(148,163,184,0.3)]' : idx === 2 ? 'bg-orange-100 text-orange-800 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-background text-muted-foreground'}\`}>
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
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: \`\${(emp.hours / maxEmployeeHours) * 100}%\` }}></div>
                        </div>
                      </div>
                    ))}`
);

// 7. Audit Logs - filter
content = content.replaceAll(
  "{auditLogs.map(log => (",
  "{todaysAuditLogs.map(log => ("
);
content = content.replaceAll(
  "{auditLogs.length === 0 && (",
  "{todaysAuditLogs.length === 0 && ("
);

// Add the badge indicating today's logs
content = content.replace(
  "['Overview', 'Reports', 'Analytics', 'Employees', 'Audit Logs', 'Head HR'].map(tab => (",
  "['Overview', 'Reports', 'Analytics', 'Employees', 'Audit Logs (Today)', 'Head HR'].map(tab => ("
);

// Need to also replace the activeTab check
content = content.replace(
  "activeTab === 'Audit Logs'",
  "activeTab === 'Audit Logs (Today)'"
);

fs.writeFileSync(file, content);
console.log("Done");
