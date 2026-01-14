
import { Scheme, Auction, Payout, Subscriber, ProxyBid, AppSubscriber, SchemeJoinRequest } from '../types';
import { supabase } from './supabaseClient';

// --- Types ---
export interface DashboardStats {
  totalSchemes: number;
  monthlyProfit: number;
  totalSubscribers: number;
  activeLeads: number;
  salesData: { name: string; value: number }[];
}

// --- HELPER: Status Calculation Logic ---
const calculateDynamicStatus = (scheme: any, transactions: any[]): 'Active' | 'Late' | 'Default' => {
    if (!scheme || !scheme.start_date) return 'Active';

    const start = new Date(scheme.start_date);
    if (isNaN(start.getTime())) return 'Active';

    const today = new Date();
    const dueDay = scheme.due_day || 5;
    const monthlyDue = scheme.monthly_due || 0;
    const gracePeriod = scheme.grace_period_days || 3;
    const defaultPeriod = scheme.default_status_period || 90;

    // Calculate Total Paid
    const totalPaid = transactions.reduce((acc: number, t: any) => acc + t.amount, 0);

    // 1. Determine Current Cycle Index (Months since start)
    let monthDiff = (today.getFullYear() - start.getFullYear()) * 12;
    monthDiff -= start.getMonth();
    monthDiff += today.getMonth();
    
    // Max Installments Due = Month Diff + 1 (if today > due_day)
    const currentCycleIndex = today.getDate() > dueDay ? monthDiff + 1 : monthDiff;

    // Outstanding
    const paidInstallmentsCount = Math.floor(totalPaid / monthlyDue);
    const pendingInstallments = Math.max(0, currentCycleIndex - paidInstallmentsCount);

    if (pendingInstallments === 0) {
        return 'Active';
    } else {
        const missedMonthDate = new Date(start);
        missedMonthDate.setMonth(start.getMonth() + paidInstallmentsCount);
        missedMonthDate.setDate(dueDay);
        
        if (missedMonthDate < today) {
            const diffTime = Math.abs(today.getTime() - missedMonthDate.getTime());
            const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (overdueDays > (gracePeriod + defaultPeriod)) {
                return 'Default';
            } else if (overdueDays > 0) {
                return 'Late'; 
            }
        }
    }
    return 'Active';
};

export const api = {
  // --- DASHBOARD ---
  getDashboardStats: async (userId: string): Promise<DashboardStats> => {
    try {
      if (!userId) {
          return { totalSchemes: 0, monthlyProfit: 0, totalSubscribers: 0, activeLeads: 0, salesData: [] };
      }

      const [schemesRes, enrollmentsRes] = await Promise.all([
        // 1. Count Schemes owned by ME
        supabase.from('schemes')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId),
        
        // 2. Count Enrollments where the Scheme is owned by ME
        supabase.from('scheme_enrollments')
            .select('id, schemes!inner(owner_id)', { count: 'exact', head: true })
            .eq('schemes.owner_id', userId)
      ]);

      return {
        totalSchemes: schemesRes.count || 0,
        monthlyProfit: 89000, 
        totalSubscribers: enrollmentsRes.count || 0, 
        activeLeads: 40,
        salesData: [{ name: '2024', value: 90 }]
      };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { totalSchemes: 0, monthlyProfit: 0, totalSubscribers: 0, activeLeads: 0, salesData: [] };
    }
  },

  // --- SCHEMES ---
  getSchemes: async (userId?: string): Promise<Scheme[]> => {
    if (!userId) return [];

    try {
        const { data, error } = await supabase
          .from('schemes')
          .select('*, scheme_enrollments(count)') 
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
            return data.map((s: any) => {
              let endDate = '-';
              if (s.start_date && s.duration_months) {
                  const start = new Date(s.start_date);
                  if (!isNaN(start.getTime())) {
                      const end = new Date(start);
                      end.setMonth(start.getMonth() + s.duration_months);
                      endDate = end.toLocaleDateString('en-GB');
                  }
              }

              return {
                id: s.id,
                name: s.name,
                chitValue: s.chit_value,
                monthlyDue: s.monthly_due,
                duration: s.duration_months,
                subscribersCount: s.scheme_enrollments?.[0]?.count || 0, 
                startDate: s.start_date,
                endDate: endDate,
                auctionDay: s.auction_day,
                status: s.status,
                membersCount: s.members_count,
                psoNumber: s.pso_number
              };
            });
        }
        return [];
    } catch (err) {
        console.error('Error fetching schemes:', err);
        return [];
    }
  },

  createScheme: async (schemeData: any, userId: string) => {
    // 1. Create the Scheme
    const { data: newScheme, error } = await supabase
      .from('schemes')
      .insert([{
        owner_id: userId,
        name: schemeData.name,
        chit_id: schemeData.chitId,
        pso_number: schemeData.pso_number, 
        chit_value: parseFloat(schemeData.chitValue),
        members_count: parseInt(schemeData.membersCount),
        duration_months: parseInt(schemeData.duration),
        monthly_due: parseFloat(schemeData.monthlyDue),
        foreman_commission: parseFloat(schemeData.commission),
        start_date: schemeData.startDate,
        status: 'PENDING_APPROVAL', 
        auction_day: parseInt(schemeData.auctionDay),
        due_day: parseInt(schemeData.dueDay),
        auction_freq: 'Monthly',
        discount_min: parseFloat(schemeData.discountMin),
        discount_max: parseFloat(schemeData.discountMax),
        grace_period_days: parseInt(schemeData.gracePeriod),
        late_fee: parseFloat(schemeData.lateFee),
        default_status_period: parseInt(schemeData.defaultPeriod),
        security_type: schemeData.securityType
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Auto-Schedule First Auction
    // Logic: If Start Date is Jan 28, and Auction Day is 5.
    // Target is Jan 5. Jan 5 < Jan 28. So First Auction is Feb 5.
    try {
        const start = new Date(schemeData.startDate);
        const auctionDay = parseInt(schemeData.auctionDay);
        
        // Initialize date to the auction day of the start month
        let firstAuctionDate = new Date(start.getFullYear(), start.getMonth(), auctionDay);
        // Set default time (e.g., 2 PM)
        firstAuctionDate.setHours(14, 0, 0, 0);

        // If the calculated auction date is earlier than the scheme start date, move to next month
        if (firstAuctionDate.getTime() < start.getTime()) {
            firstAuctionDate.setMonth(firstAuctionDate.getMonth() + 1);
        }

        await supabase.from('auctions').insert([{
            scheme_id: newScheme.id,
            auction_number: 1,
            auction_date: firstAuctionDate.toISOString(),
            status: 'UPCOMING'
        }]);
    } catch (auctionError) {
        console.error("Failed to auto-schedule first auction:", auctionError);
        // Don't throw here, as scheme creation was successful. Just log it.
    }

    return newScheme;
  },

  uploadSchemeDoc: async (schemeId: string, userId: string, file: File, docType: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${schemeId}/${docType}_${Date.now()}.${fileExt}`;
      const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      
      const { error: uploadError } = await supabase.storage.from('scheme-verification-doc').upload(filePath, file);
      if (uploadError) throw uploadError;

      await supabase.from('documents').insert([{
          owner_id: userId, scheme_id: schemeId, document_type: docType, document_name: file.name,
          file_path: filePath, file_size: fileSize, category: 'COMPLIANCE', status: 'SUBMITTED'
      }]);
  },

  getSchemeDetails: async (id: string) => {
    const { data, error } = await supabase.from('schemes').select('*, scheme_enrollments(count)').eq('id', id).single();
    if (error) return null;
    return {
      id: data.id, name: data.name, chitId: data.chit_id, psoNumber: data.pso_number,
      chitValue: data.chit_value, monthlyDue: data.monthly_due, duration: data.duration_months,
      membersTotal: data.members_count, subscribersEnrolled: data.scheme_enrollments?.[0]?.count || 0,
      startDate: data.start_date, auctionDay: data.auction_day, status: data.status, commission: data.foreman_commission
    };
  },

  // --- COLLECTION & PAYOUT ---
  getSchemeCollectionData: async (schemeId: string) => {
      try {
          const { data: scheme } = await supabase.from('schemes').select('id, name, monthly_due, due_day, start_date, late_fee, grace_period_days, default_status_period').eq('id', schemeId).single();
          if (!scheme) throw new Error("Scheme not found");
          const { data: enrollments } = await supabase.from('scheme_enrollments').select(`id, ticket_number, status, profiles:subscriber_id (id, full_name, phone)`).eq('scheme_id', schemeId);
          if (!enrollments) return { scheme, subscribers: [] };
          const enrollmentIds = enrollments.map(e => e.id);
          const { data: transactions } = await supabase.from('transactions').select('enrollment_id, amount, created_at, mode, payment_date').in('enrollment_id', enrollmentIds).eq('status', 'COMPLETED').order('created_at', { ascending: false });
          const subscribers = enrollments.map(e => ({ ...e, transactions: transactions?.filter(t => t.enrollment_id === e.id) || [] }));
          return { scheme, subscribers };
      } catch (err) { console.error("Collection fetch error:", err); return null; }
  },

  getPendingPayouts: async (schemeId: string): Promise<Payout[]> => {
    const { data, error } = await supabase.from('payouts').select(`
        id, amount, due_date, status, enrollment_id, auction_id,
        payout_mode, current_step, guarantor_name, guarantor_phone,
        guarantor_email, guarantor_income, guarantor_address, foreman_esign_id, processed_at,
        auctions ( auction_number ),
        scheme_enrollments ( profiles ( full_name ) )
    `).eq('auctions.scheme_id', schemeId).in('status', ['PENDING', 'DOCS_UPLOADED', 'SIGNATURE_PENDING', 'PAYMENT_PROCESSING']).order('created_at', { ascending: true });
    if (error) { console.error("Error fetching pending payouts:", error); return []; }
    return data.map((p: any) => ({
        id: p.id, amount: p.amount, due_date: p.due_date, status: p.status, enrollment_id: p.enrollment_id, auction_id: p.auction_id,
        auctionNumber: p.auctions.auction_number, winnerName: p.scheme_enrollments.profiles.full_name,
        payout_mode: p.payout_mode,
        current_step: p.current_step,
        guarantor_name: p.guarantor_name,
        guarantor_phone: p.guarantor_phone,
        guarantor_email: p.guarantor_email,
        guarantor_income: p.guarantor_income,
        guarantor_address: p.guarantor_address,
        foreman_esign_id: p.foreman_esign_id,
        processed_at: p.processed_at,
    }));
  },

  getPayoutContext: async (payoutId: string) => {
      const { data: payout, error: payoutError } = await supabase.from('payouts').select(`
        *, 
        auction:auction_id(*), 
        enrollment:enrollment_id(*, profile:subscriber_id(*))
      `).eq('id', payoutId).single();
      if(payoutError) throw payoutError;
      const { data: scheme, error: schemeError } = await supabase.from('schemes').select('*').eq('id', payout.auction.scheme_id).single();
      if(schemeError) throw schemeError;
      const { data: docs, error: docsError } = await supabase.from('documents').select('document_type, file_path').eq('enrollment_id', payout.enrollment.id).in('document_type', ['aadhaar', 'addressProof']);
      return { payout, auction: payout.auction, scheme, winner: payout.enrollment, kycDocs: docs || [] };
  },

  uploadPayoutDocument: async (payoutId: string, userId: string, schemeId: string, enrollmentId: string, file: File, docType: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${payoutId}/${docType}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('payout-documents').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { error: insertError } = await supabase.from('documents').insert([{
        owner_id: userId, scheme_id: schemeId, enrollment_id: enrollmentId, payout_id: payoutId,
        document_type: docType, document_name: file.name, file_path: filePath,
        file_size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        category: 'PAYOUT', status: 'SUBMITTED'
    }]);
    if(insertError) throw insertError;
  },

  savePayoutWizardCoreProgress: async (payoutId: string, step: number, mode: 'ONLINE' | 'OFFLINE', guarantorData: any | null) => {
      const { error } = await supabase.rpc('save_payout_progress', {
          p_payout_id: payoutId,
          p_step: step,
          p_mode: mode,
          p_guarantor_data: guarantorData,
      });
      if (error) {
          console.error("Error saving payout core progress via RPC:", error);
          throw error;
      }
  },

  updatePayoutFields: async (payoutId: string, updates: Partial<Payout>) => {
      const { error } = await supabase.from('payouts').update(updates).eq('id', payoutId);
      if (error) {
          console.error("Error updating payout fields directly:", error);
          throw error;
      }
  },

  finalizePayoutAndDistributeDividends: async (payoutId: string, transactionRef: string | null, foremanEsignId: string | null) => {
      const { error } = await supabase.rpc('finalize_payout_and_dividends', {
          p_payout_id: payoutId,
          p_transaction_reference: transactionRef,
          p_foreman_esign_id: foremanEsignId
      });
      if (error) {
          console.error("Error finalizing payout and distributing dividends:", error);
          throw error;
      }
  },

  getSubscribers: async (schemeId?: string): Promise<Subscriber[]> => {
    try {
      let query = supabase.from('scheme_enrollments').select(`id, scheme_id, created_at, status, enrollment_type, profiles:subscriber_id (id, full_name, phone, email, is_proxy), schemes:scheme_id (duration_months, start_date, due_day, monthly_due, grace_period_days, default_status_period)`);
      if(schemeId) query = query.eq('scheme_id', schemeId);
      const { data, error } = await query;
      if (error || !data) return [];
      const enrollmentIds = data.map(e => e.id);
      const { data: transactions } = await supabase.from('transactions').select('enrollment_id, created_at, amount, payment_date').in('enrollment_id', enrollmentIds).eq('status', 'COMPLETED'); 
      
      return data.map((row: any) => {
          // Calculate Last Payment Date Safely
          let lastPaymentDate = 'N/A';
          const subTransactions = transactions?.filter(t => t.enrollment_id === row.id) || [];
          
          if (subTransactions.length > 0) {
              const timestamps = subTransactions.map((t: any) => {
                  const d = new Date(t.payment_date || t.created_at);
                  return !isNaN(d.getTime()) ? d.getTime() : 0;
              });
              const maxTime = Math.max(0, ...timestamps);
              if (maxTime > 0) {
                  lastPaymentDate = new Date(maxTime).toISOString().split('T')[0];
              }
          }

          // Safe Join Date
          let joinDate = '-';
          const createdAt = new Date(row.created_at);
          if (!isNaN(createdAt.getTime())) {
              joinDate = createdAt.toISOString().split('T')[0];
          }

          return {
              id: row.id, 
              schemeId: row.scheme_id, 
              name: row.profiles?.full_name || 'Unknown', 
              phone: row.profiles?.phone, 
              email: row.profiles?.email,
              joinDate: joinDate,
              paymentsMade: subTransactions.length, 
              totalInstallments: row.schemes?.duration_months || 0, 
              lastPaymentDate: lastPaymentDate,
              status: calculateDynamicStatus(row.schemes, subTransactions), 
              occupation: 'Unknown', 
              location: 'Unknown',
              type: row.enrollment_type === 'OFFLINE' || row.profiles?.is_proxy ? 'Offline' : 'Online'
          };
      });
    } catch(e) { console.error(e); return []; }
  },

  getSubscriberDetails: async (enrollmentId: string) => {
      try {
          const { data: enrollment, error: enrollError } = await supabase.from('scheme_enrollments').select(`*, profiles:subscriber_id (*), schemes:scheme_id (*)`).eq('id', enrollmentId).single();
          if (enrollError) throw enrollError;
          const { data: nominees } = await supabase.from('scheme_nominees').select('*').eq('enrollment_id', enrollmentId);
          const { data: transactions } = await supabase.from('transactions').select('*').eq('enrollment_id', enrollmentId).eq('status', 'COMPLETED').order('created_at', { ascending: false });
          enrollment.status = calculateDynamicStatus(enrollment.schemes, transactions || []);
          return { enrollment, profile: enrollment.profiles, scheme: enrollment.schemes, nominee: nominees?.[0] || null, transactions: transactions || [] };
      } catch (err) { console.error("Error fetching subscriber details:", err); return null; }
  },

  getAllDocuments: async (schemeId?: string) => {
      try {
          let query = supabase.from('documents').select(`id, document_name, created_at, file_size, category, file_path, document_type, profiles:subscriber_id (full_name, id)`).order('created_at', { ascending: false });
          if(schemeId) query = query.eq('scheme_id', schemeId);
          const { data, error } = await query;
          if (error) throw error;
          return data.map((d: any) => ({
              id: d.id, subscriberUid: d.profiles ? d.profiles.id.split('-')[0].toUpperCase() : 'SYS',
              subscriberName: d.profiles?.full_name || 'System', name: d.document_name || d.document_type,
              uploadedOn: new Date(d.created_at).toLocaleDateString(), size: d.file_size || '0.5 MB',
              category: d.category || 'GENERAL', filePath: d.file_path
          }));
      } catch (e) { console.error("Error fetching docs", e); return []; }
  },

  downloadDocument: async (filePath: string) => {
      let bucket = 'scheme-verification-doc';
      if (filePath.startsWith('subscribers/')) {
          bucket = 'documents';
      } else if (filePath.includes('payout-documents')) {
          bucket = 'payout-documents';
      }
      
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw error;
      return data;
  },

  getPreviewUrl: async (filePath: string) => {
      let bucket = 'scheme-verification-doc';
      if (filePath.startsWith('subscribers/')) {
          bucket = 'documents';
      } else if (filePath.includes('payout-documents')) {
          bucket = 'payout-documents';
      }
      const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
      if(!data) throw new Error("Could not create signed URL");
      return data.signedUrl;
  },

  onboardOfflineSubscriber: async (form: any, userId: string, schemeId: string) => {
      let { data: profile } = await supabase.from('profiles').select('id').eq('phone', form.phone).single();
      const profileData: any = { full_name: form.name, phone: form.phone, email: form.email, pan_number: form.pan, aadhaar_number: form.aadhaar, dob: form.dob || null, gender: form.gender, address: `${form.permAddress1}, ${form.permAddress2 || ''}`, city: form.permCity, state: form.permState, pincode: form.permPincode, employment_status: form.empStatus, monthly_income: parseFloat(form.monthlyIncome) || 0, employer_name: form.employer, bank_name: form.bankName, account_number: form.accountNo, ifsc_code: form.ifsc, account_type: form.accountType, role: 'SUBSCRIBER', is_proxy: true };
      if (!profile) { const { data: newProfile, error } = await supabase.from('profiles').insert([{ ...profileData, id: crypto.randomUUID() }]).select().single(); if(error) throw error; profile = newProfile; } 
      else { await supabase.from('profiles').update(profileData).eq('id', profile.id); }
      let ticketNumber = 1;
      const { data: maxTicket } = await supabase.from('scheme_enrollments').select('ticket_number').eq('scheme_id', schemeId).order('ticket_number', { ascending: false }).limit(1).single();
      if (maxTicket?.ticket_number) ticketNumber = maxTicket.ticket_number + 1;
      const { data: enrollment, error: enrollError } = await supabase.from('scheme_enrollments').insert([{ scheme_id: schemeId, subscriber_id: profile.id, ticket_number: ticketNumber, enrollment_type: 'OFFLINE', status: 'ACTIVE' }]).select().single();
      if(enrollError) throw enrollError;
      if(form.hasNominee) { await supabase.from('scheme_nominees').insert([{ enrollment_id: enrollment.id, name: form.nomName, relationship: form.nomRelation, dob: form.nomDob || null, gender: form.nomGender, phone: form.nomPhone, email: form.nomEmail, aadhaar_number: form.nomAadhaar, pan_number: form.nomPan, address: form.nomAddressSame ? form.permAddress1 : form.nomAddress, is_minor: form.nomineeIsMinor, guardian_name: form.guardianName, guardian_relationship: form.guardianRelation }]); }
      const filesToUpload = { photoDoc: form.photoDoc, panDoc: form.panDoc, aadhaarDoc: form.aadhaarDoc, addressProofDoc: form.addressProofDoc, bankDoc: form.bankDoc, agreementDoc: form.agreementDoc, nomineeIdDoc: form.nomineeIdDoc };
      await Promise.all(Object.entries(filesToUpload).map(async ([docKey, file]) => {
          if (file instanceof File) {
              const docType = docKey.replace('Doc', ''), fileExt = file.name.split('.').pop(), filePath = `subscribers/${userId}/${enrollment.id}/${docType}_${Date.now()}.${fileExt}`;
              const { error } = await supabase.storage.from('documents').upload(filePath, file);
              if (!error) { await supabase.from('documents').insert([{ owner_id: userId, subscriber_id: profile!.id, scheme_id: schemeId, enrollment_id: enrollment.id, document_type: docType, document_name: file.name, file_path: filePath, file_size: (file.size / 1024 / 1024).toFixed(2) + ' MB', category: (docType === 'agreement' ? 'AGREEMENTS' : 'KYC'), status: 'SUBMITTED' }]); }
          }
      }));
      return enrollment;
  },

  // --- AUCTION MANAGEMENT ---
  getAuctions: async (schemeId: string): Promise<Auction[]> => {
      const { data: scheme } = await supabase.from('schemes').select('*, scheme_enrollments(count)').eq('id', schemeId).single();
      if (!scheme) return [];
      const { data: existingAuctions } = await supabase.from('auctions').select('*').eq('scheme_id', schemeId);
      const auctions: Auction[] = (existingAuctions || []).map((a: any) => ({
          id: a.id, schemeId: a.scheme_id, schemeName: scheme.name, auctionNumber: a.auction_number,
          date: new Date(a.auction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          time: new Date(a.auction_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          rawDate: new Date(a.auction_date), status: a.status, winnerName: a.winner_enrollment_id ? 'Winner ID ' + a.winner_enrollment_id.substring(0,4) : undefined,
          winningBidAmount: a.winning_bid, dividendAmount: a.dividend_amount, payoutStatus: a.payout_status,
          prizePool: scheme.chit_value, eligibleParticipants: scheme.scheme_enrollments?.[0]?.count || 0,
          minBid: scheme.discount_min, maxBid: scheme.discount_max,
      }));
      return auctions.sort((a,b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0));
  },

  updateAuction: async (auctionId: string, schemeId: string, updates: { date: string, time: string, minBid: number, maxBid: number }) => {
    const newDateTime = new Date(`${updates.date} ${updates.time}`).toISOString();
    const { error: auctionError } = await supabase.from('auctions').update({ auction_date: newDateTime }).eq('id', auctionId);
    if (auctionError) throw auctionError;
    const { error: schemeError } = await supabase.from('schemes').update({ discount_min: updates.minBid, discount_max: updates.maxBid }).eq('id', schemeId);
    if (schemeError) throw schemeError;
  },
  
  getProxyBids: async (auctionId: string): Promise<ProxyBid[]> => {
    if (!auctionId.startsWith('mock-')) {
        const { data, error } = await supabase.from('proxy_bids').select('*').eq('auction_id', auctionId);
        if (error) { console.error("Error fetching proxy bids:", error); return []; }
        return data.map((p: any) => ({ id: p.id, auctionId: p.auction_id, subscriberId: p.enrollment_id, minAmount: p.min_amount || 0, maxAmount: p.max_amount }));
    }
    return [];
  },

  setProxyBid: async (schemeId: string, enrollmentId: string, minAmount: number, maxAmount: number) => {
      const { data: auctions } = await supabase.from('auctions').select('id').eq('scheme_id', schemeId).eq('status', 'UPCOMING').limit(1);
      let auctionId = auctions?.[0]?.id;
      if (!auctionId) {
          const { data: newAuction, error } = await supabase.from('auctions').insert([{ scheme_id: schemeId, auction_number: 1, auction_date: new Date().toISOString(), status: 'UPCOMING' }]).select().single();
          if(error) throw error;
          auctionId = newAuction.id;
      }
      const { error } = await supabase.from('proxy_bids').upsert({ auction_id: auctionId, enrollment_id: enrollmentId, min_amount: minAmount, max_amount: maxAmount }, { onConflict: 'auction_id,enrollment_id' });
      if(error) throw error;
  },

  recordPayment: async (enrollmentId: string, amount: number, mode: string, date: string, remarks?: string) => {
      const { data, error } = await supabase.from('transactions').insert([{ enrollment_id: enrollmentId, amount, mode, type: 'COLLECTION', status: 'COMPLETED', payment_date: date || new Date().toISOString() }]).select().single();
      if(error) throw error;
      return data;
  },

  // --- NEW: REQUESTS API ---
  
  // 1. Fetch all pending requests from scheme_join_requests table (For Owner)
  getPendingRequests: async (userId: string): Promise<SchemeJoinRequest[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('scheme_join_requests')
      .select(`
        id,
        status,
        requested_at,
        schemes!inner(id, name, chit_id, owner_id),
        app_subscribers!inner(id, full_name, phone, email)
      `)
      .eq('status', 'PENDING')
      .eq('schemes.owner_id', userId)
      .order('requested_at', { ascending: false });

    if (error) {
        console.error("Error fetching pending join requests:", error);
        throw error;
    }

    // Transform to match UI SchemeJoinRequest type
    return data.map((req: any) => ({
        id: req.id,
        status: req.status,
        requested_at: req.requested_at,
        app_subscribers: req.app_subscribers,
        schemes: req.schemes
    }));
  },

  // 2. Handle the Buttons with new RPC (For Owner)
  processRequest: async (requestId: string, action: 'ACCEPT' | 'DENY') => {
    if (action === 'ACCEPT') {
      // Calls the new SQL RPC function 'accept_join_request'
      const { error } = await supabase.rpc('accept_join_request', { 
        p_request_id: requestId 
      });
      if (error) throw error;
    } else {
      // Direct update for rejection on 'scheme_join_requests' table
      const { error } = await supabase
        .from('scheme_join_requests')
        .update({ status: 'REJECTED', processed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    }
  },

  // --- ONLINE SUBSCRIBER ONBOARDING ---
  
  // 3. Apply for Scheme (Public/Subscriber Side)
  applyForScheme: async (schemeId: string, form: any) => {
      // A. Check if profile exists by phone, else create one
      let { data: profile } = await supabase.from('profiles').select('id').eq('phone', form.phone).single();
      
      if (!profile) {
          const profileData = {
              id: crypto.randomUUID(),
              full_name: form.name,
              phone: form.phone,
              email: form.email,
              pan_number: form.pan,
              aadhaar_number: form.aadhaar,
              occupation: form.occupation,
              monthly_income: parseFloat(form.income),
              role: 'SUBSCRIBER',
              verification_status: 'PENDING'
          };
          
          const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert([profileData])
              .select()
              .single();
              
          if (profileError) throw profileError;
          profile = newProfile;
      } else {
          await supabase.from('profiles').update({
              full_name: form.name,
              pan_number: form.pan,
              aadhaar_number: form.aadhaar,
              occupation: form.occupation,
              monthly_income: parseFloat(form.income)
          }).eq('id', profile.id);
      }

      const { error: reqError } = await supabase.from('scheme_join_requests').insert([{
          scheme_id: schemeId,
          subscriber_id: profile.id,
          status: 'PENDING'
      }]);

      if (reqError) throw reqError;

      return profile.id;
  },

  // 4. Upload Docs for Online Subscriber
  uploadOnlineSubscriberDoc: async (subscriberId: string, schemeId: string, file: File, docType: string) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `subscribers/${subscriberId}/online_join/${docType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      await supabase.from('documents').insert([{
          owner_id: subscriberId, 
          scheme_id: schemeId, 
          document_type: docType, 
          document_name: file.name,
          file_path: filePath, 
          file_size: (file.size / 1024 / 1024).toFixed(2) + ' MB', 
          category: 'KYC', 
          status: 'SUBMITTED'
      }]);
  }
};
