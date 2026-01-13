

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, CheckCircle, Lock, User, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Badge, Button } from '../components/UI';
import { AppSubscriber } from '../types'; // Import AppSubscriber type

// --- Helper Components ---

// Fixed: children is optional (?) to prevent TS errors if empty
const DetailCard = ({ title, children, defaultOpen = true, icon: Icon }: { title: string, children?: React.ReactNode, defaultOpen?: boolean, icon?: any }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-200">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors"
                aria-expanded={isOpen}
                aria-controls={`panel-${title.replace(/\s+/g, '-')}`}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={18} className="text-blue-500" />}
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            
            {isOpen && (
                <div 
                    id={`panel-${title.replace(/\s+/g, '-')}`}
                    className="px-6 pb-8 border-t border-gray-100 pt-6 animate-in fade-in slide-in-from-top-1 duration-200"
                    role="region"
                >
                    {children}
                </div>
            )}
        </div>
    );
};

const Field = ({ label, value, highlight = false, badge, fullWidth = false, halfWidth = false, icon }: { label: string, value?: string | number | null, highlight?: boolean, badge?: React.ReactNode, fullWidth?: boolean, halfWidth?: boolean, icon?: React.ReactNode }) => {
    // strict check for null/undefined/empty string, but allow 0
    const displayValue = (value === null || value === undefined || value === '') ? '-' : value;
    
    // Determine col-span based on props
    const colClass = fullWidth ? 'col-span-full' : halfWidth ? 'col-span-2' : 'col-span-1';

    return (
        <div className={colClass}>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">{label}</p>
            <div className="flex items-center gap-2 min-h-[20px]">
                {icon}
                <p className={`text-sm font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'} truncate`}>
                    {displayValue}
                </p>
                {badge}
            </div>
        </div>
    );
};

// --- Main Page ---

interface SubscriberProfileViewProps {
    subscriber?: AppSubscriber | null; // Optional prop for direct subscriber data
}

export const SubscriberProfileView: React.FC<SubscriberProfileViewProps> = ({ subscriber: propSubscriber }) => {
  const { subscriberId } = useParams(); // For standalone page view
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchData = async () => {
          if (propSubscriber) {
              // If propSubscriber is provided, use that data
              setLoading(false);
              // Mock up the 'data' structure to match existing logic if propSubscriber only has partial info
              // For full fidelity, you might still need to fetch more details based on propSubscriber.id if it's not a full profile
              setData({
                  enrollment: {
                      status: 'Active', // Default status for direct profiles
                      subscriber_id: propSubscriber.id,
                      created_at: new Date().toISOString()
                  },
                  profile: {
                      ...propSubscriber,
                      full_name: propSubscriber.full_name,
                      email: propSubscriber.email || 'N/A',
                      phone: propSubscriber.phone || 'N/A',
                      occupation: propSubscriber.occupation || 'N/A',
                      city: propSubscriber.city || 'N/A',
                      // Mock other fields for completeness if they're not in AppSubscriber
                      dob: null, pan_number: null, aadhaar_number: null, address: null,
                      gender: null, monthly_income: propSubscriber.monthly_income || null,
                      verification_status: 'APPROVED' // Assume verified for direct use
                  },
                  scheme: null, // No scheme context for a direct AppSubscriber
                  nominee: null,
                  transactions: []
              });
          } else if (subscriberId) {
              // Fallback to fetching if no propSubscriber is given
              setLoading(true);
              const result = await api.getSubscriberDetails(subscriberId);
              setData(result);
              setLoading(false);
          } else {
              setLoading(false);
              setData(null); // No subscriber ID or prop provided
          }
      };
      fetchData();
  }, [subscriberId, propSubscriber]);

  const { enrollment, profile, scheme, nominee, transactions } = data || {};

  // --- Derived Calculations ---
  const chitProgress = useMemo(() => {
    const defaults = {
        nextDueDate: 'N/A', latePaymentsCount: 0, totalPenalties: 0, defaultTimes: 0,
        paidInstallments: 0, dynamicStatus: enrollment?.status || 'Active', overdueDays: 0,
    };

    if (!scheme || !transactions) return { ...defaults, dynamicStatus: enrollment?.status || 'Active' };

    const { start_date, due_day, monthly_due, grace_period_days, late_fee, duration_months, default_status_period } = scheme;
    if (!start_date || !monthly_due) return { ...defaults, dynamicStatus: enrollment?.status || 'Active' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(start_date);

    // --- Calculate paid installments and penalties from PAST transactions ---
    const sortedTxns = [...transactions].sort((a: any, b: any) => new Date(a.payment_date || a.created_at).getTime() - new Date(b.payment_date || b.created_at).getTime());
    const totalPaid = sortedTxns.reduce((acc: number, t: any) => acc + t.amount, 0);
    const paidInstallments = Math.floor(totalPaid / monthly_due);

    let pastLatePayments = 0;
    let pastPenalties = 0;
    let cumulativePaid = 0;
    let installmentsCleared = 0;
    const paymentDatesForInstallments = new Map<number, Date>();

    for (const transaction of sortedTxns) {
        cumulativePaid += transaction.amount;
        while (cumulativePaid >= (installmentsCleared + 1) * monthly_due) {
            const installmentIndex = installmentsCleared;
            
            const effectivePaymentDate = new Date(transaction.payment_date || transaction.created_at);

            if (!paymentDatesForInstallments.has(installmentIndex)) {
                paymentDatesForInstallments.set(installmentIndex, effectivePaymentDate);
            }

            const dueDate = new Date(start_date);
            dueDate.setMonth(dueDate.getMonth() + installmentIndex);
            dueDate.setDate(due_day);
            const graceDate = new Date(dueDate);
            graceDate.setDate(dueDate.getDate() + (grace_period_days || 0));

            const paymentDate = effectivePaymentDate;
            paymentDate.setHours(0, 0, 0, 0);
            graceDate.setHours(0, 0, 0, 0);

            if (paymentDate > graceDate) {
                pastLatePayments++;
                const diffTime = paymentDate.getTime() - dueDate.getTime();
                const lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (lateDays > (grace_period_days || 0)) {
                    pastPenalties += (lateDays - (grace_period_days || 0)) * (late_fee || 0);
                }
            }
            installmentsCleared++;
            if (installmentsCleared >= duration_months) break;
        }
        if (installmentsCleared >= duration_months) break;
    }

    // --- Calculate Default Times ---
    const defaultedInstallmentIndexes = new Set<number>();
    
    let currentCycleIndex = (today.getFullYear() - start.getFullYear()) * 12;
    currentCycleIndex -= start.getMonth();
    currentCycleIndex += today.getMonth();
    if (today.getDate() > due_day) currentCycleIndex += 1;
    currentCycleIndex = Math.max(0, currentCycleIndex);

    // a. Check past paid installments for default
    paymentDatesForInstallments.forEach((paymentDate, installmentIndex) => {
        const dueDate = new Date(start_date);
        dueDate.setMonth(dueDate.getMonth() + installmentIndex);
        dueDate.setDate(due_day);
        
        const defaultDate = new Date(dueDate);
        defaultDate.setDate(dueDate.getDate() + (grace_period_days || 0) + (default_status_period || 90));
        
        paymentDate.setHours(0,0,0,0);
        defaultDate.setHours(0,0,0,0);

        if (paymentDate > defaultDate) {
            defaultedInstallmentIndexes.add(installmentIndex);
        }
    });

    // b. Check currently unpaid installments for default
    for (let i = paidInstallments; i < currentCycleIndex; i++) {
        const dueDate = new Date(start_date);
        dueDate.setMonth(start.getMonth() + i);
        dueDate.setDate(due_day);
        
        const defaultDate = new Date(dueDate);
        defaultDate.setDate(dueDate.getDate() + (grace_period_days || 0) + (default_status_period || 90));
        defaultDate.setHours(0,0,0,0);

        if (today > defaultDate) {
            defaultedInstallmentIndexes.add(i);
        }
    }

    // c. Count contiguous blocks of defaulted installments
    const sortedDefaults = Array.from(defaultedInstallmentIndexes).sort((a, b) => a - b);
    let defaultTimes = 0;
    if (sortedDefaults.length > 0) {
        defaultTimes = 1;
        for (let i = 1; i < sortedDefaults.length; i++) {
            if (sortedDefaults[i] > sortedDefaults[i - 1] + 1) {
                // A gap indicates a new, separate period of default
                defaultTimes++;
            }
        }
    }

    // --- Calculate current status, overdue days, and LIVE penalties ---
    const pendingInstallments = Math.max(0, currentCycleIndex - paidInstallments);
    
    let dynamicStatus: 'Active' | 'Late' | 'Default' = 'Active';
    let liveOverdueDays = 0;
    let livePenalty = 0;
    let pendingLatePayments = 0;

    if (pendingInstallments > 0) {
        const firstMissedDueDate = new Date(start_date);
        firstMissedDueDate.setMonth(start.getMonth() + paidInstallments);
        firstMissedDueDate.setDate(due_day);
        firstMissedDueDate.setHours(0, 0, 0, 0);

        if (firstMissedDueDate < today) {
            liveOverdueDays = Math.ceil((today.getTime() - firstMissedDueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (liveOverdueDays > (grace_period_days || 0) + (default_status_period || 90)) {
                dynamicStatus = 'Default';
            } else if (liveOverdueDays > (grace_period_days || 0)) {
                dynamicStatus = 'Late';
            }
            
            for (let i = 0; i < pendingInstallments; i++) {
                const pendingDueDate = new Date(start_date);
                pendingDueDate.setMonth(start.getMonth() + paidInstallments + i);
                pendingDueDate.setDate(due_day);
                pendingDueDate.setHours(0, 0, 0, 0);
                
                if (pendingDueDate < today) {
                    const daysOver = Math.ceil((today.getTime() - pendingDueDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysOver > (grace_period_days || 0)) {
                        pendingLatePayments++;
                        livePenalty += (daysOver - (grace_period_days || 0)) * (late_fee || 0);
                    }
                }
            }
        }
    }
    
    let nextDueDateStr = 'Completed';
    if (paidInstallments < (scheme?.duration_months || 0)) { // Use optional chaining
        const nextDate = new Date(start_date);
        nextDate.setMonth(nextDate.getMonth() + paidInstallments);
        nextDate.setDate(due_day);
        nextDueDateStr = nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    return {
        nextDueDate: nextDueDateStr,
        latePaymentsCount: pastLatePayments + pendingLatePayments,
        totalPenalties: pastPenalties + livePenalty,
        defaultTimes: defaultTimes,
        paidInstallments,
        dynamicStatus,
        overdueDays: liveOverdueDays,
    };
}, [scheme, transactions, enrollment]);


  if (loading) return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" role="status"></div>
          <p className="text-gray-500 text-sm font-medium">Loading profile...</p>
      </div>
  );
  
  if (!profile) return <div className="p-8 text-center text-gray-500">Subscriber not found.</div>;

  const totalInstallments = scheme?.duration_months || 0;
  const dueInstallments = Math.max(0, totalInstallments - chitProgress.paidInstallments);
  const joiningDate = enrollment?.created_at ? new Date(enrollment.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';
  const lastPayment = transactions && transactions.length > 0 
    ? new Date(transactions[0].payment_date || transactions[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '-';

  const showBackButton = !propSubscriber; // Only show back button if not in modal context

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20" aria-label="Subscriber Profile Details">
      
      {showBackButton && (
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group"
          aria-label="Back to previous page"
        >
          <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
              <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl border-4 border-white shadow-sm">
                      {profile.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${chitProgress.dynamicStatus === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`} aria-label="Status indicator"></span>
              </div>
              <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {profile.full_name || 'Unknown'} 
                      <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">.{enrollment?.subscriber_id?.split('-')[0].toUpperCase() || 'ID'}</span>
                      {enrollment && ( // Only show badge if enrollment exists
                          <Badge variant={chitProgress.dynamicStatus === 'Active' ? 'success' : chitProgress.dynamicStatus === 'Late' ? 'warning' : 'danger'}>
                              {chitProgress.dynamicStatus.toUpperCase()}
                          </Badge>
                      )}
                  </h1>
                  <p className="text-sm text-blue-600 font-medium mt-0.5">{profile.email || '-'}</p>
                  <p className="text-xs text-gray-400 mt-1">{profile.occupation || '-'}</p>
              </div>
          </div>

          <div className="flex flex-col items-end text-right">
              <p className="text-xs text-gray-500 mb-1">Joined: {joiningDate}</p>
              <div className="flex items-center gap-1 text-blue-600 text-xs font-medium cursor-pointer hover:underline">
                  <MapPinIcon className="w-3 h-3" /> {profile.city || 'Location N/A'}
              </div>
          </div>
      </div>

      {/* 1. Subscriber Information - Layout Optimized */}
      <DetailCard title="Subscriber Details" icon={User}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
              {/* Row 1: Basic Identity */}
              <Field label="Name" value={profile.full_name} />
              <Field label="DOB" value={profile.dob ? new Date(profile.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Phone" value={profile.phone} highlight />
              
              {/* Row 2: Contact & Work */}
              <Field label="Email" value={profile.email} />
              <Field label="Alternate contact" value="-" />
              <Field label="Occupation" value={profile.employment_status || profile.occupation} /> {/* Use profile.occupation from app_subscribers */}
              <Field label="Monthly Income" value={profile.monthly_income ? `₹${profile.monthly_income.toLocaleString()}` : '-'} />

              {/* Row 3: KYC & IDs */}
              <Field label="PAN Number" value={profile.pan_number || '-'} />
              <Field label="Aadhaar Number" value={profile.aadhaar_number || '-'} />
              <Field label="Income proof" value="Not uploaded" />
              <Field label="KYC Status" value={profile.verification_status || 'Pending'} badge={profile.verification_status === 'APPROVED' ? <CheckCircle size={14} className="text-green-500"/> : null} />

              {/* Row 4: Addresses (Half Width each to fill row) */}
              <Field label="Permanent Address" value={profile.address || '-'} halfWidth />
              <Field label="Present Address" value="Same as permanent" halfWidth />
          </div>
      </DetailCard>

      {/* 2. Chit Progress Information (Only if scheme context exists) */}
      {scheme && (
          <DetailCard title="Chit Progress Details" icon={RefreshCw}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
                  <Field label="Scheme Name" value={scheme?.name} />
                  <Field label="Joining Date" value={joiningDate} />
                  <Field label="Next Due" value={chitProgress.nextDueDate} />
                  <Field label="Status" value={chitProgress.dynamicStatus.toUpperCase()} highlight />

                  <Field label="Total Installments" value={totalInstallments} />
                  <Field label="Paid Installments" value={chitProgress.paidInstallments} />
                  <Field label="Due Installments" value={dueInstallments} />
                  <Field label="Last Payment" value={lastPayment} />

                  <Field 
                      label="Bidding Eligibility" 
                      value="Eligible" 
                      badge={<CheckCircle size={16} className="text-blue-500" />} 
                      highlight
                  />
                  <Field label="Auctions Participated" value="-" />
                  <Field label="Auctions Won" value="Nil" />
                  <Field label="Last Bid" value="-" />

                  <Field label="Payment Consistency" value="-" />
                  <Field label="Default Times" value={chitProgress.defaultTimes} />
                  <Field label="Late Payments" value={chitProgress.latePaymentsCount} />
                  <Field label="Penalties" value={`₹${chitProgress.totalPenalties.toLocaleString()}`} />

                  <Field label="Guarantor Status" value="Pending" />
                  <Field label="Nominee Status" value={nominee ? "Added" : "Pending"} badge={nominee ? <CheckCircle size={14} className="text-blue-500"/> : null} />
              </div>
          </DetailCard>
      )}

      {/* 3. Nominee Details */}
      <DetailCard title="Nominee Details" icon={ShieldCheck}>
          {nominee ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
                  <Field label="Name" value={nominee.name} />
                  <Field label="DOB" value={nominee.dob ? new Date(nominee.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'} />
                  <Field label="Gender" value={nominee.gender} />
                  <Field label="Phone" value={nominee.phone} />

                  <Field label="Email" value={nominee.email} />
                  <Field label="Address" value={nominee.address || "Same as subscriber"} />
                  <Field label="Relation" value={nominee.relationship} />
                  <Field label="Share Percentage" value="100%" />

                  <Field label="Verification Status" value="Verified" badge={<CheckCircle size={14} className="text-blue-500"/>} />
                  <Field label="PAN Number" value={nominee.pan_number || '-'} />
                  <Field label="Aadhaar Number" value={nominee.aadhaar_number ? `*******${nominee.aadhaar_number.slice(-4)}` : '-'} />
              </div>
          ) : (
              <div className="text-center py-8 text-gray-400 italic">No nominee added.</div>
          )}
      </DetailCard>

      {/* 4. Guarantor Details */}
      <DetailCard title="Guarantor Details" icon={Lock}>
          <div className="flex flex-col items-center justify-center py-10">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                  <User size={32} />
              </div>
              <p className="text-gray-500 font-medium">Guarantor Information</p>
              <p className="text-gray-400 text-sm mt-1">Guarantor details will be added when required for prized chit.</p>
          </div>
      </DetailCard>

    </div>
  );
};

// Mini Component for Map Icon to avoid import bloat
const MapPinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
