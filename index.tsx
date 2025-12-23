
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, Plane, Hotel, Calendar, CreditCard, ShoppingBag, 
  CheckCircle, Briefcase, MapPin, Users, ChevronLeft, 
  Trash2, Edit2, AlertCircle, Sparkles, Receipt, User,
  CloudSun, Clock, Phone, Navigation, Utensils, ChevronDown, ChevronUp, Shield, DollarSign,
  Tag, Info, MoreVertical, Check, RefreshCw, Play, Download, Globe, ArrowRight, ArrowLeftRight, Ticket, Filter, Coins, Calculator, Camera, Link, ExternalLink, StickyNote, X
} from 'lucide-react';

// --- Types & Interfaces ---

interface InsuranceDetail {
  company: string;
  plan: string;
  emergencyContact: string;
  referenceNumber: string;
  isEditing?: boolean;
  active: boolean;
}

interface FlightDetail {
  id: string;
  code: string;
  date: string; 
  departureAirport?: string;
  departureTerminal?: string;
  arrivalAirport?: string;
  arrivalTerminal?: string;
  boardingTime?: string;
  arrivalDate?: string; 
  arrivalTime?: string;
  gate?: string;
  seatNumber?: string;
  isReturn?: boolean;
  isEditing?: boolean;
}

interface TravelPass {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  remarks?: string;
  isEditing?: boolean;
}

interface HotelDetail {
  id: string;
  name: string;
  localName?: string;
  nights: number | '';
  startDate: string;
  address?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    afternoonTea: boolean;
    dinner: boolean;
  };
  isEditing?: boolean;
}

interface SplitDetails {
  method: 'Equally' | 'Custom' | 'Solely';
  payer: string;
  customShares: Record<string, number>; // HKD shares
  customLocalShares: Record<string, number>; // Local shares
}

interface TimelineItem {
  id: string;
  time: string;
  activity: string;
  location?: string;
  amountLocal?: number;
  amountHKD?: number;
  fxRate?: number;
  currency?: string;
  paymentMethod?: 'Cash' | 'Credit Card';
  split?: SplitDetails;
  isEditing?: boolean;
}

interface Expense {
  id: string;
  description: string;
  amountHKD: number;
  amountLocal: number;
  fxRate?: number;
  currency: string;
  paymentMethod: 'Cash' | 'Credit Card';
  split: SplitDetails;
  isSettlement?: boolean;
  date?: string;
  isEditing?: boolean;
}

interface WishlistItem {
  id: string;
  category: string;
  name: string;
  price: number;
  currency: string;
  requestedBy: string; 
  remarks: string;
  url?: string;
  location?: string;
  photo?: string; // base64
  bought: boolean;
  isEditing?: boolean;
}

interface PlanDay {
  date: string;
  weather?: { temp: string; condition: string };
  scheduled: TimelineItem[];
  todo: { id: string; task: string; done: boolean }[];
}

interface Booking {
  id: string;
  type: 'Flight' | 'Hotel' | 'Activity' | 'Ticket' | 'Service' | 'Restaurant';
  name: string;
  details: string;
  confirmation: string;
  date?: string; 
  time?: string;
  amountLocal?: number;
  currency?: string;
  amountHKD?: number;
  fxRate?: number;
  split: SplitDetails;
  paymentMethod: 'Cash' | 'Credit Card';
  isEditing?: boolean;
}

interface PackingItem {
  id: string;
  category: string;
  item: string;
  done: boolean;
}

interface MasterTodoItem {
  id: string;
  task: string;
  date?: string;
  actionBy?: string;
  remark?: string;
  done: boolean;
  isEditing?: boolean;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  weatherCity?: string;
  baseCurrency: string;
  fxRate: number; 
  startDate: string;
  endDate: string;
  members: string[];
  externalNames: string[]; 
  insurance: InsuranceDetail;
  logistics: {
    flights: FlightDetail[];
    hotels: HotelDetail[];
    travelPasses: TravelPass[];
  };
  bookings: Booking[];
  expenses: Expense[];
  wishlist: WishlistItem[];
  masterTodo: MasterTodoItem[];
  packing: PackingItem[];
  planDays: PlanDay[];
  flightType?: 'One-Way' | 'Round-Trip';
}

interface UnifiedTransaction {
  id: string;
  description: string;
  amountHKD: number;
  payer: string;
  category: string;
  date: string;
  originalType: 'Expense' | 'Booking' | 'Activity';
  originalId: string;
  split?: SplitDetails;
  isEditing?: boolean;
  isSettlement?: boolean;
  paymentMethod?: 'Cash' | 'Credit Card';
}

// --- Constants ---

const PACKING_CATS = [
  "Travel Essentials", 
  "Electronics & Gadgets", 
  "Toiletries & Personal Care", 
  "Health & Fitness", 
  "Miscellaneous Items",
  "Clothing & Accessories"
];
const WISHLIST_CATS = ['Proxy Shopping', 'Shopping', 'Restaurant', 'Activity', 'Other'];

// --- Utils ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const getDayOfWeek = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return '';
  }
};

const getCountdown = (startDate: string) => {
  const diff = new Date(startDate).getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days} days to go` : days === 0 ? "Starting today!" : "Completed";
};

const getDatesInRange = (startDate: string, endDate: string) => {
  const dates = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  while (curr <= end && count < 60) {
    dates.push(new Date(curr).toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
    count++;
  }
  return dates;
};

// --- Components ---

const SplitEditor: React.FC<{
  members: string[];
  split: SplitDetails;
  amountLocal: number;
  amountHKD: number;
  fxRate: number;
  paymentMethod: 'Cash' | 'Credit Card';
  onSplitChange: (s: SplitDetails) => void;
  onPaymentMethodChange: (p: 'Cash' | 'Credit Card') => void;
  onAmountChange: (local: number, hkd: number, rate: number) => void;
}> = ({ members, split, amountLocal, amountHKD, fxRate, paymentMethod, onSplitChange, onPaymentMethodChange, onAmountChange }) => {

  const handleLocalChange = (val: number) => {
    onAmountChange(val, val * fxRate, fxRate);
  };

  const handleRateChange = (val: number) => {
    onAmountChange(amountLocal, amountLocal * val, val);
  };

  const handleHKDChange = (val: number) => {
    const newRate = amountLocal !== 0 ? val / amountLocal : fxRate;
    onAmountChange(amountLocal, val, newRate);
  };

  return (
    <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Amount (Local)</label>
          <input 
            type="number" 
            className="bg-white p-2 rounded-xl text-[10px] font-bold border border-slate-200" 
            value={amountLocal || ''} 
            onChange={e => handleLocalChange(Number(e.target.value))} 
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calculator size={8}/> FX Rate</label>
          <input 
            type="number" 
            step="0.0001"
            className="bg-white p-2 rounded-xl text-[10px] font-bold border border-slate-200" 
            value={fxRate || ''} 
            onChange={e => handleRateChange(Number(e.target.value))} 
            placeholder="1.00"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-black text-teal-600 uppercase mb-1">Amount (HKD)</label>
          <input 
            type="number" 
            className="bg-teal-50 p-2 rounded-xl text-[10px] font-black text-teal-700 border border-teal-100" 
            value={amountHKD || ''} 
            onChange={e => handleHKDChange(Number(e.target.value))} 
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase mb-1">Method</label>
          <div className="flex bg-white rounded-xl p-1 border border-slate-200">
            <button 
              onClick={() => onPaymentMethodChange('Cash')}
              className={`flex-1 py-1 text-[9px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${paymentMethod === 'Cash' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-400'}`}
            >
              Cash
            </button>
            <button 
              onClick={() => onPaymentMethodChange('Credit Card')}
              className={`flex-1 py-1 text-[9px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${paymentMethod === 'Credit Card' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400'}`}
            >
              Card
            </button>
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase mb-1">Payer</label>
          <select 
            className="bg-white p-2 rounded-xl text-[10px] font-bold border border-slate-200" 
            value={split.payer} 
            onChange={e => onSplitChange({ ...split, payer: e.target.value })}
          >
            {members.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-[8px] font-bold text-slate-400 uppercase mb-1">Splitting</label>
        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
          {(['Equally', 'Solely', 'Custom'] as const).map(m => (
            <button 
              key={m}
              onClick={() => onSplitChange({ ...split, method: m })}
              className={`py-1.5 text-[9px] font-black rounded-lg transition-all ${split.method === m ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {split.method === 'Custom' && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-[8px] font-black text-slate-400 uppercase flex justify-between">
            <span>Share breakdown</span>
            <span>Local CCY Input</span>
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {members.map(m => (
              <div key={m} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                <span className="flex-1 text-[10px] font-bold text-slate-600 truncate">{m}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-slate-300">LOCAL</span>
                    <input 
                      type="number"
                      placeholder="0"
                      className="w-16 bg-slate-50 border-none p-1 rounded-lg text-[10px] font-black text-right"
                      value={split.customLocalShares?.[m] || ''}
                      onChange={e => {
                        const localVal = Number(e.target.value);
                        const hkdVal = localVal * fxRate;
                        const nLocal = { ...split.customLocalShares, [m]: localVal };
                        const nHkd = { ...split.customShares, [m]: hkdVal };
                        onSplitChange({ ...split, customLocalShares: nLocal, customShares: nHkd });
                      }}
                    />
                  </div>
                  <div className="w-[1px] h-4 bg-slate-100"></div>
                  <div className="flex items-center gap-1 w-16 justify-end">
                    <span className="text-[8px] font-black text-teal-400">HKD</span>
                    <span className="text-[10px] font-black text-teal-600">{(split.customShares?.[m] || 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center px-1 pt-1">
              <span className="text-[8px] font-black text-slate-300 uppercase">Total Input: ${Object.values(split.customShares || {}).reduce((a,b)=>Number(a)+Number(b), 0).toFixed(1)} HKD</span>
              {Math.abs(amountHKD - Object.values(split.customShares || {}).reduce((a,b)=>Number(a)+Number(b), 0)) > 0.5 && (
                <span className="text-[8px] font-black text-red-400 animate-pulse">Total mismatch</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TripCard: React.FC<{ 
  trip: Trip; 
  onClick: () => void; 
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
}> = ({ trip, onClick, onDelete, onEdit }) => (
  <div 
    onClick={onClick}
    className="glass-card p-4 rounded-3xl cursor-pointer hover:shadow-lg transition-all border-none group relative overflow-hidden h-40 flex flex-col justify-between"
  >
    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
      <button 
        onClick={onEdit} 
        className="p-1.5 bg-white text-teal-600 rounded-full hover:bg-teal-50 transition-colors shadow-sm"
      >
        <Edit2 size={12} />
      </button>
      <button 
        onClick={onDelete} 
        className="p-1.5 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors shadow-sm"
      >
        <Trash2 size={12} />
      </button>
    </div>
    <div className="z-10">
      <div className="flex items-center gap-1 text-teal-600 mb-0.5">
        <MapPin size={12} />
        <span className="text-[9px] font-bold tracking-wide uppercase">{trip.destination}</span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{trip.title}</h3>
    </div>
    <div className="z-10 flex justify-between items-end">
      <div>
        <p className="text-[9px] text-slate-500 font-medium">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</p>
        <div className="flex -space-x-1.5 mt-1.5">
          {trip.members.slice(0, 3).map((m, i) => (
            <div key={i} title={m} className="w-6 h-6 rounded-full border-2 border-white trip-gradient flex items-center justify-center text-[8px] text-white font-bold">
              {m.charAt(0)}
            </div>
          ))}
          {trip.members.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] text-slate-600 font-bold">
              +{trip.members.length - 3}
            </div>
          )}
        </div>
      </div>
      <div className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-xl text-[8px] font-bold border border-teal-100 shadow-sm">
        {getCountdown(trip.startDate)}
      </div>
    </div>
  </div>
);

const App = () => {
  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('nomad_trips');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  const [showFlightChoiceModal, setShowFlightChoiceModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Logistics');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [logisticsCollapsed, setLogisticsCollapsed] = useState(true);
  const [collapsedWishlist, setCollapsedWishlist] = useState<Record<string, boolean>>({});
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'Credit Card'>('All');
  
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Robust states for interactive "Add Item" modals
  const [packingModal, setPackingModal] = useState({ open: false, name: '', category: 'Travel Essentials' });
  const [wishlistModal, setWishlistModal] = useState({ open: false, name: '', category: 'Proxy Shopping' });

  useEffect(() => {
    localStorage.setItem('nomad_trips', JSON.stringify(trips));
  }, [trips]);

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

  useEffect(() => {
    if (activeTrip && activeTrip.startDate && activeTrip.endDate) {
      const dateRange = getDatesInRange(activeTrip.startDate, activeTrip.endDate);
      const existingDates = activeTrip.planDays.map(d => d.date);
      const needsSync = dateRange.some(d => !existingDates.includes(d)) || 
                       existingDates.some(d => !dateRange.includes(d));
      if (needsSync) {
        const syncedDays = dateRange.map(date => {
          const existingDay = activeTrip.planDays.find(d => d.date === date);
          return existingDay || { date, scheduled: [], todo: [] };
        });
        updateActiveTrip({ planDays: syncedDays });
      }
    }
  }, [activeTripId]);

  const updateActiveTrip = (updates: Partial<Trip>) => {
    setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, ...updates } : t));
  };

  const [newTripForm, setNewTripForm] = useState<{
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    members: string[];
    membersString: string;
  }>({
    title: '', destination: '', startDate: '', endDate: '', members: [], membersString: ''
  });

  const handleSaveTrip = async () => {
    if (!newTripForm.title || !newTripForm.destination || !newTripForm.startDate || !newTripForm.endDate) return;
    
    if (editingTripId) {
      setTrips(prev => prev.map(t => t.id === editingTripId ? {
        ...t,
        title: newTripForm.title,
        destination: newTripForm.destination,
        startDate: newTripForm.startDate,
        endDate: newTripForm.endDate,
        members: newTripForm.members
      } : t));
      setShowCreateModal(false);
      setEditingTripId(null);
      return;
    }

    const dateRange = getDatesInRange(newTripForm.startDate, newTripForm.endDate);
    
    let detectedCcy = 'USD';
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `What is the ISO currency code for ${newTripForm.destination}? Return only the 3-letter code.`,
      });
      const ccy = response.text?.trim().toUpperCase();
      if (ccy && ccy.length === 3) detectedCcy = ccy;
    } catch(e) {}

    // Comprehensive Packing List with Proper Case
    const initialPacking: PackingItem[] = [
      ...["Passport", "HKID", "Visa (If Applicable)", "Cash", "ATM Card", "Credit Card"].map(it => ({ id: generateId(), category: 'Travel Essentials', item: it, done: false })),
      ...["Mobile", "AirPods", "Power Bank", "Chargers & Cables", "Apple Watch"].map(it => ({ id: generateId(), category: 'Electronics & Gadgets', item: it, done: false })),
      ...["Shampoo", "Hair Oil Capsules", "Hairbrush", "Body Wash", "Body Cream", "Towels", "Face Cleaner", "Skincare", "Cleaning Cotton", "Sunscreens", "Makeup Remover", "Makeup Bag", "Hand Cream", "Lip Balm", "Eyedrop", "Tissues (Wet/ Dry)", "Sanitary Pads", "Eye Masks", "Face Masks"].map(it => ({ id: generateId(), category: 'Toiletries & Personal Care', item: it, done: false })),
      ...["Medicine", "Supplements"].map(it => ({ id: generateId(), category: 'Health & Fitness', item: it, done: false })),
      ...["Zip Bag", "Vacuum Machine & Bag", "Shopping Bag", "Water Bottle", "Laundry Bag", "Laundry Detergent"].map(it => ({ id: generateId(), category: 'Miscellaneous Items', item: it, done: false })),
      ...["Handbag", "Sunglasses", "Jacket", "Tops", "Bottoms", "Pajamas", "Bras and Underwear", "Slippers", "Trainers"].map(it => ({ id: generateId(), category: 'Clothing & Accessories', item: it, done: false })),
    ];

    const trip: Trip = {
      id: generateId(),
      title: newTripForm.title!,
      destination: newTripForm.destination!,
      weatherCity: newTripForm.destination!,
      baseCurrency: detectedCcy,
      fxRate: 1, 
      startDate: newTripForm.startDate!,
      endDate: newTripForm.endDate!,
      members: newTripForm.members || [],
      externalNames: [],
      insurance: { company: '', plan: '', emergencyContact: '', referenceNumber: '', isEditing: false, active: false },
      logistics: { flights: [], hotels: [], travelPasses: [] },
      bookings: [],
      expenses: [],
      wishlist: [
        { id: generateId(), category: 'Proxy Shopping', name: 'Check Local Specialties', price: 0, currency: detectedCcy, requestedBy: 'Self', remarks: '', bought: false, isEditing: false }
      ],
      masterTodo: [
        { id: generateId(), task: 'Purchase flight tickets', done: false },
        { id: generateId(), task: 'Reserve accommodation', done: false }
      ],
      packing: initialPacking,
      planDays: dateRange.map(date => ({ date, scheduled: [], todo: [] })),
      flightType: 'One-Way'
    };
    setTrips(prev => [...prev, trip]);
    setNewTripForm({ title: '', destination: '', startDate: '', endDate: '', members: [], membersString: '' });
    setShowCreateModal(false);
  };

  const deleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (showDeleteConfirmId) {
      setTrips(prev => prev.filter(t => t.id !== showDeleteConfirmId));
      if (activeTripId === showDeleteConfirmId) setActiveTripId(null);
      setShowDeleteConfirmId(null);
    }
  };

  const editTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const trip = trips.find(t => t.id === id);
    if (trip) {
      setNewTripForm({
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        members: trip.members,
        membersString: trip.members.join(', ')
      });
      setEditingTripId(id);
      setShowCreateModal(true);
    }
  };

  const detectCurrency = async () => {
    if (!activeTrip) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `What is the ISO currency code for ${activeTrip.destination}? Return only the 3-letter code.`,
      });
      const ccy = response.text?.trim().toUpperCase();
      if (ccy && ccy.length === 3) updateActiveTrip({ baseCurrency: ccy });
    } catch (e) { console.error(e); }
    finally { setIsAiLoading(false); }
  };

  const searchHotel = async (hIdx: number) => {
    if (!activeTrip) return;
    const h = activeTrip.logistics.hotels[hIdx];
    if (!h.name) return alert("Enter hotel name");
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find the official address, phone number, and name in the local language for the hotel named "${h.name}" located in ${activeTrip.destination}.
        Return the data in the following JSON schema:
        {
          "localName": "Name in local language",
          "address": "Full address in local language",
          "phone": "International phone number format",
          "checkIn": "standard check-in time (e.g. 15:00)",
          "checkOut": "standard check-out time (e.g. 11:00)"
        }`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              localName: { type: Type.STRING },
              address: { type: Type.STRING },
              phone: { type: Type.STRING },
              checkIn: { type: Type.STRING },
              checkOut: { type: Type.STRING }
            }
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      const n = [...activeTrip.logistics.hotels];
      n[hIdx] = { ...n[hIdx], ...data, isEditing: false };
      updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } });
    } catch (e) { 
      console.error(e); 
      alert("Could not fetch hotel details automatically. Please enter them manually.");
    }
    finally { setIsAiLoading(false); }
  };

  const fetchWeather = async (dIdx: number) => {
    if (!activeTrip) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Weather in ${activeTrip.weatherCity || activeTrip.destination} on ${activeTrip.planDays[dIdx].date}? Return {temp: "range in C", condition: "short description"}.`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              temp: { type: Type.STRING },
              condition: { type: Type.STRING }
            }
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      const n = [...activeTrip.planDays];
      n[dIdx].weather = data;
      updateActiveTrip({ planDays: n });
    } catch (e) { console.error(e); }
    finally { setIsAiLoading(false); }
  };

  const getSettlement = () => {
    if (!activeTrip) return [];
    const balances: Record<string, number> = {};
    const people = [...activeTrip.members, ...activeTrip.externalNames];
    people.forEach(p => balances[p] = 0);

    const applyShare = (amtHKD: number, split: SplitDetails) => {
      if (!split || !split.payer) return;
      balances[split.payer] += amtHKD;

      if (split.method === 'Equally') {
        const per = amtHKD / (activeTrip.members.length || 1);
        activeTrip.members.forEach(m => { if (balances[m] !== undefined) balances[m] -= per; });
      } else if (split.method === 'Custom') {
        Object.entries(split.customShares || {}).forEach(([p, amt]) => {
          if (balances[p] !== undefined) balances[p] -= amt;
        });
      } else if (split.method === 'Solely') {
        if (balances[split.payer] !== undefined) balances[split.payer] -= amtHKD;
      }
    };

    activeTrip.expenses.forEach(e => applyShare(e.amountHKD, e.split));
    activeTrip.bookings.forEach(b => applyShare(b.amountHKD || 0, b.split));
    activeTrip.planDays.forEach(d => d.scheduled.forEach(s => {
      if (s.amountHKD && s.split) applyShare(s.amountHKD, s.split);
    }));

    const debtors = Object.keys(balances).filter(m => balances[m] < -0.01).map(m => ({ name: m, amount: -balances[m] })).sort((a: any, b: any) => b.amount - a.amount);
    const creditors = Object.keys(balances).filter(m => balances[m] > 0.01).map(m => ({ name: m, amount: balances[m] })).sort((a: any, b: any) => b.amount - a.amount);

    const transactions: { from: string, to: string, amount: number }[] = [];
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
      const amt = Math.min(debtors[d].amount, creditors[c].amount);
      if (amt > 0.01) transactions.push({ from: debtors[d].name, to: creditors[c].name, amount: amt });
      debtors[d].amount -= amt; creditors[c].amount -= amt;
      if (debtors[d].amount < 0.01) d++; if (creditors[c].amount < 0.01) c++;
    }
    return transactions;
  };

  const calculateMemberSpending = () => {
    if (!activeTrip) return {};
    const spending: Record<string, number> = {};
    activeTrip.members.forEach(m => spending[m] = 0);

    const addShare = (amtHKD: number, split: SplitDetails) => {
      if (!split) return;
      if (split.method === 'Equally') {
        const per = amtHKD / (activeTrip.members.length || 1);
        activeTrip.members.forEach(m => { if (spending[m] !== undefined) spending[m] += per; });
      } else if (split.method === 'Custom') {
        Object.entries(split.customShares || {}).forEach(([p, amt]) => {
          if (spending[p] !== undefined) spending[p] += amt;
        });
      } else if (split.method === 'Solely') {
        if (spending[split.payer] !== undefined) spending[split.payer] += amtHKD;
      }
    };

    activeTrip.expenses.forEach(e => addShare(e.amountHKD, e.split));
    activeTrip.bookings.forEach(b => addShare(b.amountHKD || 0, b.split));
    activeTrip.planDays.forEach(d => d.scheduled.forEach(s => {
      if (s.amountHKD && s.split) addShare(s.amountHKD, s.split);
    }));

    return spending;
  };

  const memberSpending = useMemo(() => calculateMemberSpending(), [activeTrip]);

  const allTransactions = useMemo((): UnifiedTransaction[] => {
    if (!activeTrip) return [];
    
    const transactions: UnifiedTransaction[] = [];
    
    // Regular Expenses
    activeTrip.expenses.forEach(e => {
        transactions.push({ 
          id: e.id, 
          description: e.description, 
          amountHKD: e.amountHKD, 
          payer: e.split.payer, 
          category: e.isSettlement ? 'Settlement' : 'Expense', 
          date: e.date || '',
          originalType: 'Expense',
          originalId: e.id,
          split: e.split,
          isEditing: e.isEditing,
          isSettlement: e.isSettlement,
          paymentMethod: e.paymentMethod
        });
    });

    // Bookings
    activeTrip.bookings.forEach(b => {
        transactions.push({ 
          id: b.id, 
          description: b.name, 
          amountHKD: b.amountHKD || 0, 
          payer: b.split.payer, 
          category: `Booking (${b.type})`, 
          date: b.date || '',
          originalType: 'Booking',
          originalId: b.id,
          split: b.split,
          isEditing: b.isEditing,
          paymentMethod: b.paymentMethod
        });
    });

    // Scheduled Activities
    activeTrip.planDays.forEach(d => d.scheduled.forEach(s => {
        if ((s.amountHKD || 0) > 0) {
            transactions.push({ 
              id: s.id, 
              description: s.activity, 
              amountHKD: s.amountHKD || 0, 
              payer: s.split?.payer || '?', 
              category: 'Activity', 
              date: d.date,
              originalType: 'Activity',
              originalId: s.id,
              split: s.split,
              isEditing: s.isEditing,
              paymentMethod: s.paymentMethod
            });
        }
    }));

    return transactions.sort((a,b) => b.date.localeCompare(a.date));
  }, [activeTrip]);

  const filteredJournalTransactions = useMemo(() => {
    if (!activeTrip) return [];
    
    return allTransactions.filter(t => {
      const matchMember = !selectedMemberFilter || t.payer === selectedMemberFilter;
      const matchMethod = methodFilter === 'All' || t.paymentMethod === methodFilter;
      return matchMember && matchMethod;
    });
  }, [allTransactions, selectedMemberFilter, methodFilter]);

  const handleSettle = (from: string, to: string, amount: number) => {
    const settleExp: Expense = {
      id: generateId(),
      description: `Settlement: ${from} -> ${to}`,
      amountHKD: amount,
      amountLocal: amount,
      currency: 'HKD',
      paymentMethod: 'Cash',
      split: { method: 'Custom', payer: from, customShares: { [to]: amount }, customLocalShares: { [to]: amount } },
      isSettlement: true,
      date: new Date().toISOString().split('T')[0]
    };
    updateActiveTrip({ expenses: [...activeTrip.expenses, settleExp] });
  };

  const handleWishlistPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, itemIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const n = [...activeTrip!.wishlist];
      n[itemIdx].photo = base64;
      updateActiveTrip({ wishlist: n });
    };
    reader.readAsDataURL(file);
  };

  const handleAddFlightWithChoice = (isRoundTrip: boolean) => {
    if (!activeTrip) return;
    const fOut: FlightDetail = { id: generateId(), code: '', date: activeTrip.startDate, isReturn: false, isEditing: true, arrivalDate: activeTrip.startDate };
    const baseFlights = [...activeTrip.logistics.flights, fOut];
    
    if (isRoundTrip) {
      const fIn: FlightDetail = { id: generateId(), code: '', date: activeTrip.endDate, isReturn: true, isEditing: true, arrivalDate: activeTrip.endDate };
      baseFlights.push(fIn);
      updateActiveTrip({ flightType: 'Round-Trip', logistics: { ...activeTrip.logistics, flights: baseFlights } });
    } else {
      updateActiveTrip({ flightType: 'One-Way', logistics: { ...activeTrip.logistics, flights: baseFlights } });
    }
    setShowFlightChoiceModal(false);
  };

  if (!activeTripId || !activeTrip) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center font-jakarta">
        <header className="mb-8 text-center pt-12">
          <h1 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
            <Navigation size={24} className="text-teal-500" />
            My Travel Planner <span className="text-[10px] text-teal-400 font-bold bg-teal-50 px-2 py-0.5 rounded-full ml-1">v2.2</span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Plan with style</p>
        </header>
        <div className="max-w-4xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
          {trips.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
              <MapPin size={48} className="text-slate-200" />
              <p className="font-bold text-slate-400">No journeys recorded yet.</p>
            </div>
          ) : (
            trips.map(t => (
              <TripCard 
                key={t.id} 
                trip={t} 
                onClick={() => setActiveTripId(t.id)} 
                onDelete={(e) => deleteTrip(t.id, e)} 
                onEdit={(e) => editTrip(t.id, e)}
              />
            ))
          )}
        </div>
        <div className="fixed bottom-8">
          <button onClick={() => {
            setEditingTripId(null);
            setNewTripForm({ title: '', destination: '', startDate: '', endDate: '', members: [], membersString: '' });
            setShowCreateModal(true);
          }} className="trip-gradient text-white px-8 py-3 rounded-full font-black text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2">
            <Plus size={16}/> New Journey
          </button>
        </div>

        {/* Create / Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95">
              <h2 className="text-xl font-black mb-4">{editingTripId ? 'Edit Adventure' : 'Start Adventure'}</h2>
              <div className="space-y-3">
                <input placeholder="Trip Title" className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" value={newTripForm.title} onChange={e => setNewTripForm({...newTripForm, title: e.target.value})} />
                <input placeholder="Destination" className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" value={newTripForm.destination} onChange={e => setNewTripForm({...newTripForm, destination: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Start Date</label>
                    <input type="date" className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" value={newTripForm.startDate} onChange={e => setNewTripForm({...newTripForm, startDate: e.target.value})} />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">End Date</label>
                    <input type="date" className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" value={newTripForm.endDate} onChange={e => setNewTripForm({...newTripForm, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Travelers (Comma separated)</label>
                  <input 
                    placeholder="Alice, Bob..." 
                    className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" 
                    value={newTripForm.membersString}
                    onChange={e => {
                      const val = e.target.value;
                      setNewTripForm({
                        ...newTripForm, 
                        membersString: val,
                        members: val.split(',').map(s => s.trim()).filter(s => !!s)
                      });
                    }} 
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowCreateModal(false); setEditingTripId(null); }} className="flex-1 py-3 font-bold text-slate-400 bg-slate-50 rounded-xl text-[10px]">Cancel</button>
                <button onClick={handleSaveTrip} className="flex-1 py-3 font-bold text-white trip-gradient rounded-xl text-[10px]">{editingTripId ? 'Save' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-black mb-2 text-slate-800">Delete Journey?</h2>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-8">
                Are you sure you want to delete <span className="font-bold text-slate-800">"{trips.find(t=>t.id===showDeleteConfirmId)?.title}"</span>? This will permanently erase all itineraries and expenses.
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete} 
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-[11px] shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Delete Trip
                </button>
                <button 
                  onClick={() => setShowDeleteConfirmId(null)} 
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold rounded-xl text-[11px] transition-all"
                >
                  Keep Journey
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentDay = activeTrip.planDays[selectedDayIdx];

  const totalTripSpend = activeTrip.expenses.reduce((a,c)=>a+c.amountHKD, 0) + 
                         activeTrip.bookings.reduce((a,c)=>a+(c.amountHKD||0), 0) + 
                         activeTrip.planDays.reduce((a,d)=>a+d.scheduled.reduce((a2,s)=>a2+(s.amountHKD||0),0),0);

  const renderFlightEditor = (f: FlightDetail, fIdx: number) => (
    <div key={f.id} className="glass-card p-4 rounded-2xl space-y-3 border-t-4 border-t-blue-400 animate-in slide-in-from-top-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Flight #</label>
          <input placeholder="CX504" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.code} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].code = e.target.value.toUpperCase(); updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Depart Date</label>
          <input type="date" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={f.date} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].date = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Boarding Apt</label>
          <input placeholder="HKG" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.departureAirport} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].departureAirport = e.target.value.toUpperCase(); updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Terminal</label>
          <input placeholder="1" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.departureTerminal} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].departureTerminal = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Board Time</label>
          <input type="time" className="bg-slate-50 p-2 rounded-xl font-bold border-none min-w-[70px]" value={f.boardingTime} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].boardingTime = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Arrival Apt</label>
          <input placeholder="NRT" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.arrivalAirport} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].arrivalAirport = e.target.value.toUpperCase(); updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Terminal</label>
          <input placeholder="2" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.arrivalTerminal} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].arrivalTerminal = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Arr Time</label>
          <input type="time" className="bg-slate-50 p-2 rounded-xl font-bold border-none min-w-[70px]" value={f.arrivalTime} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].arrivalTime = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Arr Date</label>
          <input type="date" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={f.arrivalDate} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].arrivalDate = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Gate</label>
          <input placeholder="B22" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.gate} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].gate = e.target.value.toUpperCase(); updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
        <div className="flex flex-col">
          <label className="text-[8px] font-bold text-slate-400 uppercase">Seat</label>
          <input placeholder="12A" className="bg-slate-50 p-2 rounded-xl font-bold uppercase border-none" value={f.seatNumber} onChange={e => {
            const n = [...activeTrip.logistics.flights]; n[fIdx].seatNumber = e.target.value.toUpperCase(); updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } });
          }} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { const n = [...activeTrip.logistics.flights]; n[fIdx].isEditing = false; updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: n } }); }} className="flex-1 bg-slate-900 text-white rounded-xl py-2 font-bold">Done</button>
        <button onClick={() => updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: activeTrip.logistics.flights.filter((_, i) => i !== fIdx) } })} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={14}/></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-jakarta text-[11px]">
      <nav className="glass-card sticky top-0 z-40 px-4 h-14 flex items-center justify-between border-none shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTripId(null)} className="p-1.5 hover:bg-slate-50 rounded-full transition-colors"><ChevronLeft size={18} /></button>
          <div>
            <h2 className="text-sm font-black text-slate-800 leading-tight">{activeTrip.title}</h2>
            <div className="flex items-center gap-2 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
               <span>{activeTrip.destination}</span>
               <button onClick={detectCurrency} className="text-teal-500 hover:underline">CCY: {activeTrip.baseCurrency}</button>
            </div>
          </div>
        </div>
        <div className="flex -space-x-1.5">{activeTrip.members.map((m, i) => <div key={i} title={m} className="w-6 h-6 rounded-full border-2 border-white trip-gradient flex items-center justify-center text-[8px] text-white font-bold">{m.charAt(0)}</div>)}</div>
      </nav>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 pb-24 relative">
        <div className="flex overflow-x-auto gap-5 mb-6 pb-1 no-scrollbar border-b border-slate-100">
          {['Logistics', 'Plan', 'Booking', 'Wallet', 'Wishlist', 'Checklist'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2.5 px-0.5 font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === tab ? 'tab-active' : 'text-slate-400'}`}>
              {tab === 'Logistics' && <Plane size={13} />}
              {tab === 'Plan' && <Calendar size={13} />}
              {tab === 'Booking' && <CheckCircle size={13} />}
              {tab === 'Wallet' && <Receipt size={13} />}
              {tab === 'Wishlist' && <ShoppingBag size={13} />}
              {tab === 'Checklist' && <Briefcase size={13} />}
              {tab}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in duration-300">
          
          {/* LOGISTICS */}
          {activeTab === 'Logistics' && (
            <div className="space-y-8">
              
              <section className="glass-card p-4 rounded-2xl shadow-sm border-none space-y-3">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Shield size={14} className="text-teal-500" /> Insurance</h3>
                  <div className="flex gap-2">
                    {activeTrip.insurance.active ? (
                      <button onClick={() => updateActiveTrip({ insurance: { ...activeTrip.insurance, isEditing: !activeTrip.insurance.isEditing } })} className="p-1 bg-slate-50 text-slate-400 hover:text-teal-600 rounded-full transition-colors"><Edit2 size={12}/></button>
                    ) : (
                      <button onClick={() => updateActiveTrip({ insurance: { ...activeTrip.insurance, active: true, isEditing: true } })} className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">+ Add Insurance</button>
                    )}
                  </div>
                </div>
                {activeTrip.insurance.active && (
                  activeTrip.insurance.isEditing ? (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                      <input placeholder="Company" className="bg-slate-50 p-2 rounded-xl border-none font-bold" value={activeTrip.insurance.company} onChange={e => updateActiveTrip({ insurance: { ...activeTrip.insurance, company: e.target.value } })} />
                      <input placeholder="Plan Name" className="bg-slate-50 p-2 rounded-xl border-none font-bold" value={activeTrip.insurance.plan} onChange={e => updateActiveTrip({ insurance: { ...activeTrip.insurance, plan: e.target.value } })} />
                      <input placeholder="Emergency Contact" className="bg-slate-50 p-2 rounded-xl border-none font-bold" value={activeTrip.insurance.emergencyContact} onChange={e => updateActiveTrip({ insurance: { ...activeTrip.insurance, emergencyContact: e.target.value } })} />
                      <input placeholder="Ref #" className="bg-slate-50 p-2 rounded-xl border-none font-bold" value={activeTrip.insurance.referenceNumber} onChange={e => updateActiveTrip({ insurance: { ...activeTrip.insurance, referenceNumber: e.target.value } })} />
                      <div className="col-span-2 flex gap-2">
                        <button onClick={() => updateActiveTrip({ insurance: { ...activeTrip.insurance, isEditing: false } })} className="flex-1 bg-slate-900 text-white rounded-xl py-2 font-bold mt-2">Save Details</button>
                        <button onClick={() => updateActiveTrip({ insurance: { company: '', plan: '', emergencyContact: '', referenceNumber: '', isEditing: false, active: false } })} className="bg-red-50 text-red-500 rounded-xl px-4 py-2 font-bold mt-2"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-3 p-2 bg-slate-50/50 rounded-xl">
                      <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Company</span><span className="font-bold">{activeTrip.insurance.company || '--'}</span></div>
                      <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Plan</span><span className="font-bold">{activeTrip.insurance.plan || '--'}</span></div>
                      <div className="flex flex-col"><span className="text-[8px] font-black text-teal-600 uppercase">Emergency</span><span className="font-bold text-teal-600">{activeTrip.insurance.emergencyContact || '--'}</span></div>
                      <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Ref #</span><span className="font-bold">{activeTrip.insurance.referenceNumber || '--'}</span></div>
                    </div>
                  )
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Plane size={14} className="text-blue-500" /> Flights</h3>
                  <button onClick={() => setShowFlightChoiceModal(true)} className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg">+ Add Journey</button>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-l-4 border-blue-400 pl-3 mb-2">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">{activeTrip.flightType === 'Round-Trip' ? 'Departure Journey' : 'Journey'}</h4>
                       <button onClick={() => {
                          const f: FlightDetail = { id: generateId(), code: '', date: activeTrip.startDate, isReturn: false, isEditing: true, arrivalDate: activeTrip.startDate };
                          updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: [...activeTrip.logistics.flights, f] } });
                       }} className="text-[9px] font-bold text-blue-500 hover:underline flex items-center gap-1">+ Add Segment</button>
                    </div>
                    
                    <div className="space-y-4">
                      {activeTrip.logistics.flights.filter(f => !f.isReturn).map((f) => {
                        const actualIdx = activeTrip.logistics.flights.findIndex(x => x.id === f.id);
                        if (f.isEditing) return renderFlightEditor(f, actualIdx);
                        return (
                          <div key={f.id} className="glass-card rounded-2xl bg-white border border-slate-100 shadow-sm relative group flex overflow-hidden max-w-lg">
                            <div className="flex-1 p-5 border-r border-dashed border-slate-200 relative">
                              <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f8fafc]"></div>
                              <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-[#f8fafc]"></div>
                              
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={()=>{const n=[...activeTrip.logistics.flights]; n[actualIdx].isEditing=true; updateActiveTrip({logistics:{...activeTrip.logistics, flights:n}});}} className="p-1 bg-slate-50 text-slate-400 hover:text-blue-500 rounded-md transition-colors"><Edit2 size={12}/></button>
                                <button onClick={() => updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: activeTrip.logistics.flights.filter(x => x.id !== f.id) } })} className="p-1 bg-slate-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={12}/></button>
                              </div>

                              <div className="flex justify-between items-center mb-3">
                                <div className="text-center w-16">
                                  <div className="text-[7px] font-black uppercase opacity-40 mb-0.5">FROM</div>
                                  <div className="text-lg font-black text-slate-800">{f.departureAirport || '---'}</div>
                                  <div className="text-[9px] font-bold text-slate-400">{f.boardingTime || '--:--'}</div>
                                  <div className="text-[7px] text-slate-300 font-bold">{formatDate(f.date)}</div>
                                </div>
                                <div className="flex-1 px-3 flex flex-col items-center">
                                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">{f.code}</span>
                                  <div className="w-full h-[1px] bg-slate-100 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1.5"><Plane size={12} className="text-blue-200" /></div>
                                  </div>
                                </div>
                                <div className="text-center w-16">
                                  <div className="text-[7px] font-black uppercase opacity-40 mb-0.5">TO</div>
                                  <div className="text-lg font-black text-slate-800">{f.arrivalAirport || '---'}</div>
                                  <div className="text-[9px] font-bold text-slate-400">{f.arrivalTime || '--:--'}</div>
                                  <div className="text-[7px] text-slate-300 font-bold">{formatDate(f.arrivalDate || f.date)}</div>
                                </div>
                              </div>
                            </div>
                            <div className="w-20 bg-slate-50/50 p-4 flex flex-col justify-center gap-3">
                               <div className="text-center">
                                  <div className="text-[7px] font-black uppercase opacity-40">GATE</div>
                                  <div className="text-[10px] font-black text-slate-700">{f.gate || '--'}</div>
                               </div>
                               <div className="text-center">
                                  <div className="text-[7px] font-black uppercase opacity-40">SEAT</div>
                                  <div className="text-[10px] font-black text-blue-600">{f.seatNumber || '--'}</div>
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {activeTrip.flightType === 'Round-Trip' && (
                    <div className="space-y-4">
                       <div className="flex justify-between items-center border-l-4 border-teal-400 pl-3 mb-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Return Journey</h4>
                          <button onClick={() => {
                             const f: FlightDetail = { id: generateId(), code: '', date: activeTrip.endDate, isReturn: true, isEditing: true, arrivalDate: activeTrip.endDate };
                             updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: [...activeTrip.logistics.flights, f] } });
                          }} className="text-[9px] font-bold text-teal-500 hover:underline flex items-center gap-1">+ Add Segment</button>
                       </div>
                       
                       <div className="space-y-4">
                         {activeTrip.logistics.flights.filter(f => f.isReturn).map((f) => {
                           const actualIdx = activeTrip.logistics.flights.findIndex(x => x.id === f.id);
                           if (f.isEditing) return renderFlightEditor(f, actualIdx);
                           return (
                             <div key={f.id} className="glass-card rounded-2xl bg-white border border-slate-100 shadow-sm relative group flex overflow-hidden max-lg">
                               <div className="flex-1 p-5 border-r border-dashed border-slate-200 relative">
                                  <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f8fafc]"></div>
                                  <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-[#f8fafc]"></div>

                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={()=>{const n=[...activeTrip.logistics.flights]; n[actualIdx].isEditing=true; updateActiveTrip({logistics:{...activeTrip.logistics, flights:n}});}} className="p-1 bg-slate-50 text-slate-400 hover:text-teal-500 rounded-md transition-colors"><Edit2 size={12}/></button>
                                    <button onClick={() => updateActiveTrip({ logistics: { ...activeTrip.logistics, flights: activeTrip.logistics.flights.filter(x => x.id !== f.id) } })} className="p-1 bg-slate-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"><Trash2 size={12}/></button>
                                  </div>

                                  <div className="flex justify-between items-center mb-3">
                                    <div className="text-center w-16">
                                      <div className="text-[7px] font-black uppercase opacity-40 mb-0.5">FROM</div>
                                      <div className="text-lg font-black text-slate-800">{f.departureAirport || '---'}</div>
                                      <div className="text-[9px] font-bold text-slate-400">{f.boardingTime || '--:--'}</div>
                                      <div className="text-[7px] text-slate-300 font-bold">{formatDate(f.date)}</div>
                                    </div>
                                    <div className="flex-1 px-3 flex flex-col items-center">
                                      <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest mb-0.5">{f.code}</span>
                                      <div className="w-full h-[1px] bg-slate-100 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1.5"><Plane size={12} className="text-teal-200 rotate-180" /></div>
                                      </div>
                                    </div>
                                    <div className="text-center w-16">
                                      <div className="text-[7px] font-black uppercase opacity-40 mb-0.5">TO</div>
                                      <div className="text-lg font-black text-slate-800">{f.arrivalAirport || '---'}</div>
                                      <div className="text-[9px] font-bold text-slate-400">{f.arrivalTime || '--:--'}</div>
                                      <div className="text-[7px] text-slate-300 font-bold">{formatDate(f.arrivalDate || f.date)}</div>
                                    </div>
                                  </div>
                               </div>
                               <div className="w-20 bg-slate-50/50 p-4 flex flex-col justify-center gap-3">
                                  <div className="text-center">
                                     <div className="text-[7px] font-black uppercase opacity-40">GATE</div>
                                     <div className="text-[10px] font-black text-slate-700">{f.gate || '--'}</div>
                                  </div>
                                  <div className="text-center">
                                     <div className="text-[7px] font-black uppercase opacity-40">SEAT</div>
                                     <div className="text-[10px] font-black text-teal-600">{f.seatNumber || '--'}</div>
                                  </div>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Hotel size={14} className="text-orange-500" /> Accommodations</h3>
                  <button onClick={() => {
                      const h: HotelDetail = { 
                        id: generateId(), 
                        name: '', 
                        nights: '', 
                        startDate: activeTrip.startDate, 
                        meals: { breakfast: false, lunch: false, afternoonTea: false, dinner: false }, 
                        isEditing: true,
                        checkIn: '15:00', 
                        checkOut: '11:00',
                        remarks: '',
                        localName: '',
                        address: '',
                        phone: ''
                      };
                      updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: [...activeTrip.logistics.hotels, h] } });
                  }} className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-lg">+ Add Stay</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTrip.logistics.hotels.map((h, hIdx) => (
                    <div key={h.id} className="glass-card p-4 rounded-2xl border-t-2 border-t-orange-400 group relative">
                      {h.isEditing ? (
                        <div className="space-y-3">
                           <div className="flex gap-2">
                             <input placeholder="Hotel Name" className="flex-1 bg-slate-50 rounded-xl p-2.5 font-black border-none" value={h.name} onChange={e => {
                               const n = [...activeTrip.logistics.hotels]; n[hIdx].name = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } });
                             }} />
                             <button onClick={() => searchHotel(hIdx)} disabled={isAiLoading} className="p-2.5 bg-orange-500 text-white rounded-xl font-bold shadow-sm disabled:opacity-50">
                               {isAiLoading ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                             </button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-3">
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Local Name</label><input placeholder="Hotel Name (Local)" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={h.localName} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].localName = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Local Phone</label><input placeholder="Hotel Phone" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={h.phone} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].phone = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                           </div>
                           
                           <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Local Address</label><textarea placeholder="Address in local language" className="bg-slate-50 p-2 rounded-xl font-bold border-none resize-none" rows={2} value={h.address} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].address = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>

                           <div className="grid grid-cols-2 gap-3">
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Start Date</label><input type="date" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={h.startDate} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].startDate = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Nights</label><input type="number" placeholder="Blank" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={h.nights} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].nights = e.target.value === '' ? '' : parseInt(e.target.value); updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Check-in</label><input type="time" className="bg-slate-50 p-2 rounded-xl font-bold border-none min-w-[70px]" value={h.checkIn} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].checkIn = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Check-out</label><input type="time" className="bg-slate-50 p-2 rounded-xl font-bold border-none min-w-[70px]" value={h.checkOut} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].checkOut = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                           </div>
                           <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Remarks</label><textarea placeholder="Room requests, late check-in..." className="bg-slate-50 p-2 rounded-xl font-bold border-none resize-none" rows={2} value={h.remarks} onChange={e => { const n = [...activeTrip.logistics.hotels]; n[hIdx].remarks = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} /></div>
                           <button onClick={() => { const n = [...activeTrip.logistics.hotels]; n[hIdx].isEditing = false; updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: n } }); }} className="w-full bg-slate-900 text-white rounded-xl py-2 font-bold shadow-sm active:scale-95">Save sanctuary</button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-black text-slate-800">{h.name || 'Accommodations'}</h4>
                              {h.localName && <p className="text-[9px] font-bold text-orange-600 leading-tight italic">{h.localName}</p>}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={()=>{const n=[...activeTrip.logistics.hotels]; n[hIdx].isEditing=true; updateActiveTrip({logistics:{...activeTrip.logistics, hotels:n}});}} className="text-slate-200 hover:text-orange-500 transition-colors"><Edit2 size={12}/></button>
                              <button onClick={() => updateActiveTrip({ logistics: { ...activeTrip.logistics, hotels: activeTrip.logistics.hotels.filter((_, i) => i !== hIdx) } })} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                            </div>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg text-[9px] font-bold text-slate-500 mb-3 space-y-1 border border-slate-100">
                             {h.address && <p className="flex gap-1.5"><Navigation size={10} className="text-orange-400 shrink-0"/> {h.address}</p>}
                             {h.phone && <p className="flex gap-1.5"><Phone size={10} className="text-orange-400 shrink-0"/> {h.phone}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 border-t border-slate-50 pt-2">
                             <div>In: {h.checkIn || '15:00'}</div>
                             <div>Out: {h.checkOut || '11:00'}</div>
                          </div>
                          {h.remarks && <p className="text-[10px] font-medium text-slate-500 italic mt-1">Note: {h.remarks}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Ticket size={14} className="text-teal-500" /> Travel Passes</h3>
                  <button onClick={() => {
                      const tp: TravelPass = { id: generateId(), name: '', startDate: activeTrip.startDate, endDate: activeTrip.endDate, isEditing: true };
                      updateActiveTrip({ logistics: { ...activeTrip.logistics, travelPasses: [...activeTrip.logistics.travelPasses, tp] } });
                  }} className="text-[9px] font-bold text-teal-500 bg-teal-50 px-2.5 py-1 rounded-lg">+ Add Pass</button>
                </div>
                <div className="space-y-3">
                  {activeTrip.logistics.travelPasses.map((tp, tpIdx) => (
                    <div key={tp.id} className="glass-card p-4 rounded-2xl border-l-4 border-l-teal-400 shadow-sm relative group">
                      {tp.isEditing ? (
                        <div className="space-y-3">
                           <input placeholder="Pass Name (e.g. JR Pass)" className="w-full bg-slate-50 rounded-xl p-2.5 font-black border-none" value={tp.name} onChange={e => {
                             const n = [...activeTrip.logistics.travelPasses]; n[tpIdx].name = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, travelPasses: n } });
                           }} />
                           <div className="grid grid-cols-2 gap-3">
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Starts</label><input type="date" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={tp.startDate} onChange={e => { const n = [...activeTrip.logistics.travelPasses]; n[tpIdx].startDate = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, travelPasses: n } }); }} /></div>
                             <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Ends</label><input type="date" className="bg-slate-50 p-2 rounded-xl font-bold border-none" value={tp.endDate} onChange={e => { const n = [...activeTrip.logistics.travelPasses]; n[tpIdx].endDate = e.target.value; updateActiveTrip({ logistics: { ...activeTrip.logistics, travelPasses: n } }); }} /></div>
                           </div>
                           <button onClick={()=>{const n=[...activeTrip.logistics.travelPasses]; n[tpIdx].isEditing=false; updateActiveTrip({logistics:{...activeTrip.logistics, travelPasses:n}});}} className="w-full bg-slate-900 text-white rounded-xl py-2 font-bold">Done</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-sm font-black text-slate-800">{tp.name || 'Travel Pass'}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(tp.startDate)} - {formatDate(tp.endDate)}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={()=>{const n=[...activeTrip.logistics.travelPasses]; n[tpIdx].isEditing=true; updateActiveTrip({logistics:{...activeTrip.logistics, travelPasses:n}});}} className="text-slate-200 hover:text-teal-600 transition-colors"><Edit2 size={12}/></button>
                             <button onClick={() => updateActiveTrip({ logistics: { ...activeTrip.logistics, travelPasses: activeTrip.logistics.travelPasses.filter((_, i) => i !== tpIdx) } })} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}

          {/* PLAN */}
          {activeTab === 'Plan' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex overflow-x-auto gap-2 py-1 no-scrollbar">
                  {activeTrip.planDays.map((d, i) => (
                    <button key={i} onClick={() => setSelectedDayIdx(i)} className={`flex flex-col items-center min-w-[55px] p-2.5 rounded-2xl transition-all border-2 ${selectedDayIdx === i ? 'bg-teal-600 border-teal-600 text-white shadow-md' : 'bg-white border-slate-50 text-slate-400'}`}>
                      <span className="text-[8px] font-bold uppercase opacity-60">D{i+1}</span>
                      <span className="text-sm font-black leading-none my-0.5">{new Date(d.date).getDate()}</span>
                      <span className="text-[7px] font-bold uppercase">{getDayOfWeek(d.date)}</span>
                    </button>
                  ))}
                </div>
                <div className="glass-card p-3 rounded-2xl flex flex-col gap-2 border-none shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-1">
                    <div className="flex items-center gap-2 flex-1 text-slate-800">
                      <CloudSun size={14} className="text-yellow-500" />
                      <input placeholder="Weather City..." className="bg-transparent border-none p-0 font-black text-sm w-full focus:ring-0" value={activeTrip.weatherCity} onChange={e => updateActiveTrip({ weatherCity: e.target.value })} />
                    </div>
                    {currentDay?.weather ? (
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{currentDay.weather.temp} • {currentDay.weather.condition}</div>
                    ) : (
                      <button onClick={() => fetchWeather(selectedDayIdx)} className="text-[9px] font-black text-blue-500 hover:underline">Fetch Weather</button>
                    )}
                  </div>
                  
                  <button onClick={() => setLogisticsCollapsed(!logisticsCollapsed)} className="w-full flex justify-between items-center py-2 px-3 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-[0.99]">
                    <span>Summary of Logistics</span>
                    {logisticsCollapsed ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                  </button>
                  {!logisticsCollapsed && (
                    <div className="p-3 bg-slate-50 rounded-xl space-y-4 animate-in slide-in-from-top-2 border border-slate-100">
                       <div className="space-y-2">
                         <p className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1"><Plane size={10}/> Flights Today</p>
                         {activeTrip.logistics.flights.filter(f => f.date === currentDay.date || f.arrivalDate === currentDay.date).length > 0 ? (
                           activeTrip.logistics.flights.filter(f => f.date === currentDay.date || f.arrivalDate === currentDay.date).map(f => (
                             <div key={f.id} className="text-[9px] p-2 bg-white rounded-lg flex justify-between shadow-sm border border-slate-100">
                               <div className="flex flex-col">
                                 <span className="font-black text-slate-800">{f.code}: {f.departureAirport} → {f.arrivalAirport}</span>
                                 <span className="text-[7px] text-slate-400 uppercase font-bold">
                                   {f.date === currentDay.date ? 'Departure' : 'Arrival'} Journey
                                 </span>
                               </div>
                               <span className="opacity-60">{f.date === currentDay.date ? f.boardingTime : f.arrivalTime || '--:--'}</span>
                             </div>
                           ))
                         ) : <p className="text-[8px] text-slate-400 italic px-1">No flights scheduled.</p>}
                       </div>

                       <div className="space-y-2">
                         <p className="text-[8px] font-black text-orange-500 uppercase flex items-center gap-1"><Hotel size={10}/> Accommodation Status</p>
                         {activeTrip.logistics.hotels.map(h => {
                            const checkInDate = h.startDate;
                            const checkOutDate = h.nights !== '' ? new Date(new Date(h.startDate).getTime() + h.nights * 86400000).toISOString().split('T')[0] : '';
                            
                            const isCheckInDay = currentDay.date === checkInDate;
                            const isCheckOutDay = currentDay.date === checkOutDate;
                            const isStayingDay = !isCheckInDay && !isCheckOutDay && currentDay.date > checkInDate && (checkOutDate === '' || currentDay.date < checkOutDate);

                            if (isCheckInDay) return (
                               <div key={h.id} className="text-[9px] p-2 bg-white rounded-lg flex justify-between shadow-sm border border-orange-200">
                                  <span className="font-black text-orange-600 uppercase">CHECK-IN: {h.name}</span>
                                  <span className="font-black text-slate-700">{h.checkIn || '15:00'}</span>
                               </div>
                            );
                            if (isCheckOutDay) return (
                               <div key={h.id} className="text-[9px] p-2 bg-white rounded-lg flex justify-between shadow-sm border border-red-200">
                                  <span className="font-black text-red-600 uppercase">CHECK-OUT: {h.name}</span>
                                  <span className="font-black text-slate-700">{h.checkOut || '11:00'}</span>
                               </div>
                            );
                            if (isStayingDay) return (
                               <div key={h.id} className="text-[9px] p-2 bg-white rounded-lg shadow-sm border border-slate-100 italic text-slate-500">
                                  Staying at <span className="font-bold not-italic text-slate-700 uppercase">{h.name}</span>
                               </div>
                            );
                            return null;
                         })}
                         {activeTrip.logistics.hotels.length === 0 && <p className="text-[8px] text-slate-400 italic px-1">No accommodations recorded.</p>}
                       </div>

                       <div className="space-y-2">
                         <p className="text-[8px] font-black text-teal-500 uppercase flex items-center gap-1"><Ticket size={10}/> Travel Passes Active</p>
                         {activeTrip.logistics.travelPasses.filter(tp => currentDay.date >= tp.startDate && currentDay.date <= tp.endDate).length > 0 ? (
                           activeTrip.logistics.travelPasses.filter(tp => currentDay.date >= tp.startDate && currentDay.date <= tp.endDate).map(tp => (
                             <div key={tp.id} className="text-[9px] p-2 bg-white rounded-lg shadow-sm border border-teal-100 flex justify-between items-center">
                               <span className="font-black text-teal-700 uppercase">{tp.name}</span>
                               <span className="text-[8px] font-bold text-slate-400">VALID</span>
                             </div>
                           ))
                         ) : <p className="text-[8px] text-slate-400 italic px-1">No active passes today.</p>}
                       </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-card p-5 rounded-[2.5rem] shadow-sm space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Daily Timeline</h4>
                    <div className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg">Spend: ${currentDay.scheduled.reduce((a,c)=>a+(c.amountHKD||0),0).toLocaleString()} HKD</div>
                  </div>
                  
                  {currentDay.scheduled.map((it, idx) => (
                    <div key={it.id} className="relative group">
                      {it.isEditing ? (
                        <div className="p-3 bg-slate-50 rounded-2xl space-y-3 border border-slate-200">
                           <div className="flex gap-2">
                              <input placeholder="Time" type="time" className="w-16 bg-white p-2 rounded-xl text-[10px] font-black border-none text-center min-w-[70px]" value={it.time} onChange={e=>{
                                 const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].time=e.target.value; updateActiveTrip({planDays:n});
                              }} />
                              <input placeholder="Activity Name" className="flex-1 bg-white p-2 rounded-xl text-[10px] font-black border-none" value={it.activity} onChange={e=>{
                                 const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].activity=e.target.value; updateActiveTrip({planDays:n});
                              }} />
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             <input placeholder="Location" className="bg-white p-2 rounded-xl text-[9px] font-bold border-none" value={it.location} onChange={e=>{const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].location=e.target.value; updateActiveTrip({planDays:n});}} />
                           </div>
                           
                           <SplitEditor 
                             members={activeTrip.members} 
                             split={it.split || { method: 'Equally', payer: activeTrip.members[0], customShares: {}, customLocalShares: {} }} 
                             amountLocal={it.amountLocal || 0}
                             amountHKD={it.amountHKD || 0}
                             fxRate={it.fxRate || activeTrip.fxRate || 1}
                             paymentMethod={it.paymentMethod || 'Cash'}
                             onSplitChange={s => { const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].split = s; updateActiveTrip({planDays:n}); }}
                             onPaymentMethodChange={p => { const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].paymentMethod = p; updateActiveTrip({planDays:n}); }}
                             onAmountChange={(local, hkd, rate) => {
                               const n=[...activeTrip.planDays];
                               n[selectedDayIdx].scheduled[idx].amountLocal = local;
                               n[selectedDayIdx].scheduled[idx].amountHKD = hkd;
                               n[selectedDayIdx].scheduled[idx].fxRate = rate;
                               updateActiveTrip({planDays:n});
                             }}
                           />

                           <button onClick={()=>{const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].isEditing=false; updateActiveTrip({planDays:n});}} className="w-full bg-slate-900 text-white rounded-xl py-2 font-bold">Register Milestone</button>
                        </div>
                      ) : (
                        <div className="p-3 bg-white border border-slate-100 rounded-2xl flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group/it">
                           <div className="flex flex-col items-center min-w-[32px] pt-1">
                             <span className="text-[10px] font-black text-teal-600">{it.time || '--:--'}</span>
                           </div>
                           <div className="flex-1">
                             <h5 className="text-[11px] font-black text-slate-800 leading-tight">{it.activity || 'Activity'}</h5>
                             <div className="flex gap-3 text-[9px] text-slate-400 font-bold mt-1">
                                {it.location && <span className="flex items-center gap-1"><MapPin size={10}/> {it.location}</span>}
                                {it.amountHKD ? <span className="text-teal-600 font-black">${it.amountHKD.toFixed(1)} HKD</span> : null}
                             </div>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover/it:opacity-100 transition-opacity">
                             <button onClick={()=>{const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled[idx].isEditing=true; updateActiveTrip({planDays:n});}} className="p-1.5 text-slate-300 hover:text-teal-600 transition-colors"><Edit2 size={12}/></button>
                             <button onClick={()=>{const n=[...activeTrip.planDays]; n[selectedDayIdx].scheduled.splice(idx,1); updateActiveTrip({planDays:n});}} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => {
                    const n = [...activeTrip.planDays]; n[selectedDayIdx].scheduled.push({ id: generateId(), time: '09:00', activity: '', split: { method: 'Equally', payer: activeTrip.members[0], customShares: {}, customLocalShares: {} }, paymentMethod: 'Cash', fxRate: activeTrip.fxRate || 1, isEditing: true }); updateActiveTrip({ planDays: n });
                  }} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-[9px] font-bold text-slate-300 hover:text-teal-500 hover:border-teal-500 transition-all">+ New Entry</button>
                </div>
              </div>
            </div>
          )}

          {/* BOOKING */}
          {activeTab === 'Booking' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {['Flight', 'Hotel', 'Activity', 'Ticket', 'Service', 'Restaurant'].map(type => (
                  <button key={type} onClick={() => {
                    const b: Booking = { id: generateId(), type: type as any, name: '', details: '', confirmation: '', split: { method: 'Equally', payer: activeTrip.members[0], customShares: {}, customLocalShares: {} }, paymentMethod: 'Credit Card', currency: activeTrip.baseCurrency, fxRate: activeTrip.fxRate || 1, isEditing: true };
                    updateActiveTrip({ bookings: [...activeTrip.bookings, b] });
                  }} className="px-3.5 py-2 bg-white rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 hover:text-teal-600 shadow-sm transition-all active:scale-95">+ {type}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTrip.bookings.map((b, bIdx) => (
                  <div key={b.id} className="glass-card p-5 rounded-[2rem] border-l-4 border-l-teal-500 shadow-sm space-y-3 relative group">
                    <div className="flex justify-between items-start">
                      <div className="p-1 bg-teal-50 text-teal-600 rounded-lg font-black text-[8px] uppercase tracking-widest">{b.type}</div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={()=>{const n=[...activeTrip.bookings]; n[bIdx].isEditing=!n[bIdx].isEditing; updateActiveTrip({bookings:n});}} className="text-slate-300"><Edit2 size={12}/></button>
                         <button onClick={() => updateActiveTrip({ bookings: activeTrip.bookings.filter(x => x.id !== b.id) })} className="text-slate-100 hover:text-red-400"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    {b.isEditing ? (
                      <div className="space-y-3">
                         <input placeholder="Booking Descriptor" className="w-full bg-slate-50 rounded-xl p-3 font-black border-none" value={b.name} onChange={e => {
                           const n = [...activeTrip.bookings]; n[bIdx].name = e.target.value; updateActiveTrip({ bookings: n });
                         }} />
                         <div className="grid grid-cols-2 gap-2">
                           <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Date</label><input type="date" className="bg-slate-50 p-2 rounded-xl text-[9px] font-bold border-none" value={b.date} onChange={e => { const n = [...activeTrip.bookings]; n[bIdx].date = e.target.value; updateActiveTrip({ bookings: n }); }} /></div>
                           <div className="flex flex-col"><label className="text-[8px] font-bold text-slate-400 uppercase">Time</label><input type="time" className="bg-slate-50 p-2 rounded-xl font-bold border-none min-w-[70px]" value={b.time} onChange={e => { const n = [...activeTrip.bookings]; n[bIdx].time = e.target.value; updateActiveTrip({ bookings: n }); }} /></div>
                         </div>
                         
                         <SplitEditor 
                           members={activeTrip.members} 
                           split={b.split} 
                           amountLocal={b.amountLocal || 0}
                           amountHKD={b.amountHKD || 0}
                           fxRate={b.fxRate || activeTrip.fxRate || 1}
                           paymentMethod={b.paymentMethod || 'Credit Card'}
                           onSplitChange={s => { const n=[...activeTrip.bookings]; n[bIdx].split = s; updateActiveTrip({bookings:n}); }}
                           onPaymentMethodChange={p => { const n=[...activeTrip.bookings]; n[bIdx].paymentMethod = p; updateActiveTrip({bookings:n}); }}
                           onAmountChange={(local, hkd, rate) => {
                             const n = [...activeTrip.bookings];
                             n[bIdx].amountLocal = local;
                             n[bIdx].amountHKD = hkd;
                             n[bIdx].fxRate = rate;
                             updateActiveTrip({ bookings: n });
                           }}
                         />

                         <button onClick={()=>{const n=[...activeTrip.bookings]; n[bIdx].isEditing=false; updateActiveTrip({bookings:n});}} className="w-full bg-slate-900 text-white p-2 rounded-xl font-bold">Save Selection</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-slate-800">{b.name || 'Reservation'}</h4>
                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span>{formatDate(b.date || '')} • {b.time || '--:--'}</span>
                           <span className="text-teal-600">${(b.amountHKD || 0).toFixed(1)} HKD</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl text-[8px] font-bold text-slate-500 uppercase tracking-widest border border-slate-100 flex justify-between">
                           <span>Paid by {b.split.payer} • {b.split.method}</span>
                           <span className="opacity-50 flex items-center gap-1">
                             {b.paymentMethod === 'Cash' ? <Coins size={10} /> : <CreditCard size={10} />}
                             {b.paymentMethod}
                           </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WALLET */}
          {activeTab === 'Wallet' && (
            <div className="space-y-6">
               <div className="glass-card p-6 rounded-[2.5rem] shadow-sm space-y-6">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight border-b border-slate-50 pb-3">
                      <Calculator size={16} className="text-blue-500" /> Summary
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Line 1: Total Spending */}
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Trip Spend</p>
                        <p className="text-2xl font-black text-teal-600">${totalTripSpend.toLocaleString()} <span className="text-xs text-slate-300">HKD</span></p>
                     </div>

                     {/* Line 2: Settlements with Checkboxes */}
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Settlements</p>
                        <div className="space-y-2">
                          {getSettlement().map((t, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group animate-in slide-in-from-right-2">
                               <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{t.from} → {t.to}</span>
                                 <span className="text-[9px] font-black text-teal-600">${t.amount.toFixed(1)} HKD</span>
                               </div>
                               <label className="flex items-center gap-1.5 cursor-pointer">
                                 <input type="checkbox" className="w-3.5 h-3.5 rounded text-teal-600" onChange={(e) => { if (e.target.checked) handleSettle(t.from, t.to, t.amount); }} />
                                 <span className="text-[8px] font-black uppercase text-slate-400 group-hover:text-teal-600 transition-colors">Settle</span>
                               </label>
                            </div>
                          ))}
                          {getSettlement().length === 0 && <p className="text-[9px] text-slate-300 italic py-2">All expedition debts settled.</p>}
                        </div>
                     </div>
                  </div>

                  {/* Member Spending Filter */}
                  <div className="pt-4 border-t border-slate-50">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Filter Ledger by Member</p>
                     <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar justify-center">
                        {activeTrip.members.map(m => (
                            <button 
                                key={m} 
                                onClick={() => setSelectedMemberFilter(selectedMemberFilter === m ? null : m)}
                                className={`flex flex-col items-center min-w-[80px] p-3 rounded-2xl transition-all border-2 ${selectedMemberFilter === m ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-600'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs mb-1 ${selectedMemberFilter === m ? 'bg-white text-blue-600' : 'trip-gradient text-white'}`}>
                                    {m.charAt(0)}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tight truncate w-full text-center">{m}</span>
                                <span className={`text-[9px] font-bold mt-1 ${selectedMemberFilter === m ? 'text-blue-100' : 'text-teal-600'}`}>${(memberSpending[m] || 0).toLocaleString()}</span>
                            </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="glass-card p-6 rounded-[2.5rem] space-y-4 shadow-sm">
                  <div className="flex flex-col gap-4 mb-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            Trip Journal
                        </h3>
                        {!selectedMemberFilter && methodFilter === 'All' ? (
                          <button onClick={()=>{
                              const exp: Expense = { id: generateId(), description: '', amountHKD: 0, amountLocal: 0, fxRate: activeTrip.fxRate || 1, currency: activeTrip.baseCurrency, split: { method: 'Equally', payer: activeTrip.members[0], customShares: {}, customLocalShares: {} }, paymentMethod: 'Cash', isEditing: true, date: new Date().toISOString().split('T')[0] };
                              updateActiveTrip({ expenses: [...activeTrip.expenses, exp] });
                           }} className="text-[9px] trip-gradient text-white px-4 py-2 rounded-xl shadow-md">+ Add Expense</button>
                        ) : (
                          <button onClick={() => { setSelectedMemberFilter(null); setMethodFilter('All'); }} className="text-[9px] font-bold text-slate-400 flex items-center gap-1 hover:text-blue-500 transition-colors"><RefreshCw size={10}/> Reset Filters</button>
                        )}
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Payer:</span>
                        <select 
                          className="bg-white border border-slate-200 rounded-lg text-[9px] font-bold px-2 py-1 focus:ring-0"
                          value={selectedMemberFilter || 'All'}
                          onChange={e => setSelectedMemberFilter(e.target.value === 'All' ? null : e.target.value)}
                        >
                          <option value="All">All Members</option>
                          {activeTrip.members.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Method:</span>
                        <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                          {(['All', 'Cash', 'Credit Card'] as const).map(m => (
                            <button
                              key={m}
                              onClick={() => setMethodFilter(m)}
                              className={`px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center gap-1.5 ${methodFilter === m ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {m === 'Cash' && <Coins size={10} />}
                              {m === 'Credit Card' && <CreditCard size={10} />}
                              {m === 'All' ? 'All' : m.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                     {filteredJournalTransactions.map((e, i) => {
                       const isExpenseFromList = e.originalType === 'Expense';
                       const isEditing = isExpenseFromList && e.isEditing;
                       const eId = e.id;

                       if (isExpenseFromList && isEditing) {
                          const expIdx = activeTrip.expenses.findIndex(ex => ex.id === e.originalId);
                          if (expIdx === -1) return null;
                          const exp = activeTrip.expenses[expIdx];
                          
                          return (
                             <div key={eId} className="p-4 rounded-2xl flex flex-col gap-3 shadow-sm transition-all border bg-white border-slate-200 animate-in slide-in-from-top-1">
                                <div className="flex gap-2">
                                  <input placeholder="Expense details" className="flex-1 bg-slate-50 p-2.5 rounded-xl font-black text-[10px] border-none" value={exp.description} onChange={ev=>{const n=[...activeTrip.expenses]; n[expIdx].description=ev.target.value; updateActiveTrip({expenses:n});}} />
                                  <input placeholder="CCY" className="w-16 bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border-none uppercase text-center" value={exp.currency} onChange={ev=>{const n=[...activeTrip.expenses]; n[expIdx].currency=ev.target.value.toUpperCase(); updateActiveTrip({expenses:n});}} />
                                </div>
                                
                                <SplitEditor 
                                  members={activeTrip.members} 
                                  split={exp.split} 
                                  amountLocal={exp.amountLocal || 0}
                                  amountHKD={exp.amountHKD || 0}
                                  fxRate={exp.fxRate || activeTrip.fxRate || 1}
                                  paymentMethod={exp.paymentMethod || 'Cash'}
                                  onSplitChange={s => { const n=[...activeTrip.expenses]; n[expIdx].split = s; updateActiveTrip({expenses:n}); }}
                                  onPaymentMethodChange={p => { const n=[...activeTrip.expenses]; n[expIdx].paymentMethod = p; updateActiveTrip({expenses:n}); }}
                                  onAmountChange={(local, hkd, rate) => {
                                    const n = [...activeTrip.expenses];
                                    n[expIdx].amountLocal = local;
                                    n[expIdx].amountHKD = hkd;
                                    n[expIdx].fxRate = rate;
                                    updateActiveTrip({ expenses: n });
                                  }}
                                />

                                <button onClick={()=>{const n=[...activeTrip.expenses]; n[expIdx].isEditing=false; updateActiveTrip({expenses:n});}} className="w-full bg-slate-900 text-white rounded-xl py-2 font-black uppercase tracking-widest text-[10px]">Record</button>
                             </div>
                          );
                       }

                       const displayAmt = e.amountHKD;
                       const displayPayer = e.payer;
                       const displayMethod = e.split?.method || '';
                       const displayCategory = e.category;

                       return (
                          <div key={eId || i} className={`p-4 rounded-2xl flex flex-col gap-1 shadow-sm transition-all border ${isExpenseFromList && e.isSettlement ? 'bg-teal-50 border-teal-100' : 'bg-white border-slate-100'} relative group`}>
                             <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                 <span className="font-black text-[11px] text-slate-800 uppercase leading-none">{e.description || 'Misc'}</span>
                                 <div className="text-slate-300">
                                   {e.paymentMethod === 'Cash' ? <Coins size={10} /> : <CreditCard size={10} />}
                                 </div>
                               </div>
                               {!selectedMemberFilter && isExpenseFromList && (
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={()=>{const n=[...activeTrip.expenses]; const idx = n.findIndex(x => x.id === e.originalId); if(idx !== -1) { n[idx].isEditing=true; updateActiveTrip({expenses:n}); }}} className="text-slate-200"><Edit2 size={12}/></button>
                                    <button onClick={() => updateActiveTrip({ expenses: activeTrip.expenses.filter(x => x.id !== e.originalId) })} className="text-slate-100 hover:text-red-400"><Trash2 size={12}/></button>
                                 </div>
                               )}
                             </div>
                             <div className="flex justify-between items-center text-[10px] font-black mt-1">
                               <div className="flex items-center gap-2">
                                   <span className="text-teal-600">${displayAmt.toFixed(1)} HKD</span>
                                   <span className="text-[8px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-400 uppercase tracking-widest font-bold">{displayCategory}</span>
                               </div>
                               <div className="flex flex-col items-end">
                                   <span className="text-slate-400 uppercase tracking-widest text-[8px] font-bold">
                                       {`Paid by ${displayPayer}${displayMethod ? ` • ${displayMethod}` : ''}`}
                                   </span>
                                   <span className="text-[7px] text-slate-300 font-bold">{formatDate(e.date || '')}</span>
                               </div>
                             </div>
                          </div>
                       );
                     })}
                     {filteredJournalTransactions.length === 0 && <p className="text-center italic opacity-30 py-6 text-[9px]">No matching transactions found.</p>}
                  </div>
               </div>
            </div>
          )}

          {/* WISHLIST */}
          {activeTab === 'Wishlist' && (
            <div className="space-y-6">
               <h3 className="text-sm font-black flex justify-between items-center text-slate-800 uppercase tracking-tight mb-2">
                  Travel Wishlist 
                  <button onClick={() => setWishlistModal({ open: true, name: '', category: 'Proxy Shopping' })} className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors">
                    + New Item
                  </button>
               </h3>

               <div className="space-y-6">
                 {Array.from(new Set(activeTrip.wishlist.map(s=>s.category))).map(cat => (
                   <div key={cat} className="glass-card rounded-2xl overflow-hidden shadow-sm">
                      <button onClick={() => setCollapsedWishlist(prev => ({ ...prev, [cat]: !prev[cat] }))} className="w-full flex justify-between items-center p-3.5 bg-white border-b border-slate-50 font-black text-xs text-slate-800">
                         <div className="flex items-center gap-2 uppercase tracking-widest text-slate-700"><Tag size={14} className="text-blue-500"/> {cat}</div>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold">{activeTrip.wishlist.filter(s=>s.category === cat).length}</span>
                            {collapsedWishlist[cat] ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                         </div>
                      </button>
                      {!collapsedWishlist[cat] && (
                        <div className="p-4 bg-slate-50 space-y-3">
                           {activeTrip.wishlist.filter(s => s.category === cat).map((it) => {
                             const actualIdx = activeTrip.wishlist.findIndex(x => x.id === it.id);
                             return (
                               <div key={it.id} className="group relative">
                                  {it.isEditing ? (
                                     <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-top-1">
                                        <div className="flex gap-2">
                                          <input placeholder="Item name" className="flex-1 bg-slate-50 p-2.5 rounded-xl font-black text-xs border-none" value={it.name} onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].name=ev.target.value; updateActiveTrip({wishlist:n});}} />
                                          <div className="relative group/photo">
                                            <input type="file" hidden ref={photoInputRef} onChange={(e) => handleWishlistPhotoUpload(e, actualIdx)} accept="image/*" />
                                            <button onClick={() => photoInputRef.current?.click()} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-teal-500 transition-colors">
                                              {it.photo ? <img src={it.photo} className="w-5 h-5 object-cover rounded shadow-sm" /> : <Camera size={18} />}
                                            </button>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Requester</span><input className="bg-slate-50 p-2 rounded-lg font-bold border-none" value={it.requestedBy} onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].requestedBy=ev.target.value; updateActiveTrip({wishlist:n});}} /></div>
                                          <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Approx $</span><input type="number" className="bg-slate-50 p-2 rounded-lg font-black text-blue-600 border-none" value={it.price} onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].price=Number(ev.target.value); updateActiveTrip({wishlist:n});}} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">URL</span><input placeholder="https://..." className="bg-slate-50 p-2 rounded-lg font-bold border-none" value={it.url || ''} onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].url=ev.target.value; updateActiveTrip({wishlist:n});}} /></div>
                                          <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Location</span><input placeholder="Shop / Area" className="bg-slate-50 p-2 rounded-lg font-bold border-none" value={it.location || ''} onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].location=ev.target.value; updateActiveTrip({wishlist:n});}} /></div>
                                        </div>
                                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Notes</span><input placeholder="..." className="bg-slate-50 p-2 rounded-lg font-bold border-none" value={it.remarks} onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].remarks=ev.target.value; updateActiveTrip({wishlist:n});}} /></div>
                                        <button onClick={()=>{const n=[...activeTrip.wishlist]; n[actualIdx].isEditing=false; updateActiveTrip({wishlist:n});}} className="w-full bg-slate-900 text-white rounded-xl py-2 font-black uppercase text-[10px]">Confirm</button>
                                     </div>
                                  ) : (
                                     <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group/it">
                                        <div className="flex items-center gap-3">
                                           <input type="checkbox" checked={it.bought} className="w-4 h-4 rounded text-blue-500 border-slate-200" onChange={ev=>{const n=[...activeTrip.wishlist]; n[actualIdx].bought=ev.target.checked; updateActiveTrip({wishlist:n});}} />
                                           <div className="flex gap-3 items-center">
                                              {it.photo && <img src={it.photo} className="w-8 h-8 rounded-lg object-cover border border-slate-100" />}
                                              <div className="flex flex-col">
                                                 <span className={`text-[11px] font-black flex items-center gap-2 ${it.bought?'line-through opacity-30':'text-slate-800'}`}>
                                                   {it.name || cat}
                                                   {it.url && (
                                                     <button onClick={(e) => { e.stopPropagation(); window.open(it.url, '_blank'); }} className="text-teal-500 hover:text-teal-600 transition-colors">
                                                       <Globe size={10} />
                                                     </button>
                                                   )}
                                                 </span>
                                                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                                                   <span>{it.requestedBy || 'Self'}</span>
                                                   {it.remarks && <span>• {it.remarks}</span>}
                                                   {it.location && <span className="flex items-center gap-0.5 text-blue-500"><MapPin size={8}/> {it.location}</span>}
                                                 </span>
                                              </div>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                           <span className="text-[10px] font-black text-blue-600">${it.price.toLocaleString()}</span>
                                           <div className="flex gap-1 opacity-0 group-hover/it:opacity-100 transition-opacity">
                                              <button onClick={()=>{const n=[...activeTrip.wishlist]; n[actualIdx].isEditing=true; updateActiveTrip({wishlist:n});}} className="p-1.5 text-slate-300 hover:text-teal-600 transition-colors"><Edit2 size={12}/></button>
                                              <button onClick={() => updateActiveTrip({ wishlist: activeTrip.wishlist.filter(x => x.id !== it.id) })} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                                           </div>
                                        </div>
                                     </div>
                                  )}
                               </div>
                             );
                           })}
                        </div>
                      )}
                   </div>
                 ))}
                 {activeTrip.wishlist.length === 0 && <p className="text-center italic opacity-30 py-6 text-[9px]">Wishlist empty.</p>}
               </div>
            </div>
          )}

          {/* CHECKLIST */}
          {activeTab === 'Checklist' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h3 className="text-sm font-black flex justify-between items-center text-slate-800 uppercase tracking-tight">
                        <div className="flex items-center gap-2"><Briefcase size={14} className="text-slate-800" /> Master To-Do</div>
                        <button onClick={() => {
                          const n: MasterTodoItem = { id: generateId(), task: '', done: false, isEditing: true };
                          updateActiveTrip({ masterTodo: [...activeTrip.masterTodo, n] });
                        }} className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors">
                          + New To-Do
                        </button>
                    </h3>
                    <div className="space-y-3">
                       {activeTrip.masterTodo.map((todo, idx) => (
                         <div key={todo.id} className="relative group/todo">
                           {todo.isEditing ? (
                              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-top-1">
                                 <div className="flex gap-2">
                                    <input placeholder="Milestone task..." className="flex-1 bg-slate-50 p-2.5 rounded-xl font-black text-[11px] border-none" value={todo.task} onChange={e => {
                                       const n = [...activeTrip.masterTodo]; n[idx].task = e.target.value; updateActiveTrip({ masterTodo: n });
                                    }} />
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col"><label className="text-[8px] font-black text-slate-400 uppercase mb-1">Due Date (Opt)</label><input type="date" className="bg-slate-50 p-2 rounded-xl text-[10px] font-bold border-none" value={todo.date || ''} onChange={e => {
                                       const n = [...activeTrip.masterTodo]; n[idx].date = e.target.value; updateActiveTrip({ masterTodo: n });
                                    }} /></div>
                                    <div className="flex flex-col"><label className="text-[8px] font-black text-slate-400 uppercase mb-1">Action Owner (Opt)</label>
                                      <select className="bg-slate-50 p-2 rounded-xl text-[10px] font-bold border-none" value={todo.actionBy || ''} onChange={e => {
                                         const n = [...activeTrip.masterTodo]; n[idx].actionBy = e.target.value; updateActiveTrip({ masterTodo: n });
                                      }}>
                                         <option value="">Choose owner...</option>
                                         {activeTrip.members.map(m => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                    </div>
                                 </div>
                                 <div className="flex flex-col"><label className="text-[8px] font-black text-slate-400 uppercase mb-1">Remark (Opt)</label><textarea placeholder="Details, links, etc..." className="bg-slate-50 p-2 rounded-xl text-[10px] font-bold border-none resize-none" rows={2} value={todo.remark || ''} onChange={e => { const n = [...activeTrip.masterTodo]; n[idx].remark = e.target.value; updateActiveTrip({ masterTodo: n }); }} /></div>
                                 <button onClick={() => { const n = [...activeTrip.masterTodo]; n[idx].isEditing = false; updateActiveTrip({ masterTodo: n }); }} className="w-full bg-slate-900 text-white rounded-xl py-2 font-black uppercase text-[10px]">Record Task</button>
                              </div>
                           ) : (
                              <div className={`p-4 bg-white border rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group/it ${todo.done ? 'bg-slate-50 border-transparent opacity-60' : 'border-slate-100'}`}>
                                 <input type="checkbox" checked={todo.done} className="w-4 h-4 rounded text-teal-600 border-slate-200 shrink-0" onChange={e => {
                                    const n = [...activeTrip.masterTodo]; n[idx].done = e.target.checked; updateActiveTrip({ masterTodo: n });
                                 }} />
                                 <div className="flex-1">
                                    <p className={`text-[11px] font-black leading-tight ${todo.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{todo.task || 'Milestone Task'}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[8px] font-black uppercase tracking-widest">
                                       {todo.date && <span className="flex items-center gap-1 text-blue-500"><Calendar size={10}/> {formatDate(todo.date)}</span>}
                                       {todo.actionBy && <span className="flex items-center gap-1 text-teal-600"><User size={10}/> {todo.actionBy}</span>}
                                       {todo.remark && <span className="flex items-center gap-1 text-slate-400"><StickyNote size={10}/> {todo.remark}</span>}
                                    </div>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover/it:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => { const n = [...activeTrip.masterTodo]; n[idx].isEditing = true; updateActiveTrip({ masterTodo: n }); }} className="p-1.5 text-slate-300 hover:text-teal-600 transition-colors"><Edit2 size={12}/></button>
                                    <button onClick={() => updateActiveTrip({ masterTodo: activeTrip.masterTodo.filter(t => t.id !== todo.id) })} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                                 </div>
                              </div>
                           )}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-sm font-black flex justify-between items-center text-slate-800 uppercase tracking-tight">
                      Packing list 
                      <button onClick={() => setPackingModal({ open: true, name: '', category: 'Travel Essentials' })} className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors">
                        + New Item
                      </button>
                    </h3>
                    <div className="space-y-4">
                       {Array.from(new Set(activeTrip.packing.map(p=>p.category))).map(cat => (
                          <div key={cat} className="space-y-2">
                             <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest pl-1 border-b border-slate-50 pb-1">{cat}</div>
                             <div className="space-y-1 pl-4 border-l-2 border-slate-100">
                                {activeTrip.packing.filter(p=>p.category === cat).map((p) => {
                                   const actualIdx = activeTrip.packing.findIndex(x=>x.id===p.id);
                                   return (
                                      <div key={p.id} className="flex items-center gap-2 p-2 bg-white border border-slate-50 rounded-xl group animate-in slide-in-from-left-1 transition-all">
                                         <input type="checkbox" checked={p.done} className="w-3.5 h-3.5 rounded text-teal-600 border-slate-200" onChange={e=>{const n=[...activeTrip.packing]; n[actualIdx].done=e.target.checked; updateActiveTrip({packing:n});}} />
                                         <input placeholder="Asset..." className={`flex-1 bg-transparent border-none text-[10px] font-bold ${p.done?'line-through opacity-30':'text-slate-700'}`} value={p.item} onChange={e=>{const n=[...activeTrip.packing]; n[actualIdx].item=e.target.value; updateActiveTrip({packing:n});}} />
                                         <button onClick={() => updateActiveTrip({ packing: activeTrip.packing.filter(x => x.id !== p.id) })} className="text-slate-100 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                      </div>
                                   );
                                })}
                             </div>
                          </div>
                       ))}
                       {activeTrip.packing.length === 0 && <p className="text-center italic opacity-30 py-6 text-[9px]">Inventory empty.</p>}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Modals */}
          {packingModal.open && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Briefcase size={18} className="text-teal-500"/> Add Packing Item</h2>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Item Name</label>
                    <input 
                      autoFocus
                      className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" 
                      placeholder="e.g. Swimming Suit" 
                      value={packingModal.name} 
                      onChange={e => setPackingModal({...packingModal, name: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Category</label>
                    <select 
                      className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" 
                      value={packingModal.category} 
                      onChange={e => setPackingModal({...packingModal, category: e.target.value})}
                    >
                      {PACKING_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setPackingModal({ ...packingModal, open: false })} className="flex-1 py-3 font-bold text-slate-400 bg-slate-50 rounded-xl text-[10px]">Cancel</button>
                  <button 
                    onClick={() => {
                      if (!packingModal.name) return;
                      const newItem = { id: generateId(), category: packingModal.category || PACKING_CATS[0], item: packingModal.name, done: false };
                      updateActiveTrip({ packing: [...activeTrip.packing, newItem] });
                      setPackingModal({ open: false, name: '', category: PACKING_CATS[0] });
                    }} 
                    className="flex-1 py-3 font-bold text-white trip-gradient rounded-xl text-[10px]"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {wishlistModal.open && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><ShoppingBag size={18} className="text-teal-500"/> Add Wishlist Item</h2>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Item Name</label>
                    <input 
                      autoFocus
                      className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" 
                      placeholder="e.g. Matcha Powder" 
                      value={wishlistModal.name} 
                      onChange={e => setWishlistModal({...wishlistModal, name: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Category</label>
                    <select 
                      className="w-full bg-slate-50 rounded-xl p-3 text-[11px] font-bold border-none" 
                      value={wishlistModal.category} 
                      onChange={e => setWishlistModal({...wishlistModal, category: e.target.value})}
                    >
                      {WISHLIST_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setWishlistModal({ ...wishlistModal, open: false })} className="flex-1 py-3 font-bold text-slate-400 bg-slate-50 rounded-xl text-[10px]">Cancel</button>
                  <button 
                    onClick={() => {
                      if (!wishlistModal.name) return;
                      const newItem: WishlistItem = { 
                        id: generateId(), 
                        category: wishlistModal.category || WISHLIST_CATS[0], 
                        name: wishlistModal.name, 
                        price: 0, 
                        currency: activeTrip.baseCurrency, 
                        requestedBy: 'Self', 
                        remarks: '', 
                        bought: false, 
                        isEditing: true 
                      };
                      updateActiveTrip({ wishlist: [...activeTrip.wishlist, newItem] });
                      setWishlistModal({ open: false, name: '', category: WISHLIST_CATS[0] });
                    }} 
                    className="flex-1 py-3 font-bold text-white trip-gradient rounded-xl text-[10px]"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Flight Choice Modal */}
          {showFlightChoiceModal && (
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95">
                <h2 className="text-xl font-black mb-4">Journey Type</h2>
                <div className="space-y-3">
                  <button onClick={() => handleAddFlightWithChoice(false)} className="w-full py-4 px-4 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-2xl font-black text-xs transition-all flex items-center gap-3 border border-transparent hover:border-blue-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center"><ArrowRight size={16}/></div>
                    One-Way Trip
                  </button>
                  <button onClick={() => handleAddFlightWithChoice(true)} className="w-full py-4 px-4 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-600 rounded-2xl font-black text-xs transition-all flex items-center gap-3 border border-transparent hover:border-teal-100">
                    <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center"><ArrowLeftRight size={16}/></div>
                    Round Trip
                  </button>
                </div>
                <button onClick={() => setShowFlightChoiceModal(false)} className="w-full mt-4 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
