-- =================================================================
-- FIX: FINALIZE AUCTION (LOWEST BID / HIGHEST DISCOUNT WINS)
-- AND AUTO-SCHEDULE LOGIC
-- =================================================================

-- Drop old version
DROP FUNCTION IF EXISTS finalize_auction(uuid);

CREATE OR REPLACE FUNCTION finalize_auction(p_scheme_id UUID)
RETURNS TABLE (
  winner_id UUID,
  ticket_id INT,
  winning_amount NUMERIC
) AS $$
DECLARE
  v_auction_id UUID;
  v_winner_id UUID;
  v_winning_amount NUMERIC; -- This will be the PRIZE AMOUNT (e.g. 70000)
  v_ticket_id INT;
  v_dividend_amount NUMERIC;
  v_chit_value NUMERIC;
  v_commission_percent NUMERIC;
  v_commission_amount NUMERIC;
  v_actual_discount NUMERIC;
  v_members_count INT;
  v_auction_number INT;
  v_duration_months INT;
  v_auction_day INT;
  v_current_auction_date TIMESTAMPTZ;
  v_next_auction_date TIMESTAMPTZ;
BEGIN
  -- Step 1: Find the currently active/upcoming auction (Live or just finished)
  SELECT a.id, a.auction_number, a.auction_date, s.chit_value, s.foreman_commission, s.members_count, s.duration_months, s.auction_day
  INTO v_auction_id, v_auction_number, v_current_auction_date, v_chit_value, v_commission_percent, v_members_count, v_duration_months, v_auction_day
  FROM auctions a JOIN schemes s ON a.scheme_id = s.id
  WHERE a.scheme_id = p_scheme_id AND a.status IN ('LIVE', 'UPCOMING') 
  ORDER BY a.auction_number ASC LIMIT 1;

  IF v_auction_id IS NULL THEN RETURN; END IF;

  -- Step 2: Determine Winner (LOWEST Bid Amount Wins)
  -- 'amount' in 'bids' table represents the PRIZE MONEY the user is willing to take.
  -- Example: Chit 1L. User A bids 95k. User B bids 90k.
  -- User B is asking for LESS money (higher discount), so User B wins.
  SELECT enrollment_id, amount 
  INTO v_winner_id, v_winning_amount 
  FROM bids 
  WHERE auction_id = v_auction_id 
  ORDER BY amount ASC 
  LIMIT 1;

  -- If no one placed a bid, do a lucky draw (Winner takes Full Chit Value usually, or min discount)
  IF v_winner_id IS NULL THEN
     SELECT id INTO v_winner_id 
     FROM scheme_enrollments 
     WHERE scheme_id = p_scheme_id AND status = 'ACTIVE' 
     ORDER BY random() LIMIT 1;
     
     v_winning_amount := v_chit_value; -- No discount implies full amount (or apply min discount logic here)
  END IF;

  -- Step 3: Perform financial calculations for dividend and payout.
  -- Commission is on the Total Chit Value
  v_commission_amount := (v_chit_value * v_commission_percent) / 100;
  
  -- Actual Discount = Chit Value - Winning Prize Amount
  v_actual_discount := v_chit_value - v_winning_amount;
  
  -- Dividend = (Discount - Commission) / Members
  -- We use GREATEST(0, ...) to ensure no negative dividend if commission > discount
  v_dividend_amount := GREATEST(0, (v_actual_discount - v_commission_amount) / NULLIF(v_members_count, 0));
  
  SELECT ticket_number INTO v_ticket_id FROM scheme_enrollments WHERE id = v_winner_id;

  -- Step 4: Update the database state
  UPDATE auctions SET status = 'COMPLETED', winner_enrollment_id = v_winner_id, winning_bid = v_winning_amount, dividend_amount = v_dividend_amount, payout_status = 'PENDING' WHERE id = v_auction_id;
  UPDATE scheme_enrollments SET status = 'PRIZED' WHERE id = v_winner_id;
  
  -- Payout Amount is exactly the Winning Bid Amount (The Prize Money)
  INSERT INTO payouts (auction_id, enrollment_id, amount, status, due_date) VALUES (v_auction_id, v_winner_id, v_winning_amount, 'PENDING', NOW() + interval '7 days');

  -- Step 5: AUTO-SCHEDULE THE NEXT AUCTION
  IF v_auction_number < v_duration_months THEN
      v_next_auction_date := v_current_auction_date + interval '1 month';
      
      BEGIN
          v_next_auction_date := make_date(
              EXTRACT(YEAR FROM v_next_auction_date)::integer,
              EXTRACT(MONTH FROM v_next_auction_date)::integer,
              v_auction_day
          ) + (v_current_auction_date::time);
      EXCEPTION WHEN OTHERS THEN
          v_next_auction_date := date(v_next_auction_date) + (v_current_auction_date::time);
      END;
      
      INSERT INTO auctions (scheme_id, auction_number, auction_date, status)
      VALUES (p_scheme_id, v_auction_number + 1, v_next_auction_date, 'UPCOMING');
  END IF;

  -- Step 6: Return the winner details
  RETURN QUERY SELECT v_winner_id, v_ticket_id, v_winning_amount;
END;
$$ LANGUAGE plpgsql;