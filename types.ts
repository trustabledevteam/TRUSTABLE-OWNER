

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
  status: 'PENDING' | 'DOCS_GENERATED' | 'SIGNATURE_PENDING' | 'PAYMENT_PROCESSING' | 'COMPLETED' | 'Processed';
  
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