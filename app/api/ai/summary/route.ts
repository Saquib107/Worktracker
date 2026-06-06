import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from '@/lib/auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'MISSING_KEY',
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded || decoded.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { entriesData } = await request.json();

    if (!entriesData || entriesData.length === 0) {
      return NextResponse.json({ error: 'No data to summarize' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // Generate a highly polished mock summary parsing the real entries
      const activeDepts = [...new Set(entriesData.map((e: any) => e.department))];
      const issues = entriesData.filter((e: any) => e.has_issue);
      const totalHours = entriesData.reduce((acc: number, e: any) => acc + Number(e.hours_spent), 0);

      let mockSummary = `### 🚀 Executive Daily Summary\n\n`;
      mockSummary += `Today, the team logged **${totalHours} total hours** across **${activeDepts.length} departments**. Productivity remains steady with **${entriesData.length} active work logs** submitted.\n\n`;
      
      mockSummary += `#### 🏗️ Real Work Completed\n`;
      entriesData.slice(0, 5).forEach((e: any) => {
        mockSummary += `- **${e.pgepl_users?.name}** (${e.department}): *${e.tasks_text.substring(0, 90)}${e.tasks_text.length > 90 ? '...' : ''}*\n`;
      });
      if (entriesData.length > 5) {
        mockSummary += `- *...and ${entriesData.length - 5} more tasks logged.*\n`;
      }

      mockSummary += `\n#### 📊 Department Highlights\n`;
      activeDepts.forEach(dept => {
        const deptEntries = entriesData.filter((e: any) => e.department === dept);
        const deptHours = deptEntries.reduce((acc: number, e: any) => acc + Number(e.hours_spent), 0);
        mockSummary += `- **${dept}**: Logged ${deptHours} hours. Contributors: ${[...new Set(deptEntries.map((e: any) => e.pgepl_users?.name?.split(' ')[0]))].join(', ')}\n`;
      });

      mockSummary += `\n#### ⚠️ Blockers & Issues\n`;
      if (issues.length > 0) {
        issues.forEach((e: any) => {
          mockSummary += `- **Critical from ${e.pgepl_users?.name}**: ${e.issue_description}\n`;
        });
      } else {
        mockSummary += `*No critical blockers reported today. Operations are running smoothly.*\n`;
      }

      return NextResponse.json({ summary: mockSummary });
    }

    const context = entriesData.map((e: any) => 
      `- ${e.pgepl_users?.name} (${e.department}): ${e.tasks_text.substring(0, 150)}... Status: ${e.task_status}. Issues: ${e.has_issue ? e.issue_description : 'None'}`
    ).join('\n');

    const prompt = `You are an AI assistant for Operations managers. Generate a professional "Team Summary Report" based on the following employee daily logs:
${context}

Instructions:
1. Use professional Markdown formatting (bolding, bullet points, emojis).
2. Write a brief Executive Overview.
3. Add a "Real Work Completed" section that explicitly lists the specific tasks and achievements submitted by employees today.
4. Highlight which departments were most active.
5. Highlight any major issues or blockers that need attention. 
Keep it highly polished, enterprise-grade, and concise. Return only the report text, no preamble.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    // @ts-ignore
    const summary = response.content[0].text;

    return NextResponse.json({ summary });

  } catch (err: any) {
    console.error('AI Summary Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
