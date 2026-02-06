import React, { useEffect, useState, useRef } from 'react'; // Import useRef
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Check, Clock, TrendingUp, Shield, Search, Smartphone, MessageSquare, 
  ChevronDown, ChevronUp, Users, Gavel, Wallet, FileText, ArrowRight,
  ShieldCheck, Activity, UserCheck, Lock, Briefcase
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeProcess, setActiveProcess] = useState<'owner' | 'subscriber'>('owner');
  const [activeFaq, setActiveFaq] = useState<string | null>('faq1');

  // Create a ref for the main container to scope our GSAP animations
  const main = useRef(null);

  // --- CORRECTED GSAP ANIMATION LOGIC ---
  useEffect(() => {
    // Use gsap.context() for safe animation setup and automatic cleanup
    const ctx = gsap.context(() => {
      
      // Hero Animations
      const heroTl = gsap.timeline();
      heroTl.from(".gs-reveal", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out"
      }).from(".hero-img", {
        x: 50,
        opacity: 0,
        duration: 1.2,
        ease: "power2.out"
      }, "-=0.8");

      // Fade Right Elements
      gsap.utils.toArray(".gs-fade-right").forEach((element: any) => {
        gsap.from(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            toggleActions: "play none none reverse"
          },
          x: 50,
          opacity: 0,
          duration: 1,
          ease: "power2.out"
        });
      });

      // Fade Left Elements
      gsap.utils.toArray(".gs-fade-left").forEach((element: any) => {
        gsap.from(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            toggleActions: "play none none reverse"
          },
          x: -50,
          opacity: 0,
          duration: 1,
          ease: "power2.out"
        });
      });
      
      // Card Stagger (works well with .from)
      gsap.utils.toArray(".gs-card-stagger").forEach((card: any, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          y: 30,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.2,
          ease: "back.out(1.7)"
        });
      });

      // Feature Cards Batch (works better with fromTo to be explicit)
      gsap.utils.toArray<HTMLElement>(".gs-card-up").forEach(card => {
        gsap.fromTo(card, 
          { y: 50, opacity: 0 }, // from state
          { // to state
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });

    }, main); // <-- Scope the context to our main ref

    // Cleanup function - this is crucial!
    return () => ctx.revert(); 
  }, []);

  const toggleFaq = (id: string) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  const switchProcess = (type: 'owner' | 'subscriber') => {
    setActiveProcess(type);
    gsap.fromTo(".process-content", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
  };

  return (
    <div className="font-sans text-slate-900 bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
               <div className="w-10 h-10 bg-[#0099EF] rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
               <span className="text-2xl font-extrabold text-[#0099EF] tracking-tight">TRUSTABLE</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-[#0099EF] font-medium transition-colors">How It Works</a>
              <a href="#for-owners" className="text-gray-600 hover:text-[#0099EF] font-medium transition-colors">Owners</a>
              <a href="#for-subscribers" className="text-gray-600 hover:text-[#0099EF] font-medium transition-colors">Subscribers</a>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-[#0099EF] font-medium hidden sm:block">Login</button>
              <button onClick={() => navigate('/register')} className="bg-[#0099EF] hover:bg-[#0077CC] text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 min-h-screen flex items-center bg-[radial-gradient(circle_at_10%_20%,_rgb(240,249,255)_0%,_rgb(255,255,255)_90%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="hero-text text-center lg:text-left">
              <span className="gs-reveal inline-block bg-blue-50 text-[#0099EF] px-4 py-2 rounded-full text-sm font-bold border border-blue-100 mb-6">
                The place where people meet trust
              </span>
              <h1 className="gs-reveal text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
                India's First Verified <span className="text-[#0099EF]">Chit Fund Marketplace</span>
              </h1>
              <p className="gs-reveal text-lg text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Connecting verified companies with secure investors through a government-compliant, 5-step verification process.
              </p>
              <div className="gs-reveal flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <a href="#waitlist" className="bg-[#0099EF] hover:bg-[#0077CC] text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-blue-200 transition-all transform hover:-translate-y-1 w-full sm:w-auto text-center">
                  Join Waitlist
                </a>
                <span className="text-slate-500 font-medium flex items-center gap-2">
                  <ShieldCheck className="text-[#0099EF]" size={20} /> Safe & Secure
                </span>
              </div>
            </div>
            <div className="hero-img relative lg:h-[600px] flex items-center justify-center">
               {/* Abstract placeholder for hero animation */}
               <div className="relative w-full max-w-lg aspect-square bg-blue-50 rounded-full flex items-center justify-center overflow-hidden shadow-2xl border-8 border-white">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-white opacity-50"></div>
                  <div className="z-10 text-center p-8">
                      <div className="bg-white p-4 rounded-2xl shadow-lg mb-4 flex items-center gap-4 animate-bounce">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><TrendingUp /></div>
                          <div className="text-left">
                              <p className="text-xs text-gray-500">Monthly Returns</p>
                              <p className="font-bold text-gray-900">+12.5%</p>
                          </div>
                      </div>
                      <Shield className="w-32 h-32 text-[#0099EF] mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-800">100% Verified Funds</h3>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-[#0099EF] font-bold mb-2 uppercase tracking-wider text-sm">The Reality</h2>
              <h3 className="text-4xl font-extrabold mb-8 text-slate-900">Why the Industry Needs Trust</h3>
              
              <div className="gs-card-stagger bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl mb-6 hover:translate-x-2 transition-transform">
                <div className="flex gap-4">
                  <div className="bg-red-100 p-3 rounded-full h-fit text-red-500"><UserCheck size={24} /></div>
                  <div>
                    <h5 className="font-bold text-lg mb-2 text-slate-800">For Subscribers</h5>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Fear of unregistered "fly-by-night" operators. No transparency on auction history. High risk of fraud with no legal recourse.
                    </p>
                  </div>
                </div>
              </div>

              <div className="gs-card-stagger bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl hover:translate-x-2 transition-transform">
                <div className="flex gap-4">
                  <div className="bg-red-100 p-3 rounded-full h-fit text-red-500"><Gavel size={24} /></div>
                  <div>
                    <h5 className="font-bold text-lg mb-2 text-slate-800">For Owners</h5>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Struggle with manual collections. Geographically limited investors. Hard to build digital trust despite being legitimate.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="gs-fade-right">
              <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-8 -mt-8"></div>
                <h3 className="text-2xl font-bold mb-8 text-center text-slate-800">Bridging with Technology</h3>
                
                <div className="space-y-6">
                   {[
                     '100% Government Registered Funds Only',
                     'Digital KYC & Legal Agreements',
                     'Automated Collections & Payouts',
                     'Transparent Auction History'
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-4 text-lg font-medium text-slate-700">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#0099EF] flex-shrink-0">
                           <Check size={16} strokeWidth={3} />
                        </div>
                        {item}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Owners */}
      <section id="for-owners" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="order-2 lg:order-1 gs-fade-right">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-4">
                   <div className="bg-slate-100 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                          <Activity size={64} className="text-blue-200" />
                          <div className="absolute bg-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-bold text-gray-800">Live Auction Dashboard</span>
                          </div>
                      </div>
                   </div>
                   <div className="flex justify-center gap-4 mt-6 mb-2">
                      <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"><Clock size={14} /> Save 15hrs/mo</span>
                      <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"><TrendingUp size={14} /> Scale Nationally</span>
                   </div>
                </div>
             </div>
             <div className="order-1 lg:order-2">
                <h2 className="text-[#0099EF] font-bold mb-2">For Owners</h2>
                <h3 className="text-4xl font-extrabold mb-8 text-slate-900">Digitize & Grow Your Business</h3>
                
                <div className="grid sm:grid-cols-2 gap-6">
                   {[
                     { icon: Users, title: "Member Management", desc: "Effortless Digital KYC, Guarantor tracking, and payment history logs." },
                     { icon: Gavel, title: "Live Auctions", desc: "Conduct auctions online with live bidding and automated minute generation." },
                     { icon: Wallet, title: "Smart Collections", desc: "Automated WhatsApp reminders, UPI integration, and secure payouts." },
                     { icon: FileText, title: "Audit Ready", desc: "Chit Funds Act compliant reports generated instantly for registrars." }
                   ].map((feature, i) => (
                     <div key={i} className="gs-card-up bg-white p-6 rounded-2xl shadow-sm border border-gray-50 hover:shadow-lg hover:border-blue-100 transition-all transform hover:-translate-y-1">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0099EF] mb-4">
                           <feature.icon size={24} />
                        </div>
                        <h5 className="font-bold text-lg text-slate-800 mb-2">{feature.title}</h5>
                        <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* For Subscribers */}
      <section id="for-subscribers" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div>
                <h2 className="text-[#0099EF] font-bold mb-2">For Subscribers</h2>
                <h3 className="text-4xl font-extrabold mb-8 text-slate-900">Invest with Total Confidence</h3>
                
                <div className="grid sm:grid-cols-2 gap-6">
                   {[
                     { icon: Search, title: "Verified Marketplace", desc: "Browse only government-approved funds. Filter by amount, duration, and returns." },
                     { icon: Shield, title: "5-Layer Safety", desc: "Every fund undergoes strict legal, financial, and background checks before listing." },
                     { icon: Smartphone, title: "App-Based Tracking", desc: "Participate in auctions from your phone. Get digital receipts instantly." },
                     { icon: MessageSquare, title: "Direct Communication", desc: "Chat directly with the foreman/owner through our secure channel." }
                   ].map((feature, i) => (
                     <div key={i} className="gs-card-up bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all transform hover:-translate-y-1">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0099EF] mb-4">
                           <feature.icon size={24} />
                        </div>
                        <h5 className="font-bold text-lg text-slate-800 mb-2">{feature.title}</h5>
                        <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                     </div>
                   ))}
                </div>
             </div>
             <div className="gs-fade-left">
                <div className="bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-800 max-w-sm mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
                   <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-[9/19] relative">
                      {/* Mobile UI Placeholder */}
                      <div className="absolute inset-0 flex flex-col">
                          <div className="bg-[#0099EF] h-32 p-6 flex flex-col justify-end text-white">
                              <h4 className="font-bold text-xl">My Portfolio</h4>
                              <p className="opacity-80 text-sm">Total Value: ₹5,00,000</p>
                          </div>
                          <div className="p-4 space-y-3 flex-1 bg-gray-50">
                              <div className="bg-white p-4 rounded-xl shadow-sm"><div className="h-2 w-1/3 bg-gray-200 rounded mb-2"></div><div className="h-4 w-1/2 bg-gray-300 rounded"></div></div>
                              <div className="bg-white p-4 rounded-xl shadow-sm"><div className="h-2 w-1/3 bg-gray-200 rounded mb-2"></div><div className="h-4 w-1/2 bg-gray-300 rounded"></div></div>
                              <div className="bg-white p-4 rounded-xl shadow-sm"><div className="h-2 w-1/3 bg-gray-200 rounded mb-2"></div><div className="h-4 w-1/2 bg-gray-300 rounded"></div></div>
                          </div>
                          <div className="p-4 bg-white border-t flex justify-around text-gray-300">
                              <div className="w-8 h-8 rounded-full bg-[#0099EF]"></div>
                              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                          </div>
                      </div>
                   </div>
                </div>
                <div className="mt-8 text-center flex justify-center gap-4">
                    <span className="bg-white border border-[#0099EF] text-[#0099EF] px-4 py-2 rounded-full font-bold shadow-sm">0% Platform Fees</span>
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold shadow-sm">100% Verified</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-slate-50 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-[#0099EF] font-bold mb-2">Simple & Transparent Process</h2>
          <h3 className="text-3xl font-extrabold mb-10 text-slate-900">How it works for you</h3>
          
          <div className="inline-flex bg-slate-200 p-1.5 rounded-full mb-12 relative">
             <button 
               onClick={() => switchProcess('owner')}
               className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${activeProcess === 'owner' ? 'bg-[#0099EF] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
             >
               For Owners
             </button>
             <button 
               onClick={() => switchProcess('subscriber')}
               className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${activeProcess === 'subscriber' ? 'bg-[#0099EF] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
             >
               For Subscribers
             </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 text-left items-center">
             <div className="flex justify-center">
                <div className="relative w-full max-w-md aspect-square bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex items-center justify-center">
                    {/* Abstract Illustration */}
                    {activeProcess === 'owner' ? (
                       <Briefcase size={120} className="text-[#0099EF] opacity-80" />
                    ) : (
                       <Smartphone size={120} className="text-[#0099EF] opacity-80" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-transparent opacity-50 rounded-3xl"></div>
                </div>
             </div>
             
             <div className="process-content">
                {activeProcess === 'owner' ? (
                   <div className="space-y-8 relative">
                      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                      {[
                        { title: "Register & Verify", desc: "Submit your company registration, Chit license & Bank details for verification." },
                        { title: "Launch Scheme", desc: "Define total value, months, members, and upload the scheme bylaws." },
                        { title: "Onboard & Collect", desc: "Invite members via link. Collect KYC digitally. Start receiving payments." },
                        { title: "Run Auctions", desc: "Hold live video auctions. System auto-calculates dividends and payouts." }
                      ].map((step, i) => (
                        <div key={i} className="relative pl-12">
                           <div className="absolute left-0 top-0 w-8 h-8 bg-[#0099EF] text-white rounded-full flex items-center justify-center font-bold border-4 border-slate-50 z-10">
                              {i+1}
                           </div>
                           <h5 className="font-bold text-xl text-slate-800 mb-1">{step.title}</h5>
                           <p className="text-slate-500">{step.desc}</p>
                        </div>
                      ))}
                   </div>
                ) : (
                   <div className="space-y-8 relative">
                      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                      {[
                        { title: "Sign Up & Verify", desc: "Create profile, complete video KYC, and link your bank account." },
                        { title: "Discover Schemes", desc: "Browse verified funds. Compare history, owner rating, and potential returns." },
                        { title: "Join & Invest", desc: "Apply to a group. E-sign the agreement. Pay securely via UPI/Netbanking." },
                        { title: "Bid & Win", desc: "Participate in monthly auctions. Withdraw prize money or earn dividends." }
                      ].map((step, i) => (
                        <div key={i} className="relative pl-12">
                           <div className="absolute left-0 top-0 w-8 h-8 bg-[#0099EF] text-white rounded-full flex items-center justify-center font-bold border-4 border-slate-50 z-10">
                              {i+1}
                           </div>
                           <h5 className="font-bold text-xl text-slate-800 mb-1">{step.title}</h5>
                           <p className="text-slate-500">{step.desc}</p>
                        </div>
                      ))}
                   </div>
                )}
             </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="py-24">
         <div className="max-w-6xl mx-auto px-4">
            <div className="bg-gradient-to-br from-[#0099EF] to-[#0066AA] rounded-[3rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
               
               <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
                  <div>
                     <h2 className="text-4xl font-extrabold mb-4">Join the Revolution</h2>
                     <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                        Be among the first 1000 verified members to get exclusive benefits and 3 months free premium access to advanced analytics.
                     </p>
                     
                     <form onSubmit={(e) => { e.preventDefault(); alert("Thanks for joining!"); }} className="bg-white p-6 rounded-3xl text-slate-900 shadow-lg">
                        <div className="mb-4">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                           <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0099EF]" placeholder="John Doe" required />
                        </div>
                        <div className="mb-4">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                           <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0099EF]" placeholder="name@example.com" required />
                        </div>
                        <div className="mb-6">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">I am a...</label>
                           <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0099EF]">
                              <option>Chit Fund Owner</option>
                              <option>Subscriber (Investor)</option>
                              <option>Both</option>
                           </select>
                        </div>
                        <button type="submit" className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl transition-all shadow-md transform hover:scale-[1.02]">
                           Join Waitlist
                        </button>
                     </form>
                  </div>
                  
                  <div className="text-center hidden lg:block">
                      <div className="inline-flex items-center justify-center p-8 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
                         <Users size={64} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-6">Community Benefits</h3>
                      <div className="flex flex-wrap justify-center gap-4">
                         <span className="bg-white/20 backdrop-blur border border-white/30 px-6 py-2 rounded-full font-bold flex items-center gap-2">
                            <Check size={16} /> Priority Access
                         </span>
                         <span className="bg-white/20 backdrop-blur border border-white/30 px-6 py-2 rounded-full font-bold flex items-center gap-2">
                            <Check size={16} /> Zero Fees
                         </span>
                         <span className="bg-white/20 backdrop-blur border border-white/30 px-6 py-2 rounded-full font-bold flex items-center gap-2">
                            <Check size={16} /> Premium Support
                         </span>
                      </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
         <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-[#0099EF] font-bold mb-2 text-center">Common Questions</h2>
            <h3 className="text-3xl font-extrabold mb-12 text-slate-900 text-center">Everything you need to know</h3>
            
            <div className="space-y-4">
               {[
                 { id: 'faq1', q: "Is TRUSTABLE regulated?", a: "Yes, we are a registered marketplace ensuring all listed chit funds comply strictly with the Chit Funds Act, 1982. We do not run chits ourselves; we verify those who do." },
                 { id: 'faq2', q: "How does the verification work?", a: "We use a strict 5-step process: Company registration check, Foreman license validation, Owner background screening, Financial health audit, and ongoing compliance monitoring." },
                 { id: 'faq3', q: "What fees do owners pay?", a: "Owners pay a monthly subscription fee for the SaaS management tools and a small listing fee for the marketplace. Investors (Subscribers) pay 0% platform fees." },
                 { id: 'faq4', q: "Is my data safe?", a: "Absolutely. We use bank-grade AES-256 encryption for all data. Your KYC documents are watermarked and never shared with third parties without your explicit consent." }
               ].map((item) => (
                 <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button 
                      onClick={() => toggleFaq(item.id)}
                      className={`w-full flex items-center justify-between p-6 text-left font-bold text-lg transition-colors ${activeFaq === item.id ? 'text-[#0099EF] bg-blue-50/50' : 'text-slate-800 hover:bg-gray-50'}`}
                    >
                       {item.q}
                       {activeFaq === item.id ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    {activeFaq === item.id && (
                       <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-transparent animate-in slide-in-from-top-2">
                          <div className="pt-4">{item.a}</div>
                       </div>
                    )}
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
               <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-8 h-8 bg-[#0099EF] rounded flex items-center justify-center font-bold">T</div>
                     <span className="text-xl font-bold">TRUSTABLE</span>
                  </div>
                  <p className="text-slate-400 max-w-sm mb-6">
                     The place where people meet trust. Building India's safest savings community with technology and compliance.
                  </p>
                  <div className="flex gap-4">
                     {/* Social Icons Placeholder */}
                     <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#0099EF] transition-colors cursor-pointer">X</div>
                     <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#0099EF] transition-colors cursor-pointer">in</div>
                     <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#0099EF] transition-colors cursor-pointer">ig</div>
                  </div>
               </div>
               
               <div>
                  <h5 className="font-bold mb-4 text-slate-200">Quick Links</h5>
                  <ul className="space-y-3 text-slate-400">
                     <li><a href="#hero" className="hover:text-white transition-colors">Home</a></li>
                     <li><a href="#for-owners" className="hover:text-white transition-colors">Owners</a></li>
                     <li><a href="#for-subscribers" className="hover:text-white transition-colors">Subscribers</a></li>
                     <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Login</button></li>
                  </ul>
               </div>

               <div>
                  <h5 className="font-bold mb-4 text-slate-200">Contact</h5>
                  <ul className="space-y-3 text-slate-400">
                     <li>Neelambur, Tamil Nadu, India</li>
                     <li>support@trustable.in</li>
                     <li>+91 1800-123-4567</li>
                  </ul>
               </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
               © 2025 TRUSTABLE. All rights reserved. Made with <span className="text-red-500">♥</span> in India 🇮🇳
            </div>
         </div>
      </footer>
    </div>
  );
};