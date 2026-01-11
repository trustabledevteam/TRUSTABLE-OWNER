import React, { useState } from 'react';
import { User, Briefcase, FileCheck, MessageSquare, ChevronLeft, MapPin, Building2, Phone, Mail, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input } from '../components/UI';

export const SubscriberProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'kyc'>('personal');

  // Mock data
  const user = {
    name: 'Ragavan S',
    email: 'sragavan1998@gmail.com',
    phone: '+91 9876543210',
    avatar: 'https://picsum.photos/seed/ragavan/200/200',
    occupation: 'Software developer',
    state: 'TamilNadu',
    district: 'Tanjore',
    // Detailed Address Breakdown
    addressDoorNo: '123/B',
    addressStreet: 'North Car Street',
    addressLandmark: 'Near Big Temple',
    addressCity: 'Kumbakonam',
    addressState: 'TamilNadu',
    pinCode: '613001',
    company: 'Tech Solutions Inc',
    officeLocation: 'Chennai, OMR',
    experience: '4 Years',
    monthlyIncome: '₹65,000',
    pan: 'ABCDE1234F',
    aadhaar: 'XXXX XXXX 1234',
    housingStatus: 'Own House' // Added field
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'kyc', label: 'KYC - Details', icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button 
           onClick={() => navigate(-1)}
           className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group"
        >
           <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
           Back to Search
        </button>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                    <User size={24} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Subscriber Profile</h1>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" className="flex items-center gap-2" onClick={() => alert(`Messaging ${user.name}...`)}>
                    <MessageSquare size={16} /> Message
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    Invite to Scheme
                </Button>
            </div>
        </div>
      </div>

      {/* Main Content Card matching Profile.tsx style */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Profile Header inside Card */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-6">
                <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-24 h-24 rounded-full border-4 border-white shadow-sm object-cover"
                />
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-gray-500 flex items-center gap-2 text-sm mt-1">
                        <Briefcase size={14} /> {user.occupation}
                    </p>
                    <p className="text-gray-500 flex items-center gap-2 text-sm mt-1">
                        <MapPin size={14} /> {user.addressCity}, {user.state}
                    </p>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-4">
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
                  <Icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8 min-h-[400px]">
          {activeTab === 'personal' && (
            <div className="max-w-4xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <Input label="Full Name" value={user.name} readOnly className="bg-gray-50" />
                    <Input label="Phone Number" value={user.phone} readOnly className="bg-gray-50" />
                    <Input label="Email Address" value={user.email} readOnly className="bg-gray-50" />
                    <Input label="Occupation" value={user.occupation} readOnly className="bg-gray-50" />
                </div>
                
                <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500" /> Address Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                        <Input label="Door No / Flat No" value={user.addressDoorNo} readOnly className="bg-gray-50" />
                        <div className="md:col-span-2">
                             <Input label="Street Name" value={user.addressStreet} readOnly className="bg-gray-50" />
                        </div>
                        <Input label="Landmark" value={user.addressLandmark} readOnly className="bg-gray-50" />
                        <Input label="City" value={user.addressCity} readOnly className="bg-gray-50" />
                        <Input label="District" value={user.district} readOnly className="bg-gray-50" />
                        <Input label="State" value={user.addressState} readOnly className="bg-gray-50" />
                        <Input label="Pin Code" value={user.pinCode} readOnly className="bg-gray-50" />
                        <Input label="Housing Status" value={user.housingStatus} readOnly className="bg-gray-50" />
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'employment' && (
             <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                 <Input label="Company Name" value={user.company} readOnly className="bg-gray-50" />
                 <Input label="Designation" value="Senior Developer" readOnly className="bg-gray-50" />
                 <div className="md:col-span-2">
                    <Input label="Office Location" value={user.officeLocation} readOnly className="bg-gray-50" />
                 </div>
                 <Input label="Total Experience" value={user.experience} readOnly className="bg-gray-50" />
                 <Input label="Monthly Income" value={user.monthlyIncome} readOnly className="bg-gray-50" />
             </div>
          )}

          {activeTab === 'kyc' && (
             <div className="max-w-4xl">
                 <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-start gap-3">
                    <FileCheck className="text-blue-500 mt-1" size={20} />
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">KYC Verification Status</h3>
                        <p className="text-xs text-gray-600 mt-1">This user has completed basic KYC verification. Sensitive document numbers are hidden until they join your chit scheme.</p>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full ml-auto">Verified</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                     <div className="relative">
                        <Input label="PAN Number" value="XXXXXXXXXX" readOnly className="bg-gray-50 text-gray-400" />
                        <div className="absolute top-8 right-3 text-gray-400"><Lock size={16} /></div>
                     </div>
                     <div className="relative">
                        <Input label="Aadhaar Number" value="XXXX-XXXX-XXXX" readOnly className="bg-gray-50 text-gray-400" />
                        <div className="absolute top-8 right-3 text-gray-400"><Lock size={16} /></div>
                     </div>
                 </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};