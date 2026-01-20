import { supabase } from './supabaseClient';
import { Auction, Payout, Scheme, SchemeJoinRequest, Subscriber, ProxyBid } from '../types';

export interface DashboardStats {
  totalSchemes: number;
  monthlyProfit: number;
  totalSubscribers: number;
  activeLeads: number;
  salesData: { name: string; value: number }[];
}

// Helper to safely parse floats
const safeFloat = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

// Helper to safely parse ints
const safeInt = (val: any) => {
    const parsed = parseInt(val);
    return isNaN(parsed) ? 0 : parsed;
};

export const api = {
  getDashboardStats: async (userId: string): Promise<DashboardStats> => {
    return {
        totalSchemes: 0,
        monthlyProfit: 0,
        totalSubscribers: 0,
        activeLeads: 0,
        salesData: []
    };
  },

  getSchemes: async (userId?: string) => {
      let query = supabase.from('schemes').select('*, scheme_enrollments(count)');
      if (userId) query = query.eq('owner_id', userId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      return data.map((s: any) => ({
          id: s.id,
          name: s.name,
          chitId: s.chit_id,
          chitValue: s.chit_value,
          monthlyDue: s.monthly_due,
          duration: s.duration_months,
          membersCount: s.members_count,
          subscribersCount: s.scheme_enrollments?.[0]?.count || 0,
          startDate: s.start_date,
          status: s.status,
          auctionDay: s.auction_day,
          psoNumber: s.pso_number,
          discountMin: s.discount_min,
          discountMax: s.discount_max,
          ownerId: s.owner_id
      }));
  },

  createScheme: async (schemeData: any, userId: string) => {
    const { data: newScheme, error } = await supabase
      .from('schemes')
      .insert([{
        owner_id: userId,
        name: schemeData.name,
        chit_id: schemeData.chitId,
        pso_number: schemeData.psoNumber, 
        chit_value: safeFloat(schemeData.chitValue),
        members_count: safeInt(schemeData.membersCount),
        duration_months: safeInt(schemeData.duration),
        monthly_due: safeFloat(schemeData.monthlyDue),
        foreman_commission: safeFloat(schemeData.commission),
        start_date: schemeData.startDate,
        status: 'PENDING_APPROVAL', 
        auction_day: safeInt(schemeData.auctionDay),
        due_day: safeInt(schemeData.dueDay),
        auction_freq: 'Monthly',
        discount_min: safeFloat(schemeData.discountMin),
        discount_max: safeFloat(schemeData.discountMax),
        grace_period_days: safeInt(schemeData.gracePeriod),
        late_fee: safeFloat(schemeData.lateFee),
        default_status_period: safeInt(schemeData.defaultPeriod),
        security_type: schemeData.securityType
      }])
      .select()
      .single();

    if (error) throw error;
    
    return newScheme;
  },

  uploadSchemeDoc: async (schemeId: string, userId: string, file: File, docType: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `schemes/${schemeId}/${docType}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('scheme-verification-doc').upload(filePath, file);
      if (error) throw error;
      
      await supabase.from('documents').insert({
          owner_id: userId,
          document_type: docType,
          file_path: filePath,
          status: 'UPLOADED'
      });
  },

  getSchemeDetails: async (id: string) => {
      const { data, error } = await supabase.from('schemes').select('*').eq('id', id).single();
      if (error) throw error;
      
      const { count } = await supabase.from('scheme_enrollments').select('*', { count: 'exact', head: true }).eq('scheme_id', id);

      return {
          id: data.id,
          name: data.name,
          chitId: data.chit_id,
          chitValue: data.chit_value,
          monthlyDue: data.monthly_due,
          duration: data.duration_months,
          membersCount: data.members_count,
          subscribersEnrolled: count || 0,
          membersTotal: data.members_count,
          startDate: data.start_date,
          status: data.status,
          auctionDay: data.auction_day,
          psoNumber: data.pso_number,
          discountMin: data.discount_min,
          discountMax: data.discount_max,
          ownerId: data.owner_id
      };
  },

  getAuctions: async (schemeId: string) => {
      // Join with schemes to get name AND chit_value for the prize pool
      const { data, error } = await supabase
        .from('auctions')
        .select(`*, schemes(name, chit_value)`)
        .eq('scheme_id', schemeId)
        .order('auction_number');
        
      if (error) throw error;
      
      return data.map((a: any) => {
          const chitValue = a.schemes?.chit_value || 0;
          return {
            id: a.id,
            schemeId: a.scheme_id,
            schemeName: a.schemes?.name,
            auctionNumber: a.auction_number,
            date: new Date(a.auction_date).toLocaleDateString(),
            time: new Date(a.auction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            rawDate: new Date(a.auction_date),
            status: a.status, 
            winnerName: 'Pending', 
            winningBidAmount: a.winning_bid,
            dividendAmount: a.dividend_amount,
            payoutStatus: a.payout_status,
            // Calculate dynamic limits based on 5% and 40% of chit value
            minBid: chitValue * 0.05,
            maxBid: chitValue * 0.40,
            prizePool: chitValue
          };
      });
  },

  updateAuction: async (auctionId: string, schemeId: string, updates: any) => {
      // Construct Date object in local time
      // This interprets "2023-10-25T22:08:00" in the user's browser timezone
      const localDate = new Date(`${updates.date}T${updates.time}:00`);
      
      // Convert to ISO string (UTC) for storage
      // This ensures 22:08 Local is saved as corresponding UTC
      const { error } = await supabase.from('auctions').update({
          auction_date: localDate.toISOString()
      }).eq('id', auctionId);
      if (error) throw error;
  },

  getSchemeCollectionData: async (schemeId: string) => {
      const { data: scheme } = await supabase.from('schemes').select('*').eq('id', schemeId).single();
      const { data: enrollments } = await supabase
        .from('scheme_enrollments')
        .select(`id, status, created_at, profiles(full_name, phone), transactions(amount, payment_date, mode, created_at)`)
        .eq('scheme_id', schemeId);
        
      return {
          scheme,
          subscribers: enrollments || []
      };
  },

  getPendingPayouts: async (schemeId: string) => {
      const { data, error } = await supabase
        .from('payouts')
        .select(`*, auctions(auction_number), scheme_enrollments(profiles(full_name))`)
        .eq('status', 'PENDING');
      if (error) throw error;
      return data.map((p: any) => ({
          id: p.id,
          auction_id: p.auction_id,
          enrollment_id: p.enrollment_id,
          amount: p.amount,
          due_date: p.due_date,
          status: p.status,
          winnerName: p.scheme_enrollments?.profiles?.full_name,
          auctionNumber: p.auctions?.auction_number
      }));
  },

  getPayoutContext: async (payoutId: string) => {
      const { data: payout, error } = await supabase
        .from('payouts')
        .select(`*, auctions(*), scheme_enrollments(*, profiles(*))`)
        .eq('id', payoutId)
        .single();
      if (error) throw error;
      const { data: scheme } = await supabase
        .from('schemes')
        .select('*')
        .eq('id', payout.auctions.scheme_id)
        .single();
      return {
          payout: { 
              ...payout, 
              winnerName: payout.scheme_enrollments?.profiles?.full_name,
              enrollment_id: payout.enrollment_id,
              current_step: payout.current_step,
              payout_mode: payout.payout_mode,
              guarantor_name: payout.guarantor_name,
              guarantor_phone: payout.guarantor_phone,
              guarantor_email: payout.guarantor_email,
              guarantor_income: payout.guarantor_income,
              guarantor_address: payout.guarantor_address,
              foreman_esign_id: payout.foreman_esign_id
          },
          auction: payout.auctions,
          scheme
      };
  },

  savePayoutWizardCoreProgress: async (payoutId: string, step: number, mode: string, guarantorData: any) => {
      const { error } = await supabase
        .from('payouts')
        .update({
            current_step: step,
            payout_mode: mode,
            guarantor_name: guarantorData.name,
            guarantor_phone: guarantorData.phone,
            guarantor_email: guarantorData.email,
            guarantor_income: safeFloat(guarantorData.income),
            guarantor_address: guarantorData.address
        })
        .eq('id', payoutId);
      if (error) throw error;
  },

  updatePayoutFields: async (payoutId: string, updates: any) => {
      const { error } = await supabase.from('payouts').update(updates).eq('id', payoutId);
      if (error) throw error;
  },

  uploadPayoutDocument: async (payoutId: string, userId: string, schemeId: string, enrollmentId: string, file: File, docType: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `payouts/${payoutId}/${docType}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
          .from('payout-documents')
          .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
  },

  finalizePayoutAndDistributeDividends: async (payoutId: string, transactionRef: string | null, esignId: string | null) => {
      const { error } = await supabase.rpc('process_payout_completion', { 
          p_payout_id: payoutId, 
          p_transaction_ref: transactionRef 
      });
      if (error) throw error;
  },

  getSubscribers: async (schemeId?: string) => {
      let query = supabase.from('scheme_enrollments')
        .select(`
            id, 
            status, 
            created_at, 
            scheme_id,
            enrollment_type,
            profiles:subscriber_id (full_name, phone, email, city, occupation)
        `);
      
      if (schemeId) {
          query = query.eq('scheme_id', schemeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((item: any) => ({
          id: item.id, // This is enrollment ID
          schemeId: item.scheme_id,
          name: item.profiles?.full_name || 'Unknown',
          joinDate: new Date(item.created_at).toLocaleDateString(),
          paymentsMade: 0, 
          totalInstallments: 0, 
          lastPaymentDate: '-',
          status: item.status,
          occupation: item.profiles?.occupation,
          location: item.profiles?.city,
          phone: item.profiles?.phone,
          email: item.profiles?.email,
          type: item.enrollment_type === 'OFFLINE' ? 'Offline' : 'Online'
      }));
  },

  // Get eligible offline subscribers for proxy bidding
  getOfflineSubscribersForProxy: async (schemeId: string) => {
      const { data, error } = await supabase
          .from('scheme_enrollments')
          .select(`id, profiles(full_name)`)
          .eq('scheme_id', schemeId)
          .eq('enrollment_type', 'OFFLINE')
          .eq('status', 'ACTIVE'); // Only active, non-prized members
      
      if (error) throw error;
      return data.map((d: any) => ({
          id: d.id, // Enrollment ID
          name: d.profiles?.full_name || 'Unknown'
      }));
  },

  // Set or Update a Proxy Bid Limit
  setProxyBidLimit: async (auctionId: string, enrollmentId: string, maxAmount: number) => {
      // Using upsert to handle both create and update
      const { error } = await supabase
          .from('proxy_bids')
          .upsert({
              auction_id: auctionId,
              enrollment_id: enrollmentId,
              max_amount: maxAmount
          }, { onConflict: 'auction_id,enrollment_id' });
          
      if (error) throw error;
  },

  // Get active proxies for an auction
  getAuctionProxies: async (auctionId: string) => {
      const { data, error } = await supabase
          .from('proxy_bids')
          .select('*, scheme_enrollments(profiles(full_name))')
          .eq('auction_id', auctionId);
          
      if (error) throw error;
      return data.map((p: any) => ({
          id: p.id,
          auctionId: p.auction_id,
          enrollmentId: p.enrollment_id,
          subscriberName: p.scheme_enrollments?.profiles?.full_name,
          maxAmount: p.max_amount
      }));
  },

  onboardOfflineSubscriber: async (form: any, userId: string, schemeId: string) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
            full_name: form.name,
            phone: form.phone,
            email: form.email,
            pan_number: form.pan,
            aadhaar_number: form.aadhaar,
            address: form.permAddress1 + ", " + form.permCity,
            city: form.permCity,
            state: form.permState,
            role: 'SUBSCRIBER',
            is_verified: true 
        })
        .select()
        .single();
      
      if (profileError) throw profileError;

      const { error: enrollError } = await supabase
        .from('scheme_enrollments')
        .insert({
            scheme_id: schemeId,
            subscriber_id: profile.id,
            status: 'ACTIVE',
            enrollment_type: 'OFFLINE'
        });
        
      if (enrollError) throw enrollError;
  },

  getSubscriberDetails: async (enrollmentId: string) => {
      const { data: enrollment, error } = await supabase
        .from('scheme_enrollments')
        .select(`*, scheme:scheme_id(*), profiles:subscriber_id(*)`)
        .eq('id', enrollmentId)
        .single();
      
      if (error || !enrollment) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', enrollmentId)
            .single();
            
          if (profileError) throw profileError;
          return {
              enrollment: { subscriber_id: profile.id, status: 'Active', created_at: null },
              profile: profile,
              scheme: null,
              nominee: null,
              transactions: []
          };
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('enrollment_id', enrollmentId);

      return {
          enrollment,
          profile: enrollment.profiles,
          scheme: enrollment.scheme,
          nominee: null,
          transactions: transactions || []
      };
  },

  getPendingRequests: async (userId: string) => {
      const { data: schemes } = await supabase.from('schemes').select('id').eq('owner_id', userId);
      const schemeIds = schemes?.map(s => s.id) || [];
      
      if (schemeIds.length === 0) return [];

      const { data, error } = await supabase
        .from('join_requests')
        .select(`*, profiles:subscriber_id(*), schemes(id, name, chit_id)`)
        .in('scheme_id', schemeIds)
        .eq('status', 'PENDING');
        
      if (error) throw error;
      
      return data.map((r: any) => ({
          id: r.id,
          status: r.status,
          requested_at: r.created_at,
          profile: r.profiles, 
          schemes: r.schemes
      }));
  },

  processRequest: async (requestId: string, action: 'ACCEPT' | 'DENY') => {
      if (action === 'ACCEPT') {
          const { error } = await supabase.rpc('approve_join_request', { request_id: requestId });
          if (error) throw error;
      } else {
          const { error } = await supabase.from('join_requests').update({ status: 'REJECTED' }).eq('id', requestId);
          if (error) throw error;
      }
  },

  getAllDocuments: async (schemeId?: string) => {
      const { data, error } = await supabase.from('documents').select('*'); 
      if (error) throw error;
      
      return data.map((d: any) => ({
          id: d.id,
          subscriberUid: d.owner_id, 
          subscriberName: 'Unknown', 
          name: d.document_type,
          uploadedOn: new Date(d.created_at).toLocaleDateString(),
          size: 'Unknown',
          category: 'KYC', 
          filePath: d.file_path
      }));
  },

  downloadDocument: async (path: string) => {
      const { data, error } = await supabase.storage.from('company-onboarding-doc').download(path); 
      if (error) throw error;
      return data;
  },

  getPreviewUrl: async (path: string) => {
      const { data } = supabase.storage.from('company-onboarding-doc').getPublicUrl(path);
      return data.publicUrl;
  },

  applyForScheme: async (schemeId: string, form: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to apply");

      await supabase.from('profiles').update({
          full_name: form.name,
          phone: form.phone,
          occupation: form.occupation,
          monthly_income: safeFloat(form.income),
          pan_number: form.pan,
          aadhaar_number: form.aadhaar
      }).eq('id', user.id);

      const { error } = await supabase.from('join_requests').insert({
          scheme_id: schemeId,
          subscriber_id: user.id,
          status: 'PENDING'
      });
      
      if (error) throw error;
      return user.id;
  },

  uploadOnlineSubscriberDoc: async (subscriberId: string, schemeId: string, file: File, docType: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `subscribers/${subscriberId}/${docType}.${fileExt}`;
      const { error } = await supabase.storage.from('subscriber-docs').upload(filePath, file);
      if (error) throw error;
  }
};