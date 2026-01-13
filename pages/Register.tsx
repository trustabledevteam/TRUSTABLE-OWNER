
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, ArrowRight, ArrowLeft, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/UI';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface RegisterProps {
  onRegisterSuccess?: () => void;
}

const StepLayout = ({ title, stepNum, children, onNext, onPrev, nextLabel = "Next", loading, error }: any) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-sm border border-gray-100 p-10 min-h-[600px] flex flex-col relative">
              <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-8">Register As Company</h1>
                  <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-md z-10 relative">
                          {stepNum}
                      </div>
                      <h2 className="text-2xl font-bold text-blue-500">{title}</h2>
                      <div className="h-0.5 bg-blue-500 flex-1 ml-4 rounded-full"></div>
                  </div>
                  {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mt-4 flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {children}
              </div>

              <div className="flex justify-between pt-8 mt-auto border-t border-gray-100">
                  {onPrev && (
                      <button onClick={onPrev} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                          <ArrowLeft size={16} /> Previous
                      </button>
                  )}
                  <div className="ml-auto">
                      <button 
                          onClick={onNext} 
                          disabled={loading}
                          className="bg-blue-500 text-white px-8 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-70"
                      >
                          {loading && <Loader2 className="animate-spin" size={16} />} {nextLabel} <ArrowRight size={16} />
                      </button>
                  </div>
              </div>
        </div>
    </div>
);

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tempCompanyId, setTempCompanyId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      // Account
      email: '', username: '', password: '', terms: false,
      // Owner
      name: '', phone: '', dob: '', address: '', city: '', state: '', pin: '', pan: '', aadhaar: '', gender: 'Male',
      // Company
      companyName: '', incDate: '', cin: '', gst: '', companyPan: '', compAddress: '', compCity: '', compState: '', compPin: '',
      // Banking
      holderName: '', accNum: '', bankName: '', branch: '', ifsc: '', type: 'Current'
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
      ownerPhoto: null, ownerPan: null, ownerAadhaar: null, ownerAddressProof: null,
      companyMoa: null, companyRoc: null, companyLogo: null, bankProof: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
      }
  };

  const handleSignUp = async () => {
      if (!formData.email || !formData.password) return setError("Please provide email and password");
      if (!formData.terms) return setError("Please accept the terms and conditions");

      setLoading(true); setError(null);
      try {
          const { data, error } = await supabase.auth.signUp({
              email: formData.email,
              password: formData.password,
              options: { data: { full_name: formData.username } }
          });
          if (error) throw error;
          if (data.user) {
              setUserId(data.user.id);
              if (data.session) {
                  setTimeout(() => { setStep(1); setLoading(false); }, 1500);
              } else {
                  setLoading(false);
                  alert("Please check your email to confirm account.");
                  navigate('/login');
              }
          }
      } catch (err: any) { setError(err.message); setLoading(false); }
  };

  const handleOwnerDetails = async () => {
      if (!userId) return;
      setLoading(true); setError(null);
      try {
          // Use Upsert to ensure profile exists. 
          // If the trigger failed to create the profile on signup, this will create it.
          const { error } = await supabase.from('profiles').upsert({
              id: userId,
              email: formData.email, // Ensure email is present
              full_name: formData.name,
              phone: formData.phone,
              dob: formData.dob || null,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              pan_number: formData.pan,
              aadhaar_number: formData.aadhaar,
              role: 'OWNER' // Explicitly set role
          });

          if (error) throw error;
          
          await uploadDocument(userId, 'owner_pan', files.ownerPan, 'owner-kyc');
          await uploadDocument(userId, 'owner_aadhaar', files.ownerAadhaar, 'owner-kyc');
          await uploadDocument(userId, 'owner_photo', files.ownerPhoto, 'owner-kyc');
          await uploadDocument(userId, 'owner_address', files.ownerAddressProof, 'owner-kyc');

          setStep(2);
      } catch (err: any) { setError(err.message); } 
      finally { setLoading(false); }
  };

  const handleCompanyDetails = async () => {
      if (!userId) return;
      setLoading(true); setError(null);
      try {
          const { data, error } = await supabase.from('companies').insert([{
              owner_id: userId,
              company_name: formData.companyName,
              incorporation_date: formData.incDate || null,
              cin_number: formData.cin,
              gst_number: formData.gst,
              company_pan: formData.companyPan,
              address: formData.compAddress,
              city: formData.compCity,
              state: formData.compState,
              pincode: formData.compPin
          }]).select().single();

          if (error) throw error;
          setTempCompanyId(data.id);

          await supabase.from('profiles').update({ company_id: data.id }).eq('id', userId);

          await uploadDocument(userId, 'company_moa', files.companyMoa, 'company-verification-doc', data.id);
          await uploadDocument(userId, 'company_roc', files.companyRoc, 'company-verification-doc', data.id);
          await uploadDocument(userId, 'company_logo', files.companyLogo, 'company-verification-doc', data.id);
          
          setStep(3);
      } catch (err: any) { setError(err.message); } 
      finally { setLoading(false); }
  };

  const handleBankingAndFinish = async () => {
      if (!userId || !tempCompanyId) return;
      setLoading(true); setError(null);
      try {
          await supabase.from('companies').update({
              bank_name: formData.bankName,
              branch_name: formData.branch,
              account_number: formData.accNum,
              ifsc_code: formData.ifsc
          }).eq('id', tempCompanyId);

          await uploadDocument(userId, 'bank_proof', files.bankProof, 'company-verification-doc', tempCompanyId);

          // Set status to SUBMITTED for admin review
          await supabase.from('profiles').update({ verification_status: 'SUBMITTED' }).eq('id', userId);
          
          // Refresh context so App.tsx knows user is pending
          await refreshProfile();

          setStep(4);
          setTimeout(() => setStep(5), 2000);
      } catch (err: any) { 
          console.error("Error finishing registration:", err);
          setError(err.message); 
          setLoading(false); 
      }
  };

  const uploadDocument = async (userId: string, type: string, file: File | null, folder: 'owner-kyc' | 'company-verification-doc', companyId?: string) => {
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const filePath = `${folder}/${userId}/${type}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('company-onboarding-doc').upload(filePath, file);

      if (!uploadError) {
          await supabase.from('documents').insert([{
              owner_id: userId,
              company_id: companyId,
              document_type: type,
              file_path: filePath,
              status: 'SUBMITTED'
          }]);
      }
  };

  const handleExplore = async () => {
      await refreshProfile(); 
      if (onRegisterSuccess) onRegisterSuccess();
      navigate('/dashboard');
  };

  if (step === 0) return (
      <div className="min-h-screen bg-blue-500 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10">
              <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Create an Account</h2>
                  <p className="text-gray-500 text-sm">Join Trustable to manage your chit funds</p>
              </div>
              {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 flex gap-2"><AlertCircle size={16}/> {error}</div>}
              <div className="space-y-5">
                  <div><label className="text-xs font-bold text-gray-600 block mb-1">Email address:</label><input name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-100 border-none rounded-lg p-3 text-sm outline-none" placeholder="admin@example.com" /></div>
                  <div><label className="text-xs font-bold text-gray-600 block mb-1">Username (Full Name)</label><input name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-100 border-none rounded-lg p-3 text-sm outline-none" placeholder="John Doe" /></div>
                  <div><label className="text-xs font-bold text-gray-600 block mb-1">Password</label><input name="password" type="password" value={formData.password} onChange={handleChange} className="w-full bg-gray-100 border-none rounded-lg p-3 text-sm outline-none" placeholder="••••••" /></div>
                  <div className="flex items-center gap-2 mt-2"><input type="checkbox" name="terms" checked={formData.terms} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" /><label className="text-xs text-gray-600">I accept terms and conditions</label></div>
                  <button onClick={handleSignUp} disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 flex justify-center items-center gap-2">{loading && <Loader2 className="animate-spin" size={18} />} Sign Up</button>
                  <div className="text-center text-xs text-gray-500 mt-4">Already have an account? <span className="text-blue-500 font-bold cursor-pointer" onClick={() => navigate('/login')}>Login</span></div>
              </div>
          </div>
      </div>
  );

  if (step === 1) return (
      <StepLayout title="Owner Details" stepNum="01" onNext={handleOwnerDetails} loading={loading} error={error}>
          {/* Owner Form fields ... same as before */}
          <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Name</label><input name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Phone Number</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Date Of Birth</label><input name="dob" type="date" value={formData.dob} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Gender</label><select name="gender" value={formData.gender} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none bg-white"><option>Male</option><option>Female</option></select></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Address</label><input name="address" value={formData.address} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">City</label><input name="city" value={formData.city} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">State</label><input name="state" value={formData.state} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Pin Code</label><input name="pin" value={formData.pin} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">PAN Number</label><input name="pan" value={formData.pan} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1"><label className="text-gray-500 text-xs font-semibold">Aadhaar Number</label><input name="aadhaar" value={formData.aadhaar} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                  {[{ label: 'Aadhaar Card', key: 'ownerAadhaar' }, { label: 'Pan Card', key: 'ownerPan' }, { label: 'Address Proof', key: 'ownerAddressProof' }, { label: 'Photo', key: 'ownerPhoto' }].map((doc: any) => (
                      <div key={doc.key}>
                          <label className="text-gray-500 text-xs font-semibold block mb-2">{doc.label}</label>
                          <div className="flex relative">
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange(doc.key)} />
                              <div className={`bg-blue-50 text-gray-700 text-[10px] font-bold py-3 px-4 border ${files[doc.key] ? 'border-green-400 bg-green-50' : 'border-blue-200'} border-r-0 rounded-l-lg flex-1 text-left truncate`}>{files[doc.key] ? files[doc.key]?.name : "Upload doc"}</div>
                              <div className="bg-white border border-blue-300 text-blue-500 px-3 flex items-center justify-center rounded-r-lg"><Upload size={14} /></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </StepLayout>
  );

  if (step === 2) return (
      <StepLayout title="Company Details" stepNum="02" onNext={handleCompanyDetails} loading={loading} error={error}>
          {/* Company Form fields... same as before */}
          <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Company Name</label><input name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Date Of Incorporation</label><input name="incDate" type="date" value={formData.incDate} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">CIN</label><input name="cin" value={formData.cin} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">GST Number</label><input name="gst" value={formData.gst} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Company PAN</label><input name="companyPan" value={formData.companyPan} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Company Address</label><input name="compAddress" value={formData.compAddress} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">City</label><input name="compCity" value={formData.compCity} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">State</label><input name="compState" value={formData.compState} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                      <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Pin Code</label><input name="compPin" value={formData.compPin} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                      {[{label: 'MOA', key: 'companyMoa'}, {label: 'ROC Certificates', key: 'companyRoc'}, {label: 'Company Logo', key: 'companyLogo'}].map((doc: any) => (
                          <div key={doc.key}>
                              <label className="text-gray-500 text-xs font-semibold block mb-2">{doc.label}</label>
                              <div className="flex relative">
                                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange(doc.key)} />
                                  <div className={`bg-blue-50 text-gray-700 text-[10px] font-bold py-3 px-4 border ${files[doc.key] ? 'border-green-400 bg-green-50' : 'border-blue-200'} border-r-0 rounded-l-lg flex-1 text-left truncate`}>{files[doc.key] ? files[doc.key]?.name : "Upload doc"}</div>
                                  <div className="bg-white border border-blue-300 text-blue-500 px-3 flex items-center justify-center rounded-r-lg"><Upload size={14} /></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
      </StepLayout>
  );

  if (step === 3) return (
      <StepLayout title="Banking Details" stepNum="03" onNext={handleBankingAndFinish} nextLabel="Finish" loading={loading} error={error}>
          {/* Banking Form fields... same as before */}
          <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Account Holder Name</label><input name="holderName" value={formData.holderName} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Account Number</label><input name="accNum" value={formData.accNum} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Bank Name</label><input name="bankName" value={formData.bankName} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Branch Name</label><input name="branch" value={formData.branch} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">IFSC Code</label><input name="ifsc" value={formData.ifsc} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
                  <div className="space-y-1 md:col-span-1"><label className="text-gray-500 text-xs font-semibold">Account Type</label><input name="type" value={formData.type} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-2.5 outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                  <div>
                      <label className="text-gray-500 text-xs font-semibold block mb-2">Cancelled Cheque / Passbook</label>
                      <div className="flex relative">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange('bankProof')} />
                          <div className={`bg-blue-50 text-gray-700 text-[10px] font-bold py-3 px-4 border ${files.bankProof ? 'border-green-400 bg-green-50' : 'border-blue-200'} border-r-0 rounded-l-lg flex-1 text-left truncate`}>{files.bankProof ? files.bankProof.name : "Upload doc"}</div>
                          <div className="bg-white border border-blue-300 text-blue-500 px-3 flex items-center justify-center rounded-r-lg"><Upload size={14} /></div>
                      </div>
                  </div>
              </div>
          </div>
      </StepLayout>
  );

  if (step === 4) return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
          <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><CheckCircle className="text-gray-600" size={32} /></div>
          </div>
          <p className="text-gray-500 text-sm font-medium text-center">Setting up your dashboard...</p>
      </div>
  );

  if (step === 5) return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row items-center justify-center p-12 gap-12">
          <div className="flex-1 flex justify-center">
              <div className="w-64 h-64 bg-yellow-50 rounded-full flex items-center justify-center relative">
                  <div className="absolute top-0 right-0 bg-yellow-500 rounded-full p-2 text-white shadow-md"><Clock size={24} /></div>
                  <div className="text-yellow-600 text-2xl font-bold">Under Review</div>
              </div>
          </div>
          <div className="flex-1 max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">Your account is now under review. Verification typically takes 24-48 hours. We will notify you via email once it's complete.</p>
              <button onClick={handleExplore} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2">Go to Dashboard <ArrowRight size={16} /></button>
          </div>
      </div>
  );

  return null;
};
