import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    // Optional: secure the endpoint (e.g. Vercel Cron sends a Bearer token or you can use a query param)
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Do not run on Sundays (0 = Sunday)
    if (new Date().getDay() === 0) {
      return NextResponse.json({ message: 'No reminders sent on Sundays.' });
    }
    // 1. Get all employees
    const { data: employees, error: empErr } = await supabase
      .from('pgepl_users')
      .select('id, name, email')
      .eq('role', 'employee');

    if (empErr) throw empErr;

    if (!employees || employees.length === 0) {
      return NextResponse.json({ message: 'No employees found.' });
    }

    // 2. Get today's entries
    const today = new Date().toISOString().split('T')[0];
    const { data: entries, error: entErr } = await supabase
      .from('pgepl_entries')
      .select('user_id')
      .eq('work_date', today);

    if (entErr) throw entErr;

    const submittedUserIds = entries ? entries.map((e: any) => e.user_id) : [];
    
    // 3. Find employees who haven't submitted
    const pendingEmployees = employees.filter((emp: any) => !submittedUserIds.includes(emp.id));

    if (pendingEmployees.length === 0) {
      return NextResponse.json({ message: 'All employees have submitted their reports.' });
    }

    // 4. Send Emails via Nodemailer
    // Provide a dummy fallback transporter if SMTP env vars are not set
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });

    const emailsSent = [];

    for (const emp of pendingEmployees) {
      if (!emp.email) continue;
      
      const mailOptions = {
        from: '"PGEPL Tracker" <noreply@pgepl.com>',
        to: emp.email,
        subject: 'Action Required: Submit Your Daily Work Report',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1a2e4a; padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">Daily Work Report Reminder</h2>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #334155;">Hi <strong>${emp.name}</strong>,</p>
              <p style="font-size: 16px; color: #334155;">This is an automated reminder that you have not yet submitted your daily work report for <strong>${today}</strong>.</p>
              <p style="font-size: 16px; color: #334155;">Please log into the PGEPL Tracker dashboard and submit your entry to ensure your work is recorded.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="background-color: #1a2e4a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Submit Report Now</a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0;">PGEPL Internal Management System</p>
            </div>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        emailsSent.push(emp.email);
      } catch (e) {
        console.error(`Failed to send email to ${emp.email}`, e);
        // We push anyway in development so the frontend can see who it "would" have sent to
        if (!process.env.SMTP_USER) emailsSent.push(emp.email + ' (Mock)');
      }
    }

    return NextResponse.json({ 
      message: `Reminders sent to ${emailsSent.length} employees.`, 
      sentTo: emailsSent 
    });

  } catch (err: any) {
    console.error('Cron Reminder Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
