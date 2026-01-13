

export interface Scheme {
  id: string;
  name: string;
  chitValue: number;
  monthlyDue: number;
  duration: number; // months
  subscribersCount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Upcoming' | 'PENDING_APPROVAL';
  nextAuction?: string;
  auctionDay?: number;
  membersCount?: number; // Added for calculation
  psoNumber?: string;
  discountMin?: number;
  discountMax?: number;
}

export interface Subscriber {
  id: string;
  schemeId?: string;
  name: string;
  joinDate: string;
  paymentsMade: number;
  totalInstallments: number;
  lastPaymentDate: string;
  status: 'Active' | 'Late' | 'Default';
  occupation: string;
  location: string;
  avatarUrl?: string;
  phone: string;
  email: string;
  type?: 'Online' | 'Offline'; // Added
  isPrized?: boolean; // True if they have already won an auction
}

export interface Auction {
  id: string;
  schemeId: string;
  schemeName?: string;
  auctionNumber: number;
  date: string;
  time?: string;
  rawDate?: Date; // Added for reliable sorting
  status: 'Upcoming' | 'Live' | 'Completed';
  winnerId?: string;
  winnerName?: string;
  winningBidAmount?: number;
  dividendAmount?: number;
  payoutStatus?: 'Pending' | 'Paid';
  type?: 'NORMAL' | 'LUCKY_DRAW';
  prizePool?: number;
  eligibleParticipants?: number;
  minBid?: number;
  maxBid?: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  timestamp: string;
  isProxy: boolean;
  isAutoBid?: boolean;
}

export interface ProxyBid {
  id: string;
  auctionId: string;
  subscriberId: string;
  minAmount: number;
  maxAmount: number;
}

export interface Payout {
  id: string;
  auction_id: string;
  enrollment_id: string;
  amount: number;
  due_date: string;
  status: 'PENDING' | 'DOCS_UPLOADED' | 'SIGNATURE_PENDING' | 'PAYMENT_PROCESSING' | 'COMPLETED' | 'CANCELLED';
  
  // New fields for payout wizard and guarantor
  payout_mode?: 'ONLINE' | 'OFFLINE';
  current_step?: number;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_email?: string;
  guarantor_income?: number;
  guarantor_address?: string;
  foreman_esign_id?: string;
  processed_at?: string; // Date of completion

  // Joined data for UI
  winnerName?: string;
  auctionNumber?: number;
}


export interface Reminder {
  id:string;
  title: string;
  time: string;
  type: 'auction' | 'payout' | 'collection' | 'general';
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'OWNER' | 'SUBSCRIBER' | 'ADMIN';
  verification_status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  full_name?: string;
  company_id?: string;
}

// New types for Join Requests
export interface AppSubscriber {
  id: string;
  full_name: string;
  occupation?: string;
  city?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  monthly_income?: number;
}

export interface SchemeJoinRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requested_at: string;
  app_subscribers: AppSubscriber; // Joined data from app_subscribers table
  schemes: {
    id: string;
    name: string;
    chit_id: string;
  }; // Joined data from schemes table
}
