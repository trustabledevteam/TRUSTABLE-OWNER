import React, { useState } from 'react';
import { 
  Briefcase, User, FileText, Grid, Shield, HelpCircle, 
  Settings as SettingsIcon, LogOut, Smartphone, Laptop, 
  Check, ChevronRight, Lock, Mail, CreditCard, Landmark,
  Bell, FileCheck, Phone, Mail as MailIcon, ExternalLink,
  RotateCcw
} from 'lucide-react';
import { Button, Input, Card } from '../components/UI';

/* --- Components for each Settings Section --- */

const BusinessSettings = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="flex items-center gap-2 mb-6 text-gray-800">
       <Briefcase size={24} className="text-gray-500" />
       <h2 className="text-xl font-bold">Business Settings</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
       <Input label="Auction Frequency" placeholder="" />
       <Input label="Discount Minimum" placeholder="" />
       <Input label="Discount Maximum" placeholder="" />
       
       <Input label="Late Fee" placeholder="" />
       <Input label="Security Requirement" placeholder="" />
       <Input label="Guarantor Requirement" placeholder="" />
       
       <Input label="Grace Period" placeholder="" />
       <Input label="Default Status Period" placeholder="" />
       <Input label="Monthly Auction Date" placeholder="" />
    </div>

    <div className="flex justify-end pt-8">
       <Button className="w-32 rounded-full flex items-center justify-between px-4">
          Confirm <div className="bg-black rounded-full p-0.5 ml-2"><ChevronRight size={12} className="text-white"/></div>
       </Button>
    </div>
  </div>
);

const AccountSettings = () => {
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-6 text-gray-800">
         <User size={24} className="text-gray-500" />
         <h2 className="text-xl font-bold">Account Settings</h2>
      </div>

      {/* Profile Section */}
      <section>
         <h3 className="text-lg font-bold text-gray-800 mb-4">My Profile</h3>
         <div className="flex items-center gap-6 mb-6">
            <img src="https://picsum.photos/seed/admin/100/100" alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            <div className="flex gap-3">
               <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">Change Image</button>
               <button className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Remove Image</button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <Input label="Name" placeholder="Moni Roy" />
            <Input label="Company" placeholder="Trustable Solutions" />
         </div>
      </section>

      {/* Security Section */}
      <section>
         <h3 className="text-lg font-bold text-gray-800 mb-4">Account Security</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6">
            <div className="flex items-end gap-3">
               <div className="flex-1">
                 <Input label="Email" value="admin@trustable.com" readOnly />
               </div>
               <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 h-10 mb-[1px]">Change Email</button>
            </div>
            <div className="flex items-end gap-3">
               <div className="flex-1">
                 <Input label="Password" type="password" value="password123" readOnly />
               </div>
               <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 h-10 mb-[1px]">Change Password</button>
            </div>
         </div>

         <div className="flex items-center justify-between py-4 border-t border-gray-100 border-b">
            <div>
               <h4 className="font-bold text-gray-800 text-sm">2-Step Verification</h4>
               <p className="text-xs text-gray-500 mt-1">Add an additional layer of security to your account during login</p>
            </div>
            <button 
               onClick={() => setTwoFactor(!twoFactor)}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactor ? 'bg-blue-500' : 'bg-gray-200'}`}
            >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactor ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
         </div>
      </section>

      {/* Linked Devices */}
      <section>
         <h3 className="text-lg font-bold text-gray-800 mb-4">Linked device</h3>
         <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
               <div className="flex items-center gap-4">
                  <Smartphone className="text-gray-500" size={24} />
                  <div>
                     <p className="font-bold text-gray-900 text-sm">Samsung A55</p>
                     <p className="text-[10px] text-gray-400">Last used 3d ago</p>
                  </div>
               </div>
               <button className="px-4 py-1 rounded-full border border-gray-300 text-xs font-medium hover:bg-gray-50">Logout</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
               <div className="flex items-center gap-4">
                  <Laptop className="text-gray-500" size={24} />
                  <div>
                     <p className="font-bold text-gray-900 text-sm">Lenovo ideapad slim 3i</p>
                     <p className="text-[10px] text-gray-400">Last used 1d ago</p>
                  </div>
               </div>
               <button className="px-4 py-1 rounded-full border border-gray-300 text-xs font-medium hover:bg-gray-50">Logout</button>
            </div>
         </div>
      </section>
    </div>
  );
};

const BillingInformation = () => (
  <div className="space-y-8 animate-in fade-in duration-300">
    <div className="flex items-center gap-2 mb-6 text-gray-800">
       <FileText size={24} className="text-gray-500" />
       <h2 className="text-xl font-bold">Billing Information</h2>
    </div>

    {/* Current Plan */}
    <div className="border border-gray-300 rounded-lg p-6">
       <div className="flex items-center gap-2 text-gray-600 mb-4">
          <Shield size={18} /> <span className="text-sm font-medium">Current Plan</span>
       </div>
       <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-2xl font-bold text-gray-900">Standard</h3>
          <span className="text-xs text-gray-400 line-through">₹250/Month</span>
       </div>
       <p className="text-xs text-gray-500">Best for mid ranged chit funds</p>
    </div>

    {/* Billing Info */}
    <div className="border border-gray-300 rounded-lg p-6">
       <div className="flex items-center gap-2 text-gray-600 mb-6">
          <CreditCard size={18} /> <span className="text-sm font-medium">Billing Info</span>
       </div>
       
       <div className="space-y-6">
          <div>
             <h4 className="font-bold text-gray-800 mb-2">Current Payment Method</h4>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                   <Landmark size={20} />
                </div>
                <div>
                   <p className="text-sm font-medium text-gray-900">Netbanking</p>
                   <p className="text-xs text-gray-400">xxxxxx435</p>
                </div>
             </div>
          </div>

          <div>
             <h4 className="font-bold text-gray-800 mb-1">Billing Address</h4>
             <p className="text-sm text-gray-600">102 north street Thirunageshwaram</p>
          </div>
       </div>
    </div>

    {/* History */}
    <div className="border border-gray-300 rounded-lg p-6">
       <div className="flex items-center gap-2 text-gray-600 mb-4">
          <FileText size={18} /> <span className="text-sm font-medium">Subscriptions History</span>
       </div>
       <div className="space-y-3">
          <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
             <span className="text-gray-600 font-medium">Next Subscription due</span>
             <span className="text-gray-900">21.11.2025</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
             <RotateCcw size={12} className="text-blue-500" /> Last Subscription made on 11.11.2025
          </div>
       </div>
    </div>
  </div>
);

const Integrations = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="flex items-center gap-2 mb-6 text-gray-800">
       <Grid size={24} className="text-gray-500" />
       <h2 className="text-xl font-bold">Integrations</h2>
    </div>

    <div className="border border-gray-700 rounded-lg p-6 flex items-center gap-6">
       <div className="w-16 h-16 bg-[#0091FF] rounded-full flex-shrink-0"></div>
       <div>
          <h3 className="font-bold text-gray-800">Razor Pay</h3>
          <p className="text-sm text-gray-500">Payment Gateway</p>
       </div>
    </div>

    <div className="border border-gray-700 rounded-lg p-6 flex items-center gap-6">
       <div className="w-16 h-16 bg-[#0091FF] rounded-full flex-shrink-0"></div>
       <div>
          <h3 className="font-bold text-gray-800">City Union Bank</h3>
          <p className="text-sm text-gray-500">Bank account</p>
       </div>
    </div>
  </div>
);

const PrivacyPolicy = () => (
   <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      <div className="flex items-center gap-2 mb-2 text-gray-800">
         <Shield size={24} className="text-gray-500" />
         <h2 className="text-xl font-bold text-blue-500">Privacy Policy</h2>
      </div>
      
      <p className="text-xs text-gray-500 uppercase tracking-wide">LAST UPDATED: October 28, 2024</p>
      
      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
         <section>
            <h3 className="text-blue-500 font-medium mb-2">1. Information We Collect</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <ul className="list-disc pl-5 space-y-1">
               <li>Personal identification</li>
               <li>Financial information</li>
               <li>Usage data</li>
               <li>Communication data</li>
            </ul>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">2. How We Use Your Information</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <ul className="list-disc pl-5 space-y-1">
               <li>To provide our services</li>
               <li>To improve our platform</li>
               <li>To communicate with you</li>
               <li>For legal compliance</li>
            </ul>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">3. Data Protection</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <ul className="list-disc pl-5 space-y-1">
               <li>Encryption standards</li>
               <li>Access controls</li>
               <li>Regular audits</li>
            </ul>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">4. Your Rights</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <ul className="list-disc pl-5 space-y-1">
               <li>Access your data</li>
               <li>Correct your data</li>
               <li>Delete your data</li>
               <li>Opt-out of marketing</li>
            </ul>
         </section>
      </div>
      
      <div className="pt-8 text-xs text-gray-500">
         <p>[I Agree to Privacy Policy] [Checkbox - Already checked if agreed]</p>
         <p>[Download PDF Version]</p>
      </div>
   </div>
);

const TermsConditions = () => (
   <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      <div className="flex items-center gap-2 mb-2 text-gray-800">
         <FileCheck size={24} className="text-gray-500" />
         <h2 className="text-xl font-bold text-gray-800">Terms & Conditions</h2>
      </div>
      
      <p className="text-xs text-gray-500 uppercase tracking-wide">LAST UPDATED: October 28, 2024</p>
      
      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
         <section>
            <h3 className="text-blue-500 font-medium mb-2">1. Acceptance of Terms</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <p>By using TRUSTABLE, you agree to these terms.</p>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">2. Service Description</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <p>TRUSTABLE is a chit fund aggregation platform...</p>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">3. User Responsibilities</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <ul className="list-disc pl-5 space-y-1">
               <li>Provide accurate information</li>
               <li>Maintain account security</li>
               <li>Comply with chit fund laws</li>
               <li>Make timely payments</li>
            </ul>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">4. Platform Responsibilities</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <ul className="list-disc pl-5 space-y-1">
               <li>Maintain service availability</li>
               <li>Protect user data</li>
               <li>Verify listed chit funds</li>
               <li>Provide customer support</li>
            </ul>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">5. Limitation of Liability</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <p>[Legal disclaimers]</p>
         </section>

         <section>
            <h3 className="text-blue-500 font-medium mb-2">6. Termination</h3>
            <div className="border-b border-gray-300 w-32 mb-3"></div>
            <p>Conditions for account termination</p>
         </section>
      </div>

      <div className="pt-8 text-xs text-gray-500">
         <p>[I Agree to Terms] [Checkbox - Already checked if agreed] [Download PDF Version]</p>
      </div>
   </div>
);

const HelpSupport = () => (
   <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-gray-800">
         <HelpCircle size={24} className="text-gray-500" />
         <h2 className="text-xl font-bold text-blue-500">Help & Support</h2>
      </div>

      <p className="text-gray-600">Need assistance? We're here to help you every step of the way.</p>

      <div className="space-y-8">
         <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Phone Support</h3>
            <p className="text-blue-500 font-medium mb-2">Toll-Free 1800-38473972</p>
            <div className="text-sm text-gray-500 space-y-1">
               <p><span className="font-medium text-gray-700">Business Hours</span> <span className="text-blue-500">10 am - 5 pm</span></p>
               <p>For urgent clarification on payment issues</p>
            </div>
         </div>

         <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Email Support</h3>
            <p className="text-gray-800 font-medium mb-2">trustable.biz@gmail.com</p>
            <div className="text-sm text-gray-500 space-y-1">
               <p><span className="font-medium text-gray-700">Response</span> <span className="text-blue-500">10 am - 5 pm</span></p>
               <p>For detailed queries on the tools</p>
            </div>
         </div>
      </div>
   </div>
);

/* --- Main Settings Page --- */

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('business');

  const menuItems = [
    { id: 'business', label: 'Business Settings', icon: Briefcase },
    { id: 'account', label: 'Account Settings', icon: User },
    { id: 'billing', label: 'Billing Information', icon: FileText },
    { id: 'integrations', label: 'Integrations', icon: Grid },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'terms', label: 'Terms & Conditions', icon: FileCheck },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'business': return <BusinessSettings />;
      case 'account': return <AccountSettings />;
      case 'billing': return <BillingInformation />;
      case 'integrations': return <Integrations />;
      case 'privacy': return <PrivacyPolicy />;
      case 'terms': return <TermsConditions />;
      case 'help': return <HelpSupport />;
      default: return <BusinessSettings />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] -m-6 bg-white overflow-hidden">
       {/* Sidebar Navigation */}
       <div className="w-64 border-r border-gray-200 p-6 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 mb-8 text-gray-900">
             <SettingsIcon size={24} />
             <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          
          <nav className="space-y-2">
             {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                   <button
                     key={item.id}
                     onClick={() => setActiveTab(item.id)}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive 
                           ? 'text-blue-500 bg-blue-50' 
                           : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                     }`}
                   >
                      <Icon size={18} />
                      {item.label}
                   </button>
                );
             })}
          </nav>
       </div>

       {/* Content Area */}
       <div className="flex-1 p-12 overflow-y-auto">
          <div className="max-w-4xl">
             {renderContent()}
          </div>
       </div>
    </div>
  );
};