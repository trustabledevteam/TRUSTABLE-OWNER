-- 1. Add Auction Duration Column to Schemes
ALTER TABLE public.schemes 
ADD COLUMN IF NOT EXISTS auction_duration_mins INTEGER DEFAULT 20;

-- 2. Force schema cache reload
NOTIFY pgrst, 'reload schema';