import React, { useState } from 'react';
import { 
  Sprout, 
  Building2, 
  ShoppingCart, 
  HeartHandshake, 
  Landmark, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Calendar, 
  Scale, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Phone, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
  Globe,
  Volume2,
  FileText,
  AlertTriangle,
  Award,
  Users,
  Search,
  Calculator
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole, LanguageCode } from '../../types';
import { getLandingText as text } from '../../i18n/landingTranslations';

// Import generated procurement project images
import mandiHeroImg from '../../assets/images/agricultural_procurement_hero_1789721128951.jpg';
import grainTestingImg from '../../assets/images/grain_quality_testing_1789718793565.jpg';
import warehouseImg from '../../assets/images/procurement_warehouse_1789718810574.jpg';

interface LandingPageProps {
  onSelectRolePortal: (role: UserRole) => void;
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRolePortal,
  onOpenLogin,
}) => {
  const { 
    language, 
    t,
    tD,
    localizeCrop,
    setLanguage, 
    theme, 
    toggleTheme, 
    loginAsRole, 
    centres, 
    openVoiceModal, 
    speakText 
  } = useApp();

  // Calculator state
  const [calcCrop, setCalcCrop] = useState('Paddy (Grade A)');
  const [calcQty, setCalcQty] = useState<number>(45);

  const mspRatesList = [
    { crop: 'Paddy (Grade A)', msp: 2320, season: 'Kharif', lastYear: 2203, change: '+₹117' },
    { crop: 'Paddy (Common)', msp: 2300, season: 'Kharif', lastYear: 2183, change: '+₹117' },
    { crop: 'Wheat', msp: 2275, season: 'Rabi', lastYear: 2125, change: '+₹150' },
    { crop: 'Maize / Corn', msp: 2090, season: 'Kharif', lastYear: 1962, change: '+₹128' },
    { crop: 'Moong (Green Gram)', msp: 8682, season: 'Kharif', lastYear: 8558, change: '+₹124' },
    { crop: 'Cotton (Medium)', msp: 7121, season: 'Kharif', lastYear: 6620, change: '+₹501' },
    { crop: 'Groundnut in Shell', msp: 6783, season: 'Kharif', lastYear: 6377, change: '+₹406' },
    { crop: 'Soyabean (Yellow)', msp: 4892, season: 'Kharif', lastYear: 4600, change: '+₹292' },
  ];

  const localizedUnits: Record<LanguageCode, { minutes: string; quintals: string; per100kg: string; online: string; kharif: string; rabi: string; themeToggle: string }> = {
    en: { minutes: 'mins', quintals: 'Quintals', per100kg: 'per 100 kg', online: 'Online', kharif: 'Kharif', rabi: 'Rabi', themeToggle: 'Toggle theme' },
    ta: { minutes: 'நிமிடங்கள்', quintals: 'குவிண்டால்கள்', per100kg: '100 கிலோவுக்கு', online: 'இணைப்பு உள்ளது', kharif: 'காரிஃப்', rabi: 'ரபி', themeToggle: 'தோற்றத்தை மாற்று' },
    hi: { minutes: 'मिनट', quintals: 'क्विंटल', per100kg: 'प्रति 100 किग्रा', online: 'ऑनलाइन', kharif: 'खरीफ', rabi: 'रबी', themeToggle: 'थीम बदलें' },
    te: { minutes: 'నిమిషాలు', quintals: 'క్వింటాళ్లు', per100kg: '100 కిలోలకు', online: 'ఆన్‌లైన్', kharif: 'ఖరీఫ్', rabi: 'రబీ', themeToggle: 'థీమ్ మార్చండి' },
    kn: { minutes: 'ನಿಮಿಷಗಳು', quintals: 'ಕ್ವಿಂಟಾಲ್', per100kg: 'ಪ್ರತಿ 100 ಕೆಜಿ', online: 'ಆನ್‌ಲೈನ್', kharif: 'ಖರೀಫ್', rabi: 'ರಬಿ', themeToggle: 'ಥೀಮ್ ಬದಲಿಸಿ' },
    ml: { minutes: 'മിനിറ്റ്', quintals: 'ക്വിന്റൽ', per100kg: '100 കിലോയ്ക്ക്', online: 'ഓൺലൈൻ', kharif: 'ഖാരിഫ്', rabi: 'റാബി', themeToggle: 'തീം മാറ്റുക' },
    mr: { minutes: 'मिनिटे', quintals: 'क्विंटल', per100kg: 'प्रति 100 किलो', online: 'ऑनलाइन', kharif: 'खरीप', rabi: 'रब्बी', themeToggle: 'थीम बदला' },
  };

  const selectedCropMsp = mspRatesList.find(c => c.crop === calcCrop)?.msp || 2320;
  const calculatedEarnings = (calcQty * selectedCropMsp).toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-black text-slate-900 dark:text-slate-100 selection:bg-emerald-100 transition-colors">
      
      {/* PRIMARY NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  AgriBridge
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  e-Procure
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Nav Anchors for Desktop */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#overview" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{text(language, 'overview')}</a>
            <a href="#procurement-flow" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{text(language, 'procurementFlow')}</a>
            <a href="#live-stats" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{text(language, 'liveStats')}</a>
            <a href="#msp-rates" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{text(language, 'mspRates')}</a>
            <a href="#portals" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{text(language, 'rolePortals')}</a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Voice Assistant Button */}
            <button
              onClick={openVoiceModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              title={text(language, 'voice')}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{text(language, 'voice')}</span>
            </button>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="ml">മലയാളം</option>
              <option value="mr">मराठी</option>
            </select>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-white/10 transition-colors"
              aria-label={localizedUnits[language].themeToggle}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Login CTA Button */}
            <button
              onClick={onOpenLogin}
              id="landing-portal-login-btn"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 group"
            >
              <span>{text(language, 'signIn')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </header>

      {/* 3. HERO SECTION WITH GENERATED PROCUREMENT MANDI IMAGE */}
      <section id="overview" className="relative pt-8 pb-16 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Headlines & Call to Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>{text(language, 'heroMission')}</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                  {text(language, 'heroTitle')}
                </h1>
                <p className="text-sm sm:text-base text-emerald-800 dark:text-emerald-400 font-bold">
                  {t.portalTagline}
                </p>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {text(language, 'heroDescription')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onSelectRolePortal('farmer')}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 group"
                >
                  <Sprout className="w-4 h-4" />
                  <span>{text(language, 'farmerLogin')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => onSelectRolePortal('officer')}
                  className="px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{text(language, 'officerPortal')}</span>
                </button>

                <button
                  onClick={() => onSelectRolePortal('buyer')}
                  className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{text(language, 'buyerMarketplace')}</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{text(language, 'noMiddlemen')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{text(language, 'dbtTransfer')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{text(language, 'aadhaarVerified')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{text(language, 'tokenUpdates')}</span>
                </div>
              </div>

            </div>

            {/* Right Column: Clean Procurement Hero Image (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 bg-slate-900 group">
                <img
                  src={mandiHeroImg}
                  alt={text(language, 'workflowTitle')}
                  referrerPolicy="no-referrer"
                  className="w-full h-80 sm:h-96 lg:h-[430px] object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. REAL-TIME PROCUREMENT TELEMETRY STATS */}
      <section id="live-stats" className="py-8 bg-emerald-900 text-white border-y border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 text-center">
            
            <div className="p-3">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-300 tracking-tight block">
                1,48,250
              </span>
              <span className="text-xs font-medium text-emerald-100 mt-1 block">
                {text(language, 'grainProcured')}
              </span>
            </div>

            <div className="p-3">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-300 tracking-tight block">
                ₹34.46 Cr
              </span>
              <span className="text-xs font-medium text-emerald-100 mt-1 block">
                {text(language, 'dbtPaid')}
              </span>
            </div>

            <div className="p-3">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-300 tracking-tight block">
                24,800+
              </span>
              <span className="text-xs font-medium text-emerald-100 mt-1 block">
                {text(language, 'farmersSupported')}
              </span>
            </div>

            <div className="p-3">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-300 tracking-tight block">
                18 {t.navProcurementCentres}
              </span>
              <span className="text-xs font-medium text-emerald-100 mt-1 block">
                {text(language, 'centresLive')}
              </span>
            </div>

            <div className="p-3 col-span-2 md:col-span-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-300 tracking-tight block">
                18 {localizedUnits[language].minutes}
              </span>
              <span className="text-xs font-medium text-emerald-100 mt-1 block">
                {text(language, 'averageWait')}
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 5. STEP-BY-STEP PROCUREMENT PIPELINE WITH GENERATED IMAGES */}
      <section id="procurement-flow" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{text(language, 'workflow')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {text(language, 'workflowTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
            {text(language, 'workflowDescription')}
          </p>
        </div>

        {/* Step 1 & 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-10">
          
          {/* Step 1: Token Scheduling */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  1
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {text(language, 'preArrival')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {text(language, 'slotBooking')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {text(language, 'slotDescription')}
              </p>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-xs space-y-1.5">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{text(language, 'noQueue')}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {text(language, 'slotDescription')}
                </p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{text(language, 'regionalLanguages')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Step 2: Quality Inspection with Generated Image */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-md overflow-hidden flex flex-col justify-between">
            <div className="h-48 overflow-hidden relative">
              <img
                src={grainTestingImg}
                alt={text(language, 'qualityLab')}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>2 • {text(language, 'qualityLab')}</span>
              </div>
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {text(language, 'moistureMeter')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                  {text(language, 'qualityLab')}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{text(language, 'qualityLab')}: ≤17.0%</span>
                <span>•</span>
                <span>{text(language, 'action')}: ≤1.0%</span>
                <span>•</span>
                <span>{text(language, 'tokenUpdates')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Step 3, 4 & 5 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Step 3: Digital Weighbridge */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="w-9 h-9 rounded-xl bg-sky-600 text-white font-black text-sm flex items-center justify-center">
                3
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {text(language, 'weighbridge')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {text(language, 'weighbridge')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-300 text-[11px] font-semibold border border-sky-200 dark:border-sky-800">
              {text(language, 'weighbridge')}
            </div>
          </div>

          {/* Step 4: Warehouse Storage with Generated Image */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-md overflow-hidden flex flex-col justify-between">
            <div className="h-36 overflow-hidden relative">
              <img
                src={warehouseImg}
                alt={text(language, 'safeStorage')}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2.5 left-2.5 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                4 • {text(language, 'safeStorage')}
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {text(language, 'safeStorage')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {text(language, 'safeStorage')}
              </p>
            </div>
          </div>

          {/* Step 5: Direct Benefit Transfer */}
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                5
              </span>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-300">
                {text(language, 'directPayment')}
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {text(language, 'directPayment')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>{text(language, 'dbtTransfer')}</span>
            </div>
          </div>

        </div>

      </section>

      {/* 6. INTERACTIVE MSP RATES TABLE & INCOME CALCULATOR */}
      <section id="msp-rates" className="py-16 bg-slate-50 dark:bg-neutral-950 border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Live MSP Rate Board (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>{text(language, 'mspNotice')} (KMS 2025-26)</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {text(language, 'officialMsp')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {text(language, 'mspDescription')}
                </p>
              </div>

              {/* MSP Table */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4">{text(language, 'crop')}</th>
                        <th className="py-3 px-3">{text(language, 'season')}</th>
                        <th className="py-3 px-3">{text(language, 'currentMsp')}</th>
                        <th className="py-3 px-3">{text(language, 'increase')}</th>
                        <th className="py-3 px-4 text-right">{text(language, 'action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {mspRatesList.map((item) => (
                        <tr key={item.crop} className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block">{localizeCrop(item.crop)}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{text(language, 'mspRates')}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300">
                              {item.season === 'Kharif' ? localizedUnits[language].kharif : localizedUnits[language].rabi}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                              ₹{item.msp}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{localizedUnits[language].per100kg}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {item.change}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setCalcCrop(item.crop);
                                const calcElem = document.getElementById('msp-calculator');
                                if (calcElem) calcElem.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100"
                            >
                              {text(language, 'calculate')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Farmer Payout Calculator (5 cols) */}
            <div id="msp-calculator" className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg p-6 space-y-5">
              
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {text(language, 'incomeEstimator')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {text(language, 'guaranteedPayout')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {text(language, 'selectCrop')}:
                  </label>
                  <select
                    value={calcCrop}
                    onChange={(e) => setCalcCrop(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {mspRatesList.map((c) => (
                      <option key={c.crop} value={c.crop}>
                        {localizeCrop(c.crop)} — ₹{c.msp} / {localizedUnits[language].quintals}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {text(language, 'estimatedQuantity')}:
                    </label>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      {calcQty} {localizedUnits[language].quintals} ({calcQty * 100} kg)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={calcQty}
                    onChange={(e) => setCalcQty(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>5 {localizedUnits[language].quintals} ({t.farmerRole})</span>
                    <span>50 {localizedUnits[language].quintals}</span>
                    <span>100 {localizedUnits[language].quintals}</span>
                    <span>200 {localizedUnits[language].quintals}</span>
                  </div>
                </div>

                {/* Calculation Output Box */}
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                    {text(language, 'guaranteedPayout')}:
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                      ₹{calculatedEarnings}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {text(language, 'dbtTransfer')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {text(language, 'dbtTransfer')}
                  </p>
                </div>

                {/* Quick Slot Booking Action */}
                <button
                  onClick={() => onSelectRolePortal('farmer')}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{text(language, 'bookSlot')} — {localizeCrop(calcCrop)}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 7. DEDICATED ROLE PORTALS SECTION */}
      <section id="portals" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>{text(language, 'stakeholderGateways')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Tailored Portals for Every Participant
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
            Whether you are a grower booking an arrival slot, an APMC officer managing the electronic weighbridge, or an IAS secretary supervising state-wide procurement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Farmer Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.farmerRole}</h3>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">{t.farmerRole}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.procurementSubtitle}</p>
            </div>
            <button
              onClick={() => onSelectRolePortal('farmer')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{text(language, 'launchPortal')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Officer Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-sky-200 dark:border-sky-800/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.officerRole}</h3>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 block">{t.officerRole}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.navWeighingQuality}</p>
            </div>
            <button
              onClick={() => onSelectRolePortal('officer')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{text(language, 'launchPortal')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Buyer Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.buyerRole}</h3>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block">{t.buyerRole}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.navDirectMarketplace}</p>
            </div>
            <button
              onClick={() => onSelectRolePortal('buyer')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{text(language, 'launchPortal')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Staff Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-800/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.assistedRole}</h3>
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 block">{t.assistedRole}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.navRegisterFarmer}</p>
            </div>
            <button
              onClick={() => onSelectRolePortal('assisted')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{text(language, 'launchPortal')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Admin Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow-xs">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.adminRole}</h3>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 block">{t.adminRole}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.navReports}</p>
            </div>
            <button
              onClick={() => onSelectRolePortal('admin')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{text(language, 'launchPortal')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </section>

      {/* 8. ACTIVE MANDI LOCATIONS IN REGION */}
      <section className="py-12 bg-slate-100/70 dark:bg-neutral-950 border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {text(language, 'centresHeading')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {text(language, 'centresDescription')}
              </p>
            </div>
            <button
              onClick={() => onSelectRolePortal('farmer')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>{text(language, 'viewCentres')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {centres.slice(0, 4).map((centre) => (
              <div 
                key={centre.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {centre.name}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title={localizedUnits[language].online} />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{centre.taluk}, {centre.district}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-100 dark:border-white/5">
                  <div>
                    <span className="text-slate-400 block">{text(language, 'queueWaiting')}</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{centre.currentQueueCount} {t.farmerRole}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{text(language, 'waitTime')}</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-bold">{centre.averageWaitTimeMinutes} {localizedUnits[language].minutes}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CITIZEN CHARTER & COMPLIANCE FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sprout className="w-5 h-5 text-emerald-500" />
                <span>{t.appName} • {t.appSubtitle}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t.portalTagline}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">{text(language, 'farmerServices')}</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => onSelectRolePortal('farmer')} className="hover:text-white">{t.navBookSlot}</button></li>
                <li><button onClick={() => onSelectRolePortal('farmer')} className="hover:text-white">{t.navLiveQueue}</button></li>
                <li><button onClick={() => onSelectRolePortal('farmer')} className="hover:text-white">{t.navWeighSlip}</button></li>
                <li><button onClick={() => onSelectRolePortal('farmer')} className="hover:text-white">{t.navDirectMarketplace}</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">{text(language, 'governmentLinks')}</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#msp-rates" className="hover:text-white">{text(language, 'mspNotice')}</a></li>
                <li><button onClick={() => onSelectRolePortal('officer')} className="hover:text-white">{t.officerRole} • {text(language, 'centresHeading')}</button></li>
                <li><button onClick={() => onSelectRolePortal('admin')} className="hover:text-white">{t.adminRole}</button></li>
                <li><button onClick={() => onSelectRolePortal('assisted')} className="hover:text-white">{t.assistedRole}</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">{text(language, 'helpSupport')}</h4>
              <p className="text-[11px]">{text(language, 'tollFree')}: <strong>1800-180-1551</strong></p>
              <p className="text-[11px]">{text(language, 'grievanceCell')}: <strong>procure-help@agribridge.gov.in</strong></p>
              <p className="text-[11px]">{text(language, 'rolePortals')}: English, தமிழ், हिन्दी, తెలుగు, ಕನ್ನಡ, മലയാളം, मराठी</p>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 AgriBridge • {t.portalTagline}. {text(language, 'privacy')}</p>
            <span>{text(language, 'privacy')}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
