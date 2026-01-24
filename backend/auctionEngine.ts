import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class AuctionEngine {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.setupListeners();
  }

  private setupListeners() {
    console.log("[Engine] Initializing Proxy Bot Listener via Supabase Realtime...");

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
            } else if (status === 'CHANNEL_ERROR') {
                console.error("[Engine] Failed to connect to Realtime channel.");
            }
        });
  }

  private async runProxyBot(auctionId: string, currentBid: number, currentBidderId: string) {
    // 1. Find proxies who have a limit LOWER than the current bid
    // Note: In a Chit Fund Reverse Auction, users want the lowest prize (highest discount).
    // So a proxy limit of 70k means "I am willing to take 70k or more".
    // If current bid is 80k, the bot can bid 79k.
    // If current bid is 70k, the bot stops.
    const { data: proxies } = await this.supabase
        .from('proxy_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .lt('max_amount', currentBid); // We look for proxies whose limit is LESS than current price

    if (proxies && proxies.length > 0) {
        // 2. Sort to find the proxy willing to go the LOWEST (most aggressive discount)
        proxies.sort((a, b) => a.max_amount - b.max_amount);
        const bestProxy = proxies[0];

        // 3. Don't bid against self
        if (bestProxy.enrollment_id !== currentBidderId) {
            const step = 100; // Standard decrement
            // 4. New bid should be LOWER than the current bid
            let newBid = currentBid - step;

            // 5. Ensure we don't go below their authorized limit
            if (newBid >= bestProxy.max_amount) { 
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
                }, 1500); // 1.5s delay to simulate thinking
            }
        }
    }
  }
}