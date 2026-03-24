
import React, { useState, useEffect } from 'react';
import { LayoutGrid, Upload, Users, Gavel, Wallet, FileText, Plus, ArrowRight, ChevronLeft, Bell, Trash2, Edit3, Loader2, AlertTriangle, Rocket, CheckCircle } from 'lucide-react';
import { Card, Modal, Button } from '../components/UI';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { io as socketIO } from 'socket.io-client';

interface Reminder {
  id: number;
  title: string;
  timeDisplay: string;
  priority: 'High' | 'Medium' | 'Low';
  date: string;
  time: string;
  completed: boolean;
}

const mapSupabaseToReminder = (r: any): Reminder => {
    let timeDisplay = 'Scheduled';
    if (r.date) {
        const dateObj = new Date(r.date + 'T00:00:00');
        timeDisplay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (r.time) {
            timeDisplay += ` - ${r.time}`;
        }
    }
    return {
        id: r.id, title: r.title, priority: r.priority, date: r.date || '',
        time: r.time || '', timeDisplay: timeDisplay, completed: r.completed,
    };
};

export const SchemeDetails: React.FC = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { user } = useAuth();
   
   const [scheme, setScheme] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isLaunching, setIsLaunching] = useState(false);

   // Reminder State Logic
   const [reminders, setReminders] = useState<Reminder[]>([]);
   const [remindersLoading, setRemindersLoading] = useState(true);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
   const [remindersError, setRemindersError] = useState<string | null>(null);
   const [taskName, setTaskName] = useState('');
   const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
   const [taskDate, setTaskDate] = useState('');
   const [taskTime, setTaskTime] = useState('');

   const loadScheme = async () => {
       if(id) {
           setIsLoading(true);
           try {
               const data = await api.getSchemeDetails(id);
               setScheme(data);
           } catch (error) {
               console.error("Failed to load scheme details:", error);
           } finally {
               setIsLoading(false);
           }
       }
   };

   useEffect(() => {
       loadScheme();
   }, [id]);

   // --- REMINDER LOGIC ---

   const fetchReminders = async () => {
    if (!user?.id || !id) return;
    setRemindersError(null);
    try {
      const data = await apiClient.get(`/api/reminders?ownerId=${user.id}`);
      setReminders((data || []).map(mapSupabaseToReminder));
    } catch (err: any) {
      setRemindersError('Could not load reminders.');
    } finally {
      setRemindersLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id || !id) return;
    
    fetchReminders();

    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    const socket = socketIO(API_BASE);
    socket.emit('join_reminders', user.id);
    socket.on('reminder_change', () => fetchReminders());

    return () => {
      socket.disconnect();
    };
  }, [user?.id, id]);

   // Helper for Date Calculations
   const calculateDates = (startDateStr: string, duration: number, auctionDay: number) => {
       if(!startDateStr) return { endDate: '-', currentMonth: '-', nextAuction: '-' };
       
       const start = new Date(startDateStr);
       const today = new Date();
       
       const end = new Date(start);
       end.setMonth(start.getMonth() + duration);
       
       let monthDiff = (today.getFullYear() - start.getFullYear()) * 12;
       monthDiff -= start.getMonth();
       monthDiff += today.getMonth();
       const currentMonth = monthDiff >= 0 ? Math.min(monthDiff + 1, duration) : 0;

       const nextAuction = new Date();
       nextAuction.setDate(auctionDay || 1);
       if(today.getDate() > (auctionDay || 1)) {
           nextAuction.setMonth(nextAuction.getMonth() + 1);
       }

       return {
           endDate: end.toLocaleDateString('en-GB'),
           currentMonth: `${currentMonth}/${duration}`,
           nextAuction: nextAuction.toLocaleDateString('en-GB')
       };
   };

   const openAddModal = () => {
     setEditingReminder(null);
     setTaskName('');
     setPriority('High');
     setTaskDate('');
     setTaskTime('');
     setIsModalOpen(true);
   };
 
   const openEditModal = (reminder: Reminder) => {
     setEditingReminder(reminder);
     setTaskName(reminder.title);
     setPriority(reminder.priority);
     setTaskDate(reminder.date);
     setTaskTime(reminder.time);
     setIsModalOpen(true);
   };
 
   const toggleComplete = async (reminderId: number) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;
    try {
      await apiClient.put(`/api/reminders/${reminderId}`, { completed: !reminder.completed });
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, completed: !r.completed } : r));
    } catch (err) { console.error('Error toggling reminder:', err); }
  };
 
   const deleteReminder = async (id: number) => {
    try {
      await apiClient.delete(`/api/reminders/${id}`);
      setReminders(prev => prev.filter(r => r.id !== id));
      setIsModalOpen(false);
    } catch (err) { console.error('Error deleting reminder:', err); }
  };
 
   const handleSaveReminder = async () => {
     if (!taskName.trim() || !user || !id) return;
     try {
       if (editingReminder) {
         const data = await apiClient.put(`/api/reminders/${editingReminder.id}`, { title: taskName, priority, date: taskDate || null, time: taskTime || null });
         setReminders(prev => prev.map(r => r.id === editingReminder.id ? mapSupabaseToReminder(data) : r));
       } else {
         const data = await apiClient.post('/api/reminders', { title: taskName, priority, date: taskDate || null, time: taskTime || null });
         setReminders(prev => [mapSupabaseToReminder(data), ...prev]);
       }
       setIsModalOpen(false);
     } catch (err) { console.error('Error saving reminder:', err); }
   };

   // --- LAUNCH HANDLER ---
   const handleLaunchScheme = async () => {
       if(!scheme || !id) return;
       const confirmLaunch = window.confirm("Are you sure you want to launch this scheme? This will ACTIVATE the scheme and automatically schedule the first auction.");
       if(!confirmLaunch) return;

       setIsLaunching(true);
       try {
           await apiClient.put(`/api/schemes/${id}`, { status: 'ACTIVE' });
           
           alert("Scheme Launched! First auction has been scheduled.");
           loadScheme(); // Refresh UI
       } catch(err: any) {
           console.error(err);
           alert("Launch failed: " + err.message);
       } finally {
           setIsLaunching(false);
       }
   }
   
   if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

   if (!scheme) {
       return (
           <div className="flex flex-col items-center justify-center h-[70vh] text-center">
               <AlertTriangle size={48} className="text-red-400 mb-4" />
               <h2 className="text-xl font-bold text-gray-800">Scheme Not Found</h2>
               <p className="text-gray-500 mt-2">The requested scheme could not be loaded or does not exist.</p>
               <Button variant="outline" className="mt-6" onClick={() => navigate('/schemes')}>
                   <ChevronLeft size={16} className="mr-2" /> Back to Schemes
               </Button>
           </div>
       );
   }

   const calculatedData = calculateDates(scheme.startDate, scheme.duration, scheme.auctionDay);

  return (
    <div className="space-y-6">
      <div className="mb-6">
         <button 
           onClick={() => navigate('/schemes')}
           className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group"
         >
            <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to My Schemes
         </button>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                <LayoutGrid size={24} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Scheme Management</h1>
            </div>
            
            {/* LAUNCH BUTTON */}
            {scheme.status === 'PENDING_APPROVAL' && (
                <button 
                    onClick={handleLaunchScheme}
                    disabled={isLaunching}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-green-200 font-bold flex items-center gap-2 transition-transform hover:scale-105"
                >
                    {isLaunching ? <Loader2 className="animate-spin" size={20} /> : <Rocket size={20} />}
                    Launch Scheme
                </button>
            )}
            {scheme.status === 'ACTIVE' && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-green-200">
                    <CheckCircle size={20} /> Active
                </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
             <div className="bg-blue-500 p-4 flex justify-between items-center text-white">
                <h2 className="text-lg font-bold">{scheme.name} - {scheme.chitId}</h2>
                <span className="text-lg font-bold">₹{scheme.chitValue?.toLocaleString()}</span>
             </div>
             
             <div className="p-6">
                <div className="grid grid-cols-4 gap-y-6 gap-x-4 text-sm mb-8">
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Total chit value</p>
                      <p className="font-semibold text-gray-800">₹{scheme.chitValue?.toLocaleString()}</p>
                   </div>
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Monthly Due</p>
                      <p className="font-semibold text-gray-800">₹{scheme.monthlyDue?.toLocaleString()}</p>
                   </div>
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Duration</p>
                      <p className="font-semibold text-gray-800">{scheme.duration} months</p>
                   </div>
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Subscribers</p>
                      <p className="font-semibold text-gray-800">{scheme.subscribersEnrolled} / {scheme.membersTotal}</p>
                   </div>

                   <div>
                      <p className="text-gray-500 text-xs mb-1">Current Month</p>
                      <p className="font-semibold text-gray-800">{calculatedData.currentMonth}</p>
                   </div>
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Auctions Completed</p>
                      <p className="font-semibold text-gray-800">{Math.max(0, parseInt(calculatedData.currentMonth.split('/')[0]) - 1)}</p> 
                   </div>
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Next auction</p>
                      <p className="font-semibold text-gray-800">{calculatedData.nextAuction}</p>
                   </div>
                   <div>
                      <p className="text-gray-500 text-xs mb-1">Defaulters</p>
                      <p className="font-semibold text-gray-800">Nil</p>
                   </div>

                   <div className="col-span-1">
                       <p className="text-gray-500 text-xs mb-1">Started On</p>
                       <p className="font-semibold text-gray-800">{new Date(scheme.startDate).toLocaleDateString('en-GB')}</p>
                   </div>
                   <div className="col-span-1">
                       <p className="text-gray-500 text-xs mb-1">Ends on</p>
                       <p className="font-semibold text-gray-800">{calculatedData.endDate}</p>
                   </div>
                   <div className="col-span-2">
                       <p className="text-gray-500 text-xs mb-1">PSO number</p>
                       <p className="font-semibold text-gray-800">{scheme.psoNumber || 'N/A'}</p>
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">Video</p>
                       <p className="text-xs text-gray-400 mb-2">Intro Video</p>
                       <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 flex justify-between items-center w-full">
                          <span className="text-xs text-gray-500 font-medium truncate">Upload video</span>
                          <button className="text-blue-500 flex-shrink-0"><Upload size={16} /></button>
                       </div>
                   </div>
                   <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">Company T&C</p>
                       <p className="text-xs text-gray-400 mb-2">Terms & Conditions</p>
                       <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 flex justify-between items-center w-full">
                          <span className="text-xs text-gray-500 font-medium truncate">Upload PDF</span>
                          <button className="text-blue-500 flex-shrink-0"><Upload size={16} /></button>
                       </div>
                   </div>
                   <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">Chit Agreement</p>
                       <p className="text-xs text-gray-400 mb-2">Legal Agreement</p>
                       <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 flex justify-between items-center w-full">
                          <span className="text-xs text-gray-500 font-medium truncate">Upload PDF</span>
                          <button className="text-blue-500 flex-shrink-0"><Upload size={16} /></button>
                       </div>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                   <p className="text-sm font-bold text-gray-700">Member Management</p>
                   <Users size={20} className="text-blue-500" />
                </div>
                <Link to={`/schemes/${id || '1'}/subscribers`} className="bg-blue-500 text-white text-xs py-1.5 px-3 rounded-full flex items-center justify-between w-full hover:bg-blue-600 transition-colors mt-auto">
                   View more <ArrowRight size={12} />
                </Link>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                   <p className="text-sm font-bold text-gray-700">Auction Management</p>
                   <Gavel size={20} className="text-blue-500" />
                </div>
                <Link to={`/schemes/${id || '1'}/auctions`} className="bg-blue-500 text-white text-xs py-1.5 px-3 rounded-full flex items-center justify-between w-full hover:bg-blue-600 transition-colors mt-auto">
                   View more <ArrowRight size={12} />
                </Link>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                   <p className="text-sm font-bold text-gray-700 truncate mr-1">Collection & Payout</p>
                   <Wallet size={20} className="text-blue-500 flex-shrink-0" />
                </div>
                <Link to={`/schemes/${id || '1'}/collections`} className="bg-blue-500 text-white text-xs py-1.5 px-3 rounded-full flex items-center justify-between w-full hover:bg-blue-600 transition-colors mt-auto">
                   View more <ArrowRight size={12} />
                </Link>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                   <p className="text-sm font-bold text-gray-700">Documents</p>
                   <FileText size={20} className="text-blue-500" />
                </div>
                <Link to={`/schemes/${id || '1'}/documents`} className="bg-blue-500 text-white text-xs py-1.5 px-3 rounded-full flex items-center justify-between w-full hover:bg-blue-600 transition-colors mt-auto">
                   View more <ArrowRight size={12} />
                </Link>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1">
           <Card className="h-full relative pb-16">
              <h3 className="text-lg font-bold text-blue-500 mb-6">Reminders for this Scheme</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                 {remindersLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                 ) : remindersError ? (
                    <div className="text-center text-red-500 py-8 flex flex-col items-center gap-2">
                       <AlertTriangle size={32} />
                       <span className="font-medium">{remindersError}</span>
                    </div>
                 ) : reminders.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">No reminders for this scheme.</div>
                 ) : (
                    reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-start justify-between group p-3 hover:bg-blue-50/50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                        <div>
                        <h4 className={`font-semibold text-sm ${reminder.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {reminder.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            {reminder.timeDisplay} 
                            {reminder.priority === 'High' && <span className="w-2 h-2 rounded-full bg-red-500 ml-1"></span>}
                        </p>
                        </div>
                        <div className="flex items-center space-x-2">
                        {reminder.completed ? (
                            <button onClick={() => deleteReminder(reminder.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                                <Trash2 size={14} />
                            </button>
                        ) : (
                            <button onClick={() => openEditModal(reminder)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                                <Edit3 size={14} />
                            </button>
                        )}
                        <input type="checkbox" checked={reminder.completed} onChange={() => toggleComplete(reminder.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                        </div>
                    </div>
                    ))
                 )}
              </div>
              <button onClick={openAddModal} className="absolute bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                 <Plus size={20} />
              </button>
           </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingReminder ? "EDIT REMINDER" : "ADD REMINDER"} maxWidth="max-w-md">
        <div className="space-y-5">
           <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-2">
              <Bell size={16} /> <span>{editingReminder ? "Edit Reminder Details" : "New Reminder Details"}</span>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-1">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Task Name *</label>
                <input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Follow up with..." />
             </div>
             <div className="col-span-1">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-1"><label className="text-xs font-semibold text-gray-500 block mb-1">Date</label><input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
             <div className="col-span-1"><label className="text-xs font-semibold text-gray-500 block mb-1">Time</label><input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
           </div>
           <div className="pt-4 flex items-center justify-between gap-3">
             {editingReminder && (
               <button onClick={() => deleteReminder(editingReminder.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                 <Trash2 size={18} />
               </button>
             )}
             <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveReminder}>Confirm</Button>
             </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};
