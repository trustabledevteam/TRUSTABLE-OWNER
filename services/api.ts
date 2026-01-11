
import { Scheme, Auction, Payout, Subscriber, ProxyBid } from '../types';
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

    const today = new Date();
    const start = new Date(scheme.start_date);
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
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const { count: schemesCount } = await supabase.from('schemes').select('*', { count: 'exact', head: true });
      const { count: subscribersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      return {
        totalSchemes: schemesCount || 0,
        monthlyProfit: 89000, 
        totalSubscribers: subscribersCount || 0,
        activeLeads: 40,
        salesData: [{ name: '2024', value: 90 }]
      };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { totalSchemes: 0, monthlyProfit: 0, totalSubscribers: 0, activeLeads: 0, salesData: [] };
    }
  },

  // --- SCHEMES ---
  getSchemes: async (): Promise<Scheme[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
        const { data, error } = await supabase
          .from('schemes')
          .select('*, scheme_enrollments(count)') 
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
            return data.map((s: any) => {
              // Calculate endDate
              let endDate = '-';
              if (s.start_date && s.duration_months) {
                  const start = new Date(s.start_date);
                  const end = new Date(start);
                  end.setMonth(start.getMonth() + s.duration_months);
                  endDate = end.toLocaleDateString('en-GB');
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
    const { data, error } = await supabase
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
    return data;
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

  // --- COLLECTION SPECIFIC ---
  getSchemeCollectionData: async (schemeId: string) => {
      try {
          const { data: scheme } = await supabase
              .from('schemes')
              .select('id, name, monthly_due, due_day, start_date, late_fee, grace_period_days, default_status_period')
              .eq('id', schemeId)
              .single();
          if (!scheme) throw new Error("Scheme not found");

          const { data: enrollments } = await supabase
              .from('scheme_enrollments')
              .select(`id, ticket_number, status, profiles:subscriber_id (id, full_name, phone)`)
              .eq('scheme_id', schemeId);
          if (!enrollments) return { scheme, subscribers: [] };

          const enrollmentIds = enrollments.map(e => e.id);
          const { data: transactions } = await supabase
              .from('transactions')
              .select('enrollment_id, amount, created_at, mode')
              .in('enrollment_id', enrollmentIds)
              .eq('status', 'COMPLETED')
              .order('created_at', { ascending: false });

          const subscribers = enrollments.map(e => {
              const myTxns = transactions?.filter(t => t.enrollment_id === e.id) || [];
              return { ...e, transactions: myTxns };
          });
          return { scheme, subscribers };
      } catch (err) {
          console.error("Collection fetch error:", err);
          return null;
      }
  },

  getSubscribers: async (schemeId?: string): Promise<Subscriber[]> => {
    try {
      let query = supabase.from('scheme_enrollments').select(`
        id, scheme_id, created_at, status, enrollment_type,
        profiles:subscriber_id (id, full_name, phone, email, is_proxy),
        schemes:scheme_id (duration_months, start_date, due_day, monthly_due, grace_period_days, default_status_period)
      `);
      if(schemeId) query = query.eq('scheme_id', schemeId);
      const { data, error } = await query;
      if (error) return [];
      if(!data || data.length === 0) return [];

      const enrollmentIds = data.map(e => e.id);
      const { data: transactions } = await supabase.from('transactions')
        .select('enrollment_id, created_at, amount').in('enrollment_id', enrollmentIds).eq('status', 'COMPLETED'); 

      return data.map((row: any) => {
          const myTxns = transactions?.filter(t => t.enrollment_id === row.id) || [];
          const calculatedStatus = calculateDynamicStatus(row.schemes, myTxns);
          return {
              id: row.id, schemeId: row.scheme_id, name: row.profiles?.full_name || 'Unknown',
              phone: row.profiles?.phone, email: row.profiles?.email,
              joinDate: new Date(row.created_at).toISOString().split('T')[0], 
              paymentsMade: myTxns.length, totalInstallments: row.schemes?.duration_months || 0, 
              lastPaymentDate: myTxns.length > 0 ? new Date(Math.max(...myTxns.map((t:any) => new Date(t.created_at).getTime()))).toISOString().split('T')[0] : 'N/A',
              status: calculatedStatus, occupation: 'Unknown', location: 'Unknown',
              type: row.enrollment_type === 'OFFLINE' || row.profiles?.is_proxy ? 'Offline' : 'Online'
          };
      });
    } catch(e) { console.error(e); return []; }
  },

  getSubscriberDetails: async (enrollmentId: string) => {
      try {
          const { data: enrollment, error: enrollError } = await supabase
            .from('scheme_enrollments').select(`*, profiles:subscriber_id (*), schemes:scheme_id (*)`).eq('id', enrollmentId).single();
          if (enrollError) throw enrollError;

          const { data: nominees } = await supabase.from('scheme_nominees').select('*').eq('enrollment_id', enrollmentId);
          const { data: transactions } = await supabase.from('transactions').select('*').eq('enrollment_id', enrollmentId).eq('status', 'COMPLETED').order('created_at', { ascending: false });

          const calculatedStatus = calculateDynamicStatus(enrollment.schemes, transactions || []);
          enrollment.status = calculatedStatus;

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
      const bucket = filePath.startsWith('subscribers/') ? 'documents' : 'scheme-verification-doc';
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw error;
      return data;
  },

  getPreviewUrl: async (filePath: string) => {
      const bucket = filePath.startsWith('subscribers/') ? 'documents' : 'scheme-verification-doc';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
  },

  onboardOfflineSubscriber: async (form: any, userId: string, schemeId: string) => {
      // 1. Find or create the subscriber profile
      let { data: profile } = await supabase.from('profiles').select('id').eq('phone', form.phone).single();
      const profileData: any = {
          full_name: form.name, phone: form.phone, email: form.email, pan_number: form.pan, aadhaar_number: form.aadhaar,
          dob: form.dob || null, gender: form.gender, address: `${form.permAddress1}, ${form.permAddress2 || ''}`,
          city: form.permCity, state: form.permState, pincode: form.permPincode, employment_status: form.empStatus,
          monthly_income: parseFloat(form.monthlyIncome) || 0, employer_name: form.employer, bank_name: form.bankName,
          account_number: form.accountNo, ifsc_code: form.ifsc, account_type: form.accountType, role: 'SUBSCRIBER', is_proxy: true 
      };

      if (!profile) {
          const newId = crypto.randomUUID();
          const { data: newProfile, error } = await supabase.from('profiles').insert([{ ...profileData, id: newId }]).select().single();
          if(error) throw error;
          profile = newProfile;
      } else {
          await supabase.from('profiles').update(profileData).eq('id', profile.id);
      }

      // 2. Determine ticket number
      let ticketNumber = 1;
      const { data: maxTicket } = await supabase.from('scheme_enrollments').select('ticket_number').eq('scheme_id', schemeId).order('ticket_number', { ascending: false }).limit(1).single();
      if (maxTicket && maxTicket.ticket_number) {
          ticketNumber = maxTicket.ticket_number + 1;
      }

      // 3. Create the enrollment record
      const { data: enrollment, error: enrollError } = await supabase.from('scheme_enrollments').insert([{
          scheme_id: schemeId, subscriber_id: profile.id, ticket_number: ticketNumber, enrollment_type: 'OFFLINE', status: 'ACTIVE'
      }]).select().single();
      if(enrollError) throw enrollError;

      // 4. Add nominee if provided
      if(form.hasNominee) {
          await supabase.from('scheme_nominees').insert([{
              enrollment_id: enrollment.id, name: form.nomName, relationship: form.nomRelation, dob: form.nomDob || null,
              gender: form.nomGender, phone: form.nomPhone, email: form.nomEmail, aadhaar_number: form.nomAadhaar,
              pan_number: form.nomPan, address: form.nomAddressSame ? form.permAddress1 : form.nomAddress,
              is_minor: form.nomineeIsMinor, guardian_name: form.guardianName, guardian_relationship: form.guardianRelation
          }]);
      }

      // 5. Upload all documents
      const filesToUpload = {
        photoDoc: form.photoDoc, panDoc: form.panDoc, aadhaarDoc: form.aadhaarDoc, 
        addressProofDoc: form.addressProofDoc, bankDoc: form.bankDoc, 
        agreementDoc: form.agreementDoc, nomineeIdDoc: form.nomineeIdDoc,
      };

      const uploadPromises = Object.entries(filesToUpload).map(async ([docKey, file]) => {
          if (file instanceof File) {
              const docType = docKey.replace('Doc', '');
              const fileExt = file.name.split('.').pop();
              const filePath = `subscribers/${userId}/${enrollment.id}/${docType}_${Date.now()}.${fileExt}`;
              const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
              
              const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
              if (uploadError) {
                  console.error(`Failed to upload ${docType}:`, uploadError);
                  return; // Continue even if one fails
              }
              
              await supabase.from('documents').insert([{
                  owner_id: userId, subscriber_id: profile.id, scheme_id: schemeId, enrollment_id: enrollment.id,
                  document_type: docType, document_name: file.name, file_path: filePath, file_size: fileSize,
                  category: (docType === 'agreement' ? 'AGREEMENTS' : 'KYC'), status: 'SUBMITTED'
              }]);
          }
      });
      await Promise.all(uploadPromises);

      return enrollment;
  },

  // --- AUCTION MANAGEMENT ---
  getAuctions: async (schemeId: string): Promise<Auction[]> => {
      const { data: scheme } = await supabase.from('schemes').select('*, scheme_enrollments(count)').eq('id', schemeId).single();
      if (!scheme) return [];

      const { data: existingAuctions } = await supabase.from('auctions').select('*').eq('scheme_id', schemeId);
      
      const auctions: Auction[] = (existingAuctions || []).map((a: any) => {
          const auctionDate = new Date(a.auction_date);
          return {
              id: a.id,
              schemeId: a.scheme_id,
              schemeName: scheme.name,
              auctionNumber: a.auction_number,
              date: auctionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              time: auctionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              rawDate: auctionDate,
              status: a.status,
              winnerName: a.winner_enrollment_id ? 'Winner ID ' + a.winner_enrollment_id.substring(0,4) : undefined,
              winningBidAmount: a.winning_bid,
              dividendAmount: a.dividend_amount,
              payoutStatus: a.payout_status,
              prizePool: scheme.chit_value,
              eligibleParticipants: scheme.scheme_enrollments?.[0]?.count || 0,
              minBid: scheme.discount_min,
              maxBid: scheme.discount_max,
          };
      });

      // Mock generation if needed (can be removed if DB is always populated)
      if (auctions.length === 0 && scheme.start_date) {
          // ... (mock generation logic can be kept for robustness)
      }

      return auctions.sort((a,b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0));
  },

  updateAuction: async (auctionId: string, schemeId: string, updates: { date: string, time: string, minBid: number, maxBid: number }) => {
    // Combine date and time into a single ISO string for the database
    const newDateTime = new Date(`${updates.date} ${updates.time}`).toISOString();
    
    // Update auction date
    const { error: auctionError } = await supabase
        .from('auctions')
        .update({ auction_date: newDateTime })
        .eq('id', auctionId);

    if (auctionError) throw auctionError;

    // Update scheme bid limits
    const { error: schemeError } = await supabase
        .from('schemes')
        .update({ discount_min: updates.minBid, discount_max: updates.maxBid })
        .eq('id', schemeId);
    
    if (schemeError) throw schemeError;
  },
  
  getProxyBids: async (auctionId: string): Promise<ProxyBid[]> => {
    if (!auctionId.startsWith('mock-')) {
        const { data, error } = await supabase
            .from('proxy_bids')
            .select('*')
            .eq('auction_id', auctionId);
        
        if (error) {
            console.error("Error fetching proxy bids:", error);
            return [];
        }

        return data.map((p: any) => ({
            id: p.id,
            auctionId: p.auction_id,
            subscriberId: p.enrollment_id,
            minAmount: p.min_amount || 0,
            maxAmount: p.max_amount
        }));
    }
    return [];
  },

  setProxyBid: async (schemeId: string, enrollmentId: string, minAmount: number, maxAmount: number) => {
      const { data: auctions } = await supabase.from('auctions').select('id').eq('scheme_id', schemeId).eq('status', 'UPCOMING').limit(1);
      
      let auctionId;
      if (!auctions || auctions.length === 0) {
          const { data: newAuction, error } = await supabase.from('auctions').insert([{
              scheme_id: schemeId,
              auction_number: 1,
              auction_date: new Date().toISOString(),
              status: 'UPCOMING'
          }]).select().single();
          if(error) throw error;
          auctionId = newAuction.id;
      } else {
          auctionId = auctions[0].id;
      }

      const { error } = await supabase.from('proxy_bids').upsert({
          auction_id: auctionId,
          enrollment_id: enrollmentId,
          min_amount: minAmount,
          max_amount: maxAmount
      }, { onConflict: 'auction_id,enrollment_id' });
      
      if(error) throw error;
  },

  recordPayment: async (enrollmentId: string, amount: number, mode: string, date: string, remarks?: string) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
            enrollment_id: enrollmentId,
            amount: amount,
            mode: mode,
            type: 'COLLECTION',
            status: 'COMPLETED',
            created_at: date || new Date().toISOString()
        }])
        .select().single();
      
      if(error) throw error;
      return data;
  }
};