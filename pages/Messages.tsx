import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, MoreVertical, Phone, Video, Paperclip, Send, 
  Mic, Image as ImageIcon, FileText, ChevronLeft, Check, 
  Users, User, Camera, X, Upload
} from 'lucide-react';
import { Modal, Button, Input } from '../components/UI';
import { useLocation, useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  type: 'individual' | 'group';
  status?: string; // e.g., 'Online', 'Last seen...'
}

const initialChats: Chat[] = [
  { id: '1', name: 'Swirl Chit Fund', avatar: 'https://picsum.photos/seed/swirl/50/50', lastMessage: 'Hello guys we have discussed about', time: 'Yesterday', unread: 2, type: 'group' },
  { id: '2', name: 'Palaniyappa', avatar: 'https://picsum.photos/seed/palani/50/50', lastMessage: 'Hi! this is owner palani', time: '18:31', unread: 5, type: 'individual' },
  { id: '3', name: 'Jayaprakash', avatar: 'https://picsum.photos/seed/jaya/50/50', lastMessage: 'I want to talk to you about', time: 'Yesterday', unread: 0, type: 'individual' },
  { id: '4', name: 'Minerva Barnett', avatar: 'https://picsum.photos/seed/minerva/50/50', lastMessage: 'It is a long established fact that a reader...', time: '6:30 pm', unread: 0, type: 'individual' },
];

const initialMessages: Message[] = [
  { id: '1', senderId: 'other', text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.', time: '6:30 pm', isMe: false },
  { id: '2', senderId: 'me', text: 'There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour.', time: '6:34 pm', isMe: true },
  { id: '3', senderId: 'other', text: 'The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using \'Content here, content here\', making it look like readable English.', time: '6:39 pm', isMe: false },
];

export const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedChatId, setSelectedChatId] = useState<string>('4'); // Default to Minerva
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'groups'>('all');
  
  // Group Creation State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupStep, setGroupStep] = useState(1);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [memberTab, setMemberTab] = useState<'scheme' | 'chats'>('scheme');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle incoming navigation state to open a specific chat
  useEffect(() => {
      const incomingChatName = location.state?.chatName;
      if (incomingChatName) {
          const existingChat = chats.find(c => c.name === incomingChatName);
          if (existingChat) {
              setSelectedChatId(existingChat.id);
          } else {
              // Create a temp chat if it doesn't exist
              const newChat: Chat = {
                  id: Date.now().toString(),
                  name: incomingChatName,
                  avatar: `https://picsum.photos/seed/${incomingChatName}/50/50`,
                  lastMessage: 'Started a new conversation',
                  time: 'Just now',
                  unread: 0,
                  type: 'individual'
              };
              setChats(prev => [newChat, ...prev]);
              setSelectedChatId(newChat.id);
              setMessages([]); // Clear messages for new chat
          }
      }
  }, [location.state]);

  const selectedChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // Filter chats based on active tab
  const filteredChats = chats.filter(chat => {
      if (activeTab === 'groups') return chat.type === 'group';
      return true;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const toggleGroupMember = (id: string) => {
    if (groupMembers.includes(id)) {
      setGroupMembers(groupMembers.filter(m => m !== id));
    } else {
      setGroupMembers([...groupMembers, id]);
    }
  };

  const resetGroupModal = () => {
    setIsGroupModalOpen(false);
    setGroupStep(1);
    setGroupMembers([]);
    setGroupName('');
    setGroupDesc('');
  };

  const handleCreateGroup = () => {
      if (!groupName) return;
      
      const newGroupChat: Chat = {
          id: Date.now().toString(),
          name: groupName,
          avatar: `https://picsum.photos/seed/${groupName}/50/50`,
          lastMessage: 'Group created',
          time: 'Just now',
          unread: 0,
          type: 'group'
      };

      setChats([newGroupChat, ...chats]);
      setSelectedChatId(newGroupChat.id);
      setMessages([]); // Start fresh chat
      resetGroupModal();
      setActiveTab('groups'); // Switch to groups view to see it easily
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Sidebar - Chat List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="p-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
             <span className="bg-gray-100 p-2 rounded-full"><Users size={20}/></span> My Chat
          </h2>
          
          <div className="flex gap-4 mb-4">
             <button 
               onClick={() => setActiveTab('all')}
               className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
             >
                 All chats
             </button>
             <button 
               onClick={() => setActiveTab('groups')}
               className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'groups' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
             >
                 Groups
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {filteredChats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`p-3 rounded-xl flex gap-3 cursor-pointer transition-colors ${selectedChatId === chat.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
            >
              <div className="relative">
                <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                {/* Online Indicator */}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{chat.time}</span>
                </div>
                <p className={`text-xs truncate mt-1 ${selectedChatId === chat.id ? 'text-blue-600' : 'text-gray-500'}`}>
                  {chat.lastMessage}
                </p>
              </div>
              {chat.unread > 0 && (
                <div className="flex flex-col justify-center">
                   <span className="w-5 h-5 bg-blue-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                     {chat.unread}
                   </span>
                </div>
              )}
            </div>
          ))}
          {filteredChats.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No chats found.</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
           <button 
             onClick={() => setIsGroupModalOpen(true)}
             className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
           >
             <Plus size={18} /> Create New Group
           </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="h-20 border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)} 
                className="text-gray-500 hover:text-gray-700 font-medium text-sm mr-2 hover:underline transition-all"
              >
                  Back
              </button>
              <img src={selectedChat.avatar} alt={selectedChat.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
                   {selectedChat.name}
                   {selectedChat.type === 'individual' && <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Friends</span>}
                 </h3>
                 {/* Optional Status */}
                 {/* <p className="text-xs text-gray-500">Online</p> */}
              </div>
           </div>
           
           <div className="flex items-center gap-4 text-gray-400">
              <button className="hover:text-blue-500 transition-colors"><Search size={20} /></button>
              <button className="hover:text-blue-500 transition-colors"><Phone size={20} /></button>
              <button className="hover:text-blue-500 transition-colors"><Video size={20} /></button>
              <button className="hover:text-blue-500 transition-colors"><MoreVertical size={20} /></button>
           </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                {!msg.isMe && (
                   <img src={selectedChat.avatar} className="w-8 h-8 rounded-full mr-3 mt-1" alt="Sender" />
                )}
                <div className={`max-w-[70%] group relative`}>
                   <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                     msg.isMe 
                       ? 'bg-blue-600 text-white rounded-br-none' 
                       : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                   }`}>
                      {msg.text}
                   </div>
                   <div className={`text-[10px] text-gray-400 mt-1 flex items-center ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                      {msg.time}
                      {msg.isMe && <MoreVertical size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />}
                   </div>
                </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
           <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-blue-500 transition-colors">
                 <Mic size={20} />
              </button>
              
              <div className="flex-1 relative">
                 <input 
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                   placeholder="Write message"
                   className="w-full bg-gray-50 border-none rounded-full py-3 px-6 pr-20 text-sm focus:ring-1 focus:ring-blue-200 focus:bg-white transition-all outline-none"
                 />
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
                    <button className="hover:text-blue-500"><Paperclip size={18} /></button>
                    <button className="hover:text-blue-500"><FileText size={18} /></button>
                 </div>
              </div>

              <button 
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                 Send <Send size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={resetGroupModal}
        title={groupStep === 1 ? "Create a New Group" : "Create a New Group"}
        maxWidth="max-w-2xl"
      >
         {groupStep === 1 ? (
           <div className="space-y-6">
              <div className="font-semibold text-gray-800">Select Members</div>
              
              <div className="flex gap-4 mb-4">
                 <button 
                   onClick={() => setMemberTab('scheme')}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${memberTab === 'scheme' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                 >
                   From Scheme
                 </button>
                 <button 
                   onClick={() => setMemberTab('chats')}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${memberTab === 'chats' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                 >
                   From Chats
                 </button>
              </div>

              <div className="relative mb-4">
                 <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                 <input className="w-full border border-blue-200 rounded-lg py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={memberTab === 'scheme' ? "Search Scheme" : "Search Subscribers"} />
              </div>

              <div className="h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                 {memberTab === 'scheme' ? (
                    // Mock Schemes
                    <>
                      {['Gold Scheme LD3EF', 'Silver Scheme LD3EF', 'Platinum Chit A1'].map((scheme, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition-colors" onClick={() => toggleGroupMember(scheme)}>
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center p-1">
                                <img src={`https://picsum.photos/seed/${scheme}/40/40`} className="rounded-full" />
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-800">{scheme}</p>
                                 <p className="text-xs text-gray-500">40 Members</p>
                              </div>
                           </div>
                           <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${groupMembers.includes(scheme) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {groupMembers.includes(scheme) && <Check size={12} className="text-white" />}
                           </div>
                        </div>
                      ))}
                    </>
                 ) : (
                    // Mock Users
                    <>
                      {['Palaniyappa', 'Jayaprakash', 'Minerva', 'John Doe'].map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition-colors" onClick={() => toggleGroupMember(user)}>
                           <div className="flex items-center gap-3">
                              <img src={`https://picsum.photos/seed/${user}/40/40`} className="w-10 h-10 rounded-full" />
                              <div>
                                 <p className="text-sm font-bold text-gray-800">{user}</p>
                                 <p className="text-xs text-gray-500">Gold Scheme LD3EF</p>
                              </div>
                           </div>
                           <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${groupMembers.includes(user) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {groupMembers.includes(user) && <Check size={12} className="text-white" />}
                           </div>
                        </div>
                      ))}
                    </>
                 )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                 <Button onClick={() => setGroupStep(2)} disabled={groupMembers.length === 0}>Next</Button>
              </div>
           </div>
         ) : (
           <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="font-semibold text-gray-800">Group Information</div>
              
              <div className="flex flex-col items-center justify-center py-4">
                 <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all group">
                    <div className="text-gray-400 group-hover:text-blue-500 mb-1"><Upload size={24} /></div>
                    <span className="text-xs text-gray-500 group-hover:text-blue-500 font-medium text-center leading-tight">Upload<br/>Photo</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Group Name</label>
                    <input 
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Group Description</label>
                    <input 
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                 </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                 <button onClick={() => setGroupStep(1)} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Back</button>
                 <Button onClick={handleCreateGroup} disabled={!groupName}>Create</Button>
              </div>
           </div>
         )}
      </Modal>
    </div>
  );
};