import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Users, 
  Globe, 
  Calendar, 
  Utensils, 
  Hotel, 
  Camera, 
  ShoppingBag, 
  Coffee, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Download,
  Wallet,
  Clock,
  Shirt,
  Loader2,
  Plus,
  X,
  Cloud,
  TrendingUp,
  ShieldAlert,
  MessageCircle,
  Send,
  Star,
  Bus,
  Activity,
  Trash2,
  History,
  Archive,
  BookOpen,
  Briefcase,
  Save
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getLocationInfo, generateItinerary, getSuggestions, chatWithAI } from './services/gemini';
import { LocationInfo, Itinerary, UserInputs, SavedTrip } from './types';
import MapView from './components/MapView';

const STEP_INFO = 0;
const STEP_DETAILS = 1;
const STEP_ITINERARY_INPUT = 2;
const STEP_FINAL = 3;
const STEP_PROFILE = 4;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    scale: 1.1,
    filter: 'blur(10px)',
    transition: { duration: 0.3 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 40, filter: 'blur(10px)' },
  show: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 120
    }
  }
};

export default function App() {
  const [step, setStep] = useState(STEP_INFO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inputs, setInputs] = useState<UserInputs>({
    location: '',
    numPeople: 1,
    residenceCountry: '',
    startDate: '',
    endDate: '',
    resortAddress: '',
    foodPreference: 'veg',
    travelGroup: 'alone',
    budgetStyle: 'moderate',
    travelVibe: 'chill',
    itineraryStyle: 'relaxed',
    selectedAttractions: []
  });

  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [customAttraction, setCustomAttraction] = useState('');
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'location' | 'hotel'>('location');
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('travel_diary_trips');
    if (saved) {
      try {
        setSavedTrips(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved trips", e);
      }
    }
  }, []);

  const handleSaveTrip = () => {
    if (!itinerary || !locationInfo) return;
    const newTrip: SavedTrip = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      inputs: JSON.parse(JSON.stringify(inputs)),
      itinerary: JSON.parse(JSON.stringify(itinerary)),
      locationInfo: JSON.parse(JSON.stringify(locationInfo))
    };
    const updatedTrips = [newTrip, ...savedTrips];
    setSavedTrips(updatedTrips);
    localStorage.setItem('travel_diary_trips', JSON.stringify(updatedTrips));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTrips = savedTrips.filter(t => t.id !== id);
    setSavedTrips(updatedTrips);
    localStorage.setItem('travel_diary_trips', JSON.stringify(updatedTrips));
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    setInputs(trip.inputs);
    setItinerary(trip.itinerary);
    setLocationInfo(trip.locationInfo);
    setStep(STEP_FINAL);
  };

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! I am your travel assistant. Ask me about safety, cheaper hotels, or adding more days to your trip!' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    try {
      const response = await chatWithAI(userMsg, { inputs, locationInfo, itinerary });
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const travelGroupCaptions = {
    alone: "fuel your wanderlust yourself!!",
    couple: "couples who travel together stay together, have lots of romance lovies!!",
    family: "have fun with fam - jam!!",
    friends: "Friends who travel together, stay together."
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string, type: 'location' | 'hotel') => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await getSuggestions(query, type);
      setSuggestions(res);
      setShowSuggestions(true);
      setSuggestionType(type);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInitialSearch = async () => {
    if (!inputs.location || !inputs.residenceCountry) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const info = await getLocationInfo(inputs.location, inputs.travelGroup);
      setBgImage(`https://picsum.photos/seed/${info.heroImageUrl.replace(/\s+/g, '-')}/1920/1080`);
      setLocationInfo(info);
      setStep(STEP_DETAILS);
    } catch (err) {
      setError('Failed to fetch location info. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanItinerary = async () => {
    if (!inputs.startDate || !inputs.endDate || !inputs.resortAddress) {
      setError('Please fill in all itinerary details');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await generateItinerary(inputs);
      setItinerary(plan);
      setStep(STEP_FINAL);
    } catch (err) {
      setError('Failed to generate itinerary. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadItinerary = () => {
    if (!itinerary) return;
    const content = `Travel Diary Itinerary - ${inputs.location}\n\n` +
      itinerary.plan.map(item => (
        `Day ${item.day} - ${item.time}\n` +
        `Activity: ${item.activity}\n` +
        `Location: ${item.location}\n` +
        `Distance from Resort: ${item.distanceFromResort}\n` +
        `Approx Time: ${item.approxTime}\n` +
        `Outfit: ${item.outfitSuggestion}\n` +
        `--------------------------`
      )).join('\n') +
      `\n\nTotal Budget: ${itinerary.totalBudget} ${itinerary.currency}\n` +
      `Individual Budget: ${itinerary.individualBudget} ${itinerary.currency}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itinerary_${inputs.location}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addCustomAttraction = () => {
    if (customAttraction.trim()) {
      setInputs({
        ...inputs,
        selectedAttractions: [...inputs.selectedAttractions, customAttraction.trim()]
      });
      setCustomAttraction('');
    }
  };

  return (
    <div 
      className="min-h-screen text-white font-sans selection:bg-orange-500/30 relative"
      style={{ 
        '--theme-primary': locationInfo?.themeColor || '#f97316',
      } as React.CSSProperties}
    >
      {/* Dynamic Background */}
      <AnimatePresence>
        {bgImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0"
          >
            <div className="absolute inset-0 bg-black/60 z-10" />
            <img 
              src={bgImage}
              alt="Destination background"
              className="w-full h-full object-cover filter brightness-75 scale-105"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl"
          >
            <div className="text-center space-y-6">
              <div className="relative flex justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 rounded-full border-t-2 border-orange-500"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-24 h-24 rounded-full border-b-2 border-white/20 mx-auto"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-orange-500 animate-pulse" size={32} />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <h3 className="text-xl font-bold tracking-tight">Crafting your journey...</h3>
                <p className="text-white/40 text-sm">Our AI is exploring the best spots for you.</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liquid Background */}
      {!bgImage && (
        <div className="liquid-bg">
          <div className="liquid-blob top-[-10%] left-[-10%]" />
          <div className="liquid-blob-secondary bottom-[10%] left-[20%] opacity-20" style={{ animationDelay: '-2s' }} />
          <div className="liquid-blob bottom-[-10%] right-[-10%] opacity-10" style={{ animationDelay: '-5s' }} />
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 py-6 px-8 flex justify-between items-center sticky top-0 bg-black/40 backdrop-blur-2xl z-50 transition-all duration-500">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors duration-500"
            style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 10px 15px -3px var(--theme-primary)' }}
          >
            <Sparkles size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Travel Diary</h1>
        </motion.div>
        <div className="flex items-center gap-4">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStep(STEP_PROFILE)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              step === STEP_PROFILE 
                ? 'bg-white text-black' 
                : 'text-white/50 hover:text-white bg-white/5 border border-white/10 hover:border-white/20'
            }`}
          >
            <History size={16} />
            <span className="hidden sm:inline">My Trips</span>
          </motion.button>
          {step > STEP_INFO && (
            <motion.button 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (step === STEP_PROFILE) setStep(STEP_INFO);
                else setStep(step - 1);
              }}
              className="flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </motion.button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <AnimatePresence mode="wait">
          {/* Step 0: Initial Info */}
          {step === STEP_INFO && (
            <motion.div 
              key="step-info"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-8"
            >
              <motion.div variants={itemVariants} className="text-center space-y-4">
                <h2 className="text-6xl font-light tracking-tight">
                  Where to <span className="text-orange-500 font-serif italic">next?</span>
                </h2>
                <p className="text-white/40 max-w-md mx-auto">
                  Enter your destination and details to start your journey.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 glass-card p-8 rounded-[2.5rem]">
                <div className="space-y-2 relative" ref={suggestionRef}>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <MapPin size={12} /> Destination
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Paris, France"
                    className="w-full glass-input rounded-2xl p-4 text-white placeholder:text-white/20 outline-none"
                    value={inputs.location}
                    onChange={(e) => {
                      setInputs({ ...inputs, location: e.target.value });
                      fetchSuggestions(e.target.value, 'location');
                    }}
                  />
                  <AnimatePresence>
                    {showSuggestions && suggestionType === 'location' && suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute top-full left-0 right-0 glass-card rounded-3xl mt-3 z-50 overflow-hidden shadow-2xl border border-white/20"
                      >
                        {suggestions.map((s, i) => (
                          <motion.button 
                            key={i}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            className="w-full text-left p-5 transition-colors border-b last:border-none border-white/5 text-sm font-medium"
                            onClick={() => {
                              setInputs({ ...inputs, location: s });
                              setShowSuggestions(false);
                            }}
                          >
                            {s}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Users size={12} /> Travelers
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full glass-input rounded-2xl p-4 text-white outline-none"
                    value={inputs.numPeople}
                    onChange={(e) => setInputs({ ...inputs, numPeople: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Globe size={12} /> Your Residence
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. India"
                    className="w-full glass-input rounded-2xl p-4 text-white placeholder:text-white/20 outline-none"
                    value={inputs.residenceCountry}
                    onChange={(e) => setInputs({ ...inputs, residenceCountry: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3 space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Users size={12} /> Travelling Group
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['alone', 'couple', 'family', 'friends'] as const).map((group) => (
                      <motion.button
                        key={group}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setInputs({ ...inputs, travelGroup: group })}
                        className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all border ${
                          inputs.travelGroup === group
                            ? 'bg-white text-black border-white'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {group.charAt(0).toUpperCase() + group.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Wallet size={12} /> Budget Style
                    </label>
                    <div className="flex gap-2">
                      {(['cheap', 'moderate', 'luxury'] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => setInputs({ ...inputs, budgetStyle: style })}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                            inputs.budgetStyle === style ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Sparkles size={12} /> Travel Vibe
                    </label>
                    <div className="flex gap-2">
                      {(['chill', 'adventure', 'party', 'cultural'] as const).map((vibe) => (
                        <button
                          key={vibe}
                          onClick={() => setInputs({ ...inputs, travelVibe: vibe })}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                            inputs.travelVibe === vibe ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          {vibe.charAt(0).toUpperCase() + vibe.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Utensils size={12} /> Food Preference
                    </label>
                    <div className="flex gap-2">
                      {(['veg', 'nonveg', 'vegan'] as const).map((pref) => (
                        <button
                          key={pref}
                          onClick={() => setInputs({ ...inputs, foodPreference: pref })}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                            inputs.foodPreference === pref ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          {pref === 'veg' ? 'Veg' : pref === 'nonveg' ? 'Non-Veg' : 'Vegan'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Clock size={12} /> Itinerary Style
                    </label>
                    <div className="flex gap-2">
                      {(['relaxed', 'packed'] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => setInputs({ ...inputs, itineraryStyle: style })}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                            inputs.itineraryStyle === style ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {error && (
                <motion.p 
                  variants={itemVariants}
                  className="text-red-400 text-center text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}

              <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInitialSearch}
                disabled={loading}
                className="w-full text-white py-5 rounded-[2rem] font-bold flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 20px 25px -5px var(--theme-primary)33' }}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Explore Destination'}
                <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 1: Destination Details */}
          {step === STEP_DETAILS && locationInfo && (
            <motion.div 
              key="step-details"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-12"
            >
              <motion.div variants={itemVariants} className="space-y-4">
                <h2 className="text-5xl font-bold tracking-tight">
                  {inputs.location}
                </h2>
                <p className="text-2xl text-white/50 leading-relaxed font-light">
                  {locationInfo.description}
                </p>
              </motion.div>

              {locationInfo.coordinates && (
                <motion.section 
                  variants={itemVariants}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="opacity-70" style={{ color: 'var(--theme-primary)' }} size={20} /> Destination Map
                  </h3>
                  <div className="glass-card p-1 rounded-[2.5rem] overflow-hidden">
                    <MapView 
                      center={locationInfo.coordinates} 
                      themeColor={locationInfo.themeColor}
                      points={[
                        { lat: locationInfo.coordinates.lat, lng: locationInfo.coordinates.lng, label: inputs.location, type: 'destination' },
                        ...locationInfo.attractions.filter(a => a.coordinates).map(a => ({ lat: a.coordinates!.lat, lng: a.coordinates!.lng, label: a.name, type: 'attraction' as const })),
                        ...locationInfo.resorts.filter(r => r.coordinates).map(r => ({ lat: r.coordinates!.lat, lng: r.coordinates!.lng, label: r.name, type: 'resort' as const }))
                      ]} 
                    />
                  </div>
                </motion.section>
              )}

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 glass-card p-8 rounded-[2rem]">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles style={{ color: 'var(--theme-primary)' }} size={20} /> Heritage</h3>
                  <p className="text-white/60 leading-relaxed">{locationInfo.heritage}</p>
                </div>
                <div className="space-y-4 glass-card p-8 rounded-[2rem]">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Calendar style={{ color: 'var(--theme-primary)' }} size={20} /> Best Time</h3>
                  <p className="text-white/60 leading-relaxed">{locationInfo.bestTimeToVisit}</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 glass-card p-8 rounded-[2rem]">
                  <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp style={{ color: 'var(--theme-primary)' }} size={20} /> Trending Places 🔥</h3>
                  <div className="flex flex-wrap gap-2">
                    {locationInfo.trendingPlaces.map((p, i) => (
                      <span key={i} className="bg-white/5 px-3 py-1 rounded-full text-xs text-white/60 border border-white/10">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 glass-card p-8 rounded-[2rem]">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles style={{ color: 'var(--theme-primary)' }} size={20} /> Hidden Gems 💎</h3>
                  <div className="flex flex-wrap gap-2">
                    {locationInfo.hiddenGems.map((p, i) => (
                      <span key={i} className="bg-white/5 px-3 py-1 rounded-full text-xs text-white/60 border border-white/10">{p}</span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {(locationInfo.localEvents.length > 0 || locationInfo.travelAlerts.length > 0) && (
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {locationInfo.localEvents.length > 0 && (
                    <div className="space-y-4 glass-card p-8 rounded-[2rem]">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Calendar style={{ color: 'var(--theme-primary)' }} size={20} /> Local Events</h3>
                      <div className="space-y-4">
                        {locationInfo.localEvents.map((e, i) => (
                          <div key={i} className="border-l-2 pl-4 py-1" style={{ borderColor: 'var(--theme-primary)' }}>
                            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--theme-primary)' }}>{e.date}</span>
                            <h4 className="font-bold text-sm">{e.name}</h4>
                            <p className="text-xs text-white/40">{e.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {locationInfo.travelAlerts.length > 0 && (
                    <div className="space-y-4 glass-card p-8 rounded-[2rem] border-red-500/20">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-red-400"><ShieldAlert size={20} /> Travel Alerts</h3>
                      <ul className="space-y-2">
                        {locationInfo.travelAlerts.map((a, i) => (
                          <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.section variants={itemVariants} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-2xl font-bold flex items-center gap-2"><Camera style={{ color: 'var(--theme-primary)' }} size={24} /> Top Attractions</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="text" 
                      placeholder="Add custom attraction..."
                      className="flex-1 sm:w-64 glass-input rounded-xl px-4 py-2 text-sm outline-none"
                      value={customAttraction}
                      onChange={(e) => setCustomAttraction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomAttraction()}
                    />
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={addCustomAttraction}
                      className="bg-white text-black p-2 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                    >
                      <Plus size={20} />
                    </motion.button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {locationInfo.attractions.map((attr, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const selected = inputs.selectedAttractions.includes(attr.name)
                          ? inputs.selectedAttractions.filter(a => a !== attr.name)
                          : [...inputs.selectedAttractions, attr.name];
                        setInputs({ ...inputs, selectedAttractions: selected });
                      }}
                      className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                        inputs.selectedAttractions.includes(attr.name) 
                          ? 'border-transparent text-white' 
                          : 'glass-card border-white/10 hover:border-white/30'
                      }`}
                      style={inputs.selectedAttractions.includes(attr.name) ? { backgroundColor: 'var(--theme-primary)' } : {}}
                    >
                      <h4 className="font-bold text-lg">{attr.name}</h4>
                      <p className={`text-sm mt-2 ${inputs.selectedAttractions.includes(attr.name) ? 'text-white/80' : 'text-white/40'}`}>
                        {attr.description}
                      </p>
                    </motion.div>
                  ))}
                  {inputs.selectedAttractions.filter(name => !locationInfo.attractions.some(a => a.name === name)).map((name, i) => (
                    <motion.div 
                      key={`custom-${i}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInputs({ ...inputs, selectedAttractions: inputs.selectedAttractions.filter(a => a !== name) });
                      }}
                      className="p-6 rounded-2xl border text-white transition-all cursor-pointer flex justify-between items-start"
                      style={{ backgroundColor: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' }}
                    >
                      <div>
                        <h4 className="font-bold text-lg">{name}</h4>
                        <p className="text-sm text-white/80 mt-2">Custom destination added by you.</p>
                      </div>
                      <X size={16} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Utensils style={{ color: 'var(--theme-primary)' }} size={20} /> Famous Food</h3>
                  <div className="flex flex-wrap gap-2">
                    {locationInfo.famousFood.map((food, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm text-white/70">{food}</span>
                    ))}
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Hotel style={{ color: 'var(--theme-primary)' }} size={20} /> Recommended Resorts</h3>
                  <div className="space-y-3">
                    {locationInfo.resorts.map((resort, i) => (
                      <div 
                        key={i} 
                        className="glass-card p-4 rounded-2xl"
                      >
                        <h4 className="font-bold">{resort.name}</h4>
                        <p className="text-xs text-white/30 mt-1">{resort.address}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>

              <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(STEP_ITINERARY_INPUT)}
                className="w-full bg-white text-black py-5 rounded-[2rem] font-bold flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: 'white' }}
              >
                Plan My Itinerary
                <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Itinerary Inputs */}
          {step === STEP_ITINERARY_INPUT && (
            <motion.div 
              key="step-itinerary-input"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-10"
            >
              <motion.div variants={itemVariants} className="text-center space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">Personalize Your Trip</h2>
                <p className="text-white/40">Tell us a bit more to build your perfect schedule.</p>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-card p-10 rounded-[3rem] space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full glass-input rounded-2xl p-4 text-white outline-none"
                      value={inputs.startDate}
                      onChange={(e) => setInputs({ ...inputs, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">End Date</label>
                    <input 
                      type="date" 
                      className="w-full glass-input rounded-2xl p-4 text-white outline-none"
                      value={inputs.endDate}
                      onChange={(e) => setInputs({ ...inputs, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2 relative" ref={suggestionRef}>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Resort / Stay Address</label>
                  <input 
                    type="text" 
                    placeholder="Enter the address where you'll be staying"
                    className="w-full glass-input rounded-2xl p-4 text-white placeholder:text-white/20 outline-none"
                    value={inputs.resortAddress}
                    onChange={(e) => {
                      setInputs({ ...inputs, resortAddress: e.target.value });
                      fetchSuggestions(e.target.value, 'hotel');
                    }}
                  />
                  <AnimatePresence>
                    {showSuggestions && suggestionType === 'hotel' && suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute top-full left-0 right-0 glass-card rounded-3xl mt-3 z-50 overflow-hidden shadow-2xl border border-white/20"
                      >
                        {suggestions.map((s, i) => (
                          <motion.button 
                            key={i}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            className="w-full text-left p-5 transition-colors border-b last:border-none border-white/5 text-sm font-medium"
                            onClick={() => {
                              setInputs({ ...inputs, resortAddress: s });
                              setShowSuggestions(false);
                            }}
                          >
                            {s}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {error && <motion.p variants={itemVariants} className="text-red-400 text-center text-sm font-medium">{error}</motion.p>}

              <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlanItinerary}
                disabled={loading}
                className="w-full text-white py-5 rounded-[2rem] font-bold flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 20px 25px -5px var(--theme-primary)33' }}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Plan Itinerary'}
                <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 3: Final Itinerary */}
          {step === STEP_FINAL && itinerary && (
            <motion.div 
              key="step-final"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-12"
            >
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div className="space-y-2">
                  <h2 className="text-5xl font-bold tracking-tight">
                    Your <span style={{ color: 'var(--theme-primary)' }} className="font-serif italic">Diary</span>
                  </h2>
                  <p className="text-white/40 font-medium">{inputs.location} • {inputs.startDate} to {inputs.endDate}</p>
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={downloadItinerary}
                    className="bg-white text-black p-5 rounded-full shadow-2xl transition-all"
                    style={{ backgroundColor: 'white' }}
                    title="Download Itinerary"
                  >
                    <Download size={24} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSaveTrip}
                    className={`p-5 rounded-full shadow-2xl transition-all ${
                      saveSuccess ? 'bg-green-500 text-white' : 'text-white'
                    }`}
                    style={!saveSuccess ? { backgroundColor: 'var(--theme-primary)' } : {}}
                    title="Save Itinerary"
                  >
                    {saveSuccess ? <Archive size={24} /> : <Save size={24} />}
                  </motion.button>
                </div>
              </motion.div>

              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/40 text-green-300 p-4 rounded-2xl text-center font-medium"
                >
                  Trip saved successfully to your profile!
                </motion.div>
              )}

              {itinerary.plan.some(p => p.coordinates) && (
                <motion.section 
                  variants={itemVariants}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MapPin style={{ color: 'var(--theme-primary)' }} size={20} /> Itinerary Map
                  </h3>
                  <div className="glass-card p-1 rounded-[2.5rem] overflow-hidden">
                    <MapView 
                      center={itinerary.plan.find(p => p.coordinates)?.coordinates || { lat: 0, lng: 0 }} 
                      themeColor={locationInfo?.themeColor}
                      points={itinerary.plan.filter(p => p.coordinates).map(p => ({ 
                        lat: p.coordinates!.lat, 
                        lng: p.coordinates!.lng, 
                        label: `Day ${p.day}: ${p.activity}`, 
                        type: 'activity' as const 
                      }))} 
                    />
                  </div>
                </motion.section>
              )}

              <motion.div variants={itemVariants} className="space-y-8">
                {itinerary.plan.map((item, i) => (
                  <div 
                    key={i}
                    className="relative pl-8 border-l border-white/10 pb-12 last:pb-0"
                  >
                    <div 
                      className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full shadow-[0_0_15px_var(--theme-primary)]" 
                      style={{ backgroundColor: 'var(--theme-primary)' }}
                    />
                    <div className="glass-card rounded-[2rem] overflow-hidden space-y-6">
                      <div className="h-64 w-full relative">
                        <img 
                          src={`https://picsum.photos/seed/${item.imageUrl.replace(/\s+/g, '-')}/800/600`} 
                          alt={item.activity}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--theme-primary)' }}>Day {item.day} • {item.time}</span>
                            <h4 className="text-3xl font-bold mt-1">{item.activity}</h4>
                          </div>
                          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                            <Star size={14} style={{ color: 'var(--theme-primary)', fill: 'var(--theme-primary)' }} />
                            <span className="text-sm font-bold">{item.rating}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 pt-0 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-2">
                            <p className="text-white/40 flex items-center gap-2 text-sm"><MapPin size={14} style={{ color: 'var(--theme-primary)' }} /> {item.location}</p>
                            <div className="flex flex-wrap gap-4">
                              <span className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                <Cloud size={12} className="text-blue-400" /> {item.weather}
                              </span>
                              <span className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                <Users size={12} className="text-orange-400" /> {item.crowdLevel}
                              </span>
                              <span className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                <Bus size={12} className="text-green-400" /> {item.transportSuggestion}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
                            <span className="text-[10px] font-bold text-white/20 block uppercase tracking-widest">Distance</span>
                            <span className="text-sm font-bold text-white/80">{item.distanceFromResort}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm text-white/60">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                <Clock size={14} style={{ color: 'var(--theme-primary)' }} />
                              </div>
                              <span>{item.approxTime}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/60">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                <Shirt size={14} style={{ color: 'var(--theme-primary)' }} />
                              </div>
                              <span>Outfit: {item.outfitSuggestion}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Reviews</span>
                            <div className="space-y-2">
                              {item.reviews.map((rev, idx) => (
                                <p key={idx} className="text-xs text-white/40 italic leading-relaxed">"{rev}"</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.section 
                variants={itemVariants}
                className="glass-card p-12 rounded-[3.5rem] space-y-10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full" style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.1 }} />
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    <Wallet size={32} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h3 className="text-4xl font-bold tracking-tight">Budget Estimate</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-white/20 uppercase text-[10px] font-bold tracking-[0.3em]">Total for {inputs.numPeople} People</span>
                      <div className="text-6xl font-bold flex items-baseline gap-3">
                        {itinerary.totalBudget.toLocaleString()}
                        <span className="text-2xl font-light text-white/20">{itinerary.currency}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <span className="text-white/20 uppercase text-[10px] font-bold tracking-[0.3em]">Per Person</span>
                      <div className="text-6xl font-bold flex items-baseline gap-3" style={{ color: 'var(--theme-primary)' }}>
                        {itinerary.individualBudget.toLocaleString()}
                        <span className="text-2xl font-light opacity-30">{itinerary.currency}</span>
                      </div>
                    </div>
                    <div className="border p-4 rounded-2xl flex items-center gap-3" style={{ backgroundColor: 'var(--theme-primary)1a', borderColor: 'var(--theme-primary)33' }}>
                      <TrendingUp style={{ color: 'var(--theme-primary)' }} size={20} />
                      <p className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>{itinerary.budgetComparison}</p>
                    </div>
                  </div>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={itinerary.budgetBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="amount"
                          nameKey="category"
                        >
                          {itinerary.budgetBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#8b5cf6'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <p className="text-sm text-white/20 italic font-light">Includes estimated food, local travel, and entry fees. Prices may vary based on actual choices.</p>
              </motion.section>

              <motion.div variants={itemVariants} className="text-center py-12">
                <p className="text-3xl font-serif italic text-white/80 leading-relaxed max-w-2xl mx-auto">
                  "{travelGroupCaptions[inputs.travelGroup]}"
                </p>
              </motion.div>

              <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(STEP_INFO)}
                className="w-full py-6 rounded-[2rem] font-bold border border-white/10 hover:bg-white/5 transition-all text-white/50 hover:text-white"
              >
                Plan Another Trip
              </motion.button>
            </motion.div>
          )}

          {/* Step 4: Profile / Saved Trips */}
          {step === STEP_PROFILE && (
            <motion.div 
              key="step-profile"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-12"
            >
              <motion.div variants={itemVariants} className="text-center space-y-4">
                <div className="w-20 h-20 bg-orange-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-orange-500/20">
                  <Briefcase size={40} className="text-orange-500" />
                </div>
                <h2 className="text-5xl font-bold tracking-tight">Your Journeys</h2>
                <p className="text-white/40 max-w-md mx-auto">
                  Manage your past and upcoming adventures.
                </p>
              </motion.div>

              {savedTrips.length === 0 ? (
                <motion.div 
                  variants={itemVariants}
                  className="glass-card p-20 rounded-[3rem] text-center space-y-6"
                >
                  <div className="text-white/10 flex justify-center">
                    <BookOpen size={64} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">No trips saved yet</h3>
                    <p className="text-white/30 text-sm">Start by planning your first destination!</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStep(STEP_INFO)}
                    className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-orange-500/20"
                  >
                    Plan a Trip
                  </motion.button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {savedTrips.map((trip) => (
                    <motion.div 
                      key={trip.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleLoadTrip(trip)}
                      className="glass-card rounded-[2.5rem] p-8 flex flex-col md:flex-row justify-between items-center gap-8 group cursor-pointer border border-white/10 hover:border-orange-500/30 transition-all shadow-xl hover:shadow-orange-500/5"
                    >
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-orange-500/50 transition-colors overflow-hidden">
                          <img 
                            src={`https://picsum.photos/seed/${trip.inputs.location}/100/100`}
                            alt={trip.inputs.location}
                            className="w-full h-full object-cover rounded-2xl opacity-40 group-hover:opacity-100 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-2xl font-bold tracking-tight">{trip.inputs.location}</h4>
                          <div className="flex items-center gap-3 text-white/40 text-sm">
                            <span className="flex items-center gap-1.5"><Calendar size={12} /> {trip.inputs.startDate}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="flex items-center gap-1.5"><Users size={12} /> {trip.inputs.numPeople} People</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                        <div className="text-right hidden sm:block mr-2">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block">Created</span>
                          <span className="text-sm font-medium text-white/40">{new Date(trip.timestamp).toLocaleDateString()}</span>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all bg-white/5 border border-white/10"
                          title="Open Trip"
                        >
                          <ChevronRight size={20} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDeleteTrip(trip.id, e)}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white/40 hover:text-red-500 transition-all bg-white/5 border border-white/10"
                          title="Delete Trip"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chatbot */}
      <div className="fixed bottom-8 right-8 z-[60]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[350px] h-[500px] glass-card rounded-[2.5rem] flex flex-col shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    <MessageCircle size={18} />
                  </div>
                  <span className="font-bold">Travel Assistant</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'text-white rounded-tr-none' 
                          : 'bg-white/10 text-white/80 rounded-tl-none border border-white/10'
                      }`}
                      style={msg.role === 'user' ? { backgroundColor: 'var(--theme-primary)' } : {}}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/10">
                      <Loader2 className="animate-spin" style={{ color: 'var(--theme-primary)' }} size={16} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 bg-black/20 border-t border-white/10">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask about safety, hotels..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none transition-colors"
                    style={{ '--focus-color': 'var(--theme-primary)' } as React.CSSProperties}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-2 rounded-xl transition-colors"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl text-white"
          style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 20px 40px -10px var(--theme-primary)' }}
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </motion.button>
      </div>

      {/* Footer */}
      <footer className="py-12 text-center text-white/20 text-sm border-t border-white/5 mt-20 backdrop-blur-md">
        <p>© 2026 Travel Diary. Your personal travel companion.</p>
      </footer>
    </div>
  );
}
