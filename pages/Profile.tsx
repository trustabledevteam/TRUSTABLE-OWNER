
import React, { useState, useEffect } from 'react';
import { Card, Input, Button } from '../components/UI';
import { User, Building2, Landmark, Pencil, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

export const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'company' | 'banking'>('personal');
  const [ownerPhoto, setOwnerPhoto] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'banking', label: 'Banking', icon: Landmark },
  ];

  // Helper to extract company details correctly even if it's an array or object
  const getCompanyDetails = () => {
      if (!profile?.companies) return {};
      if (Array.isArray(profile.companies)) {
          return profile.companies[0] || {};
      }
      return profile.companies;
  };

  const company = getCompanyDetails();

  useEffect(() => {
    const fetchImages = async () => {
        if (!profile?.id) return;
        setLoadingImages(true);
        
        try {
            const { data: docs, error } = await supabase
                .from('documents')
                .select('document_type, file_path')
                .eq('owner_id', profile.id)
                .in('document_type', ['owner_photo', 'company_logo']);

            if (docs) {
                const photoEntry = docs.find(d => d.document_type === 'owner_photo');
                const logoEntry = docs.find(d => d.document_type === 'company_logo');

                if (photoEntry) {
                    const { data } = supabase.storage.from('company-onboarding-doc').getPublicUrl(photoEntry.file_path);
                    setOwnerPhoto(data.publicUrl);
                }
                
                if (logoEntry) {
                    const { data } = supabase.storage.from('company-onboarding-doc').getPublicUrl(logoEntry.file_path);
                    setCompanyLogo(data.publicUrl);
                }
            }
        } catch (err) {
            console.error("Error fetching profile images:", err);
        } finally {
            setLoadingImages(false);
        }
    };

    fetchImages();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-6">
        <User className="text-gray-400" /> My Profile
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8 min-h-[500px]">
          {activeTab === 'personal' && (
            <div className="max-w-4xl animate-in fade-in">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  {loadingImages ? (
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                          <Loader2 className="animate-spin text-gray-400" size={24} />
                      </div>
                  ) : (
                      <img 
                        src={ownerPhoto || "https://picsum.photos/100/100"} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-gray-100"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=No+Img";
                        }}
                      />
                  )}
                  <button className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors shadow-sm">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Input label="Name" defaultValue={profile?.full_name || ''} readOnly className='bg-gray-50' />
                <Input label="Phone Number" defaultValue={profile?.phone || ''} readOnly className='bg-gray-50' />
                <Input label="Email" defaultValue={profile?.email || 'email@example.com'} readOnly className='bg-gray-50' />
                <Input label="Date Of Birth" type="date" defaultValue={profile?.dob || ''} readOnly className='bg-gray-50' />
                <div className="md:col-span-2">
                  <Input label="Address" defaultValue={profile?.address || ''} readOnly className='bg-gray-50' />
                </div>
                <Input label="City" defaultValue={profile?.city || ''} readOnly className='bg-gray-50' />
                <Input label="State" defaultValue={profile?.state || ''} readOnly className='bg-gray-50' />
                <Input label="PAN Number" defaultValue={profile?.pan_number || ''} readOnly className='bg-gray-50' />
                <Input label="Aadhaar Number" defaultValue={profile?.aadhaar_number || ''} readOnly className='bg-gray-50' />
              </div>
            </div>
          )}

          {activeTab === 'company' && (
             <div className="max-w-4xl animate-in fade-in">
               <div className="flex justify-center mb-8">
                 <div className="w-24 h-24 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center relative group cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden">
                    {loadingImages ? (
                        <Loader2 className="animate-spin text-gray-400" size={24} />
                    ) : companyLogo ? (
                        <img 
                            src={companyLogo} 
                            alt="Company Logo" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = ""; // Clear on error to show icon
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : (
                        <div className="text-center">
                            <div className="bg-black text-white p-2 rounded-full inline-block mb-1">
                                <Building2 size={24} />
                            </div>
                        </div>
                    )}
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                 <Input label="Owner Name" defaultValue={profile?.full_name || ''} readOnly className='bg-gray-50' />
                 <Input label="Company Name" defaultValue={company?.company_name || ''} readOnly className='bg-gray-50' />
                 <Input label="Date Of Incorporation" type="date" defaultValue={company?.incorporation_date || ''} readOnly className='bg-gray-50' />
                 <Input label="CIN" defaultValue={company?.cin_number || ''} readOnly className='bg-gray-50' />
                 <Input label="GST Number" defaultValue={company?.gst_number || ''} readOnly className='bg-gray-50' />
                 <div className="md:col-span-2">
                    <Input label="Company Address" defaultValue={company?.address || ''} readOnly className='bg-gray-50' />
                 </div>
                 <Input label="City" defaultValue={company?.city || ''} readOnly className='bg-gray-50' />
                 <Input label="State" defaultValue={company?.state || ''} readOnly className='bg-gray-50' />
                 <Input label="Pin Code" defaultValue={company?.pincode || ''} readOnly className='bg-gray-50' />
                 <Input label="Company PAN" defaultValue={company?.company_pan || ''} readOnly className='bg-gray-50' />
               </div>
             </div>
          )}

          {activeTab === 'banking' && (
             <div className="max-w-4xl animate-in fade-in">
               <div className="flex justify-center mb-8">
                 <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md">
                    <Landmark size={32} />
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                 <Input label="Account Holder Name" defaultValue={profile?.full_name || ''} readOnly className='bg-gray-50' />
                 <Input label="Account Number" defaultValue={company?.account_number || ''} readOnly className='bg-gray-50' />
                 <Input label="Bank Name" defaultValue={company?.bank_name || ''} readOnly className='bg-gray-50' />
                 <Input label="Branch Name" defaultValue={company?.branch_name || ''} readOnly className='bg-gray-50' />
                 <Input label="IFSC Code" defaultValue={company?.ifsc_code || ''} readOnly className='bg-gray-50' />
                 <Input label="Account Type" defaultValue="Current" readOnly className='bg-gray-50' />
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
