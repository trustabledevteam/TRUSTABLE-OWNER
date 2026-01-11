import React from 'react';
import { Bell, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/UI';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
         <button 
           onClick={() => navigate(-1)}
           className="flex items-center text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium group bg-white p-2 rounded-lg shadow-sm border border-gray-100"
         >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
         </button>
         <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] p-8">
         <div className="flex items-center gap-2 mb-8">
            <Bell className="text-blue-500" size={28} />
            <h2 className="text-2xl font-bold text-blue-500">Notification</h2>
         </div>

         <div className="space-y-4">
            {/* Notification Item 1 - Action Required */}
            <div className="bg-blue-50/50 rounded-xl p-6 relative group transition-all hover:bg-blue-50">
               <div className="absolute top-6 left-4 w-2 h-2 bg-blue-500 rounded-full"></div>
               <div className="flex items-start gap-4 pl-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-base flex-shrink-0">
                     AB
                  </div>
                  <div className="flex-1">
                     <p className="text-gray-700 mb-4 leading-relaxed">
                        <span className="font-bold text-gray-900">Royal chit fund</span> has accepted your request to join their scheme
                     </p>
                     <div className="flex gap-3">
                        <button className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors shadow-blue-200">
                           Accept
                        </button>
                        <button className="px-6 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                           Decline
                        </button>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className="text-xs text-gray-400 font-medium">2m</span>
                     <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal size={20} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Notification Item 2 - Info */}
            <div className="bg-white rounded-xl p-6 relative group hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
               <div className="flex items-start gap-4 pl-4">
                  <img 
                     src="https://picsum.photos/seed/patrick/100/100" 
                     alt="Patrick" 
                     className="w-12 h-12 rounded-full object-cover border border-gray-100" 
                  />
                  <div className="flex-1 pt-1">
                     <p className="text-gray-600">
                        <span className="font-bold text-gray-900">Patrick</span> added rating on <span className="font-bold text-gray-900">your scheme</span>
                     </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className="text-xs text-gray-400 font-medium">8h</span>
                     <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal size={20} />
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};