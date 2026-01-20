
import React, { useState, useEffect } from 'react';
import { Card, Button, Modal } from '../components/UI';
import { Plus, Bell, Trash2, Edit3, Loader2, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { api, DashboardStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

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
        id: r.id,
        title: r.title,
        priority: r.priority,
        date: r.date || '',
        time: r.time || '',
        timeDisplay: timeDisplay,
        completed: r.completed,
    };
};

export const Dashboard: React.FC = () => {
  const { profile, user } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  
  const [taskName, setTaskName] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');

  // 1. Fetch Stats with Safety Timeout
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      if (!user?.id) {
        if(active) setIsLoading(false);
        return;
      }
      if(active) setIsLoading(true);
      
      try {
        // Timeout promise after 2.5 seconds
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
        const apiCall = api.getDashboardStats(user.id);
        
        // Race the API call against the timeout
        const data: any = await Promise.race([apiCall, timeout]);

        if (active) {
            if (data) {
                setStats(data);
            } else {
                // Fallback if timed out or null
                setStats({ totalSchemes: 0, monthlyProfit: 0, totalSubscribers: 0, activeLeads: 0, salesData: [] });
                console.warn("Dashboard stats timed out, using fallback.");
            }
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        if(active) setIsLoading(false);
      }
    };
    loadStats();
    return () => { active = false; };
  }, [user?.id]);

  // 2. Reminders Logic
  useEffect(() => {
    if (!user?.id) {
      setRemindersLoading(false);
      return;
    }
    
    const fetchReminders = async () => {
      setRemindersError(null);
      setRemindersLoading(true);
      try {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReminders((data || []).map(mapSupabaseToReminder));
      } catch (err: any) {
        // Silent fail for reminders to keep dash usable
        console.error('Error fetching reminders:', err.message);
        setRemindersError('Could not load reminders.');
      } finally {
        setRemindersLoading(false);
      }
    };

    fetchReminders();

    const channel = supabase
      .channel('reminders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `owner_id=eq.${user.id}` },
        () => fetchReminders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
      const { error } = await supabase
        .from('reminders')
        .update({ completed: !reminder.completed })
        .eq('id', reminderId);

      if (error) throw error;
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, completed: !r.completed } : r));
    } catch (err) {
      console.error('Error toggling reminder:', err);
    }
  };

  const deleteReminder = async (reminderId: number) => {
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', reminderId);
      if (error) throw error;
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  const handleSaveReminder = async () => {
    if (!taskName.trim() || !user) {
      alert("Please enter a task name.");
      return;
    }

    try {
      if (editingReminder) {
        const { data, error } = await supabase
          .from('reminders')
          .update({ title: taskName, priority, date: taskDate || null, time: taskTime || null })
          .eq('id', editingReminder.id)
          .select()
          .single();
        
        if (error) throw error;
        setReminders(prev => prev.map(r => r.id === editingReminder.id ? mapSupabaseToReminder(data) : r));
      } else {
        const { data, error } = await supabase
          .from('reminders')
          .insert({ owner_id: user.id, title: taskName, priority, date: taskDate || null, time: taskTime || null })
          .select()
          .single();

        if (error) throw error;
        setReminders(prev => [mapSupabaseToReminder(data), ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving reminder:', err);
      alert("Failed to save reminder.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-10 mt-4 bg-gradient-to-r from-white to-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, <span className="text-blue-600">{profile?.full_name || 'Owner'}</span>!
        </h1>
        <p className="text-gray-500 font-medium">Track performance, manage growth, and drive profitability for {profile?.companies?.company_name || 'your company'}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Schemes', value: stats?.totalSchemes?.toString() || '0' },
          { label: 'Monthly profit', value: `₹${stats?.monthlyProfit?.toLocaleString() || '0'}` },
          { label: 'Total subscribers', value: stats?.totalSubscribers?.toString() || '0' },
          { label: 'Active Leads', value: stats?.activeLeads?.toString() || '0', link: '/leads' },
        ].map((stat, idx) => {
          const Content = (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center h-32 hover:shadow-md transition-shadow hover:border-blue-200">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
            </div>
          );

          return stat.link ? <Link key={idx} to={stat.link}>{Content}</Link> : <div key={idx}>{Content}</div>
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-full">
          <Card title="Reminders" className="h-full relative pb-16">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {remindersLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : remindersError ? (
                <div className="text-center text-red-500 py-8 flex flex-col items-center gap-2">
                    <AlertTriangle size={32} />
                    <span className="font-medium">{remindersError}</span>
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No reminders yet.</div>
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
                         <button onClick={() => deleteReminder(reminder.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                       ) : (
                          <button onClick={() => openEditModal(reminder)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={14} /></button>
                       )}
                       <input type="checkbox" checked={reminder.completed} onChange={() => toggleComplete(reminder.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button onClick={openAddModal} className="absolute bottom-6 right-6 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95">
              <Plus size={24} />
            </button>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Analytics" className="h-full min-h-[400px]">
             <div className="flex justify-between items-center mb-4">
                 <h4 className="text-sm font-medium text-gray-500">Sales Analytics</h4>
             </div>
            <div className="h-[300px] w-full mt-4 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.salesData || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingReminder ? "EDIT REMINDER" : "ADD REMINDER"} maxWidth="max-w-md">
        <div className="space-y-5">
           <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-2"><Bell size={16} /> <span>{editingReminder ? "Edit Reminder Details" : "New Reminder Details"}</span></div>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-1">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Task Name *</label>
                <input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Gold Scheme" />
             </div>
             <div className="col-span-1">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Priority</label>
                <div className="relative">
                  <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">
                    <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                  </select>
                </div>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-1"><label className="text-xs font-semibold text-gray-500 block mb-1">Date</label><input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
             <div className="col-span-1"><label className="text-xs font-semibold text-gray-500 block mb-1">Time</label><input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
           </div>
           <div className="pt-4 flex items-center justify-between gap-3">
             {editingReminder && <button onClick={() => deleteReminder(editingReminder.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>}
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
