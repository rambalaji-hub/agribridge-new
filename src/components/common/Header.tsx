import React, { useState } from 'react';
import { 
  Globe, 
  Volume2, 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon, 
  Bell, 
  Menu, 
  CheckCircle2, 
  ChevronDown,
  Home
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LanguageCode, UserRole } from '../../types';
import { ProfileEditorModal } from './ProfileEditorModal';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { 
    currentUser, 
    language, 
    setLanguage, 
    theme, 
    toggleTheme, 
    isOffline, 
    toggleOfflineMode, 
    notifications, 
    openVoiceModal, 
    setIsLogoutDialogOpen,
    openDetailDrawer,
    speakText,
    setActiveTab,
    t,
    tD
  } = useApp();

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.read);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'farmer':
        return { label: t.farmerRole, bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'officer':
        return { label: t.officerRole, bg: 'bg-sky-100 text-sky-800 border-sky-300' };
      case 'buyer':
        return { label: t.buyerRole, bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'admin':
        return { label: t.adminRole, bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'assisted':
        return { label: t.assistedRole, bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: 'User', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : { label: 'Guest', bg: 'bg-slate-100 text-slate-700 border-slate-300' };

  return (
    <>
    <header className="sticky top-0 z-30 bg-white dark:bg-black border-b border-slate-200/90 dark:border-white/10 shadow-2xs transition-colors">
      {/* Main Navigation Bar */}
      <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3 bg-white dark:bg-black">
        {/* Left Side: Mobile Hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white shadow-xs ring-1 ring-emerald-500/20">
              <span className="font-heading font-extrabold text-lg tracking-tight">AB</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-slate-900 dark:text-white text-lg sm:text-xl tracking-tight">
                  AgriBridge
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {tD('nationalProcurementHub')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
                {t.appSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Global Controls & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={() => speakText(t.portalTagline)}
            title={t.screenReaderBtn}
            aria-label={t.screenReaderBtn}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-900 border border-slate-200 dark:border-white/10 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Public Landing Portal Link */}
          <button
            onClick={() => setActiveTab('landing')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors border border-slate-200 dark:border-white/10"
            title="View Public Landing Page & MSP Rates"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{tD('landingPortal')}</span>
          </button>

          {/* Low-Connectivity / Offline Mode Toggle */}
          <button
            id="network-mode-toggle-btn"
            onClick={toggleOfflineMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isOffline
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title={isOffline ? 'Offline Mode Active - Critical passes saved locally' : 'Simulate Low-Connectivity Rural Mode'}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden md:inline">{tD('ruralOfflineMode')}</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">{tD('onlineSync')}</span>
              </>
            )}
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              id="language-selector-btn"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors"
              aria-label="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="font-semibold">{LANGUAGES.find(l => l.code === language)?.native || 'English'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangMenuOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-lg py-1.5 z-50 text-xs"
                onMouseLeave={() => setIsLangMenuOpen(false)}
              >
                <div className="px-3 py-1 font-semibold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-white/10 mb-1">
                  {tD('selectLanguage')}
                </div>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors ${
                      language === lang.code ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{lang.native}</span>
                    <span className="text-slate-400 text-[11px]">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-900 border border-slate-200 dark:border-white/10 transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to White Light UI'}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Notification Center */}
          <div className="relative">
            <button
              id="notifications-bell-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-900 border border-slate-200 dark:border-white/10 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full ring-2 ring-white dark:ring-black" />
              )}
            </button>

            {isNotifOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-2 z-50 text-xs"
                onMouseLeave={() => setIsNotifOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{tD('officialAlertsTitle')}</span>
                  <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-800">
                    {unreadNotifs.length} new
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/10">
                  {notifications.slice(0, 5).map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                        openDetailDrawer('booking', notif);
                        setIsNotifOpen(false);
                      }}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.timestamp}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1 text-[11px] line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{tD('channels', 'Channels:')}</span>
                        {notif.deliveryChannels.sms && <span className="text-emerald-700 dark:text-emerald-400 font-medium">SMS</span>}
                        {notif.deliveryChannels.whatsapp && <span className="text-green-600 dark:text-green-400 font-medium">WhatsApp</span>}
                        {notif.deliveryChannels.voice && <span className="text-indigo-600 dark:text-indigo-400 font-medium">IVR Call</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100 dark:border-white/10 text-center">
                  <button 
                    onClick={() => {
                      setIsNotifOpen(false);
                      speakText("You have " + unreadNotifs.length + " unread procurement notifications.");
                    }}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    {tD('listenAllAlerts')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Capsule */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => setIsProfileEditorOpen(true)}
              title={tD('editProfile', 'Edit profile')}
              aria-label={`${tD('editProfile', 'Edit profile')}: ${currentUser.name}`}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <img
                src={currentUser.avatarUrl || ''}
                alt={currentUser.name}
                className={`w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 ${currentUser.avatarUrl ? '' : 'hidden'}`}
              />
              {!currentUser.avatarUrl && (
                <span className="grid w-8 h-8 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="hidden xl:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
    {isProfileEditorOpen && <ProfileEditorModal onClose={() => setIsProfileEditorOpen(false)} />}
    </>
  );
};
