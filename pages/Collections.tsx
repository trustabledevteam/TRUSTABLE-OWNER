
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Filter, RotateCcw, Eye, MessageSquare, ChevronLeft, ChevronRight, CheckCircle, Banknote, Printer, Lock, ShieldCheck, Fingerprint, Loader2 } from 'lucide-react';
import { Payout } from '../types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';

// Types for Collection Logic
interface CollectionRow {
    id: string; // Enrollment ID
    subscriberName: string;
    subscriberPhone: string;
    dueDate: string; // Visual Due Date (Next upcoming)
    lastPaymentDate: string;
    lastPaymentAmount: number;
    amountDue: number; // Monthly Due + Late Fees
    amountPaid: number; 
    paidVia: string;
    overdueDays: number;
    status: 'Active' | 'Late' | 'Default';
    calculatedLateFee: number;
    baseMonthlyDue: number;
    paymentTargetDate: Date; // The actual date relevant for fee calculation
}

export const Collections: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // Scheme ID
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [collectionData, setCollectionData] = useState<CollectionRow[]>([]);
  const [schemeRules, setSchemeRules] = useState<any>(null);
  
  // Modal States
  const [offlinePaymentModalOpen, setOfflinePaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentOtp, setPaymentOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
      enrollmentId: '',
      subscriberName: '', // For display
      amount: '', // String for input
      mode: 'Cash',
      date: new Date().toISOString().split('T')[0],
      remarks: '',
      autoFee: 0 // Track fee separate from base
  });

  // Filter States
  const [dateFilter, setDateFilter] = useState('Date');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('Payment Status');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('Payment Method');

  const pageTitle = 'Collection Tracking & Payouts';

  // --- DATA FETCHING & CALCULATION ENGINE ---
  useEffect(() => {
      if (id) {
          fetchAndCalculate(id);
      }
  }, [id]);

  // Recalculate Late Fee when Payment Date Changes
  useEffect(() => {
      if (!paymentForm.enrollmentId || !schemeRules || !paymentForm.date) return;

      const sub = collectionData.find(c => c.id === paymentForm.enrollmentId);
      if (!sub) return;

      const payDate = new Date(paymentForm.date);
      const targetDate = new Date(sub.paymentTargetDate);
      
      // Normalize time for comparison
      payDate.setHours(0,0,0,0);
      targetDate.setHours(0,0,0,0);

      const lateFeePerDay = schemeRules.late_fee || 0;

      // Calculate diff
      const diffTime = payDate.getTime() - targetDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newFee = 0;
      // Fee applies only if Payment Date is STRICTLY AFTER the Target Date
      if (diffDays > 0) {
          newFee = diffDays * lateFeePerDay;
      } else {
          newFee = 0; // Backdated or on-time payment -> No Fee
      }

      // Update Form (Suggested Amount)
      const totalSuggested = sub.baseMonthlyDue + newFee;
      
      setPaymentForm(prev => ({
          ...prev,
          autoFee: newFee,
          amount: totalSuggested.toString()
      }));

  }, [paymentForm.date, paymentForm.enrollmentId]); 

  const fetchAndCalculate = async (schemeId: string) => {
      setLoading(true);
      const data = await api.getSchemeCollectionData(schemeId);
      
      if (data && data.scheme) {
          setSchemeRules(data.scheme);
          
          // Logic Engine
          const today = new Date();
          const start = new Date(data.scheme.start_date);
          const dueDay = data.scheme.due_day || 5;
          const monthlyDue = data.scheme.monthly_due || 0;
          const lateFeePerDay = data.scheme.late_fee || 0;
          const gracePeriod = data.scheme.grace_period_days || 3;
          const defaultPeriod = data.scheme.default_status_period || 90;

          // 1. Determine Current Cycle Index (Months since start)
          let monthDiff = (today.getFullYear() - start.getFullYear()) * 12;
          monthDiff -= start.getMonth();
          monthDiff += today.getMonth();
          
          // Max Installments Due = Month Diff + 1 (if today > due_day)
          const currentCycleIndex = today.getDate() > dueDay ? monthDiff + 1 : monthDiff;

          const processedRows: CollectionRow[] = data.subscribers.map((sub: any) => {
              // Calculate Total Paid
              const totalPaid = sub.transactions.reduce((acc: number, t: any) => acc + t.amount, 0);
              const lastTxn = sub.transactions[0]; // Ordered by desc

              // Outstanding
              const paidInstallmentsCount = Math.floor(totalPaid / monthlyDue);
              const pendingInstallments = Math.max(0, currentCycleIndex - paidInstallmentsCount);
              
              let status: 'Active' | 'Late' | 'Default' = 'Active';
              let overdueDays = 0;
              let calculatedFee = 0;
              let currentDueDate = new Date();
              let paymentTargetDate = new Date(); // The date we calculate fees against

              // DUE DATE LOGIC:
              if (pendingInstallments === 0) {
                  // PAID STATUS
                  status = 'Active';
                  overdueDays = 0;
                  
                  // Set Due Date to NEXT month
                  currentDueDate = new Date();
                  if (today.getDate() > dueDay) {
                      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
                  }
                  currentDueDate.setDate(dueDay);
                  paymentTargetDate = currentDueDate;
              } else {
                  // UNPAID
                  // Find the date of the first missed installment
                  const missedMonthDate = new Date(start);
                  missedMonthDate.setMonth(start.getMonth() + paidInstallmentsCount);
                  missedMonthDate.setDate(dueDay);
                  
                  // Target date for fee calc is the date they SHOULD have paid
                  paymentTargetDate = missedMonthDate;

                  // If calculated date is in past, calculate overdue
                  if (missedMonthDate < today) {
                      const diffTime = Math.abs(today.getTime() - missedMonthDate.getTime());
                      overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      // Status Logic - Strict: Any overdue > 0 is Late
                      if (overdueDays > (gracePeriod + defaultPeriod)) {
                          status = 'Default';
                      } else if (overdueDays > 0) {
                          status = 'Late'; 
                      } else {
                          status = 'Active';
                      }

                      // Late Fee Logic (Simple daily calc on overdue days)
                      if (overdueDays > 0) {
                          calculatedFee = overdueDays * lateFeePerDay;
                      }
                  }
                  
                  // Display Logic: Show UPCOMING due date even if overdue
                  const nextVisualDueDate = new Date();
                  if (today.getDate() > dueDay) {
                      nextVisualDueDate.setMonth(nextVisualDueDate.getMonth() + 1);
                  }
                  nextVisualDueDate.setDate(dueDay);
                  currentDueDate = nextVisualDueDate;
              }

              const amountDue = monthlyDue + calculatedFee;
              
              return {
                  id: sub.id,
                  subscriberName: sub.profiles?.full_name || 'Unknown',
                  subscriberPhone: sub.profiles?.phone || '',
                  dueDate: currentDueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                  lastPaymentDate: lastTxn ? new Date(lastTxn.created_at).toLocaleDateString('en-GB') : '-',
                  lastPaymentAmount: lastTxn ? lastTxn.amount : 0,
                  amountPaid: totalPaid,
                  paidVia: lastTxn ? lastTxn.mode : '-',
                  overdueDays: overdueDays,
                  status: status,
                  calculatedLateFee: calculatedFee,
                  baseMonthlyDue: monthlyDue,
                  amountDue: amountDue,
                  paymentTargetDate: paymentTargetDate 
              };
          });

          setCollectionData(processedRows);
      }
      setLoading(false);
  };

  // --- HANDLERS ---

  const handleOfflineModalOpen = () => {
      setPaymentForm({
          enrollmentId: '',
          subscriberName: '',
          amount: '',
          mode: 'Cash',
          date: new Date().toISOString().split('T')[0],
          remarks: '',
          autoFee: 0
      });
      setPaymentStep(1);
      setPaymentOtp('');
      setIsSubmitting(false);
      setOfflinePaymentModalOpen(true);
  };

  const handleSubscriberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      const selectedSub = collectionData.find(c => c.id === selectedId);
      
      if (selectedSub) {
          setPaymentForm(prev => ({
              ...prev,
              enrollmentId: selectedId,
              subscriberName: selectedSub.subscriberName,
              // Initial load uses TODAY's calculated fee (but will recalc if date changes)
              amount: selectedSub.amountDue.toString(), 
              autoFee: selectedSub.calculatedLateFee
          }));
      } else {
          setPaymentForm(prev => ({ ...prev, enrollmentId: '', amount: '', autoFee: 0 }));
      }
  };

  const handleVerifyPayment = async () => {
      if (!paymentForm.enrollmentId || !paymentForm.amount) {
          alert("Please select subscriber and verify amount");
          return;
      }
      
      // Simulate OTP
      setPaymentStep(1.5);
      // In real app, call API to send OTP
  };

  const handleConfirmPayment = async () => {
      if (paymentOtp !== '1234') { // Mock OTP
          alert("Invalid OTP (Use 1234)");
          return;
      }

      setIsSubmitting(true);
      try {
          await api.recordPayment(
              paymentForm.enrollmentId, 
              parseFloat(paymentForm.amount), 
              paymentForm.mode, 
              paymentForm.date, 
              paymentForm.remarks
          );
          
          // Refresh Data to update status/overdue
          if (id) await fetchAndCalculate(id);
          
          setPaymentStep(2); // Show Receipt
      } catch (err: any) {
          console.error("Payment failed", err);
          alert("Failed to record payment. " + (err.message || "Please try again."));
      } finally {
          setIsSubmitting(false);
      }
  };

  const filteredCollection = useMemo(() => {
      return collectionData.filter(row => {
          let matches = true;
          // Status Filter
          if (paymentStatusFilter !== 'Payment Status') {
              if (paymentStatusFilter === 'Paid' && row.status !== 'Active') matches = false;
              if (paymentStatusFilter === 'Late' && row.status !== 'Late') matches = false;
              if (paymentStatusFilter === 'Default' && row.status !== 'Default') matches = false;
          }
          // Method Filter
          if (paymentMethodFilter !== 'Payment Method' && row.paidVia !== '-') {
              if (paymentMethodFilter === 'UPI' && row.paidVia !== 'UPI') matches = false;
              // ... simplistic matching
          }
          return matches;
      });
  }, [collectionData, paymentStatusFilter, paymentMethodFilter]);

  // --- RENDER ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
         {id && (
           <button 
             onClick={() => navigate(`/schemes/${id}`)}
             className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group"
           >
              <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Scheme
           </button>
         )}
         <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
               <RotateCcw size={24} className="rotate-90" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
         </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-blue-100">
             <p className="text-xs text-gray-500 mb-1">Total Collected (This Month)</p>
             <h3 className="text-2xl font-bold text-gray-900">
                 ₹{collectionData.reduce((acc, curr) => curr.lastPaymentDate.includes(new Date().toLocaleString('default', { month: 'short' })) ? acc + curr.lastPaymentAmount : acc, 0).toLocaleString()}
             </h3>
          </Card>
          <Card className="bg-white border-orange-100">
             <p className="text-xs text-gray-500 mb-1">Overdue Amount</p>
             <h3 className="text-2xl font-bold text-orange-600">
                 ₹{collectionData.filter(c => c.status !== 'Active').reduce((acc, curr) => acc + curr.amountDue, 0).toLocaleString()}
             </h3>
          </Card>
          <Card className="bg-white border-red-100">
             <p className="text-xs text-gray-500 mb-1">Defaulters</p>
             <h3 className="text-2xl font-bold text-red-600">
                 {collectionData.filter(c => c.status === 'Default').length}
             </h3>
          </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
               <Filter size={18} className="text-gray-600" />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            
            <select 
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 py-2 px-2 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded"
            >
               <option>Payment Status</option>
               <option>Paid</option>
               <option>Late</option>
               <option>Default</option>
            </select>

            <button 
                onClick={handleOfflineModalOpen}
                className="ml-auto bg-green-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
                <Banknote size={18} /> Record Offline Payment
            </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500"/></div>
        ) : (
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                     <th className="p-4 pl-6">ID</th>
                     <th className="p-4">NAME</th>
                     <th className="p-4">DUE DATE</th>
                     <th className="p-4">LAST PAYMENT</th>
                     <th className="p-4">AMOUNT</th>
                     <th className="p-4">PAID VIA</th>
                     <th className="p-4">OVERDUE</th>
                     <th className="p-4">STATUS</th>
                     <th className="p-4 text-center">ACTIONS</th>
                  </tr>
               </thead>
               <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                  {filteredCollection.length > 0 ? (
                     filteredCollection.map((c) => (
                        <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                           <td className="p-4 pl-6 font-mono text-gray-500 text-xs">{c.id.split('-')[0].toUpperCase()}</td>
                           <td className="p-4 font-medium text-gray-900">{c.subscriberName}</td>
                           <td className="p-4 text-gray-500 font-medium">{c.dueDate}</td>
                           <td className="p-4 text-gray-500">{c.lastPaymentDate}</td>
                           <td className="p-4 font-medium text-gray-900">₹{c.lastPaymentAmount.toLocaleString()}</td>
                           <td className="p-4 text-gray-500 uppercase text-xs">{c.paidVia}</td>
                           <td className={`p-4 font-bold ${c.overdueDays > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                               {c.overdueDays > 0 ? `${c.overdueDays} Days` : '0 Days'}
                           </td>
                           <td className="p-4">
                              <span className={`px-3 py-1 rounded-md text-xs font-bold ${
                                 c.status === 'Active' ? 'bg-green-100 text-green-700' :
                                 c.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-red-100 text-red-700'
                              }`}>
                                 {c.status.toUpperCase()}
                              </span>
                           </td>
                           <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                 <button 
                                   onClick={() => navigate(`/schemes/${id}/subscribers/${c.id}`)}
                                   className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"
                                 >
                                    <Eye size={16} />
                                 </button>
                                 <button className="text-blue-500 hover:bg-blue-100 p-1.5 rounded">
                                    <MessageSquare size={16} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr><td colSpan={9} className="p-8 text-center text-gray-400">No subscribers found.</td></tr>
                  )}
               </tbody>
            </table>
        )}
      </div>

      {/* Offline Payment Modal */}
      <Modal
        isOpen={offlinePaymentModalOpen}
        onClose={() => setOfflinePaymentModalOpen(false)}
        title={paymentStep === 2 ? "Payment Receipt" : "Record Offline Payment"}
        maxWidth="max-w-md"
      >
          {paymentStep === 1 && (
              <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                      <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Select Subscriber</label>
                          <select 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            onChange={handleSubscriberSelect}
                            value={paymentForm.enrollmentId}
                          >
                              <option value="">-- Choose Subscriber --</option>
                              {collectionData.map(c => (
                                  <option key={c.id} value={c.id}>{c.subscriberName} ({c.status})</option>
                              ))}
                          </select>
                      </div>

                      <Input 
                        label="Date of Payment" 
                        type="date"
                        value={paymentForm.date} 
                        onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                      />

                      <Input 
                        label="Amount Received (₹)" 
                        type="number"
                        value={paymentForm.amount} 
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        placeholder="Auto-filled based on due"
                      />
                      
                      {/* Breakdown Display */}
                      {paymentForm.enrollmentId && (
                          <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>Base Due:</span> <span>₹{collectionData.find(c => c.id === paymentForm.enrollmentId)?.baseMonthlyDue}</span></div>
                              <div className={`flex justify-between ${paymentForm.autoFee > 0 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                                  <span>Late Fee:</span> 
                                  <span>{paymentForm.autoFee > 0 ? `+ ₹${paymentForm.autoFee}` : 'Waived / None'}</span>
                              </div>
                              <div className="border-t pt-1 flex justify-between font-bold text-gray-800"><span>Total Required:</span> <span>₹{paymentForm.amount}</span></div>
                          </div>
                      )}

                      <div className="space-y-1 w-full">
                          <label className="text-sm font-medium text-gray-700 block">Payment Mode</label>
                          <select 
                            value={paymentForm.mode}
                            onChange={(e) => setPaymentForm({...paymentForm, mode: e.target.value})}
                            className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                              <option>Cash</option>
                              <option>Cheque</option>
                              <option>Demand Draft</option>
                          </select>
                      </div>
                  </div>
                  <div className="flex justify-end pt-4">
                      <Button onClick={handleVerifyPayment} className="w-full flex items-center justify-center gap-2">
                          <Lock size={16} /> Verify & Record
                      </Button>
                  </div>
              </div>
          )}

          {paymentStep === 1.5 && (
              <div className="space-y-6 text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                      <Fingerprint size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Subscriber Verification</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                      An OTP (1234) has been sent to the registered mobile to authorize this cash payment.
                  </p>
                  
                  <div className="max-w-[200px] mx-auto mb-6">
                      <input 
                          type="text" 
                          value={paymentOtp}
                          onChange={(e) => setPaymentOtp(e.target.value)}
                          className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="----"
                          maxLength={4}
                      />
                  </div>

                  <div className="flex gap-4">
                      <Button variant="outline" className="flex-1" onClick={() => setPaymentStep(1)}>Back</Button>
                      <Button className="flex-1" onClick={handleConfirmPayment} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm OTP'}
                      </Button>
                  </div>
              </div>
          )}

          {paymentStep === 2 && (
              <div className="space-y-6 flex flex-col items-center">
                  <div className="bg-white border border-gray-200 shadow-md p-6 w-full rounded-lg text-sm text-gray-800 font-mono relative">
                      <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4 text-center">
                          <h3 className="font-bold text-lg uppercase mb-1">TRUSTABLE CHITS</h3>
                          <p className="text-xs text-gray-500">Payment Receipt</p>
                      </div>
                      <div className="space-y-3 mb-6">
                          <div className="flex justify-between">
                              <span className="text-gray-500">Date:</span>
                              <span>{paymentForm.date}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Subscriber:</span>
                              <span className="font-bold">{paymentForm.subscriberName}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Mode:</span>
                              <span>{paymentForm.mode}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Status:</span>
                              <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Verified</span>
                          </div>
                      </div>
                      <div className="border-t-2 border-dashed border-gray-300 pt-4 flex justify-between items-center text-lg font-bold">
                          <span>TOTAL</span>
                          <span>₹{parseFloat(paymentForm.amount).toLocaleString()}</span>
                      </div>
                  </div>

                  <div className="flex gap-4 w-full">
                      <Button variant="outline" className="flex-1" onClick={() => {
                          setOfflinePaymentModalOpen(false);
                          setPaymentForm(prev => ({ ...prev, enrollmentId: '', amount: '' }));
                      }}>Close</Button>
                      <Button className="flex-1 flex items-center justify-center gap-2" onClick={() => window.print()}>
                          <Printer size={16} /> Print
                      </Button>
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};
