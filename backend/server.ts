import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { AuctionEngine } from './auctionEngine';

// -- Configuration --
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Supabase Admin Client (Service Role) - In prod use env vars
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vjrxtdjbtbjoguuhguee.supabase.co', 
  process.env.SUPABASE_SERVICE_KEY || '' // This MUST be set in your environment variables
);

// Initialize Auction Engine (Purely via Supabase Realtime)
const auctionEngine = new AuctionEngine(supabase);

app.use(cors());
app.use(express.json() as any);

// -- Middleware: Auth Check --
const requireAuth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  // v2 auth check: Use getUser to validate the token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};

// -- ROUTES --

// 1. COMPANY SETUP
app.post('/api/company/setup', requireAuth, async (req: any, res) => {
  const { name, pan, gst } = req.body;
  
  const { data, error } = await supabase
    .from('companies')
    .insert([{ owner_id: req.user.id, name, pan_number: pan, gst_number: gst, status: 'PENDING' }])
    .select()
    .single();

  if (error) return res.status(400).json(error);
  
  // Update Profile
  await supabase.from('profiles').update({ company_id: data.id }).eq('id', req.user.id);
  
  res.json(data);
});

// 2. SCHEME MANAGEMENT
app.post('/api/schemes', requireAuth, async (req: any, res) => {
  const { name, chitValue, members, duration, monthlyDue } = req.body;
  
  const { data, error } = await supabase
    .from('schemes')
    .insert([{
      owner_id: req.user.id,
      name,
      chit_value: chitValue,
      members_count: members,
      duration_months: duration,
      monthly_due: monthlyDue,
      start_date: new Date().toISOString(),
      status: 'CREATED'
    }])
    .select()
    .single();

  if (error) return res.status(400).json(error);
  res.json(data);
});

// 3. SUBSCRIBER PROXY ONBOARDING (OFFLINE)
app.post('/api/subscribers/proxy', requireAuth, async (req: any, res) => {
  const { name, phone, schemeId, ticketNo } = req.body;

  // 1. Create Shadow Profile if not exists
  let { data: userProfile } = await supabase.from('profiles').select('id').eq('phone', phone).single();
  
  if (!userProfile) {
     const { data: newProfile } = await supabase.from('profiles').insert([{
         full_name: name,
         phone: phone,
         role: 'SUBSCRIBER',
         is_proxy: true
     }]).select().single();
     userProfile = newProfile;
  }

  // 2. Generate OTP (Mock)
  const otp = '1234'; 
  console.log(`[OTP] Sent to ${phone}: ${otp}`);

  res.json({ message: 'OTP sent', referenceId: 'REF-' + Date.now(), tempProfileId: userProfile?.id });
});

app.post('/api/subscribers/proxy/verify', requireAuth, async (req: any, res) => {
  const { otp, schemeId, ticketNo, tempProfileId } = req.body;
  
  if (otp !== '1234') return res.status(400).json({ error: 'Invalid OTP' });

  // 3. Create Enrollment
  const { data, error } = await supabase
    .from('scheme_enrollments')
    .insert([{
        scheme_id: schemeId,
        subscriber_id: tempProfileId,
        ticket_number: ticketNo,
        enrollment_type: 'OFFLINE',
        status: 'ACTIVE'
    }]);

  if (error) return res.status(400).json(error);
  res.json({ success: true });
});

// 4. COLLECTIONS & LEDGER (ATOMIC)
app.post('/api/collections/record', requireAuth, async (req: any, res) => {
  const { enrollmentId, amount, mode } = req.body;
  
  // 1. Transaction Record
  const { data: txn, error } = await supabase
    .from('transactions')
    .insert([{
        enrollment_id: enrollmentId,
        amount,
        mode,
        type: 'COLLECTION',
        status: 'POSTED',
        ledger_posted: true
    }])
    .select()
    .single();

  if (error) return res.status(400).json(error);

  res.json(txn);
});

httpServer.listen(PORT, () => {
  console.log(`TRUSTABLE Backend running on port ${PORT}`);
  console.log(`[System] Socket.IO disabled. Using Supabase Realtime exclusively.`);
});