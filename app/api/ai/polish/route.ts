import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from '@/lib/auth';

// Ensure we only initialize if the key is present
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
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { tasksText } = await request.json();

    if (!tasksText || tasksText.length < 10) {
      return NextResponse.json({ error: 'Tasks text is too short' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback for local testing without key
      const suggestions = [
        `Successfully executed and completed the following tasks: ${tasksText}. Ensured all requirements were met.`,
        `Managed and finalized: ${tasksText}. All associated checks and balances have been performed.`,
        `Completed daily objectives including: ${tasksText}. Maintained standard operational protocols.`
      ];
      return NextResponse.json({ suggestions });
    }

    const prompt = `Rewrite the following daily work log entry into 3 distinct, clear, and highly professional variations. Preserve all the actual tasks mentioned. 
Return the variations strictly as a JSON array of strings, with no additional formatting, markdown, or preamble. 
Example format: ["Option 1", "Option 2", "Option 3"]

Raw Log:
${tasksText}`;

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
        `Processed tasks: ${tasksText}`,
        `Completed: ${tasksText}`
      ];
    }

    return NextResponse.json({ suggestions });

  } catch (err: any) {
    console.error('AI Polish Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
