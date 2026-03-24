import { apiClient } from './apiClient';
import { Auction, Payout, Scheme, SchemeJoinRequest, Subscriber, ProxyBid } from '../types';

export interface DashboardStats {
  totalSchemes: number;
  monthlyProfit: number;
  totalSubscribers: number;
  activeLeads: number;
  salesData: { name: string; value: number }[];
}

const safeFloat = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

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
      const params = userId ? `?ownerId=${userId}` : '';
      const data = await apiClient.get(`/api/schemes${params}`);

      return data.map((s: any) => ({
          id: s.id,
          name: s.name,
          chitId: s.chit_id,
          chitValue: s.chit_value,
          monthlyDue: s.monthly_due,
          duration: s.duration_months,
          membersCount: s.members_count,
          subscribersCount: parseInt(s.enrollment_count) || 0,
          startDate: s.start_date,
          status: s.status,
          auctionDay: s.auction_day,
          psoNumber: s.pso_number,
          discountMin: s.discount_min,
          discountMax: s.discount_max,
          ownerId: s.owner_id,
          auctionDuration: s.auction_duration_mins
      }));
  },

  createScheme: async (schemeData: any, userId: string) => {
    const result = await apiClient.post('/api/schemes', {
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
        auction_duration_mins: safeInt(schemeData.auctionDuration)
    });
    return result;
  },

  uploadSchemeDoc: async (schemeId: string, userId: string, file: File, docType: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      formData.append('owner_id', userId);
      formData.append('subfolder', `schemes/${schemeId}`);
      formData.append('status', 'UPLOADED');
      await apiClient.upload('/api/documents/upload', formData);
  },

  getSchemeDetails: async (id: string) => {
      const data = await apiClient.get(`/api/schemes/${id}`);
      return {
          id: data.id,
          name: data.name,
          chitId: data.chit_id,
          chitValue: data.chit_value,
          monthlyDue: data.monthly_due,
          duration: data.duration_months,
          membersCount: data.members_count,
          subscribersEnrolled: data.enrollment_count || 0,
          membersTotal: data.members_count,
          startDate: data.start_date,
          status: data.status,
          auctionDay: data.auction_day,
          psoNumber: data.pso_number,
          discountMin: data.discount_min,
          discountMax: data.discount_max,
          ownerId: data.owner_id,
          auctionDuration: data.auction_duration_mins
      };
  },

  onboardOfflineSubscriber: async (formData: any, ownerId: string, schemeId: string) => {
      const enrollment = await apiClient.post('/api/enrollments/onboard-offline', { formData, schemeId });

      // Upload documents
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
              const fd = new FormData();
              fd.append('file', doc.file);
              fd.append('document_type', doc.type);
              fd.append('owner_id', ownerId);
              fd.append('enrollment_id', enrollment.id);
              fd.append('subfolder', `subscribers/${enrollment.subscriber_id}`);
              fd.append('status', 'VERIFIED');
              await apiClient.upload('/api/documents/upload', fd);
          }
      }

      return enrollment;
  },

  getAuctions: async (ownerId: string, schemeId?: string) => {
      const params = schemeId ? `?schemeId=${schemeId}` : `?ownerId=${ownerId}`;
      const data = await apiClient.get(`/api/auctions${params}`);

      return data.map((a: any) => ({
        id: a.id,
        schemeId: a.scheme_id,
        schemeName: a.schemes?.name,
        auctionNumber: a.auction_number,
        date: new Date(a.auction_date).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}),
        time: new Date(a.auction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        rawDate: new Date(a.auction_date),
        status: a.status,
        winnerName: 'Pending',
        winningBidAmount: a.winning_bid,
        dividendAmount: a.dividend_amount,
        payoutStatus: a.payout_status,
        minBid: (a.schemes?.chit_value || 0) * 0.05,
        maxBid: (a.schemes?.chit_value || 0) * 0.40,
        prizePool: a.schemes?.chit_value,
        auctionDurationMins: a.schemes?.auction_duration_mins,
        auction_history: a.auction_history
      }));
  },

  updateAuction: async (auctionId: string, schemeId: string, updates: any) => {
      if (!updates.date || !updates.time) throw new Error("Date and Time are required.");
      const localDate = new Date(`${updates.date}T${updates.time}:00`);
      if (isNaN(localDate.getTime())) throw new Error("Invalid Date/Time format provided.");

      await apiClient.put(`/api/auctions/${auctionId}`, { auction_date: localDate.toISOString() });
  },

  getSchemeCollectionData: async (ownerId: string, schemeId?: string) => {
      const params = schemeId ? `?schemeId=${schemeId}` : `?ownerId=${ownerId}`;
      return await apiClient.get(`/api/enrollments/collection-data${params}`);
  },

  getPendingPayouts: async (ownerId: string, schemeId?: string) => {
      const params = schemeId ? `?status=PENDING&schemeId=${schemeId}` : `?status=PENDING&ownerId=${ownerId}`;
      const data = await apiClient.get(`/api/payouts${params}`);

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
      return await apiClient.get(`/api/payouts/${payoutId}/context`);
  },

  savePayoutWizardCoreProgress: async (payoutId: string, step: number, mode: string, guarantorData: any) => {
      await apiClient.put(`/api/payouts/${payoutId}`, {
          current_step: step,
          payout_mode: mode,
          guarantor_name: guarantorData.name,
          guarantor_phone: guarantorData.phone,
          guarantor_email: guarantorData.email,
          guarantor_income: safeFloat(guarantorData.income),
          guarantor_address: guarantorData.address
      });
  },

  updatePayoutFields: async (payoutId: string, updates: any) => {
      await apiClient.put(`/api/payouts/${payoutId}`, updates);
  },

  uploadPayoutDocument: async (payoutId: string, userId: string, schemeId: string, enrollmentId: string, file: File, docType: string) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('document_type', `PAYOUT_${docType.toUpperCase()}`);
      fd.append('owner_id', userId);
      fd.append('enrollment_id', enrollmentId);
      fd.append('subfolder', `payouts/${payoutId}`);
      fd.append('status', 'VERIFIED');
      await apiClient.upload('/api/documents/upload', fd);
  },

  finalizePayoutAndDistributeDividends: async (payoutId: string, transactionRef: string | null, esignId: string | null) => {
      await apiClient.post(`/api/payouts/${payoutId}/finalize`, {
          transactionRef: transactionRef || esignId || 'AUTO_REF'
      });
  },

  getSubscribers: async (schemeId?: string) => {
      const params = schemeId ? `?schemeId=${schemeId}` : '';
      const data = await apiClient.get(`/api/subscribers${params}`);

      return data.map((e: any) => {
          const transactions = e.transactions || [];
          const totalPaid = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          return {
              id: e.id,
              name: e.profiles?.full_name || 'Unknown',
              joinDate: new Date(e.created_at).toLocaleDateString(),
              paymentsMade: Math.floor(totalPaid / 10000),
              totalInstallments: 20,
              lastPaymentDate: '2023-10-01',
              status: e.status === 'ACTIVE' ? 'Active' : 'Late',
              type: e.enrollment_type === 'OFFLINE' ? 'Offline' : 'Online',
              phone: e.profiles?.phone,
              email: e.profiles?.email
          };
      });
  },

  getSubscriberDetails: async (enrollmentId: string) => {
      const data = await apiClient.get(`/api/subscribers/${enrollmentId}`);
      return {
          enrollment: data,
          profile: data.profiles,
          scheme: data.schemes,
          nominee: data.scheme_nominees?.[0] || null,
          transactions: data.transactions || []
      };
  },

  setProxyBidLimit: async (auctionId: string, enrollmentId: string, maxAmount: number) => {
      await apiClient.post('/api/proxy-bids', { auction_id: auctionId, enrollment_id: enrollmentId, max_amount: maxAmount });
  },

  getOfflineSubscribersForProxy: async (schemeId: string) => {
      const data = await apiClient.get(`/api/proxy-bids/offline-subscribers?schemeId=${schemeId}`);
      return data.map((d: any) => ({ id: d.id, name: d.full_name || 'Unknown' }));
  },

  getAuctionProxies: async (auctionId: string) => {
      const data = await apiClient.get(`/api/proxy-bids?auctionId=${auctionId}`);
      return data.map((p: any) => ({
          id: p.id,
          auctionId: p.auction_id,
          enrollmentId: p.enrollment_id,
          maxAmount: p.max_amount,
          subscriberName: p.full_name
      }));
  },

  getPendingRequests: async (userId: string) => {
      return await apiClient.get(`/api/join-requests?userId=${userId}`);
  },

  processRequest: async (requestId: string, action: 'ACCEPT' | 'DENY') => {
      await apiClient.post(`/api/join-requests/${requestId}/process`, { action });
  },

  getAllDocuments: async (schemeId?: string) => {
      const params = schemeId ? `?status=APPROVED` : `?status=APPROVED`;
      const data = await apiClient.get(`/api/documents${params}`);

      return data.map((d: any) => ({
          id: d.id,
          subscriberUid: d.scheme_enrollments?.profiles?.id || d.owner_id,
          subscriberName: d.scheme_enrollments?.profiles?.full_name || 'System',
          name: d.file_path.split('/').pop(),
          uploadedOn: new Date(d.created_at).toLocaleDateString(),
          size: '2 MB',
          category: d.document_type,
          filePath: d.file_path
      }));
  },

  downloadDocument: async (filePath: string) => {
      const token = localStorage.getItem('access_token');
      const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/documents/by-path?filePath=${encodeURIComponent(filePath)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Download failed');
      return await res.blob();
  },

  getPreviewUrl: async (filePath: string) => {
      const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001';
      return `${API_BASE}/uploads/${filePath}`;
  },

  applyForScheme: async (schemeId: string, formData: any) => {
      const profile = await apiClient.post('/api/profiles', {
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: 'SUBSCRIBER',
          verification_status: 'PENDING',
          employment_status: formData.occupation,
          monthly_income: safeFloat(formData.income),
          pan_number: formData.pan,
          aadhaar_number: formData.aadhaar
      });

      await apiClient.post('/api/join-requests', {
          scheme_id: schemeId,
          subscriber_id: profile.id
      });

      return profile.id;
  },

  uploadOnlineSubscriberDoc: async (subscriberId: string, schemeId: string, file: File, type: string) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('document_type', type);
      fd.append('owner_id', subscriberId);
      fd.append('subfolder', `applicants/${schemeId}/${subscriberId}`);
      fd.append('status', 'SUBMITTED');
      await apiClient.upload('/api/documents/upload', fd);
  },

  resetAuctionStatus: async (auctionId: string, originalAuctionDate: string) => {
      return await apiClient.post(`/api/auctions/${auctionId}/reset`, { originalAuctionDate });
  },
};
