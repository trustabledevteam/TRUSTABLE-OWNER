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
          ownerId: s.owner_id,
          auctionDuration: s.auction_duration_mins // Added
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
        security_type: schemeData.securityType,
        auction_duration_mins: safeInt(schemeData.auctionDuration) // Added
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
          ownerId: data.owner_id,
          auctionDuration: data.auction_duration_mins // Added
      };
  },

  onboardOfflineSubscriber: async (formData: any, ownerId: string, schemeId: string) => {
      // 1. Create/Insert Profile
      // Maps frontend form keys to DB columns
      const profileData = {
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          pan_number: formData.pan,
          aadhaar_number: formData.aadhaar,
          gender: formData.gender,
          dob: formData.dob || null,
          
          // Permanent Address
          perm_address_line1: formData.permAddress1,
          perm_address_line2: formData.permAddress2,
          perm_city: formData.permCity,
          perm_state: formData.permState,
          perm_pincode: formData.permPincode,
          
          // Present Address
          pres_address_line1: formData.presAddress1 || formData.permAddress1,
          pres_address_line2: formData.presAddress2 || formData.permAddress2,
          pres_city: formData.presCity || formData.permCity,
          pres_state: formData.presState || formData.permState,
          pres_pincode: formData.presPincode || formData.permPincode,
          
          // Employment
          employment_status: formData.empStatus,
          monthly_income: safeFloat(formData.monthlyIncome),
          employer_name: formData.employer,
          
          // Banking
          bank_name: formData.bankName,
          account_number: formData.accountNo,
          ifsc_code: formData.ifsc,
          account_type: formData.accountType,
          
          // Meta
          role: 'SUBSCRIBER',
          is_proxy: true,
          verification_status: 'APPROVED' // Offline users added by owner are pre-approved
      };

      const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();

      if (profileError) throw profileError;
      const subscriberId = profile.id;

      // 2. Create Enrollment
      // Determine Ticket Number (Auto-increment logic simulation or just use count + 1)
      const { count } = await supabase.from('scheme_enrollments').select('*', { count: 'exact', head: true }).eq('scheme_id', schemeId);
      const ticketNumber = (count || 0) + 1;

      const { data: enrollment, error: enrolError } = await supabase
          .from('scheme_enrollments')
          .insert([{
              scheme_id: schemeId,
              subscriber_id: subscriberId,
              ticket_number: ticketNumber,
              enrollment_type: 'OFFLINE',
              status: 'ACTIVE'
          }])
          .select()
          .single();

      if (enrolError) throw enrolError;

      // 3. Add Nominee (if applicable)
      if (formData.hasNominee) {
          const nomineeData = {
              enrollment_id: enrollment.id,
              name: formData.nomName,
              relationship: formData.nomRelation,
              dob: formData.nomDob || null,
              gender: formData.nomGender,
              phone: formData.nomPhone,
              email: formData.nomEmail,
              aadhaar_number: formData.nomAadhaar,
              pan_number: formData.nomPan,
              address: formData.nomAddressSame ? (formData.permAddress1 + ', ' + formData.permCity) : formData.nomAddress
          };
          const { error: nomError } = await supabase.from('scheme_nominees').insert([nomineeData]);
          if (nomError) console.error('Nominee insert error (non-fatal):', nomError);
      }

      // 4. Upload Documents
      const docsToUpload = [
          { file: formData.photoDoc, type: 'profile_photo' },
          { file: formData.panDoc, type: 'pan_card' },
          { file: formData.aadhaarDoc, type: 'aadhaar_card' },
          { file: formData.bankDoc, type: 'bank_proof' },
          { file: formData.addressProofDoc, type: 'address_proof' },
          { file: formData.agreementDoc, type: 'chit_agreement' }
      ];

      for (const doc of docsToUpload) {
          if (doc.file) {
              const fileExt = doc.file.name.split('.').pop();
              const filePath = `subscribers/${subscriberId}/${doc.type}_${Date.now()}.${fileExt}`;
              
              const { error: upError } = await supabase.storage.from('documents').upload(filePath, doc.file);
              if (!upError) {
                  await supabase.from('documents').insert({
                      owner_id: ownerId, // Uploaded by Owner
                      enrollment_id: enrollment.id, // Linked to this enrollment
                      document_type: doc.type,
                      file_path: filePath,
                      status: 'VERIFIED'
                  });
              } else {
                  console.error(`Failed to upload ${doc.type}`, upError);
              }
          }
      }

      return enrollment;
  },

  // ... (keep existing methods like getAuctions, updateAuction, etc. below)

  getAuctions: async (ownerId: string, schemeId?: string) => {
      let query = supabase.from('auctions').select(`
          *,
          auction_history, 
          schemes (
              name,
              chit_value,
              owner_id,
              auction_duration_mins 
          )
      `);
      
      if (schemeId) {
          query = query.eq('scheme_id', schemeId);
      } else {
          query = query.eq('schemes.owner_id', ownerId);
      }
        
      const { data, error } = await query.order('auction_date', { ascending: true }); // Order by date to get next auction first
        
      if (error) throw error;
      
      const validData = data.filter(a => a.schemes);

      return validData.map((a: any) => {
          const chitValue = a.schemes?.chit_value || 0;
          return {
            // All existing properties are the same
            id: a.id,
            schemeId: a.scheme_id,
            schemeName: a.schemes?.name,
            auctionNumber: a.auction_number,
            date: new Date(a.auction_date).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}), // Use a consistent format
            time: new Date(a.auction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            rawDate: new Date(a.auction_date),
            status: a.status, 
            winnerName: 'Pending', 
            winningBidAmount: a.winning_bid,
            dividendAmount: a.dividend_amount,
            payoutStatus: a.payout_status,
            minBid: chitValue * 0.05,
            maxBid: chitValue * 0.40,
            prizePool: chitValue,
            auctionDurationMins: a.schemes?.auction_duration_mins, // Pass duration for filtering
            
            // NEW: Add the history data to the object
            auction_history: a.auction_history 
          };
      });
  },

  updateAuction: async (auctionId: string, schemeId: string, updates: any) => {
      // Robust Date Construction
      if (!updates.date || !updates.time) {
          throw new Error("Date and Time are required.");
      }

      // Ensure YYYY-MM-DD and HH:MM format
      const localDate = new Date(`${updates.date}T${updates.time}:00`);
      
      if (isNaN(localDate.getTime())) {
          throw new Error("Invalid Date/Time format provided.");
      }

      const { error } = await supabase.from('auctions').update({
          auction_date: localDate.toISOString()
      }).eq('id', auctionId);
      
      if (error) throw error;
  },

  getSchemeCollectionData: async (ownerId: string, schemeId?: string) => {
      let query = supabase
        .from('scheme_enrollments')
        .select(`
            id, status, created_at, 
            profiles(full_name, phone), 
            transactions(amount, payment_date, mode, created_at),
            schemes!inner(start_date, due_day, monthly_due, grace_period_days, default_status_period, owner_id)
        `);
        
      if (schemeId) {
          // If a specific scheme is requested
          query = query.eq('scheme_id', schemeId);
      } else {
          // If viewing all collections, filter by the owner of the schemes
          query = query.eq('schemes.owner_id', ownerId);
      }
      
      const { data: enrollments, error } = await query;
      if (error) throw error;
      
      // We need scheme details for calculations. If no schemeId, we can't get a single scheme.
      // The logic in the component will need to handle this.
      // For now, we return the raw enrollments which contain nested scheme info.
      return enrollments || [];
  },

  getPendingPayouts: async (ownerId: string, schemeId?: string) => {
      let query = supabase
        .from('payouts')
        .select(`
            *, 
            auctions!inner(
                auction_number, 
                schemes!inner(owner_id)
            ), 
            scheme_enrollments!inner(
                id, 
                profiles!inner(full_name)
            )
        `)
        .eq('status', 'PENDING');

      if (schemeId) {
          query = query.eq('auctions.scheme_id', schemeId);
      } else {
          query = query.eq('auctions.schemes.owner_id', ownerId);
      }
      
      const { data, error } = await query.order('due_date', { ascending: true });

      if (error) throw error;

      return data.map((p: any) => ({
          id: p.id,
          auction_id: p.auction_id,
          enrollment_id: p.enrollment_id,
          amount: p.amount,
          due_date: new Date(p.due_date).toLocaleDateString(),
          status: p.status,
          winnerName: p.scheme_enrollments?.profiles?.full_name || 'Unknown',
          auctionNumber: p.auctions?.auction_number || 0
      }));
  },

  getPayoutContext: async (payoutId: string) => {
      // Get Payout + Auction + Scheme details for the wizard
      const { data: payout, error } = await supabase
          .from('payouts')
          .select(`*, auctions(*), scheme_enrollments(*, schemes(*))`)
          .eq('id', payoutId)
          .single();
      
      if (error) throw error;

      return {
          payout: payout,
          auction: payout.auctions,
          enrollment: payout.scheme_enrollments,
          scheme: payout.scheme_enrollments?.schemes
      };
  },

  savePayoutWizardCoreProgress: async (payoutId: string, step: number, mode: string, guarantorData: any) => {
      // In a real app, we might have a specific 'payout_wizard_state' table or columns
      // For this MVP, we update the main payout record with relevant fields
      
      const updates = {
          current_step: step,
          payout_mode: mode,
          guarantor_name: guarantorData.name,
          guarantor_phone: guarantorData.phone,
          guarantor_email: guarantorData.email,
          guarantor_income: safeFloat(guarantorData.income),
          guarantor_address: guarantorData.address
      };

      const { error } = await supabase.from('payouts').update(updates).eq('id', payoutId);
      if (error) throw error;
  },

  updatePayoutFields: async (payoutId: string, updates: any) => {
      const { error } = await supabase.from('payouts').update(updates).eq('id', payoutId);
      if (error) throw error;
  },

  uploadPayoutDocument: async (payoutId: string, userId: string, schemeId: string, enrollmentId: string, file: File, docType: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `payouts/${payoutId}/${docType}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('documents').upload(filePath, file); // Using 'documents' bucket general folder or specific
      
      if (error) throw error;

      // Also record in documents table
      await supabase.from('documents').insert({
          owner_id: userId,
          enrollment_id: enrollmentId,
          document_type: `PAYOUT_${docType.toUpperCase()}`,
          file_path: filePath,
          status: 'VERIFIED'
      });
  },

  finalizePayoutAndDistributeDividends: async (payoutId: string, transactionRef: string | null, esignId: string | null) => {
      // RPC call to handle the transaction atomically
      // If RPC not available, do client side updates
      const { error } = await supabase.rpc('finalize_payout', {
          p_payout_id: payoutId,
          p_txn_ref: transactionRef || esignId || 'AUTO_REF'
      });

      if (error) {
          // Fallback if RPC missing: Simple Update
          await supabase.from('payouts').update({
              status: 'COMPLETED',
              processed_at: new Date().toISOString()
          }).eq('id', payoutId);
      }
  },

  getSubscribers: async (schemeId?: string) => {
      let query = supabase.from('scheme_enrollments')
          .select(`
              id, 
              status, 
              created_at, 
              enrollment_type,
              profiles (
                  full_name, 
                  phone, 
                  email, 
                  employment_status, 
                  city,
                  verification_status
              ),
              transactions (amount)
          `);
      
      if (schemeId) {
          query = query.eq('scheme_id', schemeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((e: any) => {
          const totalPaid = e.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          // Note: totalInstallments needs scheme context, mocking for list view if schemeId not present
          return {
              id: e.id,
              name: e.profiles?.full_name || 'Unknown',
              joinDate: new Date(e.created_at).toLocaleDateString(),
              paymentsMade: Math.floor(totalPaid / 10000), // Approx logic
              totalInstallments: 20, // Mock or fetch scheme details
              lastPaymentDate: '2023-10-01',
              status: e.status === 'ACTIVE' ? 'Active' : 'Late',
              type: e.enrollment_type === 'OFFLINE' ? 'Offline' : 'Online',
              phone: e.profiles?.phone,
              email: e.profiles?.email
          };
      });
  },

  getSubscriberDetails: async (enrollmentId: string) => {
      const { data: enrollment, error } = await supabase
          .from('scheme_enrollments')
          .select(`*, profiles(*), schemes(*), scheme_nominees(*), transactions(*)`)
          .eq('id', enrollmentId)
          .single();
      
      if (error) throw error;

      return {
          enrollment: enrollment,
          profile: enrollment.profiles,
          scheme: enrollment.schemes,
          nominee: enrollment.scheme_nominees?.[0] || null,
          transactions: enrollment.transactions || []
      };
  },

  // Owner Function to set Proxy Limit
  setProxyBidLimit: async (auctionId: string, enrollmentId: string, maxAmount: number) => {
      const { error } = await supabase.from('proxy_bids').upsert({
          auction_id: auctionId,
          enrollment_id: enrollmentId,
          max_amount: maxAmount
      }, { onConflict: 'auction_id, enrollment_id' });
      
      if (error) throw error;
  },

  getOfflineSubscribersForProxy: async (schemeId: string) => {
      const { data, error } = await supabase
          .from('scheme_enrollments')
          .select('id, profiles(full_name)')
          .eq('scheme_id', schemeId)
          .eq('enrollment_type', 'OFFLINE')
          .eq('status', 'ACTIVE'); // Can only proxy for active users
          
      if (error) throw error;
      return data.map((d: any) => ({
          id: d.id,
          name: d.profiles?.full_name || 'Unknown'
      }));
  },

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
          maxAmount: p.max_amount,
          subscriberName: p.scheme_enrollments?.profiles?.full_name
      }));
  },

  getPendingRequests: async (userId: string) => {
      // 1. Get schemes owned by user
      const { data: schemes } = await supabase.from('schemes').select('id').eq('owner_id', userId);
      if (!schemes || schemes.length === 0) return [];
      const schemeIds = schemes.map(s => s.id);

      // 2. Get pending join requests for those schemes
      const { data: requests, error } = await supabase
          .from('scheme_join_requests')
          .select(`*, profiles:subscriber_id(*), schemes(name, chit_id)`)
          .in('scheme_id', schemeIds)
          .eq('status', 'PENDING');
          
      if (error) throw error;
      return requests;
  },

  processRequest: async (requestId: string, action: 'ACCEPT' | 'DENY') => {
      // If Accepted, create enrollment
      if (action === 'ACCEPT') {
          const { data: req } = await supabase.from('scheme_join_requests').select('*').eq('id', requestId).single();
          if (req) {
              const { count } = await supabase.from('scheme_enrollments').select('*', { count: 'exact', head: true }).eq('scheme_id', req.scheme_id);
              await supabase.from('scheme_enrollments').insert({
                  scheme_id: req.scheme_id,
                  subscriber_id: req.subscriber_id,
                  ticket_number: (count || 0) + 1,
                  enrollment_type: 'ONLINE',
                  status: 'ACTIVE'
              });
          }
      }
      
      await supabase.from('scheme_join_requests').update({ status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' }).eq('id', requestId);
  },

  // Document Management
  getAllDocuments: async (schemeId?: string) => {
      let query = supabase.from('documents')
          .select('*, scheme_enrollments(id, profiles(full_name, id))')
          .eq('status', 'APPROVED'); // Or UPLOADED

      if (schemeId) {
          // Filter by enrollments in this scheme
          // This is complex in Supabase simple query, easier to filter client side or use RPC
          // For MVP, fetch all and filter
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((d: any) => ({
          id: d.id,
          subscriberUid: d.scheme_enrollments?.profiles?.id || d.owner_id,
          subscriberName: d.scheme_enrollments?.profiles?.full_name || 'System',
          name: d.file_path.split('/').pop(),
          uploadedOn: new Date(d.created_at).toLocaleDateString(),
          size: '2 MB', // Mock
          category: d.document_type,
          filePath: d.file_path
      }));
  },

  downloadDocument: async (filePath: string) => {
      // Determine bucket based on path prefix
      let bucket = 'documents';
      if (filePath.startsWith('schemes')) bucket = 'scheme-verification-doc';
      if (filePath.startsWith('owner-kyc') || filePath.startsWith('company')) bucket = 'company-onboarding-doc';

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw error;
      return data;
  },

  getPreviewUrl: async (filePath: string) => {
      let bucket = 'documents';
      if (filePath.startsWith('schemes')) bucket = 'scheme-verification-doc';
      if (filePath.startsWith('owner-kyc') || filePath.startsWith('company')) bucket = 'company-onboarding-doc';
      
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
  },

  // -- PUBLIC METHODS FOR NEW JOIN FLOW --
  applyForScheme: async (schemeId: string, formData: any) => {
      // 1. Create Profile (Pending Verification)
      const { data: profile, error: pError } = await supabase.from('profiles').upsert([{
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: 'SUBSCRIBER',
          verification_status: 'PENDING',
          employment_status: formData.occupation,
          monthly_income: safeFloat(formData.income),
          pan_number: formData.pan,
          aadhaar_number: formData.aadhaar
      }], { onConflict: 'phone' }).select().single();

      if (pError) throw pError;

      // 2. Create Join Request
      const { error: rError } = await supabase.from('join_requests').insert([{
          scheme_id: schemeId,
          subscriber_id: profile.id,
          status: 'PENDING'
      }]);

      if (rError) throw rError;

      return profile.id;
  },

  uploadOnlineSubscriberDoc: async (subscriberId: string, schemeId: string, file: File, type: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `applicants/${schemeId}/${subscriberId}/${type}.${fileExt}`;
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (error) throw error;
      
      // We don't link to enrollment yet as they aren't enrolled. 
      // Link to owner_id (subscriber)
      await supabase.from('documents').insert({
          owner_id: subscriberId, 
          document_type: type,
          file_path: filePath,
          status: 'SUBMITTED'
      });
  }
};