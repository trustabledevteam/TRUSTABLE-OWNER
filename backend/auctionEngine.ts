
import { Server } from 'socket.io';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Types ---
interface BidPayload {
    auctionId: string;
    enrollmentId: string;
    amount: number;
}

export class AuctionEngine {
  private io: Server;
  private supabase: SupabaseClient;

  constructor(httpServer: any, supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.io = new Server(httpServer, {
      cors: { origin: '*' }
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.io.of('/auctions').on('connection', (socket) => {
      console.log('User connected to auction:', socket.id);

      socket.on('join_room', async ({ auctionId, userId }) => {
        socket.join(auctionId);
        
        // Fetch current state
        const { data: auction } = await this.supabase
            .from('auctions')
            .select('*')
            .eq('id', auctionId)
            .single();
            
        // Get highest bid
        const { data: highBid } = await this.supabase
            .from('bids')
            .select('*')
            .eq('auction_id', auctionId)
            .order('amount', { ascending: false })
            .limit(1)
            .single();

        socket.emit('init_state', { 
            status: auction?.status || 'LIVE', 
            currentBid: highBid?.amount || 0,
            lastBidder: highBid?.enrollment_id 
        });
      });

      socket.on('place_bid', async (payload: BidPayload) => {
        const { auctionId, enrollmentId, amount } = payload;

        // 1. Get Current High Bid from DB to prevent race conditions
        const { data: highBid } = await this.supabase
            .from('bids')
            .select('amount')
            .eq('auction_id', auctionId)
            .order('amount', { ascending: false })
            .limit(1)
            .single();
            
        const currentHigh = highBid?.amount || 0;
        
        if (amount <= currentHigh) {
            return socket.emit('error', 'Bid must be higher than current amount');
        }

        // 2. Insert Bid
        const { error } = await this.supabase.from('bids').insert([{
            auction_id: auctionId, 
            enrollment_id: enrollmentId, 
            amount: amount, 
            bid_type: 'ONLINE'
        }]);

        if (error) {
            console.error('Bid Error:', error);
            return;
        }

        // 3. Broadcast Update
        this.io.of('/auctions').to(auctionId).emit('bid_update', { 
            amount, 
            enrollmentId,
            userId: enrollmentId, // Simplified for demo
            isProxy: false 
        });

        // 4. Trigger Proxy Logic
        this.runProxyBot(auctionId, amount, enrollmentId);
      });

      socket.on('end_auction', async ({ auctionId }) => {
          this.finalizeAuction(auctionId);
      });
    });
  }

  private async runProxyBot(auctionId: string, currentBid: number, currentBidderId: string) {
      // Find proxies who authorized a MAX > currentBid
      const { data: proxies } = await this.supabase
          .from('proxy_bids')
          .select('*')
          .eq('auction_id', auctionId)
          .gt('max_amount', currentBid);

      if (proxies && proxies.length > 0) {
          // Sort to find the one with the highest limit
          proxies.sort((a, b) => b.max_amount - a.max_amount);
          const bestProxy = proxies[0];

          // Don't bid against self
          if (bestProxy.enrollment_id !== currentBidderId) {
              const step = 500; // Standard increment
              let newBid = currentBid + step;
              
              // Ensure we don't exceed their limit
              if (newBid <= bestProxy.max_amount) {
                  await this.supabase.from('bids').insert([{
                      auction_id: auctionId,
                      enrollment_id: bestProxy.enrollment_id,
                      amount: newBid,
                      bid_type: 'PROXY'
                  }]);

                  // Simulate "thinking" time for bot
                  setTimeout(() => {
                      this.io.of('/auctions').to(auctionId).emit('bid_update', { 
                          amount: newBid, 
                          enrollmentId: bestProxy.enrollment_id,
                          isProxy: true
                      });
                  }, 1500); 
              }
          }
      }
  }

  private async finalizeAuction(auctionId: string) {
      console.log(`Finalizing Auction: ${auctionId}`);

      // 1. Determine Winner
      const { data: highBid } = await this.supabase
          .from('bids')
          .select('*')
          .eq('auction_id', auctionId)
          .order('amount', { ascending: false })
          .limit(1)
          .single();
      
      let winnerId = highBid?.enrollment_id;
      let winningAmount = highBid?.amount || 0;
      let type = 'NORMAL';

      // 2. No Bids? Lucky Draw (Random Winner from Eligible)
      if (!winnerId) {
          const { data: enrollments } = await this.supabase
              .from('scheme_enrollments')
              .select('id')
              .eq('status', 'ACTIVE'); // Only active non-prized
              
          if (enrollments && enrollments.length > 0) {
              const randomIdx = Math.floor(Math.random() * enrollments.length);
              winnerId = enrollments[randomIdx].id;
              winningAmount = 0; // Lucky draw = 0 discount usually
              type = 'LUCKY_DRAW';
          }
      }

      if (!winnerId) {
          console.error("No eligible winner found.");
          return;
      }

      // 3. Calculate Financials
      // Get Scheme Details for Value & Commission
      const { data: auction } = await this.supabase.from('auctions').select('*').eq('id', auctionId).single();
      const { data: scheme } = await this.supabase.from('schemes').select('chit_value, foreman_commission, members_count').eq('id', auction.scheme_id).single();
      
      if (!scheme) return;

      const chitValue = scheme.chit_value;
      const commissionRate = scheme.foreman_commission || 5; // Default 5%
      
      const foremanCommissionAmount = (chitValue * commissionRate) / 100;
      // Dividend is the remaining discount after foreman commission
      const totalDividend = Math.max(0, winningAmount - foremanCommissionAmount);
      const dividendPerMember = scheme.members_count > 0 ? (totalDividend / scheme.members_count) : 0;
      const prizeAmount = chitValue - winningAmount;

      // 4. Update Auction Record
      await this.supabase.from('auctions').update({
          status: 'COMPLETED',
          winner_enrollment_id: winnerId,
          winning_bid: winningAmount,
          dividend_amount: dividendPerMember,
          payout_status: 'PENDING'
      }).eq('id', auctionId);

      // 5. Update Winner Status
      await this.supabase.from('scheme_enrollments').update({
          status: 'PRIZED'
      }).eq('id', winnerId);

      // 6. Create Payout Record
      await this.supabase.from('payouts').insert([{
          auction_id: auctionId,
          enrollment_id: winnerId,
          amount: prizeAmount,
          status: 'PENDING',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days later
      }]);

      // 7. AUTO-SCHEDULE NEXT AUCTION (USING SQL RPC)
      try {
          const { error } = await this.supabase.rpc('auto_schedule_next_auction', {
              p_completed_auction_id: auctionId
          });
          
          if (error) {
              console.error("SQL Auto-Schedule Error:", error.message);
          } else {
              console.log(`Auto-scheduled next auction for Scheme ${auction.scheme_id} via DB function.`);
          }
      } catch (scheduleError) {
          console.error("Failed to call auto-schedule RPC:", scheduleError);
      }

      console.log(`Auction ${auctionId} Completed. Winner: ${winnerId}, Prize: ${prizeAmount}`);

      this.io.of('/auctions').to(auctionId).emit('auction_ended', { 
          winnerId, 
          type, 
          prizeAmount,
          dividendPerMember 
      });
  }
}
