import { Server } from 'socket.io';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class AuctionEngine {
  private io: Server;
  private supabase: SupabaseClient;

  constructor(httpServer: any, supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    // Cast to any to avoid TypeScript errors with 'cors' property in partial ServerOptions
    this.io = new Server(httpServer, {
      cors: { origin: '*' }
    } as any);

    this.setupListeners();
  }

  private setupListeners() {
    console.log("[Engine] Initializing Proxy Bot Listener...");

    // 1. Listen to Supabase Realtime for ANY new bid on the 'bids' table
    this.supabase
        .channel('auction-engine-proxy')
        .on(
            'postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'bids' }, 
            (payload) => {
                const newBid = payload.new;
                
                // Only react to REAL user bids (Online/Offline), ignore our own Proxy bids to avoid loop
                if (newBid.bid_type !== 'PROXY') {
                    console.log(`[Engine] New Bid Detected: ₹${newBid.amount} by ${newBid.enrollment_id}. Checking proxies...`);
                    this.runProxyBot(newBid.auction_id, newBid.amount, newBid.enrollment_id);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("[Engine] Connected to Supabase Realtime for Bids.");
            }
        });

    // 2. Keep Socket.io only for broadcasting finalization or other custom events if needed
    // (Frontend is primarily using Supabase, so this is just fallback/admin)
    this.io.of('/auctions').on('connection', (socket) => {
      console.log('[Socket] Admin/System connected:', socket.id);
    });
  }

  private async runProxyBot(auctionId: string, currentBid: number, currentBidderId: string) {
    // 1. Find proxies who have a limit LOWER than the current bid
    const { data: proxies } = await this.supabase
        .from('proxy_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .lt('max_amount', currentBid); // Use .lt() for "less than"

    if (proxies && proxies.length > 0) {
        // 2. Sort to find the proxy willing to go the LOWEST
        proxies.sort((a, b) => a.max_amount - b.max_amount);
        const bestProxy = proxies[0];

        // 3. Don't bid against self
        if (bestProxy.enrollment_id !== currentBidderId) {
            const step = 100; // Standard decrement
            // 4. New bid should be LOWER than the current bid
            let newBid = currentBid - step;

            // 5. Ensure we don't go below their authorized limit
            if (newBid >= bestProxy.max_amount) { // Use >=
                // Add a small delay for realism
                setTimeout(async () => {
                    console.log(`[Engine] Placing Proxy Bid: ₹${newBid} for ${bestProxy.enrollment_id}`);
                    const { error } = await this.supabase.from('bids').insert([{
                        auction_id: auctionId,
                        enrollment_id: bestProxy.enrollment_id,
                        amount: newBid,
                        bid_type: 'PROXY'
                    }]);
                    if (error) {
                        console.error("[Engine] Proxy Bid Failed:", error.message);
                    }
                }, 500);
            }
        }
    }
  }

  // Finalization is now handled via direct RPC calls from frontend owner or scheduled jobs
  // Keeping this method if you want to trigger it via a backend cron job later
  public async triggerFinalization(auctionId: string) {
      // ... same logic as before if needed for cron ...
  }
}