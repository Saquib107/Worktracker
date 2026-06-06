import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from '@/lib/auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'MISSING_KEY',
});

export async function POST(request: Request) {
  try {
    // Basic Auth Check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { tasks, kra, status, issueContext } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback for local testing without key
      const suggestions = [
        `- Complete pending follow-ups for ${kra}.\n- Resolve issues reported: ${issueContext || 'None'}.`,
        `- Advance the next phase of today's tasks.\n- Coordinate with team on ${kra} deliverables.`,
        `- Review and finalize documentation for ${kra}.\n- Plan ahead for next week's milestones.`
      ];
      return NextResponse.json({ suggestions });
    }

    const prompt = `An employee named ${decoded.name} in ${decoded.department} completed these tasks today:
${tasks}

KRA: ${kra}
Status: ${status}
${issueContext ? `Issues encountered: ${issueContext}` : 'No issues.'}

Suggest 3 distinct, realistic plans for tomorrow (each 2-3 bullet points) based on their work today.
Return the variations strictly as a JSON array of strings, with no additional formatting, markdown, or preamble. 
Example format: ["- Task A\\n- Task B", "- Plan C\\n- Plan D", "- Goal E\\n- Goal F"]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });

    // @ts-ignore
    const responseText = response.content[0].text;
    
    let suggestions = [];
    try {
      suggestions = JSON.parse(responseText);
      if (!Array.isArray(suggestions)) throw new Error('Not an array');
    } catch (e) {
      // Fallback if parsing fails
      suggestions = [
        responseText.substring(0, 200) + '...',
        `- Follow up on ${kra} tasks.\n- Address any pending items.`,
        `- Continue work on ${kra}.\n- Prepare for upcoming deadlines.`
      ];
    }

    return NextResponse.json({ suggestions });

  } catch (err: any) {
    console.error('AI Suggest Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
