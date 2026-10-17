import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, 
  UserRole, 
  ProfileUpdate,
  LanguageCode, 
  ProcurementBooking, 
  ProcurementCentre, 
  MarketplaceListing, 
  MarketplaceOrder, 
  OrderTransactionDetails,
  ComplaintTicket, 
  NotificationItem, 
  AuditLogEntry, 
  DrawerDetailState,
  PrintDocumentState,
  ProcurementStage
} from '../types';
import { 
  DEMO_USERS, 
  PROCUREMENT_CENTRES, 
  INITIAL_BOOKINGS, 
  MARKETPLACE_LISTINGS, 
  INITIAL_ORDERS, 
  INITIAL_COMPLAINTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_TRAIL 
} from '../data/mockData';
import { TRANSLATIONS, TranslationStrings } from '../i18n/translations';
import { tFull, localizeCrop as localizeCropUtil, localizeMandi as localizeMandiUtil } from '../i18n/dashboardTranslations';
import {
  advanceQueue as apiAdvanceQueue,
  approveBooking as apiApproveBooking,
  createBooking as createApiBooking,
  hasApiSession,
  listBookings,
  listCentres,
  login as apiLogin,
  logout as apiLogout,
  processPayment as apiProcessPayment,
  recordQuality as apiRecordQuality,
  recordWeighSlip as apiRecordWeighSlip,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  updateBookingStatus as apiUpdateBookingStatus,
} from '../lib/api';

interface AppContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  currentRole: UserRole;
  language: LanguageCode;
  t: TranslationStrings;
  tD: (key: string, fallback?: string) => string;
  localizeCrop: (cropName: string) => string;
  localizeMandi: (centreName: string) => string;
  theme: 'light' | 'dark';
  isOffline: boolean;
  backendError: string | null;
  isBackendLoading: boolean;
  clearBackendError: () => void;
  offlineSyncPending: number;
  bookings: ProcurementBooking[];
  centres: ProcurementCentre[];
  marketplaceListings: MarketplaceListing[];
  marketplaceOrders: MarketplaceOrder[];
  buyerOrders: MarketplaceOrder[];
  complaints: ComplaintTicket[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  drawerState: DrawerDetailState;
  printDocState: PrintDocumentState | null;
  isVoiceModalOpen: boolean;
  isLogoutDialogOpen: boolean;
  isAiAssistantOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookSlotAtCentre: (centreId: string) => void;
  bookingCentreId: string | null;
  setBookingCentreId: (centreId: string | null) => void;
  
  // Actions
  loginAsRole: (role: UserRole) => void;
  loginWithCredentials: (identifier: string, secret: string) => Promise<boolean>;
  updateUserProfile: (profile: ProfileUpdate) => Promise<UserProfile>;
  registerUser: (user: UserProfile, password?: string) => Promise<void>;
  logout: () => void;
  setLanguage: (lang: LanguageCode) => void;
  toggleTheme: () => void;
  toggleOfflineMode: () => void;
  openDetailDrawer: (type: DrawerDetailState['type'], data: any) => void;
  closeDetailDrawer: () => void;
  openPrintModal: (docType: 'token' | 'weigh-slip', data: any, autoTriggerPrint?: boolean) => void;
  closePrintModal: () => void;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  openAiAssistant: () => void;
  closeAiAssistant: () => void;
  toggleAiAssistant: () => void;
  setIsLogoutDialogOpen: (open: boolean) => void;
  speakText: (text: string, langCode?: LanguageCode) => void;
  
  // Procurement & Operations
  createBooking: (newBooking: Partial<ProcurementBooking>) => Promise<ProcurementBooking>;
  updateBookingStatus: (bookingId: string, status: ProcurementStage, updates?: Partial<ProcurementBooking>) => Promise<void>;
  advanceQueueForCentre: (centreId: string) => void;
  recordWeighment: (bookingId: string, grossKgOrSlip: any, tareKg?: number, deductionPct?: number, vehicleNo?: string) => Promise<void>;
  recordQualityTest: (bookingId: string, moisturePct: number, foreignMatterPct: number, grade: 'FAQ (Fair Average Quality)' | 'Grade A' | 'Sub-Standard', remarks?: string) => Promise<void>;
  approveProcurement: (bookingId: string) => Promise<void>;
  rejectProcurement: (bookingId: string, reason?: string) => Promise<void>;
  processPaymentForBooking: (bookingId: string) => Promise<void>;
  
  // Marketplace
  addMarketplaceListing: (listing: Omit<MarketplaceListing, 'id' | 'listingDate'> | any) => void;
  createMarketplaceListing: (listing: any) => void;
  createMarketplaceOrder: (
    listingId: string, 
    quantity: number, 
    agreedPrice: number, 
    pickupDate: string,
    paymentMethod?: string,
    transactionDetails?: Partial<OrderTransactionDetails>
  ) => MarketplaceOrder;
  updateOrderStatus: (orderId: string, status: MarketplaceOrder['transportStatus']) => void;
  
  // Grievance
  submitComplaint: (categoryOrObj: any, description?: string, relatedBookingId?: string) => void;
  resolveComplaint: (ticketId: string, note: string) => void;
  
  // Alert
  sendCentreDelayAlert: (centreId: string, delayMins: number, reason: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & State - Default to null so the first page is the Login Portal
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return null;
  });

  const [language, setLangState] = useState<LanguageCode>(() => {
    return (localStorage.getItem('agribridge_language') as LanguageCode) || 'en';
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('agribridge_theme');
      if (saved === 'dark' || saved === 'light') {
        if (saved === 'dark' && typeof document !== 'undefined') {
          document.documentElement.classList.add('dark');
        }
        return saved;
      }
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('dark');
        }
        return 'dark';
      }
    } catch (e) { /* ignore */ }
    return 'light';
  });

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [offlineSyncPending, setOfflineSyncPending] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [bookingCentreId, setBookingCentreId] = useState<string | null>(null);

  // Business Data State
  const [bookings, setBookings] = useState<ProcurementBooking[]>(INITIAL_BOOKINGS);
  const [centres, setCentres] = useState<ProcurementCentre[]>(PROCUREMENT_CENTRES);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>(MARKETPLACE_LISTINGS);
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>(INITIAL_ORDERS);
  const [complaints, setComplaints] = useState<ComplaintTicket[]>(INITIAL_COMPLAINTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_TRAIL);

  // Modal / Drawer states
  const [drawerState, setDrawerState] = useState<DrawerDetailState>({
    isOpen: false,
    type: null,
    data: null,
  });

  const [printDocState, setPrintDocState] = useState<PrintDocumentState | null>(null);

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState<boolean>(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);

  const refreshBackendData = async () => {
    const bookingsPromise = currentUser?.role === 'buyer' ? Promise.resolve([] as ProcurementBooking[]) : listBookings();
    const [remoteCentres, remoteBookings] = await Promise.all([listCentres(), bookingsPromise]);
    setCentres(remoteCentres);
    setBookings(remoteBookings);
  };

  useEffect(() => {
    if (!currentUser || !hasApiSession()) return;
    let active = true;
    const refresh = () => {
      const bookingsPromise = currentUser.role === 'buyer' ? Promise.resolve([] as ProcurementBooking[]) : listBookings();
      return Promise.all([listCentres(), bookingsPromise])
        .then(([remoteCentres, remoteBookings]) => {
          if (!active) return;
          setCentres(remoteCentres);
          setBookings(remoteBookings);
        })
        .catch(error => {
          if (active) setBackendError(error instanceof Error ? error.message : 'Could not load procurement data.');
        });
    };
    setIsBackendLoading(true);
    setBackendError(null);
    void refresh().finally(() => {
      if (active) setIsBackendLoading(false);
    });
    const intervalId = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [currentUser]);

  // Apply dark class to document body
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('agribridge_theme', theme);
  }, [theme]);

  const setLanguage = (lang: LanguageCode) => {
    setLangState(lang);
    localStorage.setItem('agribridge_language', lang);
    const announceMsg = TRANSLATIONS[lang]?.langSwitchAnnounce || `Language switched to ${lang}`;
    setTimeout(() => {
      speakText(announceMsg, lang);
    }, 150);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleOfflineMode = () => {
    setIsOffline(prev => {
      const next = !prev;
      if (!next && offlineSyncPending > 0) {
        // Sync completed
        setOfflineSyncPending(0);
        addAuditLog('SYSTEM_RECONNECTED_SYNC', 'System', 'All cached queues and passes synced to state hub');
      }
      return next;
    });
  };

  const loginAsRole = (role: UserRole) => {
    apiLogout();
    const targetUser = DEMO_USERS[role];
    if (targetUser) {
      setBookings(INITIAL_BOOKINGS);
      setCentres(PROCUREMENT_CENTRES);
      setCurrentUser(targetUser);
      setActiveTab('dashboard');
      addAuditLog('USER_AUTHENTICATION_SUCCESS', 'User', `Logged in as ${targetUser.name} (${targetUser.role.toUpperCase()})`);
    }
  };

  const registerUser = async (user: UserProfile, password = '') => {
    if (user.role !== 'farmer') {
      throw new Error('Only farmer self-registration is enabled. Ask an administrator to provision staff, buyer, or officer access.');
    }
    if (!password) throw new Error('Please set a password of at least 8 characters.');
    setBackendError(null);
    const registeredUser = await apiRegister(user, password);
    setCurrentUser(registeredUser);
    setActiveTab('dashboard');
    addAuditLog('USER_REGISTERED_SUCCESS', 'User', `Registered new FARMER account: ${registeredUser.name} (${registeredUser.identifier})`);
  };

  const loginWithCredentials = async (identifier: string, secret: string): Promise<boolean> => {
    setBackendError(null);
    try {
      const user = await apiLogin(identifier, secret);
      setCurrentUser(user);
      setActiveTab('dashboard');
      addAuditLog('USER_CREDENTIALS_AUTH', 'User', `Authenticated registered user: ${user.name} -> Role: ${user.role}`);
      return true;
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 401) return false;
      throw error;
    }
  };

  const updateUserProfile = async (profile: ProfileUpdate): Promise<UserProfile> => {
    if (!currentUser) throw new Error('Sign in before updating your profile.');
    if (hasApiSession()) {
      const updatedUser = await apiUpdateProfile(profile);
      setCurrentUser(updatedUser);
      return updatedUser;
    }
    const updatedUser = { ...currentUser, ...profile };
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    apiLogout();
    if (currentUser) {
      addAuditLog('USER_LOGOUT', 'User', `${currentUser.name} signed out`);
    }
    setCurrentUser(null);
    setBackendError(null);
    setIsLogoutDialogOpen(false);
    setDrawerState({ isOpen: false, type: null, data: null });
  };

  const openDetailDrawer = (type: DrawerDetailState['type'], data: any) => {
    setDrawerState({
      isOpen: true,
      type,
      data,
    });
  };

  const closeDetailDrawer = () => {
    setDrawerState({
      isOpen: false,
      type: null,
      data: null,
    });
  };

  const openPrintModal = (docType: 'token' | 'weigh-slip', data: any, autoTriggerPrint = true) => {
    setPrintDocState({
      isOpen: true,
      docType,
      data,
      autoTriggerPrint,
    });
  };

  const closePrintModal = () => {
    setPrintDocState(null);
  };

  const openVoiceModal = () => setIsVoiceModalOpen(true);
  const closeVoiceModal = () => setIsVoiceModalOpen(false);

  const openAiAssistant = () => setIsAiAssistantOpen(true);
  const closeAiAssistant = () => setIsAiAssistantOpen(false);
  const toggleAiAssistant = () => setIsAiAssistantOpen(prev => !prev);
  const bookSlotAtCentre = (centreId: string) => {
    setBookingCentreId(centreId);
    setActiveTab('book-slot');
  };

  // Web Speech API integration
  const speakText = (text: string, langCode?: LanguageCode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const targetLang = langCode || language;
    const voiceLangMap: Record<LanguageCode, string> = {
      en: 'en-IN',
      ta: 'ta-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      mr: 'mr-IN',
    };

    utterance.lang = voiceLangMap[targetLang] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Match available voice for the target language (e.g. Tamil, Hindi, etc.)
    const voices = window.speechSynthesis.getVoices();
    const langKeywordsMap: Record<LanguageCode, string[]> = {
      ta: ['ta-in', 'ta_in', 'ta', 'tamil', 'valluvar', 'latha'],
      hi: ['hi-in', 'hi_in', 'hi', 'hindi', 'lekha', 'kalpana', 'neerja'],
      te: ['te-in', 'te_in', 'te', 'telugu', 'chitra', 'mohan'],
      kn: ['kn-in', 'kn_in', 'kn', 'kannada'],
      ml: ['ml-in', 'ml_in', 'ml', 'malayalam'],
      mr: ['mr-in', 'mr_in', 'mr', 'marathi', 'aarohi'],
      en: ['en-in', 'en_in', 'india', 'rishi', 'veena', 'heera', 'en-gb', 'en-us']
    };

    const keywords = langKeywordsMap[targetLang] || ['en'];
    const matchedVoice = voices.find(v => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      const vName = (v.name || '').toLowerCase();
      return keywords.some(kw => vLang.startsWith(kw) || vName.includes(kw));
    });

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const addAuditLog = (action: string, recordType: AuditLogEntry['relatedRecordType'], notes: string, prev?: string, next?: string) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser?.id || 'sys-anon',
      userName: currentUser?.name || 'System Operator',
      userRole: currentUser?.role || 'admin',
      action,
      relatedRecordType: recordType,
      relatedRecordId: notes.substring(0, 30),
      previousValue: prev,
      newValue: next || notes,
      ipAddress: '10.24.88.19 (Gov Secure SSL Ingress)',
    };
    setAuditLogs(prevLogs => [newEntry, ...prevLogs]);
  };

  // Procurement booking creation
  const createBooking = async (newBookingData: Partial<ProcurementBooking>): Promise<ProcurementBooking> => {
    if (hasApiSession()) {
      setBackendError(null);
      try {
        const booking = await createApiBooking(newBookingData);
        setBookings(prev => [booking, ...prev.filter(existing => existing.id !== booking.id)]);
        void listCentres().then(setCentres).catch(error => {
          setBackendError(error instanceof Error ? error.message : 'Could not refresh procurement centres.');
        });
        addAuditLog('PROCUREMENT_BOOKING_CREATED', 'Booking', `Created booking ${booking.tokenNumber} for ${booking.farmerName}`, undefined, `${booking.crop} (${booking.quantityQuintals} Qtl)`);
        return booking;
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : 'Could not create procurement booking.');
        throw error;
      }
    }

    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const tokenNumber = `#AG24${randomSeq}`;
    const centre = centres.find(c => c.id === newBookingData.centreId) || centres[0];

    const booking: ProcurementBooking = {
      id: `bk-${Date.now()}`,
      tokenNumber,
      farmerId: newBookingData.farmerId || currentUser?.id || 'usr-farmer-01',
      farmerName: newBookingData.farmerName || currentUser?.name || 'Sardar Ramesh Kumar',
      farmerMobile: newBookingData.farmerMobile || currentUser?.mobile || '9876543210',
      crop: newBookingData.crop || 'Paddy (Dhan)',
      quantityQuintals: newBookingData.quantityQuintals || 50,
      centreId: centre.id,
      centreName: centre.name,
      bookingDate: newBookingData.bookingDate || 'Today, 16 Sep 2026',
      slotTime: newBookingData.slotTime || '11:00 AM - 12:30 PM',
      status: 'booking_confirmed',
      queuePosition: centre.currentQueueCount + 1,
      estimatedWaitMinutes: (centre.currentQueueCount + 1) * 4,
      createdAt: new Date().toISOString(),
      qrPayload: `AGRIBRIDGE://PROCURE/TOKEN/${tokenNumber}/FARMER/${currentUser?.identifier || 'PB-FARM'}/QTY/${newBookingData.quantityQuintals}/CENTRE/${centre.code}`,
      notes: newBookingData.notes || 'Automated smart queue scheduling.'
    };

    setBookings(prev => [booking, ...prev]);

    // Update centre queue count
    setCentres(prevCentres => prevCentres.map(c => {
      if (c.id === centre.id) {
        return {
          ...c,
          currentQueueCount: c.currentQueueCount + 1,
          currentBookedQuintals: c.currentBookedQuintals + (newBookingData.quantityQuintals || 50),
          availableSlotsToday: Math.max(0, c.availableSlotsToday - 1),
        };
      }
      return c;
    }));

    // Add notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: booking.farmerId,
      title: `Booking Confirmed: Token ${tokenNumber}`,
      message: `Your booking for ${booking.quantityQuintals} Quintals of ${booking.crop} at ${centre.name} is confirmed. Queue position: ${booking.queuePosition}.`,
      category: 'token',
      timestamp: 'Just now',
      read: false,
      deliveryChannels: { sms: true, whatsapp: true, voice: true }
    };
    setNotifications(prev => [notif, ...prev]);

    addAuditLog('PROCUREMENT_BOOKING_CREATED', 'Booking', `Created booking ${tokenNumber} for ${booking.farmerName}`, undefined, `${booking.crop} (${booking.quantityQuintals} Qtl)`);

    return booking;
  };

  const updateBookingStatus = async (bookingId: string, status: ProcurementStage, updates?: Partial<ProcurementBooking>) => {
    if (hasApiSession()) {
      setBackendError(null);
      try {
        await apiUpdateBookingStatus(bookingId, status, updates?.rejectionReason);
        await refreshBackendData();
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : 'Could not update booking status.');
      }
      return;
    }

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        const updated = { ...b, status, ...updates };
        return updated;
      }
      return b;
    }));

    addAuditLog('BOOKING_STATUS_UPDATE', 'Booking', `Booking ${bookingId} transitioned to ${status}`);
  };

  const advanceQueueForCentre = (centreId: string) => {
    if (hasApiSession()) {
      setBackendError(null);
      void apiAdvanceQueue(centreId)
        .then(refreshBackendData)
        .catch(error => setBackendError(error instanceof Error ? error.message : 'Could not advance the queue.'));
      return;
    }

    setCentres(prev => prev.map(c => {
      if (c.id === centreId) {
        const nextQueue = Math.max(0, c.currentQueueCount - 1);
        return {
          ...c,
          currentQueueCount: nextQueue,
          averageWaitTimeMinutes: Math.max(5, nextQueue * 4),
        };
      }
      return c;
    }));

    // Decrement queue position for all waiting bookings at this centre
    setBookings(prev => prev.map(b => {
      if (b.centreId === centreId && b.status === 'waiting' && b.queuePosition) {
        const newPos = Math.max(1, b.queuePosition - 1);
        return {
          ...b,
          queuePosition: newPos,
          estimatedWaitMinutes: newPos * 4,
          status: newPos === 1 ? 'called' : 'waiting',
        };
      }
      return b;
    }));

    addAuditLog('QUEUE_ADVANCED', 'Booking', `Centre ${centreId} called next token in line`);
  };

  const recordWeighment = async (bookingId: string, grossKgOrSlip: any, tareKg?: number, deductionPct?: number, vehicleNo?: string) => {
    if (hasApiSession()) {
      const grossWeightKg = Number(typeof grossKgOrSlip === 'object' ? grossKgOrSlip.grossWeightKg : grossKgOrSlip);
      const tareWeightKg = Number(typeof grossKgOrSlip === 'object' ? grossKgOrSlip.tareWeightKg : tareKg || 0);
      const deductionPercentage = Number(typeof grossKgOrSlip === 'object' ? grossKgOrSlip.deductionPercentage || 0 : deductionPct || 0);
      const vehicleNumber = typeof grossKgOrSlip === 'object' ? grossKgOrSlip.vehicleNumber : vehicleNo;
      setBackendError(null);
      try {
        await apiRecordWeighSlip(bookingId, { grossWeightKg, tareWeightKg, deductionPercentage, vehicleNumber });
        await refreshBackendData();
        addAuditLog('WEIGHBRIDGE_RECORDED', 'Weighment', `Recorded weigh slip for booking ${bookingId}`);
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : 'Could not record weigh slip.');
        throw error;
      }
      return;
    }

    let weighSlip: any;
    let finalProcuredQuintals = 0;

    if (typeof grossKgOrSlip === 'object' && grossKgOrSlip !== null) {
      weighSlip = {
        slipNumber: grossKgOrSlip.slipNumber || `WB-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        grossWeightKg: grossKgOrSlip.grossWeightKg,
        tareWeightKg: grossKgOrSlip.tareWeightKg,
        netWeightKg: grossKgOrSlip.netWeightKg,
        netWeightQuintals: grossKgOrSlip.netWeightQuintals,
        deductionPercentage: grossKgOrSlip.deductionPercentage || 0,
        finalProcuredQuintals: grossKgOrSlip.netWeightQuintals,
        weighbridgeOperator: grossKgOrSlip.weighmanName || currentUser?.name || 'Manoj Kumar (Certified Weighman)',
        weighedAt: grossKgOrSlip.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        vehicleNumber: grossKgOrSlip.vehicleNumber || 'PB-08-AG-4921',
      };
      finalProcuredQuintals = weighSlip.finalProcuredQuintals;
    } else {
      const grossKg = Number(grossKgOrSlip);
      const tare = tareKg || 0;
      const netKg = grossKg - tare;
      const netQuintals = Number((netKg / 100).toFixed(2));
      const ded = deductionPct || 0;
      finalProcuredQuintals = Number((netQuintals * (1 - ded / 100)).toFixed(2));

      weighSlip = {
        slipNumber: `WB-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        grossWeightKg: grossKg,
        tareWeightKg: tare,
        netWeightKg: netKg,
        netWeightQuintals: netQuintals,
        deductionPercentage: ded,
        finalProcuredQuintals,
        weighbridgeOperator: currentUser?.name || 'Manoj Kumar (Certified Weighman)',
        weighedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        vehicleNumber: vehicleNo || 'PB-08-AG-4921'
      };
    }

    await updateBookingStatus(bookingId, 'quality_check', {
      weighingSlip: weighSlip,
      quantityQuintals: finalProcuredQuintals
    });

    addAuditLog('WEIGHBRIDGE_RECORDED', 'Weighment', `Slip ${weighSlip.slipNumber} Net: ${weighSlip.netWeightQuintals} Qtl`);
  };

  const recordQualityTest = async (bookingId: string, moisturePct: number, foreignMatterPct: number, grade: 'FAQ (Fair Average Quality)' | 'Grade A' | 'Sub-Standard', remarks?: string) => {
    if (hasApiSession()) {
      setBackendError(null);
      try {
        await apiRecordQuality(bookingId, {
          moisturePercentage: moisturePct,
          foreignMatterPercentage: foreignMatterPct,
          grade,
          remarks,
        });
        await refreshBackendData();
        addAuditLog('QUALITY_ANALYSIS_LOGGED', 'QualityCheck', `Grade: ${grade}, Moisture: ${moisturePct}%`);
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : 'Could not save the quality assessment.');
        throw error;
      }
      return;
    }

    const qualityMetrics = {
      moisturePercentage: moisturePct,
      foreignMatterPercentage: foreignMatterPct,
      damagedGrainsPercentage: 0.6,
      grade,
      testedByOfficerId: currentUser?.identifier || 'PO-CENTRE-04',
      testedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      remarks: remarks || 'Sample conforms to Bureau of Indian Standards (BIS) specifications.'
    };

    const nextStatus: ProcurementStage = grade === 'Sub-Standard' ? 'rejected' : 'approved';

    updateBookingStatus(bookingId, nextStatus, { qualityMetrics });
    addAuditLog('QUALITY_ANALYSIS_LOGGED', 'QualityCheck', `Grade: ${grade}, Moisture: ${moisturePct}%`);
  };

  const approveProcurement = async (bookingId: string) => {
    if (hasApiSession()) {
      try {
        await apiApproveBooking(bookingId);
        await refreshBackendData();
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : 'Could not approve procurement.');
      }
      return;
    }
    await updateBookingStatus(bookingId, 'approved');
  };

  const rejectProcurement = async (bookingId: string, reason: string) => {
    await updateBookingStatus(bookingId, 'rejected', { rejectionReason: reason });
  };

  const processPaymentForBooking = async (bookingId: string) => {
    if (hasApiSession()) {
      setBackendError(null);
      try {
        await apiProcessPayment(bookingId);
        await refreshBackendData();
        addAuditLog('PAYMENT_PROCESSING_STARTED', 'Payment', `Payment processing started for booking ${bookingId}`);
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : 'Could not start payment processing.');
      }
      return;
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const rate = 2320; // Grade A Paddy MSP default
    const amount = Number(((booking.quantityQuintals || 50) * rate).toFixed(2));
    const txId = `DBT-GOV-${Date.now().toString().slice(-8)}`;

    const payment = {
      transactionId: txId,
      amount,
      mspRatePerQuintal: rate,
      paymentDate: new Date().toLocaleDateString('en-GB'),
      method: 'PFMS / DBT direct bank transfer' as const,
      bankName: 'State Bank of India (Direct Farmer Credit)',
      accountEnding: '••• 4019',
      status: 'Credited to Farmer' as const,
      referenceNo: `RBI-PFMS-${Math.floor(1000000 + Math.random() * 9000000)}`
    };

    updateBookingStatus(bookingId, 'paid', { paymentDetails: payment });
    addAuditLog('DBT_PAYMENT_DISBURSED', 'Payment', `Disbursed ₹${amount.toLocaleString()} for ${booking.tokenNumber}`);
  };

  const addMarketplaceListing = (listingData: Omit<MarketplaceListing, 'id' | 'listingDate'>) => {
    const newListing: MarketplaceListing = {
      ...listingData,
      id: `mkt-${Date.now()}`,
      listingDate: 'Today',
    };
    setMarketplaceListings(prev => [newListing, ...prev]);
    addAuditLog('MARKETPLACE_LISTING_CREATED', 'Listing', `Surplus lot ${newListing.crop} (${newListing.quantityQuintals} Qtl) by ${newListing.farmerName}`);
  };

  const createMarketplaceOrder = (
    listingId: string, 
    quantity: number, 
    agreedPrice: number, 
    pickupDate: string,
    paymentMethod: string = 'UPI / Dynamic QR Code (Google Pay)',
    customTxn?: Partial<OrderTransactionDetails>
  ): MarketplaceOrder => {
    const listing = marketplaceListings.find(l => l.id === listingId);
    const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
    const baseAmount = quantity * agreedPrice;
    const mandiCess = Number((baseAmount * 0.015).toFixed(2));
    const escrowFee = 250;
    const transportCost = 3500;
    const totalTransacted = baseAmount + mandiCess + escrowFee + transportCost;
    const txId = `TXN-AGRI-${Math.floor(100000 + Math.random() * 900000)}`;
    const utrNo = `UTR-SBIN-2026-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const transactionDetails: OrderTransactionDetails = {
      transactionId: customTxn?.transactionId || txId,
      utrNumber: customTxn?.utrNumber || utrNo,
      paymentMethod: paymentMethod,
      paymentGateway: customTxn?.paymentGateway || 'NPCI Bharat e-Market Escrow (SBI Nodal Account)',
      paidAt: customTxn?.paidAt || new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      baseAmount,
      mandiCess,
      escrowFee,
      transportCost,
      totalTransacted,
      escrowStatus: 'Escrow Secured',
      farmerBeneficiary: customTxn?.farmerBeneficiary || {
        name: listing?.farmerName || 'Sardar Ramesh Kumar',
        bankName: 'Punjab National Bank, Agri Special Branch',
        accountMasked: '•••• •••• •••• 4019',
        ifsc: 'PUNB0024900'
      }
    };

    const order: MarketplaceOrder = {
      id: orderId,
      listingId,
      crop: listing?.crop || 'Tomato',
      buyerId: currentUser?.id || 'usr-buyer-01',
      buyerName: currentUser?.name || 'Priya Sharma (Ananya Agro Traders)',
      buyerPhone: currentUser?.mobile || '+91 97112 23344',
      farmerId: listing?.farmerId || 'usr-farmer-01',
      farmerName: listing?.farmerName || 'Sardar Ramesh Kumar',
      quantityQuintals: quantity,
      agreedPricePerQuintal: agreedPrice,
      totalAmount: baseAmount,
      orderDate: new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pickupLocation: listing?.location || 'Taraori Village Gate #2, Karnal, HR',
      deliveryLocation: 'Shed 14, Azadpur Wholesale Mandi, Delhi',
      transportStatus: 'Order Confirmed',
      estimatedTransportCost: transportCost,
      pickupDate: pickupDate || 'Tomorrow, 10:00 AM',
      paymentStatus: 'Escrow Held',
      paymentMethod,
      transactionDetails
    };

    setMarketplaceOrders(prev => [order, ...prev]);

    // Update listing status if fully sold
    setMarketplaceListings(prev => prev.map(l => {
      if (l.id === listingId) {
        return {
          ...l,
          quantityQuintals: Math.max(0, l.quantityQuintals - quantity),
          status: l.quantityQuintals - quantity <= 0 ? 'Sold' : 'Available',
        };
      }
      return l;
    }));

    addAuditLog('MARKETPLACE_ORDER_PLACED', 'Listing', `Order ${orderId} placed via ${paymentMethod}. Escrow total: ₹${totalTransacted.toLocaleString()}`);
    return order;
  };

  const updateOrderStatus = (orderId: string, status: MarketplaceOrder['transportStatus']) => {
    setMarketplaceOrders(prev => prev.map(o => o.id === orderId ? { ...o, transportStatus: status } : o));
    addAuditLog('ORDER_LOGISTICS_UPDATE', 'Listing', `Order ${orderId} transport status: ${status}`);
  };

  const submitComplaint = (categoryOrObj: any, description?: string, relatedBookingId?: string) => {
    const ticketNo = `AG-GRV-2026-${Math.floor(100 + Math.random() * 900)}`;
    let category: any = 'Weighment Dispute';
    let desc = '';
    let fId = currentUser?.id || 'usr-farmer-01';
    let fName = currentUser?.name || 'Sardar Ramesh Kumar';

    if (typeof categoryOrObj === 'object' && categoryOrObj !== null) {
      category = categoryOrObj.category || 'Weighment Dispute';
      desc = categoryOrObj.description || '';
      fId = categoryOrObj.farmerId || fId;
      fName = categoryOrObj.farmerName || fName;
    } else {
      category = categoryOrObj;
      desc = description || '';
    }

    const newTicket: ComplaintTicket = {
      id: `cmp-${Date.now()}`,
      ticketNo,
      farmerId: fId,
      farmerName: fName,
      category,
      description: desc,
      relatedBookingId,
      status: 'Submitted',
      dateSubmitted: 'Today, 16 Sep 2026',
    };
    setComplaints(prev => [newTicket, ...prev]);
    addAuditLog('GRIEVANCE_LODGED', 'User', `Complaint ${ticketNo} filed under category: ${category}`);
  };

  const resolveComplaint = (ticketId: string, note: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === ticketId) {
        return {
          ...c,
          status: 'Resolved',
          resolutionNote: note,
          officerAssigned: currentUser?.name || 'Authorized Grievance Officer',
        };
      }
      return c;
    }));
    addAuditLog('GRIEVANCE_RESOLVED', 'User', `Complaint ${ticketId} marked resolved: ${note}`);
  };

  const sendCentreDelayAlert = (centreId: string, delayMins: number, reason: string) => {
    const centre = centres.find(c => c.id === centreId);
    const centreName = centre?.name || 'Procurement Centre';

    // Update centre wait time
    setCentres(prev => prev.map(c => c.id === centreId ? { ...c, averageWaitTimeMinutes: c.averageWaitTimeMinutes + delayMins, operatingStatus: 'High Traffic' } : c));

    // Send broadcast notification
    const alertNotif: NotificationItem = {
      id: `alert-${Date.now()}`,
      userId: 'all',
      title: `Advisory: Operational Delay at ${centreName}`,
      message: `Estimated delay of +${delayMins} minutes due to ${reason}. Farmers are requested to check their updated live token status before departure.`,
      category: 'alert',
      timestamp: 'Just now',
      read: false,
      deliveryChannels: { sms: true, whatsapp: true, voice: true }
    };
    setNotifications(prev => [alertNotif, ...prev]);
    addAuditLog('OPERATIONAL_DELAY_BROADCAST', 'System', `Delay of ${delayMins} min broadcasted for ${centreName}`);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        currentRole: currentUser?.role || 'farmer',
        language,
        t: TRANSLATIONS[language] || TRANSLATIONS.en,
        tD: (key: string, fallback?: string) => tFull(key, language, fallback),
        localizeCrop: (cropName: string) => localizeCropUtil(cropName, language),
        localizeMandi: (centreName: string) => localizeMandiUtil(centreName, language),
        theme,
        isOffline,
        backendError,
        isBackendLoading,
        clearBackendError: () => setBackendError(null),
        offlineSyncPending,
        bookings,
        centres,
        marketplaceListings,
        marketplaceOrders,
        buyerOrders: marketplaceOrders,
        complaints,
        notifications,
        auditLogs,
        drawerState,
        printDocState,
        isVoiceModalOpen,
        isLogoutDialogOpen,
        isAiAssistantOpen,
        activeTab,
        setActiveTab,
        bookSlotAtCentre,
        bookingCentreId,
        setBookingCentreId,
        loginAsRole,
        loginWithCredentials,
        updateUserProfile,
        registerUser,
        logout,
        setLanguage,
        toggleTheme,
        toggleOfflineMode,
        openDetailDrawer,
        closeDetailDrawer,
        openPrintModal,
        closePrintModal,
        openVoiceModal,
        closeVoiceModal,
        openAiAssistant,
        closeAiAssistant,
        toggleAiAssistant,
        setIsLogoutDialogOpen,
        speakText,
        createBooking,
        updateBookingStatus,
        advanceQueueForCentre,
        recordWeighment,
        recordQualityTest,
        approveProcurement,
        rejectProcurement,
        processPaymentForBooking,
        addMarketplaceListing,
        createMarketplaceListing: addMarketplaceListing,
        createMarketplaceOrder,
        updateOrderStatus,
        submitComplaint,
        resolveComplaint,
        sendCentreDelayAlert,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
